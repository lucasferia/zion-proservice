begin;

-- A assinatura anterior tinha quatro argumentos. A função nova mantém esses
-- mesmos argumentos com defaults e acrescenta o fornecedor, por isso a antiga
-- precisa ser removida para não deixar chamadas legadas ambíguas no PostgREST.
drop function if exists public.search_inventory_items(uuid, text, text, text);

create or replace function public.search_inventory_items(
  target_organization_id uuid,
  search_term text default null,
  filter_category text default null,
  filter_situation text default null,
  filter_supplier_id uuid default null
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
  supplier_id uuid,
  supplier_name text,
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
    inventory_items.supplier_id,
    coalesce(suppliers.trade_name, suppliers.legal_name) as supplier_name,
    inventory_items.created_at,
    inventory_items.updated_at
  from public.inventory_items
  left join public.suppliers
    on suppliers.id = inventory_items.supplier_id
    and suppliers.organization_id = inventory_items.organization_id
  where inventory_items.organization_id = target_organization_id
    and inventory_items.deleted_at is null
    and (
      nullif(btrim(search_term), '') is null
      or inventory_items.name ilike '%' || btrim(search_term) || '%'
      or coalesce(inventory_items.sku, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(inventory_items.category, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(suppliers.legal_name, '') ilike '%' || btrim(search_term) || '%'
      or coalesce(suppliers.trade_name, '') ilike '%' || btrim(search_term) || '%'
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
    and (
      filter_supplier_id is null
      or inventory_items.supplier_id = filter_supplier_id
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

revoke all on function public.search_inventory_items(uuid, text, text, text, uuid)
  from public, anon;
grant execute on function public.search_inventory_items(uuid, text, text, text, uuid)
  to authenticated;

comment on function public.search_inventory_items(uuid, text, text, text, uuid) is
  'Lista o estoque do tenant com fornecedor, busca textual e filtro opcional por fornecedor.';

commit;
