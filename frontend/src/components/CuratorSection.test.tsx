import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CuratorSection } from './CuratorSection';
import { storeApi, GameApiResponse, WishlistAlert } from '../api/client';

const mockRecommendations: GameApiResponse[] = [
  {
    id: 10,
    title: 'MIST Space Odyssey',
    price: 49.99,
    tags: ['Espaço', 'Ficção Científica', 'Exploração'],
    category: 'Aventura',
    banner_url: 'https://picsum.photos/seed/space/400/200',
    release_date: '2026-01-01',
    developer: 'MIST Studios',
    publisher: 'MIST Publishing',
    review_score: 9.4,
    recommendation_score: 98,
    recommendation_reason: 'Recomendado porque você aprecia jogos com as características: Espaço, Exploração.',
  },
  {
    id: 11,
    title: 'MIST Dungeon Crawler',
    price: 0,
    tags: ['RPG', 'Masmorra'],
    category: 'RPG',
    banner_url: 'https://picsum.photos/seed/dungeon/400/200',
    release_date: '2026-02-01',
    developer: 'MIST Studios',
    publisher: 'MIST Publishing',
    review_score: 8.8,
    recommendation_score: 92,
    recommendation_reason: 'Destaque da comunidade MIST na categoria RPG com ótima avaliação.',
  },
];

const mockTopSellers: GameApiResponse[] = [
  {
    id: 20,
    title: 'MIST Cyber Warfare',
    price: 99.90,
    tags: ['Ação', 'Cyberpunk'],
    category: 'Ação',
    banner_url: 'https://picsum.photos/seed/cyber/400/200',
    release_date: '2026-01-15',
    developer: 'MIST Studios',
    publisher: 'MIST Publishing',
    review_score: 9.6,
    sales_count: 42,
  } as any,
];

const mockTrending: GameApiResponse[] = [
  {
    id: 30,
    title: 'MIST Neon Runner',
    price: 29.90,
    tags: ['Corrida', 'Arcade'],
    category: 'Corrida',
    banner_url: 'https://picsum.photos/seed/neon/400/200',
    release_date: '2026-02-10',
    developer: 'MIST Studios',
    publisher: 'MIST Publishing',
    review_score: 9.1,
    trending_score: 88.5,
    trending_reason: 'Em alta com 15 vendas nesta semana e avaliação 9.1/10!',
  } as any,
];

const mockWishlistAlerts: WishlistAlert[] = [
  {
    game_id: 10,
    title: 'MIST Space Odyssey',
    category: 'Aventura',
    original_price: 99.90,
    current_price: 49.99,
    discount_percentage: 50,
    savings: 49.91,
    message: "Grande oportunidade! 'MIST Space Odyssey' está com 50% OFF por R$ 49.99!",
  },
];

describe('CuratorSection Component (G-02, G-05 & Trilha 3 Bloco S)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renderiza os cards recomendados com score de afinidade e justificativa', async () => {
    vi.spyOn(storeApi, 'getRecommendations').mockResolvedValue(mockRecommendations);
    vi.spyOn(storeApi, 'getTopSellers').mockResolvedValue(mockTopSellers);
    vi.spyOn(storeApi, 'getTrending').mockResolvedValue(mockTrending);

    const onSelectMock = vi.fn();
    const onBuyMock = vi.fn();

    render(
      <CuratorSection
        onSelectGame={onSelectMock}
        onBuyGame={onBuyMock}
        ownedGameIds={new Set([10])}
      />
    );

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByText('Recomendado para Você')).toBeInTheDocument();
      expect(screen.getByText('MIST Space Odyssey')).toBeInTheDocument();
      expect(screen.getByText('MIST Dungeon Crawler')).toBeInTheDocument();
    });

    // Valida exibição de afinidade percentual
    expect(screen.getByText('98% afinidade')).toBeInTheDocument();
    expect(screen.getByText('92% afinidade')).toBeInTheDocument();

    // Valida justificativa personalizada
    expect(
      screen.getByText(/Recomendado porque você aprecia jogos com as características/i)
    ).toBeInTheDocument();

    // Jogo 10 está na biblioteca (owned)
    expect(screen.getByText('Na Biblioteca')).toBeInTheDocument();

    // Jogo 11 não está na biblioteca e é gratuito -> exibe 'Gratuito' e botão 'Comprar'
    expect(screen.getByText('Gratuito')).toBeInTheDocument();
  });

  it('alterna para a aba Top Vendidos e renderiza dados correspondentes', async () => {
    vi.spyOn(storeApi, 'getRecommendations').mockResolvedValue(mockRecommendations);
    vi.spyOn(storeApi, 'getTopSellers').mockResolvedValue(mockTopSellers);
    vi.spyOn(storeApi, 'getTrending').mockResolvedValue(mockTrending);

    render(
      <CuratorSection
        onSelectGame={vi.fn()}
        onBuyGame={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MIST Space Odyssey')).toBeInTheDocument();
    });

    // Clica na aba Top Vendidos
    const topSellersTab = screen.getByTestId('tab-curator-top-sellers');
    fireEvent.click(topSellersTab);

    await waitFor(() => {
      expect(screen.getByText('MIST Cyber Warfare')).toBeInTheDocument();
      expect(screen.getByText('42 vendas')).toBeInTheDocument();
    });
  });

  it('alterna para a aba Em Alta e renderiza tendências', async () => {
    vi.spyOn(storeApi, 'getRecommendations').mockResolvedValue(mockRecommendations);
    vi.spyOn(storeApi, 'getTopSellers').mockResolvedValue(mockTopSellers);
    vi.spyOn(storeApi, 'getTrending').mockResolvedValue(mockTrending);

    render(
      <CuratorSection
        onSelectGame={vi.fn()}
        onBuyGame={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MIST Space Odyssey')).toBeInTheDocument();
    });

    // Clica na aba Em Alta
    const trendingTab = screen.getByTestId('tab-curator-trending');
    fireEvent.click(trendingTab);

    await waitFor(() => {
      expect(screen.getByText('MIST Neon Runner')).toBeInTheDocument();
      expect(screen.getByText(/Em alta com 15 vendas/i)).toBeInTheDocument();
    });
  });

  it('renderiza o banner inteligente de promoções da Wishlist quando autenticado', async () => {
    localStorage.setItem('mist_token', 'valid_token');
    vi.spyOn(storeApi, 'getRecommendations').mockResolvedValue(mockRecommendations);
    vi.spyOn(storeApi, 'getTopSellers').mockResolvedValue(mockTopSellers);
    vi.spyOn(storeApi, 'getTrending').mockResolvedValue(mockTrending);
    vi.spyOn(storeApi, 'getWishlistAlerts').mockResolvedValue(mockWishlistAlerts);

    const onSelectMock = vi.fn();

    render(
      <CuratorSection
        onSelectGame={onSelectMock}
        onBuyGame={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('wishlist-smart-banner')).toBeInTheDocument();
      expect(screen.getByText(/Alerta da Wishlist/i)).toBeInTheDocument();
      expect(screen.getByText(/49.91/)).toBeInTheDocument();
    });


    // Clica no botão de ação da oferta
    const buyOfferBtn = screen.getByText(/Aproveitar Oferta/i);
    fireEvent.click(buyOfferBtn);
    expect(onSelectMock).toHaveBeenCalledWith(10);

    // Clica no botão de dispensar
    const dismissBtn = screen.getByLabelText('Dispensar');
    fireEvent.click(dismissBtn);
    expect(screen.queryByTestId('wishlist-smart-banner')).not.toBeInTheDocument();
  });
});
