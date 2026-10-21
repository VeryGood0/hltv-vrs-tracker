import React from 'react';
import { MatchPrediction, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { History, Trash2, Flame } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface PredictionHistoryProps {
  history: MatchPrediction[];
  teams: Team[];
  onClearHistory: () => void;
}

export const PredictionHistory: React.FC<PredictionHistoryProps> = ({
  history,
  teams,
  onClearHistory
}) => {
  if (!history || history.length === 0) {
    return null;
  }

  const getTeam = (teamId?: string, fallbackName?: string, rawTeam?: Team): Team => {
    if (teamId) {
      const found = teams.find((t) => t.id === teamId);
      if (found) return found;
    }
    if (rawTeam && typeof rawTeam === 'object' && rawTeam.id) {
      const found = teams.find((t) => t.id === rawTeam.id);
      if (found) return found;
      return rawTeam;
    }
    return {
      id: teamId || 'team',
      name: fallbackName || 'Команда',
      points: 1500,
      defaultPoints: 1500,
      logoUrl: `/logos/${teamId || 'team'}.webp`,
      primaryColor: '#94a3b8',
      secondaryColor: '#0f172a',
      country: '',
      region: '',
      rosterSnippet: []
    };
  };

  return (
    <div className="w-full bg-[#0f1420]/80 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            История сыгранных матчей
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            ({history.length})
          </span>
        </div>

        <button
          onClick={() => {
            soundFx.playClick();
            onClearHistory();
          }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-800/40"
          title="Сбросить историю матчей, текущую форму команд и статистику сыгранных карт к дефолтной"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>Очистить историю и сбросить форму/карты к дефолту</span>
        </button>
      </div>

      <div className="divide-y divide-slate-800/60 overflow-hidden">
        {history.slice(0, 10).map((rawItem) => {
          const item = rawItem as MatchPrediction & { teamA?: Team; teamB?: Team };
          const teamAId = item.teamAId || item.teamA?.id || 'spirit';
          const teamBId = item.teamBId || item.teamB?.id || 'vitality';
          const teamAName = item.teamAName || item.teamA?.name || 'Spirit';
          const teamBName = item.teamBName || item.teamB?.name || 'Vitality';

          const teamA = getTeam(teamAId, teamAName, item.teamA);
          const teamB = getTeam(teamBId, teamBName, item.teamB);
          const aWon = item.scoreA > item.scoreB;

          return (
            <div
              key={item.id}
              className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/40 px-2 rounded-xl transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                  {item.format || 'BO3'}
                </span>

                {/* Team A */}
                <div className="flex items-center gap-1.5">
                  <TeamLogo team={teamA} size="xs" />
                  <span className={`text-xs font-semibold ${aWon ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                    {teamA.name}
                  </span>
                </div>

                {/* Score */}
                <span className="font-mono text-xs font-black text-white px-1">
                  {item.scoreA ?? 0} : {item.scoreB ?? 0}
                </span>

                {/* Team B */}
                <div className="flex items-center gap-1.5">
                  <TeamLogo team={teamB} size="xs" />
                  <span className={`text-xs font-semibold ${!aWon ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                    {teamB.name}
                  </span>
                </div>

                {item.isUpset && (
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Апсет
                  </span>
                )}

                {/* Played Maps Chips */}
                {item.mapsPlayed && item.mapsPlayed.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {item.mapsPlayed.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                        title={`${m.mapName}: ${m.scoreA}:${m.scoreB} ${m.overtime ? '(OT)' : ''}`}
                      >
                        {m.mapName} {m.scoreA}:{m.scoreB}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500 font-mono">
                {item.tournamentName && (
                  <span className="max-w-full text-right text-[10px] text-amber-300/90" title={`${item.tournamentName}${item.tournamentStage ? ` · ${item.tournamentStage}` : ''}`}>
                    {item.tournamentName}{item.tournamentStage ? ` · ${item.tournamentStage}` : ''}
                  </span>
                )}
                <span>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
