# TESTS.md

## Runners registrados
- pytest → comando-base: `pytest`, diretório: `services/<servico>` ou `gateway`
- vitest → comando-base: `npx vitest run`, diretório: `frontend`
- playwright → comando-base: `npx playwright test`, diretório: `.`

## Unitários

### Autenticação (Auth Service)
#### AUTH-UNIT-01 — Validação de hash e verificação de senha
- Prioridade: P0
- Status: planejado
- Runner: pytest
- Comando: 
- Pré-condições: Módulo de hashing de senhas implementado no `auth-service`.
- Passos:
  - Dado uma senha de usuário em texto plano
  - Quando a função de hash e verificação for executada
  - Então a senha gerada não deve ser em texto plano e deve validar positivamente contra a senha correta
- Resultado esperado: Hashing com bcrypt/argon2 funcional e seguro.
- Rastreabilidade: `docs/architecture.md` (Seção 2.2 — Auth Service)
- Observações: Teste unitário puro sem depender de banco de dados.

### Frontend Components
#### FRONT-UNIT-01 — Renderização do Card de Jogo com Preço e Desconto
- Prioridade: P1
- Status: planejado
- Runner: vitest
- Comando: 
- Pré-condições: Componente `GameCard.tsx` disponível.
- Passos:
  - Dado as propriedades de um jogo com preço original e percentual de desconto
  - Quando o componente `GameCard` for renderizado
  - Então o preço promocional e o badge com estilo `#1F4D36` devem ser exibidos corretamente
- Resultado esperado: Badge e valor formatado renderizados de acordo com as propriedades fornecidas.
- Rastreabilidade: `frontend/src/components/GameCard.tsx`

## Integração

### Gateway e Autenticação
#### GATEWAY-INT-01 — Encaminhamento de requisição com injeção de header de identidade
- Prioridade: P0
- Status: planejado
- Runner: pytest
- Comando: 
- Pré-condições: API Gateway e Auth Service instanciados em ambiente de teste.
- Passos:
  - Dado um token JWT válido emitido pelo Auth Service
  - Quando o cliente envia uma requisição autenticada através do Gateway
  - Então o Gateway valida a assinatura e encaminha para o serviço de destino injetando o header `X-User-Id`
- Resultado esperado: Código HTTP 200 e recebimento do header `X-User-Id` correto no serviço downstream.
- Rastreabilidade: `docs/architecture.md` (Seção 2.1 e 3.1)

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

## Regressão

### Frontend
#### REG-FRONT-01 — Preservação da paleta de cor secundária (#1F4D36)
- Prioridade: P2
- Status: planejado
- Runner: vitest
- Comando: 
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
