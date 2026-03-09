export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /sign-in
     * - /api/auth (NextAuth routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /public assets
     */
    "/((?!sign-in|api/auth|api/cli|_next|favicon\\.ico).*)",
  ],
};
