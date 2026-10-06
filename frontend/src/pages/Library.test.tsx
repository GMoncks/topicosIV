import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Library } from './Library';
import { libraryApi, LibraryItemResponse } from '../api/client';
import * as AuthContextModule from '../context/AuthContext';

// Mock do libraryApi e storeApi
vi.mock('../api/client', () => ({
  libraryApi: {
    getMyGames: vi.fn(),
    getGameAchievements: vi.fn(),
    startSession: vi.fn(),
    markGameInstalled: vi.fn(),
  },
  storeApi: {
    downloadGamePackage: vi.fn(),
  },
}));


// Mock do AchievementsPanel para isolar o teste da Library
vi.mock('../components/AchievementsPanel', () => ({
  AchievementsPanel: ({ gameId, gameName }: { gameId: number; gameName: string }) => (
    <div data-testid={`achievements-panel-${gameId}`}>
      Painel de Conquistas de {gameName}
    </div>
  ),
}));

const mockGamesData: LibraryItemResponse[] = [
  {
    id: 1,
    user_id: 1,
    game_id: 13,
    acquired_at: '2026-09-20T10:00:00Z',
    playtime_minutes: 150, // 2h 30m
    is_installed: true,
    last_played: '2026-09-24T18:00:00Z',
    game: {
      title: 'MIST Forca',
      category: 'Casual',
      banner_url: 'https://images.unsplash.com/forca.jpg',
      developer: 'MIST Studios',
      publisher: 'MIST Studios',
    },
  },
  {
    id: 2,
    user_id: 1,
    game_id: 1,
    acquired_at: '2026-09-21T12:00:00Z',
    playtime_minutes: 0,
    is_installed: false,
    last_played: null,
    game: {
      title: 'The Blood of the Dawnwalker',
      category: 'RPG',
      banner_url: 'https://images.unsplash.com/dawnwalker.jpg',
      developer: 'Bandai Namco',
      publisher: 'Steam Imported',
    },
  },
];

