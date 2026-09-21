begin;

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  title text not null,
  description text,
  event_type text not null,
  status text not null default 'scheduled',
  is_all_day boolean not null default false,
  event_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  client_id uuid,
  client_location_id uuid,
  equipment_id uuid,
  maintenance_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete restrict,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete restrict,
  cancellation_reason text,
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete restrict,
  constraint calendar_events_id_organization_unique unique (id, organization_id),
  constraint calendar_events_client_organization_fk
    foreign key (client_id, organization_id)
    references public.clients (id, organization_id)
    on delete restrict,
  constraint calendar_events_location_client_organization_fk
    foreign key (client_location_id, client_id, organization_id)
    references public.client_locations (id, client_id, organization_id)
    on delete restrict,
  constraint calendar_events_equipment_organization_fk
    foreign key (equipment_id, organization_id)
    references public.equipment (id, organization_id)
    on delete restrict,
  constraint calendar_events_maintenance_organization_fk
    foreign key (maintenance_id, organization_id)
    references public.maintenances (id, organization_id)
    on delete restrict,
  constraint calendar_events_created_by_organization_fk
    foreign key (organization_id, created_by)
    references public.organization_members (organization_id, user_id)
    on delete restrict,
  constraint calendar_events_updated_by_organization_fk
    foreign key (organization_id, updated_by)
    references public.organization_members (organization_id, user_id)
    on delete restrict,
  constraint calendar_events_title_length check (char_length(btrim(title)) between 2 and 160),
  constraint calendar_events_description_length check (description is null or char_length(description) <= 3000),
  constraint calendar_events_type_check check (
    event_type in (
      'technical_visit', 'quote', 'meeting', 'inspection', 'installation',
      'commercial_visit', 'reminder', 'other'
    )
  ),
  constraint calendar_events_status_check check (status in ('scheduled', 'completed', 'cancelled')),
  constraint calendar_events_schedule_check check (
    (is_all_day and event_date is not null and starts_at is null and ends_at is null)
    or
    (not is_all_day and event_date is null and starts_at is not null and (ends_at is null or ends_at > starts_at))
  ),
  constraint calendar_events_location_requires_client check (client_location_id is null or client_id is not null),
  constraint calendar_events_cancellation_reason_length check (
    cancellation_reason is null or char_length(btrim(cancellation_reason)) between 3 and 500
  ),
  constraint calendar_events_status_audit_check check (
    (
      status = 'scheduled'
      and completed_at is null and completed_by is null
      and cancelled_at is null and cancelled_by is null and cancellation_reason is null
    )
    or (
      status = 'completed'
      and completed_at is not null and completed_by is not null
      and cancelled_at is null and cancelled_by is null and cancellation_reason is null
    )
    or (
      status = 'cancelled'
      and completed_at is null and completed_by is null
      and cancelled_at is not null and cancelled_by is not null and cancellation_reason is not null
    )
  ),
  constraint calendar_events_archive_audit_check check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  )
);

create index calendar_events_organization_schedule_idx
  on public.calendar_events (organization_id, event_date, starts_at, id)
  where archived_at is null;

create index calendar_events_organization_status_idx
  on public.calendar_events (organization_id, status, id)
  where archived_at is null;

create index calendar_events_organization_type_idx
  on public.calendar_events (organization_id, event_type, id)
  where archived_at is null;

create index calendar_events_client_idx
  on public.calendar_events (organization_id, client_id, id)
  where archived_at is null and client_id is not null;

create or replace function public.prepare_calendar_event_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Autenticação obrigatória para alterar eventos.';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := actor_id;
    new.updated_by := actor_id;
    new.created_at := now();
    new.updated_at := now();
  else
    new.updated_by := actor_id;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.validate_calendar_event_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_record record;
