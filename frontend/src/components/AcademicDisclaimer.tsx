import React, { useState, useEffect } from 'react';

interface AcademicDisclaimerProps {
  onClose?: () => void;
}

export const AcademicDisclaimer: React.FC<AcademicDisclaimerProps> = ({ onClose }) => {
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanClose(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      data-testid="academic-disclaimer"
      role="banner"
      aria-label="Aviso de Projeto Acadêmico"
      className="w-full bg-red-600 border-b border-red-700 text-white px-4 py-2 sm:py-2.5 flex items-center justify-between shadow-lg relative z-30 transition-all duration-300"
    >
      <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold mx-auto sm:mx-0">
        <i className="fa-solid fa-triangle-exclamation text-amber-300 text-base shrink-0 animate-pulse"></i>
        <span>
          Esse ecossistema é um trabalho acadêmico, sem jogos reais além dos categorizados como "MIST Studios!"
        </span>
      </div>

      {canClose && (
        <button
          type="button"
          data-testid="academic-disclaimer-close"
          onClick={onClose}
          className="ml-4 p-1 rounded-md bg-red-700/80 hover:bg-red-800 text-white transition flex items-center justify-center cursor-pointer shrink-0 shadow-sm"
          aria-label="Fechar aviso acadêmico"
          title="Fechar aviso acadêmico"
        >
          <i className="fa-solid fa-xmark text-sm w-4 h-4 flex items-center justify-center"></i>
        </button>
      )}
    </div>
  );
};
