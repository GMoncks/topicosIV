import React, { useEffect } from 'react';
import { AchievementResponse } from '../types';

interface AchievementDetailModalProps {
  achievement: AchievementResponse | null;
  gameName: string;
  onClose: () => void;
}

export const AchievementDetailModal: React.FC<AchievementDetailModalProps> = ({
  achievement,
  gameName,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!achievement) return null;

  const rarityStyles: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    Comum: {
      bg: 'bg-gray-500/20',
      text: 'text-gray-300',
      border: 'border-gray-500/40',
      glow: 'shadow-gray-500/20',
    },
    Raro: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/40',
      glow: 'shadow-blue-500/20',
    },
    Épico: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/40',
      glow: 'shadow-purple-500/20',
    },
    Lendário: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/50',
      glow: 'shadow-amber-500/30',
    },
  };

  const currentRarity = rarityStyles[achievement.rarity] || rarityStyles.Comum;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-achievement-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-brand-card border border-gray-700/80 rounded-3xl p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo temático */}
        <div
          className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-25 ${
            achievement.is_unlocked ? 'bg-amber-400' : 'bg-brand-purple'
          }`}
        />

        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar detalhes da conquista"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-brand-surface/80 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition flex items-center justify-center cursor-pointer z-10"
        >
          <i className="fa-solid fa-xmark text-sm" />
        </button>

        {/* Cabeçalho com Ícone e Título */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 border relative overflow-hidden transition-all ${
              achievement.is_unlocked
                ? 'bg-gradient-to-br from-amber-500/20 to-brand-purple/20 border-amber-400/60 shadow-lg shadow-amber-500/20'
                : 'bg-gray-800/40 border-gray-700/50 opacity-60'
            }`}
          >
            {achievement.icon_url ? (
              <img
                src={achievement.icon_url}
                alt={achievement.name}
                className={`w-14 h-14 object-contain ${
                  achievement.is_unlocked ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'grayscale opacity-70'
                }`}
              />
            ) : (
              <i
                className={`fa-solid fa-trophy text-3xl ${
                  achievement.is_unlocked ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-gray-500'
                }`}
              />
            )}

            {achievement.is_unlocked && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black">
                <i className="fa-solid fa-check" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <span className="text-xs text-brand-purple font-semibold uppercase tracking-wider block mb-1">
              {gameName}
            </span>
            <h3 id="modal-achievement-title" className="text-xl font-display font-black text-white leading-snug">
              {achievement.name}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${currentRarity.bg} ${currentRarity.text} ${currentRarity.border}`}
              >
                {achievement.rarity}
              </span>

              {achievement.is_unlocked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <i className="fa-solid fa-circle-check text-[10px]" />
                  Desbloqueada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-800/60 border border-gray-700 px-2 py-0.5 rounded-full">
                  <i className="fa-solid fa-lock text-[10px]" />
                  Bloqueada
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Descrição Completa */}
        <div className="bg-brand-surface/60 border border-gray-800/80 rounded-2xl p-4 mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Como desbloquear
          </h4>
          <p className="text-sm text-gray-200 leading-relaxed">
            {achievement.description || 'Jogue para descobrir os critérios desta conquista secreta.'}
          </p>
        </div>

        {/* Rodapé: Data de desbloqueio ou Dica */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-800/80">
          {achievement.is_unlocked && achievement.unlocked_at ? (
            <span className="flex items-center gap-1.5 text-gray-300">
              <i className="fa-regular fa-calendar-check text-brand-purple" />
              Conquistada em {new Date(achievement.unlocked_at).toLocaleString()}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-gray-400 italic">
              <i className="fa-solid fa-gamepad text-gray-500" />
              Inicie uma sessão do jogo para desbloquear
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-brand-surface hover:bg-gray-800 text-white rounded-xl font-semibold transition border border-gray-700 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
