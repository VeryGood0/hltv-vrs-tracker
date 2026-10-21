// @ts-nocheck -- matches loose typing of the imported simulator code
import {
  MajorStageFormat,
  MajorStageNumber,
  SwissTeamRecord,
  Team,
  TournamentMatch,
  TournamentState
} from '../types';

export type MajorStageKey = 'stage1' | 'stage2' | 'stage3';

export const MAJOR_STAGE_KEYS: MajorStageKey[] = ['stage1', 'stage2', 'stage3'];

export const MAJOR_STAGE_LABELS: Record<MajorStageNumber, string> = {
  1: 'Stage 1',
  2: 'Stage 2',
  3: 'Stage 3'
};

/** Valve Major defaults: Bo1 openings, Bo3 for every advancement/elimination match. */
export const DEFAULT_MAJOR_STAGE_FORMATS: Record<MajorStageKey, MajorStageFormat> = {
  stage1: { normalFormat: 'BO1', deciderFormat: 'BO3' },
  stage2: { normalFormat: 'BO1', deciderFormat: 'BO3' },
  stage3: { normalFormat: 'BO1', deciderFormat: 'BO3' }
};

/** Default split by seed: seeds 1-8 -> Stage 3, 9-16 -> Stage 2, 17-32 -> Stage 1. */
export function defaultMajorStageForSeed(seedIndex: number): MajorStageNumber {
  if (seedIndex < 8) return 3;
  if (seedIndex < 16) return 2;
  return 1;
}

export const MAJOR_STAGE_CAPACITY: Record<MajorStageNumber, number> = { 1: 16, 2: 8, 3: 8 };

/**
 * Builds a fresh 16-team Swiss stage. `seededTeamIds` must be in seed order (index 0 = seed 1).
 * Round 1 follows the Valve Major rule: top half vs bottom half — 1v9, 2v10 … 8v16.
 */
export function buildMajorSwissStage(
  stage: MajorStageNumber,
  seededTeamIds: string[],
  format: MajorStageFormat,
  idPrefix: string
): { swissMatches: TournamentMatch[]; swissRecords: Record<string, SwissTeamRecord> } {
  const swissRecords: Record<string, SwissTeamRecord> = {};
  seededTeamIds.forEach((teamId, idx) => {
    swissRecords[teamId] = {
      teamId,
      wins: 0,
      losses: 0,
      opponentsPlayed: [],
      status: 'active',
      seedRank: idx + 1
    };
  });

  const half = Math.floor(seededTeamIds.length / 2);
  const swissMatches: TournamentMatch[] = [];
  for (let i = 0; i < half; i++) {
    swissMatches.push({
      id: `${idPrefix}_s${stage}_r1_m${i + 1}`,
      stage: 'swiss',
      poolKey: '0:0',
      roundNumber: 1,
      name: `${MAJOR_STAGE_LABELS[stage]} · Раунд 1 (0:0) · Матч ${i + 1}`,
      teamAId: seededTeamIds[i],
      teamBId: seededTeamIds[i + half],
      scoreA: 0,
      scoreB: 0,
      format: format.normalFormat,
      status: 'ready'
    });
  }
  return { swissMatches, swissRecords };
}

const QUALIFIED_ORDER: Record<string, number> = { '3:0': 0, '3:1': 1, '3:2': 2 };

/**
 * Seeds for the next stage: the 8 invited teams take seeds 1-8 (in their invite order),
 * the 8 qualifiers take seeds 9-16 ordered by previous-stage record (3:0 → 3:1 → 3:2),
 * ties broken by previous-stage seed.
 */
export function seedNextMajorStage(
  invitedTeamIds: string[],
  qualifiedRecords: SwissTeamRecord[]
): string[] {
  const qualifiers = [...qualifiedRecords]
    .sort((a, b) => {
      const ra = QUALIFIED_ORDER[a.qualifiedScore || '3:2'] ?? 3;
      const rb = QUALIFIED_ORDER[b.qualifiedScore || '3:2'] ?? 3;
      if (ra !== rb) return ra - rb;
      return (a.seedRank || 99) - (b.seedRank || 99);
    })
    .map((r) => r.teamId);
  return [...invitedTeamIds, ...qualifiers];
}

/** Applies a stage's formats to the shared Swiss generator settings. */
export function stageFormatsForMajorStage(tour: TournamentState, stage: MajorStageNumber) {
  const fmt = tour.majorStageFormats?.[`stage${stage}` as MajorStageKey] || DEFAULT_MAJOR_STAGE_FORMATS[`stage${stage}` as MajorStageKey];
  return {
    ...(tour.stageFormats || {}),
    swissNormalFormat: fmt.normalFormat,
    swissDeciderFormat: fmt.deciderFormat
  };
}

/**
 * Called when a Major Swiss stage is complete. Archives it and starts the next stage.
 * Returns null when the finished stage was Stage 3 (caller seeds the playoffs).
 */
export function startNextMajorStage(
  tour: TournamentState,
  finishedMatches: TournamentMatch[],
  finishedRecords: Record<string, SwissTeamRecord>
): TournamentState | null {
  const stage = (tour.majorStage || 1) as MajorStageNumber;
  if (stage >= 3) return null;
  const nextStage = (stage + 1) as MajorStageNumber;

  const archive = {
    stage,
    swissMatches: finishedMatches.map((m) => ({
      ...m,
      id: m.id.startsWith(`s${stage}__`) ? m.id : `s${stage}__${m.id}`,
      name: m.name.startsWith('Stage') ? m.name : `${MAJOR_STAGE_LABELS[stage]} · ${m.name}`
    })),
    swissRecords: finishedRecords
  };

  const qualified = Object.values(finishedRecords).filter((r) => r.status === 'qualified');
  const invited = tour.majorStageTeamIds?.[`stage${nextStage}` as MajorStageKey] || [];
  const seeded = seedNextMajorStage(invited, qualified);
  const nextFormat = tour.majorStageFormats?.[`stage${nextStage}` as MajorStageKey]
    || DEFAULT_MAJOR_STAGE_FORMATS[`stage${nextStage}` as MajorStageKey];
  const { swissMatches, swissRecords } = buildMajorSwissStage(nextStage, seeded, nextFormat, tour.id);

  const nextTour: TournamentState = {
    ...tour,
    majorStage: nextStage,
    majorHistory: [...(tour.majorHistory || []).filter((h) => h.stage !== stage), archive],
    currentStage: 'swiss',
    swissRound: 1,
    swissMatches,
    swissRecords
  };
  nextTour.stageFormats = stageFormatsForMajorStage(nextTour, nextStage);
  return nextTour;
}

/** Every Swiss match of the event, including archived Major stages. */
export function getAllSwissMatches(tour: Partial<TournamentState>): TournamentMatch[] {
  const archived = (tour.majorHistory || []).flatMap((h) => h.swissMatches || []);
  return [...archived, ...(tour.swissMatches || [])];
}

/** Teams playing in the given Major stage (current or archived). */
export function getMajorStageTeams(tour: TournamentState, teams: Team[]): Team[] {
  const ids = Object.keys(tour.swissRecords || {});
  return ids.map((id) => teams.find((t) => t.id === id)).filter(Boolean) as Team[];
}
