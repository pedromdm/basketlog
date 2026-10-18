"use client";

import { useMemo, useState } from "react";
import {
  addGroup,
  addPhase,
  addRound,
  assignTeam,
  copyAssignments,
  createCompetition,
  deleteCompetition,
  enrollTeam,
  listCompetitions,
  remove,
  rename,
  updateCompetition,
  withdrawTeam,
} from "@basket-log/db";
import type { CompetitionTree, Phase } from "@basket-log/db";
import { createClient } from "@/lib/supabase/browser";

interface TeamLite {
  id: string;
  name: string;
  abbr: string;
  color: string;
}

const inputCls = "h-10 w-full rounded-[10px] border-[1.5px] border-line bg-card px-3 outline-none focus:border-green";
const smallBtn = "h-9 rounded-[10px] border border-line-3 px-3 text-sm font-semibold";

export function CompetitionsEditor({ initialCompetitions, teams }: { initialCompetitions: CompetitionTree[]; teams: TeamLite[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [selectedId, setSelectedId] = useState<string | null>(initialCompetitions[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const selected = competitions.find((c) => c.id === selectedId) ?? null;

  /** Runs a change, then reloads everything: the tree is small and this keeps positions and assignments right. */
  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
      setCompetitions(await listCompetitions(supabase));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const create = () =>
    run(async () => {
      const created = await createCompetition(supabase, "New competition");
      setSelectedId(created.id);
    });

  return (
    <div className="grid grid-cols-[300px_1fr] gap-8">
      <aside>
        <h1 className="mb-5 font-display text-6xl font-extrabold italic uppercase leading-none">Competitions</h1>
        <ul className="flex flex-col gap-2.5">
          {competitions.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-[14px] border px-4 py-3 text-left ${
                  c.id === selectedId ? "border-ink bg-ink text-card" : "border-line bg-card"
                }`}
              >
                <span className="block font-display text-xl font-bold uppercase leading-tight">{c.name}</span>
                <span className={`text-xs ${c.id === selectedId ? "text-muted-on-dark" : "text-muted"}`}>
                  {c.season ? `${c.season} · ` : ""}
                  {c.teamIds.length} teams · {c.phases.length} phases
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button onClick={create} className="mt-2.5 h-11 w-full rounded-[14px] border border-dashed border-line-3 text-sm font-semibold">
          + New competition
        </button>
      </aside>

      <section className="rounded-[16px] border border-line bg-card p-7">
        {error && (
          <p role="alert" className="mb-4 rounded-[10px] bg-ink px-4 py-2 text-sm text-card">
            {error}
          </p>
        )}
        {selected ? (
          <CompetitionEditor
            key={selected.id}
            competition={selected}
            teams={teams}
            run={run}
            supabase={supabase}
            onDeleted={() => setSelectedId(competitions.find((c) => c.id !== selected.id)?.id ?? null)}
          />
        ) : (
          <p className="text-muted">No competitions yet. Create one to start.</p>
        )}
      </section>
    </div>
  );
}

type Supabase = ReturnType<typeof createClient>;
type Run = (action: () => Promise<void>) => Promise<void>;

function CompetitionEditor({
  competition,
  teams,
  run,
  supabase,
  onDeleted,
}: {
  competition: CompetitionTree;
  teams: TeamLite[];
  run: Run;
  supabase: Supabase;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(competition.name);
  const [season, setSeason] = useState(competition.season ?? "");
  const enrolled = teams.filter((t) => competition.teamIds.includes(t.id));

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-[1fr_200px_auto] items-end gap-3">
        <label className="text-sm font-semibold">
          Name
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== competition.name && run(() => updateCompetition(supabase, competition.id, { name: name.trim() }))}
          />
        </label>
        <label className="text-sm font-semibold">
          Season
          <input
            className={inputCls}
            value={season}
            placeholder="2026/27"
            onChange={(e) => setSeason(e.target.value)}
            onBlur={() => season !== (competition.season ?? "") && run(() => updateCompetition(supabase, competition.id, { season: season.trim() || null }))}
          />
        </label>
        <button
          className={smallBtn}
          onClick={() => {
            if (!window.confirm(`Delete "${competition.name}" with its phases, groups and rounds? Games are kept.`)) return;
            void run(async () => {
              await deleteCompetition(supabase, competition.id);
              onDeleted();
            });
          }}
        >
          Delete
        </button>
      </div>

      <div>
        <h2 className="mb-1 font-display text-2xl font-bold uppercase">Teams</h2>
        <p className="mb-3 text-sm text-muted">A team can be in several competitions.</p>
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => {
            const on = competition.teamIds.includes(t.id);
            return (
              <button
                key={t.id}
                aria-pressed={on}
                onClick={() => run(() => (on ? withdrawTeam(supabase, competition, t.id) : enrollTeam(supabase, competition.id, t.id)))}
                className={`flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold ${
                  on ? "border-green bg-green text-card" : "border-line-3 bg-card"
                }`}
              >
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: t.color }} />
                {t.name}
              </button>
            );
          })}
          {teams.length === 0 && <p className="text-sm text-muted">Create teams first (Teams page).</p>}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="font-display text-2xl font-bold uppercase">Phases</h2>
        {competition.phases.map((phase) => (
          <PhaseEditor key={phase.id} phase={phase} competition={competition} enrolled={enrolled} run={run} supabase={supabase} />
        ))}
        <button
          className="h-11 rounded-[14px] border border-dashed border-line-3 text-sm font-semibold"
          onClick={() => run(() => addPhase(supabase, competition.id, `Phase ${competition.phases.length + 1}`))}
        >
          + Add phase
        </button>
      </div>
    </div>
  );
}

/** Rename-on-blur text field used for phases, groups and rounds. */
function NameField({ value, onSave, className = inputCls }: { value: string; onSave: (name: string) => void; className?: string }) {
  const [text, setText] = useState(value);
  return (
    <input
      className={className}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => (text.trim() && text !== value ? onSave(text.trim()) : setText(value))}
    />
  );
}

function PhaseEditor({
  phase,
  competition,
  enrolled,
  run,
  supabase,
}: {
  phase: Phase;
  competition: CompetitionTree;
  enrolled: TeamLite[];
  run: Run;
  supabase: Supabase;
}) {
  const [roundId, setRoundId] = useState(phase.rounds[0]?.id ?? "");
  const round = phase.rounds.find((r) => r.id === roundId) ?? phase.rounds[0] ?? null;
  const groupOf = (teamId: string) => competition.assignments.find((a) => a.round_id === round?.id && a.team_id === teamId)?.group_id ?? "";

  const nextRound = () =>
    run(async () => {
      const created = await addRound(supabase, phase.id, `Round ${phase.rounds.length + 1}`);
      // every team keeps its group; the admin then moves the ones that go up or down
      if (round) await copyAssignments(supabase, round.id, created);
      setRoundId(created);
    });

  return (
    <div className="rounded-[14px] border border-line p-5">
      <div className="mb-4 flex items-center gap-3">
        <NameField value={phase.name} onSave={(n) => run(() => rename(supabase, "competition_phases", phase.id, n))} className={`${inputCls} max-w-[320px] font-semibold`} />
        <button
          className={smallBtn}
          onClick={() => window.confirm(`Delete "${phase.name}"?`) && run(() => remove(supabase, "competition_phases", phase.id))}
        >
          Delete phase
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Groups</h3>
          <ul className="flex flex-col gap-2">
            {phase.groups.map((g) => (
              <li key={g.id} className="flex gap-2">
                <NameField value={g.name} onSave={(n) => run(() => rename(supabase, "competition_groups", g.id, n))} />
                <button className={smallBtn} aria-label={`Delete ${g.name}`} onClick={() => run(() => remove(supabase, "competition_groups", g.id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button className={`${smallBtn} mt-2`} onClick={() => run(() => addGroup(supabase, phase.id, `Group ${String.fromCharCode(65 + phase.groups.length)}`))}>
            + Group
          </button>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Rounds</h3>
          <ul className="flex flex-col gap-2">
            {phase.rounds.map((r) => (
              <li key={r.id} className="flex gap-2">
                <button
                  aria-pressed={r.id === round?.id}
                  onClick={() => setRoundId(r.id)}
                  className={`h-10 w-10 shrink-0 rounded-[10px] border text-sm font-bold ${r.id === round?.id ? "border-green bg-green text-card" : "border-line-3"}`}
                >
                  {r.position}
                </button>
                <NameField value={r.name} onSave={(n) => run(() => rename(supabase, "competition_rounds", r.id, n))} />
                <button className={smallBtn} aria-label={`Delete ${r.name}`} onClick={() => run(() => remove(supabase, "competition_rounds", r.id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button className={`${smallBtn} mt-2`} onClick={nextRound}>
            {round ? "+ Next round (copy groups)" : "+ Round"}
          </button>
        </div>
      </div>

      {round && phase.groups.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Teams in {round.name}</h3>
          {enrolled.length === 0 ? (
            <p className="text-sm text-muted">Enrol teams in the competition first.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {enrolled.map((t) => (
                <label key={t.id} className="flex items-center justify-between gap-3 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </span>
                  <select
                    className="h-9 min-w-[140px] rounded-[10px] border-[1.5px] border-line bg-card px-2"
                    value={groupOf(t.id)}
                    onChange={(e) => run(() => assignTeam(supabase, round.id, t.id, e.target.value || null))}
                  >
                    <option value="">Not in a group</option>
                    {phase.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
