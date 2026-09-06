---
name: qa_tester
description: Use esta skill para executar os testes descritos no TESTS.md, seja a suíte completa ou uma categoria específica, e registrar os resultados.
---

# QA Tester Skill

Esta skill é o motor de execução e registro de resultados de testes do projeto MIST. Ela é responsável por acionar os runners reais configurados (`pytest`, `vitest`, `playwright`), capturar seus resultados objetivos e persistí-los de forma atômica no arquivo [`resultados.json`].

---

## 1. Responsabilidades e Permissões

- **Permissão de Somente Leitura**: [`TESTS.md`] — esta skill nunca altera o catálogo de testes.
- **Permissão de Escrita Atômica**: [`resultados.json`].
- **Execução Real Mandatória**: A skill **deve invocar o runner real** indicado no campo `Runner` através do comando presente em `Comando:`. É estritamente proibido deduzir ou inferir se um teste passa ou falha apenas lendo o código-fonte.
- **Tratamento de Testes Planejados**: Testes com `Status: planejado` ou sem comando definido são tratados silenciosamente como `pending`, **nunca** como falha (`fail`).

---

## 2. Modos de Invocação

A skill opera sob três modos de execução:

1. **Modo Completo**:
   - Percorre todos os testes de [`TESTS.md`].
   - Agrupa a execução por tipo de runner (`pytest`, `vitest`, `playwright`) para otimizar tempo e minimizar alternância de contextos e ambientes.
2. **Modo por Categoria**:
   - Executa estritamente os testes pertencentes à categoria informada (ex.: `Unitários`, `Integração`, `E2E / Sistema completo`, `Regressão`, `Smoke`).
3. **Modo de Validação Pontual (Dry-run / Validação)**:
   - Acionado pela skill `qa_writer` para validar a implementação de um único teste pelo seu `<ID>` antes de promovê-lo a `Status: implementado`.
   - Nesse modo, o resultado gerado é gravado com o atributo `"origem": "validacao"` (diferente do padrão `"origem": "execucao"`).

---

## 3. Normalização e Schema de Resultados

Os resultados de todos os runners são normalizados para a estrutura única em `resultados.json`:

```json
{
  "<ID-do-teste>": {
    "runner": "<nome-runner>",
    "historico": [
      {
        "run_id": "<timestamp ISO 8601>",
        "status": "pass | fail | pending",
        "duracao_ms": 0,
        "erro": null,
        "origem": "execucao | validacao"
      }
    ]
  }
}
```

### Regra de Histórico FIFO (Últimas 10 Execuções)
- Para cada teste (`<ID-do-teste>`), a chave `historico` mantém uma lista cronológica das últimas 10 execuções.
- A execução mais recente fica sempre na última posição da lista.
- Ao atingir a 11ª execução, a mais antiga é descartada (FIFO).

---

## 4. Garantia de Escrita Atômica

Para prevenir corrupção de dados ou arquivos parcialmente gravados durante concorrência ou interrupções:
1. Os dados atuais de `resultados.json` são carregados em memória e mesclados com as novas entradas.
2. O payload JSON consolidado é gravado em um arquivo temporário no mesmo diretório (ex: `res_XXXXXX.tmp`).
3. O arquivo temporário substitui o `resultados.json` original via operação atômica de renomeação do sistema operacional (`os.replace`).

---

## 5. Script Adaptador Auxiliar

Para garantir a normalização e a atomicidade, a skill conta com o script utilitário [`runner_adapter.py`](./scripts/runner_adapter.py):

### Exemplos de Utilização do Adaptador:

```bash
# Execução completa de todos os testes
python .agents/skills/qa_tester/scripts/runner_adapter.py

# Execução apenas de testes da categoria Smoke
python .agents/skills/qa_tester/scripts/runner_adapter.py --categoria "Smoke"

# Validação pontual de um único teste (acionado pelo qa_writer)
python .agents/skills/qa_tester/scripts/runner_adapter.py --id "SMOKE-HEALTH-01" --origem "validacao"
```
