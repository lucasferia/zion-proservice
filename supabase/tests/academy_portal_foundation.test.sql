begin;

create extension if not exists pgtap with schema extensions;
select plan(60);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  ('c1000000-0000-4000-8000-000000000001', 'portal-owner-a@test.local', '{"full_name":"Owner Portal A"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Portal A"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000002', 'portal-owner-b@test.local', '{"full_name":"Owner Portal B"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Portal B"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000003', 'portal-technician@test.local', '{"full_name":"Técnico Portal"}'::jsonb, '{"zion_account_type":"internal_member"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000004', 'portal-pending@test.local', '{"full_name":"Academia Pendente"}'::jsonb, '{}'::jsonb),
  ('c5000000-0000-4000-8000-000000000005', 'portal-active@test.local', '{"full_name":"Academia Ativa"}'::jsonb, '{}'::jsonb),
  ('c6000000-0000-4000-8000-000000000006', 'portal-suspended@test.local', '{"full_name":"Academia Suspensa"}'::jsonb, '{}'::jsonb),
  ('c7000000-0000-4000-8000-000000000007', 'portal-forged@test.local', '{"full_name":"Tentativa Forjada","organization_name":"Invasora","zion_account_type":"internal_owner","role":"owner"}'::jsonb, '{}'::jsonb),
  ('c8000000-0000-4000-8000-000000000008', 'portal-future-owner@test.local', '{"full_name":"Future Owner"}'::jsonb, '{}'::jsonb);

select set_config('test.portal_org_a', (select id::text from public.organizations where created_by = 'c1000000-0000-4000-8000-000000000001'), true);
select set_config('test.portal_org_b', (select id::text from public.organizations where created_by = 'c2000000-0000-4000-8000-000000000002'), true);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (current_setting('test.portal_org_a')::uuid, 'c3000000-0000-4000-8000-000000000003', 'technician', 'active', 'c1000000-0000-4000-8000-000000000001');

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  ('c1100000-0000-4000-8000-000000000001', current_setting('test.portal_org_a')::uuid, 'Academia A', 'c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001'),
  ('c1100000-0000-4000-8000-000000000002', current_setting('test.portal_org_a')::uuid, 'Academia A Dois', 'c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001'),
  ('c2100000-0000-4000-8000-000000000001', current_setting('test.portal_org_b')::uuid, 'Academia B', 'c2000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002');

