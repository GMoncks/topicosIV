import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Market } from './Market';
import { marketApi, MarketListingApiResponse } from '../api/client';
import { useAuth } from '../context/AuthContext';

vi.mock('../api/client', () => ({
  marketApi: {
    listListings: vi.fn(),
    getMyListings: vi.fn(),
    buyListing: vi.fn(),
    cancelListing: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function makeListing(overrides: Partial<MarketListingApiResponse> = {}): MarketListingApiResponse {
  return {
    id: 1,
    seller_id: 10,
    item_id: 5,
    item_type: 'card',
    item_name: 'Carta Lendária',
    game_id: null,
    price: 40,
    status: 'ativo',
    buyer_id: null,
    created_at: '2026-01-01T00:00:00Z',
    sold_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as any).mockReturnValue({
    isAuthenticated: true,
    user: { id: 20 },
    openAuthModal: vi.fn(),
    updateUserBalance: vi.fn(),
    ...overrides,
  });
}

describe('Market Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (marketApi.listListings as any).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 12 });
    (marketApi.getMyListings as any).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 12 });
    mockAuth();
  });

  it('lista anúncios do catálogo e permite comprar', async () => {
    (marketApi.listListings as any).mockResolvedValue({
      items: [makeListing()],
      total: 1,
      skip: 0,
      limit: 12,
    });
    (marketApi.buyListing as any).mockResolvedValue({
      listing: makeListing({ status: 'vendido', buyer_id: 20 }),
      new_wallet_balance: 60,
    });
    const updateUserBalance = vi.fn();
    mockAuth({ updateUserBalance });

    render(<Market />);

    expect(await screen.findByText('Carta Lendária')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Comprar' }));

    expect(await screen.findByRole('heading', { name: 'Confirmar Compra' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Compra' }));

    await waitFor(() => {
      expect(marketApi.buyListing).toHaveBeenCalledWith(1);
      expect(updateUserBalance).toHaveBeenCalledWith(60);
    });
    expect(screen.queryByRole('heading', { name: 'Confirmar Compra' })).not.toBeInTheDocument();
  });

  it('desabilita a compra do próprio anúncio', async () => {
    (marketApi.listListings as any).mockResolvedValue({
      items: [makeListing({ seller_id: 20 })], // mesmo id do usuário autenticado
      total: 1,
      skip: 0,
      limit: 12,
    });

    render(<Market />);

    await screen.findByText('Carta Lendária');
    expect(screen.getByRole('button', { name: 'Seu anúncio' })).toBeDisabled();
  });

  it('abre a autenticação em vez de comprar quando o usuário é visitante', async () => {
    const openAuthModal = vi.fn();
    mockAuth({ isAuthenticated: false, user: undefined, openAuthModal });
    (marketApi.listListings as any).mockResolvedValue({
      items: [makeListing()],
      total: 1,
      skip: 0,
      limit: 12,
    });

    render(<Market />);

    fireEvent.click(await screen.findByRole('button', { name: 'Comprar' }));

    expect(openAuthModal).toHaveBeenCalled();
    expect(screen.queryByText('Confirmar Compra')).not.toBeInTheDocument();
  });

  it('exibe erro de compra sem fechar a modal de confirmação', async () => {
    (marketApi.listListings as any).mockResolvedValue({
      items: [makeListing()],
      total: 1,
      skip: 0,
      limit: 12,
    });
    (marketApi.buyListing as any).mockRejectedValue(new Error('Saldo insuficiente na carteira MIST.'));

    render(<Market />);

    fireEvent.click(await screen.findByRole('button', { name: 'Comprar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar Compra' }));

    expect(await screen.findByText('Saldo insuficiente na carteira MIST.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirmar Compra' })).toBeInTheDocument();
  });

  it('filtra o catálogo por tipo de item', async () => {
    render(<Market />);

    await waitFor(() => {
      expect(marketApi.listListings).toHaveBeenCalledWith({ item_type: undefined, skip: 0, limit: 12 });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Emoticon' }));

    await waitFor(() => {
      expect(marketApi.listListings).toHaveBeenCalledWith({ item_type: 'emoticon', skip: 0, limit: 12 });
    });
  });

  it('pede autenticação ao entrar em "Meus Anúncios" como visitante', () => {
    const openAuthModal = vi.fn();
    mockAuth({ isAuthenticated: false, user: undefined, openAuthModal });

    render(<Market />);
    fireEvent.click(screen.getByRole('tab', { name: 'Meus Anúncios' }));

    expect(openAuthModal).toHaveBeenCalled();
    expect(marketApi.getMyListings).not.toHaveBeenCalled();
  });

  it('lista, filtra por status e cancela um anúncio próprio', async () => {
    (marketApi.getMyListings as any).mockResolvedValue({
      items: [makeListing({ seller_id: 20 })],
      total: 1,
      skip: 0,
      limit: 12,
    });
    (marketApi.cancelListing as any).mockResolvedValue(makeListing({ seller_id: 20, status: 'cancelado' }));

    render(<Market />);
    fireEvent.click(screen.getByRole('tab', { name: 'Meus Anúncios' }));

    expect(await screen.findByText('Carta Lendária')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ativo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(marketApi.cancelListing).toHaveBeenCalledWith(1);
      expect(marketApi.getMyListings).toHaveBeenCalledTimes(2); // carga inicial + reload pós-cancelamento
    });
  });

  it('não mostra botão de cancelar para anúncios já vendidos ou cancelados', async () => {
    (marketApi.getMyListings as any).mockResolvedValue({
      items: [makeListing({ seller_id: 20, status: 'vendido' })],
      total: 1,
      skip: 0,
      limit: 12,
    });

    render(<Market />);
    fireEvent.click(screen.getByRole('tab', { name: 'Meus Anúncios' }));

    await screen.findByText('Carta Lendária');
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });

  it('mostra estado vazio quando não há anúncios no catálogo', async () => {
    render(<Market />);
    expect(await screen.findByText('Nenhum anúncio disponível no momento.')).toBeInTheDocument();
  });
});
