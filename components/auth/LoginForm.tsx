"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function missingConfig() {
    setMessage("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.");
    setPending(false);
  }

  async function signInWithPassword(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    const supabase = createClient();
    if (!supabase) {
      missingConfig();
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setPending(false);
      return;
    }
    window.location.assign("/dashboard");
  }

  async function signInWithEmail() {
    setPending(true);
    const supabase = createClient();
    if (!supabase) {
      missingConfig();
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMessage(error ? error.message : "Check your email for the sign-in link.");
    setPending(false);
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    if (!supabase) {
      setMessage("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setMessage(error.message);
  }

  return (
    <div className="uk-card uk-card-default uk-card-body uk-width-large">
      <form onSubmit={(event) => void signInWithPassword(event)}>
        <label className="uk-form-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          className="uk-input uk-margin-small-bottom"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
        />
        <label className="uk-form-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          className="uk-input uk-margin-small-bottom"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
        <button type="submit" className="uk-button uk-button-primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>{" "}
        <button type="button" className="uk-button uk-button-default" disabled={pending} onClick={() => void signInWithEmail()}>
          Email me a link
        </button>{" "}
        <button type="button" className="uk-button uk-button-default" onClick={() => void signInWithGoogle()}>
          Continue with Google
        </button>
      </form>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
