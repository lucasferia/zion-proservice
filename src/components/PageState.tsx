type PageStateProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'default' | 'error'
}

export function PageState({
  title,
  description,
  actionLabel,
  onAction,
  tone = 'default',
}: PageStateProps) {
  return (
    <section className={`page-state page-state--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <span className="page-state__mark" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button className="secondary-button" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </section>
  )
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="page-skeleton" aria-label="Carregando conteúdo" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

