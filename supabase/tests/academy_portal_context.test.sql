begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  ('e1000000-0000-4000-8000-000000000001', 'context-owner-a@test.local', '{"full_name":"Owner Contexto A"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Operação Zion A"}'::jsonb),
  ('e1000000-0000-4000-8000-000000000002', 'context-tech-a@test.local', '{"full_name":"Técnico Contexto A"}'::jsonb, '{"zion_account_type":"internal_member"}'::jsonb),
  ('e2000000-0000-4000-8000-000000000001', 'context-owner-b@test.local', '{"full_name":"Owner Contexto B"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Operação Zion B"}'::jsonb),
  ('e3000000-0000-4000-8000-000000000001', 'context-one@test.local', '{"full_name":"Ana Unidade"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000002', 'context-multi@test.local', '{"full_name":"Bruno Multiunidade"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000003', 'context-pending@test.local', '{"full_name":"Carla Pendente"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000004', 'context-suspended@test.local', '{"full_name":"Diego Suspenso"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000005', 'context-no-unit@test.local', '{"full_name":"Eva Sem Unidade"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000006', 'context-past-due@test.local', '{"full_name":"Fábio Atrasado"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000007', 'context-commercial-suspended@test.local', '{"full_name":"Gabi Comercial"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000008', 'context-cancelled@test.local', '{"full_name":"Hugo Cancelado"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000009', 'context-archived-client@test.local', '{"full_name":"Iara Arquivada"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000010', 'context-archived-location@test.local', '{"full_name":"João Unidade Arquivada"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000011', 'context-revoked@test.local', '{"full_name":"Katia Revogada"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000012', 'context-org-suspended@test.local', '{"full_name":"Leo Organização Suspensa"}'::jsonb, '{}'::jsonb),
  ('e3000000-0000-4000-8000-000000000013', 'context-trialing@test.local', '{"full_name":"Marta Trial"}'::jsonb, '{}'::jsonb);

select set_config('test.context_org_a', (select id::text from public.organizations where created_by = 'e1000000-0000-4000-8000-000000000001'), true);
select set_config('test.context_org_b', (select id::text from public.organizations where created_by = 'e2000000-0000-4000-8000-000000000001'), true);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (current_setting('test.context_org_a')::uuid, 'e1000000-0000-4000-8000-000000000002', 'technician', 'active', 'e1000000-0000-4000-8000-000000000001');

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  ('e1100000-0000-4000-8000-000000000001', current_setting('test.context_org_a')::uuid, 'Academia Contexto Ativa', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1100000-0000-4000-8000-000000000002', current_setting('test.context_org_a')::uuid, 'Academia Contexto Trial', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1100000-0000-4000-8000-000000000003', current_setting('test.context_org_a')::uuid, 'Academia Contexto Past Due', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1100000-0000-4000-8000-000000000004', current_setting('test.context_org_a')::uuid, 'Academia Contexto Suspensa', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1100000-0000-4000-8000-000000000005', current_setting('test.context_org_a')::uuid, 'Academia Contexto Cancelada', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1100000-0000-4000-8000-000000000006', current_setting('test.context_org_a')::uuid, 'Academia Contexto Arquivada', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e2100000-0000-4000-8000-000000000001', current_setting('test.context_org_b')::uuid, 'Academia Outro Tenant', 'e2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001');

