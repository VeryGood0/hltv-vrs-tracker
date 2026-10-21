// @ts-nocheck -- loose test typing
import { describe, expect, it } from 'vitest';
import {
  advanceSwissRound,
  computeFinalTournamentStandings,
  createCustomTournament,
  updatePlayoffMatchResult
} from './tournament';

const makeTeams = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `team-${index + 1}`,
  name: `Team ${index + 1}`,
  shortName: `T${index + 1}`,
  points: 2000 - index,
  defaultPoints: 2000 - index,
  logoUrl: '',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  country: 'Test',
  region: 'Test',
  rosterSnippet: []
} as any));

const simulateMatch = (matches: any[], matchId: string, winner: 'A' | 'B' = 'A') => {
  const match = matches.find((item) => item.id === matchId)!;
  const winningScore = match.format === 'BO1' ? 1 : match.format === 'BO3' ? 2 : 3;
  return updatePlayoffMatchResult(
    matches,
    matchId,
    winner === 'A' ? winningScore : 0,
    winner === 'B' ? winningScore : 0,
    true,
    match.format
  );
};

describe('tournament creation and bracket routing', () => {
  it.each([4, 5, 6, 8, 12, 16, 24, 32])(
    'creates a complete seeded single-elimination bracket for %i selected entrants',
    (teamCount) => {
      const selectedTeams = makeTeams(teamCount);
      const tournament = createCustomTournament({
        name: `Cup ${teamCount}`,
        mode: 'single_elimination',
        teams: selectedTeams,
        includeThirdPlace: true
      });

      expect(tournament.participatingTeamIds).toEqual(selectedTeams.map((team) => team.id));
      const bracketTeamIds = new Set(tournament.playoffMatches.flatMap((match) => [match.teamAId, match.teamBId].filter(Boolean)));
      expect(bracketTeamIds).toEqual(new Set(selectedTeams.map((team) => team.id)));
      expect(tournament.playoffMatches.some((match) => match.poolKey === 'final')).toBe(true);
      expect(new Set(tournament.playoffMatches.map((match) => match.id)).size).toBe(tournament.playoffMatches.length);
    }
  );

  it('routes every single-elimination winner to the next round and finishes the bronze match', () => {
    let matches = createCustomTournament({
      name: 'Twelve team cup',
      mode: 'single_elimination',
      teams: makeTeams(12),
      includeThirdPlace: true
    }).playoffMatches;

    let isTournamentOver = false;
    let guard = 0;
    while (!isTournamentOver && guard++ < 100) {
      const readyMatch = matches.find((match) => match.status === 'ready' && match.teamAId && match.teamBId);
      if (!readyMatch) break;
      const result = simulateMatch(matches, readyMatch.id);
      matches = result.updatedMatches;
      isTournamentOver = result.isTournamentOver;
    }

    expect(isTournamentOver).toBe(true);
    expect(matches.every((match) => match.status === 'finished')).toBe(true);
  });

  it('requires a double-elimination reset when the lower-bracket finalist wins the first grand final', () => {
    const tournament = createCustomTournament({
      name: 'Double elimination cup',
      mode: 'double_elimination',
      teams: makeTeams(8),
      includeThirdPlace: false
    });
    let matches = tournament.playoffMatches;

    let guard = 0;
    while (!matches.some((match) => match.poolKey === 'final' && match.status === 'ready') && guard++ < 100) {
      const readyMatch = matches.find((match) => match.status === 'ready' && match.teamAId && match.teamBId);
      expect(readyMatch).toBeTruthy();
      matches = simulateMatch(matches, readyMatch!.id).updatedMatches;
    }

    const grandFinal = matches.find((match) => match.poolKey === 'final')!;
    const firstFinalResult = simulateMatch(matches, grandFinal.id, 'B');
    matches = firstFinalResult.updatedMatches;

    expect(firstFinalResult.isTournamentOver).toBe(false);
    const resetFinal = matches.find((match) => match.poolKey === 'final_reset');
    expect(resetFinal?.status).toBe('ready');
    expect(resetFinal?.teamAId).toBe(grandFinal.teamAId);
    expect(resetFinal?.teamBId).toBe(grandFinal.teamBId);

    const resetResult = simulateMatch(matches, resetFinal!.id, 'A');
    matches = resetResult.updatedMatches;
    expect(resetResult.isTournamentOver).toBe(true);
    const standings = computeFinalTournamentStandings({
      ...tournament,
      playoffMatches: matches,
      currentStage: 'completed'
    }, makeTeams(8));
    expect(standings[0].teamId).toBe(resetFinal!.teamAId);
    expect(standings).toHaveLength(8);
  });

  it('creates a round-robin schedule with one match per team per round and every pair exactly once', () => {
    const tournament = createCustomTournament({
      name: 'Round robin',
      mode: 'round_robin',
      teams: makeTeams(6)
    });
    const matches = tournament.roundRobinMatches || [];
    expect(tournament.playoffMatches).toHaveLength(0);
    const pairs = matches.map((match) => [match.teamAId, match.teamBId].sort().join('|'));
    expect(matches).toHaveLength(15);
    expect(new Set(pairs).size).toBe(15);
    const matchesPerRound = new Map<number, string[]>();
    for (const match of matches) {
      const ids = matchesPerRound.get(match.roundNumber) || [];
      ids.push(match.teamAId!, match.teamBId!);
      matchesPerRound.set(match.roundNumber, ids);
    }
    for (const ids of matchesPerRound.values()) expect(new Set(ids).size).toBe(ids.length);
  });

  it('ends a standalone Swiss tournament with a standings table instead of creating playoffs', () => {
    const teams = makeTeams(8);
    let tournament = createCustomTournament({
      name: 'Swiss-only event',
      mode: 'swiss_system',
      teams,
      includeThirdPlace: false
    });
    let guard = 0;
    while (tournament.currentStage === 'swiss' && guard++ < 10) {
      const activeRound = tournament.swissMatches.filter(
        (match) => match.roundNumber === tournament.swissRound && match.status !== 'finished' && match.teamAId && match.teamBId
      );
      if (!activeRound.length) break;
      tournament = {
        ...tournament,
        swissMatches: tournament.swissMatches.map((match) => {
          if (!activeRound.some((active) => active.id === match.id)) return match;
          return { ...match, status: 'finished', scoreA: 1, scoreB: 0, winnerId: match.teamAId, loserId: match.teamBId };
        })
      };
      tournament = advanceSwissRound(tournament, teams);
    }

    expect(tournament.currentStage).toBe('completed');
    expect(tournament.playoffMatches).toHaveLength(0);
    expect(computeFinalTournamentStandings(tournament, teams)).toHaveLength(teams.length);
  });
});

describe('16-team double elimination', () => {
  it('builds a full 16-team bracket that finishes with 16 placed teams', () => {
    const teams = makeTeams(16);
    const tournament = createCustomTournament({ name: 'DE16', mode: 'double_elimination', teams, includeThirdPlace: false });
    let matches = tournament.playoffMatches;
    expect(matches.filter((m) => m.poolKey.startsWith('ub_r1_'))).toHaveLength(8);
    let over = false; let guard = 0;
    while (!over && guard++ < 100) {
      const ready = matches.find((m) => m.status === 'ready' && m.teamAId && m.teamBId);
      if (!ready) break;
      const r = simulateMatch(matches, ready.id);
      matches = r.updatedMatches; over = r.isTournamentOver;
    }
    expect(over).toBe(true);
    const standings = computeFinalTournamentStandings({ ...tournament, playoffMatches: matches, currentStage: 'completed' }, teams);
    expect(new Set(standings.map((s) => s.teamId)).size).toBe(16);
  });
});
