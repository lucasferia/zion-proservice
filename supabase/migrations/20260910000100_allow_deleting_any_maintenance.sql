begin;

create or replace function public.guard_return_schedule_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  completion_allowed boolean := coalesce(current_setting('zion.return_completion', true), '') = 'allowed';
  cancellation_allowed boolean := coalesce(current_setting('zion.return_cancellation', true), '') = 'allowed';
  cascade_allowed boolean := coalesce(current_setting('zion.allow_cascade_delete', true), '') = 'allowed';
begin
  if tg_op = 'DELETE' then
    if cascade_allowed then return old; end if;
    raise exception using errcode = '42501', message = 'Retornos fazem parte do histórico e não podem ser excluídos.';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception using errcode = '23514', message = 'Um retorno deve ser criado como pendente.';
    end if;
    if new.scheduled_date < current_date then
      raise exception using errcode = '22007', message = 'A data do retorno não pode estar no passado.';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.client_id is distinct from old.client_id
    or new.client_location_id is distinct from old.client_location_id
    or new.equipment_id is distinct from old.equipment_id
    or new.origin_maintenance_id is distinct from old.origin_maintenance_id
    or new.scheduled_date is distinct from old.scheduled_date
    or new.notes is distinct from old.notes
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception using errcode = '42501', message = 'Os vínculos, a data e a auditoria do retorno são imutáveis.';
  end if;

  if old.status in ('completed', 'cancelled') then
    raise exception using errcode = '42501', message = 'Retornos concluídos ou cancelados são imutáveis.';
  end if;
  if new.status = 'completed' and not completion_allowed then
    raise exception using errcode = '42501', message = 'Conclua o retorno pela operação rastreável.';
  end if;
  if new.status = 'cancelled' and not cancellation_allowed then
    raise exception using errcode = '42501', message = 'Cancele o retorno informando um motivo rastreável.';
  end if;
  if new.status not in ('pending', 'completed', 'cancelled') then
    raise exception using errcode = '23514', message = 'Transição de status inválida.';
  end if;
  if not completion_allowed and (
    new.completed_at is distinct from old.completed_at or new.completed_by is distinct from old.completed_by
  ) then
    raise exception using errcode = '42501', message = 'A auditoria de conclusão é protegida.';
  end if;
  if not cancellation_allowed and (
    new.cancelled_at is distinct from old.cancelled_at
    or new.cancelled_by is distinct from old.cancelled_by
    or new.cancellation_reason is distinct from old.cancellation_reason
  ) then
    raise exception using errcode = '42501', message = 'A auditoria de cancelamento é protegida.';
  end if;
  return new;
end;
$$;

create or replace function public.can_delete_maintenance_photo_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    public.can_access_maintenance_photo_object(object_name, false)
    and exists (
      select 1 from public.maintenances
      where maintenances.organization_id::text = split_part(object_name, '/', 1)
        and maintenances.id::text = split_part(object_name, '/', 2)
        and maintenances.status in ('draft', 'in_progress')
    )
  ) or (
    split_part(object_name, '/', 3) in ('before', 'after')
    and split_part(object_name, '/', 4) <> ''
    and object_name = concat_ws('/', split_part(object_name, '/', 1), split_part(object_name, '/', 2), split_part(object_name, '/', 3), split_part(object_name, '/', 4))
    and exists (
      select 1 from public.organization_members
      where organization_members.organization_id::text = split_part(object_name, '/', 1)
        and organization_members.user_id = (select auth.uid())
        and organization_members.status = 'active'
    )
    and not exists (
      select 1 from public.maintenance_photos
      where maintenance_photos.bucket_id = 'maintenance-photos'
        and maintenance_photos.storage_path = object_name
    )
  );
$$;

drop function if exists public.delete_open_maintenance(uuid, uuid);

create function public.delete_open_maintenance(
  target_organization_id uuid,
  target_maintenance_id uuid
)
returns table (maintenance_id uuid, storage_paths text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status text;
  deleted_storage_paths text[];
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para excluir esta ordem de serviço.';
  end if;

  select maintenances.status into target_status
  from public.maintenances
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id
  for update;

  if target_status is null then
    raise exception using errcode = 'P0002', message = 'Ordem de serviço não encontrada.';
  end if;

  select coalesce(array_agg(photos.storage_path order by photos.storage_path), '{}'::text[])
  into deleted_storage_paths
  from public.maintenance_photos as photos
  where photos.organization_id = target_organization_id
    and photos.maintenance_id = target_maintenance_id;

  perform 1
  from public.inventory_items as item
  join public.inventory_movements as movement
    on movement.inventory_item_id = item.id and movement.organization_id = item.organization_id
  where movement.organization_id = target_organization_id
    and movement.maintenance_id = target_maintenance_id
  order by item.id
  for update of item;

  perform set_config('zion.allow_cascade_delete', 'allowed', true);
  perform set_config('zion.inventory_movement', 'allowed', true);

  update public.inventory_items as item
  set current_quantity = item.current_quantity + restored.quantity
  from (
    select movement.inventory_item_id, abs(sum(movement.quantity_delta)) as quantity
    from public.inventory_movements as movement
    where movement.organization_id = target_organization_id
      and movement.maintenance_id = target_maintenance_id
      and movement.movement_type = 'maintenance_use'
    group by movement.inventory_item_id
  ) as restored
  where item.organization_id = target_organization_id
    and item.id = restored.inventory_item_id;

  delete from public.return_schedules as schedule
  where schedule.organization_id = target_organization_id and schedule.origin_maintenance_id = target_maintenance_id;
  delete from public.payments as payment
  where payment.organization_id = target_organization_id and payment.maintenance_id = target_maintenance_id;
  delete from public.maintenance_photos as photo
  where photo.organization_id = target_organization_id and photo.maintenance_id = target_maintenance_id;
  delete from public.maintenance_parts as part
  where part.organization_id = target_organization_id and part.maintenance_id = target_maintenance_id;
  delete from public.inventory_movements as movement
  where movement.organization_id = target_organization_id and movement.maintenance_id = target_maintenance_id;
  delete from public.maintenances as maintenance
  where maintenance.organization_id = target_organization_id and maintenance.id = target_maintenance_id;

  perform set_config('zion.inventory_movement', '', true);
  perform set_config('zion.allow_cascade_delete', '', true);

  return query select target_maintenance_id, deleted_storage_paths;
end;
$$;

revoke all on function public.delete_open_maintenance(uuid, uuid) from public, anon;
grant execute on function public.delete_open_maintenance(uuid, uuid) to authenticated;

comment on function public.delete_open_maintenance(uuid, uuid) is
  'Exclui definitivamente uma OS de qualquer status, seus registros dependentes e restaura o estoque consumido; retorna paths para limpeza pelo Storage API.';

commit;
