import React, { useState } from 'react';
import {
  X,
  Trash2,
  RotateCcw,
  SlidersHorizontal,
  History,
  Zap,
  TrendingUp,
  Trophy,
  DollarSign,
  Swords,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Individual reset actions
  onClearMatchHistory: () => void;
  onResetTeamVrsPoints: () => void;
  onResetTeamFormAndMaps: () => void;
  onClearTeamTrophies: () => void;
  onResetTeamPrizeMoney: () => void;
  onResetTournament: () => void;
  // Full reset action
  onResetAll: () => void;
  // Stats overview
  historyCount: number;
  trophiesTotalCount: number;
  prizeMoneyTotal: number;
  hasActiveTournament: boolean;
  activeTournamentName?: string;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  onClearMatchHistory,
  onResetTeamVrsPoints,
  onResetTeamFormAndMaps,
  onClearTeamTrophies,
  onResetTeamPrizeMoney,
  onResetTournament,
  onResetAll,
  historyCount,
  trophiesTotalCount,
  prizeMoneyTotal,
  hasActiveTournament,
  activeTournamentName
}) => {
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmFullReset, setConfirmFullReset] = useState(false);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3200);
  };

  const handleAction = (actionFn: () => void, msg: string) => {
    soundFx.playClick();
    actionFn();
    showFeedback(msg);
  };

  const handleFullReset = () => {
    if (!confirmFullReset) {
      setConfirmFullReset(true);
      return;
    }
    soundFx.playMapWin();
    onResetAll();
    setConfirmFullReset(false);
    showFeedback('Все данные успешно сброшены к начальным значениям!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#0e1422] border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Управление данными и сброс</span>
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Data Reset
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Очищайте историю, сбрасывайте рейтинг VRS, форму или удаляйте турниры по отдельности
              </p>
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

        {/* Feedback Banner */}
        {notification && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">
            Выборочная очистка разделов
          </div>

          {/* 1. Clear Match History */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                <History className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>История матчей и прогнозов</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {historyCount} {historyCount === 1 ? 'матч' : historyCount < 5 ? 'матча' : 'матчей'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Удаляет сохранённые результаты одиночных матчей и симуляций в предикторе
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                handleAction(onClearMatchHistory, 'История матчей успешно очищена!')
              }
              disabled={historyCount === 0}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all shrink-0 cursor-pointer ${
                historyCount > 0
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30'
                  : 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              Очистить историю
            </button>
          </div>

          {/* 2. Reset Team VRS Points */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Рейтинг VRS всех команд</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    К дефолту
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Возвращает очки рейтинга VRS всех команд к их базовым официальным значениям
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                handleAction(onResetTeamVrsPoints, 'VRS очки всех команд сброшены к дефолту!')
              }
              className="px-3.5 py-2 rounded-xl text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all shrink-0 cursor-pointer"
            >
              Сбросить VRS
            </button>
          </div>

          {/* 3. Reset Form and Maps */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Статистика карт и форма команд</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Все по нулям
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Обнуляет статистику всех карт (0 побед, 0 поражений, 0% винрейт, очистка маппула) — маппул будет строиться строго от новых сыгранных матчей
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                handleAction(onResetTeamFormAndMaps, 'Статистика карт и форма обнулены (все по нулям)!')
              }
              className="px-3.5 py-2 rounded-xl text-xs font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all shrink-0 cursor-pointer"
            >
              Сбросить карты
            </button>
          </div>

          {/* 4. Clear Team Trophies */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 shrink-0 mt-0.5">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Выигранные турниры и трофеи команд</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {trophiesTotalCount} {trophiesTotalCount === 1 ? 'кубок' : trophiesTotalCount < 5 ? 'кубка' : 'кубков'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Удаляет все выигранные турниры, кубки и чемпионские награды у команд (будет 0 трофеев)
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                handleAction(onClearTeamTrophies, 'Все выигранные турниры и трофеи команд удалены!')
              }
              disabled={trophiesTotalCount === 0}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all shrink-0 cursor-pointer ${
                trophiesTotalCount > 0
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30'
                  : 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              Удалить трофеи
            </button>
          </div>

          {/* Prize Money Reset */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Заработанные призовые команд</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prizeMoneyTotal)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Обнуляет накопленные призовые у всех команд. Выплаты из старых турниров не будут добавлены повторно после сброса.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleAction(onResetTeamPrizeMoney, 'Призовые деньги всех команд обнулены!')}
              disabled={prizeMoneyTotal <= 0}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all shrink-0 cursor-pointer ${
                prizeMoneyTotal > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              Сбросить призовые
            </button>
          </div>

          {/* 5. Reset Current Tournament */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Активный турнир</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                      hasActiveTournament
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {hasActiveTournament ? 'Есть турнир' : 'Нет турнира'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {hasActiveTournament
                    ? `Удаляет текущий турнир «${activeTournamentName || 'Турнир'}» и возвращает к экрану создания`
                    : 'Сейчас активный турнир не создан'}
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                handleAction(
                  onResetTournament,
                  'Турнир удалён! Теперь можно создать новый турнир.'
                )
              }
              disabled={!hasActiveTournament}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all shrink-0 cursor-pointer ${
                hasActiveTournament
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                  : 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              Удалить турнир
            </button>
          </div>

          {/* Full Factory Reset Card */}
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-rose-950/30 via-slate-900/60 to-slate-900/80 border border-rose-500/40 space-y-3">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Полный сброс всех данных к заводским настройкам</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Очистит историю всех матчей, сбросит VRS рейтинг всех команд, вернёт форму и карты к дефолту,
              удалит все выигранные кубки, обнулит накопленные призовые деньги и удалит текущий турнир.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              {confirmFullReset ? (
                <div className="text-xs text-rose-400 font-bold font-mono flex items-center gap-2">
                  <span>Вы уверены? Это действие необратимо!</span>
                </div>
              ) : (
                <span className="text-[11px] font-mono text-slate-400">
                  Рекомендуется, если хотите начать всё с чистого листа
                </span>
              )}

              <div className="flex items-center gap-2">
                {confirmFullReset && (
                  <button
                    onClick={() => setConfirmFullReset(false)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                )}
                <button
                  onClick={handleFullReset}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    confirmFullReset
                      ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 animate-pulse'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {confirmFullReset
                      ? 'Подтвердить полный сброс'
                      : 'Сбросить ВСЁ к дефолту'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end shrink-0">
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
