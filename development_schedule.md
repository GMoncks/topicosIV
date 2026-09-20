# MIST — Cronograma e Planejamento de Desenvolvimento

> Documento gerado em: **2026-09-19**
> Prazo total: **15 dias — inegociável**

---

## Contexto e Decisões de Alinhamento

| Decisão | Escolha |
|:--------|:--------|
| **Stack Backend** | Python + FastAPI + SQLite (1 arquivo `.db` por serviço) |
| **Stack Frontend** | React + TypeScript + Tailwind CSS + Vite |
| **Orquestração** | Docker Compose com rede interna e volumes persistentes |
| **Gateway** | FastAPI com proxy reverso assíncrono via `httpx` |
| **Autenticação** | JWT (access + refresh token), hashing com `bcrypt` |
| **Agentes de IA** | API de LLM em nuvem (Gemini / OpenAI / Groq) via `.env`, com fallback mock |
| **Jogos** | Pacote `.zip` real: `game.py` + `mist_sdk.py` + `session.json` |
| **Gestão** | Sprint única contínua, feature branches, daily assíncrono, merge na `develop` |

---

## Distribuição do Prazo

| Etapa | Dias | Duração | Objetivo |
|:------|:-----|:-------:|:---------|
| **Etapa 1** — Core Loop Integrado | Dias 1 – 2 | 2 dias | Gateway, Auth, Loja, Biblioteca, SDK, Social base, IA base, Reviews, Pontos |
| **Etapa 2** — Expansão do Ecossistema Steam | Dias 3 – 12 | 10 dias | Inventário, Cards, Mercado, Grupos, Screenshots, Workshop, Notificações, Busca, Perfil Público, IA Avançada |
| **Buffer** — Polimento e Entrega | Dias 13 – 15 | 3 dias | Testes E2E, Docker limpo, documentação, vídeo de demo, release `v1.0.0` |

> **Estratégia para cumprir 15 dias:** uso intensivo de IA (Gemini / Copilot) para geração de
> código boilerplate, máxima paralelização de backend e frontend, e priorização estrita
> das tarefas pelo critério de dependência crítica.

---

## Lista de Tarefas por Bloco de Funcionalidade

> Cada bloco é um **Épico** do GitHub Project. Cada linha é um **ticket** individual.
> Legenda de labels: `[B]` = backend · `[F]` = frontend · `[B+F]` = ambos

---

### BLOCO A — Infraestrutura e API Gateway
**Épico:** `EPIC-01` · **Label GitHub:** `infra`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| A-01 | `[B]` | Implementar `gateway/app/main.py` com proxy reverso assíncrono (`httpx`), CORS e middleware de extração/validação de JWT |
| A-02 | `[B]` | Implementar injeção de headers internos de identidade (`X-User-Id`, `X-User-Role`) para os microsserviços |
| A-03 | `[B]` | Configurar `docker-compose.yml` com rede interna, volumes persistentes para os SQLites e variáveis de ambiente via `.env` |
| A-04 | `[B]` | Criar `.env.example` com portas (8000–8004), `JWT_SECRET` e `GEMINI_API_KEY` (opcional) |
| A-05 | `[B]` | Criar `gateway/app/config.py` com mapeamento de URLs dos serviços internos |

---

### BLOCO B — Autenticação e Perfil Base
**Épico:** `EPIC-02` · **Label GitHub:** `auth`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| B-01 | `[B]` | Implementar modelo SQLAlchemy `User`: `id`, `username`, `email`, `password_hash`, `avatar_url`, `real_name`, `location`, `wallet_balance`, `points_balance`, `level`, `xp`, `status`, `privacy_settings` |
| B-02 | `[B]` | Implementar endpoints `POST /register` e `POST /login` com hashing `bcrypt` e emissão de JWT (access + refresh token) |
| B-03 | `[B]` | Implementar endpoint `GET /me` para retornar dados completos do usuário autenticado |
| B-04 | `[B]` | Implementar endpoint `PATCH /me` para edição de perfil (nick, bio, avatar, localização) |
| B-05 | `[F]` | Criar `AuthContext` no frontend com estado global do usuário, armazenamento seguro do JWT e função de logout |
| B-06 | `[F]` | Criar tela/modal de Login e Registro no frontend conectada ao `auth-service` via Gateway |

---

