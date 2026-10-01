import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Profile } from './Profile';
import { profileApi, libraryApi, socialApi } from '../api/client';
import * as AuthContextModule from '../context/AuthContext';

vi.mock('../api/client', () => ({
  profileApi: {
    getInventory: vi.fn(),
    equipCosmetic: vi.fn(),
  },
  libraryApi: {
    getMyGames: vi.fn(),
    getGameAchievements: vi.fn(),
  },
  socialApi: {
    getFeed: vi.fn(),
  },
}));

describe('Profile Component - Cosmetics and Inventory Section', () => {
  const mockUser = {
    username: 'ggtorres2001',
    realName: 'Gabriel Torres',
    location: 'Brasil',
    level: 10,
    avatarText: 'GG',
    avatarUrl: 'https://images.unsplash.com/avatar.jpg',
    avatarFrameUrl: 'https://images.unsplash.com/frame_neon.jpg',
    profileBackgroundUrl: 'https://images.unsplash.com/bg_twilight.jpg',
    status: 'Online' as const,
    walletBalance: 150.0,
    pointsBalance: 2500,
    featuredBadge: { title: 'Pioneiro MIST', xp: 190, icon: 'fa-certificate' },
    recentPlaytimeWeeks: 5.0,
    recentGames: [],
    badges: [],
    stats: {
      gamesCount: 22,
      inventoryCount: 2,
      screenshotsCount: 5,
      videosCount: 1,
      workshopCount: 0,
      reviewsCount: 3,
    },
  };

  const mockInventoryItems = [
    {
      id: 1,
      user_id: 1,
      item_id: 'frame_neon',
      name: 'Moldura Neon Cyberpunk',
      item_type: 'avatar_frame' as const,
      asset_url: 'https://images.unsplash.com/frame_neon.jpg',
      price_points: 1000,
      is_equipped: true,
      acquired_at: '2026-09-26T12:00:00Z',
    },
    {
      id: 2,
      user_id: 1,
      item_id: 'bg_twilight',
      name: 'Maré Crepuscular',
      item_type: 'background' as const,
      asset_url: 'https://images.unsplash.com/bg_twilight.jpg',
      price_points: 500,
      is_equipped: false,
      acquired_at: '2026-09-26T12:05:00Z',
    },
  ];

  const mockLibraryGames = [
    {
      id: 101,
      user_id: 1,
      game_id: 13,
      acquired_at: '2026-09-20T10:00:00Z',
      playtime_minutes: 180, // 3h
      is_installed: true,
      last_played: '2026-09-26T15:00:00Z',
      game: {
        title: 'MIST Forca',
        category: 'Casual',
        banner_url: 'https://images.unsplash.com/forca.jpg',
        developer: 'MIST Studios',
        publisher: 'MIST Studios',
      },
    },
    {
      id: 102,
      user_id: 1,
      game_id: 1,
      acquired_at: '2026-09-21T12:00:00Z',
      playtime_minutes: 90,
      is_installed: false,
      last_played: '2026-09-25T18:00:00Z',
      game: {
        title: 'The Blood of the Dawnwalker',
        category: 'RPG',
        banner_url: 'https://images.unsplash.com/dawnwalker.jpg',
        developer: 'Bandai Namco',
        publisher: 'Steam Imported',
      },
    },
  ];

  const mockGameAchievements = [
    { id: 1, game_id: 13, achievement_id: 'a1', name: 'Primeira Palavra', is_unlocked: true, icon_url: 'fa-trophy' },
    { id: 2, game_id: 13, achievement_id: 'a2', name: 'Mestre do Vocabulário', is_unlocked: false, icon_url: 'fa-trophy' },
  ];

  const mockFeedActivities = [
    {
      id: 99,
      user_id: 1,
      type: 'achievement_unlocked',
      payload: {
        game_id: 13,
        game_title: 'MIST Forca',
        achievement_id: 'a1',
        name: 'Primeira Palavra',
        rarity: 'Comum',
      },
      created_at: '2026-09-26T16:00:00Z',
    },
    {
      id: 98,
      user_id: 1,
      type: 'game_purchased',
      payload: {
        game_id: 1,
        game_title: 'The Blood of the Dawnwalker',
        price: 249.9,
      },
      created_at: '2026-09-26T15:30:00Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      token: 'valid-jwt',
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
      updateUserCosmetics: vi.fn(),
    });
    vi.spyOn(profileApi, 'getInventory').mockResolvedValue({
      items: mockInventoryItems,
      total: mockInventoryItems.length,
    });
    vi.spyOn(libraryApi, 'getMyGames').mockResolvedValue(mockLibraryGames);
    vi.spyOn(libraryApi, 'getGameAchievements').mockResolvedValue(mockGameAchievements);
    vi.spyOn(socialApi, 'getFeed').mockResolvedValue(mockFeedActivities);
  });

  it('renderiza o plano de fundo personalizado e a moldura cosmética do usuário', async () => {
    render(<Profile />);

    const bg = screen.getByTestId('profile-custom-background');
    expect(bg).toBeDefined();
    expect(bg.style.backgroundImage).toContain('bg_twilight.jpg');

    const frame = screen.getByTestId('profile-equipped-frame');
    expect(frame).toBeDefined();
    expect(frame.style.backgroundImage).toContain('frame_neon.jpg');

    // Confirma que não há seta de dropdown ao lado do username
    const angleDown = document.querySelector('.fa-angle-down');
    expect(angleDown).toBeNull();
  });

  it('permite alternar para a seção de inventário e lista os cosméticos', async () => {
    render(<Profile />);

    const inventoryTabBtn = screen.getByRole('button', { name: /Inventário de Cosméticos/i });
    fireEvent.click(inventoryTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('profile-inventory-section')).toBeDefined();
    });

    expect(screen.getByText('Moldura Neon Cyberpunk')).toBeDefined();
    expect(screen.getByText('Maré Crepuscular')).toBeDefined();
  });

  it('permite equipar e desequipar cosméticos do inventário', async () => {
    const mockUpdateCosmetics = vi.fn();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      token: 'valid-jwt',
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
      updateUserCosmetics: mockUpdateCosmetics,
    });

    vi.spyOn(profileApi, 'equipCosmetic').mockResolvedValue({
      success: true,
      message: "'Maré Crepuscular' equipado com sucesso!",
      equipped_item: { ...mockInventoryItems[1], is_equipped: true },
      avatar_frame_url: 'https://images.unsplash.com/frame_neon.jpg',
      profile_background_url: 'https://images.unsplash.com/bg_twilight.jpg',
    });

    render(<Profile />);

    fireEvent.click(screen.getByRole('button', { name: /Inventário de Cosméticos/i }));

    await waitFor(() => {
      expect(screen.getByText('Maré Crepuscular')).toBeDefined();
    });

    const equipBtns = screen.getAllByRole('button', { name: /Equipar no Perfil/i });
    expect(equipBtns.length).toBeGreaterThan(0);
    fireEvent.click(equipBtns[0]);

    await waitFor(() => {
      expect(profileApi.equipCosmetic).toHaveBeenCalledWith(2, 'equip');
    });
  });

  it('exibe a atividade recente inteligente integrada com conquistas e compras reais', async () => {
    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-recent-activity-section')).toBeDefined();
    });

    // Conquista desbloqueada exibida dinamicamente
    expect(screen.getAllByText(/Primeira Palavra/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/The Blood of the Dawnwalker/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/R\$ 249.90/i)).toBeDefined();
  });

  it('abre a listagem de jogos reais ao clicar em Jogos, com progresso de conquistas e tempo de jogo', async () => {
    render(<Profile />);

    // Clica no botão Jogos na barra lateral ou na aba
    const gamesSidebarLink = screen.getByTestId('sidebar-games-link');
    fireEvent.click(gamesSidebarLink);

    await waitFor(() => {
      expect(screen.getByTestId('profile-games-section')).toBeDefined();
    });

    // Exibe os jogos reais da biblioteca
    expect(screen.getByTestId('profile-game-card-13')).toBeDefined();
    expect(screen.getByTestId('profile-game-card-1')).toBeDefined();

    // Exibe tempo de jogo e barra/estatísticas de conquistas
    expect(screen.getByText(/3 horas registradas/i)).toBeDefined();
    expect(screen.getAllByText(/1\/2/i).length).toBeGreaterThan(0); // 1 de 2 conquistas desbloqueadas
  });

  it('aplica estilização dourada quando a moldura equipada for a Moldura Mestre Dourada (frame_gold)', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: {
        ...mockUser,
        avatarFrameUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
      },
      token: 'valid-jwt',
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
      updateUserCosmetics: vi.fn(),
    });

    render(<Profile />);

    const container = screen.getByTestId('profile-avatar-container');
    expect(container.className).toContain('ring-amber-400');
    expect(container.className).toContain('border-amber-300');

    const frame = screen.getByTestId('profile-equipped-frame');
    expect(frame.className).toContain('border-amber-300');
  });

  it('ignora registros espúrios com game_id 0 na biblioteca do perfil', async () => {
    vi.spyOn(libraryApi, 'getMyGames').mockResolvedValue([
      ...mockLibraryGames,
      {
        id: 999,
        user_id: 1,
        game_id: 0,
        acquired_at: '2026-09-26T12:00:00Z',
        playtime_minutes: 0,
        is_installed: false,
        game: null as any,
      },
    ]);

    render(<Profile />);

    fireEvent.click(screen.getByTestId('sidebar-games-link'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-games-section')).toBeDefined();
    });

    expect(screen.queryByTestId('profile-game-card-0')).toBeNull();
    expect(screen.queryByText('Jogo #0')).toBeNull();
  });
});


