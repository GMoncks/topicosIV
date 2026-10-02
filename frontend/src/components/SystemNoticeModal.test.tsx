import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SystemNoticeModal, SystemNoticeData } from './SystemNoticeModal';

describe('SystemNoticeModal Component', () => {
  const sampleNotice: SystemNoticeData = {
    title: 'Comunicado Oficial: Rotação e Despedida de Jogos do Catálogo MIST',
    category: 'Catálogo',
    dateLabel: 'Válido até 31 de Outubro de 2026',
    importantNote: 'Atenção: Usuários que adquirirem os jogos manterão acesso perpétuo.',
    content: 'Três jogos renomados deixarão a loja oficial no final deste mês.',
    affectedGames: [
      {
        id: 3,
        title: 'Onimusha: Way of the Sword',
        banner_url: 'https://images.unsplash.com/photo-1?w=400',
        original_price: 200.0,
        discount_price: 50.0,
        discount_percentage: 75,
        reason: 'Término de contrato Capcom',
      },
    ],
    actionButton: {
      label: 'Explorar Ofertas na Loja',
      route: 'store',
    },
  };

  it('não renderiza quando isOpen é falso', () => {
    const { container } = render(
      <SystemNoticeModal isOpen={false} notice={sampleNotice} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título, observação importante e jogos afetados', () => {
    render(
      <SystemNoticeModal isOpen={true} notice={sampleNotice} onClose={vi.fn()} />
    );

    expect(screen.getByTestId('system-notice-modal')).toBeInTheDocument();
    expect(
      screen.getByText('Comunicado Oficial: Rotação e Despedida de Jogos do Catálogo MIST')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Atenção: Usuários que adquirirem os jogos manterão acesso perpétuo.')
    ).toBeInTheDocument();
    expect(screen.getByText('Onimusha: Way of the Sword')).toBeInTheDocument();
    expect(screen.getByText('-75% OFF')).toBeInTheDocument();
    expect(screen.getByText('R$ 50,00')).toBeInTheDocument();
  });

  it('aciona onOpenGame ao clicar em "Ver na Loja" em um jogo afetado', () => {
    const handleOpenGame = vi.fn();
    const handleClose = vi.fn();

    render(
      <SystemNoticeModal
        isOpen={true}
        notice={sampleNotice}
        onClose={handleClose}
        onOpenGame={handleOpenGame}
      />
    );

    const button = screen.getByRole('button', { name: /Ver na Loja/i });
    fireEvent.click(button);

    expect(handleClose).toHaveBeenCalled();
    expect(handleOpenGame).toHaveBeenCalledWith(
      3,
      expect.stringContaining('75% OFF')
    );
  });

  it('aciona onNavigate ao clicar no botão principal de ação', () => {
    const handleNavigate = vi.fn();
    const handleClose = vi.fn();

    render(
      <SystemNoticeModal
        isOpen={true}
        notice={sampleNotice}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    );

    const mainBtn = screen.getByTestId('notice-action-button');
    fireEvent.click(mainBtn);

    expect(handleClose).toHaveBeenCalled();
    expect(handleNavigate).toHaveBeenCalledWith('store');
  });

  it('fecha o modal ao clicar no botão de fechar', () => {
    const handleClose = vi.fn();

    render(
      <SystemNoticeModal isOpen={true} notice={sampleNotice} onClose={handleClose} />
    );

    const closeBtn = screen.getByTestId('close-notice-modal');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
