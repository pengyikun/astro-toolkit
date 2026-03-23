'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CodeOutputProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'pre';
}

export function CodeOutput({ as = 'pre', className, ...props }: CodeOutputProps) {
  const Component = as;

  return <Component className={cn('parser-output', className)} {...props} />;
}
