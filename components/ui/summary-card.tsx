import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SummaryGridProps = React.HTMLAttributes<HTMLDivElement>

interface SummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  value: React.ReactNode
  valueClassName?: string
}

function SummaryGrid({ className, ...props }: SummaryGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]",
        className
      )}
      {...props}
    />
  )
}

function SummaryCard({ label, value, className, valueClassName, ...props }: SummaryCardProps) {
  return (
    <Card className={cn("h-full", className)} {...props}>
      <CardContent className="flex h-full flex-col gap-1.5 p-4 sm:p-5">
        <div className="text-[0.8rem] font-semibold tracking-[0.01em] text-ink-secondary">
          {label}
        </div>
        <div
          className={cn(
            "text-sm leading-6 text-ink [font-variant-numeric:tabular-nums_slashed-zero] [overflow-wrap:anywhere] sm:text-[0.95rem]",
            valueClassName
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

export { SummaryGrid, SummaryCard }
