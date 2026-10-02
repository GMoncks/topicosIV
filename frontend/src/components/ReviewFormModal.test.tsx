import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewFormModal } from './ReviewFormModal';
import { reviewApi, ReviewApiResponse } from '../api/client';

vi.mock('../api/client', () => ({
  reviewApi: {
    submitReview: vi.fn(),
  },
}));

describe('ReviewFormModal Component', () => {
  const existingReview: ReviewApiResponse = {
    id: 1,
    user_id: 10,
    game_id: 5,
    is_recommended: true,
    text: 'Já joguei bastante e recomendo.',
    playtime_at_review: 300,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    helpful_count: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props: Partial<Parameters<typeof ReviewFormModal>[0]> = {}) => {
    const defaultProps = {
      gameId: 5,
      gameTitle: 'Cyberpunk Odyssey',
      isOpen: true,
      existingReview: null,
      onClose: vi.fn(),
      onSubmitted: vi.fn(),
    };
    return {
      ...render(<ReviewFormModal {...defaultProps} {...props} />),
      props: { ...defaultProps, ...props },
    };
  };

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('mantém o botão de publicar desabilitado até recomendação e texto serem preenchidos', () => {
    renderModal();

    const submitButton = screen.getByRole('button', { name: /Publicar avaliação/i });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Sua avaliação'), { target: { value: 'Muito bom!' } });
    expect(submitButton).not.toBeDisabled();
  });

  it('não habilita o envio com texto apenas de espaços em branco', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));
    fireEvent.change(screen.getByLabelText('Sua avaliação'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /Publicar avaliação/i })).toBeDisabled();
  });

  it('envia a avaliação e chama onSubmitted e onClose em caso de sucesso', async () => {
    const created: ReviewApiResponse = {
      id: 2,
      user_id: 10,
      game_id: 5,
      is_recommended: true,
      text: 'Muito bom!',
      playtime_at_review: 45,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      helpful_count: 0,
    };
    (reviewApi.submitReview as any).mockResolvedValue(created);
    const listener = vi.fn();
    window.addEventListener('mist:review-submitted', listener);

    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));
    fireEvent.change(screen.getByLabelText('Sua avaliação'), { target: { value: 'Muito bom!' } });
    fireEvent.click(screen.getByRole('button', { name: /Publicar avaliação/i }));

    await waitFor(() => {
      expect(reviewApi.submitReview).toHaveBeenCalledWith(5, { is_recommended: true, text: 'Muito bom!' });
      expect(props.onSubmitted).toHaveBeenCalledWith(created);
      expect(props.onClose).toHaveBeenCalled();
      expect(listener).toHaveBeenCalled();
    });

    window.removeEventListener('mist:review-submitted', listener);
  });

  it('exibe a mensagem de erro retornada pela API e não fecha a modal em caso de falha', async () => {
    (reviewApi.submitReview as any).mockRejectedValue(new Error('Apenas quem possui o jogo pode avaliá-lo.'));
    const { props } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Não' }));
    fireEvent.change(screen.getByLabelText('Sua avaliação'), { target: { value: 'Não gostei' } });
    fireEvent.click(screen.getByRole('button', { name: /Publicar avaliação/i }));

    expect(await screen.findByText('Apenas quem possui o jogo pode avaliá-lo.')).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('pré-preenche o formulário e rotula como edição quando existingReview é fornecido', () => {
    renderModal({ existingReview });

    expect(screen.getByText('Editar avaliação')).toBeInTheDocument();
    expect(screen.getByLabelText('Sua avaliação')).toHaveValue(existingReview.text);
    expect(screen.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Atualizar avaliação/i })).toBeInTheDocument();
    expect(screen.getByText(/300 min jogados na última avaliação/)).toBeInTheDocument();
  });
});
