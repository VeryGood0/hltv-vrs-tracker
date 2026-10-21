import { MatchFormat, Team, OutcomeOdds, MatchPrediction, TeamFormStats, MatchPointsStakes } from '../types';

/**
 * Calculates dynamic form delta for a match result.
 * - Underdog losing to favorite: minimal penalty (-4 to -8)
 * - Equal teams: standard delta (+/- 14 to 20)
 * - Favorite losing to underdog: heavy penalty (-30 to -45)
 * - Underdog winning: massive boost (+32 to +48)
 * - Adds natural random jitter so it is never a static fixed number
 */
export function calculateMatchFormDeltas(
  teamAId: string,
  teamBId: string,
  winnerId: string,
  probA: number, // Team A win prob (0..1)
  scoreA: number,
  scoreB: number
): { deltaFormA: number; deltaFormB: number } {
  const probB = 1 - probA;
  const aWon = winnerId === teamAId;

  // Closeness factor based on scores (e.g. 2-0 blowout vs 2-1 nailbiter)
  const totalRounds = scoreA + scoreB;
  const isSweep = (scoreA > 0 && scoreB === 0) || (scoreB > 0 && scoreA === 0);
  const sweepMultiplier = isSweep ? 1.15 : 0.90;

  // Random noise between -2.5 and +2.5
  const jitterA = (Math.random() * 5) - 2.5;
  const jitterB = (Math.random() * 5) - 2.5;

  let deltaA: number;
  let deltaB: number;

  if (aWon) {
    // Team A won
    // If A was underdog (probA low), (1 - probA) is high -> huge boost!
    const baseGainA = 12 + 28 * Math.pow(1 - probA, 1.4);
    deltaA = Math.round(baseGainA * sweepMultiplier + jitterA);

    // Team B lost
    // If B was expected to win (probB high), big penalty; if B was underdog, small penalty!
    const baseLossB = 5 + 32 * Math.pow(probB, 1.3);
    deltaB = -Math.round(baseLossB * sweepMultiplier + jitterB);
  } else {
    // Team B won
    const baseGainB = 12 + 28 * Math.pow(1 - probB, 1.4);
    deltaB = Math.round(baseGainB * sweepMultiplier + jitterB);

    const baseLossA = 5 + 32 * Math.pow(probA, 1.3);
    deltaA = -Math.round(baseLossA * sweepMultiplier + jitterA);
  }

  // Ensure minimum magnitude of at least 3
  deltaA = deltaA >= 0 ? Math.max(4, deltaA) : Math.min(-4, deltaA);
  deltaB = deltaB >= 0 ? Math.max(4, deltaB) : Math.min(-4, deltaB);

  return { deltaFormA: deltaA, deltaFormB: deltaB };
}

/**
 * Calculates a team's current cumulative form based on past matches.
 * Uses recorded match deltas when available, or calculates contextual deltas.
 */
export function calculateTeamForm(
  teamId: string,
  history: MatchPrediction[]
): TeamFormStats & { formModifier: number } {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return {
      wins: 0,
      losses: 0,
      streak: 0,
      recentResults: [],
      recentDeltas: [],
      formModifier: 0
    };
  }

  const teamMatches = history.filter((rawM) => {
    const m = rawM as MatchPrediction & { teamA?: { id: string }; teamB?: { id: string } };
    const tA = m.teamAId || m.teamA?.id;
    const tB = m.teamBId || m.teamB?.id;
    return tA === teamId || tB === teamId;
  });

  if (teamMatches.length === 0) {
    return {
      wins: 0,
      losses: 0,
      streak: 0,
      recentResults: [],
      recentDeltas: [],
      formModifier: 0
    };
  }

  // Take up to last 8 matches
  const recentSlice = teamMatches.slice(0, 8);
  let wins = 0;
  let losses = 0;
  const recentResults: ('W' | 'L')[] = [];
  const recentDeltas: number[] = [];
  let totalModifier = 0;

  recentSlice.forEach((rawM, idx) => {
    const m = rawM as MatchPrediction & { teamA?: { id: string }; teamB?: { id: string } };
    const isTeamA = (m.teamAId || m.teamA?.id) === teamId;
    const winnerId = m.winnerTeamId || (m.scoreA > m.scoreB ? (m.teamAId || m.teamA?.id) : (m.teamBId || m.teamB?.id));
    const won = winnerId === teamId;

    if (won) {
      wins++;
      recentResults.push('W');
    } else {
      losses++;
      recentResults.push('L');
    }

    // Get specific delta from match record if available
    let delta = isTeamA ? m.deltaFormA : m.deltaFormB;
    if (typeof delta !== 'number') {
      // Fallback context delta
      delta = won ? 14 : -12;
    }
    recentDeltas.push(delta);

    // Exponential decay: most recent matches have higher weight
    const recencyWeight = Math.max(0.4, 1 - idx * 0.1);
    totalModifier += delta * recencyWeight;
  });

  // Calculate current streak
  let streak = 0;
  if (recentResults.length > 0) {
    const firstResult = recentResults[0];
    for (const res of recentResults) {
      if (res === firstResult) {
        streak += firstResult === 'W' ? 1 : -1;
      } else {
        break;
      }
    }
  }

  // Clamp overall form between -95 and +95
  const formModifier = Math.min(95, Math.max(-95, Math.round(totalModifier)));

  return {
    wins,
    losses,
    streak,
    recentResults: recentResults.slice(0, 5),
    recentDeltas: recentDeltas.slice(0, 5),
    formModifier
  };
}

