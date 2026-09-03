begin;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  legal_name text not null,
  trade_name text,
  tax_id text,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  status text not null default 'active',
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_id_organization_unique unique (id, organization_id),
  constraint suppliers_legal_name_length check (char_length(btrim(legal_name)) between 2 and 160),
  constraint suppliers_trade_name_length check (trade_name is null or char_length(btrim(trade_name)) between 2 and 160),
  constraint suppliers_tax_id_format check (
    tax_id is null
    or char_length(regexp_replace(tax_id, '[^0-9]', '', 'g')) in (11, 14)
  ),
  constraint suppliers_contact_name_length check (contact_name is null or char_length(btrim(contact_name)) between 2 and 120),
  constraint suppliers_phone_length check (phone is null or char_length(btrim(phone)) between 8 and 30),
  constraint suppliers_email_format check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint suppliers_email_length check (email is null or char_length(email) <= 160),
  constraint suppliers_address_length check (address is null or char_length(address) <= 500),
  constraint suppliers_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint suppliers_status_check check (status in ('active', 'inactive')),
  constraint suppliers_deletion_audit check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  )
);

create unique index suppliers_organization_active_tax_id_uidx
  on public.suppliers (organization_id, regexp_replace(tax_id, '[^0-9]', '', 'g'))
  where deleted_at is null and tax_id is not null;

create index suppliers_organization_active_name_idx
  on public.suppliers (organization_id, lower(legal_name))
  where deleted_at is null;

alter table public.inventory_items
  add column supplier_id uuid;

alter table public.inventory_items
  add constraint inventory_items_supplier_organization_fk
  foreign key (supplier_id, organization_id)
  references public.suppliers (id, organization_id)
  on delete restrict;

create index inventory_items_supplier_idx
  on public.inventory_items (organization_id, supplier_id)
  where supplier_id is not null and deleted_at is null;

create or replace function public.set_supplier_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception using errcode = '42501', message = 'Os vínculos e a criação do fornecedor são imutáveis.';
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), old.updated_by);

  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_at := now();
    new.deleted_by := coalesce(auth.uid(), new.deleted_by);
    new.status := 'inactive';
  elsif old.deleted_at is not null then
    new.deleted_at := old.deleted_at;
    new.deleted_by := old.deleted_by;
  end if;

  return new;
end;
$$;

create trigger suppliers_set_audit
before update on public.suppliers
for each row execute function public.set_supplier_audit();

create or replace function public.prevent_supplier_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'Fornecedores devem ser arquivados e não podem ser excluídos diretamente.';
end;
$$;

create trigger suppliers_prevent_delete
before delete on public.suppliers
for each row execute function public.prevent_supplier_delete();

create or replace function public.validate_inventory_supplier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.supplier_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.suppliers
    where suppliers.id = new.supplier_id
      and suppliers.organization_id = new.organization_id
      and suppliers.deleted_at is null
      and suppliers.status = 'active'
  ) then
    raise exception using errcode = '23503', message = 'Fornecedor não encontrado, inativo ou arquivado nesta organização.';
  end if;

  return new;
end;
$$;

create trigger inventory_items_validate_supplier
before insert or update of supplier_id, organization_id on public.inventory_items
for each row execute function public.validate_inventory_supplier();

revoke all on function public.set_supplier_audit() from public, anon, authenticated;
revoke all on function public.prevent_supplier_delete() from public, anon, authenticated;
revoke all on function public.validate_inventory_supplier() from public, anon, authenticated;

alter table public.suppliers enable row level security;

create policy "suppliers_select_member"
on public.suppliers
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "suppliers_insert_member"
on public.suppliers
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "suppliers_update_member"
on public.suppliers
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

revoke all on table public.suppliers from anon, authenticated;
grant select on table public.suppliers to authenticated;
grant insert (
  organization_id,
  legal_name,
  trade_name,
  tax_id,
  contact_name,
  phone,
  email,
  address,
  notes,
  status
) on table public.suppliers to authenticated;
grant update (
  legal_name,
  trade_name,
  tax_id,
  contact_name,
  phone,
  email,
  address,
  notes,
  status,
  deleted_at
) on table public.suppliers to authenticated;

grant insert (
  organization_id,
  name,
  sku,
  category,
  unit_of_measure,
  minimum_stock,
  average_unit_cost,
  status,
  notes,
  supplier_id
) on table public.inventory_items to authenticated;

grant update (
  name,
  sku,
  category,
  unit_of_measure,
  minimum_stock,
  average_unit_cost,
  status,
  notes,
  deleted_at,
  supplier_id
) on table public.inventory_items to authenticated;

create or replace function public.search_suppliers(
  target_organization_id uuid,
  search_term text default null,
  filter_status text default null
)
returns table (
  id uuid,
  organization_id uuid,
  legal_name text,
  trade_name text,
  tax_id text,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    suppliers.id,
    suppliers.organization_id,
    suppliers.legal_name,
    suppliers.trade_name,
    suppliers.tax_id,
    suppliers.contact_name,
    suppliers.phone,
    suppliers.email,
    suppliers.address,
    suppliers.notes,
    suppliers.status,
    suppliers.created_at,
    suppliers.updated_at
  from public.suppliers
  where suppliers.organization_id = target_organization_id
    and suppliers.deleted_at is null
    and (
      nullif(btrim(search_term), '') is null
      or suppliers.legal_name ilike '%' || btrim(search_term) || '%'
      or coalesce(suppliers.trade_name, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(suppliers.tax_id, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(suppliers.contact_name, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(suppliers.phone, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(suppliers.email, '') ilike '%' || btrim(search_term) || '%'
    )
    and (
      nullif(btrim(filter_status), '') is null
      or suppliers.status = btrim(filter_status)
    )
  order by lower(suppliers.legal_name), suppliers.id;
$$;

revoke all on function public.search_suppliers(uuid, text, text) from public, anon;
grant execute on function public.search_suppliers(uuid, text, text) to authenticated;

update storage.buckets
set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/webp']::text[]
where id = 'maintenance-photos';

create or replace function public.enforce_optimized_maintenance_photo_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.mime_type <> 'image/webp'
    or new.file_size > 1048576
    or lower(new.storage_path) !~ '\.webp$'
  then
    raise exception using
      errcode = '23514',
      message = 'Novas fotos devem ser WebP otimizado de até 1 MB.';
  end if;
  return new;
end;
$$;

create trigger maintenance_photos_enforce_optimized_insert
before insert on public.maintenance_photos
for each row execute function public.enforce_optimized_maintenance_photo_insert();

revoke all on function public.enforce_optimized_maintenance_photo_insert()
  from public, anon, authenticated;

drop policy "maintenance_photo_objects_insert_open_member" on storage.objects;
create policy "maintenance_photo_objects_insert_open_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'maintenance-photos'
  and lower(name) ~ '\.webp$'
  and public.can_access_maintenance_photo_object(name, true)
);

comment on table public.suppliers is
  'Fornecedores isolados por organização, com arquivamento rastreável e sem exclusão direta.';
comment on column public.inventory_items.supplier_id is
  'Fornecedor opcional do item; a FK composta impede associação cross-tenant.';
comment on function public.enforce_optimized_maintenance_photo_insert() is
  'Protege novos metadados: somente WebP processado no navegador e limitado a 1 MB; fotos antigas permanecem inalteradas.';

commit;
