import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogSchema } from "@/lib/validations";
import { canAccessChild } from "@/lib/access";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const cursor = searchParams.get("cursor");

    if (!childId) {
      return NextResponse.json({ error: "Missing childId" }, { status: 400 });
    }

    const child = await canAccessChild(userId, childId);
    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: any = {
      childId,
      deletedAt: null,
    };

    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to) where.occurredAt.lte = new Date(to);
    }

    if (type) {
      const types = type.split(",");
      where.type = { in: types };
    }

    const logs = await prisma.log.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { user: { select: { id: true, name: true } } },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    const diaperTypes = items.length
      ? await prisma.$queryRaw<{ id: string; diaperType: string | null }[]>(
          Prisma.sql`SELECT id, "diaperType" FROM "Log" WHERE id IN (${Prisma.join(items.map((item) => item.id))})`
        )
      : [];
    const diaperTypeById = new Map(diaperTypes.map((item) => [item.id, item.diaperType]));

    return NextResponse.json({
      logs: items.map((item) => ({ ...item, diaperType: diaperTypeById.get(item.id) ?? null })),
      nextCursor,
    });
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
    const data = createLogSchema.parse(body);

    const child = await canAccessChild(userId, data.childId);
    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const TIMER_TYPES: string[] = ["SLEEP", "NURSE", "PUMP"];
    const isTimerStart = TIMER_TYPES.includes(data.type) && data.startedAt;

    if (isTimerStart) {
      const existingTimer = await prisma.log.findFirst({
        where: {
          childId: data.childId,
          type: data.type as any,
          endedAt: null,
          deletedAt: null,
        },
      });

      if (existingTimer) {
        const now = new Date();
        const endedAt = now;
        const durationMinutes = existingTimer.startedAt
          ? Math.round((now.getTime() - existingTimer.startedAt.getTime()) / 60000)
          : 0;

        const updateData: any = { endedAt };
        if (existingTimer.type === "NURSE") {
          updateData.nurseDuration = durationMinutes;
        }

        await prisma.log.update({
          where: { id: existingTimer.id },
          data: updateData,
        });

        if (existingTimer.type === "SLEEP") {
          await prisma.log.create({
            data: {
              childId: data.childId,
              userId,
              type: "WAKE",
              occurredAt: now,
            },
          });
        }
      }
    }

    const startedAtValue = data.startedAt ? new Date(data.startedAt) : null;

    const log = await prisma.log.create({
      data: {
        childId: data.childId,
        userId,
        type: data.type,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : startedAtValue ?? new Date(),
        notes: data.notes,
        feedAmount: data.feedAmount,
        feedUnit: data.feedUnit,
        feedType: data.feedType,
        nurseDuration: data.nurseDuration,
        nurseSide: data.nurseSide,
        pumpAmount: data.pumpAmount,
        pumpUnit: data.pumpUnit,
        pumpSide: data.pumpSide as any,
        foodName: data.foodName,
        startedAt: startedAtValue,
        endedAt: isTimerStart ? null : undefined,
      },
    });

    if (data.diaperType) {
      await prisma.$executeRaw`
        UPDATE "Log" SET "diaperType" = ${data.diaperType}::"DiaperType" WHERE id = ${log.id}
      `;
      return NextResponse.json({ ...log, diaperType: data.diaperType });
    }

    return NextResponse.json(log);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
