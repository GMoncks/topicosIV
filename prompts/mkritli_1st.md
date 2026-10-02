# Registro de Prompts — mkritli (1st)

Arquivo diário de rastreamento de prompts e decisões técnicas para a sessão do desenvolvedor **mkritli** (Trilha 3 — Dev 3: Social, UGC, Notificações e Gateway) no dia **01 de Outubro**.

---

## 2026-10-01 — Prompt 1

**Prompt do usuário:**

> para todos os dados q vc populou, crie um seed q ira subir sempre q o projeto subir do zero em outra maquina

**Decisões arquiteturais e técnicas:**

1. **Mudança de Dia Operacional (Mandatório por `AGENTS.md` e `GEMINI.md`):**
   - Transição do dia 30 de Setembro (`mkritli_30th.md`) para 01 de Outubro (`mkritli_1st.md`).
   - Criação do novo arquivo de rastreamento mantendo a continuidade do usuário ativo `mkritli`.

2. **Arquitetura de Seeds Nativos Descentralizados (Microsserviços Autocontidos):**
   - Em conformidade com o padrão arquitetural de isolamento de dados do MIST (onde cada microsserviço possui seu próprio banco SQLite e volume de dados persistente no Docker), os seeds foram descentralizados e integrados nativamente ao evento de ciclo de vida (`lifespan`) de inicialização de cada serviço:
     - `auth-service`: Módulo `app/db/seed_users.py` adicionado ao `lifespan`, populando os 6 usuários de teste ricos (`mkritli`, `gabriel_t800`, `sarah_connor`, `lucas_speed`, `elena_rpg`, `novato_mist`) com senhas hash bcrypt (`Password@123`), saldos de carteira, níveis e pontos MIST, executando de forma estritamente idempotente.
     - `store-service`: Módulo `app/db/seed_purchases.py` adicionado ao `lifespan`, populando compras concluídas (`purchases`) e itens da lista de desejos (`wishlists`) de cada usuário, preservando o `seed_games` existente para os 25 jogos.
     - `library-service`: Módulo `app/db/seed_library.py` adicionado ao `lifespan`, populando a posse de jogos (`library_items`) com playtimes realistas, status instalado e jogos não iniciados (0 min), preservando o `seed_achievements`.
     - `market-service`: Módulo `app/db/seed_market.py` adicionado ao `lifespan`, populando as transações financeiras no extrato da carteira (`wallet_transactions`) e os anúncios de itens colecionáveis no Mercado da Comunidade (`market_listings`).
     - `social-service`: Já possui `seed_social.py` ativo no `lifespan`, garantindo amizades, mensagens de chat, feed e notificações ricas.
     - `ugc-service`: Módulo `app/db/seed_ugc.py` adicionado ao `lifespan`, semeando as 10 capturas de tela comunitárias (`Screenshot`, `ScreenshotLike`) e os 10 itens da Oficina (`WorkshopItem`, `WorkshopSubscription`).
3. **Persistência e Versionamento dos Arquivos Físicos de Uploads (`seed_assets`):**
   - Para que mídias não sejam perdidas ao clonar o projeto em uma máquina sem volumes Docker preexistentes (visto que `services/*/app/data/` está no `.gitignore`), foi criado o diretório versionado `services/ugc-service/seed_assets/` contendo as 20 mídias PNG em alta definição (1280x720) e os arquivos compactados de mods.
   - O `seed_ugc.py` copia automaticamente as mídias de `seed_assets/` para `UPLOADS_DIR` caso não existam no volume local, garantindo integridade visual imediata na primeira inicialização.
4. **Idempotência Estrita e Não-Destrutividade:**
   - Todos os seeds verificam previamente a existência de registros ou contadores nas tabelas SQLite antes de qualquer inserção. Modificações feitas posteriormente em runtime pelos usuários ou novos cadastros são 100% preservadas e nunca sobrescritas em restarts subsequentes dos containers.

**Resumo das saídas:**

- Arquivos criados:
  - `prompts/mkritli_1st.md` (Registro diário do novo dia de desenvolvimento 01 de Outubro)
  - `services/auth-service/app/db/seed_users.py` (Seed idempotente dos 6 usuários padrão do MIST)
  - `services/auth-service/tests/test_seed_users.py` (Testes unitários de seed e idempotência)
  - `services/store-service/app/db/seed_purchases.py` (Seed idempotente de compras e wishlist)
  - `services/store-service/tests/test_seed_purchases.py` (Testes unitários de seed de compras)
  - `services/library-service/app/db/seed_library.py` (Seed idempotente de itens da biblioteca com playtimes)
  - `services/library-service/tests/test_seed_library.py` (Testes unitários de seed da biblioteca)
  - `services/market-service/app/db/seed_market.py` (Seed idempotente de extrato da carteira e anúncios)
  - `services/market-service/tests/test_seed_market.py` (Testes unitários de seed de mercado)
  - `services/ugc-service/app/db/seed_ugc.py` (Seed de screenshots, mods e sincronização física de mídias)
  - `services/ugc-service/tests/test_seed_ugc.py` (Testes unitários de seed do UGC)
  - `services/ugc-service/seed_assets/` (Diretório versionado no Git com as 20 mídias PNG em alta definição e arquivos compactados de mods)
