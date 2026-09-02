begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'maintenance-photos',
  'maintenance-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.maintenance_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  maintenance_id uuid not null,
  kind text not null,
  bucket_id text not null default 'maintenance-photos',
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  constraint maintenance_photos_maintenance_organization_fk
    foreign key (maintenance_id, organization_id)
    references public.maintenances (id, organization_id)
    on delete restrict,
  constraint maintenance_photos_storage_path_unique unique (bucket_id, storage_path),
  constraint maintenance_photos_kind_check check (kind in ('before', 'after')),
  constraint maintenance_photos_bucket_check check (bucket_id = 'maintenance-photos'),
  constraint maintenance_photos_mime_type_check check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  constraint maintenance_photos_file_size_check check (
    file_size between 1 and 10485760
  ),
  constraint maintenance_photos_sort_order_check check (
    sort_order between 0 and 9999
  ),
  constraint maintenance_photos_path_check check (
    split_part(storage_path, '/', 4) <> ''
    and storage_path = (
      organization_id::text
      || '/' || maintenance_id::text
      || '/' || kind
      || '/' || split_part(storage_path, '/', 4)
    )
  )
);

create index maintenance_photos_maintenance_kind_order_idx
  on public.maintenance_photos (maintenance_id, kind, sort_order, created_at, id);

create index maintenance_photos_organization_created_idx
  on public.maintenance_photos (organization_id, created_at desc);

create or replace function public.guard_maintenance_photo_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_status text;
  target_organization_id uuid := case
    when tg_op = 'DELETE' then old.organization_id
    else new.organization_id
  end;
  target_maintenance_id uuid := case
    when tg_op = 'DELETE' then old.maintenance_id
    else new.maintenance_id
  end;
begin
  select maintenances.status
  into maintenance_status
  from public.maintenances
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id
  for share;

  if not found then
    raise exception using errcode = '23503', message = 'Manutenção não encontrada nesta organização.';
  end if;

  if maintenance_status not in ('draft', 'in_progress') then
    raise exception using
      errcode = '42501',
      message = 'Fotos de uma manutenção concluída ou cancelada são somente leitura.';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.organization_id is distinct from old.organization_id
      or new.maintenance_id is distinct from old.maintenance_id
      or new.kind is distinct from old.kind
      or new.bucket_id is distinct from old.bucket_id
      or new.storage_path is distinct from old.storage_path
      or new.mime_type is distinct from old.mime_type
      or new.file_size is distinct from old.file_size
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
    then
      raise exception using
        errcode = '42501',
        message = 'Somente a ordem das fotos pode ser alterada.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger maintenance_photos_guard_mutation
before insert or update or delete on public.maintenance_photos
for each row execute function public.guard_maintenance_photo_mutation();

revoke all on function public.guard_maintenance_photo_mutation()
  from public, anon, authenticated;

alter table public.maintenance_photos enable row level security;

create policy "maintenance_photos_select_member"
on public.maintenance_photos
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "maintenance_photos_insert_open_member"
on public.maintenance_photos
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and created_by = (select auth.uid())
  and exists (
    select 1
    from public.maintenances
    where maintenances.id = maintenance_photos.maintenance_id
      and maintenances.organization_id = maintenance_photos.organization_id
      and maintenances.status in ('draft', 'in_progress')
  )
);

create policy "maintenance_photos_update_open_member"
on public.maintenance_photos
for update
to authenticated
using (
  public.is_organization_member(organization_id)
  and exists (
    select 1
    from public.maintenances
    where maintenances.id = maintenance_photos.maintenance_id
      and maintenances.organization_id = maintenance_photos.organization_id
      and maintenances.status in ('draft', 'in_progress')
  )
)
with check (
  public.is_organization_member(organization_id)
  and exists (
    select 1
    from public.maintenances
    where maintenances.id = maintenance_photos.maintenance_id
      and maintenances.organization_id = maintenance_photos.organization_id
      and maintenances.status in ('draft', 'in_progress')
  )
);

create policy "maintenance_photos_delete_open_member"
on public.maintenance_photos
for delete
to authenticated
using (
  public.is_organization_member(organization_id)
  and exists (
    select 1
    from public.maintenances
    where maintenances.id = maintenance_photos.maintenance_id
      and maintenances.organization_id = maintenance_photos.organization_id
      and maintenances.status in ('draft', 'in_progress')
  )
);

