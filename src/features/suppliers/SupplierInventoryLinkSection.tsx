import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatInventoryQuantity } from '../inventory/formatters'
import type { SupplierInventoryItem } from './types'

type Props = {
  supplierId: string
  supplierActive: boolean
  items: SupplierInventoryItem[]
  isSaving: boolean
  onLink: (itemId: string) => Promise<void>
  onUnlink: (itemId: string) => Promise<void>
}

export function SupplierInventoryLinkSection({
  supplierId,
  supplierActive,
  items,
  isSaving,
  onLink,
  onUnlink,
}: Props) {
  const [selectedItemId, setSelectedItemId] = useState('')
  const linkedItems = useMemo(
    () => items.filter((item) => item.supplier_id === supplierId),
    [items, supplierId],
  )
  const availableItems = useMemo(
    () => items.filter((item) => item.supplier_id === null && item.status === 'active'),
    [items],
  )

  async function handleLink() {
    if (!selectedItemId) return
    await onLink(selectedItemId)
    setSelectedItemId('')
  }

  return (
    <section className="supplier-inventory" aria-labelledby="supplier-inventory-title">
      <div className="section-heading supplier-inventory__heading">
        <div>
          <span className="eyebrow">Catálogo conectado</span>
          <h2 id="supplier-inventory-title">Itens fornecidos</h2>
          <p>Vincule peças existentes ou cadastre um item já associado a este fornecedor.</p>
        </div>
        {supplierActive && (
          <Link className="secondary-button secondary-button--link" to={`/app/estoque/novo?fornecedor=${supplierId}`}>
            Novo item vinculado
          </Link>
        )}
      </div>

      {supplierActive ? (
        <div className="supplier-link-control">
          <label className="field" htmlFor="supplier-inventory-item">
            <span>Item sem fornecedor</span>
            <select id="supplier-inventory-item" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)} disabled={isSaving || availableItems.length === 0}>
              <option value="">Selecione um item</option>
              {availableItems.map((item) => <option key={item.id} value={item.id}>{item.name}{item.sku ? ` · ${item.sku}` : ''}</option>)}
            </select>
          </label>
          <button className="primary-button primary-button--compact" type="button" onClick={() => void handleLink()} disabled={!selectedItemId || isSaving}>
            {isSaving ? 'Vinculando…' : 'Vincular ao fornecedor'}
          </button>
          {availableItems.length === 0 && <small>Todos os itens ativos já possuem fornecedor ou ainda não há itens cadastrados.</small>}
        </div>
      ) : (
        <div className="photo-readonly-note">Fornecedor inativo: reative o cadastro para criar novos vínculos.</div>
      )}

      {linkedItems.length === 0 ? (
        <div className="supplier-inventory-empty">
          <strong>Nenhum item vinculado</strong>
          <p>Use o seletor acima ou escolha este fornecedor no cadastro de um item de estoque.</p>
        </div>
      ) : (
        <div className="supplier-inventory-list" aria-label="Itens vinculados ao fornecedor">
          {linkedItems.map((item) => (
            <article key={item.id}>
              <div>
                <Link to={`/app/estoque/${item.id}`}>{item.name}</Link>
                <span>{item.sku || 'Sem SKU'} · {formatInventoryQuantity(item.current_quantity, item.unit_of_measure)}</span>
              </div>
              <button type="button" onClick={() => void onUnlink(item.id)} disabled={isSaving}>Remover vínculo</button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
