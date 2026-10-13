"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { assignScorekeeper, listScorekeepers, removeScorekeeper } from "@basket-log/db";
import type { Enums } from "@basket-log/db";
import { createClient } from "@/lib/supabase/browser";
import { friendlyError } from "../../errors";

interface GameFields {
  id: string;
  competition: string;
  venue: string;
  startsAt: string | null;
  isPublic: boolean;
  status: Enums<"game_status">;
}

interface Scorekeeper {
  user_id: string;
  email: string;
}

const inputCls = "h-11 w-full rounded-[10px] border-[1.5px] border-line bg-card px-3 outline-none focus:border-green";
const labelCls = "flex flex-col gap-1 text-xs font-semibold tracking-wider text-muted uppercase";

/** ISO timestamp -> value for <input type="datetime-local"> in the viewer's time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminGameForm({
  game,
  scorekeepers: initialScorekeepers,
  scorekeeperError,
}: {
  game: GameFields;
  scorekeepers: Scorekeeper[];
  scorekeeperError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [competition, setCompetition] = useState(game.competition);
  const [venue, setVenue] = useState(game.venue);
  const [startsAt, setStartsAt] = useState(toLocalInput(game.startsAt));
  const [isPublic, setIsPublic] = useState(game.isPublic);
  const [status, setStatus] = useState(game.status);
  const [savedStatus, setSavedStatus] = useState(game.status);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [scorekeepers, setScorekeepers] = useState(initialScorekeepers);
  const [email, setEmail] = useState("");
  const [skMessage, setSkMessage] = useState<string | null>(scorekeeperError);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase
      .from("games")
      .update({
        competition: competition.trim() || null,
        venue: venue.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        is_public: isPublic,
        status,
      })
      .eq("id", game.id)
      .select("id");
    setBusy(false);
    if (error || !data?.length) {
      setMessage({ kind: "error", text: friendlyError(error ?? new Error("0 rows")) });
      return;
    }
    setSavedStatus(status);
    setMessage({ kind: "ok", text: "Saved." });
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this game? This can't be undone.")) return;
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase.from("games").delete().eq("id", game.id).select("id");
    setBusy(false);
    if (error || !data?.length) {
      setMessage({ kind: "error", text: friendlyError(error ?? new Error("0 rows")) });
      return;
    }
    router.push("/admin");
  }

  async function refreshScorekeepers() {
    setScorekeepers(await listScorekeepers(supabase, game.id));
  }

  async function addScorekeeper(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSkMessage(null);
    try {
      await assignScorekeeper(supabase, game.id, email.trim());
      setEmail("");
      await refreshScorekeepers();
    } catch (err) {
      setSkMessage(friendlyError(err));
    }
  }

  async function dropScorekeeper(userId: string) {
    setSkMessage(null);
    try {
      await removeScorekeeper(supabase, game.id, userId);
      await refreshScorekeepers();
    } catch (err) {
      setSkMessage(friendlyError(err));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={save} className="flex flex-col gap-4 rounded-[14px] border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-bold uppercase">Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className={labelCls}>
            Competition
            <input className={inputCls} value={competition} onChange={(e) => setCompetition(e.target.value)} />
          </label>
          <label className={labelCls}>
            Venue
            <input className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} />
          </label>
          <label className={labelCls}>
            Start time
            <input type="datetime-local" className={inputCls} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label className={labelCls}>
            Status
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as Enums<"game_status">)}>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="final">Final</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="size-5 accent-green" />
          Public (anyone with the link can view this game)
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-full bg-green px-6 font-display font-bold tracking-wide text-card uppercase disabled:opacity-50"
          >
            Save changes
          </button>
          {savedStatus === "scheduled" && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="h-11 rounded-full border-[1.5px] border-ink px-6 font-display font-bold tracking-wide uppercase disabled:opacity-50"
            >
              Delete game
            </button>
          )}
          {message && (
            <p role="status" className={`text-sm font-semibold ${message.kind === "ok" ? "text-green" : "text-ink"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>

      <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-bold uppercase">Scorekeepers</h2>
        <p className="text-sm text-muted">Scorekeepers can record events for this game. Add them by the email they sign in with.</p>
        <ul className="flex flex-col divide-y divide-line-2">
          {scorekeepers.length === 0 && <li className="py-2 text-sm text-muted">No scorekeepers assigned.</li>}
          {scorekeepers.map((s) => (
            <li key={s.user_id} className="flex items-center justify-between py-2">
              <span className="font-semibold">{s.email}</span>
              <button
                type="button"
                onClick={() => dropScorekeeper(s.user_id)}
                className="text-sm font-semibold text-muted underline hover:text-ink"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={addScorekeeper} className="flex gap-3">
          <input
            type="email"
            placeholder="scorekeeper@example.com"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="h-11 shrink-0 rounded-full bg-ink px-6 font-display font-bold tracking-wide text-card uppercase">
            Add
          </button>
        </form>
        {skMessage && (
          <p role="status" className="text-sm font-semibold text-ink">
            {skMessage}
          </p>
        )}
      </section>
    </div>
  );
}
