export const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000';
export const SESSION_EXPIRED_EVENT = 'mist:session-expired';

import {
  InventoryItem,
  InventoryGroupedResponse,
  LevelProgress,
  TradingCard,
  Badge,
  CraftBadgeResponse,
  PrivacySettings,
  PublicProfileResponse,
  FriendPendingRequestItem,
  WalletRechargeResponse,
} from '../types';


export interface AuthRegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface AuthLoginPayload {
  username_or_email: string;
  password: string;
}

export interface AuthUserResponse {
  id: number;
  username: string;
  email: string;
  wallet_balance: number;
  points_balance: number;
  level: number;
  total_xp?: number;
  avatar_url?: string;
  avatar_frame_url?: string;
  profile_background_url?: string;
  real_name?: string;
  bio?: string;
  location?: string;
  created_at: string;
}


export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUserResponse;
}

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const message = (err as Error).message || String(err);
  return (
    err instanceof TypeError ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED')
  );
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;

  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  // Interceptor de Requisição: injeta cabeçalhos padrão e Bearer token
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_GATEWAY_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error('Falha de conexão: o servidor está indisponível no momento.');
    }
    throw err;
  }

  // Interceptor de Resposta: captura 401 e desloga com emissão de evento (apenas rotas protegidas)
  if (response.status === 401) {
    const isAuthRoute = endpoint.includes('/api/auth/login') || endpoint.includes('/api/auth/register');
    if (!isAuthRoute) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('mist_token');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || (isAuthRoute ? 'Email/usuário ou senha incorretos' : 'Sessão expirada ou não autorizada'));
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Erro na requisição HTTP (${response.status})`);
  }

  if (response.status === 204 || response.headers?.get?.('content-length') === '0') {
    return null as T;
  }

  return response.json();
}

export const authApi = {
  async register(payload: AuthRegisterPayload): Promise<AuthTokenResponse> {
    try {
      const data = await fetchApi<AuthTokenResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (typeof localStorage !== 'undefined' && data.access_token) {
        localStorage.setItem('mist_token', data.access_token);
      }
      return data;
    } catch (err: unknown) {
      if (isNetworkError(err) || (err instanceof Error && err.message.includes('Falha de conexão'))) {
        throw new Error('Falha no processo de cadastro: não foi possível conectar ao servidor.');
      }
      throw err;
    }
  },

  async login(payload: AuthLoginPayload): Promise<AuthTokenResponse> {
    try {
      const data = await fetchApi<AuthTokenResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (typeof localStorage !== 'undefined' && data.access_token) {
        localStorage.setItem('mist_token', data.access_token);
      }
      return data;
    } catch (err: unknown) {
      if (isNetworkError(err) || (err instanceof Error && err.message.includes('Falha de conexão'))) {
        throw new Error('Falha no processo de login: não foi possível conectar ao servidor.');
      }
      throw err;
    }
  },

  async getMe(): Promise<AuthUserResponse> {
    return fetchApi<AuthUserResponse>('/api/auth/me', {
      method: 'GET',
    });
  },

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mist_token');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
  },
};

// ========================================
// Store API — Catálogo de Jogos
// ========================================

export interface GameApiResponse {
  id: number;
  title: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  tags: string[];
  category: string;
  banner_url: string;
  release_date: string;
  developer: string;
  publisher: string;
  review_score: number;
  recommendation_score?: number;
  recommendation_reason?: string;
}

export interface GameDetailApiResponse extends GameApiResponse {
  description: string;
  screenshots: string[];
  reviews_count: number;
  positive_count: number;
  approval_pct: number | null;
  approval_label: string;
}

export interface WishlistAlert {
  game_id: number;
  title: string;
  banner_url?: string;
  category: string;
  original_price: number;
  current_price: number;
  discount_percentage: number;
  savings: number;
  message: string;
}

export interface ListGamesParams {
  category?: string;
  tag?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  sort_by?: string;
  order?: string;
  skip?: number;
  limit?: number;
}

export const storeApi = {
  async listGames(params?: ListGamesParams): Promise<GameApiResponse[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value));
        }
      });
    }
    const qs = query.toString();
    const endpoint = qs ? `/api/games?${qs}` : '/api/games';
    return fetchApi<GameApiResponse[]>(endpoint, { method: 'GET' });
  },

  async getGameDetails(gameId: number): Promise<GameDetailApiResponse> {
    return fetchApi<GameDetailApiResponse>(`/api/games/${gameId}`, { method: 'GET' });
  },

  async getRecommendations(limit: number = 4): Promise<GameApiResponse[]> {
    return fetchApi<GameApiResponse[]>(`/api/store/recommendations?limit=${limit}`, { method: 'GET' });
  },

  async getTopSellers(limit: number = 6): Promise<GameApiResponse[]> {
    return fetchApi<GameApiResponse[]>(`/api/store/trends/top-sellers?limit=${limit}`, { method: 'GET' });
  },

  async getTrending(limit: number = 6): Promise<GameApiResponse[]> {
    return fetchApi<GameApiResponse[]>(`/api/store/trends/trending?limit=${limit}`, { method: 'GET' });
  },

  async getWishlistAlerts(): Promise<WishlistAlert[]> {
    return fetchApi<WishlistAlert[]>('/api/store/wishlist/alerts', { method: 'GET' });
  },

  async addToWishlist(gameId: number): Promise<{ id: number; created: boolean }> {
    return fetchApi<{ id: number; created: boolean }>(`/api/store/wishlist/${gameId}`, { method: 'POST' });
  },

  async removeFromWishlist(gameId: number): Promise<void> {
    return fetchApi<void>(`/api/store/wishlist/${gameId}`, { method: 'DELETE' });
  },

  async getWishlist(): Promise<any[]> {
    return fetchApi<any[]>('/api/store/wishlist', { method: 'GET' });
  },

  async checkout(payload: CheckoutPayload): Promise<CheckoutResponse> {
    return fetchApi<CheckoutResponse>('/api/store/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async downloadGamePackage(gameId: number): Promise<Blob> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_GATEWAY_URL}/api/games/${gameId}/download`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Falha ao baixar pacote do jogo');
    }
    return response.blob();
  },
};


