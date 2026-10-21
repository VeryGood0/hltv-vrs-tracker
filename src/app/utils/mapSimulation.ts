// @ts-nocheck -- imported legacy code written for a looser tsconfig
import { getRatingWeight, mapDataConfidence, ratingBlend } from './settings';
import {
  ActiveDutyMap,
  ACTIVE_DUTY_MAPS,
  MatchFormat,
  Team,
  TeamMapProfile,
  TeamMapStats,
  MapMatchupComparison,
  MatchSeriesMapResult
} from '../types';
import { getBaselineMapProfile } from '../data/mapPool';

/**
 * Gets the current map profile of a team, falling back to HLTV baseline if not present.
 */
export function getTeamProfile(team: Team): TeamMapProfile {
  if (team.mapProfile) return team.mapProfile;
  return getBaselineMapProfile(team.id);
}

/**
 * CORE SIMULATION ENGINE:
 * Calculates exact map win probability between two teams.
 *
 * Enforces the core rule:
 * ОБЩАЯ СИЛА ≠ СИЛА НА КАРТЕ
 *
 * If Team A has Dust2 90 vs Team B 65 -> Team A is heavy favorite.
 * If Team A has Mirage 72 vs Team B 88 -> Team B is favorite, even if Team A's overall rating is higher!
 * Underdog ALWAYS has a realistic upset chance (never 100% / 0%).
 */
export function calculateMapMatchup(
  teamA: Team,
  teamB: Team,
  mapName: ActiveDutyMap,
  options?: { pickedBy?: string; isDecider?: boolean; isLan?: boolean }
): MapMatchupComparison {
  const profA = getTeamProfile(teamA);
  const profB = getTeamProfile(teamB);

  const statsA = profA.maps[mapName] || getBaselineMapProfile(teamA.id).maps[mapName];
  const statsB = profB.maps[mapName] || getBaselineMapProfile(teamB.id).maps[mapName];

  // 1. Overall Team baseline factor (weight ~25%)
  const overallDiff = profA.overallRating - profB.overallRating;
  const overallFormDiff = profA.currentForm - profB.currentForm;
  const blend = ratingBlend(
    getRatingWeight(),
    mapDataConfidence(statsA.mapsPlayed || 0, statsB.mapsPlayed || 0)
  );
  const pointsDiff = ((teamA.points || 0) - (teamB.points || 0)) / 40;
  const overallComponent =
    (overallDiff * 0.20 + overallFormDiff * 0.08) * blend.overallScale + pointsDiff * blend.pointsScale;

  // 2. Map-Specific factor (weight ~55%) — PRIMARY DRIVER
  const mapRatingDiff = statsA.mapRating - statsB.mapRating;
  const mapFormDiff = statsA.currentForm - statsB.currentForm;
  const mapComponent = (mapRatingDiff * 0.42 + mapFormDiff * 0.15) * blend.mapScale;

  // 3. Win rate and opponent difficulty factor (weight ~15%)
  const effectiveWRA = statsA.mapsPlayed > 0 ? statsA.winRate * ((statsA.opponentsStrength || 80) / 80) : 50;
  const effectiveWRB = statsB.mapsPlayed > 0 ? statsB.winRate * ((statsB.opponentsStrength || 80) / 80) : 50;
  const wrDiff = (effectiveWRA - effectiveWRB) * 0.12;

  // 4. Pick / Decider factor:
  // Picked map gives +3.5% to +5% advantage
  let pickBonus = 0;
  if (options?.pickedBy === teamA.id) {
    pickBonus = 2.4;
  } else if (options?.pickedBy === teamB.id) {
    pickBonus = -2.4;
  }

  // 5. Combined spread with subtle controlled variance
  const totalSpread = mapComponent + overallComponent + wrDiff + pickBonus;

  // Sigmoid probability conversion
  const rawProbA = 1 / (1 + Math.exp(-totalSpread / 15.0));

  // Cap between 10% and 90% (CS2 upset chance never 0%)
  const winProbA = Math.min(0.90, Math.max(0.10, rawProbA));
  const winProbB = 1 - winProbA;

  const diff = statsA.mapRating - statsB.mapRating;
  const favorite = Math.abs(diff) < 2 ? 'even' : diff > 0 ? 'teamA' : 'teamB';

  return {
    mapName,
    ratingA: statsA.mapRating,
    ratingB: statsB.mapRating,
    winRateA: statsA.winRate,
    winRateB: statsB.winRate,
    formA: statsA.currentForm,
    formB: statsB.currentForm,
    diff,
    favorite,
    winProbA,
    winProbB,
    oppStrengthA: statsA.opponentsStrength,
    oppStrengthB: statsB.opponentsStrength
  };
}

