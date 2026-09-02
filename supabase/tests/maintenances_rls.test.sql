begin;

create extension if not exists pgtap with schema extensions;
select plan(59);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '61000000-0000-4000-8000-000000000001',
    'maintenance-owner-a@test.local',
    '{"full_name":"Owner Manutenções A","organization_name":"Tenant Manutenções A"}'::jsonb
  ),
  (
    '62000000-0000-4000-8000-000000000002',
    'maintenance-owner-b@test.local',
    '{"full_name":"Owner Manutenções B","organization_name":"Tenant Manutenções B"}'::jsonb
  ),
  (
    '63000000-0000-4000-8000-000000000003',
    'maintenance-technician@test.local',
    '{"full_name":"Técnico de Campo","organization_name":"Tenant Técnico"}'::jsonb
  );

select set_config(
  'test.maintenance_org_a',
  (select id::text from public.organizations where created_by = '61000000-0000-4000-8000-000000000001'),
  true
);
select set_config(
  'test.maintenance_org_b',
  (select id::text from public.organizations where created_by = '62000000-0000-4000-8000-000000000002'),
  true
);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (
  current_setting('test.maintenance_org_a')::uuid,
  '63000000-0000-4000-8000-000000000003',
  'technician',
  'active',
  '61000000-0000-4000-8000-000000000001'
);

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  (
    '61100000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_a')::uuid,
    'Academia Atlas',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '61100000-0000-4000-8000-000000000002',
    current_setting('test.maintenance_org_a')::uuid,
    'Clube Orion',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '62100000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_b')::uuid,
    'Academia Externa',
    '62000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000002'
  );

insert into public.client_locations (
  id, organization_id, client_id, name, street, city, state, created_by, updated_by
)
values
  (
    '61200000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_a')::uuid,
    '61100000-0000-4000-8000-000000000001',
    'Unidade Centro', 'Rua A', 'Curitiba', 'PR',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '61200000-0000-4000-8000-000000000002',
    current_setting('test.maintenance_org_a')::uuid,
    '61100000-0000-4000-8000-000000000002',
    'Unidade Clube', 'Rua B', 'Curitiba', 'PR',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '62200000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_b')::uuid,
    '62100000-0000-4000-8000-000000000001',
    'Unidade Externa', 'Rua C', 'São Paulo', 'SP',
    '62000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000002'
  );

insert into public.equipment (
  id, organization_id, client_id, client_location_id, name, category, created_by, updated_by
)
values
  (
    '61300000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_a')::uuid,
    '61100000-0000-4000-8000-000000000001',
    '61200000-0000-4000-8000-000000000001',
    'Esteira Atlas 01', 'Cardio',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '61300000-0000-4000-8000-000000000002',
    current_setting('test.maintenance_org_a')::uuid,
    '61100000-0000-4000-8000-000000000002',
    '61200000-0000-4000-8000-000000000002',
    'Bike Orion 01', 'Cardio',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '62300000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_b')::uuid,
    '62100000-0000-4000-8000-000000000001',
    '62200000-0000-4000-8000-000000000001',
    'Esteira Externa', 'Cardio',
    '62000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000002'
  );

insert into public.inventory_items (
  id, organization_id, name, sku, unit_of_measure, minimum_stock,
  average_unit_cost, created_by, updated_by
)
values
  (
    '61400000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_a')::uuid,
    'Correia de tração', 'MAN-A1', 'unidade', 2, 0,
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '61400000-0000-4000-8000-000000000002',
    current_setting('test.maintenance_org_a')::uuid,
    'Sensor de velocidade', 'MAN-A2', 'unidade', 1, 0,
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '62400000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_b')::uuid,
    'Peça externa', 'MAN-B1', 'unidade', 1, 0,
    '62000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000002'
  );

