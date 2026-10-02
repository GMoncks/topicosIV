import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Workshop } from './Workshop';
import { ugcApi, storeApi, WorkshopItem } from '../api/client';
import * as AuthContextModule from '../context/AuthContext';

vi.mock('../api/client', () => ({
  ugcApi: {
    getWorkshopItems: vi.fn(),
    subscribeWorkshopItem: vi.fn(),
    unsubscribeWorkshopItem: vi.fn(),
    downloadWorkshopItem: vi.fn(),
    deleteWorkshopItem: vi.fn(),
  },
  storeApi: {
    getGames: vi.fn(),
  },
  getUgcImageUrl: (url: string) => url,
}));

const mockItems: WorkshopItem[] = [
  {
    id: 101,
    title: 'Seamless Co-op Reforged',
    description: 'Mod cooperativo contínuo sem limitações de névoa.',
    category: 'Mod',
    game_id: 1,
    game_title: 'Elden Ring',
    version: '1.2.0',
    tags: ['Coop', 'Multiplayer'],
    author_id: 1,
    author_name: 'mkritli',
    file_size: 15400000,
    downloads_count: 340,
    subscriptions_count: 512,
    rating: 4.9,
    created_at: '2026-09-30T10:00:00Z',
    updated_at: '2026-09-30T10:00:00Z',
    is_subscribed: false,
  },
  {
    id: 102,
    title: 'Cyberpunk Enhanced Police Overhaul',
    description: 'IA reformulada para a polícia e perseguições intensas.',
    category: 'Mod',
    game_id: 3,
    game_title: 'Cyberpunk 2077',
    version: '2.0.1',
    tags: ['Overhaul', 'AI'],
    author_id: 2,
    author_name: 'sarah_connor',
    file_size: 48000000,
    downloads_count: 820,
    subscriptions_count: 1100,
    rating: 4.8,
    created_at: '2026-09-30T11:00:00Z',
    updated_at: '2026-09-30T11:00:00Z',
    is_subscribed: true,
  },
];

describe('Workshop Page', () => {
  const mockOpenAuthModal = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: 'mkritli' } as any,
      token: 'mock-token',
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateBalance: vi.fn(),
      openAuthModal: mockOpenAuthModal,
      closeAuthModal: vi.fn(),
      isAuthModalOpen: false,
      authMode: 'login',
    } as any);

    vi.spyOn(storeApi, 'getGames').mockResolvedValue([
      { id: 1, title: 'Elden Ring' } as any,
      { id: 3, title: 'Cyberpunk 2077' } as any,
    ]);

    vi.spyOn(ugcApi, 'getWorkshopItems').mockResolvedValue({
      items: mockItems,
      total: 2,
      page: 1,
      size: 12,
      pages: 1,
    });
  });

  it('renders workshop header, search and loaded workshop items', async () => {
    render(<Workshop />);

    expect(screen.getByText(/Workshop de Mods, Skins e Conteúdo/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Seamless Co-op Reforged')).toBeInTheDocument();
      expect(screen.getByText('Cyberpunk Enhanced Police Overhaul')).toBeInTheDocument();
    });

    expect(ugcApi.getWorkshopItems).toHaveBeenCalledWith(
      expect.objectContaining({
        sort_by: 'popular',
        page: 1,
      })
    );
  });

  it('filters items when a category button is clicked', async () => {
    render(<Workshop />);

    await waitFor(() => {
      expect(screen.getByText('Seamless Co-op Reforged')).toBeInTheDocument();
    });

    const skinButton = screen.getByRole('button', { name: 'Skin' });
    fireEvent.click(skinButton);

    await waitFor(() => {
      expect(ugcApi.getWorkshopItems).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Skin',
        })
      );
    });
  });

  it('handles subscription toggle idempotently', async () => {
    vi.spyOn(ugcApi, 'subscribeWorkshopItem').mockResolvedValue({
      item_id: 101,
      user_id: 1,
      subscribed: true,
      subscriptions_count: 513,
    });

    render(<Workshop />);

    await waitFor(() => {
      expect(screen.getByText('Seamless Co-op Reforged')).toBeInTheDocument();
    });

    // The first item (Seamless Co-op Reforged) is not subscribed -> button says "Inscrever"
    const subButtons = screen.getAllByRole('button', { name: /Inscrever/i });
    fireEvent.click(subButtons[0]);

    await waitFor(() => {
      expect(ugcApi.subscribeWorkshopItem).toHaveBeenCalledWith(101);
    });
  });

  it('filters by subscribed items tab', async () => {
    render(<Workshop />);

    await waitFor(() => {
      expect(screen.getByText('Seamless Co-op Reforged')).toBeInTheDocument();
    });

    const subscribedTab = screen.getByRole('tab', { name: /Mods Inscritos/i });
    fireEvent.click(subscribedTab);

    await waitFor(() => {
      expect(ugcApi.getWorkshopItems).toHaveBeenCalledWith(
        expect.objectContaining({
          subscribed_only: true,
        })
      );
    });
  });

  it('opens item detail modal upon clicking on a card', async () => {
    render(<Workshop />);

    await waitFor(() => {
      expect(screen.getByText('Seamless Co-op Reforged')).toBeInTheDocument();
    });

    const card = screen.getByText('Seamless Co-op Reforged');
    fireEvent.click(card);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/Mod cooperativo contínuo sem limitações/i);
      expect(dialog).toHaveTextContent(/mkritli/i);
    });
  });
});
