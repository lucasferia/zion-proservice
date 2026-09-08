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
  onUpdate: (partId: string, input: MaintenancePartInput) => Promise<void>
  onRemove: (partId: string) => Promise<void>
}

const emptyPart: MaintenancePartInput = {
  inventory_item_id: '',
  quantity: '1',
  unit_cost_amount: '',
  unit_charge_amount: '',
}

function partToInput(part: MaintenancePart): MaintenancePartInput {
  return {
    inventory_item_id: part.inventory_item_id,
    quantity: String(part.quantity),
    unit_cost_amount: String(part.unit_cost_amount ?? part.current_average_cost),
    unit_charge_amount: String(part.unit_charge_amount),
  }
}

export function MaintenancePartsEditor({
  parts,
  inventory,
  onAdd,
  onUpdate,
  onRemove,
}: MaintenancePartsEditorProps) {
  const [input, setInput] = useState<MaintenancePartInput>(emptyPart)
  const [drafts, setDrafts] = useState<Record<string, MaintenancePartInput>>({})
  const [errors, setErrors] = useState<FieldErrors<MaintenancePartInput>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const availableItems = useMemo(
    () => inventory.filter((item) => !parts.some((part) => part.inventory_item_id === item.id)),
    [inventory, parts],
  )
  const selectedItem = inventory.find((item) => item.id === input.inventory_item_id)

  function selectItem(itemId: string) {
    const item = inventory.find((option) => option.id === itemId)
    const suggestedValue = item ? String(item.average_unit_cost) : ''
    setInput((current) => ({
      ...current,
      inventory_item_id: itemId,
      unit_cost_amount: suggestedValue,
      unit_charge_amount: suggestedValue,
    }))
    setErrors({})
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateMaintenancePart(input, selectedItem?.current_quantity ?? null)
    setErrors(nextErrors)
    setActionError(null)
    setActionSuccess(null)
    if (hasValidationErrors(nextErrors)) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setPendingAction('add')
    try {
      await onAdd(input)
      setInput(emptyPart)
      setActionSuccess(`${selectedItem?.name ?? 'Material'} adicionado à OS. Os totais foram atualizados.`)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível adicionar a peça.')
    } finally {
      setPendingAction(null)
    }
  }

  function updateDraft(part: MaintenancePart, field: keyof MaintenancePartInput, value: string) {
    setDrafts((current) => ({
      ...current,
      [part.id]: { ...(current[part.id] ?? partToInput(part)), [field]: value },
    }))
  }

  async function handleUpdate(part: MaintenancePart) {
    const draft = drafts[part.id] ?? partToInput(part)
    const nextErrors = validateMaintenancePart(draft, part.available_quantity)
    const firstError = Object.values(nextErrors).find(Boolean)
    if (firstError) {
      setActionError(`${part.item_name}: ${firstError}`)
      return
    }
    setActionError(null)
    setActionSuccess(null)
    setPendingAction(part.id)
    try {
      await onUpdate(part.id, draft)
      setDrafts((current) => {
        const next = { ...current }
        delete next[part.id]
        return next
      })
      setActionSuccess(`${part.item_name} atualizado com sucesso.`)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar a peça.')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleRemove(part: MaintenancePart) {
    setActionError(null)
    setActionSuccess(null)
    setPendingAction(part.id)
    try {
      await onRemove(part.id)
      setActionSuccess(`${part.item_name} removido da OS.`)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível remover a peça.')
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="maintenance-parts-editor">
      <form className="part-add-form part-add-form--priced" onSubmit={handleAdd} noValidate>
        <header className="part-add-form__heading">
          <div>
            <span className="eyebrow">Novo lançamento</span>
            <strong>Adicionar material à OS</strong>
          </div>
          <p>Informe a peça, a quantidade e os valores interno e cobrado.</p>
        </header>

        <div className="part-add-form__fields">
          <label className="field part-add-form__item">
            <span>Item do estoque</span>
            <select value={input.inventory_item_id} onChange={(event) => selectItem(event.target.value)} aria-invalid={Boolean(errors.inventory_item_id)}>
              <option value="">Selecione uma peça</option>
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · saldo {formatInventoryQuantity(item.current_quantity, item.unit_of_measure)}</option>
              ))}
            </select>
            {errors.inventory_item_id && <span className="field-error">{errors.inventory_item_id}</span>}
          </label>
          <label className="field part-add-form__quantity">
            <span>Quantidade</span>
            <input type="text" inputMode="decimal" value={input.quantity} onChange={(event) => { setInput((current) => ({ ...current, quantity: event.target.value })); setErrors((current) => ({ ...current, quantity: undefined })) }} aria-invalid={Boolean(errors.quantity)} />
            {errors.quantity && <span className="field-error">{errors.quantity}</span>}
          </label>
          <label className="field part-add-form__price">
            <span>Custo unitário pago</span>
            <div className="money-input"><span aria-hidden="true">R$</span><input type="text" inputMode="decimal" aria-label="Custo unitário pago" value={input.unit_cost_amount} onChange={(event) => { setInput((current) => ({ ...current, unit_cost_amount: event.target.value })); setErrors((current) => ({ ...current, unit_cost_amount: undefined })) }} aria-invalid={Boolean(errors.unit_cost_amount)} /></div>
            {errors.unit_cost_amount && <span className="field-error">{errors.unit_cost_amount}</span>}
            <span className="field-help">Uso interno. Não aparece no relatório.</span>
          </label>
          <label className="field part-add-form__price">
            <span>Preço unitário cobrado</span>
            <div className="money-input"><span aria-hidden="true">R$</span><input type="text" inputMode="decimal" aria-label="Preço unitário cobrado" value={input.unit_charge_amount} onChange={(event) => { setInput((current) => ({ ...current, unit_charge_amount: event.target.value })); setErrors((current) => ({ ...current, unit_charge_amount: undefined })) }} aria-invalid={Boolean(errors.unit_charge_amount)} /></div>
            {errors.unit_charge_amount && <span className="field-error">{errors.unit_charge_amount}</span>}
            <span className="field-help">Valor exibido ao cliente.</span>
          </label>
        </div>

        <footer className="part-add-form__footer">
          <span aria-live="polite">
            {selectedItem
              ? `Em estoque: ${formatInventoryQuantity(selectedItem.current_quantity, selectedItem.unit_of_measure)}`
              : 'Selecione um item para consultar o saldo disponível.'}
          </span>
          <button className="secondary-button" type="submit" disabled={pendingAction === 'add' || !availableItems.length}>{pendingAction === 'add' ? 'Adicionando…' : 'Adicionar material'}</button>
        </footer>
      </form>

      <div className="part-editor-feedback" aria-live="polite">
        {actionSuccess && <div className="alert alert--success" role="status">{actionSuccess}</div>}
        {actionError && <div className="alert alert--error" role="alert">{actionError}</div>}
      </div>

      {parts.length === 0 ? (
        <p className="parts-empty">Nenhum material previsto. A OS também pode ser concluída somente com mão de obra.</p>
      ) : (
        <div className="parts-plan-list parts-plan-list--priced">
          {parts.map((part) => {
            const draft = drafts[part.id] ?? partToInput(part)
            const quantity = parseDecimal(draft.quantity)
            const unitCost = parseDecimal(draft.unit_cost_amount)
            const unitCharge = parseDecimal(draft.unit_charge_amount)
            const paidTotal = quantity * unitCost
            const chargeTotal = quantity * unitCharge
            return (
              <article className="parts-plan-row parts-plan-row--priced" key={part.id}>
                <div className="parts-plan-row__identity"><strong>{part.item_name}</strong><span>{part.item_sku || 'Sem SKU'} · saldo {formatInventoryQuantity(part.available_quantity, part.unit_of_measure)}</span></div>
                <label><span>Quantidade</span><input type="text" inputMode="decimal" value={draft.quantity} onChange={(event) => updateDraft(part, 'quantity', event.target.value)} /></label>
                <label><span>Custo unitário pago</span><div className="money-input"><span>R$</span><input type="text" inputMode="decimal" aria-label={`Custo unitário pago de ${part.item_name}`} value={draft.unit_cost_amount} onChange={(event) => updateDraft(part, 'unit_cost_amount', event.target.value)} /></div></label>
                <label><span>Preço unitário cobrado</span><div className="money-input"><span>R$</span><input type="text" inputMode="decimal" aria-label={`Preço unitário cobrado de ${part.item_name}`} value={draft.unit_charge_amount} onChange={(event) => updateDraft(part, 'unit_charge_amount', event.target.value)} /></div></label>
                <div className="parts-plan-row__totals">
                  <span>Pago <strong>{Number.isFinite(paidTotal) ? formatInventoryCurrency(paidTotal) : '—'}</strong></span>
                  <span>Cobrado <strong>{Number.isFinite(chargeTotal) ? formatInventoryCurrency(chargeTotal) : '—'}</strong></span>
                </div>
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
