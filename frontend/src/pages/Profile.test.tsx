import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Profile } from './Profile';
import { ugcApi, WorkshopItem } from '../api/client';
import { UserProfile } from '../types';

vi.mock('../api/client', () => ({
  ugcApi: {
    getWorkshopItems: vi.fn(),
  },
  getUgcImageUrl: (url: string) => url,
}));

const mockUser: UserProfile = {
  id: 1,
  username: 'mkritli',
  realName: 'Mohamad Kritli',
  location: 'São Paulo, Brazil',
  level: 12,
  avatarText: 'MK',
  status: 'Online',
  walletBalance: 150.0,
  pointsBalance: 450,
  featuredBadge: {
    title: 'Lenda MIST',
    xp: 500,
    icon: 'fa-trophy',
  },
  recentPlaytimeWeeks: 14.5,
  recentGames: [],
  badges: [],
  stats: {
    gamesCount: 30,
    inventoryCount: 60,
    screenshotsCount: 20,
    videosCount: 5,
    workshopCount: 2,
    reviewsCount: 15,
  },
};

const mockCreations: WorkshopItem[] = [
  {
    id: 201,
    title: 'Custom Night City HUD',
    description: 'Interface futurista minimalista.',
    category: 'Mod',
    game_id: 3,
    game_title: 'Cyberpunk 2077',
    version: '1.0.0',
    tags: ['HUD', 'UI'],
    author_id: 1,
    author_name: 'mkritli',
    file_size: 2500000,
    downloads_count: 140,
    subscriptions_count: 220,
    rating: 5.0,
    created_at: '2026-09-30T10:00:00Z',
    updated_at: '2026-09-30T10:00:00Z',
  },
  {
    id: 202,
    title: 'Golden Katana Skin',
    description: 'Textura dourada reluzente para katanas.',
    category: 'Skin',
    game_id: 1,
    game_title: 'Elden Ring',
    version: '1.1.0',
    tags: ['Skin', 'Weapon'],
    author_id: 1,
    author_name: 'mkritli',
    file_size: 5000000,
    downloads_count: 85,
    subscriptions_count: 110,
    rating: 4.8,
    created_at: '2026-09-30T11:00:00Z',
    updated_at: '2026-09-30T11:00:00Z',
  },
];

describe('Profile Page Workshop Integration (Ticket O-06)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ugcApi, 'getWorkshopItems').mockResolvedValue({
      items: mockCreations,
      total: 2,
      page: 1,
      size: 20,
      pages: 1,
    });
  });

  it('renders user workshop items count on profile menu', async () => {
    render(<Profile user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText('Itens da Oficina')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    expect(ugcApi.getWorkshopItems).toHaveBeenCalledWith({
      author_id: 1,
      size: 20,
    });
  });

  it('opens workshop creations modal and displays accumulated statistics upon clicking', async () => {
    const onNavigateMock = vi.fn();
    render(<Profile user={mockUser} onNavigate={onNavigateMock} />);

    await waitFor(() => {
      expect(screen.getByText('Itens da Oficina')).toBeInTheDocument();
    });

    const workshopMenuItem = screen.getByText('Itens da Oficina');
    fireEvent.click(workshopMenuItem);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Criações na Oficina • mkritli/i)).toBeInTheDocument();
      // Total downloads: 140 + 85 = 225
      expect(screen.getByText('225')).toBeInTheDocument();
      // Total subscriptions: 220 + 110 = 330
      expect(screen.getByText('330')).toBeInTheDocument();
      expect(screen.getByText('Custom Night City HUD')).toBeInTheDocument();
      expect(screen.getByText('Golden Katana Skin')).toBeInTheDocument();
    });

    const goToWorkshopBtn = screen.getByRole('button', { name: /Ir para a Oficina/i });
    fireEvent.click(goToWorkshopBtn);

    expect(onNavigateMock).toHaveBeenCalledWith('workshop');
  });
});
