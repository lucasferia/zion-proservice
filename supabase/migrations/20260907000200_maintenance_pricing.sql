begin;

alter table public.maintenances
  add column labor_amount numeric(14, 2);

alter table public.maintenance_parts
  add column unit_cost_amount numeric(14, 4),
  add column unit_charge_amount numeric(14, 4) not null default 0;

-- Preserva o histórico existente usando o custo conhecido como referência
-- inicial de custo e cobrança. Nenhuma OS encerrada é reaberta.
alter table public.maintenance_parts disable trigger maintenance_parts_guard_mutation;
update public.maintenance_parts
set
  unit_cost_amount = coalesce(
    maintenance_parts.unit_cost_snapshot,
    inventory_items.average_unit_cost,
    0
  ),
  unit_charge_amount = coalesce(
    maintenance_parts.unit_cost_snapshot,
    inventory_items.average_unit_cost,
    0
  )
from public.inventory_items
where inventory_items.id = maintenance_parts.inventory_item_id
  and inventory_items.organization_id = maintenance_parts.organization_id;
alter table public.maintenance_parts enable trigger maintenance_parts_guard_mutation;

alter table public.maintenances disable trigger maintenances_guard_mutation;
update public.maintenances
set labor_amount = greatest(
  maintenances.total_amount - coalesce((
    select sum(round(maintenance_parts.quantity * maintenance_parts.unit_charge_amount, 2))
    from public.maintenance_parts
    where maintenance_parts.maintenance_id = maintenances.id
      and maintenance_parts.organization_id = maintenances.organization_id
  ), 0),
  0
);
alter table public.maintenances enable trigger maintenances_guard_mutation;

alter table public.maintenances
  alter column labor_amount set not null,
  add constraint maintenances_labor_amount_nonnegative check (
    labor_amount >= 0 and labor_amount <= 999999999999.99
  );

alter table public.maintenance_parts
  add constraint maintenance_parts_unit_cost_amount_nonnegative check (
    unit_cost_amount is null
    or (unit_cost_amount >= 0 and unit_cost_amount <= 9999999999.9999)
  ),
  add constraint maintenance_parts_unit_charge_amount_nonnegative check (
    unit_charge_amount >= 0 and unit_charge_amount <= 9999999999.9999
  );

create or replace function public.calculate_maintenance_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  material_total numeric(14, 2);
begin
  -- Compatibilidade com registros feitos por versões anteriores do frontend:
  -- quando mão de obra não é enviada, o antigo total informado vira mão de obra.
  if tg_op = 'INSERT' and new.labor_amount is null then
    new.labor_amount := coalesce(new.total_amount, 0);
  end if;

  select coalesce(sum(round(
    maintenance_parts.quantity * maintenance_parts.unit_charge_amount,
    2
  )), 0)
  into material_total
  from public.maintenance_parts
  where maintenance_parts.maintenance_id = new.id
    and maintenance_parts.organization_id = new.organization_id;

  new.total_amount := round(coalesce(new.labor_amount, 0) + material_total, 2);
  return new;
end;
$$;

create trigger maintenances_calculate_total_insert
before insert on public.maintenances
for each row execute function public.calculate_maintenance_total();

create trigger maintenances_calculate_total_update
before update of labor_amount, total_amount on public.maintenances
for each row execute function public.calculate_maintenance_total();

-- O trigger financeiro original observa updates diretos de total_amount. Como
-- a mão de obra agora recalcula esse total em BEFORE UPDATE, ela também precisa
-- passar explicitamente pela mesma validação de pagamentos ativos.
create trigger maintenances_guard_payment_ceiling_from_labor
before update of labor_amount on public.maintenances
for each row execute function public.guard_maintenance_payment_ceiling();

create or replace function public.sync_maintenance_total_after_part()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  target_maintenance_id uuid := case when tg_op = 'DELETE' then old.maintenance_id else new.maintenance_id end;
begin
  if coalesce(current_setting('zion.allow_cascade_delete', true), '') = 'allowed' then
    return null;
  end if;

  update public.maintenances
  set total_amount = round(
    maintenances.labor_amount + coalesce((
      select sum(round(
        maintenance_parts.quantity * maintenance_parts.unit_charge_amount,
        2
      ))
      from public.maintenance_parts
      where maintenance_parts.maintenance_id = target_maintenance_id
        and maintenance_parts.organization_id = target_organization_id
    ), 0),
    2
  )
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id
    and maintenances.status in ('draft', 'in_progress');

  return null;
end;
$$;

create trigger maintenance_parts_sync_total_insert
after insert on public.maintenance_parts
for each row execute function public.sync_maintenance_total_after_part();

create trigger maintenance_parts_sync_total_update
after update of quantity, unit_charge_amount on public.maintenance_parts
for each row execute function public.sync_maintenance_total_after_part();

create trigger maintenance_parts_sync_total_delete
after delete on public.maintenance_parts
for each row execute function public.sync_maintenance_total_after_part();

create or replace function public.apply_entered_maintenance_part_cost()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('zion.maintenance_completion', true), '') = 'allowed' then
    new.unit_cost_snapshot := coalesce(old.unit_cost_amount, new.unit_cost_snapshot);
    new.total_cost_snapshot := round(new.quantity * new.unit_cost_snapshot, 4);
  end if;
  return new;
end;
$$;

create trigger maintenance_parts_apply_entered_cost
before update of unit_cost_snapshot, total_cost_snapshot on public.maintenance_parts
for each row execute function public.apply_entered_maintenance_part_cost();

revoke all on function public.calculate_maintenance_total()
  from public, anon, authenticated;
revoke all on function public.sync_maintenance_total_after_part()
  from public, anon, authenticated;
revoke all on function public.apply_entered_maintenance_part_cost()
  from public, anon, authenticated;

grant insert (labor_amount) on table public.maintenances to authenticated;
grant update (labor_amount) on table public.maintenances to authenticated;
grant insert (unit_cost_amount, unit_charge_amount)
  on table public.maintenance_parts to authenticated;
grant update (unit_cost_amount, unit_charge_amount)
  on table public.maintenance_parts to authenticated;

comment on column public.maintenances.labor_amount is
  'Valor de mão de obra cobrado; o total da OS é calculado com os materiais.';
comment on column public.maintenance_parts.unit_cost_amount is
  'Custo unitário pago, visível apenas na operação interna.';
comment on column public.maintenance_parts.unit_charge_amount is
  'Preço unitário cobrado do cliente e exibido no relatório.';

commit;
