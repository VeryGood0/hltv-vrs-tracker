// @ts-nocheck -- imported legacy code written for a looser tsconfig
import React from 'react';
import { TournamentMatch, SwissTeamRecord, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import {
  Play,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Trophy
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { getTeamDestination } from '../utils/tournament';

interface SwissStageViewProps {
  matches: TournamentMatch[];
  records: Record<string, SwissTeamRecord>;
  teams: Team[];
  currentRound?: number;
  onOpenMatch: (match: TournamentMatch) => void;
  onQuickSimulateMatch?: (match: TournamentMatch) => void;
  onSelectManualSlot?: (matchId: string, slot: 'A' | 'B') => void;
  onSwapMatchTeams?: (matchId: string) => void;
  onResetDefaultPairs?: () => void;
  onOpenPairsEditor?: () => void;
  onAdvanceToPlayoffs?: () => void;
  onToggleMatchFormat?: (matchId: string) => void;
  nextStageName?: string;
}

export const SwissStageView: React.FC<SwissStageViewProps> = ({
  matches,
  records,
  teams,
  currentRound = 1,
  onOpenMatch,
  onQuickSimulateMatch,
  onSelectManualSlot,
  onSwapMatchTeams,
  onResetDefaultPairs,
  onOpenPairsEditor,
  onAdvanceToPlayoffs,
  onToggleMatchFormat,
  nextStageName = 'плей-офф'
}) => {
  const getTeam = (id?: string) => teams.find((t) => t.id === id);

  // Group matches by pool key
  const r0_0 = matches.filter((m) => m.poolKey === '0:0');
  const r1_0 = matches.filter((m) => m.poolKey === '1:0');
  const r0_1 = matches.filter((m) => m.poolKey === '0:1');
  const r2_0 = matches.filter((m) => m.poolKey === '2:0');
  const r1_1 = matches.filter((m) => m.poolKey === '1:1');
  const r0_2 = matches.filter((m) => m.poolKey === '0:2');
  const r2_1 = matches.filter((m) => m.poolKey === '2:1');
  const r1_2 = matches.filter((m) => m.poolKey === '1:2');
  const r2_2 = matches.filter((m) => m.poolKey === '2:2');

  // Group qualified and eliminated teams
  const qualified3_0 = Object.values(records).filter((r) => r.qualifiedScore === '3:0');
  const qualified3_1 = Object.values(records).filter((r) => r.qualifiedScore === '3:1');
  const qualified3_2 = Object.values(records).filter((r) => r.qualifiedScore === '3:2');
  const totalQualified = qualified3_0.length + qualified3_1.length + qualified3_2.length;

  const eliminated0_3 = Object.values(records).filter((r) => r.eliminatedScore === '0:3');
  const eliminated1_3 = Object.values(records).filter((r) => r.eliminatedScore === '1:3');
  const eliminated2_3 = Object.values(records).filter((r) => r.eliminatedScore === '2:3');
  const totalEliminated = eliminated0_3.length + eliminated1_3.length + eliminated2_3.length;

  // Round completion stats
  const r1Finished = r0_0.filter((m) => m.status === 'finished').length;
  const r2Matches = [...r1_0, ...r0_1];
  const r2Finished = r2Matches.filter((m) => m.status === 'finished').length;
  const r3Matches = [...r2_0, ...r1_1, ...r0_2];
  const r3Finished = r3Matches.filter((m) => m.status === 'finished').length;
  const r4Matches = [...r2_1, ...r1_2];
  const r4Finished = r4Matches.filter((m) => m.status === 'finished').length;

  // Live incoming teams into pools before official round pair generation:
  // From R1 finished matches:
  const pending1_0Teams = r0_0
    .filter((m) => m.status === 'finished')
    .map((m) => m.winnerId)
    .filter(Boolean)
    .map(getTeam);
  const pending0_1Teams = r0_0
    .filter((m) => m.status === 'finished')
    .map((m) => m.loserId)
    .filter(Boolean)
    .map(getTeam);

  // From R2 finished matches:
  const pending2_0Teams = r1_0
    .filter((m) => m.status === 'finished')
    .map((m) => m.winnerId)
    .filter(Boolean)
    .map(getTeam);
  const pending1_1Teams = [
    ...r1_0.filter((m) => m.status === 'finished').map((m) => m.loserId),
    ...r0_1.filter((m) => m.status === 'finished').map((m) => m.winnerId)
  ]
    .filter(Boolean)
    .map(getTeam);
  const pending0_2Teams = r0_1
    .filter((m) => m.status === 'finished')
    .map((m) => m.loserId)
    .filter(Boolean)
    .map(getTeam);

  // Match Card Component
  const renderMatchCard = (match: TournamentMatch) => {
    const teamA = getTeam(match.teamAId);
    const teamB = getTeam(match.teamBId);
    const isFinished = match.status === 'finished';
    const isReady = match.status === 'ready' && !!match.teamAId && !!match.teamBId;

    const destA = isFinished ? getTeamDestination(match.poolKey, match.winnerId === teamA?.id) : null;
    const destB = isFinished ? getTeamDestination(match.poolKey, match.winnerId === teamB?.id) : null;

    return (
      <div
        key={match.id}
        onClick={() => {
          if (match.teamAId && match.teamBId) {
            soundFx.playClick();
            onOpenMatch(match);
          }
        }}
        className={`w-44 p-2.5 rounded-2xl border transition-all select-none cursor-pointer group shadow-md ${
          isFinished
            ? 'bg-[#111726]/95 border-slate-800 hover:border-slate-700'
            : isReady
            ? 'bg-[#121a2e] border-amber-500/50 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10'
            : 'bg-[#0d121c]/70 border-slate-800/60 opacity-60'
        }`}
      >
        {/* Match Header / Format */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pb-1 mb-1 border-b border-slate-800/60">
          {!isFinished && onToggleMatchFormat ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMatchFormat(match.id);
              }}
              className="px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black font-extrabold text-[10px] border border-amber-500/30 hover:border-amber-400 transition-colors cursor-pointer"
              title="Нажмите, чтобы изменить формат матча: BO1 / BO3 / BO5"
            >
              {match.format}
            </button>
          ) : (
            <span className="font-semibold text-slate-400">{match.format}</span>
          )}
          {!isFinished && onSwapMatchTeams && match.teamAId && match.teamBId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwapMatchTeams(match.id);
              }}
              className="flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
              title="Поменять команды местами (A ↔ B)"
            >
              <ArrowLeftRight className="w-2.5 h-2.5" />
              <span className="text-[9px]">свап</span>
            </button>
          )}
          {isFinished && (
            <span className="text-emerald-400 flex items-center gap-0.5 text-[9px] font-bold">
              <CheckCircle2 className="w-2.5 h-2.5" /> Завершён
            </span>
          )}
        </div>

        {/* Teams and Score Grid */}
        <div className="space-y-1.5">
          {/* Team A */}
          <div
            onClick={(e) => {
              if (onSelectManualSlot && !isFinished) {
                e.stopPropagation();
                onSelectManualSlot(match.id, 'A');
              }
            }}
            className={`flex items-center justify-between gap-1 p-1 rounded-lg transition-colors ${
              onSelectManualSlot && !isFinished ? 'hover:bg-slate-800/80 cursor-pointer' : ''
            } ${
              isFinished && match.winnerId === teamA?.id
                ? 'bg-emerald-950/20 text-emerald-400 font-bold'
                : isFinished
                ? 'text-slate-500 opacity-80'
                : 'text-white'
            }`}
            title={onSelectManualSlot && !isFinished ? 'Нажмите, чтобы сменить команду' : undefined}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <TeamLogo team={teamA} size="xs" />
              <span className="font-mono text-[11px] truncate font-bold" title={teamA?.name}>
                {teamA ? (teamA.name.length > 12 && teamA.shortName ? teamA.shortName : teamA.name) : 'TBD (Выбрать)'}
              </span>
            </div>

            <div className="shrink-0 font-mono text-[11px] font-bold tabular-nums">
              {isFinished ? (
                <span className={match.winnerId === teamA?.id ? 'text-amber-400' : 'text-slate-400'}>
                  {match.scoreA}
                </span>
              ) : (
                <span className="text-[10px] text-slate-600 group-hover:text-amber-400 transition-colors">
                  {onSelectManualSlot && !isFinished ? 'изм.' : '—'}
                </span>
              )}
            </div>
          </div>

          {/* Team B */}
          <div
            onClick={(e) => {
              if (onSelectManualSlot && !isFinished) {
                e.stopPropagation();
                onSelectManualSlot(match.id, 'B');
              }
            }}
            className={`flex items-center justify-between gap-1 p-1 rounded-lg transition-colors ${
              onSelectManualSlot && !isFinished ? 'hover:bg-slate-800/80 cursor-pointer' : ''
            } ${
              isFinished && match.winnerId === teamB?.id
                ? 'bg-emerald-950/20 text-emerald-400 font-bold'
                : isFinished
                ? 'text-slate-500 opacity-80'
                : 'text-white'
            }`}
            title={onSelectManualSlot && !isFinished ? 'Нажмите, чтобы сменить команду' : undefined}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <TeamLogo team={teamB} size="xs" />
              <span className="font-mono text-[11px] truncate font-bold" title={teamB?.name}>
                {teamB ? (teamB.name.length > 12 && teamB.shortName ? teamB.shortName : teamB.name) : 'TBD (Выбрать)'}
              </span>
            </div>

            <div className="shrink-0 font-mono text-[11px] font-bold tabular-nums">
              {isFinished ? (
                <span className={match.winnerId === teamB?.id ? 'text-amber-400' : 'text-slate-400'}>
                  {match.scoreB}
                </span>
              ) : (
                <span className="text-[10px] text-slate-600 group-hover:text-amber-400 transition-colors">
                  {onSelectManualSlot && !isFinished ? 'изм.' : '—'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Destinations for Winner and Loser */}
        {isFinished && destA && destB && (
          <div className="mt-2 pt-1.5 border-t border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
              <span
                className={`px-1.5 py-0.5 rounded truncate max-w-[84px] font-bold ${destA.badgeClass}`}
                title={`${teamA?.name}: ${destA.label}`}
              >
                {destA.label}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded truncate max-w-[84px] font-bold ${destB.badgeClass}`}
                title={`${teamB?.name}: ${destB.label}`}
              >
                {destB.label}
              </span>
            </div>

            {/* VRS Points & Form Delta if recorded */}
            {match.deltaPointsA !== undefined && match.deltaPointsB !== undefined && (
              <div className="flex items-center justify-between text-[9px] font-mono px-0.5">
                <span className={match.deltaPointsA >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {match.deltaPointsA > 0 ? `+${match.deltaPointsA}` : match.deltaPointsA} VRS
                </span>
                <span className={match.deltaPointsB >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {match.deltaPointsB > 0 ? `+${match.deltaPointsB}` : match.deltaPointsB} VRS
                </span>
              </div>
            )}

            {/* Played Maps Badges */}
            {match.mapsPlayed && match.mapsPlayed.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/60">
                {match.mapsPlayed.map((mp, idx) => (
                  <span
                    key={idx}
                    className="text-[8px] font-mono px-1 py-0.5 rounded bg-slate-900 border border-slate-800/80 text-slate-300"
                    title={`${mp.mapName}: ${mp.scoreA}:${mp.scoreB} ${mp.overtime ? '(OT)' : ''}`}
                  >
                    {mp.mapName.slice(0, 3)} {mp.scoreA}:{mp.scoreB}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unfinished Action Footer */}
        {isReady && !isFinished && (
          <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
            <span className="text-amber-400 flex items-center gap-0.5 group-hover:underline">
              <Play className="w-2.5 h-2.5 fill-amber-400" /> Симуляция
            </span>

            {onQuickSimulateMatch && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickSimulateMatch(match);
                }}
                className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black text-[9px] font-bold transition-colors cursor-pointer"
                title="Быстро сыграть этот матч"
              >
                быстро
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper to render pending pools status card
  const renderPendingPoolCard = (
    poolName: string,
    targetCount: number,
    teamsInPool: (Team | undefined)[],
    waitMsg: string
  ) => {
    return (
      <div className="p-3 border border-dashed border-slate-800/80 rounded-2xl bg-[#0b0f19]/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="font-bold text-slate-300">{poolName}</span>
          <span className="text-amber-400 font-bold">
            {teamsInPool.length} / {targetCount}
          </span>
        </div>

        {teamsInPool.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {teamsInPool.map((t) => (
              <span
                key={t?.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 text-white text-[10px] font-mono border border-slate-700/60"
              >
                <TeamLogo team={t} size="xs" />
                <span className="truncate max-w-[65px]">{t?.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[10px] font-mono text-slate-500 italic">
            Команды формируются по ходу матчей
          </div>
        )}

        <div className="text-[9px] font-mono text-slate-500 border-t border-slate-800/60 pt-1">
          {waitMsg}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Swiss Finished Notification Banner */}
      {totalQualified === 8 && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/20 via-[#101926] to-amber-500/20 border border-emerald-500/50 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-bold text-white">
                Швейцарская система завершена! 8 команд прошли в {nextStageName}
              </div>
              <div className="text-xs font-mono text-slate-300 mt-0.5">
                Пары сформированы по счёту команд в швейцарской системе, без повторных встреч в рамках этой стадии.
              </div>
            </div>
          </div>

          {onAdvanceToPlayoffs && (
            <button
              onClick={onAdvanceToPlayoffs}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              <span>Перейти дальше: {nextStageName}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Main Swiss Grid Container */}
      <div className="w-full overflow-x-auto pb-6">
        <div className="min-w-[980px] p-6 bg-[#090d15] border border-slate-800 rounded-3xl shadow-2xl relative">
          {/* Grid Columns for 5 Swiss Rounds Matching Photo 1 */}
          <div className="grid grid-cols-5 gap-6">
            {/* COLUMN 1: Round 1 (0:0) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="font-mono font-bold text-sm text-slate-200">
                    0:0
                  </span>
                  <div className="text-[10px] font-mono text-slate-500">
                    Раунд 1 · 8 матчей
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onResetDefaultPairs && (
                    <button
                      onClick={onResetDefaultPairs}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
                      title="Сбросить пары раунда 1 к стандартному посеву по VRS"
                    >
                      <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                      <span>По дефолту</span>
                    </button>
                  )}
                  {onOpenPairsEditor && (
                    <button
                      onClick={onOpenPairsEditor}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black text-[10px] font-mono font-bold transition-colors cursor-pointer"
                      title="Настроить свои пары команд"
                    >
                      <SlidersHorizontal className="w-2.5 h-2.5" />
                      <span>Пары</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">{r0_0.map(renderMatchCard)}</div>
            </div>

            {/* COLUMN 2: Round 2 (1:0 & 0:1) */}
            <div className="space-y-6">
              {/* 1:0 Pool */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    1:0
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    4 матча (BO1)
                  </span>
                </div>
                {r1_0.length > 0 ? (
                  r1_0.map(renderMatchCard)
                ) : (
                  renderPendingPoolCard(
                    'Пул 1:0',
                    4,
                    pending1_0Teams,
                    r1Finished === 8
                      ? 'Генерация пар...'
                      : `Ожидание раунда 1 (сыграно ${r1Finished}/8)`
                  )
                )}
              </div>

              {/* 0:1 Pool */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-mono font-bold text-sm text-rose-400">
                    0:1
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    4 матча (BO1)
                  </span>
                </div>
                {r0_1.length > 0 ? (
                  r0_1.map(renderMatchCard)
                ) : (
                  renderPendingPoolCard(
                    'Пул 0:1',
                    4,
                    pending0_1Teams,
                    r1Finished === 8
                      ? 'Генерация пар...'
                      : `Ожидание раунда 1 (сыграно ${r1Finished}/8)`
                  )
                )}
              </div>
            </div>

            {/* COLUMN 3: Round 3 (2:0, 1:1, 0:2) */}
            <div className="space-y-6">
              {/* 2:0 Pool (Decider for 3:0) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    2:0
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500/80 font-bold">
                    За выход 3:0 (BO3)
                  </span>
                </div>
                {r2_0.length > 0 ? (
                  r2_0.map(renderMatchCard)
                ) : (
                  renderPendingPoolCard(
                    'Пул 2:0',
                    2,
                    pending2_0Teams,
                    'Ожидание завершения раунда 2'
                  )
                )}
              </div>

              {/* 1:1 Pool */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-mono font-bold text-sm text-slate-300">
                    1:1
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    4 матча (BO1)
                  </span>
                </div>
                {r1_1.length > 0 ? (
                  r1_1.map(renderMatchCard)
                ) : (
                  renderPendingPoolCard(
                    'Пул 1:1',
                    4,
                    pending1_1Teams,
                    'Ожидание завершения раунда 2'
                  )
                )}
              </div>

              {/* 0:2 Pool (Elimination for 0:3) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-mono font-bold text-sm text-rose-400">
                    0:2
                  </span>
                  <span className="text-[10px] font-mono text-rose-500/80 font-bold">
                    На вылет 0:3 (BO3)
                  </span>
                </div>
                {r0_2.length > 0 ? (
                  r0_2.map(renderMatchCard)
                ) : (
                  renderPendingPoolCard(
                    'Пул 0:2',
                    2,
                    pending0_2Teams,
                    'Ожидание завершения раунда 2'
                  )
                )}
              </div>
            </div>

            {/* COLUMN 4: Round 4 (2:1, 1:2) */}
            <div className="space-y-6">
              {/* 2:1 Pool (Decider for 3:1) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    2:1
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500/80 font-bold">
                    За выход 3:1 (BO3)
                  </span>
                </div>
                {r2_1.length > 0 ? (
                  r2_1.map(renderMatchCard)
                ) : (
                  <div className="p-3 border border-dashed border-slate-800/80 rounded-xl text-center text-[11px] font-mono text-slate-600">
                    Ожидание раунда 3
                  </div>
                )}
              </div>

              {/* 1:2 Pool (Elimination for 1:3) */}
              <div className="space-y-2.5 pt-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-mono font-bold text-sm text-rose-400">
                    1:2
                  </span>
                  <span className="text-[10px] font-mono text-rose-500/80 font-bold">
                    На вылет 1:3 (BO3)
                  </span>
                </div>
                {r1_2.length > 0 ? (
                  r1_2.map(renderMatchCard)
                ) : (
                  <div className="p-3 border border-dashed border-slate-800/80 rounded-xl text-center text-[11px] font-mono text-slate-600">
                    Ожидание раунда 3
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 5: Round 5 (2:2 Deciders) & Status Badges */}
            <div className="space-y-6">
              {/* 2:2 Decider Matches */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-mono font-bold text-sm text-amber-400">
                    2:2
                  </span>
                  <span className="text-[10px] font-mono text-amber-400/80 font-bold">
                    Финал 3:2 / 2:3 (BO3)
                  </span>
                </div>
                {r2_2.length > 0 ? (
                  r2_2.map(renderMatchCard)
                ) : (
                  <div className="p-3 border border-dashed border-slate-800/80 rounded-xl text-center text-[11px] font-mono text-slate-600">
                    Ожидание раунда 4
                  </div>
                )}
              </div>

              {/* TOP RIGHT: Qualified Teams Box (Matches Green Box in Photo 1) */}
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> В плей-офф
                  </span>
                  <span className="text-[11px] text-emerald-300 font-black">
                    {totalQualified} / 8
                  </span>
                </div>

                {/* 3:0 Pool */}
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 font-semibold mb-1 flex items-center justify-between">
                    <span>Счёт 3:0 (2 команды)</span>
                    <span className="text-[9px] text-emerald-500/70">Top Seed</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {qualified3_0.map((r) => {
                      const t = getTeam(r.teamId);
                      return (
                        <div
                          key={r.teamId}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-900/40 border border-emerald-500/40 rounded-lg text-[11px] font-mono font-bold text-white shadow-sm"
                          title={t?.name}
                        >
                          <TeamLogo team={t} size="xs" />
                          <span>{t?.name}</span>
                        </div>
                      );
                    })}
                    {qualified3_0.length === 0 && (
                      <span className="text-[10px] font-mono text-slate-600">—</span>
                    )}
                  </div>
                </div>

                {/* 3:1 Pool */}
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 font-semibold mb-1 flex items-center justify-between">
                    <span>Счёт 3:1 (3 команды)</span>
                    <span className="text-[9px] text-emerald-500/70">Mid Seed</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {qualified3_1.map((r) => {
                      const t = getTeam(r.teamId);
                      return (
                        <div
                          key={r.teamId}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-900/40 border border-emerald-500/40 rounded-lg text-[11px] font-mono font-bold text-white shadow-sm"
                          title={t?.name}
                        >
                          <TeamLogo team={t} size="xs" />
                          <span>{t?.name}</span>
                        </div>
                      );
                    })}
                    {qualified3_1.length === 0 && (
                      <span className="text-[10px] font-mono text-slate-600">—</span>
                    )}
                  </div>
                </div>

                {/* 3:2 Pool */}
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 font-semibold mb-1 flex items-center justify-between">
                    <span>Счёт 3:2 (3 команды)</span>
                    <span className="text-[9px] text-emerald-500/70">Low Seed</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {qualified3_2.map((r) => {
                      const t = getTeam(r.teamId);
                      return (
                        <div
                          key={r.teamId}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-900/40 border border-emerald-500/40 rounded-lg text-[11px] font-mono font-bold text-white shadow-sm"
                          title={t?.name}
                        >
                          <TeamLogo team={t} size="xs" />
                          <span>{t?.name}</span>
                        </div>
                      );
                    })}
                    {qualified3_2.length === 0 && (
                      <span className="text-[10px] font-mono text-slate-600">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTTOM RIGHT: Eliminated Teams Box (Matches Red Box in Photo 1) */}
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Выбыли
                  </span>
                  <span className="text-[11px] text-rose-300 font-black">
                    {totalEliminated} / 8
                  </span>
                </div>

                {/* 0:3 Pool */}
                <div>
                  <div className="text-[10px] font-mono text-rose-400 font-semibold mb-1">
                    Счёт 0:3 (2 команды)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {eliminated0_3.map((r) => {
                      const t = getTeam(r.teamId);
                      return (
                        <div
                          key={r.teamId}
                          className="flex items-center gap-1 px-2 py-1 bg-rose-900/40 border border-rose-500/40 rounded-lg text-[11px] font-mono font-bold text-slate-300"
                          title={t?.name}
                        >
                          <TeamLogo team={t} size="xs" />
                          <span>{t?.name}</span>
                        </div>
                      );
                    })}
                    {eliminated0_3.length === 0 && (
                      <span className="text-[10px] font-mono text-slate-600">—</span>
                    )}
                  </div>
                </div>

                {/* 1:3 Pool */}
                <div>
                  <div className="text-[10px] font-mono text-rose-400 font-semibold mb-1">
                    Счёт 1:3 (3 команды)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {eliminated1_3.map((r) => {
                      const t = getTeam(r.teamId);
                      return (
                        <div
                          key={r.teamId}
                          className="flex items-center gap-1 px-2 py-1 bg-rose-900/40 border border-rose-500/40 rounded-lg text-[11px] font-mono font-bold text-slate-300"
                          title={t?.name}
                        >
                          <TeamLogo team={t} size="xs" />
                          <span>{t?.name}</span>
                        </div>
                      );
                    })}
                    {eliminated1_3.length === 0 && (
                      <span className="text-[10px] font-mono text-slate-600">—</span>
                    )}
                  </div>
                </div>

                {/* 2:3 Pool */}
                <div>
                  <div className="text-[10px] font-mono text-rose-400 font-semibold mb-1">
                    Счёт 2:3 (3 команды)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {eliminated2_3.map((r) => {
                      const t = getTeam(r.teamId);
                      return (
                        <div
                          key={r.teamId}
                          className="flex items-center gap-1 px-2 py-1 bg-rose-900/40 border border-rose-500/40 rounded-lg text-[11px] font-mono font-bold text-slate-300"
                          title={t?.name}
                        >
                          <TeamLogo team={t} size="xs" />
                          <span>{t?.name}</span>
                        </div>
                      );
                    })}
                    {eliminated2_3.length === 0 && (
                      <span className="text-[10px] font-mono text-slate-600">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
