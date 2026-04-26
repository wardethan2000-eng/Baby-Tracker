import { NextRequest, NextResponse } from "next/server";

const attempts = new Map<string, { count: number; expires: number }>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/auth/signup": { max: 5, windowMs: 60 * 60 * 1000 },
  "/api/auth/forgot-password": { max: 5, windowMs: 60 * 60 * 1000 },
  "/api/auth/reset-password": { max: 10, windowMs: 60 * 60 * 1000 },
};

export function rateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const config = LIMITS[pathname];
  if (!config) return null;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const key = `${pathname}:${ip}`;
  const now = Date.now();

  const entry = attempts.get(key);
  if (!entry || now > entry.expires) {
    attempts.set(key, { count: 1, expires: now + config.windowMs });
    return null;
  }

  if (entry.count >= config.max) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  entry.count++;
  return null;
}

setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  attempts.forEach((entry, key) => {
    if (now > entry.expires) keysToDelete.push(key);
  });
  keysToDelete.forEach((key) => attempts.delete(key));
}, 5 * 60 * 1000);