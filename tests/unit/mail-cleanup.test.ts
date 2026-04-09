import { afterEach, describe, expect, it, vi } from 'vitest';
import { access, mkdir, rm, utimes, writeFile } from 'fs/promises';
import path from 'path';
import { ATTACHMENT_DIR, cleanupStaleAttachments, ensureAttachmentCleanupScheduled, stopAttachmentCleanup } from '../../lib/mail';

describe('cleanupStaleAttachments', () => {
  afterEach(async () => {
    stopAttachmentCleanup();
    await rm(ATTACHMENT_DIR, { recursive: true, force: true });
  });

  it('removes stale attachment directories recursively', async () => {
    const staleDir = path.join(ATTACHMENT_DIR, 'stale-thread');
    const staleFile = path.join(staleDir, 'invoice.pdf');
    await mkdir(staleDir, { recursive: true });
    await writeFile(staleFile, 'attachment');

    const staleTime = new Date(Date.now() - (25 * 60 * 60 * 1000));
    await utimes(staleFile, staleTime, staleTime);
    await utimes(staleDir, staleTime, staleTime);

    await cleanupStaleAttachments();

    await expect(access(staleDir)).rejects.toThrow();
  });

  it('ensureAttachmentCleanupScheduled is idempotent and stopAttachmentCleanup clears the interval', () => {
    ensureAttachmentCleanupScheduled();
    ensureAttachmentCleanupScheduled();
    stopAttachmentCleanup();
    stopAttachmentCleanup();
  });

  it('scheduled cleanup removes stale directories on interval tick', async () => {
    // Capture the callback passed to setInterval
    let intervalCallback: (() => void) | undefined;
    const origSetInterval = globalThis.setInterval;
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((cb: () => void) => {
      intervalCallback = cb;
      return origSetInterval(() => {}, 1_000_000) as ReturnType<typeof setInterval>;
    }) as typeof setInterval);

    try {
      ensureAttachmentCleanupScheduled();
      expect(intervalCallback).toBeDefined();

      const staleDir = path.join(ATTACHMENT_DIR, 'scheduled-stale');
      await mkdir(staleDir, { recursive: true });
      await writeFile(path.join(staleDir, 'file.txt'), 'data');
      const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
      await utimes(staleDir, staleTime, staleTime);

      // Simulate the interval firing
      intervalCallback!();

      // Wait for the async cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(access(staleDir)).rejects.toThrow();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
