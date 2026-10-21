import React from 'react';
import { Team, MatchPointsStakes } from '../types';
import { TeamLogo } from './TeamLogo';
import { Check, Info } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface MatchStakesTableProps {
  teamA: Team;
  teamB: Team;
  stakes: MatchPointsStakes;
  autoUpdatePoints: boolean;
  onToggleAutoUpdatePoints: () => void;
}

export const MatchStakesTable: React.FC<MatchStakesTableProps> = ({
  teamA,
  teamB,
  stakes,
  autoUpdatePoints,
  onToggleAutoUpdatePoints
}) => {
  const getRankDeltaBadge = (currentRank: number, targetRank: number) => {
    const diff = currentRank - targetRank; // e.g. from #4 to #2 is +2
    if (diff > 0) {
      return (
        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-1 py-0.5 rounded ml-1">
          +{diff}
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/20 px-1 py-0.5 rounded ml-1">
          {diff}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#0d121c] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header bar with toggle */}
      <div className="px-4 py-3 bg-[#0a0e17] border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Распределение очков VRS за матч
          </span>
          <span className="text-[11px] text-slate-500 hidden md:inline">
            (Valve Regional Standings)
          </span>
        </div>

        {/* Toggle switch for updating points */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs">
          <span className="text-slate-400 hover:text-white transition-colors">
            Применять очки к рейтингу после матча:
          </span>
          <div
            onClick={() => {
              soundFx.playClick();
              onToggleAutoUpdatePoints();
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              autoUpdatePoints ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-black transition-transform ${
                autoUpdatePoints ? 'translate-x-4.5' : 'translate-x-1'
              }`}
            />
          </div>
          <span
            className={`font-mono text-xs font-bold ${
              autoUpdatePoints ? 'text-amber-400' : 'text-slate-500'
            }`}
          >
            {autoUpdatePoints ? 'ВКЛ' : 'ВЫКЛ'}
          </span>
        </label>
      </div>

      {/* Valve/HLTV Styled Table (Matching image) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th className="py-2.5 px-4 font-semibold w-1/3">Команда</th>
              <th className="py-2.5 px-3 font-semibold text-center w-1/5">
                <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                  CURRENT
                </span>
              </th>
              <th className="py-2.5 px-3 font-semibold text-center w-1/4">
                <span className="px-2 py-0.5 rounded bg-emerald-600/90 text-white font-bold">
                  IF TEAM WINS
                </span>
              </th>
              <th className="py-2.5 px-3 font-semibold text-center w-1/4">
                <span className="px-2 py-0.5 rounded bg-rose-600/90 text-white font-bold">
                  IF TEAM LOSES
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {/* Team A Row */}
            <tr className="hover:bg-slate-900/30 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <TeamLogo team={teamA} size="xs" />
                  <span className="font-bold text-white text-sm">
                    {teamA.name}
                  </span>
                </div>
              </td>

              {/* Current */}
              <td className="py-3 px-3 text-center">
                <div className="font-mono font-bold text-white">
                  {teamA.points}pt
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  #{stakes.rankCurrentA}
                </div>
              </td>

              {/* If Wins */}
              <td className="py-3 px-3 text-center">
                <div className="font-mono font-bold text-emerald-400 text-sm">
                  +{stakes.winA}pt
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-center">
                  #{stakes.rankWinA}
                  {getRankDeltaBadge(stakes.rankCurrentA, stakes.rankWinA)}
                </div>
              </td>

              {/* If Loses */}
              <td className="py-3 px-3 text-center">
                <div className="font-mono font-bold text-rose-400 text-sm">
                  -{stakes.lossA}pt
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-center">
                  #{stakes.rankLossA}
                  {getRankDeltaBadge(stakes.rankCurrentA, stakes.rankLossA)}
                </div>
              </td>
            </tr>

            {/* Team B Row */}
            <tr className="hover:bg-slate-900/30 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <TeamLogo team={teamB} size="xs" />
                  <span className="font-bold text-white text-sm">
                    {teamB.name}
                  </span>
                </div>
              </td>

              {/* Current */}
              <td className="py-3 px-3 text-center">
                <div className="font-mono font-bold text-white">
                  {teamB.points}pt
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  #{stakes.rankCurrentB}
                </div>
              </td>

              {/* If Wins */}
              <td className="py-3 px-3 text-center">
                <div className="font-mono font-bold text-emerald-400 text-sm">
                  +{stakes.winB}pt
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-center">
                  #{stakes.rankWinB}
                  {getRankDeltaBadge(stakes.rankCurrentB, stakes.rankWinB)}
                </div>
              </td>

              {/* If Loses */}
              <td className="py-3 px-3 text-center">
                <div className="font-mono font-bold text-rose-400 text-sm">
                  -{stakes.lossB}pt
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-center">
                  #{stakes.rankLossB}
                  {getRankDeltaBadge(stakes.rankCurrentB, stakes.rankLossB)}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Informational footer note */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          {autoUpdatePoints ? (
            <span className="text-amber-300 font-medium">
              Очки будут начислены победившей команде и списаны у проигравшей сразу после окончания матча.
            </span>
          ) : (
            <span>
              Режим обновления выключен по умолчанию: поинты команд в общем зачете не меняются автоматически.
            </span>
          )}
        </span>
      </div>
    </div>
  );
};
