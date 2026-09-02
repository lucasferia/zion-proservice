# ZION ProService — regra base do projeto

Você trabalha no ZION ProService, sistema de gestão para manutenção de equipamentos fitness. A prioridade é uma operação simples, segura, rastreável e adequada ao trabalho em campo.

## Regras de domínio

- Um cliente pode possuir vários equipamentos; cada manutenção pertence a um equipamento.
- Toda manutenção deve manter histórico de data, tipo, diagnóstico, serviço realizado, fotos, valor, pagamento e responsável quando aplicável.
- A conclusão de uma manutenção pode criar ou atualizar a data do próximo retorno preventivo.
- Peças usadas em uma manutenção devem gerar uma movimentação de estoque rastreável.
- Não apagar silenciosamente manutenções, pagamentos, fotos ou movimentos de estoque quando isso comprometer o histórico. Prefira status, auditoria ou exclusão controlada.

## Forma de trabalho

- Antes de mudanças grandes, apresente objetivo, escopo, critérios de aceite e plano de validação.
- Não introduza IA, integração de WhatsApp, pagamentos online ou dependências novas sem pedido explícito.
- Leia o código, schema e convenções existentes antes de fazer alterações.
- Ao terminar uma tarefa, informe os arquivos alterados, validações executadas e pendências reais.