/**
 * Compares all 7 Active Duty maps between two teams.
 */
export function compareAllMaps(teamA: Team, teamB: Team): MapMatchupComparison[] {
  return ACTIVE_DUTY_MAPS.map((mapName) => calculateMapMatchup(teamA, teamB, mapName));
}

export interface MapRoundScoreResult {
  mapName: ActiveDutyMap;
  scoreA: number;
  scoreB: number;
  overtime: boolean;
  half1A: number;
  half1B: number;
  half2A: number;
  half2B: number;
  otScoreA?: number;
  otScoreB?: number;
  winProbA: number;
  winProbB: number;
  pickedBy?: string;
  isDecider?: boolean;
  winnerTeamId: string;
  loserTeamId: string;
  narrative: string;
  tacticalReason: string;
}

/**
 * Simulates genuine MR12 CS2 scores with realistic round flows:
 * Blowouts (13:1 - 13:5), Solid Wins (13:6 - 13:8), Close Games (13:9 - 13:11), Overtime (16:12 - 16:14, 19:17)
 */
export function simulateCS2MapScore(
  teamA: Team,
  teamB: Team,
  mapName: ActiveDutyMap,
  options?: { pickedBy?: string; isDecider?: boolean }
): MapRoundScoreResult {
  const matchup = calculateMapMatchup(teamA, teamB, mapName, options);
  const probA = matchup.winProbA;
  const isDecider = !!options?.isDecider;
  const pickedBy = options?.pickedBy;

  // Round-level win chance attenuated for natural CS2 round swings
  // Decider maps slightly increase round-by-round parity
  const parityFactor = isDecider ? 0.50 : 0.56;

  let roundsA = 0;
  let roundsB = 0;
  let half1A = 0;
  let half1B = 0;
  let half2A = 0;
  let half2B = 0;

  // First Half (exactly 12 rounds in MR12)
  for (let r = 1; r <= 12; r++) {
    const roundChanceA = 0.5 + (probA - 0.5) * parityFactor + (Math.random() * 0.08 - 0.04);
    if (Math.random() < roundChanceA) {
      roundsA++;
      half1A++;
    } else {
      roundsB++;
      half1B++;
    }
  }

  // Second Half (until one team reaches 13 or 12:12 tie)
  while (roundsA < 13 && roundsB < 13) {
    if (roundsA === 12 && roundsB === 12) break; // Overtime reached!

    // Slight momentum adjustment
    const momentum = (roundsA - roundsB) * 0.012;
    const roundChanceA = Math.min(0.85, Math.max(0.15, 0.5 + (probA - 0.5) * parityFactor + momentum));

    if (Math.random() < roundChanceA) {
      roundsA++;
      half2A++;
    } else {
      roundsB++;
      half2B++;
    }
  }

  let overtime = false;
  let otScoreA = 0;
  let otScoreB = 0;
  let otCycleCount = 0;

  // Real CS2 Overtime (MR3 format: 3 rounds per side, 6 rounds max per OT set)
  // First team to win 4 rounds in an OT set wins the map (16:12, 16:13, 16:14).
  // If tied 3:3 (15:15), proceeds to OT2 (19:15, 19:16, 19:17).
  // If tied 18:18, proceeds to OT3 (22:18, 22:19, 22:20).
  // Scores like 18:19 or 15:16 are strictly prohibited by CS2 rules.
  if (roundsA === 12 && roundsB === 12) {
    overtime = true;

    while (true) {
      otCycleCount++;
      let cycleA = 0;
      let cycleB = 0;

      // Play up to 6 rounds in this MR3 cycle
      for (let r = 1; r <= 6; r++) {
        const otChanceA = 0.5 + (probA - 0.5) * 0.46;
        if (Math.random() < otChanceA) {
          cycleA++;
        } else {
          cycleB++;
        }

        // As soon as either team secures 4 rounds in this 6-round set, the set terminates
        if (cycleA === 4 || cycleB === 4) {
          break;
        }
      }

      otScoreA += cycleA;
      otScoreB += cycleB;

      // If one team won 4 rounds in this cycle, map is won!
      if (cycleA === 4 || cycleB === 4) {
        break;
      }

      // If 3:3 in this cycle (meaning 15:15 or 18:18), proceed to next OT cycle
      // Safeguard for rare edge cases: cap at 4 overtimes
      if (otCycleCount >= 4) {
        if (Math.random() < probA) {
          otScoreA += 4;
          otScoreB += 2;
        } else {
          otScoreB += 4;
          otScoreA += 2;
        }
        break;
      }
    }

    roundsA += otScoreA;
    roundsB += otScoreB;
  }

  const aWon = roundsA > roundsB;
  const winnerTeamId = aWon ? teamA.id : teamB.id;
  const loserTeamId = aWon ? teamB.id : teamA.id;
  const winnerName = aWon ? teamA.name : teamB.name;
  const loserName = aWon ? teamB.name : teamA.name;
  const winnerProb = aWon ? Math.round(probA * 100) : Math.round((1 - probA) * 100);
  const loserProb = 100 - winnerProb;

  // Construct tactical narrative and explanation in Russian
  const diff = Math.abs(roundsA - roundsB);
  let narrative = '';
  let tacticalReason = '';

  const isUpset = (aWon && probA < 0.42) || (!aWon && probA > 0.58);
  const isOwnPick = (aWon && pickedBy === teamA.id) || (!aWon && pickedBy === teamB.id);
  const isOpponentPick = (aWon && pickedBy === teamB.id) || (!aWon && pickedBy === teamA.id);

  if (overtime) {
    const otLabel = otCycleCount > 1 ? `${otCycleCount}OT` : 'OT';
    narrative = `Овертайм-триллер (${Math.max(roundsA, roundsB)}:${Math.min(roundsA, roundsB)} ${otLabel})! ${winnerName} дожимают соперника в клатчах.`;
    tacticalReason = isDecider
      ? `${winnerName} проявили стальные нервы на решающей карте ${mapName}, забрав победу в овертайме (${Math.max(roundsA, roundsB)}:${Math.min(roundsA, roundsB)}).`
      : `${winnerName} вырвали победу в ${otLabel} на ${mapName} благодаря ключевым клатчам в решающих раундах (${Math.max(roundsA, roundsB)}:${Math.min(roundsA, roundsB)}).`;
  } else if (diff >= 7) {
    narrative = `Тотальный разгром на ${mapName}: ${winnerName} уничтожает оппонента ${Math.max(roundsA, roundsB)}:${Math.min(roundsA, roundsB)}.`;
    tacticalReason = `${winnerName} полностью контролировали экономику и темп игры на ${mapName}, не оставив шансов ${loserName}.`;
  } else if (diff <= 2) {
    narrative = `Напряжённая дуэль ${Math.max(roundsA, roundsB)}:${Math.min(roundsA, roundsB)} на ${mapName} в пользу ${winnerName}.`;
    tacticalReason = isOpponentPick
      ? `${winnerName} сотворили важнейший брейк на пике соперника, выиграв валидольные финальные раунды.`
      : `${winnerName} удержали минимальное преимущество на ${mapName} в упорной концовке (13:${Math.min(roundsA, roundsB)}).`;
  } else {
    narrative = `Уверенная победа ${winnerName} со счётом ${Math.max(roundsA, roundsB)}:${Math.min(roundsA, roundsB)} на ${mapName}.`;
    tacticalReason = isOwnPick
      ? `${winnerName} дисциплинированно реализовали свой пик ${mapName} благодаря отточенным тактикам и форме.`
      : isUpset
      ? `Сенсационный результат: ${winnerName} (${winnerProb}%) обыгрывают фаворита ${loserName} (${loserProb}%) на ${mapName}.`
      : `${winnerName} подтвердили статус фаворита (${winnerProb}%) уверенным выступлением на ${mapName}.`;
  }

  return {
    mapName,
    scoreA: roundsA,
    scoreB: roundsB,
    overtime,
    half1A,
    half1B,
    half2A,
    half2B,
    otScoreA: overtime ? otScoreA : undefined,
    otScoreB: overtime ? otScoreB : undefined,
    winProbA: probA,
    winProbB: 1 - probA,
    pickedBy,
    isDecider,
    winnerTeamId,
    loserTeamId,
    narrative,
    tacticalReason
  };
}

