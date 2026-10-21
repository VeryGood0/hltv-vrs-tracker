export type MatchFormat = 'BO1' | 'BO3' | 'BO5';

export type ActiveDutyMap =
  | 'Ancient'
  | 'Anubis'
  | 'Cache'
  | 'Dust2'
  | 'Inferno'
  | 'Mirage'
  | 'Nuke';

export const ACTIVE_DUTY_MAPS: ActiveDutyMap[] = [
  'Ancient',
  'Anubis',
  'Cache',
  'Dust2',
  'Inferno',
  'Mirage',
  'Nuke'
];

export interface MapRecentMatch {
  opponentId: string;
  opponentName: string;
  result: 'W' | 'L';
  score: string; // e.g. "13:9", "16:14"
  date: string; // e.g. "12 дней назад"
  oppRating: number; // e.g. 88
  tournamentId?: string;
  tournamentName?: string;
  stageName?: string;
  matchId?: string;
}

export interface TeamMapStats {
  mapName: ActiveDutyMap;
  mapRating: number; // 0..100 (current dynamic)
  baseMapRating: number; // 0..100 (HLTV baseline)
  winRate: number; // 0..100%
  mapsPlayed: number;
  wins: number;
  losses: number;
  pickRate: number; // 0..100%
  banRate: number; // 0..100%
  isFavoritePick?: boolean;
  isPermanentBan?: boolean;
  currentForm: number; // 0..100
  formChange30d: number; // e.g. +4, -3
  formChange90d: number; // e.g. +7, -5
  recentResults: MapRecentMatch[];
  opponentsStrength: number; // avg rating 0..100
}

export interface TeamMapProfile {
  overallRating: number; // 0..100
  currentForm: number; // 0..100
  bestMaps: ActiveDutyMap[];
  worstMaps: ActiveDutyMap[];
  maps: Record<ActiveDutyMap, TeamMapStats>;
}

export interface MapMatchupComparison {
  mapName: ActiveDutyMap;
  ratingA: number;
  ratingB: number;
  winRateA: number;
  winRateB: number;
  formA: number;
  formB: number;
  diff: number; // positive = advantage A, negative = advantage B
  favorite: 'teamA' | 'teamB' | 'even';
  winProbA: number; // 0..1
  winProbB: number; // 0..1
  oppStrengthA: number;
  oppStrengthB: number;
}

export type TournamentTier = 'Major' | 'S-Tier' | 'A-Tier' | 'B-Tier' | 'Community' | 'Championship';

export interface TrophyMatchSummary {
  id: string;
  stageName: string; // e.g. "Швейцарская система — Раунд 1 (0:0)", "1/4 финала (Четвертьфинал)", "Гранд-Финал"
  roundNumber?: number;
  poolKey?: string;
  opponentId: string;
  opponentName: string;
  opponentLogo?: string;
  opponentPoints?: number;
  result: 'W' | 'L';
  scoreSeries: string; // "2 : 1", "13 : 9", etc.
  scoreA: number;
  scoreB: number;
  format: MatchFormat;
  deltaPoints?: number;
  mapsPlayed?: MatchSeriesMapResult[];
}

export interface Trophy {
  id: string;
  tournamentId?: string;
  name: string;
  date?: string;
  year?: number;
  tier?: TournamentTier;
  vrsPointsAwarded?: number;
  runnerUpTeamName?: string;
  runnerUpTeamId?: string;
  teamCount?: number;
  mode?: TournamentMode;
  matchesPlayed?: TrophyMatchSummary[];
}

export interface Team {
  id: string;
  name: string;
  shortName?: string; // Short acronym / tag, e.g. "NiP", "NAVI", "FaZe", "FAL", "BB"
  points: number;
  defaultPoints: number;
  logoUrl: string; // e.g. /logos/spirit.webp
  primaryColor: string;
  secondaryColor: string;
  country: string;
  region: string;
  rosterSnippet: string[];
  coach?: string;
  customLogo?: string; // base64 or custom URL if user uploads in browser
  mapProfile?: TeamMapProfile;
  trophiesCount?: number;
  trophies?: Trophy[];
  /** Cumulative prize money earned from completed tournaments, in USD. */
  prizeMoneyEarned?: number;
}

export interface MatchPrediction {
  id: string;
  timestamp: number;
  format: MatchFormat;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  winnerTeamId: string;
  isUpset?: boolean;
  deltaPointsA?: number; // actual VRS change if points update is on
  deltaPointsB?: number;
  deltaFormA?: number; // actual form change from this match
  deltaFormB?: number;
  mapsPlayed?: MatchSeriesMapResult[];
  tournamentId?: string;
  tournamentName?: string;
  tournamentStage?: string;
}

export interface OutcomeOdds {
  score: string;
  probA: number;
  probB: number;
  label: string;
}

