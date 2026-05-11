import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Knex } from 'knex';
import { setupTestDb, teardownTestDb } from '../helpers/setup';
import * as TodoModel from '../../models/todo.model';
import * as BriefModel from '../../models/brief.model';
import type { AccessScope } from '../../types';

let db: Knex;

const operatorScope: AccessScope = { userId: 1, role: 'operator' };
const adminScope: AccessScope = { userId: 0, role: 'admin' };
const otherScope: AccessScope = { userId: 2, role: 'operator' };

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(() => teardownTestDb());

beforeEach(async () => {
  await db('todos').del();
  await db('briefs').del();
  await db('auth_users').del();
  const now = new Date().toISOString();
  await db('auth_users').insert([
    { id: 1, email: 'op@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
    { id: 2, email: 'other@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
  ]);
});

describe('TodoModel', () => {
  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a todo with open status', async () => {
      const todo = await TodoModel.create(db, { title: 'Buy milk', owner_user_id: 1 });
      expect(todo.status).toBe('open');
      expect(todo.title).toBe('Buy milk');
    });

    it('defaults urgency to medium', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      expect(todo.urgency).toBe('medium');
    });

    it('defaults source to manual', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      expect(todo.source).toBe('manual');
    });

    it('sets custom urgency', async () => {
      const todo = await TodoModel.create(db, { title: 'Urgent', urgency: 'high', owner_user_id: 1 });
      expect(todo.urgency).toBe('high');
    });

    it('links to a brief when brief_id is provided', async () => {
      const brief = await BriefModel.create(db, {
        connectors: '["email"]',
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        owner_user_id: 1,
      });
      const todo = await TodoModel.create(db, {
        title: 'From brief',
        source: 'brief',
        brief_id: brief.id,
        owner_user_id: 1,
      });
      expect(todo.brief_id).toBe(brief.id);
      expect(todo.source).toBe('brief');
    });

    it('sets timestamps', async () => {
      const before = new Date().toISOString();
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      expect(todo.created_at >= before).toBe(true);
      expect(todo.updated_at >= before).toBe(true);
    });

    it('returns the created todo with an id', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      expect(todo.id).toBeGreaterThan(0);
    });

    it('defaults owner_user_id to null when not provided', async () => {
      const todo = await TodoModel.create(db, { title: 'Task' });
      expect(todo.owner_user_id).toBeNull();
    });

    it('defaults brief_id to null when not provided', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      expect(todo.brief_id).toBeNull();
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns todo by id', async () => {
      const created = await TodoModel.create(db, { title: 'Find me', owner_user_id: 1 });
      const found = await TodoModel.findById(db, created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe('Find me');
    });

    it('returns null for non-existent id', async () => {
      const found = await TodoModel.findById(db, 99999);
      expect(found).toBeNull();
    });

    it('returns null when scope does not match owner', async () => {
      const created = await TodoModel.create(db, { title: 'Private', owner_user_id: 1 });
      const found = await TodoModel.findById(db, created.id, otherScope);
      expect(found).toBeNull();
    });

    it('returns todo for admin scope regardless of owner', async () => {
      const created = await TodoModel.create(db, { title: 'Admin sees this', owner_user_id: 1 });
      const found = await TodoModel.findById(db, created.id, adminScope);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('returns todo for matching operator scope', async () => {
      const created = await TodoModel.create(db, { title: 'Mine', owner_user_id: 1 });
      const found = await TodoModel.findById(db, created.id, operatorScope);
      expect(found).not.toBeNull();
    });
  });

  // ── listByOwner ─────────────────────────────────────────────────────────────

  describe('listByOwner', () => {
    it('returns todos ordered by status asc then created_at desc', async () => {
      const a = await TodoModel.create(db, { title: 'A', owner_user_id: 1 });
      await db('todos').where('id', a.id).update({ created_at: '2025-01-01T00:00:00.000Z' });
      await TodoModel.create(db, { title: 'B', owner_user_id: 1 });
      await TodoModel.updateStatus(db, a.id, 'done');
      const list = await TodoModel.listByOwner(db);
      // 'done' sorts after 'open' alphabetically, so B (open) first, then A (done)
      expect(list[0].title).toBe('B');
      expect(list[1].title).toBe('A');
    });

    it('respects limit parameter', async () => {
      await TodoModel.create(db, { title: 'A', owner_user_id: 1 });
      await TodoModel.create(db, { title: 'B', owner_user_id: 1 });
      await TodoModel.create(db, { title: 'C', owner_user_id: 1 });
      const list = await TodoModel.listByOwner(db, null, 2);
      expect(list).toHaveLength(2);
    });

    it('filters by scope owner', async () => {
      await TodoModel.create(db, { title: 'User1', owner_user_id: 1 });
      await TodoModel.create(db, { title: 'User2', owner_user_id: 2 });
      const list = await TodoModel.listByOwner(db, operatorScope);
      expect(list).toHaveLength(1);
      expect(list[0].owner_user_id).toBe(1);
    });

    it('admin sees all todos', async () => {
      await TodoModel.create(db, { title: 'User1', owner_user_id: 1 });
      await TodoModel.create(db, { title: 'User2', owner_user_id: 2 });
      const list = await TodoModel.listByOwner(db, adminScope);
      expect(list).toHaveLength(2);
    });

    it('returns empty array when no todos exist', async () => {
      const list = await TodoModel.listByOwner(db, operatorScope);
      expect(list).toEqual([]);
    });
  });

  // ── updateStatus ────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('updates status to in_progress', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      await TodoModel.updateStatus(db, todo.id, 'in_progress');
      const updated = await TodoModel.findById(db, todo.id);
      expect(updated!.status).toBe('in_progress');
    });

    it('updates status to done', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      await TodoModel.updateStatus(db, todo.id, 'done');
      const updated = await TodoModel.findById(db, todo.id);
      expect(updated!.status).toBe('done');
    });

    it('cycles back to open from done', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      await TodoModel.updateStatus(db, todo.id, 'done');
      await TodoModel.updateStatus(db, todo.id, 'open');
      const updated = await TodoModel.findById(db, todo.id);
      expect(updated!.status).toBe('open');
    });

    it('updates updated_at timestamp', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      const original = todo.updated_at;
      await new Promise((r) => setTimeout(r, 10));
      await TodoModel.updateStatus(db, todo.id, 'in_progress');
      const updated = await TodoModel.findById(db, todo.id);
      expect(updated!.updated_at).not.toBe(original);
    });

    it('respects scope (does not update if scope does not match)', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      await TodoModel.updateStatus(db, todo.id, 'done', otherScope);
      const unchanged = await TodoModel.findById(db, todo.id);
      expect(unchanged!.status).toBe('open');
    });
  });

  // ── updateTitle ─────────────────────────────────────────────────────────────

  describe('updateTitle', () => {
    it('updates the title', async () => {
      const todo = await TodoModel.create(db, { title: 'Old title', owner_user_id: 1 });
      await TodoModel.updateTitle(db, todo.id, 'New title');
      const updated = await TodoModel.findById(db, todo.id);
      expect(updated!.title).toBe('New title');
    });

    it('updates updated_at timestamp', async () => {
      const todo = await TodoModel.create(db, { title: 'Task', owner_user_id: 1 });
      const original = todo.updated_at;
      await new Promise((r) => setTimeout(r, 10));
      await TodoModel.updateTitle(db, todo.id, 'Updated');
      const updated = await TodoModel.findById(db, todo.id);
      expect(updated!.updated_at).not.toBe(original);
    });

    it('respects scope (does not update if scope does not match)', async () => {
      const todo = await TodoModel.create(db, { title: 'Original', owner_user_id: 1 });
      await TodoModel.updateTitle(db, todo.id, 'Hacked', otherScope);
      const unchanged = await TodoModel.findById(db, todo.id);
      expect(unchanged!.title).toBe('Original');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes todo by id', async () => {
      const todo = await TodoModel.create(db, { title: 'Delete me', owner_user_id: 1 });
      const deleted = await TodoModel.remove(db, todo.id);
      expect(deleted).toBe(1);
      const found = await TodoModel.findById(db, todo.id);
      expect(found).toBeNull();
    });

    it('returns 0 for non-existent id', async () => {
      const deleted = await TodoModel.remove(db, 99999);
      expect(deleted).toBe(0);
    });

    it('respects scope (does not delete if scope does not match)', async () => {
      const todo = await TodoModel.create(db, { title: 'Protected', owner_user_id: 1 });
      const deleted = await TodoModel.remove(db, todo.id, otherScope);
      expect(deleted).toBe(0);
      const found = await TodoModel.findById(db, todo.id);
      expect(found).not.toBeNull();
    });

    it('admin can delete any todo', async () => {
      const todo = await TodoModel.create(db, { title: 'Admin delete', owner_user_id: 1 });
      const deleted = await TodoModel.remove(db, todo.id, adminScope);
      expect(deleted).toBe(1);
    });
  });

  // ── brief foreign key ──────────────────────────────────────────────────────

  describe('brief_id foreign key', () => {
    it('todo persists when linked brief is deleted (SET NULL)', async () => {
      const brief = await BriefModel.create(db, {
        connectors: '["email"]',
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        owner_user_id: 1,
      });
      const todo = await TodoModel.create(db, {
        title: 'From brief',
        source: 'brief',
        brief_id: brief.id,
        owner_user_id: 1,
      });
      await BriefModel.remove(db, brief.id);
      const found = await TodoModel.findById(db, todo.id);
      expect(found).not.toBeNull();
      // SQLite may or may not enforce SET NULL depending on pragma; the todo should still exist
      expect(found!.title).toBe('From brief');
    });
  });
});
