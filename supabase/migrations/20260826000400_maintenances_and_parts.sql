begin;

alter table public.equipment
  add constraint equipment_id_client_organization_unique
  unique (id, client_id, organization_id);

create table public.maintenances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  client_id uuid not null,
  client_location_id uuid,
  equipment_id uuid not null,
  work_order_number text not null default (
    'OS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  maintenance_type text not null,
  status text not null default 'draft',
  scheduled_at timestamptz not null,
  diagnosis text,
  service_performed text,
  notes text,
  responsible_technician_id uuid not null default auth.uid(),
  total_amount numeric(14, 2) not null default 0,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete restrict,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete restrict,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenances_id_organization_unique unique (id, organization_id),
  constraint maintenances_work_order_organization_unique
    unique (organization_id, work_order_number),
  constraint maintenances_client_organization_fk
    foreign key (client_id, organization_id)
    references public.clients (id, organization_id)
    on delete restrict,
  constraint maintenances_location_client_organization_fk
    foreign key (client_location_id, client_id, organization_id)
    references public.client_locations (id, client_id, organization_id)
    on delete restrict,
  constraint maintenances_equipment_client_organization_fk
    foreign key (equipment_id, client_id, organization_id)
    references public.equipment (id, client_id, organization_id)
    on delete restrict,
  constraint maintenances_technician_organization_fk
    foreign key (organization_id, responsible_technician_id)
    references public.organization_members (organization_id, user_id)
    on delete restrict,
  constraint maintenances_work_order_length check (
    char_length(btrim(work_order_number)) between 4 and 40
  ),
  constraint maintenances_type_check check (
    maintenance_type in ('preventive', 'corrective')
  ),
  constraint maintenances_status_check check (
    status in ('draft', 'in_progress', 'completed', 'cancelled')
  ),
  constraint maintenances_diagnosis_length check (
    diagnosis is null or char_length(diagnosis) <= 4000
  ),
  constraint maintenances_service_length check (
    service_performed is null or char_length(service_performed) <= 6000
  ),
  constraint maintenances_notes_length check (
    notes is null or char_length(notes) <= 3000
  ),
  constraint maintenances_total_amount_nonnegative check (
    total_amount >= 0 and total_amount <= 999999999999.99
  ),
  constraint maintenances_cancellation_reason_length check (
    cancellation_reason is null or char_length(btrim(cancellation_reason)) between 3 and 500
  ),
  constraint maintenances_cancellation_audit check (
    (
      status = 'cancelled'
      and cancellation_reason is not null
      and cancelled_at is not null
      and cancelled_by is not null
      and completed_at is null
      and completed_by is null
    )
    or (
      status <> 'cancelled'
      and cancellation_reason is null
      and cancelled_at is null
      and cancelled_by is null
    )
  ),
  constraint maintenances_completion_audit check (
    (
      status = 'completed'
      and completed_at is not null
      and completed_by is not null
      and cancelled_at is null
      and cancelled_by is null
    )
    or (
      status <> 'completed'
      and completed_at is null
      and completed_by is null
    )
  )
);

alter table public.inventory_movements
  drop constraint inventory_movements_type_check,
  add column maintenance_id uuid,
  add constraint inventory_movements_id_organization_unique unique (id, organization_id),
  add constraint inventory_movements_type_check check (
    movement_type in ('entry', 'adjustment', 'maintenance_use')
  ),
  add constraint inventory_movements_maintenance_organization_fk
    foreign key (maintenance_id, organization_id)
    references public.maintenances (id, organization_id)
    on delete restrict,
  add constraint inventory_movements_maintenance_reference_check check (
    (movement_type = 'maintenance_use' and maintenance_id is not null and quantity_delta < 0)
    or (movement_type <> 'maintenance_use' and maintenance_id is null)
  );

