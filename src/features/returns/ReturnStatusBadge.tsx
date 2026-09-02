import { getReturnStatusLabel, type ReturnScheduleStatus, type ReturnTiming } from './types'

export function ReturnStatusBadge({ status, timing }: { status: ReturnScheduleStatus; timing?: ReturnTiming }) {
  const emphasis = status === 'pending' ? timing ?? 'future' : status
  return (
    <span className={`return-status return-status--${emphasis}`}>
      <span aria-hidden="true" />
      {status === 'pending' && timing === 'overdue' ? 'Vencido' : getReturnStatusLabel(status)}
    </span>
  )
}
