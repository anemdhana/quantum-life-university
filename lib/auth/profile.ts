import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "user";

export type SessionProfile = {
  userId: string;
  email: string | null;
  role: AppRole;
};

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const role: AppRole = profile?.role === "admin" ? "admin" : "user";
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    role,
  };
}

export async function isAdminUser(): Promise<boolean> {
  const profile = await getSessionProfile();
  return profile?.role === "admin";
}
