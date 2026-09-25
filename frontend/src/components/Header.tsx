import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  wishlistCount?: number;
  walletBalance: number;
  onSearch?: (query: string) => void;
  activeSubTab?: string;
  onSelectSubTab?: (tab: string) => void;
  isGuest?: boolean;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  wishlistCount = 32,
  walletBalance,
  onSearch,
  activeSubTab = 'destaques',
  onSelectSubTab,
  isGuest = false,
  onOpenAuth
}) => {
  const { openCart, totalCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
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
        {/* Barra de busca */}
        <div className="bg-brand-surface rounded-lg flex items-center px-3 py-1.5 border border-gray-700 focus-within:border-brand-purple transition">
          <i className="fa-solid fa-search text-gray-500 text-sm"></i>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-transparent border-none outline-none text-sm text-white ml-2 w-32 focus:w-48 transition-all"
          />
        </div>

        {/* Saldo da Carteira com a cor secundária #1F4D36 */}
        <div className="text-emerald-300 font-bold text-sm bg-brand-green/90 px-3.5 py-1.5 rounded-lg border border-emerald-600/40 shadow-sm flex items-center gap-1.5">
          <i className="fa-solid fa-wallet text-xs text-emerald-400"></i>
          <span>{formattedBalance}</span>
        </div>

        {isGuest && onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm"
          >
            Iniciar Sessão
          </button>
        )}
      </div>
    </header>
  );
};

