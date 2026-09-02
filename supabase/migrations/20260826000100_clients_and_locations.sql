begin;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  phone text,
  email text,
  document text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_id_organization_unique unique (id, organization_id),
  constraint clients_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint clients_phone_length check (
    phone is null or char_length(btrim(phone)) between 8 and 30
  ),
  constraint clients_email_format check (
    email is null or (
      char_length(email) <= 254
      and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ),
  constraint clients_document_length check (
    document is null or char_length(btrim(document)) between 3 and 32
  ),
  constraint clients_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint clients_deletion_audit check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  )
);

create table public.client_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  client_id uuid not null,
  name text not null,
  postal_code text,
  street text not null,
  number text,
  complement text,
  neighborhood text,
  city text not null,
  state text not null,
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_locations_client_organization_fk
    foreign key (client_id, organization_id)
    references public.clients (id, organization_id)
    on delete restrict,
  constraint client_locations_name_length check (char_length(btrim(name)) between 2 and 120),
  constraint client_locations_postal_code_length check (
    postal_code is null or char_length(btrim(postal_code)) between 3 and 20
  ),
  constraint client_locations_street_length check (
    char_length(btrim(street)) between 2 and 160
  ),
  constraint client_locations_number_length check (
    number is null or char_length(btrim(number)) between 1 and 20
  ),
  constraint client_locations_complement_length check (
    complement is null or char_length(complement) <= 120
  ),
  constraint client_locations_neighborhood_length check (
    neighborhood is null or char_length(btrim(neighborhood)) between 2 and 100
  ),
  constraint client_locations_city_length check (char_length(btrim(city)) between 2 and 100),
  constraint client_locations_state_format check (state ~ '^[A-Z]{2}$'),
  constraint client_locations_notes_length check (notes is null or char_length(notes) <= 500),
  constraint client_locations_deletion_audit check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  )
);

create index clients_organization_active_name_idx
  on public.clients (organization_id, lower(name))
  where deleted_at is null;

create index clients_organization_active_phone_idx
  on public.clients (organization_id, phone)
  where deleted_at is null and phone is not null;

create index client_locations_client_active_idx
  on public.client_locations (client_id, created_at)
  where deleted_at is null;

create index client_locations_organization_active_city_idx
  on public.client_locations (organization_id, lower(city))
  where deleted_at is null;

create or replace function public.set_client_record_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), old.updated_by);

  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_by := coalesce(auth.uid(), new.deleted_by);
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
  end if;

  return new;
end;
$$;

create trigger clients_set_audit
before update on public.clients
for each row execute function public.set_client_record_audit();

create trigger client_locations_set_audit
before update on public.client_locations
for each row execute function public.set_client_record_audit();

alter table public.clients enable row level security;
alter table public.client_locations enable row level security;

create policy "clients_select_member"
on public.clients
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "clients_insert_member"
on public.clients
for insert
to authenticated
with check (public.is_organization_member(organization_id));

create policy "clients_update_member"
on public.clients
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy "client_locations_select_member"
on public.client_locations
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "client_locations_insert_member"
on public.client_locations
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and exists (
    select 1
    from public.clients
    where clients.id = client_locations.client_id
      and clients.organization_id = client_locations.organization_id
      and clients.deleted_at is null
  )
);

create policy "client_locations_update_member"
on public.client_locations
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

revoke all on table public.clients from anon, authenticated;
revoke all on table public.client_locations from anon, authenticated;

grant select on table public.clients to authenticated;
grant insert (
  organization_id,
  name,
  phone,
  email,
  document,
  notes
) on table public.clients to authenticated;
grant update (
  name,
  phone,
  email,
  document,
  notes,
  deleted_at
) on table public.clients to authenticated;

grant select on table public.client_locations to authenticated;
grant insert (
  organization_id,
  client_id,
  name,
  postal_code,
  street,
  number,
  complement,
  neighborhood,
  city,
  state,
  notes
) on table public.client_locations to authenticated;
grant update (
  name,
  postal_code,
  street,
  number,
  complement,
  neighborhood,
  city,
  state,
  notes,
  deleted_at
) on table public.client_locations to authenticated;

create or replace function public.search_clients(
  target_organization_id uuid,
  search_term text default null
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  phone text,
  email text,
  document text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  location_count integer,
  cities text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    clients.id,
    clients.organization_id,
    clients.name,
    clients.phone,
    clients.email,
    clients.document,
    clients.notes,
    clients.created_at,
    clients.updated_at,
    count(client_locations.id)::integer as location_count,
    coalesce(
      array_agg(distinct client_locations.city)
        filter (where client_locations.city is not null),
      '{}'::text[]
    ) as cities
  from public.clients
  left join public.client_locations
    on client_locations.client_id = clients.id
    and client_locations.organization_id = clients.organization_id
    and client_locations.deleted_at is null
  where clients.deleted_at is null
    and clients.organization_id = target_organization_id
    and (
      nullif(btrim(search_term), '') is null
      or clients.name ilike '%' || btrim(search_term) || '%'
      or coalesce(clients.phone, '') ilike '%' || btrim(search_term) || '%'
      or (
        char_length(regexp_replace(search_term, '[^0-9]', '', 'g')) >= 3
        and regexp_replace(coalesce(clients.phone, ''), '[^0-9]', '', 'g')
          like '%' || regexp_replace(search_term, '[^0-9]', '', 'g') || '%'
      )
      or exists (
        select 1
        from public.client_locations as matching_location
        where matching_location.client_id = clients.id
          and matching_location.organization_id = clients.organization_id
          and matching_location.deleted_at is null
          and matching_location.city ilike '%' || btrim(search_term) || '%'
      )
    )
  group by clients.id
  order by lower(clients.name), clients.id;
$$;

revoke all on function public.search_clients(uuid, text) from public, anon;
grant execute on function public.search_clients(uuid, text) to authenticated;

comment on table public.clients is
  'Clientes isolados por organização e arquivados por soft delete.';
comment on table public.client_locations is
  'Unidades e endereços pertencentes a clientes da mesma organização.';
comment on function public.search_clients(uuid, text) is
  'Busca clientes ativos por nome, telefone ou cidade respeitando RLS.';

commit;