- Arquivos modificados:
  - `services/auth-service/app/main.py` (Integração de `seed_users` no `lifespan`)
  - `services/store-service/app/main.py` (Integração de `seed_purchases_and_wishlist` no `lifespan`)
  - `services/library-service/app/main.py` (Integração de `seed_library_items` no `lifespan`)
  - `services/market-service/app/main.py` (Integração de `seed_market_data` no `lifespan`)
  - `services/ugc-service/app/main.py` (Integração de `seed_ugc_data` no `lifespan`)
- Validações e Testes Executados:
  - Teste prático do cenário "subir do zero em outra máquina": execução de `docker compose down -v && docker compose up -d --build` com destruição completa de volumes locais.
  - Verificação de boot automático:
    - 6 usuários ricos semeados no `auth-service` com senhas hash, saldos e pontos.
    - 25 jogos e ofertas promocionais semeados no `store-service`.
    - Checkouts e wishlists semeados e associados no `store-service`.
    - Biblioteca de jogos com playtimes e jogos não iniciados (0 min) semeada no `library-service`.
    - 47 transações no extrato da carteira e 12 anúncios ativos semeados no `market-service`.
    - Amizades, chats, feed e notificações ricas semeados no `social-service`.
    - 10 capturas de tela comunitárias e 10 mods da oficina semeados no `ugc-service`.
    - 20 mídias PNG de alta definição copiadas e servidas com HTTP 200 OK via Gateway e Nginx.
  - Suíte de Testes Automatizados:
    - Backend: **262 testes unitários/integração aprovados** no Pytest (incluindo todos os testes de seeds e idempotência).
    - Frontend: **148 testes aprovados** no Vitest.
    - Total do ecossistema: **410 testes passando 100%**.

---

## 2026-10-01 — Prompt 2

**Prompt do usuário:**

> marque todos os itens q foram concluidos neste chat no arquivo @[development_schedule.md]

**Decisões arquiteturais e técnicas:**

1. **Auditoria e Mapeamento de Entregas da Trilha 3:**
   - Todos os 33 tickets atribuídos ao Desenvolvedor 3 (Social, Comunidade, UGC, Notificações e Gateway) foram implementados, testados (TDD) e integrados com sucesso no decorrer da sessão:
     - **Bloco S (AI Curator Avançado):** Tickets S-01 a S-04 (`ai_trends.py`, `ai_curator.py`, `wishlist_ai.py`, `CuratorSection.tsx`).
     - **Bloco Q (Sistema de Notificações Global):** Tickets Q-01 a Q-06 (`notification.py`, endpoints REST, WebSocket push em tempo real, `NotificationsDropdown.tsx` e redirecionamento contextual).
     - **Bloco M (Grupos, Comunidade e Fórum):** Tickets M-01 a M-06 (`group.py`, `forum.py`, `group_chat.py` WebSocket, `Groups.tsx`).
     - **Bloco R (Busca Global Agregada):** Tickets R-01 a R-05 (agregador assíncrono no Gateway com rotas internas nos microsserviços e `GlobalSearchDropdown.tsx`).
     - **Bloco N (Showcase de Capturas de Tela):** Tickets N-01 a N-06 (`screenshots.py`, `mist_sdk.py`, `ScreenshotsGallery.tsx`, `ScreenshotUploadModal.tsx` e likes).
     - **Bloco O (Workshop de Conteúdo: Mods e Skins):** Tickets O-01 a O-06 (`workshop.py`, `workshop_service.py`, `Workshop.tsx`, `WorkshopUploadModal.tsx`, inscrições, downloads e integração no `Profile.tsx`).
2. **Atualização Formal de Governança em `development_schedule.md`:**
   - Atualizado o cabeçalho do documento de progresso geral para indicar a conclusão dos Blocos M, N, O, Q, R e S (**100% da TRILHA 3 concluída**).
   - Atualizada a Tabela Geral de Blocos (Seção 2) com status `**CONCLUÍDO**` para os 6 blocos sob responsabilidade do Dev 3.
   - Adicionada a coluna explícita `Status` com o valor `**CONCLUÍDO**` em cada uma das tabelas individuais de tickets dos Blocos M, N, O, Q, R e S.

**Resumo das saídas:**

- Arquivos modificados:
  - `development_schedule.md` (Status atualizado no cabeçalho, tabela geral e tabelas detalhadas de tickets da Trilha 3)
  - `prompts/mkritli_1st.md` (Registro deste prompt)

