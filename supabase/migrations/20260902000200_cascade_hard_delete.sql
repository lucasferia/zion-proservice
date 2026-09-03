begin;

-- 1. Atualizar guard_payment_mutation para permitir exclusão em cascata controlada
create or replace function public.guard_payment_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_record record;
  active_total numeric(12, 2);
  receiving_allowed boolean := coalesce(
    current_setting('zion.payment_receiving', true), ''
  ) = 'allowed';
  cancellation_allowed boolean := coalesce(
    current_setting('zion.payment_cancellation', true), ''
  ) = 'allowed';
  cascade_allowed boolean := coalesce(
    current_setting('zion.allow_cascade_delete', true), ''
  ) = 'allowed';
begin
  if tg_op = 'DELETE' then
    if cascade_allowed then
      return old;
    end if;
    raise exception using
      errcode = '42501',
      message = 'Pagamentos fazem parte do histórico financeiro e não podem ser excluídos.';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.organization_id is distinct from old.organization_id
      or new.client_id is distinct from old.client_id
      or new.maintenance_id is distinct from old.maintenance_id
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
    then
      raise exception using errcode = '42501', message = 'Os vínculos e a auditoria do pagamento são imutáveis.';
    end if;

    if old.status in ('received', 'cancelled') then
      if not (
        cancellation_allowed
        and old.status = 'received'
        and new.status = 'cancelled'
        and new.amount is not distinct from old.amount
        and new.method is not distinct from old.method
        and new.paid_at is not distinct from old.paid_at
        and new.due_date is not distinct from old.due_date
        and new.notes is not distinct from old.notes
      ) then
        raise exception using
          errcode = '42501',
          message = 'Pagamentos recebidos ou cancelados são imutáveis.';
      end if;
    elsif old.status = 'pending' and new.status is distinct from old.status then
      if not (
        (receiving_allowed and new.status = 'received')
        or (cancellation_allowed and new.status = 'cancelled')
      ) then
        raise exception using
          errcode = '42501',
          message = 'Altere o status do pagamento pela operação financeira rastreável.';
      end if;
    end if;

    if not receiving_allowed and new.paid_at is distinct from old.paid_at then
      raise exception using errcode = '42501', message = 'A data de recebimento é protegida.';
    end if;

    if not cancellation_allowed and (
      new.cancelled_at is distinct from old.cancelled_at
      or new.cancelled_by is distinct from old.cancelled_by
      or new.cancellation_reason is distinct from old.cancellation_reason
    ) then
      raise exception using errcode = '42501', message = 'A auditoria de cancelamento é protegida.';
    end if;
  elsif new.status = 'cancelled' then
    raise exception using errcode = '23514', message = 'Um pagamento não pode ser criado já cancelado.';
  end if;

  select
    maintenances.total_amount,
    maintenances.status,
    maintenances.client_id
  into maintenance_record
  from public.maintenances
  where maintenances.id = new.maintenance_id
    and maintenances.organization_id = new.organization_id
  for update;

  if not found or maintenance_record.client_id <> new.client_id then
    raise exception using errcode = '23503', message = 'Manutenção e cliente não encontrados nesta organização.';
  end if;

  if tg_op = 'INSERT' and maintenance_record.status = 'cancelled' then
    raise exception using errcode = '55000', message = 'Não é possível registrar pagamento em uma manutenção cancelada.';
  end if;

  if new.status in ('pending', 'received') then
    select coalesce(sum(payments.amount), 0)
    into active_total
    from public.payments
    where payments.organization_id = new.organization_id
      and payments.maintenance_id = new.maintenance_id
      and payments.status in ('pending', 'received')
      and payments.id <> new.id;

    if active_total + new.amount > maintenance_record.total_amount then
      raise exception using
        errcode = '23514',
        message = 'A soma dos pagamentos ativos não pode ultrapassar o valor da OS.';
    end if;
  end if;

  return new;
end;
$$;

-- 2. Atualizar guard_return_schedule_mutation para permitir exclusão em cascata controlada
create or replace function public.guard_return_schedule_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  completion_allowed boolean := coalesce(
    current_setting('zion.return_completion', true), ''
  ) = 'allowed';
  cancellation_allowed boolean := coalesce(
    current_setting('zion.return_cancellation', true), ''
  ) = 'allowed';
  cascade_allowed boolean := coalesce(
    current_setting('zion.allow_cascade_delete', true), ''
  ) = 'allowed';
