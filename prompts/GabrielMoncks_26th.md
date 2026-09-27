# Registro de Prompts — GabrielMoncks (26th)

Arquivo diário de rastreamento de prompts e decisões técnicas para a sessão do desenvolvedor **GabrielMoncks** (Trilha 1 — Dev 1) no dia **26**.

---

## 2026-09-26 — Prompt 1

**Prompt do usuário:**

> Eu sou o desenvolvedor da Trilha 1 de desenvolvimento, descrito no development_schedule.md . Por onde eu começo? Grill me

**Decisões arquiteturais e técnicas:**

1. **Validação do usuário ativo (regra do AGENTS.md):** SO = `GGmon`, git = `GabrielMoncks`, arquivo existente = `gabriel-T800_26th.md`. Usuário confirmado pelo desenvolvedor: **GabrielMoncks** (novo arquivo de log criado).
2. **Conflito de ordem T × L-01:** o extrato (Bloco T, Dia 5) depende do `market-service`, que só nasce em L-01 (Dia 6), e o saldo real vive no `auth-service` (Dev 2). Decisão: **antecipar o esqueleto de L-01** (FastAPI, Dockerfile, `market.db`, docker-compose) logo após o Bloco H.
3. **H-03 e `Game.review_score`:** a coluna já existe. Decisão: **calcular a aprovação dinamicamente** a partir dos Reviews reais (`approval_pct` e rótulo no `GET /games/{id}`), mantendo a coluna apenas como fallback do seed.
4. **H-02 e falha do library-service:** decisão de **falhar fechado (503)** quando a posse do jogo ou o `playtime_at_review` não puderem ser confirmados.

**Resumo das saídas:**

- Nenhuma alteração de código. Leitura de `development_schedule.md`, `services/store-service`, `services/auth-service`, `gateway/` e `docker-compose.yml`.
- Criado este arquivo de registro.

---

## 2026-09-26 — Prompt 2

**Prompt do usuário:**

> Primeiro vamos implementar, testar e commitar o L-01 (branch gm-l-01), visto que precisa estar pronto para eu começar (Certo? Confirme esta informação) e precisa estar na branch do desenvolvedor 2. grill me.

**Decisões arquiteturais e técnicas:**

1. **Premissa verificada:** o Bloco H (reviews) vive no `store-service` e **não depende** de L-01. L-01 só é pré-requisito do Bloco T e do restante do Bloco L. O cronograma também não exige L-01 na branch do Dev 2: quem depende do esqueleto do `market-service` é o Dev 3 (R-04 e rotas do Gateway). Dev 2 apenas hospeda `/inventory/lock` e `/inventory/transfer`, chamados pelo `market-service`.
2. Nenhum código implementado neste prompt; o questionário de escopo (entrega, gateway, ordem) foi interrompido pelo usuário.

**Resumo das saídas:** análise de dependências; nenhuma alteração de código.

---

## 2026-09-26 — Prompt 3

**Prompt do usuário:**

> Como você corrigiu, vamos começar por H

**Decisões arquiteturais e técnicas:**

1. **Ordem:** Bloco H (Reviews) primeiro; L-01 antecipado fica para antes do Bloco T.
2. **Branch:** `gm-game-reviews` (escolha do desenvolvedor, fora da convenção `feature/dev1-*`).
3. **Autenticação:** padrão `X-User-Id` injetado pelo Gateway (igual ao `wishlist`).
4. **`playtime_at_review`:** estender `GET /library/users/{id}/has-game/{game_id}` com `playtime_minutes` (aditivo e retrocompatível). Uma única chamada resolve posse e horas.
5. **Duplicidade:** índice único `(user_id, game_id)`; `POST` faz upsert (201 ao criar, 200 ao atualizar).
6. **"Mais úteis":** tabela `ReviewVote` e `POST /reviews/{id}/helpful`, com `helpful_count` na listagem.
7. **Falha do library-service:** falhar fechado (503). **`review_score`:** aprovação calculada dinamicamente dos reviews reais.

**Resumo das saídas (H-01, H-02, H-03 — backend concluído; H-04/H-05 frontend pendentes):**

