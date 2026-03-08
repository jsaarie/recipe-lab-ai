import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Redirect unauthenticated users away from protected routes
  if (!session && (pathname.startsWith("/profile") || pathname.startsWith("/library"))) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // V-04: MFA enforcement — block all protected routes until TOTP is verified
  if (
    session &&
    session.user.mfaEnabled &&
    !session.user.mfaVerified &&
    pathname !== "/verify-mfa" &&
    pathname !== "/api/user/mfa/verify" // Allow the MFA verify endpoint itself
  ) {
    // Return 401 JSON for API routes instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "MFA verification required" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/verify-mfa", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/parse-recipe|api/map-ingredients|api/parse-html).*)",
  ],
};
