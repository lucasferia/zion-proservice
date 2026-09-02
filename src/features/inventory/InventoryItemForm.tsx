import { useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { INVENTORY_ITEM_STATUSES, type InventoryItemInput, type InventoryOptions } from './types'
import { validateInventoryItem } from './validation'

const emptyItem: InventoryItemInput = {
  name: '',
  sku: '',
  category: '',
  unit_of_measure: '',
  minimum_stock: '0',
  average_unit_cost: '0',
  status: 'active',
  notes: '',
}

type InventoryItemFormProps = {
  options: InventoryOptions
  initialValue?: InventoryItemInput
  submitLabel: string
  onSubmit: (input: InventoryItemInput) => Promise<void>
}

export function InventoryItemForm({
  options,
  initialValue = emptyItem,
  submitLabel,
  onSubmit,
}: InventoryItemFormProps) {
  const [input, setInput] = useState(initialValue)
  const [errors, setErrors] = useState<FieldErrors<InventoryItemInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField<Key extends keyof InventoryItemInput>(
    field: Key,
    value: InventoryItemInput[Key],
  ) {
    setInput((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateInventoryItem(input)
    setErrors(nextErrors)
    setSubmitError(null)
    if (hasValidationErrors(nextErrors)) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(input)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar o item.')
      setIsSubmitting(false)
    }
  }

  return (
    <form className="record-form inventory-item-form" onSubmit={handleSubmit} noValidate>
      <div className="form-section-heading">
        <span className="form-section-heading__index" aria-hidden="true">01</span>
        <div>
          <h2>Identificação</h2>
          <p>Nome e unidade de medida são obrigatórios. O SKU identifica o item dentro da organização.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="field field--wide">
          <label htmlFor="inventory-name">Nome do item <span aria-hidden="true">*</span></label>
          <input id="inventory-name" value={input.name} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'inventory-name-error' : undefined} maxLength={160} placeholder="Ex.: Correia para esteira RT 250" autoFocus />
          {errors.name && <span id="inventory-name-error" className="field-error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="inventory-sku">SKU</label>
          <input id="inventory-sku" value={input.sku} onChange={(event) => updateField('sku', event.target.value)} aria-invalid={Boolean(errors.sku)} maxLength={80} autoComplete="off" placeholder="Ex.: COR-RT250" />
          {errors.sku && <span className="field-error">{errors.sku}</span>}
        </div>

        <div className="field">
          <label htmlFor="inventory-category">Categoria</label>
          <input id="inventory-category" list="inventory-categories" value={input.category} onChange={(event) => updateField('category', event.target.value)} aria-invalid={Boolean(errors.category)} maxLength={80} placeholder="Ex.: Transmissão" />
          <datalist id="inventory-categories">{options.categories.map((category) => <option key={category} value={category} />)}</datalist>
          {errors.category && <span className="field-error">{errors.category}</span>}
        </div>

        <div className="field">
          <label htmlFor="inventory-unit">Unidade de medida <span aria-hidden="true">*</span></label>
          <input id="inventory-unit" list="inventory-units" value={input.unit_of_measure} onChange={(event) => updateField('unit_of_measure', event.target.value)} aria-invalid={Boolean(errors.unit_of_measure)} maxLength={30} placeholder="Ex.: unidade, metro, litro" />
          <datalist id="inventory-units">{options.units.map((unit) => <option key={unit} value={unit} />)}</datalist>
          {errors.unit_of_measure && <span className="field-error">{errors.unit_of_measure}</span>}
        </div>

        <div className="field">
          <label htmlFor="inventory-status">Status <span aria-hidden="true">*</span></label>
          <select id="inventory-status" value={input.status} onChange={(event) => updateField('status', event.target.value as InventoryItemInput['status'])} aria-invalid={Boolean(errors.status)}>
            {INVENTORY_ITEM_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          {errors.status && <span className="field-error">{errors.status}</span>}
        </div>
      </div>

      <div className="form-section-heading form-section-heading--divided">
        <span className="form-section-heading__index" aria-hidden="true">02</span>
        <div>
          <h2>Parâmetros do estoque</h2>
          <p>O saldo começa em zero e só muda por movimentações. O custo médio será recalculado nas entradas.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="inventory-minimum">Estoque mínimo <span aria-hidden="true">*</span></label>
          <input id="inventory-minimum" type="number" min="0" step="0.001" inputMode="decimal" value={input.minimum_stock} onChange={(event) => updateField('minimum_stock', event.target.value)} aria-invalid={Boolean(errors.minimum_stock)} />
          {errors.minimum_stock && <span className="field-error">{errors.minimum_stock}</span>}
        </div>

        <div className="field">
          <label htmlFor="inventory-cost">Custo unitário/médio <span aria-hidden="true">*</span></label>
          <input id="inventory-cost" type="number" min="0" step="0.0001" inputMode="decimal" value={input.average_unit_cost} onChange={(event) => updateField('average_unit_cost', event.target.value)} aria-invalid={Boolean(errors.average_unit_cost)} />
          <span className="field-help">Valor inicial ou referência atual. Entradas com custo recalculam a média.</span>
          {errors.average_unit_cost && <span className="field-error">{errors.average_unit_cost}</span>}
        </div>

        <div className="field field--wide">
          <label htmlFor="inventory-notes">Observações</label>
          <textarea id="inventory-notes" value={input.notes} onChange={(event) => updateField('notes', event.target.value)} aria-invalid={Boolean(errors.notes)} rows={5} maxLength={2000} placeholder="Fornecedor habitual, compatibilidade, localização física ou outras referências." />
          {errors.notes && <span className="field-error">{errors.notes}</span>}
        </div>
      </div>

      <div className="form-actions">
        <div className="form-status" aria-live="polite">{submitError && <div className="alert alert--error">{submitError}</div>}</div>
        <button className="primary-button primary-button--compact" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : submitLabel}<span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  )
}
