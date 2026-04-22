import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import ChatInterface from '@/components/intelligence/ChatInterface';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';

export const metadata: Metadata = { title: 'Chat' };

export default async function ChatPage() {
  await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader title={t(dict, 'nav.chat')} />
      <ChatInterface />
    </>
  );
}
