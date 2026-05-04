import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChild } from "@/lib/access";
import { broadcastEvent } from "@/lib/broadcast";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const log = await prisma.log.findUnique({
      where: { id: params.id },
    });

    if (!log) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const child = await canAccessChild(userId, log.childId);

    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const restoredLog = await prisma.log.update({
      where: { id: params.id },
      data: {
        deletedAt: null,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    broadcastEvent({
      type: "log-restore",
      childId: log.childId,
      logId: log.id,
      logType: log.type,
      userId,
      userName: user?.name || "Someone",
    });

    return NextResponse.json(restoredLog);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}