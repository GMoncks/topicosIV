---
name: qa_writer
description: Use esta skill para criar ou atualizar entradas do TESTS.md sempre que uma funcionalidade nova for desenvolvida, um teste precisar ser adicionado/revisado, ou um bug corrigido precisar virar um caso de regressão.
---

# QA Writer Skill

Esta skill atua como autor e curador técnico do catálogo de testes do projeto MIST ([`TESTS.md`]. Ela garante que qualquer novo comportamento, requisito ou correção de bug seja documentado sob a taxonomia da pirâmide de testes.

---

## 1. Responsabilidades e Permissões

- **Permissão de Leitura e Escrita**: [`TESTS.md`].
- **Permissão de Somente Leitura**: [`resultados.json`] — utilizado para analisar falhas recorrentes, avaliar estabilidade e selecionar testes para transformar em casos de regressão.
- **Isolamento de Execução**: Esta skill **NUNCA** executa testes diretamente. Ela não possui ferramentas nem autorização para invocar runners (`pytest`, `vitest`, `playwright`, etc.).
- **Edição Incremental Obrigatória**: Ao adicionar ou editar um teste, altere **estritamente** a seção/bloco relevante (navegando pela hierarquia `##`, `###`, `####`). **Nunca** sobrescreva o arquivo `TESTS.md` por inteiro após sua criação inicial.

---

## 2. Estrutura Padrão de um Teste

Cada novo teste adicionado deve seguir obrigatoriamente a estrutura abaixo:

```markdown
#### <ID> — <título curto>
- Prioridade: P0 | P1 | P2
- Status: planejado | implementado
- Runner: <nome de um runner da seção "Runners registrados">
- Comando: `<comando exato>`   (deixar vazio enquanto status = planejado)
- Pré-condições: <estado necessário antes da execução>
- Passos:
  - Dado <contexto inicial>
  - Quando <ação executada>
  - Então <resultado esperado observável>
- Resultado esperado: <critério de aceite objetivo>
- Rastreabilidade: <feature, requisito, arquivo ou commit relacionado>
- Observações: <opcional — ex: "Originado do bug fix #42">
```

### Padrão de Nomenclatura de IDs
- **Unitários**: `<DOMINIO>-UNIT-<NUMERO>` (ex: `AUTH-UNIT-02`, `FRONT-UNIT-03`)
- **Integração**: `<DOMINIO>-INT-<NUMERO>` (ex: `GATEWAY-INT-02`, `STORE-LIB-INT-02`)
- **E2E / Sistema completo**: `E2E-<DOMINIO/FLUXO>-<NUMERO>` (ex: `E2E-BUY-01`, `E2E-CHAT-01`)
- **Regressão**: `REG-<DOMINIO>-<NUMERO>` (ex: `REG-FRONT-02`, `REG-AUTH-01`)
- **Smoke**: `SMOKE-<DOMINIO/AREA>-<NUMERO>` (ex: `SMOKE-HEALTH-02`)

---

## 3. Categorias da Pirâmide de Testes

1. **Unitários**: Teste isolado de uma função, classe, método ou componente React sem acoplamento a serviços externos ou banco de dados real.
2. **Integração**: Verificação de comunicação entre múltiplos componentes internos (ex: Gateway validando token e encaminhando para Auth, ou Store chamando Library via HTTP).
3. **E2E / Sistema completo**: Fluxo completo de usuário do início ao fim usando navegadores reais e ambiente Docker integrado.
4. **Regressão**: Casos originados de defeitos reportados ou bugs corrigidos. Todo bug resolvido deve ser acompanhado de um caso de regressão aqui.
5. **Smoke**: Conjunto enxuto e crítico de testes para validação rápida de sanidade do sistema após deploys ou builds.

---

## 4. Regras de Transição de Status

1. **Criação do Teste**:
   - Todo teste nasce obrigatoriamente com `Status: planejado` e o campo `Comando:` vazio.
   - O runner selecionado no campo `Runner:` deve constar na seção `## Runners registrados`. Se um novo tipo de runner for adotado na stack, adicione-o primeiro à lista de runners registrados antes de referenciá-lo.
2. **Transição para `implementado`**:
   - Um teste **SÓ** pode transitar para `Status: implementado` quando o código do teste automatizado correspondente já estiver implementado e com o comando de execução preenchido.
   - Antes de efetuar a alteração de status no `TESTS.md`, acione a skill `qa_tester` em **modo de validação pontual (dry-run)** especificando o `<ID>`.
   - Essa validação gerará um registro em `resultados.json` marcado com `"origem": "validacao"`.
   - Apenas se a validação pontual responder com sucesso (ou com confirmação de execução válida do runner), altere o `Status:` para `implementado` e preencha o `Comando: <comando exato>`.

---

## 5. Fluxo de Trabalho Passo a Passo

1. **Leitura de Contexto**:
   - Leia a seção do `TESTS.md` correspondente à categoria pretendida.
   - Se for criar um teste de regressão, consulte `resultados.json` para verificar os erros reportados e seu histórico recente.
2. **Inserção Incremental**:
   - Localize a subseção correta (`### <Funcionalidade>`) ou crie uma nova caso não exista.
   - Adicione o bloco `#### <ID> — <título curto>` preservando a indentação e os campos obrigatórios.
3. **Validação de Transição**:
   - Caso o teste já possua código automatizado pronto, acione `qa_tester` para validação pontual (`dry-run`) com `"origem": "validacao"`.
   - Atualize `Status` e `Comando` de acordo com a resposta.

---   

## 6. Modo de varredura em lote (aditivo)

**Objetivo**: analisar todo o repositório (arquivos `*.ts`, `*.tsx`, `*.js`, `*.py`, `Dockerfile`, etc.) e o `TESTS.md` para identificar lacunas de teste, como funcionalidades sem cobertura, categorias fracas ou áreas críticas sem casos.

**Fluxo**:
1. **Leitura completa**: a skill varre `TESTS.md` inteiro e percorre recursivamente o diretório raiz do projeto coletando definições de rotas, componentes React, serviços e funções exportadas.
2. **Detecção de lacunas**: compara o que foi encontrado com as seções existentes em `TESTS.md`. Para cada funcionalidade detectada que não possua um bloco `#### <ID> — …` correspondente, gera um registro de lacuna contendo:
   - Nome da funcionalidade ou caminho do arquivo.
   - Categoria sugerida (Unitário, Integração, E2E, Regressão, Smoke).
   - Sugestão de ID seguindo a convenção de nomenclatura.
3. **Inserção pontual**: para cada lacuna, localiza a subseção `### <Funcionalidade>` apropriada em `TESTS.md`; se não existir, cria‑a. Em seguida insere o bloco de teste criado usando o **Formato Padrão de um Teste** (ver seção 2). Cada inserção é feita via edição incremental (não sobrescreve o arquivo inteiro).
4. **Registro**: ao final, a skill gera um sumário no log indicando quantas lacunas foram preenchidas e quais IDs foram criados.

**Características**:
- 100 % aditivo: nunca remove ou altera testes existentes, apenas adiciona novos blocos.
- Operação segura: usa operações de edição incremental descritas na seção **Edição Incremental Obrigatória**.
- Configurável: a profundidade de varredura pode ser ajustada via parâmetro `maxDepth` (padrão: ilimitado).
