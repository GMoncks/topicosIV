# MIST — Arquitetura de Microsserviços e Sistema

O **MIST** é uma prova de conceito avançada que recria a infraestrutura e os fluxos essenciais da Steam utilizando uma arquitetura orientada a microsserviços, mensageria em tempo real, execução nativa de jogos em console e inteligência artificial aplicada.

---

## 1. Visão Geral da Arquitetura

O sistema é composto por um **API Gateway**, 4 **Microsserviços de Domínio** independentes, uma aplicação **Frontend SPA**, um **Daemon Local de Execução** e **Jogos Nativos**, orquestrados via Docker Compose ou executados nativamente no host.

```mermaid
graph TD
    subgraph Cliente ["Cliente / Interface Web"]
        Frontend["Frontend SPA (React 18 + TS + Vite)\n:5173"]
    end

    subgraph Roteamento ["Borda & Roteamento"]
        Gateway["API Gateway (FastAPI)\n:8000\n- Validação centralizada de JWT\n- Proxy reverso HTTP e WebSockets"]
    end

    subgraph Microsservicos ["Ecossistema de Microsserviços"]
        Auth["Auth Service (:8001)\nSQLite: auth.db\n- Carteira Virtual (R$ 200)\n- Perfis & Tokens JWT"]
        Store["Store Service (:8002)\nSQLite: store.db\n- Catálogo, Wishlist & Carrinho\n- Orquestrador Saga de Checkout\n- Empacotador de Jogos (.zip)"]
        Library["Library Service (:8003)\nSQLite: library.db\n- Posse e Concessão de Jogos\n- Sessões & Telemetria Playtime\n- Catálogo e Desbloqueio de Troféus"]
        Social["Social Service (:8004)\nSQLite: social.db\n- Chat WebSockets (/ws/chat)\n- Presença WebSockets (/ws/presence)\n- Feed Agregador de Atividades"]
    end

    subgraph ExecucaoNativa ["Execução Nativa no SO Host"]
        Daemon["MIST Local Daemon (:39090)\nrunner/mist_daemon.py\n- Supera sandbox do browser\n- Descompacta e prepara session.json"]
        Game["Jogo Nativo em Console\n(MIST Forca, Labirinto, Quiz)\n- mist_sdk.py (stdlib-only)\n- Sessões, pings e troféus"]
    end

    %% Conexões do Frontend
    Frontend -->|HTTP REST /api/*| Gateway
    Frontend -->|WebSockets /ws/chat e /ws/presence| Gateway
    Frontend -.->|POST /launch (Loopback 127.0.0.1:39090)| Daemon

    %% Conexões do Gateway
    Gateway -->|HTTP Proxy + Header X-User-Id| Auth
    Gateway -->|HTTP Proxy + Header X-User-Id| Store
    Gateway -->|HTTP Proxy + Header X-User-Id| Library
    Gateway -->|HTTP Proxy & WS Passthrough| Social

    %% Comunicação Inter-serviços
    Store -->|1. Débito na Carteira| Auth
    Store -->|2. Concessão de Posse| Library
    Store -->|Saga Rollback: Estorno integral em falha| Auth
    Store -->|3. Disparo de Atividade game_purchased| Social

    Library -->|Disparo de Presença (playing/online)| Social
    Library -->|Disparo de Atividade achievement_unlocked| Social

    %% Execução Nativa
    Daemon -->|Dispara subprocesso em nova janela| Game
    Game -->|Telemetria HTTP direta via mist_sdk.py| Library
```

---

## 2. Microsserviços e Responsabilidades

### 2.1. API Gateway (`/gateway`, Porta `8000`)
- **Ponto Único de Entrada:** Recebe todas as conexões da SPA web.
- **Validação de Segurança:** Valida o JWT emitido pelo Auth Service, elimina headers forjados de clientes externos e injeta headers seguros (`X-User-Id`, `X-User-Role`) para os microsserviços downstream.
- **Proxy WebSocket:** Tunelamento bidirecional assíncrono para os canais de chat e presença do Social Service.

### 2.2. Auth Service (`/services/auth-service`, Porta `8001`)
- **Banco de Dados:** `auth.db` (SQLite).
- **Contas de Usuário:** Registro com requisitos estritos de segurança, hash seguro de senhas (bcrypt) e login com JWT.
- **Carteira Virtual (MIST Wallet):**
  - Todo novo cadastro recebe bônus inicial de **R$ 200,00**.
  - Operações atômicas de débito (`POST /users/{id}/wallet/debit`), crédito compensatório (`POST /users/{id}/wallet/credit`) e extrato.
- **Perfis:** Endpoint `GET /users/{id}` para resolução rápida de nomes e avatares nos outros serviços.

### 2.3. Store Service (`/services/store-service`, Porta `8002`)
- **Banco de Dados:** `store.db` (SQLite).
- **Catálogo:** Listagem, filtros por preço/categoria, paginação sob demanda e detalhes de jogos.
- **Wishlist:** Adição e remoção suave sem recarregamento ou flickering visual.
- **Orquestração de Checkout (Saga Pattern):**
  - Suporte a checkout unitário e multi-jogo (carrinho de compras).
  - Verificação prévia de posse no `library-service` (previne compras duplicadas).
  - Débito na carteira do `auth-service`.
  - Concessão de licença no `library-service`.
  - **Saga Compensation:** Se a concessão falhar, o serviço estorna automaticamente 100% do valor para a carteira e retorna HTTP 502.
  - Limpeza automática de itens adquiridos da wishlist.
  - Disparo de evento de atividade `game_purchased` para o feed do `social-service`.
