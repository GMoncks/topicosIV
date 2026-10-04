import React, { useState, useEffect, useRef } from 'react';
import { DownloadItem } from '../types';

interface DownloadBarProps {
  initialDownload?: DownloadItem;
}

export const DownloadBar: React.FC<DownloadBarProps> = ({ initialDownload }) => {
  const [download, setDownload] = useState<DownloadItem | null>(initialDownload || null);
  const [isVisible, setIsVisible] = useState<boolean>(!!initialDownload);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Listener para evento customizado de início de download vindo da Library (E-06)
  useEffect(() => {
    const handleStartDownload = (e: CustomEvent<{ gameId: number; gameTitle: string }>) => {
      const { gameId, gameTitle } = e.detail;
      setIsVisible(true);
      setDownload({
        gameTitle,
        progressPercentage: 0,
        isPaused: false,
        statusText: 'Iniciando download...'
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        setDownload(prev => {
          if (!prev) return null;
          if (prev.isPaused) return prev;
          const next = prev.progressPercentage + Math.floor(Math.random() * 15 + 10);
          if (next >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            
            // Dispara evento informando que o jogo foi instalado com sucesso
            window.dispatchEvent(
              new CustomEvent('mist:game-installed', {
                detail: { gameId, gameTitle: prev.gameTitle }
              })
            );

            // Emite toast informando a conclusão
            window.dispatchEvent(
              new CustomEvent('mist:toast', {
                detail: `Download e instalação de "${prev.gameTitle}" concluídos!`
              })
            );

            return {
              ...prev,
              progressPercentage: 100,
              isPaused: true,
              statusText: 'Concluído (Instalado)'
            };
          }
          return {
            ...prev,
            progressPercentage: next,
            statusText: `Baixando (${next}%)`
          };
        });
      }, 400);
    };

    window.addEventListener('mist:start-download' as any, handleStartDownload);
    return () => {
      window.removeEventListener('mist:start-download' as any, handleStartDownload);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleClick = () => {
    if (!download) return;
    if (download.progressPercentage >= 100) {
      setIsVisible(false);
      setDownload(null);
      return;
    }
    setDownload(prev => prev ? ({
      ...prev,
      isPaused: !prev.isPaused,
      statusText: prev.isPaused ? `Baixando (${prev.progressPercentage}%)` : 'Download Pausado'
    }) : null);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setDownload(null);
  };

  if (!isVisible || !download) return null;

  const isCompleted = download.progressPercentage >= 100;

  return (
    <div
      data-testid="download-bar"
      onClick={handleClick}
      className={`fixed bottom-6 right-8 bg-brand-surface border ${
        isCompleted ? 'border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.25)]' : 'border-brand-purple shadow-[0_0_20px_rgba(160,32,240,0.2)]'
      } p-3 rounded-2xl flex items-center gap-4 z-50 cursor-pointer hover:bg-brand-card transition-all select-none animate-fade-in`}
      title={isCompleted ? "Download concluído. Clique para fechar" : "Clique para pausar ou continuar o download"}
    >
      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
        {/* Círculo de progresso SVG */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-gray-700"
            strokeWidth="3"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={isCompleted ? "text-emerald-400" : "text-brand-purple"}
            strokeDasharray={`${download.progressPercentage}, 100`}
            strokeWidth="3"
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <i
          className={`fa-solid ${
            isCompleted
              ? 'fa-check text-emerald-400 text-xs'
              : download.isPaused
              ? 'fa-play text-[10px] ml-0.5 text-white'
              : 'fa-pause text-xs text-white'
          } absolute`}
        ></i>
      </div>
      <div className="flex-1 min-w-0 pr-1">
        <p className={`text-xs font-medium ${isCompleted ? 'text-emerald-400' : 'text-gray-400'}`}>{download.statusText}</p>
        <p className="text-sm font-bold text-white line-clamp-1 max-w-[180px]">{download.gameTitle}</p>
      </div>
      {isCompleted && (
        <button
          type="button"
          data-testid="download-bar-close"
          onClick={handleClose}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800/60 transition ml-1"
          title="Fechar aviso de download"
          aria-label="Fechar aviso de download"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
      )}
    </div>
  );
};
