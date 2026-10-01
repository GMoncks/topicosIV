import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PointsShop } from './PointsShop';
import { pointsShopApi } from '../api/client';

vi.mock('../api/client', () => ({
  pointsShopApi: {
    getItems: vi.fn(),
    purchase: vi.fn(),
  },
}));

describe('PointsShop Component', () => {
  const mockCatalogItems = [
    {
      id: 'frame_neon',
      name: 'Moldura Neon Cyberpunk',
      category: 'Moldura de avatar',
      item_type: 'avatar_frame' as const,
      price_points: 1000,
      asset_url: 'https://images.unsplash.com/frame_neon.jpg',
      description: 'Borda pulsante futurista',
      is_owned: false,
    },
    {
      id: 'p1',
      name: 'Maré Crepuscular',
      category: 'Plano de fundo do perfil',
      item_type: 'background' as const,
      price_points: 500,
      asset_url: 'https://images.unsplash.com/p1.jpg',
      description: 'Horizonte na praia',
      is_owned: true,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(pointsShopApi, 'getItems').mockResolvedValue(mockCatalogItems);
  });

  it('renderiza os itens do catálogo com preços em pontos e status de posse', async () => {
    render(<PointsShop initialPoints={2000} />);

    await waitFor(() => {
      expect(screen.getByText('Moldura Neon Cyberpunk')).toBeDefined();
      expect(screen.getByText('Maré Crepuscular')).toBeDefined();
    });

    // Item p1 já está adquirido
    expect(screen.getByText('Adquirido')).toBeDefined();
    // Item frame_neon está disponível para resgate
    expect(screen.getByText('Resgatar')).toBeDefined();
  });

  it('executa a compra chamando pointsShopApi.purchase e atualiza pontos', async () => {
    const handleUpdate = vi.fn();
    vi.spyOn(pointsShopApi, 'purchase').mockResolvedValue({
      success: true,
      message: "Cosmético 'Moldura Neon Cyberpunk' resgatado com sucesso!",
      item: {
        id: 10,
        user_id: 1,
        item_id: 'frame_neon',
        name: 'Moldura Neon Cyberpunk',
        item_type: 'avatar_frame',
        asset_url: 'https://images.unsplash.com/frame_neon.jpg',
        price_points: 1000,
        is_equipped: false,
        acquired_at: '2026-09-26T12:00:00Z',
      },
      new_points_balance: 1000,
    });

    render(<PointsShop initialPoints={2000} onPointsUpdate={handleUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Moldura Neon Cyberpunk')).toBeDefined();
    });

    const resgatarBtn = screen.getByRole('button', { name: /Resgatar/i });
    fireEvent.click(resgatarBtn);

    await waitFor(() => {
      expect(pointsShopApi.purchase).toHaveBeenCalledWith('frame_neon');
      expect(handleUpdate).toHaveBeenCalledWith(1000);
    });
  });

  it('exibe o banner atualizado com título "Loja de MIST Points" e descrição correta', async () => {
    render(<PointsShop initialPoints={1000} />);

    expect(screen.getByText('Loja de MIST Points')).toBeDefined();
    expect(
      screen.getByText('Personalize a sua experiência no MIST com molduras de avatar, planos de fundo exclusivos, e muito mais.')
    ).toBeDefined();
  });

  it('atualiza o saldo de pontos na interface ao receber o evento global mist:points-updated', async () => {
    render(<PointsShop initialPoints={500} />);

    expect(screen.getByTestId('points-shop-balance').textContent?.trim()).toBe('500');

    window.dispatchEvent(
      new CustomEvent('mist:points-updated', { detail: { points: 1500 } })
    );

    await waitFor(() => {
      expect(screen.getByTestId('points-shop-balance').textContent?.trim()).toBe('1.500');
    });
  });

  it('aplica estilização com borda dourada quando o item for a moldura Mestre Dourada', async () => {
    vi.spyOn(pointsShopApi, 'getItems').mockResolvedValueOnce([
      {
        id: 'frame_gold',
        name: 'Moldura Mestre Dourada',
        category: 'Moldura de avatar',
        item_type: 'avatar_frame' as const,
        price_points: 2000,
        asset_url: 'https://images.unsplash.com/1618005182384.jpg',
        description: 'Borda dourada de mestre',
        is_owned: false,
      },
    ]);

    render(<PointsShop initialPoints={2000} />);

    await waitFor(() => {
      expect(screen.getByText('Moldura Mestre Dourada')).toBeDefined();
    });

    const goldFrame = document.querySelector('.border-amber-400');
    expect(goldFrame).not.toBeNull();
  });
});
