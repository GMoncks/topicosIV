import React, { useState, useEffect, useCallback } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { GameCard } from '../components/GameCard';
import { GameItem } from '../types';
import { storeApi, GameApiResponse } from '../api/client';

interface StoreProps {
  searchQuery?: string;
  activeSubTab?: string;
  onSelectGame?: (game: GameItem) => void;
}

/**
 * Mapeia a resposta da API do backend para o tipo GameItem do frontend.
 */
function mapApiToGameItem(apiGame: GameApiResponse): GameItem {
  return {
    id: String(apiGame.id),
    title: apiGame.title,
    category: 'JOGO',
    publisherOrParent: apiGame.publisher,
    tags: apiGame.tags?.join(', '),
    image: apiGame.banner_url || `https://placehold.co/400x200/1e3a8a/fff?text=${encodeURIComponent(apiGame.title)}`,
    currentPrice: apiGame.price,
  };
}

export const Store: React.FC<StoreProps> = ({
  searchQuery = '',
  activeSubTab = 'destaques',
  onSelectGame
}) => {
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = {};

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const apiGames = await storeApi.listGames(params);
      setGames(apiGames.map(mapApiToGameItem));
    } catch (err) {
      console.error('Erro ao carregar jogos:', err);
      setError('Não foi possível carregar o catálogo. Verifique se os serviços estão em execução.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const filteredGames = games.filter(game => {
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
      {loading ? (
        <div className="text-center py-12 bg-brand-card/40 rounded-2xl border border-gray-800">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-brand-purple mb-3"></i>
          <p className="text-gray-400 font-medium">Carregando catálogo...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-brand-card/40 rounded-2xl border border-red-800/40">
          <i className="fa-solid fa-exclamation-triangle text-4xl text-red-400 mb-3"></i>
          <p className="text-red-300 font-medium">{error}</p>
          <button
            onClick={fetchGames}
            className="mt-4 bg-brand-purple hover:bg-brand-purpleDark text-white font-bold py-2 px-6 rounded-xl transition"
          >
            Tentar Novamente
          </button>
        </div>
      ) : filteredGames.length > 0 ? (
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
