// @ts-nocheck -- imported legacy code written for a looser tsconfig
import {
  Team,
  TournamentState,
  TournamentMatch,
  TournamentMode,
  TournamentTier,
  TournamentGroup,
  RoundRobinTableRow,
  SwissTeamRecord,
  TournamentFinalStanding,
  MatchFormat,
  TrophyMatchSummary,
  StageFormatSettings,
  MajorSwissStageState
} from '../types';
import { calculatePointsStakes, calculateMatchFormDeltas } from './probability';

let tournamentIdSequence = 0;

/**
 * Whether this tournament uses two GSL groups with eight teams each.
 * These events always require the playoff bronze match: the semifinal losers
 * must be seeded into it, and the tournament must not be considered complete
 * before it is played.
 */
export function isEightTeamGslTournament(tournament?: Partial<TournamentState> | null): boolean {
  if (tournament?.stageFormats?.playoffType === 'double_elimination') return false;
  if (!tournament || (tournament.mode !== 'gsl_groups' && tournament.mode !== 'groups_playoffs')) return false;

  const style = tournament.groupStyle
    || tournament.stageFormats?.groupStyle
    || tournament.groups?.find((group) => group.groupStyle)?.groupStyle
    || (tournament.mode === 'gsl_groups' ? 'gsl' : undefined);
  const groupCount = tournament.groupCount
    || tournament.stageFormats?.groupCount
    || tournament.groups?.length
    || 0;
  const teamCount = tournament.teamCount
    || tournament.participatingTeamIds?.length
    || tournament.groups?.reduce((total, group) => total + (group.teamIds?.length || 0), 0)
    || 0;
  const hasEightTeamGroups = (tournament.groups || []).some((group) => (group.teamIds?.length || 0) >= 8)
    || (groupCount === 2 && teamCount >= 16);

  return groupCount === 2
    && teamCount >= 16
    && hasEightTeamGroups
    && (style === 'gsl_double_elim_8' || style === 'gsl');
}

export function isThirdPlaceMatch(match: Pick<TournamentMatch, 'id' | 'poolKey' | 'name'>): boolean {
  const id = (match.id || '').toLowerCase();
  const poolKey = (match.poolKey || '').toLowerCase();
  const name = (match.name || '').toLowerCase();
  // Do not use a broad `3-е место` substring: quarterfinal names include
  // the seed label `3-е место группы A/B`, which must never be treated as bronze.
  return poolKey === 'third_place'
    || poolKey === 'third'
    || id === 'playoff_3rd'
    || id.endsWith('_third_place')
    || name.includes('матч за 3-е место')
    || name.includes('матч за третье место')
    || name.includes('match for 3rd place')
    || name.includes('third-place match')
    || name.includes('бронз');
}

/**
 * Repairs legacy trophy labels using the canonical match id/pool key first.
 * This also fixes already-saved trophies whose Grand Final was stored as a
 * semifinal label by an older version of the app.
 */
export function normalizeTrophyMatchStageName(
  match: Pick<TrophyMatchSummary, 'id' | 'poolKey' | 'stageName'>
): string {
  const id = (match.id || '').toLowerCase();
  const poolKey = (match.poolKey || '').toLowerCase();
  const savedName = (match.stageName || '').toLowerCase();
  const isUpperOrLowerBracketFinal = id.includes('_ub_final') || id.includes('_lb_final')
    || poolKey === 'ub_final' || poolKey === 'lb_final';

  if (!isUpperOrLowerBracketFinal && (
    poolKey === 'final'
    || poolKey === 'final_reset'
    || poolKey === 'playoff_final'
    || poolKey === 'grand_final'
    || /(?:^|_)(?:playoff_)?final$/.test(id)
    || savedName.includes('гранд-финал')
    || savedName.includes('гранд финал')
  )) {
    return 'Гранд-Финал (Матч за чемпионство)';
  }

  if (poolKey === 'third_place' || poolKey === 'third' || id === 'playoff_3rd'
    || id.endsWith('_third_place') || savedName.includes('матч за 3-е место')
    || savedName.includes('бронз')) {
    return 'Матч за 3-е место (Бронзовый финал)';
  }

  if (poolKey.startsWith('qf') || poolKey.includes('_qf') || savedName.includes('четвертьфинал') || savedName.includes('1/4 финала')) {
    return '1/4 финала (Четвертьфинал)';
  }

  if (poolKey.startsWith('sf') || poolKey.includes('_sf') || savedName.includes('полуфинал') || savedName.includes('1/2 финала')) {
    return '1/2 финала (Полуфинал)';
  }

  return match.stageName || 'Турнирный матч';
}

export interface DestinationInfo {
  label: string;
  type: 'qualified' | 'eliminated' | 'pool';
  nextPool?: string;
  badgeClass: string;
}

/**
 * Returns destination of a team after winning or losing a Swiss match.
 */
export function getTeamDestination(poolKey: string, isWinner: boolean): DestinationInfo {
  const [w, l] = poolKey.split(':').map(Number);
  if (isNaN(w) || isNaN(l)) {
    return { label: '', type: 'pool', badgeClass: '' };
  }

  if (isWinner) {
    if (w === 2) {
      return {
        label: `В плей-офф (3:${l})`,
        type: 'qualified',
        badgeClass: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
      };
    }
    const nextPool = `${w + 1}:${l}`;
    return {
      label: `В пул ${nextPool}`,
      type: 'pool',
      nextPool,
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    };
  } else {
    if (l === 2) {
      return {
        label: `Выбывание (${w}:3)`,
        type: 'eliminated',
        badgeClass: 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
      };
    }
    const nextPool = `${w}:${l + 1}`;
    return {
      label: `В пул ${nextPool}`,
      type: 'pool',
      nextPool,
      badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    };
  }
}

/**
 * Generates default Round 1 Swiss matches sorted by VRS rank:
 * 1 vs 16, 2 vs 15, 3 vs 14, 4 vs 13, 5 vs 12, 6 vs 11, 7 vs 10, 8 vs 9.
 */
export function createDefaultSwissRound1Matches(teams: Team[]): TournamentMatch[] {
  const sorted = [...teams].sort((a, b) => b.points - a.points);
  const pairings = [
    [0, 15], // #1 vs #16
    [1, 14], // #2 vs #15
    [2, 13], // #3 vs #14
    [3, 12], // #4 vs #13
    [4, 11], // #5 vs #12
    [5, 10], // #6 vs #11
    [6, 9],  // #7 vs #10
    [7, 8]   // #8 vs #9
  ];

  return pairings.map(([idxA, idxB], i) => ({
    id: `swiss_r1_m${i + 1}`,
    stage: 'swiss',
    poolKey: '0:0',
    roundNumber: 1,
    name: `Раунд 1 (0:0) · Матч ${i + 1}`,
    teamAId: sorted[idxA]?.id,
    teamBId: sorted[idxB]?.id,
    scoreA: 0,
    scoreB: 0,
    format: 'BO1',
    status: 'ready'
  }));
}

/**
 * Swaps or assigns a team into a Swiss match slot, ensuring no team is duplicated.
 * If targetTeamId was in another match in the same round, the previous occupant swaps into its place.
 */
export function swapSwissRoundMatches(
  matches: TournamentMatch[],
  matchId: string,
  slot: 'A' | 'B',
  targetTeamId: string
): TournamentMatch[] {
  const targetMatch = matches.find((m) => m.id === matchId);
  if (!targetMatch) return matches;

  const currentTeamInSlot = slot === 'A' ? targetMatch.teamAId : targetMatch.teamBId;
  const roundNum = targetMatch.roundNumber;

  // Find if targetTeamId already occupies a slot in this same round
  const existingMatch = matches.find(
    (m) =>
      m.roundNumber === roundNum &&
      m.id !== matchId &&
      (m.teamAId === targetTeamId || m.teamBId === targetTeamId)
  );

  return matches.map((m) => {
    if (m.id === matchId) {
      return {
        ...m,
        teamAId: slot === 'A' ? targetTeamId : m.teamAId,
        teamBId: slot === 'B' ? targetTeamId : m.teamBId
      };
    }
    if (existingMatch && m.id === existingMatch.id) {
      // Put the displaced team into the existing match's vacated slot
      return {
        ...m,
        teamAId: m.teamAId === targetTeamId ? currentTeamInSlot : m.teamAId,
        teamBId: m.teamBId === targetTeamId ? currentTeamInSlot : m.teamBId
      };
    }
    return m;
  });
}

/**
 * Swaps or assigns a team into a Quarterfinal playoff match slot without duplicates.
 */
export function swapPlayoffMatches(
  matches: TournamentMatch[],
  matchId: string,
  slot: 'A' | 'B',
  targetTeamId: string
): TournamentMatch[] {
  const targetMatch = matches.find((m) => m.id === matchId);
  if (!targetMatch) return matches;

  const currentTeamInSlot = slot === 'A' ? targetMatch.teamAId : targetMatch.teamBId;

  // Find if targetTeamId already occupies a slot in any QF match
  const existingMatch = matches.find(
    (m) =>
      m.poolKey.startsWith('qf') &&
      m.id !== matchId &&
      (m.teamAId === targetTeamId || m.teamBId === targetTeamId)
  );

  return matches.map((m) => {
    if (m.id === matchId) {
      const nextA = slot === 'A' ? targetTeamId : m.teamAId;
      const nextB = slot === 'B' ? targetTeamId : m.teamBId;
      return {
        ...m,
        teamAId: nextA,
        teamBId: nextB,
        status: nextA && nextB ? ('ready' as const) : m.status
      };
    }
    if (existingMatch && m.id === existingMatch.id) {
      const nextA = m.teamAId === targetTeamId ? currentTeamInSlot : m.teamAId;
      const nextB = m.teamBId === targetTeamId ? currentTeamInSlot : m.teamBId;
      return {
        ...m,
        teamAId: nextA,
        teamBId: nextB,
        status: nextA && nextB ? ('ready' as const) : m.status
      };
    }
    return m;
  });
}

/**
 * Swaps or assigns a team into a GSL group opening match slot without duplicates inside the group.
 */
export function swapGroupOpeningMatches(
  matches: TournamentMatch[],
  matchId: string,
  slot: 'A' | 'B',
  targetTeamId: string
): TournamentMatch[] {
  const targetMatch = matches.find((m) => m.id === matchId);
  if (!targetMatch) return matches;

  const currentTeamInSlot = slot === 'A' ? targetMatch.teamAId : targetMatch.teamBId;

  // Find if targetTeamId already occupies a slot in opening matches of this group
  const existingMatch = matches.find(
    (m) =>
      m.id !== matchId &&
      (m.poolKey?.includes('opening') || m.id.includes('opening') || m.id.includes('_m1') || m.id.includes('_m2')) &&
      (m.teamAId === targetTeamId || m.teamBId === targetTeamId)
  );

  return matches.map((m) => {
    if (m.id === matchId) {
      const nextA = slot === 'A' ? targetTeamId : m.teamAId;
      const nextB = slot === 'B' ? targetTeamId : m.teamBId;
      return {
        ...m,
        teamAId: nextA,
        teamBId: nextB,
        status: nextA && nextB ? ('ready' as const) : m.status
      };
    }
    if (existingMatch && m.id === existingMatch.id) {
      const nextA = m.teamAId === targetTeamId ? currentTeamInSlot : m.teamAId;
      const nextB = m.teamBId === targetTeamId ? currentTeamInSlot : m.teamBId;
      return {
        ...m,
        teamAId: nextA,
        teamBId: nextB,
        status: nextA && nextB ? ('ready' as const) : m.status
      };
    }
    return m;
  });
}

/**
 * Computes live VRS Stakes and Form deltas for any tournament match.
 */
export function calculateTournamentMatchDeltas(
  teamA: Team,
  teamB: Team,
  scoreA: number,
  scoreB: number,
  winnerId: string,
  allTeams: Team[]
): {
  deltaPointsA: number;
  deltaPointsB: number;
  deltaFormA: number;
  deltaFormB: number;
  isUpset: boolean;
} {
  const stakes = calculatePointsStakes(teamA, teamB, allTeams);
  const probA = (teamA.points || 1500) / ((teamA.points || 1500) + (teamB.points || 1500));

  let deltaPointsA = 0;
  let deltaPointsB = 0;
  if (winnerId === teamA.id) {
    deltaPointsA = stakes.winA;
    deltaPointsB = -stakes.lossB;
  } else {
    deltaPointsB = stakes.winB;
    deltaPointsA = -stakes.lossA;
  }

  const { deltaFormA, deltaFormB } = calculateMatchFormDeltas(
    teamA.id,
    teamB.id,
    winnerId,
    probA,
    scoreA,
    scoreB
  );

  const winnerTeam = winnerId === teamA.id ? teamA : teamB;
  const loserTeam = winnerId === teamA.id ? teamB : teamA;
  const isUpset =
    winnerTeam.points < loserTeam.points && loserTeam.points - winnerTeam.points >= 80;

  return { deltaPointsA, deltaPointsB, deltaFormA, deltaFormB, isUpset };
}

/**
 * Creates initial Swiss Tournament state with 16 teams.
 * Pairs Top 8 seeds against Bottom 8 seeds (matching photo 1 and official Major rules).
 */
export function createInitialSwissTournament(
  teams: Team[],
  randomize: boolean = false,
  includeThirdPlace: boolean = true
): TournamentState {
  const sorted = [...teams].sort((a, b) => b.points - a.points);
  const activeTeams = randomize
    ? [...teams].sort(() => Math.random() - 0.5)
    : sorted;

  // Initialize Swiss team tracking
  const swissRecords: Record<string, SwissTeamRecord> = {};
  activeTeams.forEach((team, idx) => {
    swissRecords[team.id] = {
      teamId: team.id,
      wins: 0,
      losses: 0,
      opponentsPlayed: [],
      status: 'active',
      seedRank: idx + 1
    };
  });

  // Round 1 pairings (0:0): 8 matches
  let r1Matches: TournamentMatch[] = [];
  if (randomize) {
    for (let i = 0; i < 8; i++) {
      r1Matches.push({
        id: `swiss_r1_m${i + 1}`,
        stage: 'swiss',
        poolKey: '0:0',
        roundNumber: 1,
        name: `Раунд 1 (0:0) · Матч ${i + 1}`,
        teamAId: activeTeams[i * 2]?.id,
        teamBId: activeTeams[i * 2 + 1]?.id,
        scoreA: 0,
        scoreB: 0,
        format: 'BO1',
        status: 'ready'
      });
    }
  } else {
    r1Matches = createDefaultSwissRound1Matches(activeTeams);
  }

  // Create initial empty playoff bracket structure
  const playoffMatches = createEmptyPlayoffBracket(includeThirdPlace);

  return {
    id: `tour_${Date.now()}`,
    mode: 'swiss_playoffs',
    includeThirdPlace,
    linkPlayoffsToSwiss: true,
    currentStage: 'swiss',
    swissRound: 1,
    swissMatches: r1Matches,
    swissRecords,
    playoffMatches
  };
}

/**
 * Creates Playoffs-only tournament state (8 teams directly in bracket).
 */
export function createPlayoffsOnlyTournament(
  teams: Team[],
  randomize: boolean = false,
  includeThirdPlace: boolean = true
): TournamentState {
  const sorted = [...teams].sort((a, b) => b.points - a.points);
  const selectedTeams = randomize
    ? [...teams].sort(() => Math.random() - 0.5).slice(0, 8)
    : sorted.slice(0, 8);

  const playoffMatches = createEmptyPlayoffBracket(includeThirdPlace);

  // Seed top 8 into Quarter-finals:
  // QF1: 1 vs 8, QF2: 4 vs 5, QF3: 2 vs 7, QF4: 3 vs 6
  const qfPairs = [
    [0, 7], // 1 vs 8
    [3, 4], // 4 vs 5
    [1, 6], // 2 vs 7
    [2, 5]  // 3 vs 6
  ];

  qfPairs.forEach(([idxA, idxB], i) => {
    const qf = playoffMatches.find((m) => m.id === `playoff_qf${i + 1}`);
    if (qf) {
      qf.teamAId = selectedTeams[idxA]?.id;
      qf.teamBId = selectedTeams[idxB]?.id;
      qf.status = 'ready';
    }
  });

  return {
    id: `tour_${Date.now()}`,
    mode: 'playoffs_only',
    includeThirdPlace,
    currentStage: 'playoffs',
    swissRound: 1,
    swissMatches: [],
    swissRecords: {},
    playoffMatches
  };
}

/**
 * Creates empty 8-team single elimination playoff structure (matches photo 2).
 */
export function createEmptyPlayoffBracket(includeThirdPlace: boolean = true): TournamentMatch[] {
  const matches: TournamentMatch[] = [
    // Quarter-finals (BO3)
    {
      id: 'playoff_qf1',
      stage: 'playoffs',
      poolKey: 'qf1',
      roundNumber: 1,
      name: 'Четвертьфинал 1',
      scoreA: 0,
      scoreB: 0,
      format: 'BO3',
      status: 'scheduled'
    },
    {
      id: 'playoff_qf2',
      stage: 'playoffs',
      poolKey: 'qf2',
      roundNumber: 1,
      name: 'Четвертьфинал 2',
      scoreA: 0,
      scoreB: 0,
      format: 'BO3',
      status: 'scheduled'
    },
    {
      id: 'playoff_qf3',
      stage: 'playoffs',
      poolKey: 'qf3',
      roundNumber: 1,
      name: 'Четвертьфинал 3',
      scoreA: 0,
      scoreB: 0,
      format: 'BO3',
      status: 'scheduled'
    },
    {
      id: 'playoff_qf4',
      stage: 'playoffs',
      poolKey: 'qf4',
      roundNumber: 1,
      name: 'Четвертьфинал 4',
      scoreA: 0,
      scoreB: 0,
      format: 'BO3',
      status: 'scheduled'
    },

    // Semi-finals (BO3)
    {
      id: 'playoff_sf1',
      stage: 'playoffs',
      poolKey: 'sf1',
      roundNumber: 2,
      name: 'Полуфинал 1',
      scoreA: 0,
      scoreB: 0,
      format: 'BO3',
      status: 'scheduled'
    },
    {
      id: 'playoff_sf2',
      stage: 'playoffs',
      poolKey: 'sf2',
      roundNumber: 2,
      name: 'Полуфинал 2',
      scoreA: 0,
      scoreB: 0,
      format: 'BO3',
      status: 'scheduled'
    },

    // Grand final (BO5 as in photo 2, or BO3)
    {
      id: 'playoff_final',
      stage: 'playoffs',
      poolKey: 'final',
      roundNumber: 3,
      name: 'Гранд-финал',
      scoreA: 0,
      scoreB: 0,
      format: 'BO5',
      status: 'scheduled'
    }
  ];

  if (includeThirdPlace) {
    matches.push({
      id: 'playoff_3rd',
      stage: 'playoffs',
      poolKey: 'third_place',
      roundNumber: 3,
      name: 'Матч за 3-е место (Tiebreaker)',
      scoreA: 0,
      scoreB: 0,
      format: 'BO3',
      status: 'scheduled'
    });
  }

  return matches;
}

