import type { BasketClient, Tables } from './index';

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export type Competition = Tables<'competitions'>;
export type Phase = Tables<'competition_phases'> & { groups: Tables<'competition_groups'>[]; rounds: Tables<'competition_rounds'>[] };
export type CompetitionTree = Competition & { teamIds: string[]; phases: Phase[]; assignments: Tables<'group_assignments'>[] };

const byPosition = <T extends { position: number }>(rows: T[]): T[] => [...rows].sort((a, b) => a.position - b.position);

/** Every competition with its enrolled teams, phases (groups and rounds in order) and group assignments. */
export async function listCompetitions(client: BasketClient): Promise<CompetitionTree[]> {
  const rows = check(
    await client
      .from('competitions')
      .select('*, competition_teams(team_id), competition_phases(*, competition_groups(*), competition_rounds(*))')
      .order('name'),
  );
  const roundIds = rows.flatMap((c) => c.competition_phases.flatMap((p) => p.competition_rounds.map((r) => r.id)));
  const assignments = roundIds.length ? check(await client.from('group_assignments').select('*').in('round_id', roundIds)) : [];
  return rows.map((c) => {
    const phases = byPosition(c.competition_phases).map(({ competition_groups, competition_rounds, ...phase }) => ({
      ...phase,
      groups: byPosition(competition_groups),
      rounds: byPosition(competition_rounds),
    }));
    const rounds = new Set(phases.flatMap((p) => p.rounds.map((r) => r.id)));
    const { competition_teams, competition_phases: _phases, ...competition } = c;
    return {
      ...competition,
      teamIds: competition_teams.map((t) => t.team_id),
      phases,
      assignments: assignments.filter((a) => rounds.has(a.round_id)),
    };
  });
}

export async function createCompetition(client: BasketClient, name: string, season?: string): Promise<Competition> {
  return check(await client.from('competitions').insert({ name, season: season || null }).select().single());
}

export async function updateCompetition(client: BasketClient, id: string, patch: { name?: string; season?: string | null }): Promise<void> {
  check(await client.from('competitions').update(patch).eq('id', id).select('id').single());
}

export async function deleteCompetition(client: BasketClient, id: string): Promise<void> {
  check(await client.from('competitions').delete().eq('id', id).select('id').single());
}

export async function enrollTeam(client: BasketClient, competitionId: string, teamId: string): Promise<void> {
  check(await client.from('competition_teams').upsert({ competition_id: competitionId, team_id: teamId }).select());
}

/** Un-enrolling also drops the team's group assignments in that competition (they would point at nothing). */
export async function withdrawTeam(client: BasketClient, competition: CompetitionTree, teamId: string): Promise<void> {
  const rounds = competition.phases.flatMap((p) => p.rounds.map((r) => r.id));
  if (rounds.length) check(await client.from('group_assignments').delete().eq('team_id', teamId).in('round_id', rounds).select());
  check(await client.from('competition_teams').delete().eq('competition_id', competition.id).eq('team_id', teamId).select());
}

type Table = 'competition_phases' | 'competition_groups' | 'competition_rounds';

const nextAfter = (rows: { position: number }[]): number => (rows[0]?.position ?? 0) + 1;

export async function addPhase(client: BasketClient, competitionId: string, name: string): Promise<void> {
  const last = check(await client.from('competition_phases').select('position').eq('competition_id', competitionId).order('position', { ascending: false }).limit(1));
  check(await client.from('competition_phases').insert({ competition_id: competitionId, position: nextAfter(last), name }).select('id').single());
}

export async function addGroup(client: BasketClient, phaseId: string, name: string): Promise<void> {
  const last = check(await client.from('competition_groups').select('position').eq('phase_id', phaseId).order('position', { ascending: false }).limit(1));
  check(await client.from('competition_groups').insert({ phase_id: phaseId, position: nextAfter(last), name }).select('id').single());
}

export async function addRound(client: BasketClient, phaseId: string, name: string): Promise<string> {
  const last = check(await client.from('competition_rounds').select('position').eq('phase_id', phaseId).order('position', { ascending: false }).limit(1));
  const row: { id: string } = check(await client.from('competition_rounds').insert({ phase_id: phaseId, position: nextAfter(last), name }).select('id').single());
  return row.id;
}

export async function rename(client: BasketClient, table: Table, id: string, name: string): Promise<void> {
  check(await client.from(table).update({ name }).eq('id', id).select('id').single());
}

export async function remove(client: BasketClient, table: Table, id: string): Promise<void> {
  check(await client.from(table).delete().eq('id', id).select('id').single());
}

/** Puts a team in a group for a round, or takes it out when `groupId` is null. */
export async function assignTeam(client: BasketClient, roundId: string, teamId: string, groupId: string | null): Promise<void> {
  if (!groupId) {
    check(await client.from('group_assignments').delete().eq('round_id', roundId).eq('team_id', teamId).select());
    return;
  }
  check(await client.from('group_assignments').upsert({ round_id: roundId, team_id: teamId, group_id: groupId }).select());
}

/**
 * Starts the next round of a phase from the previous one: every team keeps its group, then the admin moves the
 * ones that go up or down. `toRoundId` must be empty.
 */
export async function copyAssignments(client: BasketClient, fromRoundId: string, toRoundId: string): Promise<void> {
  const from = check(await client.from('group_assignments').select('team_id, group_id').eq('round_id', fromRoundId));
  if (!from.length) return;
  check(await client.from('group_assignments').upsert(from.map((a) => ({ ...a, round_id: toRoundId }))).select());
}
