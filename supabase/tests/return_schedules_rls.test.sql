begin;

create extension if not exists pgtap with schema extensions;
select plan(51);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('91000000-0000-4000-8000-000000000001', 'return-owner-a@test.local', '{"full_name":"Owner Agenda A","organization_name":"Tenant Agenda A"}'::jsonb),
  ('92000000-0000-4000-8000-000000000002', 'return-owner-b@test.local', '{"full_name":"Owner Agenda B","organization_name":"Tenant Agenda B"}'::jsonb),
  ('93000000-0000-4000-8000-000000000003', 'return-technician@test.local', '{"full_name":"Técnico Agenda","organization_name":"Tenant Técnico Agenda"}'::jsonb);

select set_config('test.return_org_a', (select id::text from public.organizations where created_by = '91000000-0000-4000-8000-000000000001'), true);
select set_config('test.return_org_b', (select id::text from public.organizations where created_by = '92000000-0000-4000-8000-000000000002'), true);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (current_setting('test.return_org_a')::uuid, '93000000-0000-4000-8000-000000000003', 'technician', 'active', '91000000-0000-4000-8000-000000000001');

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  ('91100000-0000-4000-8000-000000000001', current_setting('test.return_org_a')::uuid, 'Academia Agenda A', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001'),
  ('91100000-0000-4000-8000-000000000002', current_setting('test.return_org_a')::uuid, 'Clube Agenda A', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001'),
  ('92100000-0000-4000-8000-000000000001', current_setting('test.return_org_b')::uuid, 'Academia Agenda B', '92000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002');

insert into public.client_locations (id, organization_id, client_id, name, street, city, state, created_by, updated_by)
values
  ('91200000-0000-4000-8000-000000000001', current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000001', 'Unidade Curitiba', 'Rua A', 'Curitiba', 'PR', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001'),
  ('91200000-0000-4000-8000-000000000002', current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000002', 'Unidade Londrina', 'Rua B', 'Londrina', 'PR', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001'),
  ('92200000-0000-4000-8000-000000000001', current_setting('test.return_org_b')::uuid, '92100000-0000-4000-8000-000000000001', 'Unidade Externa', 'Rua C', 'São Paulo', 'SP', '92000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002');

insert into public.equipment (id, organization_id, client_id, client_location_id, name, category, created_by, updated_by)
values
  ('91300000-0000-4000-8000-000000000001', current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000001', '91200000-0000-4000-8000-000000000001', 'Esteira Agenda A', 'Cardio', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001'),
  ('91300000-0000-4000-8000-000000000002', current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000002', '91200000-0000-4000-8000-000000000002', 'Bike Agenda A', 'Cardio', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001'),
  ('92300000-0000-4000-8000-000000000001', current_setting('test.return_org_b')::uuid, '92100000-0000-4000-8000-000000000001', '92200000-0000-4000-8000-000000000001', 'Esteira Agenda B', 'Cardio', '92000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002');

insert into public.maintenances (
  id, organization_id, client_id, client_location_id, equipment_id, work_order_number,
  maintenance_type, scheduled_at, diagnosis, service_performed,
  responsible_technician_id, created_by, updated_by
)
values
  ('91500000-0000-4000-8000-000000000001', current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000001', '91200000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', 'OS-RET-001', 'preventive', now(), 'Revisão concluída', 'Ajustes realizados', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001'),
  ('91500000-0000-4000-8000-000000000002', current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000001', '91200000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', 'OS-RET-002', 'corrective', now(), 'Falha corrigida', 'Peça ajustada', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001'),
  ('92500000-0000-4000-8000-000000000001', current_setting('test.return_org_b')::uuid, '92100000-0000-4000-8000-000000000001', '92200000-0000-4000-8000-000000000001', '92300000-0000-4000-8000-000000000001', 'OS-RET-B01', 'preventive', now(), 'Revisão externa', 'Serviço externo', '92000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002');

select has_table('public', 'return_schedules', 'tabela return_schedules foi criada');
select is((select relrowsecurity from pg_class where oid = 'public.return_schedules'::regclass), true, 'RLS está habilitada em return_schedules');
select ok(not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'return_schedules' and column_name = 'is_overdue'), 'vencimento não é armazenado em coluna');

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select * from public.complete_maintenance_with_return(
    current_setting('test.return_org_a')::uuid,
    '91500000-0000-4000-8000-000000000001',
    current_date + 10
  ) $$,
  'conclusão transacional cria retorno com data escolhida'
);
select is((select status from public.maintenances where id = '91500000-0000-4000-8000-000000000001'), 'completed', 'wrapper conclui a manutenção');
select is((select count(*) from public.return_schedules where origin_maintenance_id = '91500000-0000-4000-8000-000000000001'), 1::bigint, 'wrapper cria exatamente um retorno de origem');
select is((select scheduled_date from public.return_schedules where origin_maintenance_id = '91500000-0000-4000-8000-000000000001'), current_date + 10, 'retorno preserva a data escolhida');
select ok((select client_id = '91100000-0000-4000-8000-000000000001' and client_location_id = '91200000-0000-4000-8000-000000000001' and equipment_id = '91300000-0000-4000-8000-000000000001' from public.return_schedules where origin_maintenance_id = '91500000-0000-4000-8000-000000000001'), 'retorno herda todos os vínculos da OS');

