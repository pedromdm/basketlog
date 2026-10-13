"use client";

import { useMemo, useState } from "react";
import { validateRoster } from "@basket-log/core";
import { addPlayer, createTeam, removePlayer, updatePlayer, updateTeam } from "@basket-log/db";
import type { BasketClient, Enums, Player, TeamWithPlayers } from "@basket-log/db";
import { createClient } from "@/lib/supabase/browser";
import { TEAM_COLORS } from "./team-colors";

type Position = Enums<"position">;
type Run = (action: () => Promise<void>) => Promise<void>;
const POSITIONS: Position[] = ["G", "F", "C"];

interface Draft {
  number: string;
  first: string;
  last: string;
  short: string;
}

const EMPTY: Draft = { number: "", first: "", last: "", short: "" };

const toDraft = (p: Player): Draft => ({
  number: String(p.number),
  first: p.first_name,
  last: p.last_name,
  short: p.display_name === p.last_name ? "" : p.display_name,
});

/** The short name defaults to the last name when left empty. */
const effective = (id: string, d: Draft) => ({
  id,
  firstName: d.first,
  lastName: d.last,
  displayName: d.short.trim() || d.last,
  number: d.number.trim() === "" ? Number.NaN : Number(d.number),
});

const inputCls = "h-10 w-full rounded-[10px] border-[1.5px] border-line bg-card px-3 outline-none focus:border-green";

