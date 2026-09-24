import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { GameDetailApiResponse, storeApi } from '../api/client';

interface GameDetailModalProps {
  gameId: number | null;
  onClose: () => void;
  onBuy: (gameId: number, price: number, title: string) => void;
  onWishlistToggle?: (gameId: number, inWishlist: boolean) => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
}

const GameDetailModalComponent: React.FC<GameDetailModalProps> = ({
  gameId,
  onClose,
  onBuy,
  onWishlistToggle,
  isAuthenticated,
  onOpenAuth,
}) => {
  const [game, setGame] = useState<GameDetailApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number>(0);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const hasAuthToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('mist_token');

  // Fecha o modal de detalhes, emite o toast informativo de 5s e abre a tela de autenticação
  const handleUnauthenticatedAction = useCallback(() => {
    onClose();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mist:toast', {
        detail: 'Usuário não autenticado. Realize o login',
      }));
    }
    onOpenAuth();
  }, [onClose, onOpenAuth]);

  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setGame(null);
    setSelectedScreenshotIndex(0);
    setInWishlist(false);

    storeApi.getGameDetails(gameId)
      .then(data => {
        if (isMounted) {
          setGame(data);
          setSelectedScreenshotIndex(0);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError('Não foi possível carregar os detalhes do jogo.');
          console.error(err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
      
    // Consulta a wishlist inicial caso o usuário esteja autenticado
    if (isAuthenticated || hasAuthToken) {
      storeApi.getWishlist().then(items => {
        if (isMounted && Array.isArray(items)) {
          setInWishlist(items.some(i => Number(i.game_id) === Number(gameId)));
        }
      }).catch(err => console.error(err));
    }

    return () => {
      isMounted = false;
    };
  }, [gameId, isAuthenticated, hasAuthToken]);

  // Toggle otimista suave: inverte o estado imediatamente sem alterar layouts ou causar flickering
  const handleWishlistToggle = async () => {
    if (!isAuthenticated && !hasAuthToken) {
      handleUnauthenticatedAction();
      return;
    }
    if (!gameId || wishlistLoading) return;

    const nextState = !inWishlist;
    setInWishlist(nextState);
    if (onWishlistToggle) onWishlistToggle(gameId, nextState);

    try {
      setWishlistLoading(true);
      if (nextState) {
        await storeApi.addToWishlist(gameId);
      } else {
        await storeApi.removeFromWishlist(gameId);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mist:wishlist-updated'));
      }
    } catch (err) {
      console.error('Erro ao atualizar wishlist:', err);
      // Reverte o estado em caso de falha da requisição
      setInWishlist(!nextState);
      if (onWishlistToggle) onWishlistToggle(gameId, !nextState);
    } finally {
      setWishlistLoading(false);
    }
  };

  const screenshots = useMemo(() => {
    return game?.screenshots && game.screenshots.length > 0 ? game.screenshots : [];
  }, [game]);

  const hasPrevScreenshot = selectedScreenshotIndex > 0;
  const hasNextScreenshot = selectedScreenshotIndex < screenshots.length - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setSelectedScreenshotIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight' && screenshots.length > 0) {
        setSelectedScreenshotIndex(prev => (prev < screenshots.length - 1 ? prev + 1 : prev));
      }
    };
    if (gameId) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [gameId, onClose, screenshots.length]);

  if (!gameId) return null;

  const currentScreenshot = screenshots[selectedScreenshotIndex] || game?.banner_url;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-brand-card rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto border border-gray-700 shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão de Fechar com alto z-index */}
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/75 hover:bg-black text-white rounded-full flex items-center justify-center transition-all shadow-xl border border-white/20 hover:scale-105 cursor-pointer"
        >
          <i className="fa-solid fa-xmark text-lg pointer-events-none"></i>
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <i className="fa-solid fa-spinner fa-spin text-4xl text-brand-purple mb-4"></i>
            <p className="text-gray-400">Carregando detalhes...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32">
            <i className="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-4"></i>
            <p className="text-red-300">{error}</p>
            <button 
              type="button"
              onClick={onClose}
              className="mt-6 bg-brand-surface border border-gray-700 px-6 py-2 rounded-lg hover:border-gray-500 transition"
            >
              Voltar
            </button>
          </div>
        ) : game ? (
          <>
            <div className="relative h-64 md:h-80 w-full shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-brand-card/20 to-transparent z-10 pointer-events-none"></div>
              <img 
                src={game.banner_url} 
                alt={game.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 p-8 z-20 w-full flex flex-col md:flex-row md:items-end justify-between gap-6 pointer-events-none">
                <div>
                  <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">{game.title}</h1>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-300 items-center">
                    <span className="bg-brand-surface/80 px-2 py-1 rounded text-white font-medium border border-gray-700">
                      {game.developer}
                    </span>
                    <span className="bg-brand-surface/80 px-2 py-1 rounded text-brand-purple font-medium border border-gray-700">
                      <i className="fa-solid fa-satellite-dish mr-1"></i>
                      {game.publisher}
                    </span>
                    <span>•</span>
                    <span>Lançamento: {new Date(game.release_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Visualizador de Capturas de Tela com Setas Inteligentes */}
                {screenshots.length > 0 && (
                  <div className="space-y-4">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 relative flex items-center justify-center group select-none shadow-inner">
                      <img 
                        src={currentScreenshot} 
                        alt={`Captura de tela ${selectedScreenshotIndex + 1}`} 
                        className="w-full h-full object-contain transition-opacity duration-200"
                      />

                      {/* Seta para a esquerda inteligente: visível apenas se houver foto anterior */}
                      {hasPrevScreenshot && (
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshotIndex(prev => Math.max(0, prev - 1))}
                          aria-label="Foto anterior"
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 hover:bg-black text-white border border-white/20 flex items-center justify-center transition-all shadow-xl hover:scale-110 cursor-pointer z-10"
                        >
                          <i className="fa-solid fa-chevron-left text-sm pointer-events-none"></i>
                        </button>
                      )}

                      {/* Seta para a direita inteligente: visível apenas se houver próxima foto */}
                      {hasNextScreenshot && (
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshotIndex(prev => Math.min(screenshots.length - 1, prev + 1))}
                          aria-label="Próxima foto"
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 hover:bg-black text-white border border-white/20 flex items-center justify-center transition-all shadow-xl hover:scale-110 cursor-pointer z-10"
                        >
                          <i className="fa-solid fa-chevron-right text-sm pointer-events-none"></i>
                        </button>
                      )}

                      {/* Indicador numérico da foto */}
                      {screenshots.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md border border-white/10 pointer-events-none z-10 backdrop-blur-sm">
                          {selectedScreenshotIndex + 1} / {screenshots.length}
                        </div>
                      )}
                    </div>

                    {/* Miniaturas de navegação */}
                    <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                      {screenshots.map((shot, idx) => (
                        <button 
                          key={idx}
                          type="button"
                          onClick={() => setSelectedScreenshotIndex(idx)}
                          className={`shrink-0 h-20 aspect-video rounded-lg overflow-hidden border-2 transition-all snap-start cursor-pointer ${
                            selectedScreenshotIndex === idx 
                              ? 'border-brand-purple ring-2 ring-brand-purple/40 scale-[1.02]' 
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={shot} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-display font-bold text-white mb-4 border-b border-gray-800 pb-2">Sobre este jogo</h3>
                  <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                    <p>{game.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-brand-surface border border-gray-700 rounded-xl p-6 flex flex-col gap-4">
                  <div className="text-3xl font-display font-bold text-white mb-2">
                    {game.price > 0 ? `R$ ${game.price.toFixed(2)}` : 'Gratuito'}
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated && !hasAuthToken) {
                        handleUnauthenticatedAction();
                      } else {
                        onBuy(game.id, game.price, game.title);
                      }
                    }}
                    className="w-full bg-brand-green hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 cursor-pointer"
                  >
                    <i className="fa-solid fa-cart-shopping"></i>
                    {game.price > 0 ? 'Comprar Jogo' : 'Adicionar à Biblioteca'}
                  </button>

                  {/* Botão de Lista de Desejos Suave e Sem Flickering */}
                  <button 
                    type="button"
                    onClick={handleWishlistToggle}
                    className={`w-full border py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium cursor-pointer ${
                      inWishlist 
                        ? 'bg-brand-purple/20 border-brand-purple text-brand-purple hover:bg-brand-purple/30' 
                        : 'bg-brand-surface border-gray-600 text-white hover:border-brand-purple hover:bg-brand-purple/10'
                    }`}
                  >
                    <i className={`${inWishlist ? "fa-solid fa-heart" : "fa-regular fa-heart"} transition-transform duration-200 ${wishlistLoading ? 'animate-pulse' : ''}`}></i>
                    <span>{inWishlist ? 'Na Lista de Desejos' : 'Lista de Desejos'}</span>
                  </button>
                </div>

                <div className="bg-brand-surface border border-gray-700 rounded-xl p-6">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Detalhes</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-400">Categoria</span>
                      <span className="text-white font-medium">{game.category}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Review Score</span>
                      <span className="text-brand-purple font-medium flex items-center gap-1">
                        <i className="fa-solid fa-star text-xs"></i>
                        {game.review_score.toFixed(1)} / 10
                      </span>
                    </li>
                  </ul>
                </div>

                {game.tags && game.tags.length > 0 && (
                  <div className="bg-brand-surface border border-gray-700 rounded-xl p-6">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Gêneros</h4>
                    <div className="flex flex-wrap gap-2">
                      {game.tags.map(tag => (
                        <span key={tag} className="bg-brand-purple/20 text-brand-purple px-3 py-1 rounded-full text-sm font-medium border border-brand-purple/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export const GameDetailModal = React.memo(GameDetailModalComponent);
