import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameCard } from './GameCard';
import { GameItem } from '../types';

describe('GameCard Component (FRONT-UNIT-01)', () => {
  const mockGame: GameItem = {
    id: 'game-1',
    title: 'Cyberpunk Odyssey',
    category: 'JOGO',
    currentPrice: 149.99,
    originalPrice: 199.99,
    discountPercentage: 25,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e',
    tags: 'RPG, Sci-Fi',
  };

  it('deve renderizar o título do jogo e badge de desconto formatado', () => {
    render(<GameCard game={mockGame} />);

    expect(screen.getByText('Cyberpunk Odyssey')).toBeInTheDocument();
    expect(screen.getByText('-25%')).toBeInTheDocument();
  });

  it('deve disparar onToggleWishlist ao clicar no coração flutuante sem disparar onSelect', () => {
    let toggledId: number | null = null;
    let toggledState: boolean | null = null;
    let selected = false;

    render(
      <GameCard
        game={mockGame}
        isWishlisted={false}
        onToggleWishlist={(id, nextState) => {
          toggledId = id;
          toggledState = nextState;
        }}
        onSelect={() => {
          selected = true;
        }}
      />
    );

    const wishlistButton = screen.getByTitle('Adicionar à Lista de Desejos');
    wishlistButton.click();

    expect(toggledState).toBe(true);
    expect(selected).toBe(false);
  });

  it('deve renderizar a tag "Adquirido" quando isOwned for true', () => {
    render(<GameCard game={mockGame} isOwned={true} />);

    expect(screen.getByText('Adquirido')).toBeInTheDocument();
  });
});
