'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Settings2 } from 'lucide-react';
import { logoutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AccountMenuProps {
  email: string;
  settingsLabel: string;
  signOutLabel: string;
}

export default function AccountMenu({
  email,
  settingsLabel,
  signOutLabel,
}: AccountMenuProps) {
  const signOutFormRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={signOutFormRef} action={logoutAction} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="max-w-[18rem] gap-2 text-left"
          >
            <span className="truncate whitespace-nowrap">{email}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64"
        >
          <DropdownMenuLabel className="truncate text-ink-secondary">
            {email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings2 className="h-4 w-4" />
              {settingsLabel}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              signOutFormRef.current?.requestSubmit();
            }}
          >
            <LogOut className="h-4 w-4" />
            {signOutLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