/** Return the stage-specific Swiss formats used by a Valve-style Major. */
export function getMajorSwissFormat(
  stageFormats: StageFormatSettings | undefined,
  stageNumber: 1 | 2 | 3,
  isDecider: boolean
): MatchFormat {
  const key = `majorStage${stageNumber}${isDecider ? 'Decider' : 'Normal'}Format` as keyof StageFormatSettings;
  const value = stageFormats?.[key] as MatchFormat | undefined;
  if (value === 'BO1' || value === 'BO3') return value;
  const fallback = isDecider
    ? stageFormats?.swissDeciderFormat
    : stageFormats?.swissNormalFormat;
  if (fallback === 'BO1' || fallback === 'BO3') {
    // Stage 3 Major matches are BO3 by default in the current CS2 Major format;
    // an explicit majorStage3NormalFormat choice above still overrides this.
    if (!isDecider && stageNumber === 3 && stageFormats?.majorStage3NormalFormat === undefined) return 'BO3';
    return fallback;
  }
  return isDecider || stageNumber === 3 ? 'BO3' : 'BO1';
}

function createMajorStageSwissState(
  tournamentId: string,
  stageNumber: 1 | 2 | 3,
  stageTeamIds: string[],
  directTeamIds: string[],
  allTeams: Team[],
  stageFormats?: StageFormatSettings,
  status: 'waiting' | 'active' | 'completed' = 'active'
): MajorSwissStageState {
  const records: Record<string, SwissTeamRecord> = {};
  const sortedTeams = status === 'waiting' ? [] : stageTeamIds;
  sortedTeams.forEach((teamId, index) => {
    records[teamId] = {
      teamId,
      wins: 0,
      losses: 0,
      opponentsPlayed: [],
      status: 'active',
      seedRank: index + 1
    };
  });

  const matches: TournamentMatch[] = [];
  if (status === 'active' && stageTeamIds.length === 16) {
    // Valve Major opening pairings: seeds 1-8 play seeds 9-16 respectively.
    // Later rounds keep the W-L pools and use the same-stage rematch-free draw.
    for (let index = 0; index < 8; index++) {
      matches.push({
        id: `${tournamentId}_major_s${stageNumber}_r1_m${index + 1}`,
        stage: 'swiss',
        poolKey: '0:0',
        roundNumber: 1,
        name: `Stage ${stageNumber} · Раунд 1 (0:0) · Матч ${index + 1}`,
        teamAId: stageTeamIds[index],
        teamBId: stageTeamIds[index + 8],
        scoreA: 0,
        scoreB: 0,
        format: getMajorSwissFormat(stageFormats, stageNumber, false),
        status: 'ready'
      });
    }
  }

  const stageNames = {
    1: 'Stage 1 — первая швейцарка',
    2: 'Stage 2 — вторая швейцарка',
    3: 'Stage 3 — финальная швейцарка'
  } as const;
  return {
    stageNumber,
    name: stageNames[stageNumber],
    directTeamIds: [...directTeamIds],
    teamIds: [...stageTeamIds],
    matches,
    records,
    currentRound: 1,
    status
  };
}

function getMajorBuchholzScore(teamId: string, records: Record<string, SwissTeamRecord>): number {
  const teamRecord = records[teamId];
  if (!teamRecord) return 0;
  return (teamRecord.opponentsPlayed || []).reduce((total, opponentId) => {
    const opponent = records[opponentId];
    return total + (opponent ? opponent.wins : 0);
  }, 0);
}

function getMajorQualifiedTeamIds(
  records: Record<string, SwissTeamRecord>,
  allTeams: Team[]
): string[] {
  const getPoints = (id: string) => allTeams.find((team) => team.id === id)?.points || 0;
  return Object.values(records)
    .filter((record) => record.status === 'qualified')
    .sort((a, b) => {
      // Better Swiss score first, then Buchholz, then pre-event seed / VRS as
      // deterministic tiebreaks. Incoming teams become seeds 9-16 in this order.
      const winsDiff = b.wins - a.wins;
      if (winsDiff) return winsDiff;
      const lossesDiff = a.losses - b.losses;
      if (lossesDiff) return lossesDiff;
      const buchholzDiff = getMajorBuchholzScore(b.teamId, records) - getMajorBuchholzScore(a.teamId, records);
      if (buchholzDiff) return buchholzDiff;
      const seedDiff = (a.seedRank || 999) - (b.seedRank || 999);
      if (seedDiff) return seedDiff;
      return getPoints(b.teamId) - getPoints(a.teamId);
    })
    .map((record) => record.teamId);
}

function seedMajorPlayoffs(
  records: Record<string, SwissTeamRecord>,
  allTeams: Team[],
  stageFormats?: StageFormatSettings
): TournamentMatch[] {
  const qualified = Object.values(records).filter((record) => record.status === 'qualified');
  const getPoints = (id: string) => allTeams.find((team) => team.id === id)?.points || 0;
  const sorted = [...qualified].sort((a, b) => {
    const scoreRank = (record: SwissTeamRecord) => record.qualifiedScore === '3:0' ? 0 : record.qualifiedScore === '3:1' ? 1 : 2;
    const scoreDiff = scoreRank(a) - scoreRank(b);
    if (scoreDiff) return scoreDiff;
    const buchholzDiff = getMajorBuchholzScore(b.teamId, records) - getMajorBuchholzScore(a.teamId, records);
    if (buchholzDiff) return buchholzDiff;
    const seedDiff = (a.seedRank || 999) - (b.seedRank || 999);
    if (seedDiff) return seedDiff;
    return getPoints(b.teamId) - getPoints(a.teamId);
  }).slice(0, 8);

  const matches = createEmptyPlayoffBracket(false).map((match) => ({
    ...match,
    format: match.poolKey === 'final'
      ? (stageFormats?.finalFormat || 'BO5')
      : match.poolKey?.startsWith('sf')
        ? (stageFormats?.semifinalFormat || 'BO3')
        : (stageFormats?.quarterfinalFormat || 'BO3')
  }));
  const pairings: Record<string, [number, number]> = {
    qf1: [0, 7], // 1 vs 8
    qf2: [3, 4], // 4 vs 5
    qf3: [1, 6], // 2 vs 7
    qf4: [2, 5]  // 3 vs 6
  };
  for (const match of matches.filter((entry) => entry.poolKey?.startsWith('qf'))) {
    const pairing = pairings[match.poolKey];
    if (!pairing) continue;
    match.teamAId = sorted[pairing[0]]?.teamId;
    match.teamBId = sorted[pairing[1]]?.teamId;
    if (match.teamAId && match.teamBId) match.status = 'ready';
  }
  return matches;
}

function advanceMajorSwissStage(
  currentState: TournamentState,
  allTeams: Team[],
  updatedRecords: Record<string, SwissTeamRecord>,
  updatedMatches: TournamentMatch[]
): TournamentState {
  const stageNumber = (currentState.majorStageNumber || 1) as 1 | 2 | 3;
  const majorStages = [...(currentState.majorStages || [])];
  const currentSavedStage = majorStages[stageNumber - 1];
  const qualifiedTeamIds = getMajorQualifiedTeamIds(updatedRecords, allTeams);
  const completedStage: MajorSwissStageState = {
    ...(currentSavedStage || createMajorStageSwissState(currentState.id, stageNumber, Object.keys(updatedRecords), [], allTeams, currentState.stageFormats)),
    teamIds: Object.keys(updatedRecords),
    matches: [...updatedMatches],
    records: JSON.parse(JSON.stringify(updatedRecords)),
    currentRound: currentState.swissRound,
    status: 'completed',
    qualifiedTeamIds
  };
  majorStages[stageNumber - 1] = completedStage;

  if (stageNumber < 3) {
    const nextStageNumber = (stageNumber + 1) as 2 | 3;
    const nextSavedStage = majorStages[nextStageNumber - 1];
    const directTeamIds = nextSavedStage?.directTeamIds || [];
    // Direct invitees occupy seeds 1-8, ordered by the pre-event seed. The
    // eight qualifiers from the previous stage fill seeds 9-16 in Swiss order.
    const directSet = new Set(directTeamIds);
    const incomingQualifiers = qualifiedTeamIds.filter((id) => !directSet.has(id));
    const entrants = [...directTeamIds, ...incomingQualifiers];
    const nextStage = createMajorStageSwissState(
      currentState.id,
      nextStageNumber,
      entrants,
      directTeamIds,
      allTeams,
      currentState.stageFormats,
      'active'
    );
    majorStages[nextStageNumber - 1] = nextStage;
    return {
      ...currentState,
      currentStage: 'swiss',
      majorStageNumber: nextStageNumber,
      majorStages,
      swissRound: 1,
      swissMatches: nextStage.matches,
      swissRecords: nextStage.records,
      playoffMatches: currentState.playoffMatches
    };
  }

  // Stage 3 sends its eight qualified teams to the usual 8-team Major playoff bracket.
  let seededPlayoffMatches = seedMajorPlayoffs(
    updatedRecords,
    allTeams,
    currentState.stageFormats
  );

  if (currentState.stageFormats?.playoffType === 'double_elimination') {
    const ids = seededPlayoffMatches.filter((match) => match.poolKey.startsWith('qf')).flatMap((match) => [match.teamAId, match.teamBId]);
    const entrantTeams = ids.map((id) => allTeams.find((team) => team.id === id)).filter(Boolean) as Team[];
    const bracket = createDoubleEliminationBracket(currentState.id, entrantTeams, currentState.stageFormats);
    const pairs = seededPlayoffMatches.filter((match) => match.poolKey.startsWith('qf'));
    seededPlayoffMatches = bracket.map((match) => {
      const pair = pairs.find((pair) => pair.poolKey === match.poolKey);
      return pair ? { ...match, teamAId: pair.teamAId, teamBId: pair.teamBId, status: 'ready' as const } : match;
    });
  }
  return {
    ...currentState,
    currentStage: 'playoffs',
    majorStageNumber: 4,
    majorStages,
    swissRound: currentState.swissRound,
    swissMatches: updatedMatches,
    swissRecords: updatedRecords,
    playoffMatches: seededPlayoffMatches
  };
}

/**
 * Advances Swiss Stage to the next round when current round is complete.
 * Automatically checks 3:0/3:1/3:2 qualifications and 0:3/1:3/2:3 eliminations.
 */
/**
 * Advances Swiss Stage to the next round when current round is complete.
 * Automatically checks 3:0/3:1/3:2 qualifications and 0:3/1:3/2:3 eliminations.
 */
export function advanceSwissRound(
  currentState: TournamentState,
  allTeams: Team[]
): TournamentState {
  const { swissMatches, swissRecords, swissRound, playoffMatches, includeThirdPlace } = currentState;

  // Clone state
  const updatedRecords: Record<string, SwissTeamRecord> = JSON.parse(JSON.stringify(swissRecords));
  const updatedMatches: TournamentMatch[] = [...swissMatches];

  // Ground-truth recompute from ALL finished swiss matches to prevent desync
  Object.values(updatedRecords).forEach((rec) => {
    rec.wins = 0;
    rec.losses = 0;
    rec.opponentsPlayed = [];
    rec.status = 'active';
  });

  for (const m of updatedMatches) {
    if (m.status !== 'finished' || !m.winnerId || !m.loserId) continue;
    const winnerRec = updatedRecords[m.winnerId];
    const loserRec = updatedRecords[m.loserId];

    if (winnerRec) {
      winnerRec.wins += 1;
      if (!winnerRec.opponentsPlayed.includes(m.loserId)) {
        winnerRec.opponentsPlayed.push(m.loserId);
      }
    }
    if (loserRec) {
      loserRec.losses += 1;
      if (!loserRec.opponentsPlayed.includes(m.winnerId)) {
        loserRec.opponentsPlayed.push(m.winnerId);
      }
    }
  }

  // Check qualifications & eliminations
  Object.values(updatedRecords).forEach((rec) => {
    if (rec.wins >= 3) {
      rec.status = 'qualified';
      rec.qualifiedScore = `${rec.wins}:${rec.losses}` as '3:0' | '3:1' | '3:2';
    } else if (rec.losses >= 3) {
      rec.status = 'eliminated';
      rec.eliminatedScore = `${rec.wins}:${rec.losses}` as '0:3' | '1:3' | '2:3';
    }
  });

  const nextRoundNumber = swissRound + 1;

  // Each Major Swiss stage uses the same 3-win / 3-loss system, but its eight qualifiers
  // must advance into the next 16-team stage instead of going straight to playoffs.
  const qualifiedTeams = Object.values(updatedRecords).filter((r) => r.status === 'qualified');
  if (currentState.mode === 'major' && (nextRoundNumber > 5 || qualifiedTeams.length === 8)) {
    return advanceMajorSwissStage(currentState, allTeams, updatedRecords, updatedMatches);
  }

  // A standalone Swiss tournament ends after the Swiss phase; it must not
  // silently turn into an unrelated eight-team playoff bracket.
  if (currentState.mode === 'swiss_system' && (nextRoundNumber > 5 || qualifiedTeams.length === 8)) {
    return {
      ...currentState,
      currentStage: 'completed',
      swissRound: Math.min(5, swissRound),
      swissRecords: updatedRecords,
      swissMatches: updatedMatches,
      playoffMatches: []
    };
  }

  // Check if Swiss + Playoffs is completed (5 rounds finished, or 8 qualified)
  if (nextRoundNumber > 5 || qualifiedTeams.length === 8) {
    const seededPlayoffMatches = seedPlayoffsFromSwiss(
      playoffMatches,
      qualifiedTeams,
      allTeams,
      includeThirdPlace
    );

    return {
      ...currentState,
      currentStage: 'playoffs',
      swissRound: 5,
      swissRecords: updatedRecords,
      swissMatches: updatedMatches,
      playoffMatches: seededPlayoffMatches
    };
  }

  // Generate matches for next round with STRICT rematch prevention and user-selected formats
  const effectiveStageFormats = currentState.mode === 'major'
    ? {
        ...currentState.stageFormats,
        swissNormalFormat: getMajorSwissFormat(currentState.stageFormats, (currentState.majorStageNumber || 1) as 1 | 2 | 3, false),
        swissDeciderFormat: getMajorSwissFormat(currentState.stageFormats, (currentState.majorStageNumber || 1) as 1 | 2 | 3, true)
      }
    : currentState.stageFormats;
  const nextMatches = generateSwissNextRoundMatches(
    nextRoundNumber,
    updatedRecords,
    allTeams,
    updatedMatches,
    effectiveStageFormats,
    currentState.mode === 'major' ? currentState.majorStageNumber : undefined
  );

  return {
    ...currentState,
    swissRound: nextRoundNumber,
    swissRecords: updatedRecords,
    swissMatches: [...updatedMatches, ...nextMatches]
  };
}

/**
 * Generates pairing matches for a Swiss round based on identical score pools.
 * Strictly guarantees ZERO REMATCHES (teams never face each other twice in Swiss).
 */
function generateSwissNextRoundMatches(
  roundNumber: number,
  records: Record<string, SwissTeamRecord>,
  allTeams: Team[],
  allPreviousMatches: TournamentMatch[] = [],
  stageFormats?: StageFormatSettings,
  majorStageNumber?: 1 | 2 | 3
): TournamentMatch[] {
  const newMatches: TournamentMatch[] = [];

  // Ground-truth check if two teams have ever met in any swiss match or record
  const hasEverPlayed = (teamA: string, teamB: string): boolean => {
    if (!teamA || !teamB || teamA === teamB) return true;
    const matchFound = allPreviousMatches.some(
      (m) =>
        (m.stage === 'swiss' || !m.stage) &&
        ((m.teamAId === teamA && m.teamBId === teamB) ||
          (m.teamAId === teamB && m.teamBId === teamA))
    );
    if (matchFound) return true;
    if (records[teamA]?.opponentsPlayed?.includes(teamB)) return true;
    if (records[teamB]?.opponentsPlayed?.includes(teamA)) return true;
    return false;
  };

  // Group active teams by [wins, losses]
  const pools: Record<string, string[]> = {};
  Object.values(records)
    .filter((r) => r.status === 'active')
    .forEach((r) => {
      const key = `${r.wins}:${r.losses}`;
      if (!pools[key]) pools[key] = [];
      pools[key].push(r.teamId);
    });

  // Helper to get VRS points for tiebreaks.
  const getPoints = (id: string) => allTeams.find((t) => t.id === id)?.points || 0;
  const compareMajorSeed = (aId: string, bId: string) => {
    const buchholzDiff = getMajorBuchholzScore(bId, records) - getMajorBuchholzScore(aId, records);
    if (buchholzDiff) return buchholzDiff;
    const seedDiff = (records[aId]?.seedRank || 999) - (records[bId]?.seedRank || 999);
    if (seedDiff) return seedDiff;
    return getPoints(bId) - getPoints(aId);
  };

  // Complete rematch-free backtracking algorithm for any list of teams
  const solveRematchFreePairing = (remaining: string[]): [string, string][] | null => {
    if (remaining.length === 0) return [];
    if (remaining.length % 2 !== 0) return null;

    const first = remaining[0];
    const candidates = remaining.slice(1);

    // In official CS Major Swiss, prefer high seed vs low seed within the score pool
    // Pair the highest-ranked remaining seed against the lowest-ranked
    // available opponent in the same W-L pool, avoiding same-stage rematches.
    candidates.sort((c1, c2) => majorStageNumber
      ? compareMajorSeed(c2, c1)
      : getPoints(c1) - getPoints(c2));

    for (const opp of candidates) {
      if (!hasEverPlayed(first, opp)) {
        const nextRemaining = remaining.filter((id) => id !== first && id !== opp);
        const subSolution = solveRematchFreePairing(nextRemaining);
        if (subSolution !== null) {
          return [[first, opp], ...subSolution];
        }
      }
    }
    return null;
  };

  Object.entries(pools).forEach(([poolKey, teamIds]) => {
    // Sort by Major stage seed / Buchholz when this is a Major; preserve VRS
    // ordering for the older Swiss formats.
    const sortedPool = [...teamIds].sort((a, b) => majorStageNumber
      ? compareMajorSeed(a, b)
      : getPoints(b) - getPoints(a));

    // Determine match format: Decider/Elimination matches (with 2 wins or 2 losses) use decider format, others use normal format
    const [w, l] = poolKey.split(':').map(Number);
    const isAdvancementOrElimination = w === 2 || l === 2;
    const normalFormat: MatchFormat =
      stageFormats?.swissNormalFormat ||
      allPreviousMatches.find((m) => m.roundNumber === 1)?.format ||
      'BO1';
    const deciderFormat: MatchFormat = stageFormats?.swissDeciderFormat || 'BO3';
    const format: MatchFormat = isAdvancementOrElimination ? deciderFormat : normalFormat;

    let paired = solveRematchFreePairing(sortedPool);

    // If initial high-vs-low search couldn't find a solution, try all permutations of candidates
    if (!paired) {
      const bruteForcePairing = (rem: string[]): [string, string][] | null => {
        if (rem.length === 0) return [];
        for (let i = 0; i < rem.length; i++) {
          for (let j = i + 1; j < rem.length; j++) {
            const tA = rem[i];
            const tB = rem[j];
            if (!hasEverPlayed(tA, tB)) {
              const nextRem = rem.filter((_, idx) => idx !== i && idx !== j);
              const sub = bruteForcePairing(nextRem);
              if (sub !== null) {
                return [[tA, tB], ...sub];
              }
            }
          }
        }
        return null;
      };
      paired = bruteForcePairing(sortedPool);
    }

    // Absolute fallback: guaranteed minimal rematches with strict priority against repeat opponents
    if (!paired) {
      paired = [];
      const available = [...sortedPool];
      while (available.length >= 2) {
        const teamA = available.shift()!;
        let oppIdx = available.findIndex((cand) => !hasEverPlayed(teamA, cand));
        if (oppIdx === -1) {
          oppIdx = 0;
        }
        const [teamB] = available.splice(oppIdx, 1);
        paired.push([teamA, teamB]);
      }
    }

    paired.forEach(([teamAId, teamBId], mIdx) => {
      newMatches.push({
        id: majorStageNumber
          ? `major_s${majorStageNumber}_swiss_r${roundNumber}_${poolKey.replace(':', '_')}_m${mIdx + 1}`
          : `swiss_r${roundNumber}_${poolKey.replace(':', '_')}_m${mIdx + 1}`,
        stage: 'swiss',
        poolKey,
        roundNumber,
        name: majorStageNumber
          ? `Stage ${majorStageNumber} · Раунд ${roundNumber} (${poolKey}) · Матч ${mIdx + 1}`
          : `Раунд ${roundNumber} (${poolKey}) · Матч ${mIdx + 1}`,
        teamAId,
        teamBId,
        scoreA: 0,
        scoreB: 0,
        format,
        status: 'ready'
      });
    });
  });

  return newMatches;
}

