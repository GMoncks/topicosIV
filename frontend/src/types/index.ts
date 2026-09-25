export interface GameItem {
  id: string;
  title: string;
  category: 'EXPANSÃƒO' | 'DESEJO' | 'PACOTE' | 'JOGO';
  publisherOrParent?: string;
  tags?: string;
  image: string;
  discountPercentage?: number;
  originalPrice?: number;
  currentPrice: number;
  isWishlist?: boolean;
}

export interface GameActivity {
  id: string;
  title: string;
  banner: string;
  hoursPlayed: number;
  lastPlayed: string;
  achievementsEarned: number;
  achievementsTotal: number;
  achievementIcons: string[];
  extraAchievementsCount?: number;
}

export interface UserBadge {
  id: string;
  name: string;
  icon: string;
  level?: number;
  color?: string;
}

export interface UserProfile {
  username: string;
  realName: string;
  location: string;
  level: number;
  avatarText: string;
  avatarUrl?: string;
  avatarFrameUrl?: string;
  status: 'Online' | 'Offline' | 'Em Jogo';
  walletBalance: number;
  pointsBalance: number;
  featuredBadge: {
    title: string;
    xp: number;
    icon: string;
  };
  recentPlaytimeWeeks: number;
  recentGames: GameActivity[];
  badges: UserBadge[];
  stats: {
    gamesCount: number;
    inventoryCount: number;
    screenshotsCount: number;
    videosCount: number;
    workshopCount: number;
    reviewsCount: number;
  };
}

export interface DownloadItem {
  gameTitle: string;
  progressPercentage: number;
  isPaused: boolean;
  statusText: string;
}

export interface NewsArticle {
  id: string;
  gameTitle: string;
  gameIcon?: string;
  libraryRelation: 'Na biblioteca' | 'Na lista de desejos, Seguindo' | 'Seguindo';
  title: string;
  dateLabel: string;
  timeframe: 'EM BREVE' | 'SEXTA-FEIRA' | 'RECENTES';
  content: string;
  bannerImage: string;
  reminderScheduled?: boolean;
  likesCount: number;
  commentsCount: number;
}

export interface PointsShopItem {
  id: string;
  name: string;
  category: 'Plano de fundo do perfil' | 'Emoticon' | 'Perfil de jogo' | 'Avatar animado';
  itemType: 'background' | 'emoticon' | 'profile_bundle' | 'avatar';
  pricePoints: number;
  image: string;
  previewUrl?: string;
  isOwned?: boolean;
}

export type NavigationTab = 'store' | 'library' | 'social' | 'news' | 'points' | 'profile' | 'login';

export interface LibraryGame {
  id: number;
  gameId: number;
  title: string;
  bannerUrl: string | null;
  developer: string | null;
  publisher: string | null;
  category: string | null;
  playtimeMinutes: number;
  isInstalled: boolean;
  lastPlayed: string | null;
  acquiredAt: string;
}

export interface AchievementResponse {
  id: number;
  game_id: number;
  achievement_id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  rarity: 'Comum' | 'Raro' | 'Épico' | 'Lendário';
  is_unlocked: boolean;
  unlocked_at: string | null;
}
