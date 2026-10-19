"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup" | "link";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const fail = (text: string) => {
      setStatus("error");
      setMessage(text);
    };
    if (mode === "link") {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) return fail(error.message);
      return setStatus("sent");
    }
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
      if (error) return fail(error.message);
      // without a session the project requires the email to be confirmed first
      if (!data.session) {
        setMessage("Account created. Check your inbox to confirm the email, then sign in.");
        return setStatus("sent");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return fail(error.message);
    }
    router.push("/teams");
    router.refresh();
  }

  async function forgotPassword() {
    if (!email) {
      setStatus("error");
      setMessage("Type your email first, then ask for the reset link.");
      return;
    }
    setStatus("sending");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account`,
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setMessage("Check your inbox for the link to set a new password.");
    setStatus("sent");
  }

  const copy = {
    signin: { title: "Sign in", hint: "Use your email and password.", button: "Sign in" },
    signup: { title: "Create account", hint: "Choose a password of at least 6 characters.", button: "Create account" },
    link: { title: "Sign in", hint: "We email you a magic link. No password needed.", button: "Send magic link" },
  }[mode];
  const switchTo = (next: Mode) => {
    setMode(next);
    setStatus("idle");
  };
  const linkCls = "text-sm font-semibold underline underline-offset-2";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-card p-8">
        <h1 className="font-display text-4xl font-extrabold italic uppercase">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted">{copy.hint}</p>
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
        {mode !== "link" && (
          <>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-11 w-full rounded-[10px] border-[1.5px] border-line px-3 outline-none focus:border-green"
            />
          </>
        )}
        <button
          type="submit"
          disabled={status === "sending"}
          className="mt-4 h-11 w-full rounded-xl bg-ink font-display text-lg font-bold uppercase tracking-wide text-card disabled:opacity-60"
        >
          {status === "sending" ? "Please wait…" : copy.button}
        </button>
        {status === "sent" && <p className="mt-3 text-sm text-green">{message || "Check your inbox for the sign-in link."}</p>}
        {status === "error" && <p className="mt-3 text-sm text-ink">{message}</p>}
        {status !== "error" && callbackError && <p className="mt-3 text-sm text-ink">{callbackError}</p>}
        <div className="mt-5 flex flex-col gap-2">
          {mode === "signin" && (
            <button type="button" className={linkCls} onClick={() => void forgotPassword()}>
              Forgot or no password? Email me a link to set one
            </button>
          )}
          {mode === "signin" && (
            <button type="button" className={linkCls} onClick={() => switchTo("signup")}>
              No account? Create one
            </button>
          )}
          {mode !== "signin" && (
            <button type="button" className={linkCls} onClick={() => switchTo("signin")}>
              Sign in with email and password
            </button>
          )}
          {mode !== "link" && (
            <button type="button" className={linkCls} onClick={() => switchTo("link")}>
              Email me a magic link instead
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
