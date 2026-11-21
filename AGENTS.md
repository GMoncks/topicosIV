# Regras do Projeto MIST

## Diretriz Mandatória de Rastreamento de Prompts

> **IMPORTANTE — REGRA DE PROJETO PERPÉTUA ATUALIZADA:**
> A cada novo prompt ou instrução do usuário em **qualquer conversa ou sessão de desenvolvimento** no projeto MIST, o agente de IA deve **obrigatoriamente registrar** TODOS os prompts e respostas em **UMA ÚNICA localização**:
>
> **Arquivo Principal — `local_ai_prompts/G15_LLM`** (SEMPRE ANEXADO):
> - Este arquivo deve ser **sempre appending** com novos prompts e respostas, **NUNCA reescrevendo** o conteúdo existente.
> - Cada entrada deve ser separada por uma linha divisória (`---`).
> - Cada entrada deve conter:
>   - O prompt exato de entrada fornecido pelo usuário.
>   - As decisões arquiteturais e técnicas tomadas.
>   - O resumo das saídas geradas e modificações realizadas no código/documentação.
>
> **A pasta `prompts/` com o padrão `<user_dayth>.md` foi DESCONTINUADA. Nenhum arquivo mais deve ser criado ou atualizado nesse local.**
