import React, { useState, useEffect, useRef, useCallback } from 'react';
import { socialApi, NotificationItem } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface NotificationsDropdownProps {
  onNavigate?: (route: string) => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await socialApi.getNotifications();
      if (res && Array.isArray(res.items)) {
        setNotifications(res.items);
        setUnreadCount(res.unread_count);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // WebSocket para push de notificações em tempo real
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/notifications?user_id=${user.id}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const newNotif: NotificationItem = JSON.parse(event.data);
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Dispara notificação toast na tela
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('mist:toast', {
                detail: `🔔 ${newNotif.title}: ${newNotif.message}`,
              })
            );
          }
        } catch (e) {
          console.error('Erro ao processar mensagem do WebSocket de notificação:', e);
        }
      };

      socket.onerror = (err) => {
        console.warn('WebSocket de notificações desconectado ou indisponível:', err);
      };
    } catch (err) {
      console.warn('Erro ao inicializar WebSocket de notificações:', err);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, user]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await socialApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await socialApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    // 1. Comunicado do Sistema ou Catálogo (ex: Jogos Deixando o Catálogo MIST)
    if (
      notif.payload?.notice ||
      notif.type === 'catalog_leaving' ||
      notif.type === 'system_notice' ||
      notif.type === 'system'
    ) {
      const noticeData = notif.payload?.notice || {
        title: notif.title,
        content: notif.message,
        category: notif.type === 'catalog_leaving' ? 'Catálogo' : 'Comunicado Oficial',
        actionButton: notif.payload?.action_route
          ? { label: 'Ver Detalhes', route: notif.payload.action_route }
          : undefined,
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mist:open-system-notice', { detail: noticeData })
        );
      }
      return;
    }

    // 2. Conquista Desbloqueada
    if (notif.type === 'achievement_unlocked') {
      if (onNavigate) {
        onNavigate('library');
      }
      if (notif.payload?.game_id && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mist:open-library-game', {
            detail: { gameId: Number(notif.payload.game_id) },
          })
        );
      }
      return;
    }

    // 3. Desconto da Wishlist ou Notificação com Game ID específico
    if (notif.type === 'wishlist_discount' || notif.payload?.game_id) {
      if (onNavigate) {
        onNavigate('store');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mist:open-game-detail', {
            detail: {
              gameId: Number(notif.payload?.game_id || 1),
              relevantInfo:
                notif.payload?.relevant_info ||
                `Oferta da sua Lista de Desejos: ${notif.title}. Aproveite por tempo limitado!`,
            },
          })
        );
      }
      return;
    }

    // 4. Operações de Carteira (Depósito / Recarga)
    if (
      notif.type === 'wallet_deposit' ||
      notif.type === 'wallet_recharge' ||
      notif.payload?.action === 'open_wallet'
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mist:open-wallet'));
      }
      return;
    }

    // 5. Oferta de Troca no Mercado
    if (notif.type === 'trade_offer') {
      if (onNavigate) {
        onNavigate('market');
      }
      return;
    }

    // 6. Pedido de Amizade ou Notificação Social
    if (notif.type.startsWith('friend')) {
      if (onNavigate) {
        onNavigate('social');
      }
      return;
    }

    // 7. Rota Genérica no Payload
    if (notif.payload?.action_route && onNavigate) {
      onNavigate(notif.payload.action_route);
    }
  };

  // Helper para metadados, ícone, badge e cor por tipo
  const getNotificationMeta = (type: string) => {
    switch (type) {
      case 'catalog_leaving':
        return {
          icon: 'fa-triangle-exclamation',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          badge: 'Catálogo',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          actionHint: 'Ver comunicado completo',
        };
      case 'system_notice':
      case 'system':
        return {
          icon: 'fa-bullhorn',
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
          badge: 'Sistema',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          actionHint: 'Ver detalhes do aviso',
        };
      case 'friend_request':
      case 'friend_accepted':
        return {
          icon: 'fa-user-group',
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
          badge: 'Comunidade',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          actionHint: 'Ver na Comunidade',
        };
      case 'achievement_unlocked':
        return {
          icon: 'fa-trophy',
          color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
          badge: 'Conquista',
          badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
          actionHint: 'Ver na Biblioteca',
        };
      case 'wishlist_discount':
        return {
          icon: 'fa-tags',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          badge: 'Wishlist',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          actionHint: 'Ver oferta na Loja',
        };
      case 'trade_offer':
        return {
          icon: 'fa-right-left',
          color: 'text-brand-purpleLight bg-brand-purple/10 border-brand-purple/30',
          badge: 'Mercado',
          badgeColor: 'bg-brand-purple/20 text-brand-purpleLight border-brand-purple/40',
          actionHint: 'Ver proposta no Mercado',
        };
      case 'wallet_deposit':
      case 'wallet_recharge':
        return {
          icon: 'fa-wallet',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          badge: 'Carteira',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          actionHint: 'Abrir extrato da Carteira',
        };
      default:
        return {
          icon: 'fa-bell',
          color: 'text-gray-300 bg-gray-700/30 border-gray-600/30',
          badge: 'Aviso',
          badgeColor: 'bg-gray-700/30 text-gray-300 border-gray-600/40',
          actionHint: 'Clique para mais detalhes',
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de Notificação no Header */}
      <button
        type="button"
        data-testid="notifications-button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl bg-brand-surface border border-gray-700 hover:border-brand-purple text-gray-300 hover:text-white transition shadow-sm cursor-pointer flex items-center justify-center w-9 h-9"
        title="Notificações"
        aria-label="Notificações"
      >
        <i className="fa-solid fa-bell text-sm"></i>
        {unreadCount > 0 && (
          <span
            data-testid="notifications-badge"
            className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/50 animate-pulse border-2 border-brand-bg"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Flutuante */}
      {isOpen && (
        <div
          data-testid="notifications-dropdown"
          className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-[#0b0f19]/95 backdrop-blur-xl border border-brand-purple/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Cabeçalho do Dropdown */}
          <div className="p-3.5 px-4 bg-brand-surface/60 border-b border-gray-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <i className="fa-solid fa-bell text-xs text-brand-purpleLight"></i>
                Notificações
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-brand-purple/30 text-brand-purpleLight border border-brand-purple/50 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} novas
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                data-testid="mark-all-read-button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-gray-400 hover:text-brand-purpleLight flex items-center gap-1 transition cursor-pointer"
                title="Marcar todas como lidas"
              >
                <i className="fa-solid fa-check-double text-[10px]"></i>
                Marcar lidas
              </button>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-800/60 custom-scrollbar">
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                <i className="fa-solid fa-spinner fa-spin text-lg text-brand-purple"></i>
                Carregando notificações...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-xs flex flex-col items-center gap-2.5 px-4">
                <div className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-500">
                  <i className="fa-regular fa-bell-slash text-base"></i>
                </div>
                <p className="font-medium text-gray-300">Tudo calmo por aqui!</p>
                <p className="text-[11px] text-gray-500 max-w-[200px]">
                  Novos avisos, conquistas e convites de amigos aparecerão neste painel.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const meta = getNotificationMeta(notif.type);
                return (
                  <div
                    key={notif.id}
                    data-testid={`notification-item-${notif.id}`}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 px-4 transition-all duration-200 cursor-pointer flex items-start gap-3 relative group ${
                      notif.is_read
                        ? 'bg-transparent hover:bg-gray-800/40 text-gray-400'
                        : 'bg-purple-950/20 hover:bg-purple-950/30 text-gray-200'
                    }`}
                  >
                    {/* Indicador de Não-lida */}
                    {!notif.is_read && (
                      <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-brand-purpleLight ring-2 ring-brand-purple/40"></span>
                    )}

                    {/* Ícone Temático */}
                    <div
                      className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border text-xs ${meta.color}`}
                    >
                      <i className={`fa-solid ${meta.icon}`}></i>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.badgeColor}`}
                          >
                            {meta.badge}
                          </span>
                          <h4
                            className={`text-xs font-bold truncate ${
                              notif.is_read ? 'text-gray-300' : 'text-white'
                            }`}
                          >
                            {notif.title}
                          </h4>
                        </div>

                        {!notif.is_read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-white transition px-1 py-0.5 rounded bg-gray-800/80 cursor-pointer"
                            title="Marcar como lida"
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] leading-relaxed line-clamp-2 text-gray-400 group-hover:text-gray-300 transition-colors">
                        {notif.message}
                      </p>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                        <span className="text-brand-purpleLight/80 group-hover:text-brand-purpleLight font-medium flex items-center gap-1">
                          <span>{meta.actionHint}</span>
                          <i className="fa-solid fa-arrow-right text-[8px] group-hover:translate-x-0.5 transition-transform"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
