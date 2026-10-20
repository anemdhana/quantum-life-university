"use client";

import { FormEvent, useState } from "react";
import { PASSWORD_HINT, passwordProblems } from "@/lib/password";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    const problems = passwordProblems(password, email);
    if (password !== confirm) problems.push("The new passwords do not match.");
    if (password === currentPassword) problems.push("Choose a password that is different from the current one.");
    if (problems.length > 0) {
      setMessage(problems.join(" "));
      return;
    }

    setPending(true);
    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase is not configured.");
      setPending(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
      current_password: currentPassword,
    });
    if (error) {
      setMessage(error.message);
      setPending(false);
      return;
    }

    setCurrentPassword("");
    setPassword("");
    setConfirm("");
    setMessage("Password updated.");
    setPending(false);
  }

  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <div className="uk-card uk-card-default uk-card-body uk-width-large">
      <form onSubmit={(event) => void changePassword(event)}>
        <label className="uk-form-label" htmlFor="current-password">
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          required
          className="uk-input uk-margin-small-bottom"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
        />
        <label className="uk-form-label" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={12}
          className="uk-input uk-margin-small-bottom"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
        <label className="uk-form-label" htmlFor="confirm-password">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={12}
          className="uk-input uk-margin-small-bottom"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
        />
        <p className="muted">{PASSWORD_HINT}</p>
        <button type="submit" className="uk-button uk-button-primary" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>{" "}
        <button type="button" className="uk-button uk-button-default" onClick={() => void signOut()}>
          Sign out
        </button>
      </form>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
