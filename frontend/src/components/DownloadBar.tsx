import React, { useState } from 'react';
import { DownloadItem } from '../types';

interface DownloadBarProps {
  initialDownload?: DownloadItem;
}

export const DownloadBar: React.FC<DownloadBarProps> = ({
  initialDownload = {
    gameTitle: 'Space Marine 2',
    progressPercentage: 60,
    isPaused: true,
    statusText: 'Baixando (Pausado)'
  }
}) => {
  const [download, setDownload] = useState<DownloadItem>(initialDownload);

  const togglePause = () => {
    setDownload(prev => ({
      ...prev,
      isPaused: !prev.isPaused,
      statusText: prev.isPaused ? 'Baixando (Em andamento)' : 'Baixando (Pausado)'
    }));
  };

  return (
    <div
      onClick={togglePause}
      className="fixed bottom-6 right-8 bg-brand-surface border border-brand-purple p-3 rounded-2xl shadow-[0_0_20px_rgba(160,32,240,0.2)] flex items-center gap-4 z-50 cursor-pointer hover:bg-brand-card transition-all select-none"
      title="Clique para alternar o download"
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
            className="text-brand-purple"
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
            download.isPaused ? 'fa-pause' : 'fa-play text-[10px] ml-0.5'
          } absolute text-white text-xs`}
        ></i>
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{download.statusText}</p>
        <p className="text-sm font-bold text-white">{download.gameTitle}</p>
      </div>
    </div>
  );
};
