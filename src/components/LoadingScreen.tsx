export function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="loading-screen" aria-live="polite" aria-busy="true">
      <div className="loading-mark" aria-hidden="true"><span /></div>
      <p>{label}</p>
    </main>
  )
}

