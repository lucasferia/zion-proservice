begin;

alter table public.client_locations
  add constraint client_locations_id_client_organization_unique
  unique (id, client_id, organization_id);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  client_id uuid not null,
  client_location_id uuid,
  name text not null,
  category text not null,
  brand text,
  model text,
  serial_number text,
  asset_tag text,
  status text not null default 'operational',
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_id_organization_unique unique (id, organization_id),
  constraint equipment_client_organization_fk
    foreign key (client_id, organization_id)
    references public.clients (id, organization_id)
    on delete restrict,
  constraint equipment_location_client_organization_fk
    foreign key (client_location_id, client_id, organization_id)
    references public.client_locations (id, client_id, organization_id)
    on delete restrict,
  constraint equipment_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint equipment_category_length check (char_length(btrim(category)) between 2 and 80),
  constraint equipment_brand_length check (
    brand is null or char_length(btrim(brand)) between 1 and 100
  ),
  constraint equipment_model_length check (
    model is null or char_length(btrim(model)) between 1 and 120
  ),
  constraint equipment_serial_number_length check (
    serial_number is null or char_length(btrim(serial_number)) between 1 and 120
  ),
  constraint equipment_asset_tag_length check (
    asset_tag is null or char_length(btrim(asset_tag)) between 1 and 80
  ),
  constraint equipment_status_check check (
    status in ('operational', 'attention', 'under_maintenance', 'inactive')
  ),
  constraint equipment_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint equipment_deletion_audit check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  )
);

create index equipment_organization_active_name_idx
  on public.equipment (organization_id, lower(name))
  where deleted_at is null;

create index equipment_organization_active_client_idx
  on public.equipment (organization_id, client_id, client_location_id)
  where deleted_at is null;

create index equipment_organization_active_category_status_idx
  on public.equipment (organization_id, lower(category), status)
  where deleted_at is null;

create index equipment_organization_active_serial_idx
  on public.equipment (organization_id, lower(serial_number))
  where deleted_at is null and serial_number is not null;

create index equipment_organization_active_asset_tag_idx
  on public.equipment (organization_id, lower(asset_tag))
  where deleted_at is null and asset_tag is not null;

create or replace function public.set_equipment_record_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), old.updated_by);

  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_at := now();
    new.deleted_by := coalesce(auth.uid(), new.deleted_by);
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
  elsif old.deleted_at is not null and new.deleted_at is not null then
    new.deleted_at := old.deleted_at;
    new.deleted_by := old.deleted_by;
  end if;

  return new;
end;
$$;

create trigger equipment_set_audit
before update on public.equipment
for each row execute function public.set_equipment_record_audit();

revoke all on function public.set_equipment_record_audit() from public, anon, authenticated;

alter table public.equipment enable row level security;

create policy "equipment_select_member"
on public.equipment
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "equipment_insert_member"
on public.equipment
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and exists (
    select 1
    from public.clients
    where clients.id = equipment.client_id
      and clients.organization_id = equipment.organization_id
      and clients.deleted_at is null
  )
  and (
    equipment.client_location_id is null
    or exists (
      select 1
      from public.client_locations
      where client_locations.id = equipment.client_location_id
        and client_locations.client_id = equipment.client_id
        and client_locations.organization_id = equipment.organization_id
        and client_locations.deleted_at is null
    )
  )
);

create policy "equipment_update_member"
on public.equipment
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (
  public.is_organization_member(organization_id)
  and (
    equipment.deleted_at is not null
    or (
      exists (
        select 1
        from public.clients
        where clients.id = equipment.client_id
          and clients.organization_id = equipment.organization_id
          and clients.deleted_at is null
      )
      and (
        equipment.client_location_id is null
        or exists (
          select 1
          from public.client_locations
          where client_locations.id = equipment.client_location_id
            and client_locations.client_id = equipment.client_id
            and client_locations.organization_id = equipment.organization_id
            and client_locations.deleted_at is null
        )
      )
    )
  )
);

revoke all on table public.equipment from anon, authenticated;

grant select on table public.equipment to authenticated;
grant insert (
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
  notes
) on table public.equipment to authenticated;
grant update (
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
  deleted_at
) on table public.equipment to authenticated;

create or replace function public.search_equipment(
  target_organization_id uuid,
  search_term text default null,
  filter_client_id uuid default null,
  filter_location_id uuid default null,
  filter_category text default null,
  filter_status text default null
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
    equipment.client_id,
    equipment.client_location_id,
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
    clients.name as client_name,
    client_locations.name as location_name,
    client_locations.city as location_city
  from public.equipment
  join public.clients
    on clients.id = equipment.client_id
    and clients.organization_id = equipment.organization_id
  left join public.client_locations
    on client_locations.id = equipment.client_location_id
    and client_locations.client_id = equipment.client_id
    and client_locations.organization_id = equipment.organization_id
  where equipment.deleted_at is null
    and equipment.organization_id = target_organization_id
    and (
      nullif(btrim(search_term), '') is null
      or equipment.name ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.brand, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.model, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.serial_number, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.asset_tag, '') ilike '%' || btrim(search_term) || '%'
      or clients.name ilike '%' || btrim(search_term) || '%'
    )
    and (filter_client_id is null or equipment.client_id = filter_client_id)
    and (filter_location_id is null or equipment.client_location_id = filter_location_id)
    and (
      nullif(btrim(filter_category), '') is null
      or lower(equipment.category) = lower(btrim(filter_category))
    )
    and (
      nullif(btrim(filter_status), '') is null
      or equipment.status = btrim(filter_status)
    )
  order by lower(equipment.name), equipment.id;
$$;

revoke all on function public.search_equipment(uuid, text, uuid, uuid, text, text)
  from public, anon;
grant execute on function public.search_equipment(uuid, text, uuid, uuid, text, text)
  to authenticated;

comment on table public.equipment is
  'Equipamentos fitness isolados por organização, vinculados a cliente e unidade opcional do mesmo cliente.';
comment on function public.search_equipment(uuid, text, uuid, uuid, text, text) is
  'Busca e filtra equipamentos ativos respeitando RLS e os vínculos cliente-unidade.';

commit;
