import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DownloadBar } from './DownloadBar';

describe('DownloadBar Component (E-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve renderizar a barra quando não há download ativo (sem mock padrão)', () => {
    const { container } = render(<DownloadBar />);
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar o download fornecido explicitamente via props', () => {
    render(
      <DownloadBar
        initialDownload={{
          gameTitle: 'MIST Forca',
          progressPercentage: 50,
          isPaused: false,
          statusText: 'Baixando (50%)'
        }}
      />
    );

    expect(screen.getByText('MIST Forca')).toBeInTheDocument();
    expect(screen.getByText('Baixando (50%)')).toBeInTheDocument();
  });

  it('deve iniciar download simulado e emitir mist:game-installed ao atingir 100%', () => {
    vi.useFakeTimers();

    const installedListener = vi.fn();
    const toastListener = vi.fn();
    window.addEventListener('mist:game-installed', installedListener as any);
    window.addEventListener('mist:toast', toastListener as any);

    render(<DownloadBar />);

    // Dispara início do download para o jogo 12 (MIST Quiz)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('mist:start-download', {
          detail: { gameId: 12, gameTitle: 'MIST Quiz' }
        })
      );
    });

    expect(screen.getByText('MIST Quiz')).toBeInTheDocument();

    // Avança timers para completar o progresso simulado (400ms * 8 ticks)
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(installedListener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { gameId: 12, gameTitle: 'MIST Quiz' }
      })
    );
    expect(toastListener).toHaveBeenCalled();
    expect(screen.getByText('Concluído (Instalado)')).toBeInTheDocument();

    window.removeEventListener('mist:game-installed', installedListener as any);
    window.removeEventListener('mist:toast', toastListener as any);
    vi.useRealTimers();
  });
});
