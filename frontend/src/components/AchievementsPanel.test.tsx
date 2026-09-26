import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AchievementsPanel } from './AchievementsPanel';
import { libraryApi } from '../api/client';
import { AchievementResponse } from '../types';

const mockAchievements: AchievementResponse[] = [
  {
    id: 1,
    game_id: 13,
    achievement_id: 'first_answer',
    name: 'Curioso por Natureza',
    description: 'Respondeu à primeira pergunta do quiz de ciência da computação.',
    icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=quiz_first_answer',
    rarity: 'Comum',
    is_unlocked: true,
    unlocked_at: '2026-09-25T20:00:00Z',
  },
  {
    id: 2,
    game_id: 13,
    achievement_id: 'perfect_score',
    name: 'Gênio da Computação',
    description: 'Acertou 100% das perguntas sem errar nenhuma questão.',
    icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=quiz_perfect',
    rarity: 'Épico',
    is_unlocked: false,
    unlocked_at: null,
  },
  {
    id: 3,
    game_id: 13,
    achievement_id: 'trivia_master',
    name: 'Enciclopédia Humana',
    description: 'Alcançou pontuação perfeita nas rodadas mais desafiadoras.',
    icon_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=quiz_master',
    rarity: 'Lendário',
    is_unlocked: false,
    unlocked_at: null,
  },
];

describe('AchievementsPanel & AchievementDetailModal', () => {
  beforeEach(() => {
    vi.spyOn(libraryApi, 'getGameAchievements').mockResolvedValue(mockAchievements);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar o cabeçalho com progresso e os mini cards com badges de raridade', async () => {
    render(<AchievementsPanel gameId={13} gameName="MIST Quiz" />);

    await waitFor(() => {
      expect(screen.getByText('Conquistas de MIST Quiz')).toBeInTheDocument();
      // 1 de 3 (33%)
      expect(screen.getByText(/1 de 3/)).toBeInTheDocument();
      expect(screen.getByText('(33%)')).toBeInTheDocument();
    });

    // Valida que os badges de raridade estão visíveis
    expect(screen.getByText('Comum')).toBeInTheDocument();
    expect(screen.getByText('Épico')).toBeInTheDocument();
    expect(screen.getByText('Lendário')).toBeInTheDocument();
  });

  it('deve abrir a modal de detalhes ao clicar em um mini card', async () => {
    render(<AchievementsPanel gameId={13} gameName="MIST Quiz" />);

    await waitFor(() => {
      expect(screen.getByText('Curioso por Natureza')).toBeInTheDocument();
    });

    // Clica no card da primeira conquista
    const firstAchCard = screen.getByRole('button', { name: /Curioso por Natureza/i });
    fireEvent.click(firstAchCard);

    // Modal aberta com detalhes completos
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Curioso por Natureza' })).toBeInTheDocument();
      expect(
        screen.getByText('Respondeu à primeira pergunta do quiz de ciência da computação.')
      ).toBeInTheDocument();
      expect(screen.getByText('Desbloqueada')).toBeInTheDocument();
      expect(screen.getByText(/Conquistada em/i)).toBeInTheDocument();
    });

    // Fecha a modal pelo botão fechar
    const closeBtn = screen.getByLabelText('Fechar detalhes da conquista');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('deve atualizar reativamente o progresso e desbloqueio ao receber evento mist:achievement-unlocked', async () => {
    render(<AchievementsPanel gameId={13} gameName="MIST Quiz" />);

    await waitFor(() => {
      expect(screen.getByText(/1 de 3/)).toBeInTheDocument();
      expect(screen.getByText('(33%)')).toBeInTheDocument();
    });

    // Simula disparo do evento de conquista do MIST Quiz para "perfect_score"
    act(() => {
      window.dispatchEvent(
        new CustomEvent('mist:achievement-unlocked', {
          detail: {
            gameId: 13,
            achievementId: 'perfect_score',
            name: 'Gênio da Computação',
            rarity: 'Épico',
          },
        })
      );
    });

    // Progresso avança para 2 de 3 (67%)
    await waitFor(() => {
      expect(screen.getByText(/2 de 3/)).toBeInTheDocument();
      expect(screen.getByText('(67%)')).toBeInTheDocument();
    });
  });
});
