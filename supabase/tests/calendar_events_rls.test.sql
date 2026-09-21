begin;

create extension if not exists pgtap with schema extensions;
set local timezone = 'America/Sao_Paulo';
select plan(42);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('a1000000-0000-4000-8000-000000000001', 'calendar-owner-a@test.local', '{"full_name":"Owner Calendar A","organization_name":"Calendar A"}'::jsonb),
  ('a2000000-0000-4000-8000-000000000002', 'calendar-owner-b@test.local', '{"full_name":"Owner Calendar B","organization_name":"Calendar B"}'::jsonb),
  ('a3000000-0000-4000-8000-000000000003', 'calendar-tech@test.local', '{"full_name":"Técnico Calendar"}'::jsonb);

select set_config('test.calendar_org_a', (select id::text from public.organizations where created_by = 'a1000000-0000-4000-8000-000000000001'), true);
select set_config('test.calendar_org_b', (select id::text from public.organizations where created_by = 'a2000000-0000-4000-8000-000000000002'), true);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (current_setting('test.calendar_org_a')::uuid, 'a3000000-0000-4000-8000-000000000003', 'technician', 'active', 'a1000000-0000-4000-8000-000000000001');

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  ('a1100000-0000-4000-8000-000000000001', current_setting('test.calendar_org_a')::uuid, 'Cliente Calendar A', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1100000-0000-4000-8000-000000000002', current_setting('test.calendar_org_a')::uuid, 'Outro Cliente A', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a2100000-0000-4000-8000-000000000001', current_setting('test.calendar_org_b')::uuid, 'Cliente Calendar B', 'a2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002');

insert into public.client_locations (id, organization_id, client_id, name, street, city, state, created_by, updated_by)
values
  ('a1200000-0000-4000-8000-000000000001', current_setting('test.calendar_org_a')::uuid, 'a1100000-0000-4000-8000-000000000001', 'Matriz A', 'Rua A', 'Curitiba', 'PR', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1200000-0000-4000-8000-000000000002', current_setting('test.calendar_org_a')::uuid, 'a1100000-0000-4000-8000-000000000002', 'Filial A', 'Rua B', 'Londrina', 'PR', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001');

insert into public.equipment (id, organization_id, name, category, created_by, updated_by)
values
  ('a1300000-0000-4000-8000-000000000001', current_setting('test.calendar_org_a')::uuid, 'Esteira Geral A', 'Cardio', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a2300000-0000-4000-8000-000000000001', current_setting('test.calendar_org_b')::uuid, 'Esteira Geral B', 'Cardio', 'a2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002');

insert into public.maintenances (
  id, organization_id, client_id, client_location_id, equipment_id, work_order_number,
  maintenance_type, scheduled_at, responsible_technician_id, created_by, updated_by
) values (
  'a1400000-0000-4000-8000-000000000001', current_setting('test.calendar_org_a')::uuid,
  'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001',
  'a1300000-0000-4000-8000-000000000001', 'OS-CAL-001', 'preventive', '2026-09-21 12:00:00+00',
  'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'
);

select has_table('public', 'calendar_events', 'tabela calendar_events foi criada');
select is((select relrowsecurity from pg_class where oid = 'public.calendar_events'::regclass), true, 'RLS está habilitada');
select ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'calendar_events'
    and data_type in ('bytea')
), 'evento não possui coluna binária');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

select lives_ok($$
  insert into public.calendar_events (
    organization_id, title, event_type, starts_at, ends_at,
    client_id, client_location_id, equipment_id, maintenance_id
  ) values (
    current_setting('test.calendar_org_a')::uuid,
    'Visita com horário', 'technical_visit', '2026-09-21 13:00:00+00', '2026-09-21 14:00:00+00',
    'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001',
    'a1300000-0000-4000-8000-000000000001', 'a1400000-0000-4000-8000-000000000001'
  )
$$, 'owner cria evento com horário');
select set_config('test.timed_event_id', (select id::text from public.calendar_events where title = 'Visita com horário'), true);
select ok((select starts_at is not null and event_date is null from public.calendar_events where id = current_setting('test.timed_event_id')::uuid), 'evento com horário usa timestamptz');