insert into public.client_locations (id, organization_id, client_id, name, street, city, state, created_by, updated_by)
values
  ('e1110000-0000-4000-8000-000000000001', current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000001', 'Unidade Centro', 'Rua A', 'São Paulo', 'SP', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1110000-0000-4000-8000-000000000002', current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000001', 'Unidade Sul', 'Rua B', 'Campinas', 'SP', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1110000-0000-4000-8000-000000000003', current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000001', 'Unidade Arquivada', 'Rua C', 'Santos', 'SP', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1120000-0000-4000-8000-000000000001', current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000002', 'Unidade Trial', 'Rua D', 'Niterói', 'RJ', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1130000-0000-4000-8000-000000000001', current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000003', 'Unidade Past Due', 'Rua E', 'Recife', 'PE', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1140000-0000-4000-8000-000000000001', current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000004', 'Unidade Comercial Suspensa', 'Rua F', 'Salvador', 'BA', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1150000-0000-4000-8000-000000000001', current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000005', 'Unidade Cancelada', 'Rua G', 'Goiânia', 'GO', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e1160000-0000-4000-8000-000000000001', current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000006', 'Unidade Cliente Arquivado', 'Rua H', 'Belém', 'PA', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('e2110000-0000-4000-8000-000000000001', current_setting('test.context_org_b')::uuid, 'e2100000-0000-4000-8000-000000000001', 'Unidade Outro Tenant', 'Rua I', 'Curitiba', 'PR', 'e2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001');

select set_config('zion.academy_administration', 'allowed', true);

update public.academy_portal_users
set organization_id = current_setting('test.context_org_a')::uuid,
    status = case when user_id = 'e3000000-0000-4000-8000-000000000004' then 'suspended' else 'active' end,
    status_changed_at = now(), status_changed_by = 'e1000000-0000-4000-8000-000000000001',
    status_change_reason = 'Configuração local da Etapa 12', updated_at = now(), updated_by = 'e1000000-0000-4000-8000-000000000001'
where user_id between 'e3000000-0000-4000-8000-000000000001' and 'e3000000-0000-4000-8000-000000000011'
  and user_id <> 'e3000000-0000-4000-8000-000000000003';

update public.academy_portal_users
set organization_id = current_setting('test.context_org_b')::uuid, status = 'active',
    status_changed_at = now(), status_changed_by = 'e2000000-0000-4000-8000-000000000001',
    status_change_reason = 'Configuração local da Etapa 12', updated_at = now(), updated_by = 'e2000000-0000-4000-8000-000000000001'
where user_id = 'e3000000-0000-4000-8000-000000000012';

update public.academy_portal_users
set organization_id = current_setting('test.context_org_a')::uuid, status = 'active',
    status_changed_at = now(), status_changed_by = 'e1000000-0000-4000-8000-000000000001',
    status_change_reason = 'Configuração local da Etapa 12', updated_at = now(), updated_by = 'e1000000-0000-4000-8000-000000000001'
where user_id = 'e3000000-0000-4000-8000-000000000013';

insert into public.academy_portal_access (
  organization_id, client_id, status, status_changed_by, status_change_reason, created_by, updated_by
)
values
  (current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001', 'Acesso ativo local', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000002', 'trialing', 'e1000000-0000-4000-8000-000000000001', 'Período de teste local', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000003', 'past_due', 'e1000000-0000-4000-8000-000000000001', 'Estado bloqueado local', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000004', 'suspended', 'e1000000-0000-4000-8000-000000000001', 'Estado bloqueado local', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000005', 'cancelled', 'e1000000-0000-4000-8000-000000000001', 'Estado bloqueado local', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e1100000-0000-4000-8000-000000000006', 'active', 'e1000000-0000-4000-8000-000000000001', 'Acesso ativo local', 'e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_b')::uuid, 'e2100000-0000-4000-8000-000000000001', 'active', 'e2000000-0000-4000-8000-000000000001', 'Acesso ativo local', 'e2000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001');

