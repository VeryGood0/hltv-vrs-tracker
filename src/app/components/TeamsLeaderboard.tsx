import React, { useState, useMemo } from 'react';
import { Team, MatchPrediction } from '../types';
import { TeamLogo } from './TeamLogo';
import { calculateTeamForm } from '../utils/probability';
import {
  Search,
  Trophy,
  Sliders,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Play
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface TeamsLeaderboardProps {
  teams: Team[];
  history: MatchPrediction[];
  onSelectTeamForProfile: (team: Team) => void;
  onSelectTeamForMatch: (team: Team) => void;
  onOpenPointsEditor: () => void;
}

export const TeamsLeaderboard: React.FC<TeamsLeaderboardProps> = ({
  teams,
  history,
  onSelectTeamForProfile,
  onSelectTeamForMatch,
  onOpenPointsEditor
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'points' | 'trophies' | 'winrate'>('points');

  const getTeamStats = (teamId: string) => {
    const matches = history.filter((m) => m.teamAId === teamId || m.teamBId === teamId);
    const wins = matches.filter((m) => m.winnerTeamId === teamId).length;
    const losses = matches.length - wins;
    const winRate = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;
    return { matches: matches.length, wins, losses, winRate };
  };

  const sortedTeams = useMemo(() => {
    const list = [...teams];
    if (sortBy === 'trophies') {
      return list.sort((a, b) => {
        const trA = a.trophiesCount !== undefined ? a.trophiesCount : (a.trophies?.length || 0);
        const trB = b.trophiesCount !== undefined ? b.trophiesCount : (b.trophies?.length || 0);
        if (trB !== trA) return trB - trA;
        return b.points - a.points;
      });
    }
    if (sortBy === 'winrate') {
      return list.sort((a, b) => {
        const wrA = getTeamStats(a.id).winRate;
        const wrB = getTeamStats(b.id).winRate;
        if (wrB !== wrA) return wrB - wrA;
        return b.points - a.points;
      });
    }
    return list.sort((a, b) => b.points - a.points);
  }, [teams, sortBy, history]);

  const filteredTeams = sortedTeams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.region.toLowerCase().includes(search.toLowerCase()) ||
    (t.rosterSnippet || []).some((player) => player.toLowerCase().includes(search.toLowerCase())) ||
    (t.trophies || []).some((tr) => tr.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalTrophiesWon = useMemo(() => {
    return teams.reduce((acc, t) => acc + (t.trophiesCount !== undefined ? t.trophiesCount : (t.trophies?.length || 0)), 0);
  }, [teams]);

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Top Controls & Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-5 bg-[#0f1420]/90 border border-slate-800 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Рейтинг и статистика команд CS2
            </h2>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300">
              <span>{totalTrophiesWon} трофеев в базе</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Рейтинг VRS, динамическая форма, статистика матчей и все выигранные турниры команд
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sort Switcher */}
          <div className="flex items-center gap-1 bg-[#090d14] p-1 border border-slate-800 rounded-xl">
            <button
              onClick={() => {
                soundFx.playClick();
                setSortBy('points');
              }}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                sortBy === 'points'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Сортировать по очкам VRS"
            >
              VRS
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setSortBy('trophies');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                sortBy === 'trophies'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Сортировать по выигранным турнирам (трофеям)"
            >
              <Trophy className="w-3 h-3" />
              <span>Титулы</span>
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setSortBy('winrate');
              }}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                sortBy === 'winrate'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Сортировать по винрейту матчей"
            >
              % побед
            </button>
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск команды или турнира..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#090d14] border border-slate-700/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80"
            />
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onOpenPointsEditor();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Поинты</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="bg-[#0f1420]/95 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl divide-y divide-slate-800/60">
        {filteredTeams.map((team, idx) => {
          const rank = sortedTeams.findIndex((t) => t.id === team.id) + 1;
          const form = calculateTeamForm(team.id, history);
          const isTop3 = rank <= 3;

          // Team match count
          const teamMatches = history.filter(
            (m) => m.teamAId === team.id || m.teamBId === team.id
          );
          const teamWins = teamMatches.filter((m) => m.winnerTeamId === team.id).length;
          const teamLosses = teamMatches.length - teamWins;

          return (
            <div
              key={team.id}
              onClick={() => {
                soundFx.playClick();
                onSelectTeamForProfile(team);
              }}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/60 transition-all cursor-pointer group"
            >
              {/* Left Zone: Rank, Logo, Name, Lineup */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {/* Rank Badge */}
                <span
                  className={`w-8 h-8 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 border ${
                    rank === 1
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/20'
                      : rank === 2
                      ? 'bg-slate-300/20 text-slate-200 border-slate-300/30'
                      : rank === 3
                      ? 'bg-amber-700/20 text-amber-600 border-amber-700/30'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  #{rank}
                </span>

                <TeamLogo team={team} size="md" className="group-hover:scale-105 transition-transform" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base tracking-tight truncate group-hover:text-amber-400 transition-colors">
                      {team.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                      {team.country} · {team.region}
                    </span>
                    {isTop3 && (
                      <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    {(team.trophiesCount !== undefined ? team.trophiesCount : (team.trophies?.length || 0)) > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>{team.trophiesCount !== undefined ? team.trophiesCount : team.trophies?.length}</span>
                      </span>
                    )}
                  </div>

                  {/* Lineup snippet */}
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {(team.rosterSnippet || []).join(' · ')}
                    {team.coach && <span className="text-slate-500 ml-1.5">(тр. {team.coach})</span>}
                  </div>

                  {/* Won tournaments snippet pills */}
                  {team.trophies && team.trophies.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {team.trophies.slice(0, 2).map((tr) => (
                        <span
                          key={tr.id}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 flex items-center gap-1 truncate max-w-[220px]"
                          title={`${tr.name} (${tr.year || 2026}) · ${tr.tier || 'Championship'}${tr.vrsPointsAwarded ? ` · +${tr.vrsPointsAwarded} VRS` : ''}`}
                        >
                          <Trophy className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span className="truncate">{tr.name}</span>
                          {tr.vrsPointsAwarded && (
                            <span className="text-emerald-400 font-bold text-[9px] shrink-0 ml-0.5">
                              +{tr.vrsPointsAwarded}
                            </span>
                          )}
                        </span>
                      ))}
                      {team.trophies.length > 2 && (
                        <span className="text-[10px] font-mono text-slate-500">
                          +{team.trophies.length - 2} ещё
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Zone: Form, Matches, Trophies & Points */}
              <div className="flex items-center gap-3 sm:gap-5 self-start md:self-center shrink-0">
                {/* Won Tournaments / Trophies */}
                <div className="text-left md:text-center min-w-[65px]">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    Трофеи
                  </div>
                  <div
                    className="flex items-center gap-1 mt-0.5 justify-start md:justify-center cursor-help"
                    title={
                      team.trophies && team.trophies.length > 0
                        ? `Выигранные турниры (${team.trophies.length}):\n${team.trophies.map((t) => `• ${t.name} (${t.year || 2026}) [${t.tier || 'Championship'}]`).join('\n')}`
                        : 'Команда пока не выиграла турниров'
                    }
                  >
                    <Trophy
                      className={`w-3.5 h-3.5 ${
                        (team.trophiesCount !== undefined ? team.trophiesCount : (team.trophies?.length || 0)) > 0
                          ? 'text-amber-400 fill-amber-400/20'
                          : 'text-slate-600'
                      }`}
                    />
                    <span
                      className={`text-xs font-mono font-bold ${
                        (team.trophiesCount !== undefined ? team.trophiesCount : (team.trophies?.length || 0)) > 0
                          ? 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {team.trophiesCount !== undefined ? team.trophiesCount : (team.trophies?.length || 0)}
                    </span>
                  </div>
                </div>

                {/* Dynamic Form Tag */}
                <div className="text-left md:text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    Форма
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {form.formModifier !== 0 ? (
                      <span
                        className={`text-xs font-mono font-bold flex items-center gap-1 ${
                          form.formModifier > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {form.formModifier > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {form.formModifier > 0 ? `+${form.formModifier}` : form.formModifier}
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-slate-500">0</span>
                    )}

                    {/* Streak dots */}
                    {form.recentResults.length > 0 && (
                      <div className="flex items-center gap-0.5 ml-1">
                        {form.recentResults.slice(0, 4).map((r, i) => (
                          <span
                            key={i}
                            className={`w-3.5 h-3.5 rounded text-[9px] font-mono font-bold flex items-center justify-center ${
                              r === 'W'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {r === 'W' ? 'В' : 'П'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Record */}
                <div className="text-left md:text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    Матчи
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-300 mt-0.5">
                    <span className="text-emerald-400">{teamWins}В</span>
                    <span className="text-slate-600 mx-1">-</span>
                    <span className="text-rose-400">{teamLosses}П</span>
                  </div>
                </div>

                {/* VRS Points */}
                <div className="text-right min-w-[70px]">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    VRS PTS
                  </div>
                  <div className="text-base font-black font-mono text-amber-400 tabular-nums mt-0.5">
                    {team.points}
                  </div>
                </div>
              </div>

              {/* Right Zone: Actions */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundFx.playClick();
                    onSelectTeamForMatch(team);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Выбрать для симуляции матча"
                >
                  <Play className="w-3 h-3 text-amber-400" />
                  <span>В матч</span>
                </button>

                <div className="p-1.5 text-slate-500 group-hover:text-amber-400 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
