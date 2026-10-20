import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { supabaseFetch } from "@/lib/supabase/fetch";

export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
    },
  );
}