select throws_like(
  $$ select * from public.complete_maintenance_with_return(
    current_setting('test.return_org_a')::uuid,
    '91500000-0000-4000-8000-000000000002',
    current_date - 1
  ) $$,
  '%igual ou posterior a hoje%', 'data passada bloqueia conclusão com retorno'
);
select is((select status from public.maintenances where id = '91500000-0000-4000-8000-000000000002'), 'draft', 'falha de data preserva OS em rascunho');
select is((select count(*) from public.return_schedules where origin_maintenance_id = '91500000-0000-4000-8000-000000000002'), 0::bigint, 'falha não cria retorno parcial');

select lives_ok(
  $$ insert into public.return_schedules (organization_id, client_id, client_location_id, equipment_id, scheduled_date, notes)
     values (current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000001', '91200000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', current_date, 'Retorno manual de hoje') $$,
  'owner cria retorno manual para hoje'
);
select lives_ok(
  $$ insert into public.return_schedules (organization_id, client_id, client_location_id, equipment_id, scheduled_date, notes)
     values (current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000002', '91200000-0000-4000-8000-000000000002', '91300000-0000-4000-8000-000000000002', current_date + 5, 'Retorno dentro da semana') $$,
  'owner cria retorno manual da semana'
);
select lives_ok(
  $$ insert into public.return_schedules (organization_id, client_id, client_location_id, equipment_id, scheduled_date, notes)
     values (current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000002', '91200000-0000-4000-8000-000000000002', '91300000-0000-4000-8000-000000000002', current_date + 20, 'Retorno em trinta dias') $$,
  'owner cria retorno manual dos próximos trinta dias'
);

reset role;
set local session_replication_role = replica;
insert into public.return_schedules (
  id, organization_id, client_id, client_location_id, equipment_id,
  scheduled_date, status, notes, created_by
)
values (
  '91600000-0000-4000-8000-000000000099',
  current_setting('test.return_org_a')::uuid,
  '91100000-0000-4000-8000-000000000001',
  '91200000-0000-4000-8000-000000000001',
  '91300000-0000-4000-8000-000000000001',
  current_date - 3,
  'pending',
  'Fixture de retorno vencido',
  '91000000-0000-4000-8000-000000000001'
);
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select is((select is_overdue from public.search_return_schedules(current_setting('test.return_org_a')::uuid, 'Fixture', null, null, null, null, null, null)), true, 'vencido é calculado para pendência anterior a hoje');
select is((select timing from public.search_return_schedules(current_setting('test.return_org_a')::uuid, 'Fixture', null, null, null, null, null, null)), 'overdue', 'faixa temporal calculada identifica vencido');
select is((select days_until from public.search_return_schedules(current_setting('test.return_org_a')::uuid, 'Fixture', null, null, null, null, null, null)), -3, 'dias até o retorno é calculado dinamicamente');
select is((select timing from public.search_return_schedules(current_setting('test.return_org_a')::uuid, 'hoje', null, null, null, null, null, null)), 'today', 'agenda calcula retorno de hoje');
select is((select timing from public.search_return_schedules(current_setting('test.return_org_a')::uuid, 'semana', null, null, null, null, null, null)), 'week', 'agenda calcula retorno da semana');
select is((select timing from public.search_return_schedules(current_setting('test.return_org_a')::uuid, 'trinta', null, null, null, null, null, null)), 'next_30', 'agenda calcula retorno dos próximos trinta dias');
select is((select overdue_count from public.get_return_schedule_summary(current_setting('test.return_org_a')::uuid)), 1::bigint, 'resumo conta vencidos pendentes');
select is((select today_count from public.get_return_schedule_summary(current_setting('test.return_org_a')::uuid)), 1::bigint, 'resumo conta retornos de hoje');
select is((select week_count from public.get_return_schedule_summary(current_setting('test.return_org_a')::uuid)), 1::bigint, 'resumo conta próximos sete dias sem duplicar hoje');
select is((select next_30_count from public.get_return_schedule_summary(current_setting('test.return_org_a')::uuid)), 3::bigint, 'resumo conta todos os próximos trinta dias');

select throws_like(
  $$ insert into public.return_schedules (organization_id, client_id, client_location_id, equipment_id, scheduled_date)
     values (current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000001', '91200000-0000-4000-8000-000000000002', '91300000-0000-4000-8000-000000000001', current_date + 1) $$,
  '%unidade deve corresponder%', 'trigger bloqueia unidade de outro cliente'
);
select throws_like(
  $$ insert into public.return_schedules (organization_id, client_id, client_location_id, equipment_id, scheduled_date)
     values (current_setting('test.return_org_b')::uuid, '92100000-0000-4000-8000-000000000001', '92200000-0000-4000-8000-000000000001', '92300000-0000-4000-8000-000000000001', current_date + 1) $$,
  '%row-level security%', 'RLS bloqueia criação cross-tenant'
);
select throws_like(
  $$ insert into public.return_schedules (organization_id, client_id, client_location_id, equipment_id, scheduled_date)
     values (current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000001', '91200000-0000-4000-8000-000000000001', '92300000-0000-4000-8000-000000000001', current_date + 1) $$,
  '%Equipamento e cliente%', 'trigger bloqueia equipamento cross-tenant'
);
select throws_like(
  $$ insert into public.return_schedules (organization_id, client_id, client_location_id, equipment_id, scheduled_date)
     values (current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000001', '91200000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', current_date - 1) $$,
  '%não pode estar no passado%', 'retorno manual não aceita data passada'
);

select set_config('test.today_return_id', (select id::text from public.return_schedules where notes = 'Retorno manual de hoje'), true);
select set_config('test.week_return_id', (select id::text from public.return_schedules where notes = 'Retorno dentro da semana'), true);
select lives_ok(
  $$ select * from public.complete_return_schedule(current_setting('test.return_org_a')::uuid, current_setting('test.today_return_id')::uuid) $$,
  'RPC conclui retorno pendente'
);
select is((select status from public.return_schedules where id = current_setting('test.today_return_id')::uuid), 'completed', 'conclusão altera status e preserva registro');
select ok((select completed_at is not null and completed_by = '91000000-0000-4000-8000-000000000001' from public.return_schedules where id = current_setting('test.today_return_id')::uuid), 'conclusão registra auditoria');
select throws_like(
  $$ select * from public.complete_return_schedule(current_setting('test.return_org_a')::uuid, current_setting('test.today_return_id')::uuid) $$,
  '%Somente retornos pendentes%', 'retorno não pode ser concluído duas vezes'
);
select throws_like(
  $$ select * from public.cancel_return_schedule(current_setting('test.return_org_a')::uuid, current_setting('test.week_return_id')::uuid, 'x') $$,
  '%entre 3 e 500%', 'cancelamento exige motivo válido'
);
select lives_ok(
  $$ select * from public.cancel_return_schedule(current_setting('test.return_org_a')::uuid, current_setting('test.week_return_id')::uuid, 'Cliente solicitou reagendamento') $$,
  'RPC cancela retorno com motivo'
);
select is((select cancellation_reason from public.return_schedules where id = current_setting('test.week_return_id')::uuid), 'Cliente solicitou reagendamento', 'cancelamento preserva motivo');

select is((select count(*) from public.search_return_schedules(current_setting('test.return_org_a')::uuid, null, current_date, current_date + 30, '91100000-0000-4000-8000-000000000002', 'Londrina', null, null)), 2::bigint, 'filtros combinam período, cliente e cidade');
select is((select count(*) from public.search_return_schedules(current_setting('test.return_org_a')::uuid, null, null, null, null, null, 'completed', '91300000-0000-4000-8000-000000000001')), 1::bigint, 'filtros por status e equipamento alimentam detalhes');

select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.return_schedules), 5::bigint, 'technician ativo visualiza agenda do tenant');
select lives_ok(
  $$ insert into public.return_schedules (organization_id, client_id, client_location_id, equipment_id, scheduled_date, notes)
     values (current_setting('test.return_org_a')::uuid, '91100000-0000-4000-8000-000000000001', '91200000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', current_date + 40, 'Criado pelo técnico') $$,
  'technician ativo cria retorno manual'
);

select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.return_schedules), 0::bigint, 'segundo tenant não lê agenda do primeiro');
select throws_like(
  $$ select * from public.get_return_schedule_summary(current_setting('test.return_org_a')::uuid) $$,
  '%permissão%', 'resumo bloqueia leitura cross-tenant'
);
select throws_like(
  $$ select * from public.complete_return_schedule(current_setting('test.return_org_a')::uuid, current_setting('test.today_return_id')::uuid) $$,
  '%permissão%', 'RPC de conclusão bloqueia tenant externo'
);

reset role;
select throws_like(
  $$ update public.return_schedules set notes = 'Alteração indevida' where id = current_setting('test.today_return_id')::uuid $$,
  '%imutáveis%', 'trigger protege retorno concluído contra edição administrativa'
);
select throws_like(
  $$ update public.return_schedules set scheduled_date = current_date + 50 where id = current_setting('test.week_return_id')::uuid $$,
  '%data e a auditoria%', 'trigger protege data de retorno cancelado'
);
select throws_like(
  $$ delete from public.return_schedules where id = current_setting('test.week_return_id')::uuid $$,
  '%não podem ser excluídos%', 'trigger bloqueia DELETE administrativo'
);
select ok(not has_table_privilege('anon', 'public.return_schedules', 'SELECT'), 'anon não lê agenda');
select ok(not has_table_privilege('authenticated', 'public.return_schedules', 'DELETE'), 'frontend não possui DELETE direto');
select ok(not has_table_privilege('authenticated', 'public.return_schedules', 'UPDATE'), 'frontend altera status somente por RPC');
select ok(not has_column_privilege('authenticated', 'public.return_schedules', 'origin_maintenance_id', 'INSERT'), 'frontend não forja manutenção de origem');
select ok(not has_function_privilege('authenticated', 'public.guard_return_schedule_mutation()', 'EXECUTE'), 'frontend não executa trigger de proteção');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'return_schedules'), 2::bigint, 'agenda possui políticas mínimas de leitura e criação');

select * from finish();
rollback;
