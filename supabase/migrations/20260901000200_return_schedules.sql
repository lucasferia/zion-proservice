begin;

create table public.return_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  client_id uuid not null,
  client_location_id uuid,
  equipment_id uuid not null,
  origin_maintenance_id uuid,
  scheduled_date date not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete restrict,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete restrict,
  cancellation_reason text,
  constraint return_schedules_id_organization_unique unique (id, organization_id),
  constraint return_schedules_client_organization_fk
    foreign key (client_id, organization_id)
    references public.clients (id, organization_id)
    on delete restrict,
  constraint return_schedules_location_client_organization_fk
    foreign key (client_location_id, client_id, organization_id)
    references public.client_locations (id, client_id, organization_id)
    on delete restrict,
  constraint return_schedules_equipment_client_organization_fk
    foreign key (equipment_id, client_id, organization_id)
    references public.equipment (id, client_id, organization_id)
    on delete restrict,
  constraint return_schedules_origin_maintenance_organization_fk
    foreign key (origin_maintenance_id, organization_id)
    references public.maintenances (id, organization_id)
    on delete restrict,
  constraint return_schedules_creator_organization_fk
    foreign key (organization_id, created_by)
    references public.organization_members (organization_id, user_id)
    on delete restrict,
  constraint return_schedules_origin_unique unique (origin_maintenance_id),
  constraint return_schedules_status_check check (
    status in ('pending', 'completed', 'cancelled')
  ),
  constraint return_schedules_notes_length check (
    notes is null or char_length(notes) <= 2000
  ),
  constraint return_schedules_cancellation_reason_length check (
    cancellation_reason is null
    or char_length(btrim(cancellation_reason)) between 3 and 500
  ),
  constraint return_schedules_audit_check check (
    (
      status = 'pending'
      and completed_at is null
      and completed_by is null
      and cancelled_at is null
      and cancelled_by is null
      and cancellation_reason is null
    )
    or (
      status = 'completed'
      and completed_at is not null
      and completed_by is not null
      and cancelled_at is null
      and cancelled_by is null
      and cancellation_reason is null
    )
    or (
      status = 'cancelled'
      and completed_at is null
      and completed_by is null
      and cancelled_at is not null
      and cancelled_by is not null
      and cancellation_reason is not null
    )
  )
);

create index return_schedules_organization_date_idx
  on public.return_schedules (organization_id, scheduled_date, id);

create index return_schedules_pending_date_idx
  on public.return_schedules (organization_id, scheduled_date, id)
  where status = 'pending';

create index return_schedules_client_date_idx
  on public.return_schedules (client_id, scheduled_date desc);

create index return_schedules_equipment_date_idx
  on public.return_schedules (equipment_id, scheduled_date desc);

create or replace function public.validate_return_schedule_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  equipment_record record;
  maintenance_record record;
