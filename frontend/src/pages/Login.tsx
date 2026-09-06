import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="bg-brand-surface border border-gray-800 p-8 rounded-3xl w-full max-w-md shadow-2xl neon-border">
        <div className="text-center mb-8">
          <i className="fa-solid fa-gamepad text-5xl text-brand-green mb-3"></i>
          <h1 className="text-3xl font-display font-black text-white">MIST</h1>
          <p className="text-sm text-gray-400 mt-1">Multiplayer Instance for Steam-like Titles</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Email / Usuário</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-card border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple"
              placeholder="Digite seu email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brand-card border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-purple hover:bg-brand-purpleDark text-white font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(160,32,240,0.5)] mt-4"
          >
            Entrar no MIST
          </button>
        </form>
      </div>
    </div>
  );
};
