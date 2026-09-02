begin;

create extension if not exists pgtap with schema extensions;
select plan(47);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('a1000000-0000-4000-8000-000000000001', 'dashboard-owner-a@test.local', '{"full_name":"Owner Dashboard A","organization_name":"Tenant Dashboard A"}'::jsonb),
  ('b1000000-0000-4000-8000-000000000002', 'dashboard-owner-b@test.local', '{"full_name":"Owner Dashboard B","organization_name":"Tenant Dashboard B"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000003', 'dashboard-empty@test.local', '{"full_name":"Owner Dashboard Vazio","organization_name":"Tenant Dashboard Vazio"}'::jsonb);

select set_config('test.dashboard_org_a', (select id::text from public.organizations where created_by = 'a1000000-0000-4000-8000-000000000001'), true);
select set_config('test.dashboard_org_b', (select id::text from public.organizations where created_by = 'b1000000-0000-4000-8000-000000000002'), true);
select set_config('test.dashboard_org_c', (select id::text from public.organizations where created_by = 'c1000000-0000-4000-8000-000000000003'), true);

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  ('a1100000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_a')::uuid, 'Academia Dashboard A', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1100000-0000-4000-8000-000000000002', current_setting('test.dashboard_org_a')::uuid, 'Clube Dashboard A', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('b1100000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_b')::uuid, 'Academia Dashboard B', 'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002');

