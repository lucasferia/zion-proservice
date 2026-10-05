# Roteiro de homologação — Zion e Portal da Academia

Este roteiro deve ser executado em conjunto por Gabriel e Lucas, usando uma academia, unidades, equipamentos e solicitações com nomes iniciados por **HOMOLOGAÇÃO**. Não use estoque real, não registre pagamentos fictícios e não exclua históricos auditáveis em produção.

> A homologação em produção deve começar somente depois da publicação das correções locais da Etapa 16. Até essa publicação, os passos que envolvem diálogos de decisão, confirmação de solicitação e textos de estado não representam a versão revisada.

Para registrar um problema, informe: **tela + ação + resultado esperado + resultado obtido + print**.

| passo | quem executa | ação | resultado esperado | aprovado/reprovado | observação |
|---:|---|---|---|---|---|
| 1 | Gabriel | Acessar `/portal/cadastro`, criar uma conta externa de homologação e abrir o link de confirmação recebido por e-mail. | A confirmação termina no login; a conta existe, mas ainda aguarda liberação. |  | E-mail de teste: ____ |
| 2 | Gabriel | Entrar com a conta recém-confirmada antes de Lucas liberá-la. | O sistema mostra o estado de acesso pendente e não exibe dados internos ou de academias. |  |  |
| 3 | Lucas | Em `/app/portal-academias`, localizar a conta, vinculá-la à academia e às unidades de homologação e ativar o acesso comercial. | O usuário passa a ter acesso somente à academia e às unidades escolhidas. |  | Academia/unidades: ____ |
| 4 | Gabriel | Fazer login no celular e entrar no Portal. | O Portal abre sem overflow, identifica a academia e deixa a unidade ativa evidente. |  | Modelo: ____ · Sistema/versão: ____ · Navegador/versão: ____ |
| 5 | Gabriel | Na unidade ativa, cadastrar um equipamento identificado como HOMOLOGAÇÃO. | O equipamento aparece na lista e continua visível após atualizar a página. |  | Equipamento: ____ |
| 6 | Gabriel | Criar uma solicitação e anexar uma foto escolhida da galeria. | A foto mostra prévia, é enviada ao Storage privado e aparece na solicitação. | **Pendente até teste físico** | Modelo: ____ · Sistema/versão: ____ · Navegador/versão: ____ |
| 7 | Gabriel | Criar outra solicitação e tirar uma foto pela câmera. | A câmera abre, a foto mostra prévia, é enviada e aparece na solicitação. | **Pendente até teste físico** | Modelo: ____ · Sistema/versão: ____ · Navegador/versão: ____ |
| 8 | Gabriel e Lucas | Conferir orientação, enquadramento, nitidez e ordem das fotos nos dois lados. | As fotos não aparecem giradas ou cortadas de forma indevida e são suficientes para a análise. | **Pendente até teste físico** | Galeria: ____ · Câmera: ____ |
| 9 | Lucas | Abrir a primeira solicitação em `/app/solicitacoes`, definir prioridade técnica, resposta pública e nota interna e aprovar. | A solicitação fica aprovada; nenhuma OS é criada; a prioridade técnica permanece separada da criticidade informada. |  | Depende da publicação das correções da Etapa 16. |
| 10 | Lucas | Na solicitação aprovada, escolher **Preparar conversão**, revisar os dados e confirmar. | Exatamente uma OS em rascunho é criada e tentativas repetidas retornam a mesma OS. |  |  |
| 11 | Lucas | Abrir a OS pelo link da solicitação e voltar para a solicitação pelo link de origem. | Cliente, unidade, equipamento e origem estão corretos; os dois sentidos da navegação funcionam. |  | Número da OS: ____ |
| 12 | Gabriel | Consultar a solicitação convertida no Portal. | O número da OS e a resposta pública aparecem; nota interna e dados financeiros não aparecem; a tela esclarece que conversão não significa serviço concluído. |  | Depende da publicação das correções da Etapa 16. |
| 13 | Lucas e Gabriel | Lucas rejeita outra solicitação com motivo público; Gabriel consulta o resultado no Portal. | O estado rejeitado e o motivo público aparecem; nenhuma OS é criada. |  |  |
| 14 | Gabriel | Criar outra solicitação e cancelá-la enquanto ainda está pendente, informando o motivo. | O estado fica cancelado, o histórico é preservado e a solicitação não pode ser convertida. |  |  |
| 15 | Gabriel | Quando houver duas unidades autorizadas, alternar a unidade no Portal. | O cabeçalho muda para a nova unidade e equipamentos/ações permanecem limitados ao contexto escolhido. |  | Unidade inicial: ____ · final: ____ |
| 16 | Gabriel e Lucas | Sair das contas, entrar novamente e conferir os estados criados. | Logout e novo login funcionam; equipamentos, solicitações, decisões e vínculo com a OS continuam persistidos. |  |  |

## Encerramento seguro

- Preserve solicitações, decisões e eventos de auditoria da homologação.
- Se uma OS de teste precisar ser neutralizada, use o fluxo normal de cancelamento e registre um motivo claro.
- Lucas deve suspender os acessos externos usados apenas para homologação quando os testes terminarem.
- Não crie pagamentos fictícios nem consuma estoque real para completar este roteiro.
- Gabriel e Lucas registram o aceite ou a reprovação; a validação técnica não substitui essa decisão.
