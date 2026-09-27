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
