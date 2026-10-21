// @ts-nocheck -- imported legacy code written for a looser tsconfig
import { applyDefaultPointsMap, loadStoredHltvDefaults, HLTV_DEFAULTS_KEY } from './utils/hltvSync';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Team, MatchFormat, MatchPrediction, Trophy as TrophyItem } from './types';
import { INITIAL_TEAMS } from './data/teams';
import {
  calculateTeamForm,
  calculateH2H,
  calculateEffectiveProbability,
  calculateSeriesOdds,
  calculatePointsStakes,
  calculateMatchFormDeltas,
  getRequiredWins
} from './utils/probability';
import { soundFx } from './utils/audio';

import { MatchArena } from './components/MatchArena';
import { MatchStakesTable } from './components/MatchStakesTable';
import { TeamsLeaderboard } from './components/TeamsLeaderboard';
import { TeamProfileModal } from './components/TeamProfileModal';
import { TeamSelector } from './components/TeamSelector';
import { PointsEditorModal } from './components/PointsEditorModal';
import { LogoHelperModal } from './components/LogoHelperModal';
import { PredictionHistory } from './components/PredictionHistory';
import { TournamentHub } from './components/TournamentHub';
import { MapMatchupComparisonView } from './components/MapMatchupComparisonView';
import { MapVetoModal } from './components/MapVetoModal';
import { createZeroMapProfile } from './data/mapPool';
import { calculateTournamentPrizeMoneyPayouts, computeFinalTournamentStandings, createInitialSwissTournament } from './utils/tournament';
import { TournamentState, VetoState, MatchSeriesMapResult } from './types';
import { executeCompleteAutoVeto } from './utils/vetoEngine';
import {
  simulateCS2MapScore,
  simulateSeriesOnVeto
} from './utils/mapSimulation';

import { Sliders, Image, Trophy, Swords, GitBranch, SlidersHorizontal, Settings, Trash2 } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import arenaBg from './assets/images/cs2_arena_stage_1791213016355.jpg';
import { DataManagementModal } from './components/DataManagementModal';
import { MapStatsLedger, appendMapStatsEvent, emptyMapStatsLedger, replayMapStatsLedger, removeTournamentFromMapStatsLedger } from './utils/mapStatsLedger';

