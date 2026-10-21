// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React from 'react';
import { TournamentFinalStanding, Team, TournamentState } from '../types';
import { TeamLogo } from './TeamLogo';
import { Trophy, Medal, Sparkles, X, RotateCcw, Zap, Award } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface TournamentResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  standings: TournamentFinalStanding[];
  teams: Team[];
  tournament?: TournamentState;
  onStartNewTournament: () => void;
}

export const TournamentResultsModal: React.FC<TournamentResultsModalProps> = ({
  isOpen,
  onClose,
  standings,
  teams,
  tournament,
  onStartNewTournament
}) => {
  if (!isOpen || standings.length === 0) return null;

  const getTeam = (id: string) => teams.find((t) => t.id === id);
  const champion = getTeam(standings[0]?.teamId);
  const tier = tournament?.tier || (tournament?.name?.toLowerCase().includes('major') ? 'Major' : 'S-Tier');
  const championBonus = standings[0]?.vrsAwarded || tournament?.championVrsBonus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#101524] border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-900/60 flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Итоги чемпионата CS2
                {tier && (
                  <span
                    className={`ml-1 text-[10px] px-2 py-0.5 rounded-full border ${
                      tier === 'Major'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-extrabold'
                        : tier === 'S-Tier'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-extrabold'
                        : tier === 'A-Tier'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-bold'
                        : tier === 'B-Tier'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {tier}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                {tournament?.name || 'Турнир успешно завершён!'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Champion Spotlight Banner */}
        {champion && (
          <div className="p-6 bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border-b border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <TeamLogo team={champion} size="lg" className="shadow-2xl shadow-amber-500/20" />
              <div>
                <span className="text-[11px] font-mono uppercase font-bold text-amber-400 tracking-widest flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 fill-amber-400" /> ЧЕМПИОН ТУРНИРА
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {champion.name}
                </h3>
                <div className="text-xs font-mono text-slate-300 mt-1 flex items-center gap-2">
                  <span>{champion.points} VRS PTS</span>
                  <span>·</span>
                  <span>{champion.country}</span>
                </div>
              </div>
            </div>

            {/* VRS Reward Showcase Callout */}
            <div className="text-left sm:text-right font-mono">
              <div className="text-xs uppercase text-slate-400 font-bold">Награда за чемпионство</div>
              {championBonus ? (
                <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 flex items-center sm:justify-end gap-1.5 animate-pulse">
                  <Zap className="w-5 h-5 fill-emerald-400 text-emerald-400" />
                  <span>+{championBonus} VRS</span>
                </div>
              ) : (
                <div className="text-xl font-black text-amber-400 mt-0.5">1-е МЕСТО</div>
              )}
              <div className="text-[11px] text-amber-300 font-bold">Золотой трофей добавлен</div>
            </div>
          </div>
        )}

        {/* Standings List */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-800/40">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider pb-2 flex items-center justify-between">
            <span>Итоговая таблица всех команд</span>
            <span className="text-[11px] text-slate-500">Начисленные VRS очки</span>
          </div>

          {standings.map((st) => {
            const team = getTeam(st.teamId);
            const isTop1 = st.place === 1;
            const isTop2 = st.place === 2;
            const isTop3 = st.place === 3;

            return (
              <div
                key={st.teamId}
                className={`pt-2.5 flex items-center justify-between gap-3 text-xs ${
                  isTop1 ? 'font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Place Badge */}
                  <span
                    className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 border ${
                      isTop1
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : isTop2
                        ? 'bg-slate-300/20 text-slate-200 border-slate-300/40'
                        : isTop3
                        ? 'bg-amber-700/20 text-amber-500 border-amber-700/40'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    #{st.place}
                  </span>

                  <TeamLogo team={team} size="xs" />

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {team?.name || 'TBD'}
                    </span>
                    {st.details && (
                      <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                        ({st.details})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs text-right">
                  {st.vrsAwarded && (
                    <span className={`px-2 py-0.5 rounded-full font-black text-xs border ${
                      isTop1
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isTop2
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      +{st.vrsAwarded} VRS
                    </span>
                  )}

                  <span
                    className={
                      isTop1
                        ? 'text-amber-400 font-bold'
                        : isTop2
                        ? 'text-slate-300 font-bold'
                        : isTop3
                        ? 'text-amber-500 font-bold'
                        : 'text-slate-400'
                    }
                  >
                    {st.placeLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              soundFx.playClick();
              onStartNewTournament();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Начать новый турнир</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
