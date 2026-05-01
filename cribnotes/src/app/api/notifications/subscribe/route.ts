import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as SubscriptionBody;
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PushSubscription" (id, "userId", endpoint, p256dh, auth, "userAgent", "createdAt", "updatedAt")
      VALUES (
        ${randomUUID()},
        ${session.user.id},
        ${body.endpoint},
        ${body.keys.p256dh},
        ${body.keys.auth},
        ${request.headers.get("user-agent")},
        now(),
        now()
      )
      ON CONFLICT (endpoint)
      DO UPDATE SET
        "userId" = EXCLUDED."userId",
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        "userAgent" = EXCLUDED."userAgent",
        "updatedAt" = now()
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not save push subscription", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({})) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "PushSubscription"
      WHERE "userId" = ${session.user.id} AND endpoint = ${body.endpoint}
    `);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
