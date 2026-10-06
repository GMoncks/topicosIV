import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Store } from './Store';
import { storeApi, libraryApi } from '../api/client';
import * as AuthContextModule from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';

vi.mock('../api/client', () => ({
  storeApi: {
    listGames: vi.fn(),
    getRecommendations: vi.fn(),
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
  },
  libraryApi: {
    getMyGames: vi.fn(),
  },
}));

vi.mock('../components/CuratorSection', () => ({
  CuratorSection: () => <div data-testid="curator-section-mock">Curator Section Mock</div>,
}));

describe('Store Page Subtab Layout and Curator Positioning', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('mist_token', 'mock-jwt-token');

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: 'player1', email: 'p1@mist.local', wallet_balance: 100 },
      token: 'mock-jwt-token',
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateBalance: vi.fn(),
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
      isAuthModalOpen: false,
      authMode: 'login',
    });
    vi.spyOn(storeApi, 'listGames').mockResolvedValue([
      {
        id: 1,
        title: 'Jogo Alpha',
        price: 50.0,
        original_price: 100.0,
        discount_percentage: 50,
        tags: ['Ação'],
        category: 'Ação',
        banner_url: '',
        release_date: '2026-01-01',
        developer: 'Dev',
        publisher: 'Pub',
        review_score: 9.0,
      },
      {
        id: 2,
        title: 'Jogo Beta',
        price: 30.0,
        tags: ['RPG'],
        category: 'RPG',
        banner_url: '',
        release_date: '2026-01-01',
        developer: 'Dev',
        publisher: 'Pub',
        review_score: 8.5,
      },
    ]);
    vi.spyOn(storeApi, 'getRecommendations').mockResolvedValue([]);
    vi.spyOn(storeApi, 'getWishlist').mockResolvedValue([{ id: 1, game_id: 2, user_id: 1, added_at: '' }]);
    vi.spyOn(libraryApi, 'getMyGames').mockResolvedValue([]);
  });

  it('exibe o Curator no topo na aba Destaques (destaques)', async () => {
    render(
      <CartProvider>
        <Store activeSubTab="destaques" />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('top-curator-section')).toBeInTheDocument();
      expect(screen.queryByTestId('bottom-curator-section')).not.toBeInTheDocument();
      expect(screen.getByText('Conteúdo para seus jogos')).toBeInTheDocument();
      expect(screen.getByText('Jogo Alpha')).toBeInTheDocument();
    });
  });

  it('exibe o Curator na parte de baixo na aba Lista de Desejos (wishlist)', async () => {
    render(
      <CartProvider>
        <Store activeSubTab="wishlist" />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('top-curator-section')).not.toBeInTheDocument();
      expect(screen.getByTestId('bottom-curator-section')).toBeInTheDocument();
      expect(screen.getByText('Sua Lista de Desejos')).toBeInTheDocument();
      expect(screen.getByText('Jogo Beta')).toBeInTheDocument();
      expect(screen.queryByText('Jogo Alpha')).not.toBeInTheDocument();
    });
  });

  it('exibe o Curator na parte de baixo na aba Promoções (promotions)', async () => {
    render(
      <CartProvider>
        <Store activeSubTab="promotions" />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('top-curator-section')).not.toBeInTheDocument();
      expect(screen.getByTestId('bottom-curator-section')).toBeInTheDocument();
      expect(screen.getByText('Ofertas e Promoções')).toBeInTheDocument();
      expect(screen.getByText('Jogo Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Jogo Beta')).not.toBeInTheDocument();
    });
  });
});