begin
  select
    equipment.client_id,
    equipment.client_location_id,
    equipment.deleted_at
  into equipment_record
  from public.equipment
  where equipment.id = new.equipment_id
    and equipment.organization_id = new.organization_id;

  if not found or equipment_record.client_id <> new.client_id then
    raise exception using errcode = '23503', message = 'Equipamento e cliente não encontrados nesta organização.';
  end if;

  if equipment_record.client_location_id is distinct from new.client_location_id then
    raise exception using errcode = '23514', message = 'A unidade deve corresponder ao vínculo atual do equipamento.';
  end if;

  if equipment_record.deleted_at is not null then
    raise exception using errcode = '55000', message = 'Não é possível agendar retorno para equipamento arquivado.';
  end if;

  if not exists (
    select 1
    from public.clients
    where clients.id = new.client_id
      and clients.organization_id = new.organization_id
      and clients.deleted_at is null
  ) then
    raise exception using errcode = '55000', message = 'Não é possível agendar retorno para cliente arquivado.';
  end if;

  if new.client_location_id is not null and not exists (
    select 1
    from public.client_locations
    where client_locations.id = new.client_location_id
      and client_locations.client_id = new.client_id
      and client_locations.organization_id = new.organization_id
      and client_locations.deleted_at is null
  ) then
    raise exception using errcode = '55000', message = 'Não é possível agendar retorno para unidade arquivada.';
  end if;

  if new.origin_maintenance_id is not null then
    select
      maintenances.client_id,
      maintenances.client_location_id,
      maintenances.equipment_id,
      maintenances.status
    into maintenance_record
    from public.maintenances
    where maintenances.id = new.origin_maintenance_id
      and maintenances.organization_id = new.organization_id;

    if not found
      or maintenance_record.client_id <> new.client_id
      or maintenance_record.client_location_id is distinct from new.client_location_id
      or maintenance_record.equipment_id <> new.equipment_id
    then
      raise exception using errcode = '23514', message = 'A manutenção de origem deve possuir os mesmos vínculos do retorno.';
    end if;

    if maintenance_record.status <> 'completed' then
      raise exception using errcode = '55000', message = 'A manutenção de origem deve estar concluída.';
    end if;
  end if;

  return new;
end;
$$;

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

create trigger return_schedules_guard_mutation
before insert or update or delete on public.return_schedules
for each row execute function public.guard_return_schedule_mutation();

create trigger return_schedules_validate_links
before insert on public.return_schedules
for each row execute function public.validate_return_schedule_links();

alter table public.return_schedules enable row level security;

create policy "return_schedules_select_member"
on public.return_schedules
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "return_schedules_insert_member"
on public.return_schedules
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and created_by = (select auth.uid())
);

revoke all on table public.return_schedules from anon, authenticated;
grant select on table public.return_schedules to authenticated;
grant insert (
  organization_id,
  client_id,
  client_location_id,
  equipment_id,
  scheduled_date,
  notes
) on table public.return_schedules to authenticated;

