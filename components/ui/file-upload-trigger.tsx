'use client';

import { forwardRef, useId, useRef, type ChangeEventHandler, type InputHTMLAttributes, type ReactNode } from 'react';
import { UploadIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadTriggerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'type'> {
  actionLabel: ReactNode;
  promptLabel: ReactNode;
  helperText?: ReactNode;
  fileName?: string | null;
  buttonClassName?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

export const FileUploadTrigger = forwardRef<HTMLInputElement, FileUploadTriggerProps>(
  (
    {
      id,
      name,
      accept,
      multiple,
      disabled,
      fileName,
      helperText,
      actionLabel,
      promptLabel,
      buttonClassName,
      onChange,
      ...props
    },
    forwardedRef
  ) => {
    const generatedId = useId();
    const inputId = id ?? `upload-${generatedId}`;
    const statusId = `${inputId}-status`;
    const helperId = `${inputId}-help`;
    const inputRef = useRef<HTMLInputElement | null>(null);

    const setRef = (node: HTMLInputElement | null) => {
      inputRef.current = node;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    const describedBy = [helperText ? helperId : null, statusId].filter(Boolean).join(' ');

    return (
      <>
        <input
          {...props}
          ref={setRef}
          type="file"
          id={inputId}
          name={name}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          onChange={onChange}
        />
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className={cn('console-upload-drop p-0 text-left hover:bg-transparent', buttonClassName)}
          aria-controls={inputId}
          aria-describedby={describedBy || undefined}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center px-4 py-5">
            <UploadIcon className="mb-2 h-8 w-8 text-ink-muted" />
            {fileName ? (
              <p id={statusId} className="max-w-full break-all text-center text-sm text-ink">
                {fileName}
              </p>
            ) : (
              <p id={statusId} className="text-center text-sm text-ink-secondary">
                <span className="font-medium text-brand">{actionLabel}</span> {promptLabel}
              </p>
            )}
            {helperText ? (
              <p id={helperId} className="mt-1 text-center console-helper-copy">
                {helperText}
              </p>
            ) : null}
          </div>
        </Button>
      </>
    );
  }
);

FileUploadTrigger.displayName = 'FileUploadTrigger';
