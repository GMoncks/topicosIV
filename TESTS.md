# TESTS.md

## Runners registrados
- pytest → comando-base: `pytest`, diretório: `.`
- vitest → comando-base: `npm --prefix frontend run test:unit`, diretório: `.`
- playwright → comando-base: `npm --prefix frontend run test:e2e`, diretório: `.`

## Unitários

### Autenticação (Auth Service)
#### AUTH-UNIT-01 — Validação de hash e verificação de senha
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/auth-service/tests/test_auth.py -k "test_bcrypt_hashing_and_verification or test_jwt_generation_and_decoding"`
- Pré-condições: Módulo de hashing de senhas e geração de JWT implementados no `auth-service`.
- Passos:
  - Dado uma senha de usuário em texto plano e um payload de autenticação
  - Quando a função de hash e criação de token for executada
  - Então a senha gerada valida positivamente e o JWT gerado contém os claims esperados
- Resultado esperado: Criptografia com bcrypt e tokens JWT emitidos e decodificados com sucesso.
- Rastreabilidade: `services/auth-service/app/services/auth_service.py`
- Observações: Teste unitário puro isolado em memória.

#### AUTH-UNIT-02 — Validação de regras estritas de complexidade de senha
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/auth-service/tests/test_auth.py -k "test_password_strength_validation_rejections"`
- Pré-condições: Schema `UserRegisterRequest` com validator de força de senha no `auth-service`.
- Passos:
  - Dado tentativas de cadastro com senhas com menos de 8 caracteres, sem maiúscula, sem minúscula, sem número ou sem símbolo
  - Quando a validação do schema Pydantic for executada
  - Então a requisição deve ser rejeitada com erro 422 e mensagem explicativa
- Resultado esperado: Rejeição de senhas fracas e aprovação exclusiva de senhas complexas.
- Rastreabilidade: `services/auth-service/app/schemas/user.py`

#### AUTH-UNIT-03 — Validação de segurança estrita em ambiente de produção (JWT_SECRET_KEY)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/auth-service/tests/test_auth.py -k "test_production_security_validation_rejection"`
- Pré-condições: Módulo `auth_service.py` com guard clause para `ENVIRONMENT=production`.
- Passos:
  - Dado o ambiente configurado como `ENVIRONMENT=production` e com a chave padrão de desenvolvimento
  - Quando o módulo de autenticação for carregado
  - Então uma exceção `RuntimeError` de configuração insegura deve ser disparada
- Resultado esperado: Falha rápida e bloqueio de inicialização insegura em produção.
- Rastreabilidade: `services/auth-service/app/services/auth_service.py`

#### AUTH-UNIT-04 — Débito com saldo suficiente e rejeição por saldo insuficiente
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/auth-service/tests/test_wallet.py -k "test_debit_wallet_sufficient_funds or test_debit_wallet_insufficient_funds"`
- Pré-condições: Usuário cadastrado com saldo em carteira.
- Passos:
  - Dado um usuário com R$ 200,00 de saldo
  - Quando tenta debitar R$ 47,49 (sucesso -> R$ 152,51) e posteriormente R$ 250,00 (insuficiente)
  - Então a primeira operação deduz com precisão decimal e a segunda é rejeitada com HTTP 400 Bad Request
- Resultado esperado: Integridade atômica do saldo da carteira MIST.
- Rastreabilidade: `services/auth-service/app/services/auth_service.py`

#### AUTH-UNIT-05 — Estorno / Crédito compensatório na carteira
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/auth-service/tests/test_wallet.py -k "test_credit_wallet_and_compensation"`
- Pré-condições: Usuário com histórico de débito na carteira.
- Passos:
  - Dado um usuário com saldo debitado previamente
  - Quando o endpoint POST /users/{id}/wallet/credit for acionado com justificativa de Saga Rollback
  - Então o saldo é incrementado com exatidão e retorna os saldos anterior e atual
- Resultado esperado: Retorno HTTP 200 e reconstituição do saldo anterior.
- Rastreabilidade: `services/auth-service/app/services/auth_service.py`

### Loja e Catálogo (Store Service)
#### STORE-UNIT-01 — Criação e tipagem do modelo Game
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_games.py -k "test_game_model_creation"`
- Pré-condições: Modelo SQLAlchemy `Game` definido com todos os 11 atributos obrigatórios.
- Passos:
  - Dado os atributos de um jogo incluindo título, descrição, preço, tags, categoria, banner_url, screenshots, release_date, publisher e review_score
  - Quando a entidade Game for instanciada e persistida no banco
  - Então todos os campos e serializações para dicionário refletem os tipos e valores corretos
- Resultado esperado: Persistência íntegra de todos os tipos e serialização ISO da data.
- Rastreabilidade: `services/store-service/app/models/game.py`

#### STORE-UNIT-02 — Integridade e idempotência do catálogo de seed de jogos
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_games.py -k "test_seed_games_catalog_integrity"`
- Pré-condições: Função `seed_games` e lista `SEED_GAMES` implementadas.
- Passos:
  - Dado o banco de dados vazio
  - Quando a função de seed for executada uma e duas vezes
  - Então são inseridos os jogos do catálogo incluindo os mini-jogos executáveis, zero na segunda execução, e todos os jogos obrigatórios possuem datas e preços exatos
- Resultado esperado: Catálogo populado com jogos com dados realistas e idempotência preservada.
- Rastreabilidade: `services/store-service/app/db/seed.py`

#### STORE-UNIT-03 — Download dinâmico do pacote de jogo (.zip com game.py, mist_sdk.py e session.json)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_download.py`
- Pré-condições: Endpoints `/games/{id}/download` implementados no `store-service` com os 3 mini-jogos disponíveis.
- Passos:
  - Dado uma requisição de download para um jogo executável autenticada com headers `X-User-Id` e `X-User-Token`
  - Quando o endpoint GET `/games/{id}/download` for acionado
  - Então o servidor responde com HTTP 200, Content-Type `application/zip` e o arquivo contém `game.py`, `mist_sdk.py` e `session.json` com os dados do usuário
- Resultado esperado: Pacote zip íntegro e executável gerado dinamicamente para o jogador.
- Rastreabilidade: `services/store-service/app/services/store_service.py`, `services/store-service/app/api/routes.py`

#### STORE-UNIT-04 — Validação do SDK client-side (mist_sdk.py) e compilação dos mini-jogos
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_sdk_and_games.py`
- Pré-condições: Módulo `mist_sdk.py` e mini-jogos `forca.py`, `labirinto.py`, `quiz.py` criados em `app/data/`.
- Passos:
  - Dado os scripts Python dos jogos e o módulo SDK
  - Quando a compilação do bytecode e execução do SDK em sandbox forem testadas
  - Então todos os arquivos compilam sem erros de sintaxe e o SDK opera com resiliência mesmo offline
- Resultado esperado: Zero dependências externas (stdlib-only) e resiliência offline do SDK garantidas.
- Rastreabilidade: `services/store-service/app/data/mist_sdk.py`, `services/store-service/app/data/games/`

#### STORE-UNIT-05 — Recomendações do AI Curator para visitante sem autenticação (G-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_curator.py -k "test_curator_recommendations_guest"`
- Pré-condições: Catálogo de jogos inicializado e rota `GET /store/recommendations` disponível.
- Passos:
  - Dado uma requisição anônima sem credenciais de autenticação
  - Quando a rota de recomendações for consultada com parâmetro `limit=4`
  - Então o serviço retorna os 4 melhores jogos do catálogo enriquecidos com score de afinidade e justificativa em português
- Resultado esperado: Retorno HTTP 200 com array de jogos decorados por `recommendation_score` e `recommendation_reason`.
- Rastreabilidade: `services/store-service/app/services/store_service.py`, `services/store-service/app/api/routes.py`

#### STORE-UNIT-06 — Recomendações personalizadas do AI Curator com histórico e tags (G-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_curator.py -k "test_curator_recommendations_authenticated"`
- Pré-condições: Usuário autenticado com jogos na biblioteca ou itens favoritados na wishlist.
- Passos:
  - Dado um usuário identificado via `X-User-Id`
  - Quando a rota `GET /store/recommendations` for executada
  - Então o Curator consulta a biblioteca e a wishlist do usuário e calcula scores personalizados
- Resultado esperado: Retorno HTTP 200 com recomendações ajustadas ao perfil de preferências do usuário.
- Rastreabilidade: `services/store-service/app/services/store_service.py`, `services/store-service/app/api/routes.py`

#### STORE-UNIT-07 — Criação e atualização (upsert) de avaliações de jogos (H-01/H-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_reviews.py -k "test_post_review_creates_with_playtime or test_post_review_twice_updates_existing"`
- Pré-condições: Jogo existente no catálogo; library-service mockado confirmando posse e horas jogadas.
- Passos:
  - Dado um usuário autenticado que possui o jogo na biblioteca
  - Quando publica uma avaliação pela primeira vez e depois publica novamente para o mesmo jogo
  - Então a primeira chamada cria o registro (HTTP 201) e a segunda atualiza o mesmo registro (HTTP 200), sem duplicar linhas
- Resultado esperado: No máximo uma avaliação por par (usuário, jogo), com `playtime_at_review` sempre atualizado.
- Rastreabilidade: `services/store-service/app/services/review_service.py`, `services/store-service/app/models/review.py`

#### STORE-UNIT-08 — Falha fechada na validação de posse via library-service (H-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_reviews.py -k "test_post_review_requires_ownership or test_post_review_fails_closed_when_library_unavailable"`
- Pré-condições: library-service mockado retornando `owned: false`, erro de conexão ou HTTP 500.
- Passos:
  - Dado que o usuário não possui o jogo ou o library-service está indisponível
  - Quando tenta publicar uma avaliação
  - Então a requisição é rejeitada com HTTP 403 (sem posse) ou HTTP 503 (serviço indisponível), sem criar registro
- Resultado esperado: Nenhuma avaliação é criada sem confirmação positiva de posse.
- Rastreabilidade: `services/store-service/app/services/review_service.py`

#### STORE-UNIT-09 — Listagem de avaliações com ordenação e filtro (H-05)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_reviews.py -k "test_list_reviews_default_order_is_most_recent_first or test_list_reviews_sorted_by_helpful or test_list_reviews_filters_by_recommendation"`
- Pré-condições: Múltiplas avaliações cadastradas para o mesmo jogo, com votos úteis variados.
- Passos:
  - Dado várias avaliações publicadas para um jogo
  - Quando `GET /games/{id}/reviews` é chamado com `sort=recent`, `sort=helpful` ou `is_recommended`
  - Então a lista retorna na ordem e no recorte correspondentes
- Resultado esperado: Ordenação e filtros corretos, com paginação (`skip`/`limit`) íntegra.
- Rastreabilidade: `services/store-service/app/services/review_service.py`

#### STORE-UNIT-10 — Voto útil idempotente e bloqueio de autovoto (H-02); aprovação calculada dinamicamente (H-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_reviews.py -k "test_helpful_is_idempotent_per_user or test_helpful_cannot_vote_own_review or test_game_detail_injects_approval_from_real_reviews"`
- Pré-condições: Avaliações publicadas por diferentes usuários.
- Passos:
  - Dado um review de outro usuário, um segundo voto "útil" do mesmo votante e uma tentativa de voto no próprio review
  - Quando os endpoints `POST /reviews/{id}/helpful` e `GET /games/{id}` são chamados
  - Então o primeiro voto conta (201), o repetido é idempotente (200, mesma contagem), o autovoto é rejeitado (403), e `approval_pct`/`approval_label` refletem exatamente a proporção real de recomendações positivas
- Resultado esperado: Extrato de utilidade e aprovação sempre consistentes com os dados reais.
- Rastreabilidade: `services/store-service/app/services/review_service.py`, `services/store-service/app/api/routes.py`

#### STORE-UNIT-11 — Cálculo e rota de Top Vendidos a partir de checkouts (S-01)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_ai_curator_advanced.py -k "test_calculate_top_sellers_ranking or test_top_sellers_api_endpoint"`
- Pré-condições: Módulo `ai_trends.py` e compras registradas na tabela `purchases`.
- Passos:
  - Dado compras com status "completed" registradas no banco para diferentes jogos
  - Quando a função de cálculo de Top Vendidos e o endpoint GET /store/trends/top-sellers forem acionados
  - Então o ranking reflete a contagem decrescente exata de vendas de cada jogo
- Resultado esperado: Retorno HTTP 200 com array ordenado por popularidade de vendas.
- Rastreabilidade: `services/store-service/app/services/ai_trends.py`, `services/store-service/app/api/routes.py`

#### STORE-UNIT-12 — Algoritmo de jogos 'Em Alta' (Trending) com compras recentes e notas (S-01)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_ai_curator_advanced.py -k "test_calculate_trending_games or test_trending_api_endpoint"`
- Pré-condições: Módulo `ai_trends.py` com fórmula de peso para compras recentes, review_score e desconto.
- Passos:
  - Dado jogos com compras na janela de 7 dias e avaliações positivas
  - Quando a função de cálculo de trending e o endpoint GET /store/trends/trending forem chamados
  - Então os jogos com maior tração recente e satisfação recebem os maiores scores de tendência
- Resultado esperado: Retorno HTTP 200 com ordenação correta e justificativa de tendência.
- Rastreabilidade: `services/store-service/app/services/ai_trends.py`, `services/store-service/app/api/routes.py`

#### STORE-UNIT-13 — Justificativas contextuais em linguagem natural do AI Curator (S-02)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_ai_curator_advanced.py -k "test_contextual_ai_curator_justifications"`
- Pré-condições: Módulo `ai_curator.py` com gerador de justificativa por biblioteca e tags.
- Passos:
  - Dado uma lista de jogos jogados pelo usuário e um jogo alvo da loja
  - Quando o gerador de justificativa for acionado
  - Então gera explicação em linguagem natural conectando o jogo anterior com o jogo sugerido ("Porque você jogou...")
- Resultado esperado: Textos explicativos coesos, amigáveis e contextuais.
- Rastreabilidade: `services/store-service/app/services/ai_curator.py`, `services/store-service/app/services/store_service.py`

#### STORE-UNIT-14 — Notificador proativo de descontos em itens da Wishlist (S-03)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_ai_curator_advanced.py -k "test_wishlist_discount_alerts or test_wishlist_discount_alerts_api_endpoint"`
- Pré-condições: Jogos com desconto na tabela `games` e salvos na lista de desejos do usuário.
- Passos:
  - Dado um usuário com jogos em promoção na Wishlist
  - Quando a rota GET /store/wishlist/alerts for consultada com cabeçalho de autenticação
  - Então retorna apenas os itens com desconto ativo, percentual, economia em reais e mensagem de oportunidade
