import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { supabaseFetch } from "@/lib/supabase/fetch";

const AUTH_REFRESH_TIMEOUT_MS = 800;
const REFRESH_IF_EXPIRES_WITHIN_MS = 5 * 60 * 1000;

function authTokenCookies(request: NextRequest) {
  return request.cookies
    .getAll()
    .filter((cookie) => cookie.name.includes("auth-token"))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readSessionExpiresAt(request: NextRequest): number | null {
  const chunks = authTokenCookies(request);
  if (!chunks.length) return null;

  try {
    let raw = chunks.map((cookie) => cookie.value).join("");
    if (raw.startsWith("base64-")) {
      const b64 = raw.slice("base64-".length).replace(/-/g, "+").replace(/_/g, "/");
      raw = Buffer.from(b64, "base64").toString("utf8");
    }
    const parsed = JSON.parse(raw) as { expires_at?: number };
    return typeof parsed.expires_at === "number" ? parsed.expires_at : null;
  } catch {
    return null;
  }
}

function needsAuthRefresh(request: NextRequest) {
  // Only real auth-token cookies — not every sb-* cookie.
  if (!authTokenCookies(request).length) return false;
  const expiresAt = readSessionExpiresAt(request);
  if (expiresAt == null) return true;
  return expiresAt * 1000 < Date.now() + REFRESH_IF_EXPIRES_WITHIN_MS;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  if (!needsAuthRefresh(request)) return response;

  const supabase = createServerClient<Database>(url, key, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await Promise.race([
    supabase.auth.getUser(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, AUTH_REFRESH_TIMEOUT_MS);
    }),
  ]);
  return response;
}
