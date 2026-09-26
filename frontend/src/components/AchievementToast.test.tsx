import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import App from '../App';
import { libraryApi, storeApi } from '../api/client';
import * as AuthContextModule from '../context/AuthContext';

vi.mock('../api/client', () => ({
  API_GATEWAY_URL: 'http://localhost:8000',
  SESSION_EXPIRED_EVENT: 'mist:session-expired',
  authApi: {
    me: vi.fn().mockResolvedValue({
      id: 1,
      username: 'ggtorres2001',
      email: 'test@example.com',
      wallet_balance: 100,
      points_balance: 50,
      level: 1,
      created_at: '2026-01-01'
    }),
  },
  storeApi: {
    getWishlist: vi.fn().mockResolvedValue([]),
    getGames: vi.fn().mockResolvedValue([]),
    listGames: vi.fn().mockResolvedValue([]),
    getRecommendations: vi.fn().mockResolvedValue([]),
  },
  libraryApi: {
    getMyGames: vi.fn().mockResolvedValue([]),
    getRecentAchievements: vi.fn().mockResolvedValue([]),
  },
}));

describe('Achievement Toast Notifications (E-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve exibir notificação Toast dourada ao receber evento mist:achievement-unlocked', async () => {
    render(<App />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('mist:achievement-unlocked', {
          detail: {
            achievement_id: 'first_word',
            name: 'Primeira Palavra',
            description: 'Acertou sua primeira palavra na forca',
            rarity: 'Comum'
          }
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Conquista Desbloqueada/i)).toBeInTheDocument();
      expect(screen.getByText('Primeira Palavra')).toBeInTheDocument();
      expect(screen.getByText('Acertou sua primeira palavra na forca')).toBeInTheDocument();
    });
  });

  it('deve realizar polling leve e chamar getRecentAchievements quando autenticado', async () => {
    vi.useFakeTimers();

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: {
        username: 'ggtorres2001',
        walletBalance: 100,
        pointsBalance: 50,
      } as any,
      token: 'fake-token',
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    vi.mocked(libraryApi.getRecentAchievements).mockResolvedValue([
      {
        achievement_id: 'flawless_win',
        game_id: 13,
        name: 'Vitória Impecável',
        description: 'Venceu sem errar nenhuma letra',
        rarity: 'Raro'
      }
    ]);

    render(<App />);

    // Avança timers com suporte a async
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6500);
    });

    expect(libraryApi.getRecentAchievements).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
