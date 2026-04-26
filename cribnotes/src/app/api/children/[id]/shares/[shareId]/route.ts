import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: { id: string; shareId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const child = await prisma.child.findUnique({
      where: { id: params.id, ownerId: userId },
    });

    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.childShare.delete({
      where: { id: params.shareId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}