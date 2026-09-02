begin;

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  sku text,
  category text,
  unit_of_measure text not null,
  current_quantity numeric(14, 3) not null default 0,
  minimum_stock numeric(14, 3) not null default 0,
  average_unit_cost numeric(14, 4) not null default 0,
  status text not null default 'active',
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_id_organization_unique unique (id, organization_id),
  constraint inventory_items_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint inventory_items_sku_length check (
    sku is null or char_length(btrim(sku)) between 1 and 80
  ),
  constraint inventory_items_category_length check (
    category is null or char_length(btrim(category)) between 2 and 80
  ),
  constraint inventory_items_unit_length check (
    char_length(btrim(unit_of_measure)) between 1 and 30
  ),
  constraint inventory_items_current_quantity_nonnegative check (current_quantity >= 0),
  constraint inventory_items_minimum_stock_nonnegative check (minimum_stock >= 0),
  constraint inventory_items_average_cost_nonnegative check (average_unit_cost >= 0),
  constraint inventory_items_status_check check (status in ('active', 'inactive')),
  constraint inventory_items_notes_length check (notes is null or char_length(notes) <= 2000),
  constraint inventory_items_deletion_audit check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  )
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  inventory_item_id uuid not null,
  movement_type text not null,
  quantity_delta numeric(14, 3) not null,
  previous_quantity numeric(14, 3) not null,
  resulting_quantity numeric(14, 3) not null,
  unit_cost numeric(14, 4),
  reason text,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint inventory_movements_item_organization_fk
    foreign key (inventory_item_id, organization_id)
    references public.inventory_items (id, organization_id)
    on delete restrict,
  constraint inventory_movements_type_check check (
    movement_type in ('entry', 'adjustment')
  ),
  constraint inventory_movements_quantity_nonzero check (quantity_delta <> 0),
  constraint inventory_movements_entry_positive check (
    movement_type <> 'entry' or quantity_delta > 0
  ),
  constraint inventory_movements_balances_nonnegative check (
    previous_quantity >= 0 and resulting_quantity >= 0
  ),
  constraint inventory_movements_balance_math check (
    resulting_quantity = previous_quantity + quantity_delta
  ),
  constraint inventory_movements_unit_cost_nonnegative check (
    unit_cost is null or unit_cost >= 0
  ),
  constraint inventory_movements_adjustment_reason check (
    movement_type <> 'adjustment'
    or char_length(btrim(coalesce(reason, ''))) between 3 and 500
  ),
  constraint inventory_movements_reason_length check (
    reason is null or char_length(reason) <= 500
  )
);

create unique index inventory_items_organization_active_sku_uidx
  on public.inventory_items (organization_id, lower(sku))
  where deleted_at is null and sku is not null;

create index inventory_items_organization_active_name_idx
  on public.inventory_items (organization_id, lower(name))
  where deleted_at is null;

create index inventory_items_organization_active_category_idx
  on public.inventory_items (organization_id, lower(category))
  where deleted_at is null and category is not null;

create index inventory_movements_item_created_idx
  on public.inventory_movements (inventory_item_id, created_at desc);

create index inventory_movements_organization_created_idx
  on public.inventory_movements (organization_id, created_at desc);

create or replace function public.inventory_stock_situation(
  current_quantity numeric,
  minimum_stock numeric
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when coalesce(current_quantity, 0) <= 0 then 'out_of_stock'
    when coalesce(minimum_stock, 0) > 0
      and current_quantity <= minimum_stock / 2 then 'critical'
    when coalesce(minimum_stock, 0) > 0
      and current_quantity <= minimum_stock then 'attention'
    else 'normal'
  end;
$$;

create or replace function public.set_inventory_item_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.current_quantity is distinct from old.current_quantity
    and coalesce(current_setting('zion.inventory_movement', true), '') <> 'allowed'
  then
    raise exception using
      errcode = '42501',
      message = 'O saldo do item somente pode ser alterado por uma movimentação.';
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), old.updated_by);

  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_at := now();
    new.deleted_by := coalesce(auth.uid(), new.deleted_by);
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
  elsif old.deleted_at is not null and new.deleted_at is not null then
    new.deleted_at := old.deleted_at;
    new.deleted_by := old.deleted_by;
  end if;

  return new;
end;
$$;

create trigger inventory_items_set_audit
before update on public.inventory_items
for each row execute function public.set_inventory_item_audit();

create or replace function public.prevent_inventory_movement_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'Movimentações de estoque são imutáveis.';
end;
$$;