- **Distribuição de Jogos:** Gera pacotes dinâmicos em `.zip` contendo o executável Python, o `mist_sdk.py` e o arquivo de contexto `session.json`.

### 2.4. Library Service (`/services/library-service`, Porta `8003`)
- **Banco de Dados:** `library.db` (SQLite).
- **Gestão de Posse:** Consulta e concessão de jogos por usuário (`LibraryItem`).
- **Ciclo de Vida de Sessões (E-04):**
  - `POST /session/start`: Abre sessão e despacha status *"Jogando [Jogo]"* para o Social Service.
  - `POST /session/ping`: Heartbeat a cada 60s acumulando playtime (`playtime_minutes`).
  - `POST /session/end`: Encerra a sessão e restaura status *"Online"* no Social Service.
- **Conquistas e Troféus:**
  - Persistência relacional em `user_achievements`.
  - Desbloqueio via `POST /achievements/unlock` (disparado pelo `mist_sdk.py` durante o jogo).
  - Polling de conquistas recentes (`GET /achievements/recent`) com disparo de notificação Toast dourada no frontend.

### 2.5. Social Service (`/services/social-service`, Porta `8004`)
- **Banco de Dados:** `social.db` (SQLite).
- **Amizades:** Pedidos bilaterais com controle de estados (`pending`, `accepted`).
- **Chat em Tempo Real (F-03 & F-07):**
  - Canal WebSocket `WS /ws/chat/{room_id}` gerenciado pelo `ChatConnectionManager`.
  - Suporte a mensagens de texto e indicador animado de digitação (*typing indicator*).
  - Endpoints REST para histórico (`GET /chat/{room_id}/messages`) e leitura (`POST /chat/{room_id}/read`).
- **Presença em Tempo Real (F-04, F-05 & F-08):**
  - Canal WebSocket `WS /ws/presence` gerenciado pelo `PresenceManager`.
  - Snapshot de amigos conectados no handshake inicial.
  - Broadcast instantâneo de transições de status (*Jogando [Título]*, *Online*, *Ausente*, *Offline*).
- **Feed de Atividades (F-06):**
  - Endpoint `GET /feed` consolidando conquistas, compras de jogos e progressão.

---

## 3. Arquitetura de Execução Local de Jogos (MIST Daemon)

Como navegadores operam sob políticas rígidas de *sandbox*, a execução de jogos na máquina do usuário é viabilizada pelo **MIST Local Daemon**:

```
[ Frontend SPA (Browser) ]
           │
           │ 1. Usuário clica em "Jogar"
           │    POST http://127.0.0.1:39090/launch
           ▼
[ MIST Local Daemon (runner/mist_daemon.py) ]
           │
           │ 2. Cria ~/.mist/installed/<slug>/
           │ 3. Copia game.py e mist_sdk.py
           │ 4. Grava session.json com token ativo
           │ 5. subprocess.Popen(CREATE_NEW_CONSOLE)
           ▼
[ Console Nativo do Sistema Operacional ]
   Abre nova janela com o jogo (ex: MIST Quiz)
   O mist_sdk.py envia telemetria e conquistas via HTTP
```

### Características do MIST SDK:
- Desenvolvido exclusivamente com a **biblioteca padrão do Python (`urllib.request`, `threading`, `json`)**.
- Totalmente resiliente a falhas de rede: se o servidor estiver offline, o jogo não trava nem fecha, operando em modo offline gracioso.

---

## 4. Agentes de IA Integrados ao Ecossistema

| Agente | Serviço | Função |
| :--- | :--- | :--- |
| **MIST Curator & Recommender** | `store-service` | Vitrines personalizadas e análise de perfil combinando biblioteca e histórico. |
| **MIST Dynamic Quest Master** | `library-service` | Desafios semanais dinâmicos e troféus comemorativos. |
| **MIST Chatbot / NPC Companion** | `social-service` | Bot de suporte e estatísticas acessível diretamente pela lista de amigos. |

---

## 5. Estratégia de QA e Pirâmide de Testes

O projeto adota uma matriz de testes catalogada em [`TESTS.md`](../TESTS.md) e normalizada atomicamente em [`resultados.json`](../resultados.json):

1. **Unitários:**
   - Backend (`pytest`): regras de negócio, hashing de senhas, validações de modelo, SDK.
   - Frontend (`vitest`): renderização de cards, modais, contexto de carrinho, WebSocket mocks.
2. **Integração:**
   - Comunicação síncrona HTTP entre serviços (Saga checkout, sessões de jogo, feed de compras).
   - Comunicação assíncrona WebSockets (chat e presença).
3. **E2E / Sistema Completo (`playwright`):**
   - Fluxos ponta a ponta no navegador (registro, navegação na loja, alternância de telas).
4. **Regressão:**
   - Casos originados de bugs resolvidos (ex: suporte a R$ 0,00 para jogos gratuitos e preservação de tema).
