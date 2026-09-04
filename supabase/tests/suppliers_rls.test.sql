begin;

create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('b1000000-0000-4000-8000-000000000001', 'supplier-owner-a@test.local', '{"full_name":"Owner Fornecedor A","organization_name":"Tenant Fornecedor A"}'::jsonb),
  ('b2000000-0000-4000-8000-000000000002', 'supplier-owner-b@test.local', '{"full_name":"Owner Fornecedor B","organization_name":"Tenant Fornecedor B"}'::jsonb),
  ('b3000000-0000-4000-8000-000000000003', 'supplier-technician@test.local', '{"full_name":"Técnico Fornecedor","organization_name":"Tenant Técnico Fornecedor"}'::jsonb);

select set_config('test.supplier_org_a', (select id::text from public.organizations where created_by = 'b1000000-0000-4000-8000-000000000001'), true);
select set_config('test.supplier_org_b', (select id::text from public.organizations where created_by = 'b2000000-0000-4000-8000-000000000002'), true);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (current_setting('test.supplier_org_a')::uuid, 'b3000000-0000-4000-8000-000000000003', 'technician', 'active', 'b1000000-0000-4000-8000-000000000001');

insert into public.suppliers (id, organization_id, legal_name, trade_name, tax_id, status, created_by, updated_by)
values
  ('b1100000-0000-4000-8000-000000000001', current_setting('test.supplier_org_a')::uuid, 'Peças Fitness A Ltda', 'Peças A', '12.345.678/0001-90', 'active', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001'),
  ('b1100000-0000-4000-8000-000000000002', current_setting('test.supplier_org_a')::uuid, 'Fornecedor Inativo A', null, null, 'inactive', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001'),
  ('b2100000-0000-4000-8000-000000000001', current_setting('test.supplier_org_b')::uuid, 'Peças Fitness B Ltda', 'Peças B', '98.765.432/0001-10', 'active', 'b2000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002');

select is((select relrowsecurity from pg_class where oid = 'public.suppliers'::regclass), true, 'RLS está habilitada em suppliers');
select ok(not has_table_privilege('anon', 'public.suppliers', 'SELECT'), 'anon não lê fornecedores');
select ok(not has_table_privilege('authenticated', 'public.suppliers', 'DELETE'), 'frontend não recebe DELETE de fornecedores');
select has_column('public', 'inventory_items', 'supplier_id', 'estoque possui fornecedor opcional');
select ok(exists(
  select 1 from pg_constraint
  where conname = 'inventory_items_supplier_organization_fk'
    and contype = 'f'
), 'FK composta de fornecedor foi criada');
select ok(has_function_privilege('authenticated', 'public.search_inventory_items(uuid,text,text,text,uuid)', 'EXECUTE'), 'membro autenticado executa busca de estoque por fornecedor');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.suppliers), 2::bigint, 'owner vê apenas fornecedores do próprio tenant');
select is((select count(*) from public.search_suppliers(current_setting('test.supplier_org_a')::uuid, 'Peças A', 'active')), 1::bigint, 'busca combina nome e status');
select lives_ok(
  $$ insert into public.suppliers (organization_id, legal_name, contact_name, phone) values (current_setting('test.supplier_org_a')::uuid, 'Rolamentos Zion', 'Ana', '11999990000') $$,
  'owner cadastra fornecedor no próprio tenant'
);
select is((select count(*) from public.suppliers), 3::bigint, 'novo fornecedor fica visível ao tenant');
select throws_like(
  $$ insert into public.suppliers (organization_id, legal_name) values (current_setting('test.supplier_org_b')::uuid, 'Fornecedor invasor') $$,
  '%row-level security%', 'RLS bloqueia cadastro cross-tenant'
);
select throws_like(
  $$ insert into public.suppliers (organization_id, legal_name, tax_id) values (current_setting('test.supplier_org_a')::uuid, 'Documento duplicado', '12345678000190') $$,
  '%suppliers_organization_active_tax_id_uidx%', 'CPF/CNPJ ativo é único por organização'
);
select lives_ok(
  $$ insert into public.inventory_items (organization_id, name, unit_of_measure, supplier_id) values (current_setting('test.supplier_org_a')::uuid, 'Correia vinculada', 'unidade', 'b1100000-0000-4000-8000-000000000001') $$,
  'item aceita fornecedor ativo do próprio tenant'
);
select is(
  (select count(*) from public.search_inventory_items(current_setting('test.supplier_org_a')::uuid, null, null, null, 'b1100000-0000-4000-8000-000000000001')),
  1::bigint,
  'filtro de estoque retorna item vinculado ao fornecedor'
);
select lives_ok(
  $$ update public.inventory_items set supplier_id = null where name = 'Correia vinculada' $$,
  'membro pode remover o vínculo sem apagar o item'
);
select ok((select supplier_id is null from public.inventory_items where name = 'Correia vinculada'), 'remoção deixa item sem fornecedor');
select lives_ok(
  $$ update public.inventory_items set supplier_id = 'b1100000-0000-4000-8000-000000000001' where name = 'Correia vinculada' $$,
  'membro pode vincular novamente o item ao fornecedor ativo'
);
select throws_like(
  $$ insert into public.inventory_items (organization_id, name, unit_of_measure, supplier_id) values (current_setting('test.supplier_org_a')::uuid, 'Item cross-tenant', 'unidade', 'b2100000-0000-4000-8000-000000000001') $$,
  '%Fornecedor não encontrado%', 'trigger bloqueia fornecedor de outro tenant'
);
select throws_like(
  $$ insert into public.inventory_items (organization_id, name, unit_of_measure, supplier_id) values (current_setting('test.supplier_org_a')::uuid, 'Item fornecedor inativo', 'unidade', 'b1100000-0000-4000-8000-000000000002') $$,
  '%inativo ou arquivado%', 'item novo não aceita fornecedor inativo'
);