/**
 * Calculates Head-to-Head (H2H) between two specific teams from past history
 */
export function calculateH2H(
  teamAId: string,
  teamBId: string,
  history: MatchPrediction[]
): { winsA: number; winsB: number; h2hModifierA: number } {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return { winsA: 0, winsB: 0, h2hModifierA: 0 };
  }

  const encounters = history.filter((rawM) => {
    const m = rawM as MatchPrediction & { teamA?: { id: string }; teamB?: { id: string } };
    const tA = m.teamAId || m.teamA?.id;
    const tB = m.teamBId || m.teamB?.id;
    return (tA === teamAId && tB === teamBId) || (tA === teamBId && tB === teamAId);
  });

  let winsA = 0;
  let winsB = 0;

  encounters.forEach((rawM) => {
    const m = rawM as MatchPrediction & { teamA?: { id: string }; teamB?: { id: string } };
    const tA = m.teamAId || m.teamA?.id;
    const tB = m.teamBId || m.teamB?.id;
    const winnerId = m.winnerTeamId || (m.scoreA > m.scoreB ? tA : tB);

    if (winnerId === teamAId) winsA++;
    else if (winnerId === teamBId) winsB++;
  });

  const diff = winsA - winsB;
  const h2hModifierA = Math.min(45, Math.max(-45, diff * 15));

  return { winsA, winsB, h2hModifierA };
}

/**
 * Calculates VRS Points Stakes for the match (as shown in Valve Regional Standings / HLTV):
 * IF TEAM WINS / IF TEAM LOSES
 */
export function calculatePointsStakes(
  teamA: Team,
  teamB: Team,
  allTeams: Team[]
): MatchPointsStakes {
  // Sort teams by points to determine ranking
  const getRank = (targetId: string, targetPoints: number) => {
    const sorted = [...allTeams]
      .map((t) => (t.id === targetId ? { ...t, points: targetPoints } : t))
      .sort((a, b) => b.points - a.points);
    return sorted.findIndex((t) => t.id === targetId) + 1;
  };

  const rankCurrentA = getRank(teamA.id, teamA.points);
  const rankCurrentB = getRank(teamB.id, teamB.points);

  const diff = teamA.points - teamB.points;
  const probA = 1 / (1 + Math.pow(10, -diff / 1600));
  const probB = 1 - probA;

  // Calibrated to match CS2 VRS stakes (e.g. Vitality 1933 vs Falcons 1899 -> +19 / -15 and +48 / -19)
  // Base scale: ~38
  let winA = Math.round(38 * (1 - probA));
  let winB = Math.round(38 * (1 - probB));

  // If underdogs win against top tier, significant bonus
  if (teamA.points < teamB.points) {
    const underdogBoost = Math.max(1, 1 + (teamB.points - teamA.points) / 300);
    winA = Math.round(winA * underdogBoost);
  }
  if (teamB.points < teamA.points) {
    const underdogBoost = Math.max(1, 1 + (teamA.points - teamB.points) / 300);
    winB = Math.round(winB * underdogBoost);
  }

  // Minimum bounds
  winA = Math.max(6, Math.min(85, winA));
  winB = Math.max(6, Math.min(85, winB));

  // Losses: typically ~70-90% of opponent's win or symmetric
  const lossA = Math.max(5, Math.min(winB, Math.round(winB * 0.75)));
  const lossB = Math.max(5, Math.min(winA, Math.round(winA * 0.75)));

  const rankWinA = getRank(teamA.id, teamA.points + winA);
  const rankLossA = getRank(teamA.id, teamA.points - lossA);
  const rankWinB = getRank(teamB.id, teamB.points + winB);
  const rankLossB = getRank(teamB.id, teamB.points - lossB);

  return {
    winA,
    lossA,
    winB,
    lossB,
    rankCurrentA,
    rankCurrentB,
    rankWinA,
    rankLossA,
    rankWinB,
    rankLossB
  };
}