### BLOCO C — Loja, Catálogo e Checkout
**Épico:** `EPIC-03` · **Label GitHub:** `store`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| C-01 | `[B]` | Implementar modelo SQLAlchemy `Game`: `id`, `title`, `description`, `price`, `tags`, `category`, `banner_url`, `screenshots`, `release_date`, `publisher`, `review_score` |
| C-02 | `[B]` | Criar seed de 10–15 jogos com dados realistas para popular o catálogo |
| C-03 | `[B]` | Implementar endpoint `GET /games` — lista com filtros por categoria, tag, preço, busca textual e ordenação |
| C-04 | `[B]` | Implementar endpoint `GET /games/{id}` com detalhes completos do jogo |
| C-05 | `[B]` | Implementar modelo `Wishlist` e endpoints `POST /wishlist/{game_id}` e `DELETE /wishlist/{game_id}` |
| C-06 | `[B]` | Implementar endpoint `POST /checkout` que debita saldo da carteira e aciona grant no `library-service` |
| C-07 | `[F]` | Conectar `Store.tsx` ao catálogo real da API (substituindo os mocks locais) |
| C-08 | `[F]` | Implementar modal/página de Detalhes do Jogo com screenshots, sinopse, tags e botão de compra |
| C-09 | `[F]` | Implementar fluxo de Checkout no frontend com confirmação e dedução visual do saldo da carteira |
| C-10 | `[F]` | Implementar Wishlist no frontend (botão de coração nos cards e subaba dedicada) |

---

### BLOCO D — Biblioteca e Licenças
**Épico:** `EPIC-04` · **Label GitHub:** `library`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| D-01 | `[B]` | Implementar modelo `LibraryItem`: `user_id`, `game_id`, `acquired_at`, `playtime_minutes`, `is_installed`, `last_played` |
| D-02 | `[B]` | Implementar endpoint interno `POST /library/grant` — acionado pelo `store-service` após checkout bem-sucedido |
| D-03 | `[B]` | Implementar endpoint `GET /library/my-games` retornando os jogos do usuário com playtime e status |
| D-04 | `[F]` | Conectar `Library.tsx` à API real para listar jogos comprados com playtime e status de instalação |
| D-05 | `[F]` | Implementar painel de Conquistas por jogo na Biblioteca (bloqueadas vs desbloqueadas com barra de progresso) |

---

### BLOCO E — Download Real e Mini SDK Python
**Épico:** `EPIC-04` · **Labels GitHub:** `library` `sdk`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| E-01 | `[B]` | Criar `mist_sdk.py`: módulo Python stdlib-only (sem `pip install`) que lê `session.json` e expõe `start_session()`, `ping()` e `unlock_achievement(id)` |
| E-02 | `[B]` | Criar 2–3 mini-jogos Python de demonstração (`game.py`) que importam `mist_sdk.py` e chamam o SDK durante o jogo |
| E-03 | `[B]` | Implementar endpoint `GET /store/games/{id}/download` que gera e retorna um `.zip` com `game.py`, `mist_sdk.py` e `session.json` |
| E-04 | `[B]` | Implementar endpoints de sessão no `library-service`: `POST /session/start`, `POST /session/ping` (acumula playtime) e `POST /session/end` |
| E-05 | `[B]` | Implementar endpoint `POST /achievements/unlock` com registro no banco e disparo de evento de atividade |
| E-06 | `[F]` | Conectar botão "Baixar" na `Library.tsx` ao endpoint de download e acionar o `DownloadBar.tsx` com progresso simulado |
| E-07 | `[F]` | Implementar notificação Toast no frontend para conquistas desbloqueadas (SSE ou polling leve) |

---

### BLOCO F — Social: Amigos, Feed e Chat WebSocket
**Épico:** `EPIC-05` · **Label GitHub:** `social`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| F-01 | `[B]` | Implementar modelos `Friend`, `Message` e `Activity` no `social-service` |
| F-02 | `[B]` | Implementar endpoints de amizade: `POST /friends/request`, `POST /friends/accept/{id}`, `DELETE /friends/{id}` e `GET /friends` |
| F-03 | `[B]` | Implementar endpoint WebSocket `WS /ws/chat/{room_id}` para chat em tempo real entre amigos |
| F-04 | `[B]` | Implementar endpoint WebSocket de presença `WS /ws/presence` para status Online / Ausente / Jogando |
| F-05 | `[B]` | Atualizar status do usuário para "Jogando [Título do Jogo]" ao iniciar sessão via SDK |
| F-06 | `[B]` | Implementar feed de atividades `GET /feed` com eventos de conquistas, compras e nível atingido |
| F-07 | `[F]` | Construir componente de janela de Chat no `Social.tsx` com histórico de mensagens e indicador de digitação |
| F-08 | `[F]` | Exibir status de presença em tempo real na lista de amigos do `Social.tsx` |

