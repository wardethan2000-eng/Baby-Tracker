import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteAcceptedEmail } from "@/lib/resend";
import crypto from "crypto";

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const hashedToken = crypto.createHash("sha256").update(params.token).digest("hex");

    const share = await prisma.childShare.findFirst({
      where: {
        token: hashedToken,
        expiresAt: { gt: new Date() },
      },
      include: { child: true },
    });

    if (!share) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
    }

    if (share.accepted) {
      return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
    }

    const updated = await prisma.childShare.update({
      where: { id: share.id },
      data: { userId, accepted: true, token: crypto.randomBytes(32).toString("hex") },
    });

    const owner = await prisma.user.findUnique({ where: { id: share.child.ownerId } });
    const invitee = await prisma.user.findUnique({ where: { id: userId } });

    if (owner) {
      try {
        await sendInviteAcceptedEmail(
          owner.email,
          invitee?.name || invitee?.email || "Someone",
          share.child.name
        );
      } catch {}
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}