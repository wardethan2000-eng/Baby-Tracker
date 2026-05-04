import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChild } from "@/lib/access";
import { Prisma } from "@prisma/client";

export async function GET(request: Request, { params }: { params: { childId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const child = await canAccessChild(userId, params.childId);
    if (!child) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const where: any = {
      childId: params.childId,
      deletedAt: null,
    };

    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to) where.occurredAt.lte = new Date(to);
    }

    const logs = await prisma.log.findMany({
      where,
      orderBy: { occurredAt: "asc" },
      include: { user: { select: { name: true } } },
    });

    const feeds = logs.filter((l) => l.type === "FEED");
    const diapers = logs.filter((l) => l.type === "DIAPER");
    const wakes = logs.filter((l) => l.type === "WAKE");
    const nurses = logs.filter((l) => l.type === "NURSE");
    const pumps = logs.filter((l) => l.type === "PUMP");
    const sleeps = logs.filter((l) => l.type === "SLEEP");
    const diaperTypes = diapers.length
      ? await prisma.$queryRaw<{ id: string; diaperType: string | null }[]>(
          Prisma.sql`SELECT id, "diaperType" FROM "Log" WHERE id IN (${Prisma.join(diapers.map((item) => item.id))})`
        )
      : [];
    const diaperTypeById = new Map(diaperTypes.map((item) => [item.id, item.diaperType]));

    const totalFeeds = feeds.length;
    const totalVolume = feeds.reduce((sum, f) => sum + (f.feedAmount || 0), 0);
    const days = from && to
      ? Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)))
      : logs.length > 0
        ? Math.max(1, Math.ceil((new Date(logs[logs.length - 1].occurredAt).getTime() - new Date(logs[0].occurredAt).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;

    const totalSleepMinutes = sleeps.reduce((s, sl) => {
      if (sl.startedAt && sl.endedAt) {
        return s + (sl.endedAt.getTime() - sl.startedAt.getTime()) / 60000;
      }
      return s;
    }, 0);

    return NextResponse.json({
      summary: {
        totalFeeds,
        totalVolume,
        avgFeedsPerDay: totalFeeds / days,
        totalDiapers: diapers.length,
        totalWakes: wakes.length,
        totalNurses: nurses.length,
        totalNurseMinutes: nurses.reduce((s, n) => s + (n.nurseDuration || 0), 0),
        avgNurseMinutes: nurses.length > 0 ? nurses.reduce((s, n) => s + (n.nurseDuration || 0), 0) / nurses.length : 0,
        totalPumps: pumps.length,
        totalPumpVolume: pumps.reduce((s, p) => s + (p.pumpAmount || 0), 0),
        totalSleeps: sleeps.length,
        totalSleepHours: Math.round((totalSleepMinutes / 60) * 10) / 10,
        avgFeedVolume: totalFeeds > 0 ? Math.round((totalVolume / totalFeeds) * 10) / 10 : 0,
        dateRange: from && to ? `${new Date(from).toLocaleDateString()} – ${new Date(to).toLocaleDateString()}` : "All time",
      },
      feeds: feeds.map((l) => ({
        id: l.id,
        occurredAt: l.occurredAt,
        feedAmount: l.feedAmount,
        feedUnit: l.feedUnit,
        feedType: l.feedType,
        foodName: l.foodName,
        notes: l.notes,
        userName: l.user?.name,
      })),
      diapers: diapers.map((l) => ({
        id: l.id,
        occurredAt: l.occurredAt,
        diaperType: diaperTypeById.get(l.id) ?? null,
        notes: l.notes,
        userName: l.user?.name,
      })),
      wakes: wakes.map((l) => ({
        id: l.id,
        occurredAt: l.occurredAt,
        notes: l.notes,
        userName: l.user?.name,
      })),
      nurses: nurses.map((l) => ({
        id: l.id,
        occurredAt: l.occurredAt,
        nurseDuration: l.nurseDuration,
        nurseSide: l.nurseSide,
        notes: l.notes,
        userName: l.user?.name,
      })),
      pumps: pumps.map((l) => ({
        id: l.id,
        occurredAt: l.occurredAt,
        pumpAmount: l.pumpAmount,
        pumpUnit: l.pumpUnit,
        pumpSide: l.pumpSide,
        notes: l.notes,
        userName: l.user?.name,
      })),
      sleeps: sleeps.map((l) => ({
        id: l.id,
        occurredAt: l.occurredAt,
        startedAt: l.startedAt,
        endedAt: l.endedAt,
        durationMinutes: l.startedAt && l.endedAt ? Math.round((l.endedAt.getTime() - l.startedAt.getTime()) / 60000) : null,
        notes: l.notes,
        userName: l.user?.name,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}