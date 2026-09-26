import React, { useState, useEffect } from 'react';
import { FriendItem, ActivityItem, socialApi, API_GATEWAY_URL } from '../api/client';
import { ChatWindow } from '../components/ChatWindow';

export const Social: React.FC = () => {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatFriend, setActiveChatFriend] = useState<FriendItem | null>(null);

  // Modal / Input para adicionar amigo
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendId, setAddFriendId] = useState('');
  const [addFriendStatus, setAddFriendStatus] = useState<string | null>(null);

  // Carrega lista de amigos e feed
  const loadSocialData = async () => {
    try {
      const [friendsData, feedData] = await Promise.all([
        socialApi.getFriends().catch(() => []),
        socialApi.getFeed().catch(() => []),
      ]);
      setFriends(friendsData);
      setFeed(feedData);
    } catch (err) {
      console.warn('Erro ao carregar dados sociais:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSocialData();
  }, []);

  // WebSocket de Presença em tempo real (F-04, F-08)
  useEffect(() => {
    const wsBase = API_GATEWAY_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/presence?user_id=1`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence_update') {
            setFriends((prev) =>
              prev.map((f) => {
                if (f.friend_user_id === data.user_id) {
                  return {
                    ...f,
                    presence_status: data.status,
                    current_game: data.game_title,
                    current_game_id: data.game_id,
                  };
                }
                return f;
              })
            );
          } else if (data.type === 'presence_snapshot' && Array.isArray(data.users)) {
            const presenceMap = new Map<number, any>(data.users.map((u: any) => [u.user_id, u]));
            setFriends((prev) =>
              prev.map((f) => {
                const live = presenceMap.get(f.friend_user_id);
                if (live) {
                  return {
                    ...f,
                    presence_status: live.status,
                    current_game: live.game_title,
                    current_game_id: live.game_id,
                  };
                }
                return f;
              })
            );
          }
        } catch (err) {
          console.error('Erro ao processar evento de presença:', err);
        }
      };
    } catch (err) {
      console.warn('WebSocket de presença indisponível:', err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = parseInt(addFriendId.trim(), 10);
    if (isNaN(targetId)) return;

    try {
      await socialApi.sendFriendRequest(targetId);
      setAddFriendStatus('Solicitação enviada com sucesso!');
      setAddFriendId('');
      setTimeout(() => {
        setAddFriendStatus(null);
        setShowAddFriend(false);
      }, 2000);
      loadSocialData();
    } catch (err: any) {
      setAddFriendStatus(err.message || 'Erro ao enviar solicitação.');
    }
  };

  // Separação de amigos por status de presença
  const playingFriends = friends.filter((f) => f.presence_status === 'playing');
  const onlineFriends = friends.filter((f) => f.presence_status === 'online');
  const awayFriends = friends.filter((f) => f.presence_status === 'away');
  const offlineFriends = friends.filter(
    (f) => !f.presence_status || f.presence_status === 'offline'
  );

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Agora mesmo';
      if (diffMin < 60) return `Há ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Há ${diffHours} h`;
      return new Date(isoString).toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  };

  return (
    <main className="p-8 pb-24 max-w-[1600px] mx-auto text-white">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-black flex items-center gap-3">
            <span className="bg-gradient-to-r from-brand-purple to-purple-400 bg-clip-text text-transparent">
              Comunidade MIST
            </span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Amigos, feed de atividades em tempo real e chat direto.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddFriend(!showAddFriend)}
            className="px-4 py-2 bg-brand-surface hover:bg-gray-800 border border-gray-700 hover:border-brand-purple text-sm font-semibold rounded-xl transition flex items-center gap-2"
          >
            <i className="fa-solid fa-user-plus text-brand-purple"></i>
            Adicionar Amigo
          </button>
        </div>
      </div>

      {/* Modal / Card para Adicionar Amigo */}
      {showAddFriend && (
        <div className="mb-8 p-6 bg-brand-card border border-brand-purple/40 rounded-2xl animate-fade-in shadow-xl max-w-lg">
          <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
            <i className="fa-solid fa-user-plus text-brand-purple"></i> Convidar Novo Amigo
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Digite o ID numérico do usuário para enviar uma solicitação de amizade:
          </p>
          <form onSubmit={handleSendFriendRequest} className="flex gap-2">
            <input
              type="number"
              placeholder="Ex: 2, 3 ou 4"
              value={addFriendId}
              onChange={(e) => setAddFriendId(e.target.value)}
              className="flex-1 bg-brand-dark px-3.5 py-2 rounded-xl border border-gray-700 text-sm text-white focus:outline-none focus:border-brand-purple"
            />
            <button
              type="submit"
              disabled={!addFriendId.trim()}
              className="px-4 py-2 bg-brand-purple hover:bg-brand-purple-hover disabled:opacity-40 text-white rounded-xl text-sm font-medium transition"
            >
              Enviar
            </button>
          </form>
          {addFriendStatus && (
            <p className="text-xs mt-3 text-cyan-400 font-medium">{addFriendStatus}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna 1 & 2: Feed de Atividades (F-06) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-card p-6 rounded-2xl border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-rss text-brand-purple"></i> Feed de Atividades
              </h3>
              <button
                onClick={loadSocialData}
                aria-label="Atualizar Feed"
                className="text-gray-400 hover:text-white text-xs flex items-center gap-1 transition"
              >
                <i className="fa-solid fa-rotate-right"></i> Atualizar
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-brand-surface rounded-xl border border-gray-800 animate-pulse flex gap-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-xl"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : feed.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-brand-surface rounded-xl border border-gray-800">
                <i className="fa-regular fa-newspaper text-3xl mb-2 text-gray-600"></i>
                <p className="text-sm">Nenhuma atividade registrada ainda.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Desbloqueie conquistas ou compre jogos para movimentar seu feed!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {feed.map((act) => {
                  const isAchievement = act.type === 'achievement_unlocked';
                  const isPurchase = act.type === 'game_purchased';
                  const isLevelUp = act.type === 'level_up';

                  return (
                    <div
                      key={act.id}
                      data-testid={`activity-card-${act.id}`}
                      className="p-4 bg-brand-surface rounded-xl border border-gray-800 hover:border-gray-700 transition flex items-start gap-4"
                    >
                      {/* Ícone de Destaque */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${
                          isAchievement
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : isPurchase
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : isLevelUp
                            ? 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple'
                            : 'bg-gray-800 border-gray-700 text-gray-300'
                        }`}
                      >
                        {isAchievement ? (
                          <i className="fa-solid fa-trophy"></i>
                        ) : isPurchase ? (
                          <i className="fa-solid fa-bag-shopping"></i>
                        ) : isLevelUp ? (
                          <i className="fa-solid fa-star"></i>
                        ) : (
                          <i className="fa-solid fa-bell"></i>
                        )}
                      </div>

                      {/* Conteúdo da Atividade */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">
                            <span className="text-brand-purple font-bold">
                              {act.payload.username || `Jogador #${act.user_id}`}
                            </span>{' '}
                            {isAchievement ? (
                              <span>
                                desbloqueou a conquista{' '}
                                <span className="text-amber-300 font-bold">
                                  {act.payload.name || act.payload.achievement_name || 'Conquista'}
                                </span>{' '}
                                em{' '}
                                <span className="text-white font-semibold">
                                  {act.payload.game_title || `Jogo #${act.payload.game_id || ''}`}
                                </span>
                              </span>
                            ) : isPurchase ? (
                              <span>
                                comprou{' '}
                                <span className="text-emerald-400 font-bold">
                                  {act.payload.game_title || `Jogo #${act.payload.game_id || ''}`}
                                </span>
                              </span>
                            ) : isLevelUp ? (
                              <span>
                                subiu para o{' '}
                                <span className="text-brand-purple font-bold">
                                  Nível {act.payload.new_level || 5}
                                </span>
                                !
                              </span>
                            ) : (
                              <span>interagiu na comunidade MIST</span>
                            )}
                          </p>
                          <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                            {formatRelativeTime(act.created_at)}
                          </span>
                        </div>

                        {/* Detalhes extras se existirem */}
                        {act.payload.description && (
                          <p className="text-xs text-gray-400 mt-1 italic">
                            "{act.payload.description}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Lista de Amigos com Presença ao Vivo (F-04, F-08) */}
        <div>
          <div className="bg-brand-card p-6 rounded-2xl border border-gray-800 sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-user-group text-emerald-400"></i> Amigos (
                {friends.length})
              </h3>
              <span className="text-xs text-gray-400">
                {playingFriends.length + onlineFriends.length} online
              </span>
            </div>

            {friends.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs bg-brand-surface rounded-xl border border-gray-800">
                <p>Nenhum amigo adicionado.</p>
                <button
                  onClick={() => setShowAddFriend(true)}
                  className="mt-2 text-brand-purple hover:underline font-semibold"
                >
                  Convidar amigos agora
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Jogando Agora */}
                {playingFriends.length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-bold text-brand-purple uppercase tracking-wider mb-2">
                      Jogando Agora ({playingFriends.length})
                    </h5>
                    <ul className="space-y-2">
                      {playingFriends.map((friend) => (
                        <li
                          key={friend.friendship_id}
                          onClick={() => setActiveChatFriend(friend)}
                          data-testid={`friend-item-${friend.friend_user_id}`}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-brand-surface/60 hover:bg-gray-800/80 border border-brand-purple/30 hover:border-brand-purple transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={
                                  friend.avatar_url ||
                                  `https://picsum.photos/seed/user${friend.friend_user_id}/100/100`
                                }
                                alt={friend.username || 'Amigo'}
                                className="w-9 h-9 rounded-lg object-cover"
                              />
                              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-brand-purple border-2 border-brand-card animate-pulse"></span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-white group-hover:text-brand-purple transition">
                                {friend.username || `Jogador #${friend.friend_user_id}`}
                              </p>
                              <p className="text-xs text-brand-purple font-medium flex items-center gap-1">
                                <i className="fa-solid fa-gamepad text-[10px]"></i>
                                {friend.current_game || 'Em jogo'}
                              </p>
                            </div>
                          </div>
                          <i className="fa-solid fa-comment text-gray-500 group-hover:text-brand-purple text-xs transition"></i>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 2. Online */}
                {onlineFriends.length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      Online ({onlineFriends.length})
                    </h5>
                    <ul className="space-y-2">
                      {onlineFriends.map((friend) => (
                        <li
                          key={friend.friendship_id}
                          onClick={() => setActiveChatFriend(friend)}
                          data-testid={`friend-item-${friend.friend_user_id}`}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-800/60 transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={
                                  friend.avatar_url ||
                                  `https://picsum.photos/seed/user${friend.friend_user_id}/100/100`
                                }
                                alt={friend.username || 'Amigo'}
                                className="w-8 h-8 rounded-lg object-cover"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-brand-card"></span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-white group-hover:text-emerald-400 transition">
                                {friend.username || `Jogador #${friend.friend_user_id}`}
                              </p>
                              <p className="text-xs text-gray-400">Online</p>
                            </div>
                          </div>
                          <i className="fa-solid fa-comment text-gray-500 group-hover:text-emerald-400 text-xs transition"></i>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3. Ausente */}
                {awayFriends.length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                      Ausente ({awayFriends.length})
                    </h5>
                    <ul className="space-y-2">
                      {awayFriends.map((friend) => (
                        <li
                          key={friend.friendship_id}
                          onClick={() => setActiveChatFriend(friend)}
                          data-testid={`friend-item-${friend.friend_user_id}`}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-800/60 transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={
                                  friend.avatar_url ||
                                  `https://picsum.photos/seed/user${friend.friend_user_id}/100/100`
                                }
                                alt={friend.username || 'Amigo'}
                                className="w-8 h-8 rounded-lg object-cover"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-brand-card"></span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-white group-hover:text-amber-400 transition">
                                {friend.username || `Jogador #${friend.friend_user_id}`}
                              </p>
                              <p className="text-xs text-gray-400">Ausente</p>
                            </div>
                          </div>
                          <i className="fa-solid fa-comment text-gray-500 group-hover:text-amber-400 text-xs transition"></i>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. Offline */}
                {offlineFriends.length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Offline ({offlineFriends.length})
                    </h5>
                    <ul className="space-y-2 opacity-70">
                      {offlineFriends.map((friend) => (
                        <li
                          key={friend.friendship_id}
                          onClick={() => setActiveChatFriend(friend)}
                          data-testid={`friend-item-${friend.friend_user_id}`}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-800/40 transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={
                                  friend.avatar_url ||
                                  `https://picsum.photos/seed/user${friend.friend_user_id}/100/100`
                                }
                                alt={friend.username || 'Amigo'}
                                className="w-8 h-8 rounded-lg object-cover grayscale"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-500 border border-brand-card"></span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-300">
                                {friend.username || `Jogador #${friend.friend_user_id}`}
                              </p>
                              <p className="text-[11px] text-gray-500">Offline</p>
                            </div>
                          </div>
                          <i className="fa-solid fa-comment text-gray-600 group-hover:text-gray-400 text-xs transition"></i>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Janela de Chat Ativa (F-07) */}
      {activeChatFriend && (
        <ChatWindow
          friend={activeChatFriend}
          currentUserId={1}
          onClose={() => setActiveChatFriend(null)}
        />
      )}
    </main>
  );
};
