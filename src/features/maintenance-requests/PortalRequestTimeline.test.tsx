import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalRequestTimeline } from './PortalRequestTimeline'
import { getPortalTimelineSteps } from './portalTimeline'

const base = {
  status: 'converted' as const,
  created_at: '2026-10-22T20:00:00Z',
  decided_at: '2026-10-22T20:30:00Z',
  converted_at: '2026-10-22T21:00:00Z',
  maintenance_status: 'draft' as const,
  maintenance_scheduled_at: '2026-10-25T12:00:00Z',
  maintenance_completed_at: null,
  maintenance_cancelled_at: null,
}

describe('linha do tempo do atendimento no Portal', () => {
  it('separa eventos concluídos, atual e futuro de uma OS pendente', () => {
    const steps = getPortalTimelineSteps(base)
    expect(steps.map(({ label, state }) => ({ label, state }))).toEqual([
      { label: 'Solicitação enviada', state: 'complete' },
      { label: 'Análise concluída', state: 'complete' },
      { label: 'OS criada', state: 'complete' },
      { label: 'Atendimento previsto', state: 'current' },
      { label: 'Conclusão', state: 'upcoming' },
    ])
  })

  it('mostra conclusão real e sua data', () => {
    render(<PortalRequestTimeline request={{ ...base, maintenance_status: 'completed', maintenance_completed_at: '2026-10-25T14:00:00Z' }} />)
    expect(screen.getByText('Serviço concluído')).toBeInTheDocument()
    expect(screen.getByText('OS finalizada')).toBeInTheDocument()
    expect(screen.getAllByText(/25 de out/i)).toHaveLength(2)
  })

  it('encerra a jornada quando a OS é cancelada', () => {
    const steps = getPortalTimelineSteps({ ...base, maintenance_status: 'cancelled', maintenance_cancelled_at: '2026-10-24T12:00:00Z' })
    expect(steps.at(-1)).toMatchObject({ label: 'Atendimento cancelado', state: 'cancelled' })
  })
})
