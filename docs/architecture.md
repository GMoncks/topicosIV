# MIST — Arquitetura de Microsserviços e Sistema

O **MIST** é uma plataforma distribuída orientada a microsserviços que recria a infraestrutura e os fluxos essenciais da Steam, combinando mensageria assíncrona em tempo real, execução de jogos em console nativo, economia descentralizada e agentes de inteligência artificial aplicados.

---

## 1. Visão Geral da Arquitetura

O sistema é composto por um **API Gateway**, 6 **Microsserviços de Domínio** desacoplados, um **MIST Local Daemon**, um **MIST SDK client-side**, uma **Interface Web SPA (React)** e a suíte de **Jogos Nativos e Wrappers**, orquestrados via Docker Compose ou executados nativamente.

```mermaid
graph TD
    subgraph Cliente ["Cliente / Interface Web & Local Host"]
        Frontend["Frontend SPA (React 18 + TS + Vite)\n:${PORT_FRONTEND_DEV} / :${PORT_FRONTEND}"]
        Daemon["MIST Local Daemon (:${PORT_DAEMON})\nrunner/mist_daemon.py\n- Supera sandbox do browser\n- Dispara subprocessos no SO host"]
        GamesNativos["Jogos MIST Studios (Terminal ASCII)\n(Forca, Labirinto, Quiz)\n- 100% jogáveis em Python nativo"]
        GamesImportados["Jogos Importados / Comerciais\n(Control, Cyberpunk, BG3, etc.)\n- Wrappers de telemetria via MIST SDK"]
    end

    subgraph Roteamento ["Borda & Roteamento"]
        Gateway["API Gateway (FastAPI)\n:${PORT_GATEWAY}\n- Validação centralizada de JWT\n- Proxy reverso HTTP e WebSockets\n- Agregador de Busca Global"]
    end

    subgraph Microsservicos ["Ecossistema de Microsserviços Desacoplados"]
        Auth["Auth Service (:${PORT_AUTH})\nSQLite: auth.db\n- Perfis, Avatares, Inventário\n- Carteira Virtual (Simulada)\n- XP, Insígnias & Níveis"]
        Store["Store Service (:${PORT_STORE})\nSQLite: store.db\n- Catálogo, Wishlist & Reviews\n- Orquestrador Saga de Checkout\n- AI Curator & Recommender\n- Reviews do Sistema MIST"]
        Library["Library Service (:${PORT_LIBRARY})\nSQLite: library.db\n- Posse & Licenças de Jogos\n- Sessões & Telemetria Playtime\n- Conquistas & Drops de Cartas"]
        Social["Social Service (:${PORT_SOCIAL})\nSQLite: social.db\n- Amigos & Solicitações Pendentes\n- Chat 1:1 e Grupos (WebSockets)\n- Presença em Tempo Real\n- MIST Companion Bot (IA)"]
        Market["Market Service (:${PORT_MARKET})\nSQLite: market.db\n- Mercado da Comunidade (Compra/Venda)\n- Ofertas de Troca Direta (Trades)\n- Extrato Financeiro da Carteira"]
        UGC["UGC Service (:${PORT_UGC})\nSQLite: ugc.db\n- Showcase de Capturas de Tela\n- Workshop de Mods e Skins"]
    end

    %% Conexões do Frontend
    Frontend -->|HTTP REST /api/*| Gateway
    Frontend -->|WebSockets /ws/*| Gateway
    Frontend -.->|POST /launch (Loopback ${DAEMON_HOST}:${PORT_DAEMON})| Daemon

    %% Conexões do Gateway
    Gateway -->|HTTP Proxy + Header X-User-Id| Auth
    Gateway -->|HTTP Proxy + Header X-User-Id| Store
    Gateway -->|HTTP Proxy + Header X-User-Id| Library
    Gateway -->|HTTP Proxy & WS Passthrough| Social
    Gateway -->|HTTP Proxy + Header X-User-Id| Market
    Gateway -->|HTTP Proxy + Header X-User-Id| UGC

    %% Comunicação Inter-serviços (Sagas & Contratos)
    Store -->|Saga: Débito na Carteira| Auth
    Store -->|Saga: Concessão de Licença| Library
    Store -->|Extrato Financeiro best-effort| Market
    Store -->|Disparo de Atividade game_purchased| Social

    Market -->|Validação & Trava de Itens| Auth
    Market -->|Transferência de Custódia de Itens| Auth
    Market -->|Saga: Transferência de Saldo de Carteira| Auth

    Library -->|Disparo de Status (Playing/Online)| Social
    Library -->|Disparo de Atividade achievement_unlocked| Social
    Library -->|Eventos de Notificação Push| Social

    %% Execução Nativa
    Daemon -->|Dispara subprocesso em nova janela de console| GamesNativos
    Daemon -->|Dispara wrapper de telemetria| GamesImportados
    GamesNativos -->|mist_sdk.py: Telemetria HTTP| Library
    GamesImportados -->|mist_sdk.py: Telemetria HTTP| Library
```

