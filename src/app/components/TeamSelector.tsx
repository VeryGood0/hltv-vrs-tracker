// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React, { useState } from 'react';
import { Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { Search, X, Trophy, Dices } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface TeamSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam: (team: Team) => void;
  teams: Team[];
  selectedTeamId?: string;
  opponentTeamId?: string;
  slotName: 'Team A' | 'Team B';
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  isOpen,
  onClose,
  onSelectTeam,
  teams,
  selectedTeamId,
  opponentTeamId,
  slotName
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'points' | 'name'>('points');

  if (!isOpen) return null;

  const sortedTeams = [...teams].sort((a, b) => {
    if (sortBy === 'points') return b.points - a.points;
    return a.name.localeCompare(b.name);
  });

  const filteredTeams = sortedTeams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.region.toLowerCase().includes(search.toLowerCase())
  );

  const handlePickRandom = () => {
    const eligible = teams.filter((t) => t.id !== opponentTeamId);
    if (eligible.length === 0) return;
    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    soundFx.playClick();
    onSelectTeam(picked);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111622] border border-slate-700/60 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Выберите {slotName === 'Team A' ? 'первую команду' : 'вторую команду'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              16 лучших CS2 составов с актуальным рейтингом VRS
            </p>
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

        {/* Search & Sort Controls */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск команды по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0d121c] border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={handlePickRandom}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              title="Выбрать случайную команду из списка"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Случайная</span>
            </button>

            <div className="flex items-center gap-1 bg-[#0d121c] p-1 border border-slate-800 rounded-xl">
              <button
                onClick={() => {
                  soundFx.playClick();
                  setSortBy('points');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  sortBy === 'points'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                По рейтингу
              </button>
              <button
                onClick={() => {
                  soundFx.playClick();
                  setSortBy('name');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  sortBy === 'name'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                А-Я
              </button>
            </div>
          </div>
        </div>

        {/* Team Grid */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-800/40">
          {filteredTeams.map((team, index) => {
            const isSelected = team.id === selectedTeamId;
            const isOpponent = team.id === opponentTeamId;

            return (
              <button
                key={team.id}
                disabled={isOpponent}
                onClick={() => {
                  soundFx.playClick();
                  onSelectTeam(team);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-150 text-left pt-2.5 ${
                  isSelected
                    ? 'bg-amber-500/15 border border-amber-500/40'
                    : isOpponent
                    ? 'opacity-40 cursor-not-allowed bg-slate-900/20'
                    : 'hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-slate-500 w-5 text-right shrink-0">
                    #{index + 1}
                  </span>
                  <TeamLogo team={team} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate text-sm">
                        {team.name}
                      </span>
                      {(team.trophiesCount !== undefined ? team.trophiesCount : (team.trophies?.length || 0)) > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30 shrink-0">
                          <Trophy className="w-2.5 h-2.5" />
                          <span>{team.trophiesCount !== undefined ? team.trophiesCount : team.trophies?.length}</span>
                        </span>
                      )}
                      {isOpponent && (
                        <span className="text-[11px] text-slate-500 italic">
                          (уже выбран)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-xs sm:max-w-sm">
                      {(team.rosterSnippet || []).join(', ')}
                      {team.coach && <span className="text-slate-500"> (тр. {team.coach})</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pl-2">
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-amber-400 tabular-nums">
                      {team.points}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      VRS PTS
                    </div>
                  </div>
                  {isSelected && (
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
