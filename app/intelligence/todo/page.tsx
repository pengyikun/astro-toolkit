import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';
import { getTodos } from '@/actions/intelligence';
import TodoPageClient from '@/components/intelligence/TodoPageClient';

export const metadata: Metadata = { title: 'Todo' };

export default async function IntelligenceTodoPage() {
  await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const todos = await getTodos();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'intelligence.title'), href: '/intelligence' },
          { label: t(dict, 'intelligence.todo') },
        ]}
        title={t(dict, 'intelligence.todo')}
        description={t(dict, 'intelligence.todoPageDescription')}
      />

      <TodoPageClient initialTodos={todos} />
    </>
  );
}