revoke all on table public.maintenance_photos from anon, authenticated;
grant select on table public.maintenance_photos to authenticated;
grant insert (
  organization_id,
  maintenance_id,
  kind,
  storage_path,
  mime_type,
  file_size,
  sort_order
) on table public.maintenance_photos to authenticated;
grant update (sort_order) on table public.maintenance_photos to authenticated;
grant delete on table public.maintenance_photos to authenticated;

create or replace function public.can_access_maintenance_photo_object(
  object_name text,
  require_open boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.maintenances
    where maintenances.organization_id::text = split_part(object_name, '/', 1)
      and maintenances.id::text = split_part(object_name, '/', 2)
      and split_part(object_name, '/', 3) in ('before', 'after')
      and split_part(object_name, '/', 4) <> ''
      and object_name = (
        split_part(object_name, '/', 1)
        || '/' || split_part(object_name, '/', 2)
        || '/' || split_part(object_name, '/', 3)
        || '/' || split_part(object_name, '/', 4)
      )
      and public.is_organization_member(maintenances.organization_id)
      and (not require_open or maintenances.status in ('draft', 'in_progress'))
  );
$$;

create or replace function public.can_delete_maintenance_photo_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.can_access_maintenance_photo_object(object_name, false)
    and (
      exists (
        select 1
        from public.maintenances
        where maintenances.organization_id::text = split_part(object_name, '/', 1)
          and maintenances.id::text = split_part(object_name, '/', 2)
          and maintenances.status in ('draft', 'in_progress')
      )
      or not exists (
        select 1
        from public.maintenance_photos
        where maintenance_photos.bucket_id = 'maintenance-photos'
          and maintenance_photos.storage_path = object_name
      )
    );
$$;

revoke all on function public.can_access_maintenance_photo_object(text, boolean)
  from public, anon;
grant execute on function public.can_access_maintenance_photo_object(text, boolean)
  to authenticated;

revoke all on function public.can_delete_maintenance_photo_object(text)
  from public, anon;
grant execute on function public.can_delete_maintenance_photo_object(text)
  to authenticated;

create policy "maintenance_photo_objects_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'maintenance-photos'
  and public.can_access_maintenance_photo_object(name, false)
);

create policy "maintenance_photo_objects_insert_open_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'maintenance-photos'
  and public.can_access_maintenance_photo_object(name, true)
);

create policy "maintenance_photo_objects_delete_open_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'maintenance-photos'
  and public.can_delete_maintenance_photo_object(name)
);

create or replace function public.reorder_maintenance_photos(
  target_organization_id uuid,
  target_maintenance_id uuid,
  target_kind text,
  ordered_photo_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  maintenance_status text;
  photo_id uuid;
  photo_index integer := 0;
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para ordenar estas fotos.';
  end if;

  if target_kind not in ('before', 'after') then
    raise exception using errcode = '22023', message = 'Tipo de foto inválido.';
  end if;

  select maintenances.status
  into maintenance_status
  from public.maintenances
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Manutenção não encontrada.';
  end if;

  if maintenance_status not in ('draft', 'in_progress') then
    raise exception using errcode = '42501', message = 'Fotos desta manutenção são somente leitura.';
  end if;

  if coalesce(cardinality(ordered_photo_ids), 0) <> (
    select count(distinct maintenance_photos.id)
    from public.maintenance_photos
    where maintenance_photos.id = any(coalesce(ordered_photo_ids, '{}'::uuid[]))
      and maintenance_photos.organization_id = target_organization_id
      and maintenance_photos.maintenance_id = target_maintenance_id
      and maintenance_photos.kind = target_kind
  ) then
    raise exception using errcode = '23514', message = 'A lista de fotos contém vínculos inválidos ou duplicados.';
  end if;

  foreach photo_id in array coalesce(ordered_photo_ids, '{}'::uuid[])
  loop
    update public.maintenance_photos
    set sort_order = photo_index
    where id = photo_id
      and organization_id = target_organization_id
      and maintenance_id = target_maintenance_id
      and kind = target_kind;
    photo_index := photo_index + 1;
  end loop;
end;
$$;

revoke all on function public.reorder_maintenance_photos(uuid, uuid, text, uuid[])
  from public, anon;
grant execute on function public.reorder_maintenance_photos(uuid, uuid, text, uuid[])
  to authenticated;

comment on table public.maintenance_photos is
  'Metadados de fotos privadas antes/depois, imutáveis após o encerramento da manutenção.';
comment on function public.can_access_maintenance_photo_object(text, boolean) is
  'Valida tenant, manutenção, estado e formato do path usado pelas políticas do Storage.';

commit;
