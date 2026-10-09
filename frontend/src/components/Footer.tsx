import React from 'react';
import { NavigationTab } from '../types';

interface FooterProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto border-t border-gray-800 bg-[#0e141b]/90 backdrop-blur-sm text-gray-400 py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Marca & Identificação Acadêmica */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
              MIST
            </span>
            <span className="text-xs text-gray-400 border border-gray-700 rounded px-1.5 py-0.5">
              v1.0.0
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 max-w-md">
            © 2026 MIST — Multiplayer Instance for Steam-like Titles. Projeto Acadêmico de Engenharia de Software e IA.
          </p>
        </div>

        {/* Links de Navegação e Rodapé */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <button
            type="button"
            onClick={() => onNavigate?.('about')}
            className="text-gray-300 hover:text-blue-400 transition flex items-center gap-1.5 cursor-pointer font-medium"
            data-testid="footer-link-about"
          >
            <i className="fa-solid fa-circle-info text-blue-400 text-xs"></i>
            Sobre o MIST
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('reviews')}
            className="text-gray-300 hover:text-yellow-400 transition flex items-center gap-1.5 cursor-pointer font-medium"
            data-testid="footer-link-reviews"
          >
            <i className="fa-solid fa-star text-yellow-400 text-xs"></i>
            Reviews do MIST
          </button>

          <a
            href="https://github.com/GMoncks/topicosIV"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white transition flex items-center gap-1.5 font-medium"
            data-testid="footer-link-github"
          >
            <i className="fa-brands fa-github text-sm"></i>
            GitHub Público
          </a>
        </div>
      </div>
    </footer>
  );
};