export interface TeamFormStats {
  wins: number;
  losses: number;
  streak: number; // positive for winstreak, negative for losestreak
  recentResults: ('W' | 'L')[]; // last 5
  recentDeltas: number[]; // actual variable deltas like +24, -6, +14, etc.
}

export interface MatchPointsStakes {
  winA: number;
  lossA: number;
  winB: number;
  lossB: number;
  rankCurrentA: number;
  rankCurrentB: number;
  rankWinA: number;
  rankLossA: number;
  rankWinB: number;
  rankLossB: number;
}

// TOURNAMENT SYSTEM TYPES
export type TournamentMode =
  | 'swiss_playoffs'
  | 'playoffs_only'
  | 'single_elimination'
  | 'double_elimination'
  | 'swiss_system'
  | 'round_robin'
  | 'groups_playoffs'
  | 'gsl_groups'
  | 'major'
  | 'blast_bounty';

export interface TournamentMatch {
  id: string;
  stage: 'swiss' | 'playoffs' | 'groups' | 'round_robin' | 'upper_bracket' | 'lower_bracket' | 'grand_final';
  poolKey: string; // '0:0', '1:0', '0:1', '2:0', '1:1', '0:2', '2:1', '1:2', '2:2', 'qf1', 'qf2', 'qf3', 'qf4', 'sf1', 'sf2', 'final', 'third_place', etc.
  roundNumber: number; // 1-5 for swiss, 1-5 for playoffs/brackets/groups
  name: string;
  groupLetter?: string; // e.g. 'A', 'B', 'C', 'D'
  teamAId?: string;
  teamBId?: string;
  scoreA: number;
  scoreB: number;
  format: MatchFormat;
  status: 'scheduled' | 'ready' | 'finished';
  winnerId?: string;
  loserId?: string;
  deltaPointsA?: number;
  deltaPointsB?: number;
  deltaFormA?: number;
  deltaFormB?: number;
  mapsPlayed?: MatchSeriesMapResult[];
  vetoState?: VetoState;
  sourceA?: string;
  sourceAResult?: 'winner' | 'loser';
  sourceB?: string;
  sourceBResult?: 'winner' | 'loser';
  directSeedA?: boolean;
  directSeedB?: boolean;
}

export interface SwissTeamRecord {
  teamId: string;
  wins: number;
  losses: number;
  opponentsPlayed: string[];
  status: 'active' | 'qualified' | 'eliminated';
  qualifiedScore?: '3:0' | '3:1' | '3:2';
  eliminatedScore?: '0:3' | '1:3' | '2:3';
  seedRank?: number;
}

export interface TournamentFinalStanding {
  place: number;
  placeLabel: string; // e.g. "1-е место (Чемпион)", "2-е место (Финалист)"
  teamId: string;
  badgeColor?: string;
  details?: string;
  vrsAwarded?: number;
}

export interface TournamentGroup {
  id: string;
  name: string; // e.g. "Группа A"
  letter?: string; // 'A', 'B', 'C', 'D'
  teamIds: string[];
  matches: TournamentMatch[];
  qualifiedTeamIds?: string[]; // ordered group qualifiers advancing to playoffs
  eliminatedTeamIds?: string[];
  /** Bracket rules used by this group, needed to render and qualify teams correctly. */
  groupStyle?: 'gsl' | 'gsl_classic_4' | 'gsl_double_elim_8' | 'gsl_top3' | 'round_robin';
}

export interface RoundRobinTableRow {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  mapDiff: number;
  points: number;
}

export interface StageFormatSettings {
  playoffType?: 'single_elimination' | 'double_elimination';
  groupStageFormat?: MatchFormat;
  groupFormat?: MatchFormat;
  groupCount?: number; // number of groups
  groupStyle?: 'gsl' | 'gsl_classic_4' | 'gsl_double_elim_8' | 'gsl_top3' | 'round_robin';
  /** In 8-team GSL groups, cross routes Upper SF losers into opposite Lower SFs when set. */
  gslLowerSemiLoserRouting?: 'same' | 'swapped';
  swissNormalFormat?: MatchFormat;
  swissDeciderFormat?: MatchFormat;
  quarterfinalFormat?: MatchFormat;
  semifinalFormat?: MatchFormat;
  finalFormat?: MatchFormat;
  /** Per-stage CS Major Swiss match formats. Normal matches include opening and non-qualification rounds. */
  majorStage1NormalFormat?: MatchFormat;
  majorStage1DeciderFormat?: MatchFormat;
  majorStage2NormalFormat?: MatchFormat;
  majorStage2DeciderFormat?: MatchFormat;
  majorStage3NormalFormat?: MatchFormat;
  majorStage3DeciderFormat?: MatchFormat;
}


