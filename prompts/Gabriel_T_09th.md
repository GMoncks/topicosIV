# Registro de Prompts e Modificações — Gabriel Torres (09/10/2026)

## Prompt
"Você completou essa tarefa anterior? Se sim, onde está o relatório?"

## Decisões Arquiteturais e Técnicas
1. **Auditoria e Diagnóstico das Execuções E2E Anteriores:**
   - Diagnosticado que chamadas de polling periódicas do frontend em background (`getRecentAchievements` e `getLevelProgress`) em `App.tsx` disparavam requisições com tokens simulados que, por ausência de interceptação no helper central do Playwright (`frontend/e2e/helpers.ts`), tomavam HTTP 401 do Gateway real.
   - Esse 401 disparava o evento `SESSION_EXPIRED_EVENT`, que por sua vez abria a modal `AuthModal` cobrindo a interface e gerando falhas por timeout em cascata nos testes.
2. **Blindagem dos Mocks E2E e Ajuste de Resiliência:**
   - Em `frontend/e2e/helpers.ts`, adicionadas rotas padrões de mock para `**/api/library/achievements/recent*` e `**/api/cards/level-progress*`.
   - Em `frontend/e2e/store.spec.ts`, corrigido o teste `E2E-REV-01` com mock dinâmico da listagem e do payload `text` de avaliação.
3. **Execução Completa via qa_tester & Homologação:**
   - Todos os 42 cenários automatizados em Playwright foram executados e validados cross-browser (Chromium e Firefox), obtendo **100% de taxa de aprovação** (`PASS`).
   - Resultados gravados atomicamente em `resultados.json`.

## Resumo das Saídas e Modificações
- Modificados:
  - `frontend/e2e/helpers.ts` (Adicionadas interceptações de rotas de background para estabilização de sessão nos testes E2E)
  - `frontend/e2e/store.spec.ts` (Ajustado mock dinâmico e formato de payload para submissão e renderização de review)
  - `resultados.json` (Consolidada a execução com 42/42 testes automatizados aprovados com sucesso)
  - `prompts/Gabriel_T_09th.md` (Registro perpétuo do dia 09/10/2026)

---

## Prompt
"Leia o arquivo "C:\Users\Gabriel Torres\Downloads\SECURITY-REVIEW-mist.biomimetics.com.br.md", que representa algumas falhas de segurança que um colega encontrou no sistema.
Com base nessas falhas, planeje os ajustes necessários no MIST"

## Decisões Arquiteturais e Técnicas
1. **Auditoria e Mapeamento Completo das Falhas do Relatório Externo:**
   - Analisadas todas as 12 vulnerabilidades identificadas contra o ambiente de produção `https://mist.biomimetics.com.br/`.
   - **F1 (Crítica - Library Writes Não Autenticadas):** Identificado que o Gateway só exigia autenticação para `path.startswith("my-games")`, deixando rotas como `/session/start`, `/session/ping` e `/achievements/unlock` expostas sem JWT, confiando no `user_id` enviado no body do cliente. Decidido exigir autenticação centralizada no Gateway e rejeitar `user_id` de origem externa nos microsserviços.
   - **F11 (Alta - Exposição de PII e Carteira no `/api/search`):** Identificado que `/users/search` devolvia o schema completo `UserProfileResponse` contendo `email`, `wallet_balance`, `points_balance` e `total_xp`. Decidida a criação do schema público `UserPublicSearchResponse`, restrição de tamanho mínimo de busca e sanitização na saída.
   - **F2 (Média/Alta - Download de Pacotes sem Autorização):** Decidido exigir JWT no download de pacotes de jogos no Gateway e validar a posse prévia do jogo via `library-service`, além de vincular o token real do usuário no `session.json`.
   - **F3 & F9 (Média/Baixa - Rate Limiting & Política de Senhas):** Proposta de implementação de Rate Limiting por IP/usuário no Gateway em `/api/auth/login` e `/register`, além de validação reforçada de senhas no `auth-service`.
   - **F4, F5, F7, F8 (Média/Baixa - Headers HTTP, SPA Soft-404, Nginx & DNS):** Proposta de inclusão de middleware global injetando cabeçalhos de segurança (CSP, HSTS, XFO, XCTO, Referrer, PermsPol), endurecimento do `nginx.conf` do frontend para arquivos estáticos e guia de registro CAA para Cloudflare.
   - **F6 & F12 (Baixa/Preventiva - Overflow de Inteiros e Path Traversal):** Limitação de intervalo de IDs para 64 bits/SQLite, tratamento global de `OverflowError` e validação estrita com `Path.resolve().parents` nos uploads do `ugc-service`.
