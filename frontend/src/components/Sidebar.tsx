import React from 'react';
import { NavigationTab, UserProfile } from '../types';

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
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <div
            onClick={() => onSelectTab('profile')}
            className={`flex items-center cursor-pointer transition flex-1 rounded-xl p-1 ${
              activeTab === 'profile' ? 'bg-brand-purple/20' : 'hover:bg-gray-800/50'
            }`}
            title="Ver Perfil"
          >
            <div className="relative">
              <img
                src={user.avatarUrl || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=100&q=80"}
                alt={user.username}
                className="w-10 h-10 rounded-xl border-2 border-brand-green object-cover"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-green rounded-full border-2 border-brand-surface"></div>
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