select lives_ok($$
  insert into public.calendar_events (organization_id, title, event_type, is_all_day, event_date)
  values (current_setting('test.calendar_org_a')::uuid, 'Lembrete de dia inteiro', 'reminder', true, '2026-09-22')
$$, 'owner cria evento de dia inteiro sem vínculos');
select set_config('test.all_day_event_id', (select id::text from public.calendar_events where title = 'Lembrete de dia inteiro'), true);
select is((select event_date from public.calendar_events where id = current_setting('test.all_day_event_id')::uuid), '2026-09-22'::date, 'dia inteiro preserva a data civil');

select lives_ok($$
  insert into public.calendar_events (organization_id, title, event_type, starts_at)
  values (current_setting('test.calendar_org_a')::uuid, 'Limite do fuso', 'meeting', '2026-09-21 02:30:00+00')
$$, 'evento próximo da meia-noite é aceito');
select set_config('test.boundary_event_id', (select id::text from public.calendar_events where title = 'Limite do fuso'), true);
select is((select count(*) from public.search_calendar_events(current_setting('test.calendar_org_a')::uuid, 'Limite', '2026-09-20', '2026-09-20', null, null, null, null)), 1::bigint, 'busca diária usa America/Sao_Paulo');
select is((select count(*) from public.search_calendar_events(current_setting('test.calendar_org_a')::uuid, 'Lembrete', '2026-09-22', '2026-09-22', null, null, null, null)), 1::bigint, 'busca mantém evento de dia inteiro na data escolhida');

select lives_ok($$ update public.calendar_events set title = 'Visita atualizada' where id = current_setting('test.timed_event_id')::uuid $$, 'owner edita evento agendado');
select throws_like($$
  insert into public.calendar_events (organization_id, title, event_type, is_all_day, event_date, client_id, client_location_id)
  values (current_setting('test.calendar_org_a')::uuid, 'Unidade inválida', 'inspection', true, '2026-09-23', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000002')
$$, '%unidade selecionada não pertence%', 'bloqueia unidade de outro cliente');
select throws_ok($$
  insert into public.calendar_events (organization_id, title, event_type, is_all_day, event_date, client_id)
  values (current_setting('test.calendar_org_a')::uuid, 'Cliente externo', 'meeting', true, '2026-09-23', 'a2100000-0000-4000-8000-000000000001')
$$, '55000', null, 'validação bloqueia cliente cross-tenant');
select throws_like($$
  insert into public.calendar_events (organization_id, title, event_type, is_all_day, event_date, maintenance_id, client_id)
  values (current_setting('test.calendar_org_a')::uuid, 'OS incompatível', 'technical_visit', true, '2026-09-23', 'a1400000-0000-4000-8000-000000000001', 'a1100000-0000-4000-8000-000000000002')
$$, '%cliente deve corresponder%', 'bloqueia vínculo incompatível com OS');

select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.calendar_events), 3::bigint, 'technician ativo lê eventos do tenant');
select throws_like($$
  insert into public.calendar_events (organization_id, title, event_type, is_all_day, event_date)
  values (current_setting('test.calendar_org_a')::uuid, 'Tentativa técnica', 'other', true, '2026-09-24')
$$, '%row-level security%', 'technician não cria evento');
select lives_ok($$ update public.calendar_events set title = 'Tentativa' where id = current_setting('test.timed_event_id')::uuid $$, 'update sem linha visível não vaza erro ao technician');
select is((select title from public.calendar_events where id = current_setting('test.timed_event_id')::uuid), 'Visita atualizada', 'technician não altera o evento');