insert into public.academy_user_locations (organization_id, user_id, client_id, client_location_id, status, granted_by)
values
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000001', 'e1100000-0000-4000-8000-000000000001', 'e1110000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000001', 'e1100000-0000-4000-8000-000000000001', 'e1110000-0000-4000-8000-000000000003', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000002', 'e1100000-0000-4000-8000-000000000001', 'e1110000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000002', 'e1100000-0000-4000-8000-000000000001', 'e1110000-0000-4000-8000-000000000002', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000004', 'e1100000-0000-4000-8000-000000000001', 'e1110000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000006', 'e1100000-0000-4000-8000-000000000003', 'e1130000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000007', 'e1100000-0000-4000-8000-000000000004', 'e1140000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000008', 'e1100000-0000-4000-8000-000000000005', 'e1150000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000009', 'e1100000-0000-4000-8000-000000000006', 'e1160000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000010', 'e1100000-0000-4000-8000-000000000001', 'e1110000-0000-4000-8000-000000000003', 'active', 'e1000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_b')::uuid, 'e3000000-0000-4000-8000-000000000012', 'e2100000-0000-4000-8000-000000000001', 'e2110000-0000-4000-8000-000000000001', 'active', 'e2000000-0000-4000-8000-000000000001'),
  (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000013', 'e1100000-0000-4000-8000-000000000002', 'e1120000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001');

insert into public.academy_user_locations (
  organization_id, user_id, client_id, client_location_id, status, granted_by,
  revoked_at, revoked_by, revocation_reason
)
values (
  current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000011',
  'e1100000-0000-4000-8000-000000000001', 'e1110000-0000-4000-8000-000000000002',
  'revoked', 'e1000000-0000-4000-8000-000000000001', now(),
  'e1000000-0000-4000-8000-000000000001', 'Revogação local da Etapa 12'
);

update public.clients set deleted_at = now(), deleted_by = 'e1000000-0000-4000-8000-000000000001' where id = 'e1100000-0000-4000-8000-000000000006';
update public.client_locations set deleted_at = now(), deleted_by = 'e1000000-0000-4000-8000-000000000001' where id = 'e1110000-0000-4000-8000-000000000003';
update public.organizations set status = 'suspended' where id = current_setting('test.context_org_b')::uuid;
select set_config('zion.academy_administration', '', true);

select ok(has_function_privilege('authenticated', 'public.portal_get_context()', 'EXECUTE'), 'authenticated pode chamar a RPC com autorização interna');
select ok(not has_function_privilege('anon', 'public.portal_get_context()', 'EXECUTE'), 'anon não executa a RPC');
select ok((select prosecdef from pg_proc where oid = 'public.portal_get_context()'::regprocedure), 'RPC utiliza security definer');
select ok((
  select exists (
    select 1 from unnest(coalesce(proconfig, array[]::text[])) as setting
    where setting like 'search_path=%' and setting not like '%public%'
  )
  from pg_proc where oid = 'public.portal_get_context()'::regprocedure
), 'RPC possui search_path vazio e seguro');
select is(coalesce(to_regprocedure('public.portal_get_context(uuid)')::text, ''), '', 'RPC não aceita UUID fornecido pelo navegador');

select ok(has_function_privilege('authenticated', 'public.resolve_access_context()', 'EXECUTE'), 'authenticated pode resolver somente o proprio acesso');
select ok(not has_function_privilege('anon', 'public.resolve_access_context()', 'EXECUTE'), 'anon nao executa o resolvedor');
select ok((
  select exists (
    select 1 from unnest(coalesce(proconfig, array[]::text[])) as setting
    where setting like 'search_path=%' and setting not like '%public%'
  )
  from pg_proc where oid = 'public.resolve_access_context()'::regprocedure
), 'resolvedor possui search_path vazio e seguro');

set local role authenticated;

select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'owner interno não consome contexto externo');
select set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000002', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'technician interno não consome contexto externo');

select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000003', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'pending não obtém contexto ativo');
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000004', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'suspended não obtém contexto ativo');
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000005', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'usuário sem unidade recebe estado seguro');
select results_eq(
  $$ select access_context || ':' || blocking_reason from public.resolve_access_context() $$,
  array['academy_pending:no_active_location'::text],
  'usuario vinculado sem unidade recebe estado de acesso incompleto'
);
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000006', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'past_due bloqueia contexto');
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000007', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'commercial suspended bloqueia contexto');
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000008', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'cancelled bloqueia contexto');
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000009', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'cliente arquivado bloqueia contexto');
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000010', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'unidade arquivada não concede contexto');
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000011', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'vínculo revogado não concede contexto');
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000012', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'organização suspensa bloqueia contexto');

