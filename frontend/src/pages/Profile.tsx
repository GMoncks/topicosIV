import React, { useState, useEffect } from 'react';
import { UserProfile, GameActivity, InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { profileApi, libraryApi, socialApi, LibraryItemResponse, ActivityItem, ugcApi, WorkshopItem, getUgcImageUrl } from '../api/client';

interface ProfileProps {
  user?: UserProfile;
  onNavigate?: (tab: string) => void;
}

interface GameProgressItem {
  id: number;
  gameId: number;
  title: string;
  bannerUrl: string;
  playtimeMinutes: number;
  lastPlayed: string | null;
  achievementsUnlocked: number;
  achievementsTotal: number;
  unlockedList: { id: string; name: string; iconUrl?: string }[];
}

const defaultFallbackRecentGames: GameActivity[] = [
  {
    id: 'g1',
    title: 'Librarian: Tidy Up the Arcane Library!',
    banner: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=600&q=80',
    hoursPlayed: 15.7,
    lastPlayed: '30 de ago.',
    achievementsEarned: 4,
    achievementsTotal: 12,
    achievementIcons: ['fa-book', 'fa-wand-magic-sparkles', 'fa-scroll', 'fa-feather']
  },
  {
    id: 'g2',
    title: 'Marvel Rivals',
    banner: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
    hoursPlayed: 368,
    lastPlayed: '30 de ago.',
    achievementsEarned: 28,
    achievementsTotal: 49,
    achievementIcons: ['fa-shield-halved', 'fa-bolt', 'fa-fist-raised', 'fa-mask'],
    extraAchievementsCount: 23
  },
  {
    id: 'g3',
    title: 'Subnautica',
    banner: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    hoursPlayed: 84.2,
    lastPlayed: '24 de ago.',
    achievementsEarned: 17,
    achievementsTotal: 17,
    achievementIcons: ['fa-water', 'fa-compass', 'fa-anchor', 'fa-fish']
  }
];

export const Profile: React.FC<ProfileProps> = ({ user: propUser, onNavigate }) => {
  const { user: authUser, updateUserCosmetics, isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState<'activity' | 'inventory' | 'games'>('activity');
  const [inventoryCategory, setInventoryCategory] = useState<string>('todos');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(false);
  const [equippingId, setEquippingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Estados da Oficina (Ticket O-06)
  const [userWorkshopItems, setUserWorkshopItems] = useState<WorkshopItem[]>([]);
  const [workshopTotal, setWorkshopTotal] = useState<number>(propUser?.stats?.workshopCount ?? 0);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [isLoadingWorkshop, setIsLoadingWorkshop] = useState(false);

  // Estados Inteligentes de Jogos e Atividade Recente
  const [libraryGames, setLibraryGames] = useState<LibraryItemResponse[]>([]);
  const [gamesProgress, setGamesProgress] = useState<GameProgressItem[]>([]);
  const [userActivities, setUserActivities] = useState<ActivityItem[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState<boolean>(false);

  const currentUser = authUser || propUser || {
    username: 'ggtorres2001',
    realName: 'Gabriel Torres',
    location: 'Rio Grande do Sul, Brazil',
    level: 7,
    avatarText: 'GG',
    avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80',
    avatarFrameUrl: undefined,
    profileBackgroundUrl: undefined,
    status: 'Online' as const,
    walletBalance: 200.0,
    pointsBalance: 500,
    featuredBadge: {
      title: 'Acumulador Adepto',
      xp: 190,
      icon: 'fa-certificate'
    },
    recentPlaytimeWeeks: 8.7,
    recentGames: defaultFallbackRecentGames,
    badges: [],
    stats: {
      gamesCount: 0,
      inventoryCount: 0,
      screenshotsCount: 18,
      videosCount: 3,
      workshopCount: 1,
      reviewsCount: 12
    }
  };

  useEffect(() => {
    async function loadUserWorkshop() {
      const targetId = currentUser.id || propUser?.id || authUser?.id;
      if (targetId) {
        try {
          setIsLoadingWorkshop(true);
          const data = await ugcApi.getWorkshopItems({ author_id: targetId, size: 20 });
          setUserWorkshopItems(data.items);
          setWorkshopTotal(data.total);
        } catch (err) {
          console.error('Falha ao buscar itens da oficina do perfil:', err);
        } finally {
          setIsLoadingWorkshop(false);
        }
      } else if (currentUser.stats?.workshopCount !== undefined) {
        setWorkshopTotal(currentUser.stats.workshopCount);
      }
    }
    loadUserWorkshop();
  }, [currentUser.id, propUser?.id, authUser?.id]);

  const totalDownloads = userWorkshopItems.reduce((acc, curr) => acc + (curr.downloads_count || 0), 0);
  const totalSubscriptions = userWorkshopItems.reduce((acc, curr) => acc + (curr.subscriptions_count || 0), 0);

  const profileData = currentUser;

  // Carrega inventário de cosméticos
  const loadInventory = async () => {
    setIsLoadingInventory(true);
    try {
      const data = await profileApi.getInventory();
      if (data && Array.isArray(data.items)) {
        setInventoryItems(data.items);
      }
    } catch {
      // Degradação graciosa
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Carrega biblioteca de jogos reais e suas conquistas
  const loadLibraryAndGames = async () => {
    setIsLoadingGames(true);
    try {
      const myGames = await libraryApi.getMyGames();
      if (Array.isArray(myGames)) {
        const validGames = myGames.filter(item => item && Number(item.game_id) > 0);
        setLibraryGames(validGames);

        // Busca conquistas de cada jogo para progresso e exibição inteligente
        const progressList: GameProgressItem[] = await Promise.all(
          validGames.map(async (item) => {
            let achs: any[] = [];
            try {
              achs = await libraryApi.getGameAchievements(item.game_id);
            } catch {
              achs = [];
            }
            const unlockedList = (Array.isArray(achs) ? achs : [])
              .filter((a: any) => a.is_unlocked)
              .map((a: any) => ({
                id: a.achievement_id || String(a.id),
                name: a.name,
                iconUrl: a.icon_url,
              }));

            return {
              id: item.id,
              gameId: item.game_id,
              title: item.game?.title || `Jogo #${item.game_id}`,
              bannerUrl: item.game?.banner_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
              playtimeMinutes: item.playtime_minutes || 0,
              lastPlayed: item.last_played,
              achievementsUnlocked: unlockedList.length,
              achievementsTotal: Array.isArray(achs) ? achs.length : 0,
              unlockedList,
            };
          })
        );
        setGamesProgress(progressList);
      }
    } catch {
      // Degradação graciosa caso offline
    } finally {
      setIsLoadingGames(false);
    }
  };

  // Carrega atividades recentes reais (conquistas e aquisições)
  const loadActivities = async () => {
    setIsLoadingActivities(true);
    try {
      const feed = await socialApi.getFeed(30);
      if (Array.isArray(feed)) {
        // Deduplica eventos por (type + game_id/game_title + achievement_id/name)
        const seenKeys = new Set<string>();
        const dedupedFeed: ActivityItem[] = [];

        for (const act of feed) {
          const achKey = act.payload?.achievement_id || act.payload?.name || act.payload?.achievement_name;
          const gameKey = act.payload?.game_id || act.payload?.game_title;
          const dedupKey = act.type === 'achievement_unlocked'
            ? `${act.type}_${gameKey}_${achKey}`
            : `${act.type}_${act.id}`;

          if (!seenKeys.has(dedupKey)) {
            seenKeys.add(dedupKey);
            dedupedFeed.push(act);
          }
        }

        setUserActivities(dedupedFeed);
      }
    } catch {
      // Degradação graciosa
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    loadInventory();
    loadLibraryAndGames();
    loadActivities();
  }, [isAuthenticated]);

  const handleEquipToggle = async (item: InventoryItem) => {
    setEquippingId(item.id);
    const action = item.is_equipped ? 'unequip' : 'equip';
    try {
      const res = await profileApi.equipCosmetic(item.id, action);
      if (res && res.success) {
        setInventoryItems(prev =>
          prev.map(i => {
            if (i.item_type === item.item_type) {
              if (action === 'equip') {
                return { ...i, is_equipped: i.id === item.id };
              } else if (i.id === item.id) {
                return { ...i, is_equipped: false };
              }
            }
            return i;
          })
        );

        if (updateUserCosmetics) {
          updateUserCosmetics(
            res.avatar_frame_url ?? (item.item_type === 'avatar_frame' && action === 'unequip' ? null : undefined),
            res.profile_background_url ?? (item.item_type === 'background' && action === 'unequip' ? null : undefined)
          );
        }

        setFeedbackMessage(res.message);
        setTimeout(() => setFeedbackMessage(null), 3500);
      }
    } catch (err: any) {
      setFeedbackMessage(err?.message || 'Falha ao alterar equipamento do cosmético.');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } finally {
      setEquippingId(null);
    }
  };

  const filteredInventory = inventoryItems.filter(item => {
    if (inventoryCategory === 'todos') return true;
    if (inventoryCategory === 'avatar_frame') return item.item_type === 'avatar_frame';
    if (inventoryCategory === 'background') return item.item_type === 'background';
    if (inventoryCategory === 'emoticon') return item.item_type === 'emoticon';
    return true;
  });
  const formatPlaytime = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '0 horas registradas';
    if (minutes < 60) return `${minutes} min registrados`;
    const hours = (minutes / 60).toFixed(1).replace('.0', '');
    return `${hours} horas registradas`;
  };

  const formatRelativeDate = (isoString?: string | null): string => {
    if (!isoString) return 'Nunca jogado';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch {
      return 'Recentemente';
    }
  };

  // Contador inteligente de jogos (usa libraryGames se disponível, senão prop/stats)
  const displayGamesCount = libraryGames.length > 0
    ? libraryGames.length
    : (currentUser.stats?.gamesCount || 0);

  const isGoldFrame = Boolean(
    currentUser.avatarFrameUrl && (
      currentUser.avatarFrameUrl.includes('1618005182384') ||
      currentUser.avatarFrameUrl.toLowerCase().includes('gold')
    )
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#180927] via-brand-bg to-brand-bg min-h-screen text-gray-100 p-6 lg:p-10 relative">
      {/* Background Decorativo Customizado do Perfil */}
      {currentUser.profileBackgroundUrl && (
        <div
          data-testid="profile-custom-background"
          className="absolute top-0 left-0 right-0 h-96 bg-cover bg-center opacity-35 blur-[2px] pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${currentUser.profileBackgroundUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#180927]/80 to-brand-bg"></div>
        </div>
      )}

      {/* Toast de Feedback */}
      {feedbackMessage && (
        <div className="fixed top-20 right-8 z-50 bg-brand-surface border-2 border-brand-purple p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <i className="fa-solid fa-sparkles text-brand-purple text-lg"></i>
          <p className="text-sm font-bold text-white">{feedbackMessage}</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header do Perfil */}
        <div className="bg-brand-surface/90 border border-purple-900/40 rounded-3xl p-6 lg:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            {/* Avatar e Moldura de Avatar Cosmética */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div
                  data-testid="profile-avatar-container"
                  className={`w-28 h-28 lg:w-32 lg:h-32 rounded-2xl relative flex items-center justify-center transition-all duration-300 ${
                    currentUser.avatarFrameUrl
                      ? isGoldFrame
                        ? 'p-2 ring-4 ring-amber-400 border-2 border-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.85)]'
                        : 'p-2 ring-4 ring-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.7)]'
                      : 'border-4 border-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.3)] bg-gradient-to-br from-cyan-600 to-brand-green p-0.5'
                  }`}
                >
                  <img
                    src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80"}
                    alt="Avatar Perfil"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {currentUser.avatarFrameUrl && (
                    <div
                      data-testid="profile-equipped-frame"
                      className={`absolute inset-0 rounded-2xl pointer-events-none border-2 shadow-inner ${
                        isGoldFrame ? 'border-amber-300/90' : 'border-cyan-300/80'
                      }`}
                      style={{
                        backgroundImage: `url(${currentUser.avatarFrameUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-brand-green border-2 border-brand-surface px-2 py-0.5 rounded-md text-[10px] font-black text-emerald-100 shadow">
                  Ω MIST
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl lg:text-3xl font-display font-black text-white">
                    {currentUser.username}
                  </h1>
                </div>
                <p className="text-xs lg:text-sm text-gray-300 mt-1 flex items-center gap-1.5">
                  <span>{currentUser.realName || currentUser.username}</span>
                  <span>🇧🇷</span>
                  <span className="text-gray-400">{currentUser.location || 'Brasil'}</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {currentUser.status || 'Online'}
                  </span>
                  <span className="text-xs bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-coins text-[10px]"></i>
                    {(currentUser.pointsBalance ?? 0).toLocaleString('pt-BR')} Pontos
                  </span>
                </div>
              </div>
            </div>

            {/* Nível e Destaque da Insígnia */}
            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-brand-card/80 border border-purple-800/40 px-4 py-2 rounded-2xl shadow-inner">
                  <span className="text-sm font-bold text-gray-300">Nível</span>
                  <span className="w-9 h-9 rounded-full border-2 border-brand-purple flex items-center justify-center font-display font-black text-lg text-white bg-brand-purple/20">
                    {currentUser.level || 1}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-brand-card/70 border border-gray-800 p-2.5 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center font-display font-black text-purple-300 text-sm shadow">
                  {(currentUser.featuredBadge as any)?.code || (
                    <i className={`fa-solid ${(currentUser.featuredBadge as any)?.icon || 'fa-certificate'}`}></i>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white leading-tight">
                    {currentUser.featuredBadge?.title || 'Pioneiro MIST'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {currentUser.featuredBadge?.xp || 100} XP
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-brand-purple/20 hover:bg-brand-purple/40 text-brand-purple hover:text-white border border-brand-purple/40 px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isEditing ? 'Salvar Perfil' : 'Editar perfil'}
              </button>
            </div>
          </div>
        </div>

        {/* Layout de Duas Colunas: Conteúdo Principal (Esq) e Menu Lateral (Dir) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-8 space-y-6">
            {/* Abas Superiores de Navegação no Perfil */}
            <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
              <button
                onClick={() => setActiveSection('activity')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
                  activeSection === 'activity'
                    ? 'bg-brand-purple text-white shadow-[0_0_12px_rgba(160,32,240,0.4)]'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <i className="fa-solid fa-clock-rotate-left"></i> Atividade recente
              </button>
              <button
                onClick={() => setActiveSection('games')}
                data-testid="profile-tab-games"
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
                  activeSection === 'games'
                    ? 'bg-brand-purple text-white shadow-[0_0_12px_rgba(160,32,240,0.4)]'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <i className="fa-solid fa-gamepad text-purple-400"></i> Meus Jogos
                <span className="ml-1 bg-black/40 text-[11px] px-2 py-0.5 rounded-full border border-gray-700">
                  {displayGamesCount}
                </span>
              </button>
              <button
                onClick={() => setActiveSection('inventory')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
                  activeSection === 'inventory'
                    ? 'bg-brand-purple text-white shadow-[0_0_12px_rgba(160,32,240,0.4)]'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <i className="fa-solid fa-box-open text-emerald-400"></i> Inventário de Cosméticos
                <span className="ml-1 bg-black/40 text-[11px] px-2 py-0.5 rounded-full border border-gray-700">
                  {inventoryItems.length}
                </span>
              </button>
            </div>

            {/* SEÇÃO 1: Atividade Recente Inteligente */}
            {activeSection === 'activity' && (
              <div className="space-y-4" data-testid="profile-recent-activity-section">
                {isLoadingActivities ? (
                  <div className="p-8 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-xl text-brand-purple mb-2"></i>
                    <p className="text-xs">Carregando atividades recentes...</p>
                  </div>
                ) : userActivities.length > 0 ? (
                  userActivities.map((act) => {
                    const isAchievement = act.type === 'achievement_unlocked';
                    const isPurchase = act.type === 'game_purchased';

                    const rawName = act.payload.name || act.payload.achievement_name;
                    const achievementTitle = rawName || (act.payload.achievement_id ? `Conquista #${act.payload.achievement_id}` : 'Conquista Desbloqueada');
                    const achievementRarity = act.payload.rarity && act.payload.rarity !== act.payload.game_title ? act.payload.rarity : undefined;

                    return (
                      <div
                        key={act.id}
                        data-testid={`profile-activity-card-${act.id}`}
                        className="bg-brand-surface/90 border border-gray-800/80 hover:border-purple-900/60 rounded-2xl p-5 transition-all duration-300 shadow-lg flex items-start gap-4"
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                            isAchievement
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : isPurchase
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple'
                          }`}
                        >
                          {isAchievement ? (
                            <i className="fa-solid fa-trophy"></i>
                          ) : isPurchase ? (
                            <i className="fa-solid fa-bag-shopping"></i>
                          ) : (
                            <i className="fa-solid fa-star"></i>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h4 className="font-bold text-white text-sm">
                              {isAchievement ? (
                                <span>
                                  Conquista Desbloqueada:{' '}
                                  <span className="text-amber-300 font-extrabold">
                                    {achievementTitle}
                                  </span>
                                </span>
                              ) : isPurchase ? (
                                <span>
                                  Novo Jogo Adquirido:{' '}
                                  <span className="text-emerald-400 font-extrabold">
                                    {act.payload.game_title || 'Jogo MIST'}
                                  </span>
                                </span>
                              ) : (
                                <span>Atividade no Ecossistema MIST</span>
                              )}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {new Date(act.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {act.payload.description && (
                            <p className="text-xs text-gray-300 mt-1 italic">
                              "{act.payload.description}"
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            {act.payload.game_title && (
                              <span className="flex items-center gap-1 text-purple-300 font-medium">
                                <i className="fa-solid fa-gamepad text-[10px]"></i>
                                {act.payload.game_title}
                              </span>
                            )}
                            {achievementRarity && (
                              <span className="bg-amber-950/60 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                {achievementRarity}
                              </span>
                            )}
                            {isPurchase && act.payload.price !== undefined && (
                              <span className="text-emerald-300 font-bold">
                                R$ {Number(act.payload.price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : gamesProgress.length > 0 ? (
                  /* Fallback enriquecido: quando não houver feed registrado, exibe os jogos reais jogados */
                  gamesProgress.map(game => (
                    <div
                      key={game.id}
                      className="bg-brand-surface/90 border border-gray-800/80 hover:border-purple-900/60 rounded-2xl p-5 transition-all duration-300 shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={game.bannerUrl}
                            alt={game.title}
                            className="w-28 h-16 object-cover rounded-xl border border-gray-700 shadow"
                          />
                          <div>
                            <h3 className="font-bold text-white text-base hover:text-brand-purple transition cursor-pointer">
                              {game.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatPlaytime(game.playtimeMinutes)}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              jogado pela última vez em {formatRelativeDate(game.lastPlayed)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Barra de Conquistas */}
                      <div className="mt-4 pt-3 border-t border-gray-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-card/60 p-3 rounded-xl">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">
                            Conquistas <span className="text-white">{game.achievementsUnlocked}</span> de {game.achievementsTotal}
                          </span>
                          <div className="w-32 bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-700">
                            <div
                              className="h-full bg-gradient-to-r from-brand-purple to-purple-400 rounded-full transition-all duration-500"
                              style={{
                                width: game.achievementsTotal > 0
                                  ? `${(game.achievementsUnlocked / game.achievementsTotal) * 100}%`
                                  : '0%'
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Ícones de Conquistas */}
                        <div className="flex items-center gap-2">
                          {game.unlockedList.slice(0, 4).map((ach, idx) => (
                            <div
                              key={idx}
                              className="w-7 h-7 rounded-lg bg-gray-800 border border-purple-700/50 flex items-center justify-center text-purple-300 text-xs shadow-inner"
                              title={ach.name}
                            >
                              <i className="fa-solid fa-trophy"></i>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Fallback padrão estático caso nenhuma atividade ou jogo ainda tenha sido registrado */
                  defaultFallbackRecentGames.map(game => (
                    <div
                      key={game.id}
                      className="bg-brand-surface/90 border border-gray-800/80 hover:border-purple-900/60 rounded-2xl p-5 transition-all duration-300 shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={game.banner}
                            alt={game.title}
                            className="w-28 h-16 object-cover rounded-xl border border-gray-700 shadow"
                          />
                          <div>
                            <h3 className="font-bold text-white text-base hover:text-brand-purple transition cursor-pointer">
                              {game.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                              {game.hoursPlayed} horas registradas
                            </p>
                            <p className="text-[11px] text-gray-500">
                              jogado pela última vez em {game.lastPlayed}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Barra de Conquistas */}
                      <div className="mt-4 pt-3 border-t border-gray-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-card/60 p-3 rounded-xl">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <span className="text-xs font-semibold text-gray-300 whitespace-nowrap">
                            Conquistas <span className="text-white">{game.achievementsEarned}</span> de {game.achievementsTotal}
                          </span>
                          <div className="w-32 bg-gray-800 h-2.5 rounded-full overflow-hidden border border-gray-700">
                            <div
                              className="h-full bg-gradient-to-r from-brand-purple to-purple-400 rounded-full"
                              style={{
                                width: `${(game.achievementsEarned / game.achievementsTotal) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Ícones de Conquistas */}
                        <div className="flex items-center gap-2">
                          {game.achievementIcons.map((icon, idx) => (
                            <div
                              key={idx}
                              className="w-7 h-7 rounded-lg bg-gray-800 border border-purple-700/50 flex items-center justify-center text-purple-300 text-xs shadow-inner"
                              title="Conquista desbloqueada"
                            >
                              <i className={`fa-solid ${icon}`}></i>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SEÇÃO 2: Listagem de Jogos, Tempo de Jogo e Barra de Conquistas */}
            {activeSection === 'games' && (
              <div className="space-y-4" data-testid="profile-games-section">
                {isLoadingGames ? (
                  <div className="p-12 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-brand-purple mb-2"></i>
                    <p className="text-sm">Carregando seus jogos...</p>
                  </div>
                ) : gamesProgress.length === 0 ? (
                  <div className="bg-brand-surface/70 border border-gray-800/80 rounded-3xl p-10 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-brand-card border border-gray-700 flex items-center justify-center text-gray-500 text-2xl mx-auto">
                      <i className="fa-solid fa-gamepad"></i>
                    </div>
                    <h3 className="text-lg font-bold text-white">Nenhum jogo na biblioteca</h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                      Você ainda não possui títulos adquiridos na MIST Store. Visite a Loja para adicionar jogos e iniciar suas conquistas!
                    </p>
                  </div>
                ) : (
                  gamesProgress.map(game => {
                    const percentage = game.achievementsTotal > 0
                      ? Math.round((game.achievementsUnlocked / game.achievementsTotal) * 100)
                      : 0;

                    return (
                      <div
                        key={game.id}
                        data-testid={`profile-game-card-${game.gameId}`}
                        className="bg-brand-surface/90 border border-gray-800 hover:border-purple-800/60 rounded-2xl p-5 transition-all duration-300 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={game.bannerUrl}
                            alt={game.title}
                            className="w-32 h-20 object-cover rounded-xl border border-gray-700 shadow shrink-0"
                          />
                          <div>
                            <h3 className="font-bold text-white text-base hover:text-brand-purple transition">
                              {game.title}
                            </h3>
                            <p className="text-xs text-purple-300 font-semibold mt-1 flex items-center gap-1.5">
                              <i className="fa-regular fa-clock"></i>
                              {formatPlaytime(game.playtimeMinutes)}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Última sessão: {formatRelativeDate(game.lastPlayed)}
                            </p>
                          </div>
                        </div>

                        {/* Barra de Progresso de Conquistas */}
                        <div className="w-full md:w-64 bg-brand-card/80 border border-gray-800 p-3.5 rounded-xl">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-bold text-gray-300 flex items-center gap-1.5">
                              <i className="fa-solid fa-trophy text-amber-400 text-xs"></i>
                              Conquistas
                            </span>
                            <span className="font-black text-white">
                              {game.achievementsUnlocked}/{game.achievementsTotal}{' '}
                              <span className="text-purple-400 text-[11px]">({percentage}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden border border-gray-700/80">
                            <div
                              className="h-full bg-gradient-to-r from-brand-purple to-cyan-400 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* SEÇÃO 3: Inventário de Cosméticos */}
            {activeSection === 'inventory' && (
              <div className="space-y-6" data-testid="profile-inventory-section">
                {/* Filtros de Categoria do Inventário */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setInventoryCategory('todos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      inventoryCategory === 'todos'
                        ? 'bg-brand-purple/30 text-white border border-brand-purple'
                        : 'bg-brand-card/60 text-gray-400 hover:text-white border border-gray-800'
                    }`}
                  >
                    Todos ({inventoryItems.length})
                  </button>
                  <button
                    onClick={() => setInventoryCategory('avatar_frame')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      inventoryCategory === 'avatar_frame'
                        ? 'bg-brand-purple/30 text-white border border-brand-purple'
                        : 'bg-brand-card/60 text-gray-400 hover:text-white border border-gray-800'
                    }`}
                  >
                    Molduras de Avatar
                  </button>
                  <button
                    onClick={() => setInventoryCategory('background')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      inventoryCategory === 'background'
                        ? 'bg-brand-purple/30 text-white border border-brand-purple'
                        : 'bg-brand-card/60 text-gray-400 hover:text-white border border-gray-800'
                    }`}
                  >
                    Planos de Fundo
                  </button>
                  <button
                    onClick={() => setInventoryCategory('emoticon')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      inventoryCategory === 'emoticon'
                        ? 'bg-brand-purple/30 text-white border border-brand-purple'
                        : 'bg-brand-card/60 text-gray-400 hover:text-white border border-gray-800'
                    }`}
                  >
                    Emoticons
                  </button>
                </div>

                {isLoadingInventory ? (
                  <div className="p-12 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-brand-purple mb-2"></i>
                    <p className="text-sm">Carregando seu inventário...</p>
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="bg-brand-surface/70 border border-gray-800/80 rounded-3xl p-10 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-brand-card border border-gray-700 flex items-center justify-center text-gray-500 text-2xl mx-auto">
                      <i className="fa-solid fa-box-open"></i>
                    </div>
                    <h3 className="text-lg font-bold text-white">Nenhum cosmético nesta categoria</h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                      Você pode resgatar molduras exclusivas, planos de fundo dinâmicos e emoticons na Loja de Pontos utilizando pontos acumulados nas compras de jogos!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {filteredInventory.map(item => (
                      <div
                        key={item.id}
                        data-testid={`inventory-item-${item.id}`}
                        className={`bg-brand-card/90 rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between group shadow-xl ${
                          item.is_equipped
                            ? 'border-brand-green/80 shadow-[0_0_15px_rgba(160,32,240,0.25)]'
                            : 'border-gray-800 hover:border-brand-purple/60'
                        }`}
                      >
                        <div>
                          <div className="relative h-40 bg-brand-surface/80 flex items-center justify-center p-3 overflow-hidden">
                            {item.item_type === 'avatar_frame' ? (
                              <div className="relative w-24 h-24 flex items-center justify-center">
                                <img
                                  src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=200&q=80"}
                                  alt="Preview"
                                  className="w-16 h-16 rounded-full object-cover"
                                />
                                {(() => {
                                  const isItemGold = item.item_id === 'frame_gold' || 
                                    (item.asset_url && (item.asset_url.includes('1618005182384') || item.asset_url.includes('gold'))) || 
                                    (item.name && item.name.toLowerCase().includes('dourad'));
                                  return (
                                    <div
                                      className={`absolute inset-0 rounded-full border-4 ${
                                        isItemGold
                                          ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.85)] ring-2 ring-amber-300/60'
                                          : 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                                      }`}
                                      style={{
                                        backgroundImage: `url(${item.asset_url})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                      }}
                                    />
                                  );
                                })()}
                              </div>
                            ) : (
                              <img
                                src={item.asset_url}
                                alt={item.name}
                                className="w-full h-full object-cover rounded-xl transition duration-500 group-hover:scale-105"
                              />
                            )}

                            {item.is_equipped && (
                              <div className="absolute top-2 right-2 bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow">
                                <i className="fa-solid fa-check text-[10px]"></i> Equipado
                              </div>
                            )}
                          </div>

                          <div className="p-4">
                            <h4 className="font-bold text-sm text-white truncate mb-1">
                              {item.name}
                            </h4>
                            <p className="text-[11px] text-gray-400 capitalize">
                              {item.item_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 pt-0">
                          {item.item_type === 'avatar_frame' || item.item_type === 'background' ? (
                            <button
                              onClick={() => handleEquipToggle(item)}
                              disabled={equippingId === item.id}
                              className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                                item.is_equipped
                                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                                  : 'bg-brand-purple hover:bg-brand-purpleDark text-white shadow-[0_0_10px_rgba(160,32,240,0.3)]'
                              }`}
                            >
                              {equippingId === item.id ? (
                                <>
                                  <i className="fa-solid fa-spinner fa-spin"></i> Atualizando...
                                </>
                              ) : item.is_equipped ? (
                                <>
                                  <i className="fa-solid fa-xmark text-xs"></i> Desequipar
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-wand-magic-sparkles text-xs"></i> Equipar no Perfil
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-500 text-center block py-1">
                              Disponível no bate-papo
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Coluna Lateral Direita: Insígnias e Menu */}
          <div className="lg:col-span-4 space-y-6">
            {/* Seção de Insígnias */}
            <div className="bg-brand-surface/90 border border-gray-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                  <i className="fa-solid fa-medal text-brand-purple"></i> Insígnias
                </h3>
                <span className="text-xs font-bold text-brand-purple bg-brand-purple/20 px-2 py-0.5 rounded-md">
                  4
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-brand-card rounded-xl border border-gray-700/60 flex flex-col items-center text-center group cursor-pointer hover:border-brand-purple transition">
                  <i className="fa-solid fa-certificate text-2xl text-slate-300 group-hover:scale-110 transition"></i>
                  <span className="text-[10px] text-gray-400 mt-1 truncate w-full">Fundador</span>
                </div>
                <div className="p-3 bg-brand-card rounded-xl border border-gray-700/60 flex flex-col items-center text-center group cursor-pointer hover:border-brand-purple transition">
                  <span className="font-display font-black text-purple-400 text-lg group-hover:scale-110 transition">10+</span>
                  <span className="text-[10px] text-gray-400 mt-1 truncate w-full">Anos MIST</span>
                </div>
                <div className="p-3 bg-brand-card rounded-xl border border-gray-700/60 flex flex-col items-center text-center group cursor-pointer hover:border-brand-purple transition">
                  <div className="w-6 h-6 rounded-md bg-blue-900 border border-blue-400 flex items-center justify-center font-bold text-blue-200 text-xs group-hover:scale-110 transition">
                    {currentUser.level || 1}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 truncate w-full">Nível {currentUser.level || 1}</span>
                </div>
                <div className="p-3 bg-brand-card rounded-xl border border-gray-700/60 flex flex-col items-center text-center group cursor-pointer hover:border-brand-purple transition">
                  <i className="fa-solid fa-gem text-2xl text-emerald-400 group-hover:scale-110 transition"></i>
                  <span className="text-[10px] text-gray-400 mt-1 truncate w-full">Colecionador</span>
                </div>
              </div>
            </div>

            {/* Menu de Estatísticas e Itens do Perfil */}
            <div className="bg-brand-surface/90 border border-gray-800 rounded-2xl p-5 shadow-xl">
              <ul className="space-y-2 text-sm">
                <li
                  onClick={() => setActiveSection('games')}
                  data-testid="sidebar-games-link"
                  className={`flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer ${
                    activeSection === 'games'
                      ? 'bg-brand-purple/20 text-white border border-brand-purple/40'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-gamepad text-brand-purple"></i> Jogos
                  </span>
                  <span className="font-bold text-white text-base">
                    {displayGamesCount}
                  </span>
                </li>
                <li
                  onClick={() => setActiveSection('inventory')}
                  data-testid="sidebar-inventory-link"
                  className={`flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer ${
                    activeSection === 'inventory'
                      ? 'bg-brand-purple/20 text-white border border-brand-purple/40'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-box-open text-emerald-400"></i> Inventário
                  </span>
                  <span className="font-bold text-white text-sm bg-brand-card px-2 py-0.5 rounded-md border border-gray-700">
                    {inventoryItems.length}
                  </span>
                </li>
                <li className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-camera text-cyan-400"></i> Capturas de tela
                  </span>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
                </li>
                <li className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-video text-amber-400"></i> Vídeos
                  </span>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
                </li>
                <li
                  onClick={() => setIsWorkshopModalOpen(true)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white group"
                >
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-wrench text-orange-400 group-hover:rotate-45 transition-transform"></i> Itens da Oficina
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{workshopTotal}</span>
                    <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
                  </div>
                </li>
                <li className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-800/60 transition cursor-pointer text-gray-300 hover:text-white">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-star-half-stroke text-purple-400"></i> Análises
                  </span>
                  <i className="fa-solid fa-chevron-right text-xs text-gray-600"></i>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Criações da Oficina do Usuário (Ticket O-06) */}
      {isWorkshopModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                  <i className="fa-solid fa-wrench text-sm"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Criações na Oficina • {profileData.username}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Gerenciamento de mods, skins e pacotes publicados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkshopModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                aria-label="Fechar modal"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Painel de Estatísticas Acumuladas */}
            <div className="grid grid-cols-3 gap-3 p-6 pb-2">
              <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Publicações
                </span>
                <span className="text-xl font-display font-black text-white mt-1 block">
                  {workshopTotal}
                </span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block">
                  Downloads
                </span>
                <span className="text-xl font-display font-black text-cyan-300 mt-1 block">
                  {totalDownloads}
                </span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl text-center">
                <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
                  Inscritos
                </span>
                <span className="text-xl font-display font-black text-purple-300 mt-1 block">
                  {totalSubscriptions}
                </span>
              </div>
            </div>

            {/* Lista de Itens Criados */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {isLoadingWorkshop ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                  <i className="fa-solid fa-spinner animate-spin text-2xl text-purple-400"></i>
                  <p className="text-xs">Carregando itens publicados...</p>
                </div>
              ) : userWorkshopItems.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl p-6">
                  <i className="fa-solid fa-wrench text-3xl text-zinc-600 mb-2"></i>
                  <p className="text-sm font-semibold text-zinc-300">Nenhum mod publicado ainda</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Crie mods ou skins personalizadas e compartilhe com toda a comunidade MIST.
                  </p>
                </div>
              ) : (
                userWorkshopItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-600/40 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-zinc-800">
                        {item.preview_url ? (
                          <img
                            src={getUgcImageUrl(item.preview_url)}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-orange-400">
                            <i className="fa-solid fa-wrench"></i>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold">
                            {item.category}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">v{item.version}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate mt-0.5">
                          {item.title}
                        </h4>
                        <p className="text-xs text-zinc-400 truncate">
                          {item.game_title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <div className="hidden sm:flex flex-col items-end text-zinc-400 text-[11px]">
                        <span>{item.downloads_count} downloads</span>
                        <span>{item.subscriptions_count} inscritos</span>
                      </div>
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsWorkshopModalOpen(false);
                            onNavigate('workshop');
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Ver na Oficina
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Rodapé com Ações */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Oficina MIST • Compartilhe suas criações
              </span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    setIsWorkshopModalOpen(false);
                    onNavigate('workshop');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
                >
                  <i className="fa-solid fa-compass"></i>
                  <span>Ir para a Oficina</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
