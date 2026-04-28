'use client';

import { useState, useTransition, useCallback, useMemo } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SummaryGrid, SummaryCard } from '@/components/ui/summary-card';
import { createTodo, updateTodoStatus, updateTodoTitle, deleteTodo, getTodos } from '@/actions/intelligence';
import type { Todo, TodoStatus, TodoUrgency } from '@/types';
import {
  Plus,
  Circle,
  Clock,
  CheckCircle2,
  Trash2,
  Search,
  Sparkles,
  ListTodo,
  Flame,
  Pencil,
  X,
} from 'lucide-react';

interface TodoPageClientProps {
  initialTodos: Todo[];
}

const STATUS_CYCLE: Record<TodoStatus, TodoStatus> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
};

type SourceFilter = 'all' | 'brief' | 'manual';

export default function TodoPageClient({ initialTodos }: TodoPageClientProps) {
  const { t, formatDate } = useLocale();
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [newTitle, setNewTitle] = useState('');
  const [newUrgency, setNewUrgency] = useState<TodoUrgency>('medium');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<TodoUrgency | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
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

  // ── Derived data ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let open = 0, inProgress = 0, done = 0, high = 0;
    for (const todo of todos) {
      if (todo.status === 'open') open++;
      else if (todo.status === 'in_progress') inProgress++;
      else if (todo.status === 'done') done++;
      if (todo.urgency === 'high' && todo.status !== 'done') high++;
    }
    return { open, inProgress, done, high, total: todos.length };
  }, [todos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todos.filter((todo) => {
      if (urgencyFilter !== 'all' && todo.urgency !== urgencyFilter) return false;
      if (sourceFilter !== 'all' && todo.source !== sourceFilter) return false;
      if (q && !todo.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [todos, search, urgencyFilter, sourceFilter]);

  const openTodos = filtered.filter((it) => it.status !== 'done');
  const doneTodos = filtered.filter((it) => it.status === 'done');

  const hasActiveFilters = search.trim().length > 0 || urgencyFilter !== 'all' || sourceFilter !== 'all';

  // ── Renderers ──────────────────────────────────────────────────────────
  const renderTodoRow = (todo: Todo) => {
    const isEditing = editingId === todo.id;
    const isDone = todo.status === 'done';

    return (
      <div
        key={todo.id}
        className="group flex items-start gap-3 px-3 py-3 -mx-3 rounded-lg hover:bg-surface-secondary/50 transition-colors"
      >
        {/* Status checkbox */}
        <button
          type="button"
          onClick={() => handleStatusCycle(todo)}
          className={`shrink-0 mt-0.5 h-5 w-5 inline-flex items-center justify-center transition-colors ${
            isDone
              ? 'text-emerald-600 dark:text-emerald-400'
              : todo.status === 'in_progress'
                ? 'text-blue-500 hover:text-blue-600'
                : 'text-ink-muted hover:text-ink-secondary'
          }`}
          title={t(`intelligence.status${capitalize(todo.status === 'in_progress' ? 'InProgress' : todo.status)}`)}
        >
          <StatusIcon status={todo.status} />
        </button>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => handleSaveTitle(todo.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle(todo.id);
                if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditTitle('');
                }
              }}
              className="w-full bg-transparent text-sm text-ink outline-none border-b border-brand pb-0.5"
              autoFocus
            />
          ) : (
            <div
              className={`text-sm leading-snug cursor-text ${
                isDone ? 'line-through text-ink-muted' : 'text-ink'
              }`}
              onClick={() => {
                setEditingId(todo.id);
                setEditTitle(todo.title);
              }}
            >
              {todo.title}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-ink-muted">
            <UrgencyChip urgency={todo.urgency} />
            {todo.source === 'brief' && (
              <Badge variant="brand" className="text-[10px] px-1.5 py-0 gap-1 inline-flex items-center">
                <Sparkles className="h-2.5 w-2.5" />
                {t('intelligence.sourceBrief')}
              </Badge>
            )}
            <span className="text-ink-muted/60">·</span>
            <span>
              {formatDate(todo.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Hover actions */}
        <div className="shrink-0 mt-0.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setEditingId(todo.id);
                setEditTitle(todo.title);
              }}
              className="p-1 text-ink-muted hover:text-ink rounded transition-colors"
              title={t('common.edit') || 'Edit'}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDelete(todo.id)}
            className="p-1 text-ink-muted hover:text-red-500 rounded transition-colors"
            title={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderGroupedList = (items: Todo[], emptyKey: string) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-10 w-10 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
            <ListTodo className="h-5 w-5 text-ink-muted" />
          </div>
          <p className="text-sm text-ink-secondary">{t(emptyKey)}</p>
        </div>
      );
    }

    // Group by urgency only when no filter is active and there are multiple urgency levels
    if (urgencyFilter === 'all') {
      const high = items.filter((it) => it.urgency === 'high');
      const medium = items.filter((it) => it.urgency === 'medium');
      const low = items.filter((it) => it.urgency === 'low');

      return (
        <div className={`${isPending ? 'opacity-60 pointer-events-none' : ''} transition-opacity`}>
          {high.length > 0 && (
            <UrgencyGroup label={t('intelligence.todo.groupHigh')} count={high.length} accent="red">
              {high.map(renderTodoRow)}
            </UrgencyGroup>
          )}
          {medium.length > 0 && (
            <UrgencyGroup label={t('intelligence.todo.groupMedium')} count={medium.length} accent="amber">
              {medium.map(renderTodoRow)}
            </UrgencyGroup>
          )}
          {low.length > 0 && (
            <UrgencyGroup label={t('intelligence.todo.groupLow')} count={low.length} accent="emerald">
              {low.map(renderTodoRow)}
            </UrgencyGroup>
          )}
        </div>
      );
    }

    return (
      <div className={`${isPending ? 'opacity-60 pointer-events-none' : ''} transition-opacity`}>
        {items.map(renderTodoRow)}
      </div>
    );
  };

  // ── JSX ────────────────────────────────────────────────────────────────
  return (
    <div className="section-stack">
      {/* Stat row */}
      <section className="section-block">
        <SummaryGrid>
          <SummaryCard
            label={t('intelligence.todoStats.total')}
            value={
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">{stats.total}</span>
              </div>
            }
          />
          <SummaryCard
            label={t('intelligence.todoStats.open')}
            value={
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums text-ink">{stats.open}</span>
                {stats.inProgress > 0 && (
                  <span className="text-xs text-ink-muted">
                    +{stats.inProgress} {t('intelligence.todoStats.inProgress').toLowerCase()}
                  </span>
                )}
              </div>
            }
          />
          <SummaryCard
            label={t('intelligence.stat.high')}
            value={
              <div className="flex items-center gap-2">
                <Flame className={`h-5 w-5 ${stats.high > 0 ? 'text-red-500' : 'text-ink-muted/50'}`} />
                <span className={`text-2xl font-semibold tabular-nums ${stats.high > 0 ? 'text-red-600 dark:text-red-400' : 'text-ink-muted'}`}>
                  {stats.high}
                </span>
              </div>
            }
          />
          <SummaryCard
            label={t('intelligence.todoStats.done')}
            value={
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {stats.done}
                </span>
              </div>
            }
          />
        </SummaryGrid>
      </section>

      {/* Composer */}
      <section className="section-block">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-ink-muted shrink-0 ml-1" />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder={t('intelligence.todo.addPlaceholder')}
                className="flex-1 h-9 bg-transparent px-1 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none"
              />
              <UrgencySelect value={newUrgency} onChange={setNewUrgency} />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newTitle.trim() || isPending}
              >
                {t('intelligence.addTodo')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Filter bar + List */}
      <section className="section-block">
        <Tabs defaultValue="open">
          <div className="section-head flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList>
              <TabsTrigger value="open">
                {t('intelligence.openItems')}
                {openTodos.length > 0 && <CountBadge n={openTodos.length} />}
              </TabsTrigger>
              <TabsTrigger value="done">
                {t('intelligence.doneItems')}
                {doneTodos.length > 0 && <CountBadge n={doneTodos.length} />}
              </TabsTrigger>
              <TabsTrigger value="all">
                {t('intelligence.allItems')}
                {filtered.length > 0 && <CountBadge n={filtered.length} />}
              </TabsTrigger>
            </TabsList>

            {/* Search + filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('intelligence.todo.searchPlaceholder')}
                  className="h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-transparent text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-44"
                />
              </div>

              <UrgencyFilterChips value={urgencyFilter} onChange={setUrgencyFilter} />
              <SourceFilterChips value={sourceFilter} onChange={setSourceFilter} />

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setUrgencyFilter('all'); setSourceFilter('all'); }}
                  className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-secondary px-1.5"
                >
                  <X className="h-3 w-3" />
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="p-4 sm:p-5">
              <TabsContent value="open" className="mt-0">
                {renderGroupedList(openTodos, 'intelligence.todo.emptyOpen')}
              </TabsContent>
              <TabsContent value="done" className="mt-0">
                {renderGroupedList(doneTodos, 'intelligence.todo.emptyDone')}
              </TabsContent>
              <TabsContent value="all" className="mt-0">
                {renderGroupedList(filtered, 'intelligence.todo.empty')}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </section>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StatusIcon({ status }: { status: TodoStatus }) {
  if (status === 'done') return <CheckCircle2 className="h-5 w-5" />;
  if (status === 'in_progress') return <Clock className="h-5 w-5" />;
  return <Circle className="h-5 w-5" />;
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-surface-secondary text-[10px] tabular-nums text-ink-muted">
      {n}
    </span>
  );
}

function UrgencyGroup({
  label,
  count,
  accent,
  children,
}: {
  label: string;
  count: number;
  accent: 'red' | 'amber' | 'emerald';
  children: React.ReactNode;
}) {
  const accentDot = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
  }[accent];

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${accentDot}`} />
        <span className="text-[11px] uppercase tracking-wide font-semibold text-ink-muted">{label}</span>
        <span className="text-xs text-ink-muted/70 tabular-nums">{count}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function UrgencyChip({ urgency }: { urgency: TodoUrgency }) {
  const { t } = useLocale();
  const map: Record<TodoUrgency, { variant: 'danger' | 'warning' | 'success'; key: string; dot: string }> = {
    high: { variant: 'danger', key: 'intelligence.urgencyHigh', dot: 'bg-red-500' },
    medium: { variant: 'warning', key: 'intelligence.urgencyMedium', dot: 'bg-amber-500' },
    low: { variant: 'success', key: 'intelligence.urgencyLow', dot: 'bg-emerald-500' },
  };
  const { variant, key, dot } = map[urgency];
  return (
    <Badge variant={variant} className="text-[10px] px-1.5 py-0 gap-1 inline-flex items-center">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {t(key)}
    </Badge>
  );
}

function UrgencySelect({ value, onChange }: { value: TodoUrgency; onChange: (v: TodoUrgency) => void }) {
  const { t } = useLocale();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TodoUrgency)}
      className="h-9 rounded-md border border-input bg-transparent px-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="high">{t('intelligence.urgencyHigh')}</option>
      <option value="medium">{t('intelligence.urgencyMedium')}</option>
      <option value="low">{t('intelligence.urgencyLow')}</option>
    </select>
  );
}

function UrgencyFilterChips({
  value,
  onChange,
}: {
  value: TodoUrgency | 'all';
  onChange: (v: TodoUrgency | 'all') => void;
}) {
  const { t } = useLocale();
  const options: Array<{ key: TodoUrgency | 'all'; label: string; dot?: string }> = [
    { key: 'all', label: t('intelligence.filter.allUrgencies') },
    { key: 'high', label: t('intelligence.urgencyHigh'), dot: 'bg-red-500' },
    { key: 'medium', label: t('intelligence.urgencyMedium'), dot: 'bg-amber-500' },
    { key: 'low', label: t('intelligence.urgencyLow'), dot: 'bg-emerald-500' },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`inline-flex items-center gap-1 px-2 h-6 text-[11px] rounded transition-colors ${
            value === opt.key
              ? 'bg-surface-secondary text-ink font-medium'
              : 'text-ink-muted hover:text-ink-secondary'
          }`}
        >
          {opt.dot && <span className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SourceFilterChips({
  value,
  onChange,
}: {
  value: SourceFilter;
  onChange: (v: SourceFilter) => void;
}) {
  const { t } = useLocale();
  const options: Array<{ key: SourceFilter; label: string }> = [
    { key: 'all', label: t('intelligence.todoFilter.all') },
    { key: 'brief', label: t('intelligence.todoFilter.brief') },
    { key: 'manual', label: t('intelligence.todoFilter.manual') },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`px-2 h-6 text-[11px] rounded transition-colors ${
            value === opt.key
              ? 'bg-surface-secondary text-ink font-medium'
              : 'text-ink-muted hover:text-ink-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
