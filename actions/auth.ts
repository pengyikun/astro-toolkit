'use server';

import { redirect } from 'next/navigation';
import db from '@/lib/db';
import * as AuthUserModel from '@/models/auth-user.model';
import { loginSchema, registerSchema } from '@/schemas/auth.schema';
import type { UserRole, ValidationError } from '@/types';
import { createUserSession, clearUserSession, getSessionFromCookies } from '@/lib/auth-session';
import { hashPassword, verifyPassword } from '@/lib/auth-password';
import { isAppAuthDisabled, normalizeEmail, sanitizeRedirectPath } from '@/lib/auth';
import { getAccessScope, isAdminScope } from '@/lib/access';

// Pre-computed dummy hash so we always run scrypt regardless of whether the
// user exists. Constant timing avoids leaking which emails are registered.
const DUMMY_PASSWORD_SALT = '0'.repeat(32);
const DUMMY_PASSWORD_HASH = '0'.repeat(128);
const GENERIC_LOGIN_ERROR: ValidationError = {
  field: '',
  message: 'Invalid email or password.',
};

export interface AuthActionState {
  success: boolean;
  errors?: ValidationError[];
  message?: string;
}

function formatIssues(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): ValidationError[] {
  return issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (isAppAuthDisabled(process.env)) {
    redirect('/');
  }

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') || undefined,
  });

  if (!parsed.success) {
    return { success: false, errors: formatIssues(parsed.error.issues) };
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await AuthUserModel.findByEmail(db, email);

  // Always run scrypt with the same shape regardless of user existence so
  // attackers cannot enumerate accounts by response timing or shape.
  const validPassword = await verifyPassword(
    parsed.data.password,
    user?.password_salt ?? DUMMY_PASSWORD_SALT,
    user?.password_hash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !validPassword) {
    return {
      success: false,
      errors: [GENERIC_LOGIN_ERROR],
    };
  }

  await createUserSession(user);
  redirect(sanitizeRedirectPath(parsed.data.next));
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (isAppAuthDisabled(process.env)) {
    redirect('/');
  }

  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    role: formData.get('role') || undefined,
    next: formData.get('next') || undefined,
  });

  if (!parsed.success) {
    return { success: false, errors: formatIssues(parsed.error.issues) };
  }

  const [currentSession, currentScope] = await Promise.all([
    getSessionFromCookies(),
    getAccessScope(),
  ]);

  const email = normalizeEmail(parsed.data.email);

  // Hash outside the transaction (it's expensive); only the
  // bootstrap-decision + insert needs to be transactional.
  const digest = await hashPassword(parsed.data.password);

  let result: { user: Awaited<ReturnType<typeof AuthUserModel.create>>; role: UserRole; bootstrap: boolean };
  try {
    result = await db.transaction(async (trx) => {
      // Re-check inside the transaction to avoid two concurrent first-admin
      // bootstraps both seeing userCount === 0.
      const userCount = await AuthUserModel.count(trx);
      const canRegister = userCount === 0 || isAdminScope(currentScope);
      if (!canRegister) {
        const err = new Error('REGISTRATION_FORBIDDEN');
        err.name = 'REGISTRATION_FORBIDDEN';
        throw err;
      }

      const existingUser = await AuthUserModel.findByEmail(trx, email);
      if (existingUser) {
        const err = new Error('EMAIL_TAKEN');
        err.name = 'EMAIL_TAKEN';
        throw err;
      }

      const bootstrap = userCount === 0;
      const role: UserRole = bootstrap
        ? 'admin'
        : (isAdminScope(currentScope) ? (parsed.data.role ?? 'operator') : 'operator');

      const created = await AuthUserModel.create(trx, {
        email,
        role,
        password_hash: digest.passwordHash,
        password_salt: digest.passwordSalt,
      });
      return { user: created, role, bootstrap };
    });
  } catch (error) {
    const err = error as { name?: string; code?: string; errcode?: number; message?: string };
    if (err.name === 'REGISTRATION_FORBIDDEN') {
      return {
        success: false,
        errors: [{ field: '', message: 'Registration is restricted to admins.' }],
      };
    }
    // Driver-specific UNIQUE detection:
    //   - better-sqlite3 set `err.code = 'SQLITE_CONSTRAINT_UNIQUE'`
    //   - node:sqlite sets `err.code = 'ERR_SQLITE_ERROR'` and exposes the
    //     numeric SQLite extended code on `err.errcode`. 2067 is
    //     SQLITE_CONSTRAINT_UNIQUE.
    // The message regex is a last-resort fallback that works for both.
    if (
      err.name === 'EMAIL_TAKEN' ||
      err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      err.errcode === 2067 ||
      /UNIQUE/i.test(err.message ?? '')
    ) {
      return {
        success: false,
        errors: [{ field: 'email', message: 'An operator with this email already exists.' }],
      };
    }
    throw error;
  }

  if (result.bootstrap || !currentSession) {
    await createUserSession(result.user);
    redirect(sanitizeRedirectPath(parsed.data.next));
  }

  return {
    success: true,
    message: `${result.role === 'admin' ? 'Admin' : 'Operator'} ${result.user.email} created.`,
  };
}

export async function logoutAction(): Promise<void> {
  await clearUserSession();
  redirect('/auth');
}
