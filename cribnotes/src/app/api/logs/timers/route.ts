import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChild } from "@/lib/access";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");

    if (!childId) {
      return NextResponse.json({ error: "Missing childId" }, { status: 400 });
    }

    const child = await canAccessChild(userId, childId);
    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const timers = await prisma.log.findMany({
      where: {
        childId,
        type: { in: ["SLEEP", "NURSE", "PUMP"] },
        endedAt: null,
        deletedAt: null,
      },
      orderBy: { startedAt: "asc" },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ timers });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}