import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChild } from "@/lib/access";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const log = await prisma.log.findUnique({
      where: { id: params.id },
      include: {
        child: true,
      },
    });

    if (!log) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const child = await prisma.child.findUnique({
      where: { id: log.childId, ownerId: userId },
    });

    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const restoredLog = await prisma.log.update({
      where: { id: params.id },
      data: {
        deletedAt: null,
      },
    });

    return NextResponse.json(restoredLog);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}