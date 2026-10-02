import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Inventory } from './Inventory';
import { inventoryApi, cardsApi } from '../api/client';
import { InventoryItem } from '../types';

vi.mock('../api/client', () => ({
  inventoryApi: {
    getInventory: vi.fn(),
    equipItem: vi.fn(),
    unequipItem: vi.fn(),
  },
  cardsApi: {
    craftBadge: vi.fn(),
  },
}));

const mockItems: InventoryItem[] = [
  {
    id: 1,
    user_id: 1,
    item_id: 'card_geralt',
    name: 'Geralt de Rívia',
    item_type: 'card',
    asset_url: 'https://images.unsplash.com/card_geralt.jpg',
    price_points: 0,
    is_equipped: false,
    status: 'disponivel',
    rarity: 'Raro',
    description: 'Carta colecionável de Witcher 3',
    acquired_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 2,
    user_id: 1,
    item_id: 'frame_neon',
    name: 'Moldura Neon Cyberpunk',
    item_type: 'avatar_frame',
    asset_url: 'https://images.unsplash.com/frame_neon.jpg',
    price_points: 1000,
    is_equipped: true,
    status: 'equipado',
    rarity: 'Lendário',
    description: 'Moldura futurista dourada',
    acquired_at: '2026-09-02T10:00:00Z',
  },
  {
    id: 3,
    user_id: 1,
    item_id: 'bg_space',
    name: 'Nebulosa Cósmica',
    item_type: 'background',
    asset_url: 'https://images.unsplash.com/bg_space.jpg',
    price_points: 800,
    is_equipped: false,
    status: 'disponivel',
    rarity: 'Épico',
    description: 'Plano de fundo espacial',
    acquired_at: '2026-09-03T10:00:00Z',
  },
  {
    id: 4,
    user_id: 1,
    item_id: 'card_cyber_v',
    name: 'V de Night City',
    item_type: 'card',
    asset_url: 'https://images.unsplash.com/card_v.jpg',
    price_points: 0,
    is_equipped: false,
    status: 'listado',
    rarity: 'Épico',
    description: 'Carta anunciada no mercado',
    acquired_at: '2026-09-04T10:00:00Z',
  },
  {
    id: 5,
    user_id: 1,
    item_id: 'emoticon_pixel_sword',
    name: ':pixel_sword:',
    item_type: 'emoticon',
    asset_url: 'https://images.unsplash.com/sword.jpg',
    price_points: 200,
    is_equipped: false,
    status: 'disponivel',
    rarity: 'Comum',
    description: 'Emoticon de espada',
    acquired_at: '2026-09-05T10:00:00Z',
  },
  {
    id: 6,
    user_id: 1,
    item_id: 'badge_pioneiro',
    name: 'Pioneiro MIST',
    item_type: 'badge',
    asset_url: 'https://images.unsplash.com/badge.jpg',
    price_points: 0,
    is_equipped: false,
    status: 'disponivel',
    rarity: 'Especial',
    description: 'Insígnia dos pioneiros',
    acquired_at: '2026-09-06T10:00:00Z',
  },
  {
    id: 7,
    user_id: 1,
    item_id: 'card_ciri',
    name: 'Ciri de Cintra',
    item_type: 'card',
    game_id: 1,
    asset_url: 'https://images.unsplash.com/ciri.jpg',
    price_points: 0,
    is_equipped: false,
    status: 'disponivel',
    rarity: 'Raro',
    description: 'Carta de Ciri',
    acquired_at: '2026-09-07T10:00:00Z',
  },
  {
    id: 8,
    user_id: 1,
    item_id: 'card_yen',
    name: 'Yennefer de Vengerberg',
    item_type: 'card',
    game_id: 1,
    asset_url: 'https://images.unsplash.com/yen.jpg',
    price_points: 0,
    is_equipped: false,
    status: 'disponivel',
    rarity: 'Épico',
    description: 'Carta de Yennefer',
    acquired_at: '2026-09-08T10:00:00Z',
  },
];

