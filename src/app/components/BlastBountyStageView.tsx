import React, { useEffect, useMemo, useState } from 'react';
import { TournamentMatch, TournamentState, Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { Coins, Crown, DraftingCompass, Flame, Handshake, Play, Shield, Trophy } from 'lucide-react';

interface BlastBountyStageViewProps {
  tournament: TournamentState;
  teams: Team[];
  onDraftRound: (pairings: { favoriteId: string; underdogId: string }[]) => void;
  onSetWager: (matchId: string, challengerId: string, amount: number) => void;
  onOpenMatch: (match: TournamentMatch) => void;
  onQuickSimulateMatch?: (match: TournamentMatch) => void;
}

const money = (amount: number | undefined) => `$${Math.round(amount || 0).toLocaleString('en-US')}`;
const roundLabels: Record<number, string> = {
  1: 'Online · Раунд 1',
  2: 'Online · Раунд 2 — выход в Final 8',
  3: 'LAN · Четвертьфиналы',
  4: 'LAN · Полуфиналы',
  5: 'LAN · Гранд-финал'
};

export const BlastBountyStageView: React.FC<BlastBountyStageViewProps> = ({
  tournament,
  teams,
  onDraftRound,
  onSetWager,
  onOpenMatch,
  onQuickSimulateMatch
}) => {
  const currentRound = Math.min(5, Math.max(1, tournament.bountyCurrentRound || 1));
  const matches = tournament.playoffMatches || [];
  const heads = tournament.bountyHeads || {};
  const bank = tournament.bountyBank || {};
  const seeds = tournament.bountySeeds || tournament.teamSeeds || {};
  const allTeamIds = tournament.participatingTeamIds || teams.map((team) => team.id);
  const getTeam = (teamId?: string) => teams.find((team) => team.id === teamId);
  const getSeed = (teamId: string) => seeds[teamId] || 99;

  const currentMatches = useMemo(
    () => matches.filter((match) => match.roundNumber === currentRound).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
    [matches, currentRound]
  );
  const previousWinners = currentRound === 1
    ? allTeamIds
    : matches.filter((match) => match.roundNumber === currentRound - 1 && match.status === 'finished' && match.winnerId).map((match) => match.winnerId!);
  const orderedParticipants = previousWinners.map((id) => getTeam(id)).filter(Boolean) as Team[];
  orderedParticipants.sort((a, b) => getSeed(a.id) - getSeed(b.id));
  const half = Math.floor(orderedParticipants.length / 2);
  const favorites = orderedParticipants.slice(0, half);
  // Lowest-seeded teams pick first in the interactive draft.
  const underdogs = orderedParticipants.slice(half).reverse();
  const participantsKey = `${currentRound}:${orderedParticipants.map((team) => `${team.id}-${getSeed(team.id)}`).join(',')}`;
  const hasDrafted = currentMatches.some((match) => !!match.teamAId && !!match.teamBId);
  const isDraftRequired = currentRound < 6 && !hasDrafted && orderedParticipants.length > 1;
  const [draftChoices, setDraftChoices] = useState<Record<string, string>>({});
  const [wagerDrafts, setWagerDrafts] = useState<Record<string, { challengerId: string; amount: string }>>({});

  useEffect(() => {
    const nextChoices: Record<string, string> = {};
    underdogs.forEach((underdog, index) => {
      const defaultFavorite = favorites[favorites.length - 1 - index] || favorites[index];
      if (defaultFavorite) nextChoices[underdog.id] = defaultFavorite.id;
    });
    setDraftChoices(nextChoices);
  // participantsKey captures seeding inheritance and advancement between rounds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantsKey]);

  const allUniqueChoices = underdogs.length > 0
    && underdogs.every((team) => !!draftChoices[team.id])
    && new Set(underdogs.map((team) => draftChoices[team.id])).size === underdogs.length
    && underdogs.every((team) => favorites.some((favorite) => favorite.id === draftChoices[team.id]));

  const overallBank = allTeamIds.reduce((sum, id) => sum + (bank[id] || 0), 0);
  const outstandingHeads = allTeamIds.reduce((sum, id) => sum + (heads[id] || 0), 0);
  const standings = allTeamIds
    .map((id) => ({ team: getTeam(id), id, head: heads[id] || 0, cash: bank[id] || 0, seed: getSeed(id) }))
    .filter((entry) => !!entry.team)
    .sort((a, b) => b.cash - a.cash || b.head - a.head || a.seed - b.seed) as { team: Team; id: string; head: number; cash: number; seed: number }[];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#211708] via-[#101622] to-[#090d15] shadow-xl shadow-black/20">
        <div className="flex flex-col gap-4 border-b border-amber-500/15 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3 text-amber-300"><Coins className="h-6 w-6" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black uppercase tracking-wide text-white">BLAST Bounty</h2>
                <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-200">32 команд · Single Elimination</span>
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-300">
                Побеждай, забирай половину награды на банковский счёт, а вторую половину добавляй к собственной «голове». После каждого раунда андердоги выбирают соперника, победитель апсета наследует посев проигравшего.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">Банки</div><div className="mt-1 text-sm font-black text-emerald-300">{money(overallBank)}</div></div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">Активные головы</div><div className="mt-1 text-sm font-black text-amber-300">{money(outstandingHeads)}</div></div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2"><div className="text-[10px] uppercase text-slate-500">Этап</div><div className="mt-1 text-sm font-black text-white">{currentRound <= 2 ? 'ONLINE' : 'LAN'}</div></div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5 p-3 sm:gap-2 sm:p-4">
          {[1, 2, 3, 4, 5].map((round) => {
            const roundMatches = matches.filter((match) => match.roundNumber === round);
            const finished = roundMatches.filter((match) => match.status === 'finished').length;
            const active = round === currentRound;
            return (
              <div key={round} className={`rounded-xl border p-2 ${active ? 'border-amber-400/70 bg-amber-400/10' : 'border-slate-800 bg-slate-950/40'}`}>
                <div className="flex items-center justify-between gap-1"><span className={`text-[10px] font-black sm:text-xs ${active ? 'text-amber-200' : 'text-slate-300'}`}>R{round}</span><span className="text-[9px] text-slate-500">{finished}/{roundMatches.length}</span></div>
                <div className="mt-1 text-[9px] leading-tight text-slate-400 sm:text-[10px]">{round === 1 ? '32 → 16' : round === 2 ? '16 → 8' : round === 3 ? 'Final 8' : round === 4 ? 'Топ 4' : 'Титул'}</div>
                <div className="mt-2 h-1 rounded-full bg-slate-800"><div className={`h-1 rounded-full ${active ? 'bg-amber-300' : 'bg-emerald-500'}`} style={{ width: `${roundMatches.length ? finished / roundMatches.length * 100 : 0}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      {isDraftRequired && (
        <section className="rounded-3xl border border-cyan-500/25 bg-[#0b1420] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-2 text-cyan-300"><DraftingCompass className="h-5 w-5" /></div>
              <div><h3 className="text-sm font-black uppercase tracking-wide text-white">Draft Show · {roundLabels[currentRound]}</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">Команды с более низким посевом выбирают соперника из пула фаворитов. Каждый фаворит может быть выбран только один раз.</p></div>
            </div>
            <span className="w-fit rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-[10px] font-bold text-cyan-200">{underdogs.length} выборов</span>
          </div>
          <div className="space-y-2">
            {underdogs.map((underdog, index) => {
              const usedByOther = new Set(underdogs.filter((item) => item.id !== underdog.id).map((item) => draftChoices[item.id]).filter(Boolean));
              return (
                <div key={underdog.id} className="grid grid-cols-1 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-[1fr_auto_1fr]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-black text-slate-300">#{getSeed(underdog.id)}</span>
                    <TeamLogo team={underdog} size="sm" />
                    <div className="min-w-0"><div className="truncate text-xs font-bold text-white">{underdog.name}</div><div className="text-[10px] text-slate-500">Аутсайдер выбирает {index + 1}</div></div>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-cyan-300"><span>выбирает</span><span>→</span></div>
                  <div className="flex min-w-0 items-center gap-2">
                    <select aria-label={`Соперник для ${underdog.name}`} value={draftChoices[underdog.id] || ''} onChange={(event) => setDraftChoices((previous) => ({ ...previous, [underdog.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-cyan-400">
                      <option value="">Выбрать фаворита…</option>
                      {favorites.map((favorite) => <option key={favorite.id} value={favorite.id} disabled={usedByOther.has(favorite.id) && draftChoices[underdog.id] !== favorite.id}>#{getSeed(favorite.id)} · {favorite.name} ({money(heads[favorite.id])})</option>)}
                    </select>
                    <div className="shrink-0 text-right"><div className="text-[9px] uppercase text-slate-500">Голова</div><div className="text-[11px] font-bold text-amber-300">{money(heads[underdog.id])}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-relaxed text-slate-500">Сетка не фиксирована заранее: пары этого раунда формируются только после подтверждения драфта.</p>
            <button type="button" disabled={!allUniqueChoices || underdogs.length !== currentMatches.length} onClick={() => onDraftRound(underdogs.map((underdog) => ({ underdogId: underdog.id, favoriteId: draftChoices[underdog.id]! })))} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"><Handshake className="h-4 w-4" />Подтвердить драфт и открыть матчи</button>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-800 bg-[#0b101a] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="text-base font-black text-white">{roundLabels[currentRound] || 'BLAST Bounty'}</h3><p className="mt-1 text-xs text-slate-500">{currentRound <= 2 ? 'Неделя 1 · Онлайн-стадия' : 'Неделя 2 · LAN-арена · Final 8'}</p></div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400"><Shield className="h-4 w-4 text-amber-300" />{currentMatches.filter((match) => match.status === 'finished').length}/{currentMatches.length} матчей завершено</div>
        </div>
        {!hasDrafted && isDraftRequired ? <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-xs text-slate-500">Сначала завершите Draft Show для этого раунда.</div> : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {currentMatches.map((match) => {
              const teamA = getTeam(match.teamAId);
              const teamB = getTeam(match.teamBId);
              const finished = match.status === 'finished';
              const ready = match.status === 'ready' && !!teamA && !!teamB;
              const currentWager = tournament.bountyWagers?.[match.id];
              const wagerEditor = wagerDrafts[match.id] || { challengerId: match.teamAId || '', amount: currentWager ? String(currentWager.amount) : '' };
              const wagerMax = Math.min(bank[match.teamAId || ''] || 0, bank[match.teamBId || ''] || 0);
              return (
                <article key={match.id} className={`overflow-hidden rounded-2xl border ${finished ? 'border-slate-800 bg-slate-950/60' : ready ? 'border-amber-500/35 bg-slate-900/70' : 'border-slate-800 bg-slate-950/30'}`}>
                  <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-3 py-2"><span className="truncate text-[10px] font-bold text-slate-300">{match.name}</span><div className="flex items-center gap-2"><span className="rounded-md border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-[10px] font-black text-slate-200">{match.format}</span><span className={`text-[9px] font-black uppercase ${finished ? 'text-emerald-300' : ready ? 'text-amber-300' : 'text-slate-600'}`}>{finished ? 'завершён' : ready ? 'готов' : 'ожидает драфта'}</span></div></div>
                  {[{ id: match.teamAId, score: match.scoreA }, { id: match.teamBId, score: match.scoreB }].map((slot, index) => {
                    const team = getTeam(slot.id);
                    if (!team) return <div key={index} className="flex items-center justify-between px-3 py-3 text-xs text-slate-600"><span>Участник появится после драфта</span><span>—</span></div>;
                    return (
                      <div key={team.id} className={`flex items-center justify-between gap-2 border-b border-slate-800/50 px-3 py-3 last:border-b-0 ${match.winnerId === team.id ? 'bg-emerald-500/5' : ''}`}>
                        <div className="flex min-w-0 items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${match.winnerId === team.id ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>#{getSeed(team.id)}</span><TeamLogo team={team} size="sm" /><div className="min-w-0"><div className="truncate text-xs font-bold text-white">{team.name}</div><div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-slate-500"><span>Голова: <b className="text-amber-300">{money(heads[team.id])}</b></span><span>Банк: <b className="text-emerald-300">{money(bank[team.id])}</b></span></div></div></div>
                        <div className="min-w-6 text-right text-lg font-black text-white">{finished ? slot.score : '—'}</div>
                      </div>
                    );
                  })}
                  {currentRound >= 3 && ready && teamA && teamB && (
                    <div className="border-t border-amber-500/15 bg-amber-500/[0.04] p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-200"><Flame className="h-3.5 w-3.5" />LAN wager / challenge</div>
                      {currentWager ? <div className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] leading-relaxed text-amber-100">Вызов принят: {getTeam(currentWager.challengerId)?.name || 'Команда'} поставила {money(currentWager.amount)}. Обе команды рискуют одинаковой суммой; победитель получает банк ставки.</div> : <div className="mb-2 text-[10px] text-slate-500">Сумма не больше банка соперника и банка вызывающей команды. У обеих команд должны быть средства.</div>}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_auto]">
                        <select value={wagerEditor.challengerId} onChange={(event) => setWagerDrafts((prev) => ({ ...prev, [match.id]: { ...wagerEditor, challengerId: event.target.value } }))} disabled={!!currentWager} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] text-white disabled:opacity-50"><option value={teamA.id}>{teamA.name} бросает вызов</option><option value={teamB.id}>{teamB.name} бросает вызов</option></select>
                        <input aria-label="Сумма ставки" type="number" min={0} max={wagerMax} step={1000} value={wagerEditor.amount} disabled={!!currentWager} onChange={(event) => setWagerDrafts((prev) => ({ ...prev, [match.id]: { ...wagerEditor, amount: event.target.value } }))} placeholder={`до ${money(wagerMax)}`} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] text-white disabled:opacity-50" />
                        <button type="button" disabled={!!currentWager || Number(wagerEditor.amount) <= 0 || Number(wagerEditor.amount) > wagerMax} onClick={() => onSetWager(match.id, wagerEditor.challengerId || teamA.id, Number(wagerEditor.amount))} className="rounded-lg bg-amber-400 px-3 py-2 text-[10px] font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40">Бросить вызов</button>
                      </div>
                      {currentWager && <button type="button" onClick={() => onSetWager(match.id, currentWager.challengerId, 0)} className="mt-2 text-[10px] font-bold text-slate-500 underline hover:text-slate-300">Отменить вызов до начала матча</button>}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800/80 p-3">
                    <button type="button" disabled={!ready && !finished} onClick={() => onOpenMatch(match)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-[10px] font-bold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30"><Trophy className="h-3.5 w-3.5" />{finished ? 'Посмотреть результат' : 'Открыть матч'}</button>
                    {ready && onQuickSimulateMatch && <button type="button" onClick={() => onQuickSimulateMatch(match)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[10px] font-black text-slate-950 hover:bg-emerald-400"><Play className="h-3.5 w-3.5" />Симулировать</button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0b101a]">
        <div className="flex items-center justify-between border-b border-slate-800 p-4"><div><h3 className="text-sm font-black uppercase tracking-wide text-white">Bounty board · Рейтинг наград</h3><p className="mt-1 text-[10px] text-slate-500">Посев наследуется после апсета. Банк сохраняется у команды между раундами.</p></div><Crown className="h-5 w-5 text-amber-300" /></div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-950 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-2">Команда</th><th className="px-3 py-2">Посев</th><th className="px-3 py-2 text-right">Голова</th><th className="px-4 py-2 text-right">Банк</th></tr></thead><tbody>{standings.map((entry) => <tr key={entry.id} className="border-t border-slate-800/70"><td className="px-4 py-2"><div className="flex min-w-0 items-center gap-2"><TeamLogo team={entry.team} size="sm" /><span className="truncate font-semibold text-slate-200">{entry.team.name}</span></div></td><td className="px-3 py-2 font-mono text-slate-400">#{entry.seed}</td><td className="px-3 py-2 text-right font-mono font-bold text-amber-300">{money(entry.head)}</td><td className="px-4 py-2 text-right font-mono font-bold text-emerald-300">{money(entry.cash)}</td></tr>)}</tbody></table>
        </div>
      </section>
    </div>
  );
};
