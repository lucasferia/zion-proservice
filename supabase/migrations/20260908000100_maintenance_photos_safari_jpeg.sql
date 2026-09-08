begin;

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/webp', 'image/jpeg']::text[]
where id = 'maintenance-photos';

create or replace function public.enforce_optimized_maintenance_photo_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.file_size > 10485760
    or not (
      (new.mime_type = 'image/webp' and lower(new.storage_path) ~ '\.webp$')
      or (new.mime_type = 'image/jpeg' and lower(new.storage_path) ~ '\.jpe?g$')
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Novas fotos devem ser JPEG ou WebP processado de até 10 MB.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_optimized_maintenance_photo_insert() is
  'Protege novos metadados: aceita JPEG como fallback para Safari e WebP quando suportado, ambos processados no navegador e limitados a 10 MB.';

drop policy if exists "maintenance_photo_objects_insert_open_member" on storage.objects;
create policy "maintenance_photo_objects_insert_open_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'maintenance-photos'
  and lower(name) ~ '\.(webp|jpe?g)$'
  and public.can_access_maintenance_photo_object(name, true)
);

commit;
