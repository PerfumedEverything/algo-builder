export default function SignalsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded bg-muted/30" />
          <div className="h-4 w-64 rounded bg-muted/30" />
        </div>
        <div className="h-9 w-36 rounded bg-muted/30" />
      </div>
      <div className="h-10 rounded-lg bg-muted/30" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-muted/30 h-28" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-muted/30 h-40" />
        ))}
      </div>
    </div>
  )
}
