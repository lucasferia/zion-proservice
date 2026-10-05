# Guia rápido de entrega — Zion e Portal da Academia

## Endereços de acesso

- Sistema interno: `https://zion-proservice.vercel.app/app`
- Login: `https://zion-proservice.vercel.app/login`
- Cadastro externo: `https://zion-proservice.vercel.app/portal/cadastro`
- Portal autenticado: `https://zion-proservice.vercel.app/portal`

Use somente contas individuais. Não compartilhe senha e nunca envie credenciais por prints ou chamados.

## Como Lucas libera uma academia

1. Entre no sistema interno como `owner`.
2. Abra **Portal das Academias** em `/app/portal-academias`.
3. Localize o usuário que confirmou o próprio e-mail e abra **Gerenciar**.
4. Vincule a academia correta e somente as unidades necessárias.
5. Ative o acesso individual e confirme que o acesso comercial da academia está ativo.
6. Peça ao usuário para entrar novamente e conferir o nome da academia e a unidade ativa.

Para interromper o acesso, suspenda o usuário individualmente ou o acesso comercial da academia pelo mesmo módulo. A sessão já aberta perde autorização na próxima resolução; novas operações protegidas ficam bloqueadas. O histórico não deve ser apagado.

## O que a academia pode fazer

- selecionar uma das unidades autorizadas;
- consultar e cadastrar equipamentos dentro da unidade ativa;
- criar solicitações de manutenção com criticidade percebida e fotos;
- consultar as próprias solicitações e a resposta pública da Zion;
- cancelar uma solicitação enquanto ela ainda estiver pendente.

Solicitação não é OS. **Aprovar** registra a decisão e a prioridade técnica, mas não agenda atendimento nem cria uma OS. **Converter em OS** cria explicitamente uma única OS em rascunho para o fluxo interno. Mesmo convertida, a solicitação não significa que o serviço foi concluído.

O Portal acompanha a solicitação até a conversão e mostra o número da OS. O acompanhamento operacional completo da execução da OS ainda não faz parte do Portal.

## Como Lucas trata uma solicitação

1. Abra **Solicitações** em `/app/solicitacoes`.
2. Confira academia, unidade, equipamento, relato, criticidade percebida e fotos.
3. Para aprovar, defina a prioridade técnica. A resposta pública será vista pela academia; a nota interna permanece somente no sistema interno.
4. Para rejeitar, escreva um motivo público claro. A rejeição não cria OS.
5. Para uma solicitação aprovada, use **Preparar conversão**, revise tipo, data/hora e técnico e confirme.
6. Abra a OS criada, execute o ciclo normal do módulo de manutenções e use o link de origem para retornar à solicitação.

Uma solicitação rejeitada ou cancelada não pode ser convertida. Repetir a mesma conversão não cria outra OS. Concluir ou cancelar a OS também não libera uma nova conversão da solicitação original.

## Fotos privadas e uploads órfãos

As fotos ficam em bucket privado. O navegador recebe URLs assinadas por até **300 segundos**. Depois de uma revogação, novas assinaturas de fotos protegidas ficam bloqueadas, mas uma URL emitida anteriormente pode continuar válida até expirar.

Se houver interrupção entre o upload e o registro dos metadados, pode permanecer um objeto órfão temporário. A aplicação tenta removê-lo imediatamente quando o registro falha. Se isso não funcionar:

1. registre usuário, horário, solicitação e path exato do upload;
2. confirme que não existe metadado válido para o objeto ou que existe um tombstone elegível;
3. autentique-se como o próprio autor do upload e remova somente aquele path pela API privada do Storage;
4. se o autor perdeu acesso ou a elegibilidade não puder ser comprovada, interrompa a limpeza e encaminhe para revisão administrativa controlada.

A exceção existente permite ao autor acessar/remover somente seus próprios uploads órfãos ou tombstones elegíveis. Ela não autoriza fotos preservadas nem objetos de outro usuário. Não existe limpeza automática agendada e não deve ser executada uma varredura genérica em produção.

## Limitações conhecidas

- Câmera e galeria ainda exigem teste em aparelhos físicos Android e iPhone.
- Fotos já assinadas podem permanecer acessíveis por até 300 segundos; a revogação impede novas assinaturas.
- Uma interrupção entre upload e metadados pode deixar órfão temporário, tratado pelo procedimento restrito acima.
- O conversor HEIC ainda pode gerar aviso de chunk grande no build; isso não substitui o teste físico em iPhone.
- O Portal não acompanha todas as etapas internas de execução da OS.
- Landing page, assinatura/Stripe, notificações, WhatsApp, IA e realtime não fazem parte desta entrega.

## Cuidados na homologação

- Identifique tudo com o prefixo **HOMOLOGAÇÃO** e não use dados de clientes reais sem necessidade.
- Não consuma estoque real e não registre pagamentos fictícios.
- Preserve solicitações, decisões, fotos e auditoria.
- Ao terminar, cancele OS de teste somente pelos fluxos permitidos, com motivo rastreável, e suspenda os acessos criados apenas para o teste.
- Registre falhas no formato: **tela + ação + resultado esperado + resultado obtido + print**.