- `services/store-service/app/models/review.py`: modelos `Review` (índice único `user_id+game_id`) e `ReviewVote`.
- `services/store-service/app/schemas/review.py`: `ReviewCreate` (texto 1–2000 caracteres, sem branco), `ReviewResponse`, `ReviewHelpfulResponse`, `ReviewSummary`.
- `services/store-service/app/services/review_service.py`: validação de posse/horas via library-service (403 sem posse, 503 se indisponível), upsert com tratamento de corrida, listagem `recent|helpful`, voto idempotente, aprovação percentual e rótulos (95/80/70/40/20).
- `services/store-service/app/api/routes.py`: `POST/GET /games/{id}/reviews`, `POST /reviews/{id}/helpful`; `GET /games/{id}` agora traz `reviews_count`, `positive_count`, `approval_pct`, `approval_label`.
- `services/library-service`: `has-game` passou a devolver `playtime_minutes` (aditivo). **Avisar o Dev 2**, pois o arquivo pertence ao serviço dele.
- Testes: 38 novos em `store-service/tests/test_reviews.py` e 1 em `library-service/tests/test_ownership.py`, todos passando.
- Regressão: a suíte completa tem 8 falhas (`test_download.py`, `test_sdk_and_games.py`, `test_sessions.py`), **idênticas na `dev` sem as mudanças** (verificado em worktree limpo).
- `docs/architecture.md` atualizado. Nada commitado ainda.

---

## 2026-09-27 — Prompt 4

**Prompt do usuário:**

> Primeiro junte o arquivo 27th no arquivo de prompts 26th

**Decisões arquiteturais e técnicas:**

1. O relógio virou o dia (2026-09-27) no meio da sessão contínua do Bloco H, e a regra do `AGENTS.md` levou à criação automática de `prompts/GabrielMoncks_27th.md`. O usuário pediu explicitamente para consolidar de volta em um único arquivo (`_26th.md`), já que a sessão de trabalho é a mesma.
2. Decisão: mesclar o conteúdo de `GabrielMoncks_27th.md` neste arquivo (nesta entrada) e remover o arquivo do dia 27, mantendo o registro incremental em `GabrielMoncks_26th.md`. Próxima virada real de dia (nova sessão) volta a seguir a regra padrão e cria `GabrielMoncks_28th.md` (ou o dia então vigente).

**Resumo das saídas:**

- `prompts/GabrielMoncks_27th.md` removido; seu conteúdo (nota de continuidade, sem prompts novos) incorporado aqui.

---

## 2026-09-27 — Prompt 5

**Prompt do usuário:**

> Pode continuar com o H-04 e 5. Tudo vai ser commitado na mesma branch

**Decisões arquiteturais e técnicas:**

1. Confirmado: frontend do Bloco H (`ReviewFormModal.tsx`, `ReviewsList.tsx`) será implementado e commitado junto com o backend já pronto, tudo na branch `gm-game-reviews`.

**Resumo das saídas (H-04, H-05 — frontend concluído; Bloco H 100% concluído):**

1. **Decisões técnicas adicionais durante a implementação:**
   - `UserProfile` (tipos compartilhados) ganhou o campo `id: number`, populado em `mapAuthUserToProfile` a partir de `AuthUserResponse.id`. Necessário para identificar "minha avaliação" na UI (esconder autovoto, pré-preencher edição). Mudança aditiva; `App.tsx` (`defaultGuestUser`) e demais literais ajustados.
   - `reviewApi` no client chama `POST/GET /api/store/games/{id}/reviews` (não `/api/games/...`), pois o proxy dedicado `/api/games/*` no Gateway só repassa `GET/OPTIONS`; o proxy genérico `/api/store/*` aceita todos os métodos.
   - `currentUserId` passado como prop explícita ao `GameDetailModal` (via `Store.tsx` → `user?.id`), em vez de `useAuth()` interno, para não exigir `AuthProvider` nos testes existentes do componente.
   - Fluxo de eventos: `ReviewFormModal` dispara `mist:review-submitted` (padrão já usado por `mist:wishlist-updated`/`mist:toast`); `ReviewsList` escuta e recarrega, evitando prop-drilling entre os dois modais.
   - Corrigido bug de bubbling: o backdrop do `ReviewFormModal` (aninhado dentro do backdrop do `GameDetailModal`) precisou de `stopPropagation` explícito para não fechar a modal de detalhes ao clicar dentro do formulário de avaliação.

