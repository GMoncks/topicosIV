import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScreenshotUploadModal } from './ScreenshotUploadModal';
import { ugcApi } from '../api/client';

vi.mock('../api/client', () => ({
  ugcApi: {
    uploadScreenshot: vi.fn(),
  },
}));

describe('ScreenshotUploadModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  const renderModal = (props: Partial<Parameters<typeof ScreenshotUploadModal>[0]> = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
      defaultGameId: 1,
      defaultGameTitle: 'Elden Ring',
      availableGames: [{ id: 1, title: 'Elden Ring' }, { id: 2, title: 'Witcher 3' }],
    };
    return {
      ...render(<ScreenshotUploadModal {...defaultProps} {...props} />),
      props: { ...defaultProps, ...props },
    };
  };

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza título e botão desabilitado inicialmente', () => {
    renderModal();
    expect(screen.getByText('Publicar Captura de Tela')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Publicar Captura/i });
    expect(submitBtn).toBeDisabled();
  });

  it('rejeita arquivos que não sejam imagens válidas', async () => {
    renderModal();
    const file = new File(['mock content'], 'test.exe', { type: 'application/x-msdownload' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/Formato inválido/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publicar Captura/i })).toBeDisabled();
  });

  it('permite upload de imagem PNG válida e envia para API', async () => {
    const mockCreated = {
      id: 10,
      user_id: 1,
      user_name: 'testuser',
      game_id: 1,
      game_title: 'Elden Ring',
      caption: 'Boss derrotado',
      image_url: '/uploads/screen1.png',
      likes_count: 0,
      liked_by_me: false,
      created_at: '2026-09-30T12:00:00Z',
    };
    vi.mocked(ugcApi.uploadScreenshot).mockResolvedValueOnce(mockCreated);

    const { props } = renderModal();
    const file = new File(['fake image bytes'], 'screenshot.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    // Preview deve ser exibido
    expect(screen.getByAltText('Pré-visualização da captura')).toBeInTheDocument();

    // Adiciona legenda
    const captionInput = screen.getByPlaceholderText(/Descreva o momento marcante/i);
    fireEvent.change(captionInput, { target: { value: 'Boss derrotado' } });

    const submitBtn = screen.getByRole('button', { name: /Publicar Captura/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(ugcApi.uploadScreenshot).toHaveBeenCalledTimes(1);
      expect(props.onSuccess).toHaveBeenCalledWith(mockCreated);
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  it('exibe mensagem de erro caso a API falhe', async () => {
    vi.mocked(ugcApi.uploadScreenshot).mockRejectedValueOnce(new Error('Falha no upload do servidor'));

    renderModal();
    const file = new File(['fake image bytes'], 'screen.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Publicar Captura/i }));

    await waitFor(() => {
      expect(screen.getByText('Falha no upload do servidor')).toBeInTheDocument();
    });
  });
});