/**
 * Seeds qualified Swiss teams into Playoffs according to Major / HLTV bracket layout:
 * - 1st & 2nd seed: 3-0 teams
 * - 3rd, 4th, 5th seed: 3-1 teams
 * - 6th, 7th, 8th seed: 3-2 teams
 *
 * Bracket layout (matches photo 2):
 * QF1: Seed 1 (3-0) vs Seed 8 (3-2)
 * QF2: Seed 4 (3-1) vs Seed 5 (3-1)
 * QF3: Seed 2 (3-0) vs Seed 7 (3-2)
 * QF4: Seed 3 (3-1) vs Seed 6 (3-2)
 */
export function seedPlayoffsFromSwiss(
  playoffMatches: TournamentMatch[],
  qualifiedRecords: SwissTeamRecord[],
  allTeams: Team[],
  includeThirdPlace: boolean
): TournamentMatch[] {
  const getPoints = (id: string) => allTeams.find((t) => t.id === id)?.points || 0;

  // Group by qualified score
  const pool3_0 = qualifiedRecords.filter((r) => r.qualifiedScore === '3:0').sort((a, b) => getPoints(b.teamId) - getPoints(a.teamId));
  const pool3_1 = qualifiedRecords.filter((r) => r.qualifiedScore === '3:1').sort((a, b) => getPoints(b.teamId) - getPoints(a.teamId));
  const pool3_2 = qualifiedRecords.filter((r) => r.qualifiedScore === '3:2').sort((a, b) => getPoints(b.teamId) - getPoints(a.teamId));

  // Seeds 1 & 2
  const seed1 = pool3_0[0]?.teamId;
  const seed2 = pool3_0[1]?.teamId || pool3_1[0]?.teamId;

  // Seeds 3, 4, 5
  const remaining3_1 = pool3_1.filter((r) => r.teamId !== seed2);
  const seed3 = remaining3_1[0]?.teamId;
  const seed4 = remaining3_1[1]?.teamId;
  const seed5 = remaining3_1[2]?.teamId;

  // Seeds 6, 7, 8
  const seed6 = pool3_2[0]?.teamId;
  const seed7 = pool3_2[1]?.teamId;
  const seed8 = pool3_2[2]?.teamId;

  const isDE = playoffMatches.some((match) => match.poolKey === 'ub_final');
  const matches = isDE ? playoffMatches.map((match) => ({ ...match })) : createEmptyPlayoffBracket(includeThirdPlace);

  // QF1: Seed 1 vs Seed 8
  const qf1 = matches.find((m) => m.poolKey === 'qf1');
  if (qf1) {
    qf1.teamAId = seed1;
    qf1.teamBId = seed8;
    qf1.status = 'ready';
  }

  // QF2: Seed 4 vs Seed 5
  const qf2 = matches.find((m) => m.poolKey === 'qf2');
  if (qf2) {
    qf2.teamAId = seed4;
    qf2.teamBId = seed5;
    qf2.status = 'ready';
  }

  // QF3: Seed 2 vs Seed 7
  const qf3 = matches.find((m) => m.poolKey === 'qf3');
  if (qf3) {
    qf3.teamAId = seed2;
    qf3.teamBId = seed7;
    qf3.status = 'ready';
  }

  // QF4: Seed 3 vs Seed 6
  const qf4 = matches.find((m) => m.poolKey === 'qf4');
  if (qf4) {
    qf4.teamAId = seed3;
    qf4.teamBId = seed6;
    qf4.status = 'ready';
  }

  return matches;
}

/**
 * Updates a playoff match result and automatically propagates winners and losers
 * to the next rounds (Semi-finals, Grand Final, and 3rd place decider).
 */
/** Strict Grand Final detection (never matches quarter/semi/UB/LB finals). */
export function isGrandFinalMatch(m: { id: string; poolKey?: string }): boolean {
  const pk = (m.poolKey || '').toLowerCase();
  if (pk) return pk === 'final' || pk === 'final_reset' || pk === 'playoff_final' || pk === 'grand_final';
  const id = m.id.toLowerCase();
  return id === 'playoff_final' || (id.endsWith('_final') && !id.endsWith('_ub_final') && !id.endsWith('_lb_final'));
}

export function updatePlayoffMatchResult(
  playoffMatches: TournamentMatch[],
  matchId: string,
  scoreA: number,
  scoreB: number,
  includeThirdPlace: boolean,
  actualFormat?: MatchFormat
): { updatedMatches: TournamentMatch[]; isTournamentOver: boolean } {
  const matches = JSON.parse(JSON.stringify(playoffMatches)) as TournamentMatch[];
  const match = matches.find((m) => m.id === matchId);
  if (!match || !match.teamAId || !match.teamBId) {
    return { updatedMatches: matches, isTournamentOver: false };
  }

  if (actualFormat) {
    match.format = actualFormat;
  }
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.status = 'finished';

  const requiredWins = match.format === 'BO1' ? 1 : match.format === 'BO3' ? 2 : 3;
  const aWon = scoreA >= requiredWins;
  match.winnerId = aWon ? match.teamAId : match.teamBId;
  match.loserId = aWon ? match.teamBId : match.teamAId;

  // Resolve any explicitly linked bracket slots (round-of-16/32 trees, byes,
  // GSL play-ins, lower brackets, and grand finals). A few older formats still
  // use the fixed QF/SF routing below; source-linked slots are handled first.
  const resolveSource = (sourceRef: string | undefined, result: 'winner' | 'loser' | undefined) => {
    if (!sourceRef) return undefined;
    const source = matches.find((item) => item.id === sourceRef || item.poolKey === sourceRef);
    if (!source || source.status !== 'finished') return undefined;
    return result === 'loser' ? source.loserId : source.winnerId;
  };
  for (let pass = 0; pass < matches.length; pass++) {
    let changed = false;
    for (const downstream of matches) {
      if (downstream.status === 'finished') continue;
      if (downstream.sourceA) {
        const nextTeamA = resolveSource(downstream.sourceA, downstream.sourceAResult);
        if (downstream.teamAId !== nextTeamA) {
          downstream.teamAId = nextTeamA;
          changed = true;
        }
      }
      if (downstream.sourceB) {
        const nextTeamB = resolveSource(downstream.sourceB, downstream.sourceBResult);
        if (downstream.teamBId !== nextTeamB) {
          downstream.teamBId = nextTeamB;
          changed = true;
        }
      }
      const nextStatus = downstream.teamAId && downstream.teamBId ? 'ready' : 'scheduled';
      if (downstream.status !== nextStatus) {
        downstream.status = nextStatus;
        changed = true;
      }
    }
    if (!changed) break;
  }

  const isDoubleEliminationBracket = matches.some((item) => item.poolKey === 'ub_final');
  if (isDoubleEliminationBracket && match.poolKey === 'final' && match.winnerId === match.teamBId) {
    const resetAlreadyExists = matches.some((item) => item.poolKey === 'final_reset');
    if (!resetAlreadyExists && match.teamAId && match.teamBId) {
      const resetMatch: TournamentMatch = {
        id: `${match.id}_reset`,
        stage: 'grand_final',
        poolKey: 'final_reset',
        roundNumber: match.roundNumber + 1,
        name: 'Grand Final Reset · Решающий матч',
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        scoreA: 0,
        scoreB: 0,
        format: match.format,
        status: 'ready'
      };
      // Put the reset first so final detection/completion uses it as the decisive match.
      matches.splice(matches.indexOf(match), 0, resetMatch);
    }
  }

  if (!isDoubleEliminationBracket) {
  // Resolve round-of-12 play-in winners into their quarterfinals (used when
  // four four-team groups send the top three teams to a 12-team playoff).
  for (const qf of matches.filter((m) => m.poolKey.startsWith('qf') && m.sourceB)) {
    const sourceMatch = matches.find((m) => m.poolKey === qf.sourceB || m.id === qf.sourceB);
    if (sourceMatch?.status === 'finished' && sourceMatch.winnerId) {
      qf.teamBId = sourceMatch.winnerId;
      if (qf.teamAId && qf.status !== 'finished') qf.status = 'ready';
    }
  }

  // Propagate to Semi-Finals
  const qf1 = matches.find((m) => m.id === 'playoff_qf1' || m.poolKey === 'qf1');
  const qf2 = matches.find((m) => m.id === 'playoff_qf2' || m.poolKey === 'qf2');
  const sf1 = matches.find((m) => m.id === 'playoff_sf1' || m.poolKey === 'sf1');
  const qf3 = matches.find((m) => m.id === 'playoff_qf3' || m.poolKey === 'qf3');
  const qf4 = matches.find((m) => m.id === 'playoff_qf4' || m.poolKey === 'qf4');
  const sf2 = matches.find((m) => m.id === 'playoff_sf2' || m.poolKey === 'sf2');
  if (sf1) {
    if (sf1.directSeedA) {
      if (qf1?.winnerId) sf1.teamBId = qf1.winnerId;
    } else {
      if (qf1?.winnerId) sf1.teamAId = qf1.winnerId;
      if (qf2?.winnerId) sf1.teamBId = qf2.winnerId;
    }
    if (sf1.teamAId && sf1.teamBId && sf1.status !== 'finished') sf1.status = 'ready';
  }
  if (sf2) {
    if (sf2.directSeedA) {
      if (qf2?.winnerId) sf2.teamBId = qf2.winnerId;
    } else {
      if (qf3?.winnerId) sf2.teamAId = qf3.winnerId;
      if (qf4?.winnerId) sf2.teamBId = qf4.winnerId;
    }
    if (sf2.teamAId && sf2.teamBId && sf2.status !== 'finished') sf2.status = 'ready';
  }

  // Propagate to Grand Final
  const final = matches.find((m) => isGrandFinalMatch(m));
  if (final) {
    if (sf1?.winnerId) final.teamAId = sf1.winnerId;
    if (sf2?.winnerId) final.teamBId = sf2.winnerId;
    if (final.teamAId && final.teamBId && final.status !== 'finished') {
      final.status = 'ready';
    }
  }

  // Propagate to 3rd Place Match if enabled
  const thirdMatch = matches.find((m) => isThirdPlaceMatch(m));
  if (thirdMatch) {
    if (sf1?.loserId) thirdMatch.teamAId = sf1.loserId;
    if (sf2?.loserId) thirdMatch.teamBId = sf2.loserId;
    if (thirdMatch.teamAId && thirdMatch.teamBId && thirdMatch.status !== 'finished') {
      thirdMatch.status = 'ready';
    }
  }
  }

  // If a third-place match exists in the bracket, it is part of the tournament
  // and must be played before completion, even when an old saved tournament has
  // a stale includeThirdPlace=false flag.
  const finalMatchForCompletion = matches.find((item) => isGrandFinalMatch(item));
  const thirdMatchForCompletion = matches.find((item) => isThirdPlaceMatch(item));
  const thirdPlaceFinished = !thirdMatchForCompletion || (thirdMatchForCompletion.status === 'finished' && !!thirdMatchForCompletion.winnerId);
  const isTournamentOver = !!(finalMatchForCompletion?.status === 'finished' && finalMatchForCompletion.winnerId && thirdPlaceFinished);

  return { updatedMatches: matches, isTournamentOver };
}

/**
 * Calculates realistic dynamic VRS ranking bonus awarded to the champion (and podium teams),
 * taking into account tournament tier (Major, S-Tier, A-Tier, B-Tier, Community),
 * tournament size, strength of competing teams, and realistic organic variance.
 */
export function calculateTournamentVrsBounties(
  tier: TournamentTier = 'S-Tier',
  participatingTeams: Team[],
  teamCount: number = 16
): { championBonus: number; finalistBonus: number; thirdPlaceBonus: number } {
  // 1. Base points by tier
  let baseChampion = 290;
  if (tier === 'Major') baseChampion = 440;
  else if (tier === 'S-Tier') baseChampion = 300;
  else if (tier === 'A-Tier' || tier === 'Championship') baseChampion = 175;
  else if (tier === 'B-Tier') baseChampion = 95;
  else if (tier === 'Community') baseChampion = 45;

  // 2. Average field strength modifier
  const avgPoints =
    participatingTeams.length > 0
      ? participatingTeams.reduce((sum, t) => sum + (t.points || 1500), 0) / participatingTeams.length
      : 1600;
  const fieldFactor = Math.max(0.85, Math.min(1.25, 0.85 + (avgPoints / 1600) * 0.25));

  // 3. Tournament bracket scale modifier
  const sizeFactor = teamCount >= 24 ? 1.12 : teamCount >= 16 ? 1.05 : teamCount <= 4 ? 0.85 : 1.0;

  // 4. Organic natural variance (±8% and integer jitter so it's always varied)
  const varianceFactor = 1 + (Math.random() * 0.16 - 0.08);
  const jitter = Math.floor(Math.random() * 11) - 5;

  const rawChampion = Math.round(baseChampion * fieldFactor * sizeFactor * varianceFactor + jitter);
  const championBonus = Math.max(25, rawChampion);

  // Finalist receives ~42% of champion bounty with variance
  const finalistBonus = Math.max(15, Math.round(championBonus * 0.42 + (Math.random() * 8 - 4)));

  // 3rd place receives ~21% of champion bounty with variance
  const thirdPlaceBonus = Math.max(8, Math.round(championBonus * 0.21 + (Math.random() * 6 - 3)));

  return { championBonus, finalistBonus, thirdPlaceBonus };
}

/**
 * Computes complete final tournament standings for all participating teams.
 */