begin
  if tg_op = 'DELETE' then
    if cascade_allowed then
      return old;
    end if;
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

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.organization_id is distinct from old.organization_id
      or new.client_id is distinct from old.client_id
      or new.client_location_id is distinct from old.client_location_id
      or new.equipment_id is distinct from old.equipment_id
      or new.origin_maintenance_id is distinct from old.origin_maintenance_id
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
    then
      raise exception using errcode = '42501', message = 'Os vínculos e a auditoria do retorno são imutáveis.';
    end if;

    if old.status <> 'pending' then
      raise exception using errcode = '42501', message = 'Retornos finalizados ou cancelados não podem ser alterados.';
    end if;

    if not (completion_allowed or cancellation_allowed) then
      raise exception using errcode = '42501', message = 'Atualize o retorno pela operação rastreável.';
    end if;

    if completion_allowed then
      if new.status <> 'completed'
        or new.completed_at is null
        or new.completed_by is null
        or new.cancelled_at is not null
        or new.cancelled_by is not null
        or new.cancellation_reason is not null
      then
        raise exception using errcode = '42501', message = 'Payload de conclusão do retorno inválido.';
      end if;
    end if;

    if cancellation_allowed then
      if new.status <> 'cancelled'
        or new.cancelled_at is null
        or new.cancelled_by is null
        or new.cancellation_reason is null
        or new.completed_at is not null
        or new.completed_by is not null
      then
        raise exception using errcode = '42501', message = 'Payload de cancelamento do retorno inválido.';
      end if;
    end if;

    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), old.updated_by);
    return new;
  end if;

  return null;
end;
$$;

-- 3. Atualizar prevent_inventory_movement_mutation para permitir exclusão em cascata controlada
create or replace function public.prevent_inventory_movement_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('zion.allow_cascade_delete', true), '') = 'allowed' then
    if tg_op = 'DELETE' then
      return old;
    end if;
  end if;
  raise exception using
    errcode = '42501',
    message = 'Movimentações de estoque são imutáveis.';
end;
$$;

-- 4. Atualizar guard_maintenance_part_mutation para permitir exclusão em cascata controlada
create or replace function public.guard_maintenance_part_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  maintenance_status text;
  completion_allowed boolean := coalesce(
    current_setting('zion.maintenance_completion', true), ''
  ) = 'allowed';
  cascade_allowed boolean := coalesce(
    current_setting('zion.allow_cascade_delete', true), ''
  ) = 'allowed';
  target_organization_id uuid := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  target_maintenance_id uuid := case when tg_op = 'DELETE' then old.maintenance_id else new.maintenance_id end;
begin
  if tg_op = 'DELETE' and cascade_allowed then
    return old;
  end if;

  select status
  into maintenance_status
  from public.maintenances
  where id = target_maintenance_id
    and organization_id = target_organization_id
  for share;

  if not found then
    if tg_op = 'DELETE' and cascade_allowed then
      return old;
    end if;
    raise exception using errcode = '23503', message = 'Manutenção não encontrada nesta organização.';
  end if;

  if tg_op = 'DELETE' and not cascade_allowed then
    if maintenance_status not in ('draft', 'in_progress') then
      raise exception using errcode = '42501', message = 'Peças de uma manutenção concluída ou cancelada são imutáveis.';
    end if;
    return old;
  end if;

  if completion_allowed and tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.organization_id is distinct from old.organization_id
      or new.maintenance_id is distinct from old.maintenance_id
      or new.inventory_item_id is distinct from old.inventory_item_id
      or new.quantity is distinct from old.quantity
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
    then
      raise exception using errcode = '42501', message = 'O vínculo da peça com a manutenção é imutável.';
    end if;
    return new;
  end if;

  if maintenance_status not in ('draft', 'in_progress') then
    raise exception using errcode = '42501', message = 'Peças de uma manutenção concluída ou cancelada são imutáveis.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.maintenance_id is distinct from old.maintenance_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '42501', message = 'O vínculo da peça com a manutenção é imutável.';
  end if;

  if new.unit_cost_snapshot is not null
    or new.total_cost_snapshot is not null
    or new.inventory_movement_id is not null
  then
    raise exception using errcode = '42501', message = 'Snapshots de peças só são gravados na conclusão.';
  end if;

  if not exists (
    select 1
    from public.inventory_items
    where inventory_items.id = new.inventory_item_id
      and inventory_items.organization_id = new.organization_id
      and inventory_items.deleted_at is null
      and inventory_items.status = 'active'
  ) then
    raise exception using errcode = '55000', message = 'Selecione um item de estoque ativo.';
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), old.updated_by);
  end if;

  return new;
