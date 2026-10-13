import { describe, expect, it } from 'vitest';
import { FIBA_RULES } from './rules';
import { validateNewGame, validateRoster, type GameDraft } from './setup';

describe('validateRoster', () => {
  it('flags a jersey number used twice in the same team, but allows repeated short names', () => {
    const issues = validateRoster([
      { id: 'p1', firstName: 'Rui', lastName: 'Silva', displayName: 'Silva', number: 7 },
      { id: 'p2', firstName: 'Joao', lastName: 'Silva', displayName: 'Silva', number: 9 },
      { id: 'p3', firstName: 'Ze', lastName: 'Costa', displayName: 'Costa', number: 7 },
    ]);
    expect(issues).toEqual([
      { playerId: 'p3', field: 'number', message: 'Number 7 is already used by Silva' },
    ]);
  });

  it('requires a name, a short name and a number from 0 to 99', () => {
    const issues = validateRoster([
      { id: 'p1', firstName: '', lastName: 'Silva', displayName: 'Silva', number: 7 },
      { id: 'p2', firstName: 'Joao', lastName: ' ', displayName: '', number: 100 },
    ]);
    expect(issues).toEqual([
      { playerId: 'p1', field: 'firstName', message: 'First name is required' },
      { playerId: 'p2', field: 'lastName', message: 'Last name is required' },
      { playerId: 'p2', field: 'displayName', message: 'Short name is required' },
      { playerId: 'p2', field: 'number', message: 'Number must be between 0 and 99' },
    ]);
  });
});

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);

function draft(overrides: Partial<GameDraft> = {}): GameDraft {
  return {
    homeTeamId: 'scp',
    awayTeamId: 'slb',
    rules: FIBA_RULES,
    tracking: { home: 'full', away: 'full' },
    roster: { home: ids('h', 8), away: ids('a', 8) },
    starters: { home: ids('h', 5), away: ids('a', 5) },
    ...overrides,
  };
}

describe('validateNewGame', () => {
  it('accepts a complete draft', () => {
    expect(validateNewGame(draft())).toEqual([]);
  });

  it('lists what must be fixed before starting', () => {
    expect(
      validateNewGame(draft({ awayTeamId: 'scp', starters: { home: ids('h', 4), away: ['a1', 'a1', 'a2', 'a3', 'zz'] } })),
    ).toEqual([
      'Pick two different teams',
      'Home needs 5 starters (4 picked)',
      'Away starters must be distinct players from the roster',
    ]);
  });

  it('needs no starters for a team-only side, but needs enough players for a full one', () => {
    expect(validateNewGame(draft({ tracking: { home: 'full', away: 'team_only' }, starters: { home: ids('h', 5), away: [] } }))).toEqual([]);
    expect(validateNewGame(draft({ roster: { home: ids('h', 4), away: ids('a', 8) }, starters: { home: ids('h', 4), away: ids('a', 5) } }))).toEqual([
      'Home needs 5 starters (4 picked)',
      'Home roster has only 4 players',
    ]);
  });
});