export function computeFinalTournamentStandings(
  tournament: TournamentState,
  allTeams: Team[],
  customBounties?: { championBonus: number; finalistBonus: number; thirdPlaceBonus: number }
): TournamentFinalStanding[] {
  const standings: TournamentFinalStanding[] = [];
  const { playoffMatches, swissRecords, mode, includeThirdPlace, tier = 'S-Tier', teamCount = 16 } = tournament;

  const vrsBounties =
    customBounties ||
    calculateTournamentVrsBounties(tier, allTeams, teamCount);

  const finalMatch = playoffMatches.find((m) => m.poolKey === 'final_reset' && m.status === 'finished')
    || playoffMatches.find((m) => m.poolKey === 'final')
    || playoffMatches.find((m) => isGrandFinalMatch(m));
  const thirdMatch = playoffMatches.find((m) => isThirdPlaceMatch(m));

  if (mode === 'blast_bounty') {
    const bountyPlaceRanges = [
      { round: 4, place: 3, label: '3–4-е место · Полуфинал' },
      { round: 3, place: 5, label: '5–8-е место · LAN четвертьфинал' },
      { round: 2, place: 9, label: '9–16-е место · Online Final 16' },
      { round: 1, place: 17, label: '17–32-е место · Online Round 1' }
    ];
    if (finalMatch?.winnerId) standings.push({ place: 1, placeLabel: '1-е место · ЧЕМПИОН BLAST BOUNTY', teamId: finalMatch.winnerId, badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/40', details: `Банк: $${Math.round(tournament.bountyBank?.[finalMatch.winnerId] || 0).toLocaleString('en-US')}` });
    if (finalMatch?.loserId) standings.push({ place: 2, placeLabel: '2-е место · Финалист', teamId: finalMatch.loserId, details: `Банк: $${Math.round(tournament.bountyBank?.[finalMatch.loserId] || 0).toLocaleString('en-US')}` });
    bountyPlaceRanges.forEach(({ round, place, label }) => {
      const roundMatches = playoffMatches.filter((match) => match.roundNumber === round && match.status === 'finished');
      roundMatches.forEach((match) => {
        if (!match.loserId || standings.some((standing) => standing.teamId === match.loserId)) return;
        standings.push({
          place,
          placeLabel: label,
          teamId: match.loserId,
          details: `Награда за голову: $${Math.round(tournament.bountyHeads?.[match.loserId] || 0).toLocaleString('en-US')} · Банк: $${Math.round(tournament.bountyBank?.[match.loserId] || 0).toLocaleString('en-US')}`
        });
      });
    });
    return standings;
  }

  if (playoffMatches.some((match) => match.poolKey === 'ub_final')) {
    if (finalMatch?.winnerId) standings.push({
      place: 1,
      placeLabel: '1-е место · Чемпион Double Elimination',
      teamId: finalMatch.winnerId,
      badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/40',
      vrsAwarded: vrsBounties.championBonus,
      details: `+${vrsBounties.championBonus} VRS очков чемпиону`
    });
    if (finalMatch?.loserId) standings.push({
      place: 2,
      placeLabel: '2-е место · Финалист',
      teamId: finalMatch.loserId,
      badgeColor: 'text-slate-300 bg-slate-300/10 border-slate-300/40',
      vrsAwarded: vrsBounties.finalistBonus,
      details: `+${vrsBounties.finalistBonus} VRS очков финалисту`
    });
    const placementGroups: Array<{ key: string; place: number; label: string; bonus?: number }> = [
      { key: 'lb_final', place: 3, label: '3-е место · Финал нижней сетки', bonus: vrsBounties.thirdPlaceBonus },
      { key: 'lb_sf', place: 4, label: '4-е место · Полуфинал нижней сетки' },
      ...(playoffMatches.some((m) => m.poolKey === 'lb_r4_1') ? [
        { key: 'lb_r4', place: 5, label: '5–6-е место · Нижняя сетка' },
        { key: 'lb_r3', place: 7, label: '7–8-е место · Нижняя сетка' },
        { key: 'lb_r2', place: 9, label: '9–12-е место · Нижняя сетка' },
        { key: 'lb_r1', place: 13, label: '13–16-е место · Нижняя сетка' }
      ] : [
        { key: 'lb_r2', place: 5, label: '5–6-е место · Нижняя сетка' },
        { key: 'lb_r1', place: 7, label: '7–8-е место · Нижняя сетка' }
      ])
    ];
    for (const group of placementGroups) {
      const groupMatches = playoffMatches.filter((match) => match.poolKey === group.key || match.poolKey.startsWith(`${group.key}_`));
      const losers = groupMatches.filter((match) => match.status === 'finished' && match.loserId).map((match) => match.loserId as string);
      losers.forEach((teamId, index) => {
        if (standings.some((standing) => standing.teamId === teamId)) return;
        standings.push({
          place: group.place + index,
          placeLabel: group.label,
          teamId,
          ...(group.bonus !== undefined && index === 0 ? { vrsAwarded: group.bonus, details: `+${group.bonus} VRS очков за 3-е место` } : {})
        });
      });
    }
    const remaining = (tournament.participatingTeamIds || []).filter((id) => !standings.some((row) => row.teamId === id));
    remaining.forEach((teamId) => standings.push({ place: standings.length + 1, placeLabel: 'Групповой / швейцарский этап', teamId }));
    return standings;
  }

  const sf1 = playoffMatches.find((m) => m.id === 'playoff_sf1' || m.poolKey === 'sf1');
  const sf2 = playoffMatches.find((m) => m.id === 'playoff_sf2' || m.poolKey === 'sf2');
  const qfMatches = playoffMatches.filter((m) => m.id.startsWith('playoff_qf') || m.poolKey.startsWith('qf'));
  const round12Matches = playoffMatches.filter((m) => m.poolKey.startsWith('r12'));

  // 1st Place (Champion)
  if (finalMatch?.winnerId) {
    standings.push({
      place: 1,
      placeLabel: '1-е место · ЧЕМПИОН',
      teamId: finalMatch.winnerId,
      badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/40',
      vrsAwarded: vrsBounties.championBonus,
      details: `+${vrsBounties.championBonus} VRS очков чемпиону`
    });
  }

  // 2nd Place (Finalist)
  if (finalMatch?.loserId) {
    standings.push({
      place: 2,
      placeLabel: '2-е место · Финалист',
      teamId: finalMatch.loserId,
      badgeColor: 'text-slate-300 bg-slate-300/10 border-slate-300/40',
      vrsAwarded: vrsBounties.finalistBonus,
      details: `+${vrsBounties.finalistBonus} VRS очков финалисту`
    });
  }

  // 3rd & 4th Place
  if (thirdMatch?.status === 'finished' && thirdMatch?.winnerId && thirdMatch?.loserId) {
    standings.push({
      place: 3,
      placeLabel: '3-е место · Бронзовый призёр',
      teamId: thirdMatch.winnerId,
      badgeColor: 'text-amber-600 bg-amber-600/10 border-amber-600/40',
      vrsAwarded: vrsBounties.thirdPlaceBonus,
      details: `+${vrsBounties.thirdPlaceBonus} VRS очков за 3-е место`
    });
    standings.push({
      place: 4,
      placeLabel: '4-е место',
      teamId: thirdMatch.loserId
    });
  } else {
    if (sf1?.loserId) {
      standings.push({
        place: 3,
        placeLabel: '3-4-е место (Полуфинал)',
        teamId: sf1.loserId,
        vrsAwarded: Math.round(vrsBounties.thirdPlaceBonus * 0.8),
        details: `+${Math.round(vrsBounties.thirdPlaceBonus * 0.8)} VRS очков`
      });
    }
    if (sf2?.loserId && sf2.loserId !== sf1?.loserId) {
      standings.push({
        place: 3,
        placeLabel: '3-4-е место (Полуфинал)',
        teamId: sf2.loserId,
        vrsAwarded: Math.round(vrsBounties.thirdPlaceBonus * 0.8),
        details: `+${Math.round(vrsBounties.thirdPlaceBonus * 0.8)} VRS очков`
      });
    }
  }

  // 5-8th Places (Quarter-finalists)
  qfMatches.forEach((qf) => {
    if (qf.loserId && !standings.some((s) => s.teamId === qf.loserId)) {
      standings.push({
        place: 5,
        placeLabel: '5-8-е место (Четвертьфинал)',
        teamId: qf.loserId
      });
    }
  });

  // Teams eliminated in a 12-team playoff play-in (the four-group Top 3 format).
  round12Matches.forEach((match) => {
    if (match.loserId && !standings.some((standing) => standing.teamId === match.loserId)) {
      standings.push({
        place: 9,
        placeLabel: '9-12-е место · Раунд за выход в четвертьфинал',
        teamId: match.loserId
      });
    }
  });

  // Account for losses in larger single-elimination rounds (round of 16/32).
  // The remaining field size before each round determines the place range, so
  // 12/24-team tournaments do not incorrectly award the unused bye slots.
  const largeRounds = [...new Set(playoffMatches
    .filter((match) => /^r\d+_/.test(match.poolKey) && match.status === 'finished' && !!match.loserId)
    .map((match) => match.roundNumber))].sort((a, b) => a - b);
  let activeEntrants = tournament.teamCount || tournament.participatingTeamIds?.length || teamCount;
  for (const roundNumber of largeRounds) {
    const roundLosers = playoffMatches.filter((match) =>
      match.roundNumber === roundNumber && /^r\d+_/.test(match.poolKey) && match.status === 'finished' && !!match.loserId
    );
    const remainingAfterRound = Math.max(0, activeEntrants - roundLosers.length);
    const placeStart = remainingAfterRound + 1;
    const placeEnd = activeEntrants;
    const label = placeStart === placeEnd
      ? `${placeStart}-е место · Раунд на выбывание`
      : `${placeStart}–${placeEnd}-е место · Раунд на выбывание`;
    roundLosers.forEach((match) => {
      if (!match.loserId || standings.some((standing) => standing.teamId === match.loserId)) return;
      standings.push({ place: placeStart, placeLabel: label, teamId: match.loserId });
    });
    activeEntrants = remainingAfterRound;
  }

  // Swiss stage eliminations (if Swiss was played)
  if (mode === 'swiss_playoffs' && swissRecords) {
    const eliminated2_3 = Object.values(swissRecords).filter((r) => r.eliminatedScore === '2:3');
    eliminated2_3.forEach((r) => {
      standings.push({
        place: 9,
        placeLabel: '9-11-е место (Швейцарка 2:3)',
        teamId: r.teamId,
        details: '2 победы · 3 поражения'
      });
    });

    const eliminated1_3 = Object.values(swissRecords).filter((r) => r.eliminatedScore === '1:3');
    eliminated1_3.forEach((r) => {
      standings.push({
        place: 12,
        placeLabel: '12-14-е место (Швейцарка 1:3)',
        teamId: r.teamId,
        details: '1 победа · 3 поражения'
      });
    });

    const eliminated0_3 = Object.values(swissRecords).filter((r) => r.eliminatedScore === '0:3');
    eliminated0_3.forEach((r) => {
      standings.push({
        place: 15,
        placeLabel: '15-16-е место (Швейцарка 0:3)',
        teamId: r.teamId,
        details: '0 побед · 3 поражения'
      });
    });
  }

  if (mode === 'major') {
    // Teams eliminated in earlier Major Swiss stages are ranked below the Stage 3 qualifiers.
    const majorStages = [...(tournament.majorStages || [])].sort((a, b) => b.stageNumber - a.stageNumber);
    for (const stage of majorStages) {
      if (stage.status !== 'completed') continue;
      const basePlace = stage.stageNumber === 3 ? 9 : stage.stageNumber === 2 ? 17 : 25;
      const eliminated = Object.values(stage.records || {})
        .filter((record) => record.status === 'eliminated')
        .sort((a, b) => b.wins - a.wins || a.losses - b.losses || (a.seedRank || 99) - (b.seedRank || 99));
      const byWins: Record<number, SwissTeamRecord[]> = { 2: [], 1: [], 0: [] };
      eliminated.forEach((record) => { (byWins[record.wins] || (byWins[record.wins] = [])).push(record); });
      let stagePlace = basePlace;
      for (const wins of [2, 1, 0]) {
        const group = byWins[wins] || [];
        if (!group.length) continue;
        const groupEnd = stagePlace + group.length - 1;
        const label = group.length === 1 ? `${stagePlace}-е место (Stage ${stage.stageNumber})` : `${stagePlace}-${groupEnd}-е место (Stage ${stage.stageNumber}, ${wins}:3)`;
        group.forEach((record) => {
          if (!standings.some((standing) => standing.teamId === record.teamId)) {
            standings.push({ place: stagePlace, placeLabel: label, teamId: record.teamId, details: `Stage ${stage.stageNumber}: ${wins} победы · 3 поражения` });
          }
        });
        stagePlace = groupEnd + 1;
      }
    }
  }

  // Round-robin tournaments award places directly from the completed table.
  if (mode === 'round_robin' && tournament.roundRobinTable?.length) {
    const ranked = [...tournament.roundRobinTable].sort((a, b) =>
      b.points - a.points || b.wins - a.wins || b.mapDiff - a.mapDiff
    );
    ranked.forEach((row, index) => {
      if (standings.some((standing) => standing.teamId === row.teamId)) return;
      standings.push({
        place: index + 1,
        placeLabel: `${index + 1}-е место · Круговой турнир`,
        teamId: row.teamId,
        details: `${row.wins} побед · ${row.losses} поражений`
      });
    });
  }

  // A standalone Swiss event ranks every entrant directly by its Swiss record.
  if (mode === 'swiss_system' && swissRecords) {
    const ranked = Object.values(swissRecords).sort((a, b) =>
      b.wins - a.wins || a.losses - b.losses || (a.seedRank || 99) - (b.seedRank || 99)
    );
    ranked.forEach((record, index) => {
      if (standings.some((standing) => standing.teamId === record.teamId)) return;
      standings.push({
        place: index + 1,
        placeLabel: `${index + 1}-е место · Швейцарская система`,
        teamId: record.teamId,
        details: `${record.wins} побед · ${record.losses} поражений`
      });
    });
  }

  return standings;
}

/**
 * Approximates CS2 tournament prize distributions by placement and event tier.
 * Weights reflect real patterns (large champion share, decreasing payouts for
 * finalists, semifinalists, quarterfinalists and earlier eliminations), then
 * normalize against this event's actual prize pool so payouts add up to the pool.
 * BLAST Bounty is deliberately different: the final bank is the team's payout.
 */
export function calculateTournamentPrizeMoneyPayouts(
  tournament: TournamentState,
  providedStandings?: TournamentFinalStanding[]
): Record<string, number> {
  const matchLists = [
    tournament.swissMatches || [],
    tournament.groupMatches || [],
    tournament.playoffMatches || [],
    tournament.lowerBracketMatches || [],
    tournament.roundRobinMatches || [],
    ...(tournament.grandFinalMatch ? [[tournament.grandFinalMatch]] : []),
    ...(tournament.groups || []).map((group) => group.matches || []),
    ...(tournament.majorStages || []).map((stage) => stage.matches || [])
  ];
  const participantIds = [...new Set([
    ...(tournament.participatingTeamIds || []),
    ...Object.keys(tournament.teamSeeds || {}),
    ...matchLists.flatMap((matches) => matches.flatMap((match) => [match.teamAId, match.teamBId].filter(Boolean) as string[]))
  ])];
  const payouts: Record<string, number> = Object.fromEntries(participantIds.map((teamId) => [teamId, 0]));

  if (tournament.mode === 'blast_bounty') {
    participantIds.forEach((teamId) => {
      payouts[teamId] = Math.max(0, Math.round(tournament.bountyBank?.[teamId] || 0));
    });
    return payouts;
  }

  const prizeText = String(tournament.prizePool || '');
  const prizeMatch = prizeText.match(/(\d[\d,]*(?:\.\d+)?)\s*([kmb])?/i);
  if (!prizeMatch) return payouts;
  const parsedValue = Number(prizeMatch[1].replace(/,/g, ''));
  const multiplier = ({ k: 1_000, m: 1_000_000, b: 1_000_000_000 } as Record<string, number>)[(prizeMatch[2] || '').toLowerCase()] || 1;
  const prizePool = Math.max(0, Math.round(parsedValue * multiplier));
  if (!Number.isFinite(prizePool) || prizePool <= 0 || participantIds.length === 0) return payouts;

  const tierProfiles: Record<string, { champion: number; finalist: number; semifinal: number; quarterfinal: number; top16: number; early: number }> = {
    'Major': { champion: 40, finalist: 14, semifinal: 6.5, quarterfinal: 3.6, top16: 1.6, early: 0.8 },
    'S-Tier': { champion: 34, finalist: 16, semifinal: 7, quarterfinal: 4, top16: 1.5, early: 0.5 },
    'A-Tier': { champion: 38, finalist: 17, semifinal: 8, quarterfinal: 4.5, top16: 1.2, early: 0.35 },
    'B-Tier': { champion: 42, finalist: 18, semifinal: 8, quarterfinal: 3.5, top16: 0.6, early: 0 },
    'Community': { champion: 45, finalist: 20, semifinal: 10, quarterfinal: 4, top16: 0, early: 0 },
    'Championship': { champion: 36, finalist: 16, semifinal: 7.5, quarterfinal: 4, top16: 1.3, early: 0.4 }
  };
  const profile = tierProfiles[tournament.tier || ''] || tierProfiles['S-Tier'];
  const weightForPlace = (place: number): number => {
    if (place <= 1) return profile.champion;
    if (place === 2) return profile.finalist;
    if (place <= 4) return profile.semifinal;
    if (place <= 8) return profile.quarterfinal;
    if (place <= 16) return profile.top16;
    return profile.early;
  };

  const standings = providedStandings?.length
    ? providedStandings
    : (tournament.standings?.length ? tournament.standings : computeFinalTournamentStandings(tournament, []));
  const placeByTeam: Record<string, number> = {};
  standings.forEach((standing) => {
    if (participantIds.includes(standing.teamId) && Number.isFinite(standing.place) && standing.place > 0) {
      const current = placeByTeam[standing.teamId];
      if (current === undefined || standing.place < current) placeByTeam[standing.teamId] = standing.place;
    }
  });

  if (tournament.mode === 'round_robin' && tournament.roundRobinTable?.length) {
    const rankedTable = [...tournament.roundRobinTable].sort((a, b) =>
      b.points - a.points || b.wins - a.wins || b.mapDiff - a.mapDiff
    );
    rankedTable.forEach((row, index) => { placeByTeam[row.teamId] = index + 1; });
  }

  // Some group-stage formats do not expose an exact place for every eliminated
  // team. They are assigned the next unfilled lower-place bucket (normally 9th+,
  // 13th+ or the early-stage bucket), which keeps payouts sensible and stable.
  const knownPlaces = Object.values(placeByTeam);
  const fallbackPlace = Math.max(9, (knownPlaces.length ? Math.max(...knownPlaces) + 1 : Math.ceil(participantIds.length / 2) + 1));
  participantIds.forEach((teamId) => {
    if (placeByTeam[teamId] === undefined) placeByTeam[teamId] = fallbackPlace;
  });

  const weightedTeams = participantIds.map((teamId) => ({ teamId, weight: weightForPlace(placeByTeam[teamId]) }));
  const totalWeight = weightedTeams.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return payouts;

  let assigned = 0;
  weightedTeams.forEach(({ teamId, weight }) => {
    const amount = weight > 0 ? Math.floor((prizePool * weight) / totalWeight) : 0;
    payouts[teamId] = amount;
    assigned += amount;
  });
  // Assign rounding remainder to the champion (or the highest-ranked participant).
  const topTeam = Object.entries(placeByTeam).sort((a, b) => a[1] - b[1])[0]?.[0];
  if (topTeam) payouts[topTeam] = (payouts[topTeam] || 0) + prizePool - assigned;
  return payouts;
}

/**
 * Unified chronological priority for tournament matches.
 * Returns higher rank for matches played LATER in the tournament,
 * so sorting descending (rankB - rankA) puts Grand Final at the VERY TOP,
 * down to the opening round / round 1 at the VERY BOTTOM.
 */
export function getTournamentMatchChronologicalRank(m: {
  stage?: string;
  stageName?: string;
  poolKey?: string;
  roundNumber?: number;
  name?: string;
  id?: string;
}): number {
  const pk = (m.poolKey || '').toLowerCase();
  const nm = (m.name || m.stageName || '').toLowerCase();
  const id = (m.id || '').toLowerCase();

  // 1. Grand Final: the reset (if one is required) is the absolute last match.
  if (pk === 'final_reset') return 1010;
  const isGrand =
    pk === 'final' ||
    pk === 'final_reset' ||
    pk === 'playoff_final' ||
    pk === 'grand_final' ||
    (id.includes('final') && !id.includes('semi') && !id.includes('quarter') && !id.includes('ub') && !id.includes('lb')) ||
    nm.includes('гранд-финал') ||
    nm.includes('гранд финал') ||
    (nm.includes('финал') &&
      !nm.includes('1/2') &&
      !nm.includes('1/4') &&
      !nm.includes('1/8') &&
      !nm.includes('четверть') &&
      !nm.includes('полу') &&
      !nm.includes('3-е') &&
      !nm.includes('бронз') &&
      !nm.includes('верхн') &&
      !nm.includes('нижн') &&
      !nm.includes('ub') &&
      !nm.includes('lb'));
  if (isGrand) return 1000;

  // 2. 3rd place decider (Rank 950)
  if (pk.includes('3rd') || pk.includes('third') || nm.includes('матч за 3-е место') || nm.includes('бронз')) {
    return 950;
  }

  // 3. Semifinals (1/2 финала, Rank 900)
  if (pk.startsWith('sf') || pk.includes('sf') || nm.includes('полуфинал') || nm.includes('1/2')) {
    return 900;
  }

  // 4. Quarterfinals (1/4 финала, Rank 800)
  if (pk.startsWith('qf') || pk.includes('qf') || nm.includes('четвертьфинал') || nm.includes('1/4')) {
    return 800;
  }

  // 5. Round of 16 (1/8 финала, Rank 700)
  if (pk.startsWith('r16') || pk.includes('r16') || nm.includes('1/8')) {
    return 700;
  }

  // Upper / Lower playoff finals
  if (pk.includes('ub_final')) return 680;
  if (pk.includes('lb_final')) return 660;
  if (pk.includes('upper') || nm.includes('верхняя')) return 640;
  if (pk.includes('lower') || nm.includes('нижняя')) return 620;

  // GSL Group matches: Decider -> Winners/Elim -> Opening
  if (pk.includes('decider') || nm.includes('решающий') || nm.includes('decider')) return 550;
  if (pk.endsWith('_uf') || pk.endsWith('_ls') || nm.includes('upper final') || nm.includes('lower final')) return 535;
  if (pk.includes('winners') || nm.includes('победителей')) return 520;
  if (pk.includes('elim') || nm.includes('вылет')) return 510;
  if (pk.includes('opening') || nm.includes('открывающий')) return 480;

  // Swiss rounds: Round 5 down to Round 1
  if (m.stage === 'swiss' || id.includes('swiss') || nm.includes('швейцар')) {
    return 300 + (m.roundNumber || 1) * 20; // R5 = 400, R4 = 380, R3 = 360, R2 = 340, R1 = 320
  }

  // Group stage & Round robin
  if (m.stage === 'groups' || nm.includes('групп')) {
    return 200 + (m.roundNumber || 1) * 10;
  }
  if (m.stage === 'round_robin' || nm.includes('тур')) {
    return 100 + (m.roundNumber || 1) * 5;
  }

  return m.roundNumber || 1;
}

/**
 * Extracts all matches played by a specific team in a tournament,
 * with clearly labeled stages (e.g. "Швейцарская система — Раунд 1", "1/4 финала (Четвертьфинал)", "Гранд-Финал"),
 * opponent information, score, format, and individual map results.
 * Strictly ordered in reverse chronological order: Grand Final at the very top (#1) down to round 1!
 */
export function extractTeamTournamentMatches(
  tournament: TournamentState,
  teamId: string,
  allTeams: Team[]
): TrophyMatchSummary[] {
  const summaries: TrophyMatchSummary[] = [];

  const getOpponent = (oppId: string) => allTeams.find((t) => t.id === oppId);

  const getStageTitle = (match: TournamentMatch): string => {
    if (match.stage === 'swiss') {
      const pool = match.poolKey || '0:0';
      const majorStageLabel = match.name?.match(/Stage [123]/i)?.[0];
      const stagePrefix = majorStageLabel ? `${majorStageLabel} · ` : '';
      if (match.roundNumber === 5) {
        return `${stagePrefix}Швейцарская система — Раунд 5 (Decider 2:2)`;
      }
      return `${stagePrefix}Швейцарская система — Раунд ${match.roundNumber} (Пул ${pool})`;
    }
    if (match.stage === 'playoffs' || match.stage === 'grand_final') {
      const pk = match.poolKey?.toLowerCase() || '';
      const nm = match.name?.toLowerCase() || '';

      // Canonical poolKey/id wins over a stale or misleading saved/display name.
      const canonicalStage = normalizeTrophyMatchStageName({
        id: match.id,
        poolKey: match.poolKey,
        stageName: match.name || ''
      });
      if (canonicalStage !== (match.name || '')) return canonicalStage;
      if (pk.includes('upper') || nm.includes('верхняя')) {
        return `Верхняя сетка · ${match.name}`;
      }
      if (pk.includes('lower') || nm.includes('нижняя')) {
        return `Нижняя сетка · ${match.name}`;
      }
      return match.name || 'Плей-офф';
    }
    if (match.stage === 'groups') {
      const pk = match.poolKey?.toLowerCase() || '';
      const nm = match.name?.toLowerCase() || '';
      const grp = match.groupLetter ? `Группа ${match.groupLetter} · ` : '';
      if (pk.includes('opening') || nm.includes('открывающий')) {
        return `${grp}Открывающий матч`;
      }
      if (pk.includes('winners') || nm.includes('победителей')) {
        return `${grp}Матч победителей (За выход #1)`;
      }
      if (pk.includes('elim') || nm.includes('вылет')) {
        return `${grp}Матч на вылет`;
      }
      if (pk.includes('decider') || nm.includes('решающий')) {
        return `${grp}Решающий матч (Decider)`;
      }
      return `${grp}Групповой этап · ${match.name || 'Раунд ' + match.roundNumber}`;
    }
    if (match.stage === 'round_robin') {
      return `Круговой турнир · ${match.name || 'Тур ' + match.roundNumber}`;
    }
    return match.name || 'Турнирный матч';
  };

  // Combine all matches and sort descending by chronological rank:
  // Latest matches (Grand Final = 1000) at index 0 down to round 1 (300)!
  const rawTournamentMatches = [
    ...(tournament.playoffMatches || []),
    ...(tournament.swissMatches || []),
    ...(tournament.groupMatches || []),
    ...(tournament.roundRobinMatches || []),
    ...((tournament.majorStages || []).filter((stage) => stage.status === 'completed').flatMap((stage) => stage.matches || []))
  ];
  const allFinished = [...new Map(rawTournamentMatches.map((match) => [match.id, match])).values()]
    .filter((m) => (m.teamAId === teamId || m.teamBId === teamId) && m.status === 'finished')
    .sort((a, b) => getTournamentMatchChronologicalRank(b) - getTournamentMatchChronologicalRank(a));

  allFinished.forEach((m) => {
    const isTeamA = m.teamAId === teamId;
    const oppId = isTeamA ? m.teamBId : m.teamAId;
    if (!oppId) return;

    const oppTeam = getOpponent(oppId);
    const scoreFor = isTeamA ? m.scoreA : m.scoreB;
    const scoreAgainst = isTeamA ? m.scoreB : m.scoreA;
    const isWinner = m.winnerId === teamId;
    const delta = isTeamA
      ? (isWinner ? m.deltaPointsA : -(m.deltaPointsA || 16))
      : (isWinner ? m.deltaPointsB : -(m.deltaPointsB || 16));

    summaries.push({
      id: m.id,
      stageName: getStageTitle(m),
      roundNumber: m.roundNumber,
      poolKey: m.poolKey,
      opponentId: oppId,
      opponentName: oppTeam?.name || 'Оппонент',
      opponentLogo: oppTeam?.customLogo || oppTeam?.logoUrl,
      opponentPoints: oppTeam?.points,
      result: isWinner ? 'W' : 'L',
      scoreSeries: `${scoreFor} : ${scoreAgainst}`,
      scoreA: scoreFor,
      scoreB: scoreAgainst,
      format: m.format,
      deltaPoints: delta,
      mapsPlayed: m.mapsPlayed
    });
  });

  return summaries;
}

export interface CreateTournamentParams {
  name: string;
  shortName?: string;
  organizer?: string;
  prizePool?: string;
  startDate?: string;
  description?: string;
  tier?: TournamentTier;
  mode: TournamentMode;
  teams: Team[]; // in seeded order (index 0 = Seed 1)
  stageFormats?: StageFormatSettings;
  includeThirdPlace?: boolean;
  majorStageAssignments?: Record<string, 1 | 2 | 3>;
}

/** Build a complete single-elimination tree for 4–32 entrants, including byes. */
function createSingleEliminationBracket(
  tournamentId: string,
  seededTeams: Team[],
  stageFormats: StageFormatSettings,
  includeThirdPlace: boolean
): TournamentMatch[] {
  type BracketNode = { teamId?: string; match?: TournamentMatch } | null;

  const teamCount = seededTeams.length;
  const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(2, teamCount)));
  const seedOrder = [1, 2];
  while (seedOrder.length < bracketSize) {
    const nextSize = seedOrder.length * 2;
    const expanded = seedOrder.flatMap((seed) => [seed, nextSize + 1 - seed]);
    seedOrder.splice(0, seedOrder.length, ...expanded);
  }

  const teamBySeed = new Map(seededTeams.map((team, index) => [index + 1, team.id]));
  let nodes: BracketNode[] = seedOrder.map((seed) => {
    const teamId = teamBySeed.get(seed);
    return teamId ? { teamId } : null;
  });
  const matches: TournamentMatch[] = [];
  const roundCount = Math.log2(bracketSize);

  for (let roundIndex = 1; roundIndex <= roundCount; roundIndex++) {
    const matchesInRound: TournamentMatch[] = [];
    const nextNodes: BracketNode[] = [];
    const slotsAtRoundStart = bracketSize / (2 ** (roundIndex - 1));
    const qfFormat = stageFormats.quarterfinalFormat || 'BO3';
    const sfFormat = stageFormats.semifinalFormat || 'BO3';
    const finalFormat = stageFormats.finalFormat || 'BO5';
    const roundFormat = slotsAtRoundStart >= 16 ? qfFormat : slotsAtRoundStart === 8 ? qfFormat : slotsAtRoundStart === 4 ? sfFormat : finalFormat;
    let activeMatchIndex = 0;

    for (let index = 0; index < nodes.length; index += 2) {
      const nodeA = nodes[index] || null;
      const nodeB = nodes[index + 1] || null;

      // A bye advances the seed without fabricating a played match.
      if (!nodeA && !nodeB) {
        nextNodes.push(null);
        continue;
      }
      if (nodeA && !nodeB) {
        nextNodes.push(nodeA);
        continue;
      }
      if (!nodeA && nodeB) {
        nextNodes.push(nodeB);
        continue;
      }

      activeMatchIndex += 1;
      let poolKey: string;
      let name: string;
      let format = roundFormat;
      if (slotsAtRoundStart >= 16) {
        poolKey = `r${slotsAtRoundStart}_${activeMatchIndex}`;
        name = `1/${slotsAtRoundStart / 2} финала · Матч ${activeMatchIndex}`;
      } else if (slotsAtRoundStart === 8) {
        poolKey = `qf${activeMatchIndex}`;
        name = `Четвертьфинал ${activeMatchIndex}`;
      } else if (slotsAtRoundStart === 4) {
        poolKey = `sf${activeMatchIndex}`;
        name = `Полуфинал ${activeMatchIndex}`;
      } else {
        poolKey = 'final';
        name = 'Гранд-финал';
        format = finalFormat;
      }

      const teamAId = nodeA?.teamId;
      const teamBId = nodeB?.teamId;
      const match: TournamentMatch = {
        id: `${tournamentId}_${poolKey}`,
        stage: poolKey === 'final' ? 'grand_final' : 'playoffs',
        poolKey,
        roundNumber: roundIndex,
        name,
        teamAId,
        teamBId,
        ...(nodeA?.match ? { sourceA: nodeA.match.id, sourceAResult: 'winner' as const } : {}),
        ...(nodeB?.match ? { sourceB: nodeB.match.id, sourceBResult: 'winner' as const } : {}),
        ...(nodeA?.teamId && nodeB?.match ? { directSeedA: true } : {}),
        ...(nodeB?.teamId && nodeA?.match ? { directSeedB: true } : {}),
        scoreA: 0,
        scoreB: 0,
        format,
        status: teamAId && teamBId ? 'ready' : 'scheduled'
      };
      matchesInRound.push(match);
      nextNodes.push({ match });
    }

    matches.push(...matchesInRound);
    nodes = nextNodes;
  }

  if (includeThirdPlace) {
    const semifinals = matches.filter((match) => match.poolKey.startsWith('sf'));
    if (semifinals.length === 2) {
      matches.push({
        id: `${tournamentId}_third_place`,
        stage: 'playoffs',
        poolKey: 'third_place',
        roundNumber: roundCount,
        name: 'Матч за 3-е место',
        scoreA: 0,
        scoreB: 0,
        format: stageFormats.semifinalFormat || 'BO3',
        status: 'scheduled',
        sourceA: semifinals[0].id,
        sourceAResult: 'loser',
        sourceB: semifinals[1].id,
        sourceBResult: 'loser'
      });
    }
  }

  return matches;
}

