// @ts-nocheck -- loose typing of imported simulator code
import React, { useMemo, useState } from 'react';
import { TournamentMatch, TournamentGroup, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { X, RotateCcw, Shuffle, Check, ArrowLeftRight } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface GroupPairsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: TournamentGroup;
  teams: Team[];
  onSaveGroupMatches: (groupId: string, updatedMatches: TournamentMatch[]) => void;
}

const getOpeningMatches = (group: TournamentGroup): TournamentMatch[] => {
  const letter = group.letter || group.name.replace('Группа ', '').trim() || 'A';
  const eightTeamGsl = group.matches
    .filter((match) => /^gsl_[A-Z]_u1_\d+$/.test(match.poolKey))
    .sort((a, b) => Number(a.poolKey.split('_').at(-1)) - Number(b.poolKey.split('_').at(-1)));
  if (eightTeamGsl.length) return eightTeamGsl;

  const gslOpening = [
    group.matches.find((m) => m.poolKey === `gsl_${letter}_opening1` || m.poolKey.includes('opening1')),
    group.matches.find((m) => m.poolKey === `gsl_${letter}_opening2` || m.poolKey.includes('opening2'))
  ].filter(Boolean) as TournamentMatch[];
  if (gslOpening.length) return gslOpening;

  // For non-GSL group stages, show every directly scheduled fixture from the
  // first round (not just match 1 and 2 in an 8-team round robin).
  const firstRound = group.matches.filter((match) => match.roundNumber === Math.min(...group.matches.map((item) => item.roundNumber)));
  return firstRound.slice(0, 16);
};

