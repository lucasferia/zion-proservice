import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cancelReturnSchedule, completeReturnSchedule } from './returnApi'
import { returnKeys } from './returnQueries'
import type { ReturnSchedule } from './types'
import { validateReturnCancellation } from './validation'

type Props = {
  organizationId: string
  schedule: ReturnSchedule
  onSuccess: (message: string) => void
}

export function ReturnScheduleActions({ organizationId, schedule, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const [action, setAction] = useState<'complete' | 'cancel' | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (schedule.status !== 'pending') return null

  async function finish(run: () => Promise<void>, message: string) {
    setBusy(true)
    setError(null)
    try {
      await run()
      await queryClient.invalidateQueries({ queryKey: returnKeys.all })
      onSuccess(message)
      setAction(null)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível atualizar o retorno.')
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    const reasonError = validateReturnCancellation(reason)
    if (reasonError) {
      setError(reasonError)
      return
    }
    void finish(
      () => cancelReturnSchedule(organizationId, schedule.id, reason),
      'Retorno cancelado e motivo registrado no histórico.',
    )
  }

  return (
    <div className="return-actions" onClick={(event) => event.stopPropagation()}>
      {!action && <><button type="button" onClick={() => setAction('complete')}>Concluir</button><button type="button" className="danger-text-button" onClick={() => setAction('cancel')}>Cancelar</button></>}
      {action === 'complete' && <div className="return-action-confirm" role="alert"><strong>Atendimento realizado?</strong><div><button type="button" className="primary-button primary-button--compact" disabled={busy} onClick={() => void finish(() => completeReturnSchedule(organizationId, schedule.id), 'Retorno concluído com sucesso.')}>{busy ? 'Concluindo…' : 'Sim, concluir'}</button><button type="button" disabled={busy} onClick={() => setAction(null)}>Voltar</button></div></div>}
      {action === 'cancel' && <div className="return-action-confirm return-action-confirm--cancel" role="alert"><label><span>Motivo do cancelamento</span><textarea rows={2} maxLength={500} value={reason} onChange={(event) => { setReason(event.target.value); setError(null) }} autoFocus /></label><div><button type="button" className="danger-button" disabled={busy} onClick={handleCancel}>{busy ? 'Cancelando…' : 'Confirmar'}</button><button type="button" disabled={busy} onClick={() => setAction(null)}>Voltar</button></div></div>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  )
}