end;
$$;

-- 5. Atualizar guard_maintenance_photo_mutation para permitir exclusão em cascata controlada
create or replace function public.guard_maintenance_photo_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_status text;
  cascade_allowed boolean := coalesce(
    current_setting('zion.allow_cascade_delete', true), ''
  ) = 'allowed';
  target_organization_id uuid := case
    when tg_op = 'DELETE' then old.organization_id
    else new.organization_id
  end;
  target_maintenance_id uuid := case
    when tg_op = 'DELETE' then old.maintenance_id
    else new.maintenance_id
  end;
begin
  if tg_op = 'DELETE' and cascade_allowed then
    return old;
  end if;

  select maintenances.status
  into maintenance_status
  from public.maintenances
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id
  for share;

  if not found then
    if tg_op = 'DELETE' and cascade_allowed then
      return old;
    end if;
    raise exception using errcode = '23503', message = 'Manutenção não encontrada nesta organização.';
  end if;

  if maintenance_status not in ('draft', 'in_progress') and not cascade_allowed then
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

-- 6. RPC: delete_client
create or replace function public.delete_client(
  target_organization_id uuid,
  target_client_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_ids uuid[];
  equipment_ids uuid[];
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Acesso não autorizado a esta organização.';
  end if;

  perform set_config('zion.allow_cascade_delete', 'allowed', true);

  -- 1. Coletar IDs de manutenções diretamente do cliente
  select array_agg(id) into maintenance_ids
  from public.maintenances
  where client_id = target_client_id
    and organization_id = target_organization_id;

  -- Coletar equipamentos do cliente
  select array_agg(id) into equipment_ids
  from public.equipment
  where client_id = target_client_id
    and organization_id = target_organization_id;

  -- Incluir manutenções dos equipamentos deste cliente
  if equipment_ids is not null and array_length(equipment_ids, 1) > 0 then
    select array_agg(distinct id) into maintenance_ids
    from (
      select id from public.maintenances
      where (client_id = target_client_id or equipment_id = any(equipment_ids))
        and organization_id = target_organization_id
    ) as sub;
  end if;

  -- 2. Limpar tudo vinculado às manutenções
  if maintenance_ids is not null and array_length(maintenance_ids, 1) > 0 then
    delete from public.maintenance_photos
    where maintenance_id = any(maintenance_ids)
      and organization_id = target_organization_id;

    delete from public.payments
    where maintenance_id = any(maintenance_ids)
      and organization_id = target_organization_id;

    delete from public.maintenance_parts
    where maintenance_id = any(maintenance_ids)
      and organization_id = target_organization_id;

    delete from public.return_schedules
    where origin_maintenance_id = any(maintenance_ids)
      and organization_id = target_organization_id;

    delete from public.maintenances
    where id = any(maintenance_ids)
      and organization_id = target_organization_id;
  end if;

  -- 3. Limpar pagamentos diretos (se houver)
  delete from public.payments
  where client_id = target_client_id
    and organization_id = target_organization_id;

  -- 4. Limpar retornos agendados
  delete from public.return_schedules
  where (client_id = target_client_id or (equipment_ids is not null and equipment_id = any(equipment_ids)))
    and organization_id = target_organization_id;

  -- 5. Excluir equipamentos do cliente
  if equipment_ids is not null and array_length(equipment_ids, 1) > 0 then
    delete from public.equipment
    where id = any(equipment_ids)
      and organization_id = target_organization_id;
  end if;

  -- 6. Excluir unidades do cliente
  delete from public.client_locations
  where client_id = target_client_id
    and organization_id = target_organization_id;

  -- 7. Excluir o cliente
  delete from public.clients
  where id = target_client_id
    and organization_id = target_organization_id;
end;
$$;

-- 7. RPC: delete_client_location
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

  perform set_config('zion.allow_cascade_delete', 'allowed', true);

  -- Desvincular localização dos aparelhos e manutenções
  update public.equipment
  set client_location_id = null
  where client_location_id = target_location_id
    and organization_id = target_organization_id;

  update public.maintenances
  set client_location_id = null
  where client_location_id = target_location_id
    and organization_id = target_organization_id;

  update public.return_schedules
  set client_location_id = null
  where client_location_id = target_location_id
    and organization_id = target_organization_id;

  -- Excluir a unidade
  delete from public.client_locations
  where id = target_location_id
    and organization_id = target_organization_id;
end;
$$;

-- 8. RPC: delete_equipment
create or replace function public.delete_equipment(
  target_organization_id uuid,
  target_equipment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_ids uuid[];
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Acesso não autorizado a esta organização.';
  end if;

  perform set_config('zion.allow_cascade_delete', 'allowed', true);

  -- Coletar manutenções do equipamento
  select array_agg(id) into maintenance_ids
  from public.maintenances
  where equipment_id = target_equipment_id
    and organization_id = target_organization_id;

  if maintenance_ids is not null and array_length(maintenance_ids, 1) > 0 then
    delete from public.maintenance_photos
    where maintenance_id = any(maintenance_ids)
      and organization_id = target_organization_id;

    delete from public.payments
    where maintenance_id = any(maintenance_ids)
      and organization_id = target_organization_id;

    delete from public.maintenance_parts
    where maintenance_id = any(maintenance_ids)
      and organization_id = target_organization_id;

    delete from public.return_schedules
    where origin_maintenance_id = any(maintenance_ids)
      and organization_id = target_organization_id;

    delete from public.maintenances
    where id = any(maintenance_ids)
      and organization_id = target_organization_id;
  end if;

  -- Deletar retornos do equipamento
  delete from public.return_schedules
  where equipment_id = target_equipment_id
    and organization_id = target_organization_id;

  -- Excluir o equipamento
  delete from public.equipment
  where id = target_equipment_id
    and organization_id = target_organization_id;
end;
$$;

-- 9. RPC: delete_inventory_item
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

  perform set_config('zion.allow_cascade_delete', 'allowed', true);

  -- Excluir peças de manutenções vinculadas
  delete from public.maintenance_parts
  where inventory_item_id = target_item_id
    and organization_id = target_organization_id;

  -- Excluir movimentações de estoque
  delete from public.inventory_movements
  where inventory_item_id = target_item_id
    and organization_id = target_organization_id;

  -- Excluir o item de estoque
  delete from public.inventory_items
  where id = target_item_id
    and organization_id = target_organization_id;
end;
$$;

-- 10. Políticas RLS de exclusão direta e permissões (GRANTS)
create policy "clients_delete_member"
on public.clients for delete to authenticated
using (public.is_organization_member(organization_id));

create policy "client_locations_delete_member"
on public.client_locations for delete to authenticated
using (public.is_organization_member(organization_id));

create policy "equipment_delete_member"
on public.equipment for delete to authenticated
using (public.is_organization_member(organization_id));

create policy "inventory_items_delete_member"
on public.inventory_items for delete to authenticated
using (public.is_organization_member(organization_id));

create policy "maintenances_delete_member"
on public.maintenances for delete to authenticated
using (public.is_organization_member(organization_id));

create policy "payments_delete_member"
on public.payments for delete to authenticated
using (public.is_organization_member(organization_id));

create policy "return_schedules_delete_member"
on public.return_schedules for delete to authenticated
using (public.is_organization_member(organization_id));

create policy "maintenance_photos_delete_member"
on public.maintenance_photos for delete to authenticated
using (public.is_organization_member(organization_id));

create policy "maintenance_parts_delete_member"
on public.maintenance_parts for delete to authenticated
using (public.is_organization_member(organization_id));

create policy "inventory_movements_delete_member"
on public.inventory_movements for delete to authenticated
using (public.is_organization_member(organization_id));

grant delete on table public.clients to authenticated;
grant delete on table public.client_locations to authenticated;
grant delete on table public.equipment to authenticated;
grant delete on table public.inventory_items to authenticated;
grant delete on table public.maintenances to authenticated;
grant delete on table public.payments to authenticated;
grant delete on table public.return_schedules to authenticated;
grant delete on table public.maintenance_photos to authenticated;
grant delete on table public.maintenance_parts to authenticated;
grant delete on table public.inventory_movements to authenticated;

grant execute on function public.delete_client(uuid, uuid) to authenticated;
grant execute on function public.delete_client_location(uuid, uuid) to authenticated;
grant execute on function public.delete_equipment(uuid, uuid) to authenticated;
grant execute on function public.delete_inventory_item(uuid, uuid) to authenticated;

commit;
