import { getInventorySituationLabel, type InventorySituation } from './types'

export function InventorySituationBadge({ situation }: { situation: InventorySituation }) {
  return (
    <span className={`inventory-situation inventory-situation--${situation}`}>
      <span aria-hidden="true" />
      {getInventorySituationLabel(situation)}
    </span>
  )
}
