import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateLogSchema } from "@/lib/validations";
import { canAccessChild } from "@/lib/access";
import { broadcastEvent } from "@/lib/broadcast";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const log = await prisma.log.findUnique({ where: { id: params.id } });
    if (!log || log.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const hasAccess = await canAccessChild(userId, log.childId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const body = await request.json();
    const data = updateLogSchema.parse(body);

    const updateData: any = {
      ...(data.occurredAt && { occurredAt: new Date(data.occurredAt) }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.feedAmount !== undefined && { feedAmount: data.feedAmount }),
      ...(data.feedUnit && { feedUnit: data.feedUnit }),
      ...(data.feedType && { feedType: data.feedType }),
      ...(data.nurseDuration !== undefined && { nurseDuration: data.nurseDuration }),
      ...(data.nurseSide && { nurseSide: data.nurseSide }),
      ...(data.pumpAmount !== undefined && { pumpAmount: data.pumpAmount }),
      ...(data.pumpUnit && { pumpUnit: data.pumpUnit }),
      ...(data.pumpSide && { pumpSide: data.pumpSide }),
      ...(data.foodName !== undefined && { foodName: data.foodName }),
    };

    let wakeLog = null;
    let isTimerStop = false;

    if (data.stopTimer && log.endedAt === null && log.startedAt) {
      isTimerStop = true;
      const now = new Date();
      updateData.endedAt = now;

      if (log.type === "NURSE") {
        const durationMinutes = Math.max(1, Math.round((now.getTime() - log.startedAt.getTime()) / 60000));
        updateData.nurseDuration = durationMinutes;
      }

      if (log.type === "SLEEP") {
        wakeLog = await prisma.log.create({
          data: {
            childId: log.childId,
            userId,
            type: "WAKE",
            occurredAt: now,
          },
        });
        broadcastEvent({
          type: "log-create",
          childId: log.childId,
          logId: wakeLog.id,
          logType: "WAKE",
          userId,
          userName: user?.name || "Someone",
        });
      }
    }

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

    broadcastEvent({
      type: isTimerStop ? "timer-stop" : "log-update",
      childId: log.childId,
      logId: log.id,
      logType: log.type,
      userId,
      userName: user?.name || "Someone",
    });

    const response: any = { ...updated, diaperType: data.diaperType ?? log.diaperType ?? null };
    if (wakeLog) {
      response.wakeLog = wakeLog;
    }

    return NextResponse.json(response);
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
          { sharedWith: { some: { userId, accepted: true } } },
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

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    broadcastEvent({
      type: "log-delete",
      childId: log.childId,
      logId: log.id,
      logType: log.type,
      userId,
      userName: user?.name || "Someone",
    });

    return NextResponse.json(deleted);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
