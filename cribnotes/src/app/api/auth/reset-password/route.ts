import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: {
          startsWith: "reset:",
        },
        token: hashedToken,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const email = verificationToken.identifier.split(":")[1];

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
      },
    });

    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}