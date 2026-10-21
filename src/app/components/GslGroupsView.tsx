// @ts-nocheck -- loose typing of imported simulator code
import React, { useState } from 'react';
import { TournamentMatch, TournamentGroup, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { GroupPairsModal } from './GroupPairsModal';
import {
  Trophy,
  Play,
  CheckCircle2,
  XCircle,
  GitBranch,
  Flame,
  Award,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  ArrowLeftRight
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface GslGroupsViewProps {
  groups: TournamentGroup[];
  teams: Team[];
  onOpenMatch: (match: TournamentMatch) => void;
  onQuickSimulateMatch?: (match: TournamentMatch) => void;
  onAdvanceToPlayoffs?: () => void;
  onToggleMatchFormat?: (matchId: string) => void;
  onUpdateGroupMatches?: (groupId: string, matches: TournamentMatch[]) => void;
}

export const GslGroupsView: React.FC<GslGroupsViewProps> = ({
  groups,
  teams,
  onOpenMatch,
  onQuickSimulateMatch,
  onAdvanceToPlayoffs,
  onToggleMatchFormat,
  onUpdateGroupMatches
}) => {
  const [editingGroup, setEditingGroup] = useState<TournamentGroup | null>(null);
  const [selectedGroupLetter, setSelectedGroupLetter] = useState('A');
  const getTeam = (id?: string) => teams.find((t) => t.id === id);

  // Check if all groups have determined their 2 playoff qualifiers
  const requiredQualifiers = (group: TournamentGroup) =>
    group.groupStyle === 'gsl_top3' || group.teamIds.length >= 8 ? 3 : 2;
  const allGroupsComplete =
    groups.length > 0 &&
    groups.every((g) => g.qualifiedTeamIds && g.qualifiedTeamIds.length >= requiredQualifiers(g));

  const renderGslMatchCard = (
    match?: TournamentMatch,
    stageTitle?: string,
    isDeciderOrWinners?: boolean,
    allowFormatToggle = true
  ) => {
    if (!match) return null;

    const teamA = getTeam(match.teamAId);
    const teamB = getTeam(match.teamBId);
    const isFinished = match.status === 'finished';
    const isReady = match.status === 'ready' && !!match.teamAId && !!match.teamBId;

    return (
      <div
        onClick={() => {
          if (isReady || isFinished) {
            soundFx.playClick();
            onOpenMatch(match);
          }
        }}
        className={`w-full max-w-[280px] rounded-2xl border transition-all overflow-hidden select-none cursor-pointer group shadow-md ${
          isFinished
            ? 'bg-[#111726]/95 border-slate-800 hover:border-slate-700'
            : isReady
            ? isDeciderOrWinners
              ? 'bg-[#161f36] border-amber-500/60 hover:border-amber-400 hover:shadow-amber-500/10 ring-1 ring-amber-500/20'
              : 'bg-[#131c31] border-blue-500/50 hover:border-blue-400 hover:shadow-blue-500/10'
            : 'bg-[#0c101c]/80 border-slate-800/80 opacity-75'
        }`}
      >
        {/* Header Bar */}
        <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="font-semibold text-slate-300 truncate max-w-[170px]">
            {stageTitle || match.name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {!isFinished && onToggleMatchFormat && allowFormatToggle ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMatchFormat(match.id);
                }}
                className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-extrabold text-[10px] border border-amber-500/40 hover:border-amber-400 transition-colors cursor-pointer"
                title="Нажмите, чтобы изменить формат матча"
              >
                {match.format}
              </button>
            ) : (
              <span className="font-bold text-slate-400 text-[10px]">{match.format}</span>
            )}
          </div>
        </div>

        {/* Teams Slots */}
        <div className="divide-y divide-slate-800/60 text-xs font-mono">
          {/* Team A */}
          <div
            className={`px-3 py-2 flex items-center justify-between gap-2 ${
              isFinished && match.winnerId === teamA?.id
                ? 'bg-emerald-950/30 text-emerald-300 font-bold'
                : isFinished
                ? 'text-slate-500 opacity-60'
                : 'text-white'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {teamA ? (
                <TeamLogo team={teamA} size="xs" />
              ) : (
                <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-500">
                  ?
                </span>
              )}
              <span className="truncate" title={teamA?.name}>
                {teamA ? (teamA.name.length > 14 && teamA.shortName ? teamA.shortName : teamA.name) : 'TBD'}
              </span>
            </div>
            <span className="font-bold text-sm tabular-nums shrink-0">
              {isFinished ? match.scoreA : '—'}
            </span>
          </div>

          {/* Team B */}
          <div
            className={`px-3 py-2 flex items-center justify-between gap-2 ${
              isFinished && match.winnerId === teamB?.id
                ? 'bg-emerald-950/30 text-emerald-300 font-bold'
                : isFinished
                ? 'text-slate-500 opacity-60'
                : 'text-white'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {teamB ? (
                <TeamLogo team={teamB} size="xs" />
              ) : (
                <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-500">
                  ?
                </span>
              )}
              <span className="truncate" title={teamB?.name}>
                {teamB ? (teamB.name.length > 14 && teamB.shortName ? teamB.shortName : teamB.name) : 'TBD'}
              </span>
            </div>
            <span className="font-bold text-sm tabular-nums shrink-0">
              {isFinished ? match.scoreB : '—'}
            </span>
          </div>
        </div>

        {/* Action Bottom Bar */}
        {isReady && !isFinished && (
          <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
              <Play className="w-3 h-3 fill-amber-400" />
              Готов к игре
            </span>
            {onQuickSimulateMatch && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickSimulateMatch(match);
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Быстро
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Notification / Progression Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {groups.some((g) => g.groupStyle === 'gsl_top3')
                ? 'Групповой этап · GSL: 3 команды проходят'
                : groups.some((g) => g.teamIds.length >= 8)
                  ? 'Групповой этап · GSL на 8 команд: верхняя и нижняя сетки'
                  : 'Групповой этап · GSL: 2 места в плей-офф'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {groups.some((g) => g.groupStyle === 'gsl_top3')
              ? 'В группе 4 команды: победитель Upper Final сразу выходит в полуфинал, команды со 2-го и 3-го мест играют четвертьфиналы, 4-е место выбывает.'
              : groups.some((g) => g.teamIds.length >= 8)
                ? 'В группе 8 команд действует Double Elimination: поражение отправляет в нижнюю сетку, второе поражение означает вылет. В плей-офф выходят 3 команды из группы.'
                : 'В группе 4 команды: победитель Winners’ Match сразу занимает 1-е место. Проигравший играет Decider с победителем Elimination Match за 2-е место. В плей-офф выходят две команды из каждой группы.'}
          </p>
        </div>

        {allGroupsComplete && onAdvanceToPlayoffs && (
          <button
            onClick={() => {
              soundFx.playVictory();
              onAdvanceToPlayoffs();
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer animate-pulse transition-all"
          >
            <span>Сетка плей-офф сформирована · Перейти к плей-офф</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Switch between groups so each bracket has enough horizontal room. */}
      {groups.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-[#0b0f19] p-2" role="tablist" aria-label="Выбор группы">
          {groups.map((group) => {
            const letter = group.letter || group.name.replace('Группа ', '').trim();
            const isSelected = letter === (groups.some((g) => (g.letter || g.name.replace('Группа ', '').trim()) === selectedGroupLetter) ? selectedGroupLetter : (groups[0]?.letter || 'A'));
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => { soundFx.playClick(); setSelectedGroupLetter(letter); }}
                className={`rounded-xl px-4 py-2 text-xs font-mono font-extrabold transition-colors cursor-pointer ${isSelected ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}
              >
                Группа {letter}
              </button>
            );
          })}
        </div>
      )}

      {/* A single horizontally progressing bracket is shown at a time. */}
      <div className="grid grid-cols-1 gap-6">
        {groups.filter((group) => {
          const letter = group.letter || group.name.replace('Группа ', '').trim();
          const activeLetter = groups.some((g) => (g.letter || g.name.replace('Группа ', '').trim()) === selectedGroupLetter) ? selectedGroupLetter : (groups[0]?.letter || 'A');
          return groups.length <= 1 || letter === activeLetter;
        }).map((group) => {
          const gLetter = group.letter || group.name.replace('Группа ', '').trim();
          const m1 = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_opening1`);
          const m2 = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_opening2`);
          const winners = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_winners`);
          const elim = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_elim`);
          const decider = group.matches.find((m) => m.poolKey === `gsl_${gLetter}_decider`);

          const q1 = getTeam(group.qualifiedTeamIds?.[0]);
          const q2 = getTeam(group.qualifiedTeamIds?.[1]);
          const getGslMatch = (key: string) => group.matches.find((m) => m.poolKey === `gsl_${gLetter}_${key}`);
          const upperOpening = [1, 2, 3, 4].map((n) => getGslMatch(`u1_${n}`)).filter(Boolean) as TournamentMatch[];
          const upperSemis = [getGslMatch('u2_1'), getGslMatch('u2_2')].filter(Boolean) as TournamentMatch[];
          const lowerRound1 = [getGslMatch('l1_1'), getGslMatch('l1_2')].filter(Boolean) as TournamentMatch[];
          const lowerSemis = [getGslMatch('l2_1'), getGslMatch('l2_2')].filter(Boolean) as TournamentMatch[];
          const upperFinal = getGslMatch('uf');
          const lowerFinal = getGslMatch('ls');
          const requiredPlaces = requiredQualifiers(group);
          const directlySeededMatches = group.matches.filter((match) =>
            !!match.teamAId && !!match.teamBId && !match.sourceA && !match.sourceB &&
            match.poolKey !== 'third_place' && !match.poolKey.startsWith('lb_')
          );
          const firstDirectRound = directlySeededMatches.length
            ? Math.min(...directlySeededMatches.map((match) => match.roundNumber))
            : -1;
          const openingPairMatches = directlySeededMatches.filter((match) => match.roundNumber === firstDirectRound);
          const canEditOpeningPairs = openingPairMatches.length > 0 && openingPairMatches.every((match) => match.status !== 'finished') &&
            (group.groupStyle !== 'round_robin' || group.matches.every((match) => match.status !== 'finished'));

          return (
            <div
              key={group.id}
              className="p-5 sm:p-6 rounded-3xl bg-[#0b0f19] border border-slate-800 shadow-xl space-y-6"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 font-mono font-black flex items-center justify-center text-sm border border-amber-500/30">
                    {gLetter}
                  </span>
                  <h4 className="text-base font-extrabold text-white tracking-wide">
                    {group.name}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {onUpdateGroupMatches && canEditOpeningPairs && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFx.playClick();
                        setEditingGroup(group);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Выбрать пары команд для этой группы"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Выбрать пары</span>
                    </button>
                  )}
                  <div className="text-[11px] font-mono text-slate-400">
                    {group.qualifiedTeamIds?.length >= requiredPlaces ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Группа завершена
                      </span>
                    ) : (
                      <span>{group.teamIds.length} команд · {requiredPlaces} слота</span>
                    )}
                  </div>
                </div>
              </div>

              {group.teamIds.length >= 8 && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-800 bg-[#080c14] p-4 sm:p-5">
                    <div className="overflow-x-auto pb-2">
                      <div className="min-w-[900px]">
                        <div className="mb-4 grid grid-cols-3 gap-8 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          <div>Opening round</div><div>Upper semi-finals</div><div>Upper final</div>
                        </div>
                        <div className="relative">
                        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full text-slate-600/70" viewBox="0 0 1000 622" preserveAspectRatio="none" aria-hidden="true">
                          <g fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M310 74 H335 V153 H345 M310 230 H335 V153 M310 386 H335 V464 H345 M310 542 H335 V464" />
                            <path d="M655 153 H675 V308 H690 M655 464 H675 V308" />
                          </g>
                        </svg>
                        <div className="relative z-10 grid grid-cols-[repeat(3,minmax(250px,1fr))] grid-rows-[repeat(4,148px)] gap-x-8 gap-y-2">
                          {upperOpening.map((match, index) => (
                            <div key={match.id} className="flex min-w-0 items-center" style={{ gridColumn: 1, gridRow: index + 1 }}>
                              {renderGslMatchCard(match, `Opening round · Match ${index + 1}`)}
                            </div>
                          ))}
                          {upperSemis.map((match, index) => (
                            <div key={match.id} className="flex min-w-0 items-center" style={{ gridColumn: 2, gridRow: `${index * 2 + 1} / span 2` }}>
                              {renderGslMatchCard(match, `Upper semi-final ${index + 1}`)}
                            </div>
                          ))}
                          {upperFinal && (
                            <div className="flex min-w-0 items-center" style={{ gridColumn: 3, gridRow: '2 / span 2' }}>
                              {renderGslMatchCard(upperFinal, 'Upper final · 1st / 2nd place', true)}
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500">Победитель Upper final занимает 1-е место, проигравший — 2-е место. Обе команды сразу проходят в плей-офф.</div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#080c14] p-4 sm:p-5">
                    <div className="overflow-x-auto pb-2">
                      <div className="min-w-[900px]">
                        <div className="mb-4 grid grid-cols-3 gap-8 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          <div>Lower round 1</div><div>Lower semi-finals</div><div>Lower final</div>
                        </div>
                        <div className="relative">
                        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full text-slate-600/70" viewBox="0 0 1000 622" preserveAspectRatio="none" aria-hidden="true">
                          <g fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M310 153 H345 M310 464 H345" />
                            <path d="M655 153 H675 V308 H690 M655 464 H675 V308" />
                          </g>
                        </svg>
                        <div className="relative z-10 grid grid-cols-[repeat(3,minmax(250px,1fr))] grid-rows-[repeat(4,148px)] gap-x-8 gap-y-2">
                          {lowerRound1.map((match, index) => (
                            <div key={match.id} className="flex min-w-0 items-center" style={{ gridColumn: 1, gridRow: `${index * 2 + 1} / span 2` }}>
                              {renderGslMatchCard(match, `Lower round 1 · Match ${index + 1}`)}
                            </div>
                          ))}
                          {lowerSemis.map((match, index) => (
                            <div key={match.id} className="flex min-w-0 items-center" style={{ gridColumn: 2, gridRow: `${index * 2 + 1} / span 2` }}>
                              {renderGslMatchCard(match, `Lower semi-final ${index + 1}`)}
                            </div>
                          ))}
                          {lowerFinal && (
                            <div className="flex min-w-0 items-center" style={{ gridColumn: 3, gridRow: '2 / span 2' }}>
                              {renderGslMatchCard(lowerFinal, 'Lower final · 3rd place', true)}
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500">Проигравший любой встречи нижней сетки выбывает. Победитель Lower final занимает 3-е место и получает последний слот в плей-офф.</div>
                  </div>

                  {(q1 || q2 || group.qualifiedTeamIds?.[2]) && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs font-mono text-slate-300">
                      <div className="font-bold text-emerald-300 mb-2">Квалификация в плей-офф</div>
                      {[q1, q2, getTeam(group.qualifiedTeamIds?.[2])].map((team, i) => team && <div key={team.id} className="flex items-center gap-2 py-1"><TeamLogo team={team} size="xs"/><span>{i + 1}-е место: {team.shortName || team.name}</span></div>)}
                    </div>
                  )}
                </div>
              )}

              {/* Four-team GSL Top 3 layout: Upper final assigns places 1-2, Lower final assigns 3-4. */}
              {group.groupStyle === 'gsl_top3' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-800 bg-[#080c14] p-4 space-y-3">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">Opening round · Стартовые матчи</div>
                      {renderGslMatchCard(m1, 'Opening round · Match 1', false, false)}
                      {renderGslMatchCard(m2, 'Opening round · Match 2', false, false)}
                      {onUpdateGroupMatches && m1?.status !== 'finished' && m2?.status !== 'finished' && (
                        <button
                          onClick={() => { soundFx.playClick(); setEditingGroup(group); }}
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ArrowLeftRight className="w-2.5 h-2.5" /> Сменить пары
                        </button>
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-[#080c14] p-4 space-y-4">
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Winners' match / Upper final</div>
                        {renderGslMatchCard(upperFinal, 'Upper final · 1st / 2nd place', true, false)}
                        <p className="text-[10px] font-mono text-slate-500">Победитель занимает 1-е место и сразу выходит в полуфинал. Проигравший занимает 2-е место.</p>
                      </div>
                      <div className="border-t border-slate-800 pt-3 space-y-2">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Lower final / Матч за 3-е место</div>
                        {renderGslMatchCard(lowerFinal, 'Lower final · 3rd / 4th place', true, false)}
                        <p className="text-[10px] font-mono text-slate-500">Победитель занимает 3-е место и выходит в четвертьфинал. Проигравший выбывает.</p>
                      </div>
                    </div>
                  </div>
                  {(q1 || q2 || group.qualifiedTeamIds?.[2]) && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs font-mono text-slate-300">
                      <div className="font-bold text-emerald-300 mb-2">Квалификация в плей-офф</div>
                      {[q1, q2, getTeam(group.qualifiedTeamIds?.[2])].map((team, i) => team && <div key={team.id} className="flex items-center gap-2 py-1"><TeamLogo team={team} size="xs"/><span>{i + 1}-е место: {team.shortName || team.name} {i === 0 ? '· полуфинал' : '· четвертьфинал'}</span></div>)}
                    </div>
                  )}
                </div>
              )}

              {/* Upper Section: Opening Round & Winners' Match */}
              <div className={group.teamIds.length >= 8 || group.groupStyle === 'gsl_top3' ? 'hidden' : 'space-y-3'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Column 1: Opening round (2 matches) */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span>Opening round</span>
                      </div>
                      {onUpdateGroupMatches && m1?.status !== 'finished' && m2?.status !== 'finished' && (
                        <button
                          onClick={() => {
                            soundFx.playClick();
                            setEditingGroup(group);
                          }}
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ArrowLeftRight className="w-2.5 h-2.5" />
                          <span>Сменить пары</span>
                        </button>
                      )}
                    </div>
                    {renderGslMatchCard(m1, 'Opening Round · Match 1', false, group.teamIds.length !== 4)}
                    {renderGslMatchCard(m2, 'Opening Round · Match 2', false, group.teamIds.length !== 4)}
                  </div>

                  {/* Column 2: Winners' match */}
                  <div className="space-y-3 flex flex-col justify-center">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Winners' Match / Upper Final</span>
                    </div>
                    {renderGslMatchCard(winners, 'За 1-е место · прямой выход в полуфинал', true, group.teamIds.length !== 4)}
                    <span className="text-[10px] font-mono text-slate-500">
                      Победитель занимает 1-е место и сразу выходит в полуфинал. Проигравший отправляется в Decider Match.
                    </span>
                  </div>
                </div>
              </div>

              {/* Lower Section: Elimination match & Decider match */}
              <div className={group.teamIds.length >= 8 || group.groupStyle === 'gsl_top3' ? 'hidden' : 'pt-4 border-t border-slate-800/80 space-y-3'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Elimination match */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Elimination Match / нижняя сетка</span>
                    </div>
                    {renderGslMatchCard(elim, 'Elimination Match · матч на вылет', false, group.teamIds.length !== 4)}
                    <span className="text-[10px] font-mono text-slate-500">
                      Проигравший выбывает. Победитель выходит в Decider Match за последнее место в плей-офф.
                    </span>
                  </div>

                  {/* Decider match */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>Decider Match / матч за 2-е место</span>
                    </div>
                    {renderGslMatchCard(decider, 'Decider Match · за 2-е место', true, group.teamIds.length !== 4)}
                    <span className="text-[10px] font-mono text-slate-500">
                      Здесь встречаются проигравший Winners’ Match и победитель Elimination Match. Победитель проходит в полуфинал, проигравший выбывает.
                    </span>
                  </div>
                </div>
              </div>

              {/* Group Qualification Results Card */}
              {group.teamIds.length < 8 && group.groupStyle !== 'gsl_top3' && (q1 || q2) && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Выход в плей-офф из {group.name}:
                      </span>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {q1 && (
                          <div className="flex items-center gap-1.5 text-white font-bold">
                            <TeamLogo team={q1} size="xs" />
                            <span>1-е место: {q1.shortName || q1.name}</span>
                          </div>
                        )}
                        {q2 && (
                          <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                            <TeamLogo team={q2} size="xs" />
                            <span>2-е место: {q2.shortName || q2.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Group Pairs Selection Modal */}
      {editingGroup && onUpdateGroupMatches && (
        <GroupPairsModal
          key={editingGroup.id}
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          group={editingGroup}
          teams={teams}
          onSaveGroupMatches={(gId, updatedMatches) => {
            onUpdateGroupMatches(gId, updatedMatches);
            setEditingGroup(null);
          }}
        />
      )}
    </div>
  );
};
