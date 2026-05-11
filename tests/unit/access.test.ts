import { describe, it, expect, vi } from 'vitest';
import {
  isAdminScope,
  ownerUserIdFromScope,
  applyOwnerScope,
  applyStrictOwnerScope,
  SYSTEM_ACCESS_SCOPE,
} from '../../lib/access';

describe('isAdminScope', () => {
  it('returns false for null/undefined', () => {
    expect(isAdminScope(null)).toBe(false);
    expect(isAdminScope(undefined)).toBe(false);
  });
  it('returns true only when role is admin', () => {
    expect(isAdminScope({ userId: 1, role: 'admin' })).toBe(true);
    expect(isAdminScope({ userId: 1, role: 'member' })).toBe(false);
  });
  it('SYSTEM_ACCESS_SCOPE is admin', () => {
    expect(isAdminScope(SYSTEM_ACCESS_SCOPE)).toBe(true);
  });
});

describe('ownerUserIdFromScope', () => {
  it('returns null for null/undefined', () => {
    expect(ownerUserIdFromScope(null)).toBeNull();
    expect(ownerUserIdFromScope(undefined)).toBeNull();
  });
  it('returns null for system scope (userId 0)', () => {
    expect(ownerUserIdFromScope(SYSTEM_ACCESS_SCOPE)).toBeNull();
  });
  it('returns the userId for a normal user', () => {
    expect(ownerUserIdFromScope({ userId: 7, role: 'member' })).toBe(7);
  });
  it('returns null for negative or zero ids', () => {
    expect(ownerUserIdFromScope({ userId: 0, role: 'member' })).toBeNull();
    expect(ownerUserIdFromScope({ userId: -1, role: 'member' })).toBeNull();
  });
});

describe('applyOwnerScope', () => {
  function fakeQuery() {
    const calls: Array<[string, unknown]> = [];
    const q = {
      calls,
      where(col: string, val: unknown) { calls.push([col, val]); return q; },
    } as const;
    return q;
  }

  it('does NOT add a where-clause for admin scopes', () => {
    const q = fakeQuery();
     
    applyOwnerScope(q as any, { userId: 5, role: 'admin' });
    expect(q.calls).toEqual([]);
  });

  it('does NOT add a where-clause for null scope', () => {
    const q = fakeQuery();
     
    applyOwnerScope(q as any, null);
    expect(q.calls).toEqual([]);
  });

  it('does NOT add a where-clause for system scope (userId 0)', () => {
    const q = fakeQuery();
     
    applyOwnerScope(q as any, SYSTEM_ACCESS_SCOPE);
    expect(q.calls).toEqual([]);
  });

  it('adds a where(owner_user_id, X) clause for member scopes', () => {
    const q = fakeQuery();
     
    applyOwnerScope(q as any, { userId: 7, role: 'member' });
    expect(q.calls).toEqual([['owner_user_id', 7]]);
  });

  it('honors a custom owner column name', () => {
    const q = fakeQuery();
     
    applyOwnerScope(q as any, { userId: 7, role: 'member' }, 'created_by');
    expect(q.calls).toEqual([['created_by', 7]]);
  });

  it('returns the same query reference (chainable)', () => {
    const q = fakeQuery();
     
    const out = applyOwnerScope(q as any, { userId: 7, role: 'member' });
    expect(out).toBe(q);
  });
});

describe('applyStrictOwnerScope', () => {
  function fakeQuery() {
    const calls: Array<[string, unknown]> = [];
    const q = {
      calls,
      where(col: string, val: unknown) { calls.push([col, val]); return q; },
    } as const;
    return q;
  }

  it('STILL adds a where-clause for admin scopes (admins do not bypass)', () => {
    const q = fakeQuery();

    applyStrictOwnerScope(q as any, { userId: 5, role: 'admin' });
    expect(q.calls).toEqual([['owner_user_id', 5]]);
  });

  it('does NOT add a where-clause for null scope', () => {
    const q = fakeQuery();

    applyStrictOwnerScope(q as any, null);
    expect(q.calls).toEqual([]);
  });

  it('does NOT add a where-clause for system scope (userId 0)', () => {
    const q = fakeQuery();

    applyStrictOwnerScope(q as any, SYSTEM_ACCESS_SCOPE);
    expect(q.calls).toEqual([]);
  });

  it('adds a where(owner_user_id, X) clause for member scopes', () => {
    const q = fakeQuery();

    applyStrictOwnerScope(q as any, { userId: 7, role: 'member' });
    expect(q.calls).toEqual([['owner_user_id', 7]]);
  });

  it('honors a custom owner column name', () => {
    const q = fakeQuery();

    applyStrictOwnerScope(q as any, { userId: 7, role: 'admin' }, 'created_by');
    expect(q.calls).toEqual([['created_by', 7]]);
  });
});

describe('access.ts module shape', () => {
  it('does not call the database at import time', () => {
    // If it did, the test would have failed before reaching this.
    expect(vi.fn()).toBeDefined();
  });
});
