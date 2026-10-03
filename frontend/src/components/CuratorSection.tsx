import React, { useState, useEffect, useCallback } from 'react';
import { GameApiResponse, WishlistAlert, storeApi } from '../api/client';
import { Tooltip } from './Tooltip';

interface CuratorSectionProps {
  onSelectGame: (gameId: number, contextMessage?: string) => void;
  onBuyGame: (game: GameApiResponse) => void;
  ownedGameIds?: Set<number>;
}

type CuratorTab = 'recommended' | 'top_sellers' | 'trending';

export const CuratorSection: React.FC<CuratorSectionProps> = ({
  onSelectGame,
  onBuyGame,
  ownedGameIds = new Set(),
}) => {
  const [activeTab, setActiveTab] = useState<CuratorTab>('recommended');
  const [recommendations, setRecommendations] = useState<GameApiResponse[]>([]);
  const [topSellers, setTopSellers] = useState<GameApiResponse[]>([]);
  const [trending, setTrending] = useState<GameApiResponse[]>([]);
  const [wishlistAlerts, setWishlistAlerts] = useState<WishlistAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [recsData, topData, trendData] = await Promise.all([
        storeApi.getRecommendations(4).catch(() => []),
        storeApi.getTopSellers(4).catch(() => []),
        storeApi.getTrending(4).catch(() => []),
      ]);

      setRecommendations(recsData || []);
      setTopSellers(topData || []);
      setTrending(trendData || []);

      // Busca alertas da wishlist caso autenticado
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
      if (token) {
        try {
          const alerts = await storeApi.getWishlistAlerts();
          setWishlistAlerts(alerts || []);
        } catch {
          setWishlistAlerts([]);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do MIST AI Curator:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lista atual a ser exibida com base na aba ativa
  const currentList =
    activeTab === 'recommended'
      ? recommendations
      : activeTab === 'top_sellers'
      ? topSellers
      : trending;

  if (!loading && currentList.length === 0 && wishlistAlerts.length === 0) {
    return null;
  }

  const primaryAlert = wishlistAlerts.length > 0 && !dismissedAlerts ? wishlistAlerts[0] : null;

  return (
    <section className="mb-12 space-y-6" data-testid="curator-section">
      {/* Banner Inteligente de Promoções da Wishlist (Ticket S-03 & S-04) */}
      {primaryAlert && (
        <div
          data-testid="wishlist-smart-banner"
          className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-r from-amber-950/70 via-brand-card to-brand-surface border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl flex-shrink-0 animate-bounce">
              <i className="fa-solid fa-tag"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Alerta da Wishlist • {primaryAlert.discount_percentage}% OFF
                </span>
                <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                  Economia de R$ {primaryAlert.savings.toFixed(2)}
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-1">
                {primaryAlert.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => onSelectGame(primaryAlert.game_id)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center gap-2 whitespace-nowrap"
            >
              <i className="fa-solid fa-cart-shopping text-xs"></i>
              Aproveitar Oferta (R$ {primaryAlert.current_price.toFixed(2)})
            </button>
            <button
              onClick={() => setDismissedAlerts(true)}
              className="text-gray-400 hover:text-white p-2 rounded-lg transition"
              title="Dispensar alerta"
              aria-label="Dispensar"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* Cabeçalho do Curator com Abas Inteligentes */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2.5">
              <i className="fa-solid fa-wand-magic-sparkles text-brand-purple animate-pulse"></i>
              Recomendado para Você
            </h2>
            <span className="text-[11px] bg-brand-purple/20 text-brand-purpleLight border border-brand-purple/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              <i className="fa-solid fa-robot"></i> MIST Curator AI
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Recomendações e tendências inteligentes baseadas no seu perfil e no ecossistema MIST.
          </p>
        </div>

        {/* Seletor de Abas Dinâmico */}
        <div className="flex items-center gap-2 bg-brand-surface p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTab('recommended')}
            data-testid="tab-curator-recommended"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'recommended'
                ? 'bg-brand-purple text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-sparkles text-[10px]"></i>
            Para Você
          </button>
          <button
            onClick={() => setActiveTab('top_sellers')}
            data-testid="tab-curator-top-sellers"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'top_sellers'
                ? 'bg-brand-purple text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-trophy text-[10px]"></i>
            Top Vendidos
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            data-testid="tab-curator-trending"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'trending'
                ? 'bg-brand-purple text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-fire-flame-curved text-[10px] text-orange-400"></i>
            Em Alta
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-transparent hover:border-gray-700 transition"
            title="Recalcular Recomendações"
            aria-label="Atualizar"
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Grid de Cards do Curator */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-brand-card rounded-2xl border border-gray-800 p-4 animate-pulse space-y-3"
            >
              <div className="w-full h-36 bg-gray-800 rounded-xl"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-12 bg-gray-800 rounded-xl"></div>
              <div className="h-8 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentList.map((game) => {
            const isOwned = ownedGameIds.has(game.id);
            const score = game.recommendation_score || 95;
            const salesCount = (game as any).sales_count;
            const trendingScore = (game as any).trending_score;
            const trendingReason = (game as any).trending_reason;

            // Define a razão e badge de acordo com a aba ativa
            let badgeText = `${score}% afinidade`;
            let badgeClass = 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300';
            let badgeIcon = 'fa-sparkles text-emerald-400';

            if (activeTab === 'top_sellers') {
              badgeText = salesCount !== undefined && salesCount > 0 ? `${salesCount} vendas` : 'Top Seller';
              badgeClass = 'bg-amber-950/80 border-amber-500/40 text-amber-300';
              badgeIcon = 'fa-trophy text-amber-400';
            } else if (activeTab === 'trending') {
              badgeText = trendingScore ? `${trendingScore} pts` : 'Em Alta 🔥';
              badgeClass = 'bg-rose-950/80 border-rose-500/40 text-rose-300';
              badgeIcon = 'fa-fire text-rose-400';
            }

            const reason =
              activeTab === 'trending' && trendingReason
                ? trendingReason
                : game.recommendation_reason ||
                  `Destaque da comunidade MIST na categoria ${game.category}.`;

            return (
              <div
                key={game.id}
                data-testid={`curator-card-${game.id}`}
                className="group relative flex flex-col justify-between bg-brand-card hover:bg-[#1a2333] border border-gray-800/80 hover:border-brand-purple/60 rounded-2xl overflow-visible hover:z-30 transition-all duration-300 shadow-xl hover:shadow-[0_8px_30px_rgba(147,51,234,0.15)] cursor-pointer"
                onClick={() => onSelectGame(game.id, reason)}
              >
                {/* Banner com Overlay */}
                <div className="relative w-full h-40 rounded-t-2xl overflow-hidden bg-brand-surface">
                  <img
                    src={
                      game.banner_url ||
                      `https://placehold.co/400x200/1e3a8a/fff?text=${encodeURIComponent(
                        game.title
                      )}`
                    }
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-transparent to-black/30"></div>

                  {/* Badge de Afinidade / Vendas / Tendência */}
                  <div className="absolute top-3 right-3 z-10">
                    <Tooltip content={`Informação de curadoria: ${badgeText}`} position="bottom" align="right">
                      <div
                        className={`backdrop-blur-md border text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1.5 ${badgeClass}`}
                      >
                        <i className={`fa-solid ${badgeIcon} text-[9px]`}></i>
                        {badgeText}
                      </div>
                    </Tooltip>
                  </div>

                  {/* Categoria */}
                  <div className="absolute bottom-2 left-3 z-10">
                    <Tooltip content={`Categoria: ${game.category}`} position="bottom" align="left">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 bg-brand-purple/40 px-2 py-0.5 rounded-md border border-brand-purple/40">
                        {game.category}
                      </span>
                    </Tooltip>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <Tooltip content={game.title} position="top">
                      <h3 className="text-white font-bold text-base group-hover:text-brand-purple transition truncate mb-2 w-full">
                        {game.title}
                      </h3>
                    </Tooltip>

                    {/* Justificativa Contextual com Tooltip para leitura completa sem clicar no card */}
                    <Tooltip content={reason} position="top">
                      <div
                        data-testid={`curator-reason-${game.id}`}
                        className="w-full p-2.5 bg-brand-dark/80 rounded-xl border border-brand-purple/20 text-[11px] text-gray-300 flex items-start gap-2 mb-4 leading-relaxed cursor-help hover:border-brand-purple/50 transition-colors"
                      >
                        <i className="fa-solid fa-comment-dots text-brand-purple mt-0.5 flex-shrink-0 text-xs"></i>
                        <span className="line-clamp-2">{reason}</span>
                      </div>
                    </Tooltip>
                  </div>

                  {/* Rodapé com Preço e Ação */}
                  <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Preço</span>
                      <span className="text-sm font-bold text-white">
                        {game.price === 0 ? 'Gratuito' : `R$ ${game.price.toFixed(2)}`}
                      </span>
                    </div>

                    {isOwned ? (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                        <i className="fa-solid fa-check mr-1"></i> Na Biblioteca
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuyGame(game);
                        }}
                        className="px-3.5 py-1.5 bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-cart-shopping text-[10px]"></i>
                        Comprar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
