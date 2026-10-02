import React, { useState, useEffect } from 'react';
import { NavigationTab, UserProfile, LevelProgress } from '../types';
import { cardsApi } from '../api/client';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  user: UserProfile | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onOpenAuth,
  onLogout
}) => {
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);

  useEffect(() => {
    if (!user) {
      setLevelProgress(null);
      return;
    }
    if (typeof cardsApi?.getLevelProgress !== 'function') {
      const lvl = user.level || 1;
      const totalXp = (user as unknown as { total_xp?: number }).total_xp || (lvl * lvl * 100);
      const curMin = lvl * lvl * 100;
      const nextMin = (lvl + 1) * (lvl + 1) * 100;
      const needed = nextMin - curMin;
      const curInLvl = Math.max(0, totalXp - curMin);
      setLevelProgress({
        level: lvl,
        total_xp: totalXp,
        current_level_min_xp: curMin,
        next_level_min_xp: nextMin,
        current_xp_in_level: curInLvl,
        xp_needed_in_level: needed,
        progress_percent: Math.min(100, Math.round((curInLvl / needed) * 100)),
      });
      return;
    }
    cardsApi.getLevelProgress()
      .then(res => setLevelProgress(res))
      .catch(() => {
        const lvl = user.level || 1;
        const totalXp = (user as unknown as { total_xp?: number }).total_xp || (lvl * lvl * 100);
        const curMin = lvl * lvl * 100;
        const nextMin = (lvl + 1) * (lvl + 1) * 100;
        const needed = nextMin - curMin;
        const curInLvl = Math.max(0, totalXp - curMin);
        setLevelProgress({
          level: lvl,
          total_xp: totalXp,
          current_level_min_xp: curMin,
          next_level_min_xp: nextMin,
          current_xp_in_level: curInLvl,
          xp_needed_in_level: needed,
          progress_percent: Math.min(100, Math.round((curInLvl / needed) * 100)),
        });
      });
  }, [user?.id, user?.level, (user as unknown as { total_xp?: number })?.total_xp, activeTab]);

  return (
    <aside className="w-20 lg:w-64 bg-brand-surface border-r border-gray-800 flex flex-col justify-between transition-all duration-300 z-50 h-screen select-none shrink-0">
      <div>
        {/* Logo MIST */}
        <div
          onClick={() => onSelectTab('store')}
          className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-gray-800 cursor-pointer group"
        >
          <i className="fa-solid fa-gamepad text-3xl text-brand-green group-hover:scale-110 transition"></i>
          <span className="hidden lg:block ml-3 font-display font-black text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-white">
            MIST
          </span>
        </div>

        {/* Menu Principal com todas as telas */}
        <nav className="mt-6 flex flex-col gap-1.5 px-2 lg:px-4">
          <button
            onClick={() => onSelectTab('store')}
            className={`w-full flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition group ${
              activeTab === 'store'
                ? 'bg-brand-purple/20 text-white neon-border'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Loja"
          >
            <i className={`fa-solid fa-store text-lg group-hover:scale-110 transition ${activeTab === 'store' ? 'text-brand-purple' : ''}`}></i>
            <span className={`hidden lg:block ${activeTab === 'store' ? 'font-bold' : 'font-medium'}`}>
              Loja
            </span>
          </button>

          <button
            onClick={() => onSelectTab('library')}
            className={`w-full flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition group ${
              activeTab === 'library'
                ? 'bg-brand-purple/20 text-white neon-border'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Biblioteca"
          >
            <i className={`fa-solid fa-book-open text-lg group-hover:scale-110 transition ${activeTab === 'library' ? 'text-brand-purple' : ''}`}></i>
            <span className={`hidden lg:block ${activeTab === 'library' ? 'font-bold' : 'font-medium'}`}>
              Biblioteca
            </span>
          </button>

          <button
            onClick={() => onSelectTab('market')}
            className={`w-full flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition group ${
              activeTab === 'market'
                ? 'bg-brand-purple/20 text-white neon-border'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Mercado"
          >
            <i className={`fa-solid fa-store-alt text-lg group-hover:scale-110 transition ${activeTab === 'market' ? 'text-brand-purple' : ''}`}></i>
            <span className={`hidden lg:block ${activeTab === 'market' ? 'font-bold' : 'font-medium'}`}>
              Mercado
            </span>
          </button>

          <button
            onClick={() => onSelectTab('inventory')}
            className={`w-full flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition group ${
              activeTab === 'inventory'
                ? 'bg-brand-purple/20 text-white neon-border'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Inventário"
          >
            <i className={`fa-solid fa-boxes-stacked text-lg group-hover:scale-110 transition ${activeTab === 'inventory' ? 'text-brand-purple' : ''}`}></i>
            <span className={`hidden lg:block ${activeTab === 'inventory' ? 'font-bold' : 'font-medium'}`}>
              Inventário
            </span>
          </button>

          <button
            onClick={() => onSelectTab('social')}
            className={`w-full flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition group ${
              activeTab === 'social'
                ? 'bg-brand-purple/20 text-white neon-border'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Comunidade"
          >
            <i className={`fa-solid fa-users text-lg group-hover:scale-110 transition ${activeTab === 'social' ? 'text-brand-purple' : ''}`}></i>
            <span className={`hidden lg:block ${activeTab === 'social' ? 'font-bold' : 'font-medium'}`}>
              Comunidade
            </span>
          </button>

          <button
            onClick={() => onSelectTab('workshop')}
            className={`w-full flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition group ${
              activeTab === 'workshop'
                ? 'bg-brand-purple/20 text-white neon-border'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Oficina"
          >
            <i className={`fa-solid fa-wrench text-lg group-hover:scale-110 transition ${activeTab === 'workshop' ? 'text-brand-purple' : ''}`}></i>
            <span className={`hidden lg:block ${activeTab === 'workshop' ? 'font-bold' : 'font-medium'}`}>
              Oficina
            </span>
          </button>

          <button
            onClick={() => onSelectTab('news')}
            className={`w-full flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition group ${
              activeTab === 'news'
                ? 'bg-brand-purple/20 text-white neon-border'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Notícias"
          >
            <i className={`fa-solid fa-newspaper text-lg group-hover:scale-110 transition ${activeTab === 'news' ? 'text-brand-purple' : ''}`}></i>
            <span className={`hidden lg:block ${activeTab === 'news' ? 'font-bold' : 'font-medium'}`}>
              Notícias
            </span>
          </button>

          <button
            onClick={() => onSelectTab('points')}
            className={`w-full flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition group ${
              activeTab === 'points'
                ? 'bg-brand-purple/20 text-white neon-border'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            title="Loja de Pontos"
          >
            <i className={`fa-solid fa-shapes text-lg group-hover:scale-110 transition ${activeTab === 'points' ? 'text-brand-purple' : ''}`}></i>
            <span className={`hidden lg:block ${activeTab === 'points' ? 'font-bold' : 'font-medium'}`}>
              Loja de Pontos
            </span>
          </button>
        </nav>
      </div>

      {/* Perfil de Usuário ou CTA de Login */}
      {user ? (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div
              onClick={() => onSelectTab('profile')}
              className={`flex items-center cursor-pointer transition flex-1 rounded-xl p-1 ${
                activeTab === 'profile' ? 'bg-brand-purple/20' : 'hover:bg-gray-800/50'
              }`}
              title="Ver Perfil"
            >
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-xl relative flex items-center justify-center overflow-hidden transition-all p-0.5 ${
                    user.avatarFrameUrl
                      ? user.avatarFrameUrl.includes('1618005182384') || user.avatarFrameUrl.toLowerCase().includes('gold')
                        ? 'ring-2 ring-amber-400 border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                        : 'ring-2 ring-cyan-400 border border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                      : 'border-2 border-brand-green'
                  }`}
                >
                  <img
                    src={user.avatarUrl || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=100&q=80"}
                    alt={user.username}
                    className="w-full h-full rounded-lg object-cover"
                  />
                  {user.avatarFrameUrl && (
                    <div
                      className={`absolute inset-0 rounded-xl pointer-events-none border-2 transition-all ${
                        user.avatarFrameUrl.includes('1618005182384') || user.avatarFrameUrl.toLowerCase().includes('gold')
                          ? 'border-amber-400/90'
                          : 'border-cyan-400/90'
                      }`}
                    />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-green rounded-full border-2 border-brand-surface"></div>
              </div>
              <div className="hidden lg:block ml-3 truncate">
                <p className={`text-sm font-bold truncate ${activeTab === 'profile' ? 'text-brand-purple' : 'text-white'}`}>
                  {user.username}
                </p>
                <p className="text-xs text-emerald-400 font-semibold">{user.status}</p>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition ml-2"
                title="Encerrar Sessão"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
              </button>
            )}
          </div>

          {/* Barra de XP e Nível do Usuário (Bloco K) */}
          <div className="hidden lg:block mt-3 pt-3 border-t border-gray-800/80" data-testid="sidebar-xp-container">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-brand-purple font-black flex items-center gap-1.5">
                <span className="bg-brand-purple/20 border border-brand-purple/40 px-1.5 py-0.5 rounded text-[10px]">
                  NÍVEL {levelProgress?.level ?? user.level ?? 1}
                </span>
              </span>
              <span className="text-gray-400 font-mono text-[10px]">
                {levelProgress ? `${levelProgress.current_xp_in_level} / ${levelProgress.xp_needed_in_level} XP` : `${user.level || 1}00 XP`}
              </span>
            </div>
            <div
              className="w-full bg-gray-800/90 h-2 rounded-full overflow-hidden p-[1px] border border-gray-700/40"
              title={`${levelProgress?.progress_percent ?? 0}% para o próximo nível`}
            >
              <div
                className="bg-gradient-to-r from-brand-purple via-indigo-500 to-brand-green h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(160,32,240,0.5)]"
                style={{ width: `${Math.max(4, levelProgress?.progress_percent ?? 0)}%` }}
              ></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onOpenAuth}
            className="w-full bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold py-2.5 px-2 rounded-xl transition shadow-[0_0_12px_rgba(160,32,240,0.4)] flex items-center justify-center gap-2"
            title="Iniciar Sessão"
          >
            <i className="fa-solid fa-user"></i>
            <span className="hidden lg:inline">Entrar na Conta</span>
          </button>
        </div>
      )}
    </aside>
  );
};