create table public.maintenance_parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  maintenance_id uuid not null,
  inventory_item_id uuid not null,
  quantity numeric(14, 3) not null,
  unit_cost_snapshot numeric(14, 4),
  total_cost_snapshot numeric(14, 4),
  inventory_movement_id uuid,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_parts_maintenance_organization_fk
    foreign key (maintenance_id, organization_id)
    references public.maintenances (id, organization_id)
    on delete restrict,
  constraint maintenance_parts_item_organization_fk
    foreign key (inventory_item_id, organization_id)
    references public.inventory_items (id, organization_id)
    on delete restrict,
  constraint maintenance_parts_movement_organization_fk
    foreign key (inventory_movement_id, organization_id)
    references public.inventory_movements (id, organization_id)
    on delete restrict,
  constraint maintenance_parts_item_unique
    unique (maintenance_id, inventory_item_id),
  constraint maintenance_parts_movement_unique unique (inventory_movement_id),
  constraint maintenance_parts_quantity_positive check (
    quantity > 0 and quantity <= 99999999999.999
  ),
  constraint maintenance_parts_cost_nonnegative check (
    unit_cost_snapshot is null
    or (unit_cost_snapshot >= 0 and unit_cost_snapshot <= 9999999999.9999)
  ),
  constraint maintenance_parts_snapshot_complete check (
    (
      unit_cost_snapshot is null
      and total_cost_snapshot is null
      and inventory_movement_id is null
    )
    or (
      unit_cost_snapshot is not null
      and total_cost_snapshot is not null
      and inventory_movement_id is not null
      and total_cost_snapshot = round(quantity * unit_cost_snapshot, 4)
    )
  )
);

create index maintenances_organization_scheduled_idx
  on public.maintenances (organization_id, scheduled_at desc);

create index maintenances_organization_status_scheduled_idx
  on public.maintenances (organization_id, status, scheduled_at desc);

create index maintenances_equipment_scheduled_idx
  on public.maintenances (equipment_id, scheduled_at desc);

create index maintenances_client_scheduled_idx
  on public.maintenances (client_id, scheduled_at desc);

create index maintenances_organization_work_order_idx
  on public.maintenances (organization_id, lower(work_order_number));

create index maintenance_parts_maintenance_idx
  on public.maintenance_parts (maintenance_id, created_at);

create index maintenance_parts_inventory_item_idx
  on public.maintenance_parts (inventory_item_id, created_at desc);

create index inventory_movements_maintenance_idx
  on public.inventory_movements (maintenance_id, created_at)
  where maintenance_id is not null;

create or replace function public.validate_maintenance_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  equipment_record public.equipment%rowtype;
  links_changed boolean;
begin
  select *
  into equipment_record
  from public.equipment
  where id = new.equipment_id
    and organization_id = new.organization_id;

  if not found then
    raise exception using errcode = '23503', message = 'Equipamento não encontrado nesta organização.';
  end if;

  if equipment_record.client_id <> new.client_id
    or equipment_record.client_location_id is distinct from new.client_location_id
  then
    raise exception using
      errcode = '23514',
      message = 'Cliente e unidade devem corresponder ao vínculo atual do equipamento.';
  end if;

  links_changed := tg_op = 'INSERT'
    or new.organization_id is distinct from old.organization_id
    or new.client_id is distinct from old.client_id
    or new.client_location_id is distinct from old.client_location_id
    or new.equipment_id is distinct from old.equipment_id;

  if links_changed then
    if equipment_record.deleted_at is not null then
      raise exception using errcode = '55000', message = 'O equipamento selecionado está arquivado.';
    end if;

    if not exists (
      select 1
      from public.clients
      where clients.id = new.client_id
        and clients.organization_id = new.organization_id
        and clients.deleted_at is null
    ) then
      raise exception using errcode = '55000', message = 'O cliente selecionado está arquivado.';
    end if;

    if new.client_location_id is not null and not exists (
      select 1
      from public.client_locations
      where client_locations.id = new.client_location_id
        and client_locations.client_id = new.client_id
        and client_locations.organization_id = new.organization_id
        and client_locations.deleted_at is null
    ) then
      raise exception using errcode = '55000', message = 'A unidade selecionada está arquivada.';
    end if;
  end if;

  if tg_op = 'INSERT'
    or new.responsible_technician_id is distinct from old.responsible_technician_id
  then
    if not exists (
      select 1
      from public.organization_members
      where organization_members.organization_id = new.organization_id
        and organization_members.user_id = new.responsible_technician_id
        and organization_members.role in ('owner', 'technician')
        and organization_members.status = 'active'
    ) then
      raise exception using errcode = '23514', message = 'Selecione um técnico ativo da organização.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.guard_maintenance_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  completion_allowed boolean := coalesce(
    current_setting('zion.maintenance_completion', true), ''
  ) = 'allowed';
  cancellation_allowed boolean := coalesce(
    current_setting('zion.maintenance_cancellation', true), ''
  ) = 'allowed';
