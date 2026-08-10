export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      {label ? <p className="font-bold text-white/80">{label}</p> : null}
    </div>
  )
}
