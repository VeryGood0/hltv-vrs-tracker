import React, { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { getRatingWeight, setRatingWeight, DEFAULT_RATING_WEIGHT } from '../utils/settings';
import { soundFx } from '../utils/audio';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [weight, setWeight] = useState(getRatingWeight());
  const [volume, setVolume] = useState(soundFx.getVolume());
  const [varied, setVaried] = useState(soundFx.getVaried());
  if (!isOpen) return null;
  const update = (v: number) => {
    setWeight(v);
    setRatingWeight(v);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0d121c] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Settings className="w-5 h-5 text-amber-400" /> Настройки симуляции
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-200">Значимость рейтинга команд</span>
            <span className="font-mono font-bold text-amber-400">{weight}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={weight} onChange={(e) => update(Number(e.target.value))} className="w-full accent-amber-500" />
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Решает статистика карт</span>
            <span>Решает рейтинг</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Чем меньше сыграно карт у команд, тем сильнее на исход влияет общий рейтинг и VRS-очки. Этот ползунок задаёт, насколько сильно.
          </p>
          <button onClick={() => update(DEFAULT_RATING_WEIGHT)} className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer">
            Сбросить ({DEFAULT_RATING_WEIGHT}%)
          </button>
        </div>
        <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-200">Громкость эффектов</span>
            <span className="font-mono font-bold text-amber-400">{volume}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={volume}
            onChange={(e) => { const v = Number(e.target.value); setVolume(v); soundFx.setVolume(v); }}
            onPointerUp={() => soundFx.playClick()}
            className="w-full accent-amber-500" />
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-200">Звуки нажатий</span>
            <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
              {[{ v: false, l: 'Один везде' }, { v: true, l: 'Разные' }].map((o) => (
                <button key={o.l} onClick={() => { setVaried(o.v); soundFx.setVaried(o.v); soundFx.playClick(); }}
                  className={`px-3 py-1.5 cursor-pointer ${varied === o.v ? 'bg-amber-500 text-black font-semibold' : 'text-slate-300 hover:bg-slate-800'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