- Resultado esperado: Alertas proativos com cálculo exato de economia e mensagem personalizada.
- Rastreabilidade: `services/store-service/app/services/wishlist_ai.py`, `services/store-service/app/api/routes.py`

#### STORE-UNIT-15 — Catálogo expandido, jogos promocionais e persistência de modificações em banco pós-restart
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `.venv/bin/pytest services/store-service/tests/test_promotional_games_and_persistence.py`
- Pré-condições: Módulo `seed.py` e `database.py` com esquema de persistência idempotente e jogos promocionais configurados.
- Passos:
  - Dado o catálogo de 25 jogos com múltiplos títulos em promoção ativa (descontos de 15% a 75%)
  - Quando a aplicação inicializa, `seed_games` popula o catálogo inicial e os jogos promocionais
  - Quando um dado do jogo é modificado posteriormente no banco de dados (ex: preço, desconto, descrição)
  - Quando a aplicação reinicia e executa novamente o ciclo de boot
  - Então as modificações feitas em banco são preservadas intactas, não sendo sobrescritas pelo seed
- Resultado esperado: Catálogo com 25 jogos carregado no boot e modificações feitas em tempo de execução 100% persistidas.
- Rastreabilidade: `services/store-service/app/db/seed.py`, `services/store-service/app/db/database.py`, `services/store-service/app/schemas/game.py`

### Social e Amigos (Social Service)
#### SOCIAL-UNIT-01 — Envio e aceitação de solicitações de amizade

- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_social.py -k "test_friend_request_flow"`
- Pré-condições: Modelos `Friend`, `Message`, `Activity` e rotas `/friends/request` e `/friends/accept/{id}` implementados.
- Passos:
  - Dado dois usuários autenticados (User 1 e User 2)
  - Quando User 1 envia convite de amizade e User 2 aceita
  - Então a relação transiciona de `pending` para `accepted` e ambos passam a constar na lista mútua de amigos
- Resultado esperado: Fluxo bilateral de amizade executado com sucesso e persistido no SQLite `social.db`.
- Rastreabilidade: `services/social-service/app/services/social_service.py`

#### SOCIAL-UNIT-02 — Validação de regras e restrições de amizade (auto-solicitação e duplicidade)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_social.py -k "test_cannot_friend_self or test_duplicate_friend_request or test_only_addressee_can_accept"`
- Pré-condições: Validações de integridade e segurança no `SocialService`.
- Passos:
  - Dado tentativas de enviar pedido para si mesmo, duplicar pedido pendente ou aceitar pedido alheio
  - Quando as rotas correspondentes forem chamadas
  - Então o serviço rejeita com códigos HTTP 400 (Bad Request) ou 403 (Forbidden)
- Resultado esperado: Proteção de integridade social respeitada estritamente.
- Rastreabilidade: `services/social-service/app/services/social_service.py`

#### SOCIAL-UNIT-03 — Remoção de amizade e listagem exclusiva de amigos aceitos
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_social.py -k "test_delete_friendship"`
- Pré-condições: Endpoints `DELETE /friends/{id}` e `GET /friends` implementados.
- Passos:
  - Dado uma amizade ativa entre dois usuários
  - Quando qualquer um dos participantes requisita a exclusão da amizade
  - Então a relação é removida e a lista de amigos de ambos retorna vazia
- Resultado esperado: Desvinculação imediata com resposta idempotente.
- Rastreabilidade: `services/social-service/app/services/social_service.py`

#### SOCIAL-UNIT-04 — Conexão WebSocket de chat, envio/recebimento de mensagens e indicador de digitação (F-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_social.py -k "test_websocket_chat_send_receive_and_history or test_websocket_chat_typing_indicator or test_chat_mark_read"`
- Pré-condições: ChatConnectionManager e rotas WS /ws/chat/{room_id} e POST /chat/{room_id}/read implementados.
- Passos:
  - Dado dois usuários conectados via WebSocket na mesma sala de chat (ex: direct_1_2)
  - Quando um usuário envia uma mensagem de texto ou altera o status de digitação (typing)
  - Então a mensagem é distribuída em tempo real para os membros da sala e persistida no banco com suporte a marcação de leitura
- Resultado esperado: Comunicação bidirecional síncrona sem perda de pacotes e broadcast de indicador de digitação.
- Rastreabilidade: `services/social-service/app/services/chat_manager.py`, `services/social-service/app/api/routes.py`

#### SOCIAL-UNIT-05 — Conexão WebSocket de presença, snapshot inicial e transição para status de jogo (F-04 & F-05)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_social.py -k "test_websocket_presence_connect_and_snapshot or test_presence_status_update_playing or test_list_friends_with_presence_and_profiles"`
- Pré-condições: PresenceManager e endpoints WS /ws/presence e POST /presence/status ativos.
- Passos:
  - Dado um usuário conectado ao canal WebSocket de presença
  - Quando conecta na plataforma e posteriormente inicia um jogo (status playing)
  - Então recebe o snapshot inicial de amigos online e subsequentes broadcasts de atualização de status e título do jogo ativo
- Resultado esperado: Snapshot de presença imediato e propagação reativa de status de gameplay para amigos conectados.
- Rastreabilidade: `services/social-service/app/services/presence_manager.py`, `services/social-service/app/api/routes.py`

#### SOCIAL-UNIT-06 — Injeção permanente do MIST Companion Bot na lista de amigos (G-04)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_companion_bot.py -k "test_bot_presence_in_friend_list"`
- Pré-condições: Serviço Social ativo e endpoint `GET /friends`.
- Passos:
  - Dado um usuário autenticado consultando a lista de amigos
  - Quando a rota `GET /friends` for chamada
  - Então o contato virtual MIST Bot (`friend_user_id: 0`, `is_bot: True`) está presente com status online
- Resultado esperado: Presença garantida do MIST Bot para qualquer usuário sem necessidade de solicitação manual.
- Rastreabilidade: `services/social-service/app/services/social_service.py`, `services/social-service/app/schemas/friend.py`

#### SOCIAL-UNIT-07 — Auto-resposta do Companion Bot via endpoint REST e WebSocket (G-04)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_companion_bot.py -k "test_bot_chat_message_auto_reply_rest or test_bot_websocket_chat_flow"`
- Pré-condições: Sala de chat direta com o bot (`direct_0_{user_id}`).
- Passos:
  - Dado uma mensagem enviada pelo usuário para a sala do bot
  - Quando a mensagem for recebida via REST ou WebSocket
  - Então o servidor emite indicador de digitação, chama o `AIClient.companion_chat_reply` e persiste/transmite a resposta do bot (`sender_id: 0`)
- Resultado esperado: Conversação fluida e automática do bot com respostas contextuais em tempo real.
- Rastreabilidade: `services/social-service/app/api/routes.py`, `services/common/ai_client.py`

#### SOCIAL-UNIT-08 — Modelo e ciclo de vida de Notificações com unread_count (Q-01 & Q-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `./.venv/bin/pytest services/social-service/tests/test_notifications.py -k "test_notification_model_creation or test_create_and_list_notifications"`
- Pré-condições: Modelo `Notification` e rotas `/notifications` implementadas no `social-service`.
- Passos:
  - Dado notificações criadas para um usuário (pedidos de amizade, ofertas de desconto na wishlist, etc.)
  - Quando a listagem de notificações for requisitada com o header `X-User-Id`
  - Então retorna a lista ordenada por data decrescente com cálculo exato de `unread_count` e suporte a paginação
- Resultado esperado: Retorno HTTP 200/201 e integridade dos metadados de notificação.
- Rastreabilidade: `services/social-service/app/models/notification.py`, `services/social-service/app/services/notification_service.py`

#### SOCIAL-UNIT-09 — Marcação individual e em lote de notificações como lidas com isolamento entre usuários (Q-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `./.venv/bin/pytest services/social-service/tests/test_notifications.py -k "test_mark_notification_as_read or test_mark_all_notifications_as_read or test_notification_user_isolation"`
- Pré-condições: Endpoints `/notifications/{id}/read` e `/notifications/read-all` implementados.
- Passos:
  - Dado notificações não lidas associadas a um usuário
  - Quando o usuário marcar uma notificação individual ou todas como lidas
  - Então o status é atualizado para `is_read = True`, decrementando o `unread_count`
  - E quando outro usuário tenta acessar ou marcar como lida notificação de terceiro, a operação é rejeitada com 404
- Resultado esperado: Atualização correta de status e isolamento estrito entre usuários.
- Rastreabilidade: `services/social-service/app/api/notifications.py`

#### SOCIAL-UNIT-10 — Push de notificações em tempo real via WebSocket e NotificationManager (Q-03 & Q-04)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `./.venv/bin/pytest services/social-service/tests/test_notifications.py -k "test_websocket_notifications_broadcast"`
- Pré-condições: `NotificationManager` e endpoint `WS /ws/notifications` ativos no `social-service`.
- Passos:
  - Dado um usuário conectado ao WebSocket de notificações com seu ID
  - Quando uma nova notificação for criada no sistema para esse usuário
  - Então o payload completo da notificação é transmitido em tempo real através do socket ativo sem requisição de polling
- Resultado esperado: Entrega imediata de eventos via WebSocket com formato JSON padronizado.
- Rastreabilidade: `services/social-service/app/services/notification_manager.py`, `services/social-service/app/api/notifications.py`


### Inteligência Artificial e Agentes (MIST AI)
#### AI-UNIT-01 — Resolução multi-provedor e fallback determinístico do AIClient
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/common/tests/test_ai_client.py -k "test_ai_client_provider_resolution or test_ai_client_mock_text_and_json_generation or test_ai_client_fallback_on_network_error"`
- Pré-condições: Módulo `services/common/ai_client.py` implementado com suporte a Gemini, OpenAI, Groq e Mock.
- Passos:
  - Dado instâncias do `AIClient` configuradas com chaves distintas ou sem chaves
  - Quando a resolução de provedor e chamadas com falha simulada de rede forem executadas
  - Então o cliente resolve os provedores na prioridade correta e aciona o fallback mock sem propagar exceções
- Resultado esperado: Seleção precisa e resiliência com fallback determinístico local.
- Rastreabilidade: `services/common/ai_client.py`

#### AI-UNIT-02 — Heurísticas determinísticas das personas MIST (Curator, Quest Master, Companion Bot)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/common/tests/test_ai_client.py -k "test_ai_curator_mock_recommendations or test_ai_quest_master_mock_quests or test_ai_companion_bot_mock_chat"`
- Pré-condições: Métodos `curate_recommendations`, `generate_dynamic_quests` e `companion_chat_reply` disponíveis no `AIClient`.
- Passos:
  - Dado perfis de usuário, bibliotecas e histórico de chat
  - Quando as personas forem acionadas no modo mock
  - Então recomendações personalizadas por tags, missões semanais estruturadas e respostas conversacionais coerentes são retornadas
- Resultado esperado: Retorno consistente e estruturado para todas as personas de IA do ecossistema MIST.
- Rastreabilidade: `services/common/ai_client.py`

### Biblioteca e Licenças (Library Service)
#### LIB-UNIT-01 — Criação e valores padrão do modelo LibraryItem
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_library.py -k "test_lib_unit_01_create_library_item_defaults"`
- Pré-condições: Modelo SQLAlchemy `LibraryItem` implementado.
- Passos:
  - Dado um `user_id` e `game_id`
  - Quando a entidade `LibraryItem` for instanciada e persistida no banco SQLite
  - Então o ID é gerado, `playtime_minutes` inicia em 0, `is_installed` inicia como False, `last_played` é None e `acquired_at` é preenchido automaticamente
- Resultado esperado: Valores padrão persistidos e serialização para dict íntegra.
- Rastreabilidade: `services/library-service/app/models/library_item.py`

#### LIB-UNIT-02 — Restrição de unicidade (user_id, game_id) em LibraryItem
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_library.py -k "test_lib_unit_02_unique_constraint_user_game"`
- Pré-condições: UniqueConstraint configurada na tabela `library_items`.
- Passos:
  - Dado um item de biblioteca existente para o par (user_id=1, game_id=10)
  - Quando houver tentativa de persistir outro item com o mesmo par
  - Então o banco de dados rejeita a operação com `IntegrityError`
- Resultado esperado: Violação de chave única impedindo duplicação de posse no nível de banco de dados.
- Rastreabilidade: `services/library-service/app/models/library_item.py`

#### LIB-UNIT-03 — Modelo SQLAlchemy GameSession e ciclo de telemetria
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_sessions.py -k "test_session_lifecycle_start_ping_end"`
- Pré-condições: Tabela `game_sessions` inicializada no SQLite.
- Passos:
  - Dado um registro de `GameSession` instanciado com status ativo
  - Quando a sessão for persistida e atualizada com pings de telemetria
  - Então o identificador `session_id` é gerado, a duração é acumulada e o status encerra com timestamp de término
- Resultado esperado: Persistência íntegra da sessão de jogo e métodos de serialização para dict.
- Rastreabilidade: `services/library-service/app/models/game_session.py`, `services/library-service/app/services/library_service.py`

#### LIB-UNIT-04 — Geração dinâmica e idempotência de missões semanais pelo Quest Master (G-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_quest_master.py -k "test_generate_dynamic_quests or test_idempotent_weekly_quests"`
- Pré-condições: Tabela `dynamic_quests` inicializada e rota `GET /library/games/{game_id}/quests` implementada.
- Passos:
  - Dado um jogador autenticado consultando as missões de um jogo específico
  - Quando a rota de missões semanais for acionada uma e sucessivas vezes no mesmo ciclo semanal
  - Então exatamente 3 missões contextuais são geradas na primeira chamada e retornadas identicamente em chamadas subsequentes
- Resultado esperado: Retorno HTTP 200 contendo lista de 3 missões estruturadas com XP, critérios e idempotência preservada.
- Rastreabilidade: `services/library-service/app/models/quest.py`, `services/library-service/app/services/library_service.py`, `services/library-service/app/api/routes.py`

#### LIB-UNIT-05 — Ciclo de vida e resgate de recompensas de missões do Quest Master (G-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_quest_master.py -k "test_claim_quest_lifecycle"`
- Pré-condições: Missão cadastrada no banco de dados para o usuário autenticado.
- Passos:
  - Dado uma missão em progresso não concluída
  - Quando o usuário tenta resgatar a recompensa antes de completar, após completar e repetidamente
  - Então a primeira tentativa falha com HTTP 400, a segunda conclui com sucesso concedendo o XP e marcando como claimed, e a terceira falha com HTTP 400 por duplicidade
