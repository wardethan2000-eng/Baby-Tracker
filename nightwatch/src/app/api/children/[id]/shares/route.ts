import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChild, isOwner } from "@/lib/access";
import { sendInviteEmail } from "@/lib/resend";
import crypto from "crypto";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const child = await canAccessChild(userId, params.id);
    if (!child) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const shares = await prisma.childShare.findMany({
      where: { childId: params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(shares);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const owns = await isOwner(userId, params.id);
    if (!owns) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { email, role } = body;
    if (!email || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const existing = await prisma.childShare.findFirst({
      where: { childId: params.id, email },
    });
    if (existing) return NextResponse.json({ error: "Already sharing with this email" }, { status: 409 });

    const token = crypto.randomBytes(16).toString("hex");
    const owner = await prisma.user.findUnique({ where: { id: userId } });
    const child = await prisma.child.findUnique({ where: { id: params.id } });

    const share = await prisma.childShare.create({
      data: {
        childId: params.id,
        email,
        role,
        token,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    try {
      await sendInviteEmail(email, owner?.name || "Someone", child?.name || "a child", token);
    } catch {}

    return NextResponse.json(share);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}