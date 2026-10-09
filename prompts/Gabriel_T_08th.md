# Registro de Prompts e Atividades - Gabriel_T (Dia 08)

## Prompt
"Desejo fazer algumas modificações no MIST:
- Atualize o arquivo archicture.md e README.md com base nas mudanças mais recentes do sistema, que permite rodar localmente ou via configuração em uma VPS/home-server adequados. Mascare nesses arquivos qualquer referencia às portas, tokens ou demais informações sensíveis. Esses dados devem ser mencionados no estilo constante ${}
- Revise se nenhum dado sensível está sendo mantido fora do .gitignore
- Crie, no rodapé do sistema, uma seção com hiperlinks para uma página de Sobre e para uma página de Reviews do MIST
- Crie uma página de Sobre, no qual consta o README do MIST e um link para o repositório público do GitHub
- Crie uma página de Reviews do MIST, que permite ao usuário (logado) deixar reviews ou feedbacks do sistema. Nessas reviews deve ser registrado a data, hora e nome do usuário logado. Mantenha um limite de até 500 caracteres por review
Planeje tais implementações"

## Decisões Arquiteturais e Técnicas
1. **Documentação e Mascaramento de Segredos (`docs/architecture.md` e `README.md`):**
   - Atualizada a topologia do sistema para documentar a execução tanto local quanto em produção em VPS/Home-Server (CasaOS) com imagens do GitHub Container Registry (`ghcr.io/gmoncks/topicosiv/*`), integração com Watchtower para CD contínuo e exposição de borda via Cloudflare Tunnel Zero Trust sem necessidade de abrir portas na WAN.
   - Mascaradas integralmente todas as referências numéricas a portas (`${PORT_GATEWAY}`, `${PORT_AUTH}`, `${PORT_STORE}`, `${PORT_LIBRARY}`, `${PORT_SOCIAL}`, `${PORT_MARKET}`, `${PORT_UGC}`, `${PORT_FRONTEND}`, `${PORT_DAEMON}`), credenciais/chaves (`${JWT_SECRET_KEY}`, `${TUNNEL_TOKEN}`) e domínios/URLs (`${DOMAIN_URL}`, `${FRONTEND_URL}`, `${CORS_ORIGINS}`).

2. **Auditoria de Segurança e Blindagem do `.gitignore`:**
   - Higienizado o arquivo `deploy_watchtower.txt`, expurgando tokens reais da Cloudflare e chaves criptográficas ativas, substituindo-os pela notação `${...}`.
   - Reforçado o `.gitignore` com proteção contra vazamento de tokens, credenciais e arquivos de sessão (`deploy_watchtower.local.txt`, `*.token`, `*.secret`, `session.json`).
   - Adicionada regra de exceção para que os scripts executáveis dos jogos do MIST Studios e o SDK (`!services/store-service/app/data/games/**` e `!services/store-service/app/data/mist_sdk.py`) sejam versionados e incluídos nos builds Docker sem afetar a exclusão segura de arquivos `.db`.

3. **Backend de Avaliações da Plataforma (`store-service` e API Gateway):**
   - Criado o modelo `SystemReview` em `services/store-service/app/models/system_review.py` e schemas Pydantic em `app/schemas/system_review.py` para armazenar avaliações gerais do MIST com `id`, `user_id`, `username`, `content` (limite estrito de 1 a 500 caracteres), `is_recommended` e `created_at` (UTC).
   - Implementadas rotas `GET /system-reviews` (listagem cronológica reversa) e `POST /system-reviews` (exigência de autenticação e validação de tamanho de texto).
   - Atualizado o API Gateway (`gateway/app/main.py`) para repassar a identidade confiável (`X-User-Id` e `X-User-Username`) e rotear `/api/system-reviews`.
   - Adicionados testes automatizados unitários (`services/store-service/tests/test_system_reviews.py`) validando os 5 cenários principais (sucesso, rejeição 401, rejeição 422 para > 500 caracteres, rejeição 422 para vazio e ordenação).