2. **Elaboração do Plano de Implementação:**
   - Criado artefato formal `implementation_plan.md` estruturado por componentes e camadas arquiteturais, com plano de verificação cobrindo testes unitários, integração e replicação dos exploits relatados.

## Resumo das Saídas e Modificações
- Gerados/Atualizados:
  - `implementation_plan.md` (Plano de mitigação estruturado cobrindo F1, F11, F2, F3, F4, F5, F6, F7, F8, F9, F10 e F12)
  - `prompts/Gabriel_T_09th.md` (Registro do prompt e decisões técnicas)

---

## Prompt
"Revise o planejamento com os comentários feitos"

## Decisões Arquiteturais e Técnicas
1. **Rate Limiting Estrito por Dia para Criação de Contas:**
   - Ajustada a estratégia de limitação do endpoint de registro (`POST /api/auth/register`) para **5 cadastros por dia por IP** (em vez de janela por minuto), inibindo ataques massivos automatizados e criação descontrolada de contas de teste ou spam.
   - O login mantém proteção combinada: janela rápida de 10 tentativas por minuto contra brute-force e limite de 50 tentativas por dia por IP/conta contra credential stuffing contínuo.
2. **Enriquecimento Seguro do Schema Público de Busca (`UserPublicSearchResponse`):**
   - Incorporados os campos solicitados pelo usuário: `level` (nível do jogador), `games_count` (quantidade de jogos) e `friends_count` (quantidade de amigos).
   - **Blindagem contra novos exploits:** Os campos são inteiros imutáveis computados exclusivamente pelo servidor (agregados numéricos seguros). PIIs e dados sensíveis da conta (`email`, `wallet_balance`, `points_balance`, `total_xp`) continuam totalmente banidos da resposta pública, anulando o vetor de ataque F11.
3. **Garantia de Execução Offline e Online dos Pacotes de Jogos:**
   - Assegurado que o download de jogos empacotará o token JWT válido e real do usuário no `session.json`, mantendo compatibilidade total com os launchers (`jogar.bat`, `jogar.sh`) e jogos Python (`game.py`).
   - Mantida a resiliência offline do `mist_sdk.py`, permitindo jogar mesmo sem conexão com a internet.

## Resumo das Saídas e Modificações
- Gerados/Atualizados:
  - `implementation_plan.md` (Revisão incorporando rate limit diário, schema enriquecido e blindado, e garantia dos pacotes de jogos)
  - `prompts/Gabriel_T_09th.md` (Registro perpétuo do prompt e decisões técnicas)

---

## Prompt
"Pode implementar"

## Decisões Arquiteturais e Técnicas
1. **Hardening e Autenticação Mandatória no Gateway e Library Service (F1 & F2):**
   - No Gateway (`gateway/app/main.py`), a rota de proxy da biblioteca passou a exigir token JWT válido obrigatoriamente para todas as requisições de sessão, conquistas, missões e escrita. Injeta `X-User-Id` validado no upstream e descarta qualquer spoofing externo.
   - Nas rotas de download de jogos (`proxy_games` e `proxy_store`), exigido JWT válido, retornando 401 se não autenticado.
   - No `library-service` (`services/library-service/app/api/routes.py`), sessões (`start`, `ping`, `end`), conquistas (`unlock`) e missões (`claim`) priorizam estritamente o `X-User-Id` injetado pelo Gateway e não aceitam sobreposição indevida do cliente.
   - No `store-service` (`services/store-service/app/api/routes.py`), exigido `X-User-Id` obrigatório em `download_game_package`, gerando o pacote `session.json` com o token e dados reais do usuário logado.