create trigger inventory_movements_immutable
before update or delete on public.inventory_movements
for each row execute function public.prevent_inventory_movement_mutation();

revoke all on function public.set_inventory_item_audit() from public, anon, authenticated;
revoke all on function public.prevent_inventory_movement_mutation() from public, anon, authenticated;

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

create policy "inventory_items_select_member"
on public.inventory_items
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "inventory_items_insert_member"
on public.inventory_items
for insert
to authenticated
with check (public.is_organization_member(organization_id));

create policy "inventory_items_update_member"
on public.inventory_items
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy "inventory_movements_select_member"
on public.inventory_movements
for select
to authenticated
using (public.is_organization_member(organization_id));

revoke all on table public.inventory_items from anon, authenticated;
revoke all on table public.inventory_movements from anon, authenticated;

grant select on table public.inventory_items to authenticated;
grant insert (
  organization_id,
  name,
  sku,
  category,
  unit_of_measure,
  minimum_stock,
  average_unit_cost,
  status,
  notes
) on table public.inventory_items to authenticated;
grant update (
  name,
  sku,
  category,
  unit_of_measure,
  minimum_stock,
  average_unit_cost,
  status,
  notes,
  deleted_at
) on table public.inventory_items to authenticated;

grant select on table public.inventory_movements to authenticated;

create or replace function public.record_inventory_movement(
  target_organization_id uuid,
  target_inventory_item_id uuid,
  movement_type text,
  quantity numeric,
  reason text default null,
  entry_unit_cost numeric default null
)
returns table (
  movement_id uuid,
  previous_quantity numeric,
  resulting_quantity numeric,
  average_unit_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  item_record public.inventory_items%rowtype;
  next_quantity numeric(14, 3);
  next_average_cost numeric(14, 4);
  inserted_movement_id uuid;
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para movimentar este estoque.';
  end if;

  if movement_type not in ('entry', 'adjustment') then
    raise exception using errcode = '22023', message = 'Tipo de movimentação inválido.';
  end if;

  if quantity is null or quantity = 0 then
    raise exception using errcode = '22023', message = 'Informe uma quantidade diferente de zero.';
  end if;

  if abs(quantity) > 99999999999.999 then
    raise exception using errcode = '22003', message = 'Quantidade fora do limite permitido.';
  end if;

  if movement_type = 'entry' and quantity <= 0 then
    raise exception using errcode = '22023', message = 'Entradas exigem quantidade positiva.';
  end if;

  if movement_type = 'adjustment'
    and char_length(btrim(coalesce(reason, ''))) < 3
  then
    raise exception using errcode = '22023', message = 'Informe um motivo para o ajuste.';
  end if;

  if reason is not null and char_length(reason) > 500 then
    raise exception using errcode = '22023', message = 'O motivo deve ter no máximo 500 caracteres.';
  end if;

  if entry_unit_cost is not null
    and (entry_unit_cost < 0 or entry_unit_cost > 9999999999.9999)
  then
    raise exception using errcode = '22003', message = 'Custo unitário fora do limite permitido.';
  end if;

  select *
  into item_record
  from public.inventory_items
  where id = target_inventory_item_id
    and organization_id = target_organization_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Item de estoque não encontrado.';
  end if;

  if item_record.status <> 'active' then
    raise exception using errcode = '55000', message = 'O item precisa estar ativo para receber movimentações.';
  end if;

  next_quantity := item_record.current_quantity + quantity;
  if next_quantity < 0 then
    raise exception using errcode = '23514', message = 'Saldo insuficiente para concluir a movimentação.';
  end if;

  next_average_cost := item_record.average_unit_cost;
  if movement_type = 'entry' and entry_unit_cost is not null then
    if item_record.current_quantity = 0 then
      next_average_cost := entry_unit_cost;
    else
      next_average_cost := round(
        (
          item_record.current_quantity * item_record.average_unit_cost
          + quantity * entry_unit_cost
        ) / next_quantity,
        4
      );
    end if;
  end if;

  perform set_config('zion.inventory_movement', 'allowed', true);

  update public.inventory_items
  set
    current_quantity = next_quantity,
    average_unit_cost = next_average_cost
  where id = item_record.id;

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
    created_by
  )
  values (
    target_organization_id,
    target_inventory_item_id,
    movement_type,
    quantity,
    item_record.current_quantity,
    next_quantity,
    case when movement_type = 'entry' then entry_unit_cost else null end,
    nullif(btrim(reason), ''),
    actor_id
  )
  returning id into inserted_movement_id;

  return query
  select
    inserted_movement_id,
    item_record.current_quantity,
    next_quantity,
    next_average_cost;
