import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthModal } from './AuthModal';
import { AuthProvider } from '../context/AuthContext';

describe('Componente AuthModal (AuthModal.test.tsx)', () => {
  it('não deve renderizar nada quando o modal estiver fechado', () => {
    const { container } = render(
      <AuthProvider>
        <AuthModal />
      </AuthProvider>
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('deve renderizar o modal e alternar para a aba Criar Conta com benefício de R$ 200,00', async () => {
    // Renderiza com modal aberto através de um mock ou wrapper
    const openMock = vi.fn();
    const closeMock = vi.fn();

    // Mockamos useAuth para inspecionar os estados do modal
    vi.spyOn(await import('../context/AuthContext'), 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: true,
      authModalMode: 'login',
      openAuthModal: openMock,
      closeAuthModal: closeMock,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    render(<AuthModal />);

    // Valida que o modal abriu na aba Entrar
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Seu usuário ou email')).toBeInTheDocument();
    expect(screen.getByText('Entrar no MIST')).toBeInTheDocument();

    // Clica na aba Criar Conta
    const registerTabBtn = screen.getByRole('button', { name: 'Criar Conta' });
    fireEvent.click(registerTabBtn);
    expect(openMock).toHaveBeenCalledWith('register');
  });

  it('deve exibir o benefício de boas-vindas na aba de registro', async () => {
    vi.spyOn(await import('../context/AuthContext'), 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: true,
      authModalMode: 'register',
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    render(<AuthModal />);

    expect(screen.getByText(/Ganhe/i)).toBeInTheDocument();
    expect(screen.getAllByText(/200,00/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /Criar Conta/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('deve alternar a visibilidade da senha ao clicar no botão de olho (FRONT-UNIT-04)', async () => {
    vi.spyOn(await import('../context/AuthContext'), 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: true,
      authModalMode: 'login',
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    render(<AuthModal />);

    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: 'Ver senha' });
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    const hideBtn = screen.getByRole('button', { name: 'Ocultar senha' });
    fireEvent.click(hideBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('deve validar regras de complexidade de senha via isPasswordStrong e bloquear senha fraca (FRONT-UNIT-05)', async () => {
    const { isPasswordStrong } = await import('./AuthModal');

    // Menos de 8 caracteres
    expect(isPasswordStrong('Aa1!').isValid).toBe(false);
    // Sem maiúscula
    expect(isPasswordStrong('minusc123!').isValid).toBe(false);
    // Sem minúscula
    expect(isPasswordStrong('MAIUSC123!').isValid).toBe(false);
    // Sem número
    expect(isPasswordStrong('SenhaSemNumero!').isValid).toBe(false);
    // Sem símbolo
    expect(isPasswordStrong('SenhaSemSimbolo123').isValid).toBe(false);
    // Válida
    expect(isPasswordStrong('Senha@Forte123').isValid).toBe(true);

    const registerMock = vi.fn();
    vi.spyOn(await import('../context/AuthContext'), 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      sessionNotice: null,
      isAuthModalOpen: true,
      authModalMode: 'register',
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
      login: vi.fn(),
      register: registerMock,
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      clearSessionNotice: vi.fn(),
      updateUserBalance: vi.fn(),
    });

    const { container } = render(<AuthModal />);

    fireEvent.change(screen.getByPlaceholderText('Ex: player_one'), { target: { value: 'user_teste' } });
    fireEvent.change(screen.getByPlaceholderText('seuemail@exemplo.com'), { target: { value: 'teste@mist.com' } });

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'fraca' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'fraca' } });

    const submitBtn = container.querySelector('button[type="submit"]')!;
    fireEvent.click(submitBtn);

    expect(registerMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/A senha deve ter no mínimo 8 caracteres/i);
  });
});