---

### BLOCO G — Agentes de IA (Base e Avançado)
**Épico:** `EPIC-06` · **Label GitHub:** `ai`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| G-01 | `[B]` | Criar helper unificado `ai_client.py` com suporte à API Gemini / OpenAI / Groq e fallback determinístico por mock local |
| G-02 | `[B]` | Integrar **MIST AI Curator** no `store-service`: vitrine "Recomendado para você" usando histórico da biblioteca + tags dos favoritos |
| G-03 | `[B]` | Integrar **MIST Quest Master** no `library-service`: geração de conquistas e desafios dinâmicos semanais por jogo |
| G-04 | `[B]` | Integrar **MIST Companion Bot** no `social-service`: contato fixo na lista de amigos que responde via chat WebSocket |
| G-05 | `[F]` | Exibir seção "Recomendado para Você" na `Store.tsx` abaixo do Hero Banner |
| G-06 | `[F]` | Exibir MIST Bot como contato especial na lista de amigos do `Social.tsx` com marcação visual de IA |
| S-01 | `[B]` | Expandir o Curator com análise de tendências: "Top Vendidos da Semana" e "Em Alta" calculados por volume de compras |
| S-02 | `[B]` | Gerar justificativas textuais personalizadas para cada recomendação em linguagem natural |
| S-03 | `[B]` | Implementar alerta inteligente "Promoção na sua Wishlist" quando um jogo do desejo entrar em desconto |
| S-04 | `[F]` | Exibir seções "Top Vendidos", "Em Alta" e "Alerta de Promoção da Wishlist" na `Store.tsx` |

---

### BLOCO H — Reviews de Jogos
**Épico:** `EPIC-03` · **Labels GitHub:** `store` `reviews`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| H-01 | `[B]` | Implementar modelo `Review`: `user_id`, `game_id`, `is_recommended` (bool), `text`, `created_at`, `playtime_at_review` (horas) |
| H-02 | `[B]` | Implementar endpoint `POST /games/{id}/reviews` (requer o jogo na biblioteca) e `GET /games/{id}/reviews` |
| H-03 | `[B]` | Calcular score de aprovação do jogo (% de "Recomendo") e expor no endpoint `GET /games/{id}` |
| H-04 | `[F]` | Implementar formulário de Review no modal de detalhes do jogo no frontend |
| H-05 | `[F]` | Exibir lista de reviews e score de aprovação (ex: "Muito Positivo — 94%") na página de detalhes |

---

### BLOCO I — Loja de Pontos e Cosméticos no Perfil
**Épico:** `EPIC-07` · **Label GitHub:** `points`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| I-01 | `[B]` | Conectar acúmulo de Pontos MIST ao checkout: `100 pts por R$ 1,00` creditados no `auth-service` |
| I-02 | `[B]` | Implementar modelo `InventoryItem` no `auth-service` para rastrear cosméticos adquiridos |
| I-03 | `[B]` | Implementar endpoint `POST /points-shop/purchase` para deduzir pontos e adicionar item ao inventário |
| I-04 | `[B]` | Implementar endpoint `POST /profile/equip` para equipar cosméticos (moldura de avatar, plano de fundo) |
| I-05 | `[F]` | Exibir cosméticos equipados na `Profile.tsx` e itens do inventário na seção de Inventário |

---

### BLOCO J — Inventário Completo de Itens
**Épico:** `EPIC-08` · **Label GitHub:** `inventory`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| J-01 | `[B]` | Estender modelo `InventoryItem` com tipo de item (carta, emoticon, plano de fundo, avatar, insígnia) e status (equipado, listado no mercado, disponível) |
| J-02 | `[B]` | Implementar endpoint `GET /inventory` retornando todos os itens do usuário agrupados por tipo |
| J-03 | `[B]` | Implementar endpoints `POST /inventory/items/{id}/equip` e `POST /inventory/items/{id}/unequip` |
| J-04 | `[F]` | Construir página de Inventário no frontend com abas por tipo, filtros e ação de equipar/desequipar |

---

