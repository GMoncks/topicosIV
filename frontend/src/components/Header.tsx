import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { WalletHistoryModal } from './WalletHistoryModal';
import { NotificationsDropdown } from './NotificationsDropdown';
import { GlobalSearchDropdown } from './GlobalSearchDropdown';

interface HeaderProps {
  wishlistCount?: number;
  walletBalance: number;
  onSearch?: (query: string) => void;
  activeSubTab?: string;
  onSelectSubTab?: (tab: string) => void;
  isGuest?: boolean;
  onOpenAuth?: () => void;
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  wishlistCount = 32,
  walletBalance,
  onSearch,
  activeSubTab = 'destaques',
  onSelectSubTab,
  isGuest = false,
  onOpenAuth,
  onNavigate,
}) => {
  const { openCart, totalCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletTopOffset, setWalletTopOffset] = useState<number>(16);
  const walletButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOpenWallet = () => {
      if (!isGuest) {
        if (walletButtonRef.current) {
          const rect = walletButtonRef.current.getBoundingClientRect();
          setWalletTopOffset(rect.top);
        }
        setIsWalletModalOpen(true);
      } else {
        onOpenAuth?.();
      }
    };
    window.addEventListener('mist:open-wallet', handleOpenWallet);
    return () => window.removeEventListener('mist:open-wallet', handleOpenWallet);
  }, [isGuest, onOpenAuth]);

  const handleWalletClick = () => {
    if (isGuest) {
      onOpenAuth?.();
      return;
    }
    if (walletButtonRef.current) {
      const rect = walletButtonRef.current.getBoundingClientRect();
      setWalletTopOffset(rect.top);
    }
    setIsWalletModalOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearchDropdownOpen(Boolean(query.trim()));
    if (onSearch) {
      onSearch(query);
    }
  };

  const formattedBalance = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(walletBalance);

  return (
    <header className="sticky top-0 bg-brand-bg/95 backdrop-blur-md z-40 px-8 py-4 flex justify-between items-center border-b border-gray-800/50">
      <div className="flex items-center gap-5 text-sm font-medium">
        {/* Botão Reativo de Carrinho de Compras no Canto Superior Esquerdo */}
        <button
          type="button"
          onClick={openCart}
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-surface border border-gray-700 hover:border-brand-purple text-gray-300 hover:text-white transition group cursor-pointer shadow-sm"
          title="Abrir Carrinho de Compras"
          aria-label="Abrir Carrinho de Compras"
        >
          <i className="fa-solid fa-cart-shopping text-brand-purple group-hover:scale-110 transition text-sm"></i>
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Carrinho</span>
          {totalCount > 0 && (
            <span className="bg-brand-purple text-white text-[11px] font-black min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center animate-pulse">
              {totalCount}
            </span>
          )}
        </button>

        <div className="h-4 w-px bg-gray-800 hidden sm:block" />

        <button
          onClick={() => onSelectSubTab && onSelectSubTab('destaques')}
          className={`relative transition pb-1 ${
            activeSubTab === 'destaques'
              ? "text-white after:content-[''] after:absolute after:-bottom-4 after:left-0 after:w-full after:h-1 after:bg-brand-purple after:rounded-t-md"
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Destaques
        </button>

        <button
          onClick={() => onSelectSubTab && onSelectSubTab('wishlist')}
          className={`relative transition pb-1 ${
            activeSubTab === 'wishlist'
              ? "text-white after:content-[''] after:absolute after:-bottom-4 after:left-0 after:w-full after:h-1 after:bg-brand-purple after:rounded-t-md"
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Lista de Desejos ({wishlistCount})
        </button>

        <button
          onClick={() => onSelectSubTab && onSelectSubTab('promotions')}
          className={`relative transition pb-1 ${
            activeSubTab === 'promotions'
              ? "text-white after:content-[''] after:absolute after:-bottom-4 after:left-0 after:w-full after:h-1 after:bg-brand-purple after:rounded-t-md"
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Promoções
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Barra de busca com Busca Global Agregada (R-01 a R-05) */}
        <div className="relative">
          <div className="bg-white rounded-lg flex items-center px-3 py-1.5 border border-gray-300 focus-within:border-brand-purple shadow-sm transition">
            <i className="fa-solid fa-search text-gray-500 text-sm"></i>
            <input
              type="text"
              placeholder="Buscar jogos, pessoas, grupos..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchQuery.trim()) setIsSearchDropdownOpen(true);
              }}
              className="bg-transparent border-none outline-none text-sm text-black placeholder-gray-500 ml-2 w-44 focus:w-64 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchDropdownOpen(false);
                  onSearch?.('');
                }}
                className="text-gray-400 hover:text-black ml-1 text-xs cursor-pointer"
                aria-label="Limpar busca"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <GlobalSearchDropdown
            query={searchQuery}
            isOpen={isSearchDropdownOpen}
            onClose={() => setIsSearchDropdownOpen(false)}
            onNavigate={(tab) => {
              setIsSearchDropdownOpen(false);
              onNavigate?.(tab);
            }}
          />
        </div>

        {/* Notificações Push Globais (Q-05, Q-06) */}
        <NotificationsDropdown onNavigate={onNavigate} />

        {/* Saldo da Carteira com a cor secundária #1F4D36 — abre o extrato (T-04) */}
        <button
          ref={walletButtonRef}
          type="button"
          onClick={handleWalletClick}
          title="Ver extrato da carteira"
          aria-label="Ver extrato da carteira"
          className="text-emerald-300 font-bold text-sm bg-brand-green/90 hover:bg-brand-green px-3.5 py-1.5 rounded-lg border border-emerald-600/40 shadow-sm flex items-center gap-1.5 transition cursor-pointer"
        >
          <i className="fa-solid fa-wallet text-xs text-emerald-400"></i>
          <span>{formattedBalance}</span>
        </button>

        {isGuest && onOpenAuth && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="bg-brand-purple hover:bg-purple-600 text-white font-medium text-sm px-4 py-1.5 rounded-lg transition shadow-md"
          >
            Iniciar Sessão
          </button>
        )}
      </div>

      {/* Modal de Extrato da Carteira MIST (T-04) */}
      <WalletHistoryModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        topOffset={walletTopOffset}
      />
    </header>
  );
};
