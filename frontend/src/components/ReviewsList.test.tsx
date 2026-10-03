import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ReviewsList } from './ReviewsList';
import { reviewApi, ReviewApiResponse } from '../api/client';

vi.mock('../api/client', () => ({
  reviewApi: {
    listReviews: vi.fn(),
    markHelpful: vi.fn(),
  },
}));

function makeReview(overrides: Partial<ReviewApiResponse> = {}): ReviewApiResponse {
  return {
    id: 1,
    user_id: 10,
    game_id: 1,
    is_recommended: true,
    text: 'Ótimo jogo',
    playtime_at_review: 90,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    helpful_count: 0,
    ...overrides,
  };
}

describe('ReviewsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderList = (props: Partial<Parameters<typeof ReviewsList>[0]> = {}) => {
    const defaultProps = { gameId: 1, isAuthenticated: true, currentUserId: undefined };
    return render(<ReviewsList {...defaultProps} {...props} />);
  };

  it('mostra mensagem de vazio quando não há avaliações', async () => {
    (reviewApi.listReviews as any).mockResolvedValue([]);
    renderList();

    expect(await screen.findByText(/Ainda não há avaliações/i)).toBeInTheDocument();
  });

  it('lista as avaliações retornadas com badge de recomendação e horas jogadas', async () => {
    (reviewApi.listReviews as any).mockResolvedValue([
      makeReview({ id: 1, text: 'Recomendo muito', playtime_at_review: 125, is_recommended: true }),
      makeReview({ id: 2, text: 'Não curti', playtime_at_review: 30, is_recommended: false, user_id: 20 }),
    ]);
    renderList();

    expect(await screen.findByText('Recomendo muito')).toBeInTheDocument();
    expect(screen.getByText('Não curti')).toBeInTheDocument();
    expect(screen.getByText('Recomendado')).toBeInTheDocument();
    expect(screen.getByText('Não recomendado')).toBeInTheDocument();
    expect(screen.getByText('2.1h jogadas')).toBeInTheDocument();
    expect(screen.getByText('30 min jogados')).toBeInTheDocument();
  });

  it('busca novamente ao trocar a ordenação para "Mais úteis"', async () => {
    (reviewApi.listReviews as any).mockResolvedValue([]);
    renderList();

    await waitFor(() => {
      expect(reviewApi.listReviews).toHaveBeenCalledWith(1, { sort: 'recent' });
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Mais úteis' }));

    await waitFor(() => {
      expect(reviewApi.listReviews).toHaveBeenCalledWith(1, { sort: 'helpful' });
    });
  });

  it('marca uma avaliação como útil e atualiza a contagem exibida', async () => {
    (reviewApi.listReviews as any).mockResolvedValue([makeReview({ id: 7, user_id: 20, helpful_count: 1 })]);
    (reviewApi.markHelpful as any).mockResolvedValue({ review_id: 7, helpful_count: 2, created: true });
    renderList({ currentUserId: 10 });

    const helpfulButton = await screen.findByRole('button', { name: /Útil \(1\)/i });
    fireEvent.click(helpfulButton);

    await waitFor(() => {
      expect(reviewApi.markHelpful).toHaveBeenCalledWith(7);
      expect(screen.getByRole('button', { name: /Útil \(2\)/i })).toBeInTheDocument();
    });
  });

  it('desabilita o botão útil e marca "Sua avaliação" para o review do próprio usuário', async () => {
    (reviewApi.listReviews as any).mockResolvedValue([makeReview({ id: 3, user_id: 10 })]);
    renderList({ currentUserId: 10 });

    expect(await screen.findByText('Sua avaliação')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Útil/i })).toBeDisabled();
  });

  it('desabilita o botão útil quando o usuário não está autenticado', async () => {
    (reviewApi.listReviews as any).mockResolvedValue([makeReview({ id: 4 })]);
    renderList({ isAuthenticated: false });

    expect(await screen.findByRole('button', { name: /Útil/i })).toBeDisabled();
  });

  it('recarrega a lista ao receber o evento mist:review-submitted para o mesmo jogo', async () => {
    (reviewApi.listReviews as any).mockResolvedValue([]);
    renderList({ gameId: 1 });

    await waitFor(() => expect(reviewApi.listReviews).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new CustomEvent('mist:review-submitted', { detail: { gameId: 1 } }));
    });

    await waitFor(() => expect(reviewApi.listReviews).toHaveBeenCalledTimes(2));
  });

  it('exibe mensagem de erro quando a listagem falha', async () => {
    (reviewApi.listReviews as any).mockRejectedValue(new Error('Falha de rede'));
    renderList();

    expect(await screen.findByText('Falha de rede')).toBeInTheDocument();
  });
});
