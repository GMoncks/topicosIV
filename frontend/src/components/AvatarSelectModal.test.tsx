import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarSelectModal } from './AvatarSelectModal';
import { profileApi } from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    profileApi: {
      ...actual.profileApi,
      getInventory: vi.fn(),
    },
  };
});

describe('AvatarSelectModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza quando isOpen é false', () => {
    render(
      <AvatarSelectModal
        isOpen={false}
        onClose={vi.fn()}
        onSelectAvatar={vi.fn()}
      />
    );
    expect(screen.queryByTestId('avatar-select-modal')).toBeNull();
  });

  it('carrega e exibe avatares do tipo avatar do inventário', async () => {
    vi.mocked(profileApi.getInventory).mockResolvedValueOnce({
      items: [
        {
          id: 101,
          user_id: 1,
          item_id: 'avatar_cyberpunk',
          name: 'Avatar Cyberpunk',
          item_type: 'avatar',
          asset_url: 'https://mist.gg/avatars/cyberpunk.png',
          price_points: 500,
          is_equipped: false,
          status: 'disponivel',
          acquired_at: '2026-10-02T00:00:00Z',
        },
        {
          id: 102,
          user_id: 1,
          item_id: 'bg_space',
          name: 'Fundo Espacial',
          item_type: 'background',
          asset_url: 'https://mist.gg/bg/space.png',
          price_points: 1000,
          is_equipped: false,
          status: 'disponivel',
          acquired_at: '2026-10-02T00:00:00Z',
        },
      ],
      total: 2,
    });

    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <AvatarSelectModal
        isOpen={true}
        onClose={onClose}
        onSelectAvatar={onSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Avatar Cyberpunk')).toBeDefined();
      expect(screen.queryByText('Fundo Espacial')).toBeNull(); // Apenas item_type === avatar
    });

    const avatarItem = screen.getByTestId('inventory-avatar-101');
    fireEvent.click(avatarItem);

    expect(onSelect).toHaveBeenCalledWith('https://mist.gg/avatars/cyberpunk.png');
    expect(onClose).toHaveBeenCalled();
  });

  it('permite alternar para aba de upload e aplicar url personalizada', async () => {
    vi.mocked(profileApi.getInventory).mockResolvedValueOnce({ items: [], total: 0 });

    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <AvatarSelectModal
        isOpen={true}
        onClose={onClose}
        onSelectAvatar={onSelect}
      />
    );

    const tabUpload = screen.getByTestId('tab-avatar-upload');
    fireEvent.click(tabUpload);

    const inputUrl = screen.getByTestId('input-avatar-url');
    fireEvent.change(inputUrl, { target: { value: 'https://custom.image/my-avatar.png' } });

    const btnApply = screen.getByTestId('btn-apply-custom-avatar');
    fireEvent.click(btnApply);

    expect(onSelect).toHaveBeenCalledWith('https://custom.image/my-avatar.png');
    expect(onClose).toHaveBeenCalled();
  });
});