begin
  if old.status in ('completed', 'cancelled') then
    raise exception using errcode = '42501', message = 'Esta manutenção faz parte do histórico e é imutável.';
  end if;

  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.work_order_number is distinct from old.work_order_number
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '42501', message = 'Os identificadores da manutenção são imutáveis.';
  end if;

  if old.status = 'in_progress' and new.status = 'draft' then
    raise exception using errcode = '23514', message = 'Uma manutenção em andamento não pode voltar para rascunho.';
  end if;

  if new.status = 'completed' and not completion_allowed then
    raise exception using errcode = '42501', message = 'Conclua a manutenção pela operação transacional.';
  end if;

  if new.status = 'cancelled' and not cancellation_allowed then
    raise exception using errcode = '42501', message = 'Cancele a manutenção informando um motivo rastreável.';
  end if;

  if new.status not in ('draft', 'in_progress', 'completed', 'cancelled') then
    raise exception using errcode = '23514', message = 'Transição de status inválida.';
  end if;

  if not completion_allowed and (
    new.completed_at is distinct from old.completed_at
    or new.completed_by is distinct from old.completed_by
  ) then
    raise exception using errcode = '42501', message = 'A auditoria de conclusão é protegida.';
  end if;

  if not cancellation_allowed and (
    new.cancellation_reason is distinct from old.cancellation_reason
    or new.cancelled_at is distinct from old.cancelled_at
    or new.cancelled_by is distinct from old.cancelled_by
  ) then
    raise exception using errcode = '42501', message = 'A auditoria de cancelamento é protegida.';
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  return new;
end;
$$;

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
  target_organization_id uuid := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  target_maintenance_id uuid := case when tg_op = 'DELETE' then old.maintenance_id else new.maintenance_id end;
begin
  select status
  into maintenance_status
  from public.maintenances
  where id = target_maintenance_id
    and organization_id = target_organization_id
  for share;

  if not found then
    raise exception using errcode = '23503', message = 'Manutenção não encontrada nesta organização.';
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
      raise exception using errcode = '42501', message = 'A conclusão só pode congelar os custos da peça.';
    end if;

    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), old.updated_by);
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

create trigger maintenances_guard_mutation
before update on public.maintenances
for each row execute function public.guard_maintenance_mutation();

create trigger maintenances_validate_links
before insert or update on public.maintenances
for each row execute function public.validate_maintenance_links();

create trigger maintenance_parts_guard_mutation
before insert or update or delete on public.maintenance_parts
for each row execute function public.guard_maintenance_part_mutation();

revoke all on function public.validate_maintenance_links() from public, anon, authenticated;
revoke all on function public.guard_maintenance_mutation() from public, anon, authenticated;
revoke all on function public.guard_maintenance_part_mutation() from public, anon, authenticated;

alter table public.maintenances enable row level security;
alter table public.maintenance_parts enable row level security;

create policy "maintenances_select_member"
on public.maintenances
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "maintenances_insert_member"
on public.maintenances
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and status = 'draft'
);

create policy "maintenances_update_open_member"
on public.maintenances
for update
to authenticated
using (
  public.is_organization_member(organization_id)
  and status in ('draft', 'in_progress')
)
with check (
  public.is_organization_member(organization_id)
  and status in ('draft', 'in_progress')
);

create policy "maintenance_parts_select_member"
on public.maintenance_parts
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "maintenance_parts_insert_open_member"
on public.maintenance_parts
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and exists (
    select 1
    from public.maintenances
    where maintenances.id = maintenance_parts.maintenance_id
      and maintenances.organization_id = maintenance_parts.organization_id
      and maintenances.status in ('draft', 'in_progress')
  )
);