insert into public.client_locations (id, organization_id, client_id, name, street, city, state, created_by, updated_by)
values
  ('c1110000-0000-4000-8000-000000000001', current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'Unidade Centro', 'Rua A', 'São Paulo', 'SP', 'c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001'),
  ('c1110000-0000-4000-8000-000000000002', current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000002', 'Unidade Outro Cliente', 'Rua B', 'São Paulo', 'SP', 'c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001'),
  ('c2110000-0000-4000-8000-000000000001', current_setting('test.portal_org_b')::uuid, 'c2100000-0000-4000-8000-000000000001', 'Unidade B', 'Rua C', 'Curitiba', 'PR', 'c2000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002');

select is((select count(*) from public.profiles where id in ('c4000000-0000-4000-8000-000000000004', 'c5000000-0000-4000-8000-000000000005', 'c6000000-0000-4000-8000-000000000006', 'c7000000-0000-4000-8000-000000000007')), 4::bigint, 'cadastro externo cria profile');
select is((select count(*) from public.organizations where created_by in ('c4000000-0000-4000-8000-000000000004', 'c5000000-0000-4000-8000-000000000005', 'c6000000-0000-4000-8000-000000000006', 'c7000000-0000-4000-8000-000000000007')), 0::bigint, 'cadastro externo não cria organização');
select is((select count(*) from public.organization_members where user_id in ('c4000000-0000-4000-8000-000000000004', 'c5000000-0000-4000-8000-000000000005', 'c6000000-0000-4000-8000-000000000006', 'c7000000-0000-4000-8000-000000000007')), 0::bigint, 'cadastro externo não cria membership');
select is((select count(*) from public.academy_portal_users where user_id in ('c4000000-0000-4000-8000-000000000004', 'c5000000-0000-4000-8000-000000000005', 'c6000000-0000-4000-8000-000000000006', 'c7000000-0000-4000-8000-000000000007') and status = 'pending' and organization_id is null), 4::bigint, 'cadastro externo inicia pendente e sem tenant');
select is((select count(*) from public.organization_members where user_id = 'c7000000-0000-4000-8000-000000000007'), 0::bigint, 'raw_user_meta_data forjado não cria privilégio');
select is((select count(*) from public.organization_members where user_id = 'c1000000-0000-4000-8000-000000000001' and role = 'owner' and status = 'active'), 1::bigint, 'owner interno confiável é preservado');
select is((select count(*) from public.organization_members where user_id = 'c3000000-0000-4000-8000-000000000003' and role = 'technician' and status = 'active'), 1::bigint, 'technician interno é preservado');
select ok((select relrowsecurity from pg_class where oid = 'public.academy_portal_users'::regclass), 'RLS ativa em academy_portal_users');
select ok((select relrowsecurity from pg_class where oid = 'public.academy_user_locations'::regclass), 'RLS ativa em academy_user_locations');
select ok((select relrowsecurity from pg_class where oid = 'public.academy_portal_access'::regclass), 'RLS ativa em academy_portal_access');
select ok(not has_table_privilege('anon', 'public.academy_portal_users', 'SELECT'), 'anon não lê usuários externos');
select ok(not has_table_privilege('authenticated', 'public.academy_portal_users', 'INSERT,UPDATE,DELETE'), 'authenticated não altera diretamente usuários externos');
select ok(not has_table_privilege('authenticated', 'public.academy_user_locations', 'INSERT,UPDATE,DELETE'), 'authenticated não altera diretamente vínculos');
select ok(not has_table_privilege('authenticated', 'public.academy_portal_access', 'INSERT,UPDATE,DELETE'), 'authenticated não altera diretamente controle comercial');
select ok(not has_function_privilege('authenticated', 'public.provision_internal_owner(uuid,text)', 'EXECUTE'), 'authenticated não executa provisionamento interno');
select ok(has_function_privilege('service_role', 'public.provision_internal_owner(uuid,text)', 'EXECUTE'), 'service_role pode executar provisionamento confiável');
select lives_ok($$ select public.provision_internal_owner('c8000000-0000-4000-8000-000000000008', 'Organização Administrativa') $$, 'procedimento administrativo provisiona futuro owner');
select is((select count(*) from public.academy_portal_users where user_id = 'c8000000-0000-4000-8000-000000000008'), 0::bigint, 'provisionamento remove a classificação externa pendente');
select is((select count(*) from public.organization_members where user_id = 'c8000000-0000-4000-8000-000000000008' and role = 'owner' and status = 'active'), 1::bigint, 'provisionamento cria owner interno ativo');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['internal_owner'::text], 'resolver identifica owner');
select lives_ok($$ select public.set_academy_portal_user_status(current_setting('test.portal_org_a')::uuid, 'c5000000-0000-4000-8000-000000000005', 'active', 'Cadastro aprovado') $$, 'owner ativa usuário externo');
select lives_ok($$ select public.set_academy_portal_user_status(current_setting('test.portal_org_a')::uuid, 'c6000000-0000-4000-8000-000000000006', 'suspended', 'Cadastro suspenso') $$, 'owner suspende usuário externo');
select lives_ok($$ select public.set_academy_portal_access(current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'pending', 'Aguardando contratação') $$, 'controle comercial inicia pendente');
select lives_ok($$ select public.grant_academy_location_access(current_setting('test.portal_org_a')::uuid, 'c5000000-0000-4000-8000-000000000005', 'c1100000-0000-4000-8000-000000000001', 'c1110000-0000-4000-8000-000000000001') $$, 'owner concede unidade válida');
select throws_like($$ select public.grant_academy_location_access(current_setting('test.portal_org_b')::uuid, 'c5000000-0000-4000-8000-000000000005', 'c2100000-0000-4000-8000-000000000001', 'c2110000-0000-4000-8000-000000000001') $$, '%Somente o owner%', 'owner não administra outro tenant');
select throws_like($$ select public.grant_academy_location_access(current_setting('test.portal_org_a')::uuid, 'c5000000-0000-4000-8000-000000000005', 'c1100000-0000-4000-8000-000000000002', 'c1110000-0000-4000-8000-000000000002') $$, '%mesmo cliente%', 'usuário não recebe unidades ativas de clientes diferentes');

select set_config('request.jwt.claim.sub', 'c3000000-0000-4000-8000-000000000003', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['internal_technician'::text], 'resolver identifica technician');
select throws_like($$ select public.set_academy_portal_access(current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'active', 'Tentativa técnica') $$, '%Somente o owner%', 'technician não administra controle comercial');
select is((select count(*) from public.academy_portal_users), 0::bigint, 'technician não lê usuários externos administráveis');

select set_config('request.jwt.claim.sub', 'c4000000-0000-4000-8000-000000000004', true);
select results_eq($$ select access_context || ':' || blocking_reason from public.resolve_access_context() $$, array['academy_pending:registration_pending'::text], 'pendente permanece sem acesso');

select set_config('request.jwt.claim.sub', 'c6000000-0000-4000-8000-000000000006', true);
select results_eq($$ select access_context || ':' || blocking_reason from public.resolve_access_context() $$, array['academy_suspended:account_suspended'::text], 'usuário suspenso permanece bloqueado');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.set_academy_portal_user_status(current_setting('test.portal_org_a')::uuid, 'c4000000-0000-4000-8000-000000000004', 'active', 'Cadastro aprovado sem unidade') $$, 'owner pode aprovar usuário ainda sem unidade');
select set_config('request.jwt.claim.sub', 'c4000000-0000-4000-8000-000000000004', true);
select results_eq($$ select access_context || ':' || blocking_reason from public.resolve_access_context() $$, array['academy_pending:no_active_location'::text], 'usuário ativo sem unidade continua sem acesso');

