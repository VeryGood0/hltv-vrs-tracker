// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React, { useState, useMemo } from 'react';
import { Team, MatchPrediction, TeamFormStats, Trophy as TrophyType, TrophyMatchSummary } from '../types';
import { TeamLogo } from './TeamLogo';
import { MAP_METADATA } from '../data/mapPool';
import { getTeamProfile } from '../utils/mapSimulation';
import { getTournamentMatchChronologicalRank, normalizeTrophyMatchStageName } from '../utils/tournament';
import {
  X,
  Trophy,
  DollarSign,
  Swords,
  TrendingUp,
  TrendingDown,
  User,
  Shield,
  Play,
  Layers,
  Star,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Award,
  CheckCircle2,
  Crown,
  Flame,
  ArrowDown,
  Sparkles,
  Target,
  Grid
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface TeamProfileModalProps {
  team: Team | null;
  onClose: () => void;
  teams: Team[];
  history: MatchPrediction[];
  form: TeamFormStats & { formModifier: number };
  rank: number;
  onSelectForMatch: (team: Team) => void;
}

export const TeamProfileModal: React.FC<TeamProfileModalProps> = ({
  team,
  onClose,
  teams,
  history,
  form,
  rank,
  onSelectForMatch
}) => {
  const [modalTab, setModalTab] = useState<'mappool' | 'overview' | 'trophies'>('mappool');
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyType | null>(null);

  if (!team) return null;

  const mapProfile = getTeamProfile(team);
  const teamTrophies = team.trophies || [];
  const trophiesCount = team.trophiesCount !== undefined ? team.trophiesCount : teamTrophies.length;
  const majorTrophiesCount = teamTrophies.filter((t) => t.tier === 'Major').length;
  const sTierTrophiesCount = teamTrophies.filter((t) => t.tier === 'S-Tier').length;

  const trophyMatches = useMemo((): TrophyMatchSummary[] => {
    if (!selectedTrophy) return [];
    let list: TrophyMatchSummary[] = [];

    if (selectedTrophy.matchesPlayed && selectedTrophy.matchesPlayed.length > 0) {
      list = selectedTrophy.matchesPlayed.map((match) => ({
        ...match,
        stageName: normalizeTrophyMatchStageName(match)
      }));
    } else {
      const runnerUp =
        teams.find(
          (t) => t.name === selectedTrophy.runnerUpTeamName || t.id === selectedTrophy.runnerUpTeamId
        ) ||
        teams.find((t) => t.id !== team.id) ||
        teams[0];
      const otherTeams = teams.filter((t) => t.id !== team.id && t.id !== runnerUp.id);
      const sfOpp = otherTeams[0] || teams[1] || teams[0];
      const qfOpp = otherTeams[1] || teams[2] || teams[0];

      // Fallback: Grand Final at top (latest match), down to Quarterfinal
      list = [
        {
          id: `${selectedTrophy.id}_final`,
          stageName: 'Гранд-Финал (Матч за чемпионство)',
          roundNumber: 3,
          poolKey: 'final',
          opponentId: runnerUp.id,
          opponentName: runnerUp.name,
          opponentLogo: runnerUp.customLogo || runnerUp.logoUrl,
          opponentPoints: runnerUp.points,
          result: 'W',
          scoreSeries: selectedTrophy.tier === 'Major' ? '3 : 1' : '2 : 1',
          scoreA: selectedTrophy.tier === 'Major' ? 3 : 2,
          scoreB: 1,
          format: selectedTrophy.tier === 'Major' ? 'BO5' : 'BO3',
          deltaPoints: selectedTrophy.vrsPointsAwarded || 35,
          mapsPlayed: [
            {
              mapName: 'Mirage',
              mapOrder: 1,
              scoreA: 13,
              scoreB: 9,
              overtime: false,
              half1A: 7,
              half1B: 5,
              half2A: 6,
              half2B: 4,
              winnerTeamId: team.id,
              loserTeamId: runnerUp.id,
              narrative: `${team.name} выиграли Mirage 13:9`
            },
            {
              mapName: 'Inferno',
              mapOrder: 2,
              scoreA: 11,
              scoreB: 13,
              overtime: false,
              half1A: 6,
              half1B: 6,
              half2A: 5,
              half2B: 7,
              winnerTeamId: runnerUp.id,
              loserTeamId: team.id,
              narrative: `${runnerUp.name} взяли Inferno 13:11`
            },
            {
              mapName: 'Nuke',
              mapOrder: 3,
              scoreA: 16,
              scoreB: 14,
              overtime: true,
              half1A: 6,
              half1B: 6,
              half2A: 6,
              half2B: 6,
              winnerTeamId: team.id,
              loserTeamId: runnerUp.id,
              narrative: `${team.name} вырвали решающий Nuke на овертаймах 16:14`
            }
          ]
        },
        {
          id: `${selectedTrophy.id}_sf`,
          stageName: '1/2 финала (Полуфинал)',
          roundNumber: 2,
          poolKey: 'sf',
          opponentId: sfOpp.id,
          opponentName: sfOpp.name,
          opponentLogo: sfOpp.customLogo || sfOpp.logoUrl,
          opponentPoints: sfOpp.points,
          result: 'W',
          scoreSeries: '2 : 1',
          scoreA: 2,
          scoreB: 1,
          format: 'BO3',
          deltaPoints: 24,
          mapsPlayed: [
            {
              mapName: 'Dust2',
              mapOrder: 1,
              scoreA: 13,
              scoreB: 8,
              overtime: false,
              half1A: 8,
              half1B: 4,
              half2A: 5,
              half2B: 4,
              winnerTeamId: team.id,
              loserTeamId: sfOpp.id,
              narrative: `${team.name} уверенно забрали Dust2`
            },
            {
              mapName: 'Ancient',
              mapOrder: 2,
              scoreA: 10,
              scoreB: 13,
              overtime: false,
              half1A: 5,
              half1B: 7,
              half2A: 5,
              half2B: 6,
              winnerTeamId: sfOpp.id,
              loserTeamId: team.id,
              narrative: `${sfOpp.name} победили на Ancient`
            },
            {
              mapName: 'Anubis',
              mapOrder: 3,
              scoreA: 13,
              scoreB: 7,
              overtime: false,
              half1A: 9,
              half1B: 3,
              half2A: 4,
              half2B: 4,
              winnerTeamId: team.id,
              loserTeamId: sfOpp.id,
              narrative: `${team.name} разгромили соперника на Anubis`
            }
          ]
        },
        {
          id: `${selectedTrophy.id}_qf`,
          stageName: '1/4 финала (Четвертьфинал)',
          roundNumber: 1,
          poolKey: 'qf',
          opponentId: qfOpp.id,
          opponentName: qfOpp.name,
          opponentLogo: qfOpp.customLogo || qfOpp.logoUrl,
          opponentPoints: qfOpp.points,
          result: 'W',
          scoreSeries: '2 : 0',
          scoreA: 2,
          scoreB: 0,
          format: 'BO3',
          deltaPoints: 18,
          mapsPlayed: [
            {
              mapName: 'Mirage',
              mapOrder: 1,
              scoreA: 13,
              scoreB: 5,
              overtime: false,
              half1A: 10,
              half1B: 2,
              half2A: 3,
              half2B: 3,
              winnerTeamId: team.id,
              loserTeamId: qfOpp.id,
              narrative: `Убедительная победа на Mirage`
            },
            {
              mapName: 'Nuke',
              mapOrder: 2,
              scoreA: 13,
              scoreB: 10,
              overtime: false,
              half1A: 7,
              half1B: 5,
              half2A: 6,
              half2B: 5,
              winnerTeamId: team.id,
              loserTeamId: qfOpp.id,
              narrative: `Победа на Nuke и проход в полуфинал`
            }
          ]
        }
      ];
    }

    // Normalize stages to fix any mislabeled matches from previous runs
    const cleanList = list.map((m) => {
      const canonicalStage = normalizeTrophyMatchStageName(m);
      // A legacy GSL Classic final may have roundNumber=2, which the old
      // round-based fallback incorrectly labeled as a semifinal. Trust the
      // match id/pool key before applying these heuristic labels.
      if (canonicalStage.startsWith('Гранд-Финал') || canonicalStage.startsWith('Матч за 3-е место')) {
        return { ...m, stageName: canonicalStage };
      }

      const s = (m.stageName || '').toLowerCase();
      const pk = (m.poolKey || '').toLowerCase();
      const id = (m.id || '').toLowerCase();

      const isQuarter =
        pk.startsWith('qf') ||
        id.includes('qf') ||
        s.includes('1/4') ||
        s.includes('четверть') ||
        (m.roundNumber === 1 && !id.includes('swiss') && !s.includes('швейцар') && !s.includes('групп'));

      const isSemi =
        pk.startsWith('sf') ||
        id.includes('sf') ||
        s.includes('1/2') ||
        s.includes('полу') ||
        (m.roundNumber === 2 && !id.includes('swiss') && !s.includes('швейцар') && !s.includes('групп'));

      const isThird =
        pk.includes('3rd') ||
        pk === 'third_place' ||
        pk === 'third' ||
        id === 'playoff_3rd' ||
        id.endsWith('_third_place') ||
        s.includes('матч за 3-е место') ||
        s.includes('бронз');

      const isSwiss =
        id.includes('swiss') ||
        s.includes('швейцар') ||
        pk.includes(':');

      const isGroup =
        id.includes('gsl') ||
        id.includes('grp') ||
        s.includes('групп') ||
        pk.includes('opening') ||
        pk.includes('winners') ||
        pk.includes('elim') ||
        pk.includes('decider');

      const isActualGrandFinal =
        !isQuarter &&
        !isSemi &&
        !isThird &&
        !isSwiss &&
        !isGroup &&
        (pk === 'final' ||
          pk === 'playoff_final' ||
          pk === 'grand_final' ||
          id.endsWith('_final') ||
          id === 'playoff_final' ||
          s.includes('гранд') ||
          s.includes('чемпион') ||
          s.trim() === 'финал');

      let cleanStage = m.stageName;
      if (isActualGrandFinal) {
        cleanStage = 'Гранд-Финал (Матч за чемпионство)';
      } else if (isThird) {
        cleanStage = 'Матч за 3-е место (Бронзовый финал)';
      } else if (isSemi) {
        cleanStage = '1/2 финала (Полуфинал)';
      } else if (isQuarter) {
        cleanStage = '1/4 финала (Четвертьфинал)';
      }

      return {
        ...m,
        stageName: cleanStage
      };
    });

    // Return in reverse chronological order: Grand Final (Rank 1000) at the VERY TOP (#1),
    // down to Semi-Finals, Quarter-Finals, and Swiss Round 1!
    return cleanList.sort(
      (a, b) => getTournamentMatchChronologicalRank(b) - getTournamentMatchChronologicalRank(a)
    );
  }, [selectedTrophy, team, teams]);

  const trophyStats = useMemo(() => {
    if (!selectedTrophy || trophyMatches.length === 0) return null;
    let totalMapsWon = 0;
    let totalMapsLost = 0;
    let totalSeriesWon = 0;
    let totalSeriesLost = 0;
    let totalMatchVrs = 0;

    trophyMatches.forEach((m) => {
      if (m.result === 'W') totalSeriesWon++;
      else totalSeriesLost++;

      if (typeof m.scoreA === 'number' && typeof m.scoreB === 'number') {
        totalMapsWon += m.scoreA;
        totalMapsLost += m.scoreB;
      }
      if (typeof m.deltaPoints === 'number' && m.deltaPoints > 0) {
        totalMatchVrs += m.deltaPoints;
      }
    });

    return {
      totalMatches: trophyMatches.length,
      totalSeriesWon,
      totalSeriesLost,
      totalMapsWon,
      totalMapsLost,
      totalMatchVrs,
      championBonus: selectedTrophy.vrsPointsAwarded || 0,
      totalVrsEarned: totalMatchVrs + (selectedTrophy.vrsPointsAwarded || 0)
    };
  }, [selectedTrophy, trophyMatches]);

  // Filter all matches involving this team
  const teamMatches = history.filter(
    (m) => m.teamAId === team.id || m.teamBId === team.id
  );

  const getOpponent = (m: MatchPrediction): Team => {
    const isTeamA = m.teamAId === team.id;
    const oppId = isTeamA ? m.teamBId : m.teamAId;
    const oppName = isTeamA ? m.teamBName : m.teamAName;

    const found = teams.find((t) => t.id === oppId);
    if (found) return found;

    return {
      id: oppId,
      name: oppName || 'Соперник',
      points: 1500,
      defaultPoints: 1500,
      logoUrl: `/logos/${oppId}.webp`,
      primaryColor: '#94a3b8',
      secondaryColor: '#0f172a',
      country: '',
      region: '',
      rosterSnippet: []
    };
  };

  const totalMatches = teamMatches.length;
  const totalWins = teamMatches.filter((m) => m.winnerTeamId === team.id).length;
  const totalLosses = totalMatches - totalWins;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111622] border border-slate-700/70 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top ambient glow with team color */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-36 rounded-full blur-3xl pointer-events-none opacity-25"
          style={{ backgroundColor: team.primaryColor || '#f59e0b' }}
        />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between relative z-10 bg-slate-900/40">
          <div className="flex items-center gap-4">
            <TeamLogo team={team} size="lg" className="shadow-lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  #{rank} в рейтинге VRS
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {team.country} · {team.region}
                </span>
                {trophiesCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>{trophiesCount} {trophiesCount === 1 ? 'титул' : trophiesCount < 5 ? 'титула' : 'титулов'}</span>
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                {team.name}
              </h2>

              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <div className="font-mono font-bold text-amber-400 text-sm">
                  {team.points} <span className="text-[10px] text-slate-400 font-normal">VRS PTS</span>
                </div>

                <div className="text-slate-600">|</div>

                <div className="font-mono text-slate-300">
                  Рейтинг: <span className="font-bold text-white">{mapProfile.overallRating}</span>
                </div>

                {form.formModifier !== 0 && (
                  <div
                    className={`flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded ${
                      form.formModifier > 0
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {form.formModifier > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>{form.formModifier > 0 ? `+${form.formModifier}` : form.formModifier} форма</span>
                  </div>
                )}
              </div>
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

        {/* Tab Switcher */}
        <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModalTab('mappool')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              modalTab === 'mappool'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Duty Map Pool (7 карт)</span>
          </button>

          <button
            onClick={() => setModalTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              modalTab === 'overview'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Обзор и матчи</span>
          </button>

          <button
            onClick={() => setModalTab('trophies')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              modalTab === 'trophies'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Выигранные турниры ({trophiesCount})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {modalTab === 'mappool' ? (
            /* MAP POOL TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Актуальная статистика HLTV (последние 3 месяца и 20–30 карт)
                </span>
                <span className="text-emerald-400 font-bold">
                  Active Duty 2026 (вкл. Cache)
                </span>
              </div>

              {/* 7 Maps Detailed Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {Object.values(mapProfile.maps).map((st) => {
                  const meta = MAP_METADATA[st.mapName];
                  const isBest = mapProfile.bestMaps.includes(st.mapName);
                  const isWorst = mapProfile.worstMaps.includes(st.mapName);

                  return (
                    <div
                      key={st.mapName}
                      className={`p-4 rounded-2xl border transition-all ${
                        isBest
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                          : isWorst
                          ? 'bg-rose-950/20 border-rose-500/30'
                          : 'bg-[#101524] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Bar: Name & Rating */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: meta.themeColor }}
                          />
                          <div>
                            <div className="font-bold text-white text-base flex items-center gap-1.5">
                              {st.mapName}
                              {st.mapName === 'Cache' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-lime-500/20 text-lime-400 border border-lime-500/30 font-bold">
                                  NEW
                                </span>
                              )}
                              {st.mapsPlayed > 0 && isBest && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                                  КОРОННАЯ
                                </span>
                              )}
                              {st.mapsPlayed > 0 && st.isPermanentBan && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                                  ПЕРМАБАН
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {meta.tagline}
                            </span>
                          </div>
                        </div>

                        {/* Rating Badge */}
                        <div className="text-right">
                          <div className="text-xs font-mono text-slate-400">Map Rating</div>
                          <div
                            className={`text-xl font-black font-mono tabular-nums ${
                              st.mapsPlayed === 0
                                ? 'text-slate-500'
                                : st.mapRating >= 85
                                ? 'text-emerald-400'
                                : st.mapRating <= 60
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {st.mapsPlayed === 0 ? 0 : st.mapRating}
                            <span className="text-[10px] text-slate-500 font-normal">/100</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-center font-mono text-[11px]">
                        <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/60">
                          <div className="text-[9px] text-slate-400 uppercase">Винрейт</div>
                          <div className="font-bold text-white">
                            {st.mapsPlayed === 0 ? '0%' : `${st.winRate}%`}
                          </div>
                        </div>
                        <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/60">
                          <div className="text-[9px] text-slate-400 uppercase">Матчи (W-L)</div>
                          <div className="font-bold text-slate-200">
                            {st.mapsPlayed === 0 ? (
                              <span>0 <span className="text-slate-500">-</span> 0</span>
                            ) : (
                              <span>{st.wins} <span className="text-slate-500">-</span> {st.losses}</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/60">
                          <div className="text-[9px] text-slate-400 uppercase">Пик / Бан</div>
                          <div className="font-bold text-slate-200">
                            {st.mapsPlayed === 0 ? '0% / 0%' : `${st.pickRate}% / ${st.banRate}%`}
                          </div>
                        </div>
                        <div className="bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/60">
                          <div className="text-[9px] text-slate-400 uppercase">Тренд 30д</div>
                          <div
                            className={`font-bold flex items-center justify-center gap-0.5 ${
                              st.mapsPlayed === 0
                                ? 'text-slate-500'
                                : st.formChange30d >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {st.mapsPlayed === 0 ? (
                              <span>0</span>
                            ) : (
                              <>
                                {st.formChange30d >= 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {st.formChange30d >= 0 ? `+${st.formChange30d}` : st.formChange30d}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recent Map Results */}
                      {st.recentResults.length > 0 ? (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                          <div className="text-[9px] font-mono uppercase text-slate-400 mb-1">
                            Последние игры на карте:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {st.recentResults.slice(0, 4).map((r, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                                  r.result === 'W'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                <span>{r.result}</span>
                                <span className="text-slate-300 font-normal">vs {r.opponentName}</span>
                                <span className="text-slate-400 text-[9px]">({r.score})</span>
                                {r.tournamentName && (
                                  <span className="max-w-[150px] truncate text-[9px] font-normal text-amber-300/90" title={`${r.tournamentName}${r.stageName ? ` · ${r.stageName}` : ''}`}>
                                    {r.tournamentName}{r.stageName ? ` · ${r.stageName}` : ''}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                          <span className="text-[10px] font-mono text-slate-500">
                            Нет сыгранных матчей на этой карте
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : modalTab === 'overview' ? (
            /* OVERVIEW TAB */
            <>
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Матчи</div>
                  <div className="text-lg font-black font-mono text-white mt-0.5">{totalMatches}</div>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Победы / Поражения</div>
                  <div className="text-lg font-black font-mono text-emerald-400 mt-0.5">
                    {totalWins} <span className="text-slate-500 text-xs font-normal">/ {totalLosses}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Винрейт</div>
                  <div className="text-lg font-black font-mono text-amber-400 mt-0.5">{winRate}%</div>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Текущая серия</div>
                  <div className="text-sm font-black font-mono text-white mt-1">
                    {form.streak !== 0 ? (
                      form.streak > 0 ? (
                        <span className="text-emerald-400">+{form.streak} побед</span>
                      ) : (
                        <span className="text-rose-400">{form.streak} пораж.</span>
                      )
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-emerald-950/25 border border-emerald-500/25 rounded-xl text-center" title="Суммарные призовые за завершённые турниры">
                  <div className="text-[10px] uppercase font-mono text-emerald-300 font-bold flex items-center justify-center gap-1">
                    <DollarSign className="w-3 h-3" /> Призовые
                  </div>
                  <div className="text-sm font-black font-mono text-emerald-300 mt-1 break-words">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(teams.find((candidate) => candidate.id === team.id)?.prizeMoneyEarned ?? team.prizeMoneyEarned ?? 0)}
                  </div>
                </div>
              </div>

              {/* Trophies Banner on Overview */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900/40 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 shrink-0">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Зал славы: {trophiesCount} {trophiesCount === 1 ? 'выигранный турнир' : trophiesCount < 5 ? 'выигранных турнира' : 'выигранных турниров'}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {teamTrophies.length > 0
                        ? teamTrophies.map((t) => t.name).slice(0, 3).join(' · ')
                        : 'Команда пока не завоевала кубков'}
                    </div>
                  </div>
                </div>
                {trophiesCount > 0 && (
                  <button
                    onClick={() => setModalTab('trophies')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black text-xs font-mono font-bold border border-amber-500/30 transition-colors cursor-pointer shrink-0"
                  >
                    Все трофеи ({trophiesCount})
                  </button>
                )}
              </div>

              {/* Roster & Coach Box */}
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
                <div className="text-xs font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Состав команды (Lineup)</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(team.rosterSnippet || []).map((player, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-[#090d14] border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1"
                    >
                      <User className="w-3 h-3 text-slate-500" />
                      {player}
                    </span>
                  ))}
                </div>
                {team.coach && (
                  <div className="text-xs text-slate-400 pt-1">
                    Главный тренер: <span className="text-white font-medium">{team.coach}</span>
                  </div>
                )}
              </div>

              {/* Match History for this Team */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-amber-400" />
                    <span>История матчей команды ({totalMatches})</span>
                  </div>
                </div>

                {teamMatches.length > 0 ? (
                  <div className="space-y-2">
                    {teamMatches.map((m) => {
                      const isTeamA = m.teamAId === team.id;
                      const opp = getOpponent(m);
                      const myScore = isTeamA ? m.scoreA : m.scoreB;
                      const oppScore = isTeamA ? m.scoreB : m.scoreA;
                      const won = m.winnerTeamId === team.id;
                      const myDeltaPts = isTeamA ? m.deltaPointsA : m.deltaPointsB;
                      const myDeltaForm = isTeamA ? m.deltaFormA : m.deltaFormB;

                      return (
                        <div
                          key={m.id}
                          className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs font-mono"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-[10px] tracking-wider ${
                                won
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {won ? 'WIN' : 'LOSS'}
                            </span>

                            <div className="flex items-center gap-2">
                              <TeamLogo team={opp} size="xs" />
                              <span className="font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                                {opp.name}
                              </span>
                            </div>
                            {m.tournamentName && (
                              <span className="max-w-[180px] truncate text-[10px] text-amber-300/90" title={`${m.tournamentName}${m.tournamentStage ? ` · ${m.tournamentStage}` : ''}`}>
                                {m.tournamentName}{m.tournamentStage ? ` · ${m.tournamentStage}` : ''}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Score */}
                            <div className="font-bold text-sm tabular-nums">
                              <span className={won ? 'text-emerald-400' : 'text-slate-400'}>
                                {myScore}
                              </span>
                              <span className="text-slate-600 mx-1">:</span>
                              <span className={!won ? 'text-rose-400' : 'text-slate-400'}>
                                {oppScore}
                              </span>
                            </div>

                            {/* Form delta */}
                            {typeof myDeltaForm === 'number' && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${
                                  myDeltaForm > 0
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {myDeltaForm > 0 ? `+${myDeltaForm}` : myDeltaForm} форма
                              </span>
                            )}

                            {/* VRS points delta */}
                            {typeof myDeltaPts === 'number' && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${
                                  myDeltaPts > 0
                                    ? 'bg-amber-400/20 text-amber-300'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {myDeltaPts > 0 ? `+${myDeltaPts}` : myDeltaPts}pt
                              </span>
                            )}

                            <span className="text-[10px] text-slate-500 hidden sm:inline">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-xs text-slate-400">
                      Команда пока не сыграла ни одного симулированного матча в этой сессии.
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Запустите матч во вкладке «Предиктор», чтобы начать накапливать статистику формы и очки!
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* TROPHIES & TITLES TAB */
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Header Showcase Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-gradient-to-br from-amber-500/20 via-slate-900/60 to-slate-900/80 border border-amber-500/30 rounded-2xl text-center">
                  <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">Всего титулов</div>
                  <div className="text-2xl font-black font-mono text-white mt-1 flex items-center justify-center gap-1.5">
                    <Trophy className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                    <span>{trophiesCount}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-gradient-to-br from-purple-500/20 via-slate-900/60 to-slate-900/80 border border-purple-500/30 rounded-2xl text-center">
                  <div className="text-[10px] font-mono uppercase text-purple-400 font-bold">Major кубки</div>
                  <div className="text-2xl font-black font-mono text-white mt-1">
                    {majorTrophiesCount}
                  </div>
                </div>

                <div className="p-3.5 bg-gradient-to-br from-yellow-500/20 via-slate-900/60 to-slate-900/80 border border-yellow-500/30 rounded-2xl text-center">
                  <div className="text-[10px] font-mono uppercase text-yellow-400 font-bold">S-Tier турниры</div>
                  <div className="text-2xl font-black font-mono text-white mt-1">
                    {sTierTrophiesCount}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl text-center">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Текущий рейтинг</div>
                  <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                    #{rank}
                  </div>
                </div>
              </div>

              {/* Trophies Collection Grid or Selected Trophy Matches View */}
              {selectedTrophy ? (
                /* TOURNAMENT MATCHES VIEW FOR SELECTED TROPHY (REVERSE CHRONOLOGICAL: FINAL -> ROUND 1) */
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Top Bar Navigation */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        setSelectedTrophy(null);
                      }}
                      className="group px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-amber-400 hover:text-amber-300 hover:border-amber-500/50 flex items-center gap-2 text-xs font-mono font-bold transition-all cursor-pointer shadow-md hover:bg-slate-800"
                    >
                      <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                      <span>← Назад ко всем трофеям ({teamTrophies.length})</span>
                    </button>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Хронология: от финала к первым раундам</span>
                      <ArrowDown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    </div>
                  </div>

                  {/* Tournament Hero Showcase Card */}
                  <div
                    className={`relative p-5 sm:p-6 rounded-3xl border overflow-hidden shadow-2xl ${
                      selectedTrophy.tier === 'Major'
                        ? 'bg-gradient-to-br from-purple-950/50 via-[#0e1424] to-[#070b14] border-purple-500/50 shadow-purple-950/20'
                        : selectedTrophy.tier === 'S-Tier'
                        ? 'bg-gradient-to-br from-amber-950/45 via-[#0e1424] to-[#070b14] border-amber-500/50 shadow-amber-950/20'
                        : 'bg-gradient-to-br from-slate-900 via-[#0e1424] to-[#070b14] border-slate-700'
                    }`}
                  >
                    {/* Background Ambient Glow */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-xl relative ${
                            selectedTrophy.tier === 'Major'
                              ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-purple-500/20'
                              : 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-amber-500/20'
                          }`}
                        >
                          <Trophy className="w-8 h-8 fill-current/20" />
                          <Crown className="w-4 h-4 absolute -top-1.5 -right-1.5 text-amber-400" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${
                                selectedTrophy.tier === 'Major'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  : selectedTrophy.tier === 'S-Tier'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {selectedTrophy.tier || 'S-Tier'}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              {selectedTrophy.year || 2026}
                            </span>
                            {selectedTrophy.date && (
                              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                                · {selectedTrophy.date}
                              </span>
                            )}
                            <span className="text-[10px] font-mono font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <span>🏆 Чемпионы</span>
                            </span>
                          </div>

                          <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
                            {selectedTrophy.name}
                          </h3>

                          {selectedTrophy.runnerUpTeamName && (
                            <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                              <span>Победа в Гранд-финале над</span>
                              <span className="text-slate-200 font-bold">{selectedTrophy.runnerUpTeamName}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Bounties & Champion VRS */}
                      <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                        {selectedTrophy.vrsPointsAwarded && (
                          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-left md:text-right">
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                              Награда за титул
                            </div>
                            <div className="text-lg font-black font-mono text-emerald-400 flex items-center md:justify-end gap-1 mt-0.5">
                              <span>+{selectedTrophy.vrsPointsAwarded}</span>
                              <span className="text-xs font-bold text-emerald-500">VRS</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Run Stats Bar */}
                    {trophyStats && (
                      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-800/80 text-xs font-mono">
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                          <span className="text-slate-500 text-[10px] uppercase block">Всего матчей</span>
                          <span className="font-extrabold text-white text-sm mt-0.5 block">
                            {trophyStats.totalMatches} игры
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                          <span className="text-slate-500 text-[10px] uppercase block">Счёт по сериям</span>
                          <span className="font-extrabold text-emerald-400 text-sm mt-0.5 block">
                            {trophyStats.totalSeriesWon}W – {trophyStats.totalSeriesLost}L
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                          <span className="text-slate-500 text-[10px] uppercase block">Сыграно карт</span>
                          <span className="font-extrabold text-slate-200 text-sm mt-0.5 block">
                            {trophyStats.totalMapsWon + trophyStats.totalMapsLost} ({trophyStats.totalMapsWon}W)
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                          <span className="text-slate-500 text-[10px] uppercase block">Всего заработано VRS</span>
                          <span className="font-extrabold text-amber-400 text-sm mt-0.5 block">
                            +{trophyStats.totalVrsEarned} pts
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section Title & Direction Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 px-1">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Сыгранные матчи ({trophyMatches.length})
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Показаны сверху вниз: от финала к открывающему матчу</span>
                    </div>
                  </div>

                  {/* Matches List: Reverse Chronological */}
                  <div className="space-y-3.5">
                    {trophyMatches.map((m, idx) => {
                      const isWin = m.result === 'W';
                      const oppTeam = teams.find((t) => t.id === m.opponentId);
                      const isQuarter =
                        m.stageName.toLowerCase().includes('четверть') ||
                        m.stageName.toLowerCase().includes('1/4') ||
                        m.poolKey?.toLowerCase().startsWith('qf') ||
                        m.id?.toLowerCase().includes('qf');

                      const isSemi =
                        m.stageName.toLowerCase().includes('полуфинал') ||
                        m.stageName.toLowerCase().includes('1/2') ||
                        m.poolKey?.toLowerCase().startsWith('sf') ||
                        m.id?.toLowerCase().includes('sf');

                      const isThird =
                        m.stageName.toLowerCase().includes('матч за 3-е место') ||
                        m.stageName.toLowerCase().includes('бронз') ||
                        m.poolKey?.toLowerCase().includes('3rd') ||
                        m.poolKey?.toLowerCase() === 'third_place' ||
                        m.poolKey?.toLowerCase() === 'third';

                      const isSwiss =
                        m.stageName.toLowerCase().includes('швейцар') ||
                        m.id?.toLowerCase().includes('swiss');

                      const isGrandFinal =
                        !isQuarter &&
                        !isSemi &&
                        !isThird &&
                        !isSwiss &&
                        (m.stageName.toLowerCase().includes('гранд') ||
                          m.stageName.toLowerCase().includes('чемпион') ||
                          m.poolKey === 'final' ||
                          m.poolKey === 'playoff_final' ||
                          m.poolKey === 'grand_final' ||
                          m.id?.endsWith('_final') ||
                          m.id === 'playoff_final' ||
                          m.stageName.trim().toLowerCase() === 'финал');

                      return (
                        <div key={m.id || idx} className="space-y-2">
                          <div
                            className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 relative overflow-hidden group shadow-lg ${
                              isGrandFinal
                                ? 'bg-gradient-to-r from-[#1c1507] via-[#0d121e] to-[#070b14] border-amber-500/50 hover:border-amber-400/80 shadow-amber-500/10'
                                : isSemi
                                ? 'bg-gradient-to-r from-[#170e24] via-[#0d121e] to-[#070b14] border-purple-500/40 hover:border-purple-400 shadow-purple-500/5'
                                : isQuarter
                                ? 'bg-gradient-to-r from-[#0a1526] via-[#0d121e] to-[#070b14] border-sky-500/35 hover:border-sky-400 shadow-sky-500/5'
                                : 'bg-gradient-to-r from-[#0c101c] via-[#0b0e18] to-[#070b14] border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {/* Grand Final Ambient Background Accent */}
                            {isGrandFinal && (
                              <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                            )}

                            {/* Top Stage & Status Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Chronology Step Badge */}
                                <span
                                  className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 ${
                                    isGrandFinal
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                                      : isSemi
                                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                      : isQuarter
                                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                      : 'bg-slate-800/80 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {isGrandFinal ? (
                                    <>
                                      <Crown className="w-3 h-3 text-amber-400" />
                                      <span>ФИНАЛ (#{idx + 1} ПОСЛЕДНИЙ)</span>
                                    </>
                                  ) : isSemi ? (
                                    <>
                                      <Flame className="w-3 h-3 text-purple-400" />
                                      <span>ПОЛУФИНАЛ (#{idx + 1})</span>
                                    </>
                                  ) : isQuarter ? (
                                    <>
                                      <Swords className="w-3 h-3 text-sky-400" />
                                      <span>ЧЕТВЕРТЬФИНАЛ (#{idx + 1})</span>
                                    </>
                                  ) : (
                                    <span>#{idx + 1}</span>
                                  )}
                                </span>

                                {/* STAGE NAME PROMINENTLY LABELED */}
                                <div
                                  className={`text-xs font-mono font-black uppercase px-3 py-1 rounded-xl border flex items-center gap-1.5 shadow-sm tracking-wide ${
                                    isGrandFinal
                                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-200 border-amber-500/40'
                                      : isSemi
                                      ? 'bg-purple-500/15 text-purple-200 border-purple-500/35'
                                      : isQuarter
                                      ? 'bg-sky-500/15 text-sky-200 border-sky-500/35'
                                      : isSwiss
                                      ? 'bg-indigo-500/15 text-indigo-200 border-indigo-500/35'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {isGrandFinal && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                                  {isSemi && <Flame className="w-3.5 h-3.5 text-purple-400" />}
                                  {isQuarter && <Swords className="w-3.5 h-3.5 text-sky-400" />}
                                  {isSwiss && <Grid className="w-3.5 h-3.5 text-indigo-400" />}
                                  <span>{m.stageName}</span>
                                </div>

                                {/* Format Badge */}
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                                  {m.format}
                                </span>
                              </div>

                              {/* Right: VRS points delta & Victory Pill */}
                              <div className="flex items-center gap-2">
                                {m.deltaPoints !== undefined && (
                                  <span
                                    className={`text-[11px] font-mono font-black px-2.5 py-0.5 rounded-lg border ${
                                      m.deltaPoints >= 0
                                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                    }`}
                                  >
                                    {m.deltaPoints >= 0 ? `+${m.deltaPoints}` : m.deltaPoints} VRS
                                  </span>
                                )}

                                <span
                                  className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                                    isWin
                                      ? isGrandFinal
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  }`}
                                >
                                  {isWin ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span>{isGrandFinal ? 'Чемпионы!' : 'Победа'}</span>
                                    </>
                                  ) : (
                                    <span>Поражение</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Teams & Broadcast Score Clash Row */}
                            <div className="flex items-center justify-between gap-3 pt-2">
                              {/* Left: Current Team */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <TeamLogo team={team} size="md" />
                                <div className="min-w-0 truncate">
                                  <div className="text-sm sm:text-base font-black text-white truncate flex items-center gap-1.5">
                                    <span>{team.name}</span>
                                    {isWin && (
                                      <span className="text-emerald-400 text-xs font-black">✓</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                    {team.region} · <span className="text-amber-400 font-bold">{team.points} VRS</span>
                                  </div>
                                </div>
                              </div>

                              {/* Center: Esports Digital Series Score Box */}
                              <div className="text-center px-4 sm:px-6 py-2 rounded-2xl bg-[#050811] border border-slate-700/80 shrink-0 shadow-inner">
                                <div className="text-lg sm:text-2xl font-black font-mono tracking-widest text-white flex items-center justify-center gap-2">
                                  <span className={isWin ? 'text-amber-400 sm:text-2xl' : 'text-slate-400'}>
                                    {m.scoreA}
                                  </span>
                                  <span className="text-slate-600 text-sm">:</span>
                                  <span className={!isWin ? 'text-amber-400 sm:text-2xl' : 'text-slate-400'}>
                                    {m.scoreB}
                                  </span>
                                </div>
                                <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                                  {m.format === 'BO1' ? 'Раунды MR12' : 'Карты серии'}
                                </div>
                              </div>

                              {/* Right: Opponent Team */}
                              <div className="flex items-center justify-end gap-3 min-w-0 flex-1 text-right">
                                <div className="min-w-0 truncate">
                                  <div className="text-sm sm:text-base font-black text-white truncate flex items-center justify-end gap-1.5">
                                    {!isWin && (
                                      <span className="text-emerald-400 text-xs font-black">✓</span>
                                    )}
                                    <span>{m.opponentName}</span>
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                    {oppTeam?.region || 'CS2'} · <span className="text-slate-300">{m.opponentPoints || oppTeam?.points || 1500} VRS</span>
                                  </div>
                                </div>
                                <TeamLogo
                                  team={oppTeam || {
                                    id: m.opponentId,
                                    name: m.opponentName,
                                    points: m.opponentPoints || 1500,
                                    defaultPoints: 1500,
                                    logoUrl: m.opponentLogo || `/logos/${m.opponentId}.webp`,
                                    primaryColor: '#94a3b8',
                                    secondaryColor: '#141416',
                                    country: '',
                                    region: 'CS2',
                                    rosterSnippet: []
                                  }}
                                  size="md"
                                />
                              </div>
                            </div>

                            {/* Active Duty 7 Maps Breakdown */}
                            {m.mapsPlayed && m.mapsPlayed.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-slate-800/70">
                                <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Сыгранные карты серии ({m.mapsPlayed.length}):</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {m.mapsPlayed.map((mapRes, mapIdx) => {
                                    const teamWonMap = mapRes.winnerTeamId === team.id;
                                    const meta = MAP_METADATA[mapRes.mapName];
                                    return (
                                      <div
                                        key={mapIdx}
                                        className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between transition-colors ${
                                          teamWonMap
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                            : 'bg-slate-900/80 border-slate-800 text-slate-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                            style={{ backgroundColor: meta?.themeColor || '#f59e0b' }}
                                          />
                                          <span className="font-extrabold">{mapRes.mapName}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <span className="font-black text-white">
                                            {mapRes.scoreA} : {mapRes.scoreB}
                                          </span>
                                          {mapRes.overtime && (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                              OT
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Chronological downward connector if not the last item */}
                          {idx < trophyMatches.length - 1 && (
                            <div className="flex items-center justify-center gap-2 py-0.5 text-[10px] font-mono text-slate-500">
                              <div className="h-px bg-slate-800/80 flex-1 max-w-[80px]" />
                              <span className="flex items-center gap-1 text-slate-400">
                                <span>↓ Предыдущий этап</span>
                              </span>
                              <div className="h-px bg-slate-800/80 flex-1 max-w-[80px]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : teamTrophies.length > 0 ? (
                /* TROPHIES LISTING */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Зал славы и чемпионские награды ({teamTrophies.length})
                    </span>
                    <span className="text-amber-400 text-[11px]">
                      Нажмите на турнир для просмотра матчей
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {teamTrophies.map((trophy, idx) => {
                      const isMajor = trophy.tier === 'Major';
                      const isSTier = trophy.tier === 'S-Tier';
                      return (
                        <div
                          key={trophy.id || idx}
                          onClick={() => {
                            soundFx.playClick();
                            setSelectedTrophy(trophy);
                          }}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group hover:scale-[1.01] ${
                            isMajor
                              ? 'bg-gradient-to-br from-purple-950/30 via-slate-900/70 to-slate-900/90 border-purple-500/40 hover:border-purple-400 shadow-lg shadow-purple-500/10'
                              : isSTier
                              ? 'bg-gradient-to-br from-amber-950/25 via-slate-900/70 to-slate-900/90 border-amber-500/30 hover:border-amber-400 shadow-md shadow-amber-500/5'
                              : 'bg-slate-900/50 border-slate-800 hover:border-amber-500/50'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                                isMajor
                                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                  : isSTier
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              <Trophy className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                    isMajor
                                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                      : isSTier
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  {trophy.tier || 'Championship'}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  {trophy.year || 2026}
                                </span>
                              </div>

                              <div className="font-extrabold text-white text-sm mt-1.5 leading-snug group-hover:text-amber-300 transition-colors">
                                {trophy.name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center justify-between gap-2">
                                <span>
                                  {trophy.runnerUpTeamName ? `Финал vs ${trophy.runnerUpTeamName}` : 'Чемпионы турнира'}
                                </span>
                                {trophy.vrsPointsAwarded && (
                                  <span className="text-emerald-400 font-black bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md text-[10px] shrink-0">
                                    +{trophy.vrsPointsAwarded} VRS
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* CTA Prompt */}
                          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-amber-400 font-bold group-hover:text-amber-300 transition-colors">
                            <span>Смотреть матчи турнира</span>
                            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                    <Trophy className="w-7 h-7 text-amber-400/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">У команды пока нет выигранных турниров</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Создайте и запустите турнир во вкладке «Сетка турнира», доведите команду {team.name} до победы в Гранд-финале, и завоеванный кубок навсегда останется в статистике команды с полным списком сыгранных матчей!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              soundFx.playClick();
              onSelectForMatch(team);
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Выбрать для матча</span>
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