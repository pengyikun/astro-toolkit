import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DetailSectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode
  titleClassName?: string
  contentClassName?: string
}

interface DetailMetadataProps extends React.HTMLAttributes<HTMLDListElement> {}

interface DetailItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  value: React.ReactNode
  labelClassName?: string
  valueClassName?: string
  wide?: boolean
}

function DetailSectionCard({
  title,
  titleClassName,
  contentClassName,
  className,
  children,
  ...props
}: DetailSectionCardProps) {
  return (
    <Card className={className} {...props}>
      <CardContent className={cn("p-5 sm:p-6", contentClassName)}>
        <h3 className={cn("detail-section-title", titleClassName)}>{title}</h3>
        {children}
      </CardContent>
    </Card>
  )
}

function DetailMetadata({ className, ...props }: DetailMetadataProps) {
  return <dl className={cn("detail-metadata-grid", className)} {...props} />
}

function DetailItem({
  label,
  value,
  labelClassName,
  valueClassName,
  wide = false,
  className,
  ...props
}: DetailItemProps) {
  return (
    <div className={cn(wide && "detail-wide", className)} {...props}>
      <dt className={cn("detail-label", labelClassName)}>{label}</dt>
      <dd className={cn("text-sm text-ink", valueClassName)}>{value}</dd>
    </div>
  )
}

export { DetailSectionCard, DetailMetadata, DetailItem }
