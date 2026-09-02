begin;

create extension if not exists pgtap with schema extensions;
select plan(54);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('81000000-0000-4000-8000-000000000001', 'payment-owner-a@test.local', '{"full_name":"Owner Financeiro A","organization_name":"Tenant Financeiro A"}'::jsonb),
  ('82000000-0000-4000-8000-000000000002', 'payment-owner-b@test.local', '{"full_name":"Owner Financeiro B","organization_name":"Tenant Financeiro B"}'::jsonb),
  ('83000000-0000-4000-8000-000000000003', 'payment-technician@test.local', '{"full_name":"Técnico Financeiro","organization_name":"Tenant Técnico Financeiro"}'::jsonb);

select set_config('test.payment_org_a', (select id::text from public.organizations where created_by = '81000000-0000-4000-8000-000000000001'), true);
select set_config('test.payment_org_b', (select id::text from public.organizations where created_by = '82000000-0000-4000-8000-000000000002'), true);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (current_setting('test.payment_org_a')::uuid, '83000000-0000-4000-8000-000000000003', 'technician', 'active', '81000000-0000-4000-8000-000000000001');

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  ('81100000-0000-4000-8000-000000000001', current_setting('test.payment_org_a')::uuid, 'Academia Receita A', '81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001'),
  ('82100000-0000-4000-8000-000000000001', current_setting('test.payment_org_b')::uuid, 'Academia Receita B', '82000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000002');

insert into public.equipment (id, organization_id, client_id, name, category, created_by, updated_by)
values
  ('81300000-0000-4000-8000-000000000001', current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', 'Esteira Receita A', 'Cardio', '81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001'),
  ('82300000-0000-4000-8000-000000000001', current_setting('test.payment_org_b')::uuid, '82100000-0000-4000-8000-000000000001', 'Esteira Receita B', 'Cardio', '82000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000002');

insert into public.maintenances (
  id, organization_id, client_id, equipment_id, work_order_number,
  maintenance_type, scheduled_at, diagnosis, service_performed,
  responsible_technician_id, total_amount, created_by, updated_by
)
values
  ('81500000-0000-4000-8000-000000000001', current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81300000-0000-4000-8000-000000000001', 'OS-PAG-001', 'corrective', now(), 'Diagnóstico financeiro', 'Serviço financeiro', '81000000-0000-4000-8000-000000000001', 1000, '81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001'),
  ('81500000-0000-4000-8000-000000000002', current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81300000-0000-4000-8000-000000000001', 'OS-PAG-002', 'preventive', now(), null, null, '81000000-0000-4000-8000-000000000001', 200, '81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001'),
  ('82500000-0000-4000-8000-000000000001', current_setting('test.payment_org_b')::uuid, '82100000-0000-4000-8000-000000000001', '82300000-0000-4000-8000-000000000001', 'OS-PAG-B01', 'preventive', now(), null, null, '82000000-0000-4000-8000-000000000002', 500, '82000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000002');

select is((select relrowsecurity from pg_class where oid = 'public.payments'::regclass), true, 'RLS está habilitada em payments');
select has_table('public', 'payments', 'tabela payments foi criada');

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method, status, due_date, notes)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000001', 400, 'pix', 'pending', '2026-09-10', 'Primeira parcela') $$,
  'owner registra pagamento parcial pendente'
);
select lives_ok(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method, status, paid_at, notes)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000001', 300, 'credit_card', 'received', '2026-08-10 12:00:00+00', 'Entrada recebida') $$,
  'owner registra pagamento parcial já recebido'
);
select is((select count(*) from public.payments), 2::bigint, 'múltiplos pagamentos pertencem à mesma OS');
select is((select sum(amount) from public.payments where status in ('pending', 'received')), 700.00::numeric, 'soma ativa inclui pendente e recebido');
select is((select total_received from public.get_received_revenue(current_setting('test.payment_org_a')::uuid, null, null)), 300.00::numeric, 'faturamento soma somente pagamentos recebidos');
select is((select payment_count from public.get_received_revenue(current_setting('test.payment_org_a')::uuid, null, null)), 1::bigint, 'pagamento pendente não entra na contagem de faturamento');
select is((select balance_amount from public.get_maintenance_payment_summary(current_setting('test.payment_org_a')::uuid, '81500000-0000-4000-8000-000000000001')), 700.00::numeric, 'saldo a receber desconta apenas valores recebidos');
select is((select pending_total from public.get_maintenance_payment_summary(current_setting('test.payment_org_a')::uuid, '81500000-0000-4000-8000-000000000001')), 400.00::numeric, 'resumo separa pagamentos pendentes');

