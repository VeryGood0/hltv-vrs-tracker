import { describe, expect, it } from 'vitest';
import { createZeroMapProfile } from '../data/mapPool';
import type { ActiveDutyMap, MatchSeriesMapResult, Team } from '../types';
import {
  appendMapStatsEvent,
  emptyMapStatsLedger,
  removeTournamentFromMapStatsLedger,
  replayMapStatsLedger
} from './mapStatsLedger';

const makeTeam = (id: string): Team => ({
  id,
  name: id,
  shortName: id,
  points: 1000,
  defaultPoints: 1000,
  logoUrl: '',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  country: 'Test',
  region: 'Test',
  rosterSnippet: [],
  mapProfile: createZeroMapProfile()
});

const playedMap = (
  mapName: ActiveDutyMap,
  winnerTeamId: string,
  loserTeamId: string,
  scoreA: number,
  scoreB: number
): MatchSeriesMapResult => ({
  mapName,
  mapOrder: 1,
  scoreA,
  scoreB,
  overtime: false,
  half1A: 0,
  half1B: 0,
  half2A: 0,
  half2B: 0,
  winnerTeamId,
  loserTeamId,
  narrative: ''
});

describe('map stats ledger', () => {
  it('removes a tournament and restores the previous map result as the latest one', () => {
    const teams = [makeTeam('team-a'), makeTeam('team-b')];
    let ledger = emptyMapStatsLedger();
    ledger = appendMapStatsEvent(ledger, {
      id: 'old-match',
      timestamp: 1_000,
      teamAId: 'team-a',
      teamBId: 'team-b',
      mapsPlayed: [playedMap('Mirage', 'team-a', 'team-b', 13, 7)],
      tournamentId: 'old-tournament',
      tournamentName: 'Старый турнир',
      stageName: 'Финал'
    }, teams);
    ledger = appendMapStatsEvent(ledger, {
      id: 'new-match',
      timestamp: 2_000,
      teamAId: 'team-a',
      teamBId: 'team-b',
      mapsPlayed: [playedMap('Ancient', 'team-b', 'team-a', 7, 13)],
      tournamentId: 'deleted-tournament',
      tournamentName: 'Удаляемый турнир',
      stageName: 'Полуфинал'
    }, teams);

    const withBothEvents = replayMapStatsLedger(teams, ledger);
    expect(withBothEvents[0]?.mapProfile?.maps.Ancient.mapsPlayed).toBe(1);
    expect(withBothEvents[0]?.mapProfile?.maps.Ancient.recentResults[0]?.tournamentName).toBe('Удаляемый турнир');

    const remainingLedger = removeTournamentFromMapStatsLedger(ledger, 'deleted-tournament');
    const restored = replayMapStatsLedger(withBothEvents, remainingLedger);
    expect(restored[0]?.mapProfile?.maps.Ancient.mapsPlayed).toBe(0);
    expect(restored[0]?.mapProfile?.maps.Mirage.mapsPlayed).toBe(1);
    expect(restored[0]?.mapProfile?.maps.Mirage.recentResults[0]?.tournamentName).toBe('Старый турнир');
  });
});
