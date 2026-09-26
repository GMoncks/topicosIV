import React, { useState, useEffect, useRef } from 'react';
import { DownloadItem } from '../types';

interface DownloadBarProps {
  initialDownload?: DownloadItem;
}

export const DownloadBar: React.FC<DownloadBarProps> = ({
  initialDownload = {
    gameTitle: 'Space Marine 2',
    progressPercentage: 100,
    isPaused: true,
    statusText: 'Pronto para jogar'
  }
}) => {
  const [download, setDownload] = useState<DownloadItem>(initialDownload);
  const [isVisible, setIsVisible] = useState<boolean>(true);
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

  const togglePause = () => {
    if (download.progressPercentage >= 100) return;
    setDownload(prev => ({
      ...prev,
      isPaused: !prev.isPaused,
      statusText: prev.isPaused ? `Baixando (${prev.progressPercentage}%)` : 'Download Pausado'
    }));
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={togglePause}
      className="fixed bottom-6 right-8 bg-brand-surface border border-brand-purple p-3 rounded-2xl shadow-[0_0_20px_rgba(160,32,240,0.2)] flex items-center gap-4 z-50 cursor-pointer hover:bg-brand-card transition-all select-none animate-fade-in"
      title={download.progressPercentage < 100 ? "Clique para pausar ou continuar o download" : "Jogo instalado"}
    >
      <div className="relative w-10 h-10 flex items-center justify-center">
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
            className={download.progressPercentage >= 100 ? "text-emerald-400" : "text-brand-purple"}
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
            download.progressPercentage >= 100
              ? 'fa-check text-emerald-400 text-xs'
              : download.isPaused
              ? 'fa-play text-[10px] ml-0.5 text-white'
              : 'fa-pause text-xs text-white'
          } absolute`}
        ></i>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{download.statusText}</p>
        <p className="text-sm font-bold text-white line-clamp-1 max-w-[180px]">{download.gameTitle}</p>
      </div>
    </div>
  );
};
