import React, { useRef, useState } from 'react';
import { Team } from '../types';
import { TeamLogo } from './TeamLogo';
import { X, Upload, FolderCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface LogoHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onUploadCustomLogo: (teamId: string, dataUrl: string) => void;
  onResetCustomLogo: (teamId: string) => void;
}

export const LogoHelperModal: React.FC<LogoHelperModalProps> = ({
  isOpen,
  onClose,
  teams,
  onUploadCustomLogo,
  onResetCustomLogo
}) => {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTeamId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onUploadCustomLogo(activeTeamId, result);
        soundFx.playClick();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerUpload = (teamId: string) => {
    setActiveTeamId(teamId);
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/webp,image/png,image/jpeg,image/svg+xml"
        className="hidden"
      />
      <div className="bg-[#111622] border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <FolderCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Логотипы команд (.webp)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Загрузите файлы в папку <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono text-[11px]">/public/logos/</code> или через интерфейс
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 mx-4 mt-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            В проекте для каждой команды прописан путь <span className="text-amber-400 font-mono">/logos/{'{id}'}.webp</span>. Если файл ещё не залит в папку, отображается стильный киберспортивный бейдж в цветах команды. Вы можете загрузить логотип прямо здесь или залить файлы в <code className="text-amber-300 font-mono">public/logos/</code>.
          </div>
        </div>

        {/* Team Grid */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <TeamLogo team={team} size="md" />
                <div>
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    {team.name}
                    {team.customLogo && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                        кастомное
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    /public/logos/{team.id}.webp
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerUpload(team.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  Загрузить .webp
                </button>
                {team.customLogo && (
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onResetCustomLogo(team.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Сбросить логотип"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end">
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
