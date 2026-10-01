import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.activity import Activity
from app.models.friend import Friend
from app.models.message import Message
from app.models.notification import Notification
from app.models.group import Group, GroupMember
from app.models.forum import ForumPost, ForumReply
from app.models.group_message import GroupMessage

logger = logging.getLogger(__name__)


def seed_social_data(db: Session):
    now = datetime.now(timezone.utc)

    # 1. Seed de Amizades se não existirem
    existing_friends_count = db.query(Friend).count()
    if existing_friends_count == 0:
        logger.info("Populando dados iniciais de amizade no social-service...")
        friends = [
            Friend(
                requester_id=1,
                addressee_id=2,
                status="accepted",
                created_at=now - timedelta(days=5),
                updated_at=now - timedelta(days=5),
            ),
            Friend(
                requester_id=3,
                addressee_id=1,
                status="accepted",
                created_at=now - timedelta(days=3),
                updated_at=now - timedelta(days=3),
            ),
            Friend(
                requester_id=1,
                addressee_id=4,
                status="accepted",
                created_at=now - timedelta(days=1),
                updated_at=now - timedelta(days=1),
            ),
        ]
        db.add_all(friends)
        db.commit()

    # 2. Seed de Mensagens de Chat se não existirem
    existing_messages_count = db.query(Message).count()
    if existing_messages_count == 0:
        logger.info("Populando histórico inicial de mensagens de chat...")
        sample_messages = [
            Message(
                room_id="direct_1_2",
                sender_id=2,
                content="E aí Gabriel! Bora fechar aquele esquadrão no Helldivers mais tarde?",
                created_at=now - timedelta(hours=2),
                is_read=True,
            ),
            Message(
                room_id="direct_1_2",
                sender_id=1,
                content="Com certeza! Só terminar de baixar a atualização aqui no MIST.",
                created_at=now - timedelta(hours=1, minutes=45),
                is_read=True,
            ),
            Message(
                room_id="direct_1_2",
                sender_id=2,
                content="Fechou, me avisa assim que estiver pronto!",
                created_at=now - timedelta(hours=1, minutes=30),
                is_read=True,
            ),
            Message(
                room_id="direct_1_3",
                sender_id=3,
                content="Parabéns pelas novas conquistas que vi no seu feed!",
                created_at=now - timedelta(minutes=45),
                is_read=False,
            ),
        ]
        db.add_all(sample_messages)
        db.commit()

    # 3. Seed de Atividades do Feed se não existirem
    existing_activities_count = db.query(Activity).count()
    if existing_activities_count == 0:
        logger.info("Populando feed de atividades inicial...")
        activities = [
            Activity(
                user_id=2,
                type="achievement_unlocked",
                payload={
                    "username": "CyberKnight",
                    "game_title": "Helldivers 2",
                    "achievement_name": "Espalhando Democracia",
                    "description": "Elimine 500 inimigos com armas pesadas",
                    "icon_url": "https://picsum.photos/seed/ach1/120/120",
                },
                created_at=now - timedelta(minutes=15),
            ),
            Activity(
                user_id=3,
                type="game_purchased",
                payload={
                    "username": "Valkyrie",
                    "game_title": "Hollow Knight",
                    "price": 46.99,
                    "banner_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop",
                },
                created_at=now - timedelta(hours=1),
            ),
            Activity(
                user_id=1,
                type="achievement_unlocked",
                payload={
                    "username": "GGTorres2001",
                    "game_title": "Space Marine 2",
                    "achievement_name": "Primeira Baixa",
                    "description": "Conclua o prólogo em qualquer dificuldade",
                    "icon_url": "https://picsum.photos/seed/ach2/120/120",
                },
                created_at=now - timedelta(hours=3),
            ),
            Activity(
                user_id=4,
                type="level_up",
                payload={
                    "username": "PixelMage",
                    "old_level": 4,
                    "new_level": 5,
                    "xp": 2500,
                },
                created_at=now - timedelta(hours=6),
            ),
        ]
        db.add_all(activities)
        db.commit()

    # 4. Seed de Notificações Ricas do Sistema, Catálogo e Comunidade
    has_catalog_notice = db.query(Notification).filter(Notification.type == "catalog_leaving").count() > 0
    if not has_catalog_notice:
        logger.info("Populando lote rico de notificações e comunicados do sistema...")
        notifications = []

        # Comunicado Oficial: Jogos deixando o catálogo MIST
        catalog_notice_payload = {
            "notice": {
                "title": "Comunicado Oficial: Rotação e Despedida de Jogos do Catálogo MIST",
                "category": "Catálogo",
                "dateLabel": "Válido até 31 de Outubro de 2026",
                "importantNote": "Atenção: Usuários que já possuem ou adquirirem os jogos antes de 31/10 manterão acesso permanente e vitalício na sua Biblioteca MIST.",
                "content": (
                    "Informamos a toda a comunidade que os contratos sazonais de distribuição para 3 jogos do acervo "
                    "serão encerrados no final deste mês. Para celebrar a trajetória destes títulos no MIST, as desenvolvedoras "
                    "disponibilizaram descontos especiais de despedida de até 75% OFF.\n\n"
                    "Garanta sua cópia definitiva agora mesmo com condições exclusivas antes que saiam da loja oficial!"
                ),
                "affectedGames": [
                    {
                        "id": 3,
                        "title": "Onimusha: Way of the Sword",
                        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/761620/header.jpg",
                        "original_price": 200.0,
                        "discount_price": 50.0,
                        "discount_percentage": 75,
                        "reason": "Término da licença Capcom",
                    },
                    {
                        "id": 9,
                        "title": "Wardogs",
                        "banner_url": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/374320/header.jpg",
                        "original_price": 199.0,
                        "discount_price": 79.6,
                        "discount_percentage": 60,
                        "reason": "Fim do ciclo sazonal indie",
                    },
                    {
                        "id": 6,
                        "title": "Silent Hill: Townfall",
                        "banner_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
                        "original_price": 250.0,
                        "discount_price": 125.0,
                        "discount_percentage": 50,
                        "reason": "Transição de direitos Konami",
                    },
                ],
                "actionButton": {
                    "label": "Explorar Ofertas na Loja",
                    "route": "store",
                },
            }
        }

        # Comunicado de Atualização de Plataforma v2.5
        update_notice_payload = {
            "notice": {
                "title": "Notas da Atualização MIST v2.5 — Plataforma & Notificações",
                "category": "Atualização",
                "dateLabel": "30 de Setembro de 2026",
                "importantNote": "O seu cliente MIST já está atualizado e sincronizado com os servidores oficiais.",
                "content": (
                    "A versão 2.5 traz melhorias de usabilidade para o ecossistema MIST:\n\n"
                    "• Central de Notificações interativa com redirecionamento contextual para jogos, comunicados e mercado;\n"
                    "• Painel de Extrato da Carteira com histórico completo de compras, recargas e transações;\n"
                    "• Descontos dinâmicos e curadoria de títulos por inteligência artificial na Loja;\n"
                    "• Aprimoramentos de desempenho no WebSocket e feed em tempo real da comunidade."
                ),
                "actionButton": {
                    "label": "Acessar Central de Notícias",
                    "route": "news",
                },
            }
        }

        # Popula notificações prioritárias para o Usuário 1 (Maurício / mkritli)
        user_1_notifications = [
            Notification(
                user_id=1,
                type="catalog_leaving",
                title="⚠️ Comunicado: 3 jogos deixarão o catálogo MIST em breve",
                message="Os títulos Onimusha, Wardogs e Silent Hill deixarão a loja em 31/10. Aproveite até 75% OFF de despedida!",
                payload=catalog_notice_payload,
                is_read=False,
                created_at=now - timedelta(minutes=8),
            ),
            Notification(
                user_id=1,
                type="wishlist_discount",
                title="🔥 Item da sua Wishlist em Oferta: Cyberpunk 2077 (-40%)",
                message="Cyberpunk 2077: Phantom Liberty entrou em promoção com 40% OFF por tempo limitado. Confira agora na Loja!",
                payload={
                    "game_id": 12,
                    "game_title": "Cyberpunk 2077: Phantom Liberty",
                    "discount": 40,
                    "relevant_info": "Oferta imperdível da sua Lista de Desejos: Cyberpunk 2077: Phantom Liberty com 40% OFF por tempo limitado!",
                    "action_route": "store",
                },
                is_read=False,
                created_at=now - timedelta(hours=1, minutes=15),
            ),
            Notification(
                user_id=1,
                type="friend_request",
                title="👥 Novo Pedido de Amizade Recebido",
                message="Sarah Connor enviou uma solicitação de amizade para você no MIST. Conecte-se para jogar junto!",
                payload={
                    "user_id": 3,
                    "username": "sarah_connor",
                    "action_route": "social",
                },
                is_read=False,
                created_at=now - timedelta(hours=3, minutes=30),
            ),
            Notification(
                user_id=1,
                type="trade_offer",
                title="🔄 Proposta de Troca no Mercado MIST",
                message="gabriel_t800 enviou uma proposta de troca para o seu item 'Card Lendário MIST'. Clique para avaliar.",
                payload={
                    "trade_id": "tr-9921",
                    "sender_username": "gabriel_t800",
                    "action_route": "market",
                },
                is_read=False,
                created_at=now - timedelta(hours=8),
            ),
            Notification(
                user_id=1,
                type="achievement_unlocked",
                title="🏆 Conquista Desbloqueada: Lenda das Terras Intermédias",
                message="Você conquistou um troféu raro em Elden Ring: Shadow of the Erdtree! Apenas 4.2% dos jogadores possuem.",
                payload={
                    "game_id": 11,
                    "game_title": "Elden Ring: Shadow of the Erdtree",
                    "achievement_id": "ach_elden_01",
                    "action_route": "library",
                },
                is_read=True,
                created_at=now - timedelta(hours=14),
            ),
            Notification(
                user_id=1,
                type="system_notice",
                title="🚀 Notas da Atualização MIST v2.5 — Plataforma & Notificações",
                message="Conheça os novos recursos da v2.5: Notificações ativas, extrato financeiro detalhado e melhorias no catálogo.",
                payload=update_notice_payload,
                is_read=True,
                created_at=now - timedelta(days=1),
            ),
            Notification(
                user_id=1,
                type="wallet_deposit",
                title="💳 Recarga Confirmada na Carteira",
                message="Sua recarga de R$ 300,00 via PIX foi confirmada. Seu saldo atual é R$ 450,00.",
                payload={
                    "amount": 300.0,
                    "new_balance": 450.0,
                    "action": "open_wallet",
                },
                is_read=True,
                created_at=now - timedelta(days=2),
            ),
        ]
        notifications.extend(user_1_notifications)

        # Popula notificações de catálogo e sistema para os demais usuários de teste
        for uid in [2, 3, 4, 5, 6]:
            notifications.append(
                Notification(
                    user_id=uid,
                    type="catalog_leaving",
                    title="⚠️ Comunicado: 3 jogos deixarão o catálogo MIST em breve",
                    message="Os títulos Onimusha, Wardogs e Silent Hill deixarão a loja em 31/10. Aproveite até 75% OFF de despedida!",
                    payload=catalog_notice_payload,
                    is_read=False,
                    created_at=now - timedelta(minutes=10),
                )
            )
            notifications.append(
                Notification(
                    user_id=uid,
                    type="system_notice",
                    title="🚀 Notas da Atualização MIST v2.5 — Plataforma & Notificações",
                    message="Conheça os novos recursos da v2.5: Notificações interativas e novo extrato da carteira.",
                    payload=update_notice_payload,
                    is_read=False,
                    created_at=now - timedelta(days=1),
                )
            )

        db.add_all(notifications)
        db.commit()
        logger.info(f"Sucesso: {len(notifications)} notificações populadas no social-service.")

    # 5. Seed de Grupos, Membros, Tópicos de Fórum e Chat Coletivo
    existing_groups_count = db.query(Group).count()
    if existing_groups_count == 0:
        logger.info("Populando dados iniciais de Grupos, Comunidade e Fórum no social-service...")

        # 1. RPG Brasil & Souls Enthusiasts
        grp1 = Group(
            name="RPG Brasil & Souls Enthusiasts",
            description="Comunidade oficial para debates de builds, lore e co-op em Elden Ring, Baldur's Gate 3 e clássicos Souls.",
            avatar_url="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80",
            header_url="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
            category="RPG",
            is_private=False,
            owner_id=1,
            members_count=4,
            posts_count=2,
            created_at=now - timedelta(days=20),
        )

        # 2. Counter-Strike & Tactical Shooters
        grp2 = Group(
            name="Counter-Strike & Tactical Shooters",
            description="Line-ups de granadas, estratégias de bomb, busca de time para o Premier e análise de patches do CS2.",
            avatar_url="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
            header_url="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80",
            category="FPS",
            is_private=False,
            owner_id=2,
            members_count=4,
            posts_count=2,
            created_at=now - timedelta(days=15),
        )

        # 3. Indie Gems & Retro Collectors
        grp3 = Group(
            name="Indie Gems & Retro Collectors",
            description="Tesouros independentes, metroidvanias e pixel art: Hollow Knight, Celeste, Dead Cells e novidades.",
            avatar_url="https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=400&q=80",
            header_url="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
            category="Indie",
            is_private=False,
            owner_id=3,
            members_count=4,
            posts_count=2,
            created_at=now - timedelta(days=12),
        )

        # 4. Speedrunners MIST
        grp4 = Group(
            name="Speedrunners MIST",
            description="Otimização de rotas, quebra de recordes mundiais, glitch hunts e categorias Any% e 100%.",
            avatar_url="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80",
            header_url="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            category="Desafios",
            is_private=False,
            owner_id=4,
            members_count=3,
            posts_count=1,
            created_at=now - timedelta(days=10),
        )

        # 5. MIST Hardware & Steam Deck Lab
        grp5 = Group(
            name="MIST Hardware & Steam Deck Lab",
            description="Configurações finas de TDP, presets gráficos, emulação e acessórios para portáteis e PCs gamers.",
            avatar_url="https://images.unsplash.com/photo-1612287233207-6e9389e8312e?auto=format&fit=crop&w=400&q=80",
            header_url="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
            category="Tecnologia",
            is_private=False,
            owner_id=6,
            members_count=3,
            posts_count=1,
            created_at=now - timedelta(days=8),
        )

        groups = [grp1, grp2, grp3, grp4, grp5]
        db.add_all(groups)
        db.commit()
        for g in groups:
            db.refresh(g)

        # Membros
        members = [
            # Group 1 (RPG)
            GroupMember(group_id=grp1.id, user_id=1, role="owner", joined_at=now - timedelta(days=20)),
            GroupMember(group_id=grp1.id, user_id=2, role="moderator", joined_at=now - timedelta(days=19)),
            GroupMember(group_id=grp1.id, user_id=3, role="member", joined_at=now - timedelta(days=18)),
            GroupMember(group_id=grp1.id, user_id=5, role="member", joined_at=now - timedelta(days=17)),
            # Group 2 (FPS)
            GroupMember(group_id=grp2.id, user_id=2, role="owner", joined_at=now - timedelta(days=15)),
            GroupMember(group_id=grp2.id, user_id=1, role="member", joined_at=now - timedelta(days=14)),
            GroupMember(group_id=grp2.id, user_id=3, role="member", joined_at=now - timedelta(days=13)),
            GroupMember(group_id=grp2.id, user_id=4, role="moderator", joined_at=now - timedelta(days=12)),
            # Group 3 (Indie)
            GroupMember(group_id=grp3.id, user_id=3, role="owner", joined_at=now - timedelta(days=12)),
            GroupMember(group_id=grp3.id, user_id=1, role="member", joined_at=now - timedelta(days=11)),
            GroupMember(group_id=grp3.id, user_id=2, role="member", joined_at=now - timedelta(days=10)),
            GroupMember(group_id=grp3.id, user_id=6, role="moderator", joined_at=now - timedelta(days=9)),
            # Group 4 (Speedrunners)
            GroupMember(group_id=grp4.id, user_id=4, role="owner", joined_at=now - timedelta(days=10)),
            GroupMember(group_id=grp4.id, user_id=1, role="member", joined_at=now - timedelta(days=9)),
            GroupMember(group_id=grp4.id, user_id=2, role="member", joined_at=now - timedelta(days=8)),
            # Group 5 (Hardware)
            GroupMember(group_id=grp5.id, user_id=6, role="owner", joined_at=now - timedelta(days=8)),
            GroupMember(group_id=grp5.id, user_id=1, role="member", joined_at=now - timedelta(days=7)),
            GroupMember(group_id=grp5.id, user_id=5, role="member", joined_at=now - timedelta(days=6)),
        ]
        db.add_all(members)
        db.commit()

        # Posts de Fórum
        post1_1 = ForumPost(
            group_id=grp1.id,
            author_id=1,
            title="📌 [OFICIAL] Regras da Comunidade & Guia de Builds para Iniciantes",
            content="Bem-vindos à comunidade Souls! Evitem spoilers sem aviso prévio. Para quem está começando em Elden Ring: priorize 40 de Vigor antes de investir pesado em atributos de escala!",
            is_pinned=True,
            is_locked=False,
            views_count=342,
            replies_count=3,
            created_at=now - timedelta(days=19),
            updated_at=now - timedelta(hours=2),
        )
        post1_2 = ForumPost(
            group_id=grp1.id,
            author_id=2,
            title="⚔️ Qual a melhor build de Força para Elden Ring no patch atual?",
            content="Estou testando a Greatsword colossal com cinza 'Lion's Claw' contra duas Maças de Ferro com pulo. O que vocês acham que atordoa chefes mais rápido?",
            is_pinned=False,
            is_locked=False,
            views_count=189,
            replies_count=2,
            created_at=now - timedelta(days=3),
            updated_at=now - timedelta(hours=5),
        )

        post2_1 = ForumPost(
            group_id=grp2.id,
            author_id=2,
            title="📌 [GUIA] Line-ups Essenciais de Smokes no CS2 (Mirage & Inferno)",
            content="Guia rápido com screenshots e pontos de mira para as smokes de Passagem, Janela e Caverna na Mirage. O novo sistema sem bind de jumpthrow facilitou a consistência!",
            is_pinned=True,
            is_locked=False,
            views_count=520,
            replies_count=2,
            created_at=now - timedelta(days=14),
            updated_at=now - timedelta(hours=1),
        )
        post2_2 = ForumPost(
            group_id=grp2.id,
            author_id=3,
            title="🎯 Procurando duo/trio para Premier (Rating 12k - 15k)",
            content="Jogo de suporte/âncora no bombsite B. Jogo todos os dias após as 20h. Deixe seu contato ou me adicione no MIST!",
            is_pinned=False,
            is_locked=False,
            views_count=98,
            replies_count=1,
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(minutes=40),
        )

        post3_1 = ForumPost(
            group_id=grp3.id,
            author_id=3,
            title="📌 Recomendações Imperdíveis de Jogos Indie para a Promoção MIST",
            content="Lista da moderação: 1. Hollow Knight (metroidvania perfeito), 2. Celeste (plataforma preciso), 3. Dead Cells (combate frenético). Qual indie marcou vocês este ano?",
            is_pinned=True,
            is_locked=False,
            views_count=415,
            replies_count=2,
            created_at=now - timedelta(days=11),
            updated_at=now - timedelta(hours=6),
        )
        post3_2 = ForumPost(
            group_id=grp3.id,
            author_id=1,
            title="🏆 Dicas para alcançar 112% de conclusão em Hollow Knight",
            content="Faltam apenas o Panteão do Cavaleiro e o Panteão de Hallownest. Quais amuletos vocês recomendam para a combinação de sobrevivência e dano de ferrão?",
            is_pinned=False,
            is_locked=False,
            views_count=156,
            replies_count=1,
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(hours=3),
        )

        post4_1 = ForumPost(
            group_id=grp4.id,
            author_id=4,
            title="⏱️ Novo recorde mundial na rota Any% sem skips de textura",
            content="Conseguimos baixar o tempo para 28m42s utilizando o novo ciclo de pulos no ato 3. Vídeo e tempos de split disponíveis no canal do grupo!",
            is_pinned=True,
            is_locked=False,
            views_count=210,
            replies_count=0,
            created_at=now - timedelta(days=9),
            updated_at=now - timedelta(days=9),
        )

        post5_1 = ForumPost(
            group_id=grp5.id,
            author_id=6,
            title="⚙️ Preset Ideal para Cyberpunk 2077 a 40 FPS estáveis no Steam Deck",
            content="Testamos TDP em 12W, FSR em Equilibrado e resolução nativa 800p. A bateria dura cerca de 2h15m com frametime extremamente plano!",
            is_pinned=True,
            is_locked=False,
            views_count=380,
            replies_count=0,
            created_at=now - timedelta(days=7),
            updated_at=now - timedelta(days=7),
        )

        posts = [post1_1, post1_2, post2_1, post2_2, post3_1, post3_2, post4_1, post5_1]
        db.add_all(posts)
        db.commit()
        for p in posts:
            db.refresh(p)

        # Respostas aos Tópicos (Replies)
        replies = [
            # Respostas ao Post 1_1
            ForumReply(
                post_id=post1_1.id,
                author_id=5,
                content="Excelente dica sobre o Vigor. Muitos iniciantes colocam tudo em Força e morrem com um golpe em Margit.",
                created_at=now - timedelta(days=18),
            ),
            ForumReply(
                post_id=post1_1.id,
                author_id=3,
                content="Qual cinza de guerra vocês acham mais versátil para katana nos primeiros mapas?",
                created_at=now - timedelta(days=17),
            ),
            ForumReply(
                post_id=post1_1.id,
                author_id=2,
                content="A habilidade 'Unsheathe' (Desembainhar) padrão da Uchigatana dá um dano de postura absurdo com o ataque pesado!",
                created_at=now - timedelta(hours=2),
            ),
            # Respostas ao Post 1_2
            ForumReply(
                post_id=post1_2.id,
                author_id=5,
                content="A Greatsword com 'Lion's Claw' te concede hiperarmadura durante toda a animação. Muito mais seguro que maças duplas.",
                created_at=now - timedelta(days=2),
            ),
            ForumReply(
                post_id=post1_2.id,
                author_id=1,
                content="Concordo com o Geralt! Se usar o Talismã de Lâmina de Garra e Talismã de Touro, a Greatsword limpa qualquer Masmorra.",
                created_at=now - timedelta(hours=5),
            ),
            # Respostas ao Post 2_1
            ForumReply(
                post_id=post2_1.id,
                author_id=4,
                content="A smoke da Janela da base TR ficou 100% consistente agora. Obrigado pelo tutorial!",
                created_at=now - timedelta(days=10),
            ),
            ForumReply(
                post_id=post2_1.id,
                author_id=1,
                content="Testei no servidor privado e funcionou de primeira. Bora treinar a execução no Bomb B depois.",
                created_at=now - timedelta(hours=1),
            ),
            # Respostas ao Post 2_2
            ForumReply(
                post_id=post2_2.id,
                author_id=1,
                content="Opa Sarah, jogo de entry/rifler. Vou te mandar convite pra gente fechar lobby hoje!",
                created_at=now - timedelta(minutes=40),
            ),
            # Respostas ao Post 3_1
            ForumReply(
                post_id=post3_1.id,
                author_id=6,
                content="Hollow Knight é uma verdadeira obra-prima. A trilha sonora e o design de mapa são impecáveis.",
                created_at=now - timedelta(days=9),
            ),
            ForumReply(
                post_id=post3_1.id,
                author_id=1,
                content="Dead Cells tem o combate 2D mais fluido que já experimentei. Vale cada centavo!",
                created_at=now - timedelta(hours=6),
            ),
            # Respostas ao Post 3_2
            ForumReply(
                post_id=post3_2.id,
                author_id=3,
                content="Treine na Sala dos Deuses antes de encarar o Panteão completo! Força Inquebrável + Pedra do Xamã + Rapidez de Ferrão é a melhor combinação.",
                created_at=now - timedelta(hours=3),
            ),
        ]
        db.add_all(replies)
        db.commit()

        # Mensagens de Chat Coletivo nos Grupos
        chat_msgs = [
            GroupMessage(
                group_id=grp1.id,
                user_id=1,
                username="mauricio_live",
                content="Fala pessoal do RPG! Quem aí já começou a DLC Shadow of the Erdtree?",
                created_at=now - timedelta(hours=3),
            ),
            GroupMessage(
                group_id=grp1.id,
                user_id=2,
                username="gabriel_t800",
                content="Comecei ontem! Aqueles fornos gigantes dão um susto da primeira vez.",
                created_at=now - timedelta(hours=2, minutes=40),
            ),
            GroupMessage(
                group_id=grp1.id,
                user_id=5,
                username="geralt_rivia",
                content="Lembrem-se de coletar os Fragmentos de Umbrárvore. A escala do DLC depende 100% deles.",
                created_at=now - timedelta(hours=1, minutes=15),
            ),
            GroupMessage(
                group_id=grp2.id,
                user_id=2,
                username="gabriel_t800",
                content="Servidor da comunidade aberto para quem quiser treinar mira e reflexo!",
                created_at=now - timedelta(hours=4),
            ),
            GroupMessage(
                group_id=grp2.id,
                user_id=4,
                username="john_doe",
                content="Entrando agora! Bora jogar uns 3 mapas.",
                created_at=now - timedelta(hours=3, minutes=30),
            ),
        ]
        db.add_all(chat_msgs)
        db.commit()
        logger.info(f"Sucesso: {len(groups)} grupos, {len(posts)} posts de fórum e {len(chat_msgs)} mensagens populadas!")