### BLOCO K — Trading Cards e Sistema de Insígnias com XP
**Épico:** `EPIC-08` · **Labels GitHub:** `inventory` `cards`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| K-01 | `[B]` | Implementar modelo `TradingCard`: `game_id`, `card_name`, `card_art_url`, `rarity`, `is_foil` |
| K-02 | `[B]` | Implementar lógica de drop de cartas no endpoint `session/ping`: probabilidade configurável de drop por minuto de jogo |
| K-03 | `[B]` | Integrar Quest Master para gerar cartas únicas ao desbloquear conquistas (arte por template ou IA) |
| K-04 | `[B]` | Implementar endpoint `POST /crafting/badge` que consome um set completo de cartas e cria uma `Badge` |
| K-05 | `[B]` | Implementar modelo `Badge`: `name`, `description`, `xp_value`, `game_id`, `icon_url` |
| K-06 | `[B]` | Implementar XP progressivo: `level = floor(sqrt(total_xp / 100))` e endpoint de progresso de nível |
| K-07 | `[F]` | Exibir barra de XP e nível na `Sidebar.tsx` e no header do `Profile.tsx` |
| K-08 | `[F]` | Exibir Insígnias craftadas na seção de Insígnias do Perfil e por jogo na Biblioteca |
| K-09 | `[F]` | Exibir Cartas Colecionáveis no Inventário com ação "Selecionar Set para Crafting" |

---

### BLOCO L — Mercado da Comunidade
**Épico:** `EPIC-09` · **Label GitHub:** `market`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| L-01 | `[B]` | Implementar módulo de mercado (novo `market-service` ou módulo no `store-service`) com SQLite `market.db` |
| L-02 | `[B]` | Implementar modelo `MarketListing`: `seller_id`, `item_id`, `item_type`, `price`, `status` (ativo, vendido, cancelado) |
| L-03 | `[B]` | Implementar endpoint `POST /market/list` para colocar item do inventário à venda com preço em R$ |
| L-04 | `[B]` | Implementar endpoint `GET /market/listings` com filtros por tipo, jogo, faixa de preço e ordenação |
| L-05 | `[B]` | Implementar endpoint `POST /market/buy/{listing_id}` com dedução do saldo da carteira e transferência do item |
| L-06 | `[B]` | Implementar modelo `TradeOffer`: `sender_id`, `receiver_id`, `offered_items[]`, `requested_items[]`, `status` |
| L-07 | `[B]` | Implementar endpoints de Troca Direta: `POST /trades/offer`, `POST /trades/{id}/accept`, `POST /trades/{id}/decline` |
| L-08 | `[B]` | Implementar endpoint `GET /wallet/history` com extrato de transações da carteira (paginado) |
| L-09 | `[F]` | Construir página "Mercado da Comunidade" no frontend com listagens, filtros e botão de compra |
| L-10 | `[F]` | Construir modal de Oferta de Troca: seleção de itens do inventário próprio e solicitação de itens do amigo |
| L-11 | `[F]` | Exibir extrato de Histórico da Carteira acessível via modal ou aba no Perfil |

---

### BLOCO M — Grupos e Comunidade
**Épico:** `EPIC-10` · **Label GitHub:** `community`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| M-01 | `[B]` | Implementar modelo `Group`: `name`, `description`, `avatar_url`, `owner_id`, `privacy` (público/privado), `member_count` |
| M-02 | `[B]` | Implementar modelo `GroupMember` e endpoints: `POST /groups`, `GET /groups`, `POST /groups/{id}/join`, `DELETE /groups/{id}/leave` |
| M-03 | `[B]` | Implementar modelo `ForumPost`: `group_id`, `author_id`, `title`, `content`, `created_at`, `reply_count` |
| M-04 | `[B]` | Implementar modelo `ForumReply` e endpoints CRUD de posts e respostas do fórum |
| M-05 | `[B]` | Implementar endpoint WebSocket `WS /ws/group/{group_id}/chat` para chat de grupo em tempo real |
| M-06 | `[F]` | Construir página de Grupos no frontend: descoberta/busca, criação, aba de membros, fórum e chat de grupo |

---

### BLOCO N — Showcase de Capturas de Tela
**Épico:** `EPIC-11` · **Label GitHub:** `ugc`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| N-01 | `[B]` | Implementar endpoint `POST /screenshots/upload` com suporte a `multipart/form-data` e metadados (jogo, legenda, visibilidade) |
| N-02 | `[B]` | Estender `mist_sdk.py` com função `take_screenshot(description)` que captura a tela e envia ao MIST via HTTP |
| N-03 | `[B]` | Implementar endpoint `GET /screenshots` com filtros por usuário e jogo |
| N-04 | `[B]` | Implementar endpoints `POST /screenshots/{id}/like` e `DELETE /screenshots/{id}/like` |
| N-05 | `[F]` | Construir galeria de Screenshots no Perfil Público e no modal de Detalhes do Jogo |
| N-06 | `[F]` | Construir componente de upload manual de screenshot no frontend (drag-and-drop ou seleção de arquivo) |

