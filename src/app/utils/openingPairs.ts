import type { TournamentMatch, TournamentState } from '../types';

export type OpeningPairOrders = Record<string, string[]>;

export function getOpeningScopes(tournament: TournamentState) {
  if (tournament.groups?.length) return tournament.groups.map((group) => ({ key: group.id, name: group.name, matches: group.matches, roundRobin: group.groupStyle === 'round_robin' }));
  if (tournament.currentStage === 'swiss') return [{ key: 'swiss', name: 'Opening Round', matches: tournament.swissMatches.filter((match) => match.roundNumber === tournament.swissRound), roundRobin: false }];
  if (tournament.mode === 'round_robin') return [{ key: 'round_robin', name: 'Первый тур', matches: tournament.roundRobinMatches || [], roundRobin: true }];
  return [{ key: 'playoffs', name: 'Стартовые пары', matches: tournament.playoffMatches, roundRobin: false }];
}

export function getOpeningSlots(matches: TournamentMatch[], roundRobin = false) {
  const firstRound = Math.min(...matches.map((match) => match.roundNumber));
  return matches.filter((match) => match.status !== 'finished' && (!roundRobin || match.roundNumber === firstRound))
    .flatMap((match) => (['A', 'B'] as const).flatMap((side) => {
      const teamId = side === 'A' ? match.teamAId : match.teamBId;
      const source = side === 'A' ? match.sourceA : match.sourceB;
      return teamId && !source ? [{ match, side, teamId }] : [];
    }));
}

/** Only accept a bijection of existing entrants; apply RR permutations to every fixture. */
export function applyOpeningPairOrders(tournament: TournamentState, orders: OpeningPairOrders): TournamentState {
  const replacements = new Map<string, TournamentMatch>();
  for (const scope of getOpeningScopes(tournament)) {
    if (scope.matches.some((match) => match.status === 'finished')) continue;
    const slots = getOpeningSlots(scope.matches, scope.roundRobin);
    const original = slots.map((slot) => slot.teamId);
    const order = orders[scope.key];
    if (!order || order.length !== original.length || new Set(order).size !== order.length || order.some((id) => !original.includes(id))) continue;
    const mapping = new Map(original.map((id, index) => [id, order[index]]));
    for (const match of scope.matches) {
      const swap = (id?: string) => id ? mapping.get(id) || id : undefined;
      replacements.set(match.id, { ...match, teamAId: swap(match.teamAId), teamBId: swap(match.teamBId) });
    }
  }
  const apply = (matches: TournamentMatch[]) => matches.map((match) => replacements.get(match.id) || match);
  return { ...tournament, playoffMatches: apply(tournament.playoffMatches), swissMatches: apply(tournament.swissMatches),
    ...(tournament.roundRobinMatches ? { roundRobinMatches: apply(tournament.roundRobinMatches) } : {}),
    ...(tournament.groups ? { groups: tournament.groups.map((group) => ({ ...group, matches: apply(group.matches) })), groupMatches: apply(tournament.groupMatches || []) } : {}),
    ...(tournament.majorStages ? { majorStages: tournament.majorStages.map((stage) => ({ ...stage, matches: apply(stage.matches) })) } : {}) };
}