import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Social } from './Social';
import { socialApi, FriendItem, ActivityItem } from '../api/client';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = WebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }
}

const mockFriends: FriendItem[] = [
  {
    friendship_id: 1,
    friend_user_id: 2,
    status: 'accepted',
    since: '2026-09-20T00:00:00Z',
    username: 'CyberKnight',
    presence_status: 'playing',
    current_game: 'Helldivers 2',
  },
  {
    friendship_id: 2,
    friend_user_id: 3,
    status: 'accepted',
    since: '2026-09-22T00:00:00Z',
    username: 'Valkyrie',
    presence_status: 'online',
  },
  {
    friendship_id: 3,
    friend_user_id: 4,
    status: 'accepted',
    since: '2026-09-24T00:00:00Z',
    username: 'PixelMage',
    presence_status: 'offline',
  },
];

const mockFeed: ActivityItem[] = [
  {
    id: 1,
    user_id: 2,
    type: 'achievement_unlocked',
    payload: {
      username: 'CyberKnight',
      game_title: 'Space Marine 2',
      name: 'Primeira Vitória',
      description: 'Vença a primeira partida competitiva',
    },
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    user_id: 3,
    type: 'game_purchased',
    payload: {
      username: 'Valkyrie',
      game_title: 'Hollow Knight',
      price: 46.99,
    },
    created_at: new Date().toISOString(),
  },
];

describe('Social Page Component (F-06 & F-08)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    MockWebSocket.instances = [];

    vi.spyOn(socialApi, 'getFriends').mockResolvedValue(mockFriends);
    vi.spyOn(socialApi, 'getFeed').mockResolvedValue(mockFeed);
    vi.spyOn(socialApi, 'getChatHistory').mockResolvedValue([]);
    vi.spyOn(socialApi, 'markChatRead').mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar o feed de atividades com conquistas e compras', async () => {
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByText('Feed de Atividades')).toBeInTheDocument();
      expect(screen.getByText(/desbloqueou a conquista/i)).toBeInTheDocument();
      expect(screen.getByText('Primeira Vitória')).toBeInTheDocument();
      expect(screen.getByText(/comprou/i)).toBeInTheDocument();
      expect(screen.getByText('Hollow Knight')).toBeInTheDocument();
    });
  });

  it('deve exibir amigos agrupados por presença em tempo real (F-08)', async () => {
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByTestId('friend-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('friend-item-3')).toBeInTheDocument();
      expect(screen.getByTestId('friend-item-4')).toBeInTheDocument();

      expect(screen.getAllByText('CyberKnight').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Helldivers 2/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Valkyrie').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('PixelMage').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('deve abrir a janela de ChatWindow ao clicar em um amigo', async () => {
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByTestId('friend-item-2')).toBeInTheDocument();
    });

    const friendCard = screen.getByTestId('friend-item-2');
    fireEvent.click(friendCard);

    await waitFor(() => {
      expect(screen.getByTestId('chat-window')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Escreva uma mensagem...')).toBeInTheDocument();
    });
  });

  it('deve atualizar dinamicamente a presença via WebSocket', async () => {
    render(<Social />);

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });

    const presenceWs = MockWebSocket.instances[0];

    // Simula evento de presença onde Valkyrie entra no jogo "Hollow Knight"
    presenceWs.onmessage?.({
      data: JSON.stringify({
        type: 'presence_update',
        user_id: 3,
        status: 'playing',
        game_title: 'Hollow Knight',
        game_id: 11,
      }),
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 5, name: /Jogando Agora/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Hollow Knight/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('deve renderizar o MIST Companion Bot na seção de destaque com badge IA (G-06)', async () => {
    render(<Social />);

    await waitFor(() => {
      expect(screen.getByTestId('friend-item-bot')).toBeInTheDocument();
      expect(screen.getByText('MIST Bot')).toBeInTheDocument();
      expect(screen.getByText('Companheiro IA Oficial')).toBeInTheDocument();
      expect(screen.getByText('IA')).toBeInTheDocument();
    });

    // Clica no bot para abrir chat
    fireEvent.click(screen.getByTestId('friend-item-bot'));
    await waitFor(() => {
      expect(screen.getByTestId('chat-window')).toBeInTheDocument();
      expect(screen.getByText('BOT IA')).toBeInTheDocument();
    });
  });
});

