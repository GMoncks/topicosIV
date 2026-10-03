import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tooltip } from './Tooltip';

describe('Tooltip Component', () => {
  it('renderiza o elemento filho normalmente', () => {
    render(
      <Tooltip content="Texto completo da mensagem">
        <button>Passar o mouse</button>
      </Tooltip>
    );

    expect(screen.getByText('Passar o mouse')).toBeInTheDocument();
  });

  it('exibe e oculta o tooltip nos eventos de mouseEnter e mouseLeave', () => {
    render(
      <Tooltip content="Justificativa completa do curador MIST">
        <span data-testid="target">Mensagem truncada...</span>
      </Tooltip>
    );

    const target = screen.getByTestId('target').parentElement!;

    // Inicialmente não montado no DOM
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Ao passar o mouse: montado no DOM com o conteúdo
    fireEvent.mouseEnter(target);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Justificativa completa do curador MIST')).toBeInTheDocument();

    // Ao retirar o mouse: desmontado do DOM
    fireEvent.mouseLeave(target);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('retorna apenas children quando content for vazio', () => {
    const { container } = render(
      <Tooltip content="">
        <span>Apenas texto</span>
      </Tooltip>
    );

    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(screen.getByText('Apenas texto')).toBeInTheDocument();
  });
});
