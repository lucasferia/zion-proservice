begin;

alter table public.maintenances
  add column discount_type text not null default 'percentage',
  add column discount_value numeric not null default 0,
  add column discount_amount numeric(14, 2) not null default 0,
  add constraint maintenances_discount_type_valid check (
    discount_type in ('percentage', 'fixed')
  ),
  add constraint maintenances_discount_value_valid check (
    discount_value >= 0
    and discount_value <= 9999999999.9999
    and (discount_type <> 'percentage' or discount_value <= 100)
    and (discount_type <> 'fixed' or discount_value = round(discount_value, 2))
  ),
  add constraint maintenances_discount_amount_valid check (
    discount_amount >= 0 and discount_amount <= 999999999999.99
  );

create or replace function public.calculate_maintenance_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  material_total numeric(14, 2);
  subtotal numeric(14, 2);
  calculated_discount numeric(14, 2);
begin
  -- Compatibilidade com registros enviados por versões anteriores do frontend.
  if tg_op = 'INSERT' and new.labor_amount is null then
    new.labor_amount := coalesce(new.total_amount, 0);
  end if;

  new.discount_type := coalesce(new.discount_type, 'percentage');
  new.discount_value := coalesce(new.discount_value, 0);

  if new.discount_type not in ('percentage', 'fixed') then
    raise exception using
      errcode = '22023',
      message = 'Selecione um tipo de desconto válido.';
  end if;

  if new.discount_value < 0 then
    raise exception using
      errcode = '22023',
      message = 'O desconto não pode ser negativo.';
  end if;

  if new.discount_type = 'percentage' and new.discount_value > 100 then
    raise exception using
      errcode = '22023',
      message = 'O desconto percentual deve estar entre 0 e 100.';
  end if;

  if new.discount_type = 'fixed' and new.discount_value <> round(new.discount_value, 2) then
    raise exception using
      errcode = '22023',
      message = 'O desconto em reais deve usar no máximo duas casas decimais.';
  end if;

  select coalesce(sum(round(
    maintenance_parts.quantity * maintenance_parts.unit_charge_amount,
    2
  )), 0)
  into material_total
  from public.maintenance_parts
  where maintenance_parts.maintenance_id = new.id
    and maintenance_parts.organization_id = new.organization_id;

  subtotal := round(coalesce(new.labor_amount, 0) + material_total, 2);

  if new.discount_type = 'percentage' then
    calculated_discount := round(subtotal * new.discount_value / 100, 2);
  else
    calculated_discount := round(new.discount_value, 2);
  end if;

  if calculated_discount > subtotal then
    raise exception using
      errcode = '22023',
      message = 'O desconto em reais não pode ultrapassar o subtotal da OS.';
  end if;

  new.discount_amount := calculated_discount;
  new.total_amount := round(subtotal - calculated_discount, 2);
  return new;
end;
$$;

drop trigger maintenances_calculate_total_update on public.maintenances;
create trigger maintenances_calculate_total_update
before update of labor_amount, total_amount, discount_type, discount_value
on public.maintenances
for each row execute function public.calculate_maintenance_total();

create trigger maintenances_guard_payment_ceiling_from_discount
before update of discount_type, discount_value on public.maintenances
for each row execute function public.guard_maintenance_payment_ceiling();

grant insert (discount_type, discount_value) on table public.maintenances to authenticated;
grant update (discount_type, discount_value) on table public.maintenances to authenticated;

comment on column public.maintenances.discount_type is
  'Unidade do desconto informado: percentual ou valor fixo em reais.';
comment on column public.maintenances.discount_value is
  'Valor original informado pelo usuário, preservado para reabertura da OS.';
comment on column public.maintenances.discount_amount is
  'Desconto monetário calculado pelo banco sobre o subtotal completo da OS.';
comment on function public.calculate_maintenance_total() is
  'Calcula subtotal, desconto único arredondado em centavos e total líquido da OS.';

commit;