---

## 2. Distinção Arquitetural dos Jogos no MIST

Um dos pilares da arquitetura do MIST é a diferenciação clara entre os **jogos nativos da plataforma** e os **jogos comerciais importados**:

### 2.1. Jogos Nativos do MIST Studios (`MIST Forca`, `MIST Labirinto`, `MIST Quiz`)
- **Natureza:** Jogos interativos de terminal/console ASCII desenvolvidos em Python puro.
- **Dependências:** Utilizam **exclusivamente a biblioteca padrão do Python** (`stdlib-only`, zero dependências externas ou `pip install`), permitindo execução imediata em qualquer ambiente com Python instalado.
- **Funcionamento:** São aplicações 100% jogáveis. O jogador interage diretamente no console (ex: adivinhando letras na Forca, movendo o personagem no Labirinto com W/A/S/D ou respondendo perguntas no Quiz).
- **Integração:** Importam o `mist_sdk.py`, lêem o `session.json` injetado pelo Daemon e disparam pings de tempo de jogo e desbloqueio real de conquistas conforme o progresso do jogador.

### 2.2. Jogos Comerciais / Importados da Steam (`Control Resonant`, `Cyberpunk 2077`, `Baldur's Gate 3`, `Elden Ring`, etc.)
- **Natureza:** Executáveis/scripts wrappers em Python leves que simulam o ciclo de vida do jogo no ecossistema MIST.
- **Motivação Arquitetural:** Permitem que o sistema ofereça a experiência completa de uma loja de grande porte (catálogo comercial, compras, horas jogadas na biblioteca, conquistas, drops de cartas e reputação) sem exigir que o computador do aluno/avaliador tenha placas de vídeo dedicadas ou os binários proprietários de dezenas de gigabytes instalados.
- **Funcionamento:** Quando o usuário clica em "Jogar", o MIST Daemon executa o wrapper, que mantém a sessão ativa, envia heartbeats para o `library-service`, simula a obtenção de conquistas e gera drops probabilísticos de cartas colecionáveis.

---

## 3. Microsserviços e Responsabilidades

### 3.1. API Gateway (`/gateway`, Porta `${PORT_GATEWAY}`)
- **Ponto Único de Entrada:** Interface unificada para a SPA React.
- **Segurança de Identidade:** Valida os tokens JWT emitidos pelo `auth-service`, remove cabeçalhos `X-User-Id` forjados por clientes externos e injeta os headers de identidade confiáveis `X-User-Id` e `X-User-Username` para os microsserviços downstream.
- **Tunelamento WebSocket:** Proxy bidirecional para `/ws/chat/{room_id}`, `/ws/group/{group_id}/chat`, `/ws/presence` e `/ws/notifications`.
- **Busca Global Agregada:** Endpoint `GET /api/search?q={query}` que faz fan-out assíncrono para os serviços de usuários, grupos, mercado e catálogo.
- **Roteamento de Avaliações Globais:** Encaminhamento de `/api/system-reviews` para o serviço de avaliações do sistema.

