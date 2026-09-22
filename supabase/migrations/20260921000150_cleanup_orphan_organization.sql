begin;

-- Enquanto o produto não possui seletor de organização, cada usuário interno
-- pode manter no máximo um membership ativo. Esta migration regulariza um
-- resíduo conhecido do onboarding antigo antes de criar a restrição estrutural.

create or replace function public.prevent_last_owner_deactivation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  has_another_active_owner boolean;
  organization_status text;
  administrative_role boolean := current_user in ('postgres', 'service_role', 'supabase_admin');
begin
  if old.role <> 'owner' or old.status <> 'active' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select exists (
    select 1
    from public.organization_members
    where organization_id = old.organization_id
      and user_id <> old.user_id
      and role = 'owner'
      and status = 'active'
  )
  into has_another_active_owner;

  if has_another_active_owner then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    raise exception using
      errcode = '23514',
      message = 'A organização deve manter o registro de seu último owner; DELETE não é permitido.';
  end if;

  if new.role = 'owner' and new.status = 'active' then
    return new;
  end if;

  select organizations.status
  into organization_status
  from public.organizations
  where organizations.id = old.organization_id
  for share;

  if organization_status = 'suspended'
    and administrative_role
    and new.organization_id = old.organization_id
    and new.user_id = old.user_id
    and new.role = 'owner'
    and new.status = 'inactive'
    and new.created_by is not distinct from old.created_by
    and new.created_at = old.created_at
  then
    return new;
  end if;

  raise exception using
    errcode = '23514',
    message = 'A organização deve manter ao menos um owner ativo.';
end;
$$;

drop trigger if exists organization_members_keep_active_owner
on public.organization_members;

create trigger organization_members_keep_active_owner
before update or delete on public.organization_members
for each row execute function public.prevent_last_owner_deactivation();

