import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrivacySettingsModal } from './PrivacySettingsModal';
import { publicProfileApi } from '../api/client';
import { PrivacySettings } from '../types';

vi.mock('../api/client', () => ({
  publicProfileApi: {
    updatePrivacySettings: vi.fn(),
  },
}));

describe('PrivacySettingsModal Component (Bloco P)', () => {
  const initialSettings: PrivacySettings = {
    privacy_games: 'Todos',
    privacy_achievements: 'Todos',
    privacy_playtime: 'Todos',
    privacy_inventory: 'Todos',
    privacy_screenshots: 'Todos',
    privacy_groups: 'Todos',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FRONT-UNIT-52: Renderiza 6 seções de privacidade, altera opções e aciona salvar', async () => {
    const handleClose = vi.fn();
    const handleSaved = vi.fn();

    vi.mocked(publicProfileApi.updatePrivacySettings).mockResolvedValueOnce({
      ...initialSettings,
      privacy_games: 'Amigos',
      privacy_inventory: 'Privado',
    });

    render(
      <PrivacySettingsModal
        isOpen={true}
        onClose={handleClose}
        initialSettings={initialSettings}
        onSaved={handleSaved}
      />
    );

    expect(screen.getByTestId('privacy-modal')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-row-privacy_games')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-row-privacy_achievements')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-row-privacy_playtime')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-row-privacy_inventory')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-row-privacy_screenshots')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-row-privacy_groups')).toBeInTheDocument();

    // Clica em 'Amigos' para Jogos
    const btnAmigosGames = screen.getByTestId('privacy-btn-privacy_games-Amigos');
    fireEvent.click(btnAmigosGames);

    // Clica em 'Privado' para Inventário
    const btnPrivadoInv = screen.getByTestId('privacy-btn-privacy_inventory-Privado');
    fireEvent.click(btnPrivadoInv);

    // Salvar
    const btnSave = screen.getByTestId('btn-save-privacy');
    fireEvent.click(btnSave);

    await waitFor(() => {
      expect(publicProfileApi.updatePrivacySettings).toHaveBeenCalledWith({
        privacy_games: 'Amigos',
        privacy_achievements: 'Todos',
        privacy_playtime: 'Todos',
        privacy_inventory: 'Privado',
        privacy_screenshots: 'Todos',
        privacy_groups: 'Todos',
      });
      expect(handleSaved).toHaveBeenCalled();
    });
  });
});
