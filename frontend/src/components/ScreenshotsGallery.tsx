import React, { useState, useEffect, useCallback } from 'react';
import { ugcApi, ScreenshotItem, getUgcImageUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ScreenshotUploadModal } from './ScreenshotUploadModal';

interface ScreenshotsGalleryProps {
  gameId?: number;
  gameTitle?: string;
  userId?: number;
  readOnly?: boolean;
  availableGames?: { id: number; title: string }[];
  className?: string;
}

const ScreenshotImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  gameTitle?: string;
}> = ({ src, alt, className = '', gameTitle = '' }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (hasError || !src) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 p-4 text-center select-none border border-zinc-700/40">
        <i className="fa-solid fa-gamepad text-3xl text-cyan-400/80 mb-2"></i>
        <span className="text-xs font-semibold text-zinc-200 line-clamp-1">{gameTitle || 'Captura MIST'}</span>
        <span className="text-[10px] text-zinc-500 mt-1">Momento da Comunidade</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <i className="fa-solid fa-spinner animate-spin text-zinc-500 text-sm"></i>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
};


export const ScreenshotsGallery: React.FC<ScreenshotsGalleryProps> = ({
  gameId,
  gameTitle,
  userId,
  readOnly = false,
  availableGames = [],
  className = '',
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [isLikingId, setIsLikingId] = useState<number | null>(null);

  // Modal de Upload
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const activeScreenshot = lightboxIndex !== null ? screenshots[lightboxIndex] : null;

  const loadScreenshots = useCallback(
    async (currentPage = 1, currentSort = sortBy) => {
      try {
        setIsLoading(true);
        const data = await ugcApi.getScreenshots({
          game_id: gameId,
          user_id: userId,
          sort_by: currentSort,
          page: currentPage,
          size: 12,
        });
        if (currentPage === 1) {
          setScreenshots(data.items);
        } else {
          setScreenshots((prev) => [...prev, ...data.items]);
        }
        setTotal(data.total);
        setPage(data.page);
        setPages(data.pages);
      } catch (err) {
        console.error('Falha ao carregar capturas de tela:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [gameId, userId, sortBy]
  );

  useEffect(() => {
    loadScreenshots(1, sortBy);
  }, [loadScreenshots, sortBy]);

  // Teclado para o Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : screenshots.length - 1));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < screenshots.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, screenshots.length]);

  const handleLikeToggle = async (item: ScreenshotItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    if (isLikingId === item.id) return;

    try {
      setIsLikingId(item.id);
      const isCurrentlyLiked = item.liked_by_me;
      const res = isCurrentlyLiked
        ? await ugcApi.unlikeScreenshot(item.id)
        : await ugcApi.likeScreenshot(item.id);

      setScreenshots((prev) =>
        prev.map((s) =>
          s.id === item.id
            ? { ...s, liked_by_me: res.liked, likes_count: res.likes_count }
            : s
        )
      );
    } catch (err) {
      console.error('Falha ao atualizar curtida:', err);
    } finally {
      setIsLikingId(null);
    }
  };

  const handleUploadSuccess = (newScreenshot: ScreenshotItem) => {
    if (!gameId || newScreenshot.game_id === gameId) {
      setScreenshots((prev) => [newScreenshot, ...prev]);
      setTotal((t) => t + 1);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Barra de Ações Superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/40 text-cyan-400 border border-cyan-800/50 rounded-xl">
            <i className="fa-solid fa-camera text-base"></i>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Capturas da Comunidade</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                {total}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Momentos épicos registrados pelos jogadores na plataforma MIST
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Ordenação */}
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setSortBy('recent')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                sortBy === 'recent'
                  ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <i className="fa-regular fa-clock text-xs"></i>
              <span>Mais Recentes</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('popular')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                sortBy === 'popular'
                  ? 'bg-zinc-800 text-amber-400 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-fire text-xs"></i>
              <span>Mais Populares</span>
            </button>
          </div>

          {/* Botão de Publicação */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthModal('login');
                } else {
                  setIsUploadOpen(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-950/30 transition cursor-pointer"
            >
              <i className="fa-solid fa-arrow-up-from-bracket text-xs"></i>
              <span>Publicar Captura</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Capturas */}
      {isLoading && screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
          <i className="fa-solid fa-spinner animate-spin text-2xl text-cyan-400"></i>
          <p className="text-sm">Carregando galeria de capturas...</p>
        </div>
      ) : screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-800/80 rounded-2xl bg-zinc-950/30 p-8">
          <i className="fa-solid fa-camera text-4xl text-zinc-600 mb-3"></i>
          <h4 className="text-base font-semibold text-zinc-300">Nenhuma captura de tela compartilhada</h4>
          <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
            Seja o primeiro a imortalizar seus momentos neste jogo e compartilhar com toda a comunidade!
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) openAuthModal('login');
                else setIsUploadOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-cyan-400 rounded-xl transition cursor-pointer"
            >
              <i className="fa-solid fa-arrow-up-from-bracket text-xs"></i>
              <span>Enviar Primeira Captura</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {screenshots.map((item, index) => {
            const rawUrl = getUgcImageUrl(item.file_url || item.image_url);
            const author = item.username || item.user_name || 'Jogador MIST';
            return (
              <div
                key={item.id}
                onClick={() => setLightboxIndex(index)}
                className="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-950/20 transition-all duration-300 cursor-pointer"
              >
                {/* Imagem */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                  <ScreenshotImage
                    src={rawUrl}
                    alt={item.caption || item.game_title || 'Captura de tela'}
                    gameTitle={item.game_title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Overlay gradiente suave */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none" />

                  {/* Badge de Jogo */}
                  {item.game_title && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold bg-black/70 text-cyan-300 rounded backdrop-blur border border-zinc-700/60 max-w-[70%] truncate">
                      {item.game_title}
                    </span>
                  )}

                  {/* Botão de Ampliação */}
                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur">
                    <i className="fa-solid fa-expand text-xs"></i>
                  </div>
                </div>

                {/* Conteúdo Inferior */}
                <div className="p-3 flex flex-col gap-2 flex-1 justify-between bg-zinc-900/90">
                  {item.caption && (
                    <p className="text-xs text-zinc-200 font-medium line-clamp-2" title={item.caption}>
                      {item.caption}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/60">
                    {/* Autor */}
                    <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                      {item.user_avatar ? (
                        <img
                          src={item.user_avatar}
                          alt={author}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-400">
                          <i className="fa-solid fa-user text-[10px]"></i>
                        </div>
                      )}
                      <span className="truncate font-medium text-zinc-300 hover:text-cyan-400">
                        {author}
                      </span>
                    </div>

                    {/* Curtidas */}
                    <button
                      type="button"
                      onClick={(e) => handleLikeToggle(item, e)}
                      aria-label={`${item.liked_by_me ? 'Descurtir' : 'Curtir'} captura de tela`}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition cursor-pointer ${
                        item.liked_by_me
                          ? 'text-rose-400 bg-rose-950/40 hover:bg-rose-950/60'
                          : 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-800'
                      }`}
                    >
                      <i
                        className={`text-xs ${
                          item.liked_by_me ? 'fa-solid fa-heart text-rose-400' : 'fa-regular fa-heart'
                        }`}
                      ></i>
                      <span className="text-xs font-semibold">{item.likes_count}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botão Carregar Mais */}
      {page < pages && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => loadScreenshots(page + 1, sortBy)}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition cursor-pointer"
          >
            {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : null}
            <span>Carregar Mais Capturas</span>
          </button>
        </div>
      )}

      {/* Modal de Upload */}
      <ScreenshotUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
        defaultGameId={gameId}
        defaultGameTitle={gameTitle}
        availableGames={availableGames}
      />

      {/* Visualizador Lightbox Fullscreen */}
      {activeScreenshot && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
        >
          {/* Barra Superior do Lightbox */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-black/40">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">
                {lightboxIndex + 1} de {screenshots.length}
              </span>
              {activeScreenshot.game_title && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-zinc-800/90 text-cyan-400 rounded-md border border-zinc-700/60">
                  {activeScreenshot.game_title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleLikeToggle(activeScreenshot)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                  activeScreenshot.liked_by_me
                    ? 'bg-rose-950/60 border-rose-800 text-rose-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-rose-400'
                }`}
              >
                <i
                  className={`text-sm ${
                    activeScreenshot.liked_by_me ? 'fa-solid fa-heart text-rose-400' : 'fa-regular fa-heart'
                  }`}
                ></i>
                <span>{activeScreenshot.likes_count}</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Fechar visualizador"
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
          </div>

          {/* Área Principal da Imagem com Controles Laterais */}
          <div className="relative flex-1 flex items-center justify-center p-4 select-none">
            {/* Botão Anterior */}
            {screenshots.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : screenshots.length - 1))
                }
                aria-label="Captura anterior"
                className="absolute left-4 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur border border-zinc-800 hover:border-zinc-600 transition cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left text-lg"></i>
              </button>
            )}

            {/* Imagem Central */}
            <div className="relative max-h-[75vh] max-w-[85vw] flex items-center justify-center">
              <ScreenshotImage
                src={getUgcImageUrl(activeScreenshot.file_url || activeScreenshot.image_url)}
                alt={activeScreenshot.caption || activeScreenshot.game_title || 'Captura de tela'}
                gameTitle={activeScreenshot.game_title}
                className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Botão Próximo */}
            {screenshots.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null && prev < screenshots.length - 1 ? prev + 1 : 0
                  )
                }
                aria-label="Próxima captura"
                className="absolute right-4 p-3 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur border border-zinc-800 hover:border-zinc-600 transition cursor-pointer"
              >
                <i className="fa-solid fa-chevron-right text-lg"></i>
              </button>
            )}
          </div>

          {/* Barra Inferior com Metadados */}
          <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1 max-w-2xl">
              {activeScreenshot.caption && (
                <p className="text-sm font-medium text-white">{activeScreenshot.caption}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <i className="fa-solid fa-user text-xs text-cyan-400"></i>
                  {activeScreenshot.username || activeScreenshot.user_name || 'Jogador MIST'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <i className="fa-regular fa-calendar text-xs"></i>
                  {formatDate(activeScreenshot.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
