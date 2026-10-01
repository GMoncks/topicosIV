# Registro de Prompts — gabriel-T800 (27th)

Arquivo diário de rastreamento de prompts e decisões técnicas para a sessão do desenvolvedor **gabriel-T800** no dia **27**.

---

## 2026-09-27 — Prompt 44

**Prompt do usuário:**

> Percebi ainda outros bugs:
> - No card do Mestre Dourado, a moldura parece ser um azul neon. No perfil em si está resolvido mesmo
> - Na hora de calcular o valor do saldo restante (após um Comprar Agora), o backend está retornando como  saldo restante o saldo restante - saldo do carrinho. Desse jeito, tendo um jogo no carrinho mas comprando um jogo que quase zere meu saldo, o "novo saldo" que aparece será negativo.
> - As conquistas que aparecem e são computadas nos cards dos jogos estão bugadas. Por exemplo, no Baldurs Gate estão aparecendo 6 conquistas (3 do Baldurs + 3 do MIST FORCA) e no MIST Labirinto estão aparecendo 6 conquistas (3 do Labirinto + 3 do Quiz)

**Decisões arquiteturais e técnicas:**

1. **Correção do Card da Moldura Mestre Dourada (`PointsShop.tsx` e `Profile.tsx`):**
   - **Causa raiz:** O preview do avatar na Loja de Pontos (`PointsShop.tsx`) e no inventário do Perfil (`Profile.tsx`) possuía classes CSS estáticas ciano/neon (`border-4 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.6)]`), fazendo qualquer moldura exibida nos cards de catálogo/inventário apresentar borda azul neon.
   - **Solução implementada:** Adicionada validação contextual (`isGold` / `isItemGold`) verificando se o ID (`frame_gold`), a URL do asset (`1618005182384` ou `gold`) ou o nome referem-se à moldura dourada. Caso positivo, são aplicadas classes douradas reluzentes (`border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.85)] ring-2 ring-amber-300/60`).

2. **Correção da Projeção de Saldo Pós-Checkout Unitário ("Comprar Agora"):**
   - **Causa raiz desvendada:** O backend do `store-service` opera com integridade estrita (rejeitando débitos negativos e abatendo exclusivamente os `game_ids` solicitados). No frontend ([`CheckoutModal.tsx`](../frontend/src/components/CheckoutModal.tsx)), a tela de sucesso renderizava `{formatCurrency(projectedBalance)}`, onde `projectedBalance = walletBalance - gamePrice`. Quando o callback `updateUserBalance(res.new_wallet_balance, ...)` atualizava o contexto do usuário para o saldo real já abatido pelo backend, o componente re-renderizava com `walletBalance` já reduzido, subtraindo `gamePrice` uma **segunda vez**! Isso provocava saldo restante incorreto ou até mesmo negativo caso a compra tivesse consumido a maior parte do saldo disponível.
   - **Solução implementada:** Criado estado explícito `finalBalance` em [`CheckoutModal.tsx`](../frontend/src/components/CheckoutModal.tsx) (e equivalentemente em [`CartDrawer.tsx`](../frontend/src/components/CartDrawer.tsx)), armazenando com fidelidade o `res.new_wallet_balance` devolvido pelo backend e renderizando-o de forma autoritativa na tela de sucesso.