---

### BLOCO O — Workshop de Conteúdo (Mods e Skins)
**Épico:** `EPIC-11` · **Label GitHub:** `ugc`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| O-01 | `[B]` | Implementar modelo `WorkshopItem`: `game_id`, `author_id`, `title`, `description`, `tags`, `file_url`, `thumbnail_url`, `subscriber_count`, `downloads` |
| O-02 | `[B]` | Implementar endpoint `POST /workshop/upload` com upload de arquivo do mod/skin |
| O-03 | `[B]` | Implementar endpoint `GET /workshop/items` com filtros por jogo, tags e popularidade |
| O-04 | `[B]` | Implementar endpoints `POST /workshop/{id}/subscribe` e `DELETE /workshop/{id}/subscribe` |
| O-05 | `[F]` | Construir página do Workshop no frontend: listagem por jogo, página de detalhe do item e botão de Subscrição/Download |
| O-06 | `[F]` | Exibir contagem de itens do Workshop subscrita no Perfil do usuário |

---

### BLOCO P — Perfil Público Visitável e Configurações de Privacidade
**Épico:** `EPIC-12` · **Label GitHub:** `profile`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| P-01 | `[B]` | Implementar endpoint `GET /users/{username}/profile` que retorna o perfil público respeitando as configurações de privacidade |
| P-02 | `[B]` | Implementar endpoint `PATCH /me/privacy` para configurar visibilidade de seções: jogos, conquistas, horas, inventário, screenshots, grupos (Todos / Amigos / Privado) |
| P-03 | `[F]` | Construir página de Perfil Público no frontend, visitável pelo clique no nome de qualquer usuário no feed, chat ou mercado |
| P-04 | `[F]` | Aplicar badge de relação (Amigo, Você mesmo, Membro do Grupo) no Perfil Público visitado |
| P-05 | `[F]` | Construir modal de Configurações de Privacidade na tela de Perfil |

---

### BLOCO Q — Sistema de Notificações Global
**Épico:** `EPIC-13` · **Label GitHub:** `notifications`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| Q-01 | `[B]` | Implementar modelo `Notification`: `user_id`, `type` (amizade, conquista, mercado, mensagem, carta, review), `payload` (JSON), `is_read`, `created_at` |
| Q-02 | `[B]` | Implementar endpoint `GET /notifications` (não lidas + histórico) e `POST /notifications/{id}/read` |
| Q-03 | `[B]` | Implementar disparo de notificações por eventos: conquista desbloqueada, solicitação de amizade, item vendido, trade recebido, carta dropada |
| Q-04 | `[B]` | Implementar entrega de notificações em tempo real via WebSocket ou SSE (Server-Sent Events) |
| Q-05 | `[F]` | Construir painel de Notificações no frontend: sininho com badge no `Header.tsx` abrindo dropdown |
| Q-06 | `[F]` | Adicionar navegação contextual nas notificações (amizade → Perfil do usuário, conquista → Biblioteca) |

---

### BLOCO R — Busca Global
**Épico:** `EPIC-13` · **Labels GitHub:** `notifications` `search`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| R-01 | `[B]` | Implementar endpoint `GET /search?q={query}&type={all\|games\|users\|groups\|market}` no Gateway agregando resultados de múltiplos serviços |
| R-02 | `[B]` | Implementar busca por usuários no `auth-service` (por username ou nome real) |
| R-03 | `[B]` | Implementar busca por grupos no `social-service` |
| R-04 | `[B]` | Implementar busca por itens no `market-service` |
| R-05 | `[F]` | Atualizar barra de busca do `Header.tsx` para exibir resultados globais em dropdown categorizado (Jogos, Usuários, Grupos, Mercado) |

---

### BLOCO T — Histórico de Transações da Carteira
**Épico:** `EPIC-09` · **Labels GitHub:** `market` `wallet`

