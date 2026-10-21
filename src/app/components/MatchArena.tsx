// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React, { useState, useMemo } from 'react';
import {
  Team,
  MatchFormat,
  OutcomeOdds,
  TeamFormStats,
  VetoState,
  MatchSeriesMapResult,
  ActiveDutyMap
} from '../types';
import { TeamLogo } from './TeamLogo';
import { MAP_METADATA } from '../data/mapPool';
import {
  getTeamProfile,
  compareAllMaps,
  calculateMapMatchup
} from '../utils/mapSimulation';
import {
  ArrowLeftRight,
  Edit3,
  Volume2,
  VolumeX,
  Swords,
  Play,
  FastForward,
  RotateCcw,
  Trophy,
  Flame,
  TrendingUp,
  TrendingDown,
  Dices,
  Crosshair,
  CheckCircle2,
  Shield,
  ChevronDown,
  ChevronUp,
  TableProperties,
  BarChart3,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface LastMatchResult {
  deltaPointsA?: number;
  deltaPointsB?: number;
  deltaFormA?: number;
  deltaFormB?: number;
  autoUpdatedPoints?: boolean;
}

interface MatchArenaProps {
  teamA: Team;
  teamB: Team;
  format: MatchFormat;
  onSelectFormat: (format: MatchFormat) => void;
  onOpenSelectorA: () => void;
  onOpenSelectorB: () => void;
  onSwapTeams: () => void;
  onRandomizeBothTeams: () => void;
  onRandomizeTeamA: () => void;
  onRandomizeTeamB: () => void;
  onOpenPointsEditor: () => void;
  scoreA: number;
  scoreB: number;
  requiredWins: number;
  seriesProbA: number;
  seriesProbB: number;
  singleMapProbA: number;
  singleMapProbB: number;
  outcomeOdds: OutcomeOdds[];
  formA: TeamFormStats & { formModifier: number };
  formB: TeamFormStats & { formModifier: number };
  h2h: { winsA: number; winsB: number; h2hModifierA: number };
  isMuted: boolean;
  onToggleMute: () => void;
  status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED';
  lastMatchResult?: LastMatchResult | null;
  onSimulateNextPoint: () => void;
  onSimulateFullMatch: () => void;
  onResetMatch: () => void;
  vetoState?: VetoState | null;
  onOpenVetoModal?: () => void;
  seriesMapsPlayed?: MatchSeriesMapResult[];
}

export const MatchArena: React.FC<MatchArenaProps> = ({
  teamA,
  teamB,
  format,
  onSelectFormat,
  onOpenSelectorA,
  onOpenSelectorB,
  onSwapTeams,
  onRandomizeBothTeams,
  onRandomizeTeamA,
  onRandomizeTeamB,
  onOpenPointsEditor,
  scoreA,
  scoreB,
  requiredWins,
  seriesProbA,
  seriesProbB,
  outcomeOdds,
  formA,
  formB,
  h2h,
  isMuted,
  onToggleMute,
  status,
  lastMatchResult,
  onSimulateNextPoint,
  onSimulateFullMatch,
  onResetMatch,
  vetoState,
  onOpenVetoModal,
  seriesMapsPlayed = []
}) => {
  const [expandedMapIdx, setExpandedMapIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'match' | 'analytics' | 'comparison'>('match');
  const [simulationMode, setSimulationMode] = useState<'step_by_step' | 'full'>('step_by_step');

  const probAPercent = Math.round(seriesProbA * 100);
  const probBPercent = 100 - probAPercent;

  const isFinished = status === 'FINISHED';
  const winnerTeam = scoreA > scoreB ? teamA : teamB;
  const aWon = isFinished && scoreA > scoreB;
  const bWon = isFinished && scoreB > scoreA;

  // Profiles & Map Comparisons
  const profileA = useMemo(() => getTeamProfile(teamA), [teamA]);
  const profileB = useMemo(() => getTeamProfile(teamB), [teamB]);
  const mapComparisons = useMemo(() => compareAllMaps(teamA, teamB), [teamA, teamB]);

  // Best & Worst Maps for Team A
  const sortedMapsA = useMemo(() => {
    return Object.entries(profileA.maps)
      .map(([name, s]) => ({ name: name as ActiveDutyMap, rating: s.mapRating }))
      .sort((a, b) => b.rating - a.rating);
  }, [profileA]);

  const bestMapsA = sortedMapsA.slice(0, 3).map((m) => m.name);
  const worstMapsA = sortedMapsA.slice(-2).map((m) => m.name);

  // Best & Worst Maps for Team B
  const sortedMapsB = useMemo(() => {
    return Object.entries(profileB.maps)
      .map(([name, s]) => ({ name: name as ActiveDutyMap, rating: s.mapRating }))
      .sort((a, b) => b.rating - a.rating);
  }, [profileB]);

  const bestMapsB = sortedMapsB.slice(0, 3).map((m) => m.name);
  const worstMapsB = sortedMapsB.slice(-2).map((m) => m.name);

  const winRateA = (formA.wins + formA.losses) > 0 ? Math.round((formA.wins / (formA.wins + formA.losses)) * 100) : 50;
  const winRateB = (formB.wins + formB.losses) > 0 ? Math.round((formB.wins / (formB.wins + formB.losses)) * 100) : 50;

  // Post-Veto Series Probability Calculation
  const postVetoProb = useMemo(() => {
    if (!vetoState?.isCompleted || !vetoState.selectedMapsInOrder.length) {
      return null;
    }
    const mapProbs = vetoState.selectedMapsInOrder.map((m) => {
      const match = calculateMapMatchup(teamA, teamB, m.mapName, {
        pickedBy: m.pickedBy,
        isDecider: m.isDecider
      });
      return match.winProbA;
    });
    const avgProbA = mapProbs.reduce((acc, p) => acc + p, 0) / mapProbs.length;
    const postA = Math.round(avgProbA * 100);
    return {
      postA,
      postB: 100 - postA
    };
  }, [vetoState, teamA, teamB]);

  // Current Next Map info for Step-by-Step Mode
  const nextMapIndex = seriesMapsPlayed.length;
  const nextMapObj = vetoState?.selectedMapsInOrder?.[nextMapIndex];
  const nextMapMatchup = nextMapObj
    ? calculateMapMatchup(teamA, teamB, nextMapObj.mapName, {
        pickedBy: nextMapObj.pickedBy,
        isDecider: nextMapObj.isDecider
      })
    : null;

  return (
    <div className="relative w-full rounded-3xl bg-[#0f1420]/95 border border-slate-800/80 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Top Header Bar: Format Selector & Sound */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-900/60 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5" />
            CS2 MATCH CENTER
          </span>
          <span className="text-slate-600 text-xs hidden sm:inline">|</span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Матч до {requiredWins} {requiredWins === 1 ? 'победы' : 'побед'} ({format})
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#090d14] p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('match');
            }}
            className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === 'match'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Матч
          </button>
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('analytics');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Аналитика</span>
          </button>
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('comparison');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TableProperties className="w-3 h-3" />
            <span>Сравнение карт</span>
          </button>
        </div>

        {/* Right Tools: Veto modal, Format, Sound */}
        <div className="flex items-center gap-2">
          {onOpenVetoModal && (
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenVetoModal();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                vetoState?.isCompleted
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
              }`}
              title="Открыть симулятор CS2 Map Veto"
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {vetoState?.isCompleted ? 'Вето завершено' : 'Map Veto'}
              </span>
              <span className="sm:hidden">Veto</span>
              {vetoState?.isCompleted && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse ml-0.5" />
              )}
            </button>
          )}

          <div className="flex items-center p-1 bg-[#090d14] rounded-xl border border-slate-800">
            {(['BO1', 'BO3', 'BO5'] as MatchFormat[]).map((f) => (
              <button
                key={f}
                disabled={status === 'IN_PROGRESS'}
                onClick={() => {
                  soundFx.playClick();
                  onSelectFormat(f);
                }}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                  format === f
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-slate-400 hover:text-white disabled:opacity-40'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onToggleMute();
            }}
            className="p-2 text-slate-400 hover:text-white bg-[#090d14] hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors cursor-pointer"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-8 space-y-6">
        {/* MATCH CENTER HEADER & TEAMS */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          {/* TEAM A CARD */}
          <div
            className={`md:col-span-4 flex flex-col items-center text-center p-5 rounded-2xl transition-all ${
              aWon
                ? 'bg-amber-500/10 border-2 border-amber-500/60 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/40 border border-slate-800/60'
            }`}
          >
            <div className="relative group cursor-pointer" onClick={onOpenSelectorA}>
              <TeamLogo team={teamA} size="xl" className="transform group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs text-xs font-semibold text-white">
                Сменить команду
              </div>
            </div>

            <h2 className="mt-3 text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {teamA.name}
              {aWon && (
                <span className="text-amber-400 text-xs font-mono uppercase bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                  Победитель
                </span>
              )}
            </h2>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                disabled={status === 'IN_PROGRESS'}
                onClick={onOpenSelectorA}
                className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
              >
                Сменить
              </button>
              <button
                disabled={status === 'IN_PROGRESS'}
                onClick={() => {
                  soundFx.playClick();
                  onRandomizeTeamA();
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors cursor-pointer disabled:opacity-40"
                title="Случайная команда"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Рандом</span>
              </button>
            </div>

            {/* Team A Key Metrics (Overall Rating, Form, Best/Worst) */}
            <div className="mt-3.5 w-full bg-[#090d14] rounded-xl p-3 border border-slate-800 text-left space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Общий рейтинг:</span>
                <span className="text-amber-400 font-bold">{profileA.overallRating}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Титулы / Трофеи:</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>{teamA.trophiesCount !== undefined ? teamA.trophiesCount : (teamA.trophies?.length || 0)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Текущая форма:</span>
                <span className="text-white font-bold flex items-center gap-1">
                  {profileA.currentForm}
                  {formA.formModifier !== 0 && (
                    <span className={formA.formModifier > 0 ? 'text-emerald-400 text-[10px]' : 'text-rose-400 text-[10px]'}>
                      ({formA.formModifier > 0 ? `+${formA.formModifier}` : formA.formModifier})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Лучшие карты:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[150px] text-right">
                  {bestMapsA.join(' / ')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Худшие карты:</span>
                <span className="text-rose-400 font-bold truncate max-w-[150px] text-right">
                  {worstMapsA.join(' / ')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Винрейт (L5):</span>
                <span className="text-slate-200">
                  {winRateA}% ({formA.wins}В - {formA.losses}П)
                </span>
              </div>
            </div>

            {/* Streak & Lineup */}
            <div className="mt-2 text-xs text-slate-400 font-medium truncate max-w-full">
              {(teamA.rosterSnippet || []).slice(0, 5).join(' · ')}
            </div>
          </div>

          {/* MIDDLE: SERIES SCORE & SIMULATION CONTROLS */}
          <div className="md:col-span-3 flex flex-col items-center justify-center text-center px-2 py-2">
            {/* Simulation Mode Toggle (Step by Step vs Full Match) */}
            <div className="mb-3 flex items-center bg-[#090d14] p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
              <button
                disabled={status === 'IN_PROGRESS'}
                onClick={() => setSimulationMode('step_by_step')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  simulationMode === 'step_by_step'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Пошаговая симуляция: карта за картой с кнопкой перехода"
              >
                По картам
              </button>
              <button
                disabled={status === 'IN_PROGRESS'}
                onClick={() => setSimulationMode('full')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  simulationMode === 'full'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Автоматическая симуляция всей серии сразу"
              >
                Весь матч
              </button>
            </div>

            {/* Big Live Score */}
            <div className="flex items-center gap-3 font-mono font-black text-5xl sm:text-6xl text-white tracking-wider tabular-nums">
              <span className={scoreA > scoreB ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-slate-200'}>
                {scoreA}
              </span>
              <span className="text-slate-600 text-3xl sm:text-4xl">:</span>
              <span className={scoreB > scoreA ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-slate-200'}>
                {scoreB}
              </span>
            </div>

            <div className="text-xs font-mono text-slate-400 mt-1">
              {format} · до {requiredWins} {requiredWins === 1 ? 'победы' : 'побед'}
            </div>

            {/* Swap & Random Match Controls */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5">
              <button
                disabled={status === 'IN_PROGRESS'}
                onClick={() => {
                  soundFx.playClick();
                  onSwapTeams();
                }}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                title="Поменять команды местами"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={status === 'IN_PROGRESS'}
                onClick={() => {
                  soundFx.playClick();
                  onRandomizeBothTeams();
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-400 hover:text-black bg-amber-500/15 hover:bg-amber-500 border border-amber-500/40 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-40"
                title="Случайная пара команд"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Рандом 2</span>
              </button>
            </div>

            {/* Primary Action Buttons based on Mode */}
            <div className="mt-4 flex flex-col gap-2 w-full max-w-[210px]">
              {!isFinished ? (
                simulationMode === 'step_by_step' ? (
                  <>
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        onSimulateNextPoint();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>
                        {seriesMapsPlayed.length === 0
                          ? 'Сыграть Карту 1'
                          : `Следующая карта (${seriesMapsPlayed.length + 1})`}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        soundFx.playClick();
                        onSimulateFullMatch();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      <FastForward className="w-3.5 h-3.5 text-amber-400" />
                      <span>Симулировать весь матч</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        onSimulateFullMatch();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                    >
                      <FastForward className="w-4 h-4 fill-black" />
                      <span>Симулировать весь матч</span>
                    </button>

                    <button
                      onClick={() => {
                        soundFx.playClick();
                        onSimulateNextPoint();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-amber-400" />
                      <span>Сыграть по 1 карте</span>
                    </button>
                  </>
                )
              ) : (
                <button
                  onClick={() => {
                    soundFx.playClick();
                    onResetMatch();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Сыграть заново</span>
                </button>
              )}

              {!isFinished && (scoreA > 0 || scoreB > 0 || seriesMapsPlayed.length > 0) && (
                <button
                  onClick={() => {
                    soundFx.playClick();
                    onResetMatch();
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors cursor-pointer"
                >
                  Сбросить текущую серию
                </button>
              )}
            </div>
          </div>

          {/* TEAM B CARD */}
          <div
            className={`md:col-span-4 flex flex-col items-center text-center p-5 rounded-2xl transition-all ${
              bWon
                ? 'bg-amber-500/10 border-2 border-amber-500/60 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/40 border border-slate-800/60'
            }`}
          >
            <div className="relative group cursor-pointer" onClick={onOpenSelectorB}>
              <TeamLogo team={teamB} size="xl" className="transform group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs text-xs font-semibold text-white">
                Сменить команду
              </div>
            </div>

            <h2 className="mt-3 text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {teamB.name}
              {bWon && (
                <span className="text-amber-400 text-xs font-mono uppercase bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                  Победитель
                </span>
              )}
            </h2>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                disabled={status === 'IN_PROGRESS'}
                onClick={onOpenSelectorB}
                className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
              >
                Сменить
              </button>
              <button
                disabled={status === 'IN_PROGRESS'}
                onClick={() => {
                  soundFx.playClick();
                  onRandomizeTeamB();
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors cursor-pointer disabled:opacity-40"
                title="Случайная команда"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Рандом</span>
              </button>
            </div>

            {/* Team B Key Metrics */}
            <div className="mt-3.5 w-full bg-[#090d14] rounded-xl p-3 border border-slate-800 text-left space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Общий рейтинг:</span>
                <span className="text-amber-400 font-bold">{profileB.overallRating}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Титулы / Трофеи:</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>{teamB.trophiesCount !== undefined ? teamB.trophiesCount : (teamB.trophies?.length || 0)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Текущая форма:</span>
                <span className="text-white font-bold flex items-center gap-1">
                  {profileB.currentForm}
                  {formB.formModifier !== 0 && (
                    <span className={formB.formModifier > 0 ? 'text-emerald-400 text-[10px]' : 'text-rose-400 text-[10px]'}>
                      ({formB.formModifier > 0 ? `+${formB.formModifier}` : formB.formModifier})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Лучшие карты:</span>
                <span className="text-emerald-400 font-bold truncate max-w-[150px] text-right">
                  {bestMapsB.join(' / ')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Худшие карты:</span>
                <span className="text-rose-400 font-bold truncate max-w-[150px] text-right">
                  {worstMapsB.join(' / ')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Винрейт (L5):</span>
                <span className="text-slate-200">
                  {winRateB}% ({formB.wins}В - {formB.losses}П)
                </span>
              </div>
            </div>

            {/* Lineup */}
            <div className="mt-2 text-xs text-slate-400 font-medium truncate max-w-full">
              {(teamB.rosterSnippet || []).slice(0, 5).join(' · ')}
            </div>
          </div>
        </div>

        {/* TAB 1: MATCH VIEW (Active Map, Veto, Played Cards) */}
        {activeTab === 'match' && (
          <div className="space-y-6">
            {/* PREDICTIVE PROBABILITY BAR (PRE-MATCH VS POST-VETO) */}
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs gap-2 font-mono">
                <div className="flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300 font-bold">Вероятность победы в серии:</span>
                  <span className="text-amber-400">
                    {postVetoProb ? 'Пересчитана после Veto' : 'Предварительный прогноз'}
                  </span>
                </div>

                {postVetoProb && (
                  <div className="text-[11px] text-slate-400">
                    До вето было: {teamA.name} {probAPercent}% · {probBPercent}% {teamB.name}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-7 bg-slate-950 rounded-xl overflow-hidden p-1 flex border border-slate-800 shadow-inner">
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center justify-start pl-3 text-xs font-mono font-bold text-black"
                  style={{
                    width: `${Math.max(15, Math.min(85, postVetoProb ? postVetoProb.postA : probAPercent))}%`,
                    backgroundColor: teamA.primaryColor || '#f59e0b'
                  }}
                >
                  <span className="truncate">
                    {teamA.name} {postVetoProb ? postVetoProb.postA : probAPercent}%
                  </span>
                </div>
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3 text-xs font-mono font-bold text-black ml-auto"
                  style={{
                    width: `${Math.max(15, Math.min(85, postVetoProb ? postVetoProb.postB : probBPercent))}%`,
                    backgroundColor: teamB.primaryColor || '#38bdf8'
                  }}
                >
                  <span className="truncate">
                    {postVetoProb ? postVetoProb.postB : probBPercent}% {teamB.name}
                  </span>
                </div>
              </div>
            </div>

            {/* STEP BY STEP NEXT MAP CALLOUT (IF IN PROGRESS) */}
            {!isFinished && nextMapObj && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-mono font-black text-amber-400 text-sm">
                    M{nextMapIndex + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                        Следующая карта к розыгрышу:
                      </span>
                      <span className="text-white font-extrabold text-sm sm:text-base">
                        {nextMapObj.mapName}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          nextMapObj.isDecider
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {nextMapObj.isDecider ? 'Десидер' : `Пик ${nextMapObj.pickedBy}`}
                      </span>
                    </div>

                    {nextMapMatchup && (
                      <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                        Шансы перед картой: {teamA.name} {Math.round(nextMapMatchup.winProbA * 100)}% · {Math.round(nextMapMatchup.winProbB * 100)}% {teamB.name}
                        {nextMapMatchup.favorite !== 'even' && (
                          <span className="text-amber-400 ml-1.5">
                            ({nextMapMatchup.favorite === 'teamA' ? teamA.name : teamB.name} фаворит)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundFx.playClick();
                    onSimulateNextPoint();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Сыграть {nextMapObj.mapName}</span>
                </button>
              </div>
            )}

            {/* PLAYED & SCHEDULED MAPS LIST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-emerald-400" />
                  Карты серии ({vetoState?.selectedMapsInOrder.length || format})
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Сыграно: {seriesMapsPlayed.length} из {vetoState?.selectedMapsInOrder.length || (format === 'BO1' ? 1 : format === 'BO3' ? 3 : 5)}
                </span>
              </div>

              {vetoState?.selectedMapsInOrder && vetoState.selectedMapsInOrder.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {vetoState.selectedMapsInOrder.map((m, idx) => {
                    const played = seriesMapsPlayed.find((p) => p.mapName === m.mapName);
                    const isNext = !played && !isFinished && idx === seriesMapsPlayed.length;
                    const meta = MAP_METADATA[m.mapName];
                    const pickerTeam = m.pickedBy === teamA.id ? teamA : m.pickedBy === teamB.id ? teamB : null;
                    const isExpanded = expandedMapIdx === idx;

                    return (
                      <div
                        key={m.mapName + idx}
                        onClick={() => played && setExpandedMapIdx(isExpanded ? null : idx)}
                        className={`p-4 rounded-2xl border transition-all ${
                          played
                            ? 'bg-[#101524] border-slate-700/80 cursor-pointer hover:border-slate-500'
                            : isNext
                            ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                            : 'bg-slate-900/30 border-slate-800/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-mono text-slate-400 font-bold">
                            #{idx + 1} {m.isDecider ? 'Decider' : `Пик ${pickerTeam?.name || m.pickedBy}`}
                          </span>
                          {played ? (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Сыграна
                            </span>
                          ) : isNext ? (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              Следующая
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500">
                              Ожидает
                            </span>
                          )}
                        </div>

                        <div className="text-base font-extrabold text-white flex items-center justify-between">
                          <span>{m.mapName}</span>
                          <span className="text-xs font-normal text-slate-400">
                            {meta?.russianName}
                          </span>
                        </div>

                        {played ? (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-xl text-amber-400">
                                {played.scoreA} : {played.scoreB}
                              </span>
                              <span className="text-xs font-bold text-white flex items-center gap-1">
                                <TeamLogo
                                  team={played.winnerTeamId === teamA.id ? teamA : teamB}
                                  className="w-4 h-4 object-contain"
                                />
                                {played.winnerTeamId === teamA.id ? teamA.name : teamB.name}
                              </span>
                            </div>

                            <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center justify-between">
                              <span>
                                (1-я: {played.half1A}:{played.half1B} / 2-я: {played.half2A}:{played.half2B}
                                {played.overtime && played.otScoreA !== undefined && played.otScoreB !== undefined
                                  ? ` / OT: ${played.otScoreA}:${played.otScoreB}`
                                  : ''}
                                )
                              </span>
                              {played.overtime && (
                                <span className="text-amber-400 font-bold">OT</span>
                              )}
                            </div>

                            {played.tacticalReason && (
                              <div className="mt-2 text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                                {played.tacticalReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 pt-2 border-t border-slate-800/60 text-xs font-mono text-slate-400">
                            {isNext ? 'Готова к симуляции' : 'В очереди'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-400 font-mono">
                    Карты будут утверждены после проведения Map Veto.
                  </div>
                  {onOpenVetoModal && (
                    <button
                      onClick={onOpenVetoModal}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Пройти Map Veto
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* FINISHED SERIES REPORT */}
            {isFinished && (
              <div className="p-5 bg-gradient-to-r from-amber-500/15 via-[#111724] to-slate-900 border border-amber-500/50 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={winnerTeam} size="md" />
                    <div>
                      <div className="text-[11px] font-mono text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        Аналитический отчет матча
                      </div>
                      <div className="text-xl font-black text-white mt-0.5">
                        Победа {winnerTeam.name} со счетом {scoreA}:{scoreB} в серии {format}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onResetMatch();
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    Сыграть реванш
                  </button>
                </div>

                {lastMatchResult && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">Изменение формы:</span>
                    <span className={lastMatchResult.deltaFormA && lastMatchResult.deltaFormA > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {teamA.name} {lastMatchResult.deltaFormA && lastMatchResult.deltaFormA > 0 ? `+${lastMatchResult.deltaFormA}` : lastMatchResult.deltaFormA} pts
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className={lastMatchResult.deltaFormB && lastMatchResult.deltaFormB > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {teamB.name} {lastMatchResult.deltaFormB && lastMatchResult.deltaFormB > 0 ? `+${lastMatchResult.deltaFormB}` : lastMatchResult.deltaFormB} pts
                    </span>

                    {lastMatchResult.autoUpdatedPoints && (
                      <span className="text-amber-300 ml-2">
                        VRS обновлен: {teamA.name} ({lastMatchResult.deltaPointsA}) / {teamB.name} ({lastMatchResult.deltaPointsB})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADVANCED ANALYTICS (FORM, STATS, METRICS) */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team A Analytics Panel */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <TeamLogo team={teamA} size="sm" />
                  <span className="font-bold text-white text-sm">{teamA.name}</span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Общий рейтинг:</span>
                    <span className="text-amber-400 font-bold">{profileA.overallRating}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Текущая форма:</span>
                    <span className="text-white">{profileA.currentForm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Сила оппонентов:</span>
                    <span className="text-slate-300">
                      {Math.round(Object.values(profileA.maps).reduce((acc, m) => acc + m.opponentsStrength, 0) / 7)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Винрейт за 5 матчей:</span>
                    <span className="text-emerald-400 font-bold">{winRateA}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Серия последних матчей:</span>
                    <span className="text-slate-200">
                      {formA.recentResults?.map((r) => (r === 'W' ? 'В' : 'П')).join(' ') || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Team B Analytics Panel */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <TeamLogo team={teamB} size="sm" />
                  <span className="font-bold text-white text-sm">{teamB.name}</span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Общий рейтинг:</span>
                    <span className="text-amber-400 font-bold">{profileB.overallRating}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Текущая форма:</span>
                    <span className="text-white">{profileB.currentForm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Сила оппонентов:</span>
                    <span className="text-slate-300">
                      {Math.round(Object.values(profileB.maps).reduce((acc, m) => acc + m.opponentsStrength, 0) / 7)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Винрейт за 5 матчей:</span>
                    <span className="text-emerald-400 font-bold">{winRateB}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Серия последних матчей:</span>
                    <span className="text-slate-200">
                      {formB.recentResults?.map((r) => (r === 'W' ? 'В' : 'П')).join(' ') || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Head-to-Head & Series Stakes */}
            <div className="p-4 rounded-2xl bg-[#090d14] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Личные встречи (H2H):</span>
                <span className="text-white font-bold">
                  {teamA.name} {h2h.winsA} : {h2h.winsB} {teamB.name}
                </span>
                {h2h.h2hModifierA !== 0 && (
                  <span className="text-amber-400">
                    ({h2h.h2hModifierA > 0 ? `+${h2h.h2hModifierA}` : h2h.h2hModifierA} преимущество {teamA.name})
                  </span>
                )}
              </div>

              <div className="text-slate-400">
                Формат MR12 (до 13 раундов, OT до +4)
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVE DUTY MAP COMPARISON TABLE */}
        {activeTab === 'comparison' && (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <TableProperties className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Сравнительная таблица Active Duty карт
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Определяет приоритет банов и пиков
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 text-left">
                    <th className="py-2 px-3 font-semibold">Карта</th>
                    <th className="py-2 px-3 font-semibold text-center">{teamA.name}</th>
                    <th className="py-2 px-3 font-semibold text-center">{teamB.name}</th>
                    <th className="py-2 px-3 font-semibold text-center">Разница</th>
                    <th className="py-2 px-3 font-semibold text-right">Преимущество</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {mapComparisons.map((c) => {
                    const diff = c.ratingA - c.ratingB;
                    const meta = MAP_METADATA[c.mapName];
                    const isFavA = diff > 0;
                    const isFavB = diff < 0;

                    return (
                      <tr key={c.mapName} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          <span>{c.mapName}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({meta?.russianName})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-amber-400 font-bold">{c.ratingA}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({c.winRateA}%)</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-amber-400 font-bold">{c.ratingB}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({c.winRateB}%)</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={
                              diff > 0
                                ? 'text-emerald-400 font-bold'
                                : diff < 0
                                ? 'text-rose-400 font-bold'
                                : 'text-slate-400'
                            }
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFavA
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : isFavB
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {c.favorite === 'teamA' ? teamA.name : c.favorite === 'teamB' ? teamB.name : 'Равные шансы'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