select throws_like(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000001', 301, 'cash') $$,
  '%ultrapassar o valor da OS%', 'banco bloqueia soma ativa acima do valor informado'
);
select throws_like(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method, status)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000001', 10, 'pix', 'received') $$,
  '%payments_status_audit_check%', 'pagamento recebido exige paid_at'
);
select throws_like(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method, status, paid_at)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000001', 10, 'pix', 'pending', now()) $$,
  '%payments_status_audit_check%', 'pagamento pendente não aceita paid_at'
);
select throws_like(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000001', 0, 'cash') $$,
  '%payments_amount_check%', 'valor de pagamento deve ser positivo'
);
select throws_like(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000001', 10, 'crypto') $$,
  '%payments_method_check%', 'método fora da lista é rejeitado'
);
select throws_like(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method)
     values (current_setting('test.payment_org_b')::uuid, '82100000-0000-4000-8000-000000000001', '82500000-0000-4000-8000-000000000001', 10, 'cash') $$,
  '%row-level security%', 'RLS bloqueia criação em organização externa'
);
select throws_like(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method)
     values (current_setting('test.payment_org_a')::uuid, '82100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000001', 10, 'cash') $$,
  '%Manutenção e cliente%', 'FK e trigger bloqueiam cliente cross-tenant'
);

select set_config('test.pending_payment_id', (select id::text from public.payments where status = 'pending' and maintenance_id = '81500000-0000-4000-8000-000000000001'), true);
select set_config('test.received_payment_id', (select id::text from public.payments where status = 'received' and maintenance_id = '81500000-0000-4000-8000-000000000001'), true);

select lives_ok(
  $$ update public.payments set amount = 450 where id = current_setting('test.pending_payment_id')::uuid $$,
  'pagamento pendente pode ser corrigido sem exceder o teto'
);
select is((select active_total from public.get_maintenance_payment_summary(current_setting('test.payment_org_a')::uuid, '81500000-0000-4000-8000-000000000001')), 750.00::numeric, 'resumo atualiza a soma ativa após correção');
select throws_like(
  $$ update public.maintenances set total_amount = 700 where id = '81500000-0000-4000-8000-000000000001' $$,
  '%abaixo dos pagamentos ativos%', 'valor da OS não pode ser reduzido abaixo dos pagamentos ativos'
);
select lives_ok(
  $$ select * from public.receive_payment(current_setting('test.payment_org_a')::uuid, current_setting('test.pending_payment_id')::uuid, '2026-08-20 15:00:00+00') $$,
  'RPC confirma recebimento pendente'
);
select is((select status from public.payments where id = current_setting('test.pending_payment_id')::uuid), 'received', 'pagamento passa para recebido');
select is((select paid_at from public.payments where id = current_setting('test.pending_payment_id')::uuid), '2026-08-20 15:00:00+00'::timestamptz, 'RPC preserva data real do recebimento');
select is((select total_received from public.get_received_revenue(current_setting('test.payment_org_a')::uuid, '2026-08-01', '2026-09-01')), 750.00::numeric, 'faturamento por paid_at respeita período');
select throws_like(
  $$ update public.payments set notes = 'Alteração indevida' where id = current_setting('test.pending_payment_id')::uuid $$,
  '%imutáveis%', 'pagamento recebido não pode ser editado livremente'
);
select throws_like(
  $$ select * from public.receive_payment(current_setting('test.payment_org_a')::uuid, current_setting('test.pending_payment_id')::uuid, now()) $$,
  '%Somente pagamentos pendentes%', 'recebimento não pode ser confirmado duas vezes'
);

select lives_ok(
  $$ select * from public.cancel_payment(current_setting('test.payment_org_a')::uuid, current_setting('test.received_payment_id')::uuid, 'Estorno acordado com o cliente') $$,
  'RPC cancela pagamento recebido com motivo'
);
select is((select status from public.payments where id = current_setting('test.received_payment_id')::uuid), 'cancelled', 'cancelamento preserva o registro com status');
select is((select cancellation_reason from public.payments where id = current_setting('test.received_payment_id')::uuid), 'Estorno acordado com o cliente', 'cancelamento preserva o motivo');
select is((select paid_at from public.payments where id = current_setting('test.received_payment_id')::uuid), '2026-08-10 12:00:00+00'::timestamptz, 'cancelamento preserva a data original de recebimento');
select is((select total_received from public.get_received_revenue(current_setting('test.payment_org_a')::uuid, null, null)), 450.00::numeric, 'cancelamento remove valor do faturamento confirmado');
select lives_ok(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method, status, paid_at)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000001', 550, 'bank_transfer', 'received', '2026-08-25 10:00:00+00') $$,
  'cancelamento libera teto para outro recebimento'
);
select is((select active_total from public.get_maintenance_payment_summary(current_setting('test.payment_org_a')::uuid, '81500000-0000-4000-8000-000000000001')), 1000.00::numeric, 'pagamentos ativos podem atingir exatamente o valor da OS');

