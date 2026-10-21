import { describe, it, expect } from 'vitest';
import { createCustomTournament, createEmptyPlayoffBracket, updateGroupMatchResult, updatePlayoffMatchResult, computeFinalTournamentStandings, normalizeTrophyMatchStageName, isThirdPlaceMatch } from './tournament';
import { applyOpeningPairOrders, getOpeningScopes, getOpeningSlots } from './openingPairs';

describe('playoff final detection', () => {
  it('finishing a quarterfinal does not end the tournament', () => {
    const m = createEmptyPlayoffBracket(true).map((x) =>
      x.id === 'playoff_qf1' ? { ...x, teamAId: 'a', teamBId: 'b', status: 'ready' as const } : x
    );
    const res = updatePlayoffMatchResult(m, 'playoff_qf1', 2, 0, true, 'BO3');
    expect(res.isTournamentOver).toBe(false);
  });
});


describe('eight-team GSL groups and six-team playoff seeding', () => {
  const makeTeams = () => Array.from({ length: 16 }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    shortName: `T${i + 1}`,
    points: 1000 - i,
    defaultPoints: 1000 - i,
    logoUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    country: 'Test',
    region: 'Test',
    rosterSnippet: []
  } as any));

  it('generates 12 games per eight-team group with no extra match after the lower final', () => {
    const tournament = createCustomTournament({
      name: 'GSL test',
      mode: 'gsl_groups',
      teams: makeTeams(),
      stageFormats: { groupCount: 2, groupStyle: 'gsl_double_elim_8', groupFormat: 'BO1' }
    });

    expect(tournament.groups).toHaveLength(2);
    for (const group of tournament.groups || []) {
      expect(group.teamIds).toHaveLength(8);
      expect(group.matches).toHaveLength(12);
      expect(group.matches.some((m) => m.poolKey.endsWith('_lf'))).toBe(false);
      expect(group.matches.find((m) => m.poolKey.endsWith('_u1_1'))?.teamAId).toBe(group.teamIds[0]);
      expect(group.matches.find((m) => m.poolKey.endsWith('_u1_1'))?.teamBId).toBe(group.teamIds[7]);
      expect(group.matches.find((m) => m.poolKey.endsWith('_u1_2'))?.teamAId).toBe(group.teamIds[3]);
      expect(group.matches.find((m) => m.poolKey.endsWith('_u1_2'))?.teamBId).toBe(group.teamIds[4]);
      expect(group.matches.find((m) => m.poolKey.endsWith('_ls'))?.sourceA).toBe(`gsl_${group.letter}_l2_1`);
      expect(group.matches.find((m) => m.poolKey.endsWith('_ls'))?.sourceB).toBe(`gsl_${group.letter}_l2_2`);
    }
  });

  it('crosses second- and third-place teams and places group winners in opposite semifinals', () => {
    let tournament = createCustomTournament({
      name: 'GSL seeding test',
      mode: 'gsl_groups',
      teams: makeTeams(),
      stageFormats: { groupCount: 2, groupStyle: 'gsl', groupFormat: 'BO1', semifinalFormat: 'BO3' }
    });

    let guard = 0;
    while (tournament.currentStage !== 'playoffs' && guard++ < 100) {
      const readyMatch = (tournament.groupMatches || []).find((m) => m.status === 'ready' && m.teamAId && m.teamBId);
      if (!readyMatch) break;
      tournament = updateGroupMatchResult(tournament, readyMatch.id, 1, 0, 'BO1').updatedTournament;
    }

    expect(tournament.currentStage).toBe('playoffs');
    const groupA = tournament.groups?.find((g) => g.letter === 'A')!;
    const groupB = tournament.groups?.find((g) => g.letter === 'B')!;
    const qf1 = tournament.playoffMatches.find((m) => m.poolKey === 'qf1')!;
    const qf2 = tournament.playoffMatches.find((m) => m.poolKey === 'qf2')!;
    const sf1 = tournament.playoffMatches.find((m) => m.poolKey === 'sf1')!;
    const sf2 = tournament.playoffMatches.find((m) => m.poolKey === 'sf2')!;

    expect(groupA.qualifiedTeamIds).toHaveLength(3);
    expect(groupB.qualifiedTeamIds).toHaveLength(3);
    expect(qf1.teamAId).toBe(groupB.qualifiedTeamIds?.[1]);
    expect(qf1.teamBId).toBe(groupA.qualifiedTeamIds?.[2]);
    expect(qf2.teamAId).toBe(groupA.qualifiedTeamIds?.[1]);
    expect(qf2.teamBId).toBe(groupB.qualifiedTeamIds?.[2]);
    expect(sf1.teamAId).toBe(groupA.qualifiedTeamIds?.[0]);
    expect(sf2.teamAId).toBe(groupB.qualifiedTeamIds?.[0]);
  });
});

