import React, { useEffect, useState, useRef } from 'react';
import {
  searchApi,
  GlobalSearchResult,
  GlobalSearchGameItem,
  GlobalSearchUserItem,
  GlobalSearchGroupItem,
  GlobalSearchMarketItem,
} from '../api/client';
import { NavigationTab } from '../types';

interface GlobalSearchDropdownProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: NavigationTab) => void;
  onSelectGame?: (gameId: number) => void;
  onSelectGroup?: (groupId: number) => void;
}

export const GlobalSearchDropdown: React.FC<GlobalSearchDropdownProps> = ({
  query,
  isOpen,
  onClose,
  onNavigate,
  onSelectGame,
  onSelectGroup,
}) => {
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce de 250ms para disparar a busca global agregada
  useEffect(() => {
    if (!query || !query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await searchApi.search(query.trim(), 4);
        setResults(res);
      } catch (err) {
        console.error('Falha na busca global agregada:', err);
        setResults({
          query,
          total: 0,
          games: [],
          users: [],
          groups: [],
          market_items: [],
        });
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  // Fechar ao clicar fora ou apertar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !query.trim()) return null;

  const hasGames = (results?.games?.length ?? 0) > 0;
  const hasUsers = (results?.users?.length ?? 0) > 0;
  const hasGroups = (results?.groups?.length ?? 0) > 0;
  const hasMarket = (results?.market_items?.length ?? 0) > 0;
  const hasAnyResults = hasGames || hasUsers || hasGroups || hasMarket;

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuito';
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleGameClick = (game: GlobalSearchGameItem) => {
    onClose();
    if (onSelectGame) {
      onSelectGame(game.id);
    } else if (onNavigate) {
      onNavigate('store');
    }
  };

  const handleGroupClick = (group: GlobalSearchGroupItem) => {
    onClose();
    if (onSelectGroup) {
      onSelectGroup(group.id);
    }
    if (onNavigate) {
      onNavigate('social');
    }
  };

  const handleUserClick = (_user: GlobalSearchUserItem) => {
    onClose();
    if (onNavigate) {
      onNavigate('social');
    }
  };

  const handleMarketClick = (_item: GlobalSearchMarketItem) => {
    onClose();
    if (onNavigate) {
      onNavigate('market');
    }
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Resultados da busca global"
      className="absolute left-0 right-0 sm:left-auto sm:right-0 sm:w-96 top-full mt-3 rounded-2xl bg-[#0b0f19]/95 backdrop-blur-xl border border-brand-purple/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-gray-200"
    >
      {/* Cabeçalho do Dropdown */}
      <div className="p-3.5 px-4 bg-brand-surface/80 border-b border-gray-800/80 flex items-center justify-between text-xs">
        <span className="font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-magnifying-glass text-brand-purple"></i>
          Resultados para <span className="text-brand-purple font-bold truncate max-w-[140px]">"{query}"</span>
        </span>
        {loading ? (
          <span className="text-brand-purple text-xs flex items-center gap-1.5 animate-pulse">
            <i className="fa-solid fa-circle-notch fa-spin"></i> Buscando...
          </span>
        ) : (
          <span className="text-[10px] bg-brand-purple/20 text-brand-purple border border-brand-purple/40 px-2 py-0.5 rounded-full font-bold font-mono">
            {results?.total ?? 0} {results?.total === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>

      <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-800/70 p-2.5 space-y-2.5">
        {/* Loading inicial sem resultados */}
        {loading && !results && (
          <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
            <i className="fa-solid fa-circle-notch fa-spin text-xl text-brand-purple"></i>
            <span>Consultando catálogo, jogadores, grupos e mercado...</span>
          </div>
        )}

        {/* Sem resultados */}
        {!loading && results && !hasAnyResults && (
          <div className="p-8 text-center text-gray-400 space-y-2">
            <i className="fa-solid fa-ghost text-3xl text-gray-600"></i>
            <p className="text-xs font-semibold text-gray-300">Nenhum resultado encontrado</p>
            <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
              Não encontramos jogos, usuários, comunidades ou ofertas correspondentes a "{query}".
            </p>
          </div>
        )}

        {/* SEÇÃO 1: JOGOS DA LOJA */}
        {hasGames && (
          <div className="pt-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/20 border border-purple-800/30 rounded-lg flex items-center gap-1.5">
              <i className="fa-solid fa-gamepad text-xs"></i> Jogos da Loja
            </div>
            <div className="space-y-1 mt-1.5">
              {results!.games.map((g) => (
                <button
                  key={`game-${g.id}`}
                  type="button"
                  onClick={() => handleGameClick(g)}
                  className="w-full text-left p-2 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all duration-150 flex items-center gap-3 cursor-pointer group"
                >
                  {g.header_image ? (
                    <img
                      src={g.header_image}
                      alt={g.title}
                      className="w-12 h-7 object-cover rounded-lg border border-gray-800 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-7 bg-brand-card rounded-lg flex items-center justify-center text-gray-500 text-xs shrink-0">
                      <i className="fa-solid fa-gamepad"></i>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-brand-purple transition">
                      {g.title}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{g.category || 'Ação'}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 shrink-0">
                    {formatPrice(g.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SEÇÃO 2: USUÁRIOS & AMIGOS */}
        {hasUsers && (
          <div className="pt-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-950/20 border border-sky-800/30 rounded-lg flex items-center gap-1.5">
              <i className="fa-solid fa-user text-xs"></i> Jogadores & Comunidade
            </div>
            <div className="space-y-1 mt-1.5">
              {results!.users.map((u) => (
                <button
                  key={`user-${u.id}`}
                  type="button"
                  onClick={() => handleUserClick(u)}
                  className="w-full text-left p-2 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all duration-150 flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                    alt={u.username}
                    className="w-8 h-8 rounded-full border border-sky-500/40 shrink-0 bg-brand-surface"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-sky-300 transition">
                      {u.username}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-600/40 shrink-0">
                    Nível {u.level || 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SEÇÃO 3: GRUPOS & FÓRUNS */}
        {hasGroups && (
          <div className="pt-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/20 border border-amber-800/30 rounded-lg flex items-center gap-1.5">
              <i className="fa-solid fa-users text-xs"></i> Grupos & Fóruns
            </div>
            <div className="space-y-1 mt-1.5">
              {results!.groups.map((grp) => (
                <button
                  key={`group-${grp.id}`}
                  type="button"
                  onClick={() => handleGroupClick(grp)}
                  className="w-full text-left p-2 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all duration-150 flex items-center gap-3 cursor-pointer group"
                >
                  {grp.avatar_url ? (
                    <img
                      src={grp.avatar_url}
                      alt={grp.name}
                      className="w-8 h-8 rounded-xl object-cover border border-amber-600/40 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-amber-950/40 border border-amber-600/40 flex items-center justify-center text-amber-400 text-xs shrink-0">
                      <i className="fa-solid fa-users"></i>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition">
                      {grp.name}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {grp.category || 'Geral'} • {grp.members_count} {grp.members_count === 1 ? 'membro' : 'membros'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SEÇÃO 4: MERCADO DA COMUNIDADE */}
        {hasMarket && (
          <div className="pt-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/20 border border-emerald-800/30 rounded-lg flex items-center gap-1.5">
              <i className="fa-solid fa-tags text-xs"></i> Mercado da Comunidade
            </div>
            <div className="space-y-1 mt-1.5">
              {results!.market_items.map((m) => (
                <button
                  key={`market-${m.id}`}
                  type="button"
                  onClick={() => handleMarketClick(m)}
                  className="w-full text-left p-2 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all duration-150 flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-600/40 flex items-center justify-center text-emerald-400 text-xs shrink-0">
                    <i className="fa-solid fa-box-open"></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition">
                      {m.item_name}
                    </p>
                    <p className="text-[10px] text-gray-400 capitalize">{m.item_type}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 shrink-0">
                    {formatPrice(m.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé com dicas de navegação rápida */}
      <div className="p-2.5 px-4 bg-brand-surface/60 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          Pressione <kbd className="px-1.5 py-0.5 bg-gray-800/80 border border-gray-700 rounded text-gray-300 font-mono text-[9px]">ESC</kbd> para fechar
        </span>
        <span className="flex items-center gap-1 text-amber-400/90 font-medium">
          <i className="fa-solid fa-bolt text-xs"></i> Busca Instantânea
        </span>
      </div>
    </div>
  );
};