4. **Componentes e Páginas Frontend (React 18 + TS + Tailwind):**
   - **`Footer.tsx`:** Criado componente de rodapé global contendo marca, aviso acadêmico e hiperlinks para "Sobre o MIST", "Reviews do MIST" e o repositório público do GitHub (`https://github.com/GMoncks/topicosIV`).
   - **`About.tsx`:** Criada página informativa completa reproduzindo o conteúdo e arquitetura do `README.md` com tabelas comparativas funcionais com a Steam, detalhamento de microsserviços, guia de execução/deploy e botão destacado com link para o GitHub.
   - **`Reviews.tsx`:** Criada página com feed de avaliações da comunidade, percentual de aprovação, formulário para usuários autenticados (com contador dinâmico de caracteres `0/500`, controle de recomendação e envio assíncrono) e mensagem para visitantes com atalho de login.
   - **Integração e Rotas (`App.tsx` e `types/index.ts`):** Adicionadas abas `'about'` e `'reviews'` em `NavigationTab`, exportada API `systemReviewsApi` em `client.ts` e conectado o `<Footer />` na base da área principal.
   - **Testes Unitários:** Implementados `Footer.test.tsx`, `About.test.tsx` e `Reviews.test.tsx`, totalizando 209 testes passando sem regressões.

## Resumo das Saídas e Modificações
- Modificados:
  - `docs/architecture.md`
  - `README.md`
  - `.gitignore`
  - `deploy_watchtower.txt`
  - `services/store-service/app/main.py`
  - `services/store-service/app/api/routes.py`
  - `gateway/app/main.py`
  - `frontend/src/types/index.ts`
  - `frontend/src/api/client.ts`
  - `frontend/src/App.tsx`
- Novos Arquivos:
  - `services/store-service/app/models/system_review.py`
  - `services/store-service/app/schemas/system_review.py`
  - `services/store-service/tests/test_system_reviews.py`
  - `frontend/src/components/Footer.tsx`
  - `frontend/src/components/Footer.test.tsx`
  - `frontend/src/pages/About.tsx`
  - `frontend/src/pages/About.test.tsx`
  - `frontend/src/pages/Reviews.tsx`
  - `frontend/src/pages/Reviews.test.tsx`
  - `frontend/e2e/about_reviews.spec.ts`

---

## Prompt (Sessão /qa_writer)
"/qa_writer crie novos testes baseados nesses fluxos de acesso às páginas Sobre e Review e criação de Review no MIST. Pode usar um dos usuários de teste do arquivo usuarios.txt para poder realizar o login"

## Decisões Arquiteturais e Técnicas
1. **Catalogação em TESTS.md seguindo Padrão Estrito:**
   - Adicionada entrada unitária de backend `STORE-UNIT-17` para validação de criação e listagem de reviews do sistema e limites de validação Pydantic.
   - Adicionadas entradas unitárias de frontend `FRONT-UNIT-63` (Footer), `FRONT-UNIT-64` (About) e `FRONT-UNIT-65` (Reviews) cobrindo renderização, links públicos e validação do formulário.
   - Criada nova seção E2E Playwright `### Sobre e Reviews do MIST` com os testes `E2E-ABT-01`, `E2E-SYSREV-01` e `E2E-SYSREV-02`.
   - Utilização do usuário `#1` de `usuarios.txt` (`mkritli` / `mauricio@live.com`) na suíte `E2E-SYSREV-02`.
   - Atualizada a tabela consolidada de testes por runner (`pytest: 120`, `vitest: 76`, `playwright: 41`, totalizando 237 testes).

2. **Implementação e Estabilização dos Testes E2E com Playwright:**
   - Criado `frontend/e2e/about_reviews.spec.ts` com cobertura total para navegação pelo rodapé, verificação de dados institucionais do README e link do GitHub, aviso de login para visitantes e submissão autenticada de review de plataforma pelo usuário `mkritli`.
   - Isolamento e mock de endpoints de background (`/api/library/achievements/recent`, `/api/me/level-progress`, etc.) para garantir execução confiável e livre de 401s tanto no Chromium quanto no Firefox.

## Resumo das Saídas e Modificações
- Modificados:
  - `TESTS.md` (Adicionados `STORE-UNIT-17`, `FRONT-UNIT-63`, `FRONT-UNIT-64`, `FRONT-UNIT-65`, `E2E-ABT-01`, `E2E-SYSREV-01`, `E2E-SYSREV-02` e atualizada tabela de contagem por runner)
- Criados / Atualizados:
  - `frontend/e2e/about_reviews.spec.ts` (100% dos testes aprovados nos navegadores configurados)

---

