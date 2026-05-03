import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isLandingPage = pathname === "/";

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isInviteRoute = pathname.startsWith("/invite");

  if (isInviteRoute || isLandingPage) return NextResponse.next();

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|favicon.ico|manifest.json|sw.js|push-sw.js|workbox-.*\\.js).*)"],
};
