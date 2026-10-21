// @ts-nocheck -- loose test typing
import { describe, expect, it } from 'vitest';
import {
  advanceSwissRound,
  computeFinalTournamentStandings,
  createCustomTournament,
  updatePlayoffMatchResult
} from './tournament';

const makeMajorTeams = () => Array.from({ length: 32 }, (_, index) => ({
  id: `major-team-${index + 1}`,
  name: `Major Team ${index + 1}`,
  shortName: `M${index + 1}`,
  points: 3000 - index * 10,
  defaultPoints: 3000 - index * 10,
  logoUrl: '',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  country: 'Test',
  region: 'Test',
  rosterSnippet: []
} as any));

const getAssignments = (teams: ReturnType<typeof makeMajorTeams>) => Object.fromEntries(
  teams.map((team, index) => [team.id, (index < 16 ? 1 : index < 24 ? 2 : 3) as 1 | 2 | 3])
);

const createMajor = () => {
  const teams = makeMajorTeams();
  const tournament = createCustomTournament({
    name: 'Major format test',
    shortName: 'TEST MAJOR',
    tier: 'Major',
    mode: 'major',
    teams,
    majorStageAssignments: getAssignments(teams),
    stageFormats: {
      majorStage1NormalFormat: 'BO1',
      majorStage1DeciderFormat: 'BO3',
      majorStage2NormalFormat: 'BO1',
      majorStage2DeciderFormat: 'BO3',
      majorStage3NormalFormat: 'BO3',
      majorStage3DeciderFormat: 'BO3',
      quarterfinalFormat: 'BO3',
      semifinalFormat: 'BO3',
      finalFormat: 'BO5'
    },
    includeThirdPlace: false
  });
  return { tournament, teams };
};

describe('Valve Major tournament format', () => {
  it('allocates 16/8/8 direct entries and uses 1-vs-9 opening pairings', () => {
    const { tournament } = createMajor();

    expect(tournament.mode).toBe('major');
    expect(tournament.participatingTeamIds).toHaveLength(32);
    expect(tournament.majorStages?.[0].directTeamIds).toHaveLength(16);
    expect(tournament.majorStages?.[1].directTeamIds).toHaveLength(8);
    expect(tournament.majorStages?.[2].directTeamIds).toHaveLength(8);
    expect(tournament.swissMatches).toHaveLength(8);
    expect(tournament.swissMatches[0].teamAId).toBe('major-team-1');
    expect(tournament.swissMatches[0].teamBId).toBe('major-team-9');
    expect(tournament.includeThirdPlace).toBe(false);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'third_place')).toBe(false);
  });

  it('runs all three Swiss stages and finishes a seeded top-8 playoff', () => {
    const { tournament: startingTournament, teams } = createMajor();
    let tournament = startingTournament;
    let roundTransitions = 0;

    while (tournament.currentStage === 'swiss' && roundTransitions < 20) {
      const activeRound = tournament.swissRound;
      const roundMatches = tournament.swissMatches.filter((match) =>
        match.roundNumber === activeRound && match.status !== 'finished' && match.teamAId && match.teamBId
      );
      expect(roundMatches.length).toBeGreaterThan(0);

      const teamIdsInRound = roundMatches.flatMap((match) => [match.teamAId!, match.teamBId!]);
      expect(new Set(teamIdsInRound).size).toBe(teamIdsInRound.length);

      tournament = {
        ...tournament,
        swissMatches: tournament.swissMatches.map((match) => roundMatches.some((item) => item.id === match.id)
          ? {
              ...match,
              status: 'finished' as const,
              winnerId: match.teamAId!,
              loserId: match.teamBId!,
              scoreA: match.format === 'BO1' ? 1 : 2,
              scoreB: 0
            }
          : match)
      };
      tournament = advanceSwissRound(tournament, teams);
      roundTransitions += 1;
    }

    expect(tournament.currentStage).toBe('playoffs');
    expect(tournament.majorStageNumber).toBe(4);
    expect(tournament.majorStages?.every((stage) => stage.status === 'completed')).toBe(true);
    expect(tournament.majorStages?.every((stage) => stage.qualifiedTeamIds?.length === 8)).toBe(true);
    expect(tournament.majorStages?.[1].teamIds.slice(0, 8)).toEqual(tournament.majorStages?.[1].directTeamIds);
    expect(tournament.majorStages?.[2].teamIds.slice(0, 8)).toEqual(tournament.majorStages?.[2].directTeamIds);
    for (const stage of tournament.majorStages || []) {
      const playedPairs = (stage.matches || []).filter((match) => match.status === 'finished' && match.teamAId && match.teamBId)
        .map((match) => [match.teamAId!, match.teamBId!].sort().join('::'));
      expect(new Set(playedPairs).size).toBe(playedPairs.length);
    }
    expect(tournament.playoffMatches.filter((match) => match.poolKey.startsWith('qf') && match.teamAId && match.teamBId)).toHaveLength(4);
    expect(tournament.playoffMatches.find((match) => match.poolKey === 'final')?.format).toBe('BO5');
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'third_place')).toBe(false);

    let playoffMatches = [...tournament.playoffMatches];
    let isTournamentOver = false;
    let playoffRounds = 0;
    while (!isTournamentOver && playoffRounds < 8) {
      playoffRounds += 1;
      const ready = playoffMatches.filter((match) => match.status === 'ready' && match.teamAId && match.teamBId);
      expect(ready.length).toBeGreaterThan(0);
      for (const match of ready) {
        const winningScore = match.format === 'BO1' ? 1 : match.format === 'BO3' ? 2 : 3;
        const result = updatePlayoffMatchResult(playoffMatches, match.id, winningScore, 0, false, match.format);
        playoffMatches = result.updatedMatches;
        if (result.isTournamentOver) isTournamentOver = true;
      }
    }

    expect(isTournamentOver).toBe(true);
    const standings = computeFinalTournamentStandings({ ...tournament, currentStage: 'completed', playoffMatches }, teams);
    expect(standings).toHaveLength(32);
    expect(standings.some((standing) => standing.place === 1)).toBe(true);
    expect(standings.some((standing) => standing.place === 2)).toBe(true);
  });
});
