import React, { useState, useEffect, useCallback } from 'react';
import { ugcApi, WorkshopItem, getUgcImageUrl, storeApi, GameApiResponse } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { WorkshopUploadModal } from '../components/WorkshopUploadModal';

const CATEGORIES = ['Todos', 'Mod', 'Skin', 'Mapa', 'Tradução', 'Ferramenta'];

export const Workshop: React.FC = () => {
  const { isAuthenticated, user, openAuthModal } = useAuth();

  const [items, setItems] = useState<WorkshopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [games, setGames] = useState<GameApiResponse[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'downloads' | 'recent' | 'rating'>('popular');
  const [activeTab, setActiveTab] = useState<'explore' | 'subscribed' | 'my_creations'>('explore');
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeDetailItem, setActiveDetailItem] = useState<WorkshopItem | null>(null);
  const [subscribingId, setSubscribingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Carrega lista de jogos para o seletor
  useEffect(() => {
    async function loadGames() {
      try {
        const gameList = await storeApi.listGames();
        setGames(gameList);
      } catch (err) {
        console.error('Falha ao carregar jogos para o Workshop:', err);
      }
    }
    loadGames();
  }, []);

  const loadItems = useCallback(
    async (currentPage = 1) => {
      try {
        setIsLoading(true);
        const data = await ugcApi.getWorkshopItems({
          game_id: selectedGameId,
          category: selectedCategory !== 'Todos' ? selectedCategory : undefined,
          search: searchQuery.trim() || undefined,
          sort_by: sortBy,
          subscribed_only: activeTab === 'subscribed',
          author_id: activeTab === 'my_creations' ? user?.id : undefined,
          page: currentPage,
          size: 12,
        });

        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setPages(data.pages);
      } catch (err) {
        console.error('Falha ao carregar itens do Workshop:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedGameId, selectedCategory, searchQuery, sortBy, activeTab, user?.id]
  );

  useEffect(() => {
    loadItems(1);
  }, [loadItems]);

  const handleSubscribeToggle = async (item: WorkshopItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    if (subscribingId === item.id) return;

    try {
      setSubscribingId(item.id);
      const isSub = item.is_subscribed;
      const res = isSub
        ? await ugcApi.unsubscribeWorkshopItem(item.id)
        : await ugcApi.subscribeWorkshopItem(item.id);

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, is_subscribed: res.subscribed, subscriptions_count: res.subscriptions_count }
            : i
        )
      );

      if (activeDetailItem && activeDetailItem.id === item.id) {
        setActiveDetailItem((prev) =>
          prev ? { ...prev, is_subscribed: res.subscribed, subscriptions_count: res.subscriptions_count } : null
        );
      }
    } catch (err) {
      console.error('Falha ao atualizar inscrição:', err);
    } finally {
      setSubscribingId(null);
    }
  };

  const handleDownload = async (item: WorkshopItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setDownloadingId(item.id);
      const res = await ugcApi.downloadWorkshopItem(item.id);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, downloads_count: res.downloads_count } : i))
      );
      if (activeDetailItem && activeDetailItem.id === item.id) {
        setActiveDetailItem((prev) =>
          prev ? { ...prev, downloads_count: res.downloads_count } : null
        );
      }
      // Inicia download do arquivo
      const downloadUrl = getUgcImageUrl(res.file_url);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', item.filename || 'mod.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Falha ao iniciar download:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta criação do Workshop?')) return;
    try {
      await ugcApi.deleteWorkshopItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setTotal((t) => Math.max(0, t - 1));
      if (activeDetailItem?.id === itemId) {
        setActiveDetailItem(null);
      }
    } catch (err) {
      console.error('Falha ao excluir item:', err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <main className="p-8 pb-24 max-w-[1600px] mx-auto text-white">
      {/* Top Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-8 border border-purple-800/40 bg-gradient-to-r from-purple-950/60 via-zinc-900 to-indigo-950/40 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold uppercase tracking-wider">
              <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
              Oficina da Comunidade MIST
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight">
              Workshop de Mods, Skins e Conteúdo
            </h1>
            <p className="text-sm text-zinc-300">
              Transforme seus jogos favoritos com criações desenvolvidas pela comunidade. Inscreva-se com um clique e baixe pacotes prontos para jogar!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) openAuthModal('login');
                else setIsUploadOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-950/50 transition cursor-pointer text-sm"
            >
              <i className="fa-solid fa-cloud-arrow-up text-base"></i>
              <span>Publicar Minha Criação</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Seletores */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Abas de Navegação Principal do Workshop */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'explore'}
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'explore'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <i className="fa-solid fa-compass text-xs"></i>
            Explorar Criações
          </button>

          {isAuthenticated && (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'subscribed'}
                onClick={() => setActiveTab('subscribed')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'subscribed'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <i className="fa-solid fa-check-circle text-xs text-emerald-400"></i>
                Mods Inscritos
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'my_creations'}
                onClick={() => setActiveTab('my_creations')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'my_creations'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <i className="fa-solid fa-wrench text-xs text-amber-400"></i>
                Minhas Publicações
              </button>
            </>
          )}
        </div>

        {/* Linha de Busca, Seletor de Jogo e Ordenação */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Seletor de Jogo */}
            <select
              aria-label="Filtrar por jogo"
              value={selectedGameId ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setSelectedGameId(val);
              }}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-purple-500 cursor-pointer min-w-[180px]"
            >
              <option value="">Todos os Jogos MIST</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>

            {/* Input de Busca */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-zinc-500 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, descrição ou tag..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Ordenação */}
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setSortBy('popular')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                sortBy === 'popular' ? 'bg-zinc-800 text-purple-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-fire text-xs"></i>
              <span>Mais Populares</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('downloads')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                sortBy === 'downloads' ? 'bg-zinc-800 text-cyan-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-download text-xs"></i>
              <span>Mais Baixados</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                sortBy === 'recent' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <i className="fa-regular fa-clock text-xs"></i>
              <span>Recentes</span>
            </button>
          </div>
        </div>

        {/* Categorias (Pills) */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="text-xs text-zinc-500 ml-auto font-mono">
            {total} {total === 1 ? 'item encontrado' : 'itens encontrados'}
          </span>
        </div>
      </div>

      {/* Grid de Itens do Workshop */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
          <i className="fa-solid fa-spinner animate-spin text-3xl text-purple-400"></i>
          <p className="text-sm">Carregando itens da Oficina...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40 p-8">
          <i className="fa-solid fa-wrench text-5xl text-zinc-600 mb-4"></i>
          <h3 className="text-lg font-bold text-zinc-300">Nenhum item do Workshop encontrado</h3>
          <p className="text-xs text-zinc-500 max-w-md mt-1 mb-6">
            Não foram encontrados mods ou skins correspondentes aos filtros aplicados. Seja o primeiro a criar e compartilhar conteúdo!
          </p>
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) openAuthModal('login');
              else setIsUploadOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
            <span>Publicar Primeira Modificação</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => {
            const previewUrl = item.preview_url ? getUgcImageUrl(item.preview_url) : null;
            return (
              <div
                key={item.id}
                onClick={() => setActiveDetailItem(item)}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/80 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20 transition-all duration-300 cursor-pointer"
              >
                {/* Imagem de Capa do Mod */}
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-950/40 via-zinc-900 to-indigo-950/40 p-4 text-center">
                      <i className="fa-solid fa-wrench text-3xl text-purple-400 mb-2"></i>
                      <span className="text-[11px] font-semibold text-zinc-300 truncate max-w-[90%]">
                        {item.game_title}
                      </span>
                    </div>
                  )}

                  {/* Badge de Categoria */}
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-[10px] font-bold bg-black/75 text-purple-300 rounded-md backdrop-blur border border-purple-500/30">
                    {item.category}
                  </span>

                  {/* Versão */}
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-mono font-semibold bg-black/70 text-zinc-300 rounded backdrop-blur">
                    v{item.version}
                  </span>

                  {/* Badge de Inscrito */}
                  {item.is_subscribed && (
                    <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 text-[10px] font-bold bg-emerald-950/90 text-emerald-300 rounded border border-emerald-600/60 backdrop-blur flex items-center gap-1">
                      <i className="fa-solid fa-check text-[9px]"></i>
                      Inscrito
                    </span>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    {/* Jogo */}
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider line-clamp-1">
                      {item.game_title}
                    </span>
                    {/* Título */}
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1 mt-0.5">
                      {item.title}
                    </h3>
                    {/* Descrição curta */}
                    {item.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[9px] bg-zinc-800 text-zinc-300 rounded-md font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rodapé com Estatísticas & Botão de Inscrição */}
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    {/* Downloads & Inscrições */}
                    <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                      <span className="flex items-center gap-1" title={`${item.downloads_count} downloads`}>
                        <i className="fa-solid fa-download text-zinc-500 text-[10px]"></i>
                        {item.downloads_count}
                      </span>
                      <span className="flex items-center gap-1" title={`${item.subscriptions_count} inscritos`}>
                        <i className="fa-solid fa-users text-zinc-500 text-[10px]"></i>
                        {item.subscriptions_count}
                      </span>
                    </div>

                    {/* Botão Rápido de Toggle de Inscrição */}
                    <button
                      type="button"
                      onClick={(e) => handleSubscribeToggle(item, e)}
                      disabled={subscribingId === item.id}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        item.is_subscribed
                          ? 'bg-zinc-800 text-emerald-400 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800 border border-zinc-700'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                      }`}
                    >
                      <i className={`text-[10px] ${item.is_subscribed ? 'fa-solid fa-check' : 'fa-solid fa-plus'}`}></i>
                      <span>{item.is_subscribed ? 'Inscrito' : 'Inscrever'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => loadItems(page - 1)}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
          >
            Anterior
          </button>
          <span className="text-xs text-zinc-400 font-mono">
            Página {page} de {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => loadItems(page + 1)}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-40 text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Modal de Detalhes do Mod */}
      {activeDetailItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-950 text-purple-300 rounded border border-purple-800">
                  {activeDetailItem.category}
                </span>
                <span className="text-xs font-semibold text-zinc-400 truncate max-w-xs">
                  {activeDetailItem.game_title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailItem(null)}
                aria-label="Fechar modal"
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Banner de Preview */}
              {activeDetailItem.preview_url && (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-800 bg-black/50">
                  <img
                    src={getUgcImageUrl(activeDetailItem.preview_url)}
                    alt={activeDetailItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Título & Criador */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {activeDetailItem.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                    <span>Criado por</span>
                    <span className="text-purple-400 font-semibold">{activeDetailItem.author_name}</span>
                    <span>• Versão {activeDetailItem.version}</span>
                    <span>• {formatFileSize(activeDetailItem.file_size)}</span>
                  </div>
                </div>

                {/* Ações: Download & Inscrição */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleDownload(activeDetailItem, e)}
                    disabled={downloadingId === activeDetailItem.id}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-zinc-700"
                  >
                    <i className="fa-solid fa-download text-xs text-cyan-400"></i>
                    <span>Baixar Arquivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSubscribeToggle(activeDetailItem, e)}
                    disabled={subscribingId === activeDetailItem.id}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-lg ${
                      activeDetailItem.is_subscribed
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 hover:bg-rose-950/80 hover:text-rose-300 hover:border-rose-600'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/40'
                    }`}
                  >
                    <i className={activeDetailItem.is_subscribed ? 'fa-solid fa-check' : 'fa-solid fa-plus'}></i>
                    <span>{activeDetailItem.is_subscribed ? 'Inscrito na Biblioteca' : 'Inscrever-se'}</span>
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div className="bg-zinc-900/60 rounded-xl p-5 border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Descrição e Guia de Uso
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {activeDetailItem.description || 'Nenhuma descrição detalhada fornecida pelo criador.'}
                </p>
              </div>

              {/* Tags */}
              {activeDetailItem.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tags do Conteúdo</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeDetailItem.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-zinc-800/80 text-purple-300 rounded-lg text-xs font-medium border border-zinc-700/60"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Exclusão pelo autor */}
              {user && user.id === activeDetailItem.author_id && (
                <div className="pt-4 border-t border-zinc-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(activeDetailItem.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-semibold border border-rose-800/50 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                    <span>Excluir Publicação</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Publicação */}
      <WorkshopUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(newItem) => {
          setItems((prev) => [newItem, ...prev]);
          setTotal((t) => t + 1);
        }}
        defaultGameId={selectedGameId}
        availableGames={games.map((g) => ({ id: g.id, title: g.title }))}
      />
    </main>
  );
};
