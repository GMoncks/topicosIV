import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatWindow } from './ChatWindow';
import { FriendItem, socialApi } from '../api/client';

// Mock do WebSocket do navegador
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

const mockFriend: FriendItem = {
  friendship_id: 1,
  friend_user_id: 2,
  status: 'accepted',
  since: '2026-09-20T00:00:00Z',
  username: 'CyberKnight',
  avatar_url: 'https://picsum.photos/seed/user2/100/100',
  presence_status: 'playing',
  current_game: 'Helldivers 2',
};

describe('ChatWindow Component (F-07)', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket);
    MockWebSocket.instances = [];

    vi.spyOn(socialApi, 'getChatHistory').mockResolvedValue([
      {
        id: 101,
        room_id: 'direct_1_2',
        sender_id: 2,
        content: 'Bora fechar o esquadrão?',
        created_at: new Date().toISOString(),
        is_read: true,
      },
    ]);
    vi.spyOn(socialApi, 'markChatRead').mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar o cabeçalho com nome do amigo e status de jogo', async () => {
    const handleClose = vi.fn();
    render(<ChatWindow friend={mockFriend} currentUserId={1} onClose={handleClose} />);

    expect(screen.getByText('CyberKnight')).toBeInTheDocument();
    expect(screen.getByText(/Jogando Helldivers 2/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Bora fechar o esquadrão?')).toBeInTheDocument();
    });
  });

  it('deve permitir enviar mensagem via formulário e WebSocket', async () => {
    render(<ChatWindow friend={mockFriend} currentUserId={1} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText('Escreva uma mensagem...');
    fireEvent.change(input, { target: { value: 'Estou pronto, vamos lá!' } });

    const submitBtn = screen.getByLabelText('Enviar Mensagem');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      const ws = MockWebSocket.instances[0];
      expect(ws.send).toHaveBeenCalled();
    });
  });

  it('deve exibir o indicador animado de digitação quando o amigo estiver digitando', async () => {
    render(<ChatWindow friend={mockFriend} currentUserId={1} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });

    const ws = MockWebSocket.instances[0];

    // Simula recebimento de evento de digitação do amigo
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'typing',
        room_id: 'direct_1_2',
        user_id: 2,
        is_typing: true,
      }),
    });

    await waitFor(() => {
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
      expect(screen.getByText(/CyberKnight está digitando.../i)).toBeInTheDocument();
    });
  });

  it('deve chamar onClose ao clicar no botão de fechar', () => {
    const handleClose = vi.fn();
    render(<ChatWindow friend={mockFriend} currentUserId={1} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('Fechar Chat');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('exibe badge BOT IA, sugestões rápidas e indicador personalizado quando o amigo é o MIST Bot (G-06)', async () => {
    const botFriend: FriendItem = {
      friendship_id: 0,
      friend_user_id: 0,
      status: 'accepted',
      since: '2026-01-01T00:00:00Z',
      username: 'MIST Bot',
      presence_status: 'online',
      current_game: 'MIST AI Companion',
      is_bot: true,
    };

    render(<ChatWindow friend={botFriend} currentUserId={1} onClose={vi.fn()} />);

    // 1. Badge BOT IA no cabeçalho
    expect(screen.getByText('BOT IA')).toBeInTheDocument();

    // 2. Presença das Sugestões Rápidas (Quick Prompts)
    expect(screen.getByText(/Sugestões:/i)).toBeInTheDocument();
    const promptBtn = screen.getByText('Recomende um jogo do catálogo');
    expect(promptBtn).toBeInTheDocument();

    // 3. Clicar na sugestão deve preencher o input
    fireEvent.click(promptBtn);
    const input = screen.getByPlaceholderText('Escreva uma mensagem...') as HTMLInputElement;
    expect(input.value).toBe('Recomende um jogo do catálogo');

    // 4. Indicador de digitação do bot
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });
    const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'typing',
        room_id: 'direct_0_1',
        user_id: 0,
        is_typing: true,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/MIST Bot está formulando resposta.../i)).toBeInTheDocument();
    });
  });
});

