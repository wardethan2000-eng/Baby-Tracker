"use client"

interface MetricCardProps {
  label: string
  value: string
  sublabel?: string
}

export function MetricCard({ label, value, sublabel }: MetricCardProps) {
  return (
    <div className="bg-surface rounded-2xl p-4">
      <div className="text-text-secondary text-sm">{label}</div>
      <div className="text-text-primary text-2xl font-bold my-1">{value}</div>
      {sublabel && (
        <div className="text-text-muted text-xs">{sublabel}</div>
      )}
    </div>
  )
}