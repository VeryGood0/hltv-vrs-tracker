// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React, { useEffect, useState } from 'react';
import {
  TournamentState,
  TournamentMatch,
  TournamentMode,
  Team,
  MatchPrediction,
  MatchSeriesMapResult,
  MatchFormat,
  VetoState
} from '../types';
import { SwissStageView } from './SwissStageView';
import { PlayoffsStageView } from './PlayoffsStageView';
import { BlastBountyStageView } from './BlastBountyStageView';
import { GslGroupsView } from './GslGroupsView';
import { TournamentSimulationModal } from './TournamentSimulationModal';
import { TournamentResultsModal } from './TournamentResultsModal';
import { SwissPairsModal } from './SwissPairsModal';
import { TeamSelector } from './TeamSelector';
import { CreateTournamentModal } from './CreateTournamentModal';
import {
  advanceSwissRound,
  updatePlayoffMatchResult,
  updateGroupMatchResult,
  computeFinalTournamentStandings,
  calculateTournamentPrizeMoneyPayouts,
  calculateTournamentVrsBounties,
  createDefaultSwissRound1Matches,
  swapSwissRoundMatches,
  swapPlayoffMatches,
  calculateTournamentMatchDeltas,
  seedPlayoffsFromSwiss,
  extractTeamTournamentMatches,
  createCustomTournament,
  isEightTeamGslTournament,
  isThirdPlaceMatch,
  isGrandFinalMatch
} from '../utils/tournament';
import { executeCompleteAutoVeto } from '../utils/vetoEngine';
import { simulateSeriesOnVeto } from '../utils/mapSimulation';
import { soundFx } from '../utils/audio';
import {
  Trophy,
  Dices,
  RotateCcw,
  FastForward,
  Sparkles,
  GitBranch,
  Grid,
  Zap,
  SlidersHorizontal,
  Trash2,
  PlusCircle,
  Plus,
  Play
} from 'lucide-react';

/** Commit the user-picked opponent draft for the current BLAST Bounty round. */
const commitBlastBountyDraft = (
  tournament: TournamentState,
  pairings: { favoriteId: string; underdogId: string }[]
): TournamentState => {
  if (tournament.mode !== 'blast_bounty') return tournament;
  const round = tournament.bountyCurrentRound || 1;
  const roundMatches = tournament.playoffMatches
    .filter((match) => match.roundNumber === round)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  if (pairings.length !== roundMatches.length) return tournament;
  const uniqueTeams = pairings.flatMap((pair) => [pair.favoriteId, pair.underdogId]);
  if (new Set(uniqueTeams).size !== uniqueTeams.length) return tournament;
  const nextMatches = tournament.playoffMatches.map((match) => {
    if (match.roundNumber !== round) return match;
    const index = roundMatches.findIndex((candidate) => candidate.id === match.id);
    const pairing = pairings[index];
    if (!pairing) return match;
    return {
      ...match,
      teamAId: pairing.favoriteId,
      teamBId: pairing.underdogId,
      scoreA: 0,
      scoreB: 0,
      winnerId: undefined,
      loserId: undefined,
      status: 'ready' as const
    };
  });
  return { ...tournament, playoffMatches: nextMatches };
};

/** Deterministic draft used only by the full-tournament auto-simulator. */
const autoDraftBlastBountyRound = (tournament: TournamentState): TournamentState => {
  if (tournament.mode !== 'blast_bounty') return tournament;
  const round = tournament.bountyCurrentRound || 1;
  const currentMatches = tournament.playoffMatches.filter((match) => match.roundNumber === round);
  if (!currentMatches.length || currentMatches.some((match) => !!match.teamAId || !!match.teamBId)) return tournament;
  const participantIds = round === 1
    ? tournament.participatingTeamIds || []
    : tournament.playoffMatches.filter((match) => match.roundNumber === round - 1 && match.status === 'finished' && match.winnerId).map((match) => match.winnerId!);
  const seeds = tournament.bountySeeds || tournament.teamSeeds || {};
  const sortedIds = [...participantIds].sort((a, b) => (seeds[a] || 99) - (seeds[b] || 99));
  const half = Math.floor(sortedIds.length / 2);
  const favorites = sortedIds.slice(0, half);
  const underdogs = sortedIds.slice(half).reverse();
  if (favorites.length !== currentMatches.length || underdogs.length !== currentMatches.length) return tournament;
  return commitBlastBountyDraft(tournament, underdogs.map((underdogId, index) => ({
    favoriteId: favorites[favorites.length - 1 - index],
    underdogId
  })));
};

/** Applies 50/50 bounty rollover, seed inheritance and any accepted LAN wager once. */
const calculateRoundRobinTableFromMatches = (tournament: TournamentState) => {
  const teamIds = tournament.participatingTeamIds || Object.keys(tournament.teamSeeds || {});
  const table = new Map(teamIds.map((teamId) => [teamId, {
    teamId, played: 0, wins: 0, losses: 0, mapDiff: 0, points: 0
  }]));
  const sourceMatches = tournament.roundRobinMatches?.length
    ? tournament.roundRobinMatches
    : tournament.playoffMatches || [];
  const matches = sourceMatches.filter((match) =>
    match.stage === 'round_robin' && match.status === 'finished' && match.teamAId && match.teamBId
  );
  matches.forEach((match) => {
    const a = table.get(match.teamAId!);
    const b = table.get(match.teamBId!);
    if (!a || !b) return;
    a.played += 1;
    b.played += 1;
    a.mapDiff += (match.scoreA || 0) - (match.scoreB || 0);
    b.mapDiff += (match.scoreB || 0) - (match.scoreA || 0);
    const winner = table.get(match.winnerId || '');
    const loserId = match.loserId || (match.winnerId === match.teamAId ? match.teamBId : match.teamAId);
    const loser = table.get(loserId || '');
    if (winner && loser) {
      winner.wins += 1;
      winner.points += 3;
      loser.losses += 1;
    }
  });
  return [...table.values()].sort((a, b) =>
    b.points - a.points || b.wins - a.wins || b.mapDiff - a.mapDiff
  );
};

const applyBlastBountyAfterMatch = (tournament: TournamentState, matchId: string): TournamentState => {
  if (tournament.mode !== 'blast_bounty') return tournament;
  const processed = tournament.bountyProcessedMatchIds || [];
  if (processed.includes(matchId)) return tournament;
  const match = tournament.playoffMatches.find((item) => item.id === matchId);
  if (!match || match.status !== 'finished' || !match.winnerId || !match.loserId) return tournament;

  const winnerId = match.winnerId;
  const loserId = match.loserId;
  const heads = { ...(tournament.bountyHeads || {}) };
  const bank = { ...(tournament.bountyBank || {}) };
  const bountySeeds = { ...(tournament.bountySeeds || tournament.teamSeeds || {}) };
  const teamSeeds = { ...(tournament.teamSeeds || {}) };
  bank[winnerId] = bank[winnerId] || 0;
  bank[loserId] = bank[loserId] || 0;

  const wager = tournament.bountyWagers?.[matchId];
  if (wager && wager.amount > 0) {
    const challengerId = wager.challengerId;
    const opponentId = challengerId === match.teamAId ? match.teamBId : match.teamAId;
    const amount = Math.floor(wager.amount);
    if (opponentId && amount > 0 && (bank[challengerId] || 0) >= amount && (bank[opponentId] || 0) >= amount) {
      bank[challengerId] = Math.max(0, (bank[challengerId] || 0) - amount);
      bank[opponentId] = Math.max(0, (bank[opponentId] || 0) - amount);
      bank[winnerId] = (bank[winnerId] || 0) + amount * 2;
    }
  }

  const defeatedHead = Math.max(0, heads[loserId] || 0);
  const instantPayout = defeatedHead / 2;
  const rollover = defeatedHead - instantPayout;
  bank[winnerId] = (bank[winnerId] || 0) + instantPayout;
  heads[winnerId] = Math.max(0, heads[winnerId] || 0) + rollover;
  heads[loserId] = 0;

  const winnerSeed = bountySeeds[winnerId] || teamSeeds[winnerId] || 99;
  const loserSeed = bountySeeds[loserId] || teamSeeds[loserId] || 99;
  if (winnerSeed > loserSeed) {
    bountySeeds[winnerId] = loserSeed;
    teamSeeds[winnerId] = loserSeed;
  }

  const processedNext = [...processed, matchId];
  let nextTour: TournamentState = {
    ...tournament,
    bountyHeads: heads,
    bountyBank: bank,
    bountySeeds,
    teamSeeds,
    bountyProcessedMatchIds: processedNext
  };
  const currentRound = nextTour.bountyCurrentRound || 1;
  const thisRound = nextTour.playoffMatches.filter((item) => item.roundNumber === currentRound);
  if (currentRound < 5 && thisRound.length > 0 && thisRound.every((item) => item.status === 'finished')) {
    nextTour = { ...nextTour, bountyCurrentRound: currentRound + 1 };
  }
  return nextTour;
};

interface TournamentHubProps {
  teams: Team[];
  tournament: TournamentState | null;
  onUpdateTournament: (tour: TournamentState | null) => void;
  onDeleteTournament?: (tour: TournamentState) => void;
  onUpdateTeams?: (teams: Team[]) => void;
  onApplyVrsPoints?: (changes: { teamId: string; delta: number }[]) => void;
  onRecordMatchPrediction?: (prediction: MatchPrediction) => void;
  history?: MatchPrediction[];
  onOpenDataManagement?: () => void;
}