end;
$$;

create or replace function public.get_inventory_movements(
  target_organization_id uuid,
  target_inventory_item_id uuid
)
returns table (
  id uuid,
  organization_id uuid,
  inventory_item_id uuid,
  movement_type text,
  quantity_delta numeric,
  previous_quantity numeric,
  resulting_quantity numeric,
  unit_cost numeric,
  reason text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para consultar este histórico.';
  end if;

  return query
  select
    inventory_movements.id,
    inventory_movements.organization_id,
    inventory_movements.inventory_item_id,
    inventory_movements.movement_type,
    inventory_movements.quantity_delta,
    inventory_movements.previous_quantity,
    inventory_movements.resulting_quantity,
    inventory_movements.unit_cost,
    inventory_movements.reason,
    inventory_movements.created_by,
    coalesce(profiles.full_name, 'Usuário da organização') as created_by_name,
    inventory_movements.created_at
  from public.inventory_movements
  left join public.profiles on profiles.id = inventory_movements.created_by
  where inventory_movements.organization_id = target_organization_id
    and inventory_movements.inventory_item_id = target_inventory_item_id
  order by inventory_movements.created_at desc, inventory_movements.id desc;
end;
$$;

create or replace function public.search_inventory_items(
  target_organization_id uuid,
  search_term text default null,
  filter_category text default null,
  filter_situation text default null
)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  sku text,
  category text,
  unit_of_measure text,
  current_quantity numeric,
  minimum_stock numeric,
  average_unit_cost numeric,
  status text,
  notes text,
  stock_situation text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    inventory_items.id,
    inventory_items.organization_id,
    inventory_items.name,
    inventory_items.sku,
    inventory_items.category,
    inventory_items.unit_of_measure,
    inventory_items.current_quantity,
    inventory_items.minimum_stock,
    inventory_items.average_unit_cost,
    inventory_items.status,
    inventory_items.notes,
    public.inventory_stock_situation(
      inventory_items.current_quantity,
      inventory_items.minimum_stock
    ) as stock_situation,
    inventory_items.created_at,
    inventory_items.updated_at
  from public.inventory_items
  where inventory_items.organization_id = target_organization_id
    and inventory_items.deleted_at is null
    and (
      nullif(btrim(search_term), '') is null
      or inventory_items.name ilike '%' || btrim(search_term) || '%'
      or coalesce(inventory_items.sku, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(inventory_items.category, '') ilike '%' || btrim(search_term) || '%'
    )
    and (
      nullif(btrim(filter_category), '') is null
      or lower(coalesce(inventory_items.category, '')) = lower(btrim(filter_category))
    )
    and (
      nullif(btrim(filter_situation), '') is null
      or public.inventory_stock_situation(
        inventory_items.current_quantity,
        inventory_items.minimum_stock
      ) = btrim(filter_situation)
    )
  order by
    case public.inventory_stock_situation(
      inventory_items.current_quantity,
      inventory_items.minimum_stock
    )
      when 'out_of_stock' then 1
      when 'critical' then 2
      when 'attention' then 3
      else 4
    end,
    lower(inventory_items.name),
    inventory_items.id;
$$;

revoke all on function public.inventory_stock_situation(numeric, numeric) from public, anon;
grant execute on function public.inventory_stock_situation(numeric, numeric) to authenticated;

revoke all on function public.record_inventory_movement(uuid, uuid, text, numeric, text, numeric)
  from public, anon;
grant execute on function public.record_inventory_movement(uuid, uuid, text, numeric, text, numeric)
  to authenticated;

revoke all on function public.get_inventory_movements(uuid, uuid) from public, anon;
grant execute on function public.get_inventory_movements(uuid, uuid) to authenticated;

revoke all on function public.search_inventory_items(uuid, text, text, text)
  from public, anon;
grant execute on function public.search_inventory_items(uuid, text, text, text)
  to authenticated;

comment on table public.inventory_items is
  'Itens de estoque isolados por organização, com saldo alterado somente por movimentações.';
comment on table public.inventory_movements is
  'Livro razão imutável de entradas e ajustes manuais do estoque.';
comment on function public.record_inventory_movement(uuid, uuid, text, numeric, text, numeric) is
  'Registra movimento e saldo atomicamente com bloqueio pessimista e proteção contra saldo negativo.';

commit;
