import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Auth.js (NextAuth v5) with a single GitHub provider — the whole front door.
 * We request `read:user` (identity) and `repo` so the inkblot can count private
 * activity too, not just public commits. The OAuth access token is stashed on
 * the JWT and surfaced on the session so server routes can call the GitHub API
 * as the signed-in developer.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