export const TournamentHub: React.FC<TournamentHubProps> = ({
  teams,
  tournament,
  onUpdateTournament,
  onDeleteTournament,
  onUpdateTeams,
  onApplyVrsPoints,
  onRecordMatchPrediction,
  history = [],
  onOpenDataManagement
}) => {
  type StageTab = 'swiss' | 'playoffs' | 'groups' | 'major_1' | 'major_2' | 'major_3';
  const getInitialStageTab = (tour?: TournamentState | null): StageTab => {
    if (tour?.mode === 'swiss_system') return 'swiss';
    if (tour?.mode === 'major') {
      if (tour.currentStage === 'playoffs' || tour.currentStage === 'completed' || tour.majorStageNumber === 4) return 'playoffs';
      const stageNumber = tour.majorStageNumber || 1;
      return (`major_${stageNumber}` as StageTab);
    }
    if (tour?.mode === 'gsl_groups' || tour?.mode === 'groups_playoffs') {
      return tour.currentStage === 'playoffs' || tour.currentStage === 'completed' ? 'playoffs' : 'groups';
    }
    return tour?.mode === 'playoffs_only' || tour?.mode === 'single_elimination' || tour?.mode === 'double_elimination' || tour?.mode === 'round_robin' ||
      tour?.currentStage === 'playoffs' || tour?.currentStage === 'completed'
      ? 'playoffs'
      : 'swiss';
  };
  const [stageTabSelection, setStageTabSelection] = useState<{ tournamentId?: string; tab: StageTab }>(() => ({
    tournamentId: tournament?.id,
    tab: getInitialStageTab(tournament)
  }));
  // Resolve the correct tab synchronously when the tournament ID changes, so a newly
  // created groups tournament never briefly renders the playoff bracket first.
  const activeStageTab = stageTabSelection.tournamentId === tournament?.id
    ? stageTabSelection.tab
    : getInitialStageTab(tournament);
  const setActiveStageTab = (tab: StageTab) => {
    setStageTabSelection({ tournamentId: tournament?.id, tab });
  };

  const [activeMatchToSimulate, setActiveMatchToSimulate] = useState<TournamentMatch | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isPairsEditorOpen, setIsPairsEditorOpen] = useState(false);
  const [isCreateTournamentOpen, setIsCreateTournamentOpen] = useState(false);

  // Manual team slot picker state
  const [manualSlotPicker, setManualSlotPicker] = useState<{
    matchId: string;
    slot: 'A' | 'B';
  } | null>(null);

  // Helper to finalize tournament victory, award dynamic VRS points, and add trophy.
  // Kept above the empty-state return so the repair effect below can safely use it.
  const finalizeTournamentVictory = (tourState: TournamentState): TournamentState => {
    // Do not award the title or VRS points twice. A legacy tournament can be
    // marked completed without ever recording its trophy, so allow that state
    // to be repaired once the final results are present.
    const alreadyAwarded = teams.some((t) => (t.trophies || []).some((tr) => tr.tournamentId === tourState.id));
    const prizeMoneyAlreadyBooked = tourState.prizeMoneyPayouts !== undefined;
    if (tourState.currentStage === 'completed' && alreadyAwarded && prizeMoneyAlreadyBooked) return tourState;
    const tourTier =
      tourState.tier ||
      (tourState.name?.toLowerCase().includes('major') ? 'Major' : 'S-Tier');
    const bounties = calculateTournamentVrsBounties(
      tourTier,
      teams,
      tourState.teamCount || 16
    );
    const standings = computeFinalTournamentStandings(tourState, teams, bounties);
    const prizeMoneyPayouts = prizeMoneyAlreadyBooked
      ? (tourState.prizeMoneyPayouts || {})
      : calculateTournamentPrizeMoneyPayouts(tourState, standings);
    const shouldBookPrizeMoney = !prizeMoneyAlreadyBooked;

    const champId = standings[0]?.teamId;
    const finalistId = standings[1]?.teamId;
    const thirdId = standings[2]?.teamId;
    const tourTitle = tourState.name || 'CS2 Championship';

    if (onUpdateTeams && ((champId && !alreadyAwarded) || shouldBookPrizeMoney)) {
      const finalistTeam = teams.find((t) => t.id === finalistId);
      const updatedTeams = teams.map((t) => {
        let updatedTeam = {
          ...t,
          prizeMoneyEarned: (t.prizeMoneyEarned || 0) + (shouldBookPrizeMoney ? (prizeMoneyPayouts[t.id] || 0) : 0)
        };
        if (t.id === champId && !alreadyAwarded) {
          const currentTrophies = t.trophies || [];
          const champMatches = extractTeamTournamentMatches(tourState, champId, teams);
          const newTrophy = {
            id: `tr_${Date.now()}`,
            tournamentId: tourState.id,
            name: tourTitle,
            year: new Date().getFullYear(),
            date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
            tier: tourTier,
            vrsPointsAwarded: bounties.championBonus,
            runnerUpTeamName: finalistTeam?.name,
            runnerUpTeamId: finalistId,
            teamCount: tourState.teamCount || 16,
            mode: tourState.mode,
            matchesPlayed: champMatches
          };
          updatedTeam = {
            ...updatedTeam,
            trophiesCount: currentTrophies.length + 1,
            trophies: [newTrophy, ...currentTrophies]
          };
        }
        return updatedTeam;
      });
      onUpdateTeams(updatedTeams);
      if (!alreadyAwarded && onApplyVrsPoints) {
        const awards = [
          ...(champId ? [{ teamId: champId, delta: bounties.championBonus }] : []),
          ...(finalistId ? [{ teamId: finalistId, delta: bounties.finalistBonus }] : []),
          ...(thirdId && (tourState.includeThirdPlace || tourState.playoffMatches.some(isThirdPlaceMatch)) ? [{ teamId: thirdId, delta: bounties.thirdPlaceBonus }] : [])
        ];
        onApplyVrsPoints(awards);
      }
    }

    const completedTour: TournamentState = {
      ...tourState,
      currentStage: 'completed',
      standings,
      tier: tourTier,
      championVrsBonus: bounties.championBonus,
      prizeMoneyPayouts
    };
    setIsResultsOpen(true);
    soundFx.playVictory();
    return completedTour;
  };

  // Repair old saved 8-team GSL tournaments and recover finals that were already
  // played before the third-place routing bug was fixed. This also lets the normal
  // App archive effect see currentStage="completed" and save the event.
  useEffect(() => {
    if (!tournament) return;

    let workingTour = tournament;
    if (isEightTeamGslTournament(workingTour)) {
      const matches = [...(workingTour.playoffMatches || [])];
      const sf1 = matches.find((match) => match.poolKey === 'sf1');
      const sf2 = matches.find((match) => match.poolKey === 'sf2');
      const loserOf = (match?: TournamentMatch) => match?.loserId || (
        match?.winnerId ? (match.winnerId === match.teamAId ? match.teamBId : match.teamAId) : undefined
      );
      const existingThirdIndex = matches.findIndex(isThirdPlaceMatch);
      const expectedA = loserOf(sf1);
      const expectedB = loserOf(sf2);
      let repaired = !workingTour.includeThirdPlace || existingThirdIndex < 0;

      if (existingThirdIndex < 0) {
        const teamAId = expectedA;
        const teamBId = expectedB;
        matches.push({
          id: 'playoff_3rd',
          stage: 'playoffs',
          poolKey: 'third_place',
          roundNumber: Math.max(sf1?.roundNumber || 2, sf2?.roundNumber || 2) + 1,
          name: 'Матч за 3-е место (Бронзовый финал)',
          teamAId,
          teamBId,
          scoreA: 0,
          scoreB: 0,
          format: sf1?.format || workingTour.stageFormats?.semifinalFormat || 'BO3',
          status: teamAId && teamBId ? 'ready' : 'scheduled'
        });
        repaired = true;
      } else {
        const oldThird = matches[existingThirdIndex];
        // Never rewrite a completed bronze result. Before it's played, use the
        // actual semifinal losers when available, instead of requiring manual seeding.
        if (oldThird.status !== 'finished') {
          const teamAId = expectedA || oldThird.teamAId;
          const teamBId = expectedB || oldThird.teamBId;
          const status = teamAId && teamBId ? 'ready' : 'scheduled';
          if (oldThird.teamAId !== teamAId || oldThird.teamBId !== teamBId || oldThird.status !== status) {
            matches[existingThirdIndex] = { ...oldThird, teamAId, teamBId, status };
            repaired = true;
          }
        }
      }

      if (repaired) {
        const restoredThird = matches.find(isThirdPlaceMatch);
        const restoredFinal = matches.find(isGrandFinalMatch);
        const mustReopenForBronze = workingTour.currentStage === 'completed'
          && !!(restoredFinal?.status === 'finished' && restoredFinal.winnerId)
          && !(restoredThird?.status === 'finished' && restoredThird.winnerId);
        workingTour = {
          ...workingTour,
          currentStage: mustReopenForBronze ? 'playoffs' : workingTour.currentStage,
          includeThirdPlace: true,
          playoffMatches: matches
        };
        onUpdateTournament(workingTour);
        return;
      }

      // Some older builds finished the event as soon as the Grand Final ended,
      // even though an 8-team GSL must still play the bronze match. Reopen those
      // saved events so the semifinal losers can be routed and the result counted.
      const oldFinal = matches.find(isGrandFinalMatch);
      const oldBronze = matches.find(isThirdPlaceMatch);
      if (workingTour.currentStage === 'completed'
        && oldFinal?.status === 'finished' && oldFinal.winnerId
        && !(oldBronze?.status === 'finished' && oldBronze.winnerId)) {
        onUpdateTournament({
          ...workingTour,
          currentStage: 'playoffs',
          includeThirdPlace: true,
          playoffMatches: matches
        });
        return;
      }
    }

    const finalMatch = (workingTour.playoffMatches || []).find(isGrandFinalMatch);
    const bronzeMatch = (workingTour.playoffMatches || []).find(isThirdPlaceMatch);
    const finalFinished = !!(finalMatch?.status === 'finished' && finalMatch.winnerId);
    const bronzeFinished = !bronzeMatch || (bronzeMatch.status === 'finished' && !!bronzeMatch.winnerId);

    if (workingTour.currentStage === 'completed') {
      const championTeam = teams.find((team) => team.id === finalMatch?.winnerId);
      const championTrophy = (championTeam?.trophies || []).find((trophy) => trophy.tournamentId === workingTour.id);
      const championTrophyExists = !!championTrophy;
      if (!championTrophyExists && finalFinished && bronzeFinished) {
        onUpdateTournament(finalizeTournamentVictory({
          ...workingTour,
          includeThirdPlace: workingTour.includeThirdPlace || !!bronzeMatch
        }));
      } else if (championTrophyExists && finalFinished && bronzeFinished) {
        // Backfill cash payouts once for older active tournaments that already had a trophy.
        if (workingTour.prizeMoneyPayouts === undefined) {
          const legacyStandings = workingTour.standings?.length
            ? workingTour.standings
            : computeFinalTournamentStandings(workingTour, teams);
          const prizeMoneyPayouts = calculateTournamentPrizeMoneyPayouts(workingTour, legacyStandings);
          if (onUpdateTeams) {
            onUpdateTeams(teams.map((team) => ({
              ...team,
              prizeMoneyEarned: (team.prizeMoneyEarned || 0) + (prizeMoneyPayouts[team.id] || 0)
            })));
          }
          onUpdateTournament({ ...workingTour, prizeMoneyPayouts, standings: legacyStandings });
          return;
        }
        // Recalculate legacy standings when an older build misidentified a
        // quarterfinal containing the seed label `3-е место` as the bronze match.
        // Preserve existing VRS values while correcting actual team placements.
        const oldStandings = workingTour.standings || [];
        const valueForPlace = (place: number) => oldStandings.find((standing) => standing.place === place)?.vrsAwarded || 0;
        const correctedStandings = computeFinalTournamentStandings(workingTour, teams, {
          championBonus: championTrophy.vrsPointsAwarded || workingTour.championVrsBonus || valueForPlace(1),
          finalistBonus: valueForPlace(2),
          thirdPlaceBonus: valueForPlace(3)
        });
        const placementsMatch = oldStandings.length === correctedStandings.length
          && correctedStandings.every((standing, index) => {
            const old = oldStandings[index];
            return old?.place === standing.place
              && old?.teamId === standing.teamId
              && old?.placeLabel === standing.placeLabel;
          });
        if (!placementsMatch) {
          onUpdateTournament({
            ...workingTour,
            standings: correctedStandings,
            includeThirdPlace: workingTour.includeThirdPlace || !!bronzeMatch
          });
        }
      }
      return;
    }

    if (finalFinished && bronzeFinished) {
      const completedTour = finalizeTournamentVictory({
        ...workingTour,
        includeThirdPlace: workingTour.includeThirdPlace || !!bronzeMatch
      });
      onUpdateTournament(completedTour);
    }
  }, [tournament, teams, onUpdateTournament, onUpdateTeams, onApplyVrsPoints]);

  // If no tournament has been created yet, show the Tournament Creation Hub
  if (!tournament) {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-200">
        {/* Welcome Empty State Banner */}
        <div className="p-8 sm:p-12 bg-gradient-to-br from-[#0e1422] via-[#090d16] to-[#04060a] border border-amber-500/30 rounded-3xl shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Central Trophy Icon & Title */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-slate-900 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/20 mb-4 animate-bounce duration-1000">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/25">
                CS2 Tournament Arena · Сетка и симуляция
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Для симуляции матчей создайте турнир
            </h2>

            <p className="text-sm text-slate-300 max-w-2xl mx-auto mt-2 leading-relaxed">
              Чтобы сформировать турнирную сетку и начать симулировать матчи, создайте чемпионат.
              Выберите статус (Major, S-Tier, A-Tier...), регламент стадий (швейцарка, плей-офф, группы) и участников.
              Победитель получит динамические рейтинговые очки VRS, а кубок и все сыгранные матчи с этапами сохранятся в статистике команды!
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                soundFx.playClick();
                setIsCreateTournamentOpen(true);
              }}
              className="px-7 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-2xl text-sm uppercase tracking-wider transition-all shadow-xl shadow-amber-500/25 active:scale-95 cursor-pointer flex items-center gap-2.5"
            >
              <Trophy className="w-5 h-5 fill-black" />
              <span>Создать турнир (Конструктор)</span>
            </button>
          </div>

          {/* Quick Presets Grid */}
          <div className="relative z-10 pt-8 border-t border-slate-800/80">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold mb-4">
              Либо выберите готовый чемпионат для мгновенного старта:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto text-left">
              {/* Preset 1: Valve Major */}
              <div
                onClick={() => {
                  soundFx.playClick();
                  const sorted = [...teams].sort((a, b) => b.points - a.points);
                  const majorTeams = sorted.slice(0, 32);
                  const majorStageAssignments = Object.fromEntries(majorTeams.map((team, index) => [
                    team.id,
                    (index < 16 ? 1 : index < 24 ? 2 : 3) as 1 | 2 | 3
                  ]));
                  const tour = createCustomTournament({
                    name: 'Valve CS2 Major Championship 2026',
                    shortName: 'MAJOR 2026',
                    organizer: 'PGL / Valve',
                    prizePool: '$1,250,000',
                    tier: 'Major',
                    mode: 'major',
                    teams: majorTeams,
                    majorStageAssignments,
                    stageFormats: {
                      majorStage1NormalFormat: 'BO1', majorStage1DeciderFormat: 'BO3',
                      majorStage2NormalFormat: 'BO1', majorStage2DeciderFormat: 'BO3',
                      majorStage3NormalFormat: 'BO3', majorStage3DeciderFormat: 'BO3',
                      swissNormalFormat: 'BO1', swissDeciderFormat: 'BO3',
                      quarterfinalFormat: 'BO3', semifinalFormat: 'BO3', finalFormat: 'BO5'
                    },
                    includeThirdPlace: false
                  });
                  onUpdateTournament(tour);
                  soundFx.playVictory();
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900/60 to-slate-900/90 border border-purple-500/40 hover:border-purple-400 hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-purple-500/5 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      MAJOR
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      +380..520 VRS
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-sm mt-2 group-hover:text-purple-300 transition-colors">
                    Valve CS2 Major 2026
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    32 команды · три швейцарских Stage и плей-офф Top 8
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-purple-500/20 text-[11px] font-mono font-bold text-purple-300 flex items-center justify-between">
                  <span>Запустить Major</span>
                  <span>→</span>
                </div>
              </div>

              {/* Preset 2: IEM Katowice */}
              <div
                onClick={() => {
                  soundFx.playClick();
                  const sorted = [...teams].sort((a, b) => b.points - a.points);
                  const tour = createCustomTournament({
                    name: 'Intel Extreme Masters Katowice 2026',
                    shortName: 'IEM KATO',
                    organizer: 'ESL',
                    prizePool: '$1,000,000',
                    tier: 'S-Tier',
                    mode: 'gsl_groups',
                    teams: sorted.slice(0, 16),
                    stageFormats: {
                      groupFormat: 'BO3',
                      quarterfinalFormat: 'BO3',
                      semifinalFormat: 'BO3',
                      finalFormat: 'BO5'
                    },
                    includeThirdPlace: true
                  });
                  onUpdateTournament(tour);
                  soundFx.playVictory();
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-slate-900/90 border border-amber-500/40 hover:border-amber-400 hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-amber-500/5 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      S-TIER
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      +260..350 VRS
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-sm mt-2 group-hover:text-amber-300 transition-colors">
                    IEM Katowice 2026
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    16 команд · GSL Группы BO3 и плей-офф в Сподеке с гранд-финалом BO5
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-amber-500/20 text-[11px] font-mono font-bold text-amber-300 flex items-center justify-between">
                  <span>Запустить IEM</span>
                  <span>→</span>
                </div>
              </div>

              {/* Preset 3: AgeraPVP Championship */}
              <div
                onClick={() => {
                  soundFx.playClick();
                  const sorted = [...teams].sort((a, b) => b.points - a.points);
                  const tour = createCustomTournament({
                    name: 'AgeraPVP Championship 2026',
                    shortName: 'AGERA 2026',
                    organizer: 'Agera Gaming',
                    prizePool: '$1,250,000',
                    tier: 'S-Tier',
                    mode: 'swiss_playoffs',
                    teams: sorted.slice(0, 16),
                    stageFormats: {
                      swissNormalFormat: 'BO1',
                      swissDeciderFormat: 'BO3',
                      quarterfinalFormat: 'BO3',
                      semifinalFormat: 'BO3',
                      finalFormat: 'BO5'
                    },
                    includeThirdPlace: true
                  });
                  onUpdateTournament(tour);
                  soundFx.playVictory();
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-yellow-950/25 via-slate-900/60 to-slate-900/90 border border-yellow-500/40 hover:border-yellow-400 hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-yellow-500/5 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                      S-TIER
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      +260..350 VRS
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-sm mt-2 group-hover:text-yellow-300 transition-colors">
                    AgeraPVP Championship
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    16 команд · Полная швейцарка + плей-офф с матчем за 3-е место
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-yellow-500/20 text-[11px] font-mono font-bold text-yellow-300 flex items-center justify-between">
                  <span>Запустить Agera</span>
                  <span>→</span>
                </div>
              </div>

              {/* Preset 4: Masters Cup (Single Elimination) */}
              <div
                onClick={() => {
                  soundFx.playClick();
                  const sorted = [...teams].sort((a, b) => b.points - a.points);
                  const tour = createCustomTournament({
                    name: 'CS2 Masters Cup 2026',
                    shortName: 'MASTERS',
                    organizer: 'StarLadder',
                    prizePool: '$500,000',
                    tier: 'A-Tier',
                    mode: 'single_elimination',
                    teams: sorted.slice(0, 8),
                    stageFormats: {
                      quarterfinalFormat: 'BO3',
                      semifinalFormat: 'BO3',
                      finalFormat: 'BO5'
                    },
                    includeThirdPlace: true
                  });
                  onUpdateTournament(tour);
                  soundFx.playVictory();
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/25 via-slate-900/60 to-slate-900/90 border border-blue-500/40 hover:border-blue-400 hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-blue-500/5 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      A-TIER
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      +140..220 VRS
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-sm mt-2 group-hover:text-blue-300 transition-colors">
                    CS2 Masters Cup
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    8 команд · Быстрая олимпийская сетка плей-офф Single Elimination
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-blue-500/20 text-[11px] font-mono font-bold text-blue-300 flex items-center justify-between">
                  <span>Запустить Masters</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal for Creation */}
        {isCreateTournamentOpen && (
          <CreateTournamentModal
            teams={teams}
            onClose={() => setIsCreateTournamentOpen(false)}
            onCreateTournament={(createdTour) => {
              setIsCreateTournamentOpen(false);
              onUpdateTournament(createdTour);
              soundFx.playVictory();
            }}
          />
        )}
      </div>
    );
  }

  // Rebuild the current tournament without changing its format, metadata, or
  // participant list. Reseeding must never silently turn a custom event into a
  // generic playoff bracket made from every team in the app.
  const rebuildTournamentWithParticipantOrder = (orderedTeams: Team[]) => {
    const newTour = createCustomTournament({
      name: tournament.name || 'CS2 Tournament',
      shortName: tournament.shortName,
      organizer: tournament.organizer,
      prizePool: tournament.prizePool,
      startDate: tournament.startDate,
      description: tournament.description,
      tier: tournament.tier || 'S-Tier',
      mode: tournament.mode,
      teams: orderedTeams,
      stageFormats: tournament.stageFormats || {},
      includeThirdPlace: tournament.includeThirdPlace,
      majorStageAssignments: tournament.mode === 'major'
        ? Object.fromEntries((tournament.majorStages || []).flatMap((stage) => stage.directTeamIds.map((teamId) => [teamId, stage.stageNumber])))
        : undefined
    });
    onUpdateTournament(newTour);
    const nextTab: StageTab = newTour.mode === 'major' ? 'major_1'
      : newTour.mode === 'gsl_groups' || newTour.mode === 'groups_playoffs' ? 'groups'
      : newTour.mode === 'playoffs_only' || newTour.mode === 'single_elimination' || newTour.mode === 'double_elimination' || newTour.mode === 'blast_bounty' || newTour.mode === 'round_robin' ? 'playoffs'
      : 'swiss';
    setStageTabSelection({ tournamentId: newTour.id, tab: nextTab });
  };

  const rebuildMajorWithSeedOrder = (seedOrder: Team[]) => {
    const assignmentMap: Record<string, 1 | 2 | 3> = {};
    (tournament.majorStages || []).forEach((stage) => {
      stage.directTeamIds.forEach((teamId) => { assignmentMap[teamId] = stage.stageNumber; });
    });
    const newTour = createCustomTournament({
      name: tournament.name || 'Valve CS2 Major Championship 2026',
      shortName: tournament.shortName || 'MAJOR 2026',
      organizer: tournament.organizer,
      prizePool: tournament.prizePool,
      startDate: tournament.startDate,
      description: tournament.description,
      tier: 'Major',
      mode: 'major',
      teams: seedOrder,
      stageFormats: tournament.stageFormats || {},
      includeThirdPlace: false,
      majorStageAssignments: assignmentMap
    });
    onUpdateTournament(newTour);
    setStageTabSelection({ tournamentId: newTour.id, tab: 'major_1' });
  };

  // 2. Randomize only the teams entered in this tournament, retaining its format.
  const getParticipatingTeams = () => {
    const participantIds = tournament.participatingTeamIds || Object.keys(tournament.teamSeeds || {});
    return participantIds.map((id) => teams.find((team) => team.id === id)).filter(Boolean) as Team[];
  };

  // Shuffles teams only among the currently unplayed matches of the same pool
  // (same Swiss record / same group round). Never pulls in outside teams.
  const shufflePairsWithinPools = (matches: TournamentMatch[], poolOf: (m: TournamentMatch) => string) => {
    const open = matches.filter((m) => m.status !== 'completed' && m.teamAId && m.teamBId && !m.winnerId);
    const pools = new Map<string, TournamentMatch[]>();
    open.forEach((m) => {
      const key = poolOf(m);
      pools.set(key, [...(pools.get(key) || []), m]);
    });
    const replaced = new Map<string, TournamentMatch>();
    pools.forEach((poolMatches) => {
      const ids = poolMatches.flatMap((m) => [m.teamAId!, m.teamBId!]);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      }
      poolMatches.forEach((m, i) => replaced.set(m.id, { ...m, teamAId: ids[i * 2], teamBId: ids[i * 2 + 1], scoreA: 0, scoreB: 0 }));
    });
    return matches.map((m) => replaced.get(m.id) || m);
  };

  const handleRandomizeTournament = () => {
    soundFx.playClick();
    if (tournament.currentStage === 'swiss') {
      const swissMatches = shufflePairsWithinPools(
        tournament.swissMatches || [],
        (m) => `${m.roundNumber}|${m.poolKey || ''}`
      );
      onUpdateTournament({ ...tournament, swissMatches });
      return;
    }
    if (tournament.currentStage === 'groups' && tournament.groups?.length) {
      const groups = tournament.groups.map((group) => ({
        ...group,
        matches: shufflePairsWithinPools(group.matches || [], (m) => `${m.roundNumber}|${m.poolKey || ''}`)
      }));
      onUpdateTournament({ ...tournament, groups });
      return;
    }
    if (tournament.currentStage === 'playoffs' && tournament.mode !== 'single_elimination' && tournament.mode !== 'playoffs_only' && tournament.mode !== 'double_elimination') {
      const playoffMatches = shufflePairsWithinPools(tournament.playoffMatches || [], (m) => `${m.roundNumber}|${m.poolKey || ''}`);
      onUpdateTournament({ ...tournament, playoffMatches });
      return;
    }
    const participants = getParticipatingTeams();
    if (participants.length < 2) return;
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    rebuildTournamentWithParticipantOrder(shuffled);
  };

  // 3. Restore rating-based seeding using the same saved participant roster.
  const handleSeedByRating = () => {
    soundFx.playClick();
    const participants = getParticipatingTeams();
    if (participants.length < 2) return;
    const seeded = [...participants].sort((a, b) => b.points - a.points);
    if (tournament.mode === 'major') rebuildMajorWithSeedOrder(seeded);
    else rebuildTournamentWithParticipantOrder(seeded);
  };

  // 4. Reset Round 1 Swiss matches to default pairings.
  // A Major uses the official 1-vs-9, 2-vs-10 ... 8-vs-16 pairing inside
  // the currently active stage, never the generic 16-team Swiss roster.
  const handleResetDefaultPairs = () => {
    soundFx.playClick();
    if (tournament.mode === 'major') {
      const stageNumber = (tournament.majorStageNumber || 1) as 1 | 2 | 3;
      const stage = tournament.majorStages?.[stageNumber - 1];
      const records = Object.values(tournament.swissRecords || {}).sort((a, b) => (a.seedRank || 999) - (b.seedRank || 999));
      const stageTeamIds = records.map((record) => record.teamId);
      if (stageTeamIds.length !== 16) return;
      const firstRound = tournament.swissMatches.filter((match) => match.roundNumber === 1);
      const normalFormat = stageNumber === 1
        ? tournament.stageFormats?.majorStage1NormalFormat
        : stageNumber === 2
          ? tournament.stageFormats?.majorStage2NormalFormat
          : tournament.stageFormats?.majorStage3NormalFormat;
      const resetRound = Array.from({ length: 8 }, (_, index) => {
        const previous = firstRound[index];
        return {
          ...(previous || {}),
          id: `${tournament.id}_major_s${stageNumber}_r1_m${index + 1}`,
          stage: 'swiss' as const,
          poolKey: '0:0',
          roundNumber: 1,
          name: `Stage ${stageNumber} · Раунд 1 (0:0) · Матч ${index + 1}`,
          teamAId: stageTeamIds[index],
          teamBId: stageTeamIds[index + 8],
          scoreA: 0,
          scoreB: 0,
          winnerId: undefined,
          loserId: undefined,
          status: 'ready' as const,
          format: normalFormat === 'BO3' ? 'BO3' as const : 'BO1' as const
        };
      });
      const resetRecords = Object.fromEntries(stageTeamIds.map((teamId, index) => [teamId, {
        teamId, wins: 0, losses: 0, opponentsPlayed: [], status: 'active' as const, seedRank: index + 1
      }]));
      const updatedStages = [...(tournament.majorStages || [])];
      if (stage) {
        updatedStages[stageNumber - 1] = {
          ...stage,
          matches: [...resetRound],
          records: resetRecords,
          currentRound: 1,
          status: 'active'
        };
      }
      onUpdateTournament({
        ...tournament,
        majorStages: updatedStages,
        swissMatches: resetRound,
        swissRecords: resetRecords,
        swissRound: 1,
        currentStage: 'swiss'
      });
      return;
    }
    // Re-pair only this tournament's participants (strong vs weak), keeping match ids/formats.
    const r1 = tournament.swissMatches.filter((m) => m.roundNumber === 1);
    const participants = r1.flatMap((m) => [m.teamAId, m.teamBId])
      .map((id) => teams.find((t) => t.id === id))
      .filter((t): t is Team => !!t)
      .sort((a, b) => b.points - a.points);
    const n = participants.length;
    const defaultR1 = r1.map((m, i) => ({ ...m, teamAId: participants[i]?.id, teamBId: participants[n - 1 - i]?.id, scoreA: 0, scoreB: 0, status: 'ready' as const, winnerId: undefined, loserId: undefined, mapsPlayed: undefined }));
    onUpdateTournament({ ...tournament, swissMatches: defaultR1, swissRound: 1 });
  };

  // 5. Swap Team A and Team B in a match
  const handleSwapMatchTeams = (matchId: string) => {
    soundFx.playClick();
    if (tournament.mode === 'round_robin' && tournament.roundRobinMatches?.some((match) => match.id === matchId)) {
      const updated = (tournament.roundRobinMatches || []).map((match) => match.id === matchId
        ? { ...match, teamAId: match.teamBId, teamBId: match.teamAId }
        : match);
      onUpdateTournament({ ...tournament, roundRobinMatches: updated });
    } else if ((tournament.mode === 'swiss_playoffs' || tournament.mode === 'swiss_system' || tournament.mode === 'major') && tournament.currentStage === 'swiss') {
      const updated = tournament.swissMatches.map((m) => {
        if (m.id === matchId) {
          return { ...m, teamAId: m.teamBId, teamBId: m.teamAId };
        }
        return m;
      });
      onUpdateTournament({ ...tournament, swissMatches: updated });
    } else {
      const updated = tournament.playoffMatches.map((m) => {
        if (m.id === matchId) {
          return { ...m, teamAId: m.teamBId, teamBId: m.teamAId };
        }
        return m;
      });
      onUpdateTournament({ ...tournament, playoffMatches: updated });
    }
  };

  // 6. Toggle link to Swiss for playoffs
  const handleToggleLinkSwiss = () => {
    soundFx.playClick();
    const nextLink = tournament.linkPlayoffsToSwiss === false;
    if (nextLink) {
      // Re-seed from qualified Swiss records
      const qualified = Object.values(tournament.swissRecords).filter((r) => r.status === 'qualified');
      const seeded = seedPlayoffsFromSwiss(
        tournament.playoffMatches,
        qualified,
        teams,
        tournament.includeThirdPlace
      );
      onUpdateTournament({
        ...tournament,
        linkPlayoffsToSwiss: true,
        playoffMatches: seeded
      });
    } else {
      onUpdateTournament({
        ...tournament,
        linkPlayoffsToSwiss: false
      });
    }
  };

  // 7. Reset playoffs to Swiss official CS2 seeding
  const handleResetToSwissSeeding = () => {
    soundFx.playClick();
    const qualified = Object.values(tournament.swissRecords).filter((r) => r.status === 'qualified');
    const seeded = seedPlayoffsFromSwiss(
      tournament.playoffMatches,
      qualified,
      teams,
      tournament.includeThirdPlace
    );
    onUpdateTournament({
      ...tournament,
      linkPlayoffsToSwiss: true,
      playoffMatches: seeded
    });
  };

  // 8. Randomize only eligible playoff entrants. Never pull teams from the
  // global leaderboard into a tournament the user already configured.
  const getPlayoffEntrantTeams = () => {
    const unique = (ids: string[]) => [...new Set(ids)].filter(Boolean);
    let ids: string[] = [];
    if (tournament.mode === 'swiss_playoffs' || tournament.mode === 'swiss_system' || tournament.mode === 'major') {
      ids = Object.values(tournament.swissRecords || {}).filter((record) => record.status === 'qualified').map((record) => record.teamId);
    } else if (tournament.mode === 'gsl_groups' || tournament.mode === 'groups_playoffs') {
      ids = (tournament.groups || []).flatMap((group) => group.qualifiedTeamIds || []);
    }
    if (ids.length < 2) {
      ids = (tournament.playoffMatches || []).flatMap((match) => [match.teamAId, match.teamBId].filter(Boolean) as string[]);
    }
    return unique(ids).map((id) => teams.find((team) => team.id === id)).filter(Boolean) as Team[];
  };

  const rebuildFreePlayoffBracket = (orderedTeams: Team[]) => {
    if (orderedTeams.length < 2) return;
    const bracket = createCustomTournament({
      name: tournament.name || 'CS2 Tournament',
      shortName: tournament.shortName,
      organizer: tournament.organizer,
      prizePool: tournament.prizePool,
      startDate: tournament.startDate,
      description: tournament.description,
      tier: tournament.tier || 'S-Tier',
      mode: 'playoffs_only',
      teams: orderedTeams,
      stageFormats: tournament.stageFormats || {},
      includeThirdPlace: tournament.includeThirdPlace
    });
    onUpdateTournament({ ...tournament, linkPlayoffsToSwiss: false, playoffMatches: bracket.playoffMatches });
  };

  const handleRandomizePlayoffTeams = () => {
    soundFx.playClick();
    if (tournament.mode === 'single_elimination' || tournament.mode === 'playoffs_only' || tournament.mode === 'double_elimination' || tournament.mode === 'round_robin') {
      const participants = getParticipatingTeams();
      if (participants.length >= 2) rebuildTournamentWithParticipantOrder([...participants].sort(() => Math.random() - 0.5));
      return;
    }
    const eligibleTeams = getPlayoffEntrantTeams();
    if (eligibleTeams.length >= 2) rebuildFreePlayoffBracket([...eligibleTeams].sort(() => Math.random() - 0.5));
  };

  // 9. Re-seed the same playoff entrants by VRS rating, without changing the
  // selected tournament roster or converting another format into a generic cup.
  const handleSeedTop8VRS = () => {
    soundFx.playClick();
    if (tournament.mode === 'single_elimination' || tournament.mode === 'playoffs_only' || tournament.mode === 'double_elimination' || tournament.mode === 'round_robin') {
      const participants = getParticipatingTeams();
      if (participants.length >= 2) rebuildTournamentWithParticipantOrder([...participants].sort((a, b) => b.points - a.points));
      return;
    }
    const eligibleTeams = getPlayoffEntrantTeams();
    if (eligibleTeams.length >= 2) rebuildFreePlayoffBracket([...eligibleTeams].sort((a, b) => b.points - a.points));
  };

  // 10. Toggle 3rd Place match
  const handleToggleThirdPlace = () => {
    if (isEightTeamGslTournament(tournament)) return;
    const nextInclude = !tournament.includeThirdPlace;
    let playoffMatches = [...(tournament.playoffMatches || [])];
    const existingThird = playoffMatches.find(isThirdPlaceMatch);
    if (nextInclude && !existingThird) {
      const sf1 = playoffMatches.find((match) => match.poolKey === 'sf1');
      const sf2 = playoffMatches.find((match) => match.poolKey === 'sf2');
      const teamAId = sf1?.loserId;
      const teamBId = sf2?.loserId;
      playoffMatches.push({
        id: `${tournament.id}_third_place`, stage: 'playoffs', poolKey: 'third_place',
        roundNumber: Math.max(1, (sf1?.roundNumber || 1) + 1), name: 'Матч за 3-е место (Бронзовый финал)',
        teamAId, teamBId, scoreA: 0, scoreB: 0,
        format: tournament.stageFormats?.semifinalFormat || 'BO3',
        status: teamAId && teamBId ? 'ready' : 'scheduled'
      });
    } else if (!nextInclude) {
      playoffMatches = playoffMatches.filter((match) => match !== existingThird);
    }
    onUpdateTournament({ ...tournament, includeThirdPlace: nextInclude, playoffMatches });
  };

  // Helper to record match stats (VRS & Form)
  const applyMatchEffects = (
    match: TournamentMatch,
    scoreA: number,
    scoreB: number,
    winnerId: string,
    deltaPtsA?: number,
    deltaPtsB?: number,
    deltaFmA?: number,
    deltaFmB?: number,
    actualFormat?: MatchFormat,
    mapsPlayed?: MatchSeriesMapResult[]
  ) => {
    const teamA = teams.find((t) => t.id === match.teamAId);
    const teamB = teams.find((t) => t.id === match.teamBId);
    if (!teamA || !teamB) return { deltaPointsA: 0, deltaPointsB: 0, deltaFormA: 0, deltaFormB: 0 };

    let finalDeltaPtsA = deltaPtsA;
    let finalDeltaPtsB = deltaPtsB;
    let finalDeltaFmA = deltaFmA;
    let finalDeltaFmB = deltaFmB;

    if (finalDeltaPtsA === undefined || finalDeltaPtsB === undefined) {
      const calculated = calculateTournamentMatchDeltas(
        teamA,
        teamB,
        scoreA,
        scoreB,
        winnerId,
        teams
      );
      finalDeltaPtsA = calculated.deltaPointsA;
      finalDeltaPtsB = calculated.deltaPointsB;
      finalDeltaFmA = calculated.deltaFormA;
      finalDeltaFmB = calculated.deltaFormB;
    }

    // Apply deltas additively so fast/full tournament simulations cannot overwrite earlier matches.
    if (finalDeltaPtsA !== undefined && finalDeltaPtsB !== undefined) {
      if (onApplyVrsPoints) {
        onApplyVrsPoints([
          { teamId: teamA.id, delta: finalDeltaPtsA },
          { teamId: teamB.id, delta: finalDeltaPtsB }
        ]);
      } else if (onUpdateTeams) {
        const updated = teams.map((t) => {
          if (t.id === teamA.id) return { ...t, points: Math.max(100, t.points + finalDeltaPtsA!) };
          if (t.id === teamB.id) return { ...t, points: Math.max(100, t.points + finalDeltaPtsB!) };
          return t;
        });
        onUpdateTeams(updated);
      }
    }

    // Live update match history for dynamic form tracking
    if (onRecordMatchPrediction) {
      const winnerTeam = winnerId === teamA.id ? teamA : teamB;
      const loserTeam = winnerId === teamA.id ? teamB : teamA;
      const effectiveFormat = actualFormat || match.format || 'BO3';
      onRecordMatchPrediction({
        id: `tour_${match.id}_${Date.now()}`,
        timestamp: Date.now(),
        format: effectiveFormat,
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        scoreA,
        scoreB,
        winnerTeamId: winnerId,
        deltaPointsA: finalDeltaPtsA,
        deltaPointsB: finalDeltaPtsB,
        deltaFormA: finalDeltaFmA,
        deltaFormB: finalDeltaFmB,
        mapsPlayed: mapsPlayed || match.mapsPlayed,
        tournamentId: tournament.id,
        tournamentName: tournament.name || 'Турнир',
        tournamentStage: match.name || match.stage,
        isUpset: winnerTeam.points < loserTeam.points && loserTeam.points - winnerTeam.points >= 80
      });
    }

    return {
      deltaPointsA: finalDeltaPtsA,
      deltaPointsB: finalDeltaPtsB,
      deltaFormA: finalDeltaFmA,
      deltaFormB: finalDeltaFmB
    };
  };


  // 11. Confirm Match Result from Simulation Modal
  const handleConfirmMatchResult = (
    matchId: string,
    scoreA: number,
    scoreB: number,
    winnerId: string,
    deltaPtsA?: number,
    deltaPtsB?: number,
    deltaFmA?: number,
    deltaFmB?: number,
    mapsPlayed?: MatchSeriesMapResult[],
    vetoState?: VetoState,
    actualFormat?: MatchFormat
  ) => {
    const isSwissMatch = tournament.swissMatches.some((m) => m.id === matchId);
    const isGroupMatch = tournament.groupMatches?.some((m) => m.id === matchId);
    const isRoundRobinMatch = tournament.roundRobinMatches?.some((m) => m.id === matchId);

    if (isSwissMatch) {
      const matchToUpdate = tournament.swissMatches.find((m) => m.id === matchId);
      if (!matchToUpdate) return;

      const effectiveFormat = actualFormat || matchToUpdate.format;
      const matchWithFormat = { ...matchToUpdate, format: effectiveFormat };

      const deltas = applyMatchEffects(
        matchWithFormat,
        scoreA,
        scoreB,
        winnerId,
        deltaPtsA,
        deltaPtsB,
        deltaFmA,
        deltaFmB,
        effectiveFormat,
        mapsPlayed
      );

      const updatedMatches = tournament.swissMatches.map((m) => {
        if (m.id === matchId) {
          const loserId = m.teamAId === winnerId ? m.teamBId : m.teamAId;
          return {
            ...m,
            format: effectiveFormat,
            scoreA,
            scoreB,
            status: 'finished' as const,
            winnerId,
            loserId,
            deltaPointsA: deltas.deltaPointsA,
            deltaPointsB: deltas.deltaPointsB,
            deltaFormA: deltas.deltaFormA,
            deltaFormB: deltas.deltaFormB,
            mapsPlayed: mapsPlayed || m.mapsPlayed,
            vetoState: vetoState || m.vetoState
          };
        }
        return m;
      });

      let nextTour: TournamentState = {
        ...tournament,
        swissMatches: updatedMatches
      };

      // Check if current round has all matches finished
      const currentRoundMatches = updatedMatches.filter((m) => m.roundNumber === tournament.swissRound);
      const allCurrentRoundDone = currentRoundMatches.every((m) => m.status === 'finished');

      if (allCurrentRoundDone) {
        nextTour = advanceSwissRound(nextTour, teams);
        if (nextTour.currentStage === 'playoffs') {
          setActiveStageTab('playoffs');
        } else if (nextTour.mode === 'major') {
          setActiveStageTab((`major_${nextTour.majorStageNumber || 1}`) as StageTab);
        } else if (nextTour.mode === 'swiss_system' && nextTour.currentStage === 'completed') {
          nextTour = finalizeTournamentVictory(nextTour);
          setActiveStageTab('swiss');
        }
      }

      onUpdateTournament(nextTour);
    } else if (isGroupMatch) {
      const matchToUpdate = tournament.groupMatches?.find((m) => m.id === matchId);
      if (!matchToUpdate) return;

      const effectiveFormat = actualFormat || matchToUpdate.format;
      const matchWithFormat = { ...matchToUpdate, format: effectiveFormat };

      const deltas = applyMatchEffects(
        matchWithFormat,
        scoreA,
        scoreB,
        winnerId,
        deltaPtsA,
        deltaPtsB,
        deltaFmA,
        deltaFmB,
        effectiveFormat,
        mapsPlayed
      );

      const { updatedTournament, isGroupsCompleted } = updateGroupMatchResult(
        tournament,
        matchId,
        scoreA,
        scoreB,
        effectiveFormat
      );

      // Attach deltas & vetoState to the match in updatedTournament
      const enrichedGroupMatches = (updatedTournament.groupMatches || []).map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            deltaPointsA: deltas.deltaPointsA,
            deltaPointsB: deltas.deltaPointsB,
            deltaFormA: deltas.deltaFormA,
            deltaFormB: deltas.deltaFormB,
            mapsPlayed: mapsPlayed || m.mapsPlayed,
            vetoState: vetoState || m.vetoState
          };
        }
        return m;
      });

      const enrichedGroups = (updatedTournament.groups || []).map((group) => ({
        ...group,
        matches: (group.matches || []).map((m) => enrichedGroupMatches.find((updated) => updated.id === m.id) || m)
      }));
      const nextTour: TournamentState = {
        ...updatedTournament,
        groups: enrichedGroups,
        groupMatches: enrichedGroupMatches
      };

      if (isGroupsCompleted) {
        setActiveStageTab('playoffs');
        soundFx.playVictory();
      }

      onUpdateTournament(nextTour);
    } else if (isRoundRobinMatch) {
      const matchToUpdate = tournament.roundRobinMatches?.find((m) => m.id === matchId);
      if (!matchToUpdate) return;

      const effectiveFormat = actualFormat || matchToUpdate.format;
      const deltas = applyMatchEffects(
        { ...matchToUpdate, format: effectiveFormat },
        scoreA,
        scoreB,
        winnerId,
        deltaPtsA,
        deltaPtsB,
        deltaFmA,
        deltaFmB,
        effectiveFormat,
        mapsPlayed
      );
      const updatedMatches = (tournament.roundRobinMatches || []).map((match) => {
        if (match.id !== matchId) return match;
        return {
          ...match,
          format: effectiveFormat,
          scoreA,
          scoreB,
          status: 'finished' as const,
          winnerId,
          loserId: match.teamAId === winnerId ? match.teamBId : match.teamAId,
          deltaPointsA: deltas.deltaPointsA,
          deltaPointsB: deltas.deltaPointsB,
          deltaFormA: deltas.deltaFormA,
          deltaFormB: deltas.deltaFormB,
          mapsPlayed: mapsPlayed || match.mapsPlayed,
          vetoState: vetoState || match.vetoState
        };
      });
      const allMatchesFinished = updatedMatches.length > 0 && updatedMatches.every((match) => match.status === 'finished');
      let nextTour: TournamentState = {
        ...tournament,
        roundRobinMatches: updatedMatches,
        roundRobinTable: calculateRoundRobinTableFromMatches({ ...tournament, roundRobinMatches: updatedMatches }),
        ...(allMatchesFinished ? { currentStage: 'completed' as const } : {})
      };
      if (allMatchesFinished) nextTour = finalizeTournamentVictory(nextTour);
      onUpdateTournament(nextTour);
    } else {
      const matchToUpdate = tournament.playoffMatches.find((m) => m.id === matchId);
      if (!matchToUpdate) return;

      const effectiveFormat = actualFormat || matchToUpdate.format;
      const matchWithFormat = { ...matchToUpdate, format: effectiveFormat };

      const deltas = applyMatchEffects(
        matchWithFormat,
        scoreA,
        scoreB,
        winnerId,
        deltaPtsA,
        deltaPtsB,
        deltaFmA,
        deltaFmB,
        effectiveFormat,
        mapsPlayed
      );

      const { updatedMatches, isTournamentOver } = updatePlayoffMatchResult(
        tournament.playoffMatches,
        matchId,
        scoreA,
        scoreB,
        tournament.includeThirdPlace,
        effectiveFormat
      );

      const withDeltas = updatedMatches.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            format: effectiveFormat,
            deltaPointsA: deltas.deltaPointsA,
            deltaPointsB: deltas.deltaPointsB,
            deltaFormA: deltas.deltaFormA,
            deltaFormB: deltas.deltaFormB,
            mapsPlayed: mapsPlayed || m.mapsPlayed,
            vetoState: vetoState || m.vetoState
          };
        }
        return m;
      });

      let nextTour: TournamentState = {
        ...tournament,
        playoffMatches: withDeltas
      };
      if (tournament.mode === 'blast_bounty') {
        nextTour = applyBlastBountyAfterMatch(nextTour, matchId);
      }

      const roundRobinFinished = nextTour.mode === 'round_robin'
        && nextTour.playoffMatches.length > 0
        && nextTour.playoffMatches.every((match) => match.status === 'finished');
      if (roundRobinFinished) {
        nextTour = { ...nextTour, roundRobinTable: calculateRoundRobinTableFromMatches(nextTour) };
      }
      if (isTournamentOver || roundRobinFinished) {
        nextTour = finalizeTournamentVictory(nextTour);
      }

      onUpdateTournament(nextTour);
    }
  };

  const handleBlastBountyDraft = (pairings: { favoriteId: string; underdogId: string }[]) => {
    if (!tournament || tournament.mode !== 'blast_bounty') return;
    const nextTour = commitBlastBountyDraft(tournament, pairings);
    if (nextTour !== tournament) {
      onUpdateTournament(nextTour);
      soundFx.playClick();
    }
  };

  const handleBlastBountyWager = (matchId: string, challengerId: string, amount: number) => {
    if (!tournament || tournament.mode !== 'blast_bounty') return;
    const match = tournament.playoffMatches.find((item) => item.id === matchId);
    if (!match || match.status !== 'ready' || match.roundNumber < 3 || !match.teamAId || !match.teamBId) return;
    const nextWagers = { ...(tournament.bountyWagers || {}) };
    if (amount <= 0) {
      delete nextWagers[matchId];
    } else {
      const opponentId = challengerId === match.teamAId ? match.teamBId : match.teamAId;
      const challengerBank = tournament.bountyBank?.[challengerId] || 0;
      const opponentBank = tournament.bountyBank?.[opponentId] || 0;
      const roundedAmount = Math.floor(amount);
      if (challengerId !== match.teamAId && challengerId !== match.teamBId) return;
      if (roundedAmount <= 0 || roundedAmount > challengerBank || roundedAmount > opponentBank) return;
      nextWagers[matchId] = { challengerId, amount: roundedAmount };
    }
    onUpdateTournament({ ...tournament, bountyWagers: nextWagers });
  };

  // Toggle match format on ready match (BO1 <-> BO3 <-> BO5)
  const handleToggleMatchFormat = (matchId: string) => {
    soundFx.playClick();
    const isSwiss = tournament.swissMatches.some((m) => m.id === matchId);
    const isGroup = tournament.groupMatches?.some((m) => m.id === matchId);
    const isRoundRobin = tournament.roundRobinMatches?.some((m) => m.id === matchId);
    const cycleFormat = (fmt: MatchFormat, match?: TournamentMatch): MatchFormat => {
      if (tournament.mode === 'major') {
        // Keep the Major grand final on BO3/BO5; Swiss matches stay BO1/BO3.
        if (match?.poolKey === 'final' || match?.poolKey === 'final_reset') return fmt === 'BO5' ? 'BO3' : 'BO5';
        return fmt === 'BO1' ? 'BO3' : 'BO1';
      }
      if (fmt === 'BO1') return 'BO3';
      if (fmt === 'BO3') return 'BO5';
      return 'BO1';
    };

    if (isSwiss) {
      const updated = tournament.swissMatches.map((m) =>
        m.id === matchId && m.status !== 'finished' ? { ...m, format: cycleFormat(m.format, m) } : m
      );
      onUpdateTournament({ ...tournament, swissMatches: updated });
    } else if (isGroup) {
      const updated = (tournament.groupMatches || []).map((m) =>
        m.id === matchId && m.status !== 'finished' ? { ...m, format: cycleFormat(m.format, m) } : m
      );
      const updatedGroups = (tournament.groups || []).map((g) => ({
        ...g,
        matches: g.matches.map((m) =>
          m.id === matchId && m.status !== 'finished' ? { ...m, format: cycleFormat(m.format, m) } : m
        )
      }));
      onUpdateTournament({ ...tournament, groupMatches: updated, groups: updatedGroups });
    } else if (isRoundRobin) {
      const updated = (tournament.roundRobinMatches || []).map((m) =>
        m.id === matchId && m.status !== 'finished' ? { ...m, format: cycleFormat(m.format, m) } : m
      );
      onUpdateTournament({ ...tournament, roundRobinMatches: updated });
    } else {
      const updated = tournament.playoffMatches.map((m) =>
        m.id === matchId && m.status !== 'finished' ? { ...m, format: cycleFormat(m.format, m) } : m
      );
      onUpdateTournament({ ...tournament, playoffMatches: updated });
    }

    if (activeMatchToSimulate && activeMatchToSimulate.id === matchId) {
      setActiveMatchToSimulate((prev) =>
        prev ? { ...prev, format: cycleFormat(prev.format, prev) } : null
      );
    }
  };

  // Update group matches when user customizes pairings
  const handleUpdateGroupMatches = (groupId: string, updatedGroupMatches: TournamentMatch[]) => {
    if (!tournament || !tournament.groups) return;
    const nextGroups = tournament.groups.map((g) => {
      if (g.id === groupId || g.letter === groupId) {
        return {
          ...g,
          matches: updatedGroupMatches
        };
      }
      return g;
    });

    const nextAllGroupMatches = (tournament.groupMatches || []).map((m) => {
      const matchInGroup = updatedGroupMatches.find((gm) => gm.id === m.id);
      return matchInGroup || m;
    });

    onUpdateTournament({
      ...tournament,
      groups: nextGroups,
      groupMatches: nextAllGroupMatches
    });
  };

  // 12. Quick simulate a single match with authentic CS2 Map Veto and realistic MR12 score
  const handleQuickSimulateMatch = (match: TournamentMatch) => {
    soundFx.playClick();
    if (!match.teamAId || !match.teamBId) return;

    const tA = teams.find((t) => t.id === match.teamAId);
    const tB = teams.find((t) => t.id === match.teamBId);
    if (!tA || !tB) return;

    const veto = executeCompleteAutoVeto(match.format, tA, tB);
    const seriesResult = simulateSeriesOnVeto(match.format, tA, tB, veto.selectedMapsInOrder);


    handleConfirmMatchResult(
      match.id,
      seriesResult.seriesScoreA,
      seriesResult.seriesScoreB,
      seriesResult.winnerTeamId,
      undefined,
      undefined,
      undefined,
      undefined,
      seriesResult.mapsPlayed,
      veto,
      match.format
    );
  };

  // 13. Fast simulate entire current active round on CS2 maps
  const handleFastSimulateRound = () => {
    soundFx.playClick();
    if (tournament.mode === 'round_robin') {
      const allMatches = [...(tournament.roundRobinMatches || [])];
      const pendingMatches = allMatches.filter((match) => match.status !== 'finished' && match.teamAId && match.teamBId);
      if (!pendingMatches.length) return;
      const activeRound = Math.min(...pendingMatches.map((match) => match.roundNumber));
      const activeMatches = pendingMatches.filter((match) => match.roundNumber === activeRound);
      let updatedMatches = allMatches;

      for (const match of activeMatches) {
        const teamA = teams.find((team) => team.id === match.teamAId);
        const teamB = teams.find((team) => team.id === match.teamBId);
        if (!teamA || !teamB) continue;
        const veto = executeCompleteAutoVeto(match.format, teamA, teamB);
        const seriesResult = simulateSeriesOnVeto(match.format, teamA, teamB, veto.selectedMapsInOrder);
        const winnerId = seriesResult.winnerTeamId;
        const deltas = applyMatchEffects(match, seriesResult.seriesScoreA, seriesResult.seriesScoreB, winnerId, undefined, undefined, undefined, undefined, match.format, seriesResult.mapsPlayed);
        updatedMatches = updatedMatches.map((entry) => entry.id === match.id ? {
          ...entry,
          scoreA: seriesResult.seriesScoreA,
          scoreB: seriesResult.seriesScoreB,
          status: 'finished' as const,
          winnerId,
          loserId: winnerId === teamA.id ? teamB.id : teamA.id,
          deltaPointsA: deltas.deltaPointsA,
          deltaPointsB: deltas.deltaPointsB,
          deltaFormA: deltas.deltaFormA,
          deltaFormB: deltas.deltaFormB,
          mapsPlayed: seriesResult.mapsPlayed,
          vetoState: veto
        } : entry);
      }

      const allFinished = updatedMatches.length > 0 && updatedMatches.every((match) => match.status === 'finished');
      let nextTour: TournamentState = {
        ...tournament,
        roundRobinMatches: updatedMatches,
        roundRobinTable: calculateRoundRobinTableFromMatches({ ...tournament, roundRobinMatches: updatedMatches }),
        ...(allFinished ? { currentStage: 'completed' as const } : {})
      };
      if (allFinished) nextTour = finalizeTournamentVictory(nextTour);
      onUpdateTournament(nextTour);
      soundFx.playVictory();
      return;
    }
    if ((tournament.mode === 'swiss_playoffs' || tournament.mode === 'swiss_system' || tournament.mode === 'major') && tournament.currentStage === 'swiss') {
      const roundMatches = tournament.swissMatches.filter(
        (m) => m.roundNumber === tournament.swissRound && m.status !== 'finished' && m.teamAId && m.teamBId
      );

      let currentMatches = [...tournament.swissMatches];

      for (const m of roundMatches) {
        const tA = teams.find((t) => t.id === m.teamAId);
        const tB = teams.find((t) => t.id === m.teamBId);
        if (!tA || !tB) continue;

        const veto = executeCompleteAutoVeto(m.format, tA, tB);
        const seriesResult = simulateSeriesOnVeto(m.format, tA, tB, veto.selectedMapsInOrder);
        const sA = seriesResult.seriesScoreA;
        const sB = seriesResult.seriesScoreB;
        const winnerId = seriesResult.winnerTeamId;
        const loserId = winnerId === tA.id ? tB.id : tA.id;

        const deltas = applyMatchEffects(
          m,
          sA,
          sB,
          winnerId,
          undefined,
          undefined,
          undefined,
          undefined,
          m.format,
          seriesResult.mapsPlayed
        );

        currentMatches = currentMatches.map((existing) =>
          existing.id === m.id
            ? {
                ...existing,
                scoreA: sA,
                scoreB: sB,
                status: 'finished' as const,
                winnerId,
                loserId,
                deltaPointsA: deltas.deltaPointsA,
                deltaPointsB: deltas.deltaPointsB,
                deltaFormA: deltas.deltaFormA,
                deltaFormB: deltas.deltaFormB,
                mapsPlayed: seriesResult.mapsPlayed,
                vetoState: veto
              }
            : existing
        );
      }

      let nextTour: TournamentState = {
        ...tournament,
        swissMatches: currentMatches
      };
      nextTour = advanceSwissRound(nextTour, teams);
      if (nextTour.currentStage === 'playoffs') {
        setActiveStageTab('playoffs');
      } else if (nextTour.mode === 'major') {
        setActiveStageTab((`major_${nextTour.majorStageNumber || 1}`) as StageTab);
      } else if (nextTour.mode === 'swiss_system' && nextTour.currentStage === 'completed') {
        nextTour = finalizeTournamentVictory(nextTour);
        setActiveStageTab('swiss');
      }
      onUpdateTournament(nextTour);
      soundFx.playVictory();
    } else {
      // Simulate ready playoff matches
      let currentMatches = [...tournament.playoffMatches];
      let isDone = false;
      const readyMatches = currentMatches.filter((m) => m.status === 'ready' && m.teamAId && m.teamBId);

      for (const m of readyMatches) {
        const tA = teams.find((t) => t.id === m.teamAId);
        const tB = teams.find((t) => t.id === m.teamBId);
        if (!tA || !tB) continue;

        const veto = executeCompleteAutoVeto(m.format, tA, tB);
        const seriesResult = simulateSeriesOnVeto(m.format, tA, tB, veto.selectedMapsInOrder);
        const sA = seriesResult.seriesScoreA;
        const sB = seriesResult.seriesScoreB;
        const winnerId = seriesResult.winnerTeamId;
        const deltas = applyMatchEffects(
          m,
          sA,
          sB,
          winnerId,
          undefined,
          undefined,
          undefined,
          undefined,
          m.format,
          seriesResult.mapsPlayed
        );

        const res = updatePlayoffMatchResult(
          currentMatches,
          m.id,
          sA,
          sB,
          tournament.includeThirdPlace,
          m.format
        );
        currentMatches = res.updatedMatches.map((ex) =>
          ex.id === m.id
            ? {
                ...ex,
                deltaPointsA: deltas.deltaPointsA,
                deltaPointsB: deltas.deltaPointsB,
                deltaFormA: deltas.deltaFormA,
                deltaFormB: deltas.deltaFormB,
                mapsPlayed: seriesResult.mapsPlayed,
                vetoState: veto
              }
            : ex
        );
        if (res.isTournamentOver) isDone = true;
      }

      let nextTour: TournamentState = {
        ...tournament,
        playoffMatches: currentMatches
      };
      if (tournament.mode === 'blast_bounty') {
        const processedAtStart = new Set(tournament.bountyProcessedMatchIds || []);
        const newlyFinished = currentMatches.filter((match) => match.status === 'finished' && !processedAtStart.has(match.id));
        newlyFinished.forEach((match) => {
          nextTour = applyBlastBountyAfterMatch(nextTour, match.id);
        });
      }

      const roundRobinFinished = nextTour.mode === 'round_robin'
        && nextTour.playoffMatches.length > 0
        && nextTour.playoffMatches.every((match) => match.status === 'finished');
      if (roundRobinFinished) {
        nextTour = { ...nextTour, roundRobinTable: calculateRoundRobinTableFromMatches(nextTour) };
      }
      if (isDone || roundRobinFinished) {
        nextTour = finalizeTournamentVictory(nextTour);
      }

      onUpdateTournament(nextTour);
      soundFx.playVictory();
    }
  };

  // 14. Fast simulate entire tournament until completion on CS2 maps
  const handleSimulateFullTournament = () => {
    soundFx.playClick();
    if (tournament.mode === 'round_robin') {
      let updatedMatches = [...(tournament.roundRobinMatches || [])];
      const readyMatches = updatedMatches.filter((match) => match.status !== 'finished' && match.teamAId && match.teamBId);
      for (const match of readyMatches) {
        const teamA = teams.find((team) => team.id === match.teamAId);
        const teamB = teams.find((team) => team.id === match.teamBId);
        if (!teamA || !teamB) continue;
        const veto = executeCompleteAutoVeto(match.format, teamA, teamB);
        const seriesResult = simulateSeriesOnVeto(match.format, teamA, teamB, veto.selectedMapsInOrder);
        const winnerId = seriesResult.winnerTeamId;
        const deltas = applyMatchEffects(match, seriesResult.seriesScoreA, seriesResult.seriesScoreB, winnerId, undefined, undefined, undefined, undefined, match.format, seriesResult.mapsPlayed);
        updatedMatches = updatedMatches.map((entry) => entry.id === match.id ? {
          ...entry,
          scoreA: seriesResult.seriesScoreA,
          scoreB: seriesResult.seriesScoreB,
          status: 'finished' as const,
          winnerId,
          loserId: winnerId === teamA.id ? teamB.id : teamA.id,
          deltaPointsA: deltas.deltaPointsA,
          deltaPointsB: deltas.deltaPointsB,
          deltaFormA: deltas.deltaFormA,
          deltaFormB: deltas.deltaFormB,
          mapsPlayed: seriesResult.mapsPlayed,
          vetoState: veto
        } : entry);
      }
      const allFinished = updatedMatches.length > 0 && updatedMatches.every((match) => match.status === 'finished');
      let nextTour: TournamentState = {
        ...tournament,
        roundRobinMatches: updatedMatches,
        roundRobinTable: calculateRoundRobinTableFromMatches({ ...tournament, roundRobinMatches: updatedMatches }),
        ...(allFinished ? { currentStage: 'completed' as const } : {})
      };
      if (allFinished) nextTour = finalizeTournamentVictory(nextTour);
      onUpdateTournament(nextTour);
      soundFx.playVictory();
      return;
    }
    if (tournament.mode === 'blast_bounty') {
      let bountyTour: TournamentState = { ...tournament };
      let completed = false;
      let roundLoops = 0;
      while (!completed && (bountyTour.bountyCurrentRound || 1) <= 5 && roundLoops < 5) {
        roundLoops++;
        bountyTour = autoDraftBlastBountyRound(bountyTour);
        const roundNumber = bountyTour.bountyCurrentRound || 1;
        const roundMatches = bountyTour.playoffMatches.filter((match) => match.roundNumber === roundNumber && match.status === 'ready' && match.teamAId && match.teamBId);
        if (!roundMatches.length) break;
        for (const match of roundMatches) {
          const teamA = teams.find((team) => team.id === match.teamAId);
          const teamB = teams.find((team) => team.id === match.teamBId);
          if (!teamA || !teamB) continue;
          const veto = executeCompleteAutoVeto(match.format, teamA, teamB);
          const seriesResult = simulateSeriesOnVeto(match.format, teamA, teamB, veto.selectedMapsInOrder);
          const deltas = applyMatchEffects(match, seriesResult.seriesScoreA, seriesResult.seriesScoreB, seriesResult.winnerTeamId, undefined, undefined, undefined, undefined, match.format, seriesResult.mapsPlayed);
          const result = updatePlayoffMatchResult(bountyTour.playoffMatches, match.id, seriesResult.seriesScoreA, seriesResult.seriesScoreB, false, match.format);
          const enriched = result.updatedMatches.map((entry) => entry.id === match.id ? {
            ...entry,
            deltaPointsA: deltas.deltaPointsA,
            deltaPointsB: deltas.deltaPointsB,
            deltaFormA: deltas.deltaFormA,
            deltaFormB: deltas.deltaFormB,
            mapsPlayed: seriesResult.mapsPlayed,
            vetoState: veto
          } : entry);
          bountyTour = { ...bountyTour, playoffMatches: enriched };
          bountyTour = applyBlastBountyAfterMatch(bountyTour, match.id);
          if (result.isTournamentOver) completed = true;
        }
      }
      const finalMatch = bountyTour.playoffMatches.find((match) => match.poolKey === 'final');
      if (completed || finalMatch?.status === 'finished') bountyTour = finalizeTournamentVictory(bountyTour);
      onUpdateTournament(bountyTour);
      setActiveStageTab('playoffs');
      soundFx.playVictory();
      return;
    }
    let currentTour = { ...tournament };

    // Advance swiss completely
    if ((currentTour.mode === 'swiss_playoffs' || currentTour.mode === 'swiss_system' || currentTour.mode === 'major') && currentTour.currentStage === 'swiss') {
      let loops = 0;
      while (currentTour.currentStage === 'swiss' && loops < (currentTour.mode === 'major' ? 20 : 10)) {
        loops++;
        const activeRound = currentTour.swissRound;
        const matchesInRound = currentTour.swissMatches.filter(
          (m) => m.roundNumber === activeRound && m.status !== 'finished' && m.teamAId && m.teamBId
        );

        let updatedMatches = [...currentTour.swissMatches];
        for (const m of matchesInRound) {
          const tA = teams.find((t) => t.id === m.teamAId);
          const tB = teams.find((t) => t.id === m.teamBId);
          if (!tA || !tB) continue;

          const veto = executeCompleteAutoVeto(m.format, tA, tB);
          const seriesResult = simulateSeriesOnVeto(m.format, tA, tB, veto.selectedMapsInOrder);
          const sA = seriesResult.seriesScoreA;
          const sB = seriesResult.seriesScoreB;
          const winnerId = seriesResult.winnerTeamId;
          const loserId = winnerId === tA.id ? tB.id : tA.id;
          const deltas = applyMatchEffects(
            m,
            sA,
            sB,
            winnerId,
            undefined,
            undefined,
            undefined,
            undefined,
            m.format,
            seriesResult.mapsPlayed
          );

          updatedMatches = updatedMatches.map((ex) =>
            ex.id === m.id
              ? {
                  ...ex,
                  scoreA: sA,
                  scoreB: sB,
                  status: 'finished' as const,
                  winnerId,
                  loserId,
                  deltaPointsA: deltas.deltaPointsA,
                  deltaPointsB: deltas.deltaPointsB,
                  deltaFormA: deltas.deltaFormA,
                  deltaFormB: deltas.deltaFormB,
                  mapsPlayed: seriesResult.mapsPlayed,
                  vetoState: veto
                }
              : ex
          );
        }

        currentTour = { ...currentTour, swissMatches: updatedMatches };
        currentTour = advanceSwissRound(currentTour, teams);
      }
    }

    // Run GSL group stages before the playoffs. The old full-tournament
    // simulation only handled Swiss and playoff matches, so a GSL event could
    // stop with all group matches waiting to be played.
    if (currentTour.mode === 'gsl_groups' && currentTour.currentStage === 'groups') {
      // Reconcile already-finished matches too. This repairs saved tournaments
      // from an earlier version where results were finished but the group
      // qualifiers/current stage had not been propagated correctly.
      const previouslyFinished = [...(currentTour.groupMatches || [])].filter(
        (m) => m.status === 'finished' && !!m.teamAId && !!m.teamBId
      );
      for (const finished of previouslyFinished) {
        const { updatedTournament } = updateGroupMatchResult(
          currentTour,
          finished.id,
          finished.scoreA,
          finished.scoreB,
          finished.format
        );
        currentTour = updatedTournament;
      }

      let groupLoops = 0;
      while (currentTour.currentStage === 'groups' && groupLoops < 100) {
        groupLoops++;
        const nextGroupMatch = (currentTour.groupMatches || []).find(
          (m) => m.status === 'ready' && !!m.teamAId && !!m.teamBId
        );
        if (!nextGroupMatch) break;

        const tA = teams.find((t) => t.id === nextGroupMatch.teamAId);
        const tB = teams.find((t) => t.id === nextGroupMatch.teamBId);
        if (!tA || !tB) break;

        const veto = executeCompleteAutoVeto(nextGroupMatch.format, tA, tB);
        const seriesResult = simulateSeriesOnVeto(nextGroupMatch.format, tA, tB, veto.selectedMapsInOrder);
        const sA = seriesResult.seriesScoreA;
        const sB = seriesResult.seriesScoreB;
        const deltas = applyMatchEffects(
          nextGroupMatch,
          sA,
          sB,
          seriesResult.winnerTeamId,
          undefined,
          undefined,
          undefined,
          undefined,
          nextGroupMatch.format,
          seriesResult.mapsPlayed
        );

        const { updatedTournament } = updateGroupMatchResult(
          currentTour,
          nextGroupMatch.id,
          sA,
          sB,
          nextGroupMatch.format
        );
        const enrichedGroupMatches = (updatedTournament.groupMatches || []).map((m) =>
          m.id === nextGroupMatch.id
            ? {
                ...m,
                deltaPointsA: deltas.deltaPointsA,
                deltaPointsB: deltas.deltaPointsB,
                deltaFormA: deltas.deltaFormA,
                deltaFormB: deltas.deltaFormB,
                mapsPlayed: seriesResult.mapsPlayed,
                vetoState: veto
              }
            : m
        );
        const enrichedGroups = (updatedTournament.groups || []).map((group) => ({
          ...group,
          matches: (group.matches || []).map((m) => enrichedGroupMatches.find((updated) => updated.id === m.id) || m)
        }));
        currentTour = {
          ...updatedTournament,
          groups: enrichedGroups,
          groupMatches: enrichedGroupMatches
        };
      }
    }

    if (currentTour.mode === 'swiss_system' && currentTour.currentStage === 'completed') {
      currentTour = finalizeTournamentVictory(currentTour);
      setActiveStageTab('swiss');
      onUpdateTournament(currentTour);
      soundFx.playVictory();
      return;
    }

    // Now advance playoffs completely
    let pMatches = [...currentTour.playoffMatches];
    let isDone = false;
    let pLoops = 0;
    while (!isDone && pLoops < 15) {
      pLoops++;
      const readyMatches = pMatches.filter((m) => m.status === 'ready' && m.teamAId && m.teamBId);
      if (readyMatches.length === 0) break;

      for (const m of readyMatches) {
        const tA = teams.find((t) => t.id === m.teamAId);
        const tB = teams.find((t) => t.id === m.teamBId);
        if (!tA || !tB) continue;

        const veto = executeCompleteAutoVeto(m.format, tA, tB);
        const seriesResult = simulateSeriesOnVeto(m.format, tA, tB, veto.selectedMapsInOrder);
        const sA = seriesResult.seriesScoreA;
        const sB = seriesResult.seriesScoreB;
        const winnerId = seriesResult.winnerTeamId;
        const deltas = applyMatchEffects(
          m,
          sA,
          sB,
          winnerId,
          undefined,
          undefined,
          undefined,
          undefined,
          m.format,
          seriesResult.mapsPlayed
        );

        const res = updatePlayoffMatchResult(
          pMatches,
          m.id,
          sA,
          sB,
          currentTour.includeThirdPlace,
          m.format
        );
        pMatches = res.updatedMatches.map((ex) =>
          ex.id === m.id
            ? {
                ...ex,
                deltaPointsA: deltas.deltaPointsA,
                deltaPointsB: deltas.deltaPointsB,
                deltaFormA: deltas.deltaFormA,
                deltaFormB: deltas.deltaFormB,
                mapsPlayed: seriesResult.mapsPlayed,
                vetoState: veto
              }
            : ex
        );
        if (res.isTournamentOver) isDone = true;
      }
    }

    currentTour = {
      ...currentTour,
      playoffMatches: pMatches
    };
    const roundRobinFinished = currentTour.mode === 'round_robin'
      && currentTour.playoffMatches.length > 0
      && currentTour.playoffMatches.every((match) => match.status === 'finished');
    if (roundRobinFinished) {
      currentTour = { ...currentTour, roundRobinTable: calculateRoundRobinTableFromMatches(currentTour) };
    }

    if (isDone || roundRobinFinished) {
      currentTour = finalizeTournamentVictory(currentTour);
    }

    if (currentTour.mode === 'major') {
      setActiveStageTab(currentTour.currentStage === 'swiss'
        ? (`major_${currentTour.majorStageNumber || 1}`) as StageTab
        : 'playoffs');
    } else if (currentTour.currentStage === 'playoffs' || currentTour.currentStage === 'completed') {
      setActiveStageTab('playoffs');
    }
    onUpdateTournament(currentTour);
    soundFx.playVictory();
  };

  // 15. Manual team placement in a slot (Swaps teams cleanly)
  const handleSelectTeamManually = (selectedTeam: Team) => {
    if (!manualSlotPicker) return;
    const { matchId, slot } = manualSlotPicker;

    const isGroupMatch = tournament.groupMatches?.some((m) => m.id === matchId);
    if (isGroupMatch) {
      const nextGroups = (tournament.groups || []).map((g) => {
        const hasMatch = g.matches.some((m) => m.id === matchId);
        if (!hasMatch) return g;
        const targetMatch = g.matches.find((m) => m.id === matchId)!;
        const currentTeamInSlot = slot === 'A' ? targetMatch.teamAId : targetMatch.teamBId;

        const updatedMatches = g.matches.map((m) => {
          if (m.id === matchId) {
            return {
              ...m,
              teamAId: slot === 'A' ? selectedTeam.id : m.teamAId,
              teamBId: slot === 'B' ? selectedTeam.id : m.teamBId,
              status: 'ready' as const
            };
          }
          if (m.teamAId === selectedTeam.id || m.teamBId === selectedTeam.id) {
            return {
              ...m,
              teamAId: m.teamAId === selectedTeam.id ? currentTeamInSlot : m.teamAId,
              teamBId: m.teamBId === selectedTeam.id ? currentTeamInSlot : m.teamBId,
              status: 'ready' as const
            };
          }
          return m;
        });

        return {
          ...g,
          matches: updatedMatches
        };
      });

      const nextAllGroupMatches = (tournament.groupMatches || []).map((m) => {
        const matchInGroup = nextGroups.flatMap((g) => g.matches).find((gm) => gm.id === m.id);
        return matchInGroup || m;
      });

      onUpdateTournament({
        ...tournament,
        groups: nextGroups,
        groupMatches: nextAllGroupMatches
      });
      setManualSlotPicker(null);
      return;
    }

    if (tournament.mode === 'round_robin' && tournament.roundRobinMatches?.some((match) => match.id === matchId)) {
      const updated = swapPlayoffMatches(tournament.roundRobinMatches || [], matchId, slot, selectedTeam.id);
      onUpdateTournament({ ...tournament, roundRobinMatches: updated });
    } else if ((tournament.mode === 'swiss_playoffs' || tournament.mode === 'swiss_system' || tournament.mode === 'major') && tournament.currentStage === 'swiss') {
      const updated = swapSwissRoundMatches(tournament.swissMatches, matchId, slot, selectedTeam.id);
      onUpdateTournament({ ...tournament, swissMatches: updated });
    } else {
      const updated = swapPlayoffMatches(tournament.playoffMatches, matchId, slot, selectedTeam.id);
      onUpdateTournament({ ...tournament, playoffMatches: updated });
    }

    setManualSlotPicker(null);
  };

  // Qualified teams in Swiss
  const qualifiedSwissTeams = Object.values(tournament.swissRecords)
    .filter((r) => r.status === 'qualified')
    .map((r) => teams.find((t) => t.id === r.teamId))
    .filter(Boolean) as Team[];

  // Eligible teams for the picker:
  const groupOfCurrentPicker = manualSlotPicker
    ? tournament.groups?.find((g) => g.matches.some((m) => m.id === manualSlotPicker.matchId))
    : null;

  const eligiblePickerTeams = groupOfCurrentPicker
    ? (groupOfCurrentPicker.teamIds?.map((id) => teams.find((t) => t.id === id)).filter(Boolean) as Team[]) || teams
    : activeStageTab === 'playoffs' &&
      (tournament.mode === 'swiss_playoffs' || tournament.mode === 'swiss_system' || tournament.mode === 'major') &&
      tournament.linkPlayoffsToSwiss !== false &&
      qualifiedSwissTeams.length === 8
    ? qualifiedSwissTeams
    : teams;

  const isCompleted = tournament.currentStage === 'completed';

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Top Tournament Control Bar */}
      <div className="p-5 bg-[#0f1420]/95 border border-slate-800 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Tournament identity only: the bracket format is chosen in the creation wizard. */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-lg font-bold text-white tracking-wide truncate">
              Управление турниром
            </h2>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-300 shrink-0">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>VRS и форма активны</span>
            </div>
          </div>
          <p className="mt-2 max-w-xl text-xs text-slate-400">
            {tournament.name || 'Текущий турнир'} · {tournament.participatingTeamIds?.length || tournament.teamCount || 0} команд. Сетка и состав задаются при создании турнира.
          </p>
        </div>

        {/* Right: Actions (Seeding, Simulating, Reset, Results) */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          {/* Create Tournament Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              setIsCreateTournamentOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
            title="Создать собственный турнир CS2"
          >
            <Trophy className="w-3.5 h-3.5 fill-black" />
            <span>Создать турнир</span>
          </button>

          {/* Seed by Rating */}
          <button
            onClick={handleSeedByRating}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Сбросить посев к рейтингу VRS"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>По рейтингу</span>
          </button>

          {/* Randomize Teams */}
          <button
            onClick={handleRandomizeTournament}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="Случайно перемешать команды"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span>Рандом команд</span>
          </button>

          {/* Simulate Current Round */}
          {!isCompleted && (
            <button
              onClick={handleFastSimulateRound}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black rounded-xl text-xs font-bold border border-amber-500/40 transition-colors cursor-pointer"
              title="Быстро симулировать текущий активный раунд"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Раунд</span>
            </button>
          )}

          {/* Simulate Full Tournament */}
          {!isCompleted && (
            <button
              onClick={handleSimulateFullTournament}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              title="Автоматически симулировать весь турнир до финала"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Весь турнир</span>
            </button>
          )}

          {/* View Final Standings / Results button */}
          {tournament.standings && (
            <button
              onClick={() => {
                soundFx.playClick();
                setIsResultsOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black rounded-xl text-xs font-bold border border-emerald-500/40 transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Итоги</span>
            </button>
          )}

          {/* Reset Tournament */}
          <button
            onClick={handleSeedByRating}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Перезапустить турнир"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Delete / Clear Active Tournament */}
          <button
            onClick={() => {
              soundFx.playClick();
              if (window.confirm(`Полностью удалить турнир «${tournament.name || 'без названия'}» и отменить его влияние на VRS и статистику карт?`)) {
                if (onDeleteTournament) onDeleteTournament(tournament);
                else onUpdateTournament(null);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
            title="Удалить турнир и вернуться к экрану создания"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Удалить турнир</span>
          </button>

          {/* Data Management Modal trigger */}
          {onOpenDataManagement && (
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenDataManagement();
              }}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Управление данными и выборочный сброс"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tournament Meta Info Banner */}
      {tournament.name && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#0e1422] to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 shrink-0">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-sm">{tournament.name}</span>
                {tournament.shortName && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {tournament.shortName}
                  </span>
                )}
                {tournament.tier && (
                  <span
                    className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${
                      tournament.tier === 'Major'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : tournament.tier === 'S-Tier'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : tournament.tier === 'A-Tier'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                        : tournament.tier === 'B-Tier'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {tournament.tier}
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5 flex flex-wrap items-center gap-2">
                {tournament.organizer && <span>Организатор: {tournament.organizer}</span>}
                {tournament.prizePool && (
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Призовой фонд: {tournament.prizePool}
                  </span>
                )}
                {tournament.startDate && <span>Старт: {tournament.startDate}</span>}
                {tournament.championVrsBonus && (
                  <span className="text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    🏆 Чемпиону: +{tournament.championVrsBonus} VRS
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400">
              Участников: <span className="text-white font-bold">{tournament.teamCount || (tournament.participatingTeamIds?.length || 16)}</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-bold uppercase text-[10px]">
              {tournament.mode.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Major stage navigation: 3 Swiss stages + playoff bracket */}
      {tournament.mode === 'major' && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {([
            { tab: 'major_1' as StageTab, label: 'Stage 1 · Swiss', index: 1 },
            { tab: 'major_2' as StageTab, label: 'Stage 2 · Swiss', index: 2 },
            { tab: 'major_3' as StageTab, label: 'Stage 3 · Swiss', index: 3 },
            { tab: 'playoffs' as StageTab, label: 'Playoffs · Top 8', index: 4 }
          ]).map((item) => {
            const stage = item.index < 4 ? tournament.majorStages?.[item.index - 1] : undefined;
            const isActive = activeStageTab === item.tab;
            const statusLabel = item.index === 4
              ? (tournament.currentStage === 'playoffs' || tournament.currentStage === 'completed' ? 'Активно' : 'Далее')
              : stage?.status === 'completed' ? 'Готово' : stage?.status === 'active' ? `Раунд ${isActive ? tournament.swissRound : stage.currentRound}/5` : 'Ожидание';
            return (
              <button
                key={item.tab}
                onClick={() => { soundFx.playClick(); setActiveStageTab(item.tab); }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold font-mono transition-all cursor-pointer ${isActive
                  ? 'bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/10'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'} ${stage?.status === 'waiting' ? 'opacity-80' : ''}`}
              >
                <span>{item.label}</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] ${isActive ? 'bg-black/20 text-white' : stage?.status === 'completed' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>{statusLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Stage Navigation Switcher (for Swiss + Playoffs Mode) */}
      {tournament.mode === 'swiss_playoffs' && (
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playClick();
                setActiveStageTab('swiss');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                activeStageTab === 'swiss'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>1. Swiss Stage (Швейцарка)</span>
              {tournament.currentStage === 'swiss' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/30 text-black font-mono">
                  Раунд {tournament.swissRound}/5
                </span>
              )}
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setActiveStageTab('playoffs');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                activeStageTab === 'playoffs'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>2. Playoffs (Сетка)</span>
              {tournament.currentStage === 'playoffs' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400 text-black font-mono font-bold">
                  Активно
                </span>
              )}
            </button>
          </div>

          <div className="text-xs font-mono text-slate-400 hidden sm:block">
            Кликните на любой матч для симуляции
          </div>
        </div>
      )}

      {/* Stage Navigation Switcher for Groups + Playoffs Mode */}
      {(tournament.mode === 'groups_playoffs' || tournament.mode === 'gsl_groups') && (
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playClick();
                setActiveStageTab('groups');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                activeStageTab === 'groups'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>1. Групповой этап (GSL Сетка)</span>
              {tournament.currentStage === 'groups' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/30 text-black font-mono">
                  Активно
                </span>
              )}
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setActiveStageTab('playoffs');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                activeStageTab === 'playoffs'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>2. Playoffs (Сетка плей-офф)</span>
              {tournament.currentStage === 'playoffs' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400 text-black font-mono font-bold">
                  Активно
                </span>
              )}
            </button>
          </div>

          <div className="text-xs font-mono text-slate-400 hidden sm:block">
            Кликните на любой матч для симуляции
          </div>
        </div>
      )}

      {/* Main Stage Rendering */}
      {tournament.mode === 'major' && activeStageTab !== 'playoffs' ? (() => {
        const stageNumber = activeStageTab === 'major_1' ? 1 : activeStageTab === 'major_2' ? 2 : 3;
        const savedStage = tournament.majorStages?.[stageNumber - 1];
        const isCurrentStage = tournament.currentStage === 'swiss' && (tournament.majorStageNumber || 1) === stageNumber;
        const stageMatches = isCurrentStage ? tournament.swissMatches : (savedStage?.matches || []);
        const stageRecords = isCurrentStage ? tournament.swissRecords : (savedStage?.records || {});
        const nextStageName = stageNumber === 1 ? 'Stage 2' : stageNumber === 2 ? 'Stage 3' : 'плей-офф';
        if (!savedStage || savedStage.status === 'waiting') {
          const directTeams = (savedStage?.directTeamIds || []).map((id) => teams.find((team) => team.id === id)).filter(Boolean) as Team[];
          return (
            <div className="space-y-4 rounded-3xl border border-purple-500/20 bg-[#090d15] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-white">{savedStage?.name || `Stage ${stageNumber}`}</h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">Этап ещё не начался. 8 команд с прямыми приглашениями уже распределены по посеву; после предыдущей швейцарки к ним присоединятся 8 прошедших команд.</p>
                </div>
                <span className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-mono font-bold text-purple-200">{directTeams.length}/8 прямых участников</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {directTeams.map((team, index) => (
                  <div key={team.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-[11px] font-bold text-purple-200">{index + 1}</span>
                    <div className="min-w-0"><div className="truncate text-sm font-bold text-white">{team.name}</div><div className="text-[10px] text-slate-500">Прямое приглашение</div></div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-400">Первая пара после открытия этапа: посевы 1–8 против посевов 9–16. Все матчи распределяются по одинаковому счёту W–L, а повторные встречи в пределах этапа исключаются, если существует допустимая альтернативная жеребьёвка.</div>
            </div>
          );
        }
        return (
          <SwissStageView
            matches={stageMatches}
            records={stageRecords}
            teams={teams}
            currentRound={isCurrentStage ? tournament.swissRound : savedStage.currentRound}
            nextStageName={nextStageName}
            onOpenMatch={isCurrentStage ? (match) => setActiveMatchToSimulate(match) : () => {}}
            onQuickSimulateMatch={isCurrentStage ? handleQuickSimulateMatch : undefined}
            onSelectManualSlot={isCurrentStage ? (matchId, slot) => setManualSlotPicker({ matchId, slot }) : undefined}
            onSwapMatchTeams={isCurrentStage ? handleSwapMatchTeams : undefined}
            onResetDefaultPairs={isCurrentStage && (tournament.mode !== 'major' || tournament.swissRound === 1) ? handleResetDefaultPairs : undefined}
            onOpenPairsEditor={isCurrentStage && (tournament.mode !== 'major' || tournament.swissRound === 1) ? () => setIsPairsEditorOpen(true) : undefined}
            onAdvanceToPlayoffs={isCurrentStage && stageNumber === 3 ? () => setActiveStageTab('playoffs') : undefined}
            onToggleMatchFormat={isCurrentStage ? handleToggleMatchFormat : undefined}
          />
        );
      })() : (tournament.mode === 'swiss_playoffs' || tournament.mode === 'swiss_system') && activeStageTab === 'swiss' ? (
        <SwissStageView
          matches={tournament.swissMatches}
          records={tournament.swissRecords}
          teams={teams}
          currentRound={tournament.swissRound}
          onOpenMatch={(m) => setActiveMatchToSimulate(m)}
          onQuickSimulateMatch={handleQuickSimulateMatch}
          onSelectManualSlot={(matchId, slot) => setManualSlotPicker({ matchId, slot })}
          onSwapMatchTeams={handleSwapMatchTeams}
          onResetDefaultPairs={handleResetDefaultPairs}
          onOpenPairsEditor={() => setIsPairsEditorOpen(true)}
          onAdvanceToPlayoffs={tournament.mode === 'swiss_playoffs' ? () => setActiveStageTab('playoffs') : undefined}
          onToggleMatchFormat={handleToggleMatchFormat}
        />
      ) : (tournament.mode === 'groups_playoffs' || tournament.mode === 'gsl_groups') && activeStageTab === 'groups' ? (
        <GslGroupsView
          groups={tournament.groups || []}
          teams={teams}
          onOpenMatch={(m) => setActiveMatchToSimulate(m)}
          onQuickSimulateMatch={handleQuickSimulateMatch}
          onAdvanceToPlayoffs={() => setActiveStageTab('playoffs')}
          onToggleMatchFormat={handleToggleMatchFormat}
          onUpdateGroupMatches={handleUpdateGroupMatches}
          onSelectManualSlot={(matchId, slot) => setManualSlotPicker({ matchId, slot })}
        />
      ) : tournament.mode === 'blast_bounty' ? (
        <BlastBountyStageView
          tournament={tournament}
          teams={teams}
          onDraftRound={handleBlastBountyDraft}
          onSetWager={handleBlastBountyWager}
          onOpenMatch={(match) => setActiveMatchToSimulate(match)}
          onQuickSimulateMatch={handleQuickSimulateMatch}
        />
      ) : (
        <PlayoffsStageView
          matches={tournament.mode === 'round_robin' ? (tournament.roundRobinMatches || []) : tournament.playoffMatches}
          teams={teams}
          mode={(
            tournament.mode === 'double_elimination'
            || (tournament.currentStage === 'playoffs' && tournament.stageFormats?.playoffType === 'double_elimination')
          ) ? 'double_elimination' : tournament.mode === 'round_robin' ? 'round_robin' : 'single_elimination'}
          isFromSwiss={tournament.mode === 'swiss_playoffs' || tournament.mode === 'major'}
          linkPlayoffsToSwiss={tournament.linkPlayoffsToSwiss !== false}
          onToggleLinkSwiss={tournament.mode === 'major' ? undefined : handleToggleLinkSwiss}
          qualifiedRecords={Object.values(tournament.swissRecords).filter((r) => r.status === 'qualified')}
          includeThirdPlace={tournament.includeThirdPlace || isEightTeamGslTournament(tournament)}
          thirdPlaceRequired={isEightTeamGslTournament(tournament)}
          onToggleThirdPlace={tournament.mode === 'major' ? () => {} : handleToggleThirdPlace}
          hideThirdPlaceToggle={tournament.mode === 'major' || tournament.mode === 'double_elimination' || tournament.stageFormats?.playoffType === 'double_elimination' || tournament.mode === 'round_robin'}
          onOpenMatch={(m) => setActiveMatchToSimulate(m)}
          onQuickSimulateMatch={handleQuickSimulateMatch}
          onSelectManualSlot={(matchId, slot) => setManualSlotPicker({ matchId, slot })}
          onResetToSwissSeeding={tournament.mode === 'major' || tournament.mode === 'round_robin' ? undefined : handleResetToSwissSeeding}
          onRandomizePlayoffTeams={tournament.mode === 'major' ? undefined : handleRandomizePlayoffTeams}
          onSeedTop8VRS={tournament.mode === 'major' ? undefined : handleSeedTop8VRS}
          onToggleMatchFormat={handleToggleMatchFormat}
        />
      )}

      {/* Modal: Interactive Match Simulation */}
      {activeMatchToSimulate && (
        <TournamentSimulationModal
          match={activeMatchToSimulate}
          teams={teams}
          onClose={() => setActiveMatchToSimulate(null)}
          onConfirmResult={handleConfirmMatchResult}
          onUpdateTeams={onUpdateTeams}
        />
      )}

      {/* Modal: Final Standings & Trophy Celebration */}
      {tournament.standings && (
        <TournamentResultsModal
          isOpen={isResultsOpen}
          onClose={() => setIsResultsOpen(false)}
          standings={tournament.standings}
          teams={teams}
          tournament={tournament}
          onStartNewTournament={() => {
            setIsResultsOpen(false);
            handleSeedByRating();
          }}
        />
      )}

      {/* Modal: Manual Team Slot Picker */}
      {manualSlotPicker && (
        <TeamSelector
          isOpen={true}
          onClose={() => setManualSlotPicker(null)}
          onSelectTeam={handleSelectTeamManually}
          teams={eligiblePickerTeams}
          slotName={manualSlotPicker.slot === 'A' ? 'Team A' : 'Team B'}
        />
      )}

      {/* Modal: Create Tournament Wizard */}
      {isCreateTournamentOpen && (
        <CreateTournamentModal
          teams={teams}
          onClose={() => setIsCreateTournamentOpen(false)}
          onCreateTournament={(newTour) => {
            onUpdateTournament(newTour);
            setIsCreateTournamentOpen(false);
            const nextTab: StageTab = newTour.mode === 'major' ? 'major_1'
              : newTour.mode === 'gsl_groups' || newTour.mode === 'groups_playoffs' ? 'groups'
              : newTour.mode === 'playoffs_only' || newTour.mode === 'single_elimination' || newTour.mode === 'double_elimination' || newTour.mode === 'blast_bounty' || newTour.mode === 'round_robin' ? 'playoffs'
              : 'swiss';
            setStageTabSelection({ tournamentId: newTour.id, tab: nextTab });
          }}
        />
      )}

      {/* Modal: Custom Swiss Pairs Editor */}
      <SwissPairsModal
        isOpen={isPairsEditorOpen}
        onClose={() => setIsPairsEditorOpen(false)}
        matches={tournament.swissMatches.filter((m) => m.roundNumber === tournament.swissRound && m.status !== 'finished')}
        teams={teams}
        onSaveMatches={(edited) => {
          const byId = new Map(edited.map((m) => [m.id, m]));
          // Keep every tournament setting; only replace team slots of edited matches.
          const apply = (list: TournamentMatch[]) => list.map((m) => {
            const e = byId.get(m.id);
            return e ? { ...m, teamAId: e.teamAId, teamBId: e.teamBId } : m;
          });
          onUpdateTournament({
            ...tournament,
            swissMatches: apply(tournament.swissMatches),
            ...(tournament.majorStages ? { majorStages: tournament.majorStages.map((st) => ({ ...st, matches: apply(st.matches) })) } : {})
          });
        }}
      />
    </div>
  );
};
