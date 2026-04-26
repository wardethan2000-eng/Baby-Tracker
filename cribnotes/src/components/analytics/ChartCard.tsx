"use client"

interface ChartCardProps {
  title: string
  children: React.ReactNode
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-surface rounded-2xl p-4">
      <div className="font-display text-lg font-semibold text-text-primary mb-4">
        {title}
      </div>
      {children}
    </div>
  )
}