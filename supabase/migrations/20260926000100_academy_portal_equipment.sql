begin;

alter table public.equipment
  add column created_source text not null default 'internal',
  add constraint equipment_created_source_check
    check (created_source in ('internal', 'academy_portal'));

create index equipment_portal_location_active_idx
  on public.equipment (organization_id, client_id, client_location_id, created_at desc, id)
  where deleted_at is null and client_id is not null and client_location_id is not null;

create or replace function public.current_academy_equipment_scope(
  target_client_location_id uuid
)
returns table (
  organization_id uuid,
  client_id uuid,
  client_location_id uuid,
  location_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Acesso aos equipamentos do Portal indisponível.';
  end if;

  return query
  select
    links.organization_id,
    links.client_id,
    links.client_location_id,
    locations.name
  from public.academy_portal_users as portal_users
  join public.organizations
    on organizations.id = portal_users.organization_id
    and organizations.status = 'active'
  join public.academy_user_locations as links
    on links.user_id = portal_users.user_id
    and links.organization_id = portal_users.organization_id
    and links.client_location_id = target_client_location_id
    and links.status = 'active'
  join public.clients
    on clients.id = links.client_id
    and clients.organization_id = links.organization_id
    and clients.deleted_at is null
  join public.client_locations as locations
    on locations.id = links.client_location_id
    and locations.client_id = links.client_id
    and locations.organization_id = links.organization_id
    and locations.deleted_at is null
  join public.academy_portal_access as portal_access
    on portal_access.organization_id = links.organization_id
    and portal_access.client_id = links.client_id
    and portal_access.status in ('trialing', 'active')
  where portal_users.user_id = actor_id
    and portal_users.status = 'active'
    and not exists (
      select 1
      from public.organization_members
      where organization_members.user_id = actor_id
        and organization_members.status = 'active'
    );

  if not found then
    raise exception using errcode = '42501', message = 'Acesso aos equipamentos do Portal indisponível.';
  end if;
end;
$$;

create or replace function public.portal_list_equipment(
  target_client_location_id uuid,
  search_term text default null,
  page_number integer default 1,
  page_size integer default 12
)
returns table (
  id uuid,
  name text,
  category text,
  brand text,
  model text,
  serial_number text,
  asset_tag text,
  status text,
  created_at timestamptz,
  location_name text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  scope_record record;
  normalized_search text := nullif(btrim(coalesce(search_term, '')), '');
  normalized_page integer := greatest(coalesce(page_number, 1), 1);
  normalized_size integer := least(greatest(coalesce(page_size, 12), 1), 50);
begin
  select * into scope_record
  from public.current_academy_equipment_scope(target_client_location_id);

  return query
  select
    equipment.id,
    equipment.name,
    equipment.category,
    equipment.brand,
    equipment.model,
    equipment.serial_number,
    equipment.asset_tag,
    equipment.status,
    equipment.created_at,
    scope_record.location_name,
    count(*) over()::bigint
  from public.equipment
  where equipment.organization_id = scope_record.organization_id
    and equipment.client_id = scope_record.client_id
    and equipment.client_location_id = scope_record.client_location_id
    and equipment.deleted_at is null
    and (
      normalized_search is null
      or equipment.name ilike '%' || normalized_search || '%'
      or coalesce(equipment.brand, '') ilike '%' || normalized_search || '%'
      or coalesce(equipment.model, '') ilike '%' || normalized_search || '%'
      or coalesce(equipment.serial_number, '') ilike '%' || normalized_search || '%'
      or coalesce(equipment.asset_tag, '') ilike '%' || normalized_search || '%'
    )
  order by lower(equipment.name), equipment.id
  limit normalized_size
  offset (normalized_page - 1) * normalized_size;
end;
$$;

create or replace function public.portal_get_equipment(
  target_client_location_id uuid,
  target_equipment_id uuid
)
returns table (
  id uuid,
  name text,
  category text,
  brand text,
  model text,
  serial_number text,
  asset_tag text,
  status text,
  notes text,
  created_at timestamptz,
  location_name text,
  created_source text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  scope_record record;
begin
  select * into scope_record
  from public.current_academy_equipment_scope(target_client_location_id);

  return query
  select
    equipment.id,
    equipment.name,
    equipment.category,
    equipment.brand,
    equipment.model,
    equipment.serial_number,
    equipment.asset_tag,
    equipment.status,
    case when equipment.created_source = 'academy_portal' then equipment.notes else null end,
    equipment.created_at,
    scope_record.location_name,
    equipment.created_source
  from public.equipment
  where equipment.id = target_equipment_id
    and equipment.organization_id = scope_record.organization_id
    and equipment.client_id = scope_record.client_id
    and equipment.client_location_id = scope_record.client_location_id
    and equipment.deleted_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'Equipamento não encontrado nesta unidade.';
  end if;
end;
$$;

create or replace function public.portal_create_equipment(
  target_client_location_id uuid,
  equipment_name text,
  equipment_category text,
  equipment_brand text default null,
  equipment_model text default null,
  equipment_serial_number text default null,
  equipment_asset_tag text default null,
  equipment_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  scope_record record;
  new_equipment_id uuid;
  normalized_name text := btrim(coalesce(equipment_name, ''));
  normalized_category text := btrim(coalesce(equipment_category, ''));
  normalized_brand text := nullif(btrim(coalesce(equipment_brand, '')), '');
  normalized_model text := nullif(btrim(coalesce(equipment_model, '')), '');
  normalized_serial text := nullif(btrim(coalesce(equipment_serial_number, '')), '');
  normalized_asset_tag text := nullif(btrim(coalesce(equipment_asset_tag, '')), '');
  normalized_notes text := nullif(btrim(coalesce(equipment_notes, '')), '');
begin
  select * into scope_record
  from public.current_academy_equipment_scope(target_client_location_id);

  if char_length(normalized_name) not between 2 and 160 then
    raise exception using errcode = '22023', message = 'Informe um nome entre 2 e 160 caracteres.';
  end if;
  if char_length(normalized_category) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'Informe uma categoria entre 2 e 80 caracteres.';
  end if;
  if normalized_brand is not null and char_length(normalized_brand) > 100 then
    raise exception using errcode = '22023', message = 'A marca deve possuir no máximo 100 caracteres.';
  end if;
  if normalized_model is not null and char_length(normalized_model) > 120 then
    raise exception using errcode = '22023', message = 'O modelo deve possuir no máximo 120 caracteres.';
  end if;
  if normalized_serial is not null and char_length(normalized_serial) > 120 then
    raise exception using errcode = '22023', message = 'O número de série deve possuir no máximo 120 caracteres.';
  end if;
  if normalized_asset_tag is not null and char_length(normalized_asset_tag) > 80 then
    raise exception using errcode = '22023', message = 'O patrimônio deve possuir no máximo 80 caracteres.';
  end if;
  if normalized_notes is not null and char_length(normalized_notes) > 2000 then
    raise exception using errcode = '22023', message = 'As observações devem possuir no máximo 2000 caracteres.';
  end if;

  insert into public.equipment (
    organization_id,
    client_id,
    client_location_id,
    name,
    category,
    brand,
    model,
    serial_number,
    asset_tag,
    status,
    notes,
    created_by,
    updated_by,
    created_source
  ) values (
    scope_record.organization_id,
    scope_record.client_id,
    scope_record.client_location_id,
    normalized_name,
    normalized_category,
    normalized_brand,
    normalized_model,
    normalized_serial,
    normalized_asset_tag,
    'operational',
    normalized_notes,
    actor_id,
    actor_id,
    'academy_portal'
  )
  returning id into new_equipment_id;

  return new_equipment_id;
end;
$$;

revoke all on function public.current_academy_equipment_scope(uuid) from public, anon, authenticated;
revoke all on function public.portal_list_equipment(uuid, text, integer, integer) from public, anon;
revoke all on function public.portal_get_equipment(uuid, uuid) from public, anon;
revoke all on function public.portal_create_equipment(uuid, text, text, text, text, text, text, text) from public, anon;

grant execute on function public.portal_list_equipment(uuid, text, integer, integer) to authenticated;
grant execute on function public.portal_get_equipment(uuid, uuid) to authenticated;
grant execute on function public.portal_create_equipment(uuid, text, text, text, text, text, text, text) to authenticated;

comment on column public.equipment.created_source is
  'Origem controlada do cadastro: painel interno ou Portal da Academia.';
comment on function public.portal_list_equipment(uuid, text, integer, integer) is
  'Lista campos mínimos dos equipamentos ativos da unidade autorizada do academy_user atual.';
comment on function public.portal_get_equipment(uuid, uuid) is
  'Obtém um equipamento ativo somente quando pertence à unidade atualmente autorizada.';
comment on function public.portal_create_equipment(uuid, text, text, text, text, text, text, text) is
  'Cadastra equipamento derivando organização, academia, autor e origem de auth.uid() e da unidade autorizada.';

commit;
