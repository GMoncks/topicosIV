# MIST — Cronograma e Planejamento de Desenvolvimento (Multi-Dev)

> **Documento atualizado em:** 2026-09-26  
> **Status de Progresso Atual:** Blocos A, B, C, D, E, F e tickets G-01 a G-06 **CONCLUÍDOS**.  
> **Prazo total restante:** Dias 3 a 15 (13 dias de execução)  
> **Formato de Trabalho:** 3 Trilhas de Desenvolvimento Paralelas (3 Desenvolvedores) com isolamento arquitetural para minimizar conflitos de merge.

---

## 1. Contexto e Estratégia de Não-Sobreposição (Anti-Conflict)

Para evitar conflitos de commit e gargalos em pull requests durante o trabalho concorrente dos 3 desenvolvedores, o escopo foi dividido estritamente por **domínios de responsabilidade, arquivos e microsserviços**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DIVISÃO DE RESPONSABILIDADES                                │
├───────────────────────────────┬───────────────────────────────┬─────────────────────────────┤
│      TRILHA 1 (DEV 1)         │       TRILHA 2 (DEV 2)        │      TRILHA 3 (DEV 3)       │
│  Economia, Mercado & Carteira │ Usuário, Gamificação & Cards  │  Social, UGC & Notificações │
├───────────────────────────────┼───────────────────────────────┼─────────────────────────────┤
│ • services/market-service/    │ • services/auth-service/      │ • services/social-service/  │
│   (Novo serviço independente) │   (Perfil, Inventário, XP)    │   (Grupos, Fórum, Chat)     │
│ • store-service (apenas       │ • library-service (apenas     │ • services/ugc-service/     │
│   módulo isolado de reviews)  │   módulo drops de cartas)     │   (Screenshots e Workshop)  │
│ • Páginas/Componentes:        │ • Páginas/Componentes:        │ • gateway/ (Busca e rotas)  │
│   - Market.tsx                │   - Inventory.tsx             │ • Páginas/Componentes:      │
│   - ReviewModal.tsx           │   - BadgesSection.tsx         │   - Groups.tsx              │
│   - TradeOfferModal.tsx       │   - PrivacyModal.tsx          │   - Workshop.tsx            │
│   - WalletHistoryModal.tsx    │   - Pontos/Cosméticos Profile │   - NotificationsDropdown   │
│                               │                               │   - GlobalSearchDropdown    │
└───────────────────────────────┴───────────────────────────────┴─────────────────────────────┘
```

### Regras de Governança de Branches
1. **Branch Principal de Integração:** `dev`.
2. **Nomenclatura de Feature Branches:**
   - Dev 1: `feature/dev1-reviews-wallet`, `feature/dev1-market-service`, `feature/dev1-trade-offers`
   - Dev 2: `feature/dev2-inventory-points`, `feature/dev2-trading-cards-xp`, `feature/dev2-public-profile`
   - Dev 3: `feature/dev3-notifications-ai`, `feature/dev3-groups-forum`, `feature/dev3-ugc-workshop`
3. **Isolamento de Banco de Dados:** Cada trilha altera exclusivamente suas próprias tabelas ou seu próprio banco SQLite (`market.db`, `auth.db`, `social.db`, `ugc.db`), garantindo zero colisões de migrations ou seeds.
4. **Isolamento de Rotas no Gateway:** O Dev 3 atua como mantenedor do Gateway para registro de rotas agregadoras, recebendo endpoints declarados e estáveis das outras duas trilhas.

---

## 2. Status Geral dos Blocos de Funcionalidade

| Bloco | Nome | Responsável | Status Atual |
|:-----:|:-----|:-----------:|:------------:|
| **A** | Infraestrutura e API Gateway | Equipe | **CONCLUÍDO** |
| **B** | Autenticação e Perfil Base | Equipe | **CONCLUÍDO** |
| **C** | Loja, Catálogo e Checkout | Equipe | **CONCLUÍDO** |
| **D** | Biblioteca e Licenças | Equipe | **CONCLUÍDO** |
| **E** | Download Real e Mini SDK Python | Equipe | **CONCLUÍDO** |
| **F** | Social: Amigos, Feed e Chat WebSocket | Equipe | **CONCLUÍDO** |
| **G** | Agentes de IA Base (G-01 a G-06) | Equipe | **CONCLUÍDO** |
| **H** | Reviews de Jogos | **DEV 1** | A Fazer |
| **I** | Loja de Pontos e Cosméticos | **DEV 2** | A Fazer |
| **J** | Inventário Completo de Itens | **DEV 2** | A Fazer |
| **K** | Trading Cards, Badges e XP | **DEV 2** | A Fazer |
| **L** | Mercado da Comunidade e Trades | **DEV 1** | A Fazer |
| **M** | Grupos, Fórum e Chat de Grupo | **DEV 3** | A Fazer |
| **N** | Showcase de Capturas de Tela | **DEV 3** | A Fazer |
| **O** | Workshop de Conteúdo (Mods e Skins) | **DEV 3** | A Fazer |
| **P** | Perfil Público Visitável e Privacidade | **DEV 2** | A Fazer |
| **Q** | Sistema de Notificações Global | **DEV 3** | A Fazer |
| **R** | Busca Global | **DEV 3** | A Fazer |
| **S** | AI Curator Avançado (S-01 a S-04) | **DEV 3** | A Fazer |
| **T** | Histórico de Transações da Carteira | **DEV 1** | A Fazer |

---

## 3. Divisão Detalhada das Trilhas de Desenvolvimento

---

### TRILHA 1 — DEV 1: Economia, Mercado e Avaliações

> **Foco de Código:** `services/market-service/` (novo), módulo de reviews no `services/store-service/`, páginas e modais de compra/venda/troca.  
> **Volume de Tickets:** 20 tickets (Blocos H, T, L).

#### Bloco H — Reviews de Jogos (`store` `reviews`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| H-01 | `[B]` | `store-service/app/models/review.py` | Implementar modelo `Review`: `user_id`, `game_id`, `is_recommended`, `text`, `playtime_at_review`, `created_at`. |
| H-02 | `[B]` | `store-service/app/api/reviews.py` | Endpoints `POST /games/{id}/reviews` (valida posse na biblioteca) e `GET /games/{id}/reviews`. |
| H-03 | `[B]` | `store-service/app/services/review_service.py` | Cálculo automático de aprovação percentual (ex: "Muito Positivo - 92%") injetado no `GET /games/{id}`. |
| H-04 | `[F]` | `frontend/src/components/ReviewFormModal.tsx` | Componente de formulário com recomendação (Sim/Não), texto e badge de horas jogadas. |
| H-05 | `[F]` | `frontend/src/components/ReviewsList.tsx` | Lista de avaliações da comunidade com filtros de mais úteis e recentes dentro de `GameDetailModal.tsx`. |

#### Bloco T — Histórico de Transações da Carteira (`market` `wallet`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| T-01 | `[B]` | `market-service/app/models/transaction.py` | Modelo `WalletTransaction`: `user_id`, `type` (compra, venda, recarga, resgate), `amount`, `description`. |
| T-02 | `[B]` | `market-service/app/services/wallet_ledger.py` | Serviço de registro contábil de transações (acionado em compras de jogos, mercado e resgates). |
| T-03 | `[B]` | `market-service/app/api/wallet.py` | Endpoint `GET /wallet/history` com paginação e filtro por período/tipo. |
| T-04 | `[F]` | `frontend/src/components/WalletHistoryModal.tsx` | Modal/aba de extrato detalhado da carteira do usuário no Perfil/Header. |

#### Bloco L — Mercado da Comunidade e Trade Offers (`market`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| L-01 | `[B]` | `services/market-service/` | Estruturar novo microsserviço com FastAPI, Dockerfile e SQLite dedicado `market.db`. |
| L-02 | `[B]` | `market-service/app/models/listing.py` | Modelo `MarketListing`: `seller_id`, `item_id`, `item_type`, `price`, `status` (ativo, vendido, cancelado). |
| L-03 | `[B]` | `market-service/app/api/listings.py` | Endpoint `POST /market/list` (valida se o item está disponível no inventário e bloqueia uso). |
| L-04 | `[B]` | `market-service/app/api/listings.py` | Endpoint `GET /market/listings` com filtros por tipo, jogo e ordenação por menor preço. |
| L-05 | `[B]` | `market-service/app/services/checkout.py` | Endpoint `POST /market/buy/{listing_id}` com transferência atômica de saldo e custódia do item. |
| L-06 | `[B]` | `market-service/app/models/trade.py` | Modelo `TradeOffer`: `sender_id`, `receiver_id`, `offered_items[]`, `requested_items[]`, `status`. |
| L-07 | `[B]` | `market-service/app/api/trades.py` | Endpoints `POST /trades/offer`, `POST /trades/{id}/accept`, `POST /trades/{id}/decline`. |
| L-08 | `[B]` | `market-service/app/api/trades.py` | Histórico e listagem de ofertas pendentes recebidas e enviadas. |
| L-09 | `[F]` | `frontend/src/pages/Market.tsx` | Página completa do Mercado da Comunidade: catálogo de anúncios, busca, filtros e compra. |
| L-10 | `[F]` | `frontend/src/components/TradeOfferModal.tsx` | Modal interativa de troca: seleção de itens do inventário próprio vs seleção de itens do inventário do amigo. |
| L-11 | `[F]` | `frontend/src/pages/Market.tsx` | Aba "Meus Anúncios" com opções de gerenciar e cancelar ofertas ativas. |

---

### TRILHA 2 — DEV 2: Usuário, Gamificação, Cards e Inventário

> **Foco de Código:** `services/auth-service/` (usuário, inventário, pontos, XP, privacidade), módulo de drops no `services/library-service/`, páginas `Inventory.tsx` e customizações de `Profile.tsx`.  
> **Volume de Tickets:** 23 tickets (Blocos I, J, K, P).

#### Bloco I — Loja de Pontos e Cosméticos (`points`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| I-01 | `[B]` | `auth-service/app/services/points.py` | Crédito de 100 Pontos MIST por R$ 1,00 gasto no checkout de jogos ou mercado. |
| I-02 | `[B]` | `auth-service/app/models/inventory.py` | Modelo `InventoryItem`: `id`, `user_id`, `item_type`, `name`, `asset_url`, `is_equipped`. |
| I-03 | `[B]` | `auth-service/app/api/points_shop.py` | Endpoint `POST /points-shop/purchase` com validação de saldo e criação do item cosmético. |
| I-04 | `[B]` | `auth-service/app/api/profile.py` | Endpoint `POST /profile/equip` para definir moldura de avatar e fundo de perfil ativos. |
| I-05 | `[F]` | `frontend/src/pages/PointsShop.tsx` | Conexão do fluxo da Loja de Pontos à API real, atualizando cosméticos do usuário. |

#### Bloco J — Inventário Completo de Itens (`inventory`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| J-01 | `[B]` | `auth-service/app/models/inventory.py` | Suporte a tipos de itens: `card`, `emoticon`, `background`, `avatar_frame`, `badge` e status de mercado. |
| J-02 | `[B]` | `auth-service/app/api/inventory.py` | Endpoint `GET /inventory` com paginação e agrupamento por abas de categorias. |
| J-03 | `[B]` | `auth-service/app/api/inventory.py` | Endpoints `POST /inventory/items/{id}/equip` e `/unequip`. |
| J-04 | `[F]` | `frontend/src/pages/Inventory.tsx` | Nova página de Inventário com visualizador em grid, abas por categoria, preview e botão de ação rápida. |

#### Bloco K — Trading Cards, Insígnias e XP Progressivo (`inventory` `cards`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| K-01 | `[B]` | `auth-service/app/models/card.py` | Modelo `TradingCard`: `game_id`, `name`, `art_url`, `rarity`, `is_foil`. |
| K-02 | `[B]` | `library-service/app/services/card_drop.py` | Algoritmo probabilístico de drop de cartas no endpoint de ping de tempo de jogo. |
| K-03 | `[B]` | `library-service/app/services/quest_cards.py` | Integração com Quest Master para conceder cartas especiais ao obter conquistas raras. |
| K-04 | `[B]` | `auth-service/app/api/crafting.py` | Endpoint `POST /crafting/badge` que valida o set completo de cartas, consome os itens e cria a Insígnia. |
| K-05 | `[B]` | `auth-service/app/models/badge.py` | Modelo `Badge`: `name`, `description`, `xp_value`, `game_id`, `icon_url`. |
| K-06 | `[B]` | `auth-service/app/services/xp_engine.py` | Cálculo de progressão: `level = floor(sqrt(total_xp / 100))` e endpoint `GET /me/level-progress`. |
| K-07 | `[F]` | `frontend/src/components/Sidebar.tsx` | Barra de XP e indicador de nível em tempo real com tooltip de progresso até o próximo nível. |
| K-08 | `[F]` | `frontend/src/components/BadgesSection.tsx` | Vitrine de insígnias craftadas no Perfil e na aba de detalhes de cada jogo na Biblioteca. |
| K-09 | `[F]` | `frontend/src/pages/Inventory.tsx` | Visualização de progresso do set de cartas (ex: 3/5 coletadas) com botão "Fabricar Insígnia". |

#### Bloco P — Perfil Público e Configurações de Privacidade (`profile`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| P-01 | `[B]` | `auth-service/app/api/public_profile.py` | Endpoint `GET /users/{username}/profile` filtrando dados conforme o nível de privacidade do usuário. |
| P-02 | `[B]` | `auth-service/app/api/privacy.py` | Endpoint `PATCH /me/privacy` (visibilidade de jogos, conquistas, inventário, horas jogadas). |
| P-03 | `[F]` | `frontend/src/pages/PublicProfile.tsx` | Visualização do perfil de terceiros visitável ao clicar no nome do usuário em qualquer feed/chat. |
| P-04 | `[F]` | `frontend/src/pages/PublicProfile.tsx` | Badges de relacionamento dinâmicos (Amigo, Membro do Grupo, Bloqueado) e botão de adicionar amigo. |
| P-05 | `[F]` | `frontend/src/components/PrivacySettingsModal.tsx` | Modal com toggles para controle granular de privacidade de cada seção do perfil. |

---

### TRILHA 3 — DEV 3: Social, Comunidade, UGC, Notificações e Gateway

> **Foco de Código:** `services/social-service/` (grupos, fórum), novo `services/ugc-service/` (screenshots, workshop), `gateway/` (rotas e agregação de busca), `Header.tsx` (notificações e busca).  
> **Volume de Tickets:** 33 tickets (Blocos M, N, O, Q, R, S).

#### Bloco M — Grupos, Comunidade e Fórum (`community`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| M-01 | `[B]` | `social-service/app/models/group.py` | Modelos `Group` e `GroupMember`: nome, descrição, avatar, privacidade, contagem de membros. |
| M-02 | `[B]` | `social-service/app/api/groups.py` | Endpoints `POST /groups`, `GET /groups`, `POST /groups/{id}/join`, `DELETE /groups/{id}/leave`. |
| M-03 | `[B]` | `social-service/app/models/forum.py` | Modelos `ForumPost` e `ForumReply`: tópicos, respostas, autor e contadores. |
| M-04 | `[B]` | `social-service/app/api/forum.py` | Endpoints CRUD para tópicos e comentários de discussões do grupo. |
| M-05 | `[B]` | `social-service/app/api/group_chat.py` | Endpoint WebSocket `WS /ws/group/{group_id}/chat` para bate-papo de grupo em tempo real. |
| M-06 | `[F]` | `frontend/src/pages/Groups.tsx` | Nova página com busca de grupos, tela de criação, lista de membros, aba de discussões e sala de chat. |

#### Bloco N — Showcase de Capturas de Tela (`ugc`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| N-01 | `[B]` | `ugc-service/app/api/screenshots.py` | Endpoint `POST /screenshots/upload` (multipart/form-data) com metadados e armazenamento em volume. |
| N-02 | `[B]` | `mist_sdk.py` | Função `take_screenshot(caption)` no SDK Python com captura de frame e envio automático. |
| N-03 | `[B]` | `ugc-service/app/api/screenshots.py` | Endpoint `GET /screenshots` com filtros por jogo e por usuário. |
| N-04 | `[B]` | `ugc-service/app/api/screenshots.py` | Endpoints `POST /screenshots/{id}/like` e `DELETE /like`. |
| N-05 | `[F]` | `frontend/src/components/ScreenshotsGallery.tsx` | Galeria em grid responsivo com lightbox de ampliação e contador de likes no Perfil e na Loja. |
| N-06 | `[F]` | `frontend/src/components/ScreenshotUploadModal.tsx` | Modal de upload com preview e drag-and-drop no frontend. |

#### Bloco O — Workshop de Conteúdo: Mods e Skins (`ugc`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| O-01 | `[B]` | `ugc-service/app/models/workshop.py` | Modelo `WorkshopItem`: `game_id`, `author_id`, `title`, `tags`, `file_url`, `downloads`. |
| O-02 | `[B]` | `ugc-service/app/api/workshop.py` | Endpoint `POST /workshop/upload` com validação de tipo de arquivo. |
| O-03 | `[B]` | `ugc-service/app/api/workshop.py` | Endpoint `GET /workshop/items` com busca por tags e ordenação por popularidade. |
| O-04 | `[B]` | `ugc-service/app/api/workshop.py` | Endpoints `POST /workshop/{id}/subscribe` e `/unsubscribe`. |
| O-05 | `[F]` | `frontend/src/pages/Workshop.tsx` | Página completa do Workshop por jogo com busca, detalhes do mod e botão de download. |
| O-06 | `[F]` | `frontend/src/pages/Profile.tsx` | Exibição de contagem e lista de criações do Workshop publicadas pelo usuário. |

#### Bloco Q — Sistema de Notificações Global (`notifications`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| Q-01 | `[B]` | `social-service/app/models/notification.py` | Modelo `Notification`: `user_id`, `type` (amigo, conquista, trade, venda), `payload`, `is_read`. |
| Q-02 | `[B]` | `social-service/app/api/notifications.py` | Endpoints `GET /notifications` e `POST /notifications/{id}/read`. |
| Q-03 | `[B]` | `social-service/app/services/event_bus.py` | Disparador de eventos internos para geração automática de notificações. |
| Q-04 | `[B]` | `social-service/app/api/ws_notifications.py` | Entrega de notificações push em tempo real via WebSocket `WS /ws/notifications`. |
| Q-05 | `[F]` | `frontend/src/components/NotificationsDropdown.tsx` | Sininho com badge de não lidas no Header e menu dropdown expansível. |
| Q-06 | `[F]` | `frontend/src/components/NotificationsDropdown.tsx` | Ação de redirecionamento contextual ao clicar na notificação (ex: abrir tela do trade). |

#### Bloco R — Busca Global (`notifications` `search`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| R-01 | `[B]` | `gateway/app/api/search.py` | Endpoint unificado `GET /search?q={query}` agregando respostas assíncronas via `httpx`. |
| R-02 | `[B]` | `auth-service/app/api/search.py` | Endpoint interno de busca de usuários por nickname/nome. |
| R-03 | `[B]` | `social-service/app/api/search.py` | Endpoint interno de busca de grupos. |
| R-04 | `[B]` | `market-service/app/api/search.py` | Endpoint interno de busca de itens do mercado. |
| R-05 | `[F]` | `frontend/src/components/GlobalSearchDropdown.tsx` | Barra de pesquisa com resultados em seções (Jogos, Usuários, Grupos, Mercado). |

#### Bloco S — AI Curator Avançado (`ai`)
| ID | Tipo | Arquivos Impactados | Descrição da Tarefa |
|:---|:----:|:--------------------|:---------------------|
| S-01 | `[B]` | `store-service/app/services/ai_trends.py` | Algoritmo de "Top Vendidos" e "Em Alta" calculado por volume recente de checkouts. |
| S-02 | `[B]` | `store-service/app/services/ai_curator.py` | Geração de justificativas dinâmicas em linguagem natural ("Porque você jogou Elden Ring..."). |
| S-03 | `[B]` | `store-service/app/services/wishlist_ai.py` | Alerta proativo de desconto em itens presentes na Wishlist do usuário. |
| S-04 | `[F]` | `frontend/src/pages/Store.tsx` | Seções dinâmicas "Mais Populares da Semana" e banner de promoções recomendadas. |

---

## 4. Cronograma Dia a Dia por Desenvolvedor (Dias 3 a 15)

---

### FASE 1: Construção dos Pilares Independentes (Dias 3 a 5)

| Dia | Trilha 1 — DEV 1 (Mercado & Economia) | Trilha 2 — DEV 2 (Usuário & Cards) | Trilha 3 — DEV 3 (Social, UGC & Notif.) |
|:---:|:---|:---|:---|
| **Dia 3** | **H-01, H-02, H-03**<br>Modelos e endpoints de Reviews no `store-service`; cálculo de aprovação. | **I-01, I-02, I-03**<br>Acúmulo de pontos no checkout, modelo `InventoryItem` e compra na Loja de Pontos. | **S-01, S-02, S-03**<br>AI Curator Avançado: cálculo de tendências, justificativas por IA e alertas da wishlist. |
| **Dia 4** | **H-04, H-05**<br>Formulário de avaliação e listagem com badges de horas jogadas no frontend. | **I-04, I-05, J-01**<br>Equipar cosméticos no perfil, conexão frontend da Loja de Pontos e tipos de inventário. | **S-04, Q-01, Q-02**<br>Seções da Store com recomendações IA; modelo e endpoints REST de notificações. |
| **Dia 5** | **T-01, T-02, T-03, T-04**<br>Modelo `WalletTransaction`, registro de lançamentos, endpoint `/wallet/history` e modal de extrato. | **J-02, J-03, J-04**<br>Endpoints get/equip de itens e criação da página `Inventory.tsx`. | **Q-03, Q-04, Q-05, Q-06**<br>WebSocket de notificações push, sininho no `Header.tsx` e dropdown com ações. |

> **⚑ CHECKPOINT 1 (Final do Dia 5):**  
> Reviews e Extrato de Carteira ativos (Dev 1); Inventário e Loja de Pontos integrados (Dev 2); Notificações push e IA Avançada na Loja funcionando (Dev 3).

---

### FASE 2: Expansão de Sistemas Complexos (Dias 6 a 8)

| Dia | Trilha 1 — DEV 1 (Mercado & Economia) | Trilha 2 — DEV 2 (Usuário & Cards) | Trilha 3 — DEV 3 (Social, UGC & Notif.) |
|:---:|:---|:---|:---|
| **Dia 6** | **L-01, L-02, L-03**<br>Criação do `market-service` (`market.db`), modelo `MarketListing` e endpoint `POST /market/list`. | **K-01, K-02, K-03**<br>Modelo `TradingCard`, algoritmo de drop no ping de jogo e cartas do Quest Master. | **M-01, M-02**<br>Modelos `Group`, `GroupMember` e endpoints de descoberta/entrada em grupos. |
| **Dia 7** | **L-04, L-05**<br>Listagem pública de itens à venda e fluxo de compra com dedução de saldo e troca de dono. | **K-04, K-05, K-06**<br>Endpoint de Crafting de Insígnias, modelo `Badge` e fórmula de progressão de nível/XP. | **M-03, M-04, M-05**<br>Discussões de fórum (posts/replies) e sala de WebSocket de chat do grupo. |
| **Dia 8** | **L-09, L-11**<br>Página `Market.tsx` com catálogo de anúncios, filtros por preço/jogo e aba "Meus Anúncios". | **K-07, K-08, K-09**<br>Barra de XP na `Sidebar.tsx`, seção de Insígnias no perfil e botão de crafting no inventário. | **M-06**<br>Página `Groups.tsx` completa com busca, fórum e bate-papo em tempo real. |

> **⚑ CHECKPOINT 2 (Final do Dia 8):**  
> Mercado com listagem e compra pública (Dev 1); Drops de cartas, crafting de insígnias e níveis de XP funcionais (Dev 2); Comunidades com fórum e chat de grupo no ar (Dev 3).

---

### FASE 3: Negociações, UGC e Serviços Transversais (Dias 9 a 10)

| Dia | Trilha 1 — DEV 1 (Mercado & Economia) | Trilha 2 — DEV 2 (Usuário & Cards) | Trilha 3 — DEV 3 (Social, UGC & Notif.) |
|:---:|:---|:---|:---|
| **Dia 9** | **L-06, L-07, L-08**<br>Modelo `TradeOffer`, endpoints de proposta, aceite e recusa de trocas diretas. | **P-01, P-02**<br>Endpoint de perfil público com filtragem por privacidade e `PATCH /me/privacy`. | **R-01, R-02, R-03, R-04**<br>Agregador assíncrono de Busca Global no Gateway e endpoints nos microsserviços. |
| **Dia 10** | **L-10**<br>Modal de Oferta de Troca no frontend (seleção comparativa de itens entre amigos). | **P-03, P-04, P-05**<br>Página `PublicProfile.tsx`, badges de relação e modal de configuração de privacidade. | **R-05, N-01, N-02**<br>Dropdown de busca categorizada no `Header.tsx`; upload de screenshots via API e SDK. |

> **⚑ CHECKPOINT 3 (Final do Dia 10):**  
> Trocas diretas entre amigos (Dev 1); Perfis públicos visitáveis com controles de privacidade (Dev 2); Busca global unificada e upload de capturas via SDK (Dev 3).

---

### FASE 4: Finalização dos Módulos e UGC (Dias 11 a 12)

| Dia | Trilha 1 — DEV 1 (Mercado & Economia) | Trilha 2 — DEV 2 (Usuário & Cards) | Trilha 3 — DEV 3 (Social, UGC & Notif.) |
|:---:|:---|:---|:---|
| **Dia 11** | **L-05/L-10 (Testes & Hardening)**<br>Validação de concorrência: bloqueio de itens em múltiplos trades e transações atômicas de carteira. | **K-09/P-03 (Polimento)**<br>Sincronização em tempo real de inventário pós-crafting e pré-visualização de itens no Perfil. | **N-03, N-04, N-05, N-06**<br>Galeria de screenshots no frontend com likes e upload drag-and-drop. |
| **Dia 12** | **Revisão de Economia Integrada**<br>Testes cruzados: compra de jogo gera pontos → gasta na loja → dropa carta → vende no mercado. | **Revisão de Gamificação**<br>Testes de regressão: ganho de XP após crafting e desbloqueio de badges em múltiplos jogos. | **O-01 a O-06**<br>Workshop de Mods e Skins: backend de upload/subscrição e página `Workshop.tsx`. |

> **⚑ CHECKPOINT 4 (Final do Dia 12 — Fechamento da Etapa 2):**  
> 100% dos 115 tickets desenvolvidos e validados nas branches individuais de cada desenvolvedor.

---

### FASE 5: Buffer, Testes E2E e Entrega Final (Dias 13 a 15 — Trabalho Conjunto)

| Dia | Atividades Integradas da Equipe (Dev 1 + Dev 2 + Dev 3) |
|:---:|:---|
| **Dia 13** | **Bateria de Testes Automatizados e E2E:**<br>• Merge das 3 trilhas na branch `dev` com acompanhamento conjunto.<br>• Execução dos testes E2E com Playwright cobrindo os fluxos completos: compra de jogo → execução via SDK → conquista → drop de carta → listagem no mercado → trade entre amigos → mod no workshop.<br>• Resolução imediata de inconsistências de contrato de API. |
| **Dia 14** | **Polimento de UX e Verificação de Deploy:**<br>• Revisão visual: consistência de paleta, loading skeletons, tratamento de erros e toasts explicativos.<br>• Validação do `docker compose up` do zero: subir todos os microsserviços e frontend limpos em novas máquinas.<br>• População do banco demonstrativo com seed rico (jogos, reviews, perfis, screenshots, mods e itens de mercado). |
| **Dia 15** | **Demonstração, Tag de Release e Entrega:**<br>• Gravação do vídeo oficial de demonstração percorrendo todos os épicos do ecossistema MIST.<br>• Merge final de `dev` na branch `main`.<br>• Criação da tag de release `v1.0.0` no GitHub. |

---

## 5. Gantt Comparativo das 3 Trilhas (Dias 3 a 15)

```
Desenvolvedor / Módulo       D3  D4  D5  D6  D7  D8  D9  D10 D11 D12 D13 D14 D15
──────────────────────────── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
[DEV 1] H: Reviews Jogos     ██  ██
[DEV 1] T: Extrato Carteira          ██
[DEV 1] L: Mercado List/Buy              ██  ██  ██
[DEV 1] L: Trade Offers                              ██  ██
[DEV 1] Hardening Economia                                   ██  ██
──────────────────────────── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
[DEV 2] I: Loja de Pontos    ██  ██
[DEV 2] J: Inventário                ██
[DEV 2] K: Cards, Badges, XP             ██  ██  ██
[DEV 2] P: Perfil & Priv.                            ██  ██
[DEV 2] Polimento Gamif.                                     ██  ██
──────────────────────────── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
[DEV 3] S: AI Trends/Curator ██  ██
[DEV 3] Q: Notificações Push     ██  ██
[DEV 3] M: Grupos & Fórum                ██  ██  ██
[DEV 3] R: Busca Global                              ██  ██
[DEV 3] N: Screenshots                                   ██  ██
[DEV 3] O: Workshop Mods                                         ██
──────────────────────────── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
[TODOS] Testes E2E Playwright                                            ██
[TODOS] Polimento UX & Docker                                                ██
[TODOS] Release v1.0.0 & Demo                                                    ██
```

---

## 6. Matriz de Interfaces e Contratos entre Trilhas

Para evitar que uma trilha bloqueie a outra durante os commits, seguem os contratos de dados acordados:

1. **Dev 1 ↔ Dev 2 (Mercado e Inventário):**
   - Para colocar um item à venda, o Dev 1 consulta `GET /inventory` (Dev 2) e envia `POST /inventory/items/{id}/lock` (ou status `listed`).
   - Se vendido, o `market-service` aciona `POST /inventory/transfer` passando `item_id`, `from_user_id` e `to_user_id`.

2. **Dev 2 ↔ Dev 3 (Cartas, Conquistas e Notificações):**
   - Quando o Dev 2 realiza um drop de carta ou craft de badge, dispara um evento interno para o `event_bus` do Dev 3, que envia a notificação em tempo real via WebSocket.

3. **Dev 1 / Dev 2 ↔ Dev 3 (Busca Global):**
   - Dev 1 disponibiliza a rota padrão `GET /internal/search/market?q={query}`.
   - Dev 2 disponibiliza `GET /internal/search/users?q={query}`.
   - Dev 3 consome essas rotas no agregador assíncrono do Gateway sem precisar alterar nenhum arquivo de backend dos colegas.
