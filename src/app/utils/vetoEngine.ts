// @ts-nocheck -- imported legacy code written for a looser tsconfig
import {
  ActiveDutyMap,
  ACTIVE_DUTY_MAPS,
  MatchFormat,
  Team,
  TeamMapProfile,
  VetoActionType,
  VetoBannedMap,
  VetoPickedMap,
  VetoState,
  VetoStep
} from '../types';
import { getBaselineMapProfile } from '../data/mapPool';
import { getTeamProfile } from './mapSimulation';

export interface VetoCandidateEvaluation {
  mapName: ActiveDutyMap;
  score: number;
  actingRating: number;
  oppRating: number;
  actingWR: number;
  oppWR: number;
  actingBanRate: number;
  actingPickRate: number;
  delta: number; // positive = acting team advantage, negative = opp advantage
  explanation: string;
}

/**
 * Calculates priority score for banning a map.
 * Higher score = higher priority to ban.
 *
 * Rules:
 * - Prioritize dangerous matchup gap (Opponent strong, Acting team weak)
 * - Prioritize team's historical perma-ban if they don't play it
 * - Consider opponent's winrate & form
 */
export function evaluateBanPriority(
  actingTeam: Team,
  opposingTeam: Team,
  mapName: ActiveDutyMap
): VetoCandidateEvaluation {
  const profAct = getTeamProfile(actingTeam);
  const profOpp = getTeamProfile(opposingTeam);

  const statAct = profAct.maps[mapName] || getBaselineMapProfile(actingTeam.id).maps[mapName];
  const statOpp = profOpp.maps[mapName] || getBaselineMapProfile(opposingTeam.id).maps[mapName];

  // Disadvantage delta: how much better is the opponent than us on this map?
  const disadvantageDelta = statOpp.mapRating - statAct.mapRating;
  const matchupDelta = statAct.mapRating - statOpp.mapRating; // positive = we are better

  // Score calculation:
  // 1. Disadvantage gap is primary factor (weight ~1.8)
  // 2. Opponent rating high danger (weight ~0.9)
  // 3. Own weakness (weight ~0.6)
  // 4. Team's historical ban rate / perma-ban tendency (weight ~0.5)
  // 5. Opponent win rate (weight ~0.3)
  const score =
    disadvantageDelta * 1.8 +
    statOpp.mapRating * 0.9 +
    (100 - statAct.mapRating) * 0.6 +
    statAct.banRate * 0.5 +
    (statOpp.winRate - statAct.winRate) * 0.3 +
    (statOpp.currentForm - statAct.currentForm) * 0.2;

  let explanation = '';
  if (statAct.banRate >= 60 && statAct.mapRating < 55) {
    explanation = `Пермабан ${actingTeam.name} (${statAct.banRate}% банрейт, рейтинг карты ${statAct.mapRating}/100)`;
  } else if (disadvantageDelta >= 15) {
    explanation = `Опасное превосходство ${opposingTeam.name} (+${disadvantageDelta} пунктов силы, рейтинг соперника ${statOpp.mapRating})`;
  } else if (statOpp.winRate >= 70) {
    explanation = `Нейтрализация сильной карты соперника (винрейт ${opposingTeam.name} ${statOpp.winRate}%)`;
  } else if (statAct.mapRating <= 50) {
    explanation = `Слабая карта ${actingTeam.name} (рейтинг ${statAct.mapRating}, ${statAct.losses} поражений)`;
  } else {
    explanation = `Тактический бан против пула ${opposingTeam.name} (разница ${disadvantageDelta > 0 ? '+' : ''}${disadvantageDelta})`;
  }

  return {
    mapName,
    score,
    actingRating: statAct.mapRating,
    oppRating: statOpp.mapRating,
    actingWR: statAct.winRate,
    oppWR: statOpp.winRate,
    actingBanRate: statAct.banRate,
    actingPickRate: statAct.pickRate,
    delta: matchupDelta,
    explanation
  };
}

/**
 * Calculates priority score for picking a map.
 * Higher score = higher priority to pick.
 *
 * Rules:
 * - Matchup gap is primary driver: (+30 gap is better than a 90-rated map where opponent is 91)
 * - Own high rating & winrate
 * - Historical pick rate & confidence
 */
