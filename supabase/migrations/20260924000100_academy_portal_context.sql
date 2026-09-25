begin;

create or replace function public.portal_get_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  portal_record record;
  authorized_client_count integer := 0;
  authorized_client_id uuid;
  authorized_unit_count integer := 0;
  units_payload jsonb := '[]'::jsonb;
  result jsonb;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Contexto do Portal indisponível.';
  end if;

  select portal_users.user_id, portal_users.organization_id, portal_users.status,
         portal_users.updated_at
  into portal_record
  from public.academy_portal_users as portal_users
  where portal_users.user_id = actor_id;

  if not found
    or portal_record.status <> 'active'
    or portal_record.organization_id is null
  then
    raise exception using errcode = '42501', message = 'Contexto do Portal indisponível.';
  end if;

  if not exists (
    select 1
    from public.organizations
    where organizations.id = portal_record.organization_id
      and organizations.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Contexto do Portal indisponível.';
  end if;

  select count(*), max(valid_clients.client_id::text)::uuid
  into authorized_client_count, authorized_client_id
  from (
    select distinct links.client_id
    from public.academy_user_locations as links
    join public.clients
      on clients.id = links.client_id
      and clients.organization_id = links.organization_id
      and clients.deleted_at is null
    join public.client_locations as locations
      on locations.id = links.client_location_id
      and locations.client_id = links.client_id
      and locations.organization_id = links.organization_id
      and locations.deleted_at is null
    where links.user_id = actor_id
      and links.organization_id = portal_record.organization_id
      and links.status = 'active'
  ) as valid_clients;

  if authorized_client_count <> 1 or authorized_client_id is null then
    raise exception using errcode = '42501', message = 'Contexto do Portal indisponível.';
  end if;

  if not exists (
    select 1
    from public.academy_portal_access as access
    where access.organization_id = portal_record.organization_id
      and access.client_id = authorized_client_id
      and access.status in ('trialing', 'active')
  ) then
    raise exception using errcode = '42501', message = 'Contexto do Portal indisponível.';
  end if;

  select count(*), coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', locations.id,
        'name', locations.name,
        'city', locations.city,
        'state', locations.state
      ) order by locations.name, locations.id
    ),
    '[]'::jsonb
  )
  into authorized_unit_count, units_payload
  from public.academy_user_locations as links
  join public.client_locations as locations
    on locations.id = links.client_location_id
    and locations.client_id = links.client_id
    and locations.organization_id = links.organization_id
    and locations.deleted_at is null
  where links.user_id = actor_id
    and links.organization_id = portal_record.organization_id
    and links.client_id = authorized_client_id
    and links.status = 'active';

  if authorized_unit_count = 0 then
    raise exception using errcode = '42501', message = 'Contexto do Portal indisponível.';
  end if;

  select jsonb_build_object(
    'user', jsonb_build_object(
      'fullName', profiles.full_name
    ),
    'organization', jsonb_build_object(
      'name', organizations.name
    ),
    'academy', jsonb_build_object(
      'name', clients.name
    ),
    'access', jsonb_build_object(
      'userStatus', portal_users.status,
      'commercialStatus', access.status,
      'isTrialing', access.status = 'trialing',
      'userUpdatedAt', portal_users.updated_at,
      'commercialUpdatedAt', access.updated_at
    ),
    'unitCount', authorized_unit_count,
    'units', units_payload
  )
  into result
  from public.academy_portal_users as portal_users
  join public.profiles on profiles.id = portal_users.user_id
  join public.organizations
    on organizations.id = portal_users.organization_id
    and organizations.status = 'active'
  join public.clients
    on clients.id = authorized_client_id
    and clients.organization_id = portal_users.organization_id
    and clients.deleted_at is null
  join public.academy_portal_access as access
    on access.organization_id = portal_users.organization_id
    and access.client_id = clients.id
    and access.status in ('trialing', 'active')
  where portal_users.user_id = actor_id
    and portal_users.status = 'active';

  if result is null then
    raise exception using errcode = '42501', message = 'Contexto do Portal indisponível.';
  end if;

  return result;
