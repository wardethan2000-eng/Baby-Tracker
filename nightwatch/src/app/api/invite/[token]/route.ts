import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    const share = await prisma.childShare.findFirst({
      where: {
        token: params.token,
        expiresAt: { gt: new Date() },
      },
      include: {
        child: { select: { name: true, ownerId: true } },
      },
    });

    if (!share) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
    }

    const owner = await prisma.user.findUnique({ where: { id: share.child.ownerId }, select: { name: true } });

    return NextResponse.json({
      childName: share.child.name,
      ownerName: owner?.name || "Someone",
      email: share.email,
      role: share.role,
      expired: false,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}