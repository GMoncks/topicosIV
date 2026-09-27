import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameDetailModal } from './GameDetailModal';
import { storeApi, reviewApi, GameDetailApiResponse } from '../api/client';
import { CartProvider } from '../context/CartContext';

vi.mock('../api/client', () => ({
  storeApi: {
    getGameDetails: vi.fn(),
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
  },
  reviewApi: {
    listReviews: vi.fn(),
    submitReview: vi.fn(),
    markHelpful: vi.fn(),
  },
}));

describe('GameDetailModal Component', () => {
  const mockGameDetails: GameDetailApiResponse = {
    id: 1,
    title: 'Cyberpunk Odyssey',
    price: 149.99,
    developer: 'CD Project Red Clone',
    publisher: 'MIST Studios',
    release_date: '2025-01-01',
    description: 'Um RPG futurista incrível.',
    screenshots: [
      'https://placehold.co/800x450?text=Shot1',
      'https://placehold.co/800x450?text=Shot2',
      'https://placehold.co/800x450?text=Shot3',
    ],
    banner_url: 'https://placehold.co/1200x500?text=Banner',
    tags: ['RPG', 'Sci-Fi'],
    category: 'JOGO',
    review_score: 9.2,
    reviews_count: 0,
    positive_count: 0,
    approval_pct: null,
    approval_label: 'Sem avaliações',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (storeApi.getGameDetails as any).mockResolvedValue(mockGameDetails);
    (storeApi.getWishlist as any).mockResolvedValue([]);
    (reviewApi.listReviews as any).mockResolvedValue([]);
  });

  const renderModal = (props: Partial<Parameters<typeof GameDetailModal>[0]> = {}) => {
    const defaultProps = {
      gameId: 1,
      onClose: vi.fn(),
      onBuy: vi.fn(),
      onWishlistToggle: vi.fn(),
      isAuthenticated: true,
      isOwned: false,
      onOpenAuth: vi.fn(),
    };

    return {
      ...render(
        <CartProvider>
          <GameDetailModal {...defaultProps} {...props} />
        </CartProvider>
      ),
      props: { ...defaultProps, ...props },
    };
  };

  it('deve gerenciar setas inteligentes de navegação de screenshots (apenas quando houver fotos na direção)', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Odyssey')).toBeInTheDocument();
    });

    // Na foto 1 (índice 0): seta para esquerda não deve existir, seta para direita deve existir
    expect(screen.queryByLabelText('Foto anterior')).not.toBeInTheDocument();
    const nextBtn = screen.getByLabelText('Próxima foto');
    expect(nextBtn).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Avança para a foto 2 (índice 1): ambas as setas devem estar visíveis
    fireEvent.click(nextBtn);
    expect(screen.getByLabelText('Foto anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Próxima foto')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    // Avança para a foto 3 (índice 2, última): seta da direita desaparece
    fireEvent.click(screen.getByLabelText('Próxima foto'));
    expect(screen.getByLabelText('Foto anterior')).toBeInTheDocument();
    expect(screen.queryByLabelText('Próxima foto')).not.toBeInTheDocument();
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('deve disparar toast "Usuário não autenticado", fechar a modal e abrir login sem sobreposição ao tentar comprar/favoritar deslogado', async () => {
    const toastListener = vi.fn();
    window.addEventListener('mist:toast', toastListener);

    const { props } = renderModal({ isAuthenticated: false });

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Odyssey')).toBeInTheDocument();
    });

    const buyButton = screen.getByRole('button', { name: /Comprar agora/i });
    fireEvent.click(buyButton);

    // 1. Deve fechar a modal de detalhes
    expect(props.onClose).toHaveBeenCalled();
    // 2. Deve abrir a modal de autenticação
    expect(props.onOpenAuth).toHaveBeenCalled();
    // 3. Deve disparar evento de toast com mensagem exata
    expect(toastListener).toHaveBeenCalled();
    const eventDetail = toastListener.mock.calls[0][0].detail;
    expect(eventDetail).toBe('Usuário não autenticado. Realize o login');

    window.removeEventListener('mist:toast', toastListener);
  });

  it('deve alternar a Lista de Desejos de forma suave (otimista) e disparar evento mist:wishlist-updated', async () => {
    (storeApi.addToWishlist as any).mockResolvedValue({ id: 1, created: true });
    const wishlistListener = vi.fn();
    window.addEventListener('mist:wishlist-updated', wishlistListener);

    renderModal({ isAuthenticated: true });

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Odyssey')).toBeInTheDocument();
    });

    const wishlistButton = screen.getByRole('button', { name: /Lista de Desejos/i });
    expect(wishlistButton).toHaveTextContent('Lista de Desejos');

    fireEvent.click(wishlistButton);

    // Mudança de estado imediata (suave / sem flickering)
    expect(wishlistButton).toHaveTextContent('Na Lista de Desejos');

    await waitFor(() => {
      expect(storeApi.addToWishlist).toHaveBeenCalledWith(1);
      expect(wishlistListener).toHaveBeenCalled();
    });

    window.removeEventListener('mist:wishlist-updated', wishlistListener);
  });

  it('deve renderizar a tag "Adquirido" na extrema direita da linha de publisher e adaptar o botão para "Na Biblioteca" quando isOwned for true', async () => {
    renderModal({ isOwned: true });

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Odyssey')).toBeInTheDocument();
    });

    // Tag "Adquirido" visível
    const acquiredTags = screen.getAllByText('Adquirido');
    expect(acquiredTags.length).toBeGreaterThan(0);

    // Botão de compra substituído por "Na Biblioteca"
    expect(screen.getByText('Na Biblioteca')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Comprar agora/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Adicionar ao carrinho/i })).not.toBeInTheDocument();
  });

  it('deve exibir "Sem avaliações" quando o jogo não possui reviews e não mostrar botão de avaliar sem posse', async () => {
    renderModal({ isOwned: false });

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Odyssey')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Sem avaliações').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Escrever avaliação/i })).not.toBeInTheDocument();
  });

  it('deve exibir a aprovação calculada e permitir abrir o formulário de avaliação quando o usuário possui o jogo', async () => {
    (storeApi.getGameDetails as any).mockResolvedValue({
      ...mockGameDetails,
      reviews_count: 10,
      positive_count: 9,
      approval_pct: 90,
      approval_label: 'Muito Positivo - 90%',
    });
    (reviewApi.listReviews as any).mockResolvedValue([
      {
        id: 1,
        user_id: 99,
        game_id: 1,
        is_recommended: true,
        text: 'Excelente!',
        playtime_at_review: 120,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        helpful_count: 3,
      },
    ]);

    renderModal({ isOwned: true });

    await waitFor(() => {
      expect(screen.getByText('Cyberpunk Odyssey')).toBeInTheDocument();
    });

    expect(await screen.findByText('Muito Positivo - 90%')).toBeInTheDocument();

    const reviewButton = await screen.findByRole('button', { name: /Escrever avaliação/i });
    fireEvent.click(reviewButton);

    expect(await screen.findByText('Você recomenda este jogo?')).toBeInTheDocument();
    expect(await screen.findByText('Excelente!')).toBeInTheDocument();
  });
});
