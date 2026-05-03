import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const createChildSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  birthDate: z.string().transform((v) => new Date(v)),
});

export const updateChildSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  birthDate: z.string().transform((v) => new Date(v)).optional(),
});

export const createLogSchema = z.object({
  childId: z.string().uuid(),
  type: z.enum(["WAKE", "SLEEP", "FEED", "DIAPER", "NURSE", "PUMP"]),
  occurredAt: z.string().optional(),
  notes: z.string().max(500).optional(),
  feedAmount: z.number().min(0).optional(),
  feedUnit: z.enum(["OZ", "ML"]).optional(),
  feedType: z.enum(["BREAST", "BOTTLE", "BOTH", "SOLID"]).optional(),
  foodName: z.string().max(200).optional(),
  diaperType: z.enum(["PEE", "POOP", "BOTH"]).optional(),
  nurseDuration: z.number().min(0).optional(),
  nurseSide: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
  pumpAmount: z.number().min(0).optional(),
  pumpUnit: z.enum(["OZ", "ML"]).optional(),
  pumpSide: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
  startedAt: z.string().optional(),
});

export const updateLogSchema = z.object({
  occurredAt: z.string().optional(),
  notes: z.string().max(500).optional(),
  feedAmount: z.number().min(0).optional(),
  feedUnit: z.enum(["OZ", "ML"]).optional(),
  feedType: z.enum(["BREAST", "BOTTLE", "BOTH", "SOLID"]).optional(),
  foodName: z.string().max(200).optional(),
  diaperType: z.enum(["PEE", "POOP", "BOTH"]).optional(),
  nurseDuration: z.number().min(0).optional(),
  nurseSide: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
  pumpAmount: z.number().min(0).optional(),
  pumpUnit: z.enum(["OZ", "ML"]).optional(),
  pumpSide: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
  stopTimer: z.boolean().optional(),
});

export const createNoteSchema = z.object({
  childId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(120),
  body: z.string().trim().min(1, "Note is required").max(2000),
  purpose: z.enum(["GUIDE", "INSTRUCTION", "UPDATE", "QUESTION", "GENERAL"]).default("GENERAL"),
  audience: z.enum(["EVERYONE", "PARENTS", "CAREGIVERS", "SPECIFIC"]).default("EVERYONE"),
  attentionName: z.string().trim().max(100).optional(),
  editPermission: z.enum(["CREATOR_ONLY", "PARENTS", "CAREGIVERS", "EVERYONE"]).default("CREATOR_ONLY"),
  pinned: z.boolean().optional(),
});

export const updateNoteSchema = createNoteSchema.omit({ childId: true }).partial();

export const inviteSchema = z.object({
  childId: z.string().uuid(),
  email: z.string().email("Invalid email"),
  role: z.enum(["PARENT", "CARETAKER", "BABYSITTER"]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  designation: z.enum(["PARENT", "CARETAKER", "BABYSITTER"]).optional(),
  currentPassword: z.string().optional(),
  password: z.string().min(8).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateChildInput = z.infer<typeof createChildSchema>;
export type CreateLogInput = z.infer<typeof createLogSchema>;
export type UpdateLogInput = z.infer<typeof updateLogSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
