import React, { useState, useEffect, useRef } from 'react';
import { FriendItem, ChatMessage, socialApi, API_GATEWAY_URL } from '../api/client';

interface ChatWindowProps {
  friend: FriendItem;
  currentUserId?: number;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  friend,
  currentUserId = 1,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sendTypingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const roomId = socialApi.getChatRoomId(currentUserId, friend.friend_user_id);

  // Auto-scroll para a última mensagem
  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isFriendTyping]);

  // Carrega histórico inicial e conecta WebSocket
  useEffect(() => {
    let isMounted = true;

    // 1. Carrega histórico de mensagens da sala
    socialApi
      .getChatHistory(roomId)
      .then((history) => {
        if (isMounted) {
          setMessages(history);
          socialApi.markChatRead(roomId).catch(() => {});
        }
      })
      .catch((err) => console.warn('Erro ao carregar histórico de chat:', err));

    // 2. Conecta ao WebSocket do chat via Gateway
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mist_token') : null;
    const wsBase = API_GATEWAY_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/chat/${roomId}?user_id=${currentUserId}${token ? `&token=${token}` : ''}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message') {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
            socialApi.markChatRead(roomId).catch(() => {});
          } else if (data.type === 'typing') {
            if (data.user_id === friend.friend_user_id) {
              setIsFriendTyping(Boolean(data.is_typing));
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              if (data.is_typing) {
                typingTimeoutRef.current = setTimeout(() => {
                  if (isMounted) setIsFriendTyping(false);
                }, 3000);
              }
            }
          }
        } catch (err) {
          console.error('Falha ao processar mensagem WebSocket do chat:', err);
        }
      };

      ws.onerror = () => {
        if (isMounted) setIsConnected(false);
      };

      ws.onclose = () => {
        if (isMounted) setIsConnected(false);
      };
    } catch (err) {
      console.warn('WebSocket indisponível, operando via histórico REST:', err);
    }

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (sendTypingDebounceRef.current) clearTimeout(sendTypingDebounceRef.current);
    };
  }, [roomId, currentUserId, friend.friend_user_id]);

  // Envio de mensagem
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content) return;

    const payload = {
      type: 'message',
      room_id: roomId,
      sender_id: currentUserId,
      content,
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      // Fallback otimista se WebSocket estiver reconectando
      const tempMsg: ChatMessage = {
        id: Date.now(),
        room_id: roomId,
        sender_id: currentUserId,
        content,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      setMessages((prev) => [...prev, tempMsg]);
    }

    // Avisa que parou de digitar
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: false }));
    }

    setInputText('');
  };

  // Notificação de digitação com debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: true }));

      if (sendTypingDebounceRef.current) clearTimeout(sendTypingDebounceRef.current);
      sendTypingDebounceRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: false }));
        }
      }, 1500);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      data-testid="chat-window"
      className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[520px] bg-brand-card border border-brand-purple/40 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden backdrop-blur-xl animate-fade-in"
    >
      {/* Cabeçalho do Chat */}
      <div className="p-4 bg-brand-surface border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={friend.avatar_url || `https://picsum.photos/seed/user${friend.friend_user_id}/100/100`}
              alt={friend.username || 'Amigo'}
              className="w-10 h-10 rounded-xl object-cover border border-gray-700"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-brand-surface ${
                friend.presence_status === 'playing'
                  ? 'bg-brand-purple animate-pulse'
                  : friend.presence_status === 'online'
                  ? 'bg-emerald-500'
                  : friend.presence_status === 'away'
                  ? 'bg-amber-500'
                  : 'bg-gray-500'
              }`}
            />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm leading-tight">
              {friend.username || `Jogador #${friend.friend_user_id}`}
            </h4>
            <div className="text-xs flex items-center gap-1.5 mt-0.5">
              {friend.presence_status === 'playing' ? (
                <span className="text-brand-purple font-semibold flex items-center gap-1">
                  <i className="fa-solid fa-gamepad text-[10px]"></i>
                  Jogando {friend.current_game || 'um jogo'}
                </span>
              ) : friend.presence_status === 'online' ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : friend.presence_status === 'away' ? (
                <span className="text-amber-400 font-medium">Ausente</span>
              ) : (
                <span className="text-gray-400">Offline</span>
              )}
              {isConnected && (
                <span className="text-[10px] text-gray-500" title="WebSocket Conectado">
                  • ao vivo
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Fechar Chat"
          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-brand-dark/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs text-center px-4">
            <i className="fa-regular fa-comments text-3xl mb-2 text-gray-600"></i>
            <p>Nenhuma mensagem ainda.</p>
            <p className="mt-1 text-gray-400">Envie um "olá" para iniciar a conversa!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-brand-purple to-purple-600 text-white rounded-br-none shadow-md'
                      : 'bg-brand-surface text-gray-200 border border-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <div
                    className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                      isMe ? 'text-purple-200' : 'text-gray-400'
                    }`}
                  >
                    <span>{formatTime(msg.created_at)}</span>
                    {isMe && (
                      <i
                        className={`fa-solid ${
                          msg.is_read ? 'fa-check-double text-cyan-300' : 'fa-check'
                        }`}
                      ></i>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Indicador de Digitação */}
        {isFriendTyping && (
          <div
            data-testid="typing-indicator"
            className="flex items-center gap-2 text-xs text-brand-purple bg-brand-purple/10 border border-brand-purple/20 px-3 py-1.5 rounded-full w-max animate-pulse"
          >
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </span>
            <span className="font-medium text-[11px]">
              {friend.username || 'Amigo'} está digitando...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Caixa de Entrada */}
      <form onSubmit={handleSendMessage} className="p-3 bg-brand-surface border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Escreva uma mensagem..."
          className="flex-1 bg-brand-dark/80 text-white placeholder-gray-500 text-sm px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-brand-purple transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-4 py-2.5 bg-brand-purple hover:bg-brand-purple-hover disabled:opacity-40 disabled:hover:bg-brand-purple text-white rounded-xl transition flex items-center justify-center font-medium shadow-lg"
          aria-label="Enviar Mensagem"
        >
          <i className="fa-solid fa-paper-plane text-sm"></i>
        </button>
      </form>
    </div>
  );
};