2. **Arquivos criados:**
   - `frontend/src/components/ReviewFormModal.tsx` (H-04): recomendação Sim/Não, texto (1–2000 caracteres), badge de horas jogadas, cria ou edita a avaliação existente.
   - `frontend/src/components/ReviewsList.tsx` (H-05): lista dentro do `GameDetailModal`, abas "Mais recentes"/"Mais úteis", voto útil, badge "Sua avaliação".
   - Testes: `ReviewFormModal.test.tsx` (6 casos) e `ReviewsList.test.tsx` (8 casos).

3. **Arquivos modificados:**
   - `frontend/src/api/client.ts`: `reviewApi` (`listReviews`, `submitReview`, `markHelpful`), `GameDetailApiResponse` estendida com `reviews_count`, `positive_count`, `approval_pct`, `approval_label`.
   - `frontend/src/types/index.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/App.tsx`: campo `id` em `UserProfile`.
   - `frontend/src/pages/Store.tsx`: prop `currentUserId` repassada ao `GameDetailModal`.
   - `frontend/src/components/GameDetailModal.tsx`: seção "Avaliações" (botão escrever/editar quando `isOwned`, `ReviewsList`), card de "Detalhes" agora mostra `Aprovação` (`approval_label`) e contagem de avaliações no lugar do antigo `review_score` bruto; `ReviewFormModal` renderizada condicionalmente.
   - `frontend/src/components/GameDetailModal.test.tsx`: mock de `reviewApi`, novos campos no fixture, 2 testes novos (sem avaliações / aprovação + abertura do formulário).

4. **Validação:**
   - `npx vitest run`: **68 testes, 16 suítes, todos passando** (frontend completo).
   - `npx tsc --noEmit`: build TypeScript sem erros.
   - Backend: suíte completa reexecutada, mesmas 8 falhas pré-existentes de antes (não-regressão).

**Bloco H (Reviews de Jogos) está 100% concluído** (H-01 a H-05) na branch `gm-game-reviews`, pronto para commit.

---

## 2026-09-27 — Prompt 6

**Prompt do usuário:**

> Execute o projeto para eu ver como ficou

**Decisões arquiteturais e técnicas:**

1. Modo nativo (sem Docker) escolhido: `uvicorn` para os 4 microsserviços + gateway, `npm run dev` para o frontend — mais rápido para hot-reload do que rebuild de imagens Docker.
2. Smoke test end-to-end via `curl` pelo Gateway: registro, checkout de jogo gratuito, bloqueio de review sem posse (403), criação de review, recálculo de aprovação, voto útil idempotente, bloqueio de autovoto (403). Todos os comportamentos esperados confirmados.
3. Demonstração visual via `claude-in-chrome`: login com conta de teste dedicada (`demo_bloco_h_5955`) — **não** usei a credencial salva do Chrome para `gabriel_moncks` (senha autopreenchida pelo navegador), por não ser uma credencial de teste criada nesta sessão. Fluxo completo validado na UI real: compra → botão "Escrever avaliação" aparece só após posse → publicação → badge "Sua avaliação" → botão vira "Editar avaliação".
4. Entrei e saí do modo de planejamento (Plan Mode) sem pedido do usuário no meio da demo — engano da ferramenta, sem impacto; usuário confirmou "foi engano" e a sessão retomou do ponto exato onde parou.

**Resumo das saídas:** nenhuma alteração de código; 5 microsserviços + frontend rodando nativamente em background; smoke test de API e demonstração de UI completos e bem-sucedidos.

---

## 2026-09-27 — Prompt 7

**Prompt do usuário:**

> Pode fazer o merge da branch atual na dev

**Decisões arquiteturais e técnicas:**

1. `dev` era ancestral direto de `gm-game-reviews` (sem divergência) → merge por fast-forward, sem conflitos.
2. Só local: **não** houve `git push` (ação outward-facing, avisada e não solicitada ainda).

**Resumo das saídas:** `dev` avançada de `fd9d9a5` para `91ad979` (fast-forward). Branch `gm-game-reviews` mantida (redundante, não apagada).

---

## 2026-09-27 — Prompt 8

**Prompt do usuário:**

> O L-01 bloqueia as minhas tarefas (dev 1)?

**Decisões arquiteturais e técnicas:**

1. Análise de dependência confirmada: dos 15 tickets restantes da Trilha 1 (T-01 a T-04, L-02 a L-11), **todos** dependem do esqueleto do `market-service` criado pelo L-01 — seja por viverem literalmente dentro do serviço (Bloco L), seja pela decisão já tomada de mover `WalletTransaction`/`wallet_ledger.py` para lá (Bloco T). Apenas o Bloco H (já concluído) era independente.

