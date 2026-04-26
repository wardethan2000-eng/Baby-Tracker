import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      onboardingDone: user.onboardingDone,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: "Email already taken" }, { status: 409 });
      }
      updateData.email = data.email;
    }
    if (data.password) {
      if (!data.currentPassword) {
        return NextResponse.json({ error: "Current password is required to set a new password" }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.passwordHash || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
      }
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }
    if (body.onboardingDone !== undefined) {
      updateData.onboardingDone = body.onboardingDone;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingDone: user.onboardingDone,
    });
  } catch (error: any) {
    if (error.name === "ZodError") return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}