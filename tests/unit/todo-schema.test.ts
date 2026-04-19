import { describe, it, expect } from 'vitest';
import {
  todoCreateSchema,
  todoUpdateStatusSchema,
  todoUpdateTitleSchema,
} from '../../schemas/todo.schema';

describe('todoCreateSchema', () => {
  it('accepts valid input with title only', () => {
    const result = todoCreateSchema.safeParse({ title: 'Buy groceries' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Buy groceries');
      expect(result.data.urgency).toBe('medium');
    }
  });

  it('accepts valid input with title and urgency', () => {
    const result = todoCreateSchema.safeParse({ title: 'Fix bug', urgency: 'high' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.urgency).toBe('high');
    }
  });

  it('accepts all urgency levels', () => {
    for (const urgency of ['high', 'medium', 'low'] as const) {
      const result = todoCreateSchema.safeParse({ title: 'Task', urgency });
      expect(result.success).toBe(true);
    }
  });

  it('rejects empty title', () => {
    const result = todoCreateSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = todoCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 500 characters', () => {
    const result = todoCreateSchema.safeParse({ title: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts title of exactly 500 characters', () => {
    const result = todoCreateSchema.safeParse({ title: 'x'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('rejects invalid urgency value', () => {
    const result = todoCreateSchema.safeParse({ title: 'Task', urgency: 'critical' });
    expect(result.success).toBe(false);
  });

  it('defaults urgency to medium when not provided', () => {
    const result = todoCreateSchema.safeParse({ title: 'Task' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.urgency).toBe('medium');
    }
  });
});

describe('todoUpdateStatusSchema', () => {
  it('accepts valid status update', () => {
    const result = todoUpdateStatusSchema.safeParse({ id: 1, status: 'done' });
    expect(result.success).toBe(true);
  });

  it('coerces string id to number', () => {
    const result = todoUpdateStatusSchema.safeParse({ id: '5', status: 'in_progress' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(5);
    }
  });

  it('accepts all valid statuses', () => {
    for (const status of ['open', 'in_progress', 'done'] as const) {
      const result = todoUpdateStatusSchema.safeParse({ id: 1, status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = todoUpdateStatusSchema.safeParse({ id: 1, status: 'cancelled' });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive id', () => {
    const result = todoUpdateStatusSchema.safeParse({ id: 0, status: 'open' });
    expect(result.success).toBe(false);
  });

  it('rejects negative id', () => {
    const result = todoUpdateStatusSchema.safeParse({ id: -1, status: 'open' });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = todoUpdateStatusSchema.safeParse({ status: 'open' });
    expect(result.success).toBe(false);
  });

  it('rejects missing status', () => {
    const result = todoUpdateStatusSchema.safeParse({ id: 1 });
    expect(result.success).toBe(false);
  });
});

describe('todoUpdateTitleSchema', () => {
  it('accepts valid title update', () => {
    const result = todoUpdateTitleSchema.safeParse({ id: 1, title: 'Updated title' });
    expect(result.success).toBe(true);
  });

  it('coerces string id to number', () => {
    const result = todoUpdateTitleSchema.safeParse({ id: '3', title: 'New' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(3);
    }
  });

  it('rejects empty title', () => {
    const result = todoUpdateTitleSchema.safeParse({ id: 1, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 500 characters', () => {
    const result = todoUpdateTitleSchema.safeParse({ id: 1, title: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive id', () => {
    const result = todoUpdateTitleSchema.safeParse({ id: 0, title: 'Valid' });
    expect(result.success).toBe(false);
  });
});