create or replace function public.complete_maintenance_with_return(
  target_organization_id uuid,
  target_maintenance_id uuid,
  target_return_date date
)
returns table (
  maintenance_id uuid,
  work_order_number text,
  completed_at timestamptz,
  consumed_part_count integer,
  inventory_cost numeric,
  return_schedule_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  completion_record record;
  maintenance_record record;
  created_return_id uuid;
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para concluir esta manutenção.';
  end if;

  if target_return_date is null or target_return_date < current_date then
    raise exception using errcode = '22007', message = 'Escolha uma data de retorno igual ou posterior a hoje.';
  end if;

  select *
  into maintenance_record
  from public.maintenances
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Manutenção não encontrada.';
  end if;

  select *
  into completion_record
  from public.complete_maintenance(target_organization_id, target_maintenance_id);

  insert into public.return_schedules (
    organization_id,
    client_id,
    client_location_id,
    equipment_id,
    origin_maintenance_id,
    scheduled_date,
    notes,
    created_by
  )
  values (
    target_organization_id,
    maintenance_record.client_id,
    maintenance_record.client_location_id,
    maintenance_record.equipment_id,
    target_maintenance_id,
    target_return_date,
    'Retorno criado na conclusão da ' || maintenance_record.work_order_number,
    actor_id
  )
  returning id into created_return_id;

  return query
  select
    completion_record.maintenance_id,
    completion_record.work_order_number,
    completion_record.completed_at,
    completion_record.consumed_part_count,
    completion_record.inventory_cost,
    created_return_id;
end;
$$;

create or replace function public.complete_return_schedule(
  target_organization_id uuid,
  target_return_schedule_id uuid
)
returns table (
  return_schedule_id uuid,
  status text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_status text;
  completion_time timestamptz := now();
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para concluir este retorno.';
  end if;

  select return_schedules.status
  into current_status
  from public.return_schedules
  where return_schedules.id = target_return_schedule_id
    and return_schedules.organization_id = target_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Retorno não encontrado.';
  end if;

  if current_status <> 'pending' then
    raise exception using errcode = '55000', message = 'Somente retornos pendentes podem ser concluídos.';
  end if;

  perform set_config('zion.return_completion', 'allowed', true);
  update public.return_schedules
  set status = 'completed', completed_at = completion_time, completed_by = actor_id
  where id = target_return_schedule_id
    and organization_id = target_organization_id;
  perform set_config('zion.return_completion', '', true);

  return query select target_return_schedule_id, 'completed'::text, completion_time;
end;
$$;

create or replace function public.cancel_return_schedule(
  target_organization_id uuid,
  target_return_schedule_id uuid,
  cancellation_reason text
)
returns table (
  return_schedule_id uuid,
  status text,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_reason text := btrim(coalesce(cancellation_reason, ''));
  current_status text;
  cancellation_time timestamptz := now();
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para cancelar este retorno.';
  end if;

  if char_length(normalized_reason) < 3 or char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'Informe um motivo entre 3 e 500 caracteres.';
  end if;

  select return_schedules.status
  into current_status
  from public.return_schedules
  where return_schedules.id = target_return_schedule_id
    and return_schedules.organization_id = target_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Retorno não encontrado.';
  end if;

  if current_status <> 'pending' then
    raise exception using errcode = '55000', message = 'Somente retornos pendentes podem ser cancelados.';
  end if;

  perform set_config('zion.return_cancellation', 'allowed', true);
  update public.return_schedules
  set
    status = 'cancelled',
    cancelled_at = cancellation_time,
    cancelled_by = actor_id,
    cancellation_reason = normalized_reason
  where id = target_return_schedule_id
    and organization_id = target_organization_id;
  perform set_config('zion.return_cancellation', '', true);

  return query select target_return_schedule_id, 'cancelled'::text, cancellation_time;
end;
$$;

create or replace function public.search_return_schedules(
  target_organization_id uuid,
  search_term text default null,
  period_start date default null,
  period_end date default null,
  filter_client_id uuid default null,
  filter_city text default null,
  filter_status text default null,
  filter_equipment_id uuid default null
)
returns table (
  id uuid,
  organization_id uuid,
  client_id uuid,
  client_name text,
  client_location_id uuid,
  location_name text,
  city text,
  state text,
  equipment_id uuid,
  equipment_name text,
  origin_maintenance_id uuid,
  origin_work_order_number text,
  scheduled_date date,
  status text,
  notes text,
  created_at timestamptz,
  created_by uuid,
  completed_at timestamptz,
  completed_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancellation_reason text,
  is_overdue boolean,
  days_until integer,
  timing text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para consultar esta agenda.';
  end if;

  if nullif(btrim(filter_status), '') is not null
    and btrim(filter_status) not in ('pending', 'completed', 'cancelled')
  then
    raise exception using errcode = '22023', message = 'Status de retorno inválido.';
  end if;

  return query
  select
    return_schedules.id,
    return_schedules.organization_id,
    return_schedules.client_id,
    clients.name,
    return_schedules.client_location_id,
    client_locations.name,
    client_locations.city,
    client_locations.state,
    return_schedules.equipment_id,
    equipment.name,
    return_schedules.origin_maintenance_id,
    maintenances.work_order_number,
    return_schedules.scheduled_date,
    return_schedules.status,
    return_schedules.notes,
    return_schedules.created_at,
    return_schedules.created_by,
    return_schedules.completed_at,
    return_schedules.completed_by,
    return_schedules.cancelled_at,
    return_schedules.cancelled_by,
    return_schedules.cancellation_reason,
    return_schedules.status = 'pending' and return_schedules.scheduled_date < current_date,
    (return_schedules.scheduled_date - current_date)::integer,
    case
      when return_schedules.status <> 'pending' then return_schedules.status
      when return_schedules.scheduled_date < current_date then 'overdue'
      when return_schedules.scheduled_date = current_date then 'today'
      when return_schedules.scheduled_date <= current_date + 7 then 'week'
      when return_schedules.scheduled_date <= current_date + 30 then 'next_30'
      else 'future'
    end
  from public.return_schedules
  join public.clients
    on clients.id = return_schedules.client_id
    and clients.organization_id = return_schedules.organization_id
  join public.equipment
    on equipment.id = return_schedules.equipment_id
    and equipment.organization_id = return_schedules.organization_id
  left join public.client_locations
    on client_locations.id = return_schedules.client_location_id
    and client_locations.organization_id = return_schedules.organization_id
  left join public.maintenances
    on maintenances.id = return_schedules.origin_maintenance_id
    and maintenances.organization_id = return_schedules.organization_id
  where return_schedules.organization_id = target_organization_id
    and (
      nullif(btrim(search_term), '') is null
      or clients.name ilike '%' || btrim(search_term) || '%'
      or equipment.name ilike '%' || btrim(search_term) || '%'
      or coalesce(client_locations.name, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(return_schedules.notes, '') ilike '%' || btrim(search_term) || '%'
    )
    and (period_start is null or return_schedules.scheduled_date >= period_start)
    and (period_end is null or return_schedules.scheduled_date <= period_end)
    and (filter_client_id is null or return_schedules.client_id = filter_client_id)
    and (nullif(btrim(filter_city), '') is null or lower(client_locations.city) = lower(btrim(filter_city)))
    and (nullif(btrim(filter_status), '') is null or return_schedules.status = btrim(filter_status))
    and (filter_equipment_id is null or return_schedules.equipment_id = filter_equipment_id)
  order by
    case when return_schedules.status = 'pending' then 0 else 1 end,
    return_schedules.scheduled_date,
    return_schedules.id;
end;
$$;

create or replace function public.get_return_schedule_summary(
  target_organization_id uuid
)
returns table (
  overdue_count bigint,
  today_count bigint,
  week_count bigint,
  next_30_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para consultar o resumo da agenda.';
  end if;

  return query
  select
    count(*) filter (where scheduled_date < current_date),
    count(*) filter (where scheduled_date = current_date),
    count(*) filter (where scheduled_date > current_date and scheduled_date <= current_date + 7),
    count(*) filter (where scheduled_date > current_date and scheduled_date <= current_date + 30)
  from public.return_schedules
  where organization_id = target_organization_id
    and status = 'pending';
end;
$$;

revoke all on function public.validate_return_schedule_links() from public, anon, authenticated;
revoke all on function public.guard_return_schedule_mutation() from public, anon, authenticated;

revoke all on function public.complete_maintenance_with_return(uuid, uuid, date) from public, anon;
grant execute on function public.complete_maintenance_with_return(uuid, uuid, date) to authenticated;

revoke all on function public.complete_return_schedule(uuid, uuid) from public, anon;
grant execute on function public.complete_return_schedule(uuid, uuid) to authenticated;

revoke all on function public.cancel_return_schedule(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_return_schedule(uuid, uuid, text) to authenticated;

revoke all on function public.search_return_schedules(uuid, text, date, date, uuid, text, text, uuid)
  from public, anon;
grant execute on function public.search_return_schedules(uuid, text, date, date, uuid, text, text, uuid)
  to authenticated;

revoke all on function public.get_return_schedule_summary(uuid) from public, anon;
grant execute on function public.get_return_schedule_summary(uuid) to authenticated;

comment on table public.return_schedules is
  'Agenda de retornos por equipamento; vencimento é sempre calculado pela data atual.';
comment on function public.complete_maintenance_with_return(uuid, uuid, date) is
  'Conclui a OS, consome estoque e cria seu retorno de forma atômica.';
comment on function public.search_return_schedules(uuid, text, date, date, uuid, text, text, uuid) is
  'Lista a agenda autorizada com atraso e faixa temporal calculados, nunca persistidos.';

commit;