describe('third-place match and 8-team GSL loser routing', () => {
  const makeTeams = () => Array.from({ length: 16 }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    shortName: `T${i + 1}`,
    points: 1000 - i,
    defaultPoints: 1000 - i,
    logoUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    country: 'Test',
    region: 'Test',
    rosterSnippet: []
  } as any));

  it('cross-routes upper semifinal losers by default and supports same-side routing', () => {
    const swapped = createCustomTournament({
      name: 'GSL swapped', mode: 'gsl_groups', teams: makeTeams(),
      stageFormats: { groupCount: 2, groupStyle: 'gsl', gslLowerSemiLoserRouting: 'swapped' }
    });
    const same = createCustomTournament({
      name: 'GSL same', mode: 'gsl_groups', teams: makeTeams(),
      stageFormats: { groupCount: 2, groupStyle: 'gsl', gslLowerSemiLoserRouting: 'same' }
    });

    const swappedA = swapped.groups!.find((group) => group.letter === 'A')!;
    const sameA = same.groups!.find((group) => group.letter === 'A')!;
    expect(swappedA.matches.find((match) => match.poolKey === 'gsl_A_l2_1')?.sourceB).toBe('gsl_A_u2_2');
    expect(swappedA.matches.find((match) => match.poolKey === 'gsl_A_l2_2')?.sourceB).toBe('gsl_A_u2_1');
    expect(sameA.matches.find((match) => match.poolKey === 'gsl_A_l2_1')?.sourceB).toBe('gsl_A_u2_1');
    expect(sameA.matches.find((match) => match.poolKey === 'gsl_A_l2_2')?.sourceB).toBe('gsl_A_u2_2');

    // Exercise real advancement, not just the saved source keys.
    let progressed = swapped;
    for (const key of ['u1_1', 'u1_2', 'u1_3', 'u1_4']) {
      const opening = progressed.groupMatches!.find((match) => match.poolKey === `gsl_A_${key}`)!;
      progressed = updateGroupMatchResult(progressed, opening.id, 2, 0, 'BO3').updatedTournament;
    }
    for (const key of ['u2_1', 'u2_2']) {
      const semi = progressed.groupMatches!.find((match) => match.poolKey === `gsl_A_${key}`)!;
      progressed = updateGroupMatchResult(progressed, semi.id, 2, 0, 'BO3').updatedTournament;
    }
    const progressedA = progressed.groups!.find((group) => group.letter === 'A')!;
    const upper1 = progressedA.matches.find((match) => match.poolKey === 'gsl_A_u2_1')!;
    const upper2 = progressedA.matches.find((match) => match.poolKey === 'gsl_A_u2_2')!;
    expect(progressedA.matches.find((match) => match.poolKey === 'gsl_A_l2_1')?.teamBId).toBe(upper2.loserId);
    expect(progressedA.matches.find((match) => match.poolKey === 'gsl_A_l2_2')?.teamBId).toBe(upper1.loserId);
  });

  it('requires a third-place playoff for eight-team GSL groups even if the option was off', () => {
    const tournament = createCustomTournament({
      name: 'GSL third place', mode: 'gsl_groups', teams: makeTeams(), includeThirdPlace: false,
      stageFormats: { groupCount: 2, groupStyle: 'gsl_double_elim_8' }
    });
    expect(tournament.includeThirdPlace).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'third_place')).toBe(true);
  });

  it('does not mark the tournament completed until the third-place match is finished', () => {
    const teams = makeTeams().slice(0, 4);
    const tournament = createCustomTournament({
      name: 'Third place completion', mode: 'single_elimination', teams, includeThirdPlace: true
    });
    let matches = tournament.playoffMatches;
    const sf1 = matches.find((match) => match.poolKey === 'sf1')!;
    const sf2 = matches.find((match) => match.poolKey === 'sf2')!;
    matches = updatePlayoffMatchResult(matches, sf1.id, 2, 0, true, 'BO3').updatedMatches;
    matches = updatePlayoffMatchResult(matches, sf2.id, 0, 2, true, 'BO3').updatedMatches;
    const final = matches.find((match) => match.poolKey === 'final')!;
    const third = matches.find((match) => match.poolKey === 'third_place')!;

    const afterFinal = updatePlayoffMatchResult(matches, final.id, 2, 0, true, 'BO3');
    expect(afterFinal.isTournamentOver).toBe(false);
    expect(afterFinal.updatedMatches.find((match) => match.id === third.id)?.status).toBe('ready');

    const afterThird = updatePlayoffMatchResult(afterFinal.updatedMatches, third.id, 2, 1, true, 'BO3');
    expect(afterThird.isTournamentOver).toBe(true);
  });
});