**Resumo das saídas:** nenhuma alteração de código; resposta de análise.

---

## 2026-09-27 — Prompt 9

**Prompt do usuário:**

> Ok, crie uma branch para o L-01 especificamente e vamos começar ele antes de continuar nas minha tarefaz

(seguido de correção do usuário: "Agora que me toquei, o L-01 é minha responsabilidade, não de outro dev. Pode criar uma branch com o nome relacionado ao bloco como foi para o bloco H.")

**Decisões arquiteturais e técnicas:**

1. Branch `gm-market-service` criada a partir de `dev`, seguindo o mesmo estilo descritivo usado em `gm-game-reviews` (em vez de um nome curto tipo `gm-l-01`).
2. Escopo do L-01 em aberto (pergunta interrompida na sessão do dia 26): se a branch deve ou não tocar `gateway/app/main.py` (mantido pelo Dev 3 pela governança do projeto) — a ser resolvido antes de codificar.

**Resumo das saídas:** branch criada; implementação ainda não iniciada.

**Decisões de escopo confirmadas com o usuário:**
- Gateway: apenas `MARKET_SERVICE_URL` em `gateway/app/config.py` + `docker-compose.yml` (aditivo, mesmo padrão dos outros 4 serviços). **Não** mexer em `gateway/app/main.py` (rotas de proxy ficam para o Dev 3/ticket futuro), respeitando a governança de isolamento de rotas.
- Porta do `market-service`: **8005** (próxima disponível após 8000-8004).

**Implementação do L-01 (esqueleto do market-service):**

1. **Arquivos criados** (`services/market-service/`):
   - `app/config.py`: só `ENVIRONMENT` por ora — nenhuma URL de serviço especulativa; serão adicionadas quando algum ticket realmente as consumir (L-03, L-05).
   - `app/db/database.py`: padrão idêntico ao `library-service` (SQLite dedicado `market.db`, `get_db`, `init_db` vazio — modelos entram nos próximos tickets).
   - `app/api/routes.py`: só `GET /health`.
   - `app/main.py`: FastAPI + CORS + lifespan (`init_db`), mesmo padrão dos demais serviços.
   - `Dockerfile`, `requirements.txt` (incluindo `httpx`, já antecipando L-03/L-05).
   - `tests/test_health.py`: health check + CORS.
2. **Arquivos modificados:**
   - `pyproject.toml`: `services/market-service` em `testpaths` e `pythonpath`.
   - `docker-compose.yml`: novo serviço `market-service` (porta 8005, volume `market_data`), `MARKET_SERVICE_URL` e dependência adicionados ao `gateway`.
   - `.env.example`: `MARKET_SERVICE_PORT`, `MARKET_SERVICE_URL`, `MARKET_DATABASE_URL`.
   - `gateway/app/config.py`: `MARKET_SERVICE_URL` (comentário explícito de que a rota de proxy ainda não existe em `main.py`).
   - `docs/architecture.md` (nova seção §2.6) e `README.md` (tabela de testes + detalhamento de módulos): documentam o serviço como esqueleto.

3. **Achado importante — falha nova na suíte completa (não é bug meu, mas registro por transparência):**
   - Rodar a suíte inteira (`pytest`) nesta branch expõe consistentemente (3/3 execuções) uma 9ª falha pré-existente: `services/social-service/tests/test_social.py::test_list_friends_with_presence_and_profiles`, ausente na `dev` limpa (verificado 3x em worktree).
   - **Causa raiz** (não é do `market-service`): `PresenceManager` (`services/social-service/app/services/presence_manager.py`) é um singleton em memória. O teste anterior no mesmo arquivo (`test_presence_status_update_playing`) fecha um WebSocket ao sair do `with client.websocket_connect(...)`, disparando `disconnect()` → marca o usuário como `offline` de forma assíncrona. Esse processamento pode vazar para o teste seguinte (`test_list_friends_with_presence_and_profiles`, mesmo `user_id=2`), sobrescrevendo `"playing"` para `"offline"` entre o `POST /presence/status` e o `GET /friends` do teste seguinte — uma corrida de teste pré-existente, apenas nunca exposta antes porque o tempo total de coleta/execução da suíte não empurrava o timing o suficiente. Adicionar os testes do `market-service` (mais um arquivo/serviço na coleção do pytest) mudou esse timing o suficiente para expor a corrida de forma determinística neste ambiente.
   - **Não alterei** `social-service` (fora do escopo do L-01 e da minha trilha). Recomendo avisar o Dev 3.
   - Backend: 9 falhas agora vs. 8 na `dev` (as 8 originais + esta), todas fora do `market-service`. Novos testes do L-01 (`market-service` + `gateway`): 9/9 passando.

