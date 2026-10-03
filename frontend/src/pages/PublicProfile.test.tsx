import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicProfile } from './PublicProfile';
import { publicProfileApi, socialApi } from '../api/client';
import { PublicProfileResponse } from '../types';

vi.mock('../api/client', () => ({
  publicProfileApi: {
    getPublicProfile: vi.fn(),
    updatePrivacySettings: vi.fn(),
  },
  socialApi: {
    sendFriendRequest: vi.fn(),
  },
}));

describe('PublicProfile Component (Bloco P)', () => {
  const baseProfile: PublicProfileResponse = {
    id: 105,
    username: 'gamer_ninja',
    real_name: 'Ninja Gamer',
    location: 'São Paulo, Brasil',
    level: 5,
    total_xp: 2500,
    status: 'Online',
    relationship: 'none',
    games: [
      { id: 1, game_id: 1, title: 'Cyberpulse 2077', playtime_minutes: 180, banner_url: '' },
    ],
    achievements_count: 15,
    playtime_minutes: 180,
    inventory_count: 8,
    screenshots_count: 4,
    groups: [],
    badges: [
      { id: 1, name: 'Cyber Hero', icon_url: 'https://example.com/badge.png', rarity: 'Lendário' }
    ],
    privacy_settings: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FRONT-UNIT-49: Exibe badge de relação correto para Amigo, Próprio Usuário e Visitante', async () => {
    // 1. Visitante (none)
    vi.mocked(publicProfileApi.getPublicProfile).mockResolvedValueOnce({
      ...baseProfile,
      relationship: 'none',
    });

    const { unmount } = render(<PublicProfile username="visitor_ninja" />);
    await waitFor(() => {
      expect(screen.getByText('gamer_ninja')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-add-friend')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-relation-badge-self')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-relation-badge-friend')).not.toBeInTheDocument();
    unmount();

    // 2. Amigo
    vi.mocked(publicProfileApi.getPublicProfile).mockResolvedValueOnce({
      ...baseProfile,
      relationship: 'friend',
    });
    const { unmount: unmountFriend } = render(<PublicProfile username="friend_ninja" onNavigateToSocial={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-relation-badge-friend')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-send-message')).toBeInTheDocument();
    unmountFriend();

    // 3. Próprio usuário (self)
    vi.mocked(publicProfileApi.getPublicProfile).mockResolvedValueOnce({
      ...baseProfile,
      relationship: 'self',
      privacy_settings: {
        privacy_games: 'Todos',
        privacy_achievements: 'Todos',
        privacy_playtime: 'Todos',
        privacy_inventory: 'Todos',
        privacy_screenshots: 'Todos',
        privacy_groups: 'Todos',
      },
    });
    const { unmount: unmountSelf } = render(<PublicProfile username="self_ninja" />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-relation-badge-self')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-privacy-settings')).toBeInTheDocument();
    unmountSelf();
  });

  it('FRONT-UNIT-50: Seções com privacidade privada exibem placeholder de cadeado / oculto', async () => {
    vi.mocked(publicProfileApi.getPublicProfile).mockResolvedValueOnce({
      ...baseProfile,
      relationship: 'none',
      games: null,
      achievements_count: null,
      playtime_minutes: null,
      inventory_count: null,
    });

    render(<PublicProfile username="gamer_ninja" />);
    await waitFor(() => {
      expect(screen.getByText('gamer_ninja')).toBeInTheDocument();
    });

    expect(screen.getByTestId('section-hidden-games')).toBeInTheDocument();
    expect(screen.getByTestId('section-hidden-playtime')).toBeInTheDocument();
    expect(screen.getByTestId('section-hidden-achievements')).toBeInTheDocument();
    expect(screen.getByTestId('section-hidden-inventory')).toBeInTheDocument();
  });

  it('FRONT-UNIT-51: Exibe ID de usuário no perfil e permite cópia para solicitação de amizade', async () => {
    vi.mocked(publicProfileApi.getPublicProfile).mockResolvedValueOnce(baseProfile);

    render(<PublicProfile username="gamer_ninja" />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-user-id')).toHaveTextContent('ID: 105');
    });

    const copyBtn = screen.getByTestId('btn-copy-user-id');
    expect(copyBtn).toBeInTheDocument();
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(screen.getByText('Copiado!')).toBeInTheDocument();
    });
  });
});