### 3.2. Auth Service (`/services/auth-service`, Porta `${PORT_AUTH}`)
- **Banco de Dados:** `auth.db` (SQLite).
- **Autenticação:** Cadastro de usuários com hashing `bcrypt` e login JWT com algoritmo `${JWT_ALGORITHM}` e chave `${JWT_SECRET_KEY}`.
- **Carteira Virtual:** Crédito inicial de bônus e endpoint de recarga instantânea direta (`POST /me/wallet/recharge`).
- **Gestão de Perfil:** Atualização de nome de usuário, nome real, bio, localização e foto de perfil (`PATCH /me/profile`), com suporte a upload de imagem local ou seleção de avatares comprados.
- **Inventário do Usuário:** Modelo `InventoryItem` que centraliza avatares, molduras animadas, planos de fundo, emoticons, cartas e insígnias.
- **Gamificação e Níveis:** Cálculo do XP total e do nível do usuário com base no crafting de insígnias ($Level = \lfloor\sqrt{\text{total\_xp}/100}\rfloor$).
- **Privacidade Granular:** Configurações de visibilidade (`PATCH /me/privacy`) para jogos, conquistas, inventário e horas jogadas.

### 3.3. Store Service (`/services/store-service`, Porta `${PORT_STORE}`)
- **Banco de Dados:** `store.db` (SQLite).
- **Catálogo:** Listagem com busca, ordenação, categorias e paginação (5, 10, 15, 25, 50 itens).
- **Wishlist:** Adição/remoção dinâmica de jogos da lista de desejos.
- **Avaliações de Jogos:** Formulário de avaliação por jogo (exige posse na biblioteca), score de aprovação percentual, contagem de horas jogadas e votos de utilidade.
- **Reviews da Plataforma MIST:** Tabela `system_reviews` registrando data, hora, nome de usuário logado e texto com limite estrito de 500 caracteres para auditoria de satisfação da plataforma.
- **Orquestração de Checkout (Saga Pattern):** Débito na carteira (`auth-service`) → Concessão de licença (`library-service`) → Registro no extrato (`market-service`). Em caso de falha em qualquer etapa, a Saga executa o estorno financeiro automático de 100% do valor (Rollback).
- **Empacotamento de Download:** Geração dinâmica de arquivos `.zip` com `game.py`, `mist_sdk.py` e `session.json`.
- **MIST AI Curator:** Vitrines inteligentes "Recomendado para Você", "Top Vendidos da Semana", "Em Alta" e "Alertas de Desconto da Wishlist".

### 3.4. Library Service (`/services/library-service`, Porta `${PORT_LIBRARY}`)
- **Banco de Dados:** `library.db` (SQLite).
- **Gestão de Licenças:** Registro e verificação de jogos adquiridos (`LibraryItem`).
- **Telemetria de Sessões:** Endpoints `/session/start`, `/session/ping` (acumula minutos jogados) e `/session/end`.
- **Conquistas e Troféus:** Desbloqueio relacional de troféus, notificações toast douradas, modal de detalhes com raridades (comum, rara, épica, lendária) e geração de troféus dinâmicos pelo **MIST Quest Master**.
- **Trading Cards Drop:** Algoritmo probabilístico de drop de cartas a cada heartbeat (ping) de sessão.

### 3.5. Social Service (`/services/social-service`, Porta `${PORT_SOCIAL}`)
- **Banco de Dados:** `social.db` (SQLite).
- **Amizades:** Pedidos bilaterais com controle de estado (`pending`, `accepted`), solicitações pendentes e remoção.
- **Chat 1:1 WebSocket:** Canal `/ws/chat/{room_id}` com histórico de mensagens, indicador de digitação e parser de emoticons cosméticos inline.
- **Presença em Tempo Real:** Canal `/ws/presence` informando estados (*Online*, *Jogando [Jogo]*, *Ausente*, *Offline*).
- **Grupos e Fórum:** Criação de grupos de comunidade, lista de membros, fórum de discussões (tópicos e respostas) e salas de chat de grupo WebSocket (`/ws/group/{id}/chat`).
- **Notificações Push:** Gestão de notificações em tempo real via WebSocket (`/ws/notifications`) para conquistas, amizades, vendas e trades.
- **MIST Companion Bot:** Contato de inteligência artificial integrado diretamente na lista de amigos.