- Resultado esperado: Máquina de estados íntegra para claim de recompensas de missões.
- Rastreabilidade: `services/library-service/app/services/library_service.py`, `services/library-service/app/api/routes.py`

#### LIB-UNIT-06 — Exposição de horas jogadas na checagem de posse (H-02)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_ownership.py -k "test_has_game_exposes_playtime_minutes"`
- Pré-condições: Usuário sem e com licença concedida, com `playtime_minutes` variável.
- Passos:
  - Dado um usuário sem o jogo, depois com o jogo recém-concedido e depois com horas jogadas registradas
  - Quando `GET /library/users/{id}/has-game/{game_id}` é chamado em cada estágio
  - Então o campo `playtime_minutes` retorna 0, 0 e o valor real, respectivamente, mantendo `owned` correto
- Resultado esperado: Extensão aditiva e retrocompatível do endpoint, consumida pelo `store-service` no Bloco H.
- Rastreabilidade: `services/library-service/app/services/library_service.py`, `services/library-service/app/api/routes.py`

### Mercado e Carteira (Market Service)
#### MARKET-UNIT-01 — Esqueleto do serviço: health check e CORS (L-01)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/market-service/tests/test_health.py`
- Pré-condições: `market-service` inicializado com banco `market.db` dedicado.
- Passos:
  - Dado o serviço em execução
  - Quando `GET /health` é chamado e uma requisição `OPTIONS` com origem `http://localhost:3000` é enviada
  - Então o serviço responde `{"status": "healthy", "service": "market-service"}` e o CORS permite a origem do frontend
- Resultado esperado: Esqueleto do microsserviço operacional, pronto para os endpoints de domínio dos tickets seguintes.
- Rastreabilidade: `services/market-service/app/main.py`

#### MARKET-UNIT-02 — Registro de lançamentos no extrato e direção crédito/débito por tipo (T-01/T-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/market-service/tests/test_wallet.py -k "test_record_transaction_direction_by_type or test_record_transaction_rejects_unknown_type or test_record_transaction_rejects_non_positive_amount"`
- Pré-condições: Nenhuma (banco em memória por teste).
- Passos:
  - Dado lançamentos dos tipos `compra`, `venda`, `recarga` e `resgate`, e tentativas com tipo/valor inválidos
  - Quando `POST /wallet/transactions` (endpoint interno, sem autenticação de usuário) é chamado
  - Então `compra` é classificada como débito e as demais como crédito; tipos desconhecidos ou valores não-positivos são rejeitados com HTTP 422
- Resultado esperado: Ledger contábil consistente, pronto para ser acionado por outros microsserviços.
- Rastreabilidade: `services/market-service/app/services/wallet_ledger.py`, `services/market-service/app/models/transaction.py`

#### MARKET-UNIT-03 — Extrato paginado com filtro por tipo e período, isolado por usuário (T-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/market-service/tests/test_wallet.py -k "test_get_history_only_returns_own_transactions or test_get_history_filters_by_type or test_get_history_filters_by_period or test_get_history_paginates"`
- Pré-condições: Lançamentos de múltiplos usuários e datas cadastrados.
- Passos:
  - Dado o histórico de vários usuários e tipos, com datas distintas
  - Quando `GET /wallet/history` é chamado com `X-User-Id`, filtros de `type`/`start_date` e paginação `skip`/`limit`
  - Então retorna apenas os lançamentos do usuário autenticado, respeitando filtro e paginação, ordenados do mais recente para o mais antigo
- Resultado esperado: Extrato correto, isolado por usuário e sem vazamento de dados entre contas.
- Rastreabilidade: `services/market-service/app/services/wallet_ledger.py`, `services/market-service/app/api/wallet.py`

#### MARKET-UNIT-04 — Anúncio de item com validação e bloqueio no inventário, falha fechada (L-02/L-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/market-service/tests/test_listings.py -k "test_create_listing_success_locks_item_and_persists or test_create_listing_propagates_inventory_validation_errors or test_create_listing_fails_closed_when_auth_service_unavailable"`
- Pré-condições: auth-service mockado respondendo `POST /inventory/items/{id}/lock` (contrato assumido, Bloco J do Dev 2 ainda não implementado).
- Passos:
  - Dado um item válido e disponível, um item inexistente/de outro dono/já em uso, e o auth-service fora do ar
  - Quando `POST /market/list` é chamado em cada cenário
  - Então o primeiro cria o anúncio (201) após bloquear o item; os demais são rejeitados (404/403/409/503) sem criar nenhum registro
- Resultado esperado: Nenhum anúncio é criado sem confirmação positiva de posse e bloqueio do item.
- Rastreabilidade: `services/market-service/app/services/listing_service.py`

#### MARKET-UNIT-05 — Catálogo público, "Meus Anúncios" e cancelamento com desbloqueio (L-04/L-11)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/market-service/tests/test_listings.py -k "test_list_listings_only_shows_active_sorted_by_price or test_my_listings_only_returns_own_listings or test_cancel_listing_unlocks_item_and_updates_status"`
- Pré-condições: Anúncios de múltiplos vendedores em diferentes status.
- Passos:
  - Dado anúncios ativos, vendidos e cancelados de vários usuários
  - Quando `GET /market/listings`, `GET /market/my-listings` e `POST /market/listings/{id}/cancel` são chamados
  - Então o catálogo público mostra só ativos ordenados por menor preço, "Meus Anúncios" isola por usuário, e o cancelamento desbloqueia o item no auth-service antes de marcar o anúncio como cancelado
- Resultado esperado: Isolamento correto por status/usuário e liberação do item ao cancelar.
- Rastreabilidade: `services/market-service/app/services/listing_service.py`, `services/market-service/app/api/listings.py`

#### MARKET-UNIT-06 — Compra do mercado com Saga de compensação (L-05)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/market-service/tests/test_checkout.py -k "test_buy_success_transfers_balance_and_custody or test_buy_seller_credit_failure_refunds_buyer or test_buy_item_transfer_failure_reverses_both_wallets"`
- Pré-condições: auth-service mockado para débito/crédito de carteira e transferência de custódia.
- Passos:
  - Dado uma compra bem-sucedida, uma falha ao creditar o vendedor e uma falha ao transferir a custódia do item
  - Quando `POST /market/buy/{listing_id}` é executado em cada cenário
  - Então a compra bem-sucedida debita o comprador, credita o vendedor, transfere o item e grava o extrato (`compra`/`venda`) para ambos; as falhas disparam a compensação (estorno do comprador, e também reversão do crédito do vendedor quando a transferência falha), mantendo o anúncio "ativo" e sem lançamentos no extrato
- Resultado esperado: Nenhuma operação parcial: ou a venda se completa integralmente, ou tudo é revertido.
- Rastreabilidade: `services/market-service/app/services/checkout.py`

#### MARKET-UNIT-07 — Criação de oferta de troca bloqueando só os itens ofertados (L-06/L-07)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/market-service/tests/test_trades.py -k "test_create_offer_locks_only_offered_items or test_create_offer_rejects_self_trade or test_create_offer_requires_at_least_one_item_each_side or test_create_offer_propagates_inventory_validation_errors"`
- Pré-condições: auth-service mockado respondendo `POST /inventory/items/{id}/lock`.
- Passos:
  - Dado uma proposta válida, uma autoproposta, listas de itens vazias e uma falha de validação no auth-service
  - Quando `POST /trades/offer` é chamado em cada cenário
  - Então a proposta válida bloqueia apenas os itens **oferecidos** (do remetente) e cria a oferta como `pending`; os demais cenários são rejeitados (400/422/404/403/409) sem criar nenhuma oferta
- Resultado esperado: Os itens do destinatário nunca são tocados antes de ele responder à proposta.
- Rastreabilidade: `services/market-service/app/services/trade_service.py`

#### MARKET-UNIT-08 — Aceite de troca com validação tardia do destinatário e rollback parcial (L-07)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/market-service/tests/test_trades.py -k "test_accept_success_locks_requested_items_and_transfers_both_ways or test_accept_fails_when_requested_item_validation_fails or test_accept_rolls_back_completed_transfer_if_second_transfer_fails or test_decline_unlocks_offered_items"`
- Pré-condições: oferta pendente existente; auth-service mockado para lock/transfer.
- Passos:
  - Dado um aceite bem-sucedido, um aceite onde o item do destinatário falha na validação, um aceite onde a segunda transferência falha após a primeira ter sido concluída, e uma recusa
  - Quando `POST /trades/{id}/accept` ou `.../decline` são chamados em cada cenário
  - Então o aceite bem-sucedido bloqueia os itens solicitados só agora e transfere a custódia dos dois lados; a falha de validação rejeita sem tocar em nada; a falha na segunda transferência reverte a primeira (devolve o item já transferido); a recusa libera os itens do remetente
- Resultado esperado: Nenhuma troca fica pela metade — ou os dois lados trocam de dono, ou nenhum.
- Rastreabilidade: `services/market-service/app/services/trade_service.py`

#### MARKET-UNIT-09 — Histórico de trocas recebidas/enviadas com autorização e filtro por status (L-08)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/market-service/tests/test_trades.py -k "test_list_received_and_sent_offers or test_list_offers_filters_by_status or test_decline_requires_receiver or test_accept_requires_receiver"`
- Pré-condições: ofertas de múltiplos remetentes/destinatários em diferentes status.
- Passos:
  - Dado ofertas enviadas e recebidas por vários usuários, e uma tentativa de aceitar/recusar por quem não é o destinatário
  - Quando `GET /trades/received`, `GET /trades/sent`, `POST /trades/{id}/accept` e `.../decline` são chamados
  - Então cada listagem mostra só as ofertas do usuário autenticado na direção correta, o filtro por status funciona, e apenas o destinatário pode responder à oferta (403 para qualquer outro)
- Resultado esperado: Isolamento correto por usuário e direção, sem permitir resposta de terceiros.
- Rastreabilidade: `services/market-service/app/services/trade_service.py`, `services/market-service/app/api/trades.py`

### UGC e Capturas de Tela (UGC Service)
#### UGC-UNIT-01 — Upload multipart de captura de tela com metadados e validação de formato (N-01)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/ugc-service/tests/test_screenshots.py -k "test_upload_screenshot_success or test_upload_rejects_invalid_extension or test_upload_rejects_empty_file"`
- Pré-condições: ugc-service iniciado com pasta de uploads configurada.
- Passos:
  - Dado o envio de imagens PNG, JPG ou WebP e arquivos não permitidos (.exe, .txt)
  - Quando o endpoint `POST /screenshots/upload` é acionado via multipart/form-data
  - Então imagens válidas são armazenadas e registradas com metadados no banco (201); arquivos inválidos são rejeitados com HTTP 400
- Resultado esperado: Armazenamento seguro de arquivos de imagem e geração de URL pública.
- Rastreabilidade: `services/ugc-service/app/api/screenshots.py`, `services/ugc-service/app/services/screenshot_service.py`

#### UGC-UNIT-02 — Listagem paginada e filtros por jogo, usuário e ordenação (N-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/ugc-service/tests/test_screenshots.py -k "test_list_screenshots_default or test_list_screenshots_filter_by_game_and_user or test_list_screenshots_sort_popular"`
- Pré-condições: Capturas de múltiplos jogos e autores cadastradas.
- Passos:
  - Dado capturas salvas com diferentes contagens de likes e datas
  - Quando `GET /screenshots` é consultado com filtros `game_id`, `user_id` e `sort_by=popular|recent`
  - Então retorna apenas as capturas correspondentes aos filtros e ordenadas corretamente
- Resultado esperado: Paginação e filtros eficientes com tempo de resposta inferior a 200ms.
- Rastreabilidade: `services/ugc-service/app/services/screenshot_service.py`

#### UGC-UNIT-03 — Curtir e descurtir capturas com idempotência e contagem reativa (N-04)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/ugc-service/tests/test_screenshots.py -k "test_like_and_unlike_screenshot_lifecycle"`
- Pré-condições: Captura cadastrada e usuário autenticado.
- Passos:
  - Dado uma captura com likes_count inicial 0
  - Quando o usuário aciona `POST /screenshots/{id}/like` e posteriormente `DELETE /screenshots/{id}/like`
  - Então o contador sobe para 1 (`liked=True`) e retorna para 0 (`liked=False`), com garantia de unicidade por usuário
- Resultado esperado: Curtidas atômicas e idempotentes sem duplicidade.
- Rastreabilidade: `services/ugc-service/app/models/screenshot.py`, `services/ugc-service/app/services/screenshot_service.py`

#### UGC-UNIT-04 — Exclusão de captura de tela com autorização e limpeza de arquivos
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/ugc-service/tests/test_screenshots.py -k "test_delete_screenshot_owner_only"`
- Pré-condições: Captura cadastrada pelo usuário A.
- Passos:
  - Dado uma tentativa de exclusão pelo usuário B (não autor) e posteriormente pelo usuário A (autor)
  - Quando `DELETE /screenshots/{id}` for acionado
  - Então o usuário B é barrado com HTTP 403 e o usuário A remove a captura e o arquivo físico do disco
- Resultado esperado: Isolamento de posse e integridade do armazenamento.
- Rastreabilidade: `services/ugc-service/app/services/screenshot_service.py`

#### UGC-UNIT-05 — SDK MIST - Captura de tela com fallback tolerante a falhas offline (N-02)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/ugc-service/tests/test_screenshots.py -k "test_sdk_take_screenshot_offline_fallback"`
- Pré-condições: SDK MIST em ambiente isolado sem conexão com o servidor UGC.
- Passos:
  - Dado a chamada `mist_sdk.take_screenshot("Minha jogada")` durante a execução de um jogo
  - Quando o UGC service estiver inacessível
  - Então o SDK não levanta exceção, salvando a captura em buffer local tolerante a falhas
- Resultado esperado: Resiliência total do cliente sem interrupção da partida do jogador.
- Rastreabilidade: `services/store-service/app/data/mist_sdk.py`

