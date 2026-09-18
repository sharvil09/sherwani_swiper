import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Fallbacks keep `next build` from crashing before env vars are set (e.g. on Vercel).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
  return createBrowserClient(url, key);
}
