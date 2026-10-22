import { getPortalTimelineSteps, type TimelineRequest } from './portalTimeline'

function shortDate(value?: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

export function PortalRequestTimeline({ request, compact = false }: { request: TimelineRequest; compact?: boolean }) {
  const steps = getPortalTimelineSteps(request)
  return (
    <section className={`portal-request-timeline${compact ? ' portal-request-timeline--compact' : ''}`} aria-label="Andamento do atendimento">
      {!compact && <div className="portal-request-timeline__heading"><span className="eyebrow">Histórico e próximos passos</span><h2>Andamento do atendimento</h2></div>}
      <ol>
        {steps.map((step, index) => <li className={`portal-request-timeline__step portal-request-timeline__step--${step.state}`} key={`${step.label}-${index}`}>
          <span className="portal-request-timeline__marker" aria-hidden="true" />
          <div><strong>{step.label}</strong>{!compact&&<small>{step.detail}</small>}{step.date&&<time dateTime={step.date}>{shortDate(step.date)}</time>}</div>
        </li>)}
      </ol>
    </section>
  )
}