2. **Privacidade e Proteção de Dados PII na Busca Global (F11):**
   - Criado `UserPublicSearchResponse` em `services/auth-service/app/schemas/user.py` expondo apenas `id`, `username`, `display_name`, `avatar_url`, `avatar_frame_url`, `bio`, `created_at`, e agregados seguros `level`, `games_count` e `friends_count`.
   - Campos confidenciais (`email`, `wallet_balance`, `points_balance`, `total_xp`) foram totalmente suprimidos do schema e sanitizados defensivamente também no fan-out do Gateway (`fetch_users`).
3. **Rate Limiting em Memória no Gateway (F3):**
   - Implementado limitador com janela móvel para `POST /api/auth/register` (máximo 5 cadastros/dia por IP) e `POST /api/auth/login` (máximo 10 tentativas/minuto e 50 tentativas/dia por IP), respondendo com `HTTP 429 Too Many Requests` e cabeçalho `Retry-After`.
4. **Headers HTTP de Segurança e Soft-404 (F4, F5, F7):**
   - Injetados cabeçalhos de segurança (HSTS, CSP, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy) via middleware global do Gateway e no Nginx (`frontend/nginx.conf`).
   - Criados `frontend/public/robots.txt` e `frontend/public/favicon.svg` e configurado o Nginx para retornar 404 em assets estáticos inexistentes em vez de fallback 200 no SPA.
5. **Resiliência Numérica, Validação de Senha e Path Traversal (F6, F8, F9, F12):**
   - Adicionado handler global no Gateway para `OverflowError` (inteiros > 64 bits), retornando JSON 404.
   - Adicionada verificação de senhas fracas comuns no validador de registro.
   - Adicionada verificação de caminho canônico (`Path(UPLOADS_DIR).resolve()`) em `services/ugc-service/app/api/screenshots.py`.
   - Criada documentação de registros DNS CAA em `docs/security_hardening_dns.md`.
6. **Homologação e Testes:**
   - 100% de aprovação em todas as suítes de testes automatizados (`gateway`: 24/24, `store-service`: 91/91, `library-service`: 23/23, `ugc-service`: 16/16, `auth-service`: 44/44).

## Resumo das Saídas e Modificações
- Modificados:
  - `gateway/app/main.py` (Rate Limiting, headers de segurança, bloqueio de download/library anônimos, sanitização de busca e handler de overflow)
  - `gateway/tests/test_gateway.py` (Adicionados testes para headers, rate limit e bloqueios 401)
  - `services/auth-service/app/schemas/user.py` (Criado `UserPublicSearchResponse` e bloqueio de senhas fracas)
  - `services/auth-service/app/api/routes.py` (Busca pública segura retornando apenas campos seguros)
  - `services/auth-service/tests/test_search.py` (Atualizado para validar ausência de email/wallet e presença de level/games/friends)
  - `services/library-service/app/api/routes.py` (Resolução estrita de identidade autenticada nas rotas de sessão e conquistas)
  - `services/store-service/app/api/routes.py` (Exigência de autenticação para download de pacotes de jogos)
  - `services/store-service/tests/test_download.py` (Adicionado teste de bloqueio 401 sem autenticação)
  - `services/ugc-service/app/api/screenshots.py` (Defesa canônica contra path traversal)
  - `frontend/nginx.conf` (Headers de segurança, bloqueio de arquivos ocultos e correção de soft-404)
- Criados:
  - `frontend/public/robots.txt`
  - `frontend/public/favicon.svg`
  - `docs/security_hardening_dns.md`
  - `walkthrough.md`
  - `prompts/Gabriel_T_09th.md` (Registro consolidado de prompts)



