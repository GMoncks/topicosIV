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
  id?: number;
  username: string;
  realName: string;
  bio?: string;
  location: string;
  level: number;
  avatarText: string;
  avatarUrl?: string;
  avatarFrameUrl?: string;
  profileBackgroundUrl?: string;
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
  category: 'Plano de fundo do perfil' | 'Emoticon' | 'Perfil de jogo' | 'Avatar animado' | 'Moldura de avatar';
  itemType: 'background' | 'emoticon' | 'profile_bundle' | 'avatar' | 'avatar_frame';
  pricePoints: number;
  image: string;
  previewUrl?: string;
  isOwned?: boolean;
}

export interface InventoryItem {
  id: number;
  user_id: number;
  item_id: string;
  name: string;
  item_type: 'card' | 'emoticon' | 'background' | 'avatar_frame' | 'avatar' | 'badge' | 'profile_bundle';
  asset_url: string;
  price_points: number;
  is_equipped: boolean;
  status: 'disponivel' | 'equipado' | 'listado';
  game_id?: number;
  game_title?: string;
  rarity?: string;
  description?: string;
  acquired_at: string;
}

export interface InventoryGroupedResponse {
  items: InventoryItem[];
  grouped: Record<string, InventoryItem[]>;
  total: number;
}

export type NavigationTab = 'store' | 'library' | 'market' | 'inventory' | 'social' | 'groups' | 'news' | 'points' | 'profile' | 'public_profile' | 'login' | 'workshop';

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

export interface LevelProgress {
  level: number;
  total_xp: number;
  current_level_min_xp: number;
  next_level_min_xp: number;
  current_xp_in_level: number;
  xp_needed_in_level: number;
  progress_percent: number;
}

export interface TradingCard {
  id: number;
  game_id: number;
  card_name: string;
  card_art_url: string;
  rarity: string;
  is_foil: boolean;
  description?: string;
}

export interface Badge {
  id: number;
  game_id: number;
  name: string;
  description?: string;
  xp_value: number;
  icon_url: string;
  is_foil: boolean;
  level: number;
}

export interface CraftBadgeResponse {
  success: boolean;
  message: string;
  badge: Badge;
  badge_item: InventoryItem;
  new_level: number;
  new_total_xp: number;
  leveled_up: boolean;
  xp_gained: number;
  consumed_cards_count: number;
}

export interface PrivacySettings {
  privacy_games: 'Todos' | 'Amigos' | 'Privado';
  privacy_achievements: 'Todos' | 'Amigos' | 'Privado';
  privacy_playtime: 'Todos' | 'Amigos' | 'Privado';
  privacy_inventory: 'Todos' | 'Amigos' | 'Privado';
  privacy_screenshots: 'Todos' | 'Amigos' | 'Privado';
  privacy_groups: 'Todos' | 'Amigos' | 'Privado';
}

export interface PublicProfileResponse {
  id: number;
  username: string;
  real_name?: string;
  location?: string;
  avatar_url?: string;
  avatar_frame_url?: string;
  profile_background_url?: string;
  level: number;
  total_xp: number;
  status: string;
  relationship: 'self' | 'friend' | 'group_member' | 'none';
  games?: any[] | null;
  achievements_count?: number | null;
  playtime_minutes?: number | null;
  inventory_count?: number | null;
  screenshots_count?: number | null;
  groups?: any[] | null;
  badges: any[];
  privacy_settings?: PrivacySettings | null;
}

export interface FriendPendingRequestItem {
  friendship_id: number;
  requester_id: number;
  addressee_id: number;
  status: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
  avatar_frame_url?: string;
}

export interface WalletRechargeResponse {
  user_id: number;
  previous_balance: number;
  amount: number;
  new_balance: number;
  operation: string;
}


