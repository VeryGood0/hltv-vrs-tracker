import { describe, expect, it } from 'vitest';
import type { TournamentMatch } from '../types';
import { getInitialPlayoffMatches } from './openingPairs';

const match = (overrides: Partial<TournamentMatch>): TournamentMatch => ({
  id: 'match',
  stage: 'playoffs',
  poolKey: 'qf1',
  roundNumber: 1,
  name: 'Match',
  teamAId: 'team-a',
  teamBId: 'team-b',
  scoreA: 0,
  scoreB: 0,
  format: 'BO3',
  status: 'ready',
  ...overrides
} as TournamentMatch);

describe('playoff opening-pair editor scope', () => {
  it('returns only direct matches from the opening upper-bracket round', () => {
    const initial = [
      match({ id: 'qf1', poolKey: 'qf1' }),
      match({ id: 'qf2', poolKey: 'qf2', teamAId: 'team-c', teamBId: 'team-d' }),
      match({ id: 'sf1', poolKey: 'sf1', roundNumber: 2, teamAId: undefined, teamBId: undefined, sourceA: 'qf1', sourceB: 'qf2' }),
      match({ id: 'lb_r1_1', poolKey: 'lb_r1_1', roundNumber: 2, teamAId: undefined, teamBId: undefined, sourceA: 'qf1', sourceB: 'qf2' }),
      match({ id: 'third', poolKey: 'third_place', roundNumber: 3, teamAId: undefined, teamBId: undefined })
    ];

    expect(getInitialPlayoffMatches(initial).map((item) => item.id)).toEqual(['qf1', 'qf2']);
  });

  it('returns no matches when the playoff entrants have not yet been assigned', () => {
    expect(getInitialPlayoffMatches([
      match({ teamAId: undefined, teamBId: undefined }),
      match({ id: 'final', poolKey: 'final', roundNumber: 4, teamAId: undefined, teamBId: undefined })
    ])).toEqual([]);
  });
});
