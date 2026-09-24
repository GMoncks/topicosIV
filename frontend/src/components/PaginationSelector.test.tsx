import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationSelector } from './PaginationSelector';

describe('PaginationSelector Component (FRONT-UNIT-07)', () => {
  it('deve renderizar o select com o valor default 8 e todas as opções obrigatórias (4, 8, 12, 24, 40, 100)', () => {
    const handlePageSizeChange = vi.fn();
    render(
      <PaginationSelector
        pageSize={8}
        onPageSizeChange={handlePageSizeChange}
      />
    );

    const select = screen.getByRole('combobox', { name: /selecionar quantidade de jogos por página/i }) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('8');

    // Valida a presença de todas as 6 opções solicitadas
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    const values = options.map(opt => Number(opt.value));
    expect(values).toEqual([4, 8, 12, 24, 40, 100]);
  });

  it('deve disparar onPageSizeChange com o valor numérico correto ao selecionar outra opção', () => {
    const handlePageSizeChange = vi.fn();
    render(
      <PaginationSelector
        pageSize={10}
        onPageSizeChange={handlePageSizeChange}
      />
    );

    const select = screen.getByRole('combobox', { name: /selecionar quantidade de jogos por página/i });
    fireEvent.change(select, { target: { value: '24' } });

    expect(handlePageSizeChange).toHaveBeenCalledTimes(1);
    expect(handlePageSizeChange).toHaveBeenCalledWith(24);
  });

  it('deve respeitar a propriedade disabled quando fornecida', () => {
    const handlePageSizeChange = vi.fn();
    render(
      <PaginationSelector
        pageSize={10}
        onPageSizeChange={handlePageSizeChange}
        disabled={true}
      />
    );

    const select = screen.getByRole('combobox', { name: /selecionar quantidade de jogos por página/i });
    expect(select).toBeDisabled();
  });
});
