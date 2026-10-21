// @ts-nocheck -- loose typing of imported simulator code
import {
  Team,
  TournamentMatch,
  TournamentState,
  BountyTeamState,
  MatchFormat
} from '../types';

/**
 * BLAST Bounty format logic:
 * - 32 teams, single elimination, BO3 (final BO5).
 * - Dynamic bounties: top-16 seeds start with money on their head, seeds 17-32 start at $0.
 * - 50/50 split: winner banks 50% of the loser's bounty, the other 50% rolls onto the winner's own head.
 * - Seed inheritance: a lower seed that beats a higher seed inherits its seed number.
 * - Draft show: before each round, lower seeds pick their opponents from the higher-seed pool.
 * - Final 8 wagers: teams can stake bank money (up to the opponent's bank) on their own win.
 */

export const BOUNTY_TEAM_COUNT = 32;

/** Starting bounty for seeds 1-16. Seeds 17-32 start at $0. */
export function getStartingBounty(seed: number): number {
  if (seed <= 4) return 60000;
  if (seed <= 8) return 40000;
  if (seed <= 12) return 25000;
  if (seed <= 16) return 15000;
  return 0;
}

export function createInitialBountyState(teams: Team[]): Record<string, BountyTeamState> {
  const state: Record<string, BountyTeamState> = {};
  teams.forEach((team, idx) => {
    const seed = idx + 1;
    state[team.id] = {
      teamId: team.id,
      currentSeed: seed,
      bounty: getStartingBounty(seed),
      bank: 0,
      eliminated: false
    };
  });
  return state;
}

const ROUND_NAMES: Record<number, string> = {
  1: '1/16 финала',
  2: '1/8 финала',
  3: 'Четвертьфинал',
  4: 'Полуфинал',
  5: 'Гранд-финал'
};

export function getBountyRoundName(round: number): string {
  return ROUND_NAMES[round] || `Раунд ${round}`;
}

/** LAN final (wagers allowed) starts at the quarterfinals (round 3, 8 teams left). */
export function isLanFinalRound(round: number): boolean {
  return round >= 3;
}

function makeEmptyMatch(tourId: string, round: number, index: number): TournamentMatch {
  const keys: Record<number, string> = { 1: 'r32', 2: 'r16', 3: 'qf', 4: 'sf', 5: 'final' };
  const key = keys[round] || `r${round}`;
  return {
    id: `${tourId}_${key}_${index}`,
    stage: 'playoffs',
    poolKey: `${key}_${index}`,
    roundNumber: round,
    name: `${getBountyRoundName(round)} #${index}`,
    scoreA: 0,
    scoreB: 0,
    format: round === 5 ? 'BO5' : 'BO3',
    status: 'scheduled'
  };
}

/**
 * Creates empty match slots for a bounty round. Pairings are filled by the draft.
 */
export function createBountyRoundMatches(tourId: string, round: number): TournamentMatch[] {
  const matchCount = 32 / Math.pow(2, round); // r1=16, r2=8, r3=4, r4=2, r5=1
  return Array.from({ length: matchCount }, (_, i) => makeEmptyMatch(tourId, round, i + 1));
}

export interface DraftPick {
  pickerTeamId: string;
  opponentTeamId: string;
}

/**
 * Splits the alive teams of a round into high seeds (pickable pool) and low seeds (pickers).
 * Low seeds pick in ascending strength order (worst seed picks first).
 */
export function getDraftPools(
  bountyState: Record<string, BountyTeamState>
): { pickers: BountyTeamState[]; pool: BountyTeamState[] } {
  const alive = Object.values(bountyState)
    .filter((s) => !s.eliminated)
    .sort((a, b) => a.currentSeed - b.currentSeed);
  const half = alive.length / 2;
  return {
    pool: alive.slice(0, half), // high seeds — can be picked
    pickers: alive.slice(half).sort((a, b) => b.currentSeed - a.currentSeed) // worst picks first
  };
}

/**
 * Applies draft picks to the current round's empty matches.
 * Returns updated matches; throws nothing — invalid picks are ignored.
 */
