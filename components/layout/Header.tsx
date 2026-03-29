import GlobalSearch from './GlobalSearch';
import AccountMenu from './AccountMenu';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { getSessionFromCookies } from '@/lib/auth-session';
import { isAppAuthDisabled } from '@/lib/auth';
import { getDictionary, getLocaleFromCookies, t } from '@/lib/i18n';

export default async function Header() {
  const nodeEnv = process.env.NEXT_PUBLIC_NODE_ENV || process.env.NODE_ENV || 'development';
  const envTone: NonNullable<BadgeProps['variant']> = nodeEnv === 'production' ? 'danger' : 'warning';
  const authDisabled = isAppAuthDisabled(process.env);
  const session = authDisabled ? null : await getSessionFromCookies();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <div className="console-topbar">
      <div className="console-topbar-bar">
        <div className="console-topbar-actions">
          <GlobalSearch />
          <Badge variant={envTone} className="h-8 gap-2 px-3 text-[0.68rem] tracking-[0.05em]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            {nodeEnv.toUpperCase()}
          </Badge>
          {session ? (
            <AccountMenu
              email={session.email}
              settingsLabel={t(dict, 'nav.settings')}
              signOutLabel={t(dict, 'auth.signOut')}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
