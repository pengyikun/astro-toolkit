import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Knex } from 'knex';
import { setupTestDb, teardownTestDb } from '../helpers/setup';
import * as BriefModel from '../../models/brief.model';
import type { AccessScope } from '../../types';

let db: Knex;

const operatorScope: AccessScope = { userId: 1, role: 'operator' };
const adminScope: AccessScope = { userId: 0, role: 'admin' };
const otherScope: AccessScope = { userId: 2, role: 'operator' };

const baseBrief = {
  connectors: '["email"]',
  date_from: '2025-01-01',
  date_to: '2025-01-31',
};

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(() => teardownTestDb());

beforeEach(async () => {
  await db('briefs').del();
  await db('auth_users').del();
  const now = new Date().toISOString();
  await db('auth_users').insert([
    { id: 1, email: 'operator@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
    { id: 2, email: 'other@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
  ]);
});

describe('BriefModel', () => {
  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a brief with pending status', async () => {
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      expect(brief.status).toBe('pending');
    });

    it('sets timestamps', async () => {
      const before = new Date().toISOString();
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      expect(brief.created_at).toBeDefined();
      expect(brief.updated_at).toBeDefined();
      expect(brief.created_at >= before).toBe(true);
    });

    it('returns the created brief with an id', async () => {
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      expect(brief.id).toBeGreaterThan(0);
      expect(brief.connectors).toBe('["email"]');
      expect(brief.date_from).toBe('2025-01-01');
      expect(brief.date_to).toBe('2025-01-31');
    });

    it('defaults owner_user_id to null when not provided', async () => {
      const brief = await BriefModel.create(db, baseBrief);
      expect(brief.owner_user_id).toBeNull();
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns brief by id', async () => {
      const created = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const found = await BriefModel.findById(db, created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('returns null for non-existent id', async () => {
      const found = await BriefModel.findById(db, 99999);
      expect(found).toBeNull();
    });

    it('returns null when scope does not match owner', async () => {
      const created = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const found = await BriefModel.findById(db, created.id, otherScope);
      expect(found).toBeNull();
    });

    it('returns brief for admin scope regardless of owner', async () => {
      const created = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const found = await BriefModel.findById(db, created.id, adminScope);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });
  });

  // ── listByOwner ─────────────────────────────────────────────────────────────

  describe('listByOwner', () => {
    it('returns all briefs ordered by created_at desc', async () => {
      const a = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await db('briefs').where('id', a.id).update({ created_at: '2025-01-01T00:00:00.000Z' });
      const b = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const list = await BriefModel.listByOwner(db);
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe(b.id);
      expect(list[1].id).toBe(a.id);
    });

    it('respects limit parameter', async () => {
      await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const list = await BriefModel.listByOwner(db, null, 2);
      expect(list).toHaveLength(2);
    });

    it('filters by scope owner', async () => {
      await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await BriefModel.create(db, { ...baseBrief, owner_user_id: 2 });
      const list = await BriefModel.listByOwner(db, operatorScope);
      expect(list).toHaveLength(1);
      expect(list[0].owner_user_id).toBe(1);
    });
  });

  // ── findLatestCompleted ─────────────────────────────────────────────────────

  describe('findLatestCompleted', () => {
    it('returns the latest completed brief', async () => {
      const a = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      // Ensure distinct created_at so ordering is deterministic
      await db('briefs').where('id', a.id).update({ created_at: '2025-01-01T00:00:00.000Z' });
      const b = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await BriefModel.updateStatus(db, a.id, { status: 'completed', summary: 'first' });
      await BriefModel.updateStatus(db, b.id, { status: 'completed', summary: 'second' });
      const latest = await BriefModel.findLatestCompleted(db);
      expect(latest).not.toBeNull();
      expect(latest!.id).toBe(b.id);
      expect(latest!.summary).toBe('second');
    });

    it('returns null when no completed briefs exist', async () => {
      await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const latest = await BriefModel.findLatestCompleted(db);
      expect(latest).toBeNull();
    });

    it('ignores non-completed statuses', async () => {
      const a = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const b = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await BriefModel.updateStatus(db, a.id, { status: 'running' });
      await BriefModel.updateStatus(db, b.id, { status: 'failed', error: 'oops' });
      const latest = await BriefModel.findLatestCompleted(db);
      expect(latest).toBeNull();
    });
  });

  // ── updateStatus ────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('updates status to running', async () => {
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await BriefModel.updateStatus(db, brief.id, { status: 'running' });
      const updated = await BriefModel.findById(db, brief.id);
      expect(updated!.status).toBe('running');
    });

    it('updates status to completed with summary and pending_items', async () => {
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await BriefModel.updateStatus(db, brief.id, {
        status: 'completed',
        summary: 'All done',
        pending_items: 'None',
      });
      const updated = await BriefModel.findById(db, brief.id);
      expect(updated!.status).toBe('completed');
      expect(updated!.summary).toBe('All done');
      expect(updated!.pending_items).toBe('None');
    });

    it('updates status to failed with error', async () => {
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await BriefModel.updateStatus(db, brief.id, { status: 'failed', error: 'timeout' });
      const updated = await BriefModel.findById(db, brief.id);
      expect(updated!.status).toBe('failed');
      expect(updated!.error).toBe('timeout');
    });

    it('updates updated_at timestamp', async () => {
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const originalUpdatedAt = brief.updated_at;
      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10));
      await BriefModel.updateStatus(db, brief.id, { status: 'running' });
      const updated = await BriefModel.findById(db, brief.id);
      expect(updated!.updated_at).not.toBe(originalUpdatedAt);
    });

    it('respects scope when provided (does not update if scope does not match)', async () => {
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      await BriefModel.updateStatus(db, brief.id, { status: 'running' }, otherScope);
      const unchanged = await BriefModel.findById(db, brief.id);
      expect(unchanged!.status).toBe('pending');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes brief by id', async () => {
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const deleted = await BriefModel.remove(db, brief.id);
      expect(deleted).toBe(1);
      const found = await BriefModel.findById(db, brief.id);
      expect(found).toBeNull();
    });

    it('returns 0 for non-existent id', async () => {
      const deleted = await BriefModel.remove(db, 99999);
      expect(deleted).toBe(0);
    });

    it('respects scope (does not delete if scope does not match)', async () => {
      const brief = await BriefModel.create(db, { ...baseBrief, owner_user_id: 1 });
      const deleted = await BriefModel.remove(db, brief.id, otherScope);
      expect(deleted).toBe(0);
      const found = await BriefModel.findById(db, brief.id);
      expect(found).not.toBeNull();
    });
  });
});
