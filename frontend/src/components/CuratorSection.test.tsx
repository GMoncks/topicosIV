import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CuratorSection } from './CuratorSection';
import { storeApi, GameApiResponse } from '../api/client';

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

describe('CuratorSection Component (G-02 & G-05)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza os cards recomendados com score de afinidade e justificativa', async () => {
    vi.spyOn(storeApi, 'getRecommendations').mockResolvedValue(mockRecommendations);

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

  it('dispara onSelectGame ao clicar no card', async () => {
    vi.spyOn(storeApi, 'getRecommendations').mockResolvedValue(mockRecommendations);

    const onSelectMock = vi.fn();
    const onBuyMock = vi.fn();

    render(
      <CuratorSection
        onSelectGame={onSelectMock}
        onBuyGame={onBuyMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MIST Dungeon Crawler')).toBeInTheDocument();
    });

    const card = screen.getByTestId('curator-card-11');
    fireEvent.click(card);

    expect(onSelectMock).toHaveBeenCalledWith(11);
  });
});
