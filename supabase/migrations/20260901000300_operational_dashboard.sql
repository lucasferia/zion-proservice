begin;

create or replace function public.get_operational_dashboard(
  target_organization_id uuid,
  filter_period_start date default null,
  filter_period_end date default null
)
returns table (
  period_start date,
  period_end date,
  timezone_name text,
  completed_maintenances bigint,
  in_progress_maintenances bigint,
  active_clients bigint,
  received_revenue numeric,
  overdue_returns bigint,
  today_returns bigint,
  next_7_returns bigint,
  inventory_attention bigint,
  inventory_critical bigint,
  inventory_out_of_stock bigint,
  priority_returns jsonb,
  priority_maintenances jsonb,
  priority_inventory jsonb,
  latest_completed_maintenances jsonb,
  upcoming_returns jsonb,
  is_new_organization boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  dashboard_timezone constant text := 'America/Sao_Paulo';
  local_today date := (now() at time zone dashboard_timezone)::date;
  effective_start date := coalesce(
    filter_period_start,
    date_trunc('month', local_today::timestamp)::date
  );
  effective_end date := coalesce(filter_period_end, local_today);
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using
      errcode = '42501',
      message = 'Você não tem permissão para consultar este dashboard.';
  end if;

  if effective_start > effective_end then
    raise exception using
      errcode = '22007',
      message = 'O início do período não pode ser posterior ao fim.';
  end if;

  return query
  select
    effective_start,
    effective_end,
    dashboard_timezone,
    (
      select count(*)
      from public.maintenances
      where maintenances.organization_id = target_organization_id
        and maintenances.status = 'completed'
        and (maintenances.completed_at at time zone dashboard_timezone)::date
          between effective_start and effective_end
    )::bigint,
    (
      select count(*)
      from public.maintenances
      where maintenances.organization_id = target_organization_id
        and maintenances.status = 'in_progress'
        and (maintenances.scheduled_at at time zone dashboard_timezone)::date
          between effective_start and effective_end
    )::bigint,
    (
      select count(*)
      from public.clients
      where clients.organization_id = target_organization_id
        and clients.deleted_at is null
    )::bigint,
    (
      select coalesce(sum(payments.amount), 0)::numeric
      from public.payments
      where payments.organization_id = target_organization_id
        and payments.status = 'received'
        and (payments.paid_at at time zone dashboard_timezone)::date
          between effective_start and effective_end
    ),
    (
      select count(*)
      from public.return_schedules
      where return_schedules.organization_id = target_organization_id
        and return_schedules.status = 'pending'
        and return_schedules.scheduled_date < local_today
    )::bigint,
    (
      select count(*)
      from public.return_schedules
      where return_schedules.organization_id = target_organization_id
        and return_schedules.status = 'pending'
        and return_schedules.scheduled_date = local_today
    )::bigint,
    (
      select count(*)
      from public.return_schedules
      where return_schedules.organization_id = target_organization_id
        and return_schedules.status = 'pending'
        and return_schedules.scheduled_date > local_today
        and return_schedules.scheduled_date <= local_today + 7
    )::bigint,
    (
      select count(*)
      from public.inventory_items
      where inventory_items.organization_id = target_organization_id
        and inventory_items.deleted_at is null
        and inventory_items.status = 'active'
        and public.inventory_stock_situation(
          inventory_items.current_quantity,
          inventory_items.minimum_stock
        ) = 'attention'
    )::bigint,
    (
      select count(*)
      from public.inventory_items
      where inventory_items.organization_id = target_organization_id
        and inventory_items.deleted_at is null
        and inventory_items.status = 'active'
        and public.inventory_stock_situation(
          inventory_items.current_quantity,
          inventory_items.minimum_stock
        ) = 'critical'
    )::bigint,
    (
      select count(*)
      from public.inventory_items
      where inventory_items.organization_id = target_organization_id
        and inventory_items.deleted_at is null
        and inventory_items.status = 'active'
        and public.inventory_stock_situation(
          inventory_items.current_quantity,
          inventory_items.minimum_stock
        ) = 'out_of_stock'
    )::bigint,
    coalesce((
      select jsonb_agg(priority.item order by priority.scheduled_date, priority.id)
      from (
        select
          return_schedules.id,
          return_schedules.scheduled_date,
          jsonb_build_object(
            'id', return_schedules.id,
            'scheduled_date', return_schedules.scheduled_date,
            'client_id', return_schedules.client_id,
            'client_name', clients.name,
            'equipment_id', return_schedules.equipment_id,
            'equipment_name', equipment.name,
            'location_name', client_locations.name,
            'days_overdue', greatest(local_today - return_schedules.scheduled_date, 0),
            'timing', case
              when return_schedules.scheduled_date < local_today then 'overdue'
              else 'today'
            end
          ) as item
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
        where return_schedules.organization_id = target_organization_id
          and return_schedules.status = 'pending'
          and return_schedules.scheduled_date <= local_today
        order by return_schedules.scheduled_date, return_schedules.id
        limit 5
      ) priority
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(priority.item order by priority.scheduled_at, priority.id)
      from (
        select
          maintenances.id,
          maintenances.scheduled_at,
          jsonb_build_object(
            'id', maintenances.id,
            'work_order_number', maintenances.work_order_number,
            'scheduled_at', maintenances.scheduled_at,
            'client_id', maintenances.client_id,
            'client_name', clients.name,
            'equipment_id', maintenances.equipment_id,
            'equipment_name', equipment.name,
            'maintenance_type', maintenances.maintenance_type
          ) as item
        from public.maintenances
        join public.clients
          on clients.id = maintenances.client_id
          and clients.organization_id = maintenances.organization_id
        join public.equipment
          on equipment.id = maintenances.equipment_id
          and equipment.organization_id = maintenances.organization_id
        where maintenances.organization_id = target_organization_id
          and maintenances.status = 'in_progress'
        order by maintenances.scheduled_at, maintenances.id
        limit 5
      ) priority
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(priority.item order by priority.situation_order, priority.current_quantity, priority.id)
      from (
        select
          inventory_items.id,
          inventory_items.current_quantity,
          case public.inventory_stock_situation(
            inventory_items.current_quantity,
            inventory_items.minimum_stock
          )
            when 'out_of_stock' then 0
            else 1
          end as situation_order,
          jsonb_build_object(
            'id', inventory_items.id,
            'name', inventory_items.name,
            'sku', inventory_items.sku,
            'unit_of_measure', inventory_items.unit_of_measure,
            'current_quantity', inventory_items.current_quantity,
            'minimum_stock', inventory_items.minimum_stock,
            'situation', public.inventory_stock_situation(
              inventory_items.current_quantity,
              inventory_items.minimum_stock
            )
          ) as item
        from public.inventory_items
        where inventory_items.organization_id = target_organization_id
          and inventory_items.deleted_at is null
          and inventory_items.status = 'active'
          and public.inventory_stock_situation(
            inventory_items.current_quantity,
            inventory_items.minimum_stock
          ) in ('critical', 'out_of_stock')
        order by situation_order, inventory_items.current_quantity, inventory_items.id
        limit 5
      ) priority
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(recent.item order by recent.completed_at desc, recent.id desc)
      from (
        select
          maintenances.id,
          maintenances.completed_at,
          jsonb_build_object(
            'id', maintenances.id,
            'work_order_number', maintenances.work_order_number,
            'completed_at', maintenances.completed_at,
            'client_id', maintenances.client_id,
            'client_name', clients.name,
            'equipment_id', maintenances.equipment_id,
            'equipment_name', equipment.name,
            'maintenance_type', maintenances.maintenance_type,
            'total_amount', maintenances.total_amount
          ) as item
        from public.maintenances
        join public.clients
          on clients.id = maintenances.client_id
          and clients.organization_id = maintenances.organization_id
        join public.equipment
          on equipment.id = maintenances.equipment_id
          and equipment.organization_id = maintenances.organization_id
        where maintenances.organization_id = target_organization_id
          and maintenances.status = 'completed'
          and (maintenances.completed_at at time zone dashboard_timezone)::date
            between effective_start and effective_end
        order by maintenances.completed_at desc, maintenances.id desc
        limit 5
      ) recent
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(upcoming.item order by upcoming.scheduled_date, upcoming.id)
      from (
        select
          return_schedules.id,
          return_schedules.scheduled_date,
          jsonb_build_object(
            'id', return_schedules.id,
            'scheduled_date', return_schedules.scheduled_date,
            'client_id', return_schedules.client_id,
            'client_name', clients.name,
            'equipment_id', return_schedules.equipment_id,
            'equipment_name', equipment.name,
            'location_name', client_locations.name,
            'days_until', return_schedules.scheduled_date - local_today
          ) as item
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
        where return_schedules.organization_id = target_organization_id
          and return_schedules.status = 'pending'
          and return_schedules.scheduled_date >= local_today
        order by return_schedules.scheduled_date, return_schedules.id
        limit 5
      ) upcoming
    ), '[]'::jsonb),
    not exists (
      select 1 from public.clients
      where clients.organization_id = target_organization_id
      union all
      select 1 from public.equipment
      where equipment.organization_id = target_organization_id
      union all
      select 1 from public.maintenances
      where maintenances.organization_id = target_organization_id
      union all
      select 1 from public.inventory_items
      where inventory_items.organization_id = target_organization_id
      union all
      select 1 from public.payments
      where payments.organization_id = target_organization_id
      union all
      select 1 from public.return_schedules
      where return_schedules.organization_id = target_organization_id
    );
end;
$$;

revoke all on function public.get_operational_dashboard(uuid, date, date)
from public, anon;
grant execute on function public.get_operational_dashboard(uuid, date, date)
to authenticated;

comment on function public.get_operational_dashboard(uuid, date, date) is
  'Agrega o dashboard operacional por organização, com datas civis em America/Sao_Paulo.';

commit;
