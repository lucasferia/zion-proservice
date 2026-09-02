# ZION ProService — design, segurança e qualidade

## Design system

- Dark mode padrão: fundo `#080B10`, superfícies `#0F141C` e `#171E29`, bordas `#2A3646`.
- Azul de ação: `#0078D4`; sucesso `#22C55E`; atenção `#F59E0B`; urgência `#EF4444`.
- Use Manrope para UI e Barlow Condensed apenas para títulos e métricas de destaque.
- Garanta contraste adequado, foco visível, labels em formulários e experiência responsiva.
- Priorize clareza operacional. Não use elementos decorativos que reduzam a legibilidade no campo.

## Dados e segurança

- Não exponha chaves administrativas ou secrets no frontend.
- Aplique autorização e RLS a qualquer dado de clientes, serviços, pagamentos, estoque e fotos.
- Uploads de fotos devem usar paths previsíveis, validação de tipo/tamanho e acesso autorizado.
- Valide datas de retorno, quantidades de estoque e campos financeiros no cliente e no servidor/banco quando possível.

## Qualidade

- Inclua estados de carregamento, vazio, erro e sucesso em telas que dependem de dados.
- Execute os checks já configurados no projeto após mudanças relevantes.
