/** Background + text classes for transaction status pills. */
export const STATUS_COLORS: Record<string, string> = {
  success: 'bg-success-light text-success',
  pending: 'bg-warning-light text-warning',
  failed: 'bg-danger-light text-danger',
  timeout: 'bg-page text-ink-secondary',
  returned: 'bg-brand-light text-brand',
};

/** Dot color classes for transaction status indicators. */
export const STATUS_DOT_COLORS: Record<string, string> = {
  success: 'bg-success',
  pending: 'bg-warning',
  failed: 'bg-danger',
  timeout: 'bg-ink-muted',
  returned: 'bg-brand',
};

/** CSS class for feed-row marker dots on the dashboard. */
export const STATUS_MARKER_CLASS: Record<string, string> = {
  failed: 'feed-marker-danger',
  pending: 'feed-marker-warning',
  returned: '',
  timeout: 'feed-marker-muted',
  success: 'feed-marker-success',
};
