import { redirect } from 'next/navigation';
import type { Knex } from 'knex';
import db from '@/lib/db';
import { isAppAuthDisabled } from '@/lib/auth';
import { getSessionFromCookies } from '@/lib/auth-session';
import * as AuthUserModel from '@/models/auth-user.model';
import type { AccessScope } from '@/types';

export const SYSTEM_ACCESS_SCOPE: AccessScope = {
  userId: 0,
  role: 'admin',
};

export function isAdminScope(scope: AccessScope | null | undefined): boolean {
  return !!scope && scope.role === 'admin';
}

export function ownerUserIdFromScope(scope: AccessScope | null | undefined): number | null {
  if (!scope || scope.userId <= 0) {
    return null;
  }

  return scope.userId;
}

export function applyOwnerScope<TQuery extends Knex.QueryBuilder>(
  query: TQuery,
  scope: AccessScope | null | undefined,
  ownerColumn = 'owner_user_id',
): TQuery {
  if (!scope || isAdminScope(scope) || scope.userId <= 0) {
    return query;
  }

  return query.where(ownerColumn, scope.userId) as TQuery;
}

export async function getAccessScope(): Promise<AccessScope | null> {
  if (isAppAuthDisabled(process.env)) {
    return SYSTEM_ACCESS_SCOPE;
  }

  const session = await getSessionFromCookies();
  if (!session) {
    return null;
  }

  const user = await AuthUserModel.findById(db, session.userId);
  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
  };
}

export async function requireAccessScope(): Promise<AccessScope> {
  const scope = await getAccessScope();
  if (!scope) {
    redirect('/auth');
  }

  return scope;
}
