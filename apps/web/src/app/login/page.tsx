"use client";

import { useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  // the callback route sends failures back here as ?error=callback&reason=...
  const search = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => "",
  );
  const params = new URLSearchParams(search);
  const callbackError = params.get("error")
    ? `Sign-in link failed: ${params.get("reason") ?? "unknown error"}. Request a new link and use the newest email, in the same browser and at the same address.`
    : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-card p-8">
        <h1 className="font-display text-4xl font-extrabold italic uppercase">Sign in</h1>
        <p className="mt-1 text-sm text-muted">We email you a magic link. No password needed.</p>
        <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 h-11 w-full rounded-[10px] border-[1.5px] border-line px-3 outline-none focus:border-green"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="mt-4 h-11 w-full rounded-xl bg-ink font-display text-lg font-bold uppercase tracking-wide text-card disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>
        {status === "sent" && <p className="mt-3 text-sm text-green">Check your inbox for the sign-in link.</p>}
        {status === "error" && <p className="mt-3 text-sm text-ink">{message}</p>}
        {status !== "error" && callbackError && <p className="mt-3 text-sm text-ink">{callbackError}</p>}
      </form>
    </main>
  );
}