insert into public.maintenances (
  id, organization_id, client_id, client_location_id, equipment_id,
  work_order_number, maintenance_type, status, scheduled_at,
  diagnosis, service_performed, responsible_technician_id,
  created_by, updated_by
)
values
  (
    '61500000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_a')::uuid,
    '61100000-0000-4000-8000-000000000001',
    '61200000-0000-4000-8000-000000000001',
    '61300000-0000-4000-8000-000000000001',
    'OS-TESTE-001', 'corrective', 'in_progress', now(),
    'Correia desgastada', 'Substituição e regulagem',
    '63000000-0000-4000-8000-000000000003',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '61500000-0000-4000-8000-000000000002',
    current_setting('test.maintenance_org_a')::uuid,
    '61100000-0000-4000-8000-000000000001',
    '61200000-0000-4000-8000-000000000001',
    '61300000-0000-4000-8000-000000000001',
    'OS-TESTE-002', 'corrective', 'draft', now(),
    'Falha intermitente', 'Troca de componentes',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '61500000-0000-4000-8000-000000000003',
    current_setting('test.maintenance_org_a')::uuid,
    '61100000-0000-4000-8000-000000000002',
    '61200000-0000-4000-8000-000000000002',
    '61300000-0000-4000-8000-000000000002',
    'OS-TESTE-003', 'preventive', 'draft', now(), null, null,
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '62500000-0000-4000-8000-000000000001',
    current_setting('test.maintenance_org_b')::uuid,
    '62100000-0000-4000-8000-000000000001',
    '62200000-0000-4000-8000-000000000001',
    '62300000-0000-4000-8000-000000000001',
    'OS-EXTERNA-001', 'preventive', 'draft', now(), null, null,
    '62000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000002'
  );

select is(
  (select relrowsecurity from pg_class where oid = 'public.maintenances'::regclass),
  true,
  'RLS está habilitada em maintenances'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.maintenance_parts'::regclass),
  true,
  'RLS está habilitada em maintenance_parts'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.maintenances), 3::bigint, 'owner visualiza somente OS do próprio tenant');

select lives_ok(
  $$
    insert into public.maintenances (
      organization_id, client_id, client_location_id, equipment_id,
      maintenance_type, scheduled_at, responsible_technician_id
    ) values (
      current_setting('test.maintenance_org_a')::uuid,
      '61100000-0000-4000-8000-000000000001',
      '61200000-0000-4000-8000-000000000001',
      '61300000-0000-4000-8000-000000000001',
      'preventive', now(), '61000000-0000-4000-8000-000000000001'
    )
  $$,
  'owner cria rascunho no próprio tenant'
);

select ok(
  (select work_order_number like 'OS-%' from public.maintenances order by created_at desc limit 1),
  'banco gera número de OS automaticamente'
);

select lives_ok(
  $$
    update public.maintenances
    set diagnosis = 'Inspeção inicial', status = 'in_progress'
    where id = '61500000-0000-4000-8000-000000000003'
  $$,
  'rascunho pode ser iniciado e editado'
);

select throws_like(
  $$
    update public.maintenances
    set status = 'draft'
    where id = '61500000-0000-4000-8000-000000000003'
  $$,
  '%não pode voltar%',
  'OS em andamento não volta para rascunho'
);

select throws_like(
  format(
    'insert into public.maintenances (organization_id, client_id, client_location_id, equipment_id, maintenance_type, scheduled_at, responsible_technician_id) values (%L, %L, %L, %L, %L, now(), %L)',
    current_setting('test.maintenance_org_a'),
    '61100000-0000-4000-8000-000000000001',
    '61200000-0000-4000-8000-000000000001',
    '62300000-0000-4000-8000-000000000001',
    'corrective',
    '61000000-0000-4000-8000-000000000001'
  ),
  '%Equipamento não encontrado%',
  'banco impede equipamento cross-tenant'
);