export function applyDraftPicks(
  matches: TournamentMatch[],
  picks: DraftPick[]
): TournamentMatch[] {
  const updated = matches.map((m) => ({ ...m }));
  picks.forEach((pick, i) => {
    const match = updated[i];
    if (!match) return;
    match.teamAId = pick.opponentTeamId; // high seed shown first
    match.teamBId = pick.pickerTeamId;
    match.status = 'ready';
  });
  return updated;
}

/**
 * Auto-draft: each picker (worst first) picks the highest-bounty available opponent
 * with some randomization, so risky "bounty hunting" happens organically.
 */
export function generateAutoDraftPicks(
  bountyState: Record<string, BountyTeamState>
): DraftPick[] {
  const { pickers, pool } = getDraftPools(bountyState);
  const remaining = [...pool];
  const picks: DraftPick[] = [];
  for (const picker of pickers) {
    if (remaining.length === 0) break;
    // 60%: hunt the biggest bounty; 40%: pick the weakest (highest seed number) opponent.
    const hunt = Math.random() < 0.6;
    const sorted = [...remaining].sort((a, b) =>
      hunt ? b.bounty - a.bounty : b.currentSeed - a.currentSeed
    );
    const chosen = sorted[0];
    if (!chosen) break;
    remaining.splice(remaining.indexOf(chosen), 1);
    picks.push({ pickerTeamId: picker.teamId, opponentTeamId: chosen.teamId });
  }
  return picks;
}

/**
 * Applies the 50/50 bounty split and seed inheritance after a finished match.
 * Also settles wagers: the winner takes both wagers.
 */
export function applyBountyResult(
  bountyState: Record<string, BountyTeamState>,
  match: TournamentMatch
): Record<string, BountyTeamState> {
  if (!match.winnerId || !match.loserId) return bountyState;
  const state: Record<string, BountyTeamState> = JSON.parse(JSON.stringify(bountyState));
  const winner = state[match.winnerId];
  const loser = state[match.loserId];
  if (!winner || !loser) return bountyState;

  // 50/50 split: half of the loser's bounty is banked, half rolls onto the winner's head.
  const half = Math.floor(loser.bounty / 2);
  winner.bank += half;
  winner.bounty += loser.bounty - half;
  loser.bounty = 0;
  loser.eliminated = true;

  // Seed inheritance: the winner takes the better (lower) seed number.
  const bestSeed = Math.min(winner.currentSeed, loser.currentSeed);
  winner.currentSeed = bestSeed;
  loser.currentSeed = 999;

  // Wager settlement: winner takes the total stake.
  const wagerA = match.wagerA || 0;
  const wagerB = match.wagerB || 0;
  if (wagerA > 0 || wagerB > 0) {
    const aIsWinner = match.winnerId === match.teamAId;
    const winnerWager = aIsWinner ? wagerA : wagerB;
    const loserWager = aIsWinner ? wagerB : wagerA;
    winner.bank += loserWager; // winner keeps own stake and takes the loser's
    loser.bank = Math.max(0, loser.bank - loserWager);
    void winnerWager;
  }

  return state;
}

/**
 * Maximum wager a team may place: limited by its own bank and the opponent's bank.
 */
export function getMaxWager(
  bountyState: Record<string, BountyTeamState>,
  teamId: string,
  opponentId: string
): number {
  const own = bountyState[teamId]?.bank || 0;
  const opp = bountyState[opponentId]?.bank || 0;
  return Math.min(own, opp);
}

/**
 * Advances the tournament to the next round after all matches of the current
 * round are finished: marks the draft as pending and creates empty match slots.
 */
export function advanceBountyRound(tournament: TournamentState): TournamentState {
  const nextRound = (tournament.bountyRound || 1) + 1;
  if (nextRound > 5) return tournament;
  const newMatches = createBountyRoundMatches(tournament.id, nextRound);
  return {
    ...tournament,
    bountyRound: nextRound,
    bountyDraftPending: true,
    playoffMatches: [...tournament.playoffMatches, ...newMatches]
  };
}

/** True when every match of the current round is finished. */
export function isBountyRoundComplete(tournament: TournamentState): boolean {
  const round = tournament.bountyRound || 1;
  const roundMatches = tournament.playoffMatches.filter((m) => m.roundNumber === round);
  return roundMatches.length > 0 && roundMatches.every((m) => m.status === 'finished');
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}
