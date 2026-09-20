import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const isPasswordStrong = (pass: string): { isValid: boolean; message?: string } => {
  if (pass.length < 8) {
    return { isValid: false, message: 'A senha deve ter no mínimo 8 caracteres.' };
  }
  if (!/[A-Z]/.test(pass)) {
    return { isValid: false, message: 'A senha deve conter pelo menos uma letra maiúscula.' };
  }
  if (!/[a-z]/.test(pass)) {
    return { isValid: false, message: 'A senha deve conter pelo menos uma letra minúscula.' };
  }
  if (!/[0-9]/.test(pass)) {
    return { isValid: false, message: 'A senha deve conter pelo menos um número.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass)) {
    return { isValid: false, message: 'A senha deve conter pelo menos um símbolo/caractere especial.' };
  }
  return { isValid: true };
};

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    sessionNotice,
    clearSessionNotice,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpa erros ao alternar abas ou fechar
  useEffect(() => {
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  // Fecha com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearSessionNotice();
    setIsSubmitting(true);
    try {
      await login({
        username_or_email: loginIdentifier,
        password,
      });
      // Fecha e reseta formulário
      setLoginIdentifier('');
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha no processo de login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const strength = isPasswordStrong(password);
    if (!strength.isValid) {
      setError(strength.message || 'Senha fraca');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        username,
        email,
        password,
      });
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha no processo de cadastro');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Autenticação MIST"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div className="bg-brand-surface border border-brand-purple/40 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-purple/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-green/20 rounded-full blur-3xl pointer-events-none" />

        {/* Botão de Fechar */}
        <button
          onClick={closeAuthModal}
          aria-label="Fechar"
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {/* Header do Modal */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-card border border-brand-purple/40 mb-3 shadow-[0_0_20px_rgba(160,32,240,0.3)]">
            <i className="fa-solid fa-gamepad text-2xl text-brand-green"></i>
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide">MIST</h2>
          <p className="text-xs text-gray-400 mt-0.5">Sua plataforma gamer de títulos e comunidades</p>
        </div>

        {/* Notificação de Sessão Expirada */}
        {sessionNotice && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl flex items-start gap-2 text-amber-300 text-xs">
            <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
            <span className="flex-1">{sessionNotice}</span>
            <button onClick={clearSessionNotice} className="text-amber-300 hover:text-white">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Alerta de Erro */}
        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-xl flex items-center gap-2 text-red-400 text-xs">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Seletor de Abas */}
        <div className="grid grid-cols-2 bg-brand-card p-1 rounded-2xl border border-gray-800 mb-6">
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${authModalMode === 'login'
                ? 'bg-brand-purple text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => openAuthModal('register')}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${authModalMode === 'register'
                ? 'bg-brand-purple text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Formulário de Login */}
        {authModalMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Email ou Usuário</label>
              <div className="relative">
                <i className="fa-solid fa-user absolute left-4 top-3.5 text-gray-500 text-sm"></i>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-brand-card border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
                  placeholder="Seu usuário ou email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Senha</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-3.5 text-gray-500 text-sm"></i>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-card border border-gray-700 rounded-xl pl-11 pr-11 py-3 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? 'Ocultar senha' : 'Ver senha'}
                  className="absolute right-3.5 top-3.5 text-gray-400 hover:text-white transition focus:outline-none"
                >
                  <i className={`fa-solid ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-purple hover:bg-brand-purpleDark disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(160,32,240,0.5)] flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Entrar no MIST</span>
              )}
            </button>
          </form>
        )}

        {/* Formulário de Cadastro */}
        {authModalMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            {/* Banner de Boas-Vindas de Alto Contraste (Linha única) */}
            <div className="p-2.5 px-3 bg-gradient-to-r from-emerald-950 via-[#133824] to-emerald-950 border border-emerald-400/80 rounded-xl flex items-center gap-2.5 text-emerald-100 shadow-[0_0_15px_rgba(52,211,153,0.15)] min-w-0 overflow-hidden">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-gift text-emerald-300 text-xs"></i>
              </div>
              <span className="text-[11px] sm:text-xs leading-tight text-emerald-100 truncate whitespace-nowrap min-w-0">
                Ganhe <strong className="text-emerald-300 font-bold">R$ 200,00</strong> e <strong className="text-emerald-300 font-bold">500 Pontos MIST</strong> ao se cadastrar!
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Nome de Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-brand-card border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
                placeholder="Ex: player_one"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-card border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
                placeholder="seuemail@exemplo.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-brand-card border border-gray-700 rounded-xl pl-3 pr-9 py-2.5 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    aria-label={showRegisterPassword ? 'Ocultar senha' : 'Ver senha'}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white transition focus:outline-none"
                  >
                    <i className={`fa-solid ${showRegisterPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Confirmar Senha</label>
                <div className="relative">
                  <input
                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-brand-card border border-gray-700 rounded-xl pl-3 pr-9 py-2.5 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                    aria-label={showRegisterConfirmPassword ? 'Ocultar confirmação de senha' : 'Ver confirmação de senha'}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white transition focus:outline-none"
                  >
                    <i className={`fa-solid ${showRegisterConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Dica de Requisitos de Senha */}
            <div className="text-[11px] text-gray-400 bg-black/20 p-2 rounded-lg border border-gray-800 space-y-1">
              <span className="font-semibold text-gray-300">Requisitos da senha:</span>
              <div className="grid grid-cols-2 gap-x-2 text-[10px]">
                <span className={password.length >= 8 ? 'text-emerald-400' : 'text-gray-500'}>
                  ✓ Mínimo 8 caracteres
                </span>
                <span className={/[A-Z]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}>
                  ✓ Letra maiúscula
                </span>
                <span className={/[a-z]/.test(password) ? 'text-emerald-400' : 'text-gray-500'}>
                  ✓ Letra minúscula
                </span>
                <span className={(/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) ? 'text-emerald-400' : 'text-gray-500'}>
                  ✓ Número e símbolo
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-green hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(31,77,54,0.5)] flex items-center justify-center gap-2 mt-3"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Cadastrando...</span>
                </>
              ) : (
                <span>Criar Conta</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