| ID | Tipo | Tarefa |
|:---|:----:|:-------|
| T-01 | `[B]` | Implementar modelo `WalletTransaction`: `user_id`, `type` (compra, venda, crédito, resgate de pontos), `amount`, `description`, `created_at` |
| T-02 | `[B]` | Registrar transação a cada compra de jogo, compra/venda no mercado e resgate na Loja de Pontos |
| T-03 | `[B]` | Implementar endpoint `GET /wallet/history` com paginação e filtros por tipo de transação |
| T-04 | `[F]` | Construir extrato de Carteira no frontend (acessível via modal ou aba no Perfil) |

---

## Cronograma Dia a Dia (15 Dias)

> **Legenda:** `[B]` = backend  ·  `[F]` = frontend  ·  `[B+F]` = ambos em paralelo  ·  `⚑` = Checkpoint de entrega

---

### ETAPA 1 — Core Loop Integrado (Dias 1 e 2)

#### Dia 1 — Backend Sprint: Gateway + Auth + Loja + Biblioteca + Social + SDK + IA

| Turno | Tipo | Tarefas |
|:------|:----:|:--------|
| Manhã | `[B]` | **A-01, A-02, A-03, A-04, A-05** — Gateway + Docker Compose |
| Manhã | `[B]` | **B-01, B-02, B-03** — Auth: modelos SQLAlchemy, JWT, endpoint `/me` |
| Tarde | `[B]` | **C-01, C-02, C-03, C-04** — Store: modelos + seed + listagem + detalhes |
| Tarde | `[B]` | **D-01, D-02, D-03** — Library: modelos + endpoint interno `/grant` + `/my-games` |
| Tarde | `[B]` | **F-01, F-02** — Social: modelos `Friend/Message/Activity` + endpoints de amizade |
| Noite | `[B]` | **E-01, E-02, E-03** — `mist_sdk.py` + mini-jogos Python + endpoint de download `.zip` |
| Noite | `[B]` | **G-01** — `ai_client.py`: helper unificado de LLM com fallback mock |

#### Dia 2 — Integração E2E: Frontend + Social/Presença + IA + Reviews + Pontos

| Turno | Tipo | Tarefas |
|:------|:----:|:--------|
| Manhã | `[F]` | **B-04, B-05, B-06** — `AuthContext` + tela de Login e Registro |
| Manhã | `[B+F]` | **C-05, C-06, C-07, C-08, C-09** — Checkout + Wishlist backend + Loja conectada ao frontend |
| Tarde | `[B+F]` | **D-04, D-05** — `Library.tsx` conectada à API real + painel de conquistas |
| Tarde | `[B+F]` | **E-04, E-05, E-06, E-07** — Sessão/Ping + conquistas + `DownloadBar` + Toast |
| Tarde | `[B]` | **F-03, F-04, F-05, F-06** — WebSocket Chat + Presença + status "Jogando" + Feed |
| Noite | `[F]` | **F-07, F-08** — Chat UI + lista de amigos com presença em tempo real |
| Noite | `[B+F]` | **G-02, G-03, G-04, G-05, G-06** — Curator + Quest Master + Bot IA + exibição no frontend |
| Noite | `[B+F]` | **H-01, H-02, H-03, H-04, H-05** — Reviews: backend + formulário + score no frontend |
| Noite | `[B+F]` | **I-01, I-02, I-03, I-04, I-05** — Loja de Pontos + cosméticos no Perfil |
| Noite | `[F]` | **C-10** — Wishlist no frontend (aba dedicada + coração nos cards) |

> **⚑ CHECKPOINT DIA 2 — Etapa 1 Completa**
> Fluxo `compra → download → execução local → ping de playtime → conquista → notificação` funcionando de ponta a ponta.

---

### ETAPA 2 — Expansão do Ecossistema Steam (Dias 3 a 12)

#### Dia 3 — Inventário + Início dos Trading Cards

| Tipo | Tarefas |
|:----:|:--------|
| `[B]` | **J-01, J-02, J-03** — Inventário: modelo estendido com tipos + endpoints get/equip |
| `[F]` | **J-04** — Página de Inventário no frontend (abas por tipo, filtros, ação de equipar) |
| `[B]` | **K-01, K-02, K-03** — Trading Cards: modelo + drop por ping + geração via Quest Master |

#### Dia 4 — Crafting de Insígnias + XP + Notificações

| Tipo | Tarefas |
|:----:|:--------|
| `[B]` | **K-04, K-05** — Crafting de Insígnia (endpoint + modelo `Badge`) |
| `[B]` | **K-06** — Sistema de XP progressivo e endpoint de progressão de nível |
| `[F]` | **K-07, K-08, K-09** — Barra de XP na `Sidebar` + Insígnias no Perfil + Cartas no Inventário |
| `[B]` | **Q-01, Q-02, Q-03** — Notificações: modelo + endpoints get/read + disparo por eventos |