export interface MajorSwissStageState {
  stageNumber: 1 | 2 | 3;
  name: string;
  /** Teams initially assigned directly to this stage at tournament creation. */
  directTeamIds: string[];
  /** All participants in this stage once it becomes active (direct seeds + qualifiers). */
  teamIds: string[];
  matches: TournamentMatch[];
  records: Record<string, SwissTeamRecord>;
  currentRound: number;
  status: 'waiting' | 'active' | 'completed';
  qualifiedTeamIds?: string[];
}

export interface TournamentState {
  id: string;
  name?: string; // e.g. "AgeraPVP Championship 2026"
  shortName?: string; // e.g. "AGERA 2026"
  organizer?: string; // e.g. "Agera", "PGL", "ESL"
  prizePool?: string; // e.g. "$1,250,000"
  startDate?: string;
  description?: string;
  mode: TournamentMode;
  tier?: TournamentTier;
  championVrsBonus?: number;
  teamCount?: number;
  groupCount?: number; // number of groups
  groupStyle?: 'gsl' | 'gsl_classic_4' | 'gsl_double_elim_8' | 'gsl_top3' | 'round_robin';
  groupAdvancementCount?: number; // default 2
  participatingTeamIds?: string[];
  teamSeeds?: Record<string, number>;
  stageFormats?: StageFormatSettings;
  includeThirdPlace: boolean;
  linkPlayoffsToSwiss?: boolean; // When true, playoff teams are linked to Swiss qualifiers. When false, user can pick freely.
  currentStage: 'swiss' | 'playoffs' | 'groups' | 'round_robin' | 'completed';
  swissRound: number; // 1 to 5
  swissMatches: TournamentMatch[];
  swissRecords: Record<string, SwissTeamRecord>;
  playoffMatches: TournamentMatch[];
  lowerBracketMatches?: TournamentMatch[];
  grandFinalMatch?: TournamentMatch;
  groupMatches?: TournamentMatch[];
  groups?: TournamentGroup[];
  roundRobinMatches?: TournamentMatch[];
  roundRobinTable?: RoundRobinTableRow[];
  standings?: TournamentFinalStanding[];
  /** Active stage number for the four-stage Major format: 1-3 Swiss stages, 4 playoffs. */
  majorStageNumber?: 1 | 2 | 3 | 4;
  /** Stage history + direct-entry assignments for the three sequential Major Swiss stages. */
  majorStages?: MajorSwissStageState[];
  /** BLAST Bounty-specific dynamic head values, bank balances, inherited seeds and draft state. */
  bountyHeads?: Record<string, number>;
  bountyBank?: Record<string, number>;
  bountySeeds?: Record<string, number>;
  bountyCurrentRound?: number;
  bountyWagers?: Record<string, { challengerId: string; amount: number }>;
  bountyProcessedMatchIds?: string[];
  /** Per-team cash payouts already booked for this tournament (prevents duplicate awards and enables rollback). */
  prizeMoneyPayouts?: Record<string, number>;
}

// MAP VETO & SERIES SIMULATION TYPES
export type VetoActionType = 'ban' | 'pick' | 'decider';

export interface VetoStep {
  stepIndex: number;
  teamId: string;
  teamName: string;
  action: VetoActionType;
  mapName?: ActiveDutyMap;
  reason?: string;
  matchupDelta?: number;
}

export interface VetoBannedMap {
  mapName: ActiveDutyMap;
  teamId: string;
  reason: string;
}

export interface VetoPickedMap {
  mapName: ActiveDutyMap;
  teamId: string;
  mapOrder: number;
  reason: string;
}

export interface VetoState {
  format: MatchFormat;
  teamAId: string;
  teamBId: string;
  steps: VetoStep[];
  currentStepIndex: number;
  availableMaps: ActiveDutyMap[];
  bannedMaps: VetoBannedMap[];
  pickedMaps: VetoPickedMap[];
  deciderMap?: ActiveDutyMap;
  isCompleted: boolean;
  selectedMapsInOrder: {
    mapName: ActiveDutyMap;
    pickedBy?: string; // teamId or undefined if decider
    isDecider?: boolean;
    order: number;
  }[];
}

export interface MatchSeriesMapResult {
  mapName: ActiveDutyMap;
  mapOrder: number;
  pickedBy?: string;
  isDecider?: boolean;
  scoreA: number;
  scoreB: number;
  overtime: boolean;
  half1A: number;
  half1B: number;
  half2A: number;
  half2B: number;
  otScoreA?: number;
  otScoreB?: number;
  winProbA?: number;
  winProbB?: number;
  winnerTeamId: string;
  loserTeamId: string;
  narrative: string;
  tacticalReason?: string;
  teamARating?: number;
  teamBRating?: number;
}

export interface MatchSeriesResult {
  format: MatchFormat;
  teamAId: string;
  teamBId: string;
  seriesScoreA: number;
  seriesScoreB: number;
  winnerTeamId: string;
  loserTeamId: string;
  isCompleted: boolean;
  maps: MatchSeriesMapResult[];
  currentMapIndex: number;
}
