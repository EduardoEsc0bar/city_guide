import "server-only"

import { lookup } from "node:dns/promises"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
let supabaseHostname: string | null = null
let supabaseReachabilityCache:
  | {
      expiresAt: number
      reachable: boolean
    }
  | undefined

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables")
}

try {
  const parsedUrl = new URL(supabaseUrl)
  if (parsedUrl.protocol !== "https:") {
    throw new Error("Supabase URL must use https")
  }
  supabaseHostname = parsedUrl.hostname
} catch (error) {
  throw new Error(
    `Invalid NEXT_PUBLIC_SUPABASE_URL: ${
      error instanceof Error ? error.message : "unknown error"
    }`
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: { "x-my-custom-header": "CityGuide" },
  },
  db: {
    schema: "public",
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export async function isSupabaseReachable() {
  if (!supabaseHostname) {
    return false
  }

  if (supabaseReachabilityCache && supabaseReachabilityCache.expiresAt > Date.now()) {
    return supabaseReachabilityCache.reachable
  }

  try {
    await Promise.race([
      lookup(supabaseHostname),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase DNS lookup timed out")), 1500),
      ),
    ])

    supabaseReachabilityCache = {
      expiresAt: Date.now() + 30_000,
      reachable: true,
    }
    return true
  } catch {
    supabaseReachabilityCache = {
      expiresAt: Date.now() + 30_000,
      reachable: false,
    }
    return false
  }
}
