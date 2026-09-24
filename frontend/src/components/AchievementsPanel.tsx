import React, { useEffect, useState } from 'react';
import { libraryApi } from '../api/client';
import { AchievementResponse } from '../types';

interface AchievementsPanelProps {
  gameId: number;
  gameName: string;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ gameId, gameName }) => {
  const [achievements, setAchievements] = useState<AchievementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    libraryApi.getGameAchievements(gameId)
      .then(data => {
        if (isMounted) setAchievements(data);
      })
      .catch(err => {
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

  if (loading) {
    return (
      <div className="p-6 bg-brand-surface/50 border-t border-gray-800 animate-pulse flex items-center justify-center">
        <i className="fa-solid fa-spinner fa-spin text-brand-purple text-2xl"></i>
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

  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const progressPercent = Math.round((unlockedCount / achievements.length) * 100);

  const rarityColors: Record<string, string> = {
    'Comum': 'bg-gray-600/20 text-gray-400 border-gray-600/30',
    'Raro': 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    'Épico': 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    'Lendário': 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  };

  return (
    <div className="p-6 bg-brand-surface/30 border-t border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-trophy text-brand-purple"></i>
          Conquistas de {gameName}
        </h4>
        <span className="text-sm font-medium text-gray-400">
          {unlockedCount} de {achievements.length} ({progressPercent}%)
        </span>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-2.5 mb-6 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-brand-purple to-brand-green h-2.5 rounded-full transition-all duration-1000" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map(ach => (
          <div 
            key={ach.achievement_id} 
            className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
              ach.is_unlocked
                ? 'bg-brand-surface/50 border-brand-purple/30'
                : 'bg-gray-900/30 border-gray-700/30 opacity-60'
            }`}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              ach.is_unlocked ? 'bg-brand-purple/30' : 'bg-gray-700/30'
            }`}>
              {ach.icon_url ? (
                <img src={ach.icon_url} alt={ach.name} className="w-8 h-8 object-contain" />
              ) : (
                <i className="fa-solid fa-trophy text-xl"></i>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h5 className={`font-bold text-sm truncate ${
                ach.is_unlocked ? 'text-white' : 'text-gray-500'
              }`}>
                {ach.name}
              </h5>
              {ach.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {ach.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  rarityColors[ach.rarity] || 'bg-gray-600/20 text-gray-400 border-gray-600/30'
                }`}>
                  {ach.rarity}
                </span>
                {ach.is_unlocked && ach.unlocked_at && (
                  <span className="text-[10px] text-gray-500">
                    {new Date(ach.unlocked_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