#### GATEWAY-UNIT-03 — Proxy reverso para UGC Service com sanitização e injeção de identidade confiável
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest gateway/tests/test_ugc_proxy.py`
- Pré-condições: API Gateway em execução com rota `/api/ugc/*`.
- Passos:
  - Dado requisições de listagem pública, upload de screenshot e curtidas com e sem token JWT
  - Quando acionadas através do Gateway
  - Então listagem pública é permitida; rotas mutativas sem token retornam 401; e com token válido injetam `X-User-Id` e `X-User-Name` confiáveis expurgando tentativas de spoofing
- Resultado esperado: Segurança na borda e roteamento transparente.
- Rastreabilidade: `gateway/app/main.py`, `gateway/tests/test_ugc_proxy.py`

#### UGC-UNIT-06 — Upload de mod e skin multipart com metadados, validação de extensão e versionamento (O-01, O-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `PYTHONPATH=services/ugc-service pytest services/ugc-service/tests/test_workshop.py -k "test_upload_workshop_item_success or test_upload_workshop_item_requires_auth or test_upload_workshop_item_invalid_extension"`
- Pré-condições: Microsserviço UGC inicializado e diretório de uploads montado.
- Passos:
  - Dado um arquivo de mod compactado (.zip, .pak, .rar) com metadados (jogo, título, categoria, versão, tags)
  - Quando enviado via multipart/form-data com headers confiáveis de autenticação
  - Então o arquivo é salvo no disco seguro com identificador único, registro criado no banco de dados e metadados persistidos
- Resultado esperado: Retorno HTTP 201 Created com objeto `WorkshopItemResponse` completo.
- Rastreabilidade: `services/ugc-service/app/services/workshop_service.py`, `services/ugc-service/app/api/workshop.py`

#### UGC-UNIT-07 — Listagem paginada, busca textual e filtros combinados por jogo e categoria (O-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `PYTHONPATH=services/ugc-service pytest services/ugc-service/tests/test_workshop.py -k "test_list_workshop_items_filters_and_search"`
- Pré-condições: Itens do Workshop de múltiplos jogos e categorias cadastrados.
- Passos:
  - Dado múltiplos itens de mods e skins
  - Quando o endpoint GET `/workshop/items` é consultado com filtros de `game_id`, `category`, `search` ou `sort_by` (popular, downloads, recent, rating)
  - Então retorna exatamente os itens compatíveis respeitando a paginação e metadados calculados
- Resultado esperado: Listagem flexível e performática para a vitrine da Oficina.
- Rastreabilidade: `services/ugc-service/app/services/workshop_service.py`

#### UGC-UNIT-08 — Inscrição e cancelamento idempotente de mods (O-04)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `PYTHONPATH=services/ugc-service pytest services/ugc-service/tests/test_workshop.py -k "test_subscribe_and_unsubscribe_workshop_item"`
- Pré-condições: Mod publicado e usuário autenticado.
- Passos:
  - Dado um mod existente
  - Quando o usuário executa inscrição via POST `/workshop/items/{id}/subscribe` e posterior cancelamento via DELETE
  - Então a relação de subscrição é criada/removida atomicamente e o contador `subscriptions_count` é incrementado/decrementado
- Resultado esperado: Idempotência garantida via UniqueConstraint no banco de dados.
- Rastreabilidade: `services/ugc-service/app/models/workshop.py`, `services/ugc-service/app/services/workshop_service.py`

#### UGC-UNIT-09 — Download com incremento atômico de contadores de downloads (O-05)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `PYTHONPATH=services/ugc-service pytest services/ugc-service/tests/test_workshop.py -k "test_download_workshop_item_increments_count"`
- Pré-condições: Item de mod registrado com arquivo físico no disco.
- Passos:
  - Dado um mod publicado na Oficina
  - Quando o endpoint POST `/workshop/items/{id}/download` é requisitado
  - Então a URL segura do pacote é retornada e o contador `downloads_count` é incrementado
- Resultado esperado: Telemetria de downloads precisa para ranqueamento de popularidade.
- Rastreabilidade: `services/ugc-service/app/services/workshop_service.py`

#### UGC-UNIT-10 — Exclusão de modificação pelo criador e bloqueio de exclusão por terceiros (O-06)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `PYTHONPATH=services/ugc-service pytest services/ugc-service/tests/test_workshop.py -k "test_delete_workshop_item_authorization"`
- Pré-condições: Mod criado pelo autor A.
- Passos:
  - Dado uma tentativa de exclusão pelo usuário B (não autor) e posteriormente pelo autor A
  - Quando DELETE `/workshop/items/{id}` for acionado
  - Então usuário B recebe HTTP 403 Forbidden e o autor A exclui o mod e remove as inscrições associadas
- Resultado esperado: Proteção rigorosa de propriedade intelectual de criadores da comunidade.
- Rastreabilidade: `services/ugc-service/app/services/workshop_service.py`

#### GATEWAY-UNIT-04 — Proxy reverso para Workshop de Conteúdo com injeção de identidade e acesso público
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `PYTHONPATH=gateway pytest gateway/tests/test_ugc_proxy.py -k "test_proxy_workshop_items_public_list or test_proxy_workshop_upload_injects_auth"`
- Pré-condições: Gateway MIST ativo.
- Passos:
  - Dado requisições GET públicas e POST/DELETE autenticadas para `/api/ugc/workshop/*`
  - Quando roteadas pelo Gateway
  - Então permite leitura pública sem token e injeta headers de identidade validados nas rotas de publicação e subscrição
- Resultado esperado: Borda segura e proxy transparente para o microsserviço UGC.
- Rastreabilidade: `gateway/app/main.py`, `gateway/tests/test_ugc_proxy.py`

### Frontend Components
#### FRONT-UNIT-01 — Renderização do Card de Jogo com Preço e Desconto
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/GameCard.test.tsx`
- Pré-condições: Componente `GameCard.tsx` disponível.
- Passos:
  - Dado as propriedades de um jogo com preço original e percentual de desconto
  - Quando o componente `GameCard` for renderizado
  - Então o preço promocional e o badge com estilo `#1F4D36` devem ser exibidos corretamente
- Resultado esperado: Badge e valor formatado renderizados de acordo com as propriedades fornecidas.
- Rastreabilidade: `frontend/src/components/GameCard.tsx`

#### FRONT-UNIT-02 — Interceptor de requisições e captura de 401 no cliente HTTP
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/api/client.test.ts`
- Pré-condições: Módulo `client.ts` disponível com interceptores.
- Passos:
  - Dado uma requisição com ou sem token no localStorage
  - Quando o método `fetchApi` ou funções da `authApi` forem acionados
  - Então o cabeçalho Authorization é injetado e respostas 401 disparam limpeza de storage e evento de expiração de sessão
- Resultado esperado: Interceptação precisa de requisição e resposta com tratamento de sessão expirada.
- Rastreabilidade: `frontend/src/api/client.ts`

#### FRONT-UNIT-03 — Renderização e alternância de abas no AuthModal com bônus de R$ 200,00
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/AuthModal.test.tsx`
- Pré-condições: Componente `AuthModal.tsx` integrado ao `AuthContext`.
- Passos:
  - Dado o estado aberto do modal de autenticação
  - Quando o usuário navega entre as abas de Login e Criar Conta
  - Então os campos correspondentes e o banner de benefício de R$ 200,00 são renderizados
- Resultado esperado: Renderização de abas, validação de campos e benefícios iniciais visíveis.
- Rastreabilidade: `frontend/src/components/AuthModal.tsx`

#### FRONT-UNIT-04 — Alternância de visibilidade da senha digitada (Show/Hide)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/AuthModal.test.tsx -t "FRONT-UNIT-04"`
- Pré-condições: Componente `AuthModal.tsx` com botões de alternância de visibilidade.
- Passos:
  - Dado o formulário de login ou cadastro aberto
  - Quando o usuário clica no botão de olho ao lado do campo de senha
  - Então o tipo do input alterna entre "password" e "text" com atualização do ícone para fa-eye/fa-eye-slash
- Resultado esperado: Alternância funcional entre ocultar e exibir senha nos formulários de autenticação.
- Rastreabilidade: `frontend/src/components/AuthModal.tsx`

#### FRONT-UNIT-05 — Validação de requisitos de senha e bloqueio no frontend
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/AuthModal.test.tsx -t "FRONT-UNIT-05"`
- Pré-condições: Função `isPasswordStrong` e validação no submit do cadastro.
- Passos:
  - Dado o preenchimento do formulário de cadastro com senha fraca
  - Quando o usuário tenta submeter o formulário de criação de conta
  - Então o envio é bloqueado no cliente e um alerta de erro amigável é exibido ao usuário
- Resultado esperado: Bloqueio imediato no cliente sem envio desnecessário de requisição ao backend.
- Rastreabilidade: `frontend/src/components/AuthModal.tsx`

#### FRONT-UNIT-06 — Interceptação amigável de erro de conexão com backend
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/api/client.test.ts -t "Failed to fetch"`
- Pré-condições: Interceptor de rede no cliente HTTP (`client.ts`).
- Passos:
  - Dado o backend ou API Gateway offline com emissão de TypeError / Failed to fetch
  - Quando ações de login ou cadastro forem acionadas no frontend
  - Então o erro de rede deve ser traduzido para mensagens amigáveis em português ("Falha no processo de login..." e "Falha no processo de cadastro...")
- Resultado esperado: Mensagens amigáveis apresentadas ao usuário sem exposição de termos técnicos como "Failed to fetch".
- Rastreabilidade: `frontend/src/api/client.ts`

#### FRONT-UNIT-07 — Dropdown de seleção de itens por página na loja (5, 10, 15, 25, 50)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/PaginationSelector.test.tsx`
- Pré-condições: Componente `PaginationSelector` implementado e renderizado.
- Passos:
  - Dado o componente PaginationSelector instanciado com valor default 10
  - Quando as opções disponíveis forem inspecionadas e um novo valor (ex: 25) for selecionado
  - Então o select contém exatamente os valores 5, 10, 15, 25 e 50, e o callback onChange é invocado com o número escolhido
- Resultado esperado: Componente de paginação com opções válidas e emissão correta de eventos.
- Rastreabilidade: `frontend/src/components/PaginationSelector.tsx`

#### FRONT-UNIT-08 — Gerenciamento do estado global do Carrinho de Compras (CartContext)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/context/CartContext.test.tsx`
- Pré-condições: CartProvider envolvendo a aplicação.
- Passos:
  - Dado o contexto de carrinho inicializado vazio
  - Quando itens são adicionados, removidos, alternados via toggleCart e limpos via clearCart
  - Então o contador total, a lista de itens e o preço acumulado são calculados reativamente e persistidos
- Resultado esperado: Cálculo exato de subtotal e controle do estado de gaveta aberta/fechada.
- Rastreabilidade: `frontend/src/context/CartContext.tsx`

#### FRONT-UNIT-09 — Modal de Checkout Unitário com Verificação de Saldo e Extrato
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/CheckoutModal.test.tsx`
- Pré-condições: CheckoutModal instanciado com jogo selecionado e contexto de usuário.
- Passos:
  - Dado o modal de checkout aberto para um jogo de R$ 50,00 com saldo de R$ 200,00 e posteriormente saldo de R$ 20,00
  - Quando a interface renderiza o extrato pré-compra
  - Então no primeiro caso exibe saldo restante projetado e botão habilitado; no segundo, exibe aviso de saldo insuficiente e desabilita o botão
- Resultado esperado: Prevenção visual e desabilitação correta com base no saldo do usuário.
- Rastreabilidade: `frontend/src/components/CheckoutModal.tsx`

#### FRONT-UNIT-10 — Interatividade do Card de Loja: Wishlist e Tag "Adquirido"
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/GameCard.test.tsx`
- Pré-condições: Componente GameCard com props de wishlist e posse.
- Passos:
  - Dado um card de jogo com isWishlisted e isOwned: true
  - Quando o usuário clica no coração flutuante ou o card é renderizado com jogo já comprado
  - Então o callback de wishlist dispara isoladamente sem acionar o clique no card, e a tag "Adquirido" é renderizada no rodapé oposta ao valor
- Resultado esperado: Interação isolada da wishlist e badge "Adquirido" visível.
- Rastreabilidade: `frontend/src/components/GameCard.tsx`

#### FRONT-UNIT-11 — Setas Inteligentes de Navegação de Screenshots na Modal de Detalhes
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/GameDetailModal.test.tsx -t "setas inteligentes"`
- Pré-condições: Modal de detalhes renderizada com lista de 3 capturas de tela.
- Passos:
  - Dado o visualizador aberto na foto 1 (índice 0)
  - Quando o estado das setas de navegação é inspecionado
  - Então a seta para a esquerda não é renderizada no DOM e a seta para a direita está visível; ao avançar para a foto 2 ambas ficam visíveis; ao alcançar a última foto (índice 2) a seta para a direita desaparece
- Resultado esperado: Setas contextuais renderizadas exclusivamente quando há fotos na direção solicitada (hasPrevScreenshot e hasNextScreenshot).
- Rastreabilidade: `frontend/src/components/GameDetailModal.tsx`

#### FRONT-UNIT-12 — Alerta Toast, Fechamento de Modal e Redirecionamento sem Sobreposição para Usuário Deslogado
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/GameDetailModal.test.tsx -t "Usuário não autenticado"`
- Pré-condições: Usuário visitante sem credenciais de autenticação ativas (isAuthenticated: false).
- Passos:
  - Dado o visitante com a modal de detalhes do jogo aberta
  - Quando clica no botão "Comprar agora" ou "Lista de Desejos"
  - Então 3 ações ocorrem: a modal de detalhes é fechada (onClose), a modal de login é aberta (onOpenAuth) sem sobreposição, e um evento global mist:toast é disparado com a mensagem exata "Usuário não autenticado. Realize o login"
- Resultado esperado: Desmontagem limpa da modal de detalhes, disparo do toast de 5s no canto superior direito e abertura do modal de login isolado.
- Rastreabilidade: `frontend/src/components/GameDetailModal.tsx`, `frontend/src/App.tsx`

#### FRONT-UNIT-13 — Alternância Suave e Otimista da Lista de Desejos (Sem Flickering)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/GameDetailModal.test.tsx -t "Lista de Desejos"`
- Pré-condições: Usuário logado interagindo com o botão de Lista de Desejos da modal.
- Passos:
  - Dado o jogo inicialmente fora da wishlist
  - Quando o usuário clica no botão de Lista de Desejos
  - Então o estado do botão atualiza instantaneamente para "Na Lista de Desejos" sem recarregar o layout do modal nem provocar flicker de tela, a requisição assíncrona é disparada em segundo plano e emite o evento global mist:wishlist-updated
- Resultado esperado: Feedback visual imediato e sem repintura brusca de componentes.
- Rastreabilidade: `frontend/src/components/GameDetailModal.tsx`

#### FRONT-UNIT-14 — Conexão do botão Baixar na Library ao download de arquivo .zip e disparo de mist:start-download (E-06)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Library.test.tsx -t "deve acionar download do pacote e emitir mist:start-download"`
- Pré-condições: Usuário autenticado na tela da Biblioteca com jogo não instalado.
- Passos:
  - Dado um jogo na biblioteca com is_installed: false
  - Quando o usuário clica no botão "Baixar"
  - Então a requisição de download do pacote (.zip) é acionada via API de store, o download do arquivo no navegador é disparado e o evento mist:start-download é emitido com gameId e gameTitle
- Resultado esperado: Download do binário acionado e evento de orquestração emitido para o DownloadBar.
- Rastreabilidade: `frontend/src/pages/Library.tsx`, `frontend/src/api/client.ts`

#### FRONT-UNIT-15 — Transição reativa para Jogar e inicialização de sessão após evento mist:game-installed (E-04 & E-06)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Library.test.tsx -t "deve transitar dinamicamente para Jogar ao receber evento mist:game-installed"`
- Pré-condições: Biblioteca renderizada aguardando conclusão de download.
- Passos:
  - Dado um card de jogo com status "Pronto para baixar"
  - Quando o evento global mist:game-installed é recebido com o gameId correspondente
  - Então o status transita para "Instalado", o botão altera para "Jogar" e um clique em "Jogar" aciona libraryApi.startSession
- Resultado esperado: Atualização reativa de interface sem necessidade de reload da página e inicialização de sessão.
- Rastreabilidade: `frontend/src/pages/Library.tsx`, `frontend/src/api/client.ts`

#### FRONT-UNIT-16 — Progresso simulado de download e emissão de evento de jogo instalado no DownloadBar (E-06)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/DownloadBar.test.tsx`
- Pré-condições: Componente DownloadBar montado na interface.
- Passos:
  - Dado o DownloadBar ativo na aplicação
  - Quando recebe o evento mist:start-download com metadados do jogo
  - Então o progresso avança progressivamente em intervalos regulares até 100%, emite o evento mist:game-installed e atualiza o status para "Concluído (Instalado)"
- Resultado esperado: Animação e telemetria de download concluídas com notificação Toast e evento de conclusão.
- Rastreabilidade: `frontend/src/components/DownloadBar.tsx`

#### FRONT-UNIT-17 — Notificação Toast de conquista desbloqueada e polling leve de telemetria (E-07)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/AchievementToast.test.tsx`
- Pré-condições: Usuário autenticado na SPA com suporte a polling leve de conquistas.
- Passos:
  - Dado a aplicação MIST aberta com o usuário logado
  - Quando novas conquistas são retornadas no polling de getRecentAchievements ou via evento mist:achievement-unlocked
  - Então uma notificação Toast estilizada em dourado é exibida com troféu, nome, descrição e tag de raridade da conquista
- Resultado esperado: Notificação imersiva e reativa de desbloqueio de conquista na interface.
- Rastreabilidade: `frontend/src/App.tsx`, `frontend/src/components/AchievementToast.test.tsx`

#### FRONT-UNIT-18 — Renderização da janela de chat (ChatWindow), histórico e indicador de digitação (F-07)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/ChatWindow.test.tsx`
- Pré-condições: Componente ChatWindow integrado ao WebSocket e mock de histórico de mensagens.
- Passos:
  - Dado o ChatWindow aberto para conversa com um amigo
  - Quando mensagens prévias forem carregadas e um evento de digitação for recebido via WebSocket
  - Então o histórico é exibido em balões estilizados e o indicador de digitação animado é exibido com o nome do amigo
- Resultado esperado: Renderização de chat responsiva com auto-scroll e notificação de digitação em tempo real.
- Rastreabilidade: `frontend/src/components/ChatWindow.tsx`, `frontend/src/components/ChatWindow.test.tsx`

#### FRONT-UNIT-19 — Exibição do feed de atividades com conquistas e compras na página Social (F-06)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Social.test.tsx -t "deve renderizar o feed de atividades"`
- Pré-condições: Rota Social montada com mock de feed contendo achievement_unlocked e game_purchased.
- Passos:
  - Dado a aba Social acessada pelo usuário
  - Quando os dados de feed forem carregados do backend
  - Então cards estilizados exibem as conquistas recentes com troféu dourado e compras de jogos com tag verde
- Resultado esperado: Feed social rico e contextualizado refletindo eventos globais e de amigos.
- Rastreabilidade: `frontend/src/pages/Social.tsx`, `frontend/src/pages/Social.test.tsx`

#### FRONT-UNIT-20 — Agrupamento e atualização reativa de presença em tempo real via WebSocket na página Social (F-08)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Social.test.tsx -t "deve exibir amigos agrupados por presença|deve atualizar dinamicamente a presença|deve abrir a janela de ChatWindow"`
- Pré-condições: Canal de presença WebSocket conectado na montagem da tela Social.
- Passos:
  - Dado a lista de amigos renderizada em categorias (Jogando Agora, Online, Offline)
  - Quando uma mensagem de atualização de presença (presence_update) chegar via WebSocket
  - Então o card do amigo migra reativamente para a seção correspondente exibindo o jogo atual e permite abrir o chat
- Resultado esperado: Lista de amigos viva com transição reativa de status sem recarregamento de página.
- Rastreabilidade: `frontend/src/pages/Social.tsx`, `frontend/src/pages/Social.test.tsx`

#### FRONT-UNIT-21 — Renderização da vitrine AI Curator com afinidade e justificativa na Store (G-05)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/CuratorSection.test.tsx`
- Pré-condições: Componente CuratorSection montado na página Store com dados de recomendações mockados.
- Passos:
  - Dado a vitrine de recomendações carregada via API `storeApi.getRecommendations`
  - Quando o componente é renderizado na tela da Loja
  - Então a seção exibe título temático, cards com selo percentual de afinidade, título, preço e justificativa do AI Curator
- Resultado esperado: Apresentação atraente e fluida de jogos recomendados por IA diretamente na Home da loja.
- Rastreabilidade: `frontend/src/components/CuratorSection.tsx`, `frontend/src/pages/Store.tsx`, `frontend/src/components/CuratorSection.test.tsx`

#### FRONT-UNIT-22 — Apresentação especial do MIST Bot e Quick Prompts no chat (G-06)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/ChatWindow.test.tsx -t "Quick Prompts|badge" && npm --prefix frontend run test:unit -- src/pages/Social.test.tsx -t "MIST Bot"`
- Pré-condições: Amigo MIST Bot (`is_bot: true`) exibido na lista social e ChatWindow inicializado.
- Passos:
  - Dado a lista de amigos na tela Social e a abertura do chat com o MIST Bot
  - Quando o card do bot for renderizado e a janela de chat for aberta
  - Então o bot é fixado com badge IA e gradiente no Social, o ChatWindow exibe badge "BOT IA" e uma barra de sugestões rápidas (Quick Prompts) aciona o envio automático de mensagens com indicador de digitação da IA
- Resultado esperado: Experiência conversacional integrada com assistente de IA amigável e acessível.
- Rastreabilidade: `frontend/src/pages/Social.tsx`, `frontend/src/components/ChatWindow.tsx`, `frontend/src/components/ChatWindow.test.tsx`, `frontend/src/pages/Social.test.tsx`

#### FRONT-UNIT-23 — Posicionamento contextual da vitrine AI Curator por aba na Loja (Destaques no topo vs. Lista de Desejos/Promoções na base)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Store.test.tsx`
- Pré-condições: Página Store montada com suporte a abas de navegação (destaques, wishlist, promotions).
- Passos:
  - Dado o usuário navegando entre as abas da Loja
  - Quando acessa "Destaques", "Lista de Desejos" ou "Promoções"
  - Então em "Destaques" a vitrine do AI Curator é exibida no topo, enquanto em "Lista de Desejos" e "Promoções" o foco principal é nos itens favoritados ou com desconto, deslocando a vitrine do AI Curator para a parte inferior da página
- Resultado esperado: Layout contextualizado e priorização da intenção do usuário preservando a descoberta inteligente por IA.
- Rastreabilidade: `frontend/src/pages/Store.tsx`, `frontend/src/pages/Store.test.tsx`

#### FRONT-UNIT-24 — Formulário de avaliação: recomendação, validação e edição (H-04)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/ReviewFormModal.test.tsx`
- Pré-condições: `reviewApi.submitReview` mockado.
- Passos:
  - Dado o formulário aberto sem e com uma avaliação existente
  - Quando o usuário escolhe Sim/Não, digita o texto (inclusive só espaços) e publica
  - Então o botão de publicar só habilita com recomendação e texto não-vazio; uma avaliação existente pré-preenche os campos e rotula a ação como edição; erros da API são exibidos sem fechar a modal
- Resultado esperado: Publicação/edição correta, com eventos `mist:review-submitted` disparados em caso de sucesso.
- Rastreabilidade: `frontend/src/components/ReviewFormModal.tsx`

#### FRONT-UNIT-25 — Lista de avaliações: ordenação, voto útil e integração na modal de detalhes (H-05)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/ReviewsList.test.tsx src/components/GameDetailModal.test.tsx`
- Pré-condições: `reviewApi.listReviews`/`markHelpful` mockados.
- Passos:
  - Dado avaliações de terceiros e do próprio usuário
  - Quando as abas "Mais recentes"/"Mais úteis" são alternadas e o voto útil é acionado
  - Então a lista recarrega com a ordenação correta, o botão útil é desabilitado na própria avaliação e para visitantes, e a `GameDetailModal` exibe a aprovação real e o botão de escrever/editar avaliação apenas quando o jogo é possuído
- Resultado esperado: Fluxo de avaliações totalmente integrado à modal de detalhes do jogo.
- Rastreabilidade: `frontend/src/components/ReviewsList.tsx`, `frontend/src/components/GameDetailModal.tsx`

#### FRONT-UNIT-26 — Extrato da carteira: filtros, paginação e acesso pelo Header (T-04)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/WalletHistoryModal.test.tsx src/components/Header.test.tsx`
- Pré-condições: `walletApi.getHistory` mockado.
- Passos:
  - Dado o saldo exibido no Header
  - Quando o usuário autenticado clica no saldo, troca o filtro de tipo ou navega entre páginas
  - Então a modal de extrato abre e recarrega com o filtro/página correspondente, com sinal e cor por direção (crédito/débito); para um visitante, o clique abre a autenticação em vez do extrato
- Resultado esperado: Extrato acessível e funcional a partir do Header, sem exigir navegação a outra página.
- Rastreabilidade: `frontend/src/components/WalletHistoryModal.tsx`, `frontend/src/components/Header.tsx`

#### FRONT-UNIT-27 — Página do Mercado: catálogo, compra e gerenciamento de anúncios (L-09/L-11)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Market.test.tsx`
- Pré-condições: `marketApi` mockado.
- Passos:
  - Dado o catálogo de anúncios ativos e os anúncios do próprio usuário
  - Quando o usuário filtra por tipo, confirma uma compra, tenta comprar o próprio anúncio, acessa "Meus Anúncios" como visitante, ou cancela um anúncio ativo
  - Então o filtro recarrega o catálogo, a compra atualiza o saldo exibido no Header e fecha a modal de confirmação (erros permanecem visíveis sem fechá-la), a compra do próprio anúncio fica desabilitada, o acesso sem login abre a autenticação, e o cancelamento remove a ação apenas de anúncios ativos
- Resultado esperado: Fluxo completo de navegação, compra e gestão de anúncios, sem seletor de criação (dependente do Inventário do Dev 2, ainda pendente).
- Rastreabilidade: `frontend/src/pages/Market.tsx`

#### FRONT-UNIT-28 — Aba "Trocas": ofertas recebidas/enviadas, aceitar e recusar (L-08/L-10)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Market.test.tsx`
- Pré-condições: `marketApi` (métodos de trocas) mockado.
- Passos:
  - Dado ofertas de troca pendentes recebidas e enviadas
  - Quando o usuário alterna entre "Recebidas"/"Enviadas", filtra por status, aceita ou recusa uma oferta pendente, ou acessa a aba como visitante
  - Então a lista mostra os itens ofertados/solicitados e o autor correto; aceitar/recusar só aparece em ofertas recebidas pendentes e recarrega a lista após a resposta; o acesso sem login abre a autenticação
- Resultado esperado: Gestão completa de trocas existentes, sem seletor de criação (depende do inventário do próprio usuário e do amigo, Dev 2, ainda pendente).
- Rastreabilidade: `frontend/src/pages/Market.tsx`

#### FRONT-UNIT-29 — AI Curator Avançado: abas dinâmicas, tendências e banner inteligente de Wishlist (S-04)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit src/components/CuratorSection.test.tsx`
- Pré-condições: Componente `CuratorSection.tsx` implementado com abas de recomendação, top sellers, trending e alertas de wishlist.
- Passos:
  - Dado o componente CuratorSection montado na Loja
  - Quando o usuário alterna entre as abas "Para Você", "Top Vendidos" e "Em Alta"
  - Então renderiza os cartões correspondentes com badges temáticos (afinidade, volume de vendas e pontuação de tendência)
  - E quando houver itens em promoção na lista de desejos, exibe o banner inteligente com economia e ação direta de compra/dispensa
- Resultado esperado: Navegação fluida entre os filtros do Curator e renderização responsiva do banner promocional.
- Rastreabilidade: `frontend/src/components/CuratorSection.tsx`, `frontend/src/api/client.ts`

#### FRONT-UNIT-30 — Tooltips informativos nos cards de jogos e Seção de Informação Relevante na modal de detalhes
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit src/components/Tooltip.test.tsx src/components/GameDetailModal.test.tsx`
- Pré-condições: Componentes `Tooltip.tsx`, `CuratorSection.tsx`, `GameCard.tsx` e `GameDetailModal.tsx` implementados.
- Passos:
  - Dado cards de jogos com mensagens truncadas ou recomendações personalizadas do curador
  - Quando o usuário passar o cursor sobre os textos ou badges com reticências
  - Então um tooltip elegante com efeito glassmorphism e iluminação neon é exibido revelando o texto integral
  - E quando o usuário clica no card de jogo
  - Então o modal de detalhes abre destacando a mensagem e contexto na "Seção de Informação Relevante para o Usuário" com layout premium
- Resultado esperado: Acesso completo ao texto pelo hover com tooltip e destaque agradável da mensagem no modal de detalhes.
- Rastreabilidade: `frontend/src/components/Tooltip.tsx`, `frontend/src/components/CuratorSection.tsx`, `frontend/src/components/GameCard.tsx`, `frontend/src/components/GameDetailModal.tsx`

#### FRONT-UNIT-31 — Dropdown de Notificações com badge dinâmico, lista categorizada e marcação de leitura (Q-05 & Q-06)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit src/components/NotificationsDropdown.test.tsx`
- Pré-condições: Componente `NotificationsDropdown.tsx` integrado ao `Header.tsx` e cliente `socialApi` implementado.
- Passos:
  - Dado o cabeçalho principal da aplicação montado com usuário autenticado
  - Quando houver notificações não lidas
  - Então o ícone do sino exibe o badge vermelho pulsante com o número exato de pendências
  - E quando o usuário clica no botão, o painel dropdown abre exibindo os itens categorizados com ícones temáticos
  - E quando clica em uma notificação ou em "Marcar lidas", a API atualiza o status de leitura e zera o badge
- Rastreabilidade: `frontend/src/components/NotificationsDropdown.tsx`, `frontend/src/components/Header.tsx`, `frontend/src/api/client.ts`

#### FRONT-UNIT-32 — Redirecionamento Contextual de Notificações para Jogos, Biblioteca, Carteira e Comunicados
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit src/components/NotificationsDropdown.test.tsx`
- Pré-condições: Dropdown de notificações montado com notificações de tipos diversificados (wishlist, catálogo, conquista, carteira, amizade).
- Passos:
  - Dado o dropdown de notificações aberto exibindo itens de múltiplas categorias
  - Quando o usuário clica em uma notificação de wishlist, redireciona para a Loja e dispara o evento `mist:open-game-detail` com as informações da oferta
  - E quando clica em comunicado oficial ou notícia de catálogo, dispara o evento `mist:open-system-notice` abrindo os detalhes do comunicado
  - E quando clica em notificação de conquista, redireciona para a Biblioteca e dispara `mist:open-library-game` focando o jogo
  - E quando clica em notificação de carteira/recarga, dispara `mist:open-wallet` abrindo o extrato da carteira
- Resultado esperado: Redirecionamento instantâneo e contextual para o local com detalhes do item notificado.
- Rastreabilidade: `frontend/src/components/NotificationsDropdown.tsx`, `frontend/src/App.tsx`, `frontend/src/pages/Store.tsx`, `frontend/src/pages/Library.tsx`

#### FRONT-UNIT-33 — Modal de Comunicados Oficiais do Sistema (SystemNoticeModal) com Jogos Deixando o Catálogo
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit src/components/SystemNoticeModal.test.tsx`
- Pré-condições: Componente `SystemNoticeModal.tsx` montado com dados de comunicado do sistema.
- Passos:
  - Dado o modal de comunicado aberto com dados de jogos deixando o catálogo MIST
  - Quando os elementos são renderizados, exibe o título oficial, observação importante, selo de comunicado e os jogos afetados com desconto de despedida de até 75% OFF
  - E quando o usuário clica em "Ver na Loja" para um título específico, fecha o comunicado e abre a loja no jogo selecionado
  - E quando clica no botão principal de ação ou no botão de fechar, executa o redirecionamento ou encerra o modal
- Resultado esperado: Apresentação estética e funcional de avisos críticos de sistema e catálogo.
#### FRONT-UNIT-34 — Alinhamento Vertical Dinâmico e Desacoplamento via Portal da Modal de Carteira (WalletHistoryModal)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit src/components/WalletHistoryModal.test.tsx`
- Pré-condições: Componente `WalletHistoryModal.tsx` montado com `topOffset` e renderização via `createPortal`.
- Passos:
  - Dado a modal de extrato da carteira acionada pelo clique no botão financeiro do Header
  - Quando a modal é aberta com `topOffset` correspondente à coordenada vertical do botão clicado
  - Então a árvore do modal é renderizada via `createPortal` diretamente no `document.body` com `z-[130]`, utiliza alinhamento `items-start`, aplica `paddingTop` dinâmico em pixels e limita a altura máxima (`max-h-[calc(100vh-32px)]`)
#### FRONT-UNIT-35 — Interface de Grupos, Fórum de Discussões e Chat Coletivo (Groups.tsx)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit src/pages/Groups.test.tsx`
- Pré-condições: Componente `Groups.tsx` montado com mocks da `groupsApi`.
- Passos:
  - Dado o catálogo de grupos renderizado com cards informativos e filtros de categoria
  - Quando o usuário filtra por categorias ou busca por termos
  - E quando clica em um card de grupo, abre a visão completa com cabeçalho, fórum de discussões e contadores
  - E quando abre um tópico, exibe o conteúdo original e todas as respostas da comunidade
  - E quando alterna para as abas de bate-papo coletivo e membros, exibe o histórico de mensagens e os papéis dos membros
- Resultado esperado: Navegação fluida, visualização completa das discussões e interação em tempo real com o chat e fórum.
- Rastreabilidade: `frontend/src/pages/Groups.tsx`, `frontend/src/pages/Groups.test.tsx`, `frontend/src/pages/Social.tsx`

#### FRONT-UNIT-36 — Dropdown de Busca Global com 4 seções categorizadas, debounce e navegação (R-05)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit src/components/GlobalSearchDropdown.test.tsx`
- Pré-condições: Componente `GlobalSearchDropdown.tsx` renderizado com mock da `searchApi`.
- Passos:
  - Dado o componente `GlobalSearchDropdown` montado com a prop query ativa
  - Quando a busca é disparada após o debounce de 250ms
  - Então renderiza com sucesso as 4 seções categorizadas (Jogos, Jogadores, Grupos e Mercado da Comunidade)
  - E quando não há resultados correspondentes, exibe mensagem amigável informativa
  - E quando a tecla Escape é pressionada ou o usuário clica fora da modal, o callback `onClose` é acionado
  - E quando o usuário clica em qualquer item retornado, o callback `onNavigate` é acionado para a rota de destino
- Resultado esperado: Experiência de busca agregada fluida, categorizada, responsiva e acessível por teclado.
- Rastreabilidade: `frontend/src/components/GlobalSearchDropdown.tsx`, `frontend/src/components/GlobalSearchDropdown.test.tsx`, `frontend/src/components/Header.tsx`

#### FRONT-UNIT-37 — Modal de Upload de Capturas com validação, preview instantâneo e feedback (N-06)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/ScreenshotUploadModal.test.tsx`
- Pré-condições: Componente `ScreenshotUploadModal.tsx` montado com usuário autenticado.
- Passos:
  - Dado a seleção de arquivo de imagem via drag-and-drop ou input file
  - Quando uma imagem válida (.png, .jpg, .webp) é selecionada
  - Então gera pré-visualização instantânea na tela, habilita botão de envio e rejeita arquivos executáveis ou que excedam 15 MB
  - E quando enviado, dispara chamada multipart para a API e fecha modal com sucesso
- Resultado esperado: Upload intuitivo com validação antecipada no frontend e estados de carregamento claros.
- Rastreabilidade: `frontend/src/components/ScreenshotUploadModal.tsx`, `frontend/src/components/ScreenshotUploadModal.test.tsx`

#### FRONT-UNIT-38 — Galeria de Capturas com ordenação (Recentes/Populares), curtidas e visualizador Lightbox (N-05)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/components/ScreenshotsGallery.test.tsx`
- Pré-condições: Componente `ScreenshotsGallery.tsx` carregado.
- Passos:
  - Dado a listagem de capturas com títulos, autores e contadores de curtidas
  - Quando o usuário alterna entre as abas 'Mais Recentes' e 'Mais Populares'
  - Então recarrega a lista reordenada pela API;
  - E quando o usuário clica no botão de like, o contador reage instantaneamente;
  - E quando o usuário clica em um card, abre o visualizador Lightbox fullscreen com controles de navegação e teclado (Escape, setas)
- Resultado esperado: Experiência visual imersiva e responsiva idêntica ao hub de capturas da comunidade Steam.
- Rastreabilidade: `frontend/src/components/ScreenshotsGallery.tsx`, `frontend/src/components/ScreenshotsGallery.test.tsx`

#### FRONT-UNIT-39 — Catálogo e Navegação da Oficina (Workshop) com filtros, busca e detalhe de mod (O-05)
- Prioridade: P0
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Workshop.test.tsx`
- Pré-condições: Componente `Workshop.tsx` carregado.
- Passos:
  - Dado o catálogo de itens do Workshop com filtros por jogo, categoria (Mod, Skin, etc.) e busca textual
  - Quando o usuário filtra por categoria, busca termos ou clica em um card
  - Então os itens são filtrados reativamente, modal de detalhes do mod é aberto exibindo guia de uso, tags e opções de download e inscrição
- Resultado esperado: Experiência completa e fluida de navegação na Oficina.
- Rastreabilidade: `frontend/src/pages/Workshop.tsx`, `frontend/src/pages/Workshop.test.tsx`

#### FRONT-UNIT-40 — Integração do Criador no Perfil: contagem, estatísticas acumuladas e modal de criações (O-06)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Profile.test.tsx`
- Pré-condições: Página de perfil carregada com usuário autenticado.
- Passos:
  - Dado o menu lateral do perfil exibindo "Itens da Oficina"
  - Quando o usuário clica no item
  - Então abre modal de gerenciamento de criações exibindo o total de publicações, soma acumulada de downloads e soma acumulada de inscrições ativas, com atalho de redirecionamento para a Oficina
- Resultado esperado: Reconhecimento do criador de conteúdo e métricas consolidadas.
- Rastreabilidade: `frontend/src/pages/Profile.tsx`, `frontend/src/pages/Profile.test.tsx`

## Integração


### Gateway e Autenticação
#### GATEWAY-INT-01 — Encaminhamento de requisição com injeção de header de identidade
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest gateway/tests/test_gateway.py -k "test_gateway_strips_spoofed_x_user_headers_and_injects_trusted_identity"`
- Pré-condições: API Gateway instanciado em ambiente de teste com FastAPI TestClient.
- Passos:
  - Dado um token JWT válido emitido pelo Auth Service e tentativas de spoofing com `X-User-Id`
  - Quando o cliente envia uma requisição através do Gateway
  - Então o Gateway descarta headers de spoofing externos, valida o JWT e encaminha injetando o header seguro `X-User-Id` downstream
- Resultado esperado: Código HTTP 200 e recebimento do header `X-User-Id` genuíno no serviço interno.
- Rastreabilidade: `gateway/app/main.py`

#### GATEWAY-INT-02 — Encaminhamento de consulta do catálogo da Store via Gateway
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest gateway/tests/test_gateway.py -k "test_gateway_store_games_proxy_passthrough"`
- Pré-condições: API Gateway com rotas de proxy reverso `/api/games`.
- Passos:
  - Dado uma requisição GET para `/api/games?category=Simulação`
  - Quando o Gateway processar a requisição
  - Então ela é repassada para a URL do store-service mantendo parâmetros de consulta e retornando os dados
- Resultado esperado: Código HTTP 200 e payload serializado corretamente.
- Rastreabilidade: `gateway/app/main.py`

#### GATEWAY-INT-03 — Autenticação centralizada e injeção de X-User-Id no proxy da Library
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest gateway/tests/test_gateway.py -k "test_gateway_library_my_games_proxy"`
- Pré-condições: API Gateway com rotas de proxy reverso `/api/library/my-games`.
- Passos:
  - Dado uma requisição sem JWT para `/api/library/my-games`
  - Quando o Gateway processar a requisição
  - Então retorna 401 Unauthorized
  - E quando a requisição contiver um Bearer JWT válido
  - Então o Gateway valida o JWT e encaminha a chamada para o library-service injetando o header seguro `X-User-Id`
- Resultado esperado: Código HTTP 401 para requisições anônimas e 200 com repasse correto de identidade para usuários autenticados.
- Rastreabilidade: `gateway/app/main.py`

#### GATEWAY-INT-04 — Proxy reverso do market-service com injeção de identidade e fallback 503 (L-01/T-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest gateway/tests/test_gateway.py -k "test_gateway_market_wallet_history_proxy or test_gateway_market_proxy_unavailable_returns_503"`
- Pré-condições: Rota `/api/market/{path}` registrada no Gateway.
- Passos:
  - Dado uma requisição `GET /api/market/wallet/history` com JWT válido, e uma segunda simulando o market-service fora do ar
  - Quando o Gateway processa cada requisição
  - Então a primeira encaminha ao market-service com `X-User-Id` injetado a partir do JWT, e a segunda retorna HTTP 503 com mensagem explicativa
- Resultado esperado: Mesmo padrão de proxy genérico já usado por `/api/store/*`, agora cobrindo `/api/market/*`.
- Rastreabilidade: `gateway/app/main.py`

#### GATEWAY-INT-05 — Agregação assíncrona da Busca Global e resiliência a falhas downstream (R-01)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest gateway/tests/test_global_search.py`
- Pré-condições: Endpoint `GET /api/search` implementado no Gateway com `asyncio.gather(*tasks, return_exceptions=True)`.
- Passos:
  - Dado uma requisição `GET /api/search?q={query}&limit={limit}`
  - Quando o Gateway processa a busca
  - Então dispara paralelamente consultas assíncronas para Store, Auth, Social e Market
  - E quando qualquer microsserviço falha com 500, timeout ou fica offline
  - Então degrada graciosamente retornando lista vazia na seção correspondente sem derrubar a busca global
- Resultado esperado: Retorno agregado 200 com seções games, users, groups e market_items consolidadas e total acumulado.
- Rastreabilidade: `gateway/app/main.py`, `gateway/tests/test_global_search.py`

### Autenticação e Persistência
#### AUTH-INT-01 — Registro de usuário com saldo inicial de R$ 200,00 e login com JWT
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/auth-service/tests/test_auth.py -k "test_user_registration_initial_wallet or test_duplicate_user_registration_fails or test_user_login_success_and_failure or test_get_current_user_profile_via_token_and_header"`
- Pré-condições: Auth Service conectado a banco SQLite de teste.
- Passos:
  - Dado uma requisição de cadastro com dados válidos de usuário
  - Quando os endpoints `/register`, `/login` e `/me` forem acionados
  - Então o usuário é persistido com R$ 200,00 de saldo inicial, recebe JWT válido e obtém os dados do perfil autenticado
- Resultado esperado: Persistência no SQLite, concessão de R$ 200,00 e validação completa de login.
- Rastreabilidade: `services/auth-service/app/api/routes.py`

#### AUTH-INT-02 — Busca pública de jogadores por username ou e-mail com limite e case-insensitive (R-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/auth-service/tests/test_search.py`
- Pré-condições: Endpoint interno `GET /users/search` implementado no auth-service e posicionado antes de `/users/{user_id}`.
- Passos:
  - Dado termos de busca parciais, case-insensitive, ou sem correspondência
  - Quando `GET /users/search?q={query}&limit={limit}` é acionado
  - Então retorna apenas perfis públicos (sem dados sensíveis de credenciais/hash) respeitando a ordenação por level e limite
- Resultado esperado: Lista ordenada de usuários correspondentes sem colisões com rotas dinâmicas de id numérico.
- Rastreabilidade: `services/auth-service/app/api/routes.py`, `services/auth-service/app/services/auth_service.py`

### Catálogo de Jogos (Store Service)
#### STORE-INT-01 — Listagem completa e filtros do catálogo de jogos (GET /games)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_games.py -k "test_get_games_unfiltered or test_get_games_filter_by_category or test_get_games_filter_by_tag or test_get_games_filter_by_price_range or test_get_games_text_search or test_get_games_sorting"`
- Pré-condições: Endpoints da Store ativos com banco SQLite populado pela seed.
- Passos:
  - Dado parâmetros de filtro por categoria, tag, faixa de preço, texto de busca e ordenação
  - Quando o endpoint `GET /games` for acionado
  - Então a resposta contém estritamente os jogos correspondentes aos critérios, ordenados conforme solicitado
- Resultado esperado: Retorno HTTP 200 com lista JSON em conformidade com o schema `GameListItemResponse`.
- Rastreabilidade: `services/store-service/app/api/routes.py`

#### STORE-INT-02 — Consulta de detalhes completos de um jogo por ID (GET /games/{id})
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_games.py -k "test_get_game_details_success or test_get_game_details_not_found"`
- Pré-condições: Endpoints da Store ativos com catálogo inicial cadastrado.
- Passos:
  - Dado um ID válido existente e um ID inexistente
  - Quando o endpoint `GET /games/{id}` for requisitado
  - Então o ID válido retorna HTTP 200 com sinopse e capturas de tela, e o ID inexistente retorna HTTP 404 com mensagem amigável
- Resultado esperado: HTTP 200 com schema `GameDetailResponse` para ID existente e HTTP 404 para ID inválido.
- Rastreabilidade: `services/store-service/app/api/routes.py`

#### STORE-INT-09 — Ciclo completo da Wishlist no Backend (Adicionar, Idempotência, Listar e Remover)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_games.py -k "test_wishlist_add_list_and_remove"`
- Pré-condições: store-service em execução com banco de dados de teste.
- Passos:
  - Dado uma requisição autenticada com cabeçalho X-User-Id
  - Quando o usuário envia POST /wishlist/{game_id}, depois tenta adicionar novamente, consulta GET /wishlist e em seguida DELETE /wishlist/{game_id}
  - Então a adição inicial retorna HTTP 201 com created: true, a segunda retorna HTTP 200 com created: false (idempotência), a listagem retorna o jogo populado e a exclusão retorna HTTP 204
- Resultado esperado: Persistência e remoção atômica da tabela de favoritos/wishlist.
- Rastreabilidade: `services/store-service/app/api/routes.py`, `services/store-service/app/services/store_service.py`

#### STORE-INT-10 — Rejeição 401 de acesso não autenticado às rotas de Wishlist
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_games.py -k "test_wishlist_unauthenticated_rejection"`
- Pré-condições: Requisições para /wishlist emitidas sem header X-User-Id.
- Passos:
  - Dado tentativas de consultar GET /wishlist, adicionar POST /wishlist/1 ou remover DELETE /wishlist/1
  - Quando processadas pelo roteador do store-service
  - Então todas as três requisições são rejeitadas com HTTP 401 Unauthorized
- Resultado esperado: Proteção mandatória das rotas de favoritos contra acesso não identificado.
- Rastreabilidade: `services/store-service/app/api/routes.py`

### Biblioteca e Licenças (Library Service)
#### LIB-INT-01 — Concessão de licença via POST /library/grant
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_library.py -k "test_lib_int_01_grant_game_creates_item"`
- Pré-condições: Endpoint `/library/grant` ativo e banco SQLite configurado.
- Passos:
  - Dado um payload com `{"user_id": 1, "game_id": 5}`
  - Quando a requisição POST para `/library/grant` for executada
  - Então o status retornado é 201 Created com campo `created=True` e timestamp de aquisição
- Resultado esperado: Retorno HTTP 201 e persistência da posse do jogo.
- Rastreabilidade: `services/library-service/app/api/routes.py`

#### LIB-INT-02 — Idempotência da concessão de licença (POST /library/grant)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_library.py -k "test_lib_int_02_grant_game_idempotent"`
- Pré-condições: Item de biblioteca previamente concedido ao usuário.
- Passos:
  - Dado uma licença já concedida para o usuário 2 do jogo 8
  - Quando o endpoint `/library/grant` for acionado novamente com os mesmos dados
  - Então o status retornado é 200 OK com `created=False` mantendo o mesmo registro
- Resultado esperado: Retorno HTTP 200 sem criação de duplicata.
- Rastreabilidade: `services/library-service/app/services/library_service.py`

#### LIB-INT-03 — Consulta de jogos do usuário com autenticação (GET /library/my-games)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_library.py -k "test_lib_int_03_get_my_games_success"`
- Pré-condições: Usuário autenticado com jogos concedidos em sua biblioteca.
- Passos:
  - Dado o usuário 3 com 2 jogos adquiridos
  - Quando a requisição `GET /library/my-games` for enviada com header `X-User-Id: 3`
  - Então são retornados exatamente os 2 jogos com dados de playtime e status
- Resultado esperado: Retorno HTTP 200 com lista serializada de itens da biblioteca.
- Rastreabilidade: `services/library-service/app/api/routes.py`

#### LIB-INT-04 — Rejeição de consulta sem credenciais em GET /library/my-games
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_library.py -k "test_lib_int_04_get_my_games_unauthorized_when_missing_header"`
- Pré-condições: Endpoint `/library/my-games` protegido por identidade.
- Passos:
  - Dado requisições sem o header `X-User-Id` ou com valores inválidos (não numérico ou negativo)
  - Quando o endpoint for acionado
  - Então retorna HTTP 401 Unauthorized com mensagem detalhada
- Resultado esperado: Retorno HTTP 401 impedindo acesso anônimo ou corrompido.
- Rastreabilidade: `services/library-service/app/api/routes.py`

#### LIB-INT-05 — Retorno de lista vazia para usuário sem jogos adquiridos
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_library.py -k "test_lib_int_05_get_my_games_empty_for_user_without_games"`
- Pré-condições: Usuário recém-cadastrado sem aquisições de jogos.
- Passos:
  - Dado uma consulta com `X-User-Id: 999`
  - Quando o endpoint `GET /library/my-games` for processado
  - Então retorna HTTP 200 com lista vazia `[]`
- Resultado esperado: Retorno HTTP 200 com array vazio.
- Rastreabilidade: `services/library-service/app/api/routes.py`

#### LIB-INT-06 — Endpoint de validação de posse unitária (GET /library/users/{id}/has-game/{game_id})
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_ownership.py -k "test_ownership_check_false_then_true_after_grant"`
- Pré-condições: Usuário e catálogo iniciados no library-service.
- Passos:
  - Dado uma consulta de posse antes da concessão
  - Quando o endpoint GET /library/users/{user_id}/has-game/{game_id} for chamado
  - Então retorna {"owned": false}; após concessão via /library/grant, o mesmo endpoint retorna {"owned": true}
- Resultado esperado: Validação de posse booleana precisa e em tempo real.
- Rastreabilidade: `services/library-service/app/api/routes.py`

#### LIB-INT-07 — Ciclo de vida da sessão de jogo: início, heartbeat acumulativo e encerramento (E-04)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_sessions.py -k "test_session_lifecycle_start_ping_end"`
- Pré-condições: Usuário e jogo registrados no Library Service.
- Passos:
  - Dado uma chamada para POST /session/start gerando uma sessão ativa e marcando is_installed: true
  - Quando requisições POST /session/ping forem enviadas em sequência
  - Então o playtime_minutes é incrementado proporcionalmente no LibraryItem e a sessão é encerrada via POST /session/end
- Resultado esperado: Sessão persistida, playtime acumulado e encerramento com registro de timestamps.
- Rastreabilidade: `services/library-service/app/api/routes.py`, `services/library-service/app/services/library_service.py`

#### LIB-INT-08 — Desbloqueio de conquistas com persistência relacional e disparo de evento ao Social Service (E-05)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_sessions.py -k "test_unlock_achievement_with_activity_dispatch"`
- Pré-condições: Catálogo de conquistas populado no banco de dados.
- Passos:
  - Dado uma requisição POST /achievements/unlock com user_id, game_id e achievement_id
  - Quando a conquista for desbloqueada com sucesso (created: true)
  - Então persiste em user_achievements, dispara notificação de atividade para o Social Service (/activities) e responde com HTTP 200
- Resultado esperado: Persistência relacional de conquistas e emissão resiliente do evento de atividade.
- Rastreabilidade: `services/library-service/app/api/routes.py`, `services/library-service/app/services/library_service.py`

#### LIB-INT-09 — Consulta de telemetria de conquistas recentes para polling leve (E-07)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_sessions.py -k "test_recent_achievements_polling"`
- Pré-condições: Usuário autenticado com conquistas recém-conquistadas.
- Passos:
  - Dado que o usuário desbloqueou conquistas recentemente
  - Quando a rota GET /achievements/recent é consultada com header X-User-Id
  - Então retorna a lista de conquistas desbloqueadas recentes com metadados (nome, descrição e raridade)
- Resultado esperado: Dados formatados para consumo do polling leve do frontend.
- Rastreabilidade: `services/library-service/app/api/routes.py`, `services/library-service/app/services/library_service.py`

### Compra e Concessão de Licença
#### STORE-LIB-INT-01 — Sincronização, concessão de posse e remoção da Wishlist após compra
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_checkout.py -k "test_checkout_single_game_success"`
- Pré-condições: store-service em execução com mocks/serviços de auth-service e library-service, usuário com saldo e jogo na wishlist.
- Passos:
  - Dado um usuário autenticado com saldo suficiente e um jogo salvo na sua lista de desejos
  - Quando a rota POST /checkout com {"game_id": 1} for executada
  - Então o saldo é debitado no auth-service, a posse é concedida via POST /library/grant no library-service, a compra é persistida em purchases e o jogo é removido da wishlist
- Resultado esperado: Retorno HTTP 201 com status completed, licença concedida e remoção confirmada da wishlist.
- Rastreabilidade: `services/store-service/app/services/store_service.py`

#### STORE-LIB-INT-02 — Compra em lote via Carrinho de Compras (Multi-game Checkout)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_checkout.py -k "test_checkout_cart_multiple_games_success"`
- Pré-condições: Múltiplos jogos válidos no catálogo e saldo de carteira suficiente.
- Passos:
  - Dado um usuário com múltiplos jogos no carrinho (ex: jogos 1 e 2 somando R$ 80,00)
  - Quando a rota POST /checkout com {"game_ids": [1, 2]} for executada
  - Então o montante total é debitado atomicamente, cada licença é concedida no library-service e registros individuais de compra são persistidos
- Resultado esperado: Retorno HTTP 201 com array items contendo todos os jogos concedidos e novo saldo da carteira.
- Rastreabilidade: `services/store-service/app/services/store_service.py`

#### STORE-LIB-INT-03 — Bloqueio de compra de jogo já adquirido (Prevenção de duplicidade)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_checkout.py -k "test_checkout_already_owned_conflict"`
- Pré-condições: Usuário já possui o jogo na sua biblioteca (/library/users/{id}/has-game/{game_id} retorna owned: true).
- Passos:
  - Dado que o usuário tenta comprar um jogo já adquirido previamente
  - Quando o checkout consulta o library-service antes do débito financeiro
  - Então o checkout é interrompido imediatamente sem debitar saldo da carteira
- Resultado esperado: Retorno HTTP 409 Conflict com mensagem "Você já possui o jogo '...' em sua biblioteca."
- Rastreabilidade: `services/store-service/app/services/store_service.py`

#### STORE-LIB-INT-04 — Compensação Saga com estorno de carteira em caso de falha de concessão
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_checkout.py -k "test_checkout_saga_compensation_refund"`
- Pré-condições: Usuário com saldo e simulação de falha no endpoint de concessão do library-service.
- Passos:
  - Dado que o débito na carteira foi efetuado com sucesso mas a concessão da licença falhou no library-service
  - Quando o bloco de compensação Saga do checkout for acionado
  - Então o store-service emite um POST /users/{id}/wallet/credit devolvendo 100% do valor à carteira
- Resultado esperado: Retorno HTTP 502 Bad Gateway informando a falha e confirmando o estorno integral para a carteira.
- Rastreabilidade: `services/store-service/app/services/store_service.py`

#### STORE-LIB-INT-05 — Checkout direto de jogos 100% gratuitos (R$ 0,00)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_checkout.py -k "test_checkout_free_game_success"`
- Pré-condições: Jogo gratuito (preço R$ 0,00) disponível no catálogo.
- Passos:
  - Dado um usuário autenticado realizando a compra direta de um jogo de R$ 0,00
  - Quando a rota POST /checkout for invocada
  - Então o fluxo não sofre erro 422/400 de valor mínimo, a licença é concedida no library-service e o saldo permanece intacto
- Resultado esperado: Retorno HTTP 201 com total_paid: 0.0 e licença concedida.
- Rastreabilidade: `services/store-service/app/services/store_service.py`

#### STORE-MARKET-INT-01 — Registro best-effort de lançamento no extrato após o checkout (T-02)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_checkout.py -k "test_checkout_records_wallet_ledger_transaction or test_checkout_free_game_does_not_record_wallet_ledger_transaction or test_checkout_succeeds_even_if_wallet_ledger_call_fails"`
- Pré-condições: market-service mockado no client HTTP do store-service.
- Passos:
  - Dado um checkout pago bem-sucedido, um checkout de jogo gratuito e um checkout com o market-service indisponível
  - Quando o fluxo de checkout é concluído em cada cenário
  - Então o pago dispara `POST /wallet/transactions` (tipo `compra`, valor total) no market-service, o gratuito não dispara nenhum lançamento, e a falha no market-service é engolida sem impedir o HTTP 201 do checkout
- Resultado esperado: Extrato da carteira alimentado organicamente pelas compras reais, sem acoplar a disponibilidade do market-service à compra em si.
- Rastreabilidade: `services/store-service/app/services/store_service.py`

### Amizades e Atividades (Social Service)
#### SOCIAL-INT-01 — Registro e listagem de eventos de atividade no Social Service (E-05)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_social.py -k "test_record_and_list_activities"`
- Pré-condições: Banco de dados SQLite do social-service inicializado com tabela activities.
- Passos:
  - Dado um payload de atividade (ex: achievement_unlocked)
  - Quando o endpoint POST /activities for acionado
  - Então persiste na tabela activities e o evento passa a ser retornado em GET /activities e GET /feed
- Resultado esperado: Registro de atividade com status 201 e consulta de feed com status 200.
- Rastreabilidade: `services/social-service/app/api/routes.py`, `services/social-service/app/services/social_service.py`

#### SOCIAL-INT-02 — Comunicação bidirecional via WebSocket no Chat de amigos com persistência de histórico (F-03)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_social.py -k "test_websocket_chat_send_receive_and_history"`
- Pré-condições: Banco social.db com suporte a mensagens e endpoint WS /ws/chat/{room_id}.
- Passos:
  - Dado dois clientes conectados ao WebSocket da mesma sala de chat
  - Quando um cliente envia uma mensagem JSON via WebSocket
  - Então o outro cliente recebe a mensagem instantaneamente e a mesma fica disponível na consulta GET /chat/{room_id}/messages
- Resultado esperado: Entrega de mensagens síncrona com persistência relacional imediata.
- Rastreabilidade: `services/social-service/app/services/chat_manager.py`, `services/social-service/app/services/social_service.py`

#### SOCIAL-INT-03 — WebSocket de presença em tempo real e atualização de status de jogo (F-04 & F-05)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_social.py -k "test_websocket_presence_connect_and_snapshot or test_presence_status_update_playing"`
- Pré-condições: Social Service em execução com rotas WS /ws/presence e POST /presence/status.
- Passos:
  - Dado um cliente conectado ao WebSocket de presença
  - Quando o endpoint interno POST /presence/status recebe alteração de status para "playing" com título do jogo
  - Então uma notificação presence_update é imediatamente transmitida pelo socket para o cliente conectado
- Resultado esperado: Propagação instantânea do status de jogo via broadcast WebSocket.
- Rastreabilidade: `services/social-service/app/services/presence_manager.py`, `services/social-service/app/api/routes.py`

#### SOCIAL-INT-04 — Enriquecimento do Feed de Atividades com eventos multi-domínio de compras e conquistas (F-06)
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_social.py -k "test_feed_activities_enriched"`
- Pré-condições: Tabela activities populada com múltiplos tipos de eventos.
- Passos:
  - Dado que eventos de compra (game_purchased) e conquistas (achievement_unlocked) foram registrados
  - Quando a rota GET /feed for consultada
  - Então retorna a lista cronológica reversa de atividades contendo todos os tipos suportados
- Resultado esperado: Feed agregador consistente multi-domínio com status 200.
- Rastreabilidade: `services/social-service/app/api/routes.py`, `services/social-service/app/services/social_service.py`

#### SOCIAL-INT-05 — Ciclo de vida de grupos da comunidade: criação, busca, adesão e saída (M-01 & M-02)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_groups_forum.py -k "test_create_and_list_groups or test_join_and_leave_group"`
- Pré-condições: Banco de dados com tabelas `groups` e `group_members` ativas.
- Passos:
  - Dado um usuário autenticado criando um grupo com nome, descrição, categoria e URLs de imagens
  - Quando o grupo é persistido, o criador é automaticamente associado como `owner`
  - E quando outro usuário aciona `POST /groups/{id}/join` e posteriormente `POST /groups/{id}/leave`
  - Então o contador de membros é incrementado/decrementado atomicamente e o histórico de associação é atualizado
- Resultado esperado: Retorno HTTP 201 na criação, 200 na adesão/saída e validação estrita de associação e papéis.
- Rastreabilidade: `services/social-service/app/api/groups.py`, `services/social-service/app/models/group.py`

#### SOCIAL-INT-06 — Fórum de discussões com tópicos, replies e moderação (M-03 & M-04)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_groups_forum.py -k "test_forum_topic_and_replies or test_forum_pin_and_lock_topic"`
- Pré-condições: Grupo existente e membro autenticado.
- Passos:
  - Dado a criação de um tópico de discussão via `POST /groups/{id}/posts`
  - Quando membros submetem respostas via `POST /posts/{id}/replies`
  - E o proprietário/moderador aciona `PATCH /posts/{id}` para fixar (`is_pinned`) e trancar (`is_locked`)
  - Então o contador de respostas é mantido em sincronia e o tópico trancado bloqueia novas respostas com HTTP 400
- Resultado esperado: Persistência relacional de threads de fórum, moderação por papéis e integridade referencial.
- Rastreabilidade: `services/social-service/app/api/forum.py`, `services/social-service/app/models/forum.py`

#### SOCIAL-INT-07 — Bate-papo coletivo do grupo com WebSocket e histórico (M-05)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/social-service/tests/test_groups_forum.py -k "test_group_chat_websocket_and_history"`
- Pré-condições: Grupo existente com mensagens persistidas na tabela `group_messages`.
- Passos:
  - Dado uma conexão WebSocket em `/ws/group/{id}/chat`
  - Quando o usuário envia uma mensagem de texto pelo socket
  - Então a mensagem é transmitida para todos os membros conectados na sala e persistida no banco SQLite
  - E a chamada REST `GET /groups/{id}/chat/messages` retorna o histórico completo ordenado
- Resultado esperado: Entrega assíncrona bidirecional e recuperação instantânea do histórico com status 200.
- Rastreabilidade: `services/social-service/app/api/groups.py`, `services/social-service/app/services/group_chat_manager.py`

### Integração Cross-Service (Store, Library, Social)
#### LIB-SOC-INT-01 — Integração de presença: início e encerramento de sessão de jogo notificando Social Service (F-05)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/library-service/tests/test_sessions.py -k "test_session_dispatches_presence_events"`
- Pré-condições: Library Service configurado com URL do Social Service para dispatch de presença.
- Passos:
  - Dado um usuário iniciando uma sessão de jogo via POST /session/start
  - Quando a sessão é criada e posteriormente encerrada via POST /session/end
  - Então o library-service despacha evento de presença com status "playing" e título do jogo no start, e status "online" no encerramento
- Resultado esperado: Notificações de presença emitidas com integridade para atualização social em tempo real.
- Rastreabilidade: `services/library-service/app/services/library_service.py`

#### STORE-SOC-INT-01 — Integração de feed: disparo automático de atividade game_purchased na conclusão do checkout (F-06)
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/store-service/tests/test_checkout.py -k "test_checkout_dispatches_activity_to_social_service"`
- Pré-condições: Store Service com rota POST /checkout funcional e integração com social-service configurada.
- Passos:
  - Dado um usuário com saldo completando a compra de um jogo
  - Quando a transação é finalizada com sucesso
  - Então o store-service emite uma requisição POST /activities para o social-service com o payload da compra
- Resultado esperado: Registro automático no feed social sem bloquear o retorno do checkout.
- Rastreabilidade: `services/store-service/app/services/store_service.py`


## E2E / Sistema completo

### Fluxo de Usuário e Loja
#### E2E-FLOW-01 — Navegação da Loja e visualização de detalhes de jogo
- Prioridade: P0
- Status: planejado
- Runner: playwright
- Comando: 
- Pré-condições: Frontend e Gateway em execução via Docker Compose.
- Passos:
  - Dado que o usuário acessa a página inicial da loja
  - Quando clica em um card de jogo em destaque
  - Então a aplicação exibe os detalhes do jogo, preço, capturas de tela e botão de compra
- Resultado esperado: Interface responsiva renderizada sem erros no console do navegador.
- Rastreabilidade: `docs/architecture.md` (Seções 1 e 2.3)

### Navegação e Ciclo de Vida da Aplicação
#### E2E-NAV-01 — Alternância entre páginas sem corrupção de contexto ou lentidão
- Prioridade: P1
- Status: aprovado
- Runner: playwright
- Comando: `npm --prefix frontend run test:e2e -- e2e/navigation.spec.ts`
- Pré-condições: Frontend MIST em execução com usuário autenticado e saldo inicial carregado.
- Passos:
  - Dado que o usuário está com contexto ativo na tela da Loja (com termo de busca digitado) ou na Biblioteca
  - Quando aciona a alternância para a tela "Loja de Pontos" através da barra lateral de navegação
  - Então a transição ocorre de forma fluida (< 500ms), desmontando os elementos exclusivos da página de origem (ex: Header da Loja) sem reter filtros residuais, e exibindo a Loja de Pontos com saldo íntegro de pontos
- Resultado esperado: Migração de tela instantânea, sem retenção de estado orfão incompatível entre fluxos e renderização completa da Loja de Pontos.
- Rastreabilidade: `frontend/src/App.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/pages/PointsShop.tsx`
- Observações: Previne degradação de performance por acúmulo de contexto residual e garante isolamento do ciclo de vida de cada tela na SPA.

### Autenticação e Gestão de Sessão
#### E2E-AUTH-01 — Fluxo de cadastro, autenticação com bônus de R$ 200,00 e logout
- Prioridade: P0
- Status: aprovado
- Runner: playwright
- Comando: `npm --prefix frontend run test:e2e -- e2e/auth.spec.ts`
- Pré-condições: Frontend MIST em execução com servidor de desenvolvimento Playwright.
- Passos:
  - Dado que o visitante acessa a página inicial do MIST
  - Quando aciona o botão de cadastro no modal, preenche os dados e submete
  - Então a interface autentica o usuário, exibe o saldo de R$ 200,00 no Header, exibe o nome de usuário na Sidebar e permite encerrar a sessão
- Resultado esperado: Fluxo visual completo de onboarding e encerramento de sessão sem falhas no navegador.
- Rastreabilidade: `frontend/e2e/auth.spec.ts`, `frontend/src/context/AuthContext.tsx`


## Regressão

### Frontend
#### REG-FRONT-01 — Preservação da paleta de cor secundária (#1F4D36)
- Prioridade: P2
- Status: aprovado

- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/test/theme.test.ts`
- Pré-condições: Variáveis de tema e estilos Tailwind carregados.
- Passos:
  - Dado a configuração de tema do frontend
  - Quando os elementos secundários (badges, destaques, abas ativas) forem inspecionados
  - Então a cor aplicada deve ser estritamente `#1F4D36` e não o valor legado `#BFE7D2`
- Resultado esperado: Estilos computados correspondem à cor `#1F4D36`.
- Rastreabilidade: `prompts.md` (Prompt 3)
- Observações: Regressão originada da substituição de paleta definida no Prompt 3.

#### REG-FRONT-02 — Garantia de alta legibilidade com texto preto (#000000) e fundo branco em inputs, textareas e selects
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit -- src/pages/Groups.test.tsx`
- Causa raiz: Inputs em modais de grupos, chat e campos de formulário utilizavam `text-white` com fundos sujeitos a resets de navegador ou falta de contraste, resultando em caracteres digitados invisíveis ou ilegíveis.
- Reprodução original: Digitar texto no chat de grupo, título de nova comunidade ou buscas e visualizar caracteres brancos de baixo contraste.
- PR/Commit relacionado: Prompt 12 (frontend/src/styles/global.css, Groups.tsx, ChatWindow.tsx, Header.tsx, Library.tsx, News.tsx, Social.tsx, AuthModal.tsx, Login.tsx, ReviewFormModal.tsx).
- Pré-condições: Aplicação frontend carregada no navegador.
- Passos:
  - Dado qualquer campo `<input>`, `<textarea>` ou `<select>` na interface (chat, criação de grupo, tópicos, buscas, autenticação)
  - Quando o usuário digita qualquer caractere no campo
  - Então o texto é renderizado estritamente na cor preta (`#000000` / `text-black`) sobre fundo branco limpo (`#ffffff` / `bg-white`) com placeholder cinza contrastante (`#6b7280`)
- Resultado esperado: Total legibilidade de caracteres inseridos em 100% dos formulários da aplicação.
- Rastreabilidade: `frontend/src/styles/global.css`, `frontend/src/pages/Groups.tsx`

#### REG-FRONT-03 — Fundo opaco com efeito backdrop-blur e bordas temáticas no Dropdown de Busca Global (idêntico às notificações e modais)
- Prioridade: P1
- Status: aprovado
- Runner: vitest
- Comando: `npm --prefix frontend run test:unit src/components/GlobalSearchDropdown.test.tsx`
- Causa raiz: O container do dropdown utilizava a classe `bg-brand-dark/95`, não mapeada nas cores do tema Tailwind, resultando em fundo transparente no dropdown da busca ao lado do ícone de notificações (sino).
- Reprodução original: Digitar um termo na barra de busca do header e observar a janela de resultados flutuando sem fundo opaco sobre os componentes subjacentes da página.
- PR/Commit relacionado: Prompt 14 (`frontend/src/components/GlobalSearchDropdown.tsx`).
- Pré-condições: Dropdown aberto com query digitada na barra de busca.
- Passos:
  - Dado o componente `GlobalSearchDropdown` montado no Header
  - Quando a janela de resultados é exibida
  - Então o container aplica `bg-[#0b0f19]/95 backdrop-blur-xl border border-brand-purple/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl` com cabeçalho `bg-brand-surface/80` e rodapé `bg-brand-surface/60`
- Resultado esperado: Identidade visual uniforme e fundo opaco contrastante idêntico ao Dropdown de Notificações (`NotificationsDropdown.tsx`).
- Rastreabilidade: `frontend/src/components/GlobalSearchDropdown.tsx`, `frontend/src/components/NotificationsDropdown.tsx`

### Autenticação
#### REG-AUTH-01 — Suporte a débito de R$ 0,00 para jogos gratuitos
- Prioridade: P1
- Status: aprovado
- Runner: pytest
- Comando: `pytest services/auth-service/tests/test_wallet.py -k "test_debit_wallet_zero_amount"`
- Causa raiz: O schema Pydantic WalletDebitRequest exigia amount: float = Field(..., gt=0.0). Compras de R$ 0,00 falhavam com erro 422 e mensagem "Falha ao processar débito na carteira MIST".
- Reprodução original: Tentar comprar diretamente um jogo gratuito de R$ 0,00 no store-service.
- PR/Commit relacionado: Prompt 30/31 (services/auth-service/app/schemas/user.py e auth_service.py).
- Pré-condições: Usuário logado na plataforma.
- Passos:
  - Dado uma requisição de débito com amount: 0.0
  - Quando o endpoint POST /users/{id}/wallet/debit for acionado
  - Então o endpoint aceita a requisição com HTTP 200 sem alterar o saldo e sem disparar exceção 422
- Resultado esperado: HTTP 200 com new_balance idêntico ao previous_balance.
- Rastreabilidade: `services/auth-service/app/schemas/user.py`, `services/auth-service/app/services/auth_service.py`

## Smoke

### Health Check dos Serviços
#### SMOKE-HEALTH-01 — Conectividade básica de todos os microsserviços
- Prioridade: P0
- Status: planejado
- Runner: pytest
- Comando: 
- Pré-condições: Gateway, Auth, Store, Library e Social iniciados.
- Passos:
  - Dado que os serviços estão em execução
  - Quando uma requisição GET for enviada aos endpoints de health check de cada serviço
  - Então todos devem responder com status HTTP 200 e payload `{"status": "ok"}`
- Resultado esperado: Retorno 200 de todos os serviços em menos de 1000ms.
- Rastreabilidade: `docs/architecture.md` (Seção 1)
