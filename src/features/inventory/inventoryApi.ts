import { getSupabaseClient } from '../../lib/supabase'
import type {
  InventoryFilters,
  InventoryItemDetails,
  InventoryItemInput,
  InventoryItemSummary,
  InventoryMovement,
  InventoryMovementInput,
  InventoryMovementResult,
  InventoryOptions,
} from './types'
import { decimalValue } from './validation'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

function optional(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function normalizeItem(input: InventoryItemInput) {
  return {
    name: input.name.trim(),
    sku: optional(input.sku),
    category: optional(input.category),
    unit_of_measure: input.unit_of_measure.trim(),
    minimum_stock: decimalValue(input.minimum_stock),
    average_unit_cost: decimalValue(input.average_unit_cost),
    status: input.status,
    notes: optional(input.notes),
    supplier_id: input.supplier_id || null,
  }
}

export function friendlyInventoryError(error: { code?: string; message?: string } | null) {
  if (!error) return 'Não foi possível concluir a operação.'
  const message = error.message ?? ''
  if (message.includes('Saldo insuficiente')) return 'A movimentação deixaria o estoque negativo.'
  if (message.includes('motivo para o ajuste')) return 'Informe um motivo rastreável para o ajuste.'
  if (message.includes('precisa estar ativo')) return 'O item precisa estar ativo para receber movimentações.'
  if (message.includes('Item de estoque não encontrado')) return 'O item não foi encontrado ou está arquivado.'
  if (message.includes('Fornecedor não encontrado')) return 'Selecione um fornecedor ativo da sua organização.'
  if (error.code === '23505') return 'Já existe um item ativo com este SKU.'
  if (error.code === '23514' || error.code === '22023' || error.code === '22003') {
    return 'Revise a quantidade, o custo e os demais campos informados.'
  }
  if (error.code === '42501') return 'Você não tem permissão para realizar esta ação.'
  if (error.code === 'PGRST116' || error.code === 'P0002') {
    return 'O item não foi encontrado ou está arquivado.'
  }
  return 'Não foi possível concluir a operação. Tente novamente.'
}

export async function searchInventoryItems(
  organizationId: string,
  search: string,
  filters: InventoryFilters,
) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('search_inventory_items', {
    target_organization_id: organizationId,
    search_term: search.trim() || null,
    filter_category: filters.category || null,
    filter_situation: filters.situation || null,
  })

  if (error) throw new Error(friendlyInventoryError(error))
  return (data ?? []) as InventoryItemSummary[]
}

export async function getInventoryOptions(organizationId: string): Promise<InventoryOptions> {
  const supabase = requireClient()
  const [itemsResult, suppliersResult] = await Promise.all([
    supabase
      .from('inventory_items')
      .select('category, unit_of_measure')
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('suppliers')
      .select('id, legal_name, trade_name')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('legal_name'),
  ])

  const error = itemsResult.error ?? suppliersResult.error

  if (error) throw new Error(friendlyInventoryError(error))
  const data = itemsResult.data

  return {
    categories: Array.from(new Set(
      (data ?? []).map((item) => item.category?.trim()).filter((item): item is string => Boolean(item)),
    )).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    units: Array.from(new Set(
      (data ?? []).map((item) => item.unit_of_measure.trim()).filter(Boolean),
    )).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    suppliers: (suppliersResult.data ?? []).map((supplier) => ({
      id: supplier.id,
      name: supplier.trade_name || supplier.legal_name,
    })),
  }
}

export async function getInventoryItemDetails(organizationId: string, itemId: string) {
  const supabase = requireClient()
  const [itemResult, movementsResult] = await Promise.all([
    supabase
      .from('inventory_items')
      .select(`
        id,
        organization_id,
        name,
        sku,
        category,
        unit_of_measure,
        current_quantity,
        minimum_stock,
        average_unit_cost,
        status,
        notes,
        supplier_id,
        supplier:suppliers!inventory_items_supplier_organization_fk (
          id,
          legal_name,
          trade_name
        ),
        created_at,
        updated_at
      `)
      .eq('organization_id', organizationId)
      .eq('id', itemId)
      .is('deleted_at', null)
      .single(),
    supabase.rpc('get_inventory_movements', {
      target_organization_id: organizationId,
      target_inventory_item_id: itemId,
    }),
  ])

  const error = itemResult.error ?? movementsResult.error
  if (error) throw new Error(friendlyInventoryError(error))

  const item = itemResult.data
  if (!item) throw new Error('Item de estoque não encontrado.')

  const { data: situationData, error: situationError } = await supabase.rpc(
    'inventory_stock_situation',
    {
      current_quantity: item.current_quantity,
      minimum_stock: item.minimum_stock,
    },
  )
  if (situationError) throw new Error(friendlyInventoryError(situationError))

  const supplier = item.supplier as unknown as {
    id: string
    legal_name: string
    trade_name: string | null
  } | null
  return {
    ...item,
    supplier: supplier ? { id: supplier.id, name: supplier.trade_name || supplier.legal_name } : null,
    stock_situation: situationData,
    movements: (movementsResult.data ?? []) as InventoryMovement[],
  } as InventoryItemDetails
}

export async function createInventoryItem(organizationId: string, input: InventoryItemInput) {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .insert({ organization_id: organizationId, ...normalizeItem(input) })
    .select('id')
    .single()

  if (error) throw new Error(friendlyInventoryError(error))
  return data.id as string
}

export async function updateInventoryItem(
  organizationId: string,
  itemId: string,
  input: InventoryItemInput,
) {
  const supabase = requireClient()
  const { error } = await supabase
    .from('inventory_items')
    .update(normalizeItem(input))
    .eq('organization_id', organizationId)
    .eq('id', itemId)
    .is('deleted_at', null)
    .select('id')
    .single()

  if (error) throw new Error(friendlyInventoryError(error))
}

export async function deleteInventoryItem(organizationId: string, itemId: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('delete_inventory_item', {
    target_organization_id: organizationId,
    target_item_id: itemId,
  })

  if (error) throw new Error(friendlyInventoryError(error))
}

export async function archiveInventoryItem(organizationId: string, itemId: string) {
  return deleteInventoryItem(organizationId, itemId)
}

export async function recordInventoryMovement(
  organizationId: string,
  itemId: string,
  input: InventoryMovementInput,
) {
  const supabase = requireClient()
  const baseQuantity = decimalValue(input.quantity)
  const quantity = input.movement_type === 'adjustment' && input.direction === 'decrease'
    ? -baseQuantity
    : baseQuantity
  const { data, error } = await supabase.rpc('record_inventory_movement', {
    target_organization_id: organizationId,
    target_inventory_item_id: itemId,
    movement_type: input.movement_type,
    quantity,
    reason: optional(input.reason),
    entry_unit_cost: input.movement_type === 'entry' && input.unit_cost.trim()
      ? decimalValue(input.unit_cost)
      : null,
  })

  if (error) throw new Error(friendlyInventoryError(error))
  return (data?.[0] ?? null) as InventoryMovementResult | null
}

export function inventoryItemToInput(item: InventoryItemSummary): InventoryItemInput {
  return {
    name: item.name,
    sku: item.sku ?? '',
    category: item.category ?? '',
    unit_of_measure: item.unit_of_measure,
    minimum_stock: String(item.minimum_stock),
    average_unit_cost: String(item.average_unit_cost),
    status: item.status,
    notes: item.notes ?? '',
    supplier_id: 'supplier_id' in item && typeof item.supplier_id === 'string' ? item.supplier_id : '',
  }
}
