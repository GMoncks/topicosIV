import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer Component', () => {
  it('deve renderizar a marca MIST e links do rodapé', () => {
    render(<Footer />);

    expect(screen.getByText('MIST')).toBeInTheDocument();
    expect(screen.getByText(/Projeto Acadêmico/i)).toBeInTheDocument();
    expect(screen.getByTestId('footer-link-about')).toBeInTheDocument();
    expect(screen.getByTestId('footer-link-reviews')).toBeInTheDocument();
    expect(screen.getByTestId('footer-link-github')).toBeInTheDocument();
  });

  it('deve chamar onNavigate com "about" ao clicar em Sobre o MIST', () => {
    const onNavigate = vi.fn();
    render(<Footer onNavigate={onNavigate} />);

    fireEvent.click(screen.getByTestId('footer-link-about'));
    expect(onNavigate).toHaveBeenCalledWith('about');
  });

  it('deve chamar onNavigate com "reviews" ao clicar em Reviews do MIST', () => {
    const onNavigate = vi.fn();
    render(<Footer onNavigate={onNavigate} />);

    fireEvent.click(screen.getByTestId('footer-link-reviews'));
    expect(onNavigate).toHaveBeenCalledWith('reviews');
  });

  it('deve possuir link externo correto para o repositório GitHub', () => {
    render(<Footer />);

    const githubLink = screen.getByTestId('footer-link-github');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/GMoncks/topicosIV');
    expect(githubLink).toHaveAttribute('target', '_blank');
  });
});
