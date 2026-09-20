import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isPasswordStrong } from '../components/AuthModal';

interface LoginProps {
  onLoginSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { user, login, register, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login({ username_or_email: loginIdentifier, password });
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha no processo de login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const strength = isPasswordStrong(password);
    if (!strength.isValid) {
      setError(strength.message || 'Senha fraca');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }
    setIsLoading(true);
    try {
      await register({ username, email, password });
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha no processo de cadastro');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="bg-brand-surface border border-gray-800 p-8 rounded-3xl w-full max-w-md shadow-2xl text-center">
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-brand-green shadow-lg"
          />
          <h2 className="text-2xl font-bold text-white mb-1">{user.username}</h2>
          <p className="text-sm text-gray-400 mb-4">Sessão iniciada</p>
          <div className="bg-brand-card p-4 rounded-xl border border-gray-700 mb-6 text-left">
            <div className="flex justify-between text-sm py-1 border-b border-gray-700">
              <span className="text-gray-400">Carteira:</span>
              <span className="text-brand-green font-bold">R$ {user.walletBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-400">Pontos MIST:</span>
              <span className="text-purple-400 font-bold">{user.pointsBalance}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onLoginSuccess}
              className="flex-1 bg-brand-green text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition"
            >
              Continuar
            </button>
            <button
              onClick={logout}
              className="flex-1 bg-red-600/20 border border-red-500/40 text-red-300 font-bold py-2.5 rounded-xl hover:bg-red-600/30 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="bg-brand-surface border border-gray-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
        <div className="text-center mb-6">
          <i className="fa-solid fa-gamepad text-5xl text-brand-green mb-3"></i>
          <h1 className="text-3xl font-display font-black text-white">MIST</h1>
          <p className="text-sm text-gray-400 mt-1">Multiplayer Instance for Steam-like Titles</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 bg-brand-card p-1 rounded-2xl border border-gray-800 mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`py-2 text-xs font-bold uppercase rounded-xl transition ${
              activeTab === 'login' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(null); }}
            className={`py-2 text-xs font-bold uppercase rounded-xl transition ${
              activeTab === 'register' ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Email / Usuário</label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full bg-brand-card border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
                placeholder="Digite seu email ou usuário"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-card border border-gray-700 rounded-xl pl-4 pr-11 py-3 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
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
              disabled={isLoading}
              className="w-full bg-brand-purple hover:bg-brand-purpleDark disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(160,32,240,0.5)] mt-4"
            >
              {isLoading ? 'Entrando...' : 'Entrar no MIST'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            {/* Banner de Boas-Vindas de Alto Contraste (Linha única) */}
            <div className="p-2.5 px-3 bg-gradient-to-r from-emerald-950 via-[#133824] to-emerald-950 border border-emerald-400/80 rounded-xl flex items-center gap-2.5 text-emerald-100 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-gift text-emerald-300 text-xs"></i>
              </div>
              <span className="text-[11px] sm:text-xs leading-tight text-emerald-100 truncate whitespace-nowrap">
                Ganhe <strong className="text-emerald-300 font-bold">R$ 200,00</strong> e <strong className="text-emerald-300 font-bold">500 Pontos MIST</strong> ao se cadastrar!
              </span>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-brand-card border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
                placeholder="Seu nick gamer"
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
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Confirmar</label>
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
              disabled={isLoading}
              className="w-full bg-brand-green hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(31,77,54,0.5)] mt-3"
            >
              {isLoading ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

