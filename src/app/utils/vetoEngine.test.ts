import { describe, expect, it } from 'vitest';
import { createZeroMapProfile } from '../data/mapPool';
import type { Team } from '../types';
import { executeCompleteAutoVeto } from './vetoEngine';

const makeLowDataTeam = (id: string): Team => ({
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

describe('automatic map veto', () => {
  it('varies its choices when teams have no map data instead of always using the same map order', () => {
    const teamA = makeLowDataTeam('team-a');
    const teamB = makeLowDataTeam('team-b');
    const signatures = new Set<string>();

    for (let index = 0; index < 24; index++) {
      const veto = executeCompleteAutoVeto('BO3', teamA, teamB);
      signatures.add(veto.selectedMapsInOrder.map((map) => map.mapName).join('|'));
    }

    expect(signatures.size).toBeGreaterThan(1);
  });

  it('never selects the same map twice inside one series', () => {
    const veto = executeCompleteAutoVeto('BO3', makeLowDataTeam('team-a'), makeLowDataTeam('team-b'));
    const selected = veto.selectedMapsInOrder.map((map) => map.mapName);
    expect(selected).toHaveLength(3);
    expect(new Set(selected).size).toBe(3);
  });
});