select lives_ok(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method, status, due_date)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000002', 100, 'boleto', 'pending', '2026-09-15') $$,
  'segunda OS recebe cobrança pendente'
);
select set_config('test.second_pending_id', (select id::text from public.payments where maintenance_id = '81500000-0000-4000-8000-000000000002'), true);
select throws_like(
  $$ select * from public.cancel_payment(current_setting('test.payment_org_a')::uuid, current_setting('test.second_pending_id')::uuid, 'x') $$,
  '%entre 3 e 500%', 'cancelamento exige motivo rastreável'
);
select lives_ok(
  $$ select * from public.cancel_payment(current_setting('test.payment_org_a')::uuid, current_setting('test.second_pending_id')::uuid, 'Cobrança substituída') $$,
  'pagamento pendente pode ser cancelado'
);
select is((select paid_at from public.payments where id = current_setting('test.second_pending_id')::uuid), null::timestamptz, 'cancelamento de pendência não inventa paid_at');

select is((select count(*) from public.search_payments(current_setting('test.payment_org_a')::uuid, 'Receita A', null, null, null, null, null)), 4::bigint, 'busca financeira encontra pagamentos pelo cliente');
select is((select count(*) from public.search_payments(current_setting('test.payment_org_a')::uuid, null, '2026-08-01', '2026-09-01', null, 'bank_transfer', 'received')), 1::bigint, 'filtros financeiros combinam período, método e status');
select is((select count(*) from public.search_payments(current_setting('test.payment_org_a')::uuid, 'OS-PAG-002', null, null, '81100000-0000-4000-8000-000000000001', null, 'cancelled')), 1::bigint, 'busca e filtro por cliente/status localizam histórico cancelado');
select ok(position('for update' in lower(pg_get_functiondef('public.guard_payment_mutation()'::regprocedure))) > 0, 'trigger bloqueia a OS para serializar pagamentos concorrentes');

select set_config('request.jwt.claim.sub', '83000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.payments), 4::bigint, 'technician ativo visualiza financeiro do tenant');
select lives_ok(
  $$ insert into public.payments (organization_id, client_id, maintenance_id, amount, method, status, paid_at)
     values (current_setting('test.payment_org_a')::uuid, '81100000-0000-4000-8000-000000000001', '81500000-0000-4000-8000-000000000002', 50, 'cash', 'received', now()) $$,
  'technician ativo registra recebimento no próprio tenant'
);

select set_config('request.jwt.claim.sub', '82000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.payments), 0::bigint, 'segundo tenant não lê pagamentos do primeiro');
select throws_like(
  $$ select * from public.get_received_revenue(current_setting('test.payment_org_a')::uuid, null, null) $$,
  '%permissão%', 'RPC de faturamento bloqueia consulta cross-tenant'
);
select throws_like(
  $$ select * from public.cancel_payment(current_setting('test.payment_org_a')::uuid, current_setting('test.pending_payment_id')::uuid, 'Tentativa externa') $$,
  '%permissão%', 'RPC de cancelamento bloqueia tenant externo'
);

reset role;
select throws_like(
  $$ update public.payments set amount = 1 where id = current_setting('test.received_payment_id')::uuid $$,
  '%imutáveis%', 'trigger protege pagamento cancelado até contra edição administrativa'
);
select throws_like(
  $$ delete from public.payments where id = current_setting('test.received_payment_id')::uuid $$,
  '%não podem ser excluídos%', 'trigger bloqueia DELETE administrativo do histórico financeiro'
);
select ok(not has_table_privilege('anon', 'public.payments', 'SELECT'), 'anon não lê pagamentos');
select ok(not has_table_privilege('authenticated', 'public.payments', 'DELETE'), 'frontend não possui DELETE direto');
select ok(not has_column_privilege('authenticated', 'public.payments', 'status', 'UPDATE'), 'frontend não altera status diretamente');
select ok(not has_column_privilege('authenticated', 'public.payments', 'paid_at', 'UPDATE'), 'frontend não altera paid_at diretamente');
select ok(not has_function_privilege('authenticated', 'public.guard_payment_mutation()', 'EXECUTE'), 'frontend não executa trigger de proteção');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'payments'), 3::bigint, 'payments possui políticas mínimas de leitura, criação e atualização');

select * from finish();
rollback;
