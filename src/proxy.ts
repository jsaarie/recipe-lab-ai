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

  // MFA challenge: user authenticated but hasn't verified TOTP this session
  if (
    session &&
    session.user.mfaEnabled &&
    !session.user.mfaVerified &&
    pathname !== "/verify-mfa"
  ) {
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
