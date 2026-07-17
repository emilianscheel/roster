import { NextRequest, NextResponse } from "next/server";

/**
 * Do not gate routes on cookie presence alone.
 * Safari often keeps a stale `better-auth.session_token`; middleware would
 * send /sign-in → / while the app layout sends / → /sign-in (redirect loop).
 * Auth is enforced in server layouts via `requireSession` / `getOptionalSession`.
 */
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