begin
  if new.client_id is not null and not exists (
    select 1 from public.clients
    where clients.id = new.client_id
      and clients.organization_id = new.organization_id
      and clients.deleted_at is null
  ) then
    raise exception using errcode = '55000', message = 'O cliente selecionado não existe nesta organização ou está arquivado.';
  end if;

  if new.client_location_id is not null and not exists (
    select 1 from public.client_locations
    where client_locations.id = new.client_location_id
      and client_locations.client_id = new.client_id
      and client_locations.organization_id = new.organization_id
      and client_locations.deleted_at is null
  ) then
    raise exception using errcode = '55000', message = 'A unidade selecionada não pertence ao cliente ou está arquivada.';
  end if;

  if new.equipment_id is not null and not exists (
    select 1 from public.equipment
    where equipment.id = new.equipment_id
      and equipment.organization_id = new.organization_id
      and equipment.deleted_at is null
  ) then
    raise exception using errcode = '55000', message = 'O equipamento selecionado não existe nesta organização ou está arquivado.';
  end if;

  if new.maintenance_id is not null then
    select client_id, client_location_id, equipment_id
    into maintenance_record
    from public.maintenances
    where maintenances.id = new.maintenance_id
      and maintenances.organization_id = new.organization_id;

    if not found then
      raise exception using errcode = '55000', message = 'A ordem de serviço selecionada não existe nesta organização.';
    end if;
    if new.client_id is not null and new.client_id <> maintenance_record.client_id then
      raise exception using errcode = '23514', message = 'O cliente deve corresponder à ordem de serviço selecionada.';
    end if;
    if new.client_location_id is not null
      and new.client_location_id is distinct from maintenance_record.client_location_id
    then
      raise exception using errcode = '23514', message = 'A unidade deve corresponder à ordem de serviço selecionada.';
    end if;
    if new.equipment_id is not null and new.equipment_id <> maintenance_record.equipment_id then
      raise exception using errcode = '23514', message = 'O equipamento deve corresponder à ordem de serviço selecionada.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.guard_calendar_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  state_change_allowed boolean := coalesce(current_setting('zion.calendar_event_state_change', true), '') = 'allowed';
  archive_allowed boolean := coalesce(current_setting('zion.calendar_event_archive', true), '') = 'allowed';
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'Eventos da agenda não podem ser excluídos diretamente.';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'scheduled'
      or new.completed_at is not null or new.completed_by is not null
      or new.cancelled_at is not null or new.cancelled_by is not null or new.cancellation_reason is not null
      or new.archived_at is not null or new.archived_by is not null
    then
      raise exception using errcode = '23514', message = 'Um evento deve ser criado como agendado e ativo.';
    end if;
    return new;
  end if;

  if old.archived_at is not null then
    raise exception using errcode = '42501', message = 'Eventos arquivados são imutáveis.';
  end if;

  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception using errcode = '42501', message = 'A identidade e a auditoria de criação do evento são imutáveis.';
  end if;

  if old.status <> 'scheduled' and not archive_allowed then
    raise exception using errcode = '42501', message = 'Eventos concluídos ou cancelados são somente leitura.';
  end if;

  if not state_change_allowed and (
    new.status is distinct from old.status
    or new.completed_at is distinct from old.completed_at
    or new.completed_by is distinct from old.completed_by
    or new.cancelled_at is distinct from old.cancelled_at
    or new.cancelled_by is distinct from old.cancelled_by
    or new.cancellation_reason is distinct from old.cancellation_reason
  ) then
    raise exception using errcode = '42501', message = 'Altere o status pela operação rastreável.';
  end if;

  if not archive_allowed and (
    new.archived_at is distinct from old.archived_at
    or new.archived_by is distinct from old.archived_by
  ) then
    raise exception using errcode = '42501', message = 'Arquive o evento pela operação rastreável.';
  end if;

  return new;
end;
$$;

create trigger calendar_events_00_prepare_audit
before insert or update on public.calendar_events
for each row execute function public.prepare_calendar_event_audit();

create trigger calendar_events_10_guard_mutation
before insert or update or delete on public.calendar_events
for each row execute function public.guard_calendar_event_mutation();

create trigger calendar_events_20_validate_links
before insert or update of organization_id, client_id, client_location_id, equipment_id, maintenance_id
on public.calendar_events
for each row execute function public.validate_calendar_event_links();

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_member"
on public.calendar_events
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "calendar_events_insert_owner"
on public.calendar_events
for insert
to authenticated
with check (public.is_organization_owner(organization_id));

create policy "calendar_events_update_owner"
on public.calendar_events
for update
to authenticated
using (public.is_organization_owner(organization_id))
with check (public.is_organization_owner(organization_id));

revoke all on table public.calendar_events from anon, authenticated;
grant select on table public.calendar_events to authenticated;
grant insert (
  organization_id, title, description, event_type, status, is_all_day,
  event_date, starts_at, ends_at, client_id, client_location_id,
  equipment_id, maintenance_id
) on table public.calendar_events to authenticated;
grant update (
  title, description, event_type, is_all_day, event_date, starts_at, ends_at,
  client_id, client_location_id, equipment_id, maintenance_id
) on table public.calendar_events to authenticated;

