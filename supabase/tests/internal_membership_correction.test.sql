begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  ('d1000000-0000-4000-8000-000000000001', 'owner-active@membership.test', '{"full_name":"Owner Active"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Active Organization"}'::jsonb),
  ('d2000000-0000-4000-8000-000000000002', 'owner-suspended@membership.test', '{"full_name":"Owner Suspended"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Suspended Organization"}'::jsonb),
  ('d3000000-0000-4000-8000-000000000003', 'owner-secondary@membership.test', '{"full_name":"Owner Secondary"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Secondary Organization"}'::jsonb),
  ('d4000000-0000-4000-8000-000000000004', 'member-active@membership.test', '{"full_name":"Member Active"}'::jsonb, '{"zion_account_type":"internal_member"}'::jsonb),
  ('d5000000-0000-4000-8000-000000000005', 'member-inactive@membership.test', '{"full_name":"Member Inactive"}'::jsonb, '{"zion_account_type":"internal_member"}'::jsonb);

select set_config('test.membership_org_active', (select id::text from public.organizations where created_by = 'd1000000-0000-4000-8000-000000000001'), true);
select set_config('test.membership_org_suspended', (select id::text from public.organizations where created_by = 'd2000000-0000-4000-8000-000000000002'), true);
select set_config('test.membership_org_secondary', (select id::text from public.organizations where created_by = 'd3000000-0000-4000-8000-000000000003'), true);

select throws_ok(
  $$ update public.organization_members
     set status = 'inactive'
     where organization_id = current_setting('test.membership_org_active')::uuid
       and user_id = 'd1000000-0000-4000-8000-000000000001' $$,
  '23514',
  'A organização deve manter ao menos um owner ativo.',
  'organização ativa não pode perder o último owner'
);

select throws_ok(
  $$ update public.organization_members
     set role = 'technician'
     where organization_id = current_setting('test.membership_org_active')::uuid
       and user_id = 'd1000000-0000-4000-8000-000000000001' $$,
  '23514',
  'A organização deve manter ao menos um owner ativo.',
  'último owner de organização ativa não pode virar technician'
);

select throws_ok(
  $$ delete from public.organization_members
     where organization_id = current_setting('test.membership_org_active')::uuid
       and user_id = 'd1000000-0000-4000-8000-000000000001' $$,
  '23514',
  'A organização deve manter o registro de seu último owner; DELETE não é permitido.',
  'DELETE do último owner continua proibido'
);

insert into public.clients (id, organization_id, name, created_by, updated_by)
values (
  'd2100000-0000-4000-8000-000000000001',
  current_setting('test.membership_org_suspended')::uuid,
  'Histórico preservado',
  'd2000000-0000-4000-8000-000000000002',
  'd2000000-0000-4000-8000-000000000002'
);

update public.organizations
set status = 'suspended'
where id = current_setting('test.membership_org_suspended')::uuid;

select lives_ok(
  $$ update public.organization_members
     set status = 'inactive'
     where organization_id = current_setting('test.membership_org_suspended')::uuid
       and user_id = 'd2000000-0000-4000-8000-000000000002' $$,
  'papel administrativo pode inativar o último owner após suspender a organização'
);

select is(
  (select status from public.organization_members
   where organization_id = current_setting('test.membership_org_suspended')::uuid
     and user_id = 'd2000000-0000-4000-8000-000000000002'),
  'inactive',
  'membership inativo permanece preservado'
);

select is(
  (select count(*) from public.clients where id = 'd2100000-0000-4000-8000-000000000001'),
  1::bigint,
  'referências históricas permanecem válidas após a inativação'
);

select throws_ok(
  $$ update public.organizations
     set status = 'active'
     where id = current_setting('test.membership_org_suspended')::uuid $$,
  '23514',
  'Uma organização suspensa só pode ser reativada após recuperar um owner ativo.',
  'organização sem owner ativo não pode ser reativada'
);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (
  current_setting('test.membership_org_active')::uuid,
  'd4000000-0000-4000-8000-000000000004',
  'technician',
  'active',
  'd1000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$ insert into public.organization_members (organization_id, user_id, role, status, created_by)
     values (
       current_setting('test.membership_org_secondary')::uuid,
       'd4000000-0000-4000-8000-000000000004',
       'technician',
       'active',
       'd3000000-0000-4000-8000-000000000003'
     ) $$,
  '23505',
  null,
  'segundo membership ativo para o mesmo usuário é bloqueado'
);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values
  (current_setting('test.membership_org_active')::uuid, 'd5000000-0000-4000-8000-000000000005', 'technician', 'inactive', 'd1000000-0000-4000-8000-000000000001'),
  (current_setting('test.membership_org_secondary')::uuid, 'd5000000-0000-4000-8000-000000000005', 'technician', 'inactive', 'd3000000-0000-4000-8000-000000000003');

select is(
  (select count(*) from public.organization_members
   where user_id = 'd5000000-0000-4000-8000-000000000005' and status = 'inactive'),
  2::bigint,
  'múltiplos memberships inativos são permitidos'
);

update public.organization_members
set status = 'active'
where organization_id = current_setting('test.membership_org_active')::uuid
  and user_id = 'd5000000-0000-4000-8000-000000000005';

select is(
  (select count(*) from public.organization_members
   where user_id = 'd5000000-0000-4000-8000-000000000005' and status = 'active'),
  1::bigint,
  'um membership ativo com memberships inativos é permitido'
);

select is(
  (select status || ':' || role from public.organization_members
   where organization_id = current_setting('test.membership_org_active')::uuid
     and user_id = 'd1000000-0000-4000-8000-000000000001'),
  'active:owner',
  'organização principal do cenário permanece com seu owner intacto'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'organization_members_one_active_per_user_idx'
      and indexdef ilike '%where (status = ''active''::text)%'
  ),
  'restrição estrutural de membership ativo está instalada'
);

select is(
  (select count(*) from auth.users where id in (
    'b29fa98f-125d-4ad0-8174-61fc3de91731',
    '1ec66a3f-ece3-4887-b280-072879d5eb5b'
  )),
  0::bigint,
  'reset local funciona sem criar os usuários específicos do remoto'
);

select * from finish();
rollback;
