import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AcademicDisclaimer } from './AcademicDisclaimer';

describe('AcademicDisclaimer Component (FRONT-UNIT-57)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza o banner com o texto acadêmico e estilo em vermelho', () => {
    render(<AcademicDisclaimer />);

    const banner = screen.getByTestId('academic-disclaimer');
    expect(banner).toBeInTheDocument();
    expect(banner.className).toContain('bg-red-600');
    expect(
      screen.getByText(
        'Esse ecossistema é um trabalho acadêmico, sem jogos reais além dos categorizados como "MIST Studios!"'
      )
    ).toBeInTheDocument();
  });

  it('não exibe o botão de fechar ("x") nos primeiros segundos', () => {
    render(<AcademicDisclaimer />);

    expect(screen.queryByTestId('academic-disclaimer-close')).toBeNull();

    // Avança 3 segundos
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByTestId('academic-disclaimer-close')).toBeNull();
  });

  it('exibe o botão de fechar apenas após decorridos 5 segundos e chama onClose ao clicar', () => {
    const handleClose = vi.fn();
    render(<AcademicDisclaimer onClose={handleClose} />);

    // Inicialmente ausente
    expect(screen.queryByTestId('academic-disclaimer-close')).toBeNull();

    // Avança os 5000ms
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Agora o botão de fechar deve estar visível
    const closeBtn = screen.getByTestId('academic-disclaimer-close');
    expect(closeBtn).toBeInTheDocument();

    // Clica no botão e valida o callback
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
