export function FoundationPage() {
  return (
    <section className="foundation-page" aria-labelledby="foundation-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Ambiente protegido</span>
          <h1 id="foundation-title">Fundação Zion</h1>
        </div>
        <span className="status-chip">
          <span aria-hidden="true" /> Base ativa
        </span>
      </div>

      <div className="foundation-panel">
        <div className="foundation-panel__index" aria-hidden="true">
          01
        </div>
        <div className="foundation-panel__content">
          <span className="eyebrow">Etapa atual</span>
          <h2>Estrutura pronta para operar com segurança.</h2>
          <p>
            Autenticação, isolamento por organização e identidade visual estão preparados.
            Os módulos operacionais serão adicionados somente nas próximas etapas aprovadas.
          </p>
          <div className="foundation-checks" aria-label="Recursos da fundação">
            <span>Rotas protegidas</span>
            <span>Tenancy com RLS</span>
            <span>Interface responsiva</span>
          </div>
        </div>
      </div>
    </section>
  )
}