select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select results_eq($$ select access_context || ':' || blocking_reason from public.resolve_access_context() $$, array['academy_pending:commercial_access_pending'::text], 'usuário ativo com unidade e comercial pendente aguarda');
select throws_like($$ select public.set_academy_portal_access(current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'active', 'Tentativa externa') $$, '%Somente o owner%', 'academy_user não administra controle comercial');
select is((select count(*) from public.clients), 0::bigint, 'usuário externo recebe zero linhas de clientes internos');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.set_academy_portal_access(current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'active', 'Contrato ativo') $$, 'owner ativa acesso comercial');
select throws_like($$ select public.grant_academy_location_access(current_setting('test.portal_org_a')::uuid, 'c5000000-0000-4000-8000-000000000005', 'c2100000-0000-4000-8000-000000000001', 'c2110000-0000-4000-8000-000000000001') $$, '%Cliente ou unidade inválidos%', 'vínculo cross-tenant falha mesmo com organização forjada');
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_active'::text], 'usuário com todas as condições acessa o portal');
select ok(not public.has_academy_location_access(current_setting('test.portal_org_b')::uuid, 'c2100000-0000-4000-8000-000000000001', 'c2110000-0000-4000-8000-000000000001'), 'UUIDs forjados de outro tenant não concedem acesso');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.set_academy_portal_access(current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'trialing', 'Período de teste') $$, 'trialing é aceito');
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_active'::text], 'trialing concede acesso');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.set_academy_portal_access(current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'suspended', 'Suspensão comercial') $$, 'suspensão comercial é registrada');
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_suspended'::text], 'suspensão comercial bloqueia imediatamente');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.set_academy_portal_access(current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'past_due', 'Pagamento vencido') $$, 'past_due é registrado');
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_suspended'::text], 'past_due bloqueia imediatamente');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.set_academy_portal_access(current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'cancelled', 'Contrato encerrado') $$, 'cancelamento é registrado');
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_suspended'::text], 'cancelled bloqueia imediatamente');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.set_academy_portal_access(current_setting('test.portal_org_a')::uuid, 'c1100000-0000-4000-8000-000000000001', 'active', 'Contrato reativado') $$, 'acesso comercial pode ser reativado');
reset role;
select lives_ok($$ update public.client_locations set deleted_at = now(), deleted_by = 'c1000000-0000-4000-8000-000000000001' where id = 'c1110000-0000-4000-8000-000000000001' $$, 'fixture arquiva a unidade');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_pending'::text], 'unidade arquivada bloqueia acesso');
reset role;
select lives_ok($$ update public.client_locations set deleted_at = null, deleted_by = null where id = 'c1110000-0000-4000-8000-000000000001' $$, 'fixture restaura a unidade');
select lives_ok($$ update public.clients set deleted_at = now(), deleted_by = 'c1000000-0000-4000-8000-000000000001' where id = 'c1100000-0000-4000-8000-000000000001' $$, 'fixture arquiva o cliente');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_pending'::text], 'cliente arquivado bloqueia acesso');
reset role;
select lives_ok($$ update public.clients set deleted_at = null, deleted_by = null where id = 'c1100000-0000-4000-8000-000000000001' $$, 'cliente pode ser restaurado pelo tenant');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.revoke_academy_location_access(current_setting('test.portal_org_a')::uuid, 'c5000000-0000-4000-8000-000000000005', 'c1110000-0000-4000-8000-000000000001', 'Acesso removido') $$, 'owner revoga vínculo com motivo');
select set_config('request.jwt.claim.sub', 'c5000000-0000-4000-8000-000000000005', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_pending'::text], 'revogação perde efeito imediatamente');

reset role;
select throws_like($$ delete from public.academy_portal_users where user_id = 'c4000000-0000-4000-8000-000000000004' $$, '%não podem ser excluídos%', 'DELETE direto é bloqueado até para operação privilegiada');
select throws_like($$ insert into public.organization_members (organization_id, user_id, role, status) values (current_setting('test.portal_org_a')::uuid, 'c4000000-0000-4000-8000-000000000004', 'technician', 'active') $$, '%externo não pode receber membership%', 'usuário externo não pode virar membro interno');
select set_config('zion.academy_onboarding', 'allowed', true);
select throws_like($$ insert into public.academy_portal_users (user_id, status, created_by, updated_by) values ('c3000000-0000-4000-8000-000000000003', 'pending', 'c3000000-0000-4000-8000-000000000003', 'c3000000-0000-4000-8000-000000000003') $$, '%interno não pode ser classificado%', 'usuário interno não pode virar externo silenciosamente');

select * from finish();
rollback;
