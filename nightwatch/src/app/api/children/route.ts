import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createChildSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const children = await prisma.child.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { sharedWith: { some: { userId, accepted: true } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        sharedWith: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(children);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const body = await request.json();
    const { name, birthDate } = createChildSchema.parse(body);

    const child = await prisma.child.create({
      data: {
        name,
        birthDate: new Date(birthDate),
        ownerId: userId,
      },
    });

    return NextResponse.json(child);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}