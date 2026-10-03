import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsDropdown } from './NotificationsDropdown';
import { socialApi } from '../api/client';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser' },
    isAuthenticated: true,
  }),
}));

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    socialApi: {
      ...actual.socialApi,
      getNotifications: vi.fn(),
      markNotificationRead: vi.fn(),
      markAllNotificationsRead: vi.fn(),
    },
  };
});

describe('NotificationsDropdown Component (Bloco Q - Q-05 & Q-06)', () => {
  const mockNotifications = [
    {
      id: 1,
      user_id: 1,
      type: 'friend_request',
      title: 'Novo Pedido de Amizade',
      message: 'gabriel_t800 quer ser seu amigo',
      is_read: false,
      created_at: '2026-09-30T10:00:00Z',
    },
    {
      id: 2,
      user_id: 1,
      type: 'wishlist_discount',
      title: 'Desconto na Wishlist',
      message: 'Red Dead Redemption 2 com 50% OFF',
      payload: { game_id: 12, relevant_info: 'Promoção de 50% na Wishlist' },
      is_read: true,
      created_at: '2026-09-30T09:00:00Z',
    },
    {
      id: 3,
      user_id: 1,
      type: 'catalog_leaving',
      title: '3 jogos deixarão o catálogo MIST',
      message: 'Aproveite até 75% OFF de despedida',
      payload: {
        notice: {
          title: 'Comunicado Oficial: Rotação de Catálogo',
          content: 'Aproveite os descontos antes do encerramento.',
        },
      },
      is_read: false,
      created_at: '2026-09-30T08:00:00Z',
    },
    {
      id: 4,
      user_id: 1,
      type: 'achievement_unlocked',
      title: 'Conquista Desbloqueada',
      message: 'Você desbloqueou um troféu raro',
      payload: { game_id: 11 },
      is_read: false,
      created_at: '2026-09-30T07:00:00Z',
    },
    {
      id: 5,
      user_id: 1,
      type: 'wallet_deposit',
      title: 'Recarga Confirmada',
      message: 'Recarga de R$ 300,00 concluída',
      payload: { amount: 300, action: 'open_wallet' },
      is_read: false,
      created_at: '2026-09-30T06:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (socialApi.getNotifications as any).mockResolvedValue({
      items: mockNotifications,
      unread_count: 4,
      total: 5,
    });
  });

  const renderComponent = (props = {}) => {
    return render(<NotificationsDropdown {...props} />);
  };

  it('renderiza o botão de notificações com badge indicando itens não-lidos', async () => {
    renderComponent();

    const button = screen.getByTestId('notifications-button');
    expect(button).toBeInTheDocument();

    await waitFor(() => {
      const badge = screen.getByTestId('notifications-badge');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe('4');
    });
  });

  it('abre e fecha o dropdown ao clicar no botão do sino', async () => {
    renderComponent();

    const button = screen.getByTestId('notifications-button');

    // Inicialmente fechado
    expect(screen.queryByTestId('notifications-dropdown')).toBeNull();

    // Abre ao clicar
    fireEvent.click(button);
    expect(screen.getByTestId('notifications-dropdown')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Novo Pedido de Amizade')).toBeInTheDocument();
      expect(screen.getByText('Desconto na Wishlist')).toBeInTheDocument();
      expect(screen.getByText('3 jogos deixarão o catálogo MIST')).toBeInTheDocument();
    });

    // Fecha ao clicar novamente
    fireEvent.click(button);
    expect(screen.queryByTestId('notifications-dropdown')).toBeNull();
  });

  it('permite marcar todas as notificações como lidas', async () => {
    (socialApi.markAllNotificationsRead as any).mockResolvedValue({
      status: 'success',
      updated_count: 4,
    });

    renderComponent();

    fireEvent.click(screen.getByTestId('notifications-button'));

    await waitFor(() => {
      expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mark-all-read-button'));

    await waitFor(() => {
      expect(socialApi.markAllNotificationsRead).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('notifications-badge')).toBeNull();
    });
  });

  it('redireciona para social ao clicar em pedido de amizade', async () => {
    const handleNavigate = vi.fn();
    (socialApi.markNotificationRead as any).mockResolvedValue({ id: 1, is_read: true });

    renderComponent({ onNavigate: handleNavigate });

    fireEvent.click(screen.getByTestId('notifications-button'));

    const item = await screen.findByTestId('notification-item-1');
    fireEvent.click(item);

    await waitFor(() => {
      expect(socialApi.markNotificationRead).toHaveBeenCalledWith(1);
      expect(handleNavigate).toHaveBeenCalledWith('social');
      expect(screen.queryByTestId('notifications-dropdown')).toBeNull();
    });
  });

  it('redireciona para loja e dispara evento mist:open-game-detail ao clicar em wishlist', async () => {
    const handleNavigate = vi.fn();
    const eventSpy = vi.fn();
    window.addEventListener('mist:open-game-detail', eventSpy);

    renderComponent({ onNavigate: handleNavigate });

    fireEvent.click(screen.getByTestId('notifications-button'));

    const item = await screen.findByTestId('notification-item-2');
    fireEvent.click(item);

    await waitFor(() => {
      expect(handleNavigate).toHaveBeenCalledWith('store');
      expect(eventSpy).toHaveBeenCalled();
    });

    window.removeEventListener('mist:open-game-detail', eventSpy);
  });

  it('dispara evento mist:open-system-notice ao clicar em comunicado de catálogo', async () => {
    const noticeSpy = vi.fn();
    window.addEventListener('mist:open-system-notice', noticeSpy);

    renderComponent();

    fireEvent.click(screen.getByTestId('notifications-button'));

    const item = await screen.findByTestId('notification-item-3');
    fireEvent.click(item);

    await waitFor(() => {
      expect(noticeSpy).toHaveBeenCalled();
      const customEvent = noticeSpy.mock.calls[0][0];
      expect(customEvent.detail.title).toBe('Comunicado Oficial: Rotação de Catálogo');
    });

    window.removeEventListener('mist:open-system-notice', noticeSpy);
  });

  it('redireciona para library e dispara mist:open-library-game em conquista', async () => {
    const handleNavigate = vi.fn();
    const libSpy = vi.fn();
    window.addEventListener('mist:open-library-game', libSpy);

    renderComponent({ onNavigate: handleNavigate });

    fireEvent.click(screen.getByTestId('notifications-button'));

    const item = await screen.findByTestId('notification-item-4');
    fireEvent.click(item);

    await waitFor(() => {
      expect(handleNavigate).toHaveBeenCalledWith('library');
      expect(libSpy).toHaveBeenCalled();
    });

    window.removeEventListener('mist:open-library-game', libSpy);
  });

  it('dispara mist:open-wallet ao clicar em recarga da carteira', async () => {
    const walletSpy = vi.fn();
    window.addEventListener('mist:open-wallet', walletSpy);

    renderComponent();

    fireEvent.click(screen.getByTestId('notifications-button'));

    const item = await screen.findByTestId('notification-item-5');
    fireEvent.click(item);

    await waitFor(() => {
      expect(walletSpy).toHaveBeenCalled();
    });

    window.removeEventListener('mist:open-wallet', walletSpy);
  });
});
