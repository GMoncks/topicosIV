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

