import React, { useState } from 'react';
import { Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { X, RotateCcw, Plus, Minus, Search, Check, Sliders, Download, Loader2 } from 'lucide-react';
import { fetchHltvVrs } from '@/lib/hltv.functions';
import { matchHltvDefaults } from '../utils/hltvSync';
import { soundFx } from '../utils/audio';

interface PointsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onUpdateTeamPoints: (teamId: string, newPoints: number) => void;
  onResetAllPoints: () => void;
  onApplyDefaultPoints?: (map: Record<string, number>) => void;
}

export const PointsEditorModal: React.FC<PointsEditorModalProps> = ({
  isOpen,
  onClose,
  teams,
  onUpdateTeamPoints,
  onResetAllPoints,
  onApplyDefaultPoints
}) => {
  const [search, setSearch] = useState('');
  const [hltvLoading, setHltvLoading] = useState(false);
  const [hltvStatus, setHltvStatus] = useState<string | null>(null);

  const handleSyncHltv = async () => {
    if (!onApplyDefaultPoints) return;
    soundFx.playClick();
    setHltvLoading(true);
    setHltvStatus(null);
    try {
      const { entries } = await fetchHltvVrs();
      const { map, unmatched } = matchHltvDefaults(teams, entries);
      onApplyDefaultPoints(map);
      const count = Object.keys(map).length;
      setHltvStatus(`Обновлено стандартных очков: ${count}.` + (unmatched.length ? ` Не найдены на HLTV: ${unmatched.join(', ')}.` : '') + ' Нажмите «Сбросить все», чтобы применить их к текущим очкам.');
    } catch (e) {
      setHltvStatus(e instanceof Error ? e.message : 'Не удалось загрузить рейтинг HLTV');
    } finally {
      setHltvLoading(false);
    }
  };

  if (!isOpen) return null;

  const sortedTeams = [...teams].sort((a, b) => b.points - a.points);
  const filteredTeams = sortedTeams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111622] border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Редактирование VRS поинтов
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Изменение рейтинга команд сразу влияет на проценты побед и вероятность исхода
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Global Reset */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Найти команду..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0d121c] border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80"
            />
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onResetAllPoints();
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Сбросить все
          </button>
          {onApplyDefaultPoints && (
            <button
              onClick={handleSyncHltv}
              disabled={hltvLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap"
              title="Загрузить актуальные Valve points с HLTV как стандартные очки"
            >
              {hltvLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Обновить с HLTV
            </button>
          )}
        </div>
        {hltvStatus && (
          <div className="px-4 py-2 text-xs text-slate-300 border-b border-slate-800 bg-slate-900/60">{hltvStatus}</div>
        )}

        {/* Team List with Point Editors */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {filteredTeams.map((team, rank) => {
            const diff = team.points - team.defaultPoints;

            return (
              <div
                key={team.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono font-bold text-slate-500 w-6 text-right shrink-0">
                    #{rank + 1}
                  </span>
                  <TeamLogo team={team} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate text-sm">
                        {team.name}
                      </span>
                      {diff !== 0 && (
                        <span
                          className={`text-[11px] font-mono font-semibold ${
                            diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Базовый: <span className="font-mono">{team.defaultPoints}</span> pts
                    </div>
                  </div>
                </div>

                {/* Point Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onUpdateTeamPoints(team.id, Math.max(100, team.points - 50));
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono transition-colors"
                    title="-50 поинтов"
                  >
                    -50
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onUpdateTeamPoints(team.id, Math.max(100, team.points - 10));
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    title="-10 поинтов"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative">
                    <input
                      type="number"
                      value={team.points}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          onUpdateTeamPoints(team.id, Math.max(100, val));
                        }
                      }}
                      className="w-24 bg-[#090d14] border border-amber-500/50 rounded-lg px-2.5 py-1 text-center font-mono font-bold text-amber-400 text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onUpdateTeamPoints(team.id, team.points + 10);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    title="+10 поинтов"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onUpdateTeamPoints(team.id, team.points + 50);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono transition-colors"
                    title="+50 поинтов"
                  >
                    +50
                  </button>

                  {diff !== 0 && (
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        onUpdateTeamPoints(team.id, team.defaultPoints);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
                      title="Вернуть базовые поинты"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Всего команд: <span className="font-mono text-white">{teams.length}</span>
          </span>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl transition-colors"
          >
            <Check className="w-4 h-4" />
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