create or replace function public.prevent_active_organization_without_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'suspended'
    and new.status = 'active'
    and not exists (
      select 1
      from public.organization_members
      where organization_id = old.id
        and role = 'owner'
        and status = 'active'
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Uma organização suspensa só pode ser reativada após recuperar um owner ativo.';
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_require_owner_when_reactivated
on public.organizations;

create trigger organizations_require_owner_when_reactivated
before update of status on public.organizations
for each row execute function public.prevent_active_organization_without_owner();

do $$
declare
  target_user_id constant uuid := 'b29fa98f-125d-4ad0-8174-61fc3de91731';
  lucas_user_id constant uuid := '1ec66a3f-ece3-4887-b280-072879d5eb5b';
  main_organization_id constant uuid := '27cc2f5f-051e-4c39-a28f-2fcb9b67b465';
  orphan_organization_id constant uuid := 'c736c596-f1f8-4bac-bd12-8573d95aa532';
  active_membership_count integer;
  total_membership_count integer;
  orphan_business_count bigint;
begin
  -- O caso remoto é identificado somente por UUIDs estáveis auditados. Em um
  -- ambiente local limpo, nenhum desses registros existe e esta seção é pulada.
  if not exists (select 1 from auth.users where id = target_user_id) then
    if exists (
      select 1 from public.organizations
      where id in (main_organization_id, orphan_organization_id)
    ) or exists (
      select 1 from public.organization_members
      where user_id in (target_user_id, lucas_user_id)
        or organization_id in (main_organization_id, orphan_organization_id)
    ) then
      raise exception using
        errcode = '55000',
        message = 'Regularização abortada: fingerprints parciais inesperados.';
    end if;

    return;
  end if;

  perform 1
  from auth.users
  where id in (target_user_id, lucas_user_id)
  order by id
  for update;

  perform 1
  from public.organizations
  where id in (main_organization_id, orphan_organization_id)
  order by id
  for update;

  perform 1
  from public.organization_members
  where user_id in (target_user_id, lucas_user_id)
     or organization_id in (main_organization_id, orphan_organization_id)
  order by organization_id, user_id
  for update;

  if not exists (select 1 from public.profiles where id = target_user_id)
    or not exists (select 1 from public.profiles where id = lucas_user_id)
  then
    raise exception using
      errcode = '55000',
      message = 'Regularização abortada: profile interno esperado não encontrado.';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = main_organization_id and status = 'active'
  ) or not exists (
    select 1 from public.organizations
    where id = orphan_organization_id
      and status = 'active'
      and created_by = target_user_id
  ) then
    raise exception using
      errcode = '55000',
      message = 'Regularização abortada: organizações divergiram da auditoria.';
  end if;

  select count(*), count(*) filter (where status = 'active')
  into total_membership_count, active_membership_count
  from public.organization_members
  where user_id = target_user_id;

  if total_membership_count <> 2 or active_membership_count <> 2
    or (select count(*) from public.organization_members
        where user_id = target_user_id and status = 'active' and role = 'owner') <> 2
    or not exists (
      select 1 from public.organization_members
      where organization_id = main_organization_id
        and user_id = target_user_id and role = 'owner' and status = 'active'
    )
    or not exists (
      select 1 from public.organization_members
      where organization_id = orphan_organization_id
        and user_id = target_user_id and role = 'owner' and status = 'active'
    )
  then
    raise exception using
      errcode = '55000',
      message = 'Regularização abortada: memberships do usuário divergiram da auditoria.';
  end if;

  if (select count(*) from public.organization_members
      where organization_id = orphan_organization_id) <> 1
    or not exists (
      select 1 from public.organization_members
      where organization_id = main_organization_id
        and user_id = lucas_user_id and role = 'owner' and status = 'active'
    )
  then
    raise exception using
      errcode = '55000',
      message = 'Regularização abortada: owners das organizações divergiram da auditoria.';
  end if;

  select
    (select count(*) from public.clients where organization_id = orphan_organization_id)
    + (select count(*) from public.client_locations where organization_id = orphan_organization_id)
    + (select count(*) from public.equipment where organization_id = orphan_organization_id)
    + (select count(*) from public.inventory_items where organization_id = orphan_organization_id)
    + (select count(*) from public.inventory_movements where organization_id = orphan_organization_id)
    + (select count(*) from public.maintenances where organization_id = orphan_organization_id)
    + (select count(*) from public.maintenance_parts where organization_id = orphan_organization_id)
    + (select count(*) from public.maintenance_photos where organization_id = orphan_organization_id)
    + (select count(*) from public.payments where organization_id = orphan_organization_id)
    + (select count(*) from public.return_schedules where organization_id = orphan_organization_id)
    + (select count(*) from public.calendar_events where organization_id = orphan_organization_id)
    + (select count(*) from public.suppliers where organization_id = orphan_organization_id)
  into orphan_business_count;

  if orphan_business_count <> 0
    or exists (
      select 1
      from storage.objects
      where (storage.foldername(name))[1] = orphan_organization_id::text
    )
  then
    raise exception using
      errcode = '55000',
      message = 'Regularização abortada: a organização órfã passou a possuir dados ou arquivos.';
  end if;

  update public.organizations
  set status = 'suspended'
  where id = orphan_organization_id;

  update public.organization_members
  set status = 'inactive'
  where organization_id = orphan_organization_id
    and user_id = target_user_id;

  if not exists (
    select 1 from public.organizations
    where id = orphan_organization_id and status = 'suspended'
  ) or not exists (
    select 1 from public.organization_members
    where organization_id = orphan_organization_id
      and user_id = target_user_id and role = 'owner' and status = 'inactive'
  ) or (select count(*) from public.organization_members
        where user_id = target_user_id and status = 'active') <> 1
    or not exists (
      select 1 from public.organization_members
      where organization_id = main_organization_id
        and user_id = target_user_id and role = 'owner' and status = 'active'
    )
  then
    raise exception using
      errcode = '55000',
      message = 'Regularização abortada: estado final inconsistente.';
  end if;
end;
$$;

create unique index organization_members_one_active_per_user_idx
  on public.organization_members (user_id)
  where status = 'active';

comment on index public.organization_members_one_active_per_user_idx is
  'Restrição temporária enquanto o produto não possui seletor de organização. Remover ou redesenhar ao implementar multi-organização.';

comment on function public.prevent_last_owner_deactivation() is
  'Protege o último owner. Apenas papel administrativo pode inativá-lo após a organização estar suspensa; DELETE permanece proibido.';

commit;
