begin;

create extension if not exists pgtap with schema extensions;
select plan(59);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '51000000-0000-4000-8000-000000000001',
    'inventory-owner-a@test.local',
    '{"full_name":"Owner Estoque A","organization_name":"Tenant Estoque A"}'::jsonb
  ),
  (
    '52000000-0000-4000-8000-000000000002',
    'inventory-owner-b@test.local',
    '{"full_name":"Owner Estoque B","organization_name":"Tenant Estoque B"}'::jsonb
  ),
  (
    '53000000-0000-4000-8000-000000000003',
    'inventory-technician@test.local',
    '{"full_name":"Técnico Estoque","organization_name":"Tenant Técnico Estoque"}'::jsonb
  );

select set_config(
  'test.inventory_org_a',
  (select id::text from public.organizations where created_by = '51000000-0000-4000-8000-000000000001'),
  true
);
select set_config(
  'test.inventory_org_b',
  (select id::text from public.organizations where created_by = '52000000-0000-4000-8000-000000000002'),
  true
);

insert into public.inventory_items (
  id, organization_id, name, sku, category, unit_of_measure,
  minimum_stock, average_unit_cost, created_by, updated_by
)
values
  (
    '51100000-0000-4000-8000-000000000001',
    current_setting('test.inventory_org_a')::uuid,
    'Correia A', 'SKU-A', 'Transmissão', 'unidade', 10, 0,
    '51000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000001'
  ),
  (
    '52100000-0000-4000-8000-000000000001',
    current_setting('test.inventory_org_b')::uuid,
    'Correia B', 'SKU-B', 'Transmissão', 'unidade', 5, 0,
    '52000000-0000-4000-8000-000000000002',
    '52000000-0000-4000-8000-000000000002'
  );

select is(public.inventory_stock_situation(0, 10), 'out_of_stock', 'saldo zero fica sem estoque');
select is(public.inventory_stock_situation(4, 10), 'critical', 'saldo até metade do mínimo fica crítico');
select is(public.inventory_stock_situation(8, 10), 'attention', 'saldo até o mínimo fica em atenção');
select is(public.inventory_stock_situation(11, 10), 'normal', 'saldo acima do mínimo fica normal');

select is(
  (select relrowsecurity from pg_class where oid = 'public.inventory_items'::regclass),
  true,
  'RLS está habilitada em inventory_items'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.inventory_movements'::regclass),
  true,
  'RLS está habilitada em inventory_movements'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.inventory_items), 1::bigint, 'owner visualiza somente item do próprio tenant');

select lives_ok(
  $$
    insert into public.inventory_items (
      organization_id, name, sku, category, unit_of_measure, minimum_stock
    ) values (
      current_setting('test.inventory_org_a')::uuid,
      'Placa eletrônica', 'SKU-A2', 'Elétrica', 'unidade', 2
    )
  $$,
  'owner cadastra item no próprio tenant'
);

select throws_like(
  $$
    insert into public.inventory_items (
      organization_id, name, unit_of_measure
    ) values (
      current_setting('test.inventory_org_b')::uuid,
      'Item invasor', 'unidade'
    )
  $$,
  '%row-level security%',
  'RLS impede cadastro em outro tenant'
);

select throws_like(
  $$
    insert into public.inventory_items (
      organization_id, name, sku, unit_of_measure
    ) values (
      current_setting('test.inventory_org_a')::uuid,
      'SKU duplicado', 'sku-a', 'unidade'
    )
  $$,
  '%inventory_items_organization_active_sku_uidx%',
  'SKU ativo é único por organização sem diferenciar maiúsculas'
);

select is(
  (select count(*) from public.search_inventory_items(
    current_setting('test.inventory_org_a')::uuid,
    'Correia', 'transmissão', 'out_of_stock'
  )),
  1::bigint,
  'busca e filtros retornam o item esperado'
);

select lives_ok(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'entry', 10, 'Compra inicial', 5
    )
  $$,
  'RPC registra entrada positiva'
);

