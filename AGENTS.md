# Regras do Projeto MIST

## Diretriz Mandatória de Rastreamento de Prompts

> **IMPORTANTE — REGRA DE PROJETO PERPÉTUA:**
> A cada novo prompt ou instrução do usuário em **qualquer conversa ou sessão de desenvolvimento** no projeto MIST, o agente de IA deve **obrigatoriamente registrar**:
> 1. O prompt exato de entrada fornecido pelo usuário.
> 2. As decisões arquiteturais e técnicas tomadas.
> 3. O resumo das saídas geradas e modificações realizadas no código/documentação.
> 
> Esse registro deve ser salvo/atualizado incrementalmente dentro do diretório `prompts/`, em arquivos nomeados no padrão `<user_dayth>.md` (exemplo: `gabriel-T800_26th.md` para o usuário `gabriel-T800` no dia 26).
> - Um novo arquivo é criado quando mudar o dia corrente ou o usuário trabalhando na máquina.
> - Na primeira vez em que for registrar em uma máquina/ambiente de operação, o agente deve validar e confirmar qual é o usuário ativo antes de criar o arquivo.

