begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  ('f1000000-0000-4000-8000-000000000001', 'equipment-owner-a@test.local', '{"full_name":"Owner Equipamento A"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Operação Equipamento A"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000002', 'equipment-tech-a@test.local', '{"full_name":"Técnico Equipamento A"}'::jsonb, '{"zion_account_type":"internal_member"}'::jsonb),
  ('f2000000-0000-4000-8000-000000000001', 'equipment-owner-b@test.local', '{"full_name":"Owner Equipamento B"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Operação Equipamento B"}'::jsonb),
  ('f3000000-0000-4000-8000-000000000001', 'equipment-one@test.local', '{"full_name":"Academia Uma Unidade"}'::jsonb, '{}'::jsonb),
  ('f3000000-0000-4000-8000-000000000002', 'equipment-multi@test.local', '{"full_name":"Academia Multiunidade"}'::jsonb, '{}'::jsonb),
  ('f3000000-0000-4000-8000-000000000003', 'equipment-pending@test.local', '{"full_name":"Academia Pendente"}'::jsonb, '{}'::jsonb),
  ('f3000000-0000-4000-8000-000000000004', 'equipment-suspended@test.local', '{"full_name":"Academia Suspensa"}'::jsonb, '{}'::jsonb),
  ('f3000000-0000-4000-8000-000000000005', 'equipment-pastdue@test.local', '{"full_name":"Academia Atrasada"}'::jsonb, '{}'::jsonb),
  ('f3000000-0000-4000-8000-000000000006', 'equipment-no-unit@test.local', '{"full_name":"Academia Sem Unidade"}'::jsonb, '{}'::jsonb);

