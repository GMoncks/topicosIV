# MIST — Arquitetura de Microsserviços e Sistema

O **MIST** é uma plataforma distribuída orientada a microsserviços que recria a infraestrutura e os fluxos essenciais da Steam, combinando mensageria assíncrona em tempo real, execução de jogos em console nativo, economia descentralizada e agentes de inteligência artificial aplicados.

---

## 1. Visão Geral da Arquitetura

O sistema é composto por um **API Gateway**, 6 **Microsserviços de Domínio** desacoplados, um **MIST Local Daemon**, um **MIST SDK client-side**, uma **Interface Web SPA (React)** e a suíte de **Jogos Nativos e Wrappers**, orquestrados via Docker Compose ou executados nativamente.

```mermaid
graph TD
    subgraph Cliente ["Cliente / Interface Web & Local Host"]
        Frontend["Frontend SPA (React 18 + TS + Vite)\n:5173 / :3000"]
        Daemon["MIST Local Daemon (:39090)\nrunner/mist_daemon.py\n- Supera sandbox do browser\n- Dispara subprocessos no SO host"]
        GamesNativos["Jogos MIST Studios (Terminal ASCII)\n(Forca, Labirinto, Quiz)\n- 100% jogáveis em Python nativo"]
        GamesImportados["Jogos Importados / Comerciais\n(Control, Cyberpunk, BG3, etc.)\n- Wrappers de telemetria via MIST SDK"]
    end

    subgraph Roteamento ["Borda & Roteamento"]
        Gateway["API Gateway (FastAPI)\n:8000\n- Validação centralizada de JWT\n- Proxy reverso HTTP e WebSockets\n- Agregador de Busca Global"]
    end

    subgraph Microsservicos ["Ecossistema de Microsserviços Desacoplados"]
        Auth["Auth Service (:8001)\nSQLite: auth.db\n- Perfis, Avatares, Inventário\n- Carteira Virtual (Simulada)\n- XP, Insígnias & Níveis"]
        Store["Store Service (:8002)\nSQLite: store.db\n- Catálogo, Wishlist & Reviews\n- Orquestrador Saga de Checkout\n- AI Curator & Recommender"]
        Library["Library Service (:8003)\nSQLite: library.db\n- Posse & Licenças de Jogos\n- Sessões & Telemetria Playtime\n- Conquistas & Drops de Cartas"]
        Social["Social Service (:8004)\nSQLite: social.db\n- Amigos & Solicitações Pendentes\n- Chat 1:1 e Grupos (WebSockets)\n- Presença em Tempo Real\n- MIST Companion Bot (IA)"]
        Market["Market Service (:8005)\nSQLite: market.db\n- Mercado da Comunidade (Compra/Venda)\n- Ofertas de Troca Direta (Trades)\n- Extrato Financeiro da Carteira"]
        UGC["UGC Service (:8006)\nSQLite: ugc.db\n- Showcase de Capturas de Tela\n- Workshop de Mods e Skins"]
    end

    %% Conexões do Frontend
    Frontend -->|HTTP REST /api/*| Gateway
    Frontend -->|WebSockets /ws/*| Gateway
    Frontend -.->|POST /launch (Loopback 127.0.0.1:39090)| Daemon

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

### 3.1. API Gateway (`/gateway`, Porta `8000`)
- **Ponto Único de Entrada:** Interface unificada para a SPA React.
- **Segurança de Identidade:** Valida os tokens JWT emitidos pelo `auth-service`, remove cabeçalhos `X-User-Id` forjados por clientes externos e injeta o header de identidade confiável `X-User-Id` para os microsserviços downstream.
- **Tunelamento WebSocket:** Proxy bidirecional para `/ws/chat/{room_id}`, `/ws/group/{group_id}/chat`, `/ws/presence` e `/ws/notifications`.
- **Busca Global Agregada:** Endpoint `GET /api/search?q={query}` que faz fan-out assíncrono para os serviços de usuários, grupos, mercado e catálogo.

### 3.2. Auth Service (`/services/auth-service`, Porta `8001`)
- **Banco de Dados:** `auth.db` (SQLite).
- **Autenticação:** Cadastro de usuários com hashing `bcrypt` e login JWT.
- **Carteira Virtual:** Crédito inicial de bônus (R$ 200,00) e endpoint de recarga instantânea direta (`POST /me/wallet/recharge`).
- **Gestão de Perfil:** Atualização de nome de usuário, nome real, bio, localização e foto de perfil (`PATCH /me/profile`), com suporte a upload de imagem local ou seleção de avatares comprados.
- **Inventário do Usuário:** Modelo `InventoryItem` que centraliza avatares, molduras animadas, planos de fundo, emoticons, cartas e insígnias.
- **Gamificação e Níveis:** Cálculo do XP total e do nível do usuário com base no crafting de insígnias ($Level = \lfloor\sqrt{\text{total\_xp}/100}\rfloor$).
- **Privacidade Granular:** Configurações de visibilidade (`PATCH /me/privacy`) para jogos, conquistas, inventário e horas jogadas.

### 3.3. Store Service (`/services/store-service`, Porta `8002`)
- **Banco de Dados:** `store.db` (SQLite).
- **Catálogo:** Listagem com busca, ordenação, categorias e paginação (5, 10, 15, 25, 50 itens).
- **Wishlist:** Adição/remoção dinâmica de jogos da lista de desejos.
- **Avaliações (Reviews):** Formulário de avaliação por jogo (exige posse na biblioteca), score de aprovação percentual ("Muito Positivo"), contagem de horas jogadas no momento do review e votos de utilidade.
- **Orquestração de Checkout (Saga Pattern):** Débito na carteira (`auth-service`) → Concessão de licença (`library-service`) → Registro no extrato (`market-service`). Em caso de falha em qualquer etapa, a Saga executa o estorno financeiro automático de 100% do valor (Rollback).
- **Empacotamento de Download:** Geração dinâmica de arquivos `.zip` com `game.py`, `mist_sdk.py` e `session.json`.
- **MIST AI Curator:** Vitrines inteligentes "Recomendado para Você", "Top Vendidos da Semana", "Em Alta" e "Alertas de Desconto da Wishlist".

### 3.4. Library Service (`/services/library-service`, Porta `8003`)
- **Banco de Dados:** `library.db` (SQLite).
- **Gestão de Licenças:** Registro e verificação de jogos adquiridos (`LibraryItem`).
- **Telemetria de Sessões:** Endpoints `/session/start`, `/session/ping` (acumula minutos jogados) e `/session/end`.
- **Conquistas e Troféus:** Desbloqueio relacional de troféus, notificações toast douradas, modal de detalhes com raridades (comum, rara, épica, lendária) e geração de troféus dinâmicos pelo **MIST Quest Master**.
- **Trading Cards Drop:** Algoritmo probabilístico de drop de cartas a cada heartbeat (ping) de sessão.

### 3.5. Social Service (`/services/social-service`, Porta `8004`)
- **Banco de Dados:** `social.db` (SQLite).
- **Amizades:** Pedidos bilaterais com controle de estado (`pending`, `accepted`), solicitações pendentes e remoção.
- **Chat 1:1 WebSocket:** Canal `/ws/chat/{room_id}` com histórico de mensagens, indicador de digitação e parser de emoticons cosméticos inline.
- **Presença em Tempo Real:** Canal `/ws/presence` informando estados (*Online*, *Jogando [Jogo]*, *Ausente*, *Offline*).
- **Grupos e Fórum:** Criação de grupos de comunidade, lista de membros, fórum de discussões (tópicos e respostas) e salas de chat de grupo WebSocket (`/ws/group/{id}/chat`).
- **Notificações Push:** Gestão de notificações em tempo real via WebSocket (`/ws/notifications`) para conquistas, amizades, vendas e trades.
- **MIST Companion Bot:** Contato de inteligência artificial integrado diretamente na lista de amigos.

### 3.6. Market Service (`/services/market-service`, Porta `8005`)
- **Banco de Dados:** `market.db` (SQLite).
- **Extrato da Carteira:** Modelo `WalletTransaction` e endpoint `GET /wallet/history` para auditoria financeira detalhada.
- **Mercado da Comunidade:** Anúncio de itens em R$ (`POST /market/list`), listagem pública (`GET /market/listings`), compra com Saga financeira compensatória e transferência automática de custódia, e cancelamento de anúncios ativos.
- **Trocas Diretas (Trade Offers):** Proposta de troca de itens entre amigos (`POST /trades/offer`), aceite (`POST /trades/{id}/accept`) com trava de segurança atômica dos itens dos dois lados, e recusa.

### 3.7. UGC Service (`/services/ugc-service`, Porta `8006`)
- **Banco de Dados:** `ugc.db` (SQLite).
- **Showcase de Capturas de Tela:** Upload manual ou via SDK Python (`take_screenshot()`), galeria com lightbox e curtidas de comunidade.
- **Workshop de Conteúdo:** Upload de mods e skins para jogos, busca por tags, filtro por popularidade, contagem de downloads e subscrições.

### 3.8. MIST Local Daemon (`runner/mist_daemon.py`, Porta `39090`)
- **Servidor HTTP Local:** Executado em `127.0.0.1:39090` na máquina do usuário (`iniciar_mist_daemon.bat`).
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
- **Vitest:** Testes unitários de componentes e contextos React no frontend.
- **Playwright:** Suíte de testes E2E validando navegação, cadastro, compra e interações na SPA.
- **Runner Adapter:** Script de automação (`runner_adapter.py`) com rastreamento formal em `TESTS.md` e gravação em `resultados.json`.
