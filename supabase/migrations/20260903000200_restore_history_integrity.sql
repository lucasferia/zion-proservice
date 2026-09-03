begin;

drop policy if exists "clients_delete_member" on public.clients;
drop policy if exists "client_locations_delete_member" on public.client_locations;
drop policy if exists "equipment_delete_member" on public.equipment;
drop policy if exists "inventory_items_delete_member" on public.inventory_items;
drop policy if exists "maintenances_delete_member" on public.maintenances;
drop policy if exists "payments_delete_member" on public.payments;
drop policy if exists "return_schedules_delete_member" on public.return_schedules;
drop policy if exists "maintenance_photos_delete_member" on public.maintenance_photos;
drop policy if exists "maintenance_parts_delete_member" on public.maintenance_parts;
drop policy if exists "inventory_movements_delete_member" on public.inventory_movements;

revoke delete on table public.clients from authenticated;
revoke delete on table public.client_locations from authenticated;
revoke delete on table public.equipment from authenticated;
revoke delete on table public.inventory_items from authenticated;
revoke delete on table public.maintenances from authenticated;
revoke delete on table public.payments from authenticated;
revoke delete on table public.return_schedules from authenticated;
revoke delete on table public.inventory_movements from authenticated;

-- Fotos e peças continuam removíveis somente em OS aberta pelas políticas originais.
grant delete on table public.maintenance_photos to authenticated;
grant delete on table public.maintenance_parts to authenticated;

create or replace function public.delete_client(
  target_organization_id uuid,
  target_client_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Acesso não autorizado a esta organização.';
  end if;

  update public.clients
  set deleted_at = now()
  where id = target_client_id
    and organization_id = target_organization_id
    and deleted_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'Cliente não encontrado ou já arquivado.';
  end if;
end;
$$;

create or replace function public.delete_client_location(
  target_organization_id uuid,
  target_location_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Acesso não autorizado a esta organização.';
  end if;

  update public.client_locations
  set deleted_at = now()
  where id = target_location_id
    and organization_id = target_organization_id
    and deleted_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'Unidade não encontrada ou já arquivada.';
  end if;
end;
$$;

create or replace function public.delete_equipment(
  target_organization_id uuid,
  target_equipment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Acesso não autorizado a esta organização.';
  end if;

  update public.equipment
  set deleted_at = now()
  where id = target_equipment_id
    and organization_id = target_organization_id
    and deleted_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'Equipamento não encontrado ou já arquivado.';
  end if;
end;
$$;

create or replace function public.delete_inventory_item(
  target_organization_id uuid,
  target_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Acesso não autorizado a esta organização.';
  end if;

  update public.inventory_items
  set deleted_at = now()
  where id = target_item_id
    and organization_id = target_organization_id
    and deleted_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'Item não encontrado ou já arquivado.';
  end if;
end;
$$;

create or replace function public.guard_return_schedule_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  completion_allowed boolean := coalesce(
    current_setting('zion.return_completion', true), ''
  ) = 'allowed';
  cancellation_allowed boolean := coalesce(
    current_setting('zion.return_cancellation', true), ''
  ) = 'allowed';
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '42501',
      message = 'Retornos fazem parte do histórico e não podem ser excluídos.';
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
    new.completed_at is distinct from old.completed_at
    or new.completed_by is distinct from old.completed_by
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

revoke all on function public.guard_return_schedule_mutation()
  from public, anon, authenticated;

comment on function public.delete_client(uuid, uuid) is
  'Compatibilidade de API: arquiva o cliente sem apagar seu histórico.';
comment on function public.delete_client_location(uuid, uuid) is
  'Compatibilidade de API: arquiva a unidade sem apagar seu histórico.';
comment on function public.delete_equipment(uuid, uuid) is
  'Compatibilidade de API: arquiva o equipamento sem apagar seu histórico.';
comment on function public.delete_inventory_item(uuid, uuid) is
  'Compatibilidade de API: arquiva o item sem apagar movimentos ou consumo.';

commit;
