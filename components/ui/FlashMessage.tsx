'use client';

import { toast } from 'sonner';

export function showToast(type: 'success' | 'error', message: string) {
  if (type === 'success') {
    toast.success(message);
  } else {
    toast.error(message);
  }
}