## Prompt (Correção de Bug de Logout no Perfil & /qa_tester)
"Acabei de encontrar um bug. Considerando que estou na página do perfil e deslogo, a página do perfil é recarregada com o que parece ser um mock do inicio do MIST, conforme anexo. Nesse caso de deslogar, acho que o melhor é que a página seja redirecionada para a loja, mas de qualquer maneira esse mock deve ser removido, se não prejudicar a integridade do sistema e/ou testes criados
Além disso, /qa_tester crie esse teste E2E conforme behave descrito"

## Decisões Arquiteturais e Técnicas
1. **Remoção do Mock Legado Estático (`ggtorres2001`):**
   - Identificado o mock em `defaultGuestUser` em `frontend/src/App.tsx` e o objeto de fallback em `frontend/src/pages/Profile.tsx` contendo dados fixos legados (`ggtorres2001`, nível 7, "Acumulador Adepto", avatar e estatísticas inventadas).
   - Ambos os locais foram saneados para um perfil neutro de visitante (`Visitante`, nível 1, status Offline, saldos e estatísticas zerados, sem badges inventadas).
2. **Redirecionamento Reativo para a Loja ao Deslogar:**
   - Em `frontend/src/App.tsx`, implementado `handleLogout` e `useEffect` que detectam o término da sessão (`!isAuthenticated`) enquanto o usuário está na aba `'profile'`, comutando reativamente `activeTab` para `'store'`.
   - Em `frontend/src/pages/Profile.tsx`, adicionado `useEffect` de guarda que redireciona via `onNavigate('store')` caso a página seja acessada sem usuário autenticado e sem propriedades de usuário.
3. **Validação de Integridade e Regressão Unitária:**
   - Execução de toda a suíte unitária do frontend (`npm --prefix frontend run test:unit`): 40 arquivos de teste e 209 testes aprovados (100% pass).
4. **Criação de Teste E2E e Integração com /qa_tester:**
   - Adicionado teste `E2E-PROF-02` em `frontend/e2e/auth.spec.ts`: navega logado para o perfil, clica em logout na sidebar, valida redirecionamento imediato para a loja e garante que o mock `ggtorres2001` / `Acumulador Adepto` não aparece no DOM.
   - Catalogado `E2E-PROF-02` em `TESTS.md` e atualizada a tabela de contagem (42 testes Playwright, 238 totais).
   - Executado e validado via `.agents/skills/qa_tester/scripts/runner_adapter.py --id "E2E-PROF-02" --origem "validacao"`, persistindo o resultado `pass` atomicamente em `resultados.json`.

## Resumo das Saídas e Modificações
- Modificados:
  - `frontend/src/App.tsx` (Substituição do `defaultGuestUser` por visitante neutro e redirecionamento reativo de `profile` para `store` no logout)
  - `frontend/src/pages/Profile.tsx` (Remoção do mock legado de fallback e redirecionamento automático caso não autenticado)
  - `frontend/e2e/auth.spec.ts` (Implementado teste E2E `E2E-PROF-02`)
  - `TESTS.md` (Catalogado `E2E-PROF-02` e atualizado sumário de testes)
  - `resultados.json` (Resultado atômico registrado via `runner_adapter.py`)
  - `prompts/Gabriel_T_08th.md` (Registro perpétuo mandatório do prompt e modificações)

---

## Prompt (Docker Compose Build e Diagnóstico de Tipagens TypeScript)
"Rode o docker compose up --build e resolva o problema relatado. Parece que faltam alguns itens essenciais para o compose após suas alterações"

## Decisões Arquiteturais e Técnicas
1. **Diagnóstico e Correção de Tipagens TypeScript no Frontend (`Profile.tsx` e `App.tsx`):**
   - Ao rodar `docker compose build`, o estágio de compilação estática (`npm run build` -> `tsc && vite build`) no Dockerfile do frontend apontou erros de tipagem estrita TS2339 no objeto literal de fallback do visitante (`Property 'bio' does not exist on type...` e `Property 'featuredBadge' does not exist on type...`).
   - Declarada explicitamente a tipagem `UserProfile` tanto em `fallbackGuestUser` quanto em `defaultGuestUser`, preenchendo `bio: ''` e `featuredBadge: { title: '', xp: 0, icon: 'fa-user' }`.
2. **Validação do Build Docker e Subida dos Serviços:**
   - Compiladas com sucesso todas as imagens (`topicosiv-frontend`, `topicosiv-gateway`, `topicosiv-auth-service`, `topicosiv-store-service`, `topicosiv-library-service`, `topicosiv-social-service`, `topicosiv-market-service`, `topicosiv-ugc-service`).
   - Subidos todos os containers com `docker compose up -d`, operando na rede interna `mist-network` com a porta 3000 mapeada para `127.0.0.1:3000`.