describe('classic four-team GSL progression and semifinals', () => {
  const makeTeams = () => Array.from({ length: 8 }, (_, i) => ({
    id: `classic-gsl-team-${i + 1}`,
    name: `Classic GSL Team ${i + 1}`,
    shortName: `CG${i + 1}`,
    points: 1500 - i,
    defaultPoints: 1500 - i,
    logoUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    country: 'Test',
    region: 'Test',
    rosterSnippet: []
  } as any));

  it('sends Winners loser to Decider, Elimination winner to Decider, and advances two teams per group directly to semifinals', () => {
    let tournament = createCustomTournament({
      name: 'Classic GSL playoffs',
      mode: 'gsl_groups',
      teams: makeTeams(),
      stageFormats: { groupCount: 2, groupStyle: 'gsl', groupFormat: 'BO3', semifinalFormat: 'BO3' }
    });

    let guard = 0;
    while (tournament.currentStage !== 'playoffs' && guard++ < 30) {
      const ready = (tournament.groupMatches || []).find((m) => m.status === 'ready' && m.teamAId && m.teamBId);
      expect(ready).toBeTruthy();
      tournament = updateGroupMatchResult(tournament, ready!.id, 2, 0, 'BO3').updatedTournament;
    }

    expect(tournament.currentStage).toBe('playoffs');
    expect(tournament.groups).toHaveLength(2);

    const groupA = tournament.groups!.find((g) => g.letter === 'A')!;
    const groupB = tournament.groups!.find((g) => g.letter === 'B')!;
    for (const group of [groupA, groupB]) {
      const winners = group.matches.find((m) => m.poolKey === `gsl_${group.letter}_winners`)!;
      const elim = group.matches.find((m) => m.poolKey === `gsl_${group.letter}_elim`)!;
      const decider = group.matches.find((m) => m.poolKey === `gsl_${group.letter}_decider`)!;
      expect(winners.status).toBe('finished');
      expect(elim.status).toBe('finished');
      expect(decider.status).toBe('finished');
      expect(decider.teamAId).toBe(winners.loserId);
      expect(decider.teamBId).toBe(elim.winnerId);
      expect(group.qualifiedTeamIds).toEqual([winners.winnerId, decider.winnerId]);
      expect(group.eliminatedTeamIds).toContain(elim.loserId);
      expect(group.eliminatedTeamIds).toContain(decider.loserId);
    }

    // Two groups send exactly four teams; no quarterfinals/play-ins are created.
    expect(tournament.playoffMatches.some((m) => m.poolKey.startsWith('qf'))).toBe(false);
    const sf1 = tournament.playoffMatches.find((m) => m.poolKey === 'sf1')!;
    const sf2 = tournament.playoffMatches.find((m) => m.poolKey === 'sf2')!;
    expect(sf1.status).toBe('ready');
    expect(sf2.status).toBe('ready');
    expect(sf1.teamAId).toBe(groupA.qualifiedTeamIds![0]);
    expect(sf1.teamBId).toBe(groupB.qualifiedTeamIds![1]);
    expect(sf2.teamAId).toBe(groupB.qualifiedTeamIds![0]);
    expect(sf2.teamBId).toBe(groupA.qualifiedTeamIds![1]);

    let playoffMatches = tournament.playoffMatches;
    playoffMatches = updatePlayoffMatchResult(playoffMatches, sf1.id, 2, 0, false, 'BO3').updatedMatches;
    playoffMatches = updatePlayoffMatchResult(playoffMatches, sf2.id, 0, 2, false, 'BO3').updatedMatches;
    const grandFinal = playoffMatches.find((m) => m.poolKey === 'final')!;
    expect(grandFinal.status).toBe('ready');
    expect(grandFinal.teamAId).toBe(sf1.teamAId);
    expect(grandFinal.teamBId).toBe(sf2.teamBId);
  });
});

