import React, { useState } from 'react';
import { Team, ActiveDutyMap, MapMatchupComparison } from '../types';
import { TeamLogo } from './TeamLogo';
import { MAP_METADATA } from '../data/mapPool';
import {
  getTeamProfile,
  compareAllMaps,
  simulateCS2MapScore,
  applyDynamicMapOutcome,
  MapRoundScoreResult
} from '../utils/mapSimulation';
import {
  Swords,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Star,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface MapMatchupComparisonViewProps {
  teamA: Team;
  teamB: Team;
  onUpdateTeamAProfile?: (updatedTeam: Team) => void;
  onUpdateTeamBProfile?: (updatedTeam: Team) => void;
  onResetToBaseline?: () => void;
}

export const MapMatchupComparisonView: React.FC<MapMatchupComparisonViewProps> = ({
  teamA,
  teamB,
  onUpdateTeamAProfile,
  onUpdateTeamBProfile,
  onResetToBaseline
}) => {
  const profileA = getTeamProfile(teamA);
  const profileB = getTeamProfile(teamB);
  const matchups = compareAllMaps(teamA, teamB);

  const [simulatedResult, setSimulatedResult] = useState<MapRoundScoreResult | null>(null);
  const [activeTab, setActiveTab] = useState<'comparison' | 'analytics'>('comparison');

  const handleSimulateSingleMap = (mapName: ActiveDutyMap) => {
    soundFx.playClick();
    const result = simulateCS2MapScore(teamA, teamB, mapName);
    setSimulatedResult(result);

    // Apply dynamic progression
    const aWon = result.scoreA > result.scoreB;
    if (onUpdateTeamAProfile && profileA) {
      const updatedProfA = applyDynamicMapOutcome(
        profileA,
        mapName,
        aWon,
        aWon ? result.scoreA : result.scoreB,
        aWon ? result.scoreB : result.scoreA,
        teamB
      );
      onUpdateTeamAProfile({ ...teamA, mapProfile: updatedProfA });
    }

    if (onUpdateTeamBProfile && profileB) {
      const updatedProfB = applyDynamicMapOutcome(
        profileB,
        mapName,
        !aWon,
        !aWon ? result.scoreB : result.scoreA,
        !aWon ? result.scoreA : result.scoreB,
        teamA
      );
      onUpdateTeamBProfile({ ...teamB, mapProfile: updatedProfB });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. TOP BLOCK: TEAM A VS TEAM B (Overall Rating, Form, Best/Worst Maps) */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glows */}
        <div
          className="absolute -top-24 -left-20 w-72 h-44 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: teamA.primaryColor || '#00e599' }}
        />
        <div
          className="absolute -top-24 -right-20 w-72 h-44 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: teamB.primaryColor || '#fcee21' }}
        />

        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Анализ сил и Active Duty Map Pool
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              Active Duty: 7 карт (вкл. Cache)
            </span>
            {onResetToBaseline && (
              <button
                onClick={() => {
                  soundFx.playClick();
                  onResetToBaseline();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title="Обнулить статистику карт команд (0 побед, 0 поражений, чистый маппул)"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Обнулить карты</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Team Profile Cards Matching Prompt Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
          {/* TEAM A Profile Block */}
          <div className="lg:col-span-5 bg-[#101524]/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 relative shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <TeamLogo team={teamA} size="md" />
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400">
                    TEAM A
                  </span>
                  <h4 className="text-xl font-extrabold text-white leading-tight">
                    {teamA.name}
                  </h4>
                </div>
              </div>

              {/* Overall Rating & Form Badges */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">Рейтинг</div>
                  <div className="text-base font-extrabold font-mono text-amber-400">
                    {profileA.overallRating}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">Форма</div>
                  <div className="text-base font-extrabold font-mono text-emerald-400 flex items-center gap-0.5 justify-end">
                    <TrendingUp className="w-3 h-3" />
                    {profileA.currentForm}
                  </div>
                </div>
              </div>
            </div>

            {/* Best & Worst Maps */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <Star className="w-3 h-3 fill-emerald-400" /> Лучшие карты
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {profileA.bestMaps.length === 0 ? (
                    <span className="text-slate-500 text-[10px]">Ещё не сформировано</span>
                  ) : (
                    profileA.bestMaps.map((map) => {
                      const st = profileA.maps[map];
                      return (
                        <span
                          key={map}
                          className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]"
                        >
                          {map} <span className="text-white ml-0.5">{st?.mapRating || '—'}</span>
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Худшая / бан
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {profileA.worstMaps.length === 0 ? (
                    <span className="text-slate-500 text-[10px]">Ещё не сформировано</span>
                  ) : (
                    profileA.worstMaps.map((map) => {
                      const st = profileA.maps[map];
                      return (
                        <span
                          key={map}
                          className="px-2 py-0.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 font-bold text-[11px]"
                        >
                          {map} <span className="text-white ml-0.5">{st?.mapRating || '—'}</span>
                          {st?.isPermanentBan && (
                            <span className="text-[9px] text-rose-400 ml-1 font-normal">(бан)</span>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* VS Center Pillar */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 lg:py-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-black text-black text-sm shadow-lg shadow-amber-500/20">
              VS
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase mt-1">matchup</span>
          </div>

          {/* TEAM B Profile Block */}
          <div className="lg:col-span-5 bg-[#101524]/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 relative shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <TeamLogo team={teamB} size="md" />
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400">
                    TEAM B
                  </span>
                  <h4 className="text-xl font-extrabold text-white leading-tight">
                    {teamB.name}
                  </h4>
                </div>
              </div>

              {/* Overall Rating & Form Badges */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">Рейтинг</div>
                  <div className="text-base font-extrabold font-mono text-amber-400">
                    {profileB.overallRating}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">Форма</div>
                  <div className="text-base font-extrabold font-mono text-emerald-400 flex items-center gap-0.5 justify-end">
                    <TrendingUp className="w-3 h-3" />
                    {profileB.currentForm}
                  </div>
                </div>
              </div>
            </div>

            {/* Best & Worst Maps */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <Star className="w-3 h-3 fill-emerald-400" /> Лучшие карты
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {profileB.bestMaps.map((map) => {
                    const st = profileB.maps[map];
                    return (
                      <span
                        key={map}
                        className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]"
                      >
                        {map} <span className="text-white ml-0.5">{st?.mapRating || '—'}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Худшая / бан
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {profileB.worstMaps.map((map) => {
                    const st = profileB.maps[map];
                    return (
                      <span
                        key={map}
                        className="px-2 py-0.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 font-bold text-[11px]"
                      >
                        {map} <span className="text-white ml-0.5">{st?.mapRating || '—'}</span>
                        {st?.isPermanentBan && (
                          <span className="text-[9px] text-rose-400 ml-1 font-normal">(бан)</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insight Notice: ОБЩАЯ СИЛА ≠ СИЛА НА КАРТЕ */}
        <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center gap-2.5 text-xs text-slate-300 font-mono">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-white">Правило симулятора CS2:</strong> Общий рейтинг не гарантирует победу на конкретной карте. Если аутсайдер играет свою коронную карту против слабого пика фаворита, он получает реальное преимущество и высокий шанс победы!
          </span>
        </div>
      </div>

      {/* 2. MAP-BY-MAP COMPARISON TABLE (All 7 Active Duty Maps) */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="text-base font-bold text-white tracking-wide">
                Сравнение карт (Map Pool Matchup)
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                Рейтинги от 0 до 100, винрейты и вероятности победы на каждой из 7 карт
              </p>
            </div>
          </div>
        </div>

        {/* The Exact Comparison Table requested by the user */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Карта (Map)</th>
                <th className="py-3 px-3 text-center">{teamA.name}</th>
                <th className="py-3 px-4 text-center">Сравнение сил & Преимущество</th>
                <th className="py-3 px-3 text-center">{teamB.name}</th>
                <th className="py-3 px-3 text-center">Шанс победы</th>
                <th className="py-3 px-3 text-right">Тест карты</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {matchups.map((m) => {
                const meta = MAP_METADATA[m.mapName];
                const statsA = profileA.maps[m.mapName];
                const statsB = profileB.maps[m.mapName];
                const probAPercent = Math.round(m.winProbA * 100);
                const probBPercent = 100 - probAPercent;

                const isFavA = m.diff >= 4;
                const isFavB = m.diff <= -4;

                return (
                  <tr
                    key={m.mapName}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Map Name & Tag */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: meta.themeColor }}
                        />
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            {m.mapName}
                            {m.mapName === 'Cache' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-lime-500/20 text-lime-400 border border-lime-500/30 font-bold">
                                NEW
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {meta.ctAdvantage}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Team A Rating & Winrate */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`text-base font-extrabold tabular-nums ${
                            m.ratingA >= 85
                              ? 'text-emerald-400'
                              : m.ratingA <= 60
                              ? 'text-rose-400'
                              : 'text-white'
                          }`}
                        >
                          {m.ratingA}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {statsA?.winRate}% WR ({statsA?.mapsPlayed || 0} карт)
                        </span>
                        {statsA?.isPermanentBan && (
                          <span className="text-[9px] text-rose-400 font-bold mt-0.5">
                            бан {statsA.banRate}%
                          </span>
                        )}
                        {statsA?.isFavoritePick && (
                          <span className="text-[9px] text-emerald-400 font-bold mt-0.5">
                            пик {statsA.pickRate}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Visual Comparison / Spread Bar */}
                    <td className="py-3 px-4 text-center">
                      <div className="max-w-[200px] mx-auto space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className={isFavA ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                            {m.ratingA}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isFavA
                                ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                : isFavB
                                ? 'bg-amber-500/20 text-amber-300 font-bold'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isFavA
                              ? `+${m.diff} ${teamA.name}`
                              : isFavB
                              ? `+${Math.abs(m.diff)} ${teamB.name}`
                              : 'Равные'}
                          </span>
                          <span className={isFavB ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                            {m.ratingB}
                          </span>
                        </div>

                        {/* Dual Bar Graphic */}
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 transition-all"
                            style={{ width: `${probAPercent}%` }}
                          />
                          <div
                            className="bg-amber-500 transition-all"
                            style={{ width: `${probBPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Team B Rating & Winrate */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`text-base font-extrabold tabular-nums ${
                            m.ratingB >= 85
                              ? 'text-emerald-400'
                              : m.ratingB <= 60
                              ? 'text-rose-400'
                              : 'text-white'
                          }`}
                        >
                          {m.ratingB}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {statsB?.winRate}% WR ({statsB?.mapsPlayed || 0} карт)
                        </span>
                        {statsB?.isPermanentBan && (
                          <span className="text-[9px] text-rose-400 font-bold mt-0.5">
                            бан {statsB.banRate}%
                          </span>
                        )}
                        {statsB?.isFavoritePick && (
                          <span className="text-[9px] text-emerald-400 font-bold mt-0.5">
                            пик {statsB.pickRate}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Win Chance Probability */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 font-bold">
                        <span
                          className={probAPercent >= 50 ? 'text-emerald-400' : 'text-slate-400'}
                        >
                          {probAPercent}%
                        </span>
                        <span className="text-slate-600">:</span>
                        <span
                          className={probBPercent >= 50 ? 'text-amber-400' : 'text-slate-400'}
                        >
                          {probBPercent}%
                        </span>
                      </div>
                    </td>

                    {/* Action: Simulate Single Map */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleSimulateSingleMap(m.mapName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black font-bold text-xs border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer shadow-sm"
                        title={`Симулировать раунд-за-раундом на ${m.mapName}`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Сыграть</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SIMULATED MAP RESULT POPUP */}
      {simulatedResult && (
        <div className="bg-[#121929] border border-amber-500/40 rounded-3xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-base font-extrabold text-white">
                  Результат симуляции карты: {simulatedResult.mapName}
                </h4>
                <p className="text-xs text-amber-300 font-mono mt-0.5">
                  {simulatedResult.narrative}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSimulatedResult(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            {/* Team A */}
            <div className="flex items-center gap-3">
              <TeamLogo team={teamA} size="sm" />
              <div>
                <span className="font-bold text-white text-sm">{teamA.name}</span>
                <div className="text-[11px] text-slate-400">
                  Половины: {simulatedResult.half1A} + {simulatedResult.half2A}
                </div>
              </div>
            </div>

            {/* Score Center */}
            <div className="flex items-center gap-4 text-center">
              <div
                className={`text-3xl font-black ${
                  simulatedResult.scoreA > simulatedResult.scoreB
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {simulatedResult.scoreA}
              </div>
              <span className="text-slate-600 text-xl font-bold">:</span>
              <div
                className={`text-3xl font-black ${
                  simulatedResult.scoreB > simulatedResult.scoreA
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                {simulatedResult.scoreB}
              </div>
            </div>

            {/* Team B */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="font-bold text-white text-sm">{teamB.name}</span>
                <div className="text-[11px] text-slate-400">
                  Половины: {simulatedResult.half1B} + {simulatedResult.half2B}
                </div>
              </div>
              <TeamLogo team={teamB} size="sm" />
            </div>
          </div>

          {/* Dynamic progression announcement */}
          <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Статистика команд на {simulatedResult.mapName} динамически обновлена (+/- к рейтингу и форме)!
            </span>

            <button
              onClick={() => handleSimulateSingleMap(simulatedResult.mapName)}
              className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
            >
              Сыграть ещё раз
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
