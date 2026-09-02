begin;

alter table public.maintenances
  drop constraint maintenances_equipment_client_organization_fk,
  add constraint maintenances_equipment_client_organization_fk
    foreign key (equipment_id, organization_id)
    references public.equipment (id, organization_id)
    on delete restrict;

alter table public.return_schedules
  drop constraint return_schedules_equipment_client_organization_fk,
  add constraint return_schedules_equipment_client_organization_fk
    foreign key (equipment_id, organization_id)
    references public.equipment (id, organization_id)
    on delete restrict;

alter table public.equipment
  alter column client_id drop not null;

drop policy "equipment_insert_member" on public.equipment;
create policy "equipment_insert_member"
on public.equipment
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and (
    (client_id is null and client_location_id is null)
    or (
      client_id is not null
      and exists (
        select 1 from public.clients
        where clients.id = equipment.client_id
          and clients.organization_id = equipment.organization_id
          and clients.deleted_at is null
      )
      and (
        client_location_id is null
        or exists (
          select 1 from public.client_locations
          where client_locations.id = equipment.client_location_id
            and client_locations.client_id = equipment.client_id
            and client_locations.organization_id = equipment.organization_id
            and client_locations.deleted_at is null
        )
      )
    )
  )
);

drop policy "equipment_update_member" on public.equipment;
create policy "equipment_update_member"
on public.equipment
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (
  public.is_organization_member(organization_id)
  and (
    deleted_at is not null
    or (client_id is null and client_location_id is null)
    or (
      client_id is not null
      and exists (
        select 1 from public.clients
        where clients.id = equipment.client_id
          and clients.organization_id = equipment.organization_id
          and clients.deleted_at is null
      )
      and (
        client_location_id is null
        or exists (
          select 1 from public.client_locations
          where client_locations.id = equipment.client_location_id
            and client_locations.client_id = equipment.client_id
            and client_locations.organization_id = equipment.organization_id
            and client_locations.deleted_at is null
        )
      )
    )
  )
);