describe('four-team GSL formats', () => {
  const makeTeams = (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `format-team-${i + 1}`,
    name: `Format Team ${i + 1}`,
    shortName: `F${i + 1}`,
    points: 1600 - i,
    defaultPoints: 1600 - i,
    logoUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    country: 'Test',
    region: 'Test',
    rosterSnippet: []
  } as any));

  it('uses Bo3 for the classic two-wins-to-qualify GSL format with groups of four', () => {
    const tournament = createCustomTournament({
      name: 'Classic four-team GSL',
      mode: 'gsl_groups',
      teams: makeTeams(8),
      stageFormats: { groupCount: 2, groupStyle: 'gsl', groupFormat: 'BO1' }
    });
    expect(tournament.groups).toHaveLength(2);
    for (const group of tournament.groups || []) {
      expect(group.teamIds).toHaveLength(4);
      expect(group.matches).toHaveLength(5);
      expect(group.matches.every((match) => match.format === 'BO3')).toBe(true);
      expect(group.matches.map((match) => match.poolKey)).toContain(`gsl_${group.letter}_decider`);
    }
  });

  it('runs the IEM/ESL Top 3 route and sends 1st to SF and 2nd/3rd to QFs', () => {
    let tournament = createCustomTournament({
      name: 'Four-team GSL Top 3',
      mode: 'gsl_groups',
      teams: makeTeams(8),
      stageFormats: { groupCount: 2, groupStyle: 'gsl_top3', groupFormat: 'BO1' }
    });
    expect(tournament.groups).toHaveLength(2);
    for (const group of tournament.groups || []) {
      expect(group.teamIds).toHaveLength(4);
      expect(group.matches).toHaveLength(4);
      expect(group.matches.every((match) => match.format === 'BO3')).toBe(true);
      expect(group.matches.find((match) => match.poolKey === `gsl_${group.letter}_uf`)?.sourceA).toBe(`gsl_${group.letter}_opening1`);
      expect(group.matches.find((match) => match.poolKey === `gsl_${group.letter}_ls`)?.sourceAResult).toBe('loser');
    }

    let guard = 0;
    while (tournament.currentStage !== 'playoffs' && guard++ < 40) {
      const ready = tournament.groupMatches!.find((match) => match.status === 'ready' && match.teamAId && match.teamBId);
      if (!ready) throw new Error('Expected a ready group match before group stage completion');
      tournament = updateGroupMatchResult(tournament, ready.id, 2, 0, 'BO3').updatedTournament;
    }

    expect(tournament.currentStage).toBe('playoffs');
    for (const group of tournament.groups || []) {
      expect(group.qualifiedTeamIds).toHaveLength(3);
      expect(group.eliminatedTeamIds).toHaveLength(1);
    }
    const groupA = tournament.groups!.find((group) => group.letter === 'A')!;
    const groupB = tournament.groups!.find((group) => group.letter === 'B')!;
    const qf1 = tournament.playoffMatches.find((match) => match.poolKey === 'qf1')!;
    const qf2 = tournament.playoffMatches.find((match) => match.poolKey === 'qf2')!;
    const sf1 = tournament.playoffMatches.find((match) => match.poolKey === 'sf1')!;
    const sf2 = tournament.playoffMatches.find((match) => match.poolKey === 'sf2')!;
    expect(qf1.teamAId).toBe(groupA.qualifiedTeamIds![1]);
    expect(qf1.teamBId).toBe(groupB.qualifiedTeamIds![2]);
    expect(qf2.teamAId).toBe(groupB.qualifiedTeamIds![1]);
    expect(qf2.teamBId).toBe(groupA.qualifiedTeamIds![2]);
    expect(sf1.teamAId).toBe(groupB.qualifiedTeamIds![0]);
    expect(sf2.teamAId).toBe(groupA.qualifiedTeamIds![0]);
    expect(qf1.status).toBe('ready');
    expect(sf1.status).toBe('scheduled');
  });

  it('builds the 12-team playoff when four groups each send three teams', () => {
    let tournament = createCustomTournament({
      name: 'Four groups Top 3',
      mode: 'gsl_groups',
      teams: makeTeams(16),
      stageFormats: { groupCount: 4, groupStyle: 'gsl_top3' }
    });
    expect(tournament.playoffMatches.filter((match) => match.poolKey.startsWith('r12'))).toHaveLength(4);
    expect(tournament.playoffMatches.filter((match) => match.poolKey.startsWith('qf'))).toHaveLength(4);

    let guard = 0;
    while (tournament.currentStage !== 'playoffs' && guard++ < 80) {
      const ready = tournament.groupMatches!.find((match) => match.status === 'ready' && match.teamAId && match.teamBId);
      if (!ready) throw new Error('Expected a ready group match before group stage completion');
      tournament = updateGroupMatchResult(tournament, ready.id, 2, 0, 'BO3').updatedTournament;
    }
    expect(tournament.currentStage).toBe('playoffs');
    expect(tournament.groups!.every((group) => group.qualifiedTeamIds?.length === 3)).toBe(true);
    expect(tournament.playoffMatches.filter((match) => match.poolKey.startsWith('r12')).every((match) => match.teamAId && match.teamBId && match.status === 'ready')).toBe(true);

    const playIn = tournament.playoffMatches.find((match) => match.poolKey === 'r12_1')!;
    const afterPlayIn = updatePlayoffMatchResult(tournament.playoffMatches, playIn.id, 2, 0, true, 'BO3');
    expect(afterPlayIn.updatedMatches.find((match) => match.poolKey === 'qf1')?.teamBId).toBe(playIn.teamAId);
    expect(afterPlayIn.updatedMatches.find((match) => match.poolKey === 'qf1')?.status).toBe('ready');
  });
});

