import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CheckoutModal } from './CheckoutModal';
import { GameItem } from '../types';

// Mock useAuth
const mockUser = {
  walletBalance: 200.0,
  username: 'testuser',
};

const mockUseAuth = vi.fn(() => ({
  user: mockUser,
  isAuthenticated: true,
  openAuthModal: vi.fn(),
  updateUserBalance: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('CheckoutModal Component', () => {
  const mockGame: GameItem = {
    id: '1',
    title: 'Dead Cells',
    category: 'JOGO',
    currentPrice: 47.49,
    publisherOrParent: 'MIST Studios',
    image: 'http://img.jpg',
  };

  it('deve renderizar o resumo do jogo, preço e extrato quando aberto com saldo suficiente', () => {
    render(
      <CheckoutModal
        game={mockGame}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Dead Cells')).toBeInTheDocument();
    expect(screen.getByText('Comprar agora')).toBeInTheDocument();
    expect(screen.getByText('Saldo atual na carteira:')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /Confirmar Compra/i });
    expect(confirmButton).not.toBeDisabled();
  });

  it('deve exibir aviso e desabilitar botão quando saldo for insuficiente', () => {
    mockUseAuth.mockReturnValueOnce({
      user: { walletBalance: 20.0, username: 'pooruser' } as any,
      isAuthenticated: true,
      openAuthModal: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    render(
      <CheckoutModal
        game={mockGame}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Saldo insuficiente!')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: /Confirmar Compra/i });
    expect(confirmButton).toBeDisabled();
  });

  it('deve creditar pontos e atualizar saldo da carteira imediatamente após confirmar compra', async () => {
    const mockUpdateBalance = vi.fn();
    mockUseAuth.mockReturnValueOnce({
      user: { walletBalance: 200.0, pointsBalance: 500, username: 'testuser' } as any,
      isAuthenticated: true,
      openAuthModal: vi.fn(),
      updateUserBalance: mockUpdateBalance,
    });

    const { storeApi } = await import('../api/client');
    vi.spyOn(storeApi, 'checkout').mockResolvedValueOnce({
      status: 'success',
      order_id: 'ord_123',
      items: [{ game_id: 1, title: 'Dead Cells', price_paid: 47.49 }],
      total_paid: 47.49,
      new_wallet_balance: 152.51,
      points_earned: 4749,
      purchased_at: new Date().toISOString(),
    });

    render(
      <CheckoutModal
        game={mockGame}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirmar Compra/i });
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(confirmButton);

    const { waitFor } = await import('@testing-library/react');
    await waitFor(() => {
      // 500 inicial + 4749 pontos ganhos = 5249
      expect(mockUpdateBalance).toHaveBeenCalledWith(152.51, 5249);
    });

    // Deve exibir o novo saldo autoritativo retornado pelo backend na tela de sucesso
    expect(screen.getByText('Compra Realizada!')).toBeInTheDocument();
    expect(screen.getByText(/152,51/)).toBeInTheDocument();
  });
});