### 3.6. Market Service (`/services/market-service`, Porta `${PORT_MARKET}`)
- **Banco de Dados:** `market.db` (SQLite).
- **Extrato da Carteira:** Modelo `WalletTransaction` e endpoint `GET /wallet/history` para auditoria financeira detalhada.
- **Mercado da Comunidade:** Anúncio de itens em R$ (`POST /market/list`), listagem pública (`GET /market/listings`), compra com Saga financeira compensatória e transferência automática de custódia, e cancelamento de anúncios ativos.
- **Trocas Diretas (Trade Offers):** Proposta de troca de itens entre amigos (`POST /trades/offer`), aceite (`POST /trades/{id}/accept`) com trava de segurança atômica dos itens dos dois lados, e recusa.

### 3.7. UGC Service (`/services/ugc-service`, Porta `${PORT_UGC}`)
- **Banco de Dados:** `ugc.db` (SQLite).
- **Showcase de Capturas de Tela:** Upload manual ou via SDK Python (`take_screenshot()`), galeria com lightbox e curtidas de comunidade.
- **Workshop de Conteúdo:** Upload de mods e skins para jogos, busca por tags, filtro por popularidade, contagem de downloads e subscrições.

### 3.8. MIST Local Daemon (`runner/mist_daemon.py`, Porta `${PORT_DAEMON}`)
- **Servidor HTTP Local:** Executado em `${DAEMON_HOST}:${PORT_DAEMON}` na máquina do usuário (`iniciar_mist_daemon.bat`).
- **Superação de Sandbox:** Ouve chamadas `POST /launch` da interface web, prepara o diretório local `~/.mist/installed/<game_id>/`, escreve o `session.json` com o token ativo do usuário e dispara o jogo em uma nova janela de terminal nativa (`subprocess.Popen` com `CREATE_NEW_CONSOLE`).

---

## 4. Arquitetura do MIST SDK (`mist_sdk.py`)

O **MIST SDK** é a biblioteca de integração incluída nos pacotes de todos os jogos:

1. **Stdlib-Only:** Desenvolvido estritamente em Python nativo (`urllib.request`, `threading`, `json`, `os`), dispensando qualquer dependência de terceiros.
2. **Ciclo de Vida Automático:**
   - Ao chamar `mist_sdk.start_session()`, lê o `session.json`, faz autenticação com a API e inicia uma `Thread` em background para enviar heartbeats (pings) a cada 60 segundos.
   - Ao chamar `mist_sdk.unlock_achievement(id)`, envia a notificação imediata para o `library-service`, que aciona o toast no frontend e avalia o drop de cartas colecionáveis.
3. **Resiliência Offline:** Se a conexão de rede oscilar ou o servidor estiver indisponível, o SDK captura as exceções e mantém a execução do jogo fluida sem interrupções.

---

## 5. Garantia de Qualidade e Pirâmide de Testes

A integridade do projeto é mantida através de uma pirâmide de testes completa:
- **Pytest:** Testes unitários e de integração de todos os 6 microsserviços e do API Gateway.
- **Vitest:** Testes unitários de componentes, contexto e páginas React no frontend.
- **Playwright:** Suíte de testes E2E validando navegação, cadastro, compra e interações na SPA.
- **Runner Adapter:** Script de automação (`runner_adapter.py`) com rastreamento formal em `TESTS.md` e gravação em `resultados.json`.

---

## 6. Topologia de Implantação e Infraestrutura (Local vs VPS/Home-Server)