select lives_ok(
  $$
    insert into public.maintenances (
      organization_id, client_id, client_location_id, equipment_id,
      maintenance_type, scheduled_at, responsible_technician_id
    ) values (
      current_setting('test.maintenance_org_a')::uuid,
      '61100000-0000-4000-8000-000000000002',
      '61200000-0000-4000-8000-000000000002',
      '61300000-0000-4000-8000-000000000001',
      'corrective', now(), '61000000-0000-4000-8000-000000000001'
    )
  $$,
  'OS define cliente e unidade independentemente do equipamento geral'
);

select throws_like(
  $$
    insert into public.maintenances (
      organization_id, client_id, client_location_id, equipment_id,
      maintenance_type, scheduled_at, responsible_technician_id
    ) values (
      current_setting('test.maintenance_org_b')::uuid,
      '62100000-0000-4000-8000-000000000001',
      '62200000-0000-4000-8000-000000000001',
      '62300000-0000-4000-8000-000000000001',
      'preventive', now(), '62000000-0000-4000-8000-000000000002'
    )
  $$,
  '%não encontrado%',
  'tenant externo é ocultado e não pode receber criação'
);

select lives_ok(
  $$ select * from public.record_inventory_movement(
    current_setting('test.maintenance_org_a')::uuid,
    '61400000-0000-4000-8000-000000000001',
    'entry', 10, 'Carga para manutenção', 5
  ) $$,
  'entrada prepara saldo do primeiro item'
);
select lives_ok(
  $$ select * from public.record_inventory_movement(
    current_setting('test.maintenance_org_a')::uuid,
    '61400000-0000-4000-8000-000000000002',
    'entry', 1, 'Carga para manutenção', 7
  ) $$,
  'entrada prepara saldo do segundo item'
);

select lives_ok(
  $$
    insert into public.maintenance_parts (
      organization_id, maintenance_id, inventory_item_id, quantity
    ) values (
      current_setting('test.maintenance_org_a')::uuid,
      '61500000-0000-4000-8000-000000000001',
      '61400000-0000-4000-8000-000000000001', 3
    )
  $$,
  'membro adiciona peça em OS aberta'
);

select lives_ok(
  $$
    insert into public.maintenance_parts (
      organization_id, maintenance_id, inventory_item_id, quantity
    ) values
      (
        current_setting('test.maintenance_org_a')::uuid,
        '61500000-0000-4000-8000-000000000002',
        '61400000-0000-4000-8000-000000000001', 8
      ),
      (
        current_setting('test.maintenance_org_a')::uuid,
        '61500000-0000-4000-8000-000000000002',
        '61400000-0000-4000-8000-000000000002', 2
      )
  $$,
  'OS de teste recebe múltiplas peças'
);

select throws_like(
  $$
    insert into public.maintenance_parts (
      organization_id, maintenance_id, inventory_item_id, quantity
    ) values (
      current_setting('test.maintenance_org_a')::uuid,
      '61500000-0000-4000-8000-000000000002',
      '62400000-0000-4000-8000-000000000001', 1
    )
  $$,
  '%item de estoque ativo%',
  'peça de outro tenant não pode ser associada'
);

select lives_ok(
  $$ select * from public.complete_maintenance(
    current_setting('test.maintenance_org_a')::uuid,
    '61500000-0000-4000-8000-000000000001'
  ) $$,
  'RPC conclui OS com saldo suficiente'
);

select is(
  (select status from public.maintenances where id = '61500000-0000-4000-8000-000000000001'),
  'completed',
  'conclusão marca a manutenção como concluída'
);
select is(
  (select current_quantity from public.inventory_items where id = '61400000-0000-4000-8000-000000000001'),
  7.000::numeric,
  'conclusão baixa a quantidade consumida'
);
select is(
  (select unit_cost_snapshot from public.maintenance_parts where maintenance_id = '61500000-0000-4000-8000-000000000001'),
  5.0000::numeric,
  'conclusão congela o custo unitário vigente'
);
select is(
  (select total_cost_snapshot from public.maintenance_parts where maintenance_id = '61500000-0000-4000-8000-000000000001'),
  15.0000::numeric,
  'conclusão congela o custo total da peça'
);
select is(
  (select count(*) from public.inventory_movements
   where maintenance_id = '61500000-0000-4000-8000-000000000001'
     and movement_type = 'maintenance_use'),
  1::bigint,
  'conclusão cria movimento de uso rastreável'
);
select is(
  (select quantity_delta from public.inventory_movements
   where maintenance_id = '61500000-0000-4000-8000-000000000001'),
  (-3.000)::numeric,
  'movimento registra consumo negativo'
);
select ok(
  (select inventory_movement_id is not null from public.maintenance_parts
   where maintenance_id = '61500000-0000-4000-8000-000000000001'),
  'snapshot referencia o movimento que consumiu o estoque'
);

