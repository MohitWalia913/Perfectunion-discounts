"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getPublicSupabaseConfig } from "@/lib/supabase/keys"

export function createClient() {
  const { url, key } = getPublicSupabaseConfig()
  return createBrowserClient(url, key)
}
