import type { TournamentState, Team } from '../types';
import { getOpeningScopes, getOpeningSlots, type OpeningPairOrders } from '../utils/openingPairs';

export function OpeningPairsEditor({ tournament, teams, orders, onChange }: {
  tournament: TournamentState; teams: Team[]; orders: OpeningPairOrders; onChange: (orders: OpeningPairOrders) => void;
}) {
  return <div className="space-y-5">
    <h4 className="font-bold text-foreground">Стартовые пары</h4>
    {getOpeningScopes(tournament).map((scope) => {
      const slots = getOpeningSlots(scope.matches, scope.roundRobin);
      const initial = slots.map((slot) => slot.teamId);
      const saved = orders[scope.key];
      const order = saved && saved.length === initial.length && saved.every((id) => initial.includes(id)) ? saved : initial;
      return <section key={scope.key} className="space-y-2">
        <h5 className="text-sm font-semibold text-foreground">{scope.name}</h5>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[...new Set(slots.map((slot) => slot.match.id))].map((matchId) => {
            const match = slots.find((slot) => slot.match.id === matchId)?.match;
            if (!match) return null;
            return <div key={matchId} className="space-y-2 rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">{match.name}</div>
              {slots.map((slot, index) => slot.match.id !== matchId ? null : <select key={slot.side}
                aria-label={`${scope.name} · ${match.poolKey} · команда ${slot.side}`}
                className="w-full min-w-0 rounded-md border border-input bg-background p-2 text-sm text-foreground"
                value={order[index]} onChange={(event) => {
                  const next = [...order]; const other = next.indexOf(event.target.value);
                  if (other < 0) return;
                  [next[index], next[other]] = [next[other], next[index]];
                  onChange({ ...orders, [scope.key]: next });
                }}>
                {initial.map((id) => <option key={id} value={id}>{teams.find((team) => team.id === id)?.name || id}</option>)}
              </select>)}
            </div>;
          })}
        </div>
      </section>;
    })}
  </div>;
}