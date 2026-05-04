import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const STRIPE_CONFIGURED = !!process.env.STRIPE_SECRET_KEY;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isLandingPage = pathname === "/";

  if (isLandingPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isInviteRoute = pathname.startsWith("/invite");
  const isBillingRoute = pathname.startsWith("/billing");

  if (isInviteRoute) return NextResponse.next();
  if (isLandingPage) return NextResponse.next();

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  if (isLoggedIn && STRIPE_CONFIGURED && req.auth?.user) {
    const { paidAt, trialEndsAt } = req.auth.user;
    const isPaid = !!paidAt;
    const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
    const trialExpired = trialEnd && trialEnd < new Date();
    const needsPayment = !isPaid && trialExpired;

    if (needsPayment && !isBillingRoute) {
      return NextResponse.redirect(new URL("/billing", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|favicon.ico|manifest.json|sw.js|push-sw.js|workbox-.*\\.js).*)"],
};