export function evaluatePickPriority(
  actingTeam: Team,
  opposingTeam: Team,
  mapName: ActiveDutyMap
): VetoCandidateEvaluation {
  const profAct = getTeamProfile(actingTeam);
  const profOpp = getTeamProfile(opposingTeam);

  const statAct = profAct.maps[mapName] || getBaselineMapProfile(actingTeam.id).maps[mapName];
  const statOpp = profOpp.maps[mapName] || getBaselineMapProfile(opposingTeam.id).maps[mapName];

  // Advantage delta: how much better are we than the opponent?
  const advantageDelta = statAct.mapRating - statOpp.mapRating;

  // Score calculation:
  // 1. Advantage delta is dominant (weight ~2.0)
  // 2. Own map rating (weight ~1.1)
  // 3. Historical pick rate (weight ~0.5)
  // 4. Win rate (weight ~0.4)
  // 5. Current form (weight ~0.3)
  const score =
    advantageDelta * 2.0 +
    statAct.mapRating * 1.1 +
    statAct.pickRate * 0.5 +
    statAct.winRate * 0.4 +
    statAct.currentForm * 0.3;

  let explanation = '';
  if (advantageDelta >= 20) {
    explanation = `Доминирующий перевес (+${advantageDelta} пунктов над ${opposingTeam.name}, рейтинг ${statAct.mapRating} vs ${statOpp.mapRating})`;
  } else if (statAct.pickRate >= 45) {
    explanation = `Коронная карта ${actingTeam.name} (пикрейт ${statAct.pickRate}%, винрейт ${statAct.winRate}%)`;
  } else if (statAct.mapRating >= 85) {
    explanation = `Высочайший уровень игры на ${mapName} (${statAct.mapRating}/100, винрейт ${statAct.winRate}%)`;
  } else if (statOpp.mapRating <= 55) {
    explanation = `Удар по уязвимости ${opposingTeam.name} (соперник играет карту на ${statOpp.mapRating}/100)`;
  } else {
    explanation = `Выгодный выбор карты с преимуществом (+${advantageDelta > 0 ? advantageDelta : 0} пунктов)`;
  }

  return {
    mapName,
    score,
    actingRating: statAct.mapRating,
    oppRating: statOpp.mapRating,
    actingWR: statAct.winRate,
    oppWR: statOpp.winRate,
    actingBanRate: statAct.banRate,
    actingPickRate: statAct.pickRate,
    delta: advantageDelta,
    explanation
  };
}

/**
 * Returns all available candidate evaluations sorted from best to worst.
 */
export function getSortedVetoCandidates(
  action: 'ban' | 'pick',
  actingTeam: Team,
  opposingTeam: Team,
  availableMaps: ActiveDutyMap[]
): VetoCandidateEvaluation[] {
  const evals = availableMaps.map((map) =>
    action === 'ban'
      ? evaluateBanPriority(actingTeam, opposingTeam, map)
      : evaluatePickPriority(actingTeam, opposingTeam, map)
  );

  return evals.sort((a, b) => b.score - a.score);
}

/**
 * Creates step templates for official CS2 Veto formats:
 * BO1, BO3, BO5.
 */
export function createVetoStepTemplates(
  format: MatchFormat,
  teamA: Team,
  teamB: Team
): { teamId: string; teamName: string; action: VetoActionType }[] {
  if (format === 'BO1') {
    // 6 bans alternating: A, B, A, B, A, B -> remaining 7th map is Decider
    return [
      { teamId: teamA.id, teamName: teamA.name, action: 'ban' },
      { teamId: teamB.id, teamName: teamB.name, action: 'ban' },
      { teamId: teamA.id, teamName: teamA.name, action: 'ban' },
      { teamId: teamB.id, teamName: teamB.name, action: 'ban' },
      { teamId: teamA.id, teamName: teamA.name, action: 'ban' },
      { teamId: teamB.id, teamName: teamB.name, action: 'ban' }
    ];
  }

  if (format === 'BO3') {
    // Standard CS2 BO3 Veto:
    // A ban, B ban, A pick (Map 1), B pick (Map 2), A ban, B ban -> remaining is Decider (Map 3)
    return [
      { teamId: teamA.id, teamName: teamA.name, action: 'ban' },
      { teamId: teamB.id, teamName: teamB.name, action: 'ban' },
      { teamId: teamA.id, teamName: teamA.name, action: 'pick' },
      { teamId: teamB.id, teamName: teamB.name, action: 'pick' },
      { teamId: teamA.id, teamName: teamA.name, action: 'ban' },
      { teamId: teamB.id, teamName: teamB.name, action: 'ban' }
    ];
  }

  // BO5
  // Standard CS2 BO5 Veto:
  // A ban, B ban, A pick (Map 1), B pick (Map 2), A pick (Map 3), B pick (Map 4) -> Decider (Map 5)
  return [
    { teamId: teamA.id, teamName: teamA.name, action: 'ban' },
    { teamId: teamB.id, teamName: teamB.name, action: 'ban' },
    { teamId: teamA.id, teamName: teamA.name, action: 'pick' },
    { teamId: teamB.id, teamName: teamB.name, action: 'pick' },
    { teamId: teamA.id, teamName: teamA.name, action: 'pick' },
    { teamId: teamB.id, teamName: teamB.name, action: 'pick' }
  ];
}