select set_config('test.equipment_org_a', (select id::text from public.organizations where created_by = 'f1000000-0000-4000-8000-000000000001'), true);
select set_config('test.equipment_org_b', (select id::text from public.organizations where created_by = 'f2000000-0000-4000-8000-000000000001'), true);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (current_setting('test.equipment_org_a')::uuid, 'f1000000-0000-4000-8000-000000000002', 'technician', 'active', 'f1000000-0000-4000-8000-000000000001');

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  ('f1100000-0000-4000-8000-000000000001', current_setting('test.equipment_org_a')::uuid, 'Academia Equipamento A', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001'),
  ('f2100000-0000-4000-8000-000000000001', current_setting('test.equipment_org_b')::uuid, 'Academia Equipamento B', 'f2000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001');

insert into public.client_locations (id, organization_id, client_id, name, street, city, state, created_by, updated_by)
values
  ('f1110000-0000-4000-8000-000000000001', current_setting('test.equipment_org_a')::uuid, 'f1100000-0000-4000-8000-000000000001', 'Unidade Alfa', 'Rua A', 'São Paulo', 'SP', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001'),
  ('f1110000-0000-4000-8000-000000000002', current_setting('test.equipment_org_a')::uuid, 'f1100000-0000-4000-8000-000000000001', 'Unidade Beta', 'Rua B', 'Campinas', 'SP', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001'),
  ('f2110000-0000-4000-8000-000000000001', current_setting('test.equipment_org_b')::uuid, 'f2100000-0000-4000-8000-000000000001', 'Unidade Outro Tenant', 'Rua C', 'Curitiba', 'PR', 'f2000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001');

select set_config('zion.academy_administration', 'allowed', true);
update public.academy_portal_users
set organization_id = current_setting('test.equipment_org_a')::uuid,
    status = case
      when user_id = 'f3000000-0000-4000-8000-000000000003' then 'pending'
      when user_id = 'f3000000-0000-4000-8000-000000000004' then 'suspended'
      else 'active'
    end,
    status_changed_at = now(), status_changed_by = 'f1000000-0000-4000-8000-000000000001',
    status_change_reason = 'Fixture Etapa 13', updated_at = now(), updated_by = 'f1000000-0000-4000-8000-000000000001'
where user_id between 'f3000000-0000-4000-8000-000000000001' and 'f3000000-0000-4000-8000-000000000006';

insert into public.academy_portal_access (organization_id, client_id, status, status_changed_by, status_change_reason, created_by, updated_by)
values
  (current_setting('test.equipment_org_a')::uuid, 'f1100000-0000-4000-8000-000000000001', 'active', 'f1000000-0000-4000-8000-000000000001', 'Fixture ativa', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001');

insert into public.academy_user_locations (organization_id, user_id, client_id, client_location_id, status, granted_by)
values
  (current_setting('test.equipment_org_a')::uuid, 'f3000000-0000-4000-8000-000000000001', 'f1100000-0000-4000-8000-000000000001', 'f1110000-0000-4000-8000-000000000001', 'active', 'f1000000-0000-4000-8000-000000000001'),
  (current_setting('test.equipment_org_a')::uuid, 'f3000000-0000-4000-8000-000000000002', 'f1100000-0000-4000-8000-000000000001', 'f1110000-0000-4000-8000-000000000001', 'active', 'f1000000-0000-4000-8000-000000000001'),
  (current_setting('test.equipment_org_a')::uuid, 'f3000000-0000-4000-8000-000000000002', 'f1100000-0000-4000-8000-000000000001', 'f1110000-0000-4000-8000-000000000002', 'active', 'f1000000-0000-4000-8000-000000000001'),
  (current_setting('test.equipment_org_a')::uuid, 'f3000000-0000-4000-8000-000000000003', 'f1100000-0000-4000-8000-000000000001', 'f1110000-0000-4000-8000-000000000001', 'active', 'f1000000-0000-4000-8000-000000000001'),
  (current_setting('test.equipment_org_a')::uuid, 'f3000000-0000-4000-8000-000000000004', 'f1100000-0000-4000-8000-000000000001', 'f1110000-0000-4000-8000-000000000001', 'active', 'f1000000-0000-4000-8000-000000000001'),
  (current_setting('test.equipment_org_a')::uuid, 'f3000000-0000-4000-8000-000000000005', 'f1100000-0000-4000-8000-000000000001', 'f1110000-0000-4000-8000-000000000001', 'active', 'f1000000-0000-4000-8000-000000000001');
select set_config('zion.academy_administration', '', true);

insert into public.equipment (id, organization_id, client_id, client_location_id, name, category, brand, model, serial_number, asset_tag, status, notes, created_by, updated_by)
values
  ('f1200000-0000-4000-8000-000000000001', current_setting('test.equipment_org_a')::uuid, 'f1100000-0000-4000-8000-000000000001', 'f1110000-0000-4000-8000-000000000001', 'Esteira Alfa', 'Cardio', 'Zion', 'Run A', 'SER-A', 'PAT-A', 'operational', 'Nota interna não exposta', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000002', current_setting('test.equipment_org_a')::uuid, 'f1100000-0000-4000-8000-000000000001', 'f1110000-0000-4000-8000-000000000002', 'Bike Beta', 'Bike', 'Zion', 'Ride B', 'SER-B', 'PAT-B', 'attention', null, 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001'),
  ('f1200000-0000-4000-8000-000000000003', current_setting('test.equipment_org_a')::uuid, 'f1100000-0000-4000-8000-000000000001', 'f1110000-0000-4000-8000-000000000001', 'Arquivado Alfa', 'Cardio', null, null, null, null, 'inactive', null, 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001'),
  ('f2200000-0000-4000-8000-000000000001', current_setting('test.equipment_org_b')::uuid, 'f2100000-0000-4000-8000-000000000001', 'f2110000-0000-4000-8000-000000000001', 'Equipamento Outro Tenant', 'Força', null, null, null, null, 'operational', null, 'f2000000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001');
update public.equipment set deleted_at = now(), deleted_by = 'f1000000-0000-4000-8000-000000000001' where id = 'f1200000-0000-4000-8000-000000000003';

select ok(has_function_privilege('authenticated', 'public.portal_list_equipment(uuid,text,integer,integer)', 'EXECUTE'), 'authenticated executa listagem segura');
select ok(not has_function_privilege('anon', 'public.portal_list_equipment(uuid,text,integer,integer)', 'EXECUTE'), 'anon não executa listagem');
select ok(not has_function_privilege('authenticated', 'public.current_academy_equipment_scope(uuid)', 'EXECUTE'), 'helper de autorização não é superfície pública');
select ok((select prosecdef from pg_proc where oid = 'public.portal_create_equipment(uuid,text,text,text,text,text,text,text)'::regprocedure), 'cadastro usa security definer');
select ok((select prosecdef from pg_proc where oid = 'public.portal_get_equipment(uuid,uuid)'::regprocedure), 'detalhe usa security definer');
select ok((
  select bool_and(setting like 'search_path=%' and setting not like '%public%')
  from pg_proc, unnest(proconfig) setting
  where oid in (
    'public.portal_list_equipment(uuid,text,integer,integer)'::regprocedure,
    'public.portal_get_equipment(uuid,uuid)'::regprocedure,
    'public.portal_create_equipment(uuid,text,text,text,text,text,text,text)'::regprocedure
  )
), 'RPCs possuem search_path vazio e seguro');
select is(coalesce(to_regprocedure('public.portal_list_equipment(uuid,uuid,text,integer,integer)')::text, ''), '', 'listagem não aceita organização ou usuário como autoridade');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);
select results_eq(
  $$ select name from public.portal_list_equipment('f1110000-0000-4000-8000-000000000001', null, 1, 12) $$,
  array['Esteira Alfa'::text],
  'usuário de uma unidade lista somente equipamento ativo autorizado'
);
select is((select notes from public.portal_get_equipment('f1110000-0000-4000-8000-000000000001', 'f1200000-0000-4000-8000-000000000001')), null::text, 'nota de cadastro interno não é exposta');
select throws_like(
  $$ select * from public.portal_list_equipment('f1110000-0000-4000-8000-000000000002', null, 1, 12) $$,
  '%Acesso aos equipamentos do Portal indisponível%',
  'UUID de unidade não autorizada é rejeitado'
);
select is(
  (select count(*) from public.portal_get_equipment('f1110000-0000-4000-8000-000000000001', 'f2200000-0000-4000-8000-000000000001')),
  0::bigint,
  'UUID de equipamento cross-tenant retorna vazio sem HTTP 500'
);
select set_config('test.portal_equipment_id', public.portal_create_equipment(
  'f1110000-0000-4000-8000-000000000001', 'Remo Portal', 'Cardio', 'Zion', 'R1', 'SER-P', 'PAT-P', 'Observação pública'
)::text, true);
select is((select count(*) from public.equipment), 0::bigint, 'academy_user continua sem leitura direta da tabela interna');
select lives_ok($$ update public.equipment set name = 'Fraude' where id = current_setting('test.portal_equipment_id')::uuid $$, 'update direto não produz erro falso');
select throws_like($$ delete from public.equipment where id = current_setting('test.portal_equipment_id')::uuid $$, '%permission denied%', 'delete direto é explicitamente negado');

reset role;
select is((select organization_id from public.equipment where id = current_setting('test.portal_equipment_id')::uuid), current_setting('test.equipment_org_a')::uuid, 'organização é derivada pelo backend');
select is((select client_id from public.equipment where id = current_setting('test.portal_equipment_id')::uuid), 'f1100000-0000-4000-8000-000000000001'::uuid, 'academia é derivada pelo backend');
select is((select client_location_id from public.equipment where id = current_setting('test.portal_equipment_id')::uuid), 'f1110000-0000-4000-8000-000000000001'::uuid, 'unidade é validada pelo backend');
select is((select created_by from public.equipment where id = current_setting('test.portal_equipment_id')::uuid), 'f3000000-0000-4000-8000-000000000001'::uuid, 'autor é derivado de auth.uid()');
select is((select created_source from public.equipment where id = current_setting('test.portal_equipment_id')::uuid), 'academy_portal', 'origem é controlada pelo backend');
select is((select name from public.equipment where id = current_setting('test.portal_equipment_id')::uuid), 'Remo Portal', 'update externo não alterou o registro');
select is((select count(*) from public.equipment where id = current_setting('test.portal_equipment_id')::uuid), 1::bigint, 'delete externo não removeu o registro');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000002', true);
select results_eq($$ select name from public.portal_list_equipment('f1110000-0000-4000-8000-000000000002', null, 1, 12) $$, array['Bike Beta'::text], 'multiunidade respeita a unidade selecionada');
select results_eq($$ select name from public.portal_list_equipment('f1110000-0000-4000-8000-000000000001', 'SER-P', 1, 12) $$, array['Remo Portal'::text], 'busca usa somente campos públicos previstos');

select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000003', true);
select throws_like($$ select * from public.portal_list_equipment('f1110000-0000-4000-8000-000000000001', null, 1, 12) $$, '%indisponível%', 'pending não lista equipamentos');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000004', true);
select throws_like($$ select public.portal_create_equipment('f1110000-0000-4000-8000-000000000001', 'Teste', 'Cardio') $$, '%indisponível%', 'suspended não cadastra equipamento');

reset role;
select set_config('zion.academy_administration', 'allowed', true);
update public.academy_portal_access set status = 'past_due' where organization_id = current_setting('test.equipment_org_a')::uuid and client_id = 'f1100000-0000-4000-8000-000000000001';
select set_config('zion.academy_administration', '', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000005', true);
select throws_like($$ select * from public.portal_get_equipment('f1110000-0000-4000-8000-000000000001', 'f1200000-0000-4000-8000-000000000001') $$, '%indisponível%', 'past_due não consulta detalhe');

reset role;
select set_config('zion.academy_administration', 'allowed', true);
update public.academy_portal_access set status = 'suspended' where organization_id = current_setting('test.equipment_org_a')::uuid and client_id = 'f1100000-0000-4000-8000-000000000001';
select set_config('zion.academy_administration', '', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000002', true);
select throws_like($$ select * from public.portal_list_equipment('f1110000-0000-4000-8000-000000000002', null, 1, 12) $$, '%indisponível%', 'acesso comercial suspended bloqueia listagem');

reset role;
select set_config('zion.academy_administration', 'allowed', true);
update public.academy_portal_access set status = 'cancelled' where organization_id = current_setting('test.equipment_org_a')::uuid and client_id = 'f1100000-0000-4000-8000-000000000001';
select set_config('zion.academy_administration', '', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000002', true);
select throws_like($$ select public.portal_create_equipment('f1110000-0000-4000-8000-000000000002', 'Teste', 'Cardio') $$, '%indisponível%', 'acesso comercial cancelled bloqueia cadastro');

reset role;
select set_config('zion.academy_administration', 'allowed', true);
update public.academy_portal_access set status = 'active' where organization_id = current_setting('test.equipment_org_a')::uuid and client_id = 'f1100000-0000-4000-8000-000000000001';
update public.academy_user_locations set status = 'revoked', revoked_at = now(), revoked_by = 'f1000000-0000-4000-8000-000000000001', revocation_reason = 'Teste de revogação' where user_id = 'f3000000-0000-4000-8000-000000000001' and client_location_id = 'f1110000-0000-4000-8000-000000000001';
select set_config('zion.academy_administration', '', true);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);
select throws_like($$ select * from public.portal_list_equipment('f1110000-0000-4000-8000-000000000001', null, 1, 12) $$, '%indisponível%', 'revogação remove acesso imediatamente');
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000006', true);
select throws_like($$ select * from public.portal_list_equipment('f1110000-0000-4000-8000-000000000001', null, 1, 12) $$, '%indisponível%', 'usuário sem unidade não acessa');

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.equipment where organization_id = current_setting('test.equipment_org_a')::uuid), 4::bigint, 'owner mantém acesso aos registros anteriores e ao cadastro do Portal');
select throws_like($$ select * from public.portal_list_equipment('f1110000-0000-4000-8000-000000000001', null, 1, 12) $$, '%indisponível%', 'owner interno não usa RPC externa');
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.equipment where organization_id = current_setting('test.equipment_org_a')::uuid), 4::bigint, 'technician mantém acesso interno anterior');
select is((select count(*) from public.equipment where organization_id = current_setting('test.equipment_org_b')::uuid), 0::bigint, 'technician permanece isolado do segundo tenant');

select * from finish();
rollback;
