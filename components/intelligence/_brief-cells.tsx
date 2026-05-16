'use client';

/**
 * Shared cell + chip primitives for the brief and todo tables.
 *
 * Both Brief (summary + pending) and Todo render the same structured
 * fields — keep their visuals in one place so the two tables stay
 * visually consistent and drift-free.
 */

import { useLocale } from '@/lib/i18n/client';
import {
  Mail,
  MessageCircle,
  Users,
  User,
  Globe,
  Tag,
  CheckCircle2,
  CreditCard,
  Eye,
  Scale,
  CalendarClock,
  FileSignature,
  HelpCircle,
  RefreshCw,
  Info,
  MessageSquare,
  Calendar,
  Inbox,
  Sparkles,
} from 'lucide-react';

// ── Source helpers ───────────────────────────────────────────────────────

/** Map any free-form source string to one of our canonical buckets. */
export function normalizeSource(source: string | null | undefined): string {
  const s = (source ?? '').trim().toLowerCase();
  if (s.includes('whatsapp') || s === 'wa') return 'whatsapp';
  if (s.includes('email') || s === 'mail') return 'email';
  return s;
}

/** Capitalise to the LLM contract form (`Email`/`WhatsApp`). */
export function canonicalSourceLabel(source: string): string {
  const n = normalizeSource(source);
  if (n === 'email') return 'Email';
  if (n === 'whatsapp') return 'WhatsApp';
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
}

export function isPastDue(dueDate: string): boolean {
  try {
    const due = new Date(dueDate + 'T23:59:59');
    return due.getTime() < Date.now();
  } catch {
    return false;
  }
}

function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ── Category icon map (shared across brief + todo) ───────────────────────

export const CATEGORY_ICONS: Record<string, typeof Tag> = {
  approval: CheckCircle2,
  payment: CreditCard,
  review: Eye,
  decision: Scale,
  meeting: CalendarClock,
  contract: FileSignature,
  request: HelpCircle,
  update: RefreshCw,
  info: Info,
};

// ── Table primitives ─────────────────────────────────────────────────────

export function Th({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <th className={`text-left font-medium px-4 py-2.5 ${wide ? '' : 'whitespace-nowrap'}`}>
      {children}
    </th>
  );
}

export function Td({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <td className={`px-4 py-3 ${wide ? '' : 'whitespace-nowrap'}`}>{children}</td>
  );
}

export function Dash() {
  return <span className="text-ink-muted">—</span>;
}

export function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-10 w-10 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
        <Inbox className="h-5 w-5 text-ink-muted" />
      </div>
      <p className="text-sm text-ink-secondary">{text}</p>
    </div>
  );
}

export function CellText({ value, truncate }: { value?: string | null; truncate?: boolean }) {
  if (!value) return <Dash />;
  if (truncate) {
    return (
      <span className="block max-w-[18rem] truncate text-ink" title={value}>
        {value}
      </span>
    );
  }
  return <span className="text-ink whitespace-nowrap">{value}</span>;
}

// ── Badges & pills ───────────────────────────────────────────────────────

export function SourceBadge({ source }: { source: string }) {
  const normalized = normalizeSource(source);
  const isWhatsApp = normalized === 'whatsapp';
  const Icon = isWhatsApp ? MessageCircle : Mail;
  const label = canonicalSourceLabel(source);
  const styles = isWhatsApp
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20'
    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-500/20';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function WaitingOnPill({ waitingOn }: { waitingOn: 'me' | 'them' | 'external' }) {
  const { t } = useLocale();
  const map = {
    me: {
      style: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20',
      Icon: User,
      label: t('intelligence.waitingOn.me'),
    },
    them: {
      style: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20',
      Icon: Users,
      label: t('intelligence.waitingOn.them'),
    },
    external: {
      style: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20',
      Icon: Globe,
      label: t('intelligence.waitingOn.external'),
    },
  } as const;
  const { style, Icon, label } = map[waitingOn];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function CategoryBadge({ category }: { category?: string | null }) {
  const { t } = useLocale();
  if (!category) return <Dash />;
  const key = category.trim().toLowerCase();
  const Icon = CATEGORY_ICONS[key] ?? Tag;
  const labelKey = `intelligence.category.${key}`;
  const translated = t(labelKey);
  const label = translated === labelKey ? toTitleCase(category) : translated;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-surface-secondary text-ink-secondary ring-1 ring-inset ring-border">
      <Icon className="h-3 w-3 text-ink-muted" />
      {label}
    </span>
  );
}

export function CounterpartyCell({ value }: { value?: string | null }) {
  if (!value) return <Dash />;
  return (
    <span
      className="inline-flex items-center gap-1.5 max-w-[14rem] truncate text-ink"
      title={value}
    >
      <Users className="h-3 w-3 text-ink-muted shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  );
}

export function MessageCountCell({ count }: { count?: number | null }) {
  const { t } = useLocale();
  if (typeof count !== 'number' || count <= 0) return <Dash />;
  const tooltipKey = 'intelligence.messageCountTooltip';
  const tooltip = t(tooltipKey);
  return (
    <span
      className="inline-flex items-center gap-1 text-ink-secondary tabular-nums text-xs"
      title={tooltip === tooltipKey ? `${count} messages` : tooltip.replace('{count}', String(count))}
    >
      <MessageSquare className="h-3 w-3 text-ink-muted" />
      {count}
    </span>
  );
}

export function UrgencyPill({ urgency }: { urgency: 'high' | 'medium' | 'low' }) {
  const { t } = useLocale();
  const map = {
    high: {
      style: 'bg-red-500/10 text-red-700 dark:text-red-400 ring-red-500/20',
      dot: 'bg-red-500',
      label: t('intelligence.urgencyHigh'),
    },
    medium: {
      style: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20',
      dot: 'bg-amber-500',
      label: t('intelligence.urgencyMedium'),
    },
    low: {
      style: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
      dot: 'bg-emerald-500',
      label: t('intelligence.urgencyLow'),
    },
  } as const;
  const { style, dot, label } = map[urgency];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function DueDateCell({ date, highlightPast }: { date?: string | null; highlightPast?: boolean }) {
  if (!date) return <Dash />;
  const past = highlightPast && isPastDue(date);
  return (
    <span
      className={`inline-flex items-center gap-1 tabular-nums font-medium ${
        past ? 'text-red-600 dark:text-red-400' : 'text-ink'
      }`}
    >
      <Calendar className="h-3 w-3" />
      {date}
    </span>
  );
}

export function EventDateCell({ date }: { date?: string | null }) {
  if (!date) return <Dash />;
  return <span className="text-ink-secondary tabular-nums">{date}</span>;
}

// Re-export icons used by other components (saves duplicate imports).
export { Mail, MessageCircle, Users, User, Globe, Sparkles };