O ecossistema MIST suporta duas abordagens de infraestrutura, ambas orientadas a isolamento de rede e proteção rigorosa de dados sensíveis:

```mermaid
graph TD
    subgraph Nuvem_Edge ["Borda & Ingress Seguro (Cloudflare Zero Trust)"]
        ClienteWAN["Usuário / Internet Externa\n${DOMAIN_URL}"] -->|HTTPS / TLS| CloudflareEdge["Cloudflare Edge Network"]
        CloudflareEdge -->|Túnel L7 Criptografado| TunnelDaemon["mist-cloudflared (:tunnel run)\nToken: ${TUNNEL_TOKEN}"]
    end

    subgraph Host_Server ["VPS ou Home-Server / CasaOS"]
        TunnelDaemon -->|Rede Interna Docker (${MIST_NETWORK})| NginxFrontend["mist-frontend (Nginx :80)\nBind local: ${DAEMON_HOST}:${PORT_FRONTEND}:80"]
        NginxFrontend -->|Proxy /api/ & /ws/| GatewayContainer["mist-gateway (FastAPI :${PORT_GATEWAY})"]
        
        GatewayContainer --> AuthContainer["mist-auth-service (:${PORT_AUTH})"]
        GatewayContainer --> StoreContainer["mist-store-service (:${PORT_STORE})"]
        GatewayContainer --> LibraryContainer["mist-library-service (:${PORT_LIBRARY})"]
        GatewayContainer --> SocialContainer["mist-social-service (:${PORT_SOCIAL})"]
        GatewayContainer --> MarketContainer["mist-market-service (:${PORT_MARKET})"]
        GatewayContainer --> UGCContainer["mist-ugc-service (:${PORT_UGC})"]

        WatchtowerContainer["mist-watchtower\nPoll: ${WATCHTOWER_POLL_INTERVAL}s"] -.->|Auto-update de imagens| GHCR["GitHub Packages (GHCR)\nghcr.io/gmoncks/topicosiv/*:latest"]
    end
```

### 6.1. Modo de Desenvolvimento Local
- Os serviços executam nativamente via ambiente virtual Python (`.venv`) ou via `docker-compose.yml`.
- A porta da interface web é ligada exclusivamente ao loopback local `${DAEMON_HOST}:${PORT_FRONTEND}`, mantendo os serviços inacessíveis externamente sem autenticação e túnel.
- As portas dos microsserviços internos operam na rede `${MIST_NETWORK}`, sem exposição aberta na WAN.

### 6.2. Modo de Produção em VPS / Home-Server (CasaOS)
- **Imagens GHCR:** Todas as imagens Docker (`mist-frontend`, `mist-gateway`, `mist-auth-service`, `mist-store-service`, `mist-library-service`, `mist-social-service`, `mist-market-service`, `mist-ugc-service`) são compiladas e publicadas automaticamente pelo GitHub Actions no GitHub Container Registry.
- **Cloudflare Tunnel (Zero Trust):** O container `cloudflared` conecta-se à borda da Cloudflare utilizando o `${TUNNEL_TOKEN}` injetado em tempo de execução via `${ENVIRONMENT_FILE}`. Isso elimina completamente o redirecionamento de portas (port forwarding) e abertura de portas no roteador doméstico ou firewall da VPS.
- **Continuous Deployment com Watchtower:** O container `mist-watchtower` monitora periodicamente novas versões no registro de containers e atualiza o cluster de forma transparente e resiliente.
- **Persistência de Dados Segura:** Os bancos de dados SQLite e dados estáticos residem em volumes Docker nomeados (`auth_data`, `store_data`, `library_data`, `social_data`, `market_data`, `ugc_data`), garantindo integridade dos dados durante reinicializações e atualizações de containers.
- **Controle de Origens e Políticas de Segurança:** Os cabeçalhos de segurança e CORS são controlados pela variável `${CORS_ORIGINS}`, restringindo o consumo da API unicamente às URLs autorizadas da plataforma.
