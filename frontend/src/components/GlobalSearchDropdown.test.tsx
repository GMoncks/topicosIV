import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { GlobalSearchDropdown } from './GlobalSearchDropdown';
import { searchApi } from '../api/client';

vi.mock('../api/client', () => ({
  searchApi: {
    search: vi.fn(),
  },
}));

describe('GlobalSearchDropdown Component', () => {
  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockOnSelectGame = vi.fn();
  const mockOnSelectGroup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve renderizar quando isOpen for false', () => {
    const { container } = render(
      <GlobalSearchDropdown
        query="elden"
        isOpen={false}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('não deve renderizar quando query for vazia', () => {
    const { container } = render(
      <GlobalSearchDropdown
        query="   "
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve realizar busca e renderizar as seções categorizadas de Jogos, Jogadores, Grupos e Mercado', async () => {
    vi.mocked(searchApi.search).mockResolvedValueOnce({
      query: 'elden',
      total: 4,
      games: [{ id: 1, title: 'Elden Ring', price: 199.9, category: 'RPG' }],
      users: [{ id: 2, username: 'elden_lord', email: 'lord@lands.between', level: 40 }],
      groups: [{ id: 1, name: 'RPG Brasil & Souls Enthusiasts', category: 'RPG', members_count: 5 }],
      market_items: [{ id: 10, item_name: 'Carta Rara Elden', item_type: 'card', price: 5.5 }],
    });

    render(
      <GlobalSearchDropdown
        query="elden"
        isOpen={true}
        onClose={mockOnClose}
        onNavigate={mockOnNavigate}
        onSelectGame={mockOnSelectGame}
        onSelectGroup={mockOnSelectGroup}
      />
    );

    // Aguarda o término do debounce de 250ms e resposta do mock
    await waitFor(() => {
      expect(screen.getByText('Elden Ring')).toBeInTheDocument();
    });

    expect(screen.getByText('Jogos da Loja')).toBeInTheDocument();
    expect(screen.getByText('Jogadores & Comunidade')).toBeInTheDocument();
    expect(screen.getByText('Grupos & Fóruns')).toBeInTheDocument();
    expect(screen.getByText('Mercado da Comunidade')).toBeInTheDocument();

    expect(screen.getByText('elden_lord')).toBeInTheDocument();
    expect(screen.getByText('RPG Brasil & Souls Enthusiasts')).toBeInTheDocument();
    expect(screen.getByText('Carta Rara Elden')).toBeInTheDocument();
  });

  it('deve exibir mensagem amigável quando nenhum resultado for retornado', async () => {
    vi.mocked(searchApi.search).mockResolvedValueOnce({
      query: 'termo_sem_nada',
      total: 0,
      games: [],
      users: [],
      groups: [],
      market_items: [],
    });

    render(
      <GlobalSearchDropdown
        query="termo_sem_nada"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument();
    });
  });

  it('deve fechar ao pressionar a tecla Escape', async () => {
    render(
      <GlobalSearchDropdown
        query="elden"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
