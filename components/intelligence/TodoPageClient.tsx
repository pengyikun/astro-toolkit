'use client';

import { useState, useTransition, useCallback } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createTodo, updateTodoStatus, updateTodoTitle, deleteTodo, getTodos } from '@/actions/intelligence';
import type { Todo, TodoStatus, TodoUrgency } from '@/types';
import { Plus, Circle, Clock, CheckCircle2, Trash2 } from 'lucide-react';

interface TodoPageClientProps {
  initialTodos: Todo[];
}

const URGENCY_CONFIG: Record<TodoUrgency, { dot: string; variant: 'danger' | 'warning' | 'neutral'; key: string }> = {
  high: { dot: 'bg-red-500', variant: 'danger', key: 'intelligence.urgencyHigh' },
  medium: { dot: 'bg-yellow-500', variant: 'warning', key: 'intelligence.urgencyMedium' },
  low: { dot: 'bg-green-500', variant: 'neutral', key: 'intelligence.urgencyLow' },
};

const STATUS_CONFIG: Record<TodoStatus, { icon: typeof Circle; key: string }> = {
  open: { icon: Circle, key: 'intelligence.statusOpen' },
  in_progress: { icon: Clock, key: 'intelligence.statusInProgress' },
  done: { icon: CheckCircle2, key: 'intelligence.statusDone' },
};

const STATUS_CYCLE: Record<TodoStatus, TodoStatus> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
};

export default function TodoPageClient({ initialTodos }: TodoPageClientProps) {
  const { t, formatDate } = useLocale();
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [newTitle, setNewTitle] = useState('');
  const [newUrgency, setNewUrgency] = useState<TodoUrgency>('medium');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const data = await getTodos();
      setTodos(data);
    });
  }, []);

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    const fd = new FormData();
    fd.set('title', title);
    fd.set('urgency', newUrgency);
    setNewTitle('');
    startTransition(async () => {
      await createTodo(fd);
      refresh();
    });
  };

  const handleStatusCycle = (todo: Todo) => {
    const next = STATUS_CYCLE[todo.status];
    const fd = new FormData();
    fd.set('id', String(todo.id));
    fd.set('status', next);
    startTransition(async () => {
      await updateTodoStatus(fd);
      refresh();
    });
  };

  const handleSaveTitle = (id: number) => {
    const title = editTitle.trim();
    if (!title) {
      setEditingId(null);
      setEditTitle('');
      return;
    }
    const fd = new FormData();
    fd.set('id', String(id));
    fd.set('title', title);
    setEditingId(null);
    startTransition(async () => {
      await updateTodoTitle(fd);
      refresh();
    });
  };

  const handleDelete = (id: number) => {
    const fd = new FormData();
    fd.set('id', String(id));
    startTransition(async () => {
      await deleteTodo(fd);
      refresh();
    });
  };

  const openTodos = todos.filter((t) => t.status !== 'done');
  const doneTodos = todos.filter((t) => t.status === 'done');

  const renderList = (items: Todo[]) => {
    if (items.length === 0) {
      return <p className="text-sm text-ink-secondary py-4">{t('intelligence.noTodos')}</p>;
    }

    return (
      <div className={`divide-y divide-border ${isPending ? 'opacity-60 pointer-events-none' : ''} transition-opacity`}>
        {items.map((todo) => {
          const statusCfg = STATUS_CONFIG[todo.status];
          const urgencyCfg = URGENCY_CONFIG[todo.urgency];
          const StatusIcon = statusCfg.icon;
          const isEditing = editingId === todo.id;
          const isDone = todo.status === 'done';

          return (
            <div
              key={todo.id}
              className="flex items-start gap-3 py-3 px-1 group"
            >
              <button
                type="button"
                onClick={() => handleStatusCycle(todo)}
                className={`shrink-0 mt-0.5 transition-colors ${
                  isDone
                    ? 'text-green-600'
                    : todo.status === 'in_progress'
                      ? 'text-blue-500 hover:text-blue-600'
                      : 'text-ink-muted hover:text-ink-secondary'
                }`}
                title={t(statusCfg.key)}
              >
                <StatusIcon className="h-4.5 w-4.5" />
              </button>

              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleSaveTitle(todo.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle(todo.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full bg-transparent text-sm text-ink outline-none border-b border-brand pb-0.5"
                    autoFocus
                  />
                ) : (
                  <span
                    className={`text-sm cursor-pointer leading-snug ${isDone ? 'line-through text-ink-muted' : 'text-ink'}`}
                    onClick={() => {
                      setEditingId(todo.id);
                      setEditTitle(todo.title);
                    }}
                  >
                    {todo.title}
                  </span>
                )}
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-ink-muted">
                  <Badge variant={urgencyCfg.variant} className="text-[10px] px-1.5 py-0">
                    {t(urgencyCfg.key)}
                  </Badge>
                  {todo.source === 'brief' && (
                    <Badge variant="brand" className="text-[10px] px-1.5 py-0">
                      {t('intelligence.sourceBrief')}
                    </Badge>
                  )}
                  <span className="text-ink-muted">·</span>
                  <span>
                    {formatDate(todo.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(todo.id)}
                className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-ink-muted hover:text-danger"
                title={t('common.delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="section-stack">
      {/* Add todo */}
      <section className="section-block">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder={t('intelligence.todoTitle')}
                className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <select
                value={newUrgency}
                onChange={(e) => setNewUrgency(e.target.value as TodoUrgency)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="high">{t('intelligence.urgencyHigh')}</option>
                <option value="medium">{t('intelligence.urgencyMedium')}</option>
                <option value="low">{t('intelligence.urgencyLow')}</option>
              </select>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newTitle.trim() || isPending}
              >
                <Plus className="h-4 w-4" />
                {t('intelligence.addTodo')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Todo list */}
      <section className="section-block">
        <Tabs defaultValue="open">
          <div className="section-head flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="open">
                {t('intelligence.openItems')}
                {openTodos.length > 0 && (
                  <span className="ml-1.5 text-xs text-ink-muted">{openTodos.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="done">
                {t('intelligence.doneItems')}
                {doneTodos.length > 0 && (
                  <span className="ml-1.5 text-xs text-ink-muted">{doneTodos.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                {t('intelligence.allItems')}
                {todos.length > 0 && (
                  <span className="ml-1.5 text-xs text-ink-muted">{todos.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          <Card>
            <CardContent className="p-4 sm:p-5">
              <TabsContent value="open" className="mt-0">
                {renderList(openTodos)}
              </TabsContent>
              <TabsContent value="done" className="mt-0">
                {renderList(doneTodos)}
              </TabsContent>
              <TabsContent value="all" className="mt-0">
                {renderList(todos)}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </section>
    </div>
  );
}