describe('8-team GSL playoff bronze-match completion and trophy labels', () => {
  const teams = Array.from({ length: 16 }, (_, i) => ({
    id: `bronze-team-${i + 1}`,
    name: `Bronze Team ${i + 1}`,
    shortName: `B${i + 1}`,
    points: 1500 - i,
    defaultPoints: 1500 - i,
    logoUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    country: 'Test',
    region: 'Test',
    rosterSnippet: [],
    trophies: []
  } as any));

  const initialMatches = [
    { id: 'playoff_qf1', stage: 'playoffs', poolKey: 'qf1', roundNumber: 1, name: 'Четвертьфинал 1 (2-е место B vs 3-е место A)', teamAId: teams[1].id, teamBId: teams[2].id, scoreA: 0, scoreB: 0, format: 'BO3', status: 'ready' },
    { id: 'playoff_qf2', stage: 'playoffs', poolKey: 'qf2', roundNumber: 1, name: 'Четвертьфинал 2 (2-е место A vs 3-е место B)', teamAId: teams[3].id, teamBId: teams[4].id, scoreA: 0, scoreB: 0, format: 'BO3', status: 'ready' },
    { id: 'playoff_sf1', stage: 'playoffs', poolKey: 'sf1', roundNumber: 2, name: 'Semifinal 1', teamAId: teams[0].id, scoreA: 0, scoreB: 0, format: 'BO3', status: 'scheduled', directSeedA: true },
    { id: 'playoff_sf2', stage: 'playoffs', poolKey: 'sf2', roundNumber: 2, name: 'Semifinal 2', teamAId: teams[5].id, scoreA: 0, scoreB: 0, format: 'BO3', status: 'scheduled', directSeedA: true },
    { id: 'playoff_final', stage: 'playoffs', poolKey: 'final', roundNumber: 3, name: 'Grand Final', scoreA: 0, scoreB: 0, format: 'BO5', status: 'scheduled' },
    { id: 'playoff_3rd', stage: 'playoffs', poolKey: 'third_place', roundNumber: 3, name: 'Матч за 3-е место (Бронзовый финал)', scoreA: 0, scoreB: 0, format: 'BO3', status: 'scheduled' }
  ] as any[];

  it('automatically routes semifinal losers into bronze and waits for bronze before completing', () => {
    let matches = updatePlayoffMatchResult(initialMatches as any, 'playoff_qf1', 2, 0, false, 'BO3').updatedMatches;
    matches = updatePlayoffMatchResult(matches, 'playoff_qf2', 0, 2, false, 'BO3').updatedMatches;
    matches = updatePlayoffMatchResult(matches, 'playoff_sf1', 0, 2, false, 'BO3').updatedMatches;
    matches = updatePlayoffMatchResult(matches, 'playoff_sf2', 2, 0, false, 'BO3').updatedMatches;

    const sf1 = matches.find((match) => match.poolKey === 'sf1')!;
    const sf2 = matches.find((match) => match.poolKey === 'sf2')!;
    const bronze = matches.find((match) => match.poolKey === 'third_place')!;
    expect(bronze.teamAId).toBe(sf1.loserId);
    expect(bronze.teamBId).toBe(sf2.loserId);
    expect(bronze.status).toBe('ready');

    const final = matches.find((match) => match.poolKey === 'final')!;
    const afterFinal = updatePlayoffMatchResult(matches, final.id, 3, 1, false, 'BO5');
    expect(afterFinal.isTournamentOver).toBe(false);

    const afterBronze = updatePlayoffMatchResult(afterFinal.updatedMatches, bronze.id, 2, 0, false, 'BO3');
    expect(afterBronze.isTournamentOver).toBe(true);

    const tournament = {
      mode: 'gsl_groups',
      tier: 'S-Tier',
      teamCount: 16,
      playoffMatches: afterBronze.updatedMatches,
      swissRecords: {}
    } as any;
    const standings = computeFinalTournamentStandings(tournament, teams, {
      championBonus: 100, finalistBonus: 40, thirdPlaceBonus: 20
    });
    const bronzeResult = afterBronze.updatedMatches.find((match) => match.poolKey === 'third_place')!;
    expect(standings.find((standing) => standing.place === 3)?.teamId).toBe(bronzeResult.winnerId);
    expect(standings.find((standing) => standing.place === 4)?.teamId).toBe(bronzeResult.loserId);
    expect(isThirdPlaceMatch(initialMatches[0])).toBe(false);
    expect(isThirdPlaceMatch(bronzeResult)).toBe(true);
  });

  it('corrects an old GSL Classic final that was saved with the semifinal label', () => {
    expect(normalizeTrophyMatchStageName({
      id: 'tour_123_playoff_final',
      poolKey: 'final',
      stageName: '1/2 финала (Полуфинал)'
    })).toBe('Гранд-Финал (Матч за чемпионство)');
  });
});


