import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: React.ReactNode
  href?: string
}

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  breadcrumbs?: BreadcrumbItem[]
  breadcrumbLabel?: string
  title: React.ReactNode
  description?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  titleClassName?: string
}

function PageHeader({
  breadcrumbs,
  breadcrumbLabel = "Breadcrumb",
  title,
  description,
  meta,
  actions,
  className,
  titleClassName,
  ...props
}: PageHeaderProps) {
  return (
    <section className={cn("page-header", className)} {...props}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label={breadcrumbLabel}>
          <ol className="page-breadcrumbs">
            {breadcrumbs.map((item, index) => (
              <li key={`${item.href ?? "crumb"}-${index}`} className="page-breadcrumb-item">
                {item.href ? (
                  <Link href={item.href} className="font-medium hover:text-ink">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="page-breadcrumb-current">{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                  </svg>
                ) : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="page-header-row">
        <div className="page-header-copy">
          <h1 className={cn("console-title", titleClassName)}>{title}</h1>
          {meta ? <div className="page-header-meta">{meta}</div> : null}
          {description ? <p className="page-subtitle">{description}</p> : null}
        </div>
        {actions ? <div className="detail-actions">{actions}</div> : null}
      </div>
    </section>
  )
}

export { PageHeader }
