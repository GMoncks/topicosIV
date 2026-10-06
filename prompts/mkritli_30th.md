# Registro de Prompts — mkritli (30th)

Arquivo diário de rastreamento de prompts e decisões técnicas para a sessão do desenvolvedor **mkritli** (Trilha 3 — Dev 3: Social, UGC, Notificações e Gateway) no dia **30**.

---

## 2026-09-30 — Prompt 1

**Prompt do usuário:**

> criei um plano de execucao e codificacao para a trilha 3 ( @development_schedule) considerando o seguinte:
> * usar metodologia TDD
> * para cada bloco, pausar a codificacao para ser feito testes manuais
> * sempre q houver duvida me pergunte
> * o codigo deve ser desenvolvido todo em 1 dia
> * utilizar os padroes de arquitetura ja estabelecidos, mas caso aja necessidade de alteracao, explicar o pq da modificacao e perguntar se pode seguir em frente com a mudanca.

**Decisões arquiteturais e técnicas:**

1. **Validação do Usuário Ativo (Mandatório por `AGENTS.md` e `GEMINI.md`):**
   - Ambiente operacional identificado com usuário de SO `mkritli`.
   - Consulta interativa realizada e confirmada pelo desenvolvedor para utilização do identificador `mkritli`.
   - Criado o arquivo diário de rastreamento `prompts/mkritli_30th.md`.

2. **Estratégia de Execução em 1 Dia para a Trilha 3 (33 Tickets):**
   - Agrupamento dos 6 blocos em pipeline cronológico sequencial de alta coesão:
     - Bloco 1: AI Curator Avançado (`store-service` / Frontend) — Tickets S-01 a S-04.
     - Bloco 2: Sistema de Notificações Global (`social-service` / Gateway / Frontend) — Tickets Q-01 a Q-06.
     - Bloco 3: Grupos, Comunidade e Fórum (`social-service` / Frontend) — Tickets M-01 a M-06.
     - Bloco 4: Busca Global Agregada (`gateway` / Microsserviços / Frontend) — Tickets R-01 a R-05.
     - Bloco 5: Showcase de Capturas de Tela (`ugc-service` / SDK / Frontend) — Tickets N-01 a N-06.
     - Bloco 6: Workshop de Conteúdo: Mods e Skins (`ugc-service` / Frontend) — Tickets O-01 a O-06.

3. **Arquitetura do Novo Microsserviço `ugc-service`:**
   - Para manter o isolamento arquitetural e de banco de dados (`ugc.db`) definido em `development_schedule.md`, os blocos N (Screenshots) e O (Workshop) serão centralizados em `services/ugc-service/` com FastAPI, Dockerfile, volume dedicado `ugc_data` e porta 8006, sem onerar as conexões e I/O do `social-service`.

4. **Metodologia TDD Estrita e Pausas para Teste Manual:**
   - Ciclo Red-Green-Refactor por ticket antes de qualquer commit/integração.
   - Atualização contínua de [`TESTS.md`](../TESTS.md) com os novos IDs de teste.
   - Parada mandatória ao final de cada um dos 6 blocos para validação humana passo a passo na UI e Swagger.

5. **Resiliência da Busca Global no Gateway:**
   - Uso de `asyncio.gather(*tasks, return_exceptions=True)` com timeout curto para que a indisponibilidade ou rotas ainda em desenvolvimento de outras trilhas (Dev 1 / Dev 2) não quebrem a resposta global do MIST.

**Resumo das saídas:**

- Criado o plano detalhado no artefato de desenvolvimento [`trilha3_execution_plan.md`](../brain/399d9da7-803f-4086-ba86-c66c9ca70d08/trilha3_execution_plan.md).
- Criado este arquivo de rastreamento diário [`prompts/mkritli_30th.md`](./mkritli_30th.md).
- Validado e confirmado o início da execução pelo Bloco 1 (S — AI Curator Avançado).

---

## 2026-09-30 — Prompt 2

**Prompt do usuário:**

> Comece a codificar conforme o planejamento: @[../../../.gemini/antigravity-ide/brain/399d9da7-803f-4086-ba86-c66c9ca70d08/trilha3_execution_plan.md] mais infos no prompt @[prompts/mkritli_30th.md]

**Decisões arquiteturais e técnicas:**

1. **Execução Completa do Bloco 1 (Tickets S-01 a S-04 — AI Curator Avançado):**
   - **Ticket S-01 (`ai_trends.py`):**
     - Criação do algoritmo de `calculate_top_sellers` baseado nas compras com status `completed` em `purchases` com ordenação por popularidade e fallback para catálogo.
     - Criação do algoritmo de `calculate_trending_games` que analisa volume de checkouts recentes (janela parametrizável de 7 dias), `review_score` e desconto percentual para pontuação de tração na loja.
     - Exposição das rotas `GET /store/trends/top-sellers` e `GET /store/trends/trending`.
   - **Ticket S-02 (`ai_curator.py`):**
     - Criação do gerador `generate_contextual_justification` que produz copy em linguagem natural ("Porque você jogou {jogo}, que compartilha {tags}...").
     - Integração com o `StoreService.get_curated_recommendations` para enriquecimento dinâmico das sugestões aos usuários autenticados e visitantes.
   - **Ticket S-03 (`wishlist_ai.py`):**
     - Implementação do algoritmo `get_wishlist_discount_alerts` que cruza os itens na lista de desejos do usuário com o catálogo de descontos ativos, computando economia em R$ e gerando mensagens persuasivas de oportunidade.
     - Exposição da rota autenticada `GET /store/wishlist/alerts`.
   - **Ticket S-04 (Frontend - `CuratorSection.tsx` & `client.ts`):**
     - Adição dos métodos `getTopSellers`, `getTrending` e `getWishlistAlerts` na camada `storeApi`.
     - Atualização do componente visual `CuratorSection.tsx` com seletor interativo de abas ("Para Você", "Top Vendidos", "Em Alta 🔥") com badges temáticos de afinidade, vendas e tendência.
     - Adição do Banner Inteligente de Promoções da Wishlist no topo com destaque visual âmbar, cálculo de desconto, economia e ação direta para compra/dispensa.
   - **Modelos do `store-service`:**
     - Adição dos campos `original_price` (Float) e `discount_percentage` (Integer) no modelo SQLAlchemy `Game` (`services/store-service/app/models/game.py`) com serialização no `to_dict()`.

2. **Ciclo TDD e Cobertura de Testes:**
   - **Backend:** Criado `services/store-service/tests/test_ai_curator_advanced.py` com 7 testes unitários/integração (`STORE-UNIT-11` a `STORE-UNIT-14`). Todos os 7 passaram com sucesso (100% de aprovação no módulo de Curator).
   - **Frontend:** Atualizado `frontend/src/components/CuratorSection.test.tsx` com 4 testes cobrindo alternância de abas e banner inteligente da Wishlist (`FRONT-UNIT-29`). Todos os 4 passaram (102 testes totais da suíte frontend aprovados).
   - **Documentação de Testes:** Atualizado [`TESTS.md`](../TESTS.md) catalogando `STORE-UNIT-11`, `STORE-UNIT-12`, `STORE-UNIT-13`, `STORE-UNIT-14` e `FRONT-UNIT-29`.

3. **Protocolo de Pausa para Teste Manual 1:**
   - Conclusão do Bloco 1 com solicitação de validação humana antes de avançar para o Bloco 2 (Notificações).

**Resumo das saídas:**

- Arquivos criados:
  - `services/store-service/app/services/ai_trends.py`
  - `services/store-service/app/services/ai_curator.py`
  - `services/store-service/app/services/wishlist_ai.py`
  - `services/store-service/tests/test_ai_curator_advanced.py`
- Arquivos modificados:
  - `services/store-service/app/models/game.py`
  - `services/store-service/app/services/store_service.py`
  - `services/store-service/app/api/routes.py`
  - `frontend/src/api/client.ts`
  - `frontend/src/components/CuratorSection.tsx`
  - `frontend/src/components/CuratorSection.test.tsx`
  - `TESTS.md`
  - `prompts/mkritli_30th.md`

---

### Prompt 3

**Entrada do usuário:**
> crie uma lista de usuarios existentes com volume alto de transacoes, checkouts e tempo de jogo para os itens populados, alguns dos jogos deixe como se ainda nao foi iniciado ele e outros como ainda nao adquiridos pelos usuarios, depois esta lista de usuarios coloque num txt no diretorio raiz deste projeto, lembre de popular cada um destes usuarios

**Decisões arquiteturais e técnicas:**
1. **Estrutura e População Multi-Serviço:**
   - Criação do script de automação [`scripts/seed_rich_users.py`](../scripts/seed_rich_users.py) para popular diretamente os bancos de dados SQLite dos 4 microsserviços do ecossistema MIST em execução no Docker:
     - `auth-service` (`users.db`): Criação/atualização de contas com hash seguro `bcrypt` (`Password@123`), saldos de carteira substanciais (R$ 85,00 a R$ 1.250,00) e pontos de fidelidade MIST (500 a 8.200 pts).
     - `store-service` (`store.db`): Registro de 29 compras/checkouts concluídos (`purchases`) com metadados de preços e títulos, e 12 itens na Wishlist.
     - `library-service` (`library.db`): Criação de 29 registros na biblioteca (`library_items`) com diferenciação explícita de perfis:
       - Jogos Hardcore/Muito jogados (playtime de 1.500 min até 14.500 min / ~241 horas).
       - Jogos Casuais/Moderados (45 min a 750 min).
       - Jogos Não Iniciados (playtime = 0 min, `last_played = None`) em conformidade com o pedido.
       - Jogos Não Adquiridos (omissão deliberada na biblioteca, mantendo-os disponíveis para compra/wishlist).
     - `market-service` (`market.db`): Criação de 47 transações financeiras (`wallet_transactions`) com tipos balanceados (`recarga`, `compra`, `venda`) gerando extratos realistas e de alto volume para cada usuário.

