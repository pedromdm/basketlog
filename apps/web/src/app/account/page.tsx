"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const inputCls = "mt-1 h-11 w-full rounded-[10px] border-[1.5px] border-line px-3 outline-none focus:border-green";
const labelCls = "mt-4 block text-xs font-semibold uppercase tracking-wider text-muted";

/** Set or change the password. Works for a recovery link and for someone who signed in with a magic link. */
export default function AccountPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password !== again) {
      setStatus("error");
      setMessage("The two passwords are different.");
      return;
    }
    setStatus("saving");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setPassword("");
    setAgain("");
    setStatus("saved");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-8">
        <h1 className="font-display text-4xl font-extrabold italic uppercase">Account</h1>
        {email === undefined ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : email === null ? (
          <p className="mt-4 text-sm">
            You are not signed in. <Link href="/login" className="font-semibold underline">Sign in</Link>, or ask for a new
            recovery link if the old one expired.
          </p>
        ) : (
          <form onSubmit={save}>
            <p className="mt-1 text-sm text-muted">{email}</p>
            <p className="mt-4 text-sm">Set a password to sign in without an email link.</p>
            <label className={labelCls} htmlFor="password">
              New password
            </label>
            <input id="password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            <label className={labelCls} htmlFor="again">
              Repeat password
            </label>
            <input id="again" type="password" required minLength={6} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={inputCls} />
            <button type="submit" disabled={status === "saving"} className="mt-4 h-11 w-full rounded-xl bg-ink font-display text-lg font-bold uppercase tracking-wide text-card disabled:opacity-60">
              {status === "saving" ? "Saving…" : "Save password"}
            </button>
            {status === "saved" && <p className="mt-3 text-sm text-green">Password saved. You can now sign in with it.</p>}
            {status === "error" && <p className="mt-3 text-sm text-ink">{message}</p>}
            <button type="button" onClick={signOut} className="mt-5 text-sm font-semibold underline underline-offset-2">
              Sign out
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
