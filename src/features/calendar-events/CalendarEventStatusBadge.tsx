import { calendarEventStatusLabel, type CalendarEventStatus } from './types'

export function CalendarEventStatusBadge({ status }: { status: CalendarEventStatus }) {
  return <span className={`calendar-event-status calendar-event-status--${status}`}><span aria-hidden="true" />{calendarEventStatusLabel(status)}</span>
}