select is(
  (select current_quantity from public.inventory_items where id = '51100000-0000-4000-8000-000000000001'),
  10.000::numeric,
  'entrada atualiza o saldo do item'
);
select is(
  (select count(*) from public.inventory_movements where inventory_item_id = '51100000-0000-4000-8000-000000000001'),
  1::bigint,
  'entrada grava um movimento'
);
select is(
  (select previous_quantity::text || '|' || resulting_quantity::text
   from public.inventory_movements
   where inventory_item_id = '51100000-0000-4000-8000-000000000001'),
  '0.000|10.000',
  'movimento registra saldos anterior e posterior'
);
select is(
  (select created_by from public.inventory_movements where inventory_item_id = '51100000-0000-4000-8000-000000000001'),
  '51000000-0000-4000-8000-000000000001'::uuid,
  'movimento registra o usuário responsável'
);
select is(
  (select average_unit_cost from public.inventory_items where id = '51100000-0000-4000-8000-000000000001'),
  5.0000::numeric,
  'primeira entrada define o custo médio'
);

select lives_ok(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'entry', 10, 'Reposição', 7
    )
  $$,
  'segunda entrada é registrada sequencialmente'
);
select is(
  (select current_quantity from public.inventory_items where id = '51100000-0000-4000-8000-000000000001'),
  20.000::numeric,
  'entradas consecutivas acumulam saldo sem perda'
);
select is(
  (select average_unit_cost from public.inventory_items where id = '51100000-0000-4000-8000-000000000001'),
  6.0000::numeric,
  'entrada recalcula custo médio ponderado'
);
select is(
  (select previous_quantity from public.inventory_movements
   where inventory_item_id = '51100000-0000-4000-8000-000000000001'
     and reason = 'Reposição'),
  10.000::numeric,
  'movimento consecutivo parte do saldo confirmado anterior'
);
select ok(
  position(
    'for update' in lower(pg_get_functiondef(
      'public.record_inventory_movement(uuid, uuid, text, numeric, text, numeric)'::regprocedure
    ))
  ) > 0,
  'RPC bloqueia a linha do item para impedir concorrência perdida'
);

select lives_ok(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'adjustment', -5, 'Contagem física', null
    )
  $$,
  'ajuste justificado reduz o saldo'
);
select is(
  (select current_quantity from public.inventory_items where id = '51100000-0000-4000-8000-000000000001'),
  15.000::numeric,
  'ajuste aplica a variação ao saldo'
);
select is(
  (select reason from public.inventory_movements
   where movement_type = 'adjustment'
   order by created_at desc, id desc limit 1),
  'Contagem física',
  'ajuste mantém motivo rastreável'
);

select throws_like(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'adjustment', 1, '', null
    )
  $$,
  '%motivo%',
  'ajuste sem motivo é rejeitado'
);
select throws_like(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'adjustment', -20, 'Erro de contagem', null
    )
  $$,
  '%Saldo insuficiente%',
  'RPC impede saldo negativo'
);
select is(
  (select current_quantity from public.inventory_items where id = '51100000-0000-4000-8000-000000000001'),
  15.000::numeric,
  'falha por saldo negativo não altera o item'
);
select is(
  (select count(*) from public.inventory_movements where inventory_item_id = '51100000-0000-4000-8000-000000000001'),
  3::bigint,
  'falha por saldo negativo não cria movimento'
);
select throws_like(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'entry', -1, 'Entrada inválida', 2
    )
  $$,
  '%quantidade positiva%',
  'entrada negativa é rejeitada'
);

select ok(not has_table_privilege('anon', 'public.inventory_items', 'SELECT'), 'anon não lê itens');
select ok(not has_table_privilege('anon', 'public.inventory_movements', 'SELECT'), 'anon não lê movimentos');
select ok(not has_table_privilege('authenticated', 'public.inventory_items', 'DELETE'), 'membro não exclui itens');
select ok(not has_table_privilege('authenticated', 'public.inventory_movements', 'DELETE'), 'membro não exclui movimentos');
select ok(not has_table_privilege('authenticated', 'public.inventory_movements', 'INSERT'), 'membro não insere movimentos diretamente');
select ok(not has_table_privilege('authenticated', 'public.inventory_movements', 'UPDATE'), 'membro não altera movimentos');
select ok(
  not has_column_privilege('authenticated', 'public.inventory_items', 'current_quantity', 'UPDATE'),
  'membro não altera saldo diretamente'
);

