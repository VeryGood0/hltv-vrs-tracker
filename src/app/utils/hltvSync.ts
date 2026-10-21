import type { Team } from '../types';

export const HLTV_DEFAULTS_KEY = 'cs2_hltv_default_points';

const norm = (s: string) => s.toLowerCase().replace(/\bclan\b|\besports?\b|\bteam\b/g, '').replace(/[^a-z0-9]/g, '');

const ALIASES: Record<string, string[]> = {
  navi: ['natusvincere'],
  nip: ['ninjasinpyjamas'],
  'bc-game': ['bcgame'],
};

/** Finds the HLTV entry for a team by name, short name, id and known aliases. */
export function findHltvPoints(team: Team, byName: Map<string, number>): number | undefined {
  const keys = [team.name, team.shortName || '', team.id, ...(ALIASES[team.id] || [])].map(norm).filter(Boolean);
  for (const key of keys) {
    const v = byName.get(key);
    if (v !== undefined) return v;
  }
  return undefined;
}

/** Returns a teamId -> points map for every team found in the HLTV list. */
export function matchHltvDefaults(teams: Team[], entries: { name: string; points: number }[]) {
  const byName = new Map<string, number>();
  for (const e of entries) if (!byName.has(norm(e.name))) byName.set(norm(e.name), e.points);
  const map: Record<string, number> = {};
  const unmatched: string[] = [];
  for (const t of teams) {
    const v = findHltvPoints(t, byName);
    if (v !== undefined) map[t.id] = v;
    else unmatched.push(t.name);
  }
  return { map, unmatched };
}

export function applyDefaultPointsMap(teams: Team[], map: Record<string, number>): Team[] {
  return teams.map((t) => (map[t.id] !== undefined ? { ...t, defaultPoints: map[t.id]! } : t));
}

export function loadStoredHltvDefaults(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(HLTV_DEFAULTS_KEY) || '{}');
  } catch {
    return {};
  }
}