export default function App() {
  // 1. Teams State with LocalStorage Persistence & Version Migration
  const CURRENT_TEAMS_VERSION = 'v13_removed_legacy_teams';
  // These former default teams must not be resurrected from older localStorage data.
  const REMOVED_DEFAULT_TEAM_IDS = new Set(['astralis', 'big', 'gamerlegion', '3dmax', 'complexity', 'cloud9', 'ence']);
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const savedVersion = localStorage.getItem('cs2_teams_version');
      const saved = localStorage.getItem('cs2_teams_data');

      const filterOnlySiteTrophies = (trophiesList?: TrophyItem[]) => {
        if (!trophiesList || !Array.isArray(trophiesList)) return [];
        // Only count trophies actually won in championships simulated on this site
        return trophiesList.filter((t) => t && typeof t.id === 'string' && t.id.startsWith('tr_'));
      };

      // When version changes, enforce new official points & completely zero map profiles
      if (savedVersion !== CURRENT_TEAMS_VERSION) {
        let merged = INITIAL_TEAMS;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            merged = INITIAL_TEAMS.map((initTeam) => {
              const found = parsed.find((p: Team) => p.id === initTeam.id);
              const siteTrophies = filterOnlySiteTrophies(found?.trophies);
              return {
                ...initTeam,
                shortName: initTeam.shortName || found?.shortName,
                customLogo: found?.customLogo,
                points: initTeam.points,
                defaultPoints: initTeam.defaultPoints,
                mapProfile: createZeroMapProfile(),
                trophiesCount: siteTrophies.length,
                trophies: siteTrophies,
                prizeMoneyEarned: typeof found?.prizeMoneyEarned === 'number' ? found.prizeMoneyEarned : 0
              };
            });
            // Preserve user-created custom teams
            const userCustomTeams = parsed
              .filter((p: Team) => p && p.id && !REMOVED_DEFAULT_TEAM_IDS.has(p.id) && !INITIAL_TEAMS.some((it) => it.id === p.id))
              .map((ct: Team) => ({
                ...ct,
                prizeMoneyEarned: typeof ct.prizeMoneyEarned === 'number' ? ct.prizeMoneyEarned : 0,
                mapProfile: createZeroMapProfile()
              }));
            merged = [...merged, ...userCustomTeams];
          } catch {
            // Keep INITIAL_TEAMS
          }
        }
        localStorage.setItem('cs2_teams_version', CURRENT_TEAMS_VERSION);
        merged = applyDefaultPointsMap(merged, loadStoredHltvDefaults());
        localStorage.setItem('cs2_teams_data', JSON.stringify(merged));
        return merged;
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        const baseTeams = INITIAL_TEAMS.map((initTeam) => {
          const found = parsed.find((p: Team) => p.id === initTeam.id);
          if (found) {
            const siteTrophies = filterOnlySiteTrophies(found.trophies);
            return {
              ...initTeam,
              points: typeof found.points === 'number' ? found.points : initTeam.points,
              customLogo: found.customLogo,
              prizeMoneyEarned: typeof found.prizeMoneyEarned === 'number' ? found.prizeMoneyEarned : 0,
              mapProfile: found.mapProfile || createZeroMapProfile(),
              trophiesCount: siteTrophies.length,
              trophies: siteTrophies
            };
          }
          return initTeam;
        });
        // Keep user-imported/custom teams while merging in newly added defaults (e.g. 32-team Major support).
        const userCustomTeams = parsed
          .filter((p: Team) => p && p.id && !REMOVED_DEFAULT_TEAM_IDS.has(p.id) && !INITIAL_TEAMS.some((initTeam) => initTeam.id === p.id))
          .map((customTeam: Team) => ({
            ...customTeam,
            prizeMoneyEarned: typeof customTeam.prizeMoneyEarned === 'number' ? customTeam.prizeMoneyEarned : 0,
            mapProfile: customTeam.mapProfile || createZeroMapProfile()
          }));
        return applyDefaultPointsMap([...baseTeams, ...userCustomTeams], loadStoredHltvDefaults());
      }
    } catch {
      // Fallback
    }
    return INITIAL_TEAMS;
  });

  // Save teams on change
  useEffect(() => {
    localStorage.setItem('cs2_teams_data', JSON.stringify(teams));
    localStorage.setItem('cs2_teams_version', CURRENT_TEAMS_VERSION);
  }, [teams]);

  // Tab State: 'predictor' | 'leaderboard' | 'tournament'
  const [activeTab, setActiveTab] = useState<'predictor' | 'leaderboard' | 'tournament' | 'archive'>('predictor');
  const [inspectTeam, setInspectTeam] = useState<Team | null>(null);

  // Tournament State (null by default until user creates one!)
  const [tournament, setTournament] = useState<TournamentState | null>(() => {
    try {
      const saved = localStorage.getItem('cs2_tournament_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return null;
  });

  useEffect(() => {
    try {
      if (tournament) {
        localStorage.setItem('cs2_tournament_state', JSON.stringify(tournament));
      } else {
        localStorage.removeItem('cs2_tournament_state');
      }
    } catch {
      // Ignore
    }
  }, [tournament]);

  // Completed tournaments are kept independently from the active bracket.
  const [archivedTournaments, setArchivedTournaments] = useState<TournamentState[]>(() => {
    try {
      const saved = localStorage.getItem('cs2_tournament_archive');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.currentStage === 'completed') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem('cs2_tournament_archive', JSON.stringify(archivedTournaments)); } catch { /* Ignore storage limits */ }
  }, [archivedTournaments]);

  useEffect(() => {
    if (!tournament) return;
    setArchivedTournaments((prev) => {
      if (tournament.currentStage !== 'completed') {
        // A legacy 8-team GSL can be reopened so its required bronze match is
        // played. Remove any stale archived copy until the tournament truly ends.
        const activeOnly = prev.filter((item) => item.id !== tournament.id);
        return activeOnly.length === prev.length ? prev : activeOnly;
      }

      // Keep the archived snapshot in sync with final standings and match results,
      // rather than leaving an older copy from before a recovery/fix.
      const alreadyArchived = prev.some((item) => item.id === tournament.id);
      return alreadyArchived
        ? prev.map((item) => item.id === tournament.id ? tournament : item)
        : [tournament, ...prev];
    });
  }, [tournament]);

  // Backfill prize money for tournaments completed before the prize-money stat existed.
  // The active event is handled by TournamentHub; this covers archived events only.
  useEffect(() => {
    const legacyTours = archivedTournaments.filter((tour) =>
      tour.id !== tournament?.id && tour.currentStage === 'completed' && tour.prizeMoneyPayouts === undefined
    );
    if (!legacyTours.length) return;

    const tourPayouts = legacyTours.map((tour) => ({
      id: tour.id,
      payouts: calculateTournamentPrizeMoneyPayouts(
        tour,
        tour.standings?.length ? tour.standings : computeFinalTournamentStandings(tour, teams)
      )
    }));
    const byTeam = new Map<string, number>();
    tourPayouts.forEach(({ payouts }) => Object.entries(payouts).forEach(([teamId, amount]) => {
      byTeam.set(teamId, (byTeam.get(teamId) || 0) + amount);
    }));
    setTeams((prev) => prev.map((team) => ({
      ...team,
      prizeMoneyEarned: (team.prizeMoneyEarned || 0) + (byTeam.get(team.id) || 0)
    })));
    const payoutsByTournament = new Map(tourPayouts.map((item) => [item.id, item.payouts]));
    setArchivedTournaments((prev) => prev.map((tour) => payoutsByTournament.has(tour.id)
      ? { ...tour, prizeMoneyPayouts: payoutsByTournament.get(tour.id) }
      : tour
    ));
  }, [archivedTournaments, tournament?.id, teams]);

  // 2. Active Match Teams
  const [teamAId, setTeamAId] = useState<string>('vitality'); // Vitality
  const [teamBId, setTeamBId] = useState<string>('falcons'); // Falcons

  const teamA = useMemo(
    () => teams.find((t) => t.id === teamAId) || teams[0] || INITIAL_TEAMS[0],
    [teams, teamAId]
  );
  const teamB = useMemo(
    () => teams.find((t) => t.id === teamBId) || teams[1] || INITIAL_TEAMS[1],
    [teams, teamBId]
  );

  // 3. Format & Series Score
  const [format, setFormat] = useState<MatchFormat>('BO3');
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [status, setStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'FINISHED'>('PENDING');

  // Option: automatically update team VRS points after game
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoUpdatePoints, setAutoUpdatePoints] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cs2_auto_update_points');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('cs2_auto_update_points', String(autoUpdatePoints));
  }, [autoUpdatePoints]);

  const [lastMatchResult, setLastMatchResult] = useState<{
    deltaPointsA?: number;
    deltaPointsB?: number;
    deltaFormA?: number;
    deltaFormB?: number;
    autoUpdatedPoints?: boolean;
  } | null>(null);

  // CS2 Map Veto & Series State
  const [vetoState, setVetoState] = useState<VetoState | null>(null);
  const [isVetoModalOpen, setIsVetoModalOpen] = useState(false);
  const [seriesMapsPlayed, setSeriesMapsPlayed] = useState<MatchSeriesMapResult[]>([]);

  // 4. Modals State
  const [isSelectorAOpen, setIsSelectorAOpen] = useState(false);
  const [isSelectorBOpen, setIsSelectorBOpen] = useState(false);
  const [isPointsEditorOpen, setIsPointsEditorOpen] = useState(false);
  const [isLogoHelperOpen, setIsLogoHelperOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  // 5. Sound Mute
  const [isMuted, setIsMuted] = useState(false);

  // 6. Match History with dynamic form impact
  const [history, setHistory] = useState<MatchPrediction[]>(() => {
    try {
      const saved = localStorage.getItem('cs2_match_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            id: item.id || `m_${Math.random()}`,
            timestamp: item.timestamp || Date.now(),
            format: item.format || 'BO3',
            teamAId: item.teamAId || item.teamA?.id || 'spirit',
            teamBId: item.teamBId || item.teamB?.id || 'vitality',
            teamAName: item.teamAName || item.teamA?.name || 'Spirit',
            teamBName: item.teamBName || item.teamB?.name || 'Vitality',
            scoreA: typeof item.scoreA === 'number' ? item.scoreA : 0,
            scoreB: typeof item.scoreB === 'number' ? item.scoreB : 0,
            winnerTeamId: item.winnerTeamId || (item.scoreA > item.scoreB ? (item.teamAId || item.teamA?.id || 'spirit') : (item.teamBId || item.teamB?.id || 'vitality')),
            deltaPointsA: item.deltaPointsA,
            deltaPointsB: item.deltaPointsB,
            deltaFormA: item.deltaFormA,
            deltaFormB: item.deltaFormB,
            mapsPlayed: Array.isArray(item.mapsPlayed) ? item.mapsPlayed : undefined,
            tournamentId: item.tournamentId,
            tournamentName: item.tournamentName,
            tournamentStage: item.tournamentStage,
            isUpset: !!item.isUpset
          }));
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const saveHistory = useCallback((newHistory: MatchPrediction[]) => {
    const trimmed = newHistory.slice(0, 40);
    setHistory(trimmed);
    localStorage.setItem('cs2_match_history', JSON.stringify(trimmed));
  }, []);

  const [mapStatsLedger, setMapStatsLedger] = useState<MapStatsLedger>(() => {
    try {
      const saved = localStorage.getItem('cs2_map_stats_ledger');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && Array.isArray(parsed.events) && parsed.baselineProfiles ? parsed : emptyMapStatsLedger();
    } catch {
      return emptyMapStatsLedger();
    }
  });
  const mapStatsLedgerRef = useRef<MapStatsLedger>(mapStatsLedger);
  useEffect(() => {
    mapStatsLedgerRef.current = mapStatsLedger;
    try { localStorage.setItem('cs2_map_stats_ledger', JSON.stringify(mapStatsLedger)); } catch { /* Ignore storage limits */ }
  }, [mapStatsLedger]);

  const recordMapStatsEvent = useCallback((input: {
    id?: string;
    timestamp?: number;
    teamAId: string;
    teamBId: string;
    mapsPlayed?: MatchSeriesMapResult[];
    tournamentId?: string;
    tournamentName?: string;
    stageName?: string;
  }) => {
    if (!input.mapsPlayed?.length || !input.teamAId || !input.teamBId) return;
    const currentLedger = mapStatsLedgerRef.current;
    const timestamp = input.timestamp || Date.now();
    const eventId = input.id || `map_event_${timestamp}_${currentLedger.events.length + 1}`;
    // Guard against accidental double-recording if a match handler is retried.
    if (currentLedger.events.some((event) => event.id === eventId)) return;
    const nextLedger = appendMapStatsEvent(currentLedger, {
      id: eventId,
      timestamp,
      teamAId: input.teamAId,
      teamBId: input.teamBId,
      mapsPlayed: input.mapsPlayed,
      tournamentId: input.tournamentId,
      tournamentName: input.tournamentName,
      stageName: input.stageName
    }, teams);
    mapStatsLedgerRef.current = nextLedger;
    setMapStatsLedger(nextLedger);
    try { localStorage.setItem('cs2_map_stats_ledger', JSON.stringify(nextLedger)); } catch { /* Ignore storage limits */ }
    setTeams((prev) => replayMapStatsLedger(prev, nextLedger));
  }, [teams]);

  const requiredWins = getRequiredWins(format);

  // Reset match score & series progression
  const resetMatchState = useCallback((preserveVeto: boolean = false) => {
    setScoreA(0);
    setScoreB(0);
    setStatus('PENDING');
    setLastMatchResult(null);
    setSeriesMapsPlayed([]);
    if (!preserveVeto) {
      setVetoState(null);
    }
  }, []);

  const handleSelectFormat = (newFormat: MatchFormat) => {
    if (newFormat === format) return;
    setFormat(newFormat);
    resetMatchState(false);
  };

  const handleSwapTeams = () => {
    setTeamAId(teamBId);
    setTeamBId(teamAId);
    resetMatchState(false);
  };

  const handleRandomizeBothTeams = () => {
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    setTeamAId(shuffled[0].id);
    setTeamBId(shuffled[1].id);
    resetMatchState(false);
  };

  const handleRandomizeTeamA = () => {
    const candidates = teams.filter((t) => t.id !== teamBId);
    if (candidates.length === 0) return;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setTeamAId(picked.id);
    resetMatchState(false);
  };

  const handleRandomizeTeamB = () => {
    const candidates = teams.filter((t) => t.id !== teamAId);
    if (candidates.length === 0) return;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    setTeamBId(picked.id);
    resetMatchState(false);
  };

  // 7. Dynamic Team Form & H2H Calculation
  const formA = useMemo(() => calculateTeamForm(teamA.id, history), [teamA.id, history]);
  const formB = useMemo(() => calculateTeamForm(teamB.id, history), [teamB.id, history]);
  const h2h = useMemo(() => calculateH2H(teamA.id, teamB.id, history), [teamA.id, teamB.id, history]);

  // Points stakes for the match (IF TEAM WINS / IF TEAM LOSES)
  const stakes = useMemo(
    () => calculatePointsStakes(teamA, teamB, teams),
    [teamA, teamB, teams]
  );

  // Effective points = Base VRS + Form Modifier + Head-to-Head advantage
  const effectivePointsA = teamA.points + formA.formModifier + h2h.h2hModifierA;
  const effectivePointsB = teamB.points + formB.formModifier - h2h.h2hModifierA;

  const singleMapProbA = useMemo(
    () => calculateEffectiveProbability(effectivePointsA, effectivePointsB),
    [effectivePointsA, effectivePointsB]
  );
  const singleMapProbB = 1 - singleMapProbA;

  const { seriesProbA, seriesProbB, outcomeOdds } = useMemo(
    () => calculateSeriesOdds(singleMapProbA, format),
    [singleMapProbA, format]
  );

  // 8. Match Simulation on CS2 Veto Maps with Real MR12 Rounds & Dynamic Progression
  const handleSimulateNextPoint = () => {
    if (status === 'FINISHED') return;

    // Ensure we have a completed Veto. If not, auto-complete it via Smart AI
    let activeVeto = vetoState;
    if (
      !activeVeto ||
      !activeVeto.isCompleted ||
      activeVeto.teamAId !== teamA.id ||
      activeVeto.teamBId !== teamB.id ||
      activeVeto.format !== format
    ) {
      activeVeto = executeCompleteAutoVeto(format, teamA, teamB);
      setVetoState(activeVeto);
    }

    const mapIndex = seriesMapsPlayed.length;
    const targetMapObj = activeVeto.selectedMapsInOrder[mapIndex];
    if (!targetMapObj) return;

    // Simulate authentic CS2 MR12 score (e.g. 13:9, 16:14 overtime)
    const mapSimResult = simulateCS2MapScore(teamA, teamB, targetMapObj.mapName, {
      pickedBy: targetMapObj.pickedBy,
      isDecider: targetMapObj.isDecider
    });
    const aWon = mapSimResult.winnerTeamId === teamA.id;
    const newScoreA = aWon ? scoreA + 1 : scoreA;
    const newScoreB = !aWon ? scoreB + 1 : scoreB;

    const newMapRecord: MatchSeriesMapResult = {
      mapName: targetMapObj.mapName,
      mapOrder: mapIndex + 1,
      pickedBy: targetMapObj.pickedBy,
      isDecider: targetMapObj.isDecider,
      scoreA: mapSimResult.scoreA,
      scoreB: mapSimResult.scoreB,
      overtime: mapSimResult.overtime,
      half1A: mapSimResult.half1A,
      half1B: mapSimResult.half1B,
      half2A: mapSimResult.half2A,
      half2B: mapSimResult.half2B,
      otScoreA: mapSimResult.otScoreA,
      otScoreB: mapSimResult.otScoreB,
      winProbA: mapSimResult.winProbA,
      winProbB: mapSimResult.winProbB,
      winnerTeamId: mapSimResult.winnerTeamId,
      loserTeamId: mapSimResult.loserTeamId,
      narrative: mapSimResult.narrative,
      tacticalReason: mapSimResult.tacticalReason
    };

    const updatedSeriesMaps = [...seriesMapsPlayed, newMapRecord];
    setSeriesMapsPlayed(updatedSeriesMaps);

    recordMapStatsEvent({ teamAId: teamA.id, teamBId: teamB.id, mapsPlayed: [newMapRecord] });

    setScoreA(newScoreA);
    setScoreB(newScoreB);
    soundFx.playMapWin();

    if (newScoreA === requiredWins || newScoreB === requiredWins) {
      const winnerId = newScoreA === requiredWins ? teamA.id : teamB.id;
      const winnerTeam = newScoreA === requiredWins ? teamA : teamB;
      const loserTeam = newScoreA === requiredWins ? teamB : teamA;
      const isUpset =
        winnerTeam.points < loserTeam.points &&
        loserTeam.points - winnerTeam.points >= 80;

      setStatus('FINISHED');
      soundFx.playVictory();

      // Dynamic form deltas (contextual based on opponent strength and score)
      const { deltaFormA, deltaFormB } = calculateMatchFormDeltas(
        teamA.id,
        teamB.id,
        winnerId,
        singleMapProbA,
        newScoreA,
        newScoreB
      );

      // Handle live VRS point updates if toggle is ON
      let deltaPtsA = 0;
      let deltaPtsB = 0;
      if (autoUpdatePoints) {
        if (winnerId === teamA.id) {
          deltaPtsA = stakes.winA;
          deltaPtsB = -stakes.lossB;
        } else {
          deltaPtsB = stakes.winB;
          deltaPtsA = -stakes.lossA;
        }

        setTeams((prev) =>
          prev.map((t) => {
            if (t.id === teamA.id)
              return { ...t, points: Math.max(100, t.points + deltaPtsA) };
            if (t.id === teamB.id)
              return { ...t, points: Math.max(100, t.points + deltaPtsB) };
            return t;
          })
        );
      }

      setLastMatchResult({
        deltaPointsA: autoUpdatePoints ? deltaPtsA : undefined,
        deltaPointsB: autoUpdatePoints ? deltaPtsB : undefined,
        deltaFormA,
        deltaFormB,
        autoUpdatedPoints: autoUpdatePoints
      });

      const record: MatchPrediction = {
        id: `match_${Date.now()}`,
        timestamp: Date.now(),
        format,
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        scoreA: newScoreA,
        scoreB: newScoreB,
        winnerTeamId: winnerId,
        deltaPointsA: autoUpdatePoints ? deltaPtsA : undefined,
        deltaPointsB: autoUpdatePoints ? deltaPtsB : undefined,
        deltaFormA,
        deltaFormB,
        mapsPlayed: updatedSeriesMaps,
        isUpset
      };
      saveHistory([record, ...history]);
    } else {
      setStatus('IN_PROGRESS');
    }
  };

  const handleSimulateFullMatch = () => {
    let activeVeto = vetoState;
    if (
      !activeVeto ||
      !activeVeto.isCompleted ||
      activeVeto.teamAId !== teamA.id ||
      activeVeto.teamBId !== teamB.id ||
      activeVeto.format !== format
    ) {
      activeVeto = executeCompleteAutoVeto(format, teamA, teamB);
      setVetoState(activeVeto);
    }

    const simResult = simulateSeriesOnVeto(
      format,
      teamA,
      teamB,
      activeVeto.selectedMapsInOrder
    );

    setScoreA(simResult.seriesScoreA);
    setScoreB(simResult.seriesScoreB);
    setSeriesMapsPlayed(simResult.mapsPlayed);
    setStatus('FINISHED');
    soundFx.playVictory();

    recordMapStatsEvent({ teamAId: teamA.id, teamBId: teamB.id, mapsPlayed: simResult.mapsPlayed });

    const winnerId = simResult.winnerTeamId;
    const winnerTeam = simResult.winnerTeamId === teamA.id ? teamA : teamB;
    const loserTeam = simResult.winnerTeamId === teamA.id ? teamB : teamA;
    const isUpset =
      winnerTeam.points < loserTeam.points &&
      loserTeam.points - winnerTeam.points >= 80;

    const { deltaFormA, deltaFormB } = calculateMatchFormDeltas(
      teamA.id,
      teamB.id,
      winnerId,
      singleMapProbA,
      simResult.seriesScoreA,
      simResult.seriesScoreB
    );

    let deltaPtsA = 0;
    let deltaPtsB = 0;
    if (autoUpdatePoints) {
      if (winnerId === teamA.id) {
        deltaPtsA = stakes.winA;
        deltaPtsB = -stakes.lossB;
      } else {
        deltaPtsB = stakes.winB;
        deltaPtsA = -stakes.lossA;
      }

      setTeams((prev) =>
        prev.map((t) => {
          if (t.id === teamA.id)
            return { ...t, points: Math.max(100, t.points + deltaPtsA) };
          if (t.id === teamB.id)
            return { ...t, points: Math.max(100, t.points + deltaPtsB) };
          return t;
        })
      );
    }

    setLastMatchResult({
      deltaPointsA: autoUpdatePoints ? deltaPtsA : undefined,
      deltaPointsB: autoUpdatePoints ? deltaPtsB : undefined,
      deltaFormA,
      deltaFormB,
      autoUpdatedPoints: autoUpdatePoints
    });

    const record: MatchPrediction = {
      id: `match_${Date.now()}`,
      timestamp: Date.now(),
      format,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      scoreA: simResult.seriesScoreA,
      scoreB: simResult.seriesScoreB,
      winnerTeamId: winnerId,
      deltaPointsA: autoUpdatePoints ? deltaPtsA : undefined,
      deltaPointsB: autoUpdatePoints ? deltaPtsB : undefined,
      deltaFormA,
      deltaFormB,
      mapsPlayed: simResult.mapsPlayed,
      isUpset
    };
    saveHistory([record, ...history]);
  };

  // 9. Point Editor Handlers
  const handleUpdateTeamPoints = (teamId: string, newPoints: number) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, points: newPoints } : t))
    );
  };

  const handleResetAllPoints = () => {
    setTeams((prev) =>
      prev.map((t) => ({ ...t, points: t.defaultPoints }))
    );
  };

  // 10. Custom Logo Handlers
  const handleUploadCustomLogo = (teamId: string, dataUrl: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, customLogo: dataUrl } : t))
    );
  };

  const handleResetCustomLogo = (teamId: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, customLogo: undefined } : t))
    );
  };

  const handleUpdateTeamAProfile = (updated: Team) => {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleUpdateTeamBProfile = (updated: Team) => {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleResetMapsToBaseline = () => {
    mapStatsLedgerRef.current = emptyMapStatsLedger();
    setMapStatsLedger(emptyMapStatsLedger());
    localStorage.removeItem('cs2_map_stats_ledger');
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        mapProfile: createZeroMapProfile()
      }))
    );
  };

  const trophiesTotalCount = useMemo(
    () => teams.reduce((acc, t) => acc + (t.trophies?.length || t.trophiesCount || 0), 0),
    [teams]
  );

  // Individual reset actions
  const handleClearMatchHistoryOnly = () => {
    saveHistory([]);
    setLastMatchResult(null);
  };

  const handleResetTeamVrsPointsOnly = () => {
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        points: t.defaultPoints
      }))
    );
  };

  const handleResetTeamFormAndMapsOnly = () => {
    mapStatsLedgerRef.current = emptyMapStatsLedger();
    setMapStatsLedger(emptyMapStatsLedger());
    localStorage.removeItem('cs2_map_stats_ledger');
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        mapProfile: createZeroMapProfile()
      }))
    );
  };

  const handleClearTeamTrophiesOnly = () => {
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        trophiesCount: 0,
        trophies: []
      }))
    );
  };

  const handleResetTeamPrizeMoneyOnly = () => {
    setTeams((prev) => prev.map((team) => ({ ...team, prizeMoneyEarned: 0 })));
    // Keep reset earnings from being re-applied by archived/active tournament ledgers.
    setArchivedTournaments((prev) => prev.map((tour) => ({ ...tour, prizeMoneyPayouts: {} })));
    setTournament((prev) => prev && prev.currentStage === 'completed'
      ? { ...prev, prizeMoneyPayouts: {} }
      : prev
    );
  };

  const handleResetTournamentOnly = () => {
    setTournament(null);
    localStorage.removeItem('cs2_tournament_state');
  };

  // Full reset: History, Dynamic Forms, Map Statistics, VRS, Trophies, and Tournaments
  const handleResetAllData = () => {
    soundFx.playMapWin();
    saveHistory([]);
    const resetTeams = INITIAL_TEAMS.map((t) => ({
      ...t,
      trophiesCount: 0,
      trophies: [],
      prizeMoneyEarned: 0,
      mapProfile: createZeroMapProfile()
    }));
    setTeams(resetTeams);
    setTournament(null);
    setArchivedTournaments([]);
    mapStatsLedgerRef.current = emptyMapStatsLedger();
    setMapStatsLedger(emptyMapStatsLedger());
    localStorage.removeItem('cs2_tournament_archive');
    localStorage.removeItem('cs2_map_stats_ledger');
    localStorage.removeItem('cs2_teams_data');
    localStorage.removeItem('cs2_teams_version');
    localStorage.removeItem('cs2_match_history');
    localStorage.removeItem('cs2_tournament_state');

    resetMatchState(false);
    setSeriesMapsPlayed([]);
    setVetoState(null);
    setLastMatchResult(null);
    setScoreA(0);
    setScoreB(0);
    setStatus('PENDING');
  };

  const handleClearHistoryAndResetStats = () => {
    soundFx.playClick();
    handleResetAllData();
  };

  const handleDeleteTournamentCompletely = (tour: TournamentState) => {
    const uniqueMatches = new Map<string, any>();
    const matchLists = [
      tour.swissMatches || [], tour.groupMatches || [], tour.playoffMatches || [],
      tour.lowerBracketMatches || [], tour.roundRobinMatches || [],
      ...(tour.grandFinalMatch ? [[tour.grandFinalMatch]] : []),
      ...(tour.groups || []).map((group) => group.matches || [])
    ];
    matchLists.flat().forEach((match: any) => { if (match?.id) uniqueMatches.set(match.id, match); });

    const pointsToRemove: Record<string, number> = {};
    for (const match of uniqueMatches.values()) {
      if (match.status !== 'finished') continue;
      if (match.teamAId) pointsToRemove[match.teamAId] = (pointsToRemove[match.teamAId] || 0) + (match.deltaPointsA || 0);
      if (match.teamBId) pointsToRemove[match.teamBId] = (pointsToRemove[match.teamBId] || 0) + (match.deltaPointsB || 0);
    }

    // Remove tournament awards too; these are separate from per-match VRS deltas.
    const bonusToRemove: Record<string, number> = {};
    if (tour.standings?.length) {
      tour.standings.forEach((standing) => {
        // Without a played 3rd-place match, semifinalists are listed as 3rd/4th
        // for display only; the tournament never actually awarded them VRS.
        const awardWasApplied = tour.includeThirdPlace ? standing.place <= 3 : standing.place <= 2;
        if (awardWasApplied && standing.teamId && typeof standing.vrsAwarded === 'number') {
          bonusToRemove[standing.teamId] = (bonusToRemove[standing.teamId] || 0) + standing.vrsAwarded;
        }
      });
    } else {
      teams.forEach((team) => {
        const trophy = (team.trophies || []).find((item) => item.tournamentId === tour.id);
        if (trophy?.vrsPointsAwarded) bonusToRemove[team.id] = (bonusToRemove[team.id] || 0) + trophy.vrsPointsAwarded;
      });
    }

    const nextLedger = removeTournamentFromMapStatsLedger(mapStatsLedgerRef.current, tour.id);
    mapStatsLedgerRef.current = nextLedger;
    setMapStatsLedger(nextLedger);
    try { localStorage.setItem('cs2_map_stats_ledger', JSON.stringify(nextLedger)); } catch { /* Ignore storage limits */ }

    setTeams((prev) => {
      const adjusted = prev.map((team) => {
        const removedPoints = (pointsToRemove[team.id] || 0) + (bonusToRemove[team.id] || 0);
        const trophies = (team.trophies || []).filter((item) => item.tournamentId !== tour.id);
        return {
          ...team,
          points: Math.max(100, team.points - removedPoints),
          prizeMoneyEarned: Math.max(0, (team.prizeMoneyEarned || 0) - (tour.prizeMoneyPayouts?.[team.id] || 0)),
          trophies,
          trophiesCount: trophies.length
        };
      });
      return replayMapStatsLedger(adjusted, nextLedger);
    });

    setHistory((prev) => {
      const filtered = prev.filter((match) => match.tournamentId !== tour.id);
      try { localStorage.setItem('cs2_match_history', JSON.stringify(filtered.slice(0, 40))); } catch { /* Ignore */ }
      return filtered;
    });
    setArchivedTournaments((prev) => prev.filter((item) => item.id !== tour.id));
    if (tournament?.id === tour.id) {
      setTournament(null);
      try { localStorage.removeItem('cs2_tournament_state'); } catch { /* Ignore */ }
    } else if (tournament) {
      // Deleting an archived tournament must not erase a different active tournament.
      try { localStorage.setItem('cs2_tournament_state', JSON.stringify(tournament)); } catch { /* Ignore */ }
    } else {
      try { localStorage.removeItem('cs2_tournament_state'); } catch { /* Ignore */ }
    }
  };

  const handleSelectTeamFromLeaderboard = (team: Team) => {
    setTeamAId(team.id);
    if (teamBId === team.id) {
      const other = teams.find((t) => t.id !== team.id);
      if (other) setTeamBId(other.id);
    }
    setActiveTab('predictor');
    resetMatchState();
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 flex flex-col relative selection:bg-amber-500 selection:text-black">
      {/* Background Esports Arena Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={arenaBg}
          alt=""
          className="w-full h-full object-cover object-center opacity-15 filter brightness-75 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070a10]/80 via-[#070a10]/95 to-[#070a10]" />
      </div>

      {/* Top Bar Header with Tabs */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-[#0a0e17]/85 backdrop-blur-md px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-lg sm:text-xl tracking-wider text-white">
              CS2 <span className="text-amber-400">PREDICTOR</span>
            </span>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-[#090d14] rounded-xl border border-slate-800">
            <button
              onClick={() => {
                soundFx.playClick();
                setActiveTab('predictor');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'predictor'
                  ? 'bg-amber-500 text-black shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Предиктор матча</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setActiveTab('leaderboard');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-black shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Топ команд</span>
              <span className="text-[10px] opacity-75 font-mono">({teams.length})</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setActiveTab('tournament');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tournament'
                  ? 'bg-amber-500 text-black shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Сетка турнира</span>
            </button>
            <button
              onClick={() => { soundFx.playClick(); setActiveTab('archive'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'archive' ? 'bg-amber-500 text-black shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Прошедшие турниры</span>
              <span className="text-[10px] opacity-75 font-mono">({archivedTournaments.length})</span>
            </button>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              soundFx.playClick();
              setIsPointsEditorOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Изменить</span> поинты
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setIsLogoHelperOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Image className="w-3.5 h-3.5" />
            <span>Логотипы</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Настройки симуляции"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Настройки</span>
          </button>

          {/* Data Reset & Management Modal Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              setIsDataModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Управление данными: очистить историю, сбросить VRS, форму или удалить турниры"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Сброс данных</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`relative z-10 flex-1 w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 ${
        activeTab === 'tournament' ? 'max-w-6xl' : 'max-w-5xl'
      }`}>
        {activeTab === 'predictor' ? (
          <>
            {/* CS2 Match Stage */}
            <MatchArena
              teamA={teamA}
              teamB={teamB}
              format={format}
              onSelectFormat={handleSelectFormat}
              onOpenSelectorA={() => setIsSelectorAOpen(true)}
              onOpenSelectorB={() => setIsSelectorBOpen(true)}
              onSwapTeams={handleSwapTeams}
              onRandomizeBothTeams={handleRandomizeBothTeams}
              onRandomizeTeamA={handleRandomizeTeamA}
              onRandomizeTeamB={handleRandomizeTeamB}
              onOpenPointsEditor={() => setIsPointsEditorOpen(true)}
              scoreA={scoreA}
              scoreB={scoreB}
              requiredWins={requiredWins}
              seriesProbA={seriesProbA}
              seriesProbB={seriesProbB}
              singleMapProbA={singleMapProbA}
              singleMapProbB={singleMapProbB}
              outcomeOdds={outcomeOdds}
              formA={formA}
              formB={formB}
              h2h={h2h}
              isMuted={isMuted}
              onToggleMute={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                soundFx.setMuted(nextMuted);
              }}
              status={status}
              lastMatchResult={lastMatchResult}
              onSimulateNextPoint={handleSimulateNextPoint}
              onSimulateFullMatch={handleSimulateFullMatch}
              onResetMatch={() => resetMatchState(false)}
              vetoState={vetoState}
              onOpenVetoModal={() => setIsVetoModalOpen(true)}
              seriesMapsPlayed={seriesMapsPlayed}
            />

            {/* Active Duty 7 Maps Matchup Comparison */}
            <MapMatchupComparisonView
              teamA={teamA}
              teamB={teamB}
              onUpdateTeamAProfile={handleUpdateTeamAProfile}
              onUpdateTeamBProfile={handleUpdateTeamBProfile}
              onResetToBaseline={handleResetMapsToBaseline}
            />

            {/* VRS Points Stakes Table */}
            <MatchStakesTable
              teamA={teamA}
              teamB={teamB}
              stakes={stakes}
              autoUpdatePoints={autoUpdatePoints}
              onToggleAutoUpdatePoints={() => setAutoUpdatePoints((prev) => !prev)}
            />

            {/* Prediction History with Form Tracking */}
            <PredictionHistory
              history={history}
              teams={teams}
              onClearHistory={handleClearHistoryAndResetStats}
            />
          </>
        ) : activeTab === 'leaderboard' ? (
          /* Separate Leaderboard Tab */
          <TeamsLeaderboard
            teams={teams}
            history={history}
            onSelectTeamForProfile={(t) => setInspectTeam(t)}
            onSelectTeamForMatch={handleSelectTeamFromLeaderboard}
            onOpenPointsEditor={() => setIsPointsEditorOpen(true)}
          />
        ) : activeTab === 'archive' ? (
          <section className="mx-auto w-full max-w-6xl space-y-5">
            <div className="rounded-3xl border border-slate-800 bg-[#0f1420]/95 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Архив турниров</h2>
                  <p className="mt-1 text-xs text-slate-400">Завершённые турниры, результаты матчей и влияние на статистику команд.</p>
                </div>
                <span className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-300">Всего: {archivedTournaments.length}</span>
              </div>
            </div>
            {archivedTournaments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
                <Trophy className="mx-auto h-9 w-9 text-slate-600" />
                <h3 className="mt-3 text-sm font-bold text-slate-300">Пока нет завершённых турниров</h3>
                <p className="mt-1 text-xs text-slate-500">Когда турнир завершится, он автоматически появится здесь.</p>
              </div>
            ) : [...archivedTournaments].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')).map((tour) => {
              const championId = tour.standings?.find((standing) => standing.place === 1)?.teamId;
              const champion = teams.find((team) => team.id === championId);
              const completedMatches = [ ...(tour.swissMatches || []), ...(tour.groupMatches || []), ...(tour.playoffMatches || []), ...(tour.roundRobinMatches || []), ...(tour.lowerBracketMatches || []), ...((tour.majorStages || []).flatMap((stage) => stage.matches || [])) ];
              const playedCount = new Set(completedMatches.filter((match) => match.status === 'finished').map((match) => match.id)).size;
              return (
                <article key={tour.id} className="rounded-2xl border border-slate-800 bg-[#0f1420]/90 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10"><Trophy className="h-5 w-5 text-amber-400" /></div>
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-extrabold text-white">{tour.name || 'Турнир без названия'}</h3>
                        <p className="mt-1 text-xs text-slate-400">{tour.tier || 'Турнир'} · {tour.teamCount || tour.participatingTeamIds?.length || 0} команд · {playedCount} сыгранных матчей</p>
                        <p className="mt-1 text-xs text-slate-500">Дата начала: {tour.startDate || 'не указана'}{champion ? ` · Чемпион: ${champion.name}` : ''}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { if (window.confirm(`Полностью удалить турнир «${tour.name || 'без названия'}» и отменить его влияние на VRS и статистику карт?`)) handleDeleteTournamentCompletely(tour); }} className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20"><Trash2 className="h-3.5 w-3.5" />Удалить турнир</button>
                  </div>
                  {tour.standings?.length ? <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-3">{tour.standings.slice(0, 3).map((standing) => { const team = teams.find((item) => item.id === standing.teamId); return <span key={`${standing.place}-${standing.teamId}`} className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-300">{standing.place}. {team?.name || standing.teamId}{typeof standing.vrsAwarded === 'number' ? ` · +${standing.vrsAwarded} VRS` : ''}</span>; })}</div> : null}
                </article>
              );
            })}
          </section>
        ) : (
          /* Tournament Stage Brackets Tab */
          <TournamentHub
            teams={teams}
            tournament={tournament}
            onUpdateTournament={setTournament}
            onDeleteTournament={handleDeleteTournamentCompletely}
            onUpdateTeams={(updatedTeams) => setTeams((prev) => prev.map((current) => {
              const replacement = updatedTeams.find((updated) => updated.id === current.id);
              return replacement ? { ...current, trophies: replacement.trophies, trophiesCount: replacement.trophiesCount, prizeMoneyEarned: replacement.prizeMoneyEarned } : current;
            }))}
            onApplyVrsPoints={(changes) => setTeams((prev) => prev.map((team) => {
              const delta = changes.filter((change) => change.teamId === team.id).reduce((sum, change) => sum + change.delta, 0);
              return delta ? { ...team, points: Math.max(100, team.points + delta) } : team;
            }))}
            onRecordMatchPrediction={(pred) => {
              setHistory((prev) => {
                const next = [pred, ...prev].slice(0, 40);
                try { localStorage.setItem('cs2_match_history', JSON.stringify(next)); } catch { /* Ignore */ }
                return next;
              });
              recordMapStatsEvent({
                id: pred.id,
                timestamp: pred.timestamp,
                teamAId: pred.teamAId,
                teamBId: pred.teamBId,
                mapsPlayed: pred.mapsPlayed,
                tournamentId: pred.tournamentId,
                tournamentName: pred.tournamentName,
                stageName: pred.tournamentStage
              });
            }}
            history={history}
            onOpenDataManagement={() => setIsDataModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-[#06080d] py-5 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Counter-Strike 2 VRS Match Predictor · Valve Regional Standings</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>BO1 / BO3 / BO5</span>
            <span>·</span>
            <span>Динамическая форма</span>
            <span>·</span>
            <span>16 Команд</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TeamSelector
        isOpen={isSelectorAOpen}
        onClose={() => setIsSelectorAOpen(false)}
        teams={teams}
        selectedTeamId={teamA.id}
        opponentTeamId={teamB.id}
        slotName="Team A"
        onSelectTeam={(team) => {
          setTeamAId(team.id);
          resetMatchState(false);
        }}
      />

      <TeamSelector
        isOpen={isSelectorBOpen}
        onClose={() => setIsSelectorBOpen(false)}
        teams={teams}
        selectedTeamId={teamB.id}
        opponentTeamId={teamA.id}
        slotName="Team B"
        onSelectTeam={(team) => {
          setTeamBId(team.id);
          resetMatchState(false);
        }}
      />

      <PointsEditorModal
        isOpen={isPointsEditorOpen}
        onClose={() => setIsPointsEditorOpen(false)}
        teams={teams}
        onUpdateTeamPoints={handleUpdateTeamPoints}
        onResetAllPoints={handleResetAllPoints}
        onApplyDefaultPoints={(map) => {
          localStorage.setItem(HLTV_DEFAULTS_KEY, JSON.stringify({ ...loadStoredHltvDefaults(), ...map }));
          setTeams((prev) => applyDefaultPointsMap(prev, map));
        }}
      />

      <LogoHelperModal
        isOpen={isLogoHelperOpen}
        onClose={() => setIsLogoHelperOpen(false)}
        teams={teams}
        onUploadCustomLogo={handleUploadCustomLogo}
        onResetCustomLogo={handleResetCustomLogo}
      />

      {/* CS2 Map Veto Interactive Modal */}
      <MapVetoModal
        isOpen={isVetoModalOpen}
        onClose={() => setIsVetoModalOpen(false)}
        teamA={teamA}
        teamB={teamB}
        format={format}
        currentVetoState={vetoState}
        onVetoCompleted={(finalState) => {
          setVetoState(finalState);
          setSeriesMapsPlayed([]);
          setScoreA(0);
          setScoreB(0);
          setStatus('PENDING');
          setIsVetoModalOpen(false);
        }}
      />

      {/* Dedicated Team Profile & Match History Modal */}
      {inspectTeam && (
        <TeamProfileModal
          team={inspectTeam}
          onClose={() => setInspectTeam(null)}
          teams={teams}
          history={history}
          form={calculateTeamForm(inspectTeam.id, history)}
          rank={[...teams].sort((a, b) => b.points - a.points).findIndex((t) => t.id === inspectTeam.id) + 1}
          onSelectForMatch={(t) => {
            handleSelectTeamFromLeaderboard(t);
            setInspectTeam(null);
          }}
        />
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Comprehensive Data Management & Granular Reset Modal */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onClearMatchHistory={handleClearMatchHistoryOnly}
        onResetTeamVrsPoints={handleResetTeamVrsPointsOnly}
        onResetTeamFormAndMaps={handleResetTeamFormAndMapsOnly}
        onClearTeamTrophies={handleClearTeamTrophiesOnly}
        onResetTeamPrizeMoney={handleResetTeamPrizeMoneyOnly}
        onResetTournament={handleResetTournamentOnly}
        onResetAll={handleResetAllData}
        historyCount={history.length}
        trophiesTotalCount={trophiesTotalCount}
        prizeMoneyTotal={teams.reduce((total, team) => total + (team.prizeMoneyEarned || 0), 0)}
        hasActiveTournament={!!tournament}
        activeTournamentName={tournament?.name}
      />
    </div>
  );
}