describe('Library Page Component (D-04 & D-05)', () => {
  const openAuthModalMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve renderizar a tela de login exigido quando o usuário não estiver autenticado', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      openAuthModal: openAuthModalMock,
      user: null,
      token: null,
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    render(<Library />);

    expect(screen.getByText(/Faça login para ver sua biblioteca/i)).toBeInTheDocument();
    const loginButton = screen.getByRole('button', { name: /Entrar na Minha Conta/i });
    expect(loginButton).toBeInTheDocument();

    fireEvent.click(loginButton);
    expect(openAuthModalMock).toHaveBeenCalledWith('login');
  });

  it('deve exibir os jogos reais retornados pela API com badges de Publisher e playtime', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      openAuthModal: openAuthModalMock,
      user: { username: 'testuser' } as any,
      token: 'fake-token',
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    vi.mocked(libraryApi.getMyGames).mockResolvedValueOnce(mockGamesData);

    render(<Library />);

    // Aguarda o carregamento dos itens da biblioteca
    await waitFor(() => {
      expect(screen.getByText('MIST Forca')).toBeInTheDocument();
    });

    expect(screen.getByText('The Blood of the Dawnwalker')).toBeInTheDocument();

    // Valida exibição dos Publishers
    expect(screen.getAllByText('MIST Studios').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Steam Imported')).toBeInTheDocument();

    // Valida tempos de jogo formatados
    expect(screen.getByText('2h 30m jogados')).toBeInTheDocument();
    expect(screen.getByText('0 horas jogadas')).toBeInTheDocument();

    // Valida status de instalação
    expect(screen.getByText('Instalado')).toBeInTheDocument();
    expect(screen.getByText('Pronto para baixar')).toBeInTheDocument();
  });

  it('deve expandir e recolher o painel de conquistas ao clicar no botão Conquistas', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      openAuthModal: openAuthModalMock,
      user: { username: 'testuser' } as any,
      token: 'fake-token',
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    vi.mocked(libraryApi.getMyGames).mockResolvedValueOnce(mockGamesData);

    render(<Library />);

    await waitFor(() => {
      expect(screen.getByText('MIST Forca')).toBeInTheDocument();
    });

    // O painel de conquistas deve estar fechado inicialmente
    expect(screen.queryByTestId('achievements-panel-13')).not.toBeInTheDocument();

    // Clica no botão de Conquistas do primeiro jogo (MIST Forca)
    const conquestButtons = screen.getAllByRole('button', { name: /Ver conquistas de/i });
    fireEvent.click(conquestButtons[0]);

    // O painel agora deve estar visível
    expect(screen.getByTestId('achievements-panel-13')).toBeInTheDocument();

    // Clica novamente para fechar
    fireEvent.click(conquestButtons[0]);
    expect(screen.queryByTestId('achievements-panel-13')).not.toBeInTheDocument();
  });

  it('deve exibir mensagem amigável quando a biblioteca estiver vazia', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      openAuthModal: openAuthModalMock,
      user: { username: 'testuser' } as any,
      token: 'fake-token',
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    vi.mocked(libraryApi.getMyGames).mockResolvedValueOnce([]);

    const onNavigateToStore = vi.fn();
    render(<Library onNavigateToStore={onNavigateToStore} />);

    await waitFor(() => {
      expect(screen.getByText('Sua biblioteca está vazia')).toBeInTheDocument();
    });

    const exploreButton = screen.getByRole('button', { name: /Explorar a Loja/i });
    expect(exploreButton).toBeInTheDocument();

    fireEvent.click(exploreButton);
    expect(onNavigateToStore).toHaveBeenCalledTimes(1);
  });

  it('deve acionar download do pacote e emitir mist:start-download ao clicar no botão Baixar (E-06)', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      openAuthModal: openAuthModalMock,
      user: { username: 'testuser' } as any,
      token: 'fake-token',
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    vi.mocked(libraryApi.getMyGames).mockResolvedValueOnce(mockGamesData);

    const downloadMock = vi.fn().mockResolvedValue(new Blob(['mock-zip-content']));
    const { storeApi } = await import('../api/client');
    storeApi.downloadGamePackage = downloadMock;

    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();

    const startDownloadListener = vi.fn();
    window.addEventListener('mist:start-download', startDownloadListener as any);

    render(<Library />);

    await waitFor(() => {
      expect(screen.getByText('The Blood of the Dawnwalker')).toBeInTheDocument();
    });

    // Jogo 2 (The Blood of the Dawnwalker) não está instalado -> botão "Baixar"
    const downloadButton = screen.getByRole('button', { name: /^Baixar$/i });
    expect(downloadButton).toBeInTheDocument();


    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(downloadMock).toHaveBeenCalledWith(1);
      expect(startDownloadListener).toHaveBeenCalledTimes(1);
    });

    window.removeEventListener('mist:start-download', startDownloadListener as any);
  });

  it('prossegue com download simulado no frontend sem emitir toast de erro quando o jogo não possui pacote binário no backend (jogos não-MIST)', async () => {
    vi.mocked(libraryApi.getMyGames).mockResolvedValueOnce(mockGamesData);

    const downloadMock = vi.fn().mockRejectedValue(new Error('Este jogo não possui pacote de download direto disponível no momento.'));
    const { storeApi } = await import('../api/client');
    storeApi.downloadGamePackage = downloadMock;

    const startDownloadListener = vi.fn();
    const toastListener = vi.fn();
    window.addEventListener('mist:start-download', startDownloadListener as any);
    window.addEventListener('mist:toast', toastListener as any);

    render(<Library />);

    await waitFor(() => {
      expect(screen.getByText('The Blood of the Dawnwalker')).toBeInTheDocument();
    });

    const downloadButton = screen.getByRole('button', { name: /^Baixar$/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(downloadMock).toHaveBeenCalledWith(1);
      expect(startDownloadListener).toHaveBeenCalledTimes(1);
    });

    // Garante que o toast de erro NÃO foi disparado
    expect(toastListener).not.toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.stringContaining('Erro ao iniciar download')
      })
    );

    window.removeEventListener('mist:start-download', startDownloadListener as any);
    window.removeEventListener('mist:toast', toastListener as any);
  });

  it('deve transitar dinamicamente para Jogar ao receber evento mist:game-installed e chamar startSession (E-04 & E-06)', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      openAuthModal: openAuthModalMock,
      user: { username: 'testuser' } as any,
      token: 'fake-token',
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    vi.mocked(libraryApi.getMyGames).mockResolvedValueOnce(mockGamesData);
    vi.mocked(libraryApi.startSession).mockResolvedValueOnce({ status: 'active', session_id: 'sess_123' });

    render(<Library />);

    await waitFor(() => {
      expect(screen.getByText('The Blood of the Dawnwalker')).toBeInTheDocument();
    });

    // Simula conclusão do download vinda da DownloadBar
    fireEvent(
      window,
      new CustomEvent('mist:game-installed', {
        detail: { gameId: 1, gameTitle: 'The Blood of the Dawnwalker' }
      })
    );

    // Agora o jogo 1 deve exibir "Jogar"
    await waitFor(() => {
      const playButtons = screen.getAllByRole('button', { name: /Jogar/i });
      expect(playButtons.length).toBe(2);
    });

    // Clica em "Jogar" no primeiro jogo
    const playButtons = screen.getAllByRole('button', { name: /Jogar/i });
    fireEvent.click(playButtons[0]);

    await waitFor(() => {
      expect(libraryApi.startSession).toHaveBeenCalled();
    });
  });

  it('filtra e não exibe jogo inexistente ou corrompido com game_id 0', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      openAuthModal: openAuthModalMock,
      user: { username: 'testuser' } as any,
      token: 'fake-token',
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
      updateUserCosmetics: vi.fn(),
      updateUserProfile: vi.fn(),
    });

    vi.mocked(libraryApi.getMyGames).mockResolvedValueOnce([
      ...mockGamesData,
      {
        id: 999,
        user_id: 1,
        game_id: 0,
        acquired_at: '2026-09-26T12:00:00Z',
        playtime_minutes: 0,
        is_installed: false,
        last_played: null,
        game: null as any,
      },
    ]);

    render(<Library />);

    await waitFor(() => {
      expect(screen.getByText('MIST Forca')).toBeInTheDocument();
    });

    expect(screen.queryByText('Jogo #0')).toBeNull();
  });

  it('persiste o status de jogo instalado entre reloads e notifica o backend ao receber mist:game-installed', async () => {
    localStorage.clear();

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      openAuthModal: vi.fn(),
      user: { username: 'testuser' } as any,
      token: 'fake-token',
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
      updateUserCosmetics: vi.fn(),
      updateUserProfile: vi.fn(),
    });

    // Jogo 1 retorna is_installed: false da API
    vi.mocked(libraryApi.getMyGames).mockResolvedValue(mockGamesData);
    vi.mocked(libraryApi.markGameInstalled).mockResolvedValue({ status: 'installed', is_installed: true });

    const { unmount } = render(<Library />);

    await waitFor(() => {
      expect(screen.getByText('The Blood of the Dawnwalker')).toBeInTheDocument();
    });

    // Simula evento de download concluído para o jogo 1
    fireEvent(
      window,
      new CustomEvent('mist:game-installed', {
        detail: { gameId: 1, gameTitle: 'The Blood of the Dawnwalker' }
      })
    );

    // Valida que o backend foi acionado
    await waitFor(() => {
      expect(libraryApi.markGameInstalled).toHaveBeenCalledWith(1);
    });

    // Valida que foi salvo no localStorage
    const saved = JSON.parse(localStorage.getItem('mist_installed_game_ids') || '[]');
    expect(saved).toContain(1);

    // Desmonta e remonta a Library (simulando troca de aba ou reload)
    unmount();

    // Na nova montagem, mesmo que a API ainda retornasse is_installed: false
    render(<Library />);

    await waitFor(() => {
      const playButtons = screen.getAllByRole('button', { name: /Jogar/i });
      // Tanto o jogo 2 (já instalado no mock) quanto o jogo 1 (salvo no localStorage) devem ter "Jogar"
      expect(playButtons.length).toBe(2);
    });
  });

  it('exibe modal instrutivo com orientações multiplataforma (jogar.bat e jogar.sh) ao clicar em Jogar para jogos MIST Studios', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      openAuthModal: vi.fn(),
      user: { username: 'testuser' } as any,
      token: 'fake-token',
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
      updateUserCosmetics: vi.fn(),
      updateUserProfile: vi.fn(),
    });

    vi.mocked(libraryApi.getMyGames).mockResolvedValueOnce(mockGamesData);
    vi.mocked(libraryApi.startSession).mockResolvedValueOnce({ status: 'active', session_id: 'sess_forca_1' });

    render(<Library />);

    await waitFor(() => {
      expect(screen.getByText('MIST Forca')).toBeInTheDocument();
    });

    // Clica em "Jogar" para o MIST Forca (já instalado)
    const playButtons = screen.getAllByRole('button', { name: /Jogar/i });
    fireEvent.click(playButtons[0]);

    // Valida que a sessão foi iniciada no backend
    await waitFor(() => {
      expect(libraryApi.startSession).toHaveBeenCalledWith(13);
    });

    // Valida que o modal com instruções multiplataforma apareceu
    expect(screen.getByText('Jogando MIST Forca')).toBeInTheDocument();
    expect(screen.getByText('No Windows')).toBeInTheDocument();
    expect(screen.getByText('jogar.bat')).toBeInTheDocument();
    expect(screen.getByText(/No Linux ou macOS/i)).toBeInTheDocument();
    expect(screen.getByText(/chmod \+x jogar\.sh && \.\/jogar\.sh/i)).toBeInTheDocument();
    expect(screen.getByText(/Baixar Pacote Novamente/i)).toBeInTheDocument();

    // Fecha o modal ao clicar em "Entendi, vamos jogar!"
    const closeBtn = screen.getByRole('button', { name: /Entendi, vamos jogar!/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Jogando MIST Forca')).not.toBeInTheDocument();
    });
  });
});

