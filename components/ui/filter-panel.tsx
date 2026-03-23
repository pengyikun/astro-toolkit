import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FilterPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  hasFilters?: boolean
  onReset?: () => void
  resetLabel?: React.ReactNode
  gridClassName?: string
}

interface FilterFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  htmlFor?: string
}

function FilterPanel({
  hasFilters = false,
  onReset,
  resetLabel,
  className,
  gridClassName,
  children,
  ...props
}: FilterPanelProps) {
  return (
    <Card className={cn("mt-6", className)} {...props}>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {hasFilters && onReset && resetLabel ? (
          <div className="flex flex-wrap items-center justify-end gap-4">
            <Button variant="ghost" className="text-sm font-semibold" onClick={onReset}>
              {resetLabel}
            </Button>
          </div>
        ) : null}

        <div className={cn("list-filter-grid grid gap-3", gridClassName)}>{children}</div>
      </CardContent>
    </Card>
  )
}

function FilterField({ label, htmlFor, className, children, ...props }: FilterFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <Label htmlFor={htmlFor} className="filter-field-label">
        {label}
      </Label>
      {children}
    </div>
  )
}

function FilterActions({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-end gap-3 lg:justify-start", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { FilterPanel, FilterField, FilterActions }