select throws_like(
  $$ select * from public.complete_maintenance(
    current_setting('test.maintenance_org_a')::uuid,
    '61500000-0000-4000-8000-000000000002'
  ) $$,
  '%Saldo insuficiente%',
  'saldo insuficiente aborta a conclusão'
);
select is(
  (select status from public.maintenances where id = '61500000-0000-4000-8000-000000000002'),
  'draft',
  'falha mantém a OS em rascunho'
);
select is(
  (select current_quantity from public.inventory_items where id = '61400000-0000-4000-8000-000000000001'),
  7.000::numeric,
  'falha não persiste consumo parcial do primeiro item'
);
select is(
  (select current_quantity from public.inventory_items where id = '61400000-0000-4000-8000-000000000002'),
  1.000::numeric,
  'falha preserva o item sem saldo suficiente'
);
select is(
  (select count(*) from public.inventory_movements where maintenance_id = '61500000-0000-4000-8000-000000000002'),
  0::bigint,
  'falha não cria movimentos parciais'
);
select is(
  (select count(*) from public.maintenance_parts
   where maintenance_id = '61500000-0000-4000-8000-000000000002'
     and unit_cost_snapshot is not null),
  0::bigint,
  'falha não congela snapshots parciais'
);

select ok(
  position(
    'for update of inventory_items' in lower(pg_get_functiondef(
      'public.complete_maintenance(uuid, uuid)'::regprocedure
    ))
  ) > 0,
  'RPC bloqueia itens para serializar consumos concorrentes'
);
select ok(
  position(
    'order by inventory_items.id' in lower(pg_get_functiondef(
      'public.complete_maintenance(uuid, uuid)'::regprocedure
    ))
  ) > 0,
  'RPC bloqueia múltiplos itens em ordem determinística'
);

select lives_ok(
  $$ update public.maintenance_parts set quantity = 4
     where maintenance_id = '61500000-0000-4000-8000-000000000001' $$,
  'RLS ignora tentativa de alterar peça concluída'
);
select is(
  (select quantity from public.maintenance_parts
   where maintenance_id = '61500000-0000-4000-8000-000000000001'),
  3.000::numeric,
  'quantidade concluída permanece imutável'
);
select lives_ok(
  $$ delete from public.maintenance_parts
     where maintenance_id = '61500000-0000-4000-8000-000000000001' $$,
  'RLS ignora tentativa de remover peça concluída'
);
select is(
  (select count(*) from public.maintenance_parts
   where maintenance_id = '61500000-0000-4000-8000-000000000001'),
  1::bigint,
  'peça concluída permanece no histórico'
);
select throws_like(
  $$ insert into public.maintenance_parts (
       organization_id, maintenance_id, inventory_item_id, quantity
     ) values (
       current_setting('test.maintenance_org_a')::uuid,
       '61500000-0000-4000-8000-000000000001',
       '61400000-0000-4000-8000-000000000002', 1
     ) $$,
  '%Manutenção não encontrada%',
  'membro não adiciona peça em OS concluída'
);