**Bloco L-01 concluído**, pronto para commit na branch `gm-market-service`.

---

## 2026-09-27 — Prompt 10

**Prompt do usuário:**

> Dá merge dessa branch na dev, depois vamos para o bloco T

**Decisões arquiteturais e técnicas:**

1. Merge local `gm-market-service` → `dev` por fast-forward (sem divergência prévia).
2. **Achado crítico durante o merge:** `git fetch` revelou que `origin/dev` havia recebido 2 commits novos (`9bbef39`, `7f4256d` — PR #106 "base_AI_agents") enquanto eu trabalhava, divergindo da `dev` local a partir do mesmo ponto-base (`fd9d9a5`). O outro lado implementou G-02 a G-06 (AI Curator no Store, Quest Master no Library, Companion Bot no Social) e ajustes de UI no `Store.tsx`, tocando arquivos compartilhados com o meu Bloco H (`GameDetailModal.tsx`, `Store.tsx`, `types/index.ts`, `store-service/app/api/routes.py`, `library-service/app/api/routes.py` e `library_service.py`).
3. **Não fiz push** antes de avisar — parei e expliquei o risco de conflito ao usuário antes de prosseguir.

**Resumo das saídas:** relatório de divergência apresentado ao usuário; aguardando decisão sobre como sincronizar.

---

## 2026-09-27 — Prompt 11

**Prompt do usuário:**

> Pode fazer o 1, visto que o historico de prompts estará presente e voce saberá o que fazer.

(Opção 1 = fazer `git merge origin/dev` na `dev` local agora e resolver conflitos que aparecerem.)

**Decisões arquiteturais e técnicas:**

1. Antes de mesclar, li `prompts/gabriel-T800_26th.md` em `origin/dev` (Prompts 49–54, sob o usuário `gabriel-T800`) para entender a intenção por trás das mudanças e resolver eventuais conflitos com contexto real, não apenas "ours"/"theirs" às cegas.
2. Executado `git merge origin/dev --no-edit` em `dev`. **Resultado: merge 100% automático (estratégia `ort`), zero conflitos.** As grandes diferenças que pareciam arriscadas (`GameDetailModal.tsx`, `types/index.ts`, etc.) eram apenas porque `origin/dev` não tinha os commits do Bloco H — o merge de 3 vias confirmou que nenhuma região de código foi editada por ambos os lados nos mesmos pontos.
3. Verificação pós-merge: reviews + aprovação (Bloco H) e Curator/Quests/Companion Bot (G-02 a G-06) coexistem sem conflito em todos os arquivos compartilhados (`store-service/app/api/routes.py`, `library-service/app/api/routes.py`, `Store.tsx`, `types/index.ts`).

**Resumo das saídas:**

- Commit de merge `f8f5007` (`Merge remote-tracking branch 'origin/dev' into dev`), sem edições manuais de conflito (não houve nenhum).
- Backend: suíte completa com exatamente as mesmas 9 falhas de antes (as 8 pré-existentes + a corrida de teste do `social-service` já diagnosticada) — nenhuma falha nova introduzida pelo merge.
- Frontend: **75/75 testes passando** (18 suítes, incluindo `CuratorSection`, `Store.test.tsx`, `ChatWindow`, `Social`, e os componentes do Bloco H). `tsc --noEmit` sem erros.
- `dev` local segue **não publicada** em `origin/dev` (nenhum `push` realizado).

---

## 2026-09-27 — Prompt 12

**Prompt do usuário:**

> Cria uma nova e continua de lá

**Decisões arquiteturais e técnicas:**

1. Branch `gm-wallet-history` criada a partir da `dev` (já com Bloco H + L-01 + merge do PR #106), seguindo o padrão descritivo (`gm-game-reviews`, `gm-market-service`).
2. Início do Bloco T (Histórico de Transações da Carteira): T-01 (`WalletTransaction`), T-02 (`wallet_ledger.py`), T-03 (`GET /wallet/history`) no `market-service`; T-04 (`WalletHistoryModal.tsx`) no frontend.

**Resumo das saídas:** branch criada; implementação a seguir.

**Decisões de escopo confirmadas com o usuário antes de codificar:**
- Direção crédito/débito por tipo: `compra` = débito; `venda`, `recarga`, `resgate` = crédito.
- Checkout do `store-service` liga ao ledger **agora** (chamada best-effort/fire-and-forget, mesmo padrão do evento `game_purchased` para o `social-service`: exceção é engolida, não derruba a compra).
- **Bloqueio real encontrado ao chegar no T-04:** o Gateway não tinha rota de proxy para `/api/market/*` (decisão do L-01, quando não havia nada a expor). Perguntei de novo, já que agora existe um endpoint real e útil — decisão: **adicionar a rota agora**, mesmo padrão genérico de `/api/store/*`. Segue mantido: nenhuma mudança na lógica de auth do Gateway além disso.

**Implementação do Bloco T (T-01 a T-04):**

1. **Backend (`services/market-service/`):**
   - `app/models/transaction.py`: `WalletTransaction` + constantes `TRANSACTION_TYPES`/`CREDIT_TYPES`/`DEBIT_TYPES`.
   - `app/schemas/wallet.py`: `WalletTransactionCreate` (valida tipo e valor > 0), `WalletTransactionResponse` (com `direction` derivado), `WalletHistoryResponse`.
   - `app/services/wallet_ledger.py`: `record_transaction` (não move saldo real, só audita) e `get_history` (filtro por tipo/período, paginação).
   - `app/api/wallet.py`: `POST /wallet/transactions` (interno, sem `X-User-Id` — mesmo padrão do `POST /users/{id}/wallet/debit` do auth-service) e `GET /wallet/history` (autenticado via `X-User-Id`).
2. **Integração real no `store-service`:** `execute_checkout` agora chama `POST /wallet/transactions` no market-service após um checkout pago (pulado para jogos gratuitos, `amount` teria que ser positivo). `MARKET_SERVICE_URL` adicionada ao `config.py`.
3. **Gateway:** nova rota `/api/market/{path}` em `gateway/app/main.py`, idêntica ao padrão `proxy_store`.
4. **Achado colateral corrigido:** `docker-compose.yml` do `store-service` não tinha `SOCIAL_SERVICE_URL` configurada, apesar do código já usá-la para o evento `game_purchased` — em produção/Docker isso cairia no fallback `localhost:8004`, errado dentro da rede do container. Corrigido de passagem (mesmo bloco que eu já estava editando para adicionar `MARKET_SERVICE_URL`).
5. **Frontend:**
   - `frontend/src/api/client.ts`: `walletApi.getHistory`, tipos `WalletTransactionApiResponse`/`WalletHistoryApiResponse`.
   - `frontend/src/components/WalletHistoryModal.tsx` (T-04): extrato paginado, filtro por tipo (abas), sinal/cor por direção.
   - `frontend/src/components/Header.tsx`: saldo da carteira virou botão — abre o extrato se autenticado, ou a tela de login se visitante.
6. **Testes:** 23 no `market-service` (health + wallet), 3 novos no `store-service` (integração checkout→ledger, incluindo best-effort em falha), 2 novos no gateway (proxy + fallback 503), 10 novos no frontend (`WalletHistoryModal`, `Header`).
7. **Débito de documentação quitado:** notei que o projeto mantém um catálogo detalhado de casos de teste em `TESTS.md` (convenção já usada desde antes do Bloco H, inclusive pelo trabalho de IA do PR #106) que eu **não** vinha alimentando. Adicionei entradas retroativas para H-01 a H-05 (`STORE-UNIT-07..10`, `LIB-UNIT-06`) e as novas do L-01/Bloco T (`MARKET-UNIT-01..03`, `GATEWAY-INT-04`, `STORE-MARKET-INT-01`, `FRONT-UNIT-24..26`).
8. **Validação final:** backend com as mesmas 9 falhas pré-existentes (nenhuma nova); frontend **85/85 testes** (20 suítes); `tsc --noEmit` limpo.

**Bloco T (Histórico de Transações da Carteira) concluído (T-01 a T-04)**, pronto para commit na branch `gm-wallet-history`.