create or replace function public.complete_calendar_event(
  target_organization_id uuid,
  target_event_id uuid
)
returns table (calendar_event_id uuid, status text, completed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  completion_time timestamptz := now();
  current_status text;
  current_archived_at timestamptz;
begin
  if actor_id is null or not public.is_organization_owner(target_organization_id) then
    raise exception using errcode = '42501', message = 'Somente o owner pode concluir eventos da agenda.';
  end if;

  select calendar_events.status, calendar_events.archived_at
  into current_status, current_archived_at
  from public.calendar_events
  where calendar_events.id = target_event_id
    and calendar_events.organization_id = target_organization_id
  for update;

  if not found then raise exception using errcode = 'P0002', message = 'Evento não encontrado.'; end if;
  if current_archived_at is not null then raise exception using errcode = '55000', message = 'O evento está arquivado.'; end if;
  if current_status <> 'scheduled' then raise exception using errcode = '55000', message = 'Somente eventos agendados podem ser concluídos.'; end if;

  perform set_config('zion.calendar_event_state_change', 'allowed', true);
  update public.calendar_events
  set status = 'completed', completed_at = completion_time, completed_by = actor_id
  where id = target_event_id and organization_id = target_organization_id;
  perform set_config('zion.calendar_event_state_change', '', true);

  return query select target_event_id, 'completed'::text, completion_time;
end;
$$;

create or replace function public.cancel_calendar_event(
  target_organization_id uuid,
  target_event_id uuid,
  cancellation_reason text
)
returns table (calendar_event_id uuid, status text, cancelled_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_reason text := btrim(coalesce(cancellation_reason, ''));
  cancellation_time timestamptz := now();
  current_status text;
  current_archived_at timestamptz;
begin
  if actor_id is null or not public.is_organization_owner(target_organization_id) then
    raise exception using errcode = '42501', message = 'Somente o owner pode cancelar eventos da agenda.';
  end if;
  if char_length(normalized_reason) < 3 or char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'Informe um motivo entre 3 e 500 caracteres.';
  end if;

  select calendar_events.status, calendar_events.archived_at
  into current_status, current_archived_at
  from public.calendar_events
  where calendar_events.id = target_event_id
    and calendar_events.organization_id = target_organization_id
  for update;

  if not found then raise exception using errcode = 'P0002', message = 'Evento não encontrado.'; end if;
  if current_archived_at is not null then raise exception using errcode = '55000', message = 'O evento está arquivado.'; end if;
  if current_status <> 'scheduled' then raise exception using errcode = '55000', message = 'Somente eventos agendados podem ser cancelados.'; end if;

  perform set_config('zion.calendar_event_state_change', 'allowed', true);
  update public.calendar_events
  set status = 'cancelled', cancelled_at = cancellation_time,
      cancelled_by = actor_id, cancellation_reason = normalized_reason
  where id = target_event_id and organization_id = target_organization_id;
  perform set_config('zion.calendar_event_state_change', '', true);

  return query select target_event_id, 'cancelled'::text, cancellation_time;
end;
$$;

create or replace function public.archive_calendar_event(
  target_organization_id uuid,
  target_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not public.is_organization_owner(target_organization_id) then
    raise exception using errcode = '42501', message = 'Somente o owner pode arquivar eventos da agenda.';
  end if;

  perform 1 from public.calendar_events
  where id = target_event_id and organization_id = target_organization_id and archived_at is null
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Evento não encontrado ou já arquivado.'; end if;

  perform set_config('zion.calendar_event_archive', 'allowed', true);
  update public.calendar_events
  set archived_at = now(), archived_by = actor_id
  where id = target_event_id and organization_id = target_organization_id;
  perform set_config('zion.calendar_event_archive', '', true);
end;
$$;

create or replace function public.search_calendar_events(
  target_organization_id uuid,
  search_term text default null,
  period_start date default null,
  period_end date default null,
  filter_event_type text default null,
  filter_status text default null,
  filter_client_id uuid default null,
  filter_city text default null
)
returns table (
  id uuid, organization_id uuid, title text, description text, event_type text,
  status text, is_all_day boolean, event_date date, starts_at timestamptz, ends_at timestamptz,
  client_id uuid, client_name text, client_location_id uuid, location_name text,
  location_city text, equipment_id uuid, equipment_name text, maintenance_id uuid,
  work_order_number text, created_at timestamptz, created_by uuid, updated_at timestamptz,
  updated_by uuid, completed_at timestamptz, completed_by uuid, cancelled_at timestamptz,
  cancelled_by uuid, cancellation_reason text
)
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para consultar esta agenda.';
  end if;
  if nullif(btrim(filter_event_type), '') is not null and btrim(filter_event_type) not in (
    'technical_visit', 'quote', 'meeting', 'inspection', 'installation',
    'commercial_visit', 'reminder', 'other'
  ) then raise exception using errcode = '22023', message = 'Tipo de evento inválido.'; end if;
  if nullif(btrim(filter_status), '') is not null and btrim(filter_status) not in ('scheduled', 'completed', 'cancelled') then
    raise exception using errcode = '22023', message = 'Status de evento inválido.';
  end if;

  return query
  select
    events.id, events.organization_id, events.title, events.description, events.event_type,
    events.status, events.is_all_day, events.event_date, events.starts_at, events.ends_at,
    events.client_id, clients.name, events.client_location_id, locations.name, locations.city,
    events.equipment_id, equipment.name, events.maintenance_id, maintenances.work_order_number,
    events.created_at, events.created_by, events.updated_at, events.updated_by,
    events.completed_at, events.completed_by, events.cancelled_at, events.cancelled_by,
    events.cancellation_reason
  from public.calendar_events as events
  left join public.clients
    on clients.id = events.client_id and clients.organization_id = events.organization_id
  left join public.client_locations as locations
    on locations.id = events.client_location_id and locations.organization_id = events.organization_id
  left join public.equipment
    on equipment.id = events.equipment_id and equipment.organization_id = events.organization_id
  left join public.maintenances
    on maintenances.id = events.maintenance_id and maintenances.organization_id = events.organization_id
  where events.organization_id = target_organization_id
    and events.archived_at is null
    and (
      nullif(btrim(search_term), '') is null
      or events.title ilike '%' || btrim(search_term) || '%'
      or coalesce(events.description, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(clients.name, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(locations.name, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.name, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(maintenances.work_order_number, '') ilike '%' || btrim(search_term) || '%'
    )
    and (period_start is null or coalesce(events.event_date, (events.starts_at at time zone 'America/Sao_Paulo')::date) >= period_start)
    and (period_end is null or coalesce(events.event_date, (events.starts_at at time zone 'America/Sao_Paulo')::date) <= period_end)
    and (nullif(btrim(filter_event_type), '') is null or events.event_type = btrim(filter_event_type))
    and (nullif(btrim(filter_status), '') is null or events.status = btrim(filter_status))
    and (filter_client_id is null or events.client_id = filter_client_id)
    and (nullif(btrim(filter_city), '') is null or lower(locations.city) = lower(btrim(filter_city)))
  order by
    coalesce(events.event_date, (events.starts_at at time zone 'America/Sao_Paulo')::date),
    events.is_all_day desc,
    events.starts_at nulls first,
    events.id;
end;
$$;

revoke all on function public.prepare_calendar_event_audit() from public, anon, authenticated;
revoke all on function public.validate_calendar_event_links() from public, anon, authenticated;
revoke all on function public.guard_calendar_event_mutation() from public, anon, authenticated;
revoke all on function public.complete_calendar_event(uuid, uuid) from public, anon;
revoke all on function public.cancel_calendar_event(uuid, uuid, text) from public, anon;
revoke all on function public.archive_calendar_event(uuid, uuid) from public, anon;
revoke all on function public.search_calendar_events(uuid, text, date, date, text, text, uuid, text) from public, anon;

grant execute on function public.complete_calendar_event(uuid, uuid) to authenticated;
grant execute on function public.cancel_calendar_event(uuid, uuid, text) to authenticated;
grant execute on function public.archive_calendar_event(uuid, uuid) to authenticated;
grant execute on function public.search_calendar_events(uuid, text, date, date, text, text, uuid, text) to authenticated;

comment on table public.calendar_events is
  'Eventos operacionais independentes. Retornos permanecem em return_schedules e são unificados somente na apresentação.';
comment on column public.calendar_events.event_date is
  'Data civil de eventos de dia inteiro, sem conversão por fuso horário.';
comment on column public.calendar_events.starts_at is
  'Instante de início para eventos com horário, exibido em America/Sao_Paulo.';

commit;
