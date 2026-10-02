import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GroupItem,
  GroupMemberItem,
  ForumPostItem,
  ForumPostDetailItem,
  GroupMessageItem,
  groupsApi,
  API_GATEWAY_URL,
} from '../api/client';

const CATEGORIES = ['all', 'RPG', 'FPS', 'Indie', 'Desafios', 'Tecnologia'];

interface GroupsProps {
  initialGroupId?: number | null;
}

export const Groups: React.FC<GroupsProps> = ({ initialGroupId }) => {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [myGroupsOnly, setMyGroupsOnly] = useState(false);

  // Grupo selecionado atualmente
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [activeTab, setActiveTab] = useState<'forum' | 'chat' | 'members'>('forum');

  // Fórum do grupo selecionado
  const [posts, setPosts] = useState<ForumPostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPostDetailItem | null>(null);
  const [loadingPostDetail, setLoadingPostDetail] = useState(false);

  // Chat do grupo selecionado
  const [chatMessages, setChatMessages] = useState<GroupMessageItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Membros do grupo selecionado
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Modais de Criação
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('RPG');
  const [newGroupAvatar, setNewGroupAvatar] = useState('');
  const [newGroupHeader, setNewGroupHeader] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Modal / Form de Novo Tópico
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostPinned, setNewPostPinned] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);

  // Formulário de Resposta
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Notificação / Toast interno
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Carrega lista de grupos
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await groupsApi.getGroups({
        category: categoryFilter,
        q: searchQuery || undefined,
        my_groups: myGroupsOnly,
      });
      setGroups(data);
      if (initialGroupId && !selectedGroup) {
        const found = data.find((g) => g.id === initialGroupId);
        if (found) setSelectedGroup(found);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar grupos:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery, myGroupsOnly, initialGroupId, selectedGroup]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Carrega tópicos do fórum
  const loadGroupPosts = useCallback(async (groupId: number) => {
    try {
      setLoadingPosts(true);
      const data = await groupsApi.getPosts(groupId);
      setPosts(data);
    } catch (err) {
      console.warn('Erro ao carregar tópicos do fórum:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  // Carrega histórico de chat
  const loadGroupChat = useCallback(async (groupId: number) => {
    try {
      const data = await groupsApi.getChatMessages(groupId);
      setChatMessages(data);
    } catch (err) {
      console.warn('Erro ao carregar chat:', err);
    }
  }, []);

  // Carrega membros
  const loadGroupMembers = useCallback(async (groupId: number) => {
    try {
      setLoadingMembers(true);
      const data = await groupsApi.getMembers(groupId);
      setMembers(data);
    } catch (err) {
      console.warn('Erro ao carregar membros:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // Seleciona um grupo e dispara as cargas
  const handleSelectGroup = (group: GroupItem) => {
    setSelectedGroup(group);
    setSelectedPost(null);
    setActiveTab('forum');
    loadGroupPosts(group.id);
    loadGroupChat(group.id);
    loadGroupMembers(group.id);
  };

  // Conexão WebSocket para o chat do grupo
  useEffect(() => {
    if (!selectedGroup || activeTab !== 'chat') {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const wsBase = API_GATEWAY_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/group/${selectedGroup.id}/chat?user_id=1`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chat_message') {
            setChatMessages((prev) => {
              // Evita duplicatas se já foi adicionado otimisticamente
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
            setTimeout(() => {
              chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 60);
          }
        } catch (err) {
          console.error('Erro ao processar mensagem do websocket de grupo:', err);
        }
      };
    } catch (err) {
      console.warn('Falha ao conectar no WebSocket do grupo:', err);
    }

    return () => {
      if (ws) {
        ws.close();
        wsRef.current = null;
      }
    };
  }, [selectedGroup, activeTab]);

  // Ações de Entrar / Sair do Grupo
  const handleToggleJoin = async () => {
    if (!selectedGroup) return;
    try {
      if (selectedGroup.is_member) {
        const updated = await groupsApi.leaveGroup(selectedGroup.id);
        setSelectedGroup(updated);
        setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        showAlert('Você saiu do grupo.');
      } else {
        const updated = await groupsApi.joinGroup(selectedGroup.id);
        setSelectedGroup(updated);
        setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        showAlert('Bem-vindo ao grupo!', 'success');
      }
      loadGroupMembers(selectedGroup.id);
    } catch (err: any) {
      showAlert(err.message || 'Erro ao processar ação.', 'error');
    }
  };

  // Criação de Grupo
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      setCreatingGroup(true);
      const created = await groupsApi.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
        category: newGroupCategory,
        avatar_url: newGroupAvatar.trim() || undefined,
        header_url: newGroupHeader.trim() || undefined,
      });
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupAvatar('');
      setNewGroupHeader('');
      showAlert(`Grupo "${created.name}" criado com sucesso!`, 'success');
      setGroups((prev) => [created, ...prev]);
      handleSelectGroup(created);
    } catch (err: any) {
      showAlert(err.message || 'Erro ao criar grupo.', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Abrir detalhes de um tópico
  const handleOpenPost = async (postId: number) => {
    try {
      setLoadingPostDetail(true);
      const detail = await groupsApi.getPost(postId);
      setSelectedPost(detail);
    } catch (err: any) {
      showAlert(err.message || 'Erro ao carregar discussão.', 'error');
    } finally {
      setLoadingPostDetail(false);
    }
  };

  // Criar Tópico no Fórum
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !newPostTitle.trim() || !newPostContent.trim()) return;

    try {
      setCreatingPost(true);
      const post = await groupsApi.createPost(selectedGroup.id, {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        is_pinned: newPostPinned,
      });
      setShowCreatePostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostPinned(false);
      showAlert('Tópico publicado com sucesso!', 'success');
      setPosts((prev) => [post, ...prev]);
      setSelectedGroup((prev) => (prev ? { ...prev, posts_count: (prev.posts_count || 0) + 1 } : null));
    } catch (err: any) {
      showAlert(err.message || 'Erro ao publicar tópico.', 'error');
    } finally {
      setCreatingPost(false);
    }
  };

  // Enviar Resposta a um Tópico
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !replyContent.trim()) return;

    try {
      setSendingReply(true);
      const reply = await groupsApi.createReply(selectedPost.id, { content: replyContent.trim() });
      setSelectedPost((prev) =>
        prev
          ? {
              ...prev,
              replies_count: (prev.replies_count || 0) + 1,
              replies: [...(prev.replies || []), reply],
            }
          : null
      );
      setReplyContent('');
      showAlert('Resposta adicionada!', 'success');
    } catch (err: any) {
      showAlert(err.message || 'Erro ao enviar resposta.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Enviar Mensagem no Chat Coletivo
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !chatInput.trim()) return;

    const content = chatInput.trim();
    setChatInput('');

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'chat_message', content, username: 'Você' }));
      } else {
        const saved = await groupsApi.sendChatMessage(selectedGroup.id, content);
        setChatMessages((prev) => [...prev, saved]);
      }
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      showAlert(err.message || 'Erro ao enviar mensagem de chat.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-gray-200 p-8 space-y-8 animate-fade-in" data-testid="groups-page">
      {/* Alerta / Toast interno */}
      {alertMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition ${
            alertMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/80 text-rose-200'
          }`}
        >
          <i className={`fa-solid ${alertMsg.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-rose-400'}`}></i>
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Top Banner & Navegação Superior */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple">
              <i className="fa-solid fa-users text-xl"></i>
            </div>
            <div>
              <h1 className="text-3xl font-display font-black tracking-tight text-white flex items-center gap-3">
                Grupos & Fórum da Comunidade
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-purple/30 text-purple-300 border border-brand-purple/40">
                  {groups.length} Grupos Ativos
                </span>
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Encontre esquadrões, participe de discussões técnicas, compartilhe builds e converse ao vivo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedGroup && (
            <button
              type="button"
              onClick={() => {
                setSelectedGroup(null);
                setSelectedPost(null);
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer border border-gray-700"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Explorar Todos os Grupos
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCreateGroupModal(true)}
            className="px-4 py-2 bg-brand-purple hover:bg-purple-600 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-950/40"
          >
            <i className="fa-solid fa-plus"></i>
            Criar Novo Grupo
          </button>
        </div>
      </div>

      {/* Visão 1: Catálogo de Grupos (Quando nenhum grupo está selecionado) */}
      {!selectedGroup && (
        <div className="space-y-6">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-brand-card p-4 rounded-2xl border border-gray-800">
            {/* Categorias */}
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Categorias de Grupos">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-brand-purple text-white border-brand-purple shadow-sm'
                      : 'bg-black/30 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                  }`}
                >
                  {cat === 'all' ? 'Todas as Categorias' : cat}
                </button>
              ))}
            </div>

            {/* Busca e Toggle de Meus Grupos */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                <input
                  type="text"
                  placeholder="Buscar grupo ou tema..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-brand-purple rounded-xl pl-9 pr-3 py-1.5 text-xs text-black placeholder-gray-500 focus:outline-none transition shadow-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => setMyGroupsOnly(!myGroupsOnly)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  myGroupsOnly
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                    : 'bg-black/30 text-gray-400 border-gray-800 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-user-check text-xs"></i>
                Meus Grupos
              </button>
            </div>
          </div>

          {/* Grid de Grupos */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-brand-card rounded-2xl border border-gray-800 animate-pulse"></div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="py-20 text-center bg-brand-card rounded-2xl border border-gray-800">
              <i className="fa-solid fa-users-slash text-4xl text-gray-600 mb-3 block"></i>
              <h3 className="text-lg font-bold text-white">Nenhum grupo encontrado</h3>
              <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
                Tente ajustar os filtros ou seja o primeiro a criar um grupo para sua comunidade favorita!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((grp) => (
                <div
                  key={grp.id}
                  onClick={() => handleSelectGroup(grp)}
                  className="group bg-brand-card border border-gray-800 hover:border-brand-purple/70 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                >
                  {/* Banner & Avatar */}
                  <div className="relative h-28 bg-gradient-to-r from-gray-900 to-gray-800 overflow-hidden">
                    {grp.header_url && (
                      <img
                        src={grp.header_url}
                        alt={grp.name}
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-300"
                      />
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-gray-300 border border-gray-700/60 uppercase tracking-wider">
                        {grp.category}
                      </span>
                      {grp.is_member && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                          <i className="fa-solid fa-check text-[9px]"></i>
                          {grp.role === 'owner' ? 'Dono' : grp.role === 'moderator' ? 'Mod' : 'Membro'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 -mt-10 mb-3">
                        <img
                          src={grp.avatar_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=150&q=80'}
                          alt={grp.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-card shadow-lg bg-gray-900"
                        />
                      </div>
                      <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition line-clamp-1">
                        {grp.name}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                        {grp.description || 'Comunidade aberta para jogadores e entusiastas MIST.'}
                      </p>
                    </div>

                    {/* Rodapé do Card com Estatísticas */}
                    <div className="mt-5 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5" title="Membros no grupo">
                          <i className="fa-solid fa-users text-gray-500"></i>
                          <strong className="text-gray-200">{grp.members_count}</strong>
                        </span>
                        <span className="flex items-center gap-1.5" title="Tópicos de discussão">
                          <i className="fa-solid fa-comments text-gray-500"></i>
                          <strong className="text-gray-200">{grp.posts_count}</strong>
                        </span>
                      </div>
                      <span className="text-brand-purple font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                        Acessar <i className="fa-solid fa-chevron-right text-[10px]"></i>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visão 2: Visão do Grupo Selecionado (Fórum, Chat e Membros) */}
      {selectedGroup && (
        <div className="space-y-6">
          {/* Header do Grupo Selecionado */}
          <div className="relative rounded-3xl overflow-hidden border border-gray-800 bg-brand-card shadow-2xl">
            <div className="h-44 bg-gradient-to-r from-gray-900 via-purple-950/40 to-gray-900 relative">
              {selectedGroup.header_url && (
                <img
                  src={selectedGroup.header_url}
                  alt={selectedGroup.name}
                  className="w-full h-full object-cover opacity-50"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-transparent to-transparent"></div>
            </div>

            <div className="px-8 pb-6 -mt-16 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div className="flex items-end gap-5">
                <img
                  src={selectedGroup.avatar_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=200&q=80'}
                  alt={selectedGroup.name}
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-brand-card shadow-2xl bg-gray-900"
                />
                <div className="mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-purple/20 text-purple-300 border border-brand-purple/40">
                      {selectedGroup.category}
                    </span>
                    {selectedGroup.is_member && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                        {selectedGroup.role === 'owner' ? '👑 Criador / Dono' : selectedGroup.role === 'moderator' ? '🛡️ Moderador' : '✓ Membro'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-display font-black text-white mt-1">{selectedGroup.name}</h2>
                  <p className="text-gray-400 text-xs mt-1 max-w-2xl">{selectedGroup.description}</p>
                </div>
              </div>

              {/* Botões de Ação do Grupo */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleJoin}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 cursor-pointer shadow-md ${
                    selectedGroup.is_member
                      ? 'bg-gray-800 hover:bg-rose-950/60 hover:border-rose-700/60 hover:text-rose-300 text-gray-300 border border-gray-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <i className={`fa-solid ${selectedGroup.is_member ? 'fa-right-from-bracket' : 'fa-user-plus'}`}></i>
                  {selectedGroup.is_member ? 'Sair do Grupo' : 'Entrar no Grupo'}
                </button>
              </div>
            </div>

            {/* Abas Internas: Fórum, Chat Coletivo e Membros */}
            <div className="flex items-center gap-8 px-8 border-t border-gray-800/80 bg-black/20">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('forum');
                  setSelectedPost(null);
                }}
                className={`py-3.5 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'forum'
                    ? 'border-brand-purple text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-comments text-xs"></i>
                Fórum de Discussões ({posts.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`py-3.5 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'chat'
                    ? 'border-brand-purple text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-comment-dots text-xs"></i>
                Bate-Papo Coletivo Ao Vivo
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className={`py-3.5 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                  activeTab === 'members'
                    ? 'border-brand-purple text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-users text-xs"></i>
                Membros ({members.length})
              </button>
            </div>
          </div>

          {/* Conteúdo da Aba FÓRUM */}
          {activeTab === 'forum' && (
            <div className="space-y-6">
              {/* Visão de Tópico Selecionado (Replies) */}
              {selectedPost ? (
                <div className="bg-brand-card border border-gray-800 rounded-3xl p-8 space-y-6 animate-fade-in shadow-xl">
                  {/* Cabeçalho do Tópico */}
                  <div className="flex items-start justify-between pb-6 border-b border-gray-800 gap-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedPost(null)}
                        className="text-xs font-semibold text-brand-purple hover:underline mb-2 flex items-center gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-arrow-left"></i> Voltar para os tópicos
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedPost.is_pinned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600/40 flex items-center gap-1">
                            <i className="fa-solid fa-thumbtack text-[9px]"></i> Fixado
                          </span>
                        )}
                        {selectedPost.is_locked && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-600/40 flex items-center gap-1">
                            <i className="fa-solid fa-lock text-[9px]"></i> Fechado
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-white mt-1.5">{selectedPost.title}</h2>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                        <span>Autor: <strong>User #{selectedPost.author_id}</strong></span>
                        <span>•</span>
                        <span>{new Date(selectedPost.created_at).toLocaleString('pt-BR')}</span>
                        <span>•</span>
                        <span>{selectedPost.views_count} visualizações</span>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo do Post Original */}
                  <div className="p-6 bg-black/30 rounded-2xl border border-gray-800/80 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {selectedPost.content}
                  </div>

                  {/* Lista de Respostas (Replies) */}
                  <div className="space-y-4 pt-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-reply text-brand-purple"></i>
                      Respostas da Comunidade ({selectedPost.replies?.length || 0})
                    </h4>

                    {loadingPostDetail ? (
                      <div className="py-8 text-center text-gray-400">
                        <i className="fa-solid fa-circle-notch fa-spin text-xl text-brand-purple mr-2"></i>
                        Carregando respostas...
                      </div>
                    ) : selectedPost.replies && selectedPost.replies.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPost.replies.map((rep) => (
                          <div
                            key={rep.id}
                            className="p-4 bg-brand-surface rounded-2xl border border-gray-800/80 flex items-start gap-3.5 transition hover:border-gray-700"
                          >
                            <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                              U{rep.author_id}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                <strong className="text-white font-semibold">User #{rep.author_id}</strong>
                                <span>{new Date(rep.created_at).toLocaleString('pt-BR')}</span>
                              </div>
                              <p className="text-sm text-gray-300 whitespace-pre-wrap">{rep.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-gray-500 text-xs bg-black/20 rounded-2xl border border-gray-800/50">
                        Nenhuma resposta neste tópico ainda. Seja o primeiro a responder!
                      </div>
                    )}

                    {/* Formulário de Resposta */}
                    {!selectedPost.is_locked ? (
                      <form onSubmit={handleSendReply} className="pt-4 space-y-3 border-t border-gray-800/80">
                        <textarea
                          rows={3}
                          placeholder={
                            selectedGroup.is_member
                              ? 'Escreva sua contribuição para a discussão...'
                              : 'Você precisa ser membro do grupo para responder.'
                          }
                          disabled={!selectedGroup.is_member || sendingReply}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          className="w-full bg-white border border-gray-300 focus:border-brand-purple rounded-2xl p-4 text-sm text-black placeholder-gray-500 focus:outline-none transition disabled:opacity-50 shadow-sm"
                        ></textarea>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={!selectedGroup.is_member || !replyContent.trim() || sendingReply}
                            className="px-5 py-2.5 bg-brand-purple hover:bg-purple-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                          >
                            {sendingReply ? (
                              <i className="fa-solid fa-circle-notch fa-spin"></i>
                            ) : (
                              <i className="fa-solid fa-paper-plane"></i>
                            )}
                            Publicar Resposta
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-2xl text-center text-xs text-rose-300 font-semibold">
                        🔒 Este tópico foi fechado pelos moderadores para novas respostas.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Lista Geral de Tópicos do Grupo */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-fire text-amber-400"></i>
                      Discussões em Destaque
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreatePostModal(true)}
                      disabled={!selectedGroup.is_member}
                      title={!selectedGroup.is_member ? 'Entre no grupo para criar tópicos' : undefined}
                      className="px-4 py-2 bg-brand-purple hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                      Novo Tópico
                    </button>
                  </div>

                  {loadingPosts ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-brand-card rounded-2xl border border-gray-800 animate-pulse"></div>
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="py-16 text-center bg-brand-card rounded-3xl border border-gray-800">
                      <i className="fa-solid fa-comment-slash text-3xl text-gray-600 mb-2 block"></i>
                      <h4 className="font-bold text-white text-base">Nenhum tópico criado</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                        Inicie o primeiro debate sobre estratégias, conquistas ou notícias deste grupo!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {posts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleOpenPost(p.id)}
                          className={`p-5 bg-brand-card border rounded-2xl transition-all duration-200 hover:border-brand-purple/70 hover:-translate-y-0.5 cursor-pointer flex items-center justify-between gap-4 ${
                            p.is_pinned ? 'border-amber-600/40 bg-amber-950/10' : 'border-gray-800'
                          }`}
                        >
                          <div className="flex items-start gap-4 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                                p.is_pinned
                                  ? 'bg-amber-950/60 text-amber-400 border border-amber-600/50'
                                  : 'bg-purple-950/40 text-purple-300 border border-purple-800/40'
                              }`}
                            >
                              <i className={`fa-solid ${p.is_pinned ? 'fa-thumbtack' : 'fa-comment'}`}></i>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {p.is_pinned && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-600/40">
                                    Fixado
                                  </span>
                                )}
                                {p.is_locked && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-600/40">
                                    Fechado
                                  </span>
                                )}
                                <h4 className="font-bold text-sm text-white hover:text-purple-300 transition truncate">
                                  {p.title}
                                </h4>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 truncate max-w-xl">{p.content}</p>
                              <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-2">
                                <span>Por User #{p.author_id}</span>
                                <span>•</span>
                                <span>{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-xs text-gray-400 shrink-0">
                            <div className="text-right">
                              <span className="block font-bold text-white text-sm">{p.replies_count}</span>
                              <span className="text-[10px] text-gray-500 uppercase">respostas</span>
                            </div>
                            <div className="text-right hidden sm:block">
                              <span className="block font-bold text-white text-sm">{p.views_count}</span>
                              <span className="text-[10px] text-gray-500 uppercase">views</span>
                            </div>
                            <i className="fa-solid fa-chevron-right text-gray-600 text-xs"></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Conteúdo da Aba CHAT COLETIVO */}
          {activeTab === 'chat' && (
            <div className="bg-brand-card border border-gray-800 rounded-3xl p-6 h-[560px] flex flex-col justify-between shadow-2xl">
              {/* Header do Chat */}
              <div className="pb-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Canal ao vivo do grupo <strong>{selectedGroup.name}</strong></span>
                </div>
                <span className="text-[11px] text-gray-500">Histórico mantido para todos os membros</span>
              </div>

              {/* Mensagens do Chat */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
                {chatMessages.length === 0 ? (
                  <div className="py-20 text-center text-gray-500 text-xs">
                    Nenhuma mensagem recente. Diga olá para a comunidade!
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={msg.id || idx} className="flex items-start gap-3 text-xs">
                      <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center font-bold text-purple-300 shrink-0">
                        {msg.username ? msg.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <strong className="text-white font-semibold">{msg.username || `User #${msg.user_id}`}</strong>
                          <span className="text-[10px] text-gray-500">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="p-3 bg-black/40 rounded-2xl rounded-tl-none border border-gray-800/70 text-gray-200 inline-block max-w-xl text-xs leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef}></div>
              </div>

              {/* Input de Envio de Chat */}
              <form onSubmit={handleSendChatMessage} className="pt-3 border-t border-gray-800 flex gap-2">
                <input
                  type="text"
                  placeholder={
                    selectedGroup.is_member
                      ? 'Escreva sua mensagem no chat do grupo...'
                      : 'Entre no grupo para participar do bate-papo'
                  }
                  disabled={!selectedGroup.is_member}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 focus:border-brand-purple rounded-xl px-4 py-2.5 text-xs text-black placeholder-gray-500 focus:outline-none disabled:opacity-50 transition shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!selectedGroup.is_member || !chatInput.trim()}
                  className="px-5 py-2.5 bg-brand-purple hover:bg-purple-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <i className="fa-solid fa-paper-plane text-xs"></i>
                  Enviar
                </button>
              </form>
            </div>
          )}

          {/* Conteúdo da Aba MEMBROS */}
          {activeTab === 'members' && (
            <div className="bg-brand-card border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-id-badge text-brand-purple"></i>
                Membros da Comunidade ({members.length})
              </h3>

              {loadingMembers ? (
                <div className="py-12 text-center text-gray-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-xl text-brand-purple mr-2"></i>
                  Carregando membros...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 bg-brand-surface rounded-2xl border border-gray-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center font-bold text-sm text-purple-300">
                          U{m.user_id}
                        </div>
                        <div className="min-w-0">
                          <strong className="text-white text-xs block truncate">User #{m.user_id}</strong>
                          <span className="text-[10px] text-gray-500">
                            Desde {new Date(m.joined_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                          m.role === 'owner'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                            : m.role === 'moderator'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-600/50'
                            : 'bg-gray-800 text-gray-300 border-gray-700'
                        }`}
                      >
                        {m.role === 'owner' ? 'Dono' : m.role === 'moderator' ? 'Moderador' : 'Membro'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Criar Novo Grupo */}
      {showCreateGroupModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowCreateGroupModal(false)}
        >
          <div
            className="w-full max-w-lg bg-brand-card border border-gray-700 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <i className="fa-solid fa-users-gear text-brand-purple"></i> Criar Nova Comunidade MIST
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nome do Grupo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Souls Brasil, CS2 Competitivo..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-brand-purple rounded-xl px-3.5 py-2 text-xs text-black placeholder-gray-500 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Sobre o que é esse grupo?"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-brand-purple rounded-xl px-3.5 py-2 text-xs text-black placeholder-gray-500 focus:outline-none shadow-sm"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Categoria</label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-brand-purple rounded-xl px-3.5 py-2 text-xs text-black focus:outline-none shadow-sm"
                >
                  <option value="RPG">RPG & Ação</option>
                  <option value="FPS">FPS & Tático</option>
                  <option value="Indie">Indie & Retro</option>
                  <option value="Desafios">Desafios & Speedruns</option>
                  <option value="Tecnologia">Tecnologia & Hardware</option>
                  <option value="Geral">Geral & Comunidade</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">URL do Avatar (Opcional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newGroupAvatar}
                  onChange={(e) => setNewGroupAvatar(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-brand-purple rounded-xl px-3.5 py-2 text-xs text-black placeholder-gray-500 focus:outline-none shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !newGroupName.trim()}
                  className="px-5 py-2 bg-brand-purple hover:bg-purple-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {creatingGroup ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                  Criar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Tópico no Fórum */}
      {showCreatePostModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowCreatePostModal(false)}
        >
          <div
            className="w-full max-w-lg bg-brand-card border border-gray-700 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <i className="fa-solid fa-pen-nib text-brand-purple"></i> Iniciar Nova Discussão
              </h3>
              <button
                type="button"
                onClick={() => setShowCreatePostModal(false)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Título do Tópico *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dicas para derrotar o primeiro chefe..."
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-brand-purple rounded-xl px-3.5 py-2 text-xs text-black placeholder-gray-500 focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Mensagem / Conteúdo *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Descreva sua dúvida, guia ou opinião detalhadamente..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-brand-purple rounded-xl px-3.5 py-2 text-xs text-black placeholder-gray-500 focus:outline-none shadow-sm"
                ></textarea>
              </div>

              {selectedGroup && (selectedGroup.role === 'owner' || selectedGroup.role === 'moderator') ? (
                <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPostPinned}
                    onChange={(e) => setNewPostPinned(e.target.checked)}
                    className="rounded bg-brand-dark border-gray-800 text-brand-purple focus:ring-0"
                  />
                  <span>Fixar este tópico no topo do fórum (Ação de Moderador)</span>
                </label>
              ) : null}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingPost || !newPostTitle.trim() || !newPostContent.trim()}
                  className="px-5 py-2 bg-brand-purple hover:bg-purple-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {creatingPost ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                  Publicar Tópico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
