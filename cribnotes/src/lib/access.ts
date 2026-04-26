import { prisma } from "./prisma";

export async function canAccessChild(userId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { ownerId: userId },
        { sharedWith: { some: { userId, accepted: true } } },
      ],
    },
  });
  return child;
}

export async function canWriteToChild(userId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { ownerId: userId },
        { sharedWith: { some: { userId, accepted: true, role: "CAREGIVER" } } },
      ],
    },
  });
  return child;
}

export async function isOwner(userId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, ownerId: userId },
  });
  return !!child;
}

export async function getChildRole(userId: string, childId: string): Promise<"OWNER" | "CAREGIVER" | "VIEWER" | null> {
  const child = await prisma.child.findFirst({
    where: { id: childId, ownerId: userId },
  });
  if (child) return "OWNER";

  const share = await prisma.childShare.findFirst({
    where: { childId, userId, accepted: true },
  });
  if (share) return share.role;
  return null;
}