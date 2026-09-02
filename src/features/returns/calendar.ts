export function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const end = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return { periodStart: `${month}-01`, periodEnd: `${month}-${String(end).padStart(2, '0')}` }
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7)
}

export function calendarDays(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay()
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 1, index - firstWeekday + 1))
    return { date: date.toISOString().slice(0, 10), inMonth: date.getUTCMonth() === monthNumber - 1 }
  })
}