select lives_ok(
  $$
    insert into public.organization_members (organization_id, user_id, role, status)
    values (
      current_setting('test.inventory_org_a')::uuid,
      '53000000-0000-4000-8000-000000000003', 'technician', 'active'
    )
  $$,
  'owner adiciona technician ao tenant'
);

select set_config('request.jwt.claim.sub', '53000000-0000-4000-8000-000000000003', true);
select is(
  (select count(*) from public.inventory_items where organization_id = current_setting('test.inventory_org_a')::uuid),
  2::bigint,
  'technician ativo visualiza estoque compartilhado'
);
select lives_ok(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'adjustment', 2, 'Correção pelo técnico', null
    )
  $$,
  'technician ativo registra ajuste'
);
select is(
  (select created_by from public.inventory_movements
   where movement_type = 'adjustment'
     and reason = 'Correção pelo técnico'),
  '53000000-0000-4000-8000-000000000003'::uuid,
  'ajuste registra o technician responsável'
);
select is(
  (select count(*) from public.get_inventory_movements(
    current_setting('test.inventory_org_a')::uuid,
    '51100000-0000-4000-8000-000000000001'
  )),
  4::bigint,
  'technician consulta histórico do tenant compartilhado'
);

select set_config('request.jwt.claim.sub', '52000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.inventory_items), 1::bigint, 'segundo tenant não visualiza itens do primeiro');
select is((select count(*) from public.inventory_movements), 0::bigint, 'segundo tenant não visualiza movimentos do primeiro');
select throws_like(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'entry', 1, 'Tentativa invasora', 1
    )
  $$,
  '%permissão%',
  'RPC impede movimentação cross-tenant'
);
select throws_like(
  $$
    select * from public.get_inventory_movements(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001'
    )
  $$,
  '%permissão%',
  'RPC de histórico impede leitura cross-tenant'
);

select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$ update public.inventory_items set status = 'inactive' where id = '51100000-0000-4000-8000-000000000001' $$,
  'membro pode inativar item'
);
select throws_like(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'entry', 1, 'Item inativo', 1
    )
  $$,
  '%precisa estar ativo%',
  'item inativo não recebe movimento'
);
select lives_ok(
  $$ update public.inventory_items set status = 'active' where id = '51100000-0000-4000-8000-000000000001' $$,
  'item pode ser reativado antes de movimentar'
);
select lives_ok(
  $$ update public.inventory_items set deleted_at = now() where id = '51100000-0000-4000-8000-000000000001' $$,
  'item é arquivado por soft delete'
);
select is(
  (select deleted_by from public.inventory_items where id = '51100000-0000-4000-8000-000000000001'),
  '51000000-0000-4000-8000-000000000001'::uuid,
  'arquivamento registra o usuário responsável'
);
select throws_like(
  $$
    select * from public.record_inventory_movement(
      current_setting('test.inventory_org_a')::uuid,
      '51100000-0000-4000-8000-000000000001',
      'entry', 1, 'Item arquivado', 1
    )
  $$,
  '%não encontrado%',
  'item arquivado não recebe movimento'
);

reset role;

select throws_like(
  $$ update public.inventory_items set current_quantity = 99 where id = '52100000-0000-4000-8000-000000000001' $$,
  '%somente pode ser alterado%',
  'trigger impede alteração administrativa de saldo sem movimento'
);
select throws_like(
  $$ update public.inventory_movements set reason = 'Alterado' where inventory_item_id = '51100000-0000-4000-8000-000000000001' $$,
  '%imutáveis%',
  'trigger impede alteração administrativa de movimento'
);
select throws_like(
  $$ delete from public.inventory_movements where inventory_item_id = '51100000-0000-4000-8000-000000000001' $$,
  '%imutáveis%',
  'trigger impede exclusão administrativa de movimento'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'inventory_items'),
  3::bigint,
  'inventory_items possui políticas mínimas'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'inventory_movements'),
  1::bigint,
  'inventory_movements possui somente política de leitura'
);
select ok(
  not has_function_privilege('authenticated', 'public.set_inventory_item_audit()', 'EXECUTE'),
  'membro não executa diretamente auditoria de item'
);
select ok(
  not has_function_privilege('authenticated', 'public.prevent_inventory_movement_mutation()', 'EXECUTE'),
  'membro não executa diretamente trigger de imutabilidade'
);

select * from finish();
rollback;
