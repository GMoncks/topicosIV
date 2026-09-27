import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletHistoryModal } from './WalletHistoryModal';
import { walletApi, WalletTransactionApiResponse } from '../api/client';

vi.mock('../api/client', () => ({
  walletApi: {
    getHistory: vi.fn(),
  },
}));

function makeTx(overrides: Partial<WalletTransactionApiResponse> = {}): WalletTransactionApiResponse {
  return {
    id: 1,
    user_id: 10,
    type: 'compra',
    amount: 50,
    direction: 'debit',
    description: 'Compra de teste',
    created_at: '2026-01-01T12:00:00Z',
    ...overrides,
  };
}

describe('WalletHistoryModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props: Partial<Parameters<typeof WalletHistoryModal>[0]> = {}) => {
    const defaultProps = { isOpen: true, onClose: vi.fn() };
    return {
      ...render(<WalletHistoryModal {...defaultProps} {...props} />),
      props: { ...defaultProps, ...props },
    };
  };

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra mensagem vazia quando não há transações', async () => {
    (walletApi.getHistory as any).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 10 });
    renderModal();
    expect(await screen.findByText('Nenhuma transação encontrada.')).toBeInTheDocument();
  });

  it('lista transações com sinal e cor de acordo com a direção', async () => {
    (walletApi.getHistory as any).mockResolvedValue({
      items: [
        makeTx({ id: 1, type: 'compra', direction: 'debit', amount: 50, description: 'Compra: Jogo X' }),
        makeTx({ id: 2, type: 'recarga', direction: 'credit', amount: 100, description: 'Recarga de saldo' }),
      ],
      total: 2,
      skip: 0,
      limit: 10,
    });
    renderModal();

    expect(await screen.findByText('Compra: Jogo X')).toBeInTheDocument();
    expect(screen.getByText('Recarga de saldo')).toBeInTheDocument();
    expect(screen.getByText(/- R\$\s*50,00/)).toBeInTheDocument();
    expect(screen.getByText(/\+ R\$\s*100,00/)).toBeInTheDocument();
  });

  it('busca novamente ao trocar o filtro de tipo', async () => {
    (walletApi.getHistory as any).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 10 });
    renderModal();

    await waitFor(() => {
      expect(walletApi.getHistory).toHaveBeenCalledWith({ type: undefined, skip: 0, limit: 10 });
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Recarga' }));

    await waitFor(() => {
      expect(walletApi.getHistory).toHaveBeenCalledWith({ type: 'recarga', skip: 0, limit: 10 });
    });
  });

  it('pagina para a próxima página e desabilita "Anterior" na primeira página', async () => {
    (walletApi.getHistory as any).mockResolvedValue({
      items: [makeTx()],
      total: 25,
      skip: 0,
      limit: 10,
    });
    renderModal();

    await waitFor(() => expect(screen.getByText('Página 1 de 3')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(walletApi.getHistory).toHaveBeenLastCalledWith({ type: undefined, skip: 10, limit: 10 });
    });
  });

  it('exibe mensagem de erro quando a busca falha', async () => {
    (walletApi.getHistory as any).mockRejectedValue(new Error('Falha de rede'));
    renderModal();
    expect(await screen.findByText('Falha de rede')).toBeInTheDocument();
  });

  it('fecha ao clicar no botão de fechar', async () => {
    (walletApi.getHistory as any).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 10 });
    const { props } = renderModal();
    await screen.findByText('Nenhuma transação encontrada.');

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(props.onClose).toHaveBeenCalled();
  });
});