describe('four-group GSL classic with selectable playoff brackets', () => {
  const makeTeams = (count = 16) => Array.from({ length: count }, (_, i) => ({
    id: `four-group-team-${i + 1}`,
    name: `Four Group Team ${i + 1}`,
    shortName: `FG${i + 1}`,
    points: 1800 - i,
    defaultPoints: 1800 - i,
    logoUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    country: 'Test',
    region: 'Test',
    rosterSnippet: []
  } as any));

  const finishAllGroups = (initial: ReturnType<typeof createCustomTournament>) => {
    let tournament = initial;
    let guard = 0;
    while (tournament.currentStage !== 'playoffs' && guard++ < 100) {
      const ready = (tournament.groupMatches || []).find((match) => match.status === 'ready' && match.teamAId && match.teamBId);
      if (!ready) throw new Error('Expected a ready group match before group stage completion');
      tournament = updateGroupMatchResult(tournament, ready.id, 2, 0, 'BO3').updatedTournament;
    }
    return tournament;
  };

  it('creates four classic GSL groups of four and seeds eight teams into single-elimination quarterfinals', () => {
    const initial = createCustomTournament({
      name: 'Four-group GSL · Single Elimination',
      mode: 'gsl_groups',
      teams: makeTeams(),
      stageFormats: { groupCount: 4, groupStyle: 'gsl_classic_4', playoffType: 'single_elimination' }
    });

    expect(initial.groups).toHaveLength(4);
    expect(initial.groups!.map((group) => group.letter)).toEqual(['A', 'B', 'C', 'D']);
    expect(initial.groups!.every((group) => group.teamIds.length === 4 && group.matches.length === 5)).toBe(true);

    const tournament = finishAllGroups(initial);
    expect(tournament.currentStage).toBe('playoffs');
    expect(tournament.groups!.every((group) => group.qualifiedTeamIds?.length === 2)).toBe(true);
    const quarterfinals = tournament.playoffMatches.filter((match) => /^qf[1-4]$/.test(match.poolKey));
    expect(quarterfinals).toHaveLength(4);
    expect(quarterfinals.every((match) => match.teamAId && match.teamBId && match.status === 'ready')).toBe(true);
  });

  it('routes the same eight GSL qualifiers into the selectable double-elimination bracket', () => {
    const initial = createCustomTournament({
      name: 'Four-group GSL · Double Elimination',
      mode: 'gsl_groups',
      teams: makeTeams(),
      stageFormats: { groupCount: 4, groupStyle: 'gsl_classic_4', playoffType: 'double_elimination' }
    });
    const tournament = finishAllGroups(initial);

    expect(tournament.currentStage).toBe('playoffs');
    expect(tournament.includeThirdPlace).toBe(false);
    expect(tournament.playoffMatches.filter((match) => /^qf[1-4]$/.test(match.poolKey))).toHaveLength(4);
    expect(tournament.playoffMatches.filter((match) => /^qf[1-4]$/.test(match.poolKey)).every((match) => match.teamAId && match.teamBId && match.status === 'ready')).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'ub_final')).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'lb_final')).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'final')).toBe(true);
  });

  it('routes six qualifiers from two eight-team GSL groups into double elimination', () => {
    const initial = createCustomTournament({
      name: 'Eight-team GSL groups · Double Elimination playoffs',
      mode: 'gsl_groups',
      teams: makeTeams(),
      stageFormats: { groupCount: 2, groupStyle: 'gsl_double_elim_8', playoffType: 'double_elimination' }
    });
    const tournament = finishAllGroups(initial);

    expect(tournament.currentStage).toBe('playoffs');
    expect(tournament.groups!.every((group) => group.qualifiedTeamIds?.length === 3)).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'ub_final')).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'lb_final')).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'final')).toBe(true);
  });

  it('creates a bye-aware double-elimination bracket for a twelve-team group playoff', () => {
    const initial = createCustomTournament({
      name: 'Four-group Top 3 · Double Elimination',
      mode: 'gsl_groups',
      teams: makeTeams(),
      stageFormats: { groupCount: 4, groupStyle: 'gsl_top3', playoffType: 'double_elimination' }
    });
    const tournament = finishAllGroups(initial);

    expect(tournament.currentStage).toBe('playoffs');
    expect(tournament.groups!.every((group) => group.qualifiedTeamIds?.length === 3)).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'ub_final')).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'lb_final')).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'final')).toBe(true);
    expect(new Set(tournament.playoffMatches.map((match) => match.id)).size).toBe(tournament.playoffMatches.length);
  });

  it.each([4, 6, 12])('creates a direct double-elimination bracket for %i entrants', (count) => {
    const tournament = createCustomTournament({
      name: `Flexible DE ${count}`,
      mode: 'double_elimination',
      teams: makeTeams(count),
      includeThirdPlace: false
    });

    expect(tournament.playoffMatches.some((match) => match.poolKey === 'ub_final')).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'lb_final')).toBe(true);
    expect(tournament.playoffMatches.some((match) => match.poolKey === 'final')).toBe(true);
    expect(new Set(tournament.playoffMatches.map((match) => match.id)).size).toBe(tournament.playoffMatches.length);
  });
});