## Resumo das Saídas e Modificações
- Modificados:
  - `frontend/src/App.tsx` (Tipagem estrita `UserProfile` completa para `defaultGuestUser`)
  - `frontend/src/pages/Profile.tsx` (Declaração explícita de `fallbackGuestUser: UserProfile`)
  - `prompts/Gabriel_T_08th.md` (Registro do prompt e correções realizadas)

---

## Prompt (Correção de Upload de Screenshots — HTTP 413 e Envio Infinito)
"Verifique no fluxo relacionado ao envio de capturas de tela se essa funcionalidade está funcionando. Pelo que testei no localhost, dá erro HTTP 413, mas em produção o arquivo fica enviando ad infinitum"

## Decisões Arquiteturais e Técnicas
1. **Causa do Erro HTTP 413 (Payload Too Large):**
   - O arquivo `frontend/nginx.conf` operava com o valor padrão do Nginx para `client_max_body_size` de apenas 1 MB (`1m`). Screenshots em alta resolução e arquivos da oficina (mods/skins) excediam 1 MB e eram sumariamente bloqueados pelo Nginx com erro 413.
   - Adicionada a diretiva `client_max_body_size 100M;`, `client_body_buffer_size 128k;` e desativado o buffering intermediário com `proxy_request_buffering off;`.
   - No `services/ugc-service/app/services/screenshot_service.py`, alinhado o `MAX_FILE_SIZE` para 15 MB (15728640 bytes) para coincidir com a validação client-side do frontend (`ScreenshotUploadModal.tsx`).
2. **Causa do Envio Infinito ("Ad Infinitum" em Produção):**
   - No `gateway/app/main.py`, o cliente `httpx.AsyncClient` possuía timeout global curto de 15s sem timeout customizado para transferências multipart de arquivos do `proxy_ugc`, ocasionando travamento de socket em conexões de túnel reverso/produção. Ajustado para timeout de 60s no upload.
   - No `frontend/src/api/client.ts`, `fetchApi` não possuía mecanismo de cancelamento por timeout, fazendo com que uma conexão cortada pelo proxy mantivesse a flag `isSubmitting = true` indefinitamente. Adicionado timeout padrão de 60s via `AbortController` e tratamento refinado para erros não-JSON (como 413 ou 504 do Nginx).
3. **Validação:**
   - 16 testes unitários do `ugc-service` (pytest) aprovados com 100% de sucesso.
   - 209 testes unitários do frontend (vitest) aprovados com 100% de sucesso.
   - Imagens do Docker reconstruídas e containers reiniciados via `docker compose up --build -d`.

## Resumo das Saídas e Modificações
- Modificados:
  - `frontend/nginx.conf` (Adicionado `client_max_body_size 100M`, `proxy_request_buffering off` e timeouts estendidos de proxy)
  - `gateway/app/main.py` (Adicionado timeout de 60s em `proxy_ugc` e aumentado timeout global para 30s)
  - `services/ugc-service/app/services/screenshot_service.py` (Alinhado `MAX_FILE_SIZE` para 15 MB)
  - `frontend/src/api/client.ts` (Adicionado timeout de 60s via `AbortController` e mensagens amigáveis para erros 413/502/504)
  - `prompts/Gabriel_T_08th.md` (Registro perpétuo do prompt e correções)

---

## Prompt (Commit e Push na Branch `dev`)
"Ok, pode commitar e fazer push da dev com essas últimas mudanças"

## Decisões Arquiteturais e Técnicas
1. **Auditoria de Arquivos Staged:**
   - Conferido status do Git e integridade dos arquivos mascarados com `${}` (tokens, chaves, senhas e portas).
   - Validadas regras de `.gitignore` para assegurar que nenhum dado sensível ou temporário seja incluído.
2. **Commit e Publicação Remota:**
   - Consolidação atômica de todas as alterações do dia: documentação com mascaramento, páginas Sobre e Reviews com backend dedicado, correção de logout no perfil, resolução do erro 413 em uploads e testes unitários/E2E com `qa_writer` e `qa_tester`.
   - Push executado com sucesso na branch `dev` do repositório remoto.

## Resumo das Saídas e Modificações
- Commit e push realizados na branch `origin/dev`.

