import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Profile } from './Profile';
import { profileApi, libraryApi, socialApi, ugcApi, cardsApi, WorkshopItem } from '../api/client';
import * as AuthContextModule from '../context/AuthContext';
import { UserProfile } from '../types';

vi.mock('../api/client', () => ({
  profileApi: {
    getInventory: vi.fn(),
    equipCosmetic: vi.fn(),
    updateProfile: vi.fn(),
  },
  libraryApi: {
    getMyGames: vi.fn(),
    getGameAchievements: vi.fn(),
  },
  socialApi: {
    getFeed: vi.fn(),
  },
  ugcApi: {
    getWorkshopItems: vi.fn(),
  },
  cardsApi: {
    getLevelProgress: vi.fn(),
    getUserBadges: vi.fn(),
  },
  getUgcImageUrl: (url: string) => url,
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
    expect(frame.getAttribute('data-frame-url') || frame.style.backgroundImage).toContain('frame_neon.jpg');

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
  });
});

const workshopMockUser: UserProfile = {
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
    vi.spyOn(profileApi, 'getInventory').mockResolvedValue({ total: 0, items: [] });
    vi.spyOn(libraryApi, 'getMyGames').mockResolvedValue([]);
    vi.spyOn(socialApi, 'getFeed').mockResolvedValue([]);
    vi.spyOn(ugcApi, 'getWorkshopItems').mockResolvedValue({
      items: mockCreations,
      total: 2,
      page: 1,
      size: 20,
      pages: 1,
    });
  });

  it('renders user workshop items count on profile menu', async () => {
    render(<Profile user={workshopMockUser} />);

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
    render(<Profile user={workshopMockUser} onNavigate={onNavigateMock} />);

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

  it('exibe a barra de XP progressivo no header e a aba de insígnias craftadas (K-06 & K-07)', async () => {
    vi.spyOn(cardsApi, 'getLevelProgress').mockResolvedValue({
      level: 5,
      total_xp: 2500,
      current_level_min_xp: 2500,
      next_level_min_xp: 3600,
      current_xp_in_level: 250,
      xp_needed_in_level: 1100,
      progress_percent: 23.0,
    });

    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-xp-header')).toBeInTheDocument();
      expect(screen.getByText('Nível MIST')).toBeInTheDocument();
      expect(screen.getByText('250 XP')).toBeInTheDocument();
    });

    const badgesTab = screen.getByTestId('profile-tab-badges');
    fireEvent.click(badgesTab);

    await waitFor(() => {
      expect(screen.getByTestId('profile-badges-section')).toBeInTheDocument();
      expect(screen.getByText('Insígnias Conquistadas')).toBeInTheDocument();
    });
  });

  it('permite iniciar edição do perfil, alterar nome, abrir modal de avatar e salvar alterações', async () => {
    vi.mocked(profileApi.updateProfile).mockResolvedValueOnce({
      id: 1,
      username: 'novo_ggtorres',
      real_name: 'Gabriel T',
      bio: 'Desenvolvedor MIST',
      location: 'Porto Alegre',
      avatar_url: 'https://mist.gg/new-avatar.png',
    });

    const testUser: any = {
      username: 'ggtorres2001',
      realName: 'Gabriel Torres',
      location: 'Brasil',
      level: 10,
      avatarText: 'GG',
      avatarUrl: 'https://images.unsplash.com/avatar.jpg',
      walletBalance: 150.0,
      pointsBalance: 2500,
      status: 'Online',
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

    render(<Profile user={testUser} />);

    // Clica em Editar perfil
    const btnEdit = screen.getByTestId('btn-edit-profile');
    fireEvent.click(btnEdit);

    // Verifica que o formulário de edição e o botão de alterar foto aparecem
    expect(screen.getByTestId('input-edit-username')).toBeInTheDocument();
    expect(screen.getByTestId('btn-change-avatar')).toBeInTheDocument();

    // Edita campos
    const inputUsername = screen.getByTestId('input-edit-username');
    fireEvent.change(inputUsername, { target: { value: 'novo_ggtorres' } });

    // Salva perfil
    const btnSave = screen.getByTestId('btn-save-profile');
    fireEvent.click(btnSave);

    await waitFor(() => {
      expect(profileApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'novo_ggtorres',
        })
      );
      expect(screen.getByText('Perfil atualizado com sucesso!')).toBeInTheDocument();
    });
  });
});

