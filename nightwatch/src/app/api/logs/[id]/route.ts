import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateLogSchema } from "@/lib/validations";
import { canAccessChild, canWriteToChild } from "@/lib/access";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const log = await prisma.log.findUnique({ where: { id: params.id } });
    if (!log || log.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const hasAccess = await canWriteToChild(userId, log.childId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateLogSchema.parse(body);

    const updateData = {
      ...(data.occurredAt && { occurredAt: new Date(data.occurredAt) }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.feedAmount !== undefined && { feedAmount: data.feedAmount }),
      ...(data.feedUnit && { feedUnit: data.feedUnit }),
      ...(data.feedType && { feedType: data.feedType }),
    };

    const updated = Object.keys(updateData).length
      ? await prisma.log.update({
      where: { id: params.id },
          data: updateData,
        })
      : log;

    if (data.diaperType) {
      await prisma.$executeRaw`
        UPDATE "Log" SET "diaperType" = ${data.diaperType}::"DiaperType" WHERE id = ${params.id}
      `;
    }

    return NextResponse.json({ ...updated, diaperType: data.diaperType ?? null });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const log = await prisma.log.findUnique({ where: { id: params.id } });
    if (!log) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const child = await prisma.child.findFirst({
      where: {
        id: log.childId,
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId, accepted: true, role: "CAREGIVER" } } },
        ],
      },
    });
    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await prisma.log.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