select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.suppliers), 1::bigint, 'outro tenant não lê fornecedores da organização A');
select is((select count(*) from public.search_suppliers(current_setting('test.supplier_org_b')::uuid, null, null)), 1::bigint, 'busca do tenant B retorna apenas seus dados');
select is(
  (select count(*) from public.search_inventory_items(current_setting('test.supplier_org_a')::uuid, null, null, null, 'b1100000-0000-4000-8000-000000000001')),
  0::bigint,
  'busca de estoque não agrega itens de outro tenant'
);

select set_config('request.jwt.claim.sub', 'b3000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.suppliers), 3::bigint, 'technician ativo lê fornecedores do tenant');
select lives_ok(
  $$ insert into public.suppliers (organization_id, legal_name, email) values (current_setting('test.supplier_org_a')::uuid, 'Fornecedor do Técnico', 'tecnico@fornecedor.test') $$,
  'technician ativo cadastra fornecedor'
);
select lives_ok(
  $$ update public.suppliers set phone = '1133334444' where id = 'b1100000-0000-4000-8000-000000000001' $$,
  'technician ativo edita fornecedor do tenant'
);
select lives_ok(
  $$ update public.suppliers set legal_name = 'Tentativa externa' where id = 'b2100000-0000-4000-8000-000000000001' $$,
  'update cross-tenant não revela a linha protegida'
);
select is((select count(*) from public.suppliers where legal_name = 'Tentativa externa'), 0::bigint, 'update cross-tenant não altera nenhum fornecedor');

reset role;
update public.organization_members set status = 'inactive'
where organization_id = current_setting('test.supplier_org_a')::uuid
  and user_id = 'b3000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b3000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.suppliers), 0::bigint, 'technician inativo perde acesso');

select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$ update public.suppliers set deleted_at = now() where id = 'b1100000-0000-4000-8000-000000000001' $$,
  'fornecedor é arquivado por soft delete'
);
select ok((select deleted_at is not null from public.suppliers where id = 'b1100000-0000-4000-8000-000000000001'), 'arquivamento registra data');
select is((select deleted_by from public.suppliers where id = 'b1100000-0000-4000-8000-000000000001'), 'b1000000-0000-4000-8000-000000000001'::uuid, 'arquivamento registra usuário');
select is((select status from public.suppliers where id = 'b1100000-0000-4000-8000-000000000001'), 'inactive', 'arquivamento inativa o fornecedor');
select is((select count(*) from public.search_suppliers(current_setting('test.supplier_org_a')::uuid, 'Peças A', null)), 0::bigint, 'busca omite fornecedor arquivado');
select is((select supplier_id from public.inventory_items where name = 'Correia vinculada'), 'b1100000-0000-4000-8000-000000000001'::uuid, 'arquivamento preserva vínculo histórico do item');
select throws_like($$ delete from public.suppliers where id = 'b1100000-0000-4000-8000-000000000002' $$, '%permission denied%', 'DELETE direto permanece sem privilégio');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'suppliers' and cmd = 'DELETE'), 0::bigint, 'não existe política DELETE para fornecedores');
select ok(not exists(
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'maintenance_photos'
    and (data_type = 'bytea' or column_name in ('blob', 'base64', 'content', 'file_data'))
), 'maintenance_photos contém somente metadados, sem binário');

select * from finish();
rollback;
