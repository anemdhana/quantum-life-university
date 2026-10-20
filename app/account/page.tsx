import Link from "next/link";
import { PasswordForm } from "@/components/auth/PasswordForm";
import { SitePage } from "@/components/SitePage";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: auth } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = auth.user;

  let role: string | null = null;
  let fullName: string | null = null;
  if (supabase && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? null;
    fullName = profile?.full_name ?? null;
  }

  return (
    <SitePage>
      <h1>Account</h1>
      {user ? (
        <>
          <p className="muted">
            {fullName ? `${fullName} · ` : null}
            {user.email} · {role === "admin" ? "Admin" : "Reader"}
          </p>
          <PasswordForm email={user.email ?? ""} />
        </>
      ) : (
        <p className="muted">
          <Link href="/login">Sign in</Link> to change your password.
        </p>
      )}
    </SitePage>
  );
}
