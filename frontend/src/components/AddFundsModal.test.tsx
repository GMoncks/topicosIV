import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddFundsModal } from './AddFundsModal';
import { walletApi } from '../api/client';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    walletApi: {
      ...actual.walletApi,
      recharge: vi.fn(),
    },
  };
});

describe('AddFundsModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza quando isOpen é false', () => {
    render(<AddFundsModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('add-funds-modal')).toBeNull();
  });

  it('renderiza opções de valores pré-definidos e valor padrão selecionado', () => {
    render(<AddFundsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('add-funds-modal')).toBeDefined();
    expect(screen.getByTestId('btn-amount-50')).toBeDefined();
    expect(screen.getAllByText(/50\.00/).length).toBeGreaterThan(0);
  });

  it('permite selecionar valor personalizado e atualizar total', () => {
    render(<AddFundsModal isOpen={true} onClose={vi.fn()} />);
    const btnCustom = screen.getByTestId('btn-amount-custom');
    fireEvent.click(btnCustom);

    const input = screen.getByTestId('input-custom-amount');
    fireEvent.change(input, { target: { value: '150.50' } });

    expect(screen.getByText('R$ 150.50')).toBeDefined();
  });

  it('executa recarga com sucesso, dispara callback e fecha modal', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    vi.mocked(walletApi.recharge).mockResolvedValueOnce({
      user_id: 1,
      previous_balance: 100,
      amount: 50,
      new_balance: 150,
      operation: 'recharge',
    });

    render(
      <AuthProvider>
        <AddFundsModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      </AuthProvider>
    );

    const btnConfirm = screen.getByTestId('btn-confirm-recharge');
    fireEvent.click(btnConfirm);

    await waitFor(() => {
      expect(walletApi.recharge).toHaveBeenCalledWith(50);
      expect(handleSuccess).toHaveBeenCalledWith(150);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('exibe mensagem de erro quando a API falha', async () => {
    vi.mocked(walletApi.recharge).mockRejectedValueOnce(new Error('Erro de saldo insuficiente'));

    render(<AddFundsModal isOpen={true} onClose={vi.fn()} />);

    const btnConfirm = screen.getByTestId('btn-confirm-recharge');
    fireEvent.click(btnConfirm);

    await waitFor(() => {
      expect(screen.getByText('Erro de saldo insuficiente')).toBeDefined();
    });
  });
});