/**
 * Initializes a clean Veto State for a given match.
 */
export function initializeVetoState(
  format: MatchFormat,
  teamA: Team,
  teamB: Team
): VetoState {
  const stepTemplates = createVetoStepTemplates(format, teamA, teamB);
  const steps: VetoStep[] = stepTemplates.map((t, idx) => ({
    stepIndex: idx,
    teamId: t.teamId,
    teamName: t.teamName,
    action: t.action
  }));

  return {
    format,
    teamAId: teamA.id,
    teamBId: teamB.id,
    steps,
    currentStepIndex: 0,
    availableMaps: [...ACTIVE_DUTY_MAPS],
    bannedMaps: [],
    pickedMaps: [],
    isCompleted: false,
    selectedMapsInOrder: []
  };
}

/**
 * Executes a single veto step for a selected map.
 */
export function applyVetoSelection(
  currentState: VetoState,
  selectedMap: ActiveDutyMap,
  teamA: Team,
  teamB: Team,
  customReason?: string
): VetoState {
  if (currentState.isCompleted) return currentState;

  const currentStep = currentState.steps[currentState.currentStepIndex];
  if (!currentStep) return currentState;

  if (!currentState.availableMaps.includes(selectedMap)) {
    return currentState;
  }

  const actingTeam = currentStep.teamId === teamA.id ? teamA : teamB;
  const oppTeam = currentStep.teamId === teamA.id ? teamB : teamA;

  let reason = customReason;
  let matchupDelta = 0;

  if (!reason) {
    if (currentStep.action === 'ban') {
      const evalRes = evaluateBanPriority(actingTeam, oppTeam, selectedMap);
      reason = evalRes.explanation;
      matchupDelta = evalRes.delta;
    } else {
      const evalRes = evaluatePickPriority(actingTeam, oppTeam, selectedMap);
      reason = evalRes.explanation;
      matchupDelta = evalRes.delta;
    }
  }

  const updatedSteps = currentState.steps.map((st, idx) => {
    if (idx === currentState.currentStepIndex) {
      return {
        ...st,
        mapName: selectedMap,
        reason,
        matchupDelta
      };
    }
    return st;
  });

  const nextAvailableMaps = currentState.availableMaps.filter((m) => m !== selectedMap);
  const nextBannedMaps: VetoBannedMap[] = [...currentState.bannedMaps];
  const nextPickedMaps: VetoPickedMap[] = [...currentState.pickedMaps];

  if (currentStep.action === 'ban') {
    nextBannedMaps.push({
      mapName: selectedMap,
      teamId: currentStep.teamId,
      reason: reason || 'Бан карты'
    });
  } else if (currentStep.action === 'pick') {
    nextPickedMaps.push({
      mapName: selectedMap,
      teamId: currentStep.teamId,
      mapOrder: nextPickedMaps.length + 1,
      reason: reason || 'Пик карты'
    });
  }

  const nextStepIndex = currentState.currentStepIndex + 1;
  const hasMoreSteps = nextStepIndex < currentState.steps.length;

  if (hasMoreSteps) {
    return {
      ...currentState,
      steps: updatedSteps,
      currentStepIndex: nextStepIndex,
      availableMaps: nextAvailableMaps,
      bannedMaps: nextBannedMaps,
      pickedMaps: nextPickedMaps
    };
  }

  // VETO COMPLETED! The single remaining map in availableMaps is the DECIDER
  const deciderMap = nextAvailableMaps[0];
  let deciderReason = '';
  if (deciderMap) {
    const profA = getTeamProfile(teamA);
    const profB = getTeamProfile(teamB);
    const sA = profA.maps[deciderMap] || getBaselineMapProfile(teamA.id).maps[deciderMap];
    const sB = profB.maps[deciderMap] || getBaselineMapProfile(teamB.id).maps[deciderMap];
    deciderReason = `Оставшаяся решающая карта матча (${sA.mapRating} против ${sB.mapRating})`;
  }

  // Construct selected maps in order of play
  const selectedMapsInOrder: {
    mapName: ActiveDutyMap;
    pickedBy?: string;
    isDecider?: boolean;
    order: number;
  }[] = [];

  if (currentState.format === 'BO1') {
    if (deciderMap) {
      selectedMapsInOrder.push({
        mapName: deciderMap,
        isDecider: true,
        order: 1
      });
    }
  } else {
    // For BO3 and BO5, first the picks in chronological order, then decider
    nextPickedMaps.forEach((p, idx) => {
      selectedMapsInOrder.push({
        mapName: p.mapName,
        pickedBy: p.teamId,
        order: idx + 1
      });
    });

    if (deciderMap) {
      selectedMapsInOrder.push({
        mapName: deciderMap,
        isDecider: true,
        order: selectedMapsInOrder.length + 1
      });
    }
  }

  return {
    ...currentState,
    steps: updatedSteps,
    currentStepIndex: nextStepIndex,
    availableMaps: [],
    bannedMaps: nextBannedMaps,
    pickedMaps: nextPickedMaps,
    deciderMap,
    isCompleted: true,
    selectedMapsInOrder
  };
}

