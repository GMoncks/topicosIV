import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from './Header';
import { CartProvider } from '../context/CartContext';
import { walletApi } from '../api/client';

vi.mock('../api/client', () => ({
  walletApi: {
    getHistory: vi.fn(),
  },
}));

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (walletApi.getHistory as any).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 10 });
  });

  const renderHeader = (props: Partial<Parameters<typeof Header>[0]> = {}) => {
    const defaultProps = { walletBalance: 150, isGuest: false, onOpenAuth: vi.fn() };
    return {
      ...render(
        <CartProvider>
          <Header {...defaultProps} {...props} />
        </CartProvider>
      ),
      props: { ...defaultProps, ...props },
    };
  };

  it('abre o extrato da carteira (T-04) ao clicar no saldo quando autenticado', async () => {
    renderHeader({ isGuest: false });

    fireEvent.click(screen.getByRole('button', { name: /Ver extrato da carteira/i }));

    expect(await screen.findByText('Extrato da Carteira')).toBeInTheDocument();
    await waitFor(() => expect(walletApi.getHistory).toHaveBeenCalled());
  });

  it('abre a autenticação em vez do extrato quando o usuário é visitante', () => {
    const { props } = renderHeader({ isGuest: true });

    fireEvent.click(screen.getByRole('button', { name: /Ver extrato da carteira/i }));

    expect(props.onOpenAuth).toHaveBeenCalled();
    expect(screen.queryByText('Extrato da Carteira')).not.toBeInTheDocument();
    expect(walletApi.getHistory).not.toHaveBeenCalled();
  });

  it('exibe o saldo formatado em Real', () => {
    renderHeader({ walletBalance: 1234.5 });
    expect(screen.getByText('R$ 1.234,50')).toBeInTheDocument();
  });
});
