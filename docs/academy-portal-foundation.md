# Fundação do Portal da Academia

## Modelo de acesso

O Portal separa rigorosamente usuários internos e externos:

- `organization_members` continua exclusivo de `owner` e `technician`.
- `academy_portal_users` classifica contas externas como `pending`, `active` ou `suspended`.
- `academy_user_locations` registra vínculos N:N com unidades, limitados a um único cliente ativo por usuário.
- `academy_portal_access` registra a situação comercial do cliente. Somente `trialing` e `active` liberam o portal.

O acesso externo exige simultaneamente conta externa ativa, organização ativa, vínculo ativo, cliente e unidade não arquivados e liberação comercial válida. A RPC `resolve_access_context()` usa apenas `auth.uid()` e resolve um dos ambientes permitidos antes de qualquer shell ser renderizado.

Cadastros públicos não aceitam tenant, cliente, unidade, papel ou status. O trigger cria somente `profiles` e `academy_portal_users` pendente e sem organização. Metadados enviados pelo usuário não são usados para elevação de privilégio.

## Criação administrativa de contas internas

Um novo owner deve ser criado somente por backend administrativo confiável:

1. Crie e confirme o usuário pela API Admin do Supabase. O trigger o manterá externo, pendente e sem tenant por segurança.
2. Com `service_role` apenas no backend seguro, chame `provision_internal_owner(user_id, organization_name)`. A função só aceita cadastro pendente ainda não vinculado, remove a classificação externa e cria a organização e o membership owner.

Em inserções SQL administrativas controladas, o trigger também reconhece `raw_app_meta_data.zion_account_type=internal_owner` e `zion_organization_name`. Não dependa desse caminho no Admin API: o GoTrue pode persistir o metadata após o evento de inserção. Nunca envie esses valores em `user_metadata`, no frontend ou no signup público. A chave `service_role` não pode ser usada no navegador nem persistida no projeto.

## Configuração manual do Supabase Auth

Antes de publicar o cadastro externo no ambiente remoto:

1. Em **Authentication → Providers → Email**, habilite a confirmação obrigatória de e-mail.
2. Em **Authentication → URL Configuration**, configure a Site URL de produção.
3. Adicione `https://SEU_DOMINIO/auth/confirm` às Redirect URLs.
4. Para desenvolvimento, mantenha `http://127.0.0.1:5173/auth/confirm` e `http://localhost:5173/auth/confirm`.
5. Confira no template de confirmação que o link usa a URL de confirmação gerada pelo Supabase.

O arquivo `supabase/config.toml` já habilita confirmação e callbacks locais. A configuração remota não é alterada por esse arquivo.

## Escopo futuro, ainda não implementado

- `equipment_location_assignments`: histórico de alocação de equipamentos por unidade, sem substituir o catálogo geral atual.
- `review_status`: estado separado para revisão de equipamentos cadastrados pela academia.
- `maintenance_requests`: solicitações externas separadas das OS internas.
- RPCs específicas do portal: leitura mínima e escrita controlada por unidade, sempre usando as funções de autorização externas.
- Assinaturas e Stripe: tabela comercial e integração serão desenhadas em etapa própria; esta fundação não contém IDs, checkout, webhook ou campos Stripe.
- Visibilidade das OS: uma política futura deverá expor somente campos autorizados de OS ligadas às unidades acessíveis, sem conceder SELECT direto às tabelas internas.
- Exclusão de OS: migrations históricas permitem exclusão definitiva em cenários aprovados anteriormente. Isso diverge da orientação original de histórico imutável e deve ser revisto antes de qualquer acesso externo a OS.

Nesta etapa, usuários externos não recebem privilégios sobre equipamentos, manutenções, estoque, pagamentos, retornos, agenda, dashboard, fornecedores ou fotos.
