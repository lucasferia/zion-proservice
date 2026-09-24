import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  children?: ReactNode
  onConfirm: () => void
  onClose: () => void
  returnFocusTo?: RefObject<HTMLElement | null>
}

export function AcademyConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  busy = false,
  children,
  onConfirm,
  onClose,
  returnFocusTo,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(false)
  const returnFocusRef = useRef(returnFocusTo)

  useEffect(() => {
    if (open) {
      wasOpen.current = true
      returnFocusRef.current = returnFocusTo
      requestAnimationFrame(() => cancelRef.current?.focus())
      return
    }
    if (wasOpen.current) {
      wasOpen.current = false
      requestAnimationFrame(() => returnFocusRef.current?.current?.focus())
    }
  }, [open, returnFocusTo])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
      if (event.key !== 'Tab') return

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onClose, open])

  if (!open) return null
  return (
    <div className="academy-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <section ref={dialogRef} className="academy-dialog" role="dialog" aria-modal="true" aria-labelledby="academy-dialog-title" aria-describedby="academy-dialog-description">
        <span className="eyebrow">Confirmação necessária</span>
        <h2 id="academy-dialog-title">{title}</h2>
        <p id="academy-dialog-description">{description}</p>
        {children}
        <div className="academy-dialog__actions">
          <button ref={cancelRef} className="secondary-button" type="button" onClick={onClose} disabled={busy}>Voltar</button>
          <button className={tone === 'danger' ? 'danger-text-button' : 'primary-button primary-button--compact'} type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Salvando…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