/**
 * Calculates effective single point/map win probability using VRS points + Form + H2H.
 */
export function calculateEffectiveProbability(
  effectivePointsA: number,
  effectivePointsB: number
): number {
  const diff = effectivePointsA - effectivePointsB;
  const rawProb = 1 / (1 + Math.pow(10, -diff / 1600));
  return Math.min(0.85, Math.max(0.15, rawProb));
}

/**
 * Computes series win probability and detailed score odds (e.g. 2-0, 2-1)
 */
export function calculateSeriesOdds(
  p: number,
  format: MatchFormat
): { seriesProbA: number; seriesProbB: number; outcomeOdds: OutcomeOdds[] } {
  const q = 1 - p;

  if (format === 'BO1') {
    const seriesProbA = p;
    const seriesProbB = q;
    return {
      seriesProbA,
      seriesProbB,
      outcomeOdds: [
        { score: '1-0', probA: p, probB: 0, label: 'Победа' },
        { score: '0-1', probA: 0, probB: q, label: 'Победа' }
      ]
    };
  }

  if (format === 'BO3') {
    const p2_0 = Math.pow(p, 2);
    const p2_1 = 2 * Math.pow(p, 2) * q;
    let seriesProbA = p2_0 + p2_1;

    const p0_2 = Math.pow(q, 2);
    const p1_2 = 2 * Math.pow(q, 2) * p;
    let seriesProbB = p0_2 + p1_2;

    seriesProbA = Math.min(0.88, Math.max(0.12, seriesProbA));
    seriesProbB = 1 - seriesProbA;

    return {
      seriesProbA,
      seriesProbB,
      outcomeOdds: [
        { score: '2-0', probA: p2_0, probB: 0, label: 'Всухую 2-0' },
        { score: '2-1', probA: p2_1, probB: 0, label: 'Борьба 2-1' },
        { score: '1-2', probA: 0, probB: p1_2, label: 'Борьба 1-2' },
        { score: '0-2', probA: 0, probB: p0_2, label: 'Всухую 0-2' }
      ]
    };
  }

  // BO5
  const p3_0 = Math.pow(p, 3);
  const p3_1 = 3 * Math.pow(p, 3) * q;
  const p3_2 = 6 * Math.pow(p, 3) * Math.pow(q, 2);
  let seriesProbA = p3_0 + p3_1 + p3_2;

  const p0_3 = Math.pow(q, 3);
  const p1_3 = 3 * Math.pow(q, 3) * p;
  const p2_3 = 6 * Math.pow(q, 3) * Math.pow(p, 2);
  let seriesProbB = p0_3 + p1_3 + p2_3;

  seriesProbA = Math.min(0.90, Math.max(0.10, seriesProbA));
  seriesProbB = 1 - seriesProbA;

  return {
    seriesProbA,
    seriesProbB,
    outcomeOdds: [
      { score: '3-0', probA: p3_0, probB: 0, label: 'Всухую 3-0' },
      { score: '3-1', probA: p3_1, probB: 0, label: '3-1' },
      { score: '3-2', probA: p3_2, probB: 0, label: '3-2' },
      { score: '2-3', probA: 0, probB: p2_3, label: '2-3' },
      { score: '1-3', probA: 0, probB: p1_3, label: '1-3' },
      { score: '0-3', probA: 0, probB: p0_3, label: 'Всухую 0-3' }
    ]
  };
}

/**
 * Returns required points to win a series.
 */
export function getRequiredWins(format: MatchFormat): number {
  if (format === 'BO1') return 1;
  if (format === 'BO3') return 2;
  return 3;
}
