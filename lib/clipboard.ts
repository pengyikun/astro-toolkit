/**
 * Copy text to the clipboard with visual button feedback.
 *
 * Falls back to `window.prompt` when the Clipboard API is unavailable.
 */
export function copyToClipboard(
  text: string,
  buttonEl: HTMLButtonElement | null,
  labels: { prompt: string; shown: string; copied: string },
): void {
  if (!buttonEl) return;
  const originalLabel = buttonEl.textContent ?? '';

  function showCopiedState(label: string) {
    if (!buttonEl) return;
    buttonEl.textContent = label;
    setTimeout(() => {
      buttonEl.textContent = originalLabel;
    }, 2000);
  }

  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    window.prompt(labels.prompt, text);
    showCopiedState(labels.shown);
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      showCopiedState(labels.copied);
    })
    .catch(() => {
      window.prompt(labels.prompt, text);
      showCopiedState(labels.shown);
    });
}
