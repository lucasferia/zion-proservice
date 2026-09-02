begin;

create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '41000000-0000-4000-8000-000000000001',
    'equipment-owner-a@test.local',
    '{"full_name":"Owner Equipamentos A","organization_name":"Tenant Equipamentos A"}'::jsonb
  ),
  (
    '42000000-0000-4000-8000-000000000002',
    'equipment-owner-b@test.local',
    '{"full_name":"Owner Equipamentos B","organization_name":"Tenant Equipamentos B"}'::jsonb
  ),
  (
    '43000000-0000-4000-8000-000000000003',
    'equipment-technician@test.local',
    '{"full_name":"Técnico Equipamentos","organization_name":"Tenant Técnico Equipamentos"}'::jsonb
  );

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  (
    '41100000-0000-4000-8000-000000000001',
    (select id from public.organizations where created_by = '41000000-0000-4000-8000-000000000001'),
    'Academia A',
    '41000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41100000-0000-4000-8000-000000000002',
    (select id from public.organizations where created_by = '41000000-0000-4000-8000-000000000001'),
    'Clube A',
    '41000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '42100000-0000-4000-8000-000000000001',
    (select id from public.organizations where created_by = '42000000-0000-4000-8000-000000000002'),
    'Academia B',
    '42000000-0000-4000-8000-000000000002',
    '42000000-0000-4000-8000-000000000002'
  );

insert into public.client_locations (
  id, organization_id, client_id, name, street, city, state, created_by, updated_by
)
values
  (
    '41200000-0000-4000-8000-000000000001',
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    '41100000-0000-4000-8000-000000000001',
    'Matriz A', 'Rua A', 'Curitiba', 'PR',
    '41000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41200000-0000-4000-8000-000000000002',
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000002'),
    '41100000-0000-4000-8000-000000000002',
    'Unidade Clube A', 'Rua B', 'Curitiba', 'PR',
    '41000000-0000-4000-8000-000000000001',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '42200000-0000-4000-8000-000000000001',
    (select organization_id from public.clients where id = '42100000-0000-4000-8000-000000000001'),
    '42100000-0000-4000-8000-000000000001',
    'Matriz B', 'Rua C', 'São Paulo', 'SP',
    '42000000-0000-4000-8000-000000000002',
    '42000000-0000-4000-8000-000000000002'
  );