select lives_ok(
  $$ select * from public.cancel_maintenance(
    current_setting('test.maintenance_org_a')::uuid,
    '61500000-0000-4000-8000-000000000003',
    'Cliente indisponível para atendimento'
  ) $$,
  'cancelamento com motivo é registrado'
);
select is(
  (select status from public.maintenances where id = '61500000-0000-4000-8000-000000000003'),
  'cancelled',
  'RPC marca a manutenção como cancelada'
);
select is(
  (select cancellation_reason from public.maintenances where id = '61500000-0000-4000-8000-000000000003'),
  'Cliente indisponível para atendimento',
  'cancelamento preserva o motivo'
);
select is(
  (select count(*) from public.inventory_movements where maintenance_id = '61500000-0000-4000-8000-000000000003'),
  0::bigint,
  'cancelamento não movimenta estoque'
);

select throws_like(
  $$ select * from public.cancel_maintenance(
    current_setting('test.maintenance_org_a')::uuid,
    '61500000-0000-4000-8000-000000000002', 'x'
  ) $$,
  '%entre 3 e 500%',
  'cancelamento exige motivo válido'
);

select is(
  (select count(*) from public.search_maintenances(
    current_setting('test.maintenance_org_a')::uuid,
    'Atlas', null, null, null, null, null
  )),
  4::bigint,
  'busca encontra OS pelo cliente e equipamento'
);
select is(
  (select count(*) from public.search_maintenances(
    current_setting('test.maintenance_org_a')::uuid,
    null, null, null, 'corrective', 'completed', null
  )),
  1::bigint,
  'filtros de tipo e status retornam a OS concluída'
);
select is(
  (select count(*) from public.search_maintenances(
    current_setting('test.maintenance_org_a')::uuid,
    null, null, null, null, null, '61300000-0000-4000-8000-000000000001'
  )),
  4::bigint,
  'filtro por equipamento alimenta o histórico real'
);

select set_config('request.jwt.claim.sub', '63000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.maintenances), 5::bigint, 'technician ativo visualiza OS do tenant');
select is(
  (select count(*) from public.get_organization_technicians(current_setting('test.maintenance_org_a')::uuid)),
  2::bigint,
  'technician consulta responsáveis ativos da organização'
);

select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.maintenances), 1::bigint, 'segundo tenant não visualiza OS do primeiro');
select is((select count(*) from public.maintenance_parts), 0::bigint, 'segundo tenant não visualiza peças do primeiro');
select throws_like(
  $$ select * from public.complete_maintenance(
    current_setting('test.maintenance_org_a')::uuid,
    '61500000-0000-4000-8000-000000000002'
  ) $$,
  '%permissão%',
  'RPC de conclusão bloqueia acesso cross-tenant'
);

select ok(not has_table_privilege('anon', 'public.maintenances', 'SELECT'), 'anon não lê manutenções');
select ok(not has_table_privilege('anon', 'public.maintenance_parts', 'SELECT'), 'anon não lê peças');
select ok(not has_table_privilege('authenticated', 'public.maintenances', 'DELETE'), 'membro não exclui OS diretamente');
select ok(not has_column_privilege('authenticated', 'public.maintenance_parts', 'unit_cost_snapshot', 'UPDATE'), 'membro não altera custo congelado');
select ok(not has_table_privilege('authenticated', 'public.inventory_movements', 'INSERT'), 'uso de peça não libera insert direto em movimentos');
select ok(not has_function_privilege('authenticated', 'public.guard_maintenance_mutation()', 'EXECUTE'), 'função de proteção não é executável pelo frontend');

reset role;

select throws_like(
  $$ update public.maintenances set notes = 'Alteração indevida'
     where id = '61500000-0000-4000-8000-000000000001' $$,
  '%imutável%',
  'trigger protege OS concluída até contra edição administrativa'
);
select throws_like(
  $$ delete from public.maintenance_parts
     where maintenance_id = '61500000-0000-4000-8000-000000000001' $$,
  '%imutáveis%',
  'trigger protege peças concluídas contra delete administrativo'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'maintenances'),
  3::bigint,
  'maintenances possui políticas mínimas'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'maintenance_parts'),
  4::bigint,
  'maintenance_parts possui políticas mínimas'
);

select * from finish();
rollback;
