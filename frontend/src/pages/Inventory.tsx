import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InventoryItem, CraftBadgeResponse } from '../types';
import { inventoryApi, cardsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface InventoryProps {
  onNavigateToMarket?: () => void;
  onNavigateToPointsShop?: () => void;
}

type TabType = 'todos' | 'card' | 'emoticon' | 'background' | 'avatar_frame' | 'badge';
type StatusFilter = 'todos' | 'disponivel' | 'equipado' | 'listado';

const GAME_TITLES: Record<number, string> = {
  1: 'Dead Cells',
  2: 'Hollow Knight',
  3: 'Celeste',
  5: 'Cyberpunk 2077',
  8: 'Hades',
  10: 'Elden Ring',
  12: 'The Witcher 3',
  13: "Baldur's Gate 3",
  14: 'MIST Forca',
  15: 'MIST Labirinto',
  16: 'MIST Quiz',
};

export const Inventory: React.FC<InventoryProps> = ({
  onNavigateToMarket,
  onNavigateToPointsShop,
}) => {
  const { updateUserCosmetics, updateUserProfile } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros e busca
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'rarity'>('recent');

  // Item selecionado para inspeção
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Estados de Crafting de Insígnias (Bloco K)
  const [craftingGameId, setCraftingGameId] = useState<number | null>(null);
  const [isCraftingModalOpen, setIsCraftingModalOpen] = useState(false);
  const [isSubmittingCraft, setIsSubmittingCraft] = useState(false);
  const [craftedCelebration, setCraftedCelebration] = useState<CraftBadgeResponse | null>(null);

  // Agrupa cartas por jogo
  const userCards = useMemo(() => items.filter((i) => i.item_type === 'card'), [items]);
  const cardsByGame = useMemo(() => {
    const groups: Record<number, InventoryItem[]> = {};
    userCards.forEach((c) => {
      const gid = c.game_id || 1;
      if (!groups[gid]) groups[gid] = [];
      groups[gid].push(c);
    });
    return groups;
  }, [userCards]);

  const openCraftingModal = (gameId: number) => {
    setCraftingGameId(gameId);
    setIsCraftingModalOpen(true);
  };

  const handleCraftBadge = async () => {
    if (!craftingGameId) return;
    setIsSubmittingCraft(true);
    try {
      const res = await cardsApi.craftBadge(craftingGameId);
      if (res.success) {
        setIsCraftingModalOpen(false);
        setCraftedCelebration(res);
        setFeedbackMessage({ text: res.message, type: 'success' });
        await fetchInventory();
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err?.message || 'Falha ao forjar a insígnia.', type: 'error' });
    } finally {
      setIsSubmittingCraft(false);
    }
  };

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await inventoryApi.getInventory();
      setItems(data.items || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar o inventário.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Limpa feedback toast após 4 segundos
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const handleEquip = async (item: InventoryItem) => {
    if (item.status === 'listado') {
      setFeedbackMessage({
        text: 'Itens anunciados no Mercado da Comunidade não podem ser equipados.',
        type: 'error',
      });
      return;
    }

    setActionLoadingId(item.id);
    try {
      const res = await inventoryApi.equipItem(item.id);
      if (res.success) {
        setFeedbackMessage({ text: res.message, type: 'success' });
        // Atualiza estado local da lista
        setItems((prev) =>
          prev.map((i) => {
            if (i.id === item.id) {
              return { ...i, is_equipped: true, status: 'equipado' };
            }
            if (i.item_type === item.item_type && i.is_equipped) {
              return { ...i, is_equipped: false, status: 'disponivel' };
            }
            return i;
          })
        );
        if (selectedItem?.id === item.id) {
          setSelectedItem({ ...selectedItem, is_equipped: true, status: 'equipado' });
        }
        // Reflete nos cosméticos globais do usuário
        if (updateUserCosmetics) {
          updateUserCosmetics(res.avatar_frame_url, res.profile_background_url);
        }
        if (res.avatar_url && updateUserProfile) {
          updateUserProfile({ avatarUrl: res.avatar_url });
        }
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err?.message || 'Erro ao equipar item.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnequip = async (item: InventoryItem) => {
    setActionLoadingId(item.id);
    try {
      const res = await inventoryApi.unequipItem(item.id);
      if (res.success) {
        setFeedbackMessage({ text: res.message, type: 'success' });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_equipped: false, status: 'disponivel' } : i))
        );
        if (selectedItem?.id === item.id) {
          setSelectedItem({ ...selectedItem, is_equipped: false, status: 'disponivel' });
        }
        if (updateUserCosmetics) {
          updateUserCosmetics(res.avatar_frame_url, res.profile_background_url);
        }
        if (res.avatar_url && updateUserProfile) {
          updateUserProfile({ avatarUrl: res.avatar_url });
        }
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err?.message || 'Erro ao desequipar item.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtragem e ordenação computadas
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de aba
      if (activeTab === 'card' && item.item_type !== 'card') return false;
      if (activeTab === 'emoticon' && item.item_type !== 'emoticon') return false;
      if (activeTab === 'background' && item.item_type !== 'background') return false;
      if (activeTab === 'avatar_frame' && item.item_type !== 'avatar_frame' && item.item_type !== 'avatar') return false;
      if (activeTab === 'badge' && item.item_type !== 'badge') return false;

      // Filtro de status
      if (statusFilter !== 'todos' && item.status !== statusFilter) return false;

      // Busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rarity') {
        const order: Record<string, number> = { Lendário: 4, Épico: 3, Raro: 2, Comum: 1 };
        const rA = order[a.rarity || 'Comum'] || 0;
        const rB = order[b.rarity || 'Comum'] || 0;
        return rB - rA;
      }
      return new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime();
    });
  }, [items, activeTab, statusFilter, searchQuery, sortBy]);

  // Contadores por aba
  const counts = useMemo(() => {
    return {
      todos: items.length,
      card: items.filter((i) => i.item_type === 'card').length,
      emoticon: items.filter((i) => i.item_type === 'emoticon').length,
      background: items.filter((i) => i.item_type === 'background').length,
      avatar_frame: items.filter((i) => i.item_type === 'avatar_frame' || i.item_type === 'avatar').length,
      badge: items.filter((i) => i.item_type === 'badge').length,
    };
  }, [items]);

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case 'card':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Carta</span>;
      case 'emoticon':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">Emoticon</span>;
      case 'background':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Plano de Fundo</span>;
      case 'avatar_frame':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Moldura</span>;
      case 'avatar':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Avatar</span>;
      case 'badge':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">Insígnia</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-gray-700 text-gray-300">{type}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'equipado':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-brand-purple/30 text-brand-purple border border-brand-purple flex items-center gap-1">
            <i className="fa-solid fa-check text-[10px]"></i> Equipado
          </span>
        );
      case 'listado':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
            <i className="fa-solid fa-store text-[10px]"></i> No Mercado
          </span>
        );
      case 'disponivel':
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-800 text-gray-300 border border-gray-700">
            Disponível
          </span>
        );
    }
  };

  const isEquippableType = (type: string) => {
    return ['avatar_frame', 'avatar', 'background'].includes(type);
  };

  return (
    <div className="flex-1 bg-brand-dark min-h-screen text-white p-6 lg:p-8" data-testid="inventory-page">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          data-testid="inventory-toast"
          className={`fixed top-20 right-8 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : 'bg-red-950/90 border-red-500 text-red-200'
          }`}
        >
          <i className={`fa-solid ${feedbackMessage.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-red-400'}`}></i>
          <span className="text-sm font-medium">{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="ml-2 opacity-60 hover:opacity-100">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Cabeçalho do Inventário */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple text-2xl shadow-[0_0_15px_rgba(160,32,240,0.3)]">
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-black tracking-wide text-white">
                Inventário da Comunidade
              </h1>
              <p className="text-sm text-gray-400">
                Gerencie suas cartas colecionáveis, cosméticos de perfil, emoticons e insígnias.
              </p>
            </div>
          </div>
        </div>

        {/* CTAs rápidos */}
        <div className="flex items-center gap-3">
          {onNavigateToPointsShop && (
            <button
              onClick={onNavigateToPointsShop}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition flex items-center gap-2 border border-gray-700"
            >
              <i className="fa-solid fa-shapes text-brand-purple"></i>
              Loja de Pontos
            </button>
          )}
          {onNavigateToMarket && (
            <button
              onClick={onNavigateToMarket}
              className="px-4 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold transition flex items-center gap-2 shadow-[0_0_12px_rgba(160,32,240,0.4)]"
            >
              <i className="fa-solid fa-store"></i>
              Mercado da Comunidade
            </button>
          )}
        </div>
      </div>

      {/* Abas por Categoria */}
      <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none" data-testid="inventory-tabs">
        <button
          onClick={() => setActiveTab('todos')}
          data-testid="tab-todos"
          className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition flex items-center gap-2 ${
            activeTab === 'todos'
              ? 'bg-brand-purple text-white shadow-[0_0_10px_rgba(160,32,240,0.4)]'
              : 'bg-brand-surface text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <i className="fa-solid fa-border-all"></i>
          Todos ({counts.todos})
        </button>

        <button
          onClick={() => setActiveTab('card')}
          data-testid="tab-cards"
          className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition flex items-center gap-2 ${
            activeTab === 'card'
              ? 'bg-brand-purple text-white shadow-[0_0_10px_rgba(160,32,240,0.4)]'
              : 'bg-brand-surface text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <i className="fa-solid fa-clone text-amber-400"></i>
          Cartas ({counts.card})
        </button>

        <button
          onClick={() => setActiveTab('emoticon')}
          data-testid="tab-emoticons"
          className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition flex items-center gap-2 ${
            activeTab === 'emoticon'
              ? 'bg-brand-purple text-white shadow-[0_0_10px_rgba(160,32,240,0.4)]'
              : 'bg-brand-surface text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <i className="fa-regular fa-face-smile text-sky-400"></i>
          Emoticons ({counts.emoticon})
        </button>

        <button
          onClick={() => setActiveTab('background')}
          data-testid="tab-backgrounds"
          className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition flex items-center gap-2 ${
            activeTab === 'background'
              ? 'bg-brand-purple text-white shadow-[0_0_10px_rgba(160,32,240,0.4)]'
              : 'bg-brand-surface text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <i className="fa-solid fa-image text-emerald-400"></i>
          Planos de Fundo ({counts.background})
        </button>

        <button
          onClick={() => setActiveTab('avatar_frame')}
          data-testid="tab-avatar-frames"
          className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition flex items-center gap-2 ${
            activeTab === 'avatar_frame'
              ? 'bg-brand-purple text-white shadow-[0_0_10px_rgba(160,32,240,0.4)]'
              : 'bg-brand-surface text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <i className="fa-solid fa-circle-user text-purple-400"></i>
          Avatares e Molduras ({counts.avatar_frame})
        </button>

        <button
          onClick={() => setActiveTab('badge')}
          data-testid="tab-badges"
          className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition flex items-center gap-2 ${
            activeTab === 'badge'
              ? 'bg-brand-purple text-white shadow-[0_0_10px_rgba(160,32,240,0.4)]'
              : 'bg-brand-surface text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <i className="fa-solid fa-award text-pink-400"></i>
          Insígnias ({counts.badge})
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-2 mb-6 p-4 rounded-2xl bg-brand-surface border border-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca por texto */}
          <div className="relative min-w-[240px] max-w-xs">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Buscar item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="inventory-search-input"
              className="w-full bg-brand-dark border border-gray-700 focus:border-brand-purple rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-1 bg-brand-dark p-1 rounded-xl border border-gray-700" data-testid="status-filters">
            <button
              onClick={() => setStatusFilter('todos')}
              data-testid="filter-status-todos"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'todos' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('disponivel')}
              data-testid="filter-status-disponivel"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'disponivel' ? 'bg-gray-700 text-emerald-300' : 'text-gray-400 hover:text-white'
              }`}
            >
              Disponíveis
            </button>
            <button
              onClick={() => setStatusFilter('equipado')}
              data-testid="filter-status-equipado"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'equipado' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Equipados
            </button>
            <button
              onClick={() => setStatusFilter('listado')}
              data-testid="filter-status-listado"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'listado' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              No Mercado
            </button>
          </div>
        </div>

        {/* Ordenação */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            data-testid="inventory-sort-select"
            className="bg-brand-dark border border-gray-700 text-gray-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple"
          >
            <option value="recent">Mais Recentes</option>
            <option value="name">Nome (A-Z)</option>
            <option value="rarity">Raridade</option>
          </select>
        </div>
      </div>

      {/* Banner de Crafting de Insígnias (Bloco K) */}
      {activeTab === 'card' && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-brand-surface to-indigo-950/40 border border-purple-500/30 shadow-xl" data-testid="crafting-banner">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-2xl shadow">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-white">Forja de Insígnias MIST</h3>
                <p className="text-xs text-gray-400">
                  Complete o set de cartas colecionáveis de um jogo para forjar uma Insígnia exclusiva e ganhar +100 XP!
                </p>
              </div>
            </div>
          </div>

          {/* Sets por jogo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4 pt-4 border-t border-gray-800/80">
            {Object.keys(cardsByGame).length === 0 ? (
              <div className="col-span-full py-4 text-center text-gray-500 text-xs">
                Você ainda não possui cartas colecionáveis. Jogue títulos da sua biblioteca para dropar cartas automaticamente!
              </div>
            ) : (
              Object.entries(cardsByGame).map(([gidStr, gameCards]) => {
                const gid = Number(gidStr);
                const gTitle = GAME_TITLES[gid] || `Jogo #${gid}`;
                const availableCards = gameCards.filter((c) => c.status === 'disponivel');
                const isComplete = availableCards.length >= 3;

                return (
                  <div
                    key={gid}
                    className="p-3.5 rounded-xl bg-brand-card/90 border border-gray-700/60 hover:border-purple-500/50 transition flex items-center justify-between gap-3"
                    data-testid={`card-set-${gid}`}
                  >
                    <div>
                      <h4 className="font-bold text-sm text-white">{gTitle}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            isComplete
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                              : 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}
                        >
                          {availableCards.length}/3 Cartas {isComplete ? '— Set Completo!' : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => openCraftingModal(gid)}
                      disabled={!isComplete}
                      data-testid={`btn-craft-badge-${gid}`}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                        isComplete
                          ? 'bg-brand-purple hover:bg-brand-purpleDark text-white shadow-[0_0_12px_rgba(160,32,240,0.5)] cursor-pointer'
                          : 'bg-gray-800/60 text-gray-500 border border-gray-700/40 cursor-not-allowed'
                      }`}
                    >
                      <i className="fa-solid fa-hammer"></i>
                      <span>Forjar Insígnia</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4" data-testid="inventory-loading">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-64 rounded-2xl bg-brand-surface animate-pulse border border-gray-800"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-brand-surface rounded-2xl border border-red-500/30">
          <i className="fa-solid fa-triangle-exclamation text-3xl text-red-400 mb-2"></i>
          <p className="text-sm text-red-300 font-semibold">{error}</p>
          <button
            onClick={fetchInventory}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition"
          >
            Tentar Novamente
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-brand-surface rounded-2xl border border-gray-800" data-testid="inventory-empty">
          <div className="w-16 h-16 rounded-full bg-gray-800/80 mx-auto flex items-center justify-center text-gray-500 text-2xl mb-3">
            <i className="fa-solid fa-box-open"></i>
          </div>
          <h3 className="text-base font-bold text-gray-200">Nenhum item encontrado</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
            Não há itens correspondentes aos filtros selecionados. Visite a Loja de Pontos ou o Mercado da Comunidade para adquirir novos cosméticos e cartas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4" data-testid="inventory-grid">
          {filteredItems.map((item) => {
            const isEquipped = item.is_equipped || item.status === 'equipado';
            const isListed = item.status === 'listado';
            const equippable = isEquippableType(item.item_type);

            return (
              <div
                key={item.id}
                data-testid={`inventory-card-${item.id}`}
                onClick={() => setSelectedItem(item)}
                className={`group relative rounded-2xl bg-brand-surface border p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${
                  isEquipped
                    ? 'border-brand-purple shadow-[0_0_15px_rgba(160,32,240,0.25)] ring-1 ring-brand-purple'
                    : isListed
                    ? 'border-amber-500/40 hover:border-amber-500'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Badges superiores */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  {getItemTypeBadge(item.item_type)}
                  {getStatusBadge(item.status)}
                </div>

                {/* Imagem / Preview do Asset */}
                <div className="relative aspect-square w-full rounded-xl bg-brand-dark/80 flex items-center justify-center overflow-hidden my-1 border border-gray-800 group-hover:border-gray-700 transition">
                  <img
                    src={item.asset_url}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {/* Overlay gradiente */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                    <span className="text-[11px] font-bold text-brand-purple bg-brand-dark/90 px-2 py-0.5 rounded-lg border border-brand-purple/40">
                      Ver Detalhes
                    </span>
                  </div>
                </div>

                {/* Informações textuais */}
                <div className="mt-2">
                  <h4 className="text-xs font-bold text-white truncate" title={item.name}>
                    {item.name}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                    <span className="truncate">{item.rarity || 'Comum'}</span>
                    {item.price_points > 0 && (
                      <span className="text-brand-purple font-semibold">{item.price_points} pts</span>
                    )}
                  </div>
                </div>

                {/* Ação rápida */}
                <div className="mt-3 pt-2 border-t border-gray-800/80">
                  {isListed ? (
                    <button
                      disabled
                      className="w-full py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold cursor-not-allowed border border-amber-500/20"
                      title="Item está anunciado no Mercado"
                    >
                      <i className="fa-solid fa-lock text-[10px] mr-1"></i> No Mercado
                    </button>
                  ) : equippable ? (
                    isEquipped ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnequip(item);
                        }}
                        disabled={actionLoadingId === item.id}
                        data-testid={`btn-unequip-${item.id}`}
                        className="w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition border border-gray-700 flex items-center justify-center gap-1"
                      >
                        {actionLoadingId === item.id ? (
                          <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                        ) : (
                          <>
                            <i className="fa-solid fa-xmark text-xs text-red-400"></i> Desequipar
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquip(item);
                        }}
                        disabled={actionLoadingId === item.id}
                        data-testid={`btn-equip-${item.id}`}
                        className="w-full py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold transition shadow-[0_0_8px_rgba(160,32,240,0.3)] flex items-center justify-center gap-1"
                      >
                        {actionLoadingId === item.id ? (
                          <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                        ) : (
                          <>
                            <i className="fa-solid fa-check text-xs"></i> Equipar
                          </>
                        )}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                      className="w-full py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 text-gray-300 text-xs font-semibold transition border border-gray-700/60"
                    >
                      Inspecionar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Painel de Inspeção do Item */}
      {selectedItem && (
        <div
          data-testid="item-detail-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-brand-surface border border-gray-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedItem(null)}
              data-testid="btn-close-modal"
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {/* Cabeçalho do item no modal */}
            <div className="flex items-center gap-2 mb-4">
              {getItemTypeBadge(selectedItem.item_type)}
              {getStatusBadge(selectedItem.status)}
              <span className="text-xs text-gray-400">Raridade: <strong className="text-white">{selectedItem.rarity || 'Comum'}</strong></span>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* Imagem Ampliada */}
              <div className="w-48 h-48 rounded-2xl bg-brand-dark border border-gray-800 flex items-center justify-center p-4 shrink-0 overflow-hidden shadow-inner">
                <img
                  src={selectedItem.asset_url}
                  alt={selectedItem.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Informações Detalhadas */}
              <div className="flex-1 w-full space-y-3">
                <h3 className="text-lg font-bold text-white font-display">
                  {selectedItem.name}
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {selectedItem.description || 'Item colecionável do ecossistema de jogos da plataforma MIST.'}
                </p>

                <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-800">
                  <p>Adquirido em: <span className="text-gray-200">{new Date(selectedItem.acquired_at).toLocaleDateString('pt-BR')}</span></p>
                  {selectedItem.game_id && (
                    <p>Jogo ID: <span className="text-brand-purple font-semibold">#{selectedItem.game_id}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Barra de Ações do Modal */}
            <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
              {selectedItem.status === 'listado' ? (
                <div className="text-xs text-amber-400 flex items-center gap-2 font-medium">
                  <i className="fa-solid fa-lock"></i>
                  Anunciado no Mercado. Cancele o anúncio para gerenciar.
                </div>
              ) : isEquippableType(selectedItem.item_type) ? (
                selectedItem.is_equipped || selectedItem.status === 'equipado' ? (
                  <button
                    onClick={() => handleUnequip(selectedItem)}
                    disabled={actionLoadingId === selectedItem.id}
                    data-testid="modal-btn-unequip"
                    className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition border border-gray-700 flex items-center gap-2"
                  >
                    {actionLoadingId === selectedItem.id ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <>
                        <i className="fa-solid fa-xmark text-red-400"></i> Desequipar do Perfil
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleEquip(selectedItem)}
                    disabled={actionLoadingId === selectedItem.id}
                    data-testid="modal-btn-equip"
                    className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold transition shadow-[0_0_12px_rgba(160,32,240,0.4)] flex items-center gap-2"
                  >
                    {actionLoadingId === selectedItem.id ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i> Equipar no Perfil
                      </>
                    )}
                  </button>
                )
              ) : null}

              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Forja de Insígnia (Bloco K) */}
      {isCraftingModalOpen && craftingGameId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" data-testid="crafting-modal">
          <div className="bg-brand-surface border border-purple-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple text-lg shadow">
                  <i className="fa-solid fa-hammer"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Forjar Insígnia MIST
                  </h3>
                  <p className="text-xs text-gray-400">
                    {GAME_TITLES[craftingGameId] || `Jogo #${craftingGameId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCraftingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-800/80 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="my-5 space-y-4">
              <div className="p-4 rounded-2xl bg-brand-card/90 border border-gray-700/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">Recompensa da Forja:</h4>
                  <p className="text-xs text-amber-400 font-semibold mt-0.5">+100 Pontos de Experiência (XP)</p>
                  <p className="text-[11px] text-gray-400">1x Insígnia de Colecionador para seu Perfil</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-xl shadow">
                  <i className="fa-solid fa-medal"></i>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-300 mb-2">Cartas consumidas na forja:</p>
                <div className="grid grid-cols-3 gap-2">
                  {(cardsByGame[craftingGameId] || []).filter(c => c.status === 'disponivel').slice(0, 3).map((card, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-brand-card border border-gray-700/60 text-center">
                      <img src={card.asset_url} alt={card.name} className="w-full h-16 object-cover rounded-lg mb-1" />
                      <p className="text-[10px] text-white font-bold truncate">{card.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-xs text-purple-200">
                <i className="fa-solid fa-circle-info mr-1 text-brand-purple"></i>
                As cartas consumidas serão permanentemente removidas do seu inventário para conceder a insígnia.
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCraftingModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCraftBadge}
                disabled={isSubmittingCraft}
                data-testid="confirm-craft-btn"
                className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold transition shadow-[0_0_15px_rgba(160,32,240,0.5)] flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingCraft ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Forjando...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles"></i> Confirmar Forja (+100 XP)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Celebratório de Sucesso (Bloco K) */}
      {craftedCelebration && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" data-testid="celebration-modal">
          <div className="bg-brand-surface border border-amber-500/60 rounded-3xl max-w-md w-full p-6 text-center shadow-[0_0_30px_rgba(251,191,36,0.25)] relative">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)] mb-4">
              <i className="fa-solid fa-medal"></i>
            </div>
            <h3 className="font-display font-black text-2xl text-white">
              Insígnia Forjada!
            </h3>
            <p className="text-sm text-gray-300 font-semibold mt-1">
              {craftedCelebration.badge.name}
            </p>
            <p className="text-xs text-gray-400 mt-2 px-4">
              {craftedCelebration.message}
            </p>

            <div className="my-5 p-4 rounded-2xl bg-brand-card/90 border border-gray-700/60 flex items-center justify-around">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">XP Ganho</span>
                <span className="text-lg font-black text-amber-400">+{craftedCelebration.xp_gained} XP</span>
              </div>
              <div className="h-8 w-px bg-gray-700"></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Novo Nível</span>
                <span className="text-lg font-black text-brand-purple">Nível {craftedCelebration.new_level}</span>
              </div>
            </div>

            <button
              onClick={() => setCraftedCelebration(null)}
              data-testid="close-celebration-btn"
              className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold transition shadow-[0_0_15px_rgba(160,32,240,0.5)]"
            >
              Sensacional! Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
