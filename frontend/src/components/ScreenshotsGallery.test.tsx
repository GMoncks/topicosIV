import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScreenshotsGallery } from './ScreenshotsGallery';
import { ugcApi, ScreenshotItem } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return {
    ...actual,
    ugcApi: {
      getScreenshots: vi.fn(),
      likeScreenshot: vi.fn(),
      unlikeScreenshot: vi.fn(),
      uploadScreenshot: vi.fn(),
    },
  };
});

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ScreenshotsGallery Component', () => {
  const sampleScreenshots: ScreenshotItem[] = [
    {
      id: 1,
      user_id: 101,
      user_name: 'alex_gamer',
      user_avatar: undefined,
      game_id: 1,
      game_title: 'Elden Ring',
      caption: 'Vista magnífica da Árvore Sagrada',
      image_url: '/uploads/er_tree.png',
      likes_count: 5,
      liked_by_me: false,
      created_at: '2026-09-30T10:00:00Z',
    },
    {
      id: 2,
      user_id: 102,
      user_name: 'beatriz_cyber',
      user_avatar: undefined,
      game_id: 2,
      game_title: 'Cyberpunk 2077',
      caption: 'Luzes de neon em Night City',
      image_url: '/uploads/cp_neon.png',
      likes_count: 12,
      liked_by_me: true,
      created_at: '2026-09-30T11:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 101, username: 'alex_gamer' },
      isAuthenticated: true,
      openAuthModal: vi.fn(),
    });
    vi.mocked(ugcApi.getScreenshots).mockResolvedValue({
      items: sampleScreenshots,
      total: 2,
      page: 1,
      size: 12,
      pages: 1,
    });
  });

  it('carrega e exibe as capturas de tela com legendas e autores', async () => {
    render(<ScreenshotsGallery />);

    expect(await screen.findByText('Vista magnífica da Árvore Sagrada')).toBeInTheDocument();
    expect(screen.getByText('Luzes de neon em Night City')).toBeInTheDocument();
    expect(screen.getByText('alex_gamer')).toBeInTheDocument();
    expect(screen.getByText('beatriz_cyber')).toBeInTheDocument();
  });

  it('exibe mensagem amigável quando não há capturas', async () => {
    vi.mocked(ugcApi.getScreenshots).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      size: 12,
      pages: 0,
    });

    render(<ScreenshotsGallery />);

    expect(await screen.findByText(/Nenhuma captura de tela compartilhada/i)).toBeInTheDocument();
  });

  it('permite alternar ordenação para Mais Populares', async () => {
    render(<ScreenshotsGallery />);
    await screen.findByText('Vista magnífica da Árvore Sagrada');

    const popularBtn = screen.getByRole('button', { name: /Mais Populares/i });
    fireEvent.click(popularBtn);

    await waitFor(() => {
      expect(ugcApi.getScreenshots).toHaveBeenCalledWith(
        expect.objectContaining({ sort_by: 'popular' })
      );
    });
  });

  it('permite curtir uma captura de tela', async () => {
    vi.mocked(ugcApi.likeScreenshot).mockResolvedValueOnce({
      screenshot_id: 1,
      likes_count: 6,
      liked: true,
    });

    render(<ScreenshotsGallery />);
    await screen.findByText('Vista magnífica da Árvore Sagrada');

    const likeButtons = screen.getAllByRole('button', { name: /Curtir captura de tela/i });
    fireEvent.click(likeButtons[0]);

    await waitFor(() => {
      expect(ugcApi.likeScreenshot).toHaveBeenCalledWith(1);
    });
  });

  it('abre visualizador Lightbox ao clicar na imagem e permite fechar', async () => {
    render(<ScreenshotsGallery />);
    const captionEl = await screen.findByText('Vista magnífica da Árvore Sagrada');

    // Clica no card da captura
    fireEvent.click(captionEl);

    // Lightbox deve estar visível com contador '1 de 2'
    expect(screen.getByText('1 de 2')).toBeInTheDocument();

    // Fecha o lightbox
    const closeBtn = screen.getByRole('button', { name: /Fechar visualizador/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('1 de 2')).not.toBeInTheDocument();
  });
});
