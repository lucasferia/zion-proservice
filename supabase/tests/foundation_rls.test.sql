begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'tenant-a@foundation.test',
    '{"full_name":"Owner A","organization_name":"Organização A"}'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'tenant-b@foundation.test',
    '{"full_name":"Owner B","organization_name":"Organização B"}'::jsonb
  );

select is(
  (select count(*) from public.profiles where id in (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002'
  )),
  2::bigint,
  'o trigger cria um perfil para cada usuário'
);

select is(
  (select count(*) from public.organizations where created_by in (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002'
  )),
  2::bigint,
  'o trigger cria uma organização para cada usuário'
);

select is(
  (select count(*) from public.organization_members where user_id in (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002'
  ) and role = 'owner' and status = 'active'),
  2::bigint,
  'cada usuário inicia como owner ativo'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.organizations),
  1::bigint,
  'um usuário enxerga somente sua organização'
);

select is(
  (select count(*) from public.organization_members),
  1::bigint,
  'um usuário enxerga somente os membros da própria organização'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'um usuário enxerga somente o próprio perfil'
);

select ok(
  public.is_organization_owner((
    select id from public.organizations where created_by = auth.uid()
  )),
  'o vínculo owner é reconhecido pela política'
);

select is(
  (select count(*) from public.organizations where name = 'Organização B'),
  0::bigint,
  'dados do segundo tenant permanecem invisíveis'
);

select ok(
  not has_table_privilege('authenticated', 'public.organizations', 'DELETE'),
  'organizações não concedem exclusão direta'
);

select ok(
  not has_table_privilege('authenticated', 'public.organization_members', 'DELETE'),
  'vínculos não concedem exclusão direta'
);

select ok(
  not has_table_privilege('anon', 'public.organizations', 'SELECT'),
  'usuários anônimos não recebem leitura de organizações'
);

reset role;
select * from finish();
rollback;

