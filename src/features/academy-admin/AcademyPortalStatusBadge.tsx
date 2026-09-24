import { academyCommercialStatuses, academyUserStatuses, type AcademyCommercialStatus, type AcademyUserStatus } from './types'

export function AcademyUserStatusBadge({ status }: { status: AcademyUserStatus }) {
  const label = academyUserStatuses.find((item) => item.value === status)?.label ?? status
  return <span className={`academy-status academy-status--${status}`}><span aria-hidden="true" />{label}</span>
}
export function AcademyCommercialStatusBadge({ status }: { status: AcademyCommercialStatus | null }) {
  if (!status) return <span className="academy-status academy-status--unconfigured"><span aria-hidden="true" />Não configurado</span>
  const label = academyCommercialStatuses.find((item) => item.value === status)?.label ?? status
  return <span className={`academy-status academy-status--commercial-${status}`}><span aria-hidden="true" />{label}</span>
}
