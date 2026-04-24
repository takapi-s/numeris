import { createClient } from "@supabase/supabase-js";

let cached:
  | ReturnType<typeof createClient>
  | undefined;

export function supabaseBrowser() {
  if (cached) return cached;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
  }

  cached = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  return cached;
}