2. **Perfis de Usuários Criados:**
   - `mkritli` (`mauricio@live.com`): Veterano Souls/RPG, R$ 450,00 saldo, 6 jogos (Hollow Knight e MIST Forca não iniciados), 11 transações.
   - `gabriel_t800` (`gabriel@mistgames.com`): Trader/Whale, R$ 1.250,00 saldo, 6 jogos (Control Resonant e Fire Emblem não iniciados), 11 transações.
   - `sarah_connor` (`sarah.connor@sky.net`): Fã de Sci-Fi/Terror, R$ 380,00 saldo, 5 jogos (Dawnwalker e MIST Quiz não iniciados), 7 transações.
   - `lucas_speed` (`lucas.speed@speedrun.io`): Speedrunner, R$ 85,00 saldo, 5 jogos (Baldur's Gate 3 não iniciado), 6 transações.
   - `elena_rpg` (`elena.rostova@questguild.org`): Entusiasta de RPG por turnos, R$ 740,00 saldo, 5 jogos (Onimusha e Orbitals não iniciados), 9 transações.
   - `novato_mist` (`novato@mist.com`): Conta de onboarding/novato, R$ 200,00 saldo, 2 jogos (Orbitals não iniciado), 3 transações.

3. **Geração do Arquivo Consolidado:**
   - Geração automática de [`usuarios.txt`](../usuarios.txt) no diretório raiz do projeto com credenciais, saldo, pontos, total de compras/transações, jogos na biblioteca com horas e status (destacando os não iniciados), lista de jogos não adquiridos e extrato detalhado.

4. **Validação E2E no Gateway:**
   - Validação via requisições HTTP reais no Gateway (`http://localhost:8000`): login autenticado (`/api/auth/login`), listagem da biblioteca (`/api/library/my-games`) e extrato da carteira (`/api/market/wallet/history`), confirmando integridade ponta a ponta.

**Resumo das saídas:**
- Arquivos criados:
  - `scripts/seed_rich_users.py` (Script de população multi-serviço)
  - `usuarios.txt` (Lista consolidada na raiz do projeto)
- Arquivos modificados:
  - `prompts/mkritli_30th.md` (Registro do prompt e histórico)
- Dados populados no ambiente Docker:
  - 6 usuários no `auth-service`
  - 29 compras e 12 wishlists no `store-service`
  - 29 itens de biblioteca com playtimes variados e jogos não iniciados no `library-service`
  - 47 transações no extrato da carteira no `market-service`

---

### Prompt 4

**Entrada do usuário:**
> criei jogos promocionais, popule mais jogos.
> 
> lembre q estes valores inseridos devem ser carregados sempre q a aplicacao subir, modificacoes feitas posteriormente devem ser persistidas em banco tbm

**Decisões arquiteturais e técnicas:**
1. **Catálogo Expandido e Jogos Promocionais:**
   - Expansão do catálogo oficial MIST de 16 para 25 títulos, trazendo sucessos aclamados de múltiplos gêneros (Red Dead Redemption 2, God of War Ragnarök, Hades II, Forza Horizon 5, Dead Cells, Stardew Valley, Resident Evil 4 Remake, Portal 2, Black Myth: Wukong).
   - Configuração de 11 jogos promocionais em oferta ativa com descontos de 15% a 75% OFF, especificando `original_price` (preço cheio de tabela), `discount_percentage` e `price` (preço final com desconto).
   - Inclusão dos campos `original_price` e `discount_percentage` em todos os schemas Pydantic (`GameBase`, `GameUpdate`, `GameListItemResponse`, `GameDetailResponse` em `services/store-service/app/schemas/game.py`), viabilizando tanto a serialização correta na API quanto a edição de promoções via endpoints de update.
   - Sincronização automática de schema SQLite no `init_db()` (`services/store-service/app/db/database.py`), garantindo que bancos novos ou já provisionados recebam as colunas `original_price` e `discount_percentage`.

2. **Garantia de Persistência Idempotente no Boot (`seed_games`):**
   - Reestruturação da função `seed_games` em `services/store-service/app/db/seed.py`:
     - **No boot da aplicação:** Inserção automática de quaisquer títulos do catálogo que ainda não existam no banco.
     - **Regra de persistência mandatória:** Para jogos já existentes na base, o seed **NÃO sobrescreve** os valores do banco com os dados hardcoded do seed. Se um preço, desconto, pontuação ou metadado for modificado posteriormente em tempo de execução (via API, admin ou script), essa modificação é **100% preservada** mesmo após múltiplos restarts do container.
     - Aplica valores promocionais padrão (`original_price`/`discount_percentage`) apenas se o registro no banco tiver essas colunas como `NULL`.

3. **Ciclo TDD e Testes de Regressão:**
   - Criação de `services/store-service/tests/test_promotional_games_and_persistence.py` validando:
     - Carregamento inicial de todos os 25 jogos e das promoções ativas com cálculo de desconto consistente.
     - Simulação de modificações manuais em runtime (alteração de preço e desconto de The Witcher 3 para valores arbitrários) seguidas de re-execução do ciclo de boot/seed, confirmando que os dados em banco nunca são revertidos.
   - Preservação da integridade de `STORE-UNIT-02` (`test_seed_games_catalog_integrity`) mantendo preços de tabela dos 9 jogos clássicos.
   - Teste prático executado diretamente dentro do container Docker `mist-store-service`: alteração de registro no banco SQLite, reinício com `docker restart mist-store-service` e verificação da persistência.
   - Registro do caso de teste `STORE-UNIT-15` no [`TESTS.md`](../TESTS.md).

4. **Atualização da Lista de Usuários:**
   - Atualização do cálculo dinâmico de jogos não adquiridos no script [`scripts/seed_rich_users.py`](../scripts/seed_rich_users.py), abrangendo o catálogo expandido de 25 jogos.
   - Re-execução e atualização do arquivo [`usuarios.txt`](../usuarios.txt) na raiz do projeto.

**Resumo das saídas:**
- Arquivos criados:
  - `services/store-service/tests/test_promotional_games_and_persistence.py`
- Arquivos modificados:
  - `services/store-service/app/db/database.py` (Adição de colunas na migração dinâmica)
  - `services/store-service/app/db/seed.py` (25 títulos, campos promocionais e persistência inteligente)
  - `services/store-service/app/schemas/game.py` (Serialização de `original_price` e `discount_percentage`)
  - `scripts/seed_rich_users.py` (Cálculo dinâmico de jogos não possuídos até o ID 25)
  - `usuarios.txt` (Atualizado com o novo catálogo e jogos não possuídos)
  - `TESTS.md` (Catálogo do teste `STORE-UNIT-15`)
  - `prompts/mkritli_30th.md` (Registro do prompt 4 e histórico)
- Validações:
  - 24/24 testes no backend de loja aprovados (pytest)
  - 102/102 testes no frontend aprovados (vitest)
  - API do Gateway (`/api/store/games`) retornando 25 jogos com 11 em promoção ativa

---

### Prompt 5

**Entrada do usuário:**
> onde existem msg nos cards, adicione tooltips para q o usuario passa ler o texto completo sem clicar no card. Caso ele decida clicar no card, entao esta msg deve aparecer na secao de informacao relevante para o usurio (se esta secao nao existir, crie, faca q seja esteticamente agradavel)

**Decisões arquiteturais e técnicas:**
1. **Componente Reutilizável de Tooltip (`Tooltip.tsx`):**
   - Criação de um componente genérico de alto nível `Tooltip` com estética premium e glassmorphism:
     - Fundo translúcido `backdrop-blur-md bg-[#0b0f19]/95`, borda sutil com gradiente roxo/ciano (`border-[#8b5cf6]/40`), sombra projetada `shadow-2xl` e seta direcional indicativa.
     - Posições configuráveis (`top`, `bottom`, `left`, `right`).
     - Acessibilidade: atributos `role="tooltip"`, `id` único e suporte a foco via teclado (`onFocus`/`onBlur`).
     - **Decisão de Otimização DOM:** Montagem condicional (`isVisible && ...`) ao invés de classes de opacidade oculta, impedindo poluição do accessibility tree e evitando colisões de texto em ferramentas de teste/leitores de tela.

2. **Integração de Tooltips nos Cards de Jogos:**
   - **`CuratorSection.tsx`:** As justificativas contextuais em linguagem natural geradas pela IA ("Porque você jogou...", etc.) frequentemente ultrapassam duas linhas nos cards. O texto foi envolvido no `Tooltip`, permitindo que o usuário leia a recomendação completa instantaneamente no hover sem abrir o modal.
   - **`GameCard.tsx`:** Títulos longos e descrições/tags que sofrem truncamento com reticências foram dotados de tooltips contextuais.

3. **Seção de Informação Relevante para o Usuário no Detalhe do Jogo (`GameDetailModal.tsx`):**
   - Criação da **Seção de Informação Relevante para o Usuário** (`data-testid="relevant-info-section"`), posicionada com destaque visual logo abaixo do cabeçalho de título e gênero do jogo:
     - Design estético com gradiente radial/linear escuro (`bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-slate-900/50`), borda neon roxa/azulada (`border-[#8b5cf6]/30`), canto arredondado e iluminação sutil.
     - Ícone temático animado com brilho (`fa-wand-magic-sparkles` em tom lilás/âmbar).
     - Badge exclusivo "Destaque do Curador MIST" ou "Informação Relevante".
     - Exibição em destaque da mensagem contextual transportada do card que foi clicado.
     - **Fallback Inteligente:** Se o card for aberto a partir de uma listagem sem mensagem específica de IA, a seção calcula automaticamente informações relevantes do jogo (ex.: destaque de super desconto com porcentagem e economia em R$, ou recomendação de aclamação da crítica baseada no `review_score` e categoria).

4. **Propagação de Estado e Roteamento de Contexto:**
   - Extensão das callbacks de clique `onSelectGame(gameId, relevantInfo)` em `CuratorSection` e `onSelect(game, relevantInfo)` em `GameCard`.
   - Gerenciamento do estado `selectedGameRelevantInfo` em `frontend/src/pages/Store.tsx`, repassando com fidelidade para a prop `relevantInfo` do `GameDetailModal`.

5. **Testes Unitários e Integridade:**
   - Criação de `frontend/src/components/Tooltip.test.tsx` com 3 testes unitários testando renderização de gatilho, exibição no mouseenter e supressão quando desabilitado.
   - Atualização de `frontend/src/components/GameDetailModal.test.tsx` com testes para a nova seção de informação relevante, cobrindo tanto a passagem explícita de mensagem quanto o fallback automático de promoções.
   - Suíte completa do frontend executada: **22 arquivos de teste e 107 testes aprovados** (100% de sucesso).
   - Adicionada a especificação `FRONT-UNIT-30` no [`TESTS.md`](../TESTS.md).

**Resumo das saídas:**
- Arquivos criados:
  - `frontend/src/components/Tooltip.tsx` (Componente de tooltip com glassmorphism)
  - `frontend/src/components/Tooltip.test.tsx` (Testes unitários do tooltip)
- Arquivos modificados:
  - `frontend/src/components/CuratorSection.tsx` (Tooltip na recomendação e repasse de mensagem)
  - `frontend/src/components/GameCard.tsx` (Tooltip nos títulos/mensagens e repasse no clique)
  - `frontend/src/components/GameDetailModal.tsx` (Seção visual de informação relevante para o usuário)
  - `frontend/src/components/GameDetailModal.test.tsx` (Testes da seção relevante)
  - `frontend/src/pages/Store.tsx` (Estado e repasse de informação contextual ao modal)
  - `TESTS.md` (Catálogo do teste `FRONT-UNIT-30`)
  - `prompts/mkritli_30th.md` (Registro do prompt 5 e histórico)
- Validações:
  - 107/107 testes frontend aprovados (vitest)

---

### Prompt 6

**Entrada do usuário:**
> nao estou vendo as tooltips nos cards da pagina inicial

**Decisões arquiteturais e técnicas:**
1. **Diagnóstico da Causa-Raiz:**
   - **Build Estático do Docker:** O container `mist-frontend` roda uma imagem com Nginx servindo o bundle compilado em `/usr/share/nginx/html`. Ele havia sido gerado antes da criação dos componentes de Tooltip, não refletindo o novo código até a realização do rebuild.
   - **Clipping Context por CSS (`overflow-hidden`):** Os cards em `GameCard.tsx` e `CuratorSection.tsx` continham a classe `overflow-hidden` em seus nós raiz. Em CSS, `overflow: hidden` cria uma barreira de recorte que impedia tooltips absolutos com posições flutuantes (`bottom-full` ou `top-full`) de ultrapassarem as margens do card, truncando ou ocultando visualmente o elemento.

2. **Refatoração Estrutural de Layout nos Cards:**
   - **`GameCard.tsx`:**
     - Substituído `overflow-hidden` por `overflow-visible relative hover:z-30` no card raiz, permitindo que tooltips flutuem livremente sobre outros elementos da página sem serem recortados e com elevação de camada no hover.
     - Isolado o corte das bordas arredondadas exclusivamente no container da imagem de capa (`rounded-t-2xl overflow-hidden`).
     - Adicionados tooltips contextuais nos badges de categoria, nos selos de desconto promocional e no selo "Adquirido".
   - **`CuratorSection.tsx`:**
     - Aplicado `overflow-visible hover:z-30 relative` nos cards de recomendação e `rounded-t-2xl overflow-hidden` nos banners.
     - Adicionados tooltips explicativos nos badges de topo (pontuação de afinidade, volume de vendas e tração de tendência) e na categoria.

3. **Evolução do Componente `Tooltip.tsx`:**
   - Adicionada prop `align?: 'center' | 'left' | 'right'` com cálculo dinâmico da setinha direcional e classes de posicionamento, evitando que tooltips próximos das extremidades do card extravasem a tela de forma desalinhada.
   - Adicionado o atributo `title` nativo do HTML como fallback de acessibilidade.

4. **Reconstrução e Deploy do Container Docker:**
   - Executado `npm --prefix frontend run build` (gerando bundle limpo e minificado em 3.01s).
   - Reconstruída a imagem Docker com `docker compose build frontend` e reiniciado o container `mist-frontend` com `docker compose up -d frontend`.
   - Validado o bundle servido na porta 3000 (`http://localhost:3000`), confirmando a presença de `group/tooltip` e do novo hash de asset compilado.
   - Suíte de 107 testes unitários do frontend reexecutada e 100% aprovada.

**Resumo das saídas:**
- Arquivos modificados:
  - `frontend/src/components/Tooltip.tsx` (Prop `align`, setinha e fallback nativo `title`)
  - `frontend/src/components/GameCard.tsx` (`overflow-visible`, `hover:z-30` e tooltips nos badges)
  - `frontend/src/components/CuratorSection.tsx` (`overflow-visible`, `hover:z-30` e tooltips nas métricas)
  - `prompts/mkritli_30th.md` (Registro do prompt 6 e histórico)
- Ações operacionais:
  - Rebuild e reinicialização do container `mist-frontend` no Docker.
- Validações:
  - 107/107 testes frontend aprovados (vitest)
  - Verificação de entrega HTTP 200 no Nginx na porta 3000 com o bundle atualizado.

---

### Prompt 7

**Entrada do usuário:**
> testes manuais concluidos, avance para o proximo bloco

**Decisões arquiteturais e técnicas:**
1. **Execução Completa do Bloco 2 (Tickets Q-01 a Q-06 — Sistema de Notificações Global):**
   - **Ticket Q-01 (Modelo `Notification`):**
     - Criação do modelo SQLAlchemy `Notification` em `services/social-service/app/models/notification.py` com os campos `id`, `user_id` (indexado), `type`, `title`, `message`, `payload_json` (com getter/setter de conversão transparente para dict JSON), `is_read` (booleano com índice para contagem de não-lidas) e `created_at`.
     - Registro da tabela em `services/social-service/app/db/database.py` (`init_db()`).
   - **Ticket Q-02 (Endpoints REST de Notificações):**
     - Criação dos schemas Pydantic em `services/social-service/app/schemas/notification.py`: `NotificationCreate`, `NotificationResponse`, `NotificationListResponse` e `NotificationMarkAllResponse`.
     - Implementação das rotas REST em `services/social-service/app/api/notifications.py`:
       - `GET /notifications`: Retorna `items`, `unread_count` e `total` do usuário logado, ordenados decrescentemente por data.
       - `POST /notifications/{id}/read`: Marca notificação individual como lida com validação estrita de autorização (isolamento entre contas).
       - `POST /notifications/read-all`: Marca todas as notificações do usuário como lidas em operação única atômica.
       - `POST /notifications`: Endpoint assíncrono para emissão de notificações pelo sistema ou outros serviços.
   - **Ticket Q-03 & Q-04 (Eventos e WebSocket em Tempo Real):**
     - Criação de `services/social-service/app/services/notification_manager.py` com `NotificationManager` singleton, mapeando sockets ativos por usuário (`user_id -> Set[WebSocket]`) e método `notify_user(user_id, payload)`.
     - Rota WebSocket `WS /ws/notifications?user_id={user_id}` para push imediato de novos eventos.
     - Proxy WebSocket reverso configurado no Gateway em `gateway/app/main.py` (`@app.websocket("/ws/notifications")`).
   - **Ticket Q-05 & Q-06 (Frontend — Sininho, Badge e Dropdown):**
     - Adição dos métodos `getNotifications`, `markNotificationRead` e `markAllNotificationsRead` em `frontend/src/api/client.ts` (`socialApi`).
     - Criação do componente `frontend/src/components/NotificationsDropdown.tsx`:
       - Ícone de sino com badge pulsante vermelho indicando a contagem de não-lidas.
       - Dropdown flutuante com *glassmorphism* escuro (`bg-[#0b0f19]/95 backdrop-blur-xl border border-brand-purple/40 shadow-2xl`).
       - Categorização visual com ícones temáticos para cada tipo (`friend_request`, `achievement_unlocked`, `wishlist_discount`, `trade_offer`, `system`).
       - Ações rápidas: marcar notificação individual, marcar todas como lidas e redirecionamento contextual ao clicar.
       - Conexão WebSocket para escuta em tempo real com disparos de notificações toast na interface (`mist:toast`).
     - Integração no cabeçalho `frontend/src/components/Header.tsx`.
     - Refatoração de resiliência em `frontend/src/context/AuthContext.tsx` (`useAuth`) para fornecer fallback seguro sem exceções em testes isolados.

2. **Ciclo TDD e Cobertura de Testes:**
   - **Backend:** Criado `services/social-service/tests/test_notifications.py` cobrindo criação, listagem, contagem, marcação individual, marcação em lote, isolamento estrito entre usuários e broadcast via WebSocket (`NOTIF-UNIT-01` a `NOTIF-UNIT-06`). Todos os 24 testes da suíte de `social-service` aprovados com 100% de sucesso.
   - **Frontend:** Criado `frontend/src/components/NotificationsDropdown.test.tsx` cobrindo badge, alternância do menu, marcação em lote e clique contextual. Todos os 111 testes da suíte completa de frontend aprovados com 100% de sucesso.
   - **Governança:** Registrados `SOCIAL-UNIT-08`, `SOCIAL-UNIT-09`, `SOCIAL-UNIT-10` e `FRONT-UNIT-31` no [`TESTS.md`](../TESTS.md).

3. **Deploy e Validação Integrada no Gateway:**
   - Compilação do frontend com Vite e rebuild dos containers Docker `mist-frontend`, `mist-social-service` e `mist-gateway`.
   - Execução de validação via API do Gateway (`http://localhost:8000/api/social/notifications`) com token JWT de usuário autenticado, confirmando persistência e resposta `200 OK`.

4. **Protocolo de Pausa para Teste Manual 2:**
   - Conclusão do Bloco 2 com parada obrigatória para validação humana na UI antes de avançar para o Bloco 3 (Grupos e Fórum).

**Resumo das saídas:**
- Arquivos criados:
  - `services/social-service/app/models/notification.py`
  - `services/social-service/app/schemas/notification.py`
  - `services/social-service/app/services/notification_manager.py`
  - `services/social-service/app/services/notification_service.py`
  - `services/social-service/app/api/notifications.py`
  - `services/social-service/tests/test_notifications.py`
  - `frontend/src/components/NotificationsDropdown.tsx`
  - `frontend/src/components/NotificationsDropdown.test.tsx`
- Arquivos modificados:
  - `services/social-service/app/db/database.py` (Registro de `Notification` em `init_db`)
  - `services/social-service/app/main.py` (Inclusão de `notifications_router`)
  - `gateway/app/main.py` (Proxy WebSocket `/ws/notifications`)
  - `frontend/src/api/client.ts` (Tipos e métodos da `socialApi`)
  - `frontend/src/components/Header.tsx` (Inclusão de `NotificationsDropdown`)
  - `frontend/src/context/AuthContext.tsx` (Fallback resiliente de `useAuth`)
  - `TESTS.md` (Catálogo dos novos testes de backend e frontend)
  - `prompts/mkritli_30th.md` (Registro do prompt 7 e histórico)
- Validações:
  - 24/24 testes no `social-service` aprovados (pytest)
  - 111/111 testes no frontend aprovados (vitest)
  - Chamada real ao Gateway na rota `/api/social/notifications` retornando notificação criada.

---

### Prompt 8

**Entrada do usuário:**
> popular a notificacao com algo q de pra redirecionar do dropdown presente no icone para o lugar onde tem mais detalhes sobre oq foi notificado, criar algumas varias notificacoes. Por exemplo, criar uma noticia q determinados jogos deixaram o catalogo do mist em breve. Criei varios conteudos q sao normalmente itens para aparecer como notificacao do sistema

**Decisões arquiteturais e técnicas:**
1. **Redirecionamento Contextual e Interativo de Notificações:**
   - O componente `NotificationsDropdown.tsx` foi reformulado para permitir navegação dinâmica para o local exato com mais detalhes sobre cada notificação:
     - **Notícias de Catálogo / Comunicados Oficiais (`catalog_leaving`, `system_notice`, `system`):** Dispara o evento global `mist:open-system-notice` com payload estruturado contendo justificativas, prazos, observação importante e lista de títulos afetados com descontos de despedida.
     - **Descontos na Wishlist (`wishlist_discount`):** Transfere o usuário para a aba da Loja (`store`) e despacha o evento customizado `mist:open-game-detail` com `{ gameId, relevantInfo }`. A Loja intercepta o evento e abre instantaneamente o `GameDetailModal` do jogo destacado, preenchendo a seção de informação relevante com os detalhes do desconto.
     - **Conquistas Desbloqueadas (`achievement_unlocked`):** Navega para a Biblioteca (`library`) e despacha `mist:open-library-game` com `{ gameId }`, expandindo automaticamente o jogo selecionado e revelando o painel de conquistas.
     - **Depósitos e Recargas da Carteira (`wallet_deposit`):** Despacha o evento `mist:open-wallet`, abrindo na hora o `WalletHistoryModal` para conferência do extrato financeiro.
     - **Propostas de Troca (`trade_offer`):** Conduz o usuário para a aba de Mercado (`market`).
     - **Pedidos e Convites de Amizade (`friend_request`, `friend_accepted`):** Conduz o usuário para a aba da Comunidade (`social`).

2. **Componente de Modal de Comunicados Oficiais (`SystemNoticeModal.tsx`):**
   - Criação de um modal exclusivo com estética *glassmorphism* e acabamento dark mode (`#0d1322` / bordas translúcidas douradas/âmbar):
     - Selo oficial "Comunicado Oficial MIST" ou "Atualização de Sistema".
     - Caixa de alerta com observação importante para a comunidade (ex.: garantia de permanência perpétua na biblioteca para quem já possui ou adquirir os jogos).
     - Grade responsiva com os jogos afetados (ex.: *Onimusha: Way of the Sword*, *Wardogs* e *Silent Hill: Townfall*), exibindo banners, porcentagens de desconto de despedida de até 75% OFF, preço original riscado, preço final e botão de ação direta "Ver na Loja".
     - Botões no rodapé: "Explorar Ofertas na Loja", "Acessar Central de Notícias" e "Entendido".

3. **População Persistente e Idempotente no Backend (`seed_social.py`):**
   - Adicionada rotina de seed em `services/social-service/app/db/seed_social.py` chamada automaticamente no `lifespan` do FastAPI:
     - Popula um lote rico de 8 notificações para a conta principal (`mauricio@live.com` / `user_id = 1`):
       1. `catalog_leaving`: Comunicado Oficial de rotação do catálogo com 3 títulos deixando a loja em 31/10.
       2. `wishlist_discount`: Cyberpunk 2077 com 40% OFF por tempo limitado (`game_id = 12`).
       3. `friend_request`: Pedido de amizade de Sarah Connor (`user_id = 3`).
       4. `trade_offer`: Proposta de troca de item no Mercado MIST de `gabriel_t800`.
       5. `achievement_unlocked`: Conquista "Lenda das Terras Intermédias" em Elden Ring (`game_id = 11`).
       6. `system_notice`: Notas da Atualização MIST v2.5 detalhando melhorias na plataforma.
       7. `wallet_deposit`: Recarga confirmada de R$ 300,00 via PIX (novo saldo R$ 450,00).
     - População automática e uniforme de comunicados de sistema e catálogo para todos os demais usuários (`user_id = 2, 3, 4, 5, 6`).
     - Idempotência assegurada com filtro `db.query(Notification).filter(Notification.type == "catalog_leaving").count() > 0`.

4. **Presença Global do Header:**
   - O `Header.tsx` foi tornado persistente no topo da área principal de `App.tsx`, permitindo que o usuário consulte notificações, verifique o saldo da carteira e acesse o carrinho a partir de qualquer aba (Loja, Biblioteca, Mercado, Comunidade, Notícias, Perfil).

5. **Notícia em Destaque na Central de Notícias (`News.tsx`):**
   - Inclusão do artigo oficial "COMUNICADO: 3 jogos deixarão o catálogo MIST em 31 de Outubro" no topo do mural de notícias, garantindo convergência de conteúdo entre notificações, modal e a central informativa.

6. **Cobertura de Testes e Governança:**
   - Criação de `SystemNoticeModal.test.tsx` com 5 casos de teste.
   - Atualização de `NotificationsDropdown.test.tsx` cobrindo todos os redirecionamentos contextuais (wishlist, catálogo, conquistas, carteira e amizades).
   - Suíte de frontend aprovada com **120/120 testes** (24 arquivos).
   - Suíte do backend `social-service` aprovada com **24/24 testes**.
   - Build de produção compilado com sucesso (`tsc && vite build`).
   - Registrados `FRONT-UNIT-32` e `FRONT-UNIT-33` no [`TESTS.md`](../TESTS.md).

**Resumo das saídas:**
- Arquivos criados:
  - `frontend/src/components/SystemNoticeModal.tsx` (Modal de comunicados oficiais MIST)
  - `frontend/src/components/SystemNoticeModal.test.tsx` (Testes unitários do modal de comunicados)
- Arquivos modificados:
  - `frontend/src/components/NotificationsDropdown.tsx` (Lógica de clique contextual, badges e hints)
  - `frontend/src/components/NotificationsDropdown.test.tsx` (Testes cobrindo novos tipos de notificação)
  - `frontend/src/components/Header.tsx` (Listener para evento `mist:open-wallet`)
  - `frontend/src/pages/Store.tsx` (Listener para evento `mist:open-game-detail`)
  - `frontend/src/pages/Library.tsx` (Listener para evento `mist:open-library-game`)
  - `frontend/src/pages/News.tsx` (Artigo de comunicado oficial no mural)
  - `frontend/src/App.tsx` (Header global, estado do comunicado e integração com `SystemNoticeModal`)
  - `services/social-service/app/db/seed_social.py` (Lote rico e idempotente de notificações no boot)
  - `TESTS.md` (Catálogo dos testes `FRONT-UNIT-32` e `FRONT-UNIT-33`)
  - `prompts/mkritli_30th.md` (Registro do prompt 8 e histórico)
- Validações:
  - 120/120 testes no frontend aprovados (vitest)
  - 24/24 testes no `social-service` aprovados (pytest)
  - Compilação do frontend validada sem erros com `npm run build`
  - Rebuild e atualização dos containers Docker `mist-social-service` e `mist-frontend`
  - Verificação via API real (`GET /api/social/notifications`) retornando as 8 notificações populadas para o usuário 1.

---

### Prompt 9 — Correção de Posicionamento Vertical da Modal de Carteira (Alinhamento com o Saldo Clicado)

**Prompt do Usuário:**
> "quando clica em abrir a carteira, a modal esta aparecendo fora da tela, parte de cima fica escondida atras da barra de favoritos e url do navegador. Arrume para q o topo da modal fique na mesma altura do valor financeiro q eh clicado para abrir a modal"

**Decisões Arquiteturais e Técnicas Tomadas:**
1. **Identificação da Causa Raiz:**
   - O modal de extrato da carteira (`WalletHistoryModal.tsx`) utilizava layout flexbox centrado verticalmente (`flex items-center justify-center p-4`) com altura máxima de `85vh`.
   - Quando aberto em janelas de navegador padrão ou com barras de ferramentas visíveis (URL, favoritos, abas), a centralização forçava o topo do modal para cima da área visível do viewport (coordenadas negativas ou sob a barra do navegador).
2. **Propagação de Coordenada Vertical Dinâmica (`topOffset`):**
   - Adicionada prop opcional `topOffset?: number` em `WalletHistoryModal.tsx`.
   - Alterado o container externo de `items-center` para `items-start justify-center p-4 overflow-y-auto` com estilo inline `style={{ paddingTop: `${topOffset}px` }}`.
   - Definida altura máxima adaptativa no container do diálogo: `max-h-[calc(100vh-32px)]`, garantindo que todo o conteúdo permaneça contido na viewport com rolagem interna quando necessário.
3. **Medição da Posição Real do Botão Financeiro no Header (`Header.tsx`):**
   - Criada referência `walletButtonRef = useRef<HTMLButtonElement>(null)` no botão que exibe o saldo do usuário.
   - Criado estado `walletTopOffset` inicializado com 16px.
   - No clique do botão de saldo (`handleWalletClick`) e no tratamento do evento global `mist:open-wallet`, a função lê as coordenadas reais via `walletButtonRef.current?.getBoundingClientRect()`.
   - A coordenada `rect.top` (distância exata do topo da viewport até o início do botão financeiro) é enviada via `topOffset` ao modal.
4. **Alinhamento Rigoroso com as Regras de Testes e Governança:**
   - Adicionado caso de teste unitário em `WalletHistoryModal.test.tsx` validando que a modal recebe `topOffset` e aplica `items-start` com `paddingTop: '24px'`.
   - Registrado o caso de teste `FRONT-UNIT-34` no [`TESTS.md`](../TESTS.md).
   - Execução e aprovação completa de todos os 121 testes unitários do frontend (`vitest`).
   - Compilação de produção e recriação do container Docker `mist-frontend`.

**Resumo das saídas:**
- Arquivos modificados:
  - `frontend/src/components/WalletHistoryModal.tsx` (Adicionada prop `topOffset`, classes `items-start`, `overflow-y-auto`, `paddingTop` dinâmico e `max-h-[calc(100vh-32px)]`)
  - `frontend/src/components/Header.tsx` (Adicionado `walletButtonRef`, medição via `getBoundingClientRect().top` no clique do saldo e repasse de `topOffset`)
  - `frontend/src/components/WalletHistoryModal.test.tsx` (Adicionado teste unitário cobrindo o alinhamento no topo com `topOffset`)
  - `TESTS.md` (Catálogo do teste `FRONT-UNIT-34`)
  - `prompts/mkritli_30th.md` (Registro do prompt 9 e histórico perpétuo)
- Validações:
  - 121/121 testes no frontend aprovados (24 arquivos vitest)
  - Compilação do frontend validada sem erros com `npm run build`
  - Rebuild e atualização com sucesso do container Docker `mist-frontend` via `docker compose`
  - Verificação de resposta HTTP 200 no `http://localhost:3000`

---

### Prompt 10 — Desacoplamento da Modal de Carteira do Stacking Context do Header via React Portal

**Prompt do Usuário:**
> "blz, vc corrigiu a posicao inicial, porem a modal nao esta sendo mostrada na frente das paginas, por exemplo, ela fica atras da recomendacao. A modal ta renderizando dentro do header somente"

**Decisões Arquiteturais e Técnicas Tomadas:**
1. **Diagnóstico da Restrição de Stacking Context:**
   - O componente `Header.tsx` possui a classe `backdrop-blur-md` e `sticky top-0 z-40`. Pela especificação do W3C CSS, qualquer elemento ancestral com `backdrop-filter`, `filter` ou `transform` define um novo bloco de contenção (*containing block*) para elementos com `position: fixed`.
   - Consequentemente, o `WalletHistoryModal` estava fisicamente confinado ao interior do `<header>`, fazendo com que seu `z-[130]` operasse apenas dentro do contexto do cabeçalho, sendo encoberto por elementos subsequentes no DOM que criam seus próprios contextos de empilhamento (como a seção de recomendações, carrosséis, banners e grids).
2. **Implementação de React Portal (`createPortal`):**
   - Em `WalletHistoryModal.tsx`, a renderização do elemento raiz do modal foi encapsulada com `createPortal(modalContent, document.body)`.
   - Isso projeta o nó DOM do modal diretamente como filho imediato do `<body>`, desvinculando-o totalmente de qualquer ancestral com `backdrop-blur` ou `overflow` restrito.
   - O `z-[130]` agora atua no nível mais alto do documento, garantindo que a modal fique soberana e visível na frente de absolutamente todos os componentes da aplicação (recomendações, abas, carrosséis e sidebar).
3. **Preservação do Alinhamento Vertical e Proteção SSR:**
   - Adicionada verificação segura `if (typeof document === 'undefined') return null;`.
   - O cálculo de `topOffset` via `getBoundingClientRect().top` permanece em perfeita sincronia, pois o referencial da coordenada da janela coincide exatamente com o sistema de coordenadas do `document.body` com `fixed`.
4. **Governança, Testes e Docker:**
   - Atualizado o caso `FRONT-UNIT-34` no [`TESTS.md`](../TESTS.md).
   - Execução e aprovação unânime de todos os **121/121 testes unitários** do frontend (`vitest`).
   - Validação da compilação de produção com `npm run build` (`tsc && vite build`).
   - Reconstrução do container Docker `mist-frontend` e reinício via Docker Compose em `http://localhost:3000`.

**Resumo das saídas:**
- Arquivos modificados:
  - `frontend/src/components/WalletHistoryModal.tsx` (Inclusão de `createPortal` de `react-dom` com montagem em `document.body`)
  - `TESTS.md` (Atualização da especificação de `FRONT-UNIT-34` contemplando a renderização via portal)
  - `prompts/mkritli_30th.md` (Registro do prompt 10 e histórico perpétuo)
- Validações:
  - 121/121 testes no frontend aprovados (vitest)
  - Build de produção verificado com sucesso (`npm run build`)
  - Recriação e subida do container Docker `mist-frontend` sem falhas
  - Verificação HTTP 200 ativa em `http://localhost:3000`

---

### Prompt 11 — Implementação do Bloco 3: Grupos, Comunidade e Fórum (Tickets M-01 a M-06)

**Prompt do Usuário:**
> "manual test were ended, continue to implementing the next block. Remember to add data in DB to be able see in the populeted users and test a couple of common scenario from day a day steam users"

**Decisões Arquiteturais e Técnicas Tomadas:**
1. **Modelagem de Domínio Relacional no `social-service`:**
   - Criados modelos relacionais em SQLAlchemy no microsserviço social:
     - `Group` (`app/models/group.py`): com `id`, `name`, `description`, `avatar_url`, `header_url`, `category`, `is_private`, `owner_id`, contadores atômicos `members_count`, `posts_count` e `created_at`.
     - `GroupMember` (`app/models/group.py`): mapeamento N:N entre `group_id` e `user_id` com restrição única composta e papéis (`owner`, `admin`, `moderator`, `member`).
     - `ForumPost` (`app/models/forum.py`): tópicos com `title`, `content`, `author_id`, flags de moderação `is_pinned`, `is_locked`, `views_count`, `replies_count`, `created_at` e `updated_at`.
     - `ForumReply` (`app/models/forum.py`): respostas do fórum vinculadas ao tópico com autoria e timestamps.
     - `GroupMessage` (`app/models/group_message.py`): mensagens do bate-papo coletivo do grupo com persistência relacional imediata.
2. **Camada de Schemas e Validação Pydantic:**
   - Criados schemas completos em `app/schemas/group.py` e `app/schemas/forum.py` suportando criação, resposta, filtros de busca por categoria/termo e serialização de membros e mensagens.
3. **WebSockets e Chat Coletivo em Tempo Real:**
   - Criado `GroupChatManager` (`app/services/group_chat_manager.py`) implementando gerenciamento concorrente de salas de grupo com `connect`, `disconnect` e `broadcast`.
   - Adicionada rota de WebSocket `WS /ws/group/{group_id}/chat` no `social-service` e correspondente proxy WebSocket transparente no `gateway/app/main.py`.
4. **Rotas REST e Moderação de Tópicos:**
   - Implementadas rotas completas em `app/api/groups.py` e `app/api/forum.py`:
     - `GET /groups`: listagem de grupos com busca e enriquecimento de papel do usuário ativo (`is_member`, `role`).
     - `POST /groups`: criação de grupo com atribuição automática do criador como `owner`.
     - `POST /groups/{id}/join` e `POST /groups/{id}/leave`: adesão e saída com controle transacional e atualização atômica de contadores.
     - `GET /groups/{id}/posts`: listagem de tópicos ordenando prioritariamente os fixados (`is_pinned DESC, updated_at DESC`).
     - `POST /groups/{id}/posts`: criação de tópicos.
     - `POST /posts/{id}/replies`: publicação de respostas com incremento atômico de `replies_count` e bloqueio com HTTP 400 em tópicos trancados (`is_locked`).
     - `PATCH /posts/{id}`: moderação permitida exclusivamente para o autor, moderador do grupo ou `owner` para fixar/trancar tópicos.
     - `GET /groups/{id}/chat/messages`: recuperação do histórico persistido de mensagens de bate-papo.
5. **Carga de Dados Ricos e Autênticos no Banco (`seed_social.py`):**
   - População idempotente no `social-service` cobrindo cenários reais do cotidiano de usuários da Steam:
     - **Grupo 1 — RPG Brasil & Souls Enthusiasts:** (Proprietário: `mauricio@live.com`). Tópicos sobre builds de Força em Elden Ring, regras da comunidade, debates sobre Baldur's Gate 3 e chat com dicas da DLC Shadow of the Erdtree.
     - **Grupo 2 — Counter-Strike & Tactical Shooters:** (Proprietário: `gabriel@mistgames.com`). Tópicos sobre line-ups de granadas no CS2 e busca de time para o Premier com respostas de `sarah_connor` e `lucas_speed`.
     - **Grupo 3 — Indie Gems & Retro Collectors:** (Proprietário: `sarah.connor@sky.net`). Tópicos de teorias de Silksong, metroidvanias clássicos e recomendações de Celeste.
     - **Grupo 4 — Speedrunners MIST:** (Proprietário: `lucas.speed@speedrun.io`). Tópicos sobre otimização de rotas e glitch hunts.
     - **Grupo 5 — MIST Hardware & Steam Deck Lab:** (Proprietário: `novato@mist.com`). Tópicos com presets gráficos ideais de 45Hz/45FPS e ajuste fino de TDP para portáteis.
6. **Frontend — Módulo de Grupos, Fórum e Chat (`Groups.tsx`):**
   - Criada página completa em `frontend/src/pages/Groups.tsx` com:
     - Catálogo de grupos com filtros por categoria, busca textual em tempo real e visualização de quantidade de membros/tópicos.
     - Modal para criação de novos grupos.
     - Visualização detalhada do grupo com banner de cabeçalho, avatar estilizado, badges de membro/dono e botão de entrar/sair.
     - Fórum de discussões com sinalização de tópicos fixados/trancados, contador de visualizações/respostas, expansão inline de respostas e modal de criação de novo tópico.
     - Bate-papo coletivo do grupo com conexão WebSocket nativa, reconexão automática, histórico persistido e envio via Enter.
     - Lista lateral de membros do grupo com indicação de papéis (`owner`, `admin`, `member`).
   - Integração na aba Comunidade (`Social.tsx`) com alternância entre "Feed & Amigos" e "Grupos & Fórum".
   - Registro no `App.tsx` e atualização dos contratos de tipagem em `client.ts` e `types/index.ts`.
7. **Governança, Testes e Docker:**
   - Suíte de testes automatizados do backend `test_groups_forum.py` aprovada com 5 testes com isolamento de banco em memória SQLite (`StaticPool`).
   - Suíte completa do `social-service` aprovada com **29/29 testes**.
   - Suíte de testes do frontend `Groups.test.tsx` com 5 cenários aprovados, totalizando **126/126 testes aprovados** (25 suítes).
   - Validação da compilação de produção com `npm run build` (`tsc && vite build`).
   - Atualização do `TESTS.md` com `FRONT-UNIT-35`, `SOCIAL-INT-05`, `SOCIAL-INT-06` e `SOCIAL-INT-07`.
   - Reconstrução e reinício dos containers `mist-social-service`, `mist-gateway` e `mist-frontend`.

**Resumo das saídas:**
- Arquivos criados / modificados:
  - `services/social-service/app/models/group.py` (Modelos `Group` e `GroupMember`)
  - `services/social-service/app/models/forum.py` (Modelos `ForumPost` e `ForumReply`)
  - `services/social-service/app/models/group_message.py` (Modelo `GroupMessage`)
  - `services/social-service/app/schemas/group.py` (Schemas Pydantic para grupos)
  - `services/social-service/app/schemas/forum.py` (Schemas Pydantic para fórum)
  - `services/social-service/app/services/group_chat_manager.py` (Gerenciador de WebSockets de chat de grupo)
  - `services/social-service/app/api/groups.py` (Endpoints de grupos, membros, mensagens e WS)
  - `services/social-service/app/api/forum.py` (Endpoints de fórum, posts, respostas e moderação)
  - `services/social-service/app/db/database.py` e `app/main.py` (Registro de tabelas e routers)
  - `services/social-service/app/db/seed_social.py` (Seed rico com 5 grupos temáticos da Steam, 8 tópicos e chat)
  - `services/social-service/tests/test_groups_forum.py` (Suíte de testes de integração)
  - `gateway/app/main.py` (Proxy WebSocket para `/ws/group/{group_id}/chat`)
  - `frontend/src/api/client.ts` (Cliente tipado para groups, forum e chat)
  - `frontend/src/pages/Groups.tsx` (Componente de UI para Grupos, Fórum e Bate-papo)
  - `frontend/src/pages/Groups.test.tsx` (Testes unitários do componente Groups)
  - `frontend/src/pages/Social.tsx` e `frontend/src/App.tsx` (Integração na navegação e abas)
  - `frontend/src/types/index.ts` (Tipagem de abas de navegação)
  - `TESTS.md` (Catálogo dos testes `FRONT-UNIT-35`, `SOCIAL-INT-05`, `SOCIAL-INT-06` e `SOCIAL-INT-07`)
  - `prompts/mkritli_30th.md` (Registro do prompt 11 e histórico perpétuo)
- Validações:
  - 29/29 testes no backend `social-service` aprovados (pytest)
  - 126/126 testes no frontend aprovados (vitest)
  - Build de produção verificado com sucesso (`npm run build`)
  - Rebuild e atualização com sucesso dos containers `mist-social-service`, `mist-gateway` e `mist-frontend`
  - Verificação de resposta com autenticação e dados de grupos populados via API Gateway (`http://localhost:8000/api/social/groups`)

---

### Prompt 12 — Acessibilidade e Alto Contraste de Texto em Campos de Formulário (Inputs, Textareas, Selects)

**Prompt do Usuário:**
> "os textos estao com letras brancas quando inseridas nos inputs de chat, titulo de grupo e qlqr outro lugar q tenha campos de input, transforme elas em uma cor visivel, como preto"

**Decisões Arquiteturais e Técnicas Tomadas:**
1. **Diagnóstico de Legibilidade e Estilos de Inputs:**
   - Anteriormente, campos de entrada de formulários (inputs de chat, modais de grupo, criação de tópicos no fórum, respostas, busca global e autenticação) utilizavam classes `text-white` com fundos escuros (`bg-brand-dark`).
   - Em certos contextos de renderização no navegador ou sob herança de estilos, os caracteres digitados apresentavam baixo contraste ou ficavam brancos e ilegíveis sobre fundos claros de user-agent.
2. **Definição Global de Acessibilidade em `frontend/src/styles/global.css`:**
   - Adicionada regra CSS global mandatória com especificidade elevada (`!important`):
     - `input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select`: cor de texto preta pura (`color: #000000 !important`) sobre fundo branco limpo e contrastante (`background-color: #ffffff !important`).
     - Pseudo-elemento `::placeholder`: cinza contrastante (`#6b7280 !important`) para manter rótulos informativos nítidos sem colidir com o texto digitado.
   - Preserva botões, checkboxes e seletores de radio sem interferência indesejada.
3. **Harmonização Semântica nas Classes Tailwind dos Componentes:**
   - Atualizados todos os componentes com campos de entrada para aplicar explicitamente `bg-white border border-gray-300 text-black placeholder-gray-500 shadow-sm focus:border-brand-purple`:
     - `Groups.tsx`: campo de busca de grupos (`searchQuery`), campo de envio de chat de grupo (`chatInput`), modal de criar comunidade (`newGroupName`, `newGroupDesc`, `newGroupCategory`, `newGroupAvatar`), modal de novo tópico (`newPostTitle`, `newPostContent`) e campo de resposta no fórum (`replyContent`).
     - `ChatWindow.tsx`: caixa de digitação de mensagens no chat individual com amigos.
     - `Header.tsx`: barra de busca global de jogos.
     - `Library.tsx`: barra de busca de jogos da biblioteca.
     - `News.tsx`: barra de busca de notícias e atualizações.
     - `Social.tsx`: campo de convite de novos amigos por ID.
     - `ReviewFormModal.tsx`: textarea de avaliação de jogos.
     - `AuthModal.tsx` & `Login.tsx`: campos de login e cadastro (identificador, username, email, senhas).
4. **Governança, Testes e Docker:**
   - Execução de todos os **126/126 testes unitários** do frontend (`vitest`), confirmando 100% de aprovação.
   - Compilação de produção validada com `npm run build` (`tsc && vite build`).
   - Reconstrução e reinício do container Docker `mist-frontend`.
   - Registro do caso de teste de regressão `REG-FRONT-02` no [`TESTS.md`](../TESTS.md).

**Resumo das saídas:**
- Arquivos modificados:
  - `frontend/src/styles/global.css` (Regra CSS global com `color: #000000 !important` e `background-color: #ffffff !important` em inputs/textareas/selects)
  - `frontend/src/pages/Groups.tsx` (Classes atualizadas para `bg-white text-black` nos inputs de chat, busca, modais e replies)
  - `frontend/src/components/ChatWindow.tsx` (Input de chat de amigos com fundo branco e texto preto)
  - `frontend/src/components/Header.tsx` (Busca do header com fundo branco e texto preto)
  - `frontend/src/pages/Library.tsx` (Busca da biblioteca com fundo branco e texto preto)
  - `frontend/src/pages/News.tsx` (Busca de notícias com fundo branco e texto preto)
  - `frontend/src/pages/Social.tsx` (Campo de adicionar amigo com fundo branco e texto preto)
  - `frontend/src/components/ReviewFormModal.tsx` (Textarea de review com fundo branco e texto preto)
  - `frontend/src/components/AuthModal.tsx` (Campos de login/cadastro com fundo branco e texto preto)
  - `frontend/src/pages/Login.tsx` (Campos de login/cadastro com fundo branco e texto preto)
  - `TESTS.md` (Catálogo do teste de regressão `REG-FRONT-02`)
  - `prompts/mkritli_30th.md` (Registro do prompt 12 e histórico perpétuo)
- Validações:
  - 126/126 testes unitários no frontend aprovados (vitest)
  - Build de produção verificado com sucesso (`npm run build`)
  - Container Docker `mist-frontend` reconstruído e rodando sem falhas

---

### Prompt 13 — Busca Global Agregada (Bloco 4: R-01 a R-05) e População de Cenários do Dia a Dia da Steam

**Prompt do Usuário:**
> "manual test were ended, continue to implementing the next block. Remember to add data in DB to be able see in the populeted users and test a couple of common scenario from day a day steam users"

**Decisões Arquiteturais e Técnicas Tomadas:**
1. **Escopo do Bloco 4 (Tickets R-01 a R-05):**
   - Implementação da infraestrutura completa de Busca Global Agregada do MIST, conectando Store, Auth, Social e Market em um único fluxo de experiência unificada no Header.
2. **Backend — Auth Service (`R-02`):**
   - Criação da função de serviço `search_users(db, query, limit)` buscando por substring em `username` ou `email` (case-insensitive com `ilike`), ordenada por nível decrescente.
   - Adicionada rota pública `GET /users/search` retornando `List[UserPublicResponse]` em `services/auth-service/app/api/routes.py`, posicionada obrigatoriamente antes de `/users/{user_id}` para prevenir colisão de rota dinâmica no FastAPI.
   - Criada suíte unitária dedicada `services/auth-service/tests/test_search.py` (5 testes). Total do Auth Service: 18/18 testes aprovados.
3. **Backend — Market Service (`R-04`):**
   - Adicionado parâmetro `search: Optional[str] = Query(None)` no endpoint `GET /market/listings` e filtro `MarketListing.item_name.ilike(f"%{search}%")` em `ListingService.list_active_listings`. Total do Market Service: 73/73 testes aprovados.
4. **Backend — Social Service (`R-03`):**
   - Atualizado endpoint `GET /groups` para aceitar parâmetros `search`, `q` e `limit`, permitindo busca por nome ou descrição do grupo de forma consistente. Total do Social Service: 29/29 testes aprovados.
5. **Backend — API Gateway (`R-01`):**
   - Implementado endpoint agregador `GET /api/search?q={query}&limit={limit}` em `gateway/app/main.py`.
   - Execução concorrente paralela utilizando `asyncio.gather(*tasks, return_exceptions=True)` disparando chamadas simultâneas para Store (`/games?search=...`), Auth (`/users/search?q=...`), Social (`/groups?search=...`) e Market (`/market/listings?search=...`).
   - Implementada resiliência com degradação graciosa: se qualquer serviço upstream falhar (500, timeout ou offline), a busca global não quebra e retorna lista vazia na seção correspondente, preservando os demais resultados.
   - Criada suíte de testes de integração `gateway/tests/test_global_search.py` (3 testes). Total do Gateway: 12/12 testes aprovados.
6. **Frontend — Dropdown de Busca Global (`R-05`):**
   - Adicionadas interfaces TypeScript e cliente `searchApi.search(query, limit)` em `frontend/src/api/client.ts`.
   - Criado componente `frontend/src/components/GlobalSearchDropdown.tsx` com debounce de 250ms, carregamento animado com indicador sutil, 4 seções categorizadas destacadas com ícones temáticos (Jogos, Jogadores, Grupos e Mercado da Comunidade), contadores de membros e preços formatados.
   - Suporte completo a navegação: clique em jogos direciona para a modal de detalhes ou catálogo da Store; clique em jogadores e grupos navega para a página Social; clique em anúncios navega para o Mercado da Comunidade.
   - Acessibilidade e ergonomia: fechamento via clique fora do dropdown e tecla `Escape`, botão de limpar pesquisa no `Header.tsx`.
   - Criada suíte de testes unitários `frontend/src/components/GlobalSearchDropdown.test.tsx` (5 testes). Total do Frontend: 131/131 testes aprovados em 26 arquivos de teste.
7. **População de Banco de Dados com Cenários Reais do Dia a Dia da Steam:**
   - Atualizado script `scripts/seed_rich_users.py` adicionando inserção de 12 anúncios realistas de cosméticos e colecionáveis no `market.db` associados aos usuários mockados (mkritli, gabriel_t800, sarah_connor, lucas_speed, elena_rpg).
   - Cobertura de termos diários de busca:
     - `elden`: Retorna o jogo *Elden Ring: Shadow of the Erdtree*, o grupo *RPG Brasil & Souls Enthusiasts* e 2 itens do Mercado (*Erdtree Foil Trading Card* e *Malenia Blade of Miquella Frame*).
     - `cs2` / `strike`: Retorna o grupo *Counter-Strike & Tactical Shooters* e 2 itens do Mercado (*CS2 / Counter-Strike: AK-47 Neon Rider Sticker* e *CS2: Tactical Karambit Pin*).
     - `deck`: Retorna o grupo *MIST Hardware & Steam Deck Lab* e o item do Mercado *Steam Deck OLED Nebula Animated Background*.
     - `gabriel`: Retorna o usuário jogador *gabriel_t800* (Nível 24).
     - `speed`: Retorna o usuário jogador *lucas_speed* (Nível 6) e o grupo *Speedrunners MIST*.
     - `witcher`: Retorna o jogo *The Witcher 3: Wild Hunt* e o item do Mercado *Wolf Medallion Animated Profile*.
8. **Governança e Atualizações de Catálogo:**
   - Catalogados no [`TESTS.md`](../TESTS.md): `GATEWAY-INT-05` (Busca Global resiliente no Gateway), `AUTH-INT-02` (Busca pública de usuários no Auth Service) e `FRONT-UNIT-36` (Componente GlobalSearchDropdown no Frontend).
   - Reconstrução e reinicialização dos containers `mist-auth-service`, `mist-market-service`, `mist-social-service`, `mist-gateway` e `mist-frontend`.

**Resumo das saídas:**
- Arquivos criados / modificados:
  - `services/auth-service/app/services/auth_service.py` (Função `search_users`)
  - `services/auth-service/app/api/routes.py` (Rota pública `GET /users/search`)
  - `services/auth-service/tests/test_search.py` (Suíte unitária de busca de usuários)
  - `services/market-service/app/services/listing_service.py` (Filtro `search` em listagens ativas)
  - `services/market-service/app/api/listings.py` (Query param `search` em `GET /market/listings`)
  - `services/social-service/app/api/groups.py` (Suporte a parâmetros `search` e `q` em `GET /groups`)
  - `gateway/app/main.py` (Endpoint `GET /api/search` com agregação resiliente)
  - `gateway/tests/test_global_search.py` (Suíte de testes da busca agregada)
  - `frontend/src/api/client.ts` (Tipagens e cliente `searchApi.search`)
  - `frontend/src/components/GlobalSearchDropdown.tsx` (Componente do dropdown de busca global)
  - `frontend/src/components/GlobalSearchDropdown.test.tsx` (Suíte de testes do dropdown)
  - `frontend/src/components/Header.tsx` (Integração do dropdown na barra de busca com debounce e limpeza)
  - `scripts/seed_rich_users.py` (Inclusão de anúncios realistas do Mercado da Comunidade no banco)
  - `TESTS.md` (Catálogo de `GATEWAY-INT-05`, `AUTH-INT-02` e `FRONT-UNIT-36`)
  - `prompts/mkritli_30th.md` (Registro do prompt 13 e histórico perpétuo)
- Validações:
  - 18/18 testes no auth-service aprovados (pytest)
  - 73/73 testes no market-service aprovados (pytest)
  - 29/29 testes no social-service aprovados (pytest)
  - 12/12 testes no gateway aprovados (pytest)
  - 131/131 testes no frontend aprovados (vitest em 26 suítes)
  - Build de produção verificado com sucesso (`npm run build`)
  - 7 containers Docker ativos e sincronizados
  - Consultas de validação via API Gateway testadas com sucesso para cenários da Steam (`elden`, `cs2`, `deck`, `speed`, `gabriel`, `witcher`)

---

### Prompt 14 — Correção de Fundo e Estilização Visual do Dropdown de Busca Global no Header

**Prompt do Usuário:**
> "a janela de resultados do search no header logo ao lado do ring bell esta sem fundo, adicione um fundo com as mesmas caracteristicas graficas das outras modais" / "a janela de resultados do search no header logo ao lado do ring bell esta sem fundo, adicione um fundo com as mesmas caracteristicas graficas das notificacoes"

**Decisões Arquiteturais e Técnicas Tomadas:**
1. **Diagnóstico da Ausência de Fundo:**
   - O componente `GlobalSearchDropdown.tsx` utilizava originalmente a classe `bg-brand-dark/95`.
   - No `tailwind.config.js`, as cores do tema MIST são nomeadas como `brand.bg`, `brand.surface`, `brand.card`, `brand.purple`, etc. A chave `brand.dark` não existia, fazendo com que a classe `bg-brand-dark/95` não gerasse declaração CSS válida e resultasse em fundo transparente (`background-color: transparent`).
2. **Harmonização Visual Idêntica ao Dropdown de Notificações (`NotificationsDropdown.tsx`) e Modais:**
   - Container principal atualizado para:
     `bg-[#0b0f19]/95 backdrop-blur-xl border border-brand-purple/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-gray-200 mt-3`
   - Cabeçalho do Dropdown:
     `p-3.5 px-4 bg-brand-surface/80 border-b border-gray-800/80 flex items-center justify-between text-xs`
     com badge de contagem `bg-brand-purple/20 text-brand-purple border border-brand-purple/40 px-2 py-0.5 rounded-full font-bold`.
   - Seções categorizadas (Jogos, Jogadores, Grupos e Mercado):
     Badges temáticos com bordas e fundos escuros translúcidos (`bg-purple-950/20`, `bg-sky-950/20`, `bg-amber-950/20`, `bg-emerald-950/20`) e divisores `divide-y divide-gray-800/70`.
   - Interatividade de cards:
     Efeito hover aprimorado com `hover:bg-white/10 active:bg-white/15 transition-all duration-150`.
   - Rodapé informativo:
     `p-2.5 px-4 bg-brand-surface/60 border-t border-gray-800/80` com atalho de tecla ESC e indicação de busca instantânea.
3. **Governança, Testes e Docker:**
   - Validados **131/131 testes unitários** no frontend (26 arquivos de teste aprovados sem falhas ou avisos).
   - Build de produção compilado com sucesso (`tsc && vite build`).
   - Reconstrução e reinicialização com sucesso do container Docker `mist-frontend`.
   - Catalogação do caso de teste de regressão `REG-FRONT-03` no [`TESTS.md`](../TESTS.md).

**Resumo das saídas:**
- Arquivos modificados:
  - `frontend/src/components/GlobalSearchDropdown.tsx` (Estilização de fundo escuro, blur, bordas e sombras idênticas ao dropdown de notificações)
  - `TESTS.md` (Catálogo do teste de regressão `REG-FRONT-03`)
  - `prompts/mkritli_30th.md` (Registro do prompt 14 e histórico perpétuo)
- Validações:
  - 131/131 testes no frontend aprovados (vitest)
  - Build de produção compilado com sucesso (`npm run build`)
  - Container Docker `mist-frontend` reconstruído e ativo

---

### Prompt 15

**Entrada do Usuário:**
> manual test were ended, continue to implementing the next block. Remember to add data in DB to be able see in the populeted users and test a couple of common scenario from day a day steam users

**Decisões Arquiteturais e Técnicas Tomadas:**
1. **Implementação do Bloco 5: Showcase de Capturas de Tela (Tickets N-01 a N-06):**
   - **Novo Microsserviço UGC Service (`services/ugc-service/`):**
     - Criado serviço FastAPI dedicado rodando na porta 8006, com SQLite (`ugc.db`) e volume persistente `ugc_data` montado em `/app/data` (`data/uploads`).
     - `Screenshot` e `ScreenshotLike` com `UniqueConstraint("screenshot_id", "user_id")` garantindo integridade e unicidade de curtidas.
     - Endpoints REST implementados:
       - `POST /screenshots/upload`: Upload multipart/form-data com validação de extensão (.png, .jpg, .webp) e limite de 10 MB (**N-01**).
       - `GET /screenshots`: Listagem paginada com suporte a filtros por `game_id`, `user_id` e ordenação por `popular` (likes) ou `recent` (**N-03**).
       - `GET /screenshots/{id}`: Obtenção de captura específica com cálculo de `liked_by_me`.
       - `POST /screenshots/{id}/like` e `DELETE /screenshots/{id}/like`: Toggle atômico de curtidas (**N-04**).
       - `DELETE /screenshots/{id}`: Exclusão com controle estrito de posse do autor.
       - Montagem estática `/static/uploads` e endpoint `/uploads/{filename}` para servir as imagens.
   - **SDK MIST Client-Side (`mist_sdk.py`):**
     - Integrado método `take_screenshot(caption, image_bytes, ugc_api_url)` com construção multipart/form-data nativa (`stdlib-only`, zero dependências externas) e fallback tolerante a falhas salvando localmente na pasta `screenshots/` caso o serviço UGC esteja offline (**N-02**).
   - **API Gateway (`gateway/`):**
     - Configurado `UGC_SERVICE_URL = os.getenv("UGC_SERVICE_URL", "http://ugc-service:8006")`.
     - Adicionado proxy reverso `@app.api_route("/api/ugc/{path:path}")` com sanitização de cabeçalhos de identidade (remoção de `X-User-*` externos), validação de token JWT para rotas de mutação/upload/like e injeção transparente de `X-User-Id` e `X-User-Name`.
   - **Frontend MIST (`frontend/`):**
     - Atualizado `fetchApi` em `client.ts` para tratar `FormData` de forma transparente sem sobrescrever cabeçalhos `Content-Type: multipart/form-data; boundary=...`.
     - Criado cliente `ugcApi` e tipagens completas (`ScreenshotItem`, `ScreenshotUploadPayload`, `getUgcImageUrl`).
     - Criado componente `ScreenshotUploadModal.tsx` (**N-06**) com drag-and-drop, preview instantâneo via `URL.createObjectURL`, seletor de jogo, campo de legenda e feedback de envio.
     - Criado componente `ScreenshotsGallery.tsx` (**N-05**) com grid responsivo de miniaturas, visualizador Lightbox fullscreen com controles por teclado (Esc, setas), abas "Mais Recentes" vs "Mais Populares" e botão de curtida reativo.
     - Integrado na página `Social.tsx` com aba dedicada "Capturas de Tela" e no `GameDetailModal.tsx` com seção de "Capturas da Comunidade" específica do jogo.
2. **População Realista do Banco de Dados (`scripts/seed_rich_users.py`):**
   - Implementada função `seed_ugc()` que injeta 10 capturas de tela comunitárias de alta fidelidade para os jogos populares (`Elden Ring`, `The Witcher 3`, `Cyberpunk 2077`, `Baldur's Gate 3`, `Hollow Knight: Silksong`, `Control Resonant`, etc.) associadas aos usuários mockados (`mkritli`, `gabriel_t800`, `sarah_connor`, `elena_rpg`, `lucas_speed`).
   - Geração dinâmica de arquivos PNG válidos via stdlib (`zlib` e `struct`) no volume do container `mist-ugc-service`.
3. **Validação e Resolução de Mini-Jogos Pré-Existentes:**
   - Restaurados os arquivos de mini-jogos `services/store-service/app/data/games/forca.py`, `labirinto.py` e `quiz.py` integrados ao `mist_sdk`.
   - Total de testes da suíte completa de backend: **246 testes aprovados (0 falhas)** em todos os 7 microsserviços.
   - Total de testes da suíte completa de frontend: **141 testes aprovados (0 falhas)** em 28 arquivos de teste.

**Resumo das saídas:**
- Arquivos criados:
  - `services/ugc-service/requirements.txt`
  - `services/ugc-service/Dockerfile`
  - `services/ugc-service/app/main.py`
  - `services/ugc-service/app/db/database.py`
  - `services/ugc-service/app/models/screenshot.py`
  - `services/ugc-service/app/schemas/screenshot.py`
  - `services/ugc-service/app/services/screenshot_service.py`
  - `services/ugc-service/app/api/screenshots.py`
  - `services/ugc-service/tests/test_screenshots.py`
  - `gateway/tests/test_ugc_proxy.py`
  - `frontend/src/components/ScreenshotUploadModal.tsx`
  - `frontend/src/components/ScreenshotUploadModal.test.tsx`
  - `frontend/src/components/ScreenshotsGallery.tsx`
  - `frontend/src/components/ScreenshotsGallery.test.tsx`
  - `services/store-service/app/data/games/forca.py`
  - `services/store-service/app/data/games/labirinto.py`
  - `services/store-service/app/data/games/quiz.py`
- Arquivos modificados:
  - `docker-compose.yml` (Inclusão de `ugc-service`, volume `ugc_data` e variáveis)
  - `gateway/app/config.py` e `gateway/app/main.py` (Proxy reverso `/api/ugc/*`)
  - `services/store-service/app/data/mist_sdk.py` (Método `take_screenshot`)
  - `frontend/src/api/client.ts` (`ugcApi`, `fetchApi` FormData, tipagens e helper `getUgcImageUrl`)
  - `frontend/src/pages/Social.tsx` (Nova aba "Capturas de Tela")
  - `frontend/src/components/GameDetailModal.tsx` (Seção de Capturas da Comunidade)
  - `scripts/seed_rich_users.py` (Função `seed_ugc` com 10 capturas e imagens PNG)
  - `TESTS.md` (Catálogo de `UGC-UNIT-01..05`, `GATEWAY-UNIT-03`, `FRONT-UNIT-37..38`)
  - `prompts/mkritli_30th.md` (Registro do Prompt 15)
- Validações:
  - **387 testes automatizados no total (246 backend + 141 frontend), 100% verdes!**
  - Todos os 8 containers ativos e saudáveis no Docker Compose.

---

### Prompt 16 — Correção da Renderização de Imagens na Aba "Capturas de Tela"

**Entrada do Usuário:**
> "as imagens na captura de tela nao renderizaram na aba 'Capturas de Tela'"

**Decisões Arquiteturais e Técnicas Tomadas:**
1. **Diagnóstico da Falha Visual e de Roteamento:**
   - **Imagens do Seed Monocromáticas:** O script de seed original gerou arquivos PNG sintéticos através de repetição de bytes planos (400x225 monocromático escuro). Sob a sobreposição do gradiente preto do card, as imagens pareciam blocos vazios/pretos onde nada havia carregado.
   - **Tipagens Estritas de Compilação no Docker (`tsc`):** A interface `ScreenshotItem` no frontend omitia `file_url`, `username` e `filename`, fazendo com que `tsc && vite build` falhasse durante o build da imagem Docker do frontend, mantendo o container Nginx rodando bundles e configurações desatualizadas.
   - **Isolamento de Origem no Nginx:** O Nginx na porta 3000 não possuía rota de proxy para `/api/`, forçando o navegador a resolver as URLs de mídia em portas cruzadas (`3000` -> `8000`), suscetível a bloqueios de CORS ou acessos via `127.0.0.1` vs `localhost`.
   - **Ausência de Fallback de Carregamento/Erro:** As tags `<img>` não possuíam listener `onError` e `onLoad`, não fornecendo nenhum feedback caso o carregamento de rede sofresse atraso ou falhasse.

2. **Geração de Capturas de Tela Ricas em Alta Definição (1280x720):**
   - Criado [`scripts/generate_rich_screenshots.py`](../scripts/generate_rich_screenshots.py) com a biblioteca `Pillow`:
---

### Prompt 17 — Implementação do Bloco 6 da Trilha 3: Workshop de Conteúdo (Mods e Skins) — Tickets O-01 a O-06

**Prompt do Usuário:**
> "manual test were ended, continue to implementing the next block. Remember to add data in DB to be able see in the populeted users and test a couple of common scenario from day a day steam users"

**Decisões Arquiteturais e Técnicas Tomadas:**
1. **Modelagem de Domínio Relacional no `ugc-service` (Ticket O-01):**
   - Criados modelos relacionais em SQLAlchemy:
     - `WorkshopItem` (`services/ugc-service/app/models/workshop.py`): com `id`, `game_id`, `game_title`, `author_id`, `author_name`, `author_avatar`, `title`, `description`, `category` (Mod, Skin, Mapa, Tradução, Ferramenta), `tags`, `filename`, `file_url`, `file_size`, `preview_url`, `version`, contadores `downloads_count`, `subscriptions_count`, `rating` e timestamps.
     - `WorkshopSubscription` (`services/ugc-service/app/models/workshop.py`): tabela associativa de inscrições com `UniqueConstraint("user_id", "item_id")` garantindo integridade e idempotência nas inscrições de usuários.
2. **Serviços de Upload, Busca, Inscrição e Download (Tickets O-02 a O-05):**
   - Implementada a camada de serviço `WorkshopService` (`services/ugc-service/app/services/workshop_service.py`):
     - Upload multipart seguro de pacotes compactados (`.zip`, `.pak`, `.rar`, etc.) limitados a 50 MB, persistindo arquivos físicos em `UPLOADS_DIR` com UUIDs únicos e salvando capas de pré-visualização.
     - Consulta e busca textual com filtros combinados (`game_id`, `category`, `search`, `tag`, `sort_by`: `popular`, `downloads`, `recent`, `rating`).
     - Inscrição idempotente (`subscribe_item` e `unsubscribe_item`) atualizando atômica e confiavelmente os contadores `subscriptions_count`.
     - Download de pacotes com incremento atômico de `downloads_count`.
     - Exclusão protegida (`delete_item`): apenas o autor criador do mod pode excluí-lo, barrando terceiros com HTTP 403 Forbidden.
3. **Borda e API Gateway (Proxy Reverso Seguro):**
   - Rota `/api/ugc/workshop/items` mapeada no Gateway:
     - Leitura pública (sem obrigatoriedade de JWT) para visualização livre da vitrine da Oficina.
     - Rotas mutativas (`POST`, `DELETE`, `/subscribe`, `/upload`) exigem JWT válido, expurgando headers forjados e injetando `X-User-Id` e `X-User-Name` autenticados.
4. **Frontend — Vitrine, Upload e Gestão da Oficina (Ticket O-05):**
   - Criado `WorkshopUploadModal.tsx` com formulário multipart estilizado, seleção de categorias, versão, tags e validações locais de arquivos.
   - Criada página principal `Workshop.tsx` rica em recursos visuais com:
     - Hero banner temático "Oficina da Comunidade MIST".
     - Abas de navegação "Explorar Criações", "Mods Inscritos" e "Minhas Publicações".
     - Filtros rápidos por jogo do catálogo, busca textual e seleção de categorias em pills.
     - Ordenação dinâmica por Mais Populares, Mais Baixados e Recentes.
     - Grid de cards com thumbnail, tags, versão, badges de inscrito e botão rápido de toggle de inscrição.
     - Modal de detalhes completos do mod exibindo guia de uso, autor, versão, botão de download do pacote e botão de inscrição na biblioteca.
     - Controles de paginação quando houver múltiplas páginas de resultados.
   - Adicionada aba "Oficina" no menu lateral do sistema (`Sidebar.tsx`), no `NavigationTab` (`types/index.ts`) e no roteador principal (`App.tsx`).
5. **Integração no Perfil do Criador (Ticket O-06):**
   - Atualizado `Profile.tsx` para consumir criações da oficina via `ugcApi.getWorkshopItems({ author_id: user.id })`.
   - Item "Itens da Oficina" na lista lateral do perfil exibe a contagem real de itens publicados pelo jogador.
   - Ao clicar no item, abre modal dedicado com painel de métricas acumuladas: total de publicações, soma acumulada de downloads e soma acumulada de inscritos ativos, além da lista de criações e atalho direto para a Oficina.
6. **População do Banco com Cenários Autênticos da Steam (`scripts/seed_rich_users.py`):**
   - Inseridos 10 mods autênticos distribuídos entre os usuários do sistema:
     - *mkritli*: "Seamless Co-op Reforged" (Elden Ring, 1420 downloads, 4 inscritos) e "Basket Full of Equipment" (Baldur's Gate 3, 890 downloads, 2 inscritos).
     - *gabriel_t800*: "HD Reworked Project NextGen" (The Witcher 3, 2350 downloads, 3 inscritos) e "Photorealistic Brutalism ReShade" (Control, 410 downloads, 1 inscrito).
     - *sarah_connor*: "Night City Gang Wars & NCPD Tactical Overhaul" (Cyberpunk 2077, 1780 downloads, 2 inscritos) e "Monowire Neon Glow & Cyberware Aesthetics" (Cyberpunk 2077, 920 downloads, 2 inscritos).
     - *lucas_speed*: "Cockpit Telemetry HUD & Delta-V Flight Assistant" (Orbitals, 320 downloads, 1 inscrito) e "Hornet Crimson Cloak Skin" (Silksong, 2150 downloads, 2 inscritos).
     - *elena_rpg*: "5e Spells & Custom Subclasses Overhaul" (Baldur's Gate 3, 1920 downloads, 3 inscritos) e "Tradução Aprimorada PT-BR" (The Witcher 3, 670 downloads, 2 inscritos).
   - Gerados arquivos físicos correspondentes em `UPLOADS_DIR` e 22 inscrições cruzadas ativas no banco SQLite.
7. **Testes Automatizados (TDD Estrito) e Governança:**
   - Backend `ugc-service`: 15 testes aprovados (`test_screenshots.py` e `test_workshop.py`).
   - Backend `gateway`: 8 testes de proxy UGC aprovados (`test_ugc_proxy.py`).
   - Frontend: criados `Workshop.test.tsx` (5 testes) e `Profile.test.tsx` (2 testes), alcançando **148/148 testes aprovados em 30 arquivos de teste no Vitest**.
   - Total geral de testes automatizados do projeto: **404 testes passando 100%**.
   - Build de produção do frontend validado e deploy realizado no container Docker `mist-frontend`.

**Resumo das saídas:**
- Arquivos criados:
  - `services/ugc-service/app/models/workshop.py` (Modelos `WorkshopItem` e `WorkshopSubscription`)
  - `services/ugc-service/app/schemas/workshop.py` (Schemas Pydantic para Workshop)
  - `services/ugc-service/app/services/workshop_service.py` (Serviço de upload, filtros, subscrição e download)
  - `services/ugc-service/app/api/workshop.py` (Endpoints REST do Workshop)
  - `services/ugc-service/tests/test_workshop.py` (7 testes unitários pytest)
  - `frontend/src/components/WorkshopUploadModal.tsx` (Modal de publicação de mods)
  - `frontend/src/pages/Workshop.tsx` (Página completa da Oficina)
  - `frontend/src/pages/Workshop.test.tsx` (5 testes unitários Vitest)
  - `frontend/src/pages/Profile.test.tsx` (2 testes unitários Vitest)
- Arquivos modificados:
  - `services/ugc-service/app/db/database.py` e `main.py` (Registro de tabelas e routers de Workshop)
  - `gateway/app/main.py` e `gateway/tests/test_ugc_proxy.py` (Proxy seguro para Workshop)
  - `frontend/src/api/client.ts` (Métodos de API do Workshop e interface `ScreenshotUploadPayload`)
  - `frontend/src/types/index.ts` (Adicionado `'workshop'` a `NavigationTab`)
  - `frontend/src/components/Sidebar.tsx` (Botão e navegação para Oficina)
  - `frontend/src/App.tsx` (Roteamento e renderização condicional da Oficina)
  - `frontend/src/pages/Profile.tsx` (Estatísticas do criador e modal de criações da oficina)
  - `scripts/seed_rich_users.py` (Carga rica de 10 mods e 22 inscrições no UGC)
  - `TESTS.md` (Registro dos testes `UGC-UNIT-06..10`, `GATEWAY-UNIT-04`, `FRONT-UNIT-39` e `FRONT-UNIT-40`)
  - `prompts/mkritli_30th.md` (Registro perpétuo do Prompt 17)
- Validações:
  - Backend: **256 testes pytest aprovados**.
  - Frontend: **148 testes Vitest aprovados**.
  - Build de produção verificado com sucesso (`npm run build`).
  - Containers Docker ativos e sincronizados.

---

### Prompt 18

**Entrada do usuário:**
> adicionar imagem para cada um dos cards na aba oficina e obter uma captura de tela publica da internet para os screenshots na aba comunidade - capturas de tela

**Decisões arquiteturais e técnicas:**
1. **Aquisição de Mídias Públicas de Alta Definição:**
   - Criação do script de automação [`scripts/fetch_public_media.py`](../scripts/fetch_public_media.py) utilizando `urllib.request` e `PIL (Pillow)` para coletar e compor mídias em resolução nativa 1280x720 (16:9) a partir de repositórios públicos abertos da web.
2. **Screenshots da Comunidade (10 Jogos / Capturas Autênticas):**
   - Download de capturas públicas correspondentes aos jogos da vitrine comunitária:
     - `er_messmer.png`: *Elden Ring: Shadow of the Erdtree* (Castelo sombrio sob névoa e chamas - 1.08 MB).
     - `tw3_sunset.png`: *The Witcher 3: Wild Hunt* (Pôr do sol em Kaer Morhen com iluminação Ray Tracing - 1.11 MB).
     - `cp_dogtown.png`: *Cyberpunk 2077: Phantom Liberty* (Dogtown à noite sob neons ciano e magenta - 756 KB).
     - `bg3_party.png`: *Baldur's Gate 3* (Grupo de aventureiros reunido antes da batalha - 327 KB).
     - `bg3_city.png`: *Baldur's Gate 3* (Portões monumentais e muralhas da Cidade Baixa - 772 KB).
     - `control_brutalism.png`: *Control Resonant* (Setor monolítico da Oldest House com luz vermelha brutalista - 1.32 MB).
     - `orbitals_drift.png`: *Orbitals* (Visão orbital da Terra a partir da cabine em gravidade zero - 806 KB).
     - `fe_crit.png`: *Fire Emblem: Fortune's Weave* (Crítico cinematográfico com lâmina arcana - 1.35 MB).
     - `silksong_citadel.png`: *Hollow Knight: Silksong* (Cidadela subterrânea de Pharloom - 731 KB).
     - `onimusha_issen.png`: *Onimusha: Way of the Sword* (Combate samurai e golpe relâmpago Issen - 603 KB).
   - Aplicação de gradiente sutil de vinheta na base e tipografia integrada identificando o jogo e a cena.
3. **Cards da Oficina MIST (10 Mods / Capas Estilizadas com Badges):**
   - Composição de capas ricas com a estética visual oficial da Steam Workshop:
     - `mod_er_coop.png`: Seamless Co-op Reforged (1.07 MB).
     - `mod_bg3_basket.png`: Basket Full of Equipment (576 KB).
     - `mod_tw3_hd.png`: HD Reworked Project NextGen (2.28 MB).
     - `mod_control_reshade.png`: Photorealistic Brutalism ReShade (541 KB).
     - `mod_cp2077_ncpd.png`: Night City Gang Wars & NCPD Tactical Overhaul (1.16 MB).
     - `mod_cp2077_neon.png`: Monowire Neon Glow & Cyberware Aesthetics (1.38 MB).
     - `mod_orbitals_hud.png`: Cockpit Telemetry HUD & Delta-V Flight Assistant (1.16 MB).
     - `mod_silksong_cloak.png`: Hornet Crimson Cloak & Silver Needle Skin (1.50 MB).
     - `mod_bg3_spells.png`: 5e Spells & Custom Subclasses Overhaul (1.07 MB).
     - `mod_tw3_traducao.png`: Tradução Aprimorada PT-BR e Correções de Lore (567 KB).
   - Inclusão de badge superior estilizado "OFICINA MIST", banner inferior com categoria, título nítido e barra de realce temático na base com cores correspondentes a cada jogo.
4. **Sincronização de Storage e Roteamento Estático:**
   - Arquivos gravados no host em `services/ugc-service/app/data/uploads/` e sincronizados via `docker cp` para `/app/app/data/uploads/` do container `mist-ugc-service`.
   - Validação de entrega via HTTP 200 OK tanto pelo API Gateway (`http://localhost:8000/api/ugc/uploads/...`) quanto pelo proxy Nginx (`http://localhost:3000/api/ugc/uploads/...`).
5. **Garantia de Regressão e Validação da Suíte:**
   - 100% dos testes do frontend executados via Vitest: **148/148 testes aprovados em 30 arquivos**.
   - Integridade mantida nos 256 testes do backend (total do projeto: **404 testes passando**).

**Resumo das saídas:**
- Arquivos criados:
  - `scripts/fetch_public_media.py` (Script de download de imagens públicas e composição visual via Pillow)
- Arquivos de mídia gerados e sincronizados (20 imagens PNG em resolução 1280x720):
  - Screenshots: `er_messmer.png`, `tw3_sunset.png`, `cp_dogtown.png`, `bg3_party.png`, `bg3_city.png`, `control_brutalism.png`, `orbitals_drift.png`, `fe_crit.png`, `silksong_citadel.png`, `onimusha_issen.png`
  - Cards Oficina: `mod_er_coop.png`, `mod_bg3_basket.png`, `mod_tw3_hd.png`, `mod_control_reshade.png`, `mod_cp2077_ncpd.png`, `mod_cp2077_neon.png`, `mod_orbitals_hud.png`, `mod_silksong_cloak.png`, `mod_bg3_spells.png`, `mod_tw3_traducao.png`
- Arquivos modificados:
  - `prompts/mkritli_30th.md` (Registro do Prompt 18)
- Validações:
  - 20/20 mídias respondendo HTTP 200 OK com payload de imagem real (>300 KB até 2.2 MB).
  - 148 testes Vitest aprovados no frontend.
