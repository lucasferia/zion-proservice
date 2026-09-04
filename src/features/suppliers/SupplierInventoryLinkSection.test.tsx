import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SupplierInventoryLinkSection } from './SupplierInventoryLinkSection'
import type { SupplierInventoryItem } from './types'

const items: SupplierInventoryItem[] = [
  { id: 'linked', name: 'Correia', sku: 'COR-1', unit_of_measure: 'un', current_quantity: 4, status: 'active', supplier_id: 'supplier-1' },
  { id: 'available', name: 'Rolamento', sku: null, unit_of_measure: 'un', current_quantity: 8, status: 'active', supplier_id: null },
]

describe('SupplierInventoryLinkSection', () => {
  it('vincula item disponível e oferece remoção do vínculo existente', async () => {
    const user = userEvent.setup()
    const onLink = vi.fn().mockResolvedValue(undefined)
    const onUnlink = vi.fn().mockResolvedValue(undefined)
    render(<MemoryRouter><SupplierInventoryLinkSection supplierId="supplier-1" supplierActive items={items} isSaving={false} onLink={onLink} onUnlink={onUnlink} /></MemoryRouter>)
    await user.selectOptions(screen.getByLabelText('Item sem fornecedor'), 'available')
    await user.click(screen.getByRole('button', { name: 'Vincular ao fornecedor' }))
    expect(onLink).toHaveBeenCalledWith('available')
    await user.click(screen.getByRole('button', { name: 'Remover vínculo' }))
    expect(onUnlink).toHaveBeenCalledWith('linked')
  })

  it('bloqueia novos vínculos quando o fornecedor está inativo', () => {
    render(<MemoryRouter><SupplierInventoryLinkSection supplierId="supplier-1" supplierActive={false} items={items} isSaving={false} onLink={vi.fn()} onUnlink={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText(/reative o cadastro/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Item sem fornecedor')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Novo item vinculado' })).not.toBeInTheDocument()
  })
})
