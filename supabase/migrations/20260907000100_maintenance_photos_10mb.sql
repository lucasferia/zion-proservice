begin;

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/webp']::text[]
where id = 'maintenance-photos';

create or replace function public.enforce_optimized_maintenance_photo_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.mime_type <> 'image/webp'
    or new.file_size > 10485760
    or lower(new.storage_path) !~ '\.webp$'
  then
    raise exception using
      errcode = '23514',
      message = 'Novas fotos devem ser WebP otimizado de até 10 MB.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_optimized_maintenance_photo_insert()
  from public, anon, authenticated;

comment on function public.enforce_optimized_maintenance_photo_insert() is
  'Protege novos metadados: somente WebP processado no navegador e limitado a 10 MB; fotos antigas permanecem inalteradas.';

commit;