create or replace function public.search_equipment(
  target_organization_id uuid,
  search_term text default null,
  filter_client_id uuid default null,
  filter_location_id uuid default null,
  filter_category text default null,
  filter_status text default null
)
returns table (
  id uuid, organization_id uuid, client_id uuid, client_location_id uuid,
  name text, category text, brand text, model text, serial_number text,
  asset_tag text, status text, notes text, created_at timestamptz,
  updated_at timestamptz, client_name text, location_name text, location_city text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    equipment.id, equipment.organization_id, equipment.client_id,
    equipment.client_location_id, equipment.name, equipment.category,
    equipment.brand, equipment.model, equipment.serial_number,
    equipment.asset_tag, equipment.status, equipment.notes,
    equipment.created_at, equipment.updated_at, clients.name,
    client_locations.name, client_locations.city
  from public.equipment
  left join public.clients
    on clients.id = equipment.client_id
    and clients.organization_id = equipment.organization_id
  left join public.client_locations
    on client_locations.id = equipment.client_location_id
    and client_locations.client_id = equipment.client_id
    and client_locations.organization_id = equipment.organization_id
  where equipment.deleted_at is null
    and equipment.organization_id = target_organization_id
    and (
      nullif(btrim(search_term), '') is null
      or equipment.name ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.brand, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.model, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.serial_number, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(equipment.asset_tag, '') ilike '%' || btrim(search_term) || '%'
    )
    and (filter_client_id is null or equipment.client_id = filter_client_id)
    and (filter_location_id is null or equipment.client_location_id = filter_location_id)
    and (nullif(btrim(filter_category), '') is null or lower(equipment.category) = lower(btrim(filter_category)))
    and (nullif(btrim(filter_status), '') is null or equipment.status = btrim(filter_status))
  order by lower(equipment.name), equipment.id;
$$;

create or replace function public.validate_maintenance_links()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  equipment_record public.equipment%rowtype;
  links_changed boolean;
begin
  select * into equipment_record
  from public.equipment
  where id = new.equipment_id and organization_id = new.organization_id;

  if not found then
    raise exception using errcode = '23503', message = 'Equipamento não encontrado nesta organização.';
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
      select 1 from public.clients
      where clients.id = new.client_id
        and clients.organization_id = new.organization_id
        and clients.deleted_at is null
    ) then
      raise exception using errcode = '55000', message = 'O cliente selecionado está arquivado.';
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
  end if;

  if tg_op = 'INSERT' or new.responsible_technician_id is distinct from old.responsible_technician_id then
    if not exists (
      select 1 from public.organization_members
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
  select equipment.deleted_at into equipment_record
  from public.equipment
  where equipment.id = new.equipment_id and equipment.organization_id = new.organization_id;

  if not found then
    raise exception using errcode = '23503', message = 'Equipamento não encontrado nesta organização.';
  end if;
  if equipment_record.deleted_at is not null then
    raise exception using errcode = '55000', message = 'Não é possível agendar retorno para equipamento arquivado.';
  end if;
  if not exists (
    select 1 from public.clients
    where clients.id = new.client_id
      and clients.organization_id = new.organization_id
      and clients.deleted_at is null
  ) then
    raise exception using errcode = '55000', message = 'Não é possível agendar retorno para cliente arquivado.';
  end if;
  if new.client_location_id is not null and not exists (
    select 1 from public.client_locations
    where client_locations.id = new.client_location_id
      and client_locations.client_id = new.client_id
      and client_locations.organization_id = new.organization_id
      and client_locations.deleted_at is null
  ) then
    raise exception using errcode = '55000', message = 'A unidade não pertence ao cliente ou está arquivada.';
  end if;

  if new.origin_maintenance_id is not null then
    select maintenances.client_id, maintenances.client_location_id,
      maintenances.equipment_id, maintenances.status
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

alter table public.maintenances
  add column next_return_date date,
  add constraint maintenances_next_return_after_service_check check (
    next_return_date is null
    or next_return_date >= (scheduled_at at time zone 'America/Sao_Paulo')::date
  );

grant insert (next_return_date), update (next_return_date)
on table public.maintenances to authenticated;

create or replace function public.complete_maintenance_with_return(
  target_organization_id uuid,
  target_maintenance_id uuid,
  target_return_date date
)
returns table (
  maintenance_id uuid, work_order_number text, completed_at timestamptz,
  consumed_part_count integer, inventory_cost numeric, return_schedule_id uuid
)
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  actor_id uuid := auth.uid();
  completion_record record;
  maintenance_record record;
  created_return_id uuid;
  effective_return_date date;
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para concluir esta manutenção.';
  end if;

  select * into maintenance_record
  from public.maintenances
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Manutenção não encontrada.';
  end if;

  effective_return_date := coalesce(maintenance_record.next_return_date, target_return_date);
  if effective_return_date is null or effective_return_date < current_date then
    raise exception using errcode = '22007', message = 'Informe no relatório uma data de retorno igual ou posterior a hoje.';
  end if;

  if maintenance_record.next_return_date is null then
    update public.maintenances
    set next_return_date = effective_return_date
    where id = target_maintenance_id and organization_id = target_organization_id;
  end if;

  select * into completion_record
  from public.complete_maintenance(target_organization_id, target_maintenance_id);

  insert into public.return_schedules (
    organization_id, client_id, client_location_id, equipment_id,
    origin_maintenance_id, scheduled_date, notes, created_by
  ) values (
    target_organization_id, maintenance_record.client_id,
    maintenance_record.client_location_id, maintenance_record.equipment_id,
    target_maintenance_id, effective_return_date,
    'Retorno criado na conclusão da ' || maintenance_record.work_order_number,
    actor_id
  ) returning id into created_return_id;

  return query select
    completion_record.maintenance_id, completion_record.work_order_number,
    completion_record.completed_at, completion_record.consumed_part_count,
    completion_record.inventory_cost, created_return_id;
end;
$$;

comment on column public.maintenances.next_return_date is
  'Data de reagendamento preenchida no relatório técnico e efetivada na conclusão.';

commit;