select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000001', true);
select is((public.portal_get_context()->>'unitCount')::integer, 1, 'uma unidade válida é retornada corretamente');
select is(public.portal_get_context()->'units'->0->>'name', 'Unidade Centro', 'unidade arquivada é omitida');
select is(public.portal_get_context()->'access'->>'commercialStatus', 'active', 'active permite acesso');
select is(public.portal_get_context()->'academy'->>'name', 'Academia Contexto Ativa', 'usuário visualiza somente sua academia');
select ok(position('Academia Outro Tenant' in public.portal_get_context()::text) = 0, 'contexto não contém academia de outro tenant');
select ok(position('Unidade Outro Tenant' in public.portal_get_context()::text) = 0, 'contexto não contém unidade de outro tenant');
select is((select count(*) from public.clients), 0::bigint, 'academy_user continua sem leitura direta de clients');
select is((select count(*) from public.client_locations), 0::bigint, 'academy_user continua sem leitura direta de client_locations');

select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000002', true);
select is((public.portal_get_context()->>'unitCount')::integer, 2, 'múltiplas unidades do mesmo cliente são retornadas');
select results_eq(
  $$ select jsonb_array_elements(public.portal_get_context()->'units')->>'name' order by 1 $$,
  $$ values ('Unidade Centro'::text), ('Unidade Sul'::text) $$,
  'somente unidades ativas vinculadas são listadas'
);

select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000002', true);
select is(public.portal_get_context()->'access'->>'commercialStatus', 'active', 'usuário multiunidade permanece ativo');

reset role;
select set_config('zion.academy_administration', 'allowed', true);
insert into public.academy_user_locations (organization_id, user_id, client_id, client_location_id, status, granted_by)
values (current_setting('test.context_org_a')::uuid, 'e3000000-0000-4000-8000-000000000002', 'e1100000-0000-4000-8000-000000000002', 'e1120000-0000-4000-8000-000000000001', 'active', 'e1000000-0000-4000-8000-000000000001');
select set_config('zion.academy_administration', '', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000002', true);
select throws_like($$ select public.portal_get_context() $$, '%Contexto do Portal indisponível%', 'vínculos de clientes diferentes são negados por padrão');

reset role;
select set_config('zion.academy_administration', 'allowed', true);
update public.academy_user_locations
set status = 'revoked', revoked_at = now(), revoked_by = 'e1000000-0000-4000-8000-000000000001',
    revocation_reason = 'Ajuste local para cenário trialing', updated_at = now()
where user_id = 'e3000000-0000-4000-8000-000000000002' and client_location_id = 'e1120000-0000-4000-8000-000000000001';
select set_config('zion.academy_administration', '', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e3000000-0000-4000-8000-000000000013', true);
select is(public.portal_get_context()->'access'->>'commercialStatus', 'trialing', 'trialing permite acesso');
select is(public.portal_get_context()->'access'->>'isTrialing', 'true', 'contexto identifica período de teste sem inventar prazo');
select results_eq(
  $$ select jsonb_object_keys(public.portal_get_context()) order by 1 $$,
  $$ values ('academy'::text), ('access'::text), ('organization'::text), ('unitCount'::text), ('units'::text), ('user'::text) $$,
  'retorno contém somente grupos públicos previstos'
);
select results_eq(
  $$ select jsonb_object_keys(public.portal_get_context()->'units'->0) order by 1 $$,
  $$ values ('city'::text), ('id'::text), ('name'::text), ('state'::text) $$,
  'unidade contém somente identificação mínima'
);
select ok(position('document' in public.portal_get_context()::text) = 0, 'retorno não contém documento');
select ok(position('payment' in public.portal_get_context()::text) = 0, 'retorno não contém dados financeiros');
select ok(position('membership' in public.portal_get_context()::text) = 0, 'retorno não contém membership');
select ok(position('reason' in public.portal_get_context()::text) = 0, 'retorno não contém motivos internos');

select * from finish();
rollback;