/** Collapse absent seeds before play; byes are never recorded as played losses. */
function pruneBracketByes(bracket: TournamentMatch[]): TournamentMatch[] {
  type Node = { teamId?: string; source?: string; result?: 'winner' | 'loser' };
  const results = new Map<string, { winner?: Node; loser?: Node }>();
  const output: TournamentMatch[] = [];
  for (const match of bracket) {
    const node = (side: 'A' | 'B'): Node | undefined => {
      const source = side === 'A' ? match.sourceA : match.sourceB;
      const result = (side === 'A' ? match.sourceAResult : match.sourceBResult) || 'winner';
      const teamId = side === 'A' ? match.teamAId : match.teamBId;
      return source ? results.get(source)?.[result] : teamId ? { teamId } : undefined;
    };
    const a = node('A'), b = node('B');
    if (!a || !b) { results.set(match.id, { winner: a || b }); continue; }
    output.push({ ...match, teamAId: a.teamId, teamBId: b.teamId,
      sourceA: a.source, sourceAResult: a.result, sourceB: b.source, sourceBResult: b.result,
      status: a.teamId && b.teamId ? 'ready' : 'scheduled' });
    results.set(match.id, { winner: { source: match.id, result: 'winner' }, loser: { source: match.id, result: 'loser' } });
  }
  return output;
}

