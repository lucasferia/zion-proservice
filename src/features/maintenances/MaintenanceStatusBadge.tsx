import { getMaintenanceStatusLabel, type MaintenanceStatus } from './types'

export function MaintenanceStatusBadge({ status, label }: { status: MaintenanceStatus; label?: string }) {
  return (
    <span className={`maintenance-status maintenance-status--${status}`}>
      <span aria-hidden="true" />
      {label ?? getMaintenanceStatusLabel(status)}
    </span>
  )
}
