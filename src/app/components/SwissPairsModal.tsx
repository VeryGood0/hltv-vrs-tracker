// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React, { useEffect, useState } from 'react';
import { TournamentMatch, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import {
  X,
  RotateCcw,
  Shuffle,
  ArrowLeftRight,
  Check,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { swapSwissRoundMatches } from '../utils/tournament';

interface SwissPairsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: TournamentMatch[];
  teams: Team[];
  onSaveMatches: (matches: TournamentMatch[]) => void;
  allowCrossPool?: boolean;
  title?: string;
  description?: string;
}

export const SwissPairsModal: React.FC<SwissPairsModalProps> = ({
  isOpen,
  onClose,
  matches,
  teams,
  onSaveMatches,
  allowCrossPool = false,
  title = 'Настройка пар текущего раунда (Швейцарская система)',
  description = 'Составляйте свои пары матчей или верните стандартный посев по рейтингу VRS'
}) => {
  const [currentMatches, setCurrentMatches] = useState<TournamentMatch[]>(matches);
  const [pickingSlot, setPickingSlot] = useState<{ matchId: string; slot: 'A' | 'B' } | null>(null);

  useEffect(() => {
    if (isOpen) { setCurrentMatches(matches); setPickingSlot(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const getTeam = (id?: string) => teams.find((t) => t.id === id);
  // Swiss pairings stay inside a score pool; playoff opening pairings share
  // one pool across all matches in the starting round.
  const teamsForMatch = (match: TournamentMatch) => {
    const ids = currentMatches
      .filter((m) => allowCrossPool || m.poolKey === match.poolKey)
      .flatMap((m) => [m.teamAId, m.teamBId])
      .filter(Boolean) as string[];
    return [...new Set(ids)].map((id) => getTeam(id)).filter(Boolean) as Team[];
  };
  const pools = allowCrossPool ? ['__all__'] : [...new Set(currentMatches.map((m) => m.poolKey))];

  const handleSwapSlot = (matchId: string, slot: 'A' | 'B', newTeamId: string) => {
    soundFx.playClick();
    const targetMatch = currentMatches.find((match) => match.id === matchId);
    if (!targetMatch) return;
    const teamOnOtherSide = slot === 'A' ? targetMatch.teamBId : targetMatch.teamAId;
    if (teamOnOtherSide === newTeamId) {
      setCurrentMatches(currentMatches.map((match) => match.id === matchId
        ? { ...match, teamAId: match.teamBId, teamBId: match.teamAId }
        : match));
      setPickingSlot(null);
      return;
    }
    if (!allowCrossPool) {
      setCurrentMatches(swapSwissRoundMatches(currentMatches, matchId, slot, newTeamId));
    } else {
      const target = currentMatches.find((match) => match.id === matchId);
      if (!target) return;
      const displacedId = slot === 'A' ? target.teamAId : target.teamBId;
      const existingMatch = currentMatches.find((match) => match.id !== matchId && (match.teamAId === newTeamId || match.teamBId === newTeamId));
      setCurrentMatches(currentMatches.map((match) => {
        if (match.id === matchId) return { ...match, teamAId: slot === 'A' ? newTeamId : match.teamAId, teamBId: slot === 'B' ? newTeamId : match.teamBId };
        if (existingMatch && match.id === existingMatch.id) return { ...match, teamAId: match.teamAId === newTeamId ? displacedId : match.teamAId, teamBId: match.teamBId === newTeamId ? displacedId : match.teamBId };
        return match;
      }));
    }
    setPickingSlot(null);
  };

  const handleSwapMatch = (matchId: string) => {
    soundFx.playClick();
    setCurrentMatches(currentMatches.map((m) => m.id === matchId ? { ...m, teamAId: m.teamBId, teamBId: m.teamAId } : m));
  };

  const rearrange = (order: (list: Team[]) => Team[], pairIndex: (i: number, n: number) => [number, number]) => {
    let next = [...currentMatches];
    for (const pool of pools) {
      const poolMatches = allowCrossPool ? [...next] : next.filter((m) => m.poolKey === pool);
      const list = order(poolMatches.flatMap((m) => [m.teamAId, m.teamBId]).map((id) => getTeam(id)).filter(Boolean) as Team[]);
      poolMatches.forEach((pm, i) => {
        const [a, b] = pairIndex(i, list.length);
        next = next.map((m) => m.id === pm.id ? { ...m, teamAId: list[a]?.id, teamBId: list[b]?.id } : m);
      });
    }
    setCurrentMatches(next);
  };

  const handleResetToDefault = () => {
    soundFx.playClick();
    rearrange((l) => [...l].sort((a, b) => b.points - a.points), (i, n) => [i, n - 1 - i]);
  };

  const handleRandomize = () => {
    soundFx.playClick();
    rearrange((list) => {
      const shuffled = [...list];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }, (i) => [i * 2, i * 2 + 1]);
  };

  const handleSaveAndClose = () => {
    soundFx.playVictory();
    onSaveMatches(currentMatches);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#101524] border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {title}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                {description}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono transition-colors cursor-pointer border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>По рейтингу (сильный vs слабый)</span>
            </button>

            <button
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono transition-colors cursor-pointer border border-slate-700"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-400" />
              <span>Случайные пары</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            {currentMatches.length} матчей · {allowCrossPool ? 'перестановка команд в стартовом раунде' : 'замена только внутри одного счёта'}
          </span>
        </div>

        {/* Matches List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {currentMatches.map((match, idx) => {
            const teamA = getTeam(match.teamAId);
            const teamB = getTeam(match.teamBId);

            return (
              <div
                key={match.id}
                className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="text-xs font-mono font-bold text-amber-400 shrink-0 w-20">
                  Матч {idx + 1}<div className="text-[10px] text-slate-500">{match.poolKey}</div>
                </div>

                {/* Team A Button */}
                <div className="relative flex-1 w-full sm:w-auto">
                  <button
                    onClick={() =>
                      setPickingSlot(
                        pickingSlot?.matchId === match.id && pickingSlot?.slot === 'A'
                          ? null
                          : { matchId: match.id, slot: 'A' }
                      )
                    }
                    className="w-full flex items-center justify-between gap-2 p-2 bg-[#090d15] hover:bg-slate-800/80 border border-slate-700/80 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TeamLogo team={teamA} size="xs" />
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {teamA?.name || 'TBD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-slate-400">
                      <span>{teamA?.points} VRS</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Dropdown for Team A */}
                  {pickingSlot?.matchId === match.id && pickingSlot?.slot === 'A' && (
                    <div className="absolute top-full left-0 mt-1 z-30 w-64 max-h-52 overflow-y-auto bg-[#0f1422] border border-amber-500/50 rounded-2xl shadow-2xl p-1.5 space-y-1">
                      {teamsForMatch(match).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleSwapSlot(match.id, 'A', t.id)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                            t.id === teamA?.id
                              ? 'bg-amber-500 text-black font-bold'
                              : 'text-white hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <TeamLogo team={t} size="xs" />
                            <span className="truncate">{t.name}</span>
                          </div>
                          <span className="text-[10px] tabular-nums">{t.points} VRS</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Swap Center Icon */}
                <button
                  onClick={() => handleSwapMatch(match.id)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-amber-500 hover:text-black text-slate-400 transition-colors cursor-pointer shrink-0"
                  title="Поменять местами команду А и Б"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>

                {/* Team B Button */}
                <div className="relative flex-1 w-full sm:w-auto">
                  <button
                    onClick={() =>
                      setPickingSlot(
                        pickingSlot?.matchId === match.id && pickingSlot?.slot === 'B'
                          ? null
                          : { matchId: match.id, slot: 'B' }
                      )
                    }
                    className="w-full flex items-center justify-between gap-2 p-2 bg-[#090d15] hover:bg-slate-800/80 border border-slate-700/80 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TeamLogo team={teamB} size="xs" />
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {teamB?.name || 'TBD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-slate-400">
                      <span>{teamB?.points} VRS</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Dropdown for Team B */}
                  {pickingSlot?.matchId === match.id && pickingSlot?.slot === 'B' && (
                    <div className="absolute top-full right-0 mt-1 z-30 w-64 max-h-52 overflow-y-auto bg-[#0f1422] border border-amber-500/50 rounded-2xl shadow-2xl p-1.5 space-y-1">
                      {teamsForMatch(match).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleSwapSlot(match.id, 'B', t.id)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                            t.id === teamB?.id
                              ? 'bg-amber-500 text-black font-bold'
                              : 'text-white hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <TeamLogo team={t} size="xs" />
                            <span className="truncate">{t.name}</span>
                          </div>
                          <span className="text-[10px] tabular-nums">{t.points} VRS</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
          >
            Отмена
          </button>

          <button
            onClick={handleSaveAndClose}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Применить пары</span>
          </button>
        </div>
      </div>
    </div>
  );
};