function createDoubleEliminationBracket(tourId: string, seededTeams: Team[], stageFormats: StageFormatSettings): TournamentMatch[] {
    const qfFmt = stageFormats.quarterfinalFormat || 'BO3';
    const sfFmt = stageFormats.semifinalFormat || 'BO3';
    const finalFmt = stageFormats.finalFormat || 'BO5';
    const bracket: TournamentMatch[] = [];
    const addMatch = (
      poolKey: string,
      name: string,
      roundNumber: number,
      format: MatchFormat,
      sourceA?: string,
      sourceAResult: 'winner' | 'loser' = 'winner',
      sourceB?: string,
      sourceBResult: 'winner' | 'loser' = 'winner',
      teamAId?: string,
      teamBId?: string
    ) => {
      bracket.push({
        id: `${tourId}_${poolKey}`,
        stage: poolKey.startsWith('lb') ? 'lower_bracket' : poolKey === 'final' ? 'grand_final' : 'upper_bracket',
        poolKey,
        roundNumber,
        name,
        sourceA,
        sourceAResult,
        sourceB,
        sourceBResult,
        teamAId,
        teamBId,
        scoreA: 0,
        scoreB: 0,
        format,
        status: teamAId && teamBId ? 'ready' : 'scheduled'
      });
    };

    const T = (key: string) => `${tourId}_${key}`;

    // Group stages can qualify 4, 6, or 12 teams for a Double Elimination
    // playoff. Build a bye-aware upper bracket and wire every upper-bracket
    // loser into a lower-bracket path without fake/unfinished bye matches.
    // The established 8- and 16-team layouts below remain unchanged.
    if ([4, 6, 12].includes(seededTeams.length)) {
      type FlexibleNode = { teamId?: string; match?: TournamentMatch; result?: 'winner' | 'loser' } | null;
      const bracketSize = 2 ** Math.ceil(Math.log2(seededTeams.length));
      let seedOrder = [1, 2];
      while (seedOrder.length < bracketSize) {
        const nextSize = seedOrder.length * 2;
        seedOrder = seedOrder.flatMap((seed) => [seed, nextSize + 1 - seed]);
      }
      const teamBySeed = new Map(seededTeams.map((team, index) => [index + 1, team.id]));
      let upperNodes: FlexibleNode[] = seedOrder.map((seed) => {
        const teamId = teamBySeed.get(seed);
        return teamId ? { teamId } : null;
      });
      const upperRounds: TournamentMatch[][] = [];
      const roundCount = Math.log2(bracketSize);

      for (let roundIndex = 1; roundIndex <= roundCount; roundIndex++) {
        const matchesInRound: TournamentMatch[] = [];
        const nextNodes: FlexibleNode[] = [];
        const slotsAtRoundStart = upperNodes.length;
        let activeIndex = 0;
        for (let index = 0; index < upperNodes.length; index += 2) {
          const nodeA = upperNodes[index] || null;
          const nodeB = upperNodes[index + 1] || null;
          if (!nodeA && !nodeB) { nextNodes.push(null); continue; }
          if (nodeA && !nodeB) { nextNodes.push(nodeA); continue; }
          if (!nodeA && nodeB) { nextNodes.push(nodeB); continue; }

          activeIndex += 1;
          const isFinalRound = roundIndex === roundCount;
          const poolKey = isFinalRound
            ? 'ub_final'
            : slotsAtRoundStart >= 16
              ? `ub_r1_${activeIndex}`
              : slotsAtRoundStart === 8
                ? `qf${activeIndex}`
                : `sf${activeIndex}`;
          const roundLabel = isFinalRound
            ? 'Upper Bracket · Final'
            : slotsAtRoundStart >= 16
              ? `Upper Bracket · Opening round ${activeIndex}`
              : slotsAtRoundStart === 8
                ? `Upper Bracket · Quarter-final ${activeIndex}`
                : `Upper Bracket · Semi-final ${activeIndex}`;
          const matchFormat = isFinalRound || slotsAtRoundStart <= 4 ? sfFmt : qfFmt;
          addMatch(
            poolKey,
            roundLabel,
            roundIndex,
            matchFormat,
            nodeA?.match?.id,
            nodeA?.result || 'winner',
            nodeB?.match?.id,
            nodeB?.result || 'winner',
            nodeA?.teamId,
            nodeB?.teamId
          );
          const created = bracket[bracket.length - 1];
          matchesInRound.push(created);
          nextNodes.push({ match: created, result: 'winner' });
        }
        upperRounds.push(matchesInRound);
        upperNodes = nextNodes;
      }

      const loserNode = (match: TournamentMatch): FlexibleNode => ({ match, result: 'loser' });
      const winnerNode = (match: TournamentMatch): FlexibleNode => ({ match, result: 'winner' });
      let lowerRoundNumber = 1;

      const buildLowerRound = (nodes: FlexibleNode[], prefix: string, label: string, format: MatchFormat): FlexibleNode[] => {
        const arranged = [...nodes];
        // A single entrant receives a structural bye; no fake match is created.
        if (arranged.length % 2 === 1) arranged.unshift(null);
        const nextNodes: FlexibleNode[] = [];
        let matchIndex = 0;
        for (let index = 0; index < arranged.length; index += 2) {
          const nodeA = arranged[index] || null;
          const nodeB = arranged[index + 1] || null;
          if (!nodeA && !nodeB) { nextNodes.push(null); continue; }
          if (nodeA && !nodeB) { nextNodes.push(nodeA); continue; }
          if (!nodeA && nodeB) { nextNodes.push(nodeB); continue; }
          matchIndex += 1;
          const key = `${prefix}_${matchIndex}`;
          addMatch(
            key,
            `${label} · Match ${matchIndex}`,
            lowerRoundNumber,
            format,
            nodeA?.match?.id,
            nodeA?.result || 'winner',
            nodeB?.match?.id,
            nodeB?.result || 'winner',
            nodeA?.teamId,
            nodeB?.teamId
          );
          nextNodes.push({ match: bracket[bracket.length - 1], result: 'winner' });
        }
        lowerRoundNumber += 1;
        return nextNodes.filter(Boolean);
      };

      // First lower round contains opening-round losers.
      let lowerSurvivors: FlexibleNode[] = buildLowerRound(
        (upperRounds[0] || []).map(loserNode),
        'lb_r1',
        'Lower Bracket · Round 1',
        qfFmt
      );

      // Losers from each later upper round (except the upper final) join the
      // surviving lower teams. Odd cohorts get structural byes, not fabricated games.
      for (let upperIndex = 1; upperIndex < upperRounds.length - 1; upperIndex++) {
        const incoming = (upperRounds[upperIndex] || []).map(loserNode);
        const entrants = [...lowerSurvivors, ...incoming];
        const prefix = `lb_r${lowerRoundNumber}`;
        lowerSurvivors = buildLowerRound(
          entrants,
          prefix,
          `Lower Bracket · Round ${lowerRoundNumber}`,
          entrants.length > 4 ? qfFmt : sfFmt
        );
      }

      // Collapse the remaining lower teams to one finalist before the upper
      // final loser enters the lower final.
      while (lowerSurvivors.length > 1) {
        const prefix = `lb_r${lowerRoundNumber}`;
        lowerSurvivors = buildLowerRound(
          lowerSurvivors,
          prefix,
          `Lower Bracket · Round ${lowerRoundNumber}`,
          lowerSurvivors.length > 4 ? qfFmt : sfFmt
        );
      }

      const upperFinal = upperRounds[upperRounds.length - 1]?.[0];
      if (upperFinal && lowerSurvivors[0]) {
        addMatch(
          'lb_final',
          'Lower Bracket · Final',
          lowerRoundNumber,
          sfFmt,
          lowerSurvivors[0]?.match?.id,
          lowerSurvivors[0]?.result || 'winner',
          upperFinal.id,
          'loser'
        );
        const lowerFinal = bracket[bracket.length - 1];
        addMatch('final', 'Grand Final · Upper Winner vs Lower Winner', lowerRoundNumber + 1, finalFmt,
          upperFinal.id, 'winner', lowerFinal.id, 'winner');
      }
      return bracket;
    }

    if (seededTeams.length > 8) {
      // 16-team double elimination (opening round, UQF, USF, UF; 6 lower rounds).
      const r1Pairs = [[0, 15], [7, 8], [4, 11], [3, 12], [2, 13], [5, 10], [6, 9], [1, 14]];
      r1Pairs.forEach(([a, b], i) => addMatch(`ub_r1_${i + 1}`, `Upper Bracket · Opening round ${i + 1}`, 1, qfFmt,
        undefined, 'winner', undefined, 'winner', seededTeams[a]?.id, seededTeams[b]?.id));
      for (let i = 1; i <= 4; i++) addMatch(`qf${i}`, `Upper Bracket · Quarter-final ${i}`, 2, qfFmt, T(`ub_r1_${i * 2 - 1}`), 'winner', T(`ub_r1_${i * 2}`), 'winner');
      addMatch('sf1', 'Upper Bracket · Semi-final 1', 3, sfFmt, T('qf1'), 'winner', T('qf2'), 'winner');
      addMatch('sf2', 'Upper Bracket · Semi-final 2', 3, sfFmt, T('qf3'), 'winner', T('qf4'), 'winner');
      addMatch('ub_final', 'Upper Bracket · Final', 4, sfFmt, T('sf1'), 'winner', T('sf2'), 'winner');
      for (let i = 1; i <= 4; i++) addMatch(`lb_r1_${i}`, `Lower Bracket · Round 1 · Match ${i}`, 1, qfFmt, T(`ub_r1_${i * 2 - 1}`), 'loser', T(`ub_r1_${i * 2}`), 'loser');
      for (let i = 1; i <= 4; i++) addMatch(`lb_r2_${i}`, `Lower Bracket · Round 2 · Match ${i}`, 2, qfFmt, T(`lb_r1_${i}`), 'winner', T(`qf${5 - i}`), 'loser');
      addMatch('lb_r3_1', 'Lower Bracket · Round 3 · Match 1', 3, qfFmt, T('lb_r2_1'), 'winner', T('lb_r2_2'), 'winner');
      addMatch('lb_r3_2', 'Lower Bracket · Round 3 · Match 2', 3, qfFmt, T('lb_r2_3'), 'winner', T('lb_r2_4'), 'winner');
      addMatch('lb_r4_1', 'Lower Bracket · Semi-final 1', 4, sfFmt, T('lb_r3_1'), 'winner', T('sf2'), 'loser');
      addMatch('lb_r4_2', 'Lower Bracket · Semi-final 2', 4, sfFmt, T('lb_r3_2'), 'winner', T('sf1'), 'loser');
      addMatch('lb_sf', 'Lower Bracket · Final', 5, sfFmt, T('lb_r4_1'), 'winner', T('lb_r4_2'), 'winner');
      addMatch('lb_final', 'Consolidation Final', 6, sfFmt, T('lb_sf'), 'winner', T('ub_final'), 'loser');
      addMatch('final', 'Grand Final · Upper Winner vs Lower Winner', 7, finalFmt, T('ub_final'), 'winner', T('lb_final'), 'winner');
      return pruneBracketByes(bracket);
    }

    const qfPairs = [[0, 7], [3, 4], [1, 6], [2, 5]];
    qfPairs.forEach(([indexA, indexB], index) => addMatch(
      `qf${index + 1}`,
      `Upper Bracket · Quarter-final ${index + 1}`,
      1,
      qfFmt,
      undefined, 'winner', undefined, 'winner',
      seededTeams[indexA]?.id,
      seededTeams[indexB]?.id
    ));

    addMatch('sf1', 'Upper Bracket · Semi-final 1', 2, sfFmt, `${tourId}_qf1`, 'winner', `${tourId}_qf2`, 'winner');
    addMatch('sf2', 'Upper Bracket · Semi-final 2', 2, sfFmt, `${tourId}_qf3`, 'winner', `${tourId}_qf4`, 'winner');
    addMatch('ub_final', 'Upper Bracket · Final', 3, sfFmt, `${tourId}_sf1`, 'winner', `${tourId}_sf2`, 'winner');

    addMatch('lb_r1_1', 'Lower Bracket · Round 1 · Match 1', 2, qfFmt, `${tourId}_qf1`, 'loser', `${tourId}_qf2`, 'loser');
    addMatch('lb_r1_2', 'Lower Bracket · Round 1 · Match 2', 2, qfFmt, `${tourId}_qf3`, 'loser', `${tourId}_qf4`, 'loser');
    addMatch('lb_r2_1', 'Lower Bracket · Round 2 · Match 1', 3, qfFmt, `${tourId}_lb_r1_1`, 'winner', `${tourId}_sf2`, 'loser');
    addMatch('lb_r2_2', 'Lower Bracket · Round 2 · Match 2', 3, qfFmt, `${tourId}_lb_r1_2`, 'winner', `${tourId}_sf1`, 'loser');
    addMatch('lb_sf', 'Lower Bracket · Semi-final', 4, sfFmt, `${tourId}_lb_r2_1`, 'winner', `${tourId}_lb_r2_2`, 'winner');
    addMatch('lb_final', 'Lower Bracket · Final', 5, sfFmt, `${tourId}_lb_sf`, 'winner', `${tourId}_ub_final`, 'loser');
    addMatch('final', 'Grand Final · Upper Winner vs Lower Winner', 6, finalFmt, `${tourId}_ub_final`, 'winner', `${tourId}_lb_final`, 'winner');

    return pruneBracketByes(bracket);
}

/**
 * Creates a fully customized tournament state based on user parameters, format, and seeding.
 */