/**
 * Dynamically adjusts a team's map stats after a match:
 * e.g. 55 -> 58 -> 61 on win streak, or gradual decline on loss.
 */
export function applyDynamicMapOutcome(
  currentProfile: TeamMapProfile,
  mapName: ActiveDutyMap,
  won: boolean,
  scoreWon: number,
  scoreLost: number,
  opponent: Team,
  metadata?: { matchId?: string | undefined; tournamentId?: string | undefined; tournamentName?: string | undefined; stageName?: string | undefined; date?: string | undefined }
): TeamMapProfile {
  const updatedMaps = { ...currentProfile.maps };
  const currentStat = updatedMaps[mapName];

  if (!currentStat) return currentProfile;

  const roundDiff = won ? scoreWon - scoreLost : scoreLost - scoreWon;
  const isConvincing = roundDiff >= 6;
  const isClose = roundDiff <= 2;

  // Progressive/Regressive Delta
  let ratingDelta = 0;
  let formDelta = 0;

  if (won) {
    ratingDelta = isConvincing ? 5 : isClose ? 2 : 3;
    formDelta = isConvincing ? 4 : 2;
  } else {
    ratingDelta = isConvincing ? -5 : isClose ? -2 : -3;
    formDelta = isConvincing ? -4 : -2;
  }

  // If this map hasn't been played yet, initialize rating from 50 baseline
  const baseRating = currentStat.mapsPlayed === 0 ? 50 : currentStat.mapRating;
  const newRating = Math.min(99, Math.max(20, baseRating + ratingDelta));
  const newForm = Math.min(99, Math.max(20, currentStat.currentForm + formDelta));
  const newWins = currentStat.wins + (won ? 1 : 0);
  const newLosses = currentStat.losses + (won ? 0 : 1);
  const newMapsPlayed = currentStat.mapsPlayed + 1;
  const newWinRate = Math.round((newWins / newMapsPlayed) * 100);

  const newResultItem = {
    opponentId: opponent.id,
    opponentName: opponent.shortName || opponent.name,
    result: (won ? 'W' : 'L') as 'W' | 'L',
    score: `${scoreWon}:${scoreLost}`, // Always TeamScore:OpponentScore
    date: metadata?.date || 'Только что',
    oppRating: opponent.mapProfile?.overallRating || 75,
    tournamentId: metadata?.tournamentId,
    tournamentName: metadata?.tournamentName,
    stageName: metadata?.stageName,
    matchId: metadata?.matchId
  };

  const newRecent = [newResultItem, ...currentStat.recentResults.slice(0, 4)];

  updatedMaps[mapName] = {
    ...currentStat,
    mapRating: newRating,
    currentForm: newForm,
    wins: newWins,
    losses: newLosses,
    mapsPlayed: newMapsPlayed,
    winRate: newWinRate,
    formChange30d: currentStat.formChange30d + ratingDelta,
    recentResults: newRecent
  };

  // Re-sort best and worst maps strictly from played maps!
  const playedMaps = Object.values(updatedMaps).filter((m) => m.mapsPlayed > 0);
  let bestMaps: ActiveDutyMap[] = [];
  let worstMaps: ActiveDutyMap[] = [];
  if (playedMaps.length > 0) {
    const sorted = [...playedMaps].sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.mapRating - a.mapRating;
    });
    bestMaps = sorted.filter((m) => m.winRate >= 50).slice(0, 3).map((m) => m.mapName);
    worstMaps = sorted.filter((m) => m.winRate < 50).slice(-2).map((m) => m.mapName);
  }

  // Overall form update
  const newOverallForm = Math.min(
    99,
    Math.max(30, currentProfile.currentForm + (won ? 2 : -2))
  );

  return {
    ...currentProfile,
    currentForm: newOverallForm,
    bestMaps,
    worstMaps,
    maps: updatedMaps
  };
}

