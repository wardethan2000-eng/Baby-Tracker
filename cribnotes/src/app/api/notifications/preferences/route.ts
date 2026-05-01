import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChild } from "@/lib/access";

const preferenceSchema = z.object({
  childId: z.string().uuid(),
  noteAttentionEnabled: z.boolean().optional(),
  feedReminderEnabled: z.boolean().optional(),
  feedReminderIntervalMinutes: z.number().int().min(15).max(720).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    if (!childId) return NextResponse.json({ error: "Missing childId" }, { status: 400 });

    const child = await canAccessChild(session.user.id, childId);
    if (!child) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [preference] = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        "childId",
        "noteAttentionEnabled",
        "feedReminderEnabled",
        "feedReminderIntervalMinutes"
      FROM "NotificationPreference"
      WHERE "userId" = ${session.user.id} AND "childId" = ${childId}
      LIMIT 1
    `);

    const [subscription] = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM "PushSubscription" WHERE "userId" = ${session.user.id} LIMIT 1
    `);
    const [subscriptionCount] = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count FROM "PushSubscription" WHERE "userId" = ${session.user.id}
    `);

    return NextResponse.json({
      childId,
      noteAttentionEnabled: preference?.noteAttentionEnabled ?? true,
      feedReminderEnabled: preference?.feedReminderEnabled ?? false,
      feedReminderIntervalMinutes: preference?.feedReminderIntervalMinutes ?? 120,
      hasSubscription: Boolean(subscription),
      subscriptionCount: Number(subscriptionCount?.count ?? 0),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = preferenceSchema.parse(await request.json());
    const child = await canAccessChild(session.user.id, data.childId);
    if (!child) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [current] = await prisma.$queryRaw<{
      noteAttentionEnabled: boolean;
      feedReminderEnabled: boolean;
      feedReminderIntervalMinutes: number;
    }[]>(Prisma.sql`
      SELECT
        "noteAttentionEnabled",
        "feedReminderEnabled",
        "feedReminderIntervalMinutes"
      FROM "NotificationPreference"
      WHERE "userId" = ${session.user.id} AND "childId" = ${data.childId}
      LIMIT 1
    `);
    const noteAttentionEnabled = data.noteAttentionEnabled ?? current?.noteAttentionEnabled ?? true;
    const feedReminderEnabled = data.feedReminderEnabled ?? current?.feedReminderEnabled ?? false;
    const feedReminderIntervalMinutes = data.feedReminderIntervalMinutes ?? current?.feedReminderIntervalMinutes ?? 120;

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "NotificationPreference" (
        id,
        "userId",
        "childId",
        "noteAttentionEnabled",
        "feedReminderEnabled",
        "feedReminderIntervalMinutes",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${session.user.id},
        ${data.childId},
        ${noteAttentionEnabled},
        ${feedReminderEnabled},
        ${feedReminderIntervalMinutes},
        now(),
        now()
      )
      ON CONFLICT ("userId", "childId")
      DO UPDATE SET
        "noteAttentionEnabled" = EXCLUDED."noteAttentionEnabled",
        "feedReminderEnabled" = EXCLUDED."feedReminderEnabled",
        "feedReminderIntervalMinutes" = EXCLUDED."feedReminderIntervalMinutes",
        "updatedAt" = now()
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "ZodError") return NextResponse.json({ error: error.errors }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
