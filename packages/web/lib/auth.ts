import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const isOnSignIn = request.nextUrl.pathname.startsWith("/sign-in");

      if (isOnSignIn) {
        // If already logged in, redirect to dashboard
        if (isLoggedIn) return Response.redirect(new URL("/", request.nextUrl));
        return true; // Allow access to sign-in page
      }

      // Protect all other routes
      return isLoggedIn;
    },
    async signIn() {
      // Users join projects explicitly via /join/<projectId> links.
      // No auto-add — signing in alone doesn't grant project access.
      return true;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.githubHandle = profile.login as string;
        token.avatar = profile.avatar_url as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.githubHandle) {
        (session.user as any).githubHandle = token.githubHandle;
      }
      if (token.avatar) {
        (session.user as any).image = token.avatar;
      }
      return session;
    },
  },
});