end;
$$;

-- Um cadastro sem tenant continua no fluxo de aprovacao. Quando o usuario ja
-- pertence a uma organizacao, a ausencia de unidade e um bloqueio de contexto
-- distinto, mesmo que a RPC administrativa tenha rebaixado o status a pending.
create or replace function public.resolve_access_context()
returns table (access_context text, blocking_reason text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  internal_count integer;
  internal_role text;
  portal_record record;
begin
  if actor_id is null then
    return query select 'invalid_account'::text, 'authentication_required'::text;
    return;
  end if;

  select count(*), min(role)
  into internal_count, internal_role
  from public.organization_members
  where user_id = actor_id and status = 'active';

  if internal_count = 1 then
    return query select
      case internal_role when 'owner' then 'internal_owner' else 'internal_technician' end,
      null::text;
    return;
  elsif internal_count > 1 then
    return query select 'invalid_account'::text, 'ambiguous_internal_membership'::text;
    return;
  end if;

  select user_id, organization_id, status
  into portal_record
  from public.academy_portal_users
  where user_id = actor_id;

  if not found then
    return query select 'invalid_account'::text, 'account_not_classified'::text;
    return;
  end if;
  if portal_record.status = 'pending' and portal_record.organization_id is null then
    return query select 'academy_pending'::text, 'registration_pending'::text;
    return;
  end if;
  if portal_record.status = 'suspended' then
    return query select 'academy_suspended'::text, 'account_suspended'::text;
    return;
  end if;
  if portal_record.organization_id is null then
    return query select 'academy_pending'::text, 'organization_pending'::text;
    return;
  end if;
  if not exists (
    select 1 from public.organizations
    where id = portal_record.organization_id and status = 'active'
  ) then
    return query select 'academy_suspended'::text, 'organization_suspended'::text;
    return;
  end if;
  if not exists (
    select 1
    from public.academy_user_locations as links
    join public.clients
      on clients.id = links.client_id
      and clients.organization_id = links.organization_id
      and clients.deleted_at is null
    join public.client_locations as locations
      on locations.id = links.client_location_id
      and locations.client_id = links.client_id
      and locations.organization_id = links.organization_id
      and locations.deleted_at is null
    where links.user_id = actor_id
      and links.organization_id = portal_record.organization_id
      and links.status = 'active'
  ) then
    return query select 'academy_pending'::text, 'no_active_location'::text;
    return;
  end if;
  if portal_record.status = 'active' and exists (
    select 1
    from public.academy_user_locations as links
    where links.user_id = actor_id
      and links.organization_id = portal_record.organization_id
      and links.status = 'active'
      and public.has_academy_location_access(
        links.organization_id, links.client_id, links.client_location_id
      )
  ) then
    return query select 'academy_active'::text, null::text;
    return;
  end if;
  if exists (
    select 1
    from public.academy_user_locations as links
    join public.academy_portal_access as portal_access
      on portal_access.organization_id = links.organization_id
      and portal_access.client_id = links.client_id
    where links.user_id = actor_id
      and links.organization_id = portal_record.organization_id
      and links.status = 'active'
      and portal_access.status in ('past_due', 'suspended', 'cancelled')
  ) then
    return query select 'academy_suspended'::text, 'commercial_access_blocked'::text;
    return;
  end if;

  return query select 'academy_pending'::text, 'commercial_access_pending'::text;
end;
$$;

revoke all on function public.portal_get_context() from public, anon;
grant execute on function public.portal_get_context() to authenticated;
revoke all on function public.resolve_access_context() from public, anon;
grant execute on function public.resolve_access_context() to authenticated;

comment on function public.resolve_access_context() is
  'Resolve o tipo de conta e diferencia cadastro pendente, bloqueio comercial e ausencia de unidade ativa.';

comment on function public.portal_get_context() is
  'Retorna somente o contexto mínimo da academia e das unidades autorizadas para o academy_user identificado por auth.uid().';

commit;
