import { Link } from 'react-router-dom'

type Props = {
  backTo: string
  backLabel: string
  disabled?: boolean
  disabledHint?: string
}

export function PrintToolbar({ backTo, backLabel, disabled = false, disabledHint }: Props) {
  return (
    <div className="print-toolbar no-print" aria-label="Controles do documento">
      <Link className="back-link" to={backTo}>← {backLabel}</Link>
      <div>
        {disabled && disabledHint && <span role="status">{disabledHint}</span>}
        <button className="primary-button primary-button--compact" type="button" disabled={disabled} onClick={() => window.print()}>
          Imprimir
        </button>
      </div>
    </div>
  )
}