describe('manual opening-pair assignment', () => {
  const makeTeams = (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `pair-team-${i + 1}`,
    name: `Pair Team ${i + 1}`,
    shortName: `P${i + 1}`,
    points: 1200 - i,
    defaultPoints: 1200 - i,
    logoUrl: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    country: 'Test',
    region: 'Test',
    rosterSnippet: []
  } as any));

  it.each(['single_elimination', 'double_elimination'] as const)('lets the organizer change first-round pairings in %s', (mode) => {
    const tournament = createCustomTournament({ name: `Manual pairs ${mode}`, mode, teams: makeTeams(8), includeThirdPlace: false });
    const scope = getOpeningScopes(tournament)[0];
    const slots = getOpeningSlots(scope.matches, scope.roundRobin);
    expect(slots).toHaveLength(8);
    const originalOrder = slots.map((slot) => slot.teamId);
    const order = [...originalOrder];
    [order[1], order[2]] = [order[2], order[1]];

    const changed = applyOpeningPairOrders(tournament, { [scope.key]: order });
    expect(changed.playoffMatches.find((match) => match.id === slots[0].match.id)?.teamBId).toBe(originalOrder[2]);
    expect(changed.playoffMatches.find((match) => match.id === slots[2].match.id)?.teamAId).toBe(originalOrder[1]);
  });

  it('lets the organizer change opening matchups inside each GSL group', () => {
    const tournament = createCustomTournament({
      name: 'Manual GSL pairs',
      mode: 'gsl_groups',
      teams: makeTeams(16),
      stageFormats: { groupCount: 4, groupStyle: 'gsl_classic_4' }
    });
    const groupScope = getOpeningScopes(tournament).find((scope) => scope.key === 'group_A')!;
    const slots = getOpeningSlots(groupScope.matches, groupScope.roundRobin);
    expect(slots).toHaveLength(4);
    const originalOrder = slots.map((slot) => slot.teamId);
    const order = [...originalOrder];
    [order[1], order[2]] = [order[2], order[1]];

    const changed = applyOpeningPairOrders(tournament, { [groupScope.key]: order });
    const groupA = changed.groups!.find((group) => group.letter === 'A')!;
    expect(groupA.matches.find((match) => match.poolKey === 'gsl_A_opening1')?.teamBId).toBe(originalOrder[2]);
    expect(groupA.matches.find((match) => match.poolKey === 'gsl_A_opening2')?.teamAId).toBe(originalOrder[1]);
  });
});