describe('Inventory Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(inventoryApi, 'getInventory').mockResolvedValue({
      items: mockItems,
      grouped: {
        card: [mockItems[0], mockItems[3]],
        avatar_frame: [mockItems[1]],
        background: [mockItems[2]],
        emoticon: [mockItems[4]],
        badge: [mockItems[5]],
      },
      total: mockItems.length,
    });
  });

  it('renderiza o cabeçalho, abas e grid com contadores corretos', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Inventário da Comunidade')).toBeDefined();
      expect(screen.getByText('Geralt de Rívia')).toBeDefined();
      expect(screen.getByText('Moldura Neon Cyberpunk')).toBeDefined();
    });

    expect(screen.getByTestId('tab-todos').textContent).toContain('8');
    expect(screen.getByTestId('tab-cards').textContent).toContain('4');
    expect(screen.getByTestId('tab-avatar-frames').textContent).toContain('1');
    expect(screen.getByTestId('tab-backgrounds').textContent).toContain('1');
    expect(screen.getByTestId('tab-emoticons').textContent).toContain('1');
    expect(screen.getByTestId('tab-badges').textContent).toContain('1');
  });

  it('filtra itens ao selecionar uma aba de categoria', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Geralt de Rívia')).toBeDefined();
    });

    // Clica na aba de Cartas
    fireEvent.click(screen.getByTestId('tab-cards'));

    expect(screen.getByText('Geralt de Rívia')).toBeDefined();
    expect(screen.getByText('V de Night City')).toBeDefined();
    expect(screen.queryByText('Moldura Neon Cyberpunk')).toBeNull();
    expect(screen.queryByText('Nebulosa Cósmica')).toBeNull();

    // Clica na aba de Planos de Fundo
    fireEvent.click(screen.getByTestId('tab-backgrounds'));

    expect(screen.getByText('Nebulosa Cósmica')).toBeDefined();
    expect(screen.queryByText('Geralt de Rívia')).toBeNull();
  });

  it('filtra itens por status (Disponíveis, Equipados, No Mercado)', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Geralt de Rívia')).toBeDefined();
    });

    // Filtra por Equipados
    fireEvent.click(screen.getByTestId('filter-status-equipado'));
    expect(screen.getByText('Moldura Neon Cyberpunk')).toBeDefined();
    expect(screen.queryByText('Geralt de Rívia')).toBeNull();

    // Filtra por No Mercado
    fireEvent.click(screen.getByTestId('filter-status-listado'));
    expect(screen.getByText('V de Night City')).toBeDefined();
    expect(screen.queryByText('Moldura Neon Cyberpunk')).toBeNull();

    // Retorna para Todos
    fireEvent.click(screen.getByTestId('filter-status-todos'));
    expect(screen.getByText('Geralt de Rívia')).toBeDefined();
  });

  it('filtra itens através do campo de busca por texto', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Geralt de Rívia')).toBeDefined();
    });

    const searchInput = screen.getByTestId('inventory-search-input');
    fireEvent.change(searchInput, { target: { value: 'Geralt' } });

    expect(screen.getByText('Geralt de Rívia')).toBeDefined();
    expect(screen.queryByText('Nebulosa Cósmica')).toBeNull();
    expect(screen.queryByText('V de Night City')).toBeNull();
  });

  it('equipa um item disponível com sucesso via inventoryApi.equipItem', async () => {
    vi.spyOn(inventoryApi, 'equipItem').mockResolvedValue({
      success: true,
      message: "'Nebulosa Cósmica' equipado com sucesso!",
      equipped_item: { ...mockItems[2], is_equipped: true, status: 'equipado' },
      profile_background_url: mockItems[2].asset_url,
    });

    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-equip-3')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('btn-equip-3'));

    await waitFor(() => {
      expect(inventoryApi.equipItem).toHaveBeenCalledWith(3);
      expect(screen.getByTestId('inventory-toast')).toBeDefined();
      expect(screen.getByText(/'Nebulosa Cósmica' equipado com sucesso!/)).toBeDefined();
    });
  });

  it('desequipa um item previamente equipado via inventoryApi.unequipItem', async () => {
    vi.spyOn(inventoryApi, 'unequipItem').mockResolvedValue({
      success: true,
      message: "'Moldura Neon Cyberpunk' desequipado com sucesso",
      equipped_item: { ...mockItems[1], is_equipped: false, status: 'disponivel' },
      avatar_frame_url: undefined,
    });

    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-unequip-2')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('btn-unequip-2'));

    await waitFor(() => {
      expect(inventoryApi.unequipItem).toHaveBeenCalledWith(2);
      expect(screen.getByTestId('inventory-toast')).toBeDefined();
    });
  });

  it('impede ação de equipar em itens com status listado no mercado', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('V de Night City')).toBeDefined();
    });

    // O card do item 4 (listado) não possui botão de equipar ativo e exibe a tag No Mercado
    expect(screen.queryByTestId('btn-equip-4')).toBeNull();
    const card = screen.getByTestId('inventory-card-4');
    expect(card.textContent).toContain('No Mercado');
  });

  it('abre modal de inspeção com detalhes e botão de fechar', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Geralt de Rívia')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('inventory-card-1'));

    await waitFor(() => {
      expect(screen.getByTestId('item-detail-modal')).toBeDefined();
      expect(screen.getByText('Carta colecionável de Witcher 3')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('btn-close-modal'));
    expect(screen.queryByTestId('item-detail-modal')).toBeNull();
  });

  it('exibe banner de crafting de insígnias e indicador de set completo na aba de cartas', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-cards')).toBeDefined();
    });

    // Clica na aba Cartas
    fireEvent.click(screen.getByTestId('tab-cards'));

    await waitFor(() => {
      expect(screen.getByTestId('crafting-banner')).toBeDefined();
      expect(screen.getByText('Forja de Insígnias MIST')).toBeDefined();
      expect(screen.getByTestId('card-set-1')).toBeDefined();
      expect(screen.getByTestId('btn-craft-badge-1')).toBeDefined();
    });
  });

  it('abre modal de confirmação e executa forja de insígnia via cardsApi.craftBadge com celebração', async () => {
    vi.spyOn(cardsApi, 'craftBadge').mockResolvedValue({
      success: true,
      message: 'Insígnia forjada com sucesso!',
      badge: {
        id: 10,
        game_id: 1,
        name: 'Mestre da Caçada',
        description: 'Set completo forjado',
        xp_value: 100,
        icon_url: 'https://images.unsplash.com/badge.jpg',
        level: 1,
        is_foil: false,
        created_at: '2026-10-01T00:00:00Z',
      },
      xp_gained: 100,
      new_level: 2,
      total_xp: 400,
      cards_consumed: 3,
    });

    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-cards')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('tab-cards'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-craft-badge-1')).toBeDefined();
    });

    // Clica para abrir modal de forja
    fireEvent.click(screen.getByTestId('btn-craft-badge-1'));

    await waitFor(() => {
      expect(screen.getByTestId('crafting-modal')).toBeDefined();
      expect(screen.getByTestId('confirm-craft-btn')).toBeDefined();
    });

    // Confirma forja
    fireEvent.click(screen.getByTestId('confirm-craft-btn'));

    await waitFor(() => {
      expect(cardsApi.craftBadge).toHaveBeenCalledWith(1);
      expect(screen.getByTestId('celebration-modal')).toBeDefined();
      expect(screen.getByText('+100 XP')).toBeDefined();
      expect(screen.getByText('Nível 2')).toBeDefined();
    });

    // Fecha celebração
    fireEvent.click(screen.getByTestId('close-celebration-btn'));
    expect(screen.queryByTestId('celebration-modal')).toBeNull();
  });
});