export function TeamsEditor({ initialTeams }: { initialTeams: TeamWithPlayers[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [teams, setTeams] = useState(initialTeams);
  const [selectedId, setSelectedId] = useState(initialTeams[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  const team = teams.find((t) => t.id === selectedId) ?? null;

  const patchTeam = (id: string, patch: Partial<TeamWithPlayers>) =>
    setTeams((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const run: Run = async (action) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const newTeam = () =>
    run(async () => {
      const created = await createTeam(supabase, {
        name: "New team",
        abbr: "NEW",
        city: null,
        color_primary: TEAM_COLORS[0],
        league_id: null,
      });
      setTeams((all) => [...all, { ...created, players: [] }]);
      setSelectedId(created.id);
    });

  return (
    <div className="grid grid-cols-[300px_1fr] gap-8">
      <aside>
        <h1 className="mb-5 font-display text-6xl font-extrabold italic uppercase leading-none">Teams</h1>
        <ul className="flex flex-col gap-2.5">
          {teams.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setSelectedId(t.id)}
                className={`flex w-full items-center gap-3 rounded-[14px] border px-4 py-3 text-left ${
                  t.id === selectedId ? "border-ink bg-ink text-card" : "border-line bg-card"
                }`}
              >
                <TeamChip abbr={t.abbr} color={t.color_primary} size={36} />
                <span>
                  <span className="block font-display text-xl font-bold uppercase leading-tight">{t.name}</span>
                  <span className={`text-xs ${t.id === selectedId ? "text-muted-on-dark" : "text-muted"}`}>
                    {t.city ? `${t.city} · ` : ""}
                    {t.players.length} players
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={newTeam}
          className="mt-2.5 h-11 w-full rounded-[14px] border border-dashed border-line-3 text-sm font-semibold"
        >
          + New team
        </button>
      </aside>

      <section className="rounded-[16px] border border-line bg-card p-7">
        {error && (
          <p role="alert" className="mb-4 rounded-[10px] bg-ink px-4 py-2 text-sm text-card">
            {error}
          </p>
        )}
        {team ? (
          <TeamEditor
            key={team.id}
            team={team}
            onTeamPatch={(patch) => patchTeam(team.id, patch)}
            onPlayers={(players) => patchTeam(team.id, { players })}
            run={run}
            supabase={supabase}
          />
        ) : (
          <p className="text-muted">No teams yet. Create one to start.</p>
        )}
      </section>
    </div>
  );
}

function TeamChip({ abbr, color, size }: { abbr: string; color: string; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-card"
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
    >
      {abbr}
    </span>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

function TeamEditor({
  team,
  onTeamPatch,
  onPlayers,
  run,
  supabase,
}: {
  team: TeamWithPlayers;
  onTeamPatch: (patch: Partial<TeamWithPlayers>) => void;
  onPlayers: (players: Player[]) => void;
  run: Run;
  supabase: BasketClient;
}) {
  const save = (patch: Parameters<typeof updateTeam>[2]) => run(() => updateTeam(supabase, team.id, patch));

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <TeamChip abbr={team.abbr} color={team.color_primary} size={64} />
        <Field label="Team name" className="min-w-[240px] flex-1">
          <input
            className={inputCls}
            value={team.name}
            onChange={(e) => onTeamPatch({ name: e.target.value })}
            onBlur={() => team.name.trim() && save({ name: team.name.trim() })}
          />
        </Field>
        <Field label="Short code" className="w-[150px]">
          <input
            className={`${inputCls} uppercase`}
            maxLength={4}
            value={team.abbr}
            onChange={(e) => onTeamPatch({ abbr: e.target.value.toUpperCase() })}
            onBlur={() => team.abbr.length >= 2 && save({ abbr: team.abbr })}
          />
        </Field>
        <Field label="City" className="w-[200px]">
          <input
            className={inputCls}
            value={team.city ?? ""}
            onChange={(e) => onTeamPatch({ city: e.target.value })}
            onBlur={() => save({ city: team.city?.trim() || null })}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Team colour</span>
        {TEAM_COLORS.map((c) => (
          <button
            key={c}
            aria-label={`Colour ${c}`}
            onClick={() => {
              onTeamPatch({ color_primary: c });
              void save({ color_primary: c });
            }}
            className={`h-[30px] w-[30px] rounded-full ${
              team.color_primary.toLowerCase() === c.toLowerCase() ? "ring-2 ring-ink ring-offset-2" : ""
            }`}
            style={{ background: c }}
          />
        ))}
      </div>

      <Roster team={team} onPlayers={onPlayers} run={run} supabase={supabase} />
    </>
  );
}

function Roster({
  team,
  onPlayers,
  run,
  supabase,
}: {
  team: TeamWithPlayers;
  onPlayers: (players: Player[]) => void;
  run: Run;
  supabase: BasketClient;
}) {
  const players = team.players;
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(players.map((p) => [p.id, toDraft(p)])),
  );
  const [adding, setAdding] = useState<Draft>(EMPTY);

  const draftOf = (p: Player) => drafts[p.id] ?? toDraft(p);

  const issues = useMemo(
    () => validateRoster(players.map((p) => effective(p.id, drafts[p.id] ?? toDraft(p)))),
    [players, drafts],
  );
  const issuesFor = (id: string) => issues.filter((i) => i.playerId === id);

  const addIssues = useMemo(() => {
    const roster = [...players.map((p) => effective(p.id, drafts[p.id] ?? toDraft(p))), effective("new", adding)];
    return validateRoster(roster).filter((i) => i.playerId === "new");
  }, [players, drafts, adding]);

  const setField = (id: string, field: keyof Draft, value: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] as Draft), [field]: value } }));

  /** Autosave on blur, but only a row with no validation problems. */
  function commit(p: Player) {
    if (issuesFor(p.id).length > 0) return;
    const e = effective(p.id, draftOf(p));
    const patch = {
      first_name: e.firstName.trim(),
      last_name: e.lastName.trim(),
      display_name: e.displayName.trim(),
      number: e.number,
    };
    const unchanged =
      patch.first_name === p.first_name &&
      patch.last_name === p.last_name &&
      patch.display_name === p.display_name &&
      patch.number === p.number;
    if (unchanged) return;
    void run(async () => {
      await updatePlayer(supabase, p.id, patch);
      onPlayers(players.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    });
  }

  function setPosition(p: Player, pos: Position) {
    const position = p.position === pos ? null : pos;
    void run(async () => {
      await updatePlayer(supabase, p.id, { position });
      onPlayers(players.map((x) => (x.id === p.id ? { ...x, position } : x)));
    });
  }

  function remove(p: Player) {
    void run(async () => {
      await removePlayer(supabase, p.id);
      onPlayers(players.filter((x) => x.id !== p.id));
    });
  }

  const canAdd = addIssues.length === 0;
  function add() {
    if (!canAdd) return;
    const e = effective("new", adding);
    void run(async () => {
      const created = await addPlayer(supabase, {
        team_id: team.id,
        first_name: e.firstName.trim(),
        last_name: e.lastName.trim(),
        display_name: e.displayName.trim(),
        number: e.number,
        position: null,
      });
      setDrafts((d) => ({ ...d, [created.id]: toDraft(created) }));
      onPlayers([...players, created].sort((a, b) => a.number - b.number));
      setAdding(EMPTY);
    });
  }

  const cols = "grid grid-cols-[76px_1fr_1fr_1fr_150px_40px] items-center gap-2";
  const base = "h-10 w-full rounded-[10px] border-[1.5px] bg-card px-3 outline-none";
  const border = (bad: boolean) => (bad ? "border-ink" : "border-line focus:border-green");

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-extrabold uppercase">Roster</h2>
        <span className="text-xs text-muted">{players.length} players · click any field to edit</span>
      </div>
      <div className={`${cols} mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted`}>
        <span>#</span>
        <span>First name</span>
        <span>Last name</span>
        <span className="text-green">Short name · in game</span>
        <span>Position</span>
        <span />
      </div>
      {players.map((p) => {
        const d = draftOf(p);
        const rowIssues = issuesFor(p.id);
        const bad = (f: string) => rowIssues.some((i) => i.field === f);
        return (
          <div key={p.id} className="border-b border-line-2 py-1.5">
            <div className={cols}>
              <input
                aria-label="Number"
                inputMode="numeric"
                className={`${base} font-display text-lg font-bold ${border(bad("number"))}`}
                value={d.number}
                onChange={(e) => setField(p.id, "number", e.target.value)}
                onBlur={() => commit(p)}
              />
              <input
                aria-label="First name"
                className={`${base} ${border(bad("firstName"))}`}
                value={d.first}
                onChange={(e) => setField(p.id, "first", e.target.value)}
                onBlur={() => commit(p)}
              />
              <input
                aria-label="Last name"
                className={`${base} ${border(bad("lastName"))}`}
                value={d.last}
                onChange={(e) => setField(p.id, "last", e.target.value)}
                onBlur={() => commit(p)}
              />
              <input
                aria-label="Short name"
                placeholder={d.last}
                className="h-10 w-full rounded-[10px] border-[1.5px] border-green bg-green-tint px-3 font-display text-lg font-bold uppercase outline-none"
                value={d.short}
                onChange={(e) => setField(p.id, "short", e.target.value)}
                onBlur={() => commit(p)}
              />
              <PositionControl value={p.position} onPick={(pos) => setPosition(p, pos)} />
              <button aria-label={`Remove ${p.display_name}`} onClick={() => remove(p)} className="text-muted hover:text-ink">
                ×
              </button>
            </div>
            {rowIssues.length > 0 && (
              <p className="mt-1 pl-[84px] text-xs font-semibold text-ink">{rowIssues[0]!.message}. Not saved yet.</p>
            )}
          </div>
        );
      })}

      <div className={`${cols} mt-3`}>
        {(["number", "first", "last", "short"] as const).map((f) => (
          <input
            key={f}
            aria-label={`New ${f}`}
            placeholder={{ number: "#", first: "First name", last: "Last name", short: "Short (optional)" }[f]}
            className="h-10 w-full rounded-[10px] border-[1.5px] border-dashed border-line-3 bg-paper px-3 outline-none focus:border-green"
            value={adding[f]}
            onChange={(e) => setAdding((a) => ({ ...a, [f]: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        ))}
        <button
          onClick={add}
          disabled={!canAdd}
          className={`col-span-2 h-10 rounded-[10px] font-display text-sm font-bold uppercase tracking-wide ${
            canAdd ? "bg-green text-card" : "bg-line-3 text-card"
          }`}
        >
          + Add player
        </button>
      </div>
      {adding.number !== "" && addIssues.length > 0 && (
        <p className="mt-1 text-xs font-semibold text-ink">{addIssues[0]!.message}</p>
      )}
      <p className="mt-4 text-xs text-muted">
        Changes save automatically. Jersey numbers must be unique (a duplicate gets a dark border). Short names can
        repeat; they appear next to the number in the trackers and play-by-play. Leave the short name empty to use the
        last name.
      </p>
    </div>
  );
}

function PositionControl({ value, onPick }: { value: Position | null; onPick: (p: Position) => void }) {
  return (
    <div className="flex gap-1 rounded-[10px] bg-line-2 p-1">
      {POSITIONS.map((pos) => (
        <button
          key={pos}
          aria-pressed={value === pos}
          onClick={() => onPick(pos)}
          className={`h-8 flex-1 rounded-lg text-sm font-semibold ${value === pos ? "bg-ink text-card" : "text-muted"}`}
        >
          {pos}
        </button>
      ))}
    </div>
  );
}
