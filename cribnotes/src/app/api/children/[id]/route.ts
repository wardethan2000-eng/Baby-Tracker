import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateChildSchema } from "@/lib/validations";
import { canAccessChild } from "@/lib/access";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const child = await canAccessChild(userId, params.id);
    if (!child) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(child);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const child = await prisma.child.findUnique({ where: { id: params.id } });
    if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (child.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const data = updateChildSchema.parse(body);

    const updated = await prisma.child.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const child = await prisma.child.findUnique({ where: { id: params.id } });
    if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (child.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.child.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}