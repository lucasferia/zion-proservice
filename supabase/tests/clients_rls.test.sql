begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '31000000-0000-4000-8000-000000000001',
    'clients-owner-a@test.local',
    '{"full_name":"Owner Clientes A","organization_name":"Tenant Clientes A"}'::jsonb
  ),
  (
    '32000000-0000-4000-8000-000000000002',
    'clients-owner-b@test.local',
    '{"full_name":"Owner Clientes B","organization_name":"Tenant Clientes B"}'::jsonb
  ),
  (
    '33000000-0000-4000-8000-000000000003',
    'clients-technician@test.local',
    '{"full_name":"Técnico Clientes","organization_name":"Tenant Técnico"}'::jsonb
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.clients (
      organization_id, name, phone, email, document
    ) values (
      (select id from public.organizations where created_by = auth.uid()),
      'Academia Curitiba',
      '(41) 99999-1234',
      'contato@academia.test',
      '12.345.678/0001-90'
    )
  $$,
  'membro insere cliente na própria organização'
);

select is(
  (select count(*) from public.clients),
  1::bigint,
  'membro visualiza o cliente do próprio tenant'
);

select lives_ok(
  $$
    insert into public.client_locations (
      organization_id, client_id, name, postal_code, street, number, city, state
    ) values (
      (select organization_id from public.clients where name = 'Academia Curitiba'),
      (select id from public.clients where name = 'Academia Curitiba'),
      'Matriz Centro',
      '80000-000',
      'Rua Central',
      '120',
      'Curitiba',
      'PR'
    )
  $$,
  'membro insere unidade no cliente do próprio tenant'
);

select is(
  (select count(*) from public.client_locations),
  1::bigint,
  'membro visualiza a unidade do próprio tenant'
);

select is(
  (select count(*) from public.search_clients(
    (select organization_id from public.clients where name = 'Academia Curitiba'),
    'Academia'
  )),
  1::bigint,
  'busca encontra cliente por nome'
);

select is(
  (select count(*) from public.search_clients(
    (select organization_id from public.clients where name = 'Academia Curitiba'),
    '999991234'
  )),
  1::bigint,
  'busca encontra cliente por telefone normalizado'
);

select is(
  (select count(*) from public.search_clients(
    (select organization_id from public.clients where name = 'Academia Curitiba'),
    'Curitiba'
  )),
  1::bigint,
  'busca encontra cliente pela cidade de uma unidade'
);

select throws_like(
  format(
    'insert into public.clients (organization_id, name) values (%L, %L)',
    (select id from public.organizations where created_by = '32000000-0000-4000-8000-000000000002'),
    'Cliente invasor'
  ),
  '%row-level security%',
  'membro não insere cliente em outro tenant'
);

select throws_like(
  format(
    'insert into public.client_locations (organization_id, client_id, name, street, city, state) values (%L, %L, %L, %L, %L, %L)',
    (select id from public.organizations where created_by = '32000000-0000-4000-8000-000000000002'),
    (select id from public.clients where name = 'Academia Curitiba'),
    'Unidade inválida',
    'Rua Inválida',
    'Outra Cidade',
    'SP'
  ),
  '%row-level security%',
  'FK composta e RLS impedem unidade entre tenants'
);

select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.clients),
  0::bigint,
  'segundo tenant não visualiza clientes do primeiro'
);

select is(
  (select count(*) from public.client_locations),
  0::bigint,
  'segundo tenant não visualiza unidades do primeiro'
);

select is(
  (select count(*) from public.search_clients(
    (select id from public.organizations where created_by = auth.uid()),
    null
  )),
  0::bigint,
  'busca do segundo tenant não retorna dados do primeiro'
);

select ok(
  not has_table_privilege('anon', 'public.clients', 'SELECT'),
  'anon não recebe leitura de clientes'
);

select ok(
  not has_table_privilege('anon', 'public.client_locations', 'SELECT'),
  'anon não recebe leitura de unidades'
);

select ok(
  not has_table_privilege('authenticated', 'public.clients', 'DELETE'),
  'authenticated não recebe exclusão direta de clientes'
);

select ok(
  not has_table_privilege('authenticated', 'public.client_locations', 'DELETE'),
  'authenticated não recebe exclusão direta de unidades'
);

select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.organization_members (organization_id, user_id, role, status)
    values (
      (select organization_id from public.clients where name = 'Academia Curitiba'),
      '33000000-0000-4000-8000-000000000003',
      'technician',
      'active'
    )
  $$,
  'owner adiciona technician ao tenant'
);

select set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000003', true);

select is(
  (select count(*) from public.clients where organization_id = (
    select organization_id
    from public.organization_members
    where user_id = '31000000-0000-4000-8000-000000000001'
  )),
  1::bigint,
  'technician ativo visualiza clientes do tenant compartilhado'
);

select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    update public.clients
    set deleted_at = now()
    where name = 'Academia Curitiba'
  $$,
  'cliente é arquivado por soft delete'
);

select is(
  (select deleted_by from public.clients where name = 'Academia Curitiba'),
  '31000000-0000-4000-8000-000000000001'::uuid,
  'arquivamento registra o usuário responsável'
);

select is(
  (select count(*) from public.search_clients(
    (select organization_id from public.clients where name = 'Academia Curitiba'),
    null
  )),
  0::bigint,
  'busca não retorna clientes arquivados'
);

select lives_ok(
  $$
    update public.client_locations
    set deleted_at = now()
    where name = 'Matriz Centro'
  $$,
  'unidade é arquivada por soft delete'
);

select is(
  (select deleted_by from public.client_locations where name = 'Matriz Centro'),
  '31000000-0000-4000-8000-000000000001'::uuid,
  'arquivamento da unidade registra o usuário responsável'
);

reset role;
select * from finish();
rollback;