export function createCustomTournament(params: CreateTournamentParams): TournamentState {
  const {
    name,
    shortName = name.slice(0, 6).toUpperCase(),
    organizer = 'CS2 Organizer',
    prizePool = '$1,000,000',
    startDate = new Date().toISOString().split('T')[0],
    description = '',
    tier = name.toLowerCase().includes('major') ? 'Major' : 'S-Tier',
    mode,
    teams: seededTeams,
    stageFormats = {},
    includeThirdPlace = true,
    majorStageAssignments = {}
  } = params;

  const teamCount = seededTeams.length;
  const requestedGroupStyle = stageFormats.groupStyle || (mode === 'gsl_groups' ? 'gsl' : undefined);
  const groupCountForFormat = stageFormats.groupCount || 2;
  const mandatoryGslEightTeamThirdPlace = (mode === 'gsl_groups' || mode === 'groups_playoffs')
    && teamCount >= 16
    && groupCountForFormat === 2
    && (requestedGroupStyle === 'gsl_double_elim_8' || requestedGroupStyle === 'gsl');
  const effectiveIncludeThirdPlace = mode === 'major' || stageFormats.playoffType === 'double_elimination' ? false : includeThirdPlace || mandatoryGslEightTeamThirdPlace;
  const teamSeeds: Record<string, number> = {};
  seededTeams.forEach((t, idx) => {
    teamSeeds[t.id] = idx + 1;
  });

  const tourId = `tour_${Date.now()}_${++tournamentIdSequence}`;
  const baseState: TournamentState = {
    id: tourId,
    name,
    shortName,
    organizer,
    prizePool,
    startDate,
    description,
    tier,
    mode,
    teamCount,
    participatingTeamIds: seededTeams.map((t) => t.id),
    teamSeeds,
    stageFormats,
    includeThirdPlace: effectiveIncludeThirdPlace,
    currentStage: mode === 'playoffs_only' || mode === 'single_elimination' || mode === 'double_elimination'
      ? 'playoffs'
      : mode === 'round_robin'
      ? 'round_robin'
      : mode === 'groups_playoffs' || mode === 'gsl_groups'
      ? 'groups'
      : 'swiss',
    swissRound: 1,
    swissMatches: [],
    swissRecords: {},
    playoffMatches: []
  };

  // 0. Valve Major: three sequential 16-team Swiss stages, then the top-8 playoff.
  if (mode === 'major') {
    const capacities = { 1: 16, 2: 8, 3: 8 } as const;
    const assigned: Record<string, 1 | 2 | 3> = {};
    const assignmentCounts = { 1: 0, 2: 0, 3: 0 };
    // Keep requested assignments when possible, then fill any missing slots in seed order.
    seededTeams.forEach((team, index) => {
      const requested = majorStageAssignments[team.id];
      if (requested && assignmentCounts[requested] < capacities[requested]) {
        assigned[team.id] = requested;
        assignmentCounts[requested] += 1;
      } else if (!requested) {
        // defer unassigned entrants until after explicit assignments have been honored
      }
    });
    seededTeams.forEach((team, index) => {
      if (assigned[team.id]) return;
      const preferred = index < 16 ? 1 : index < 24 ? 2 : 3;
      let target = preferred;
      if (assignmentCounts[target] >= capacities[target]) {
        target = ([1, 2, 3] as const).find((stage) => assignmentCounts[stage] < capacities[stage]) || 3;
      }
      assigned[team.id] = target as 1 | 2 | 3;
      assignmentCounts[target as 1 | 2 | 3] += 1;
    });

    const directTeamIds = {
      1: seededTeams.filter((team) => assigned[team.id] === 1).map((team) => team.id),
      2: seededTeams.filter((team) => assigned[team.id] === 2).map((team) => team.id),
      3: seededTeams.filter((team) => assigned[team.id] === 3).map((team) => team.id)
    };
    const stage1 = createMajorStageSwissState(tourId, 1, directTeamIds[1], directTeamIds[1], seededTeams, stageFormats, 'active');
    const stage2 = createMajorStageSwissState(tourId, 2, [], directTeamIds[2], seededTeams, stageFormats, 'waiting');
    const stage3 = createMajorStageSwissState(tourId, 3, [], directTeamIds[3], seededTeams, stageFormats, 'waiting');

    return {
      ...baseState,
      tier: 'Major',
      teamCount: seededTeams.length,
      currentStage: 'swiss',
      majorStageNumber: 1,
      majorStages: [stage1, stage2, stage3],
      swissRound: 1,
      swissMatches: stage1.matches,
      swissRecords: stage1.records,
      playoffMatches: createEmptyPlayoffBracket(false),
      includeThirdPlace: false
    };
  }

  // BLAST Bounty is a dedicated 32-team single-elimination format. Pairings are
  // intentionally left blank until each interactive draft is confirmed; unlike a
  // fixed bracket, later rounds are paired using inherited seeds.
  if (mode === 'blast_bounty') {
    const bountyHeads: Record<string, number> = {};
    const bountyBank: Record<string, number> = {};
    const bountySeeds: Record<string, number> = {};
    seededTeams.forEach((team, index) => {
      const seed = index + 1;
      bountySeeds[team.id] = seed;
      bountyBank[team.id] = 0;
      bountyHeads[team.id] = seed <= 4 ? 60000 : seed <= 8 ? 45000 : seed <= 12 ? 30000 : seed <= 16 ? 15000 : 0;
    });

    const roundConfigs = [
      { round: 1, count: 16, label: 'Online · Раунд 1 (32 → 16)', format: 'BO3' as MatchFormat },
      { round: 2, count: 8, label: 'Online · Раунд 2 (16 → Final 8)', format: 'BO3' as MatchFormat },
      { round: 3, count: 4, label: 'LAN · Четвертьфиналы (Final 8)', format: 'BO3' as MatchFormat },
      { round: 4, count: 2, label: 'LAN · Полуфиналы', format: 'BO3' as MatchFormat },
      { round: 5, count: 1, label: 'LAN · Гранд-финал', format: 'BO5' as MatchFormat }
    ];
    const playoffMatches: TournamentMatch[] = [];
    roundConfigs.forEach(({ round, count, label, format }) => {
      for (let index = 0; index < count; index++) {
        const isFinal = round === 5;
        playoffMatches.push({
          id: `${tourId}_bounty_r${round}_m${index + 1}`,
          stage: isFinal ? 'grand_final' : 'playoffs',
          poolKey: isFinal ? 'final' : `bounty_r${round}_m${index + 1}`,
          roundNumber: round,
          name: isFinal ? 'BLAST Bounty · Гранд-финал' : `${label} · Матч ${index + 1}`,
          scoreA: 0,
          scoreB: 0,
          format,
          status: 'scheduled'
        });
      }
    });

    return {
      ...baseState,
      name: name || 'BLAST Bounty CS2 Championship',
      teamCount: 32,
      includeThirdPlace: false,
      currentStage: 'playoffs',
      playoffMatches,
      bountyHeads,
      bountyBank,
      bountySeeds,
      bountyCurrentRound: 1,
      bountyWagers: {},
      bountyProcessedMatchIds: []
    };
  }

  // 1. Single Elimination: create a complete source-linked bracket for every
  // supported participant count. This fixes missing 16/24/32-team rounds and
  // lets later rounds receive winners without depending on fixed QF/SF indexes.
  if (mode === 'single_elimination' || mode === 'playoffs_only') {
    return {
      ...baseState,
      playoffMatches: createSingleEliminationBracket(tourId, seededTeams, stageFormats, includeThirdPlace)
    };
  }

  // 2. Complete 8-team Double Elimination bracket. Every lower-bracket slot is
  // linked to the relevant upper-bracket loser/winner, so it fills itself in.
  if (mode === 'double_elimination') {
    return { ...baseState, includeThirdPlace: false, playoffMatches: createDoubleEliminationBracket(tourId, seededTeams, stageFormats) };
  }

  // 3. Swiss System & Swiss + Playoffs
  if (mode === 'swiss_playoffs' || mode === 'swiss_system') {
    const swissNormalFmt = stageFormats.swissNormalFormat || 'BO1';
    const swissRecords: Record<string, SwissTeamRecord> = {};
    seededTeams.forEach((team, idx) => {
      swissRecords[team.id] = {
        teamId: team.id,
        wins: 0,
        losses: 0,
        opponentsPlayed: [],
        status: 'active',
        seedRank: idx + 1
      };
    });

    // 1 vs 16, 2 vs 15, etc.
    const swissRound1Matches: TournamentMatch[] = [];
    const half = Math.floor(teamCount / 2);
    for (let i = 0; i < half; i++) {
      const idxA = i;
      const idxB = teamCount - 1 - i;
      swissRound1Matches.push({
        id: `${tourId}_swiss_r1_m${i + 1}`,
        stage: 'swiss',
        poolKey: '0:0',
        roundNumber: 1,
        name: `Раунд 1 (0:0) · Матч ${i + 1}`,
        teamAId: seededTeams[idxA]?.id,
        teamBId: seededTeams[idxB]?.id,
        scoreA: 0,
        scoreB: 0,
        format: swissNormalFmt,
        status: 'ready'
      });
    }

    const playoffMatches = mode === 'swiss_playoffs'
      ? (stageFormats.playoffType === 'double_elimination'
        ? createDoubleEliminationBracket(tourId, seededTeams.slice(0, 8), stageFormats).map((match) => ({ ...match, teamAId: undefined, teamBId: undefined, status: 'scheduled' as const }))
        : createEmptyPlayoffBracket(includeThirdPlace))
      : [];

    return {
      ...baseState,
      swissMatches: swissRound1Matches,
      swissRecords,
      playoffMatches
    };
  }

  // 4. Round Robin System
  if (mode === 'round_robin') {
    const roundRobinTable: RoundRobinTableRow[] = seededTeams.map((t) => ({
      teamId: t.id,
      played: 0,
      wins: 0,
      losses: 0,
      mapDiff: 0,
      points: 0
    }));

    // Circle-method schedule: every team plays at most once per round, with
    // each pair meeting exactly once (and an explicit bye for odd field sizes).
    const matches: TournamentMatch[] = [];
    const rotation: Array<string | null> = seededTeams.map((team) => team.id);
    if (rotation.length % 2 === 1) rotation.push(null);
    const roundCount = Math.max(0, rotation.length - 1);
    const matchesPerRound = Math.floor(rotation.length / 2);

    for (let roundIndex = 0; roundIndex < roundCount; roundIndex++) {
      for (let pairIndex = 0; pairIndex < matchesPerRound; pairIndex++) {
        const teamAId = rotation[pairIndex];
        const teamBId = rotation[rotation.length - 1 - pairIndex];
        if (!teamAId || !teamBId) continue;
        const matchIndex = matches.length + 1;
        matches.push({
          id: `${tourId}_rr_r${roundIndex + 1}_m${pairIndex + 1}`,
          stage: 'round_robin',
          poolKey: `rr_r${roundIndex + 1}`,
          roundNumber: roundIndex + 1,
          name: `Тур ${roundIndex + 1} · Матч ${pairIndex + 1}`,
          teamAId,
          teamBId,
          scoreA: 0,
          scoreB: 0,
          format: stageFormats.groupFormat || 'BO1',
          status: 'ready'
        });
      }
      // Keep the first team fixed and rotate the remaining teams by one slot.
      if (rotation.length > 2) {
        const last = rotation.pop()!;
        rotation.splice(1, 0, last);
      }
    }

    return {
      ...baseState,
      roundRobinTable,
      roundRobinMatches: matches,
      playoffMatches: []
    };
  }

  // 5. Groups + Playoffs & GSL Groups (Configurable 2 or 4 groups)
  if (mode === 'groups_playoffs' || mode === 'gsl_groups') {
    // User configured group count (default 2 groups for 8 teams, 4 groups for 16 teams)
    const reqGroupCount = stageFormats.groupCount || (teamCount >= 16 ? 2 : 2);
    const groupCount = Math.max(2, Math.min(reqGroupCount, Math.floor(teamCount / 4) || 2));
    const configuredGroupStyle = stageFormats.groupStyle || (mode === 'gsl_groups' ? 'gsl' : 'round_robin');
    const isTop3Gsl = configuredGroupStyle === 'gsl_top3';
    const isGsl = mode === 'gsl_groups' || configuredGroupStyle === 'gsl' || configuredGroupStyle === 'gsl_classic_4' || configuredGroupStyle === 'gsl_double_elim_8' || isTop3Gsl;
    const includeGroupThirdPlace = effectiveIncludeThirdPlace && (includeThirdPlace || (
      groupCount === 2 && teamCount >= 16 &&
      (configuredGroupStyle === 'gsl_double_elim_8' || configuredGroupStyle === 'gsl')
    ));

    const groups: TournamentGroup[] = [];
    const allGroupMatches: TournamentMatch[] = [];
    const groupLetters = 'ABCDEFGH'.split('');

    // Snake seeding distribution into groups:
    // Group A gets seeds 0, 3, 4, 7... Group B gets seeds 1, 2, 5, 6...
    for (let g = 0; g < groupCount; g++) {
      const gLetter = groupLetters[g];
      const gName = `Группа ${gLetter}`;
      const groupTeams: Team[] = [];

      for (let i = 0; i < seededTeams.length; i++) {
        const round = Math.floor(i / groupCount);
        const defaultPos = round % 2 === 0 ? i % groupCount : groupCount - 1 - (i % groupCount);
        const defaultLetter = groupLetters[defaultPos];
        const requestedLetter = (stageFormats as any).groupAssignments?.[seededTeams[i].id];
        const assignedLetter = groupLetters.slice(0, groupCount).includes(requestedLetter) ? requestedLetter : defaultLetter;
        if (assignedLetter === gLetter) groupTeams.push(seededTeams[i]);
      }

      const gMatches: TournamentMatch[] = [];

      if (isGsl) {
        // Four-team GSL formats in this app are played strictly as Bo3. Eight-team
        // groups may retain the configured format for backwards compatibility.
        const fmt: MatchFormat = groupTeams.length === 4 && configuredGroupStyle !== 'round_robin'
          ? 'BO3'
          : (stageFormats.groupFormat || 'BO3');
        if (groupTeams.length >= 8) {
          // Eight-team GSL-style double-elimination bracket. The source links make
          // every winner/loser flow into the correct next match automatically.
          const add = (key: string, title: string, round: number, a?: string, ar: 'winner'|'loser' = 'winner', b?: string, br: 'winner'|'loser' = 'winner', teamAId?: string, teamBId?: string) => {
            gMatches.push({ id: `${tourId}_gsl_${gLetter}_${key}`, stage: 'groups', poolKey: `gsl_${gLetter}_${key}`, roundNumber: round, groupLetter: gLetter, name: `${gName} · ${title}`, teamAId, teamBId, sourceA: a, sourceAResult: ar, sourceB: b, sourceBResult: br, scoreA: 0, scoreB: 0, format: fmt, status: teamAId && teamBId ? 'ready' : 'scheduled' });
          };
          // Seeded eight-team opening bracket: 1v8, 4v5, 2v7, 3v6.
          add('u1_1', 'Opening round · Match 1', 1, undefined, 'winner', undefined, 'winner', groupTeams[0]?.id, groupTeams[7]?.id);
          add('u1_2', 'Opening round · Match 2', 1, undefined, 'winner', undefined, 'winner', groupTeams[3]?.id, groupTeams[4]?.id);
          add('u1_3', 'Opening round · Match 3', 1, undefined, 'winner', undefined, 'winner', groupTeams[1]?.id, groupTeams[6]?.id);
          add('u1_4', 'Opening round · Match 4', 1, undefined, 'winner', undefined, 'winner', groupTeams[2]?.id, groupTeams[5]?.id);
          add('u2_1', 'Upper semi-final 1', 2, `gsl_${gLetter}_u1_1`, 'winner', `gsl_${gLetter}_u1_2`, 'winner');
          add('u2_2', 'Upper semi-final 2', 2, `gsl_${gLetter}_u1_3`, 'winner', `gsl_${gLetter}_u1_4`, 'winner');
          add('uf', 'Upper final · 1st / 2nd place', 3, `gsl_${gLetter}_u2_1`, 'winner', `gsl_${gLetter}_u2_2`, 'winner');

          // Correct 8-team double-elimination flow:
          // 4 opening-round losers -> 2 lower round-1 matches -> 2 lower semifinals -> 1 lower final.
          // Upper-semifinal losers enter the lower semifinals. There is no extra match against the
          // upper-final loser: that team is already 2nd place and qualifies directly for playoffs.
          add('l1_1', 'Lower round 1 · Match 1', 2, `gsl_${gLetter}_u1_1`, 'loser', `gsl_${gLetter}_u1_2`, 'loser');
          add('l1_2', 'Lower round 1 · Match 2', 2, `gsl_${gLetter}_u1_3`, 'loser', `gsl_${gLetter}_u1_4`, 'loser');
          const routeUpperLosersAcross = stageFormats.gslLowerSemiLoserRouting !== 'same';
          add('l2_1', 'Lower semi-final 1', 3, `gsl_${gLetter}_l1_1`, 'winner', `gsl_${gLetter}_${routeUpperLosersAcross ? 'u2_2' : 'u2_1'}`, 'loser');
          add('l2_2', 'Lower semi-final 2', 3, `gsl_${gLetter}_l1_2`, 'winner', `gsl_${gLetter}_${routeUpperLosersAcross ? 'u2_1' : 'u2_2'}`, 'loser');
          add('ls', 'Lower final · 3rd place', 4, `gsl_${gLetter}_l2_1`, 'winner', `gsl_${gLetter}_l2_2`, 'winner');
        } else if (isTop3Gsl) {
          // IEM / ESL-style four-team group: winners' final sets 1st/2nd place;
          // the two opening-round losers play for the third playoff slot.
          const m1: TournamentMatch = { id: `${tourId}_gsl_${gLetter}_m1`, stage: 'groups', poolKey: `gsl_${gLetter}_opening1`, roundNumber: 1, groupLetter: gLetter, name: `${gName} · Opening round · Match 1`, teamAId: groupTeams[0]?.id, teamBId: groupTeams[3]?.id || groupTeams[groupTeams.length - 1]?.id, scoreA: 0, scoreB: 0, format: 'BO3', status: 'ready' };
          const m2: TournamentMatch = { id: `${tourId}_gsl_${gLetter}_m2`, stage: 'groups', poolKey: `gsl_${gLetter}_opening2`, roundNumber: 1, groupLetter: gLetter, name: `${gName} · Opening round · Match 2`, teamAId: groupTeams[1]?.id, teamBId: groupTeams[2]?.id, scoreA: 0, scoreB: 0, format: 'BO3', status: 'ready' };
          const upperFinal: TournamentMatch = { id: `${tourId}_gsl_${gLetter}_uf`, stage: 'groups', poolKey: `gsl_${gLetter}_uf`, roundNumber: 2, groupLetter: gLetter, name: `${gName} · Upper final · 1st / 2nd place`, sourceA: `gsl_${gLetter}_opening1`, sourceAResult: 'winner', sourceB: `gsl_${gLetter}_opening2`, sourceBResult: 'winner', scoreA: 0, scoreB: 0, format: 'BO3', status: 'scheduled' };
          const lowerFinal: TournamentMatch = { id: `${tourId}_gsl_${gLetter}_ls`, stage: 'groups', poolKey: `gsl_${gLetter}_ls`, roundNumber: 2, groupLetter: gLetter, name: `${gName} · Lower final · 3rd place`, sourceA: `gsl_${gLetter}_opening1`, sourceAResult: 'loser', sourceB: `gsl_${gLetter}_opening2`, sourceBResult: 'loser', scoreA: 0, scoreB: 0, format: 'BO3', status: 'scheduled' };
          gMatches.push(m1, m2, upperFinal, lowerFinal);
        } else {
          // Classic four-team GSL: two wins to qualify, two losses to be eliminated.
          const m1: TournamentMatch = { id: `${tourId}_gsl_${gLetter}_m1`, stage: 'groups', poolKey: `gsl_${gLetter}_opening1`, roundNumber: 1, groupLetter: gLetter, name: `${gName} · Открывающий матч 1`, teamAId: groupTeams[0]?.id, teamBId: groupTeams[3]?.id || groupTeams[groupTeams.length - 1]?.id, scoreA: 0, scoreB: 0, format: fmt, status: 'ready' };
          const m2: TournamentMatch = { id: `${tourId}_gsl_${gLetter}_m2`, stage: 'groups', poolKey: `gsl_${gLetter}_opening2`, roundNumber: 1, groupLetter: gLetter, name: `${gName} · Открывающий матч 2`, teamAId: groupTeams[1]?.id, teamBId: groupTeams[2]?.id, scoreA: 0, scoreB: 0, format: fmt, status: 'ready' };
          const winners: TournamentMatch = { id: `${tourId}_gsl_${gLetter}_winners`, stage: 'groups', poolKey: `gsl_${gLetter}_winners`, roundNumber: 2, groupLetter: gLetter, name: `${gName} · Winners' Match / Upper Final`, scoreA: 0, scoreB: 0, format: fmt, status: 'scheduled' };
          const elim: TournamentMatch = { id: `${tourId}_gsl_${gLetter}_elim`, stage: 'groups', poolKey: `gsl_${gLetter}_elim`, roundNumber: 2, groupLetter: gLetter, name: `${gName} · Elimination Match`, scoreA: 0, scoreB: 0, format: fmt, status: 'scheduled' };
          const decider: TournamentMatch = { id: `${tourId}_gsl_${gLetter}_decider`, stage: 'groups', poolKey: `gsl_${gLetter}_decider`, roundNumber: 3, groupLetter: gLetter, name: `${gName} · Decider Match · за 2-е место`, scoreA: 0, scoreB: 0, format: fmt, status: 'scheduled' };
          gMatches.push(m1, m2, winners, elim, decider);
        }
      } else {
        // Standard Round Robin inside group
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            gMatches.push({
              id: `${tourId}_grp_${gLetter}_${i}_${j}`,
              stage: 'groups',
              poolKey: `grp_${gLetter}`,
              roundNumber: 1,
              groupLetter: gLetter,
              name: `${gName} · ${groupTeams[i].name} vs ${groupTeams[j].name}`,
              teamAId: groupTeams[i].id,
              teamBId: groupTeams[j].id,
              scoreA: 0,
              scoreB: 0,
              format: stageFormats.groupFormat || 'BO1',
              status: 'ready'
            });
          }
        }
      }

      groups.push({
        id: `group_${gLetter}`,
        name: gName,
        letter: gLetter,
        teamIds: groupTeams.map((t) => t.id),
        matches: gMatches,
        groupStyle: isGsl ? configuredGroupStyle : 'round_robin'
      });
      allGroupMatches.push(...gMatches);
    }

    // Playoff bracket based on number of groups:
    // Two 8-team GSL groups send six teams: 2B vs 3A (winner meets 1A), 2A vs 3B (winner meets 1B).
    // Four smaller groups retain the eight-team playoff bracket.
    const sfFmt = stageFormats.semifinalFormat || 'BO3';
    const finalFmt = stageFormats.finalFormat || 'BO5';
    const qfFmt = stageFormats.quarterfinalFormat || 'BO3';

    let playoffMatches: TournamentMatch[] = [];

    if (groupCount === 2 && teamCount >= 16 && (configuredGroupStyle === 'gsl_double_elim_8' || configuredGroupStyle === 'gsl')) {
      // Eight-team GSL groups: 2B vs 3A leads to 1A; 2A vs 3B leads to 1B.
      playoffMatches = [
        { id: 'playoff_qf1', stage: 'playoffs', poolKey: 'qf1', roundNumber: 1, name: 'Четвертьфинал 1 (2-е место B vs 3-е место A)', scoreA: 0, scoreB: 0, format: qfFmt, status: 'scheduled' },
        { id: 'playoff_qf2', stage: 'playoffs', poolKey: 'qf2', roundNumber: 1, name: 'Четвертьфинал 2 (2-е место A vs 3-е место B)', scoreA: 0, scoreB: 0, format: qfFmt, status: 'scheduled' },
        { id: 'playoff_sf1', stage: 'playoffs', poolKey: 'sf1', roundNumber: 2, name: 'Полуфинал 1 (1-е место A vs победитель QF1)', scoreA: 0, scoreB: 0, format: sfFmt, status: 'scheduled', directSeedA: true },
        { id: 'playoff_sf2', stage: 'playoffs', poolKey: 'sf2', roundNumber: 2, name: 'Полуфинал 2 (1-е место B vs победитель QF2)', scoreA: 0, scoreB: 0, format: sfFmt, status: 'scheduled', directSeedA: true },
        { id: 'playoff_final', stage: 'playoffs', poolKey: 'final', roundNumber: 3, name: 'Гранд-финал', scoreA: 0, scoreB: 0, format: finalFmt, status: 'scheduled' }
      ];
      if (includeGroupThirdPlace) {
        playoffMatches.push({
          id: 'playoff_3rd', stage: 'playoffs', poolKey: 'third_place', roundNumber: 3,
          name: 'Матч за 3-е место (Бронзовый финал)', scoreA: 0, scoreB: 0,
          format: sfFmt, status: 'scheduled'
        });
      }
    } else if (groupCount === 2 && (teamCount >= 16 || isTop3Gsl)) {
      // Preserve the existing cross-seeding for Top 3 and other six-team formats.
      playoffMatches = [
        { id: 'playoff_qf1', stage: 'playoffs', poolKey: 'qf1', roundNumber: 1, name: 'Четвертьфинал 1 (2-е место A vs 3-е место B)', scoreA: 0, scoreB: 0, format: qfFmt, status: 'scheduled' },
        { id: 'playoff_qf2', stage: 'playoffs', poolKey: 'qf2', roundNumber: 1, name: 'Четвертьфинал 2 (2-е место B vs 3-е место A)', scoreA: 0, scoreB: 0, format: qfFmt, status: 'scheduled' },
        { id: 'playoff_sf1', stage: 'playoffs', poolKey: 'sf1', roundNumber: 2, name: 'Полуфинал 1 (1-е место B vs победитель QF1)', scoreA: 0, scoreB: 0, format: sfFmt, status: 'scheduled', directSeedA: true },
        { id: 'playoff_sf2', stage: 'playoffs', poolKey: 'sf2', roundNumber: 2, name: 'Полуфинал 2 (1-е место A vs победитель QF2)', scoreA: 0, scoreB: 0, format: sfFmt, status: 'scheduled', directSeedA: true },
        { id: 'playoff_final', stage: 'playoffs', poolKey: 'final', roundNumber: 3, name: 'Гранд-финал', scoreA: 0, scoreB: 0, format: finalFmt, status: 'scheduled' }
      ];
      if (includeGroupThirdPlace) {
        playoffMatches.push({
          id: 'playoff_3rd', stage: 'playoffs', poolKey: 'third_place', roundNumber: 3,
          name: 'Матч за 3-е место (Бронзовый финал)', scoreA: 0, scoreB: 0,
          format: sfFmt, status: 'scheduled'
        });
      }
    } else if (groupCount === 2) {
      // 4-team playoff bracket
      playoffMatches = [
        {
          id: 'playoff_sf1',
          stage: 'playoffs',
          poolKey: 'sf1',
          roundNumber: 1,
          name: 'Полуфинал 1 (1-е место Группы A vs 2-е место Группы B)',
          scoreA: 0,
          scoreB: 0,
          format: sfFmt,
          status: 'scheduled'
        },
        {
          id: 'playoff_sf2',
          stage: 'playoffs',
          poolKey: 'sf2',
          roundNumber: 1,
          name: 'Полуфинал 2 (1-е место Группы B vs 2-е место Группы A)',
          scoreA: 0,
          scoreB: 0,
          format: sfFmt,
          status: 'scheduled'
        },
        {
          id: 'playoff_final',
          stage: 'playoffs',
          poolKey: 'final',
          roundNumber: 2,
          name: 'Гранд-финал (Матч за чемпионство)',
          scoreA: 0,
          scoreB: 0,
          format: finalFmt,
          status: 'scheduled'
        }
      ];

      if (includeThirdPlace) {
        playoffMatches.push({
          id: 'playoff_3rd',
          stage: 'playoffs',
          poolKey: 'third_place',
          roundNumber: 2,
          name: 'Матч за 3-е место (Бронзовый финал)',
          scoreA: 0,
          scoreB: 0,
          format: sfFmt,
          status: 'scheduled'
        });
      }
    } else if (groupCount === 4 && isTop3Gsl) {
      // Twelve qualifiers: the four group winners skip the play-in and enter the QFs.
      const r12Pairs = [
        ['r12_1', '2-е место A vs 3-е место B'],
        ['r12_2', '2-е место B vs 3-е место A'],
        ['r12_3', '2-е место C vs 3-е место D'],
        ['r12_4', '2-е место D vs 3-е место C']
      ] as const;
      playoffMatches = [
        ...r12Pairs.map(([key, label]) => ({ id: `${tourId}_${key}`, stage: 'playoffs' as const, poolKey: key, roundNumber: 1, name: `Раунд за выход в четвертьфинал · ${label}`, scoreA: 0, scoreB: 0, format: qfFmt, status: 'scheduled' as const })),
        ...([
          ['qf1', '1-е место C vs победитель R12-1', 'r12_1'],
          ['qf2', '1-е место D vs победитель R12-2', 'r12_2'],
          ['qf3', '1-е место A vs победитель R12-3', 'r12_3'],
          ['qf4', '1-е место B vs победитель R12-4', 'r12_4']
        ] as const).map(([key, label, source]) => ({ id: `${tourId}_playoff_${key}`, stage: 'playoffs' as const, poolKey: key, roundNumber: 2, name: `Четвертьфинал · ${label}`, scoreA: 0, scoreB: 0, format: qfFmt, status: 'scheduled' as const, sourceB: source, sourceBResult: 'winner' as const })),
        { id: `${tourId}_playoff_sf1`, stage: 'playoffs', poolKey: 'sf1', roundNumber: 3, name: 'Полуфинал 1', scoreA: 0, scoreB: 0, format: sfFmt, status: 'scheduled' },
        { id: `${tourId}_playoff_sf2`, stage: 'playoffs', poolKey: 'sf2', roundNumber: 3, name: 'Полуфинал 2', scoreA: 0, scoreB: 0, format: sfFmt, status: 'scheduled' },
        { id: `${tourId}_playoff_final`, stage: 'playoffs', poolKey: 'final', roundNumber: 4, name: 'Гранд-финал', scoreA: 0, scoreB: 0, format: finalFmt, status: 'scheduled' }
      ];
      if (includeThirdPlace) playoffMatches.push({ id: `${tourId}_playoff_3rd`, stage: 'playoffs', poolKey: 'third_place', roundNumber: 4, name: 'Матч за 3-е место', scoreA: 0, scoreB: 0, format: sfFmt, status: 'scheduled' });
    } else {
      // 8-team playoff bracket
      playoffMatches = createEmptyPlayoffBracket(includeThirdPlace);
    }

    if (stageFormats.playoffType === 'double_elimination') {
      const qualifierCount = groups.reduce((sum, group) => sum + ((group.groupStyle === 'gsl_top3' || group.teamIds.length >= 8) ? 3 : 2), 0);
      playoffMatches = createDoubleEliminationBracket(tourId, seededTeams.slice(0, qualifierCount), stageFormats)
        .map((match) => ({ ...match, teamAId: undefined, teamBId: undefined, status: 'scheduled' as const }));
    }
    return {
      ...baseState,
      groupCount,
      groupStyle: isGsl ? configuredGroupStyle : 'round_robin',
      groups,
      groupMatches: allGroupMatches,
      playoffMatches
    };
  }

  // Fallback to standard Swiss Playoffs
  return createInitialSwissTournament(seededTeams, false, includeThirdPlace);
}