export interface CheckoutItem {
  game_id: number;
  title: string;
  price_paid: number;
}

export interface CheckoutResponse {
  status: string;
  order_id: string;
  items: CheckoutItem[];
  total_paid: number;
  new_wallet_balance: number;
  points_earned?: number;
  purchased_at: string;
}

export interface CheckoutPayload {
  game_id?: number;
  game_ids?: number[];
  idempotency_key?: string;
}

// ========================================
// Store API — Avaliações de Jogos (Bloco H)
// ========================================

export interface ReviewApiResponse {
  id: number;
  user_id: number;
  game_id: number;
  is_recommended: boolean;
  text: string;
  playtime_at_review: number;
  created_at: string;
  updated_at: string;
  helpful_count: number;
}

export interface ReviewCreatePayload {
  is_recommended: boolean;
  text: string;
}

export interface ReviewHelpfulResponse {
  review_id: number;
  helpful_count: number;
  created: boolean;
}

export const reviewApi = {
  async listReviews(
    gameId: number,
    params?: { sort?: 'recent' | 'helpful'; is_recommended?: boolean; skip?: number; limit?: number }
  ): Promise<ReviewApiResponse[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.set(key, String(value));
        }
      });
    }
    const qs = query.toString();
    // Usa o proxy genérico /api/store/* (o proxy dedicado /api/games/* só repassa GET/OPTIONS).
    return fetchApi<ReviewApiResponse[]>(`/api/store/games/${gameId}/reviews${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  async submitReview(gameId: number, payload: ReviewCreatePayload): Promise<ReviewApiResponse> {
    return fetchApi<ReviewApiResponse>(`/api/store/games/${gameId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async markHelpful(reviewId: number): Promise<ReviewHelpfulResponse> {
    return fetchApi<ReviewHelpfulResponse>(`/api/store/reviews/${reviewId}/helpful`, { method: 'POST' });
  },
};

// ========================================
// Market API — Extrato da Carteira (Bloco T)
// ========================================

export type WalletTransactionType = 'compra' | 'venda' | 'recarga' | 'resgate';

export interface WalletTransactionApiResponse {
  id: number;
  user_id: number;
  type: WalletTransactionType;
  amount: number;
  direction: 'credit' | 'debit';
  description: string;
  created_at: string;
}

export interface WalletHistoryApiResponse {
  items: WalletTransactionApiResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface WalletHistoryParams {
  type?: WalletTransactionType;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

export const walletApi = {
  async getHistory(params?: WalletHistoryParams): Promise<WalletHistoryApiResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value));
        }
      });
    }
    const qs = query.toString();
    return fetchApi<WalletHistoryApiResponse>(`/api/market/wallet/history${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  async recharge(amount: number): Promise<WalletRechargeResponse> {
    return fetchApi<WalletRechargeResponse>('/api/me/wallet/recharge', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
};

// ========================================
// Market API — Mercado da Comunidade (Bloco L)
// ========================================

export type MarketItemType = 'card' | 'emoticon' | 'background' | 'avatar_frame' | 'badge';
export type MarketListingStatus = 'ativo' | 'vendido' | 'cancelado';

export interface MarketListingApiResponse {
  id: number;
  seller_id: number;
  item_id: number;
  item_type: MarketItemType;
  item_name: string | null;
  game_id: number | null;
  price: number;
  status: MarketListingStatus;
  buyer_id: number | null;
  created_at: string;
  sold_at: string | null;
  cancelled_at: string | null;
}

export interface MarketListingPageApiResponse {
  items: MarketListingApiResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface MarketBuyApiResponse {
  listing: MarketListingApiResponse;
  new_wallet_balance: number | null;
}

export const marketApi = {
  async listListings(params?: {
    item_type?: MarketItemType;
    game_id?: number;
    skip?: number;
    limit?: number;
  }): Promise<MarketListingPageApiResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.set(key, String(value));
        }
      });
    }
    const qs = query.toString();
    return fetchApi<MarketListingPageApiResponse>(`/api/market/market/listings${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  async getMyListings(params?: {
    status?: MarketListingStatus;
    skip?: number;
    limit?: number;
  }): Promise<MarketListingPageApiResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.set(key, String(value));
        }
      });
    }
    const qs = query.toString();
    return fetchApi<MarketListingPageApiResponse>(`/api/market/market/my-listings${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  async buyListing(listingId: number): Promise<MarketBuyApiResponse> {
    return fetchApi<MarketBuyApiResponse>(`/api/market/market/buy/${listingId}`, { method: 'POST' });
  },

  async cancelListing(listingId: number): Promise<MarketListingApiResponse> {
    return fetchApi<MarketListingApiResponse>(`/api/market/market/listings/${listingId}/cancel`, {
      method: 'POST',
    });
  },

  async getReceivedTrades(params?: {
    status?: TradeOfferStatus;
    skip?: number;
    limit?: number;
  }): Promise<TradeOfferPageApiResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) query.set(key, String(value));
      });
    }
    const qs = query.toString();
    return fetchApi<TradeOfferPageApiResponse>(`/api/market/trades/received${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  async getSentTrades(params?: {
    status?: TradeOfferStatus;
    skip?: number;
    limit?: number;
  }): Promise<TradeOfferPageApiResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) query.set(key, String(value));
      });
    }
    const qs = query.toString();
    return fetchApi<TradeOfferPageApiResponse>(`/api/market/trades/sent${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  async acceptTrade(offerId: number): Promise<TradeOfferApiResponse> {
    return fetchApi<TradeOfferApiResponse>(`/api/market/trades/${offerId}/accept`, { method: 'POST' });
  },

  async declineTrade(offerId: number): Promise<TradeOfferApiResponse> {
    return fetchApi<TradeOfferApiResponse>(`/api/market/trades/${offerId}/decline`, { method: 'POST' });
  },
};

export type TradeOfferStatus = 'pending' | 'accepted' | 'declined';

export interface TradeItemApiResponse {
  item_id: number;
  item_type: MarketItemType;
  item_name: string | null;
}

export interface TradeOfferApiResponse {
  id: number;
  sender_id: number;
  receiver_id: number;
  offered_items: TradeItemApiResponse[];
  requested_items: TradeItemApiResponse[];
  status: TradeOfferStatus;
  created_at: string;
  responded_at: string | null;
}

export interface TradeOfferPageApiResponse {
  items: TradeOfferApiResponse[];
  total: number;
  skip: number;
  limit: number;
}

export interface LibraryItemResponse {
  id: number;
  user_id: number;
  game_id: number;
  acquired_at: string;
  playtime_minutes: number;
  is_installed: boolean;
  last_played: string | null;
  game: {
    title: string;
    category: string | null;
    banner_url: string | null;
    developer: string | null;
    publisher: string | null;
  } | null;
}

export const libraryApi = {
  async getMyGames(): Promise<LibraryItemResponse[]> {
    return fetchApi<LibraryItemResponse[]>('/api/library/my-games', { method: 'GET' });
  },

  async getGameAchievements(gameId: number): Promise<any[]> {
    return fetchApi<any[]>(`/api/library/games/${gameId}/achievements`, { method: 'GET' });
  },

  async startSession(gameId: number): Promise<any> {
    return fetchApi<any>('/api/library/session/start', {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, user_id: 1 }),
    });
  },

  async pingSession(gameId: number, sessionId?: string): Promise<any> {
    return fetchApi<any>('/api/library/session/ping', {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, user_id: 1, session_id: sessionId }),
    });
  },

  async endSession(gameId: number, sessionId?: string): Promise<any> {
    return fetchApi<any>('/api/library/session/end', {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, user_id: 1, session_id: sessionId }),
    });
  },

  async getRecentAchievements(since?: string): Promise<any[]> {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    return fetchApi<any[]>(`/api/library/achievements/recent${query}`, { method: 'GET' });
  },

  async getGameQuests(gameId: number): Promise<DynamicQuest[]> {
    return fetchApi<DynamicQuest[]>(`/api/library/games/${gameId}/quests`, { method: 'GET' });
  },

  async claimQuest(gameId: number, questId: number): Promise<any> {
    return fetchApi<any>(`/api/library/games/${gameId}/quests/${questId}/claim`, { method: 'POST' });
  },
};

export interface DynamicQuest {
  id: number;
  user_id: number;
  game_id: number;
  quest_key: string;
  title: string;
  description: string;
  xp_reward: number;
  target_type: string;
  target_value: number;
  progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  week_key: string;
  created_at?: string;
}

export interface FriendItem {
  friendship_id: number;
  friend_user_id: number;
  status: string;
  since: string;
  username?: string;
  avatar_url?: string;
  presence_status?: 'online' | 'away' | 'playing' | 'offline';
  current_game?: string;
  current_game_id?: number;
  is_bot?: boolean;
}

export interface ActivityItem {
  id: number;
  user_id: number;
  type: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  room_id: string;
  sender_id: number;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface UserPresence {
  user_id: number;
  status: 'online' | 'away' | 'playing' | 'offline';
  game_id?: number | null;
  game_title?: string | null;
  last_seen?: string | null;
}

export const socialApi = {
  getChatRoomId(user1Id: number, user2Id: number): string {
    return `direct_${Math.min(user1Id, user2Id)}_${Math.max(user1Id, user2Id)}`;
  },

  async getFriends(): Promise<FriendItem[]> {
    return fetchApi<FriendItem[]>('/api/social/friends', { method: 'GET' });
  },

  async getFriendRequests(): Promise<FriendPendingRequestItem[]> {
    return fetchApi<FriendPendingRequestItem[]>('/api/social/friends/requests', { method: 'GET' });
  },

  async sendFriendRequest(addresseeId: number): Promise<any> {
    return fetchApi<any>('/api/social/friends/request', {
      method: 'POST',
      body: JSON.stringify({ addressee_id: addresseeId }),
    });
  },

  async acceptFriend(friendshipId: number): Promise<any> {
    return fetchApi<any>(`/api/social/friends/accept/${friendshipId}`, { method: 'POST' });
  },

  async deleteFriend(friendshipId: number): Promise<any> {
    return fetchApi<any>(`/api/social/friends/${friendshipId}`, { method: 'DELETE' });
  },

  async getFeed(limit: number = 50): Promise<ActivityItem[]> {
    return fetchApi<ActivityItem[]>(`/api/social/feed?limit=${limit}`, { method: 'GET' });
  },

  async getChatHistory(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
    return fetchApi<ChatMessage[]>(`/api/social/chat/${roomId}/messages?limit=${limit}`, { method: 'GET' });
  },

  async markChatRead(roomId: string): Promise<any> {
    return fetchApi<any>(`/api/social/chat/${roomId}/read`, { method: 'POST' });
  },

  async sendMessage(roomId: string, content: string): Promise<ChatMessage> {
    return fetchApi<ChatMessage>(`/api/social/chat/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async getPresenceSnapshot(): Promise<UserPresence[]> {
    return fetchApi<UserPresence[]>('/api/social/presence', { method: 'GET' });
  },

  async getNotifications(unreadOnly: boolean = false): Promise<NotificationListResponse> {
    return fetchApi<NotificationListResponse>(`/api/social/notifications?unread_only=${unreadOnly}`, { method: 'GET' });
  },

  async markNotificationRead(id: number): Promise<NotificationItem> {
    return fetchApi<NotificationItem>(`/api/social/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead(): Promise<{ status: string; updated_count: number }> {
    return fetchApi<{ status: string; updated_count: number }>('/api/social/notifications/read-all', { method: 'POST' });
  },
};

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  payload?: Record<string, any> | null;
  is_read: boolean;
  created_at?: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
  total: number;
}

// ========================================
// Groups & Forum API (Tickets M-01 a M-05)
// ========================================

export interface GroupItem {
  id: number;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  header_url?: string | null;
  category: string;
  is_private: boolean;
  owner_id: number;
  members_count: number;
  posts_count: number;
  created_at: string;
  is_member?: boolean;
  role?: string | null;
}

export interface GroupMemberItem {
  id: number;
  group_id: number;
  user_id: number;
  role: string;
  joined_at: string;
}

export interface ForumPostItem {
  id: number;
  group_id: number;
  author_id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  views_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
}

export interface ForumReplyItem {
  id: number;
  post_id: number;
  author_id: number;
  content: string;
  created_at: string;
}

export interface ForumPostDetailItem extends ForumPostItem {
  replies: ForumReplyItem[];
}

export interface GroupMessageItem {
  id: number;
  group_id: number;
  user_id: number;
  username?: string | null;
  content: string;
  created_at: string;
}

export const groupsApi = {
  async getGroups(params?: { category?: string; q?: string; my_groups?: boolean }): Promise<GroupItem[]> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.q) query.set('q', params.q);
    if (params?.my_groups) query.set('my_groups', 'true');
    const qs = query.toString();
    return fetchApi<GroupItem[]>(`/api/social/groups${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  async getGroup(id: number): Promise<GroupItem> {
    return fetchApi<GroupItem>(`/api/social/groups/${id}`, { method: 'GET' });
  },

  async createGroup(data: {
    name: string;
    description?: string;
    category?: string;
    avatar_url?: string;
    header_url?: string;
    is_private?: boolean;
  }): Promise<GroupItem> {
    return fetchApi<GroupItem>('/api/social/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async joinGroup(id: number): Promise<GroupItem> {
    return fetchApi<GroupItem>(`/api/social/groups/${id}/join`, { method: 'POST' });
  },

  async leaveGroup(id: number): Promise<GroupItem> {
    return fetchApi<GroupItem>(`/api/social/groups/${id}/leave`, { method: 'POST' });
  },

  async getMembers(groupId: number): Promise<GroupMemberItem[]> {
    return fetchApi<GroupMemberItem[]>(`/api/social/groups/${groupId}/members`, { method: 'GET' });
  },

  async getPosts(groupId: number): Promise<ForumPostItem[]> {
    return fetchApi<ForumPostItem[]>(`/api/social/groups/${groupId}/posts`, { method: 'GET' });
  },

  async createPost(groupId: number, data: { title: string; content: string; is_pinned?: boolean }): Promise<ForumPostItem> {
    return fetchApi<ForumPostItem>(`/api/social/groups/${groupId}/posts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPost(postId: number): Promise<ForumPostDetailItem> {
    return fetchApi<ForumPostDetailItem>(`/api/social/posts/${postId}`, { method: 'GET' });
  },

  async updatePost(postId: number, data: { is_pinned?: boolean; is_locked?: boolean; title?: string; content?: string }): Promise<ForumPostItem> {
    return fetchApi<ForumPostItem>(`/api/social/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async createReply(postId: number, data: { content: string }): Promise<ForumReplyItem> {
    return fetchApi<ForumReplyItem>(`/api/social/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getChatMessages(groupId: number): Promise<GroupMessageItem[]> {
    return fetchApi<GroupMessageItem[]>(`/api/social/groups/${groupId}/chat/messages`, { method: 'GET' });
  },

  async sendChatMessage(groupId: number, content: string): Promise<GroupMessageItem> {
    return fetchApi<GroupMessageItem>(`/api/social/groups/${groupId}/chat/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

export interface GlobalSearchGameItem {
  id: number;
  title: string;
  price: number;
  header_image?: string;
  category?: string;
  tags?: string[];
}

export interface GlobalSearchUserItem {
  id: number;
  username: string;
  email: string;
  level: number;
  avatar_url?: string;
}

export interface GlobalSearchGroupItem {
  id: number;
  name: string;
  description?: string;
  avatar_url?: string;
  category?: string;
  members_count: number;
}

export interface GlobalSearchMarketItem {
  id: number;
  item_name: string;
  item_type: string;
  price: number;
  game_id?: number;
}

export interface GlobalSearchResult {
  query: string;
  total: number;
  games: GlobalSearchGameItem[];
  users: GlobalSearchUserItem[];
  groups: GlobalSearchGroupItem[];
  market_items: GlobalSearchMarketItem[];
}

export const searchApi = {
  async search(query: string, limit: number = 5): Promise<GlobalSearchResult> {
    if (!query || !query.trim()) {
      return {
        query: '',
        total: 0,
        games: [],
        users: [],
        groups: [],
        market_items: [],
      };
    }
    return fetchApi<GlobalSearchResult>(`/api/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`, {
      method: 'GET',
    });
  },
};

export interface ScreenshotItem {
  id: number;
  user_id: number;
  user_name?: string;
  username?: string;
  user_avatar?: string;
  game_id: number;
  game_title?: string;
  title?: string;
  caption?: string;
  image_url?: string;
  file_url?: string;
  filename?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  file_size?: number;
  likes_count: number;
  liked_by_me: boolean;
  created_at: string;
}

export interface ScreenshotPageResponse {
  items: ScreenshotItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ScreenshotUploadPayload {
  file: File;
  game_id: number;
  game_title?: string;
  caption?: string;
}

export interface WorkshopItem {
  id: number;
  game_id: number;
  game_title?: string;
  author_id: number;
  author_name: string;
  author_avatar?: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  file_url: string;
  filename: string;
  file_size: number;
  preview_url?: string;
  version: string;
  downloads_count: number;
  subscriptions_count: number;
  rating: number;
  is_subscribed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkshopPageResponse {
  items: WorkshopItem[];
  total: number;
  skip?: number;
  limit?: number;
  page: number;
  pages: number;
}

export interface WorkshopUploadPayload {
  file: File | Blob;
  title: string;
  game_id: number;
  game_title?: string;
  category?: string;
  tags?: string;
  description?: string;
  version?: string;
  preview_file?: File | Blob;
}

export function getUgcImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/uploads/')) return `${API_GATEWAY_URL}/api/ugc${path}`;
  if (path.startsWith('/api/ugc/')) return `${API_GATEWAY_URL}${path}`;
  return `${API_GATEWAY_URL}/api/ugc/uploads/${path.replace(/^\//, '')}`;
}

export const ugcApi = {
  async getScreenshots(params?: {
    game_id?: number;
    user_id?: number;
    sort_by?: 'recent' | 'popular';
    page?: number;
    size?: number;
  }): Promise<ScreenshotPageResponse> {
    const searchParams = new URLSearchParams();
    if (params?.game_id) searchParams.append('game_id', params.game_id.toString());
    if (params?.user_id) searchParams.append('user_id', params.user_id.toString());
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.size) searchParams.append('size', params.size.toString());
    const query = searchParams.toString();
    return fetchApi<ScreenshotPageResponse>(`/api/ugc/screenshots${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },

  async getScreenshot(id: number): Promise<ScreenshotItem> {
    return fetchApi<ScreenshotItem>(`/api/ugc/screenshots/${id}`, {
      method: 'GET',
    });
  },

  async uploadScreenshot(payload: ScreenshotUploadPayload): Promise<ScreenshotItem> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('game_id', payload.game_id.toString());
    if (payload.game_title) formData.append('game_title', payload.game_title);
    if (payload.caption) formData.append('caption', payload.caption);

    return fetchApi<ScreenshotItem>('/api/ugc/screenshots/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async likeScreenshot(id: number): Promise<{ screenshot_id: number; likes_count: number; liked: boolean }> {
    return fetchApi(`/api/ugc/screenshots/${id}/like`, {
      method: 'POST',
    });
  },

  async unlikeScreenshot(id: number): Promise<{ screenshot_id: number; likes_count: number; liked: boolean }> {
    return fetchApi(`/api/ugc/screenshots/${id}/like`, {
      method: 'DELETE',
    });
  },

  async deleteScreenshot(id: number): Promise<{ message: string }> {
    return fetchApi(`/api/ugc/screenshots/${id}`, {
      method: 'DELETE',
    });
  },

  // Workshop de Conteúdo: Mods e Skins (Bloco O)
  async getWorkshopItems(params?: {
    game_id?: number;
    author_id?: number;
    category?: string;
    tag?: string;
    search?: string;
    sort_by?: 'popular' | 'downloads' | 'recent' | 'rating';
    subscribed_only?: boolean;
    page?: number;
    size?: number;
  }): Promise<WorkshopPageResponse> {
    const searchParams = new URLSearchParams();
    if (params?.game_id) searchParams.append('game_id', params.game_id.toString());
    if (params?.author_id) searchParams.append('author_id', params.author_id.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.tag) searchParams.append('tag', params.tag);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.subscribed_only) searchParams.append('subscribed_only', 'true');
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.size) searchParams.append('size', params.size.toString());
    const query = searchParams.toString();
    return fetchApi<WorkshopPageResponse>(`/api/ugc/workshop/items${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },

  async getWorkshopItem(id: number): Promise<WorkshopItem> {
    return fetchApi<WorkshopItem>(`/api/ugc/workshop/items/${id}`, {
      method: 'GET',
    });
  },

  async uploadWorkshopItem(payload: WorkshopUploadPayload): Promise<WorkshopItem> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('title', payload.title);
    formData.append('game_id', payload.game_id.toString());
    if (payload.game_title) formData.append('game_title', payload.game_title);
    if (payload.category) formData.append('category', payload.category);
    if (payload.tags) formData.append('tags', payload.tags);
    if (payload.description) formData.append('description', payload.description);
    if (payload.version) formData.append('version', payload.version);
    if (payload.preview_file) formData.append('preview_file', payload.preview_file);

    return fetchApi<WorkshopItem>('/api/ugc/workshop/items', {
      method: 'POST',
      body: formData,
    });
  },

  async subscribeWorkshopItem(id: number): Promise<{ item_id: number; subscribed: boolean; subscriptions_count: number }> {
    return fetchApi(`/api/ugc/workshop/items/${id}/subscribe`, {
      method: 'POST',
    });
  },

  async unsubscribeWorkshopItem(id: number): Promise<{ item_id: number; subscribed: boolean; subscriptions_count: number }> {
    return fetchApi(`/api/ugc/workshop/items/${id}/subscribe`, {
      method: 'DELETE',
    });
  },

  async downloadWorkshopItem(id: number): Promise<{ item_id: number; downloads_count: number; file_url: string }> {
    return fetchApi(`/api/ugc/workshop/items/${id}/download`, {
      method: 'POST',
    });
  },

  async deleteWorkshopItem(id: number): Promise<void> {
    return fetchApi(`/api/ugc/workshop/items/${id}`, {
      method: 'DELETE',
    });
  },
};

// ========================================
// Points Shop & Profile Cosmetics API
// ========================================

export interface PointsShopItemResponse {
  id: string;
  name: string;
  category: string;
  item_type: 'avatar_frame' | 'background' | 'emoticon' | 'profile_bundle';
  price_points: number;
  asset_url: string;
  description?: string;
  is_owned: boolean;
}

export interface PointsPurchaseResponse {
  success: boolean;
  message: string;
  item: InventoryItem;
  new_points_balance: number;
}

export interface CosmeticEquipResponse {
  success: boolean;
  message: string;
  equipped_item: InventoryItem;
  avatar_url?: string;
  avatar_frame_url?: string;
  profile_background_url?: string;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  grouped?: Record<string, InventoryItem[]>;
  total: number;
}

export const pointsShopApi = {
  async getItems(): Promise<PointsShopItemResponse[]> {
    return fetchApi<PointsShopItemResponse[]>('/api/points-shop/items', { method: 'GET' });
  },

  async purchase(itemId: string): Promise<PointsPurchaseResponse> {
    return fetchApi<PointsPurchaseResponse>('/api/points-shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId }),
    });
  },
};

export const profileApi = {
  async getInventory(itemType?: string): Promise<InventoryListResponse> {
    const query = itemType ? `?item_type=${encodeURIComponent(itemType)}` : '';
    return fetchApi<InventoryListResponse>(`/api/inventory${query}`, { method: 'GET' });
  },

  async equipCosmetic(inventoryItemId: number, action: 'equip' | 'unequip' = 'equip'): Promise<CosmeticEquipResponse> {
    return fetchApi<CosmeticEquipResponse>('/api/profile/equip', {
      method: 'POST',
      body: JSON.stringify({ inventory_item_id: inventoryItemId, action }),
    });
  },

  async updateProfile(data: {
    username?: string;
    real_name?: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
  }): Promise<any> {
    return fetchApi<any>('/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const inventoryApi = {
  async getInventory(params?: { item_type?: string; status?: string }): Promise<InventoryGroupedResponse> {
    const queryParts: string[] = [];
    if (params?.item_type) queryParts.push(`item_type=${encodeURIComponent(params.item_type)}`);
    if (params?.status) queryParts.push(`status_filter=${encodeURIComponent(params.status)}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return fetchApi<InventoryGroupedResponse>(`/api/inventory${query}`, { method: 'GET' });
  },

  async equipItem(itemId: number): Promise<CosmeticEquipResponse> {
    return fetchApi<CosmeticEquipResponse>(`/api/inventory/items/${itemId}/equip`, {
      method: 'POST',
    });
  },

  async unequipItem(itemId: number): Promise<CosmeticEquipResponse> {
    return fetchApi<CosmeticEquipResponse>(`/api/inventory/items/${itemId}/unequip`, {
      method: 'POST',
    });
  },
};

export const cardsApi = {
  async getLevelProgress(): Promise<LevelProgress> {
    return fetchApi<LevelProgress>('/api/me/level-progress', { method: 'GET' });
  },

  async getCatalogCards(gameId?: number): Promise<TradingCard[]> {
    const query = gameId ? `?game_id=${gameId}` : '';
    return fetchApi<TradingCard[]>(`/api/cards/catalog${query}`, { method: 'GET' });
  },

  async craftBadge(gameId: number, isFoil: boolean = false): Promise<CraftBadgeResponse> {
    return fetchApi<CraftBadgeResponse>('/api/crafting/badge', {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, is_foil: isFoil }),
    });
  },

  async getUserBadges(userId: number): Promise<InventoryItem[]> {
    return fetchApi<InventoryItem[]>(`/api/badges/user/${userId}`, { method: 'GET' });
  },

  async getGameBadge(gameId: number, isFoil: boolean = false): Promise<Badge> {
    const query = isFoil ? '?is_foil=true' : '';
    return fetchApi<Badge>(`/api/badges/game/${gameId}${query}`, { method: 'GET' });
  },
};

export const publicProfileApi = {
  async getPublicProfile(username: string): Promise<PublicProfileResponse> {
    return fetchApi<PublicProfileResponse>(`/api/users/${encodeURIComponent(username)}/profile`, { method: 'GET' });
  },

  async getPrivacySettings(): Promise<PrivacySettings> {
    return fetchApi<PrivacySettings>('/api/me/privacy', { method: 'GET' });
  },

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    return fetchApi<PrivacySettings>('/api/me/privacy', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};







