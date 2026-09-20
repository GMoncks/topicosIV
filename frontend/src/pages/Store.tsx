import React, { useState } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { GameCard } from '../components/GameCard';
import { GameItem } from '../types';

interface StoreProps {
  searchQuery?: string;
  activeSubTab?: string;
  onSelectGame?: (game: GameItem) => void;
}

export const mockGames: GameItem[] = [
  {
    id: '1',
    title: 'Heavy Duty Expansion',
    publisherOrParent: 'Survivor',
    category: 'EXPANSÃO',
    image: 'https://placehold.co/400x200/1e3a8a/fff?text=Survivor+DLC',
    originalPrice: 37.49,
    currentPrice: 29.99,
    discountPercentage: 20
  },
  {
    id: '2',
    title: 'Space Marine 2',
    tags: 'Ação, Violento',
    category: 'DESEJO',
    image: 'https://placehold.co/400x200/0f172a/fff?text=Space+Marine+2',
    currentPrice: 49.97,
    discountPercentage: 75,
    isWishlist: true
  },
  {
    id: '3',
    title: 'Super Character 3-Pack',
    publisherOrParent: 'Devil May Cry 5',
    category: 'PACOTE',
    image: 'https://placehold.co/400x200/4a044e/fff?text=DMC5+Pack',
    currentPrice: 27.20,
    discountPercentage: 20
  },
  {
    id: '4',
    title: 'Meowgic',
    tags: 'Aventura, Gatos',
    category: 'DESEJO',
    image: 'https://placehold.co/400x200/14532d/fff?text=Meowgic',
    currentPrice: 14.87,
    discountPercentage: 38,
    isWishlist: true
  }
];

export const Store: React.FC<StoreProps> = ({
  searchQuery = '',
  activeSubTab = 'destaques',
  onSelectGame
}) => {
  const [games] = useState<GameItem[]>(mockGames);

  const filteredGames = games.filter(game => {
    // Filtro de busca por texto
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = game.title.toLowerCase().includes(q);
      const matchTag = game.tags?.toLowerCase().includes(q);
      const matchPublisher = game.publisherOrParent?.toLowerCase().includes(q);
      if (!matchTitle && !matchTag && !matchPublisher) return false;
    }

    // Filtro por sub-aba
    if (activeSubTab === 'wishlist') {
      return game.category === 'DESEJO' || game.isWishlist;
    }
    if (activeSubTab === 'promotions') {
      return (game.discountPercentage || 0) > 0;
    }

    return true;
  });

  return (
    <main className="p-8 pb-24 max-w-[1600px] mx-auto">
      {/* Hero Imersivo */}
      <HeroBanner onViewOffers={() => alert('Visualizando ofertas da Focus Entertainment!')} />

      {/* Seção Grid de Conteúdo */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          Conteúdo para seus jogos
          <span className="text-xs bg-brand-green/80 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-500/30">
            {filteredGames.length}
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            className="w-8 h-8 rounded-full bg-brand-surface border border-gray-700 hover:border-brand-purple flex items-center justify-center transition text-gray-300 hover:text-white"
            title="Anterior"
          >
            <i className="fa-solid fa-angle-left text-sm"></i>
          </button>
          <button
            className="w-8 h-8 rounded-full bg-brand-surface border border-gray-700 hover:border-brand-purple flex items-center justify-center transition text-gray-300 hover:text-white"
            title="Próximo"
          >
            <i className="fa-solid fa-angle-right text-sm"></i>
          </button>
        </div>
      </div>

      {/* Grid de Cards */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {filteredGames.map(game => (
            <GameCard key={game.id} game={game} onSelect={onSelectGame} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-brand-card/40 rounded-2xl border border-gray-800">
          <i className="fa-solid fa-ghost text-4xl text-gray-600 mb-3"></i>
          <p className="text-gray-400 font-medium">Nenhum título encontrado para "{searchQuery}".</p>
        </div>
      )}
    </main>
  );
};