select is(
  (select relrowsecurity from pg_class where oid = 'public.equipment'::regclass),
  true,
  'RLS está habilitada em equipment'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.equipment (
      organization_id, client_id, client_location_id, name, category, brand,
      model, serial_number, asset_tag, status
    ) values (
      (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
      '41100000-0000-4000-8000-000000000001',
      '41200000-0000-4000-8000-000000000001',
      'Esteira Performance 01', 'Cardio', 'Movement', 'RT 250',
      'SN-EQP-001', 'PAT-001', 'operational'
    )
  $$,
  'owner insere equipamento no próprio tenant'
);

select is((select count(*) from public.equipment), 1::bigint, 'owner visualiza equipamento do tenant');

select is(
  (select count(*) from public.search_equipment(
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    'Esteira', null, null, null, null
  )), 1::bigint, 'busca encontra equipamento por nome'
);

select is(
  (select count(*) from public.search_equipment(
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    'Movement', null, null, null, null
  )), 1::bigint, 'busca encontra equipamento por marca'
);

select is(
  (select count(*) from public.search_equipment(
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    'SN-EQP-001', null, null, null, null
  )), 1::bigint, 'busca encontra equipamento por número de série'
);

select is(
  (select count(*) from public.search_equipment(
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    'PAT-001', null, null, null, null
  )), 1::bigint, 'busca encontra equipamento por patrimônio'
);

select is(
  (select count(*) from public.search_equipment(
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    'Academia A', null, null, null, null
  )), 1::bigint, 'busca encontra equipamento pelo cliente'
);

select is(
  (select count(*) from public.search_equipment(
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    null,
    '41100000-0000-4000-8000-000000000001',
    '41200000-0000-4000-8000-000000000001',
    'cardio',
    'operational'
  )), 1::bigint, 'filtros combinados retornam o equipamento esperado'
);

select throws_like(
  format(
    'insert into public.equipment (organization_id, client_id, name, category) values (%L, %L, %L, %L)',
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    '42100000-0000-4000-8000-000000000001', 'Equipamento invasor', 'Cardio'
  ),
  '%row-level security%',
  'RLS impede associar cliente de outra organização'
);

select throws_like(
  format(
    'insert into public.equipment (organization_id, client_id, client_location_id, name, category) values (%L, %L, %L, %L, %L)',
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    '41100000-0000-4000-8000-000000000001', '42200000-0000-4000-8000-000000000001',
    'Unidade invasora', 'Força'
  ),
  '%row-level security%',
  'RLS impede associar unidade de outra organização'
);

select throws_like(
  format(
    'insert into public.equipment (organization_id, client_id, client_location_id, name, category) values (%L, %L, %L, %L, %L)',
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    '41100000-0000-4000-8000-000000000001', '41200000-0000-4000-8000-000000000002',
    'Unidade de outro cliente', 'Força'
  ),
  '%row-level security%',
  'RLS impede unidade de outro cliente no mesmo tenant'
);

select throws_like(
  $$
    insert into public.equipment (
      organization_id, client_id, name, category, status
    ) values (
      (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
      '41100000-0000-4000-8000-000000000001', 'Status inválido', 'Cardio', 'broken'
    )
  $$,
  '%equipment_status_check%',
  'constraint rejeita status fora do domínio'
);

select set_config('request.jwt.claim.sub', '42000000-0000-4000-8000-000000000002', true);

select is((select count(*) from public.equipment), 0::bigint, 'outro tenant não visualiza equipamentos');

select is(
  (select count(*) from public.search_equipment(
    (select id from public.organizations where created_by = auth.uid()),
    null, null, null, null, null
  )), 0::bigint, 'busca de outro tenant não retorna equipamentos'
);

select ok(not has_table_privilege('anon', 'public.equipment', 'SELECT'), 'anon não lê equipment');
select ok(not has_table_privilege('authenticated', 'public.equipment', 'DELETE'), 'authenticated não exclui diretamente');
select ok(
  not has_column_privilege('authenticated', 'public.equipment', 'organization_id', 'UPDATE'),
  'authenticated não pode mover equipamento entre organizações'
);
select ok(
  not has_function_privilege('authenticated', 'public.set_equipment_record_audit()', 'EXECUTE'),
  'authenticated não executa diretamente a função de auditoria'
);

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.organization_members (organization_id, user_id, role, status)
    values (
      (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
      '43000000-0000-4000-8000-000000000003', 'technician', 'active'
    )
  $$,
  'owner adiciona technician ao tenant'
);

select set_config('request.jwt.claim.sub', '43000000-0000-4000-8000-000000000003', true);

select is(
  (select count(*) from public.equipment where organization_id = (
    select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'
  )), 1::bigint, 'technician ativo visualiza equipamentos do tenant compartilhado'
);

select lives_ok(
  $$
    insert into public.equipment (organization_id, client_id, name, category, status)
    values (
      (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
      '41100000-0000-4000-8000-000000000001', 'Bicicleta Spinning 02', 'Cardio', 'attention'
    )
  $$,
  'technician insere equipamento no tenant compartilhado'
);

select lives_ok(
  $$ update public.equipment set status = 'attention' where name = 'Esteira Performance 01' $$,
  'technician atualiza equipamento do tenant'
);

select is(
  (select updated_by from public.equipment where name = 'Esteira Performance 01'),
  '43000000-0000-4000-8000-000000000003'::uuid,
  'auditoria registra quem atualizou o equipamento'
);

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ update public.equipment set deleted_at = now() where name = 'Esteira Performance 01' $$,
  'equipamento é arquivado por soft delete'
);

select is(
  (select deleted_by from public.equipment where name = 'Esteira Performance 01'),
  '41000000-0000-4000-8000-000000000001'::uuid,
  'arquivamento registra o usuário responsável'
);

select is(
  (select count(*) from public.search_equipment(
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    'Esteira Performance 01', null, null, null, null
  )), 0::bigint, 'busca não retorna equipamento arquivado'
);

select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'equipment'),
  3::bigint,
  'equipment possui somente as políticas necessárias'
);

reset role;

select throws_like(
  format(
    'insert into public.equipment (organization_id, client_id, name, category, created_by, updated_by) values (%L, %L, %L, %L, %L, %L)',
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    '42100000-0000-4000-8000-000000000001', 'Cross tenant administrativo', 'Cardio',
    '41000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001'
  ),
  '%equipment_client_organization_fk%',
  'FK composta impede cliente de outro tenant mesmo sem RLS'
);

select throws_like(
  format(
    'insert into public.equipment (organization_id, client_id, client_location_id, name, category, created_by, updated_by) values (%L, %L, %L, %L, %L, %L, %L)',
    (select organization_id from public.clients where id = '41100000-0000-4000-8000-000000000001'),
    '41100000-0000-4000-8000-000000000001', '41200000-0000-4000-8000-000000000002',
    'Unidade incompatível administrativa', 'Força',
    '41000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001'
  ),
  '%equipment_location_client_organization_fk%',
  'FK composta impede unidade de outro cliente mesmo sem RLS'
);

select * from finish();
rollback;
