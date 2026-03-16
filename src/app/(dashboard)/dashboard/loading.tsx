export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="rounded-2xl bg-muted/30 h-48" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-muted/30 h-56" />
        <div className="rounded-xl bg-muted/30 h-56" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-muted/30 h-28" />
        ))}
      </div>
    </div>
  )
}
