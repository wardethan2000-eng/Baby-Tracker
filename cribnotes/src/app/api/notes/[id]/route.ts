import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChild, getChildRole } from "@/lib/access";
import { updateNoteSchema } from "@/lib/validations";

type NoteEditPermission = "CREATOR_ONLY" | "PARENTS" | "CAREGIVERS" | "EVERYONE";
type PersonRole = "PARENT" | "CARETAKER" | "BABYSITTER";

function canEditNote(note: { userId: string; editPermission: NoteEditPermission }, userId: string, role: PersonRole | null) {
  if (note.userId === userId) return true;
  if (note.editPermission === "EVERYONE") return true;
  if (note.editPermission === "PARENTS") return role === "PARENT";
  if (note.editPermission === "CAREGIVERS") return role === "CARETAKER" || role === "BABYSITTER";
  return false;
}

async function getNote(id: string) {
  const [note] = await prisma.$queryRaw<{
    id: string;
    childId: string;
    userId: string;
    editPermission: NoteEditPermission;
  }[]>(Prisma.sql`
    SELECT id, "childId", "userId", "editPermission"::text AS "editPermission"
    FROM "Note"
    WHERE id = ${id}
    LIMIT 1
  `);
  return note;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const note = await getNote(params.id);

    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const child = await canAccessChild(userId, note.childId);
    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const role = await getChildRole(userId, note.childId);
    if (!canEditNote(note, userId, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateNoteSchema.parse(body);

    const [updated] = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE "Note"
      SET
        title = COALESCE(${data.title ?? null}, title),
        body = COALESCE(${data.body ?? null}, body),
        purpose = COALESCE(${data.purpose ? Prisma.sql`${data.purpose}::"NotePurpose"` : null}, purpose),
        audience = COALESCE(${data.audience ? Prisma.sql`${data.audience}::"NoteAudience"` : null}, audience),
        "attentionName" = CASE
          WHEN ${data.audience ?? null} = 'SPECIFIC' THEN ${data.attentionName || null}
          WHEN ${data.audience === undefined} THEN COALESCE(${data.attentionName ?? null}, "attentionName")
          ELSE NULL
        END,
        "editPermission" = COALESCE(${data.editPermission ? Prisma.sql`${data.editPermission}::"NoteEditPermission"` : null}, "editPermission"),
        pinned = COALESCE(${data.pinned ?? null}, pinned),
        "updatedAt" = now()
      WHERE id = ${params.id}
      RETURNING id
    `);

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const note = await getNote(params.id);

    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const role = await getChildRole(userId, note.childId);
    if (note.userId !== userId && role !== "PARENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$executeRaw(Prisma.sql`DELETE FROM "Note" WHERE id = ${params.id}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