/**
 * Runs a single step using the Smart AI algorithm.
 */
export function executeAutoStep(
  currentState: VetoState,
  teamA: Team,
  teamB: Team
): VetoState {
  if (currentState.isCompleted) return currentState;

  const currentStep = currentState.steps[currentState.currentStepIndex];
  if (!currentStep) return currentState;

  const actingTeam = currentStep.teamId === teamA.id ? teamA : teamB;
  const oppTeam = currentStep.teamId === teamA.id ? teamB : teamA;

  const candidates = getSortedVetoCandidates(
    currentStep.action as 'ban' | 'pick',
    actingTeam,
    oppTeam,
    currentState.availableMaps
  );

  if (candidates.length === 0) return currentState;

  // When there is enough map history, follow the evaluated tactical scores
  // closely. With little/no data, those scores are often identical (50 rating,
  // 0 matches) and a stable sort always chose the first map in ACTIVE_DUTY_MAPS.
  // Add confidence-scaled noise so low-information matches produce varied but
  // still stat-informed bans/picks rather than the same veto every time.
  const profileA = getTeamProfile(actingTeam);
  const profileB = getTeamProfile(oppTeam);
  const averageMapsA = candidates.reduce((sum, candidate) => sum + (profileA.maps[candidate.mapName]?.mapsPlayed || 0), 0) / candidates.length;
  const averageMapsB = candidates.reduce((sum, candidate) => sum + (profileB.maps[candidate.mapName]?.mapsPlayed || 0), 0) / candidates.length;
  const confidence = Math.min(1, Math.min(averageMapsA, averageMapsB) / 12);
  const noiseAmplitude = 1.5 + (1 - confidence) * 22;
  const bestChoice = [...candidates]
    .map((candidate) => ({
      candidate,
      adjustedScore: candidate.score + (Math.random() * 2 - 1) * noiseAmplitude
    }))
    .sort((a, b) => b.adjustedScore - a.adjustedScore)[0].candidate;

  return applyVetoSelection(
    currentState,
    bestChoice.mapName,
    teamA,
    teamB,
    bestChoice.explanation
  );
}

/**
 * Runs the entire VETO automatically using the Smart AI algorithm from scratch or from current state.
 */
export function executeCompleteAutoVeto(
  format: MatchFormat,
  teamA: Team,
  teamB: Team,
  currentState?: VetoState
): VetoState {
  let state =
    currentState && !currentState.isCompleted
      ? currentState
      : initializeVetoState(format, teamA, teamB);

  while (!state.isCompleted && state.currentStepIndex < state.steps.length) {
    state = executeAutoStep(state, teamA, teamB);
  }

  return state;
}

export const initializeVeto = initializeVetoState;
export const applyVetoChoice = applyVetoSelection;
export const executeSmartVetoStep = executeAutoStep;

