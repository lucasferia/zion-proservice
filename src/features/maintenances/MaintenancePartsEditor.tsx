import { useMemo, useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { formatInventoryCurrency, formatInventoryQuantity } from '../inventory/formatters'
import type {
  MaintenanceInventoryOption,
  MaintenancePart,
  MaintenancePartInput,
} from './types'
import { parseDecimal, validateMaintenancePart } from './validation'

type MaintenancePartsEditorProps = {
  parts: MaintenancePart[]
  inventory: MaintenanceInventoryOption[]
  onAdd: (input: MaintenancePartInput) => Promise<void>
  onUpdate: (partId: string, quantity: string) => Promise<void>
  onRemove: (partId: string) => Promise<void>
}

export function MaintenancePartsEditor({
  parts,
  inventory,
  onAdd,
  onUpdate,
  onRemove,
}: MaintenancePartsEditorProps) {
  const [input, setInput] = useState<MaintenancePartInput>({ inventory_item_id: '', quantity: '1' })
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(parts.map((part) => [part.id, String(part.quantity)])))
  const [errors, setErrors] = useState<FieldErrors<MaintenancePartInput>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const availableItems = useMemo(
    () => inventory.filter((item) => !parts.some((part) => part.inventory_item_id === item.id)),
    [inventory, parts],
  )
  const selectedItem = inventory.find((item) => item.id === input.inventory_item_id)

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateMaintenancePart(input, selectedItem?.current_quantity ?? null)
    setErrors(nextErrors)
    setActionError(null)
    if (hasValidationErrors(nextErrors)) return
    setPendingAction('add')
    try {
      await onAdd(input)
      setInput({ inventory_item_id: '', quantity: '1' })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível adicionar a peça.')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleUpdate(part: MaintenancePart) {
    const quantity = quantities[part.id] ?? String(part.quantity)
    const nextErrors = validateMaintenancePart(
      { inventory_item_id: part.inventory_item_id, quantity },
      part.available_quantity,
    )
    if (nextErrors.quantity) {
      setActionError(`${part.item_name}: ${nextErrors.quantity}`)
      return
    }
    setActionError(null)
    setPendingAction(part.id)
    try {
      await onUpdate(part.id, quantity)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar a peça.')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleRemove(part: MaintenancePart) {
    setActionError(null)
    setPendingAction(part.id)
    try {
      await onRemove(part.id)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível remover a peça.')
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="maintenance-parts-editor">
      <form className="part-add-form" onSubmit={handleAdd} noValidate>
        <label className="field">
          <span>Item do estoque</span>
          <select value={input.inventory_item_id} onChange={(event) => { setInput((current) => ({ ...current, inventory_item_id: event.target.value })); setErrors({}) }} aria-invalid={Boolean(errors.inventory_item_id)}>
            <option value="">Selecione uma peça</option>
            {availableItems.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · saldo {formatInventoryQuantity(item.current_quantity, item.unit_of_measure)}</option>
            ))}
          </select>
          {errors.inventory_item_id && <span className="field-error">{errors.inventory_item_id}</span>}
        </label>
        <label className="field">
          <span>Quantidade</span>
          <input type="text" inputMode="decimal" value={input.quantity} onChange={(event) => { setInput((current) => ({ ...current, quantity: event.target.value })); setErrors((current) => ({ ...current, quantity: undefined })) }} aria-invalid={Boolean(errors.quantity)} />
          {errors.quantity && <span className="field-error">{errors.quantity}</span>}
          {selectedItem && <span className="field-help">Disponível: {formatInventoryQuantity(selectedItem.current_quantity, selectedItem.unit_of_measure)} · custo atual {formatInventoryCurrency(selectedItem.average_unit_cost)}</span>}
        </label>
        <button className="secondary-button" type="submit" disabled={pendingAction === 'add' || !availableItems.length}>{pendingAction === 'add' ? 'Adicionando…' : 'Adicionar peça'}</button>
      </form>

      {actionError && <div className="alert alert--error" role="alert">{actionError}</div>}

      {parts.length === 0 ? (
        <p className="parts-empty">Nenhuma peça prevista. A OS também pode ser concluída sem consumo.</p>
      ) : (
        <div className="parts-plan-list">
          {parts.map((part) => {
            const quantity = quantities[part.id] ?? String(part.quantity)
            const projectedCost = parseDecimal(quantity) * part.current_average_cost
            return (
              <article className="parts-plan-row" key={part.id}>
                <div><strong>{part.item_name}</strong><span>{part.item_sku || 'Sem SKU'} · saldo {formatInventoryQuantity(part.available_quantity, part.unit_of_measure)}</span></div>
                <label><span className="sr-only">Quantidade de {part.item_name}</span><input type="text" inputMode="decimal" value={quantity} onChange={(event) => setQuantities((current) => ({ ...current, [part.id]: event.target.value }))} /></label>
                <div><strong>{Number.isFinite(projectedCost) ? formatInventoryCurrency(projectedCost) : '—'}</strong><span>estimativa atual</span></div>
                <div className="parts-plan-row__actions">
                  <button type="button" onClick={() => void handleUpdate(part)} disabled={pendingAction === part.id}>Salvar</button>
                  <button type="button" onClick={() => void handleRemove(part)} disabled={pendingAction === part.id}>Remover</button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
