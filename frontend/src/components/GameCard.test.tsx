import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GameCard } from './GameCard';
import { GameItem } from '../types';

describe('GameCard Component (FRONT-UNIT-01)', () => {
  const mockGame: GameItem = {
    id: 'game-1',
    title: 'Cyberpunk Odyssey',
    category: 'DESTAQUE',
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
});
