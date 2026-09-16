begin;

create or replace function public.search_equipment_catalog(
  target_organization_id uuid,
  search_term text default null,
  filter_category text default null,
  filter_status text default null,
  filter_archival text default 'active'
)
returns table (
  id uuid,
  organization_id uuid,
  client_id uuid,
  client_location_id uuid,
  name text,
  category text,
  brand text,
  model text,
  serial_number text,
  asset_tag text,
  status text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  client_name text,
  location_name text,
  location_city text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    equipment.id,
    equipment.organization_id,
    null::uuid,
    null::uuid,
    equipment.name,
    equipment.category,
    equipment.brand,
    equipment.model,
    equipment.serial_number,
    equipment.asset_tag,
    equipment.status,
    equipment.notes,
    equipment.created_at,
    equipment.updated_at,
    equipment.deleted_at,
    null::text,
    null::text,
    null::text
  from public.equipment
  where equipment.organization_id = target_organization_id
    and (
      filter_archival = 'all'
      or (filter_archival = 'active' and equipment.deleted_at is null)
      or (filter_archival = 'archived' and equipment.deleted_at is not null)
    )
    and (
      nullif(btrim(search_term), '') is null
      or equipment.name ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.brand, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.model, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.serial_number, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.asset_tag, '') ilike '%' || btrim(search_term) || '%'
    )
    and (nullif(btrim(filter_category), '') is null or lower(equipment.category) = lower(btrim(filter_category)))
    and (nullif(btrim(filter_status), '') is null or equipment.status = btrim(filter_status))
  order by equipment.deleted_at nulls first, equipment.name;
$$;

revoke all on function public.search_equipment_catalog(uuid, text, text, text, text) from public, anon;
grant execute on function public.search_equipment_catalog(uuid, text, text, text, text) to authenticated;

comment on function public.search_equipment_catalog(uuid, text, text, text, text) is
  'Lista o catálogo geral com filtros independentes de situação operacional e arquivamento, respeitando RLS.';

commit;