#### Dia 5 — Notificações em Tempo Real + Histórico da Carteira

| Tipo | Tarefas |
|:----:|:--------|
| `[B]` | **Q-04** — Entrega de notificações em tempo real (WebSocket / SSE) |
| `[F]` | **Q-05, Q-06** — Painel de notificações no `Header` (sininho + dropdown + navegação contextual) |
| `[B+F]` | **T-01, T-02, T-03, T-04** — Histórico da Carteira: modelo + registro + endpoint + extrato no frontend |

#### Dia 6 — Mercado: Listagem Pública

| Tipo | Tarefas |
|:----:|:--------|
| `[B]` | **L-01, L-02, L-03, L-04, L-05** — `market-service`: modelo `MarketListing` + colocar à venda + listagem pública + compra de item |

#### Dia 7 — Mercado: Trade Offers + Wallet History

| Tipo | Tarefas |
|:----:|:--------|
| `[B]` | **L-06, L-07, L-08** — Modelo `TradeOffer` + endpoints offer/accept/decline + wallet history |
| `[F]` | **L-09, L-11** — Página do Mercado no frontend + extrato da carteira |

#### Dia 8 — Mercado UI Completo + AI Curator Avançado

| Tipo | Tarefas |
|:----:|:--------|
| `[F]` | **L-10** — Modal de Oferta de Troca no frontend |
| `[B+F]` | **S-01, S-02, S-03, S-04** — AI Curator Avançado: Top Vendidos, Em Alta e Alertas de Promoção da Wishlist |

#### Dia 9 — Grupos, Fórum e Chat de Grupo

| Tipo | Tarefas |
|:----:|:--------|
| `[B]` | **M-01, M-02, M-03, M-04** — Modelos `Group/GroupMember/ForumPost/ForumReply` + CRUD endpoints |
| `[B]` | **M-05** — WebSocket de chat de grupo |
| `[F]` | **M-06** — Página de Grupos completa no frontend |

#### Dia 10 — Busca Global

| Tipo | Tarefas |
|:----:|:--------|
| `[B]` | **R-01, R-02, R-03, R-04** — Endpoint agregador no Gateway + buscas por serviço (usuários, grupos, itens) |
| `[F]` | **R-05** — Dropdown de busca global no `Header.tsx` com resultados categorizados |

#### Dia 11 — Screenshots e Workshop

| Tipo | Tarefas |
|:----:|:--------|
| `[B]` | **N-01, N-02, N-03, N-04** — Screenshots: upload via API + via SDK + listagem + curtidas |
| `[F]` | **N-05, N-06** — Galeria de Screenshots no Perfil + upload manual no frontend |
| `[B]` | **O-01, O-02, O-03, O-04** — Workshop: modelo + upload de arquivo + listagem + subscrição |

#### Dia 12 — Workshop UI + Perfil Público + Privacidade

| Tipo | Tarefas |
|:----:|:--------|
| `[F]` | **O-05, O-06** — Página do Workshop no frontend + contagem de subs no Perfil |
| `[B]` | **P-01, P-02** — Endpoint de Perfil Público com respeito à privacidade + endpoint de configuração |
| `[F]` | **P-03, P-04, P-05** — Página de Perfil Público + badge de relação + modal de privacidade |

> **⚑ CHECKPOINT DIA 12 — Etapa 2 Completa**
> Todas as features do ecossistema Steam implementadas e integradas.

---

### BUFFER — Polimento e Entrega (Dias 13 a 15)

#### Dia 13 — Testes E2E e Correção de Bugs

| # | Atividade |
|:--|:----------|
| 1 | Bateria de testes E2E com Playwright: compra, download, chat, mercado, trade e conquistas |
| 2 | Testes unitários `pytest` nos endpoints críticos: auth, checkout, grant, achievements, market |
| 3 | Correção de bugs e regressões identificados nos testes |

#### Dia 14 — Polimento de UX e Docker Compose

| # | Atividade |
|:--|:----------|
| 1 | Ajustes de UX: loading states, empty states e tratamento de erros com feedback visual |
| 2 | Verificação do `docker compose up` limpo: todos os 5+ serviços e frontend sobem sem erros |
| 3 | Atualização da documentação: `README.md`, `docs/architecture.md` e `prompts.md` |
| 4 | Seed de dados demonstrativos para a apresentação (usuários, jogos, amigos, itens, cartas) |

