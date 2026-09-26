import React, { useEffect, useState } from 'react';
import { libraryApi } from '../api/client';
import { AchievementResponse } from '../types';
import { AchievementDetailModal } from './AchievementDetailModal';

interface AchievementsPanelProps {
  gameId: number;
  gameName: string;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ gameId, gameName }) => {
  const [achievements, setAchievements] = useState<AchievementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    libraryApi
      .getGameAchievements(gameId)
      .then((data) => {
        if (isMounted) setAchievements(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setError('Não foi possível carregar as conquistas.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  // Listener reativo em tempo real para conquistas desbloqueadas durante a sessão de jogo
  useEffect(() => {
    const handleAchievementUnlocked = (
      e: CustomEvent<{
        gameId: number;
        achievementId: string;
        name?: string;
        description?: string;
        rarity?: string;
      }>
    ) => {
      const detail = e.detail;
      if (!detail || detail.gameId !== gameId) return;

      setAchievements((prev) =>
        prev.map((ach) => {
          if (
            ach.achievement_id === detail.achievementId ||
            (detail.name && ach.name.toLowerCase() === detail.name.toLowerCase())
          ) {
            return {
              ...ach,
              is_unlocked: true,
              unlocked_at: new Date().toISOString(),
            };
          }
          return ach;
        })
      );
    };

    window.addEventListener('mist:achievement-unlocked' as any, handleAchievementUnlocked);
    return () => {
      window.removeEventListener('mist:achievement-unlocked' as any, handleAchievementUnlocked);
    };
  }, [gameId]);

  if (loading) {
    return (
      <div className="p-6 bg-brand-surface/50 border-t border-gray-800 animate-pulse flex items-center justify-center">
        <i className="fa-solid fa-spinner fa-spin text-brand-purple text-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-brand-surface/50 border-t border-gray-800 text-center text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="p-6 bg-brand-surface/50 border-t border-gray-800 text-center text-gray-500 text-sm">
        Este jogo não possui conquistas suportadas no MIST.
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.is_unlocked).length;
  const progressPercent = Math.round((unlockedCount / achievements.length) * 100);

  const rarityBadgeStyles: Record<string, string> = {
    Comum: 'bg-gray-600/30 text-gray-300 border-gray-500/40',
    Raro: 'bg-blue-600/30 text-blue-300 border-blue-500/40',
    Épico: 'bg-purple-600/30 text-purple-200 border-purple-500/40',
    Lendário: 'bg-amber-500/30 text-amber-200 border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.2)]',
  };

  return (
    <div className="p-6 bg-brand-surface/30 border-t border-gray-800">
      {/* Cabeçalho do Painel com Progresso Reativo */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
          <i className="fa-solid fa-trophy text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          Conquistas de {gameName}
        </h4>
        <span className="text-xs sm:text-sm font-semibold text-gray-300 bg-brand-surface/80 border border-gray-700/80 px-3 py-1 rounded-full shadow-sm">
          {unlockedCount} de {achievements.length}{' '}
          <span className="text-amber-400">({progressPercent}%)</span>
        </span>
      </div>

      {/* Barra de Progresso com Animação Fluida */}
      <div className="w-full bg-gray-900 rounded-full h-2.5 mb-6 overflow-hidden border border-gray-800/80">
        <div
          className="bg-gradient-to-r from-brand-purple via-amber-400 to-emerald-400 h-2.5 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(160,32,240,0.5)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Grid de Mini Cards Otimizada e Sem Vazamento */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {achievements.map((ach) => {
          const isUnlocked = ach.is_unlocked;
          const badgeClass =
            rarityBadgeStyles[ach.rarity] || rarityBadgeStyles.Comum;

          return (
            <button
              key={ach.achievement_id}
              type="button"
              onClick={() => setSelectedAchievement(ach)}
              aria-label={`Conquista: ${ach.name} (${ach.rarity}) - ${
                isUnlocked ? 'Desbloqueada' : 'Bloqueada'
              }`}
              className={`group relative p-2.5 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-between text-center cursor-pointer select-none overflow-hidden ${
                isUnlocked
                  ? 'bg-gradient-to-b from-amber-500/15 via-brand-card to-brand-surface border-amber-400/60 shadow-[0_0_14px_rgba(251,191,36,0.25)] hover:scale-105 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                  : 'bg-brand-card/70 border-gray-800/80 opacity-50 grayscale hover:grayscale-0 hover:opacity-90 hover:scale-105 hover:border-gray-600'
              }`}
            >
              {/* Badge de status no canto do card */}
              <div className="absolute top-1.5 right-1.5">
                {isUnlocked ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-500/90 text-black flex items-center justify-center text-[9px] font-black shadow-sm">
                    <i className="fa-solid fa-check" />
                  </span>
                ) : (
                  <i className="fa-solid fa-lock text-[10px] text-gray-500" />
                )}
              </div>

              {/* Ícone Centralizado com Efeito de Luz */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center my-1.5">
                {ach.icon_url ? (
                  <img
                    src={ach.icon_url}
                    alt={ach.name}
                    className={`w-10 h-10 object-contain transition-transform duration-200 group-hover:scale-110 ${
                      isUnlocked
                        ? 'drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                        : 'opacity-70'
                    }`}
                  />
                ) : (
                  <i
                    className={`fa-solid fa-trophy text-2xl transition-transform duration-200 group-hover:scale-110 ${
                      isUnlocked
                        ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                        : 'text-gray-500'
                    }`}
                  />
                )}
              </div>

              {/* Tag de Raridade Perfeitamente Contida */}
              <div className="w-full mt-1">
                <span
                  className={`block w-full text-[9px] uppercase font-bold tracking-wider py-0.5 px-1 rounded-md border text-center truncate ${badgeClass}`}
                >
                  {ach.rarity}
                </span>
              </div>

              {/* Tooltip Elegante no Hover com o Título Completo */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30 w-max max-w-[180px]">
                <div className="bg-black/90 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl border border-gray-700 backdrop-blur-md text-center">
                  <p className="line-clamp-2">{ach.name}</p>
                  <p className="text-[9px] text-amber-400 font-semibold mt-0.5">
                    Clique para ver detalhes
                  </p>
                </div>
                <div className="w-2 h-2 bg-black/90 rotate-45 -mt-1 border-r border-b border-gray-700" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal / Overlay de Detalhes da Conquista Selecionada */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          gameName={gameName}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </div>
  );
};