create policy "maintenance_parts_update_open_member"
on public.maintenance_parts
for update
to authenticated
using (
  public.is_organization_member(organization_id)
  and exists (
    select 1
    from public.maintenances
    where maintenances.id = maintenance_parts.maintenance_id
      and maintenances.organization_id = maintenance_parts.organization_id
      and maintenances.status in ('draft', 'in_progress')
  )
)
with check (
  public.is_organization_member(organization_id)
  and exists (
    select 1
    from public.maintenances
    where maintenances.id = maintenance_parts.maintenance_id
      and maintenances.organization_id = maintenance_parts.organization_id
      and maintenances.status in ('draft', 'in_progress')
  )
);

create policy "maintenance_parts_delete_open_member"
on public.maintenance_parts
for delete
to authenticated
using (
  public.is_organization_member(organization_id)
  and exists (
    select 1
    from public.maintenances
    where maintenances.id = maintenance_parts.maintenance_id
      and maintenances.organization_id = maintenance_parts.organization_id
      and maintenances.status in ('draft', 'in_progress')
  )
);

revoke all on table public.maintenances from anon, authenticated;
revoke all on table public.maintenance_parts from anon, authenticated;

grant select on table public.maintenances to authenticated;
grant insert (
  organization_id,
  client_id,
  client_location_id,
  equipment_id,
  maintenance_type,
  scheduled_at,
  diagnosis,
  service_performed,
  notes,
  responsible_technician_id,
  total_amount
) on table public.maintenances to authenticated;
grant update (
  client_id,
  client_location_id,
  equipment_id,
  maintenance_type,
  status,
  scheduled_at,
  diagnosis,
  service_performed,
  notes,
  responsible_technician_id,
  total_amount
) on table public.maintenances to authenticated;

grant select on table public.maintenance_parts to authenticated;
grant insert (
  organization_id,
  maintenance_id,
  inventory_item_id,
  quantity
) on table public.maintenance_parts to authenticated;
grant update (
  inventory_item_id,
  quantity
) on table public.maintenance_parts to authenticated;
grant delete on table public.maintenance_parts to authenticated;

