import { MatchSeriesMapResult, Team, TeamMapProfile } from '../types';
import { createZeroMapProfile } from '../data/mapPool';
import { applyDynamicMapOutcome } from './mapSimulation';

export interface MapStatsLedgerEvent {
  id: string;
  sequence: number;
  timestamp: number;
  teamAId: string;
  teamBId: string;
  mapsPlayed: MatchSeriesMapResult[];
  tournamentId?: string;
  tournamentName?: string;
  stageName?: string;
}

export interface MapStatsLedger {
  /** Profile snapshots before the first ledger-tracked map for each team. */
  baselineProfiles: Record<string, TeamMapProfile>;
  events: MapStatsLedgerEvent[];
}

export const emptyMapStatsLedger = (): MapStatsLedger => ({ baselineProfiles: {}, events: [] });

const cloneProfile = (profile: TeamMapProfile): TeamMapProfile => JSON.parse(JSON.stringify(profile));

export function appendMapStatsEvent(
  ledger: MapStatsLedger,
  input: Omit<MapStatsLedgerEvent, 'sequence'>,
  currentTeams: Team[]
): MapStatsLedger {
  const baselineProfiles = { ...ledger.baselineProfiles };
  for (const teamId of [input.teamAId, input.teamBId]) {
    if (baselineProfiles[teamId]) continue;
    const team = currentTeams.find((item) => item.id === teamId);
    if (team) baselineProfiles[teamId] = cloneProfile(team.mapProfile || createZeroMapProfile());
  }

  return {
    baselineProfiles,
    events: [
      ...ledger.events,
      { ...input, sequence: ledger.events.reduce((max, item) => Math.max(max, item.sequence || 0), 0) + 1 }
    ]
  };
}

/** Rebuild map statistics from the saved baseline and every event still in the ledger. */
export function replayMapStatsLedger(teams: Team[], ledger: MapStatsLedger): Team[] {
  const working = teams.map((team) => {
    const baseline = ledger.baselineProfiles[team.id];
    return baseline ? { ...team, mapProfile: cloneProfile(baseline) } : team;
  });

  const orderedEvents = [...ledger.events].sort((a, b) =>
    (a.sequence || a.timestamp) - (b.sequence || b.timestamp)
  );

  for (const event of orderedEvents) {
    for (const playedMap of event.mapsPlayed || []) {
      const teamAIndex = working.findIndex((team) => team.id === event.teamAId);
      const teamBIndex = working.findIndex((team) => team.id === event.teamBId);
      if (teamAIndex < 0 || teamBIndex < 0) continue;
      const teamA = working[teamAIndex];
      const teamB = working[teamBIndex];
      if (!teamA || !teamB || !teamA.mapProfile || !teamB.mapProfile) continue;

      const metadata = {
        matchId: event.id,
        tournamentId: event.tournamentId,
        tournamentName: event.tournamentName,
        stageName: event.stageName,
        date: new Date(event.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      };
      const aWon = playedMap.winnerTeamId === teamA.id;
      working[teamAIndex] = {
        ...teamA,
        mapProfile: applyDynamicMapOutcome(
          teamA.mapProfile,
          playedMap.mapName,
          aWon,
          playedMap.scoreA,
          playedMap.scoreB,
          teamB,
          metadata
        )
      };
      working[teamBIndex] = {
        ...teamB,
        mapProfile: applyDynamicMapOutcome(
          teamB.mapProfile,
          playedMap.mapName,
          !aWon,
          playedMap.scoreB,
          playedMap.scoreA,
          teamA,
          metadata
        )
      };
    }
  }

  return working;
}

export function removeTournamentFromMapStatsLedger(ledger: MapStatsLedger, tournamentId: string): MapStatsLedger {
  return {
    baselineProfiles: ledger.baselineProfiles,
    events: ledger.events.filter((event) => event.tournamentId !== tournamentId)
  };
}
