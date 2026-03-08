import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { sql } from "@/lib/db";

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
    async signIn({ user, profile }) {
      try {
        const githubHandle = (profile?.login as string) || "";
        const email = user.email || "";

        const projects = await sql`
          SELECT id FROM projects ORDER BY created_at DESC LIMIT 1
        `;

        if (projects.length > 0) {
          const projectId = projects[0].id;
          const userId = githubHandle || email;

          await sql`
            INSERT INTO members (project_id, user_id, email, github_handle)
            VALUES (${projectId}, ${userId}, ${email}, ${githubHandle})
            ON CONFLICT (project_id, user_id)
            DO UPDATE SET
              email = EXCLUDED.email,
              github_handle = EXCLUDED.github_handle
          `;
        }
      } catch (e) {
        console.error("signIn callback error:", e);
      }
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
