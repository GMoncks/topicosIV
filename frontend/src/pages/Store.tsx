import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { GameCard } from '../components/GameCard';
import { PaginationSelector } from '../components/PaginationSelector';
import { GameDetailModal } from '../components/GameDetailModal';
import { CheckoutModal } from '../components/CheckoutModal';
import { GameItem } from '../types';
import { storeApi, libraryApi, GameApiResponse } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface StoreProps {
  searchQuery?: string;
  activeSubTab?: string;
  onNavigateToLibrary?: () => void;
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
  onNavigateToLibrary,
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados reativos de paginação (múltiplos de 4 para grid de 4 colunas)
  const [pageSize, setPageSize] = useState<number>(8);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [ownedGameIds, setOwnedGameIds] = useState<Set<number>>(new Set());

  // Estado para Modal de Checkout Unitário
  const [checkoutGame, setCheckoutGame] = useState<GameItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const fetchOwnedGames = useCallback(async () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
    if (!token) {
      setOwnedGameIds(new Set());
      return;
    }
    try {
      const items = await libraryApi.getMyGames();
      if (Array.isArray(items)) {
        setOwnedGameIds(new Set(items.map(item => Number(item.game_id))));
      }
    } catch (err) {
      console.error('Erro ao buscar jogos da biblioteca:', err);
    }
  }, []);

  const fetchWishlist = useCallback(async () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
    if (!token) {
      setWishlistIds(new Set());
      return;
    }
    try {
      const items = await storeApi.getWishlist();
      if (Array.isArray(items)) {
        setWishlistIds(new Set(items.map(i => Number(i.game_id))));
      }
    } catch (err) {
      console.error('Erro ao buscar lista de desejos:', err);
    }
  }, []);

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

  useEffect(() => {
    fetchWishlist();
    fetchOwnedGames();

    const handleLibraryOrWishlistUpdate = () => {
      fetchWishlist();
      fetchOwnedGames();
    };

    window.addEventListener('mist:wishlist-updated', handleLibraryOrWishlistUpdate);
    return () => {
      window.removeEventListener('mist:wishlist-updated', handleLibraryOrWishlistUpdate);
    };
  }, [fetchWishlist, fetchOwnedGames, isAuthenticated]);

  // Reseta para a página 1 ao alternar filtros ou buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeSubTab]);

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const gameIdNum = Number(game.id);
      const isWishlisted = wishlistIds.has(gameIdNum) || game.isWishlist;
      if (activeSubTab === 'wishlist') {
        return isWishlisted;
      }
      if (activeSubTab === 'promotions') {
        return (game.discountPercentage || 0) > 0;
      }
      return true;
    });
  }, [games, activeSubTab, wishlistIds]);

  // Cálculos reativos de fatiamento
  const totalGames = filteredGames.length;
  const totalPages = Math.max(1, Math.ceil(totalGames / pageSize));

  // Garante que currentPage nunca ultrapasse totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGames.slice(start, start + pageSize);
  }, [filteredGames, currentPage, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleCloseModal = useCallback(() => {
    setSelectedGameId(null);
  }, []);

  const handleBuyGame = useCallback((id: number, price: number, title: string) => {
    const found = games.find(g => Number(g.id) === id);
    if (found) {
      setCheckoutGame(found);
    } else {
      setCheckoutGame({
        id: String(id),
        title,
        category: 'JOGO',
        image: `https://placehold.co/400x200/1e3a8a/fff?text=${encodeURIComponent(title)}`,
        currentPrice: price,
      });
    }
    setIsCheckoutOpen(true);
  }, [games]);

  const handleWishlistToggle = useCallback((gameId: number, inWishlist: boolean) => {
    setWishlistIds(prev => {
      const next = new Set(prev);
      if (inWishlist) {
        next.add(gameId);
      } else {
        next.delete(gameId);
      }
      return next;
    });
  }, []);

  const handleDirectWishlistToggle = useCallback(async (gameId: number, nextState: boolean) => {
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mist:toast', {
          detail: 'Usuário não autenticado. Realize o login',
        }));
      }
      openAuthModal('login');
      return;
    }

    handleWishlistToggle(gameId, nextState);

    try {
      if (nextState) {
        await storeApi.addToWishlist(gameId);
      } else {
        await storeApi.removeFromWishlist(gameId);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mist:wishlist-updated'));
      }
    } catch (err) {
      console.error('Erro ao alternar wishlist no card:', err);
      handleWishlistToggle(gameId, !nextState);
    }
  }, [isAuthenticated, openAuthModal, handleWishlistToggle]);

  return (
    <main className="p-8 pb-24 max-w-[1600px] mx-auto">
      {/* Hero Imersivo */}
      <HeroBanner onViewOffers={() => alert('Visualizando ofertas da Focus Entertainment!')} />

      {/* Seção Grid de Conteúdo e Controles de Paginação */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          Conteúdo para seus jogos
          <span className="text-xs bg-brand-green/80 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-500/30">
            {totalGames}
          </span>
        </h2>

        {/* Controles Reativos de Paginação */}
        <div className="flex items-center gap-4 flex-wrap">
          <PaginationSelector
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            options={[4, 8, 12, 24, 40, 100]}
            disabled={loading || totalGames === 0}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">
              {totalGames > 0 ? `Página ${currentPage} de ${totalPages}` : '0 páginas'}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="w-8 h-8 rounded-full bg-brand-surface border border-gray-700 hover:border-brand-purple flex items-center justify-center transition text-gray-300 hover:text-white disabled:opacity-40 disabled:hover:border-gray-700 disabled:cursor-not-allowed"
              title="Página Anterior"
              aria-label="Página Anterior"
            >
              <i className="fa-solid fa-angle-left text-sm"></i>
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="w-8 h-8 rounded-full bg-brand-surface border border-gray-700 hover:border-brand-purple flex items-center justify-center transition text-gray-300 hover:text-white disabled:opacity-40 disabled:hover:border-gray-700 disabled:cursor-not-allowed"
              title="Próxima Página"
              aria-label="Próxima Página"
            >
              <i className="fa-solid fa-angle-right text-sm"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Cards Paginação Reativa */}
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
      ) : paginatedGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {paginatedGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              isWishlisted={wishlistIds.has(Number(game.id))}
              isOwned={ownedGameIds.has(Number(game.id))}
              onToggleWishlist={handleDirectWishlistToggle}
              onSelect={() => setSelectedGameId(Number(game.id))}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-brand-card/40 rounded-2xl border border-gray-800">
          <i className="fa-solid fa-ghost text-4xl text-gray-600 mb-3"></i>
          <p className="text-gray-400 font-medium">
            {searchQuery.trim()
              ? `Nenhum título encontrado para "${searchQuery}".`
              : 'Nenhum título por aqui.'}
          </p>
        </div>
      )}

      {/* Modal de Detalhes */}
      <GameDetailModal 
        gameId={selectedGameId} 
        onClose={handleCloseModal} 
        onBuy={handleBuyGame}
        onWishlistToggle={handleWishlistToggle}
        isAuthenticated={isAuthenticated}
        isOwned={selectedGameId ? ownedGameIds.has(selectedGameId) : false}
        onOpenAuth={() => openAuthModal('login')}
      />

      {/* Modal de Checkout Unitário ("Comprar agora") */}
      <CheckoutModal
        game={checkoutGame}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onNavigateToLibrary={() => {
          setIsCheckoutOpen(false);
          setSelectedGameId(null);
          if (onNavigateToLibrary) onNavigateToLibrary();
        }}
      />
    </main>
  );
};
