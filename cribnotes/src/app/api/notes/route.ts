import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChild, canWriteToChild, getChildRole } from "@/lib/access";
import { createNoteSchema } from "@/lib/validations";

type NoteAudience = "EVERYONE" | "PARENTS" | "CAREGIVERS" | "SPECIFIC";
type NoteEditPermission = "CREATOR_ONLY" | "PARENTS" | "CAREGIVERS" | "EVERYONE";
type PersonRole = "PARENT" | "CARETAKER" | "BABYSITTER";

type RawNote = {
  id: string;
  childId: string;
  userId: string;
  title: string;
  body: string;
  purpose: string;
  audience: NoteAudience;
  attentionName: string | null;
  editPermission: NoteEditPermission;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  childOwnerId: string;
  userName: string | null;
  userEmail: string;
  userDesignation: string;
};

function isForUser(
  note: { audience: NoteAudience; attentionName: string | null },
  role: PersonRole | null,
  user: { name: string | null; email: string }
) {
  if (note.audience === "EVERYONE") return true;
  if (note.audience === "PARENTS") return role === "PARENT";
  if (note.audience === "CAREGIVERS") return role === "CARETAKER" || role === "BABYSITTER";

  const attention = note.attentionName?.trim().toLowerCase();
  if (!attention) return false;

  return [user.name, user.email]
    .filter(Boolean)
    .some((value) => value!.trim().toLowerCase() === attention);
}

function canEditNote(note: { userId: string; editPermission: NoteEditPermission }, userId: string, role: PersonRole | null) {
  if (note.userId === userId) return true;
  if (note.editPermission === "EVERYONE") return true;
  if (note.editPermission === "PARENTS") return role === "PARENT";
  if (note.editPermission === "CAREGIVERS") return role === "CARETAKER" || role === "BABYSITTER";
  return false;
}

function serializeNote(note: RawNote, context?: { userId: string; role: PersonRole | null }) {
  return {
    id: note.id,
    childId: note.childId,
    userId: note.userId,
    title: note.title,
    body: note.body,
    purpose: note.purpose,
    audience: note.audience,
    attentionName: note.attentionName,
    editPermission: note.editPermission,
    pinned: note.pinned,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    user: { id: note.userId, name: note.userName, email: note.userEmail },
    authorKind: note.userDesignation === "BABYSITTER"
      ? "Babysitter"
      : note.userDesignation === "CARETAKER"
        ? "Caretaker"
        : "Parent",
    canEdit: context ? canEditNote(note, context.userId, context.role) : true,
    canDelete: context ? note.userId === context.userId || context.role === "PARENT" : true,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const attention = searchParams.get("attention");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    if (!childId) {
      return NextResponse.json({ error: "Missing childId" }, { status: 400 });
    }

    const child = await canAccessChild(userId, childId);
    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [role, user, notes] = await Promise.all([
      getChildRole(userId, childId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      }),
      prisma.$queryRaw<RawNote[]>(Prisma.sql`
        SELECT
          n.id,
          n."childId",
          n."userId",
          n.title,
          n.body,
          n.purpose::text AS purpose,
          n.audience::text AS audience,
          n."attentionName",
          n."editPermission"::text AS "editPermission",
          n.pinned,
          n."createdAt",
          n."updatedAt",
          c."ownerId" AS "childOwnerId",
          u.name AS "userName",
          u.email AS "userEmail",
          u.designation::text AS "userDesignation"
        FROM "Note" n
        JOIN "Child" c ON c.id = n."childId"
        JOIN "User" u ON u.id = n."userId"
        WHERE n."childId" = ${childId}
        ORDER BY n.pinned DESC, n."createdAt" DESC
        LIMIT ${attention === "mine" ? 100 : limit}
      `),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filtered = attention === "mine"
      ? notes.filter((note) => isForUser(note, role, user)).slice(0, limit)
      : notes;

    return NextResponse.json({ notes: filtered.map((note) => serializeNote(note, { userId, role })) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const body = await request.json();
    const data = createNoteSchema.parse(body);

    const child = await canWriteToChild(userId, data.childId);
    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [note] = await prisma.$queryRaw<RawNote[]>(Prisma.sql`
      INSERT INTO "Note" (
        id,
        "childId",
        "userId",
        title,
        body,
        purpose,
        audience,
        "attentionName",
        "editPermission",
        pinned,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${data.childId},
        ${userId},
        ${data.title},
        ${data.body},
        ${data.purpose}::"NotePurpose",
        ${data.audience}::"NoteAudience",
        ${data.audience === "SPECIFIC" ? data.attentionName || null : null},
        ${data.editPermission}::"NoteEditPermission",
        ${data.pinned ?? false},
        now(),
        now()
      )
      RETURNING
        id,
        "childId",
        "userId",
        title,
        body,
        purpose::text AS purpose,
        audience::text AS audience,
        "attentionName",
        "editPermission"::text AS "editPermission",
        pinned,
        "createdAt",
        "updatedAt",
        (SELECT "ownerId" FROM "Child" WHERE id = "Note"."childId") AS "childOwnerId",
        (SELECT name FROM "User" WHERE id = "Note"."userId") AS "userName",
        (SELECT email FROM "User" WHERE id = "Note"."userId") AS "userEmail",
        (SELECT designation::text FROM "User" WHERE id = "Note"."userId") AS "userDesignation"
    `);

    return NextResponse.json(serializeNote(note, { userId, role: await getChildRole(userId, data.childId) }));
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