export const GroupPairsModal: React.FC<GroupPairsModalProps> = ({
  isOpen,
  onClose,
  group,
  teams,
  onSaveGroupMatches
}) => {
  const groupTeams = useMemo(
    () => (group.teamIds || []).map((id) => teams.find((team) => team.id === id)).filter(Boolean) as Team[],
    [group.teamIds, teams]
  );
  const openingMatches = useMemo(() => getOpeningMatches(group), [group]);
  const initialSlots = useMemo(() => {
    const slots: Record<string, string> = {};
    openingMatches.forEach((match, index) => {
      slots[`${index}A`] = match.teamAId || groupTeams[index * 2]?.id || '';
      slots[`${index}B`] = match.teamBId || groupTeams[index * 2 + 1]?.id || '';
    });
    return slots;
  }, [openingMatches, groupTeams]);
  const [assignments, setAssignments] = useState<Record<string, string>>(initialSlots);

  if (!isOpen) return null;

  const selectSlot = (slotKey: string, selectedTeamId: string) => {
    soundFx.playClick();
    setAssignments((current) => {
      const next = { ...current };
      const displaced = current[slotKey];
      const existingSlot = Object.keys(current).find((key) => key !== slotKey && current[key] === selectedTeamId);
      next[slotKey] = selectedTeamId;
      if (existingSlot) next[existingSlot] = displaced;
      return next;
    });
  };

  const resetToSeed = () => {
    soundFx.playClick();
    const sorted = [...groupTeams].sort((a, b) => b.points - a.points);
    const seededPairs = sorted.length >= 8
      ? [[0, 7], [3, 4], [1, 6], [2, 5]]
      : [[0, sorted.length - 1], [1, 2]];
    const next: Record<string, string> = {};
    openingMatches.forEach((_, index) => {
      const pair = seededPairs[index] || [index * 2, index * 2 + 1];
      next[`${index}A`] = sorted[pair[0]]?.id || '';
      next[`${index}B`] = sorted[pair[1]]?.id || '';
    });
    setAssignments(next);
  };

  const randomize = () => {
    soundFx.playClick();
    const shuffled = [...groupTeams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const next: Record<string, string> = {};
    openingMatches.forEach((_, index) => {
      next[`${index}A`] = shuffled[index * 2]?.id || '';
      next[`${index}B`] = shuffled[index * 2 + 1]?.id || '';
    });
    setAssignments(next);
  };

  const handleSave = () => {
    if (openingMatches.length === 0) return;
    soundFx.playVictory();
    const byId = new Map<string, number>(openingMatches.map((match, index): [string, number] => [match.id, index]));
    const slotTeamIds = openingMatches.flatMap((match, index) => [
      match.teamAId || groupTeams[index * 2]?.id || '',
      match.teamBId || groupTeams[index * 2 + 1]?.id || ''
    ]).filter(Boolean);
    const selectedSlotTeamIds = openingMatches.flatMap((_, index) => [assignments[`${index}A`], assignments[`${index}B`]]).filter(Boolean);
    const slotMapping = new Map(slotTeamIds.map((teamId, index) => [teamId, selectedSlotTeamIds[index]]));
    const updated = group.matches.map((match) => {
      const index = byId.get(match.id);
      if (index === undefined && group.groupStyle !== 'round_robin') return match;
      const {
        winnerId, loserId, mapsPlayed, vetoState,
        deltaPointsA, deltaPointsB, deltaFormA, deltaFormB,
        ...matchWithoutPriorResult
      } = match;
      if (group.groupStyle === 'round_robin') {
        return {
          ...matchWithoutPriorResult,
          teamAId: match.teamAId ? slotMapping.get(match.teamAId) || match.teamAId : undefined,
          teamBId: match.teamBId ? slotMapping.get(match.teamBId) || match.teamBId : undefined,
          scoreA: 0,
          scoreB: 0,
          winnerId: undefined,
          loserId: undefined,
          mapsPlayed: undefined,
          vetoState: undefined,
          status: 'ready' as const
        };
      }
      return {
        ...matchWithoutPriorResult,
        teamAId: assignments[`${index}A`] || groupTeams[index * 2]?.id || '',
        teamBId: assignments[`${index}B`] || groupTeams[index * 2 + 1]?.id || '',
        scoreA: 0,
        scoreB: 0,
        status: 'ready' as const
      };
    });
    onSaveGroupMatches(group.id, updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#101622] shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 bg-slate-900/70 p-5">
          <div>
            <h3 className="text-lg font-extrabold text-white">Настройка первых пар · {group.name}</h3>
            <p className="mt-1 text-xs text-slate-400">Выберите, кто с кем играет в стартовом раунде. Следующие пары определяются по сетке.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Закрыть"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={resetToSeed} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:border-amber-500/50"><RotateCcw className="h-3.5 w-3.5 text-amber-400" /> По рейтингу VRS</button>
            <button type="button" onClick={randomize} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:border-amber-500/50"><Shuffle className="h-3.5 w-3.5 text-amber-400" /> Случайные пары</button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {openingMatches.map((match, index) => (
              <div key={match.id} className="rounded-2xl border border-slate-800 bg-[#090e17] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-amber-300">{match.name.split('·').at(-1)?.trim() || `Стартовый матч ${index + 1}`}</span>
                  <span className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-mono font-bold text-slate-300">{match.format}</span>
                </div>
                {(['A', 'B'] as const).map((side) => {
                  const slotKey = `${index}${side}`;
                  const selected = teams.find((team) => team.id === assignments[slotKey]);
                  return (
                    <div key={slotKey} className="mb-2 last:mb-0 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                      {selected && <TeamLogo team={selected} size="sm" />}
                      <select
                        aria-label={`${match.name}: команда ${side}`}
                        value={assignments[slotKey] || ''}
                        onChange={(event) => selectSlot(slotKey, event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-bold text-white outline-none focus:border-amber-500"
                      >
                        {groupTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                      </select>
                      <span className="text-[10px] font-mono text-slate-400">{selected?.points ?? 0} VRS</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-slate-300">
            <ArrowLeftRight className="mr-1 inline h-3.5 w-3.5 text-blue-300" /> При выборе уже назначенной команды её соперник автоматически меняется местами, поэтому одна команда не попадёт сразу в две стартовые пары.
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/70 p-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white">Отмена</button>
          <button type="button" onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-black hover:bg-amber-400"><Check className="h-4 w-4" /> Сохранить пары</button>
        </div>
      </div>
    </div>
  );
};