select set_config('request.jwt.claim.sub', 'a2000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.calendar_events), 0::bigint, 'outro tenant não lê eventos');
select throws_like($$ select * from public.search_calendar_events(current_setting('test.calendar_org_a')::uuid, null, null, null, null, null, null, null) $$, '%permissão%', 'RPC de busca bloqueia cross-tenant');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select * from public.complete_calendar_event(current_setting('test.calendar_org_a')::uuid, current_setting('test.timed_event_id')::uuid) $$, 'owner conclui evento pela RPC');
select is((select status from public.calendar_events where id = current_setting('test.timed_event_id')::uuid), 'completed', 'conclusão persiste status');
select ok((select completed_at is not null and completed_by = 'a1000000-0000-4000-8000-000000000001' from public.calendar_events where id = current_setting('test.timed_event_id')::uuid), 'conclusão registra auditoria');
select throws_like($$ update public.calendar_events set title = 'Edição indevida' where id = current_setting('test.timed_event_id')::uuid $$, '%somente leitura%', 'evento concluído fica imutável');
select throws_like($$ select * from public.complete_calendar_event(current_setting('test.calendar_org_a')::uuid, current_setting('test.timed_event_id')::uuid) $$, '%Somente eventos agendados%', 'evento não é concluído duas vezes');
select throws_like($$ select * from public.cancel_calendar_event(current_setting('test.calendar_org_a')::uuid, current_setting('test.all_day_event_id')::uuid, 'x') $$, '%entre 3 e 500%', 'cancelamento exige motivo');
select lives_ok($$ select * from public.cancel_calendar_event(current_setting('test.calendar_org_a')::uuid, current_setting('test.all_day_event_id')::uuid, 'Compromisso desmarcado') $$, 'owner cancela evento com motivo');
select is((select cancellation_reason from public.calendar_events where id = current_setting('test.all_day_event_id')::uuid), 'Compromisso desmarcado', 'motivo é preservado');
select throws_like($$ update public.calendar_events set description = 'Edição indevida' where id = current_setting('test.all_day_event_id')::uuid $$, '%somente leitura%', 'evento cancelado fica imutável');
select lives_ok($$ select public.archive_calendar_event(current_setting('test.calendar_org_a')::uuid, current_setting('test.boundary_event_id')::uuid) $$, 'owner arquiva logicamente');
select is((select count(*) from public.search_calendar_events(current_setting('test.calendar_org_a')::uuid, 'Limite', null, null, null, null, null, null)), 0::bigint, 'arquivado some da agenda padrão');

reset role;
select throws_like($$ delete from public.calendar_events where id = current_setting('test.timed_event_id')::uuid $$, '%não podem ser excluídos%', 'DELETE administrativo também é bloqueado');
select ok(not has_table_privilege('authenticated', 'public.calendar_events', 'DELETE'), 'authenticated não possui DELETE');
select ok(not has_table_privilege('anon', 'public.calendar_events', 'SELECT'), 'anon não possui SELECT');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000003', true);
select throws_like($$ select * from public.complete_calendar_event(current_setting('test.calendar_org_a')::uuid, current_setting('test.all_day_event_id')::uuid) $$, '%Somente o owner%', 'technician não conclui evento');
select throws_like($$ select public.archive_calendar_event(current_setting('test.calendar_org_a')::uuid, current_setting('test.all_day_event_id')::uuid) $$, '%Somente o owner%', 'technician não arquiva evento');

reset role;
select ok(not has_column_privilege('authenticated', 'public.calendar_events', 'status', 'UPDATE'), 'status não pode ser atualizado diretamente');
select ok((select is_all_day and starts_at is null from public.calendar_events where id = current_setting('test.all_day_event_id')::uuid), 'dia inteiro nunca armazena instante');
select throws_ok($$
  insert into public.calendar_events (organization_id, title, event_type, starts_at, ends_at, created_by, updated_by)
  values (current_setting('test.calendar_org_a')::uuid, 'Intervalo inválido', 'other', '2026-09-22 12:00+00', '2026-09-22 11:00+00', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001')
$$, '23514', null, 'término anterior ao início é bloqueado');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'calendar_events'), 3::bigint, 'tabela possui políticas mínimas de leitura e escrita');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select is((select count(*) from public.search_calendar_events(current_setting('test.calendar_org_a')::uuid, null, null, null, 'technical_visit', 'completed', null, null)), 1::bigint, 'busca combina tipo e status');
reset role;
select is((select count(*) from public.calendar_events), 3::bigint, 'arquivamento preserva o registro histórico');

select * from finish();
rollback;
