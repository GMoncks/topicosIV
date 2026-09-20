import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchApi, authApi, SESSION_EXPIRED_EVENT } from './client';

describe('HTTP Client & Interceptors (client.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve injetar o token JWT no cabeçalho Authorization quando presente no localStorage', async () => {
    localStorage.setItem('mist_token', 'jwt_valido_123');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchApi<{ status: string }>('/api/qualquer');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, callInit] = fetchMock.mock.calls[0];
    expect(callInit.headers['Authorization']).toBe('Bearer jwt_valido_123');
    expect(result).toEqual({ status: 'success' });
  });

  it('não deve enviar cabeçalho Authorization quando não houver token no localStorage', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchApi('/api/publico');

    const [, callInit] = fetchMock.mock.calls[0];
    expect(callInit.headers['Authorization']).toBeUndefined();
  });

  it('deve interceptar erro 401, limpar o localStorage e emitir evento mist:session-expired', async () => {
    localStorage.setItem('mist_token', 'token_expirado');

    let eventFired = false;
    const handler = () => {
      eventFired = true;
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Token de autenticação ausente ou inválido' }),
      })
    );

    await expect(fetchApi('/api/auth/me')).rejects.toThrow('Token de autenticação ausente ou inválido');

    expect(localStorage.getItem('mist_token')).toBeNull();
    expect(eventFired).toBe(true);

    window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  });

  it('authApi.register deve salvar o token retornado no localStorage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          access_token: 'token_novo_cadastro',
          token_type: 'bearer',
          user: { id: 1, username: 'player', email: 'p@mist.com', wallet_balance: 200.0, points_balance: 500, level: 1, created_at: '' },
        }),
      })
    );

    const response = await authApi.register({
      username: 'player',
      email: 'p@mist.com',
      password: 'password123',
    });

    expect(response.access_token).toBe('token_novo_cadastro');
    expect(localStorage.getItem('mist_token')).toBe('token_novo_cadastro');
  });

  it('authApi.login deve interceptar TypeError / Failed to fetch e lançar mensagem amigável', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    );

    await expect(
      authApi.login({ username_or_email: 'player', password: 'Password@123' })
    ).rejects.toThrow('Falha no processo de login: não foi possível conectar ao servidor.');
  });

  it('authApi.register deve interceptar TypeError / Failed to fetch e lançar mensagem amigável', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    );

    await expect(
      authApi.register({ username: 'player', email: 'p@mist.com', password: 'Password@123' })
    ).rejects.toThrow('Falha no processo de cadastro: não foi possível conectar ao servidor.');
  });

  it('não deve emitir SESSION_EXPIRED_EVENT quando rota de login retornar 401', async () => {
    let eventFired = false;
    const handler = () => {
      eventFired = true;
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Email/usuário ou senha incorretos' }),
      })
    );

    await expect(
      authApi.login({ username_or_email: 'wrong', password: 'Password@123' })
    ).rejects.toThrow('Email/usuário ou senha incorretos');

    expect(eventFired).toBe(false);

    window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  });
});
