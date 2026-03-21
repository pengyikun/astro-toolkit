/**
 * A small inline badge for showing status, boolean values, or labels.
 *
 * Usage:
 *   <Pill active label="ACTIVE" />
 *   <Pill active={false} label="No" activeClass="bg-warning-light text-warning" />
 */

interface PillProps {
  /** Whether the pill is in its "active" / truthy state. */
  active: boolean;
  /** Text to display. */
  label: string;
  /** Tailwind classes applied when `active` is true. */
  activeClass?: string;
  /** Tailwind classes applied when `active` is false. */
  inactiveClass?: string;
}

export default function Pill({
  active,
  label,
  activeClass = 'bg-success-light text-success',
  inactiveClass = 'bg-page text-ink-secondary',
}: PillProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${active ? activeClass : inactiveClass}`}>
      {label}
    </span>
  );
}
