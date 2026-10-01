import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Groups } from './Groups';
import { groupsApi } from '../api/client';

vi.mock('../api/client', () => ({
  API_GATEWAY_URL: 'http://localhost:8000',
  groupsApi: {
    getGroups: vi.fn(),
    getGroup: vi.fn(),
    createGroup: vi.fn(),
    joinGroup: vi.fn(),
    leaveGroup: vi.fn(),
    getMembers: vi.fn(),
    getPosts: vi.fn(),
    createPost: vi.fn(),
    getPost: vi.fn(),
    updatePost: vi.fn(),
    createReply: vi.fn(),
    getChatMessages: vi.fn(),
    sendChatMessage: vi.fn(),
  },
}));

const mockGroups = [
  {
    id: 1,
    name: 'RPG Brasil & Souls Enthusiasts',
    description: 'Comunidade oficial para debates de builds e lore.',
    avatar_url: 'https://avatar.png',
    header_url: 'https://header.png',
    category: 'RPG',
    is_private: false,
    owner_id: 1,
    members_count: 12,
    posts_count: 5,
    created_at: '2026-09-01T12:00:00Z',
    is_member: true,
    role: 'owner',
  },
  {
    id: 2,
    name: 'Counter-Strike & Tactical Shooters',
    description: 'Line-ups e Premier do CS2.',
    avatar_url: 'https://avatar2.png',
    category: 'FPS',
    is_private: false,
    owner_id: 2,
    members_count: 8,
    posts_count: 2,
    created_at: '2026-09-05T12:00:00Z',
    is_member: false,
    role: null,
  },
];

const mockPosts = [
  {
    id: 101,
    group_id: 1,
    author_id: 1,
    title: 'Regras da Comunidade & Guia de Builds',
    content: 'Priorizem Vigor em Elden Ring!',
    is_pinned: true,
    is_locked: false,
    views_count: 45,
    replies_count: 2,
    created_at: '2026-09-10T12:00:00Z',
    updated_at: '2026-09-10T12:00:00Z',
  },
];

const mockPostDetail = {
  ...mockPosts[0],
  replies: [
    {
      id: 201,
      post_id: 101,
      author_id: 2,
      content: 'Excelente dica sobre o Vigor!',
      created_at: '2026-09-11T12:00:00Z',
    },
  ],
};

const mockMembers = [
  { id: 1, group_id: 1, user_id: 1, role: 'owner', joined_at: '2026-09-01T12:00:00Z' },
  { id: 2, group_id: 1, user_id: 2, role: 'member', joined_at: '2026-09-02T12:00:00Z' },
];

const mockChatMessages = [
  { id: 301, group_id: 1, user_id: 1, username: 'mauricio_live', content: 'Fala pessoal do RPG!', created_at: '2026-09-10T12:00:00Z' },
];

describe('Groups Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (groupsApi.getGroups as any).mockResolvedValue(mockGroups);
    (groupsApi.getPosts as any).mockResolvedValue(mockPosts);
    (groupsApi.getPost as any).mockResolvedValue(mockPostDetail);
    (groupsApi.getMembers as any).mockResolvedValue(mockMembers);
    (groupsApi.getChatMessages as any).mockResolvedValue(mockChatMessages);
  });

  it('renderiza o catálogo de grupos com sucesso', async () => {
    render(<Groups />);
    expect(await screen.findByText('RPG Brasil & Souls Enthusiasts')).toBeInTheDocument();
    expect(screen.getByText('Counter-Strike & Tactical Shooters')).toBeInTheDocument();
    expect(screen.getByText('2 Grupos Ativos')).toBeInTheDocument();
  });

  it('permite filtrar por categoria ao clicar no botão correspondente', async () => {
    render(<Groups />);
    await screen.findByText('RPG Brasil & Souls Enthusiasts');

    const fpsButton = screen.getByRole('button', { name: 'FPS' });
    fireEvent.click(fpsButton);

    await waitFor(() => {
      expect(groupsApi.getGroups).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'FPS' })
      );
    });
  });

  it('seleciona um grupo e exibe seus tópicos de fórum', async () => {
    render(<Groups />);
    const groupCard = await screen.findByText('RPG Brasil & Souls Enthusiasts');
    fireEvent.click(groupCard);

    expect(await screen.findByText('Regras da Comunidade & Guia de Builds')).toBeInTheDocument();
    expect(screen.getByText(/Priorizem Vigor em Elden Ring/)).toBeInTheDocument();
    expect(screen.getByText(/Fórum de Discussões/)).toBeInTheDocument();
  });

  it('abre detalhes de um tópico e exibe as respostas da comunidade', async () => {
    render(<Groups />);
    const groupCard = await screen.findByText('RPG Brasil & Souls Enthusiasts');
    fireEvent.click(groupCard);

    const postItem = await screen.findByText('Regras da Comunidade & Guia de Builds');
    fireEvent.click(postItem);

    expect(await screen.findByText('Excelente dica sobre o Vigor!')).toBeInTheDocument();
    expect(screen.getByText(/Respostas da Comunidade/)).toBeInTheDocument();
  });

  it('alterna para a aba de bate-papo coletivo e membros', async () => {
    render(<Groups />);
    const groupCard = await screen.findByText('RPG Brasil & Souls Enthusiasts');
    fireEvent.click(groupCard);

    // Clica na aba de chat
    const chatTab = await screen.findByRole('button', { name: /Bate-Papo Coletivo Ao Vivo/ });
    fireEvent.click(chatTab);
    expect(await screen.findByText('Fala pessoal do RPG!')).toBeInTheDocument();

    // Clica na aba de membros
    const membersTab = screen.getByRole('button', { name: /Membros/ });
    fireEvent.click(membersTab);
    expect(await screen.findByText('User #1')).toBeInTheDocument();
  });
});
