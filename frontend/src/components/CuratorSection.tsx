import React, { useState, useEffect } from 'react';
import { GameApiResponse, storeApi } from '../api/client';

interface CuratorSectionProps {
  onSelectGame: (gameId: number) => void;
  onBuyGame: (game: GameApiResponse) => void;
  ownedGameIds?: Set<number>;
}

export const CuratorSection: React.FC<CuratorSectionProps> = ({
  onSelectGame,
  onBuyGame,
  ownedGameIds = new Set(),
}) => {
  const [recommendations, setRecommendations] = useState<GameApiResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const data = await storeApi.getRecommendations(4);
      setRecommendations(data || []);
    } catch (err) {
      console.warn('Erro ao carregar recomendações do MIST AI Curator:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <section className="mb-12" data-testid="curator-section">
      {/* Cabeçalho do Curator */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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
            Recomendações inteligentes geradas a partir do seu perfil, histórico de biblioteca e tags favoritas.
          </p>
        </div>

        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-brand-surface border border-gray-800 hover:border-brand-purple transition flex items-center gap-1.5"
          title="Recalcular Recomendações"
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
          Atualizar
        </button>
      </div>

      {/* Grid de Recomendações */}
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
          {recommendations.map((game) => {
            const isOwned = ownedGameIds.has(game.id);
            const score = game.recommendation_score || 95;
            const reason =
              game.recommendation_reason ||
              `Destaque da comunidade MIST na categoria ${game.category}.`;

            return (
              <div
                key={game.id}
                data-testid={`curator-card-${game.id}`}
                className="group relative flex flex-col justify-between bg-brand-card hover:bg-[#1a2333] border border-gray-800/80 hover:border-brand-purple/60 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl hover:shadow-[0_8px_30px_rgba(147,51,234,0.15)] cursor-pointer"
                onClick={() => onSelectGame(game.id)}
              >
                {/* Banner com Overlay */}
                <div className="relative w-full h-40 overflow-hidden bg-brand-surface">
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

                  {/* Badge de Afinidade IA */}
                  <div className="absolute top-3 right-3 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                    <i className="fa-solid fa-sparkles text-[9px] text-emerald-400"></i>
                    {score}% afinidade
                  </div>

                  {/* Categoria */}
                  <div className="absolute bottom-2 left-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 bg-brand-purple/40 px-2 py-0.5 rounded-md border border-brand-purple/40">
                      {game.category}
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-bold text-base group-hover:text-brand-purple transition truncate mb-2">
                      {game.title}
                    </h3>

                    {/* Justificativa do AI Curator */}
                    <div className="p-2.5 bg-brand-dark/80 rounded-xl border border-brand-purple/20 text-[11px] text-gray-300 flex items-start gap-2 mb-4 leading-relaxed">
                      <i className="fa-solid fa-comment-dots text-brand-purple mt-0.5 flex-shrink-0 text-xs"></i>
                      <span className="line-clamp-2">{reason}</span>
                    </div>
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
