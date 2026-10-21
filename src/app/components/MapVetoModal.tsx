// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React, { useState } from 'react';
import {
  Team,
  MatchFormat,
  ActiveDutyMap,
  VetoState,
  VetoStep
} from '../types';
import { TeamLogo } from './TeamLogo';
import { MAP_METADATA } from '../data/mapPool';
import {
  evaluateBanPriority,
  evaluatePickPriority,
  getSortedVetoCandidates,
  applyVetoSelection,
  executeAutoStep,
  executeCompleteAutoVeto,
  initializeVetoState
} from '../utils/vetoEngine';
import {
  X,
  Shield,
  Crosshair,
  Trophy,
  RotateCcw,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shuffle
} from 'lucide-react';

interface MapVetoModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamA: Team;
  teamB: Team;
  format: MatchFormat;
  currentVetoState: VetoState | null;
  onVetoCompleted: (finalState: VetoState) => void;
}

export function MapVetoModal({
  isOpen,
  onClose,
  teamA,
  teamB,
  format,
  currentVetoState,
  onVetoCompleted
}: MapVetoModalProps) {
  const [veto, setVeto] = useState<VetoState>(() => {
    if (
      currentVetoState &&
      currentVetoState.format === format &&
      currentVetoState.teamAId === teamA.id &&
      currentVetoState.teamBId === teamB.id
    ) {
      return currentVetoState;
    }
    return initializeVetoState(format, teamA, teamB);
  });

  // Re-initialize if teams or format changed and current veto does not match
  React.useEffect(() => {
    if (
      currentVetoState &&
      currentVetoState.format === format &&
      currentVetoState.teamAId === teamA.id &&
      currentVetoState.teamBId === teamB.id
    ) {
      setVeto(currentVetoState);
    } else {
      setVeto(initializeVetoState(format, teamA, teamB));
    }
  }, [format, teamA.id, teamB.id, currentVetoState]);

  if (!isOpen) return null;

  const currentStep: VetoStep | undefined = !veto.isCompleted
    ? veto.steps[veto.currentStepIndex]
    : undefined;

  const actingTeam = currentStep
    ? currentStep.teamId === teamA.id
      ? teamA
      : teamB
    : null;
  const oppTeam = currentStep
    ? currentStep.teamId === teamA.id
      ? teamB
      : teamA
    : null;

  // Best recommendation for current step
  const recommendations =
    currentStep && actingTeam && oppTeam
      ? getSortedVetoCandidates(
          currentStep.action as 'ban' | 'pick',
          actingTeam,
          oppTeam,
          veto.availableMaps
        )
      : [];

  const topRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  // Handlers
  const handleSelectMap = (mapName: ActiveDutyMap) => {
    if (veto.isCompleted || !currentStep) return;
    const nextState = applyVetoSelection(veto, mapName, teamA, teamB);
    setVeto(nextState);
    if (nextState.isCompleted) {
      onVetoCompleted(nextState);
    }
  };

  const handleExecuteAutoStep = () => {
    if (veto.isCompleted) return;
    const nextState = executeAutoStep(veto, teamA, teamB);
    setVeto(nextState);
    if (nextState.isCompleted) {
      onVetoCompleted(nextState);
    }
  };

  const handleCompleteAllAuto = () => {
    let state = { ...veto };
    while (!state.isCompleted && state.currentStepIndex < state.steps.length) {
      state = executeAutoStep(state, teamA, teamB);
    }
    setVeto(state);
    onVetoCompleted(state);
  };

  const handleRandomStep = () => {
    if (veto.isCompleted || veto.availableMaps.length === 0) return;
    const randMap =
      veto.availableMaps[Math.floor(Math.random() * veto.availableMaps.length)];
    const nextState = applyVetoSelection(
      veto,
      randMap,
      teamA,
      teamB,
      'Случайный выбор команды'
    );
    setVeto(nextState);
    if (nextState.isCompleted) {
      onVetoCompleted(nextState);
    }
  };

  const handleResetVeto = () => {
    const fresh = initializeVetoState(format, teamA, teamB);
    setVeto(fresh);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl my-auto bg-gradient-to-b from-[#181a20] to-[#0f1115] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="relative p-4 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                  CS2 Map Veto
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {format}
                </span>
                {veto.isCompleted && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Завершено
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Официальный регламент пиков и банов 7 Active Duty карт
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetVeto}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50 transition-colors"
              title="Сбросить вето заново"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сбросить</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Teams Bar & Current Turn Status */}
        <div className="px-4 sm:px-6 py-3 bg-zinc-950/70 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-3">
          {/* Team A */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/60 p-1 flex items-center justify-center">
              <TeamLogo team={teamA} className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                {teamA.name}
                <span className="text-[10px] text-zinc-400 font-mono">
                  ({teamA.points} VRS)
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Баны:{' '}
                <span className="text-red-400 font-bold">
                  {veto.bannedMaps.filter((b) => b.teamId === teamA.id).length}
                </span>{' '}
                • Пики:{' '}
                <span className="text-emerald-400 font-bold">
                  {veto.pickedMaps.filter((p) => p.teamId === teamA.id).length}
                </span>
              </div>
            </div>
          </div>

          {/* Current Step Center Indicator */}
          <div className="text-center px-4 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-750 mx-auto">
            {!veto.isCompleted && currentStep && actingTeam ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-xs text-zinc-300 font-medium">
                  Шаг {veto.currentStepIndex + 1} из {veto.steps.length}:
                </span>
                <span
                  className={`text-xs font-black uppercase tracking-wider ${
                    currentStep.action === 'ban' ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {currentStep.action === 'ban' ? 'Бан' : 'Пик'}{' '}
                  <span className="text-white underline decoration-amber-500/50">
                    {actingTeam.name}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Вето завершено! Карты серии утверждены</span>
              </div>
            )}
          </div>

          {/* Team B */}
          <div className="flex items-center gap-2.5 justify-end">
            <div className="text-right">
              <div className="text-sm font-bold text-white leading-tight flex items-center justify-end gap-1.5">
                <span className="text-[10px] text-zinc-400 font-mono">
                  ({teamB.points} VRS)
                </span>
                {teamB.name}
              </div>
              <div className="text-[11px] text-zinc-400">
                Баны:{' '}
                <span className="text-red-400 font-bold">
                  {veto.bannedMaps.filter((b) => b.teamId === teamB.id).length}
                </span>{' '}
                • Пики:{' '}
                <span className="text-emerald-400 font-bold">
                  {veto.pickedMaps.filter((p) => p.teamId === teamB.id).length}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/60 p-1 flex items-center justify-center">
              <TeamLogo team={teamB} className="w-6 h-6 object-contain" />
            </div>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Quick AI Controls & Smart Advisor */}
          {!veto.isCompleted && currentStep && topRecommendation && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Рекомендация Smart AI для {actingTeam?.name}:
                    </span>
                    <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                      {currentStep.action === 'ban' ? 'Забанить' : 'Выбрать'}{' '}
                      <strong className="text-amber-300">
                        {topRecommendation.mapName}
                      </strong>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    {topRecommendation.explanation}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleExecuteAutoStep}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md transition-all active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Выбрать {topRecommendation.mapName}</span>
                </button>
                <button
                  onClick={handleCompleteAllAuto}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 transition-colors"
                  title="Автоматически завершить все оставшиеся шаги"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Завершить</span> всё
                </button>
                <button
                  onClick={handleRandomStep}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 transition-colors"
                  title="Случайный выбор"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Matches Maps (Pool of Series) when in progress or completed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Карты матча ({veto.selectedMapsInOrder.length} из{' '}
                {format === 'BO1' ? 1 : format === 'BO3' ? 3 : 5})
              </h3>
              <span className="text-[11px] text-zinc-500">
                Порядок проведения серии
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {veto.selectedMapsInOrder.map((m, idx) => {
                const meta = MAP_METADATA[m.mapName];
                const pickerTeam = m.pickedBy === teamA.id ? teamA : m.pickedBy === teamB.id ? teamB : null;

                return (
                  <div
                    key={m.mapName}
                    className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-zinc-850 to-zinc-950 p-3.5 shadow-lg flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Карта #{idx + 1}
                      </span>
                      {m.isDecider ? (
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Decider
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Пик {pickerTeam?.name}
                        </span>
                      )}
                    </div>

                    <div className="my-2">
                      <div className="text-base font-black text-white">
                        {m.mapName}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {meta?.russianName}
                      </div>
                    </div>

                    {pickerTeam && (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800 text-[11px] text-zinc-300">
                        <TeamLogo team={pickerTeam} className="w-4 h-4 object-contain" />
                        <span className="truncate">Пикнули {pickerTeam.name}</span>
                      </div>
                    )}
                    {m.isDecider && (
                      <div className="text-[11px] text-amber-400/90 pt-2 border-t border-zinc-800">
                        Решающая оставшаяся
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Placeholder slots for remaining maps */}
              {Array.from({
                length: Math.max(
                  0,
                  (format === 'BO1' ? 1 : format === 'BO3' ? 3 : 5) -
                    veto.selectedMapsInOrder.length
                )
              }).map((_, i) => (
                <div
                  key={`empty_${i}`}
                  className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-3.5 flex flex-col items-center justify-center text-center min-h-[110px]"
                >
                  <span className="text-[11px] font-mono text-zinc-600 mb-1">
                    Карта #{veto.selectedMapsInOrder.length + i + 1}
                  </span>
                  <span className="text-xs text-zinc-500">Ожидает выбора...</span>
                </div>
              ))}
            </div>
          </div>

          {/* Available Map Pool Cards (7 Active Duty) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-zinc-400" />
                Active Duty Map Pool ({veto.availableMaps.length} доступно из 7)
              </h3>
              {!veto.isCompleted && currentStep && (
                <span className="text-[11px] text-amber-400 font-bold">
                  Кликните по карте, чтобы{' '}
                  {currentStep.action === 'ban' ? 'забанить' : 'выбрать'} её
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(['Ancient', 'Anubis', 'Cache', 'Dust2', 'Inferno', 'Mirage', 'Nuke'] as ActiveDutyMap[]).map(
                (mapName) => {
                  const meta = MAP_METADATA[mapName];
                  const isAvailable = veto.availableMaps.includes(mapName);
                  const isBanned = veto.bannedMaps.find((b) => b.mapName === mapName);
                  const isPicked = veto.pickedMaps.find((p) => p.mapName === mapName);
                  const isDecider = veto.deciderMap === mapName;

                  // Find evaluations for candidate card if available
                  const candidateEval = recommendations.find(
                    (r) => r.mapName === mapName
                  );
                  const isTopRec = topRecommendation?.mapName === mapName;

                  const bannerTeam = isBanned
                    ? isBanned.teamId === teamA.id
                      ? teamA
                      : teamB
                    : null;
                  const pickerTeam = isPicked
                    ? isPicked.teamId === teamA.id
                      ? teamA
                      : teamB
                    : null;

                  return (
                    <div
                      key={mapName}
                      onClick={() => isAvailable && handleSelectMap(mapName)}
                      className={`relative rounded-2xl border p-4 transition-all overflow-hidden flex flex-col justify-between ${
                        isAvailable
                          ? 'border-zinc-700/80 bg-zinc-900/90 hover:border-amber-400/80 hover:bg-zinc-850 hover:scale-[1.01] cursor-pointer shadow-md'
                          : isBanned
                          ? 'border-red-900/30 bg-zinc-950/80 opacity-55 saturate-50'
                          : 'border-emerald-600/40 bg-zinc-900/90 shadow-md ring-1 ring-emerald-500/30'
                      }`}
                    >
                      {/* Status Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                          {mapName}
                        </span>

                        {isAvailable && isTopRec && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Топ выбор
                          </span>
                        )}

                        {isBanned && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" /> БАН
                          </span>
                        )}

                        {isPicked && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> ПИК
                          </span>
                        )}

                        {isDecider && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Trophy className="w-2.5 h-2.5" /> ДЕСАЙДЕР
                          </span>
                        )}
                      </div>

                      {/* Map info */}
                      <div className="mb-3">
                        <div className="text-sm font-bold text-white">
                          {meta?.russianName}
                        </div>
                        <div className="text-[11px] text-zinc-400 line-clamp-1">
                          {meta?.tagline}
                        </div>
                      </div>

                      {/* Ratings comparison */}
                      {candidateEval && isAvailable ? (
                        <div className="space-y-2 pt-2 border-t border-zinc-800 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Рейтинг карты:</span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-zinc-200 font-bold">
                                {candidateEval.actingRating}
                              </span>
                              <span className="text-zinc-500">vs</span>
                              <span className="text-zinc-200 font-bold">
                                {candidateEval.oppRating}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Преимущество:</span>
                            <span
                              className={`font-mono font-bold ${
                                candidateEval.delta > 0
                                  ? 'text-emerald-400'
                                  : candidateEval.delta < 0
                                  ? 'text-red-400'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {candidateEval.delta > 0 ? `+${candidateEval.delta}` : candidateEval.delta}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-zinc-500">
                            <span>Банрейт: {candidateEval.actingBanRate}%</span>
                            <span>Винрейт: {candidateEval.actingWR}%</span>
                          </div>

                          {currentStep && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectMap(mapName);
                              }}
                              className={`w-full mt-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                                currentStep.action === 'ban'
                                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white border border-red-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30'
                              }`}
                            >
                              {currentStep.action === 'ban' ? 'Забанить' : 'Выбрать'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-zinc-800/80 text-[11px]">
                          {isBanned && bannerTeam && (
                            <div className="text-red-400/90 flex items-center gap-1.5">
                              <TeamLogo team={bannerTeam} className="w-3.5 h-3.5 object-contain" />
                              <span className="truncate">Бан: {bannerTeam.name}</span>
                            </div>
                          )}
                          {isPicked && pickerTeam && (
                            <div className="text-emerald-400/90 flex items-center gap-1.5">
                              <TeamLogo team={pickerTeam} className="w-3.5 h-3.5 object-contain" />
                              <span className="truncate">Пик: {pickerTeam.name}</span>
                            </div>
                          )}
                          {isDecider && (
                            <div className="text-amber-400 flex items-center gap-1.5">
                              <Trophy className="w-3.5 h-3.5" />
                              <span>Решающая карта</span>
                            </div>
                          )}
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                            {isBanned?.reason || isPicked?.reason || 'Выбыла из пула'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Veto Steps Timeline Log */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-zinc-400" />
              История шагов вето
            </h3>

            <div className="space-y-2">
              {veto.steps.map((st, idx) => {
                const stepDone = !!st.mapName;
                const isCurrent = idx === veto.currentStepIndex && !veto.isCompleted;
                const stepTeam = st.teamId === teamA.id ? teamA : teamB;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : stepDone
                        ? 'border-zinc-800 bg-zinc-900/60'
                        : 'border-zinc-850 bg-zinc-950/40 opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-mono font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <TeamLogo team={stepTeam} className="w-4 h-4 object-contain" />
                        <span className="text-xs font-bold text-white">
                          {stepTeam.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          st.action === 'ban'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {st.action === 'ban' ? 'БАН' : 'ПИК'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {st.mapName ? (
                        <div className="text-right">
                          <span className="text-xs font-black text-white bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700">
                            {st.mapName}
                          </span>
                          {st.reason && (
                            <p className="text-[10px] text-zinc-400 mt-1 max-w-md truncate">
                              {st.reason}
                            </p>
                          )}
                        </div>
                      ) : isCurrent ? (
                        <span className="text-xs font-bold text-amber-400 animate-pulse">
                          Ожидает выбора...
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600 font-mono">—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Decider Note */}
              {veto.isCompleted && veto.deciderMap && (
                <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Решающая карта (Decider)
                    </span>
                  </div>
                  <span className="text-xs font-black text-white bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-lg">
                    {veto.deciderMap}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-400">
            {veto.isCompleted ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Вето завершено. Пул матча готов к симуляции!
              </span>
            ) : (
              <span>
                Осталось сделать шагов:{' '}
                <strong className="text-white">
                  {veto.steps.length - veto.currentStepIndex}
                </strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!veto.isCompleted ? (
              <>
                <button
                  onClick={handleExecuteAutoStep}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Авто-шаг ИИ
                </button>
                <button
                  onClick={handleCompleteAllAuto}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Завершить вето ИИ</span>
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-300 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Применить карты к матчу</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