export interface SeriesSimulationResult {
  format: MatchFormat;
  seriesScoreA: number;
  seriesScoreB: number;
  winnerTeamId: string;
  loserTeamId: string;
  mapsPlayed: MatchSeriesMapResult[];
  unplayedMaps: {
    mapName: ActiveDutyMap;
    pickedBy?: string;
    isDecider?: boolean;
  }[];
}

/**
 * Simulates an entire CS2 series (BO1/BO3/BO5) using the predetermined maps from Veto.
 * Follows official rules: series terminates immediately when a team reaches required map wins.
 */
export function simulateSeriesOnVeto(
  format: MatchFormat,
  teamA: Team,
  teamB: Team,
  vetoSelectedMaps: { mapName: ActiveDutyMap; pickedBy?: string; isDecider?: boolean }[]
): SeriesSimulationResult {
  const reqWins = format === 'BO1' ? 1 : format === 'BO3' ? 2 : 3;
  let scoreA = 0;
  let scoreB = 0;

  const mapsPlayed: MatchSeriesMapResult[] = [];
  const unplayedMaps: SeriesSimulationResult['unplayedMaps'] = [];

  for (let i = 0; i < vetoSelectedMaps.length; i++) {
    const item = vetoSelectedMaps[i];

    if (scoreA >= reqWins || scoreB >= reqWins) {
      unplayedMaps.push({
        mapName: item.mapName,
        pickedBy: item.pickedBy,
        isDecider: item.isDecider
      });
      continue;
    }

    const mapResult = simulateCS2MapScore(teamA, teamB, item.mapName, {
      pickedBy: item.pickedBy,
      isDecider: item.isDecider
    });
    if (mapResult.winnerTeamId === teamA.id) {
      scoreA++;
    } else {
      scoreB++;
    }

    mapsPlayed.push({
      mapName: item.mapName,
      mapOrder: mapsPlayed.length + 1,
      pickedBy: item.pickedBy,
      isDecider: item.isDecider,
      scoreA: mapResult.scoreA,
      scoreB: mapResult.scoreB,
      overtime: mapResult.overtime,
      half1A: mapResult.half1A,
      half1B: mapResult.half1B,
      half2A: mapResult.half2A,
      half2B: mapResult.half2B,
      otScoreA: mapResult.otScoreA,
      otScoreB: mapResult.otScoreB,
      winProbA: mapResult.winProbA,
      winProbB: mapResult.winProbB,
      winnerTeamId: mapResult.winnerTeamId,
      loserTeamId: mapResult.loserTeamId,
      narrative: mapResult.narrative,
      tacticalReason: mapResult.tacticalReason
    });
  }

  const aWon = scoreA > scoreB;

  return {
    format,
    seriesScoreA: scoreA,
    seriesScoreB: scoreB,
    winnerTeamId: aWon ? teamA.id : teamB.id,
    loserTeamId: aWon ? teamB.id : teamA.id,
    mapsPlayed,
    unplayedMaps
  };
}
