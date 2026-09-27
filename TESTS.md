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