insert into public.client_locations (id, organization_id, client_id, name, street, city, state, created_by, updated_by)
values
  ('a1200000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'Unidade A', 'Rua A', 'Curitiba', 'PR', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('b1200000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_b')::uuid, 'b1100000-0000-4000-8000-000000000001', 'Unidade B', 'Rua B', 'São Paulo', 'SP', 'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002');

insert into public.equipment (id, organization_id, client_id, client_location_id, name, category, created_by, updated_by)
values
  ('a1300000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'Esteira Dashboard A', 'Cardio', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('b1300000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_b')::uuid, 'b1100000-0000-4000-8000-000000000001', 'b1200000-0000-4000-8000-000000000001', 'Esteira Dashboard B', 'Cardio', 'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002');

insert into public.maintenances (
  id, organization_id, client_id, client_location_id, equipment_id,
  work_order_number, maintenance_type, status, scheduled_at,
  diagnosis, service_performed, responsible_technician_id, total_amount,
  completed_at, completed_by, created_by, updated_by
)
values
  ('a1400000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', 'OS-DASH-AUG', 'preventive', 'completed', '2026-08-31 15:00:00+00', 'Concluída', 'Executado', 'a1000000-0000-4000-8000-000000000001', 1000, '2026-09-01 02:30:00+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1400000-0000-4000-8000-000000000002', current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', 'OS-DASH-SEP', 'corrective', 'completed', '2026-09-01 13:00:00+00', 'Concluída', 'Executado', 'a1000000-0000-4000-8000-000000000001', 1000, '2026-09-01 03:30:00+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1400000-0000-4000-8000-000000000003', current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', 'OS-DASH-PROGRESS-SEP', 'preventive', 'in_progress', '2026-09-15 13:00:00+00', 'Em análise', 'Em execução', 'a1000000-0000-4000-8000-000000000001', 500, null, null, 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1400000-0000-4000-8000-000000000004', current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', 'OS-DASH-PROGRESS-OCT', 'corrective', 'in_progress', '2026-10-01 13:00:00+00', 'Em análise', 'Em execução', 'a1000000-0000-4000-8000-000000000001', 500, null, null, 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('b1400000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_b')::uuid, 'b1100000-0000-4000-8000-000000000001', 'b1200000-0000-4000-8000-000000000001', 'b1300000-0000-4000-8000-000000000001', 'OS-DASH-B', 'preventive', 'completed', '2026-09-10 13:00:00+00', 'Concluída', 'Executado', 'b1000000-0000-4000-8000-000000000002', 1000, '2026-09-10 14:00:00+00', 'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002');

insert into public.payments (
  organization_id, client_id, maintenance_id, amount, method, status,
  paid_at, due_date, notes, created_by
)
values
  (current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1400000-0000-4000-8000-000000000001', 100, 'pix', 'received', '2026-09-01 02:30:00+00', null, 'Recebimento agosto local', 'a1000000-0000-4000-8000-000000000001'),
  (current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1400000-0000-4000-8000-000000000002', 200, 'cash', 'received', '2026-09-01 03:30:00+00', null, 'Recebimento setembro local', 'a1000000-0000-4000-8000-000000000001'),
  (current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1400000-0000-4000-8000-000000000002', 300, 'boleto', 'pending', null, '2026-09-30', 'Pendente não fatura', 'a1000000-0000-4000-8000-000000000001'),
  (current_setting('test.dashboard_org_b')::uuid, 'b1100000-0000-4000-8000-000000000001', 'b1400000-0000-4000-8000-000000000001', 900, 'pix', 'received', '2026-09-10 14:00:00+00', null, 'Recebimento B', 'b1000000-0000-4000-8000-000000000002');

insert into public.inventory_items (
  id, organization_id, name, unit_of_measure, current_quantity,
  minimum_stock, status, created_by, updated_by
)
values
  ('a1500000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_a')::uuid, 'Item atenção A', 'un', 8, 10, 'active', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1500000-0000-4000-8000-000000000002', current_setting('test.dashboard_org_a')::uuid, 'Item crítico A', 'un', 4, 10, 'active', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1500000-0000-4000-8000-000000000003', current_setting('test.dashboard_org_a')::uuid, 'Item sem saldo A', 'un', 0, 10, 'active', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1500000-0000-4000-8000-000000000004', current_setting('test.dashboard_org_a')::uuid, 'Item normal A', 'un', 20, 10, 'active', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('b1500000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_b')::uuid, 'Item sem saldo B', 'un', 0, 10, 'active', 'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002');

set local session_replication_role = replica;
insert into public.return_schedules (
  id, organization_id, client_id, client_location_id, equipment_id,
  scheduled_date, status, notes, created_by
)
values
  ('a1600000-0000-4000-8000-000000000001', current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', (now() at time zone 'America/Sao_Paulo')::date - 2, 'pending', 'Retorno vencido A', 'a1000000-0000-4000-8000-000000000001'),
  ('a1600000-0000-4000-8000-000000000002', current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', (now() at time zone 'America/Sao_Paulo')::date, 'pending', 'Retorno hoje A', 'a1000000-0000-4000-8000-000000000001'),
  ('a1600000-0000-4000-8000-000000000003', current_setting('test.dashboard_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'a1300000-0000-4000-8000-000000000001', (now() at time zone 'America/Sao_Paulo')::date + 5, 'pending', 'Retorno semana A', 'a1000000-0000-4000-8000-000000000001');
set local session_replication_role = origin;

select has_function('public', 'get_operational_dashboard', array['uuid', 'date', 'date'], 'RPC do dashboard foi criada');
select ok(has_function_privilege('authenticated', 'public.get_operational_dashboard(uuid,date,date)', 'EXECUTE'), 'authenticated executa dashboard');
select ok(not has_function_privilege('anon', 'public.get_operational_dashboard(uuid,date,date)', 'EXECUTE'), 'anon não executa dashboard');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

select is((select timezone_name from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-08-31', '2026-08-31')), 'America/Sao_Paulo', 'dashboard declara timezone de negócio');
select is((select period_start from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-08-31', '2026-08-31')), '2026-08-31'::date, 'período inicial é preservado');
select is((select period_end from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-08-31', '2026-08-31')), '2026-08-31'::date, 'período final é preservado');
select is((select completed_maintenances from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-08-31', '2026-08-31')), 1::bigint, 'conclusão antes de 03:00 UTC pertence ao dia anterior em São Paulo');
select is((select received_revenue from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-08-31', '2026-08-31')), 100::numeric, 'faturamento respeita paid_at convertido para São Paulo');
select is((select in_progress_maintenances from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-08-31', '2026-08-31')), 0::bigint, 'andamento é filtrado pela data local de atendimento');

select is((select completed_maintenances from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'período de setembro não inclui conclusão local de agosto');
select is((select in_progress_maintenances from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'período conta apenas OS em andamento agendada em setembro');
select is((select received_revenue from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 200::numeric, 'somente pagamento recebido no período compõe faturamento');
select is((select active_clients from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 2::bigint, 'clientes ativos são contados sem filtro temporal');
select is((select overdue_returns from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'retorno vencido é calculado na data local');
select is((select today_returns from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'retorno de hoje é calculado na data local');
select is((select next_7_returns from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'próximos sete dias excluem hoje');
select is((select inventory_attention from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'estoque em atenção é contado');
select is((select inventory_critical from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'estoque crítico é contado');
select is((select inventory_out_of_stock from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'estoque sem saldo é contado');
select is((select jsonb_array_length(priority_returns) from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 2, 'prioridades incluem vencido e hoje');
select is((select priority_returns->0->>'timing' from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 'overdue', 'retorno vencido aparece primeiro');
select is((select jsonb_array_length(priority_maintenances) from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 2, 'prioridades mostram todas as OS atualmente em andamento');
select is((select jsonb_array_length(priority_inventory) from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 2, 'prioridades mostram crítico e sem saldo');
select is((select jsonb_array_length(latest_completed_maintenances) from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1, 'lista recente respeita período');
select is((select latest_completed_maintenances->0->>'work_order_number' from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 'OS-DASH-SEP', 'lista recente retorna a OS local correta');
select is((select jsonb_array_length(upcoming_returns) from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 2, 'próximos retornos incluem hoje e futuro');
select is((select upcoming_returns->0->>'id' from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 'a1600000-0000-4000-8000-000000000002', 'retorno de hoje aparece primeiro nos próximos');
select is((select is_new_organization from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), false, 'tenant com operação não é marcado como novo');
select throws_like(
  $$ select * from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-10-01', '2026-09-01') $$,
  '%início do período%', 'intervalo invertido é bloqueado'
);
select is((select count(*) from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'RPC retorna exatamente uma linha');
select ok((select priority_returns::text not like '%Dashboard B%' from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30')), 'listas do tenant A não agregam nomes do tenant B');
select is((select period_start from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, null, null)), date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date, 'período padrão começa no mês local');
select is((select period_end from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, null, null)), (now() at time zone 'America/Sao_Paulo')::date, 'período padrão termina hoje em São Paulo');

select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000002', true);
select throws_like(
  $$ select * from public.get_operational_dashboard(current_setting('test.dashboard_org_a')::uuid, '2026-09-01', '2026-09-30') $$,
  '%permissão%', 'tenant B não consulta agregados do tenant A'
);
select is((select active_clients from public.get_operational_dashboard(current_setting('test.dashboard_org_b')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'tenant B vê apenas seu cliente');
select is((select received_revenue from public.get_operational_dashboard(current_setting('test.dashboard_org_b')::uuid, '2026-09-01', '2026-09-30')), 900::numeric, 'tenant B vê apenas seu faturamento');
select is((select completed_maintenances from public.get_operational_dashboard(current_setting('test.dashboard_org_b')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'tenant B vê apenas sua manutenção');
select is((select inventory_out_of_stock from public.get_operational_dashboard(current_setting('test.dashboard_org_b')::uuid, '2026-09-01', '2026-09-30')), 1::bigint, 'tenant B vê apenas seu estoque');
select is((select jsonb_array_length(priority_returns) from public.get_operational_dashboard(current_setting('test.dashboard_org_b')::uuid, '2026-09-01', '2026-09-30')), 0, 'tenant B não recebe prioridades do tenant A');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select is((select is_new_organization from public.get_operational_dashboard(current_setting('test.dashboard_org_c')::uuid, null, null)), true, 'organização sem operação é identificada');
select is((select completed_maintenances from public.get_operational_dashboard(current_setting('test.dashboard_org_c')::uuid, null, null)), 0::bigint, 'organização nova tem zero concluídas');
select is((select in_progress_maintenances from public.get_operational_dashboard(current_setting('test.dashboard_org_c')::uuid, null, null)), 0::bigint, 'organização nova tem zero em andamento');
select is((select active_clients from public.get_operational_dashboard(current_setting('test.dashboard_org_c')::uuid, null, null)), 0::bigint, 'organização nova tem zero clientes');
select is((select received_revenue from public.get_operational_dashboard(current_setting('test.dashboard_org_c')::uuid, null, null)), 0::numeric, 'organização nova tem faturamento zero');
select ok((select overdue_returns = 0 and today_returns = 0 and next_7_returns = 0 from public.get_operational_dashboard(current_setting('test.dashboard_org_c')::uuid, null, null)), 'organização nova tem agenda zerada');
select ok((select inventory_attention = 0 and inventory_critical = 0 and inventory_out_of_stock = 0 from public.get_operational_dashboard(current_setting('test.dashboard_org_c')::uuid, null, null)), 'organização nova tem estoque zerado');
select ok((select jsonb_array_length(priority_returns) = 0 and jsonb_array_length(priority_maintenances) = 0 and jsonb_array_length(priority_inventory) = 0 and jsonb_array_length(latest_completed_maintenances) = 0 and jsonb_array_length(upcoming_returns) = 0 from public.get_operational_dashboard(current_setting('test.dashboard_org_c')::uuid, null, null)), 'organização nova recebe listas vazias');

select * from finish();
rollback;