3. **Purga e Isolamento de Conquistas Misturadas/Duplicadas (`library-service`):**
   - **Causa raiz desvendada:** Historicamente, o `FALLBACK_GAMES` em `seed_achievements.py` continha IDs desatualizados em relação ao catálogo canônico do `store-service` (ex: ID 13 como MIST Forca e ID 15 como MIST Quiz no fallback, contra ID 13 sendo Baldur's Gate 3, ID 14 sendo MIST Forca, ID 15 sendo MIST Labirinto e ID 16 sendo MIST Quiz no store oficial). Quando o seed rodou com base em títulos diferentes sem purga prévia, inseriu as conquistas de Baldur's Gate 3 no ID 13 sem remover as antigas de MIST Forca (totalizando 6), e as de MIST Labirinto no ID 15 sem remover as antigas de MIST Quiz (totalizando 6).
   - **Solução implementada:**
     - Alinhamento do `FALLBACK_GAMES` em [`seed_achievements.py`](../services/library-service/app/db/seed_achievements.py) com os 16 jogos oficiais e IDs exatos de 1 a 16.
     - Implementação de purga automática de conquistas órfãs e intrusas: para cada jogo, o `seed_achievements` agora deleta estritamente qualquer conquista cujo `achievement_id` não pertença à lista canônica do título correspondente (`db.query(Achievement).filter(Achievement.game_id == game_id, ~Achievement.achievement_id.in_(expected_ids)).delete()`).
     - Executada a purga e migração no startup do `library-service`, restabelecendo o isolamento: Baldur's Gate 3 com exatamente 3 conquistas próprias, MIST Forca com 3, MIST Labirinto com 3 e MIST Quiz com 3.

4. **Validação, Testes e Catálogo de Regressão:**
   - 73/73 testes unitários e de integração aprovados no frontend via Vitest (`npm test`).
   - Adicionados testes específicos:
     - `PointsShop.test.tsx`: validação de borda e brilho dourado (`border-amber-400`) para a Moldura Mestre Dourada.
     - `CheckoutModal.test.tsx`: validação de exibição do saldo autoritativo na tela de sucesso.
     - `test_achievements.py`: validação de purga e isolamento estrito de conquistas entre jogos.
   - Atualizado o catálogo [`TESTS.md`](../TESTS.md) com 3 novos casos de regressão: `REG-FRONT-06`, `REG-FRONT-07` e `REG-LIB-01`.
   - Containers Docker `frontend` e `library-service` reconstruídos e reiniciados com sucesso.

**Resumo das saídas:**

- Modificado: [`frontend/src/pages/PointsShop.tsx`](../frontend/src/pages/PointsShop.tsx) (borda dourada no preview da moldura do card).
- Modificado: [`frontend/src/pages/Profile.tsx`](../frontend/src/pages/Profile.tsx) (borda dourada no card de moldura do inventário).
- Modificado: [`frontend/src/components/CheckoutModal.tsx`](../frontend/src/components/CheckoutModal.tsx) (estado `finalBalance` e exibição autoritativa).
- Modificado: [`frontend/src/components/CartDrawer.tsx`](../frontend/src/components/CartDrawer.tsx) (estado `finalBalance` e exibição autoritativa).
- Modificado: [`services/library-service/app/db/seed_achievements.py`](../services/library-service/app/db/seed_achievements.py) (catálogo atualizado e rotina de purga).
- Modificado: [`services/library-service/tests/test_achievements.py`](../services/library-service/tests/test_achievements.py) (testes de isolamento e purga).
- Modificado: [`frontend/src/pages/PointsShop.test.tsx`](../frontend/src/pages/PointsShop.test.tsx).
- Modificado: [`frontend/src/components/CheckoutModal.test.tsx`](../frontend/src/components/CheckoutModal.test.tsx).
- Modificado: [`TESTS.md`](../TESTS.md) (registrados `REG-FRONT-06`, `REG-FRONT-07`, `REG-LIB-01`).
- Containers atualizados: `mist-frontend`, `mist-library-service`.

---

## 2026-09-27 — Prompt 45

**Prompt do usuário:**

> Novos ajustes:
> - Remova essa duplicidade de atividades falsas no feed e atividades
> - Vi que no chat com o MIST Bot, o input de texto fica em branco a medida que se escreve ou se usa uma das sugestões de texto. O input deveria mostrar o texto, obviamente
> - O Mist Bot não deveria estar inteligente já? Ou isso virá apenas ao fazer os tickets S-01 a S-04? Eu mandei para ele "Sim, eu gostaria de ajuda para ganhar as conquistas do Silksong" e ele respondeu o padrão "Conquistas são a melhor parte! A cada nova conquista você ganha XP para subir de nível no MIST. Precisa de dicas para alguma?". Essa é a mesma resposta que ele dá para a sugestão de mensagem "Como funcionam as conquistas?"

**Decisões arquiteturais e técnicas:**

1. **Saneamento e Deduplicação Estrita no Feed de Atividades (`social-service` e `frontend`):**
   - **Causa raiz:** Cada desbloqueio de conquista ou compra de jogo persistia um novo registro sem validação de unicidade prévia no banco `social.db`. Além disso, o seed e o histórico continham atividades com jogos inexistentes (*Space Marine 2*) e referências órfãs com fallback "Jogo #13".
   - **Solução implementada:**
     - Em `social_service.py`: adicionada verificação preventiva em `record_activity` para rejeitar duplicatas de `achievement_unlocked` e `game_purchased` do mesmo usuário, jogo e conquista.
     - Em `social_service.py`: aplicada deduplicação in-memory de múltiplas camadas em `list_activities` agrupando por chave composta (`user_id:type:game_key:ach_key`) e descartando títulos não pertencentes ao catálogo oficial (*Space Marine 2*).
     - Em `seed_social.py`: rotina de higienização no startup que elimina atividades com títulos inexistentes, purga duplicatas preservando o registro mais recente e sincroniza `game_id: 13` para `game_id: 14` (*MIST Forca*).
     - Em `library_service.py`: enriquecimento do payload de atividade com o `game_title` canônico no momento do desbloqueio, eliminando a ocorrência de strings genéricas "Jogo #X".
     - Em `Social.tsx`: adicionada deduplicação defensiva no frontend antes de alimentar o estado do feed.

2. **Correção de Visibilidade e Contraste no Chat com MIST Bot (`ChatWindow.tsx`):**
   - **Causa raiz:** O elemento `<input>` e os botões de sugestões rápidas utilizavam a classe `bg-brand-dark/80`, inexistente na paleta do `tailwind.config.js`. Por padrão, navegadores aplicavam fundo branco ou cinza claro padrão, enquanto o texto digitado recebia `text-white` (branco sobre branco), tornando os caracteres invisíveis.
   - **Solução implementada:** Substituição da classe para `bg-brand-card text-white` (fundo grafite escuro `#1a1a24` com texto branco `#ffffff` de alto contraste e foco estilizado em roxo da marca), garantindo legibilidade perfeita e imediata ao digitar ou acionar sugestões.

3. **Esclarecimento de Escopo e Inteligência Contextual do MIST Bot:**
   - **Esclarecimento arquitetural sobre os tickets S-01 a S-04:**
     - Os tickets S-01 a S-04 pertencem ao **AI Curator Avançado** da Loja (recomendações personalizadas na vitrine, carrossel "Porque você jogou X", alertas de desconto da wishlist e tendências de vendas).
     - O chat com o **MIST Bot** pertence ao ticket **G-04 / G-06** (*MIST Companion Bot*).
     - No ambiente local/desenvolvimento, a chave de API do Gemini no `.env` é fictícia/placeholder, retornando erro HTTP 400. Nesses casos, o bot recai sobre o fallback local.
   - **Aprimoramento da Inteligência Contextual:**
     - Expandido o método `companion_chat_reply` em `services/social-service/app/services/ai_client.py` com reconhecimento aprofundado de intenções e títulos do catálogo (*Hollow Knight: Silksong*, *Baldur's Gate 3*, *MIST Forca*, *MIST Labirinto*, *MIST Quiz*, *Elden Ring*, *Cyberpunk 2077*).
     - Quando o usuário pergunta sobre conquistas/dicas de *Silksong* (ex: *"Sim, eu gostaria de ajuda para ganhar as conquistas do Silksong"*), o bot reconhece o título e a intenção de auxílio e responde com estratégias reais (ataque diagonal com agulha da Hornet, mobilidade vertical, gestão de seda para cura nos momentos de abertura dos chefes e missões de NPCs em Pharloom) em vez de repetir a mensagem genérica estática.
     - Corrigido o filtro de fallback em `companion_chat_reply`: caso a chamada à LLM externa falhe e devolva a mensagem mock genérica `[MIST AI Mock]`, o bot descarta o mock e executa a resposta contextual de alta fidelidade.
     - Adicionadas variáveis de ambiente de IA (`AI_PROVIDER`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `AI_TIMEOUT_SECONDS`) no `docker-compose.yml` para o `social-service`.

4. **Testes, Validação e Atualização do Catálogo de Regressão:**
   - 75/75 testes de frontend aprovados via Vitest (`npm test`).
   - 19/19 testes de backend aprovados via Pytest no container `mist-social-service`.
   - Adicionados testes de regressão:
     - `ChatWindow.test.tsx`: validação de contraste com `bg-brand-card` e `text-white` no input e sugestões (`REG-FRONT-08`).
     - `Social.test.tsx`: validação de deduplicação estrita de atividades do feed (`REG-SOC-01`).
     - `test_companion_bot.py`: validação de resposta inteligente contextual para estratégias de *Silksong* (`REG-SOC-02` / `SOC-UNIT-09`).
   - Atualizado o catálogo [`TESTS.md`](../TESTS.md) com `REG-FRONT-08`, `REG-SOC-01` e `REG-SOC-02`.
   - Containers Docker `mist-frontend` e `mist-social-service` reconstruídos e reiniciados com sucesso.

**Resumo das saídas:**

- Modificado: [`frontend/src/components/ChatWindow.tsx`](../frontend/src/components/ChatWindow.tsx) (fundo e contraste com `bg-brand-card` e `text-white`).
- Modificado: [`frontend/src/components/ChatWindow.test.tsx`](../frontend/src/components/ChatWindow.test.tsx) (teste de contraste `REG-FRONT-08`).
- Modificado: [`frontend/src/pages/Social.tsx`](../frontend/src/pages/Social.tsx) (deduplicação defensiva no feed).
- Modificado: [`frontend/src/pages/Social.test.tsx`](../frontend/src/pages/Social.test.tsx) (teste de deduplicação `REG-SOC-01`).
- Modificado: [`services/social-service/app/services/social_service.py`](../services/social-service/app/services/social_service.py) (deduplicação no registro e consulta de atividades).
- Modificado: [`services/social-service/app/db/seed_social.py`](../services/social-service/app/db/seed_social.py) (purga de duplicatas e remoção de atividades mock).
- Modificado: [`services/social-service/app/services/ai_client.py`](../services/social-service/app/services/ai_client.py) (motor contextual para jogos do catálogo e filtro de fallback mock).
- Modificado: [`services/social-service/tests/test_companion_bot.py`](../services/social-service/tests/test_companion_bot.py) (teste de inteligência contextual `SOC-UNIT-09` / `REG-SOC-02`).
- Modificado: [`services/library-service/app/services/library_service.py`](../services/library-service/app/services/library_service.py) (título do jogo canônico no registro de atividade de conquista).
- Modificado: [`docker-compose.yml`](../docker-compose.yml) (injeção das variáveis de IA no `social-service`).
- Modificado: [`TESTS.md`](../TESTS.md) (registrados `REG-FRONT-08`, `REG-SOC-01` e `REG-SOC-02`).
- Containers atualizados: `mist-frontend`, `mist-social-service`, `mist-library-service`.