#### Dia 15 — Entrega Final

| # | Atividade |
|:--|:----------|
| 1 | Gravação do vídeo de demonstração percorrendo todos os fluxos do ecossistema MIST |
| 2 | Tag de release `v1.0.0` no repositório GitHub |
| 3 | Push final na branch `main` com o sistema completo e executável |

> **⚑ CHECKPOINT FINAL — Sistema MIST Completo Entregue no Dia 15**

---

## Gantt Visual (15 Dias)

```
Bloco / Funcionalidade      D1  D2  D3  D4  D5  D6  D7  D8  D9  D10 D11 D12 D13 D14 D15
─────────────────────────── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
A  Gateway & Infra           ██
B  Auth & Perfil             ██  ██
C  Loja & Checkout           ██  ██
D  Biblioteca                ██  ██
E  SDK & Download            ██  ██
F  Social & Chat             ██  ██
G  IA Base (Curator/Bot)     ██  ██
H  Reviews de Jogos              ██
I  Pontos & Cosméticos           ██
                                 ⚑ ETAPA 1
J  Inventário                        ██
K  Trading Cards & XP                ██  ██
Q  Notificações                      ██  ██
T  Histórico da Carteira                 ██
L  Mercado da Comunidade                     ██  ██  ██
S  IA Avançada (Curator+)                            ██
M  Grupos & Fórum                                        ██
R  Busca Global                                              ██
N  Screenshots                                                   ██
O  Workshop                                                      ██
P  Perfil Público                                                    ██
                                                                     ⚑ ETAPA 2
   Testes E2E                                                            ██
   Polimento & Docker                                                        ██
   Release & Entrega                                                             ██
                                                                                 ⚑ FIM
```

---

## Mapa de Dependências Críticas

```
Gateway (A)
  └──► TODOS os serviços e endpoints do sistema

auth-service (B)
  └──► AuthContext (B-05/06)
         └──► Todos os fluxos autenticados do frontend
  └──► XP / Nível (K-06)
         └──► Barra de XP na Sidebar (K-07)

store-service (C)
  └──► grant library (D-02)
         └──► SDK (E-01/02/03)
                └──► Sessions / Achievements
                └──► Trading Cards drop (K-02)
  └──► Reviews (H)
         └──► Score em GET /games/{id}
                └──► AI Curator Avançado (S-01/02)

social-service WebSocket (F-03)
  └──► MIST Bot (G-04)
  └──► Notificações em tempo real (Q-04)

Inventário (J)
  └──► Trading Cards (K)
         └──► Crafting de Insígnia (K-04)
                └──► XP progressivo (K-06)
         └──► Listagem no Mercado (L-02)
                └──► Trade Offers (L-06)

Notificações (Q-03) ◄── disparadas por:
  ├── Achievements desbloqueados (E-05)
  ├── Solicitação de amizade (F-02)
  ├── Item vendido no mercado (L-05)
  ├── Trade recebido (L-06)
  └── Carta dropada (K-02)
```

---

## Mapeamento de Épicos para o GitHub Project

| Épico | Blocos | Label | Dias Principais |
|:------|:-------|:------|:---------------|
| **EPIC-01** Infraestrutura & Gateway | A | `infra` | 1 |
| **EPIC-02** Autenticação e Perfil Base | B | `auth` | 1 – 2 |
| **EPIC-03** Loja, Checkout e Reviews | C, H | `store` `reviews` | 1 – 2 |
| **EPIC-04** Biblioteca, Download e SDK | D, E | `library` `sdk` | 1 – 2 |
| **EPIC-05** Social, Chat e Feed | F | `social` | 1 – 2 |
| **EPIC-06** Agentes de IA (Base + Avançado) | G, S | `ai` | 2, 8 |
| **EPIC-07** Loja de Pontos e Cosméticos | I | `points` | 2 |
| **EPIC-08** Inventário e Trading Cards | J, K | `inventory` `cards` | 3 – 4 |
| **EPIC-09** Mercado, Trades e Carteira | L, T | `market` `wallet` | 5 – 8 |
| **EPIC-10** Grupos e Fórum | M | `community` | 9 |
| **EPIC-11** Screenshots e Workshop | N, O | `ugc` | 11 |
| **EPIC-12** Perfil Público e Privacidade | P | `profile` | 12 |
| **EPIC-13** Notificações e Busca Global | Q, R | `notifications` `search` | 4 – 5, 10 |
