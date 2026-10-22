import { getMaintenanceStatusLabel, type MaintenanceStatus } from './types'

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  return (
    <span className={`maintenance-status maintenance-status--${status}`}>
      <span aria-hidden="true" />
      {getMaintenanceStatusLabel(status)}
    </span>
  )
}
