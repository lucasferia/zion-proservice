import { getEquipmentStatusLabel, type EquipmentStatus } from './types'

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <span className={`equipment-status equipment-status--${status}`}>
      <span aria-hidden="true" />
      {getEquipmentStatusLabel(status)}
    </span>
  )
}
