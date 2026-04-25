import "server-only"

import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

import { isSupabaseReachable, supabase } from "@/lib/supabase"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) return false

      const resolvedUserId = user.id ?? account?.providerAccountId ?? user.email

      user.id = resolvedUserId

      try {
        if (!(await isSupabaseReachable())) {
          return true
        }

        const { data, error } = await supabase
          .from("users")
          .upsert(
            {
              id: resolvedUserId,
              email: user.email,
              name: user.name || "",
              avatar_url: user.image || "",
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "email",
            }
          )
          .select()
          .single()

        if (error) {
          console.error("Supabase user sync failed during sign-in:", error)
          return true
        }

        user.id = data.id

        return true
      } catch (error) {
        console.error("Unexpected Supabase user sync error during sign-in:", error)
        return true
      }
    },
    async session({ session, token }) {
      if (session?.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id ?? account?.providerAccountId ?? token.sub
      }
      return token
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  events: {
    async signIn({ user }) {
      console.log("User signed in:", user.email)
    },
    async signOut() {
      console.log("User signed out")
    },
  },
  debug: process.env.NEXTAUTH_DEBUG === "true",
}
