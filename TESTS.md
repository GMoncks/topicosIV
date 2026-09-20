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


## Integração

### Gateway e Autenticação
#### GATEWAY-INT-01 — Encaminhamento de requisição com injeção de header de identidade
- Prioridade: P0
- Status: aprovado
- Runner: pytest
- Comando: `pytest gateway/tests/test_gateway.py`
- Pré-condições: API Gateway instanciado em ambiente de teste com FastAPI TestClient.
- Passos:
  - Dado um token JWT válido emitido pelo Auth Service e tentativas de spoofing com `X-User-Id`
  - Quando o cliente envia uma requisição através do Gateway
  - Então o Gateway descarta headers de spoofing externos, valida o JWT e encaminha injetando o header seguro `X-User-Id` downstream
- Resultado esperado: Código HTTP 200 e recebimento do header `X-User-Id` genuíno no serviço interno.
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