/**
 * Updates a Group stage match (GSL or Round Robin) and propagates winners/losers
 * through the GSL tree (Opening -> Winners/Elim -> Decider -> Playoffs).
 */
export function updateGroupMatchResult(
  tournament: TournamentState,
  matchId: string,
  scoreA: number,
  scoreB: number,
  actualFormat?: MatchFormat
): { updatedTournament: TournamentState; isGroupsCompleted: boolean } {
  const currentTour = JSON.parse(JSON.stringify(tournament)) as TournamentState;
  const allGroupMatches = currentTour.groupMatches || [];
  const targetMatch = allGroupMatches.find((m) => m.id === matchId);

  if (!targetMatch || !targetMatch.teamAId || !targetMatch.teamBId) {
    return { updatedTournament: currentTour, isGroupsCompleted: false };
  }

  if (actualFormat) targetMatch.format = actualFormat;
  targetMatch.scoreA = scoreA;
  targetMatch.scoreB = scoreB;
  targetMatch.status = 'finished';

  const requiredWins = targetMatch.format === 'BO1' ? 1 : targetMatch.format === 'BO3' ? 2 : 3;
  const aWon = scoreA >= requiredWins;
  targetMatch.winnerId = aWon ? targetMatch.teamAId : targetMatch.teamBId;
  targetMatch.loserId = aWon ? targetMatch.teamBId : targetMatch.teamAId;

  // GSL Group progression logic
  const gLetter = targetMatch.groupLetter || 'A';
  const group = currentTour.groups?.find((g) => g.letter === gLetter || g.name.includes(gLetter));

  if (group) {
    // Sync matches in group object
    group.matches = group.matches.map((m) => (m.id === matchId ? targetMatch : m));

    // Resolve all source-linked matches in the 8-team double-elimination bracket.
    const sourceResult = (key?: string, result?: 'winner' | 'loser') => {
      const source = group.matches.find((m) => m.poolKey === key);
      if (!source || source.status !== 'finished') return undefined;
      return result === 'loser' ? source.loserId : source.winnerId;
    };
    for (const downstream of group.matches) {
      if (!downstream.sourceA && !downstream.sourceB) continue;
      const a = sourceResult(downstream.sourceA, downstream.sourceAResult);
      const b = sourceResult(downstream.sourceB, downstream.sourceBResult);
      downstream.teamAId = a;
      downstream.teamBId = b;
      downstream.status = a && b ? (downstream.status === 'finished' ? 'finished' : 'ready') : 'scheduled';
    }

    if (group.groupStyle === 'round_robin' && group.matches.every((match) => match.status === 'finished')) {
      const ranked = group.teamIds.map((teamId) => ({ teamId,
        wins: group.matches.filter((match) => match.winnerId === teamId).length,
        diff: group.matches.reduce((sum, match) => sum + (match.teamAId === teamId ? match.scoreA - match.scoreB : match.teamBId === teamId ? match.scoreB - match.scoreA : 0), 0)
      })).sort((a, b) => b.wins - a.wins || b.diff - a.diff || (currentTour.teamSeeds?.[a.teamId] || 0) - (currentTour.teamSeeds?.[b.teamId] || 0));
      group.qualifiedTeamIds = ranked.slice(0, 2).map((row) => row.teamId);
      group.eliminatedTeamIds = ranked.slice(2).map((row) => row.teamId);
    }
    const m1 = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_opening1`);
    const m2 = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_opening2`);
    const winners = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_winners`);
    const elim = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_elim`);
    const decider = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_decider`);

    // 1. Once both opening matches are played, the two winners meet in Winners'
    //    match and the two losers meet in the Elimination match.
    if (m1?.status === 'finished' && m2?.status === 'finished') {
      if (winners && winners.status !== 'finished') {
        winners.teamAId = m1.winnerId;
        winners.teamBId = m2.winnerId;
        if (winners.teamAId && winners.teamBId) winners.status = 'ready';
      }
      if (elim && elim.status !== 'finished') {
        elim.teamAId = m1.loserId;
        elim.teamBId = m2.loserId;
        if (elim.teamAId && elim.teamBId) elim.status = 'ready';
      }
    }

    // 2. Winners' match winner qualifies as group seed #1; its loser waits
    //    in Decider for the winner of Elimination.
    if (winners?.status === 'finished' && decider && decider.status !== 'finished') {
      decider.teamAId = winners.loserId;
      if (decider.teamAId && decider.teamBId) decider.status = 'ready';
    }

    // 3. Elimination match loser is out; its winner advances to Decider.
    if (elim?.status === 'finished' && decider && decider.status !== 'finished') {
      decider.teamBId = elim.winnerId;
      if (decider.teamAId && decider.teamBId) decider.status = 'ready';
    }

    // Update group qualifiers. Eight-team groups send the upper-final winner,
    // upper-final loser, and lower-final winner (places 1-3) to the playoffs.
    const upperFinal = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_uf`);
    const lowerFinal = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_ls`);
    if (upperFinal || lowerFinal) {
      // The upper-final winner is 1st, its loser is 2nd, and the lower-final winner is 3rd.
      group.qualifiedTeamIds = [upperFinal?.winnerId, upperFinal?.loserId, lowerFinal?.winnerId].filter(Boolean) as string[];
      // Only losses in the lower bracket eliminate teams; the upper-final loser still qualifies for 2nd place.
      group.eliminatedTeamIds = group.matches
        .filter((m) => m.status === 'finished' && /^gsl_[A-Z]_l[12]_|^gsl_[A-Z]_ls$/.test(m.poolKey))
        .map((m) => m.loserId)
        .filter(Boolean) as string[];
    } else if (group.groupStyle !== 'round_robin') {
      const qualified: string[] = [];
      const eliminated: string[] = [];

      if (winners?.status === 'finished' && winners.winnerId) {
        qualified.push(winners.winnerId); // Group seed #1: directly to playoff semifinal.
      }
      if (decider?.status === 'finished' && decider.winnerId) {
        qualified.push(decider.winnerId); // Group seed #2: to the opposite playoff semifinal.
      }
      if (elim?.status === 'finished' && elim.loserId) {
        eliminated.push(elim.loserId);
      }
      if (decider?.status === 'finished' && decider.loserId) {
        eliminated.push(decider.loserId);
      }

      // Keep deterministic order and prevent accidental duplicate qualifiers.
      group.qualifiedTeamIds = [...new Set(qualified)];
      group.eliminatedTeamIds = [...new Set(eliminated)];
    }
  }

  // Update overall groupMatches array
  currentTour.groupMatches = allGroupMatches.map((m) => {
    const updatedInGroup = currentTour.groups
      ?.flatMap((g) => g.matches)
      .find((gm) => gm.id === m.id);
    return updatedInGroup || (m.id === matchId ? targetMatch : m);
  });

  // Check if ALL groups have determined their 2 qualified teams!
  const groupsList = currentTour.groups || [];
  const allGroupsFinished =
    groupsList.length > 0 &&
    groupsList.every((g) => g.qualifiedTeamIds && g.qualifiedTeamIds.length >= ((g.groupStyle === 'gsl_top3' || (g.groupStyle !== 'round_robin' && g.teamIds.length >= 8)) ? 3 : 2));

  if (allGroupsFinished) {
    if (currentTour.stageFormats?.playoffType === 'double_elimination') {
      const qualifiers = groupsList.flatMap((group) => group.qualifiedTeamIds || []);
      // Seed group winners above runners-up. Four classic groups use A1/B2, C1/D2, B1/A2, D1/C2.
      const ordered = groupsList.length === 4 && qualifiers.length === 8
        ? [groupsList[0].qualifiedTeamIds?.[0], groupsList[1].qualifiedTeamIds?.[0], groupsList[3].qualifiedTeamIds?.[0], groupsList[2].qualifiedTeamIds?.[0], groupsList[3].qualifiedTeamIds?.[1], groupsList[2].qualifiedTeamIds?.[1], groupsList[0].qualifiedTeamIds?.[1], groupsList[1].qualifiedTeamIds?.[1]]
        : groupsList.flatMap((group) => group.qualifiedTeamIds?.slice(0, 1) || []).concat(groupsList.flatMap((group) => group.qualifiedTeamIds?.slice(1) || []));
      const entrants = ordered.filter(Boolean).map((id) => ({ id } as Team));
      currentTour.playoffMatches = createDoubleEliminationBracket(currentTour.id, entrants, currentTour.stageFormats);
      currentTour.includeThirdPlace = false;
      currentTour.currentStage = 'playoffs';
      return { updatedTournament: currentTour, isGroupsCompleted: true };
    }
    // Populate playoff bracket with group qualifiers!
    const groupA = groupsList.find((g) => g.letter === 'A' || g.name.includes('A'));
    const groupB = groupsList.find((g) => g.letter === 'B' || g.name.includes('B'));
    const groupC = groupsList.find((g) => g.letter === 'C' || g.name.includes('C'));
    const groupD = groupsList.find((g) => g.letter === 'D' || g.name.includes('D'));

    const seed1A = groupA?.qualifiedTeamIds?.[0];
    const seed2A = groupA?.qualifiedTeamIds?.[1];
    const seed1B = groupB?.qualifiedTeamIds?.[0];
    const seed2B = groupB?.qualifiedTeamIds?.[1];

    if (groupsList.length === 2 && (groupA?.teamIds.length || 0) >= 8 && groupA?.groupStyle !== 'round_robin' && currentTour.playoffMatches) {
      // Dedicated 8-team GSL crossover: 2B vs 3A feeds into 1A; 2A vs 3B feeds into 1B.
      const seed3A = groupA?.qualifiedTeamIds?.[2];
      const seed3B = groupB?.qualifiedTeamIds?.[2];
      const qf1 = currentTour.playoffMatches.find((m) => m.poolKey === 'qf1');
      const qf2 = currentTour.playoffMatches.find((m) => m.poolKey === 'qf2');
      const sf1 = currentTour.playoffMatches.find((m) => m.poolKey === 'sf1');
      const sf2 = currentTour.playoffMatches.find((m) => m.poolKey === 'sf2');
      if (qf1) { qf1.teamAId = seed2B; qf1.teamBId = seed3A; qf1.status = qf1.teamAId && qf1.teamBId ? 'ready' : 'scheduled'; }
      if (qf2) { qf2.teamAId = seed2A; qf2.teamBId = seed3B; qf2.status = qf2.teamAId && qf2.teamBId ? 'ready' : 'scheduled'; }
      if (sf1) { sf1.teamAId = seed1A; sf1.status = sf1.teamAId && sf1.teamBId ? 'ready' : 'scheduled'; }
      if (sf2) { sf2.teamAId = seed1B; sf2.status = sf2.teamAId && sf2.teamBId ? 'ready' : 'scheduled'; }
    } else if (groupsList.length === 2 && currentTour.stageFormats?.groupStyle === 'gsl_top3' && currentTour.playoffMatches) {
      // Existing four-team Top 3 route remains unchanged.
      const seed3A = groupA?.qualifiedTeamIds?.[2];
      const seed3B = groupB?.qualifiedTeamIds?.[2];
      const qf1 = currentTour.playoffMatches.find((m) => m.poolKey === 'qf1');
      const qf2 = currentTour.playoffMatches.find((m) => m.poolKey === 'qf2');
      const sf1 = currentTour.playoffMatches.find((m) => m.poolKey === 'sf1');
      const sf2 = currentTour.playoffMatches.find((m) => m.poolKey === 'sf2');
      if (qf1) { qf1.teamAId = seed2A; qf1.teamBId = seed3B; qf1.status = qf1.teamAId && qf1.teamBId ? 'ready' : 'scheduled'; }
      if (qf2) { qf2.teamAId = seed2B; qf2.teamBId = seed3A; qf2.status = qf2.teamAId && qf2.teamBId ? 'ready' : 'scheduled'; }
      if (sf1) { sf1.teamAId = seed1B; sf1.status = sf1.teamAId && sf1.teamBId ? 'ready' : 'scheduled'; }
      if (sf2) { sf2.teamAId = seed1A; sf2.status = sf2.teamAId && sf2.teamBId ? 'ready' : 'scheduled'; }
    } else if (groupsList.length === 2 && currentTour.playoffMatches) {
      // 2 Groups -> 4 teams into Semifinals
      const sf1 = currentTour.playoffMatches.find((m) => m.poolKey === 'sf1');
      const sf2 = currentTour.playoffMatches.find((m) => m.poolKey === 'sf2');

      if (sf1) {
        sf1.teamAId = seed1A;
        sf1.teamBId = seed2B;
        sf1.status = 'ready';
      }
      if (sf2) {
        sf2.teamAId = seed1B;
        sf2.teamBId = seed2A;
        sf2.status = 'ready';
      }
    } else if (groupsList.length === 4 && currentTour.stageFormats?.groupStyle === 'gsl_top3' && currentTour.playoffMatches) {
      // Four groups of four produce twelve qualifiers. Group winners receive QF byes;
      // second/third place teams play a cross-group play-in before the quarterfinals.
      const seed1C = groupC?.qualifiedTeamIds?.[0];
      const seed2C = groupC?.qualifiedTeamIds?.[1];
      const seed3C = groupC?.qualifiedTeamIds?.[2];
      const seed1D = groupD?.qualifiedTeamIds?.[0];
      const seed2D = groupD?.qualifiedTeamIds?.[1];
      const seed3D = groupD?.qualifiedTeamIds?.[2];
      const playInSeeds: Array<[string, string | undefined, string | undefined]> = [
        ['r12_1', seed2A, groupB?.qualifiedTeamIds?.[2]],
        ['r12_2', seed2B, groupA?.qualifiedTeamIds?.[2]],
        ['r12_3', seed2C, seed3D],
        ['r12_4', seed2D, seed3C]
      ];
      for (const [key, a, b] of playInSeeds) {
        const match = currentTour.playoffMatches.find((m) => m.poolKey === key);
        if (match) { match.teamAId = a; match.teamBId = b; match.status = a && b ? 'ready' : 'scheduled'; }
      }
      const qfSeeds: Array<[string, string | undefined]> = [
        ['qf1', seed1C], ['qf2', seed1D], ['qf3', seed1A], ['qf4', seed1B]
      ];
      for (const [key, topSeed] of qfSeeds) {
        const match = currentTour.playoffMatches.find((m) => m.poolKey === key);
        if (match) { match.teamAId = topSeed; match.status = topSeed && match.teamBId ? 'ready' : 'scheduled'; }
      }
    } else if (groupsList.length === 4 && currentTour.playoffMatches) {
      // 4 Groups -> 8 teams into Quarterfinals
      const seed1C = groupC?.qualifiedTeamIds?.[0];
      const seed2C = groupC?.qualifiedTeamIds?.[1];
      const seed1D = groupD?.qualifiedTeamIds?.[0];
      const seed2D = groupD?.qualifiedTeamIds?.[1];

      const qf1 = currentTour.playoffMatches.find((m) => m.poolKey === 'qf1');
      const qf2 = currentTour.playoffMatches.find((m) => m.poolKey === 'qf2');
      const qf3 = currentTour.playoffMatches.find((m) => m.poolKey === 'qf3');
      const qf4 = currentTour.playoffMatches.find((m) => m.poolKey === 'qf4');

      if (qf1) {
        qf1.teamAId = seed1A;
        qf1.teamBId = seed2B;
        qf1.status = 'ready';
      }
      if (qf2) {
        qf2.teamAId = seed1C;
        qf2.teamBId = seed2D;
        qf2.status = 'ready';
      }
      if (qf3) {
        qf3.teamAId = seed1B;
        qf3.teamBId = seed2A;
        qf3.status = 'ready';
      }
      if (qf4) {
        qf4.teamAId = seed1D;
        qf4.teamBId = seed2C;
        qf4.status = 'ready';
      }
    }

    currentTour.currentStage = 'playoffs';
    return { updatedTournament: currentTour, isGroupsCompleted: true };
  }

  return { updatedTournament: currentTour, isGroupsCompleted: false };
}

