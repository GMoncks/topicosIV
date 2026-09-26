export const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000';
export const SESSION_EXPIRED_EVENT = 'mist:session-expired';

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
  avatar_url?: string;
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

  // Interceptor de Requisição: injeta cabeçalhos padrão e Bearer token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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
  tags: string[];
  category: string;
  banner_url: string;
  release_date: string;
  developer: string;
  publisher: string;
  review_score: number;
}

export interface GameDetailApiResponse extends GameApiResponse {
  description: string;
  screenshots: string[];
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
  purchased_at: string;
}

export interface CheckoutPayload {
  game_id?: number;
  game_ids?: number[];
  idempotency_key?: string;
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
};

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

  async getPresenceSnapshot(): Promise<UserPresence[]> {
    return fetchApi<UserPresence[]>('/api/social/presence', { method: 'GET' });
  },
};


