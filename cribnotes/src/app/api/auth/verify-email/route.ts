import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: {
          startsWith: "verify:",
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

    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: new Date(),
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