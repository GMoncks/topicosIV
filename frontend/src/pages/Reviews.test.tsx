import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reviews } from './Reviews';
import { systemReviewsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

vi.mock('../api/client', () => ({
  systemReviewsApi: {
    getReviews: vi.fn(),
    createReview: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Reviews Page Component', () => {
  const mockReviews = [
    {
      id: 1,
      user_id: 10,
      username: 'gamer_pro',
      content: 'Excelente ecossistema! Os jogos da MIST Studios rodam muito bem.',
      is_recommended: true,
      created_at: '2026-10-08T18:30:00Z',
    },
    {
      id: 2,
      user_id: 20,
      username: 'pixel_art_lover',
      content: 'Adorei o design dark e a loja de pontos.',
      is_recommended: false,
      created_at: '2026-10-08T19:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(systemReviewsApi.getReviews).mockResolvedValue(mockReviews);
  });

  it('deve exibir aviso para convidados quando o usuário não estiver autenticado', async () => {
    const mockOpenAuth = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      openAuthModal: mockOpenAuth,
      logout: vi.fn(),
      updateUserBalance: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      token: null,
    } as any);

    render(<Reviews />);

    expect(await screen.findByTestId('guest-review-notice')).toBeInTheDocument();
    expect(screen.getByText(/Faça login ou crie uma conta/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('login-to-review-btn'));
    expect(mockOpenAuth).toHaveBeenCalledWith('login');
  });

  it('deve renderizar o formulário de avaliação para usuário logado com seu nome', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { username: 'gabriel_tester', id: 42 } as any,
      isAuthenticated: true,
      openAuthModal: vi.fn(),
      logout: vi.fn(),
      updateUserBalance: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      token: 'jwt-token',
    } as any);

    render(<Reviews />);

    expect(await screen.findByTestId('review-form')).toBeInTheDocument();
    expect(screen.getByText('gabriel_tester')).toBeInTheDocument();
    expect(screen.getByText('0/500 caracteres')).toBeInTheDocument();
  });

  it('deve atualizar o contador de caracteres e limitar o tamanho a 500', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { username: 'gabriel_tester', id: 42 } as any,
      isAuthenticated: true,
      openAuthModal: vi.fn(),
      logout: vi.fn(),
      updateUserBalance: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      token: 'jwt-token',
    } as any);

    render(<Reviews />);

    const textarea = await screen.findByTestId('review-textarea');
    fireEvent.change(textarea, { target: { value: 'Teste de feedback' } });

    expect(screen.getByText('17/500 caracteres')).toBeInTheDocument();
  });

  it('deve submeter o review com sucesso e chamar createReview com dados corretos', async () => {
    vi.mocked(systemReviewsApi.createReview).mockResolvedValue({
      id: 3,
      user_id: 42,
      username: 'gabriel_tester',
      content: 'Ótima plataforma!',
      is_recommended: true,
      created_at: new Date().toISOString(),
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { username: 'gabriel_tester', id: 42 } as any,
      isAuthenticated: true,
      openAuthModal: vi.fn(),
      logout: vi.fn(),
      updateUserBalance: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      token: 'jwt-token',
    } as any);

    render(<Reviews />);

    const textarea = await screen.findByTestId('review-textarea');
    fireEvent.change(textarea, { target: { value: 'Ótima plataforma!' } });

    const submitBtn = screen.getByTestId('submit-review-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(systemReviewsApi.createReview).toHaveBeenCalledWith({
        content: 'Ótima plataforma!',
        is_recommended: true,
      });
    });
  });

  it('deve listar reviews existentes exibindo nome de usuário, recomendação e conteúdo', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      openAuthModal: vi.fn(),
      logout: vi.fn(),
      updateUserBalance: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      isAuthModalOpen: false,
      authModalMode: 'login',
      closeAuthModal: vi.fn(),
      token: null,
    } as any);

    render(<Reviews />);

    expect(await screen.findByText('gamer_pro')).toBeInTheDocument();
    expect(screen.getByText('pixel_art_lover')).toBeInTheDocument();
    expect(screen.getByText(/Excelente ecossistema/i)).toBeInTheDocument();
    expect(screen.getByText(/Adorei o design dark/i)).toBeInTheDocument();
  });
});
