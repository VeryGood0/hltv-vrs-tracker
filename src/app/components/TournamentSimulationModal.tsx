// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React, { useState, useMemo } from 'react';
import {
  TournamentMatch,
  Team,
  MatchFormat,
  ActiveDutyMap,
  VetoState,
  MatchSeriesMapResult
} from '../types';
import { TeamLogo } from './TeamLogo';
import { MAP_METADATA } from '../data/mapPool';
import {
  calculateEffectiveProbability,
  calculateSeriesOdds,
  getRequiredWins,
  calculatePointsStakes
} from '../utils/probability';
import { calculateTournamentMatchDeltas } from '../utils/tournament';
import {
  initializeVeto,
  executeCompleteAutoVeto,
  executeSmartVetoStep,
  applyVetoChoice
} from '../utils/vetoEngine';
import {
  simulateCS2MapScore,
  simulateSeriesOnVeto,
  applyDynamicMapOutcome,
  calculateMapMatchup
} from '../utils/mapSimulation';
import { soundFx } from '../utils/audio';
import {
  X,
  Play,
  FastForward,
  RotateCcw,
  Trophy,
  Check,
  ShieldAlert,
  Crosshair,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  Flame,
  CheckCircle2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface TournamentSimulationModalProps {
  match: TournamentMatch;
  teams: Team[];
  onClose: () => void;
  onConfirmResult: (
    matchId: string,
    scoreA: number,
    scoreB: number,
    winnerId: string,
    deltaPointsA?: number,
    deltaPointsB?: number,
    deltaFormA?: number,
    deltaFormB?: number,
    mapsPlayed?: MatchSeriesMapResult[],
    vetoState?: VetoState,
    actualFormat?: MatchFormat
  ) => void;
  onUpdateTeams?: (teams: Team[]) => void;
}

export const TournamentSimulationModal: React.FC<TournamentSimulationModalProps> = ({
  match,
  teams,
  onClose,
  onConfirmResult,
  onUpdateTeams
}) => {
  const teamA = teams.find((t) => t.id === match.teamAId);
  const teamB = teams.find((t) => t.id === match.teamBId);

  const [format, setFormat] = useState<MatchFormat>(match.format);
  const [scoreA, setScoreA] = useState<number>(match.scoreA || 0);
  const [scoreB, setScoreB] = useState<number>(match.scoreB || 0);
  const [showVetoDetails, setShowVetoDetails] = useState<boolean>(false);

  // Initialize or restore CS2 Map Veto state
  const [vetoState, setVetoState] = useState<VetoState>(() => {
    if (match.vetoState) return match.vetoState;
    if (teamA && teamB) {
      return initializeVeto(format, teamA, teamB);
    }
    return {
      format,
      teamAId: match.teamAId || '',
      teamBId: match.teamBId || '',
      currentStepIndex: 0,
      steps: [],
      availableMaps: ['Ancient', 'Anubis', 'Cache', 'Dust2', 'Inferno', 'Mirage', 'Nuke'],
      bannedMaps: [],
      pickedMaps: [],
      isCompleted: false,
      selectedMapsInOrder: []
    };
  });

  // Maps played in this series with realistic MR12 CS2 scores
  const [seriesMapsPlayed, setSeriesMapsPlayed] = useState<MatchSeriesMapResult[]>(
    () => match.mapsPlayed || []
  );

  const requiredWins = getRequiredWins(format);
  const aWon = scoreA >= requiredWins;
  const bWon = scoreB >= requiredWins;
  const isFinished = aWon || bWon;

  // Single map probability based on VRS points
  const pointsA = teamA?.points || 1500;
  const pointsB = teamB?.points || 1500;
  const singleMapProbA = useMemo(
    () => calculateEffectiveProbability(pointsA, pointsB),
    [pointsA, pointsB]
  );
  const singleMapProbB = 1 - singleMapProbA;

  const { seriesProbA, seriesProbB } = useMemo(
    () => calculateSeriesOdds(singleMapProbA, format),
    [singleMapProbA, format]
  );

  // Live VRS stakes
  const stakes = useMemo(() => {
    if (!teamA || !teamB) return null;
    return calculatePointsStakes(teamA, teamB, teams);
  }, [teamA, teamB, teams]);

  // Deltas if finished
  const deltas = useMemo(() => {
    if (!isFinished || !teamA || !teamB) return null;
    const winnerId = aWon ? teamA.id : teamB.id;
    return calculateTournamentMatchDeltas(teamA, teamB, scoreA, scoreB, winnerId, teams);
  }, [isFinished, aWon, teamA, teamB, scoreA, scoreB, teams]);

  // 1. Auto-complete Map Veto via Smart AI
  const handleAutoCompleteVeto = () => {
    if (!teamA || !teamB) return;
    soundFx.playClick();
    const finalVeto = executeCompleteAutoVeto(format, teamA, teamB, vetoState);
    setVetoState(finalVeto);
  };

  // 2. Interactive Single Step in Veto
  const handleVetoChoice = (mapName: ActiveDutyMap) => {
    if (!teamA || !teamB || vetoState.isCompleted) return;
    soundFx.playClick();
    const nextState = applyVetoChoice(vetoState, mapName, teamA, teamB);
    setVetoState(nextState);
  };

  // 3. Simulate Next Map on Veto Pool
  const handleSimulateNextMap = () => {
    if (isFinished || !teamA || !teamB) return;

    let activeVeto = vetoState;
    if (!activeVeto.isCompleted) {
      activeVeto = executeCompleteAutoVeto(format, teamA, teamB, activeVeto);
      setVetoState(activeVeto);
    }

    const currentMapIndex = seriesMapsPlayed.length;
    const mapToPlay = activeVeto.selectedMapsInOrder[currentMapIndex];
    if (!mapToPlay) return;

    // Simulate map with realistic MR12 score and dynamic factor
    const result = simulateCS2MapScore(teamA, teamB, mapToPlay.mapName, {
      pickedBy: mapToPlay.pickedBy,
      isDecider: mapToPlay.isDecider
    });

    const nextScoreA = result.winnerTeamId === teamA.id ? scoreA + 1 : scoreA;
    const nextScoreB = result.winnerTeamId === teamB.id ? scoreB + 1 : scoreB;

    const playedRecord: MatchSeriesMapResult = {
      mapName: mapToPlay.mapName,
      mapOrder: seriesMapsPlayed.length + 1,
      pickedBy: mapToPlay.pickedBy,
      isDecider: mapToPlay.isDecider,
      scoreA: result.scoreA,
      scoreB: result.scoreB,
      overtime: result.overtime,
      half1A: result.half1A,
      half1B: result.half1B,
      half2A: result.half2A,
      half2B: result.half2B,
      otScoreA: result.otScoreA,
      otScoreB: result.otScoreB,
      winProbA: result.winProbA,
      winProbB: result.winProbB,
      winnerTeamId: result.winnerTeamId,
      loserTeamId: result.loserTeamId,
      narrative: result.narrative,
      tacticalReason: result.tacticalReason
    };

    const nextSeriesMaps = [...seriesMapsPlayed, playedRecord];
    setSeriesMapsPlayed(nextSeriesMaps);
    setScoreA(nextScoreA);
    setScoreB(nextScoreB);

    // Apply dynamic map outcome progression
    if (teamA.mapProfile && teamB.mapProfile) {
      const updatedProfileA = applyDynamicMapOutcome(
        teamA.mapProfile,
        mapToPlay.mapName,
        result.winnerTeamId === teamA.id,
        result.scoreA,
        result.scoreB,
        teamB
      );
      const updatedProfileB = applyDynamicMapOutcome(
        teamB.mapProfile,
        mapToPlay.mapName,
        result.winnerTeamId === teamB.id,
        result.scoreB,
        result.scoreA,
        teamA
      );
      if (onUpdateTeams) {
        onUpdateTeams(
          teams.map((t) => {
            if (t.id === teamA.id) return { ...t, mapProfile: updatedProfileA };
            if (t.id === teamB.id) return { ...t, mapProfile: updatedProfileB };
            return t;
          })
        );
      }
    }

    if (nextScoreA >= requiredWins || nextScoreB >= requiredWins) {
      soundFx.playVictory();
    } else {
      soundFx.playMapWin();
    }
  };

  // 4. Simulate Full Series on Veto Maps
  const handleSimulateFullMatch = () => {
    if (!teamA || !teamB) return;
    soundFx.playClick();

    let activeVeto = vetoState;
    if (!activeVeto.isCompleted) {
      activeVeto = executeCompleteAutoVeto(format, teamA, teamB, activeVeto);
      setVetoState(activeVeto);
    }

    // Run series simulation
    const seriesResult = simulateSeriesOnVeto(format, teamA, teamB, activeVeto.selectedMapsInOrder);

    setScoreA(seriesResult.seriesScoreA);
    setScoreB(seriesResult.seriesScoreB);
    setSeriesMapsPlayed(seriesResult.mapsPlayed);

    // Apply dynamic map outcomes for all played maps
    if (teamA.mapProfile && teamB.mapProfile) {
      let profA = teamA.mapProfile;
      let profB = teamB.mapProfile;
      for (const m of seriesResult.mapsPlayed) {
        profA = applyDynamicMapOutcome(profA, m.mapName, m.winnerTeamId === teamA.id, m.scoreA, m.scoreB, teamB);
        profB = applyDynamicMapOutcome(profB, m.mapName, m.winnerTeamId === teamB.id, m.scoreB, m.scoreA, teamA);
      }
      if (onUpdateTeams) {
        onUpdateTeams(
          teams.map((t) => {
            if (t.id === teamA.id) return { ...t, mapProfile: profA };
            if (t.id === teamB.id) return { ...t, mapProfile: profB };
            return t;
          })
        );
      }
    }

    soundFx.playVictory();
  };

  // 5. Reset Series and Veto
  const handleReset = () => {
    if (!teamA || !teamB) return;
    soundFx.playClick();
    setScoreA(0);
    setScoreB(0);
    setSeriesMapsPlayed([]);
    setVetoState(initializeVeto(format, teamA, teamB));
  };

  // 6. Save and Advance Match in Bracket
  const handleSaveAndAdvance = () => {
    if (!isFinished || !teamA || !teamB) return;
    const winnerId = aWon ? teamA.id : teamB.id;
    soundFx.playClick();
    onConfirmResult(
      match.id,
      scoreA,
      scoreB,
      winnerId,
      deltas?.deltaPointsA,
      deltas?.deltaPointsB,
      deltas?.deltaFormA,
      deltas?.deltaFormB,
      seriesMapsPlayed,
      vetoState,
      format
    );
    onClose();
  };

  if (!teamA || !teamB) {
    return null;
  }

  const currentVetoStep = !vetoState.isCompleted
    ? vetoState.steps[vetoState.currentStepIndex]
    : null;
  const actingTeam = currentVetoStep?.teamId === teamA.id ? teamA : teamB;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#0e1422] border border-slate-700/70 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div>
            <div className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>{match.name}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">CS2 Tournament Match</span>
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              Симуляция матча с Map Veto и картами
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

        {/* Format Selector Bar */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-400">Формат матча:</span>
            <div className="flex items-center gap-1 bg-[#090d14] p-1 rounded-xl border border-slate-800">
              {(['BO1', 'BO3', 'BO5'] as MatchFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  disabled={scoreA > 0 || scoreB > 0 || seriesMapsPlayed.length > 0}
                  onClick={() => {
                    soundFx.playClick();
                    setFormat(fmt);
                    setVetoState(initializeVeto(fmt, teamA, teamB));
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                    format === fmt
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {vetoState.isCompleted ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Veto завершено ({vetoState.selectedMapsInOrder.length} карт)
              </span>
            ) : (
              <span className="text-amber-400">
                Шаг {vetoState.currentStepIndex + 1} из {vetoState.steps.length}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Teams Header & Series Score */}
          <div className="grid grid-cols-11 gap-3 items-center">
            {/* Team A */}
            <div className="col-span-4 flex flex-col items-center text-center p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
              <TeamLogo team={teamA} size="lg" />
              <div className="font-bold text-white text-sm sm:text-base mt-2 truncate max-w-full">
                {teamA.name}
              </div>
              {teamA.trophiesCount !== undefined && teamA.trophiesCount > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 mt-0.5">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>{teamA.trophiesCount} {teamA.trophiesCount === 1 ? 'титул' : teamA.trophiesCount < 5 ? 'титула' : 'титулов'}</span>
                </div>
              )}
              <div className="font-mono text-xs text-amber-400 font-bold mt-1">
                {teamA.points} <span className="text-[10px] text-slate-500 font-normal">VRS</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                {Math.round(seriesProbA * 100)}% на серию
              </div>
              {stakes && (
                <div className="text-[10px] font-mono mt-1.5 pt-1 border-t border-slate-800 w-full flex justify-between px-1">
                  <span className="text-emerald-400">+{stakes.winA}</span>
                  <span className="text-rose-400">-{stakes.lossA}</span>
                </div>
              )}
            </div>

            {/* Series Score */}
            <div className="col-span-3 flex flex-col items-center justify-center text-center">
              <div className="font-mono font-black text-4xl sm:text-5xl text-white tracking-wider flex items-center gap-2">
                <span className={scoreA > scoreB ? 'text-amber-400' : 'text-slate-200'}>
                  {scoreA}
                </span>
                <span className="text-slate-600 text-2xl">:</span>
                <span className={scoreB > scoreA ? 'text-amber-400' : 'text-slate-200'}>
                  {scoreB}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 mt-1">
                до {requiredWins} {requiredWins === 1 ? 'победы' : 'побед'}
              </span>
            </div>

            {/* Team B */}
            <div className="col-span-4 flex flex-col items-center text-center p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
              <TeamLogo team={teamB} size="lg" />
              <div className="font-bold text-white text-sm sm:text-base mt-2 truncate max-w-full">
                {teamB.name}
              </div>
              {teamB.trophiesCount !== undefined && teamB.trophiesCount > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 mt-0.5">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>{teamB.trophiesCount} {teamB.trophiesCount === 1 ? 'титул' : teamB.trophiesCount < 5 ? 'титула' : 'титулов'}</span>
                </div>
              )}
              <div className="font-mono text-xs text-amber-400 font-bold mt-1">
                {teamB.points} <span className="text-[10px] text-slate-500 font-normal">VRS</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                {Math.round(seriesProbB * 100)}% на серию
              </div>
              {stakes && (
                <div className="text-[10px] font-mono mt-1.5 pt-1 border-t border-slate-800 w-full flex justify-between px-1">
                  <span className="text-emerald-400">+{stakes.winB}</span>
                  <span className="text-rose-400">-{stakes.lossB}</span>
                </div>
              )}
            </div>
          </div>

          {/* Map Veto Section */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  CS2 Map Veto ({format})
                </h4>
              </div>

              {!vetoState.isCompleted ? (
                <button
                  onClick={handleAutoCompleteVeto}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 fill-black" />
                  <span>Авто-вето (Smart AI)</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowVetoDetails((p) => !p)}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span>{showVetoDetails ? 'Скрыть шаги' : 'Показать шаги вето'}</span>
                  {showVetoDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* In-progress Veto step notice or map choice buttons */}
            {!vetoState.isCompleted && currentVetoStep && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <TeamLogo team={actingTeam} size="xs" />
                    <span className="font-bold text-white">{actingTeam.name}</span>
                    <span className={currentVetoStep.action === 'ban' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {currentVetoStep.action === 'ban' ? 'банят карту' : 'выбирают пик'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300">
                    Нажмите карту ниже или нажмите «Авто-вето»
                  </span>
                </div>

                {/* Available maps for manual click */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  {vetoState.availableMaps.map((mapName) => {
                    const matchup = calculateMapMatchup(teamA, teamB, mapName);
                    const isBan = currentVetoStep.action === 'ban';
                    return (
                      <button
                        key={mapName}
                        onClick={() => handleVetoChoice(mapName)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          isBan
                            ? 'bg-rose-950/20 hover:bg-rose-900/40 border-rose-800/40 hover:border-rose-500 text-slate-200'
                            : 'bg-emerald-950/20 hover:bg-emerald-900/40 border-emerald-800/40 hover:border-emerald-500 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{mapName}</span>
                          <span className={`text-[10px] font-mono ${isBan ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isBan ? 'БАН' : 'ПИК'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                          <span>{teamA.name.slice(0, 3)}: {matchup.ratingA}</span>
                          <span>{teamB.name.slice(0, 3)}: {matchup.ratingB}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Veto history logs if expanded or completed */}
            {(showVetoDetails || (!vetoState.isCompleted && (vetoState.bannedMaps.length > 0 || vetoState.pickedMaps.length > 0))) && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Хронология Veto:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono">
                  {vetoState.bannedMaps.map((b, idx) => {
                    const actingName = b.teamId === teamA.id ? teamA.name : teamB.name;
                    return (
                      <div
                        key={`ban_${idx}`}
                        className="p-1.5 rounded-lg bg-rose-950/20 border border-rose-900/40 flex items-center justify-between gap-1"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="text-slate-400">{actingName}:</span>
                          <span className="text-white font-bold">{b.mapName}</span>
                        </div>
                        <span className="text-[9px] text-rose-400 uppercase font-bold shrink-0">Бан</span>
                      </div>
                    );
                  })}

                  {vetoState.pickedMaps.map((p, idx) => {
                    const actingName = p.teamId === teamA.id ? teamA.name : teamB.name;
                    return (
                      <div
                        key={`pick_${idx}`}
                        className="p-1.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between gap-1"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Crosshair className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-slate-400">{actingName}:</span>
                          <span className="text-white font-bold">{p.mapName}</span>
                        </div>
                        <span className="text-[9px] text-emerald-400 uppercase font-bold shrink-0">Пик #{p.mapOrder}</span>
                      </div>
                    );
                  })}

                  {vetoState.deciderMap && (
                    <div className="p-1.5 rounded-lg bg-amber-950/20 border border-amber-900/40 flex items-center justify-between gap-1 sm:col-span-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-amber-400 font-bold">Десидер (Оставшаяся карта):</span>
                        <span className="text-white font-bold">{vetoState.deciderMap}</span>
                      </div>
                      <span className="text-[9px] text-amber-400 uppercase font-bold shrink-0">Решающая</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected Maps & Results Pool */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-emerald-400" />
                Карты серии ({vetoState.selectedMapsInOrder.length || 0})
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Сыграно: {seriesMapsPlayed.length} из {vetoState.selectedMapsInOrder.length || format}
              </span>
            </div>

            {vetoState.selectedMapsInOrder.length > 0 ? (
              <div className="space-y-2.5">
                {vetoState.selectedMapsInOrder.map((selMap, idx) => {
                  const played = seriesMapsPlayed[idx];
                  const isCurrent = !played && seriesMapsPlayed.length === idx && !isFinished;
                  const isUpcoming = !played && seriesMapsPlayed.length < idx;
                  const matchup = calculateMapMatchup(teamA, teamB, selMap.mapName, {
                    pickedBy: selMap.pickedBy,
                    isDecider: selMap.isDecider
                  });
                  const meta = MAP_METADATA[selMap.mapName];

                  return (
                    <div
                      key={selMap.mapName + idx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        played
                          ? 'bg-[#111728] border-slate-800'
                          : isCurrent
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                          : 'bg-slate-900/30 border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Map Name & Pick Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-amber-400">
                            #{idx + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">
                                {selMap.mapName}
                              </span>
                              <span className="text-xs text-slate-400">
                                ({meta?.russianName})
                              </span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                  selMap.isDecider
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {selMap.isDecider ? 'Десидер' : `Пик ${selMap.pickedBy || ''}`}
                              </span>
                            </div>

                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              Вероятность перед картой: {teamA.name} {Math.round(matchup.winProbA * 100)}% · {Math.round(matchup.winProbB * 100)}% {teamB.name}
                            </div>
                          </div>
                        </div>

                        {/* Status or Played Score */}
                        <div className="flex items-center gap-3">
                          {played ? (
                            <div className="text-right">
                              <div className="font-mono font-black text-lg sm:text-xl text-white">
                                <span className={played.scoreA > played.scoreB ? 'text-amber-400' : 'text-slate-300'}>
                                  {played.scoreA}
                                </span>
                                <span className="text-slate-600 px-1">:</span>
                                <span className={played.scoreB > played.scoreA ? 'text-amber-400' : 'text-slate-300'}>
                                  {played.scoreB}
                                </span>
                                {played.overtime && (
                                  <span className="text-[10px] font-mono text-amber-400 ml-1.5 px-1 py-0.5 rounded bg-amber-500/20 font-bold">
                                    OT
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                (1-я: {played.half1A}:{played.half1B} / 2-я: {played.half2A}:{played.half2B}
                                {played.overtime && played.otScoreA !== undefined && played.otScoreB !== undefined
                                  ? ` / OT: ${played.otScoreA}:${played.otScoreB}`
                                  : ''}
                                )
                              </div>
                            </div>
                          ) : isCurrent ? (
                            <span className="text-xs font-mono font-bold text-amber-400 animate-pulse">
                              ▶ Следующая карта
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500">
                              {idx + 1 > requiredWins ? 'При необходимости' : 'Ожидает игры'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tactical commentary for played map */}
                      {played && played.tacticalReason && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{played.tacticalReason}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500 font-mono">
                Карты будут определены после завершения Map Veto. Нажмите «Авто-вето (Smart AI)» выше.
              </div>
            )}
          </div>

          {/* Victory Announcement and VRS/Form deltas if finished */}
          {isFinished && deltas && (
            <div className="p-4 bg-gradient-to-r from-amber-500/15 via-[#111726] to-emerald-500/15 border border-amber-500/40 rounded-2xl space-y-2">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-white text-sm">
                    Победа {aWon ? teamA.name : teamB.name} со счётом {scoreA}:{scoreB}!
                  </span>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Нажмите «Применить результат», чтобы продвинуть команду по турнирной сетке с сохранением карт и статистики.
                  </div>
                </div>
              </div>

              {/* VRS & Form Points Impact Box */}
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{teamA.name}:</span>
                  <span className={deltas.deltaPointsA >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {deltas.deltaPointsA > 0 ? `+${deltas.deltaPointsA}` : deltas.deltaPointsA} VRS
                  </span>
                  <span className={deltas.deltaFormA >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    ({deltas.deltaFormA > 0 ? `+${deltas.deltaFormA}` : deltas.deltaFormA} к форме)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{teamB.name}:</span>
                  <span className={deltas.deltaPointsB >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {deltas.deltaPointsB > 0 ? `+${deltas.deltaPointsB}` : deltas.deltaPointsB} VRS
                  </span>
                  <span className={deltas.deltaFormB >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    ({deltas.deltaFormB > 0 ? `+${deltas.deltaFormB}` : deltas.deltaFormB} к форме)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5 shrink-0">
          {!isFinished ? (
            <>
              <button
                onClick={handleSimulateNextMap}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Сыграть карту ({seriesMapsPlayed.length + 1})</span>
              </button>

              <button
                onClick={handleSimulateFullMatch}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Матч целиком (Все карты)</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleSaveAndAdvance}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Применить результат и продвинуть по сетке</span>
            </button>
          )}

          {(scoreA > 0 || scoreB > 0 || seriesMapsPlayed.length > 0) && (
            <button
              onClick={handleReset}
              className="px-3 py-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer flex items-center justify-center"
              title="Сбросить счет и вето"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