create or replace function public.complete_maintenance(
  target_organization_id uuid,
  target_maintenance_id uuid
)
returns table (
  maintenance_id uuid,
  work_order_number text,
  completed_at timestamptz,
  consumed_part_count integer,
  inventory_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  maintenance_record public.maintenances%rowtype;
  part_record record;
  movement_id uuid;
  next_quantity numeric(14, 3);
  frozen_total numeric(14, 4);
  completion_time timestamptz := now();
  part_count integer := 0;
  total_inventory_cost numeric := 0;
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para concluir esta manutenção.';
  end if;

  select *
  into maintenance_record
  from public.maintenances
  where id = target_maintenance_id
    and organization_id = target_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Manutenção não encontrada.';
  end if;

  if maintenance_record.status not in ('draft', 'in_progress') then
    raise exception using errcode = '55000', message = 'Somente manutenções abertas podem ser concluídas.';
  end if;

  if char_length(btrim(coalesce(maintenance_record.diagnosis, ''))) < 3 then
    raise exception using errcode = '23514', message = 'Informe o diagnóstico antes de concluir.';
  end if;

  if char_length(btrim(coalesce(maintenance_record.service_performed, ''))) < 3 then
    raise exception using errcode = '23514', message = 'Informe o serviço realizado antes de concluir.';
  end if;

  perform inventory_items.id
  from public.inventory_items
  join public.maintenance_parts
    on maintenance_parts.inventory_item_id = inventory_items.id
    and maintenance_parts.organization_id = inventory_items.organization_id
  where maintenance_parts.maintenance_id = target_maintenance_id
    and maintenance_parts.organization_id = target_organization_id
  order by inventory_items.id
  for update of inventory_items;

  for part_record in
    select
      maintenance_parts.id as part_id,
      maintenance_parts.quantity,
      inventory_items.id as item_id,
      inventory_items.name as item_name,
      inventory_items.current_quantity,
      inventory_items.average_unit_cost,
      inventory_items.status as item_status,
      inventory_items.deleted_at as item_deleted_at
    from public.maintenance_parts
    join public.inventory_items
      on inventory_items.id = maintenance_parts.inventory_item_id
      and inventory_items.organization_id = maintenance_parts.organization_id
    where maintenance_parts.maintenance_id = target_maintenance_id
      and maintenance_parts.organization_id = target_organization_id
    order by inventory_items.id
  loop
    if part_record.item_deleted_at is not null or part_record.item_status <> 'active' then
      raise exception using
        errcode = '55000',
        message = format('O item "%s" não está ativo para consumo.', part_record.item_name);
    end if;

    if part_record.current_quantity < part_record.quantity then
      raise exception using
        errcode = '23514',
        message = format('Saldo insuficiente para o item "%s".', part_record.item_name);
    end if;

    next_quantity := part_record.current_quantity - part_record.quantity;
    frozen_total := round(part_record.quantity * part_record.average_unit_cost, 4);

    perform set_config('zion.inventory_movement', 'allowed', true);
    update public.inventory_items
    set current_quantity = next_quantity
    where id = part_record.item_id
      and organization_id = target_organization_id;
    perform set_config('zion.inventory_movement', '', true);

    insert into public.inventory_movements (
      organization_id,
      inventory_item_id,
      movement_type,
      quantity_delta,
      previous_quantity,
      resulting_quantity,
      unit_cost,
      reason,
      maintenance_id,
      created_by
    )
    values (
      target_organization_id,
      part_record.item_id,
      'maintenance_use',
      -part_record.quantity,
      part_record.current_quantity,
      next_quantity,
      part_record.average_unit_cost,
      'Consumo na ' || maintenance_record.work_order_number,
      target_maintenance_id,
      actor_id
    )
    returning id into movement_id;

    perform set_config('zion.maintenance_completion', 'allowed', true);
    update public.maintenance_parts
    set
      unit_cost_snapshot = part_record.average_unit_cost,
      total_cost_snapshot = frozen_total,
      inventory_movement_id = movement_id
    where id = part_record.part_id;
    perform set_config('zion.maintenance_completion', '', true);

    part_count := part_count + 1;
    total_inventory_cost := total_inventory_cost + frozen_total;
  end loop;

  perform set_config('zion.maintenance_completion', 'allowed', true);
  update public.maintenances
  set
    status = 'completed',
    completed_at = completion_time,
    completed_by = actor_id
  where id = target_maintenance_id
    and organization_id = target_organization_id;
  perform set_config('zion.maintenance_completion', '', true);

  return query
  select
    maintenance_record.id,
    maintenance_record.work_order_number,
    completion_time,
    part_count,
    total_inventory_cost;
end;
$$;

create or replace function public.cancel_maintenance(
  target_organization_id uuid,
  target_maintenance_id uuid,
  cancellation_reason text
)
returns table (
  maintenance_id uuid,
  status text,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  cancellation_time timestamptz := now();
  normalized_reason text := btrim(coalesce(cancellation_reason, ''));
  current_status text;
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para cancelar esta manutenção.';
  end if;

  if char_length(normalized_reason) < 3 or char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'Informe um motivo entre 3 e 500 caracteres.';
  end if;

  select maintenances.status
  into current_status
  from public.maintenances
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Manutenção não encontrada.';
  end if;

  if current_status not in ('draft', 'in_progress') then
    raise exception using errcode = '55000', message = 'Somente manutenções abertas podem ser canceladas.';
  end if;

  perform set_config('zion.maintenance_cancellation', 'allowed', true);
  update public.maintenances
  set
    status = 'cancelled',
    cancellation_reason = normalized_reason,
    cancelled_at = cancellation_time,
    cancelled_by = actor_id
  where id = target_maintenance_id
    and organization_id = target_organization_id;
  perform set_config('zion.maintenance_cancellation', '', true);

  return query select target_maintenance_id, 'cancelled'::text, cancellation_time;
end;
$$;

create or replace function public.search_maintenances(
  target_organization_id uuid,
  search_term text default null,
  period_start timestamptz default null,
  period_end timestamptz default null,
  filter_type text default null,
  filter_status text default null,
  filter_equipment_id uuid default null
)
returns table (
  id uuid,
  organization_id uuid,
  work_order_number text,
  maintenance_type text,
  status text,
  scheduled_at timestamptz,
  total_amount numeric,
  client_id uuid,
  client_name text,
  client_location_id uuid,
  location_name text,
  equipment_id uuid,
  equipment_name text,
  responsible_technician_id uuid,
  technician_name text,
  part_count integer,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para consultar estas manutenções.';
  end if;

  return query
  select
    maintenances.id,
    maintenances.organization_id,
    maintenances.work_order_number,
    maintenances.maintenance_type,
    maintenances.status,
    maintenances.scheduled_at,
    maintenances.total_amount,
    maintenances.client_id,
    clients.name,
    maintenances.client_location_id,
    client_locations.name,
    maintenances.equipment_id,
    equipment.name,
    maintenances.responsible_technician_id,
    coalesce(profiles.full_name, 'Técnico da organização'),
    count(maintenance_parts.id)::integer,
    maintenances.completed_at,
    maintenances.created_at,
    maintenances.updated_at
  from public.maintenances
  join public.clients
    on clients.id = maintenances.client_id
    and clients.organization_id = maintenances.organization_id
  join public.equipment
    on equipment.id = maintenances.equipment_id
    and equipment.organization_id = maintenances.organization_id
  left join public.client_locations
    on client_locations.id = maintenances.client_location_id
    and client_locations.organization_id = maintenances.organization_id
  left join public.profiles
    on profiles.id = maintenances.responsible_technician_id
  left join public.maintenance_parts
    on maintenance_parts.maintenance_id = maintenances.id
    and maintenance_parts.organization_id = maintenances.organization_id
  where maintenances.organization_id = target_organization_id
    and (
      nullif(btrim(search_term), '') is null
      or maintenances.work_order_number ilike '%' || btrim(search_term) || '%'
      or clients.name ilike '%' || btrim(search_term) || '%'
      or equipment.name ilike '%' || btrim(search_term) || '%'
    )
    and (period_start is null or maintenances.scheduled_at >= period_start)
    and (period_end is null or maintenances.scheduled_at < period_end)
    and (nullif(btrim(filter_type), '') is null or maintenances.maintenance_type = btrim(filter_type))
    and (nullif(btrim(filter_status), '') is null or maintenances.status = btrim(filter_status))
    and (filter_equipment_id is null or maintenances.equipment_id = filter_equipment_id)
  group by
    maintenances.id,
    clients.name,
    client_locations.name,
    equipment.name,
    profiles.full_name
  order by maintenances.scheduled_at desc, maintenances.id desc;
end;
$$;

create or replace function public.get_organization_technicians(
  target_organization_id uuid
)
returns table (
  user_id uuid,
  full_name text,
  role text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para consultar os técnicos.';
  end if;

  return query
  select
    organization_members.user_id,
    coalesce(profiles.full_name, 'Usuário da organização'),
    organization_members.role
  from public.organization_members
  left join public.profiles on profiles.id = organization_members.user_id
  where organization_members.organization_id = target_organization_id
    and organization_members.status = 'active'
    and organization_members.role in ('owner', 'technician')
  order by lower(coalesce(profiles.full_name, 'Usuário da organização'));
end;
$$;

revoke all on function public.complete_maintenance(uuid, uuid) from public, anon;
grant execute on function public.complete_maintenance(uuid, uuid) to authenticated;

revoke all on function public.cancel_maintenance(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_maintenance(uuid, uuid, text) to authenticated;

revoke all on function public.search_maintenances(uuid, text, timestamptz, timestamptz, text, text, uuid)
  from public, anon;
grant execute on function public.search_maintenances(uuid, text, timestamptz, timestamptz, text, text, uuid)
  to authenticated;

revoke all on function public.get_organization_technicians(uuid) from public, anon;
grant execute on function public.get_organization_technicians(uuid) to authenticated;

comment on table public.maintenances is
  'Ordens de serviço vinculadas a equipamento, cliente e unidade do mesmo tenant.';
comment on table public.maintenance_parts is
  'Peças planejadas e snapshots imutáveis de custo e consumo após a conclusão da OS.';
comment on function public.complete_maintenance(uuid, uuid) is
  'Conclui a OS e consome todas as peças atomicamente, com bloqueios ordenados de estoque.';
comment on function public.cancel_maintenance(uuid, uuid, text) is
  'Cancela uma OS aberta com motivo auditável, sem estorno de estoque.';

commit;
