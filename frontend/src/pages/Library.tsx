import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { libraryApi, storeApi, LibraryItemResponse } from '../api/client';
import { AchievementsPanel } from '../components/AchievementsPanel';

interface LibraryProps {
  onNavigateToStore?: () => void;
}

export const Library: React.FC<LibraryProps> = ({ onNavigateToStore }) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [items, setItems] = useState<LibraryItemResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);
  const [installFilter, setInstallFilter] = useState<'all' | 'installed' | 'ready'>('all');
  const [downloadingGameIds, setDownloadingGameIds] = useState<Set<number>>(new Set());

  const fetchMyGames = useCallback(async () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
    if (!token && !isAuthenticated) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await libraryApi.getMyGames();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error('Erro ao carregar biblioteca:', err);
      setError('Não foi possível carregar os jogos da sua biblioteca. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchMyGames();
  }, [fetchMyGames]);

  // Listener para sincronizar em tempo real quando um download for concluído pela DownloadBar (E-06)
  useEffect(() => {
    const handleGameInstalled = (e: CustomEvent<{ gameId: number; gameTitle?: string }>) => {
      const { gameId } = e.detail;
      setItems(prevItems =>
        prevItems.map(item => (item.game_id === gameId ? { ...item, is_installed: true } : item))
      );
      setDownloadingGameIds(prev => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });
    };

    window.addEventListener('mist:game-installed' as any, handleGameInstalled);
    return () => {
      window.removeEventListener('mist:game-installed' as any, handleGameInstalled);
    };
  }, []);

  const handleDownload = async (item: LibraryItemResponse) => {
    const gameTitle = item.game?.title || `Jogo #${item.game_id}`;
    try {
      setDownloadingGameIds(prev => new Set(prev).add(item.game_id));

      // 1. Notifica o início de download para acionar o DownloadBar (E-06)
      window.dispatchEvent(
        new CustomEvent('mist:start-download', {
          detail: { gameId: item.game_id, gameTitle }
        })
      );

      // 2. Dispara requisição real para o endpoint de download do pacote .zip
      const blob = await storeApi.downloadGamePackage(item.game_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const slug = gameTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      link.download = `${slug}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar pacote do jogo:', err);
      window.dispatchEvent(
        new CustomEvent('mist:toast', {
          detail: `Erro ao iniciar download de ${gameTitle}. Tente novamente.`
        })
      );
      setDownloadingGameIds(prev => {
        const next = new Set(prev);
        next.delete(item.game_id);
        return next;
      });
    }
  };

  const handlePlay = async (item: LibraryItemResponse) => {
    const gameTitle = item.game?.title || `Jogo #${item.game_id}`;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
    const userId = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_user_id') : null;

    try {
      // 1. Inicia sessão oficial no library-service (E-04)
      await libraryApi.startSession(item.game_id);
    } catch {
      // Falha de rede no backend não impede tentativa local
    }

    // 2. Tenta disparar o jogo nativamente via MIST Local Daemon (127.0.0.1:39090)
    try {
      const daemonRes = await fetch('http://127.0.0.1:39090/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: item.game_id,
          session_token: token || 'local_token',
          user_id: Number(userId) || 1,
          library_api_url: 'http://localhost:8003'
        }),
      });

      if (daemonRes.ok) {
        window.dispatchEvent(
          new CustomEvent('mist:toast', {
            detail: `🎮 "${gameTitle}" aberto no seu computador pelo MIST Daemon!`
          })
        );
        return;
      }
    } catch {
      // Daemon não está em execução em segundo plano
    }

    // 3. Fallback amigável caso o daemon esteja offline
    window.dispatchEvent(
      new CustomEvent('mist:toast', {
        detail: `🎮 Sessão de "${gameTitle}" iniciada! Para abrir o jogo em janela nativa, execute o iniciar_mist_daemon.bat.`
      })
    );
  };


  // Formatação amigável do tempo de jogo em minutos
  const formatPlaytime = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '0 horas jogadas';
    if (minutes < 60) return `${minutes} min jogados`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h jogadas`;
    }
    return `${hours}h ${remainingMinutes}m jogados`;
  };

  // Filtragem em tempo real por busca textual e status de instalação
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const title = item.game?.title?.toLowerCase() || '';
      const developer = item.game?.developer?.toLowerCase() || '';
      const publisher = item.game?.publisher?.toLowerCase() || '';
      const category = item.game?.category?.toLowerCase() || '';
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || title.includes(q) || developer.includes(q) || publisher.includes(q) || category.includes(q);

      if (!matchesSearch) return false;

      if (installFilter === 'installed') return item.is_installed;
      if (installFilter === 'ready') return !item.is_installed;

      return true;
    });
  }, [items, searchQuery, installFilter]);

  const installedCount = useMemo(() => items.filter(i => i.is_installed).length, [items]);
  const readyCount = useMemo(() => items.filter(i => !i.is_installed).length, [items]);

  const toggleAchievements = (gameId: number) => {
    setExpandedGameId(prev => (prev === gameId ? null : gameId));
  };

  // 1. Estado: Usuário Visitante (Não Autenticado)
  if (!isAuthenticated && !loading) {
    return (
      <main className="p-8 pb-24 max-w-[1600px] mx-auto text-white">
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-brand-card/40 rounded-3xl border border-gray-800 shadow-2xl max-w-2xl mx-auto my-12">
          <div className="w-20 h-20 rounded-2xl bg-brand-purple/20 border border-brand-purple/40 text-brand-purple flex items-center justify-center text-4xl mb-6 shadow-[0_0_30px_rgba(160,32,240,0.2)]">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 className="text-3xl font-display font-black text-white mb-3">
            Faça login para ver sua biblioteca
          </h2>
          <p className="text-gray-400 text-sm max-w-md mb-8 leading-relaxed">
            Conecte-se com sua conta MIST para acessar todos os seus jogos adquiridos, acompanhar o progresso de conquistas e gerenciar instalações.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="bg-brand-purple hover:bg-brand-purpleDark text-white font-bold py-3.5 px-8 rounded-xl transition shadow-lg shadow-brand-purple/30 flex items-center gap-2 cursor-pointer text-base"
          >
            <i className="fa-solid fa-arrow-right-to-bracket"></i>
            Entrar na Minha Conta
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 pb-24 max-w-[1600px] mx-auto text-white animate-fade-in">
      {/* Cabeçalho da Biblioteca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white flex items-center gap-3">
            <i className="fa-solid fa-layer-group text-brand-purple"></i>
            Minha Biblioteca
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Seus títulos adquiridos, estatísticas de gameplay e painel de conquistas.
          </p>
        </div>
        
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="bg-brand-purple/20 text-brand-purple border border-brand-purple/30 px-3.5 py-1.5 rounded-xl text-sm font-bold shadow-sm">
              {items.length} {items.length === 1 ? 'Jogo Adquirido' : 'Jogos Adquiridos'}
            </span>
          </div>
        )}
      </div>

      {/* Barra de Filtros e Busca */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-brand-surface/50 border border-gray-800 p-4 rounded-2xl backdrop-blur-sm">
          {/* Busca Rápida */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
            <input
              type="text"
              placeholder="Buscar jogo por título, gênero ou estúdio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-card border border-gray-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-purple transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label="Limpar busca"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            )}
          </div>

          {/* Filtros de Instalação */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInstallFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                installFilter === 'all'
                  ? 'bg-brand-purple text-white shadow-md'
                  : 'bg-brand-card border border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setInstallFilter('installed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                installFilter === 'installed'
                  ? 'bg-brand-green text-white shadow-md'
                  : 'bg-brand-card border border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-circle-check mr-1.5 text-emerald-400"></i>
              Instalados ({installedCount})
            </button>
            <button
              type="button"
              onClick={() => setInstallFilter('ready')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                installFilter === 'ready'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-brand-card border border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-download mr-1.5 text-blue-400"></i>
              Prontos para Baixar ({readyCount})
            </button>
          </div>
        </div>
      )}

      {/* 2. Estado: Carregando (Skeletons) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-brand-card/60 rounded-2xl border border-gray-800 p-5 animate-pulse flex flex-col gap-4">
              <div className="aspect-video bg-gray-800/60 rounded-xl w-full"></div>
              <div className="h-6 bg-gray-800 rounded-lg w-3/4"></div>
              <div className="h-4 bg-gray-800/80 rounded w-1/2"></div>
              <div className="h-10 bg-gray-800/40 rounded-xl mt-2"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* 3. Estado: Erro ao Carregar */
        <div className="text-center py-16 bg-brand-card/40 rounded-3xl border border-red-800/40 p-8 max-w-lg mx-auto">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-4"></i>
          <h3 className="text-xl font-bold text-white mb-2">Erro ao acessar biblioteca</h3>
          <p className="text-red-300 text-sm mb-6">{error}</p>
          <button
            type="button"
            onClick={fetchMyGames}
            className="bg-brand-purple hover:bg-brand-purpleDark text-white font-bold py-2.5 px-6 rounded-xl transition"
          >
            Tentar Novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        /* 4. Estado: Biblioteca Vazia */
        <div className="text-center py-20 px-4 bg-brand-card/30 rounded-3xl border border-gray-800 max-w-2xl mx-auto my-8">
          <div className="w-20 h-20 rounded-2xl bg-gray-800/60 text-gray-500 flex items-center justify-center text-4xl mx-auto mb-6">
            <i className="fa-solid fa-ghost"></i>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sua biblioteca está vazia</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
            Você ainda não possui jogos na sua conta MIST. Explore nosso catálogo para descobrir títulos incríveis, exclusivos e clássicos.
          </p>
          {onNavigateToStore && (
            <button
              type="button"
              onClick={onNavigateToStore}
              className="bg-brand-purple hover:bg-brand-purpleDark text-white font-bold py-3.5 px-8 rounded-xl transition shadow-lg shadow-brand-purple/20 inline-flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-store"></i>
              Explorar a Loja
            </button>
          )}
        </div>
      ) : filteredItems.length === 0 ? (
        /* 5. Estado: Nenhum resultado na busca */
        <div className="text-center py-16 bg-brand-card/30 rounded-2xl border border-gray-800">
          <i className="fa-solid fa-filter-circle-xmark text-4xl text-gray-600 mb-3"></i>
          <p className="text-gray-400 font-medium">Nenhum título encontrado para o filtro aplicado.</p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setInstallFilter('all'); }}
            className="mt-4 text-brand-purple hover:text-purple-400 text-sm font-semibold transition"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        /* 6. Grid de Jogos Populado */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
            const gameTitle = item.game?.title || `Jogo #${item.game_id}`;
            const bannerUrl = item.game?.banner_url || `https://placehold.co/600x340/1f1d2b/a020f0?text=${encodeURIComponent(gameTitle)}`;
            const isMistExclusive = item.game?.publisher === 'MIST Studios';
            const isExpanded = expandedGameId === item.game_id;

            return (
              <div
                key={item.id}
                className="bg-brand-card rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all flex flex-col shadow-lg"
              >
                {/* Banner com Badges Superiores */}
                <div className="relative aspect-video w-full bg-black/60 overflow-hidden shrink-0 group">
                  <img
                    src={bannerUrl}
                    alt={gameTitle}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-transparent to-black/30 pointer-events-none"></div>

                  {/* Badges no Banner */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    {/* Categoria */}
                    {item.game?.category && (
                      <span className="bg-black/60 backdrop-blur-md text-gray-200 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-semibold">
                        {item.game.category}
                      </span>
                    )}

                    {/* Badge de Origem / Publisher */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 backdrop-blur-md ${
                        isMistExclusive
                          ? 'bg-brand-purple/80 text-purple-100 border-purple-400/30 shadow-[0_0_12px_rgba(160,32,240,0.4)]'
                          : 'bg-black/70 text-gray-300 border-gray-600/40'
                      }`}
                    >
                      <i className={isMistExclusive ? 'fa-solid fa-gamepad text-xs' : 'fa-brands fa-steam text-xs'}></i>
                      {item.game?.publisher || 'Steam Imported'}
                    </span>
                  </div>

                  {/* Data de aquisição sutil na base da imagem */}
                  {item.acquired_at && (
                    <div className="absolute bottom-2 left-3 text-[11px] text-gray-400 backdrop-blur-sm bg-black/50 px-2 py-0.5 rounded pointer-events-none">
                      Adquirido em {new Date(item.acquired_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    {/* Developer */}
                    {item.game?.developer && (
                      <div className="text-xs text-gray-400 font-medium mb-1">
                        {item.game.developer}
                      </div>
                    )}
                    
                    {/* Título do Jogo */}
                    <h3 className="font-display font-bold text-xl text-white line-clamp-1" title={gameTitle}>
                      {gameTitle}
                    </h3>

                    {/* Estatísticas: Playtime e Status de Instalação */}
                    <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-gray-800/80">
                      <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                        <i className="fa-regular fa-clock text-brand-purple"></i>
                        {formatPlaytime(item.playtime_minutes)}
                      </span>

                      {item.is_installed ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-check text-xs"></i>
                          Instalado
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium flex items-center gap-1.5">
                          <i className="fa-solid fa-cloud-arrow-down text-xs text-blue-400"></i>
                          Pronto para baixar
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="flex items-center gap-2 pt-2">
                    {/* Botão Jogar / Baixar */}
                    <button
                      type="button"
                      onClick={() => (item.is_installed ? handlePlay(item) : handleDownload(item))}
                      disabled={downloadingGameIds.has(item.game_id)}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                        item.is_installed
                          ? 'bg-brand-green hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                          : downloadingGameIds.has(item.game_id)
                          ? 'bg-brand-purple/40 text-purple-200 cursor-wait border border-brand-purple/50'
                          : 'bg-brand-surface border border-gray-700 hover:border-brand-purple text-gray-200 hover:text-white'
                      }`}
                    >
                      <i className={`fa-solid ${
                        item.is_installed
                          ? 'fa-play'
                          : downloadingGameIds.has(item.game_id)
                          ? 'fa-spinner fa-spin'
                          : 'fa-download'
                      } text-xs`}></i>
                      {item.is_installed
                        ? 'Jogar'
                        : downloadingGameIds.has(item.game_id)
                        ? 'Baixando...'
                        : 'Baixar'}
                    </button>


                    {/* Botão Conquistas */}
                    <button
                      type="button"
                      onClick={() => toggleAchievements(item.game_id)}
                      aria-expanded={isExpanded}
                      aria-label={`Ver conquistas de ${gameTitle}`}
                      className={`py-2.5 px-3.5 rounded-xl font-medium text-sm transition flex items-center gap-1.5 cursor-pointer border ${
                        isExpanded
                          ? 'bg-brand-purple text-white border-brand-purple shadow-md shadow-brand-purple/20'
                          : 'bg-brand-surface border-gray-700 text-gray-300 hover:text-white hover:border-gray-500'
                      }`}
                    >
                      <i className="fa-solid fa-trophy text-xs"></i>
                      <span>Conquistas</span>
                      <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
                    </button>
                  </div>
                </div>

                {/* Painel de Conquistas Expansível (D-05) */}
                {isExpanded && (
                  <div className="border-t border-gray-800 bg-brand-surface/40 animate-fade-in">
                    <AchievementsPanel gameId={item.game_id} gameName={gameTitle} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
