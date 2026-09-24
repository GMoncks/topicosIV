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

### Compra e Concessão de Licença
#### STORE-LIB-INT-01 — Chamada síncrona HTTP de concessão de posse após compra
- Prioridade: P0
- Status: planejado
- Runner: pytest
- Comando: 
- Pré-condições: Usuário autenticado e com saldo suficiente simulado.
- Passos:
  - Dado um pedido de compra finalizado com sucesso no `store-service`
  - Quando o `store-service` emitir um POST para `/api/library/grant` do `library-service` via httpx
  - Então o jogo é adicionado à biblioteca do usuário no banco `library.db`
- Resultado esperado: Resposta HTTP 201/200 confirmando a inclusão da licença.
- Rastreabilidade: `docs/architecture.md` (Seção 3.2)

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
