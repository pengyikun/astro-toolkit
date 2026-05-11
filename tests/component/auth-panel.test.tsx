// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, screen } from '@testing-library/react';
import AuthPanel from '../../components/auth/AuthPanel';
import { LocaleProvider } from '../../lib/i18n/client';

vi.mock('../../actions/auth', () => ({
  loginAction: vi.fn(),
  registerAction: vi.fn(),
}));

vi.mock('next/image', () => ({
  // Render as a plain img to keep the DOM simple in tests.
  default: (props: Record<string, unknown>) => {
    return <img {...(props as Record<string, string>)} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const dict: Record<string, string> = {
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm password',
  'auth.passwordHint': 'Use a strong password',
  'auth.role': 'Role',
  'auth.roleOperator': 'Operator',
  'auth.roleAdmin': 'Admin',
  'auth.signInAction': 'Sign in',
  'auth.signingIn': 'Signing in...',
  'auth.registerAction': 'Register',
  'auth.creatingOperator': 'Creating...',
  'auth.registerOperatorPrompt': 'Need an account? Register',
  'auth.backToSignIn': 'Back to sign in',
  'auth.firstOperatorTitle': 'First operator',
  'auth.registerTitle': 'Register operator',
  'auth.createOperatorTitle': 'Create operator',
  'auth.returningOperatorTitle': 'Welcome back',
  'auth.returnToWorkspace': 'Return to workspace',
  'auth.adminCreatesUsersHint': 'Admins create operators',
};

function renderPanel(props: Partial<React.ComponentProps<typeof AuthPanel>> = {}) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <AuthPanel
        canRegister
        canAssignRoles={false}
        currentEmail={null}
        currentRole={null}
        hasUsers
        initialMode="login"
        nextPath="/"
        {...props}
      />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('AuthPanel', () => {
  it('renders login form by default with returning operator title', () => {
    renderPanel();
    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('switches from login to register when prompt clicked', () => {
    renderPanel();
    expect(screen.queryByText('Confirm password')).toBeNull();
    act(() => {
      screen.getByText('Need an account? Register').click();
    });
    expect(screen.getByText('Register')).toBeTruthy();
    expect(screen.getByLabelText('Confirm password')).toBeTruthy();
  });

  it('hides register prompt if registration is disabled', () => {
    renderPanel({ canRegister: false });
    expect(screen.queryByText('Need an account? Register')).toBeNull();
  });

  it('switches back to login from register mode', () => {
    renderPanel({ initialMode: 'register' });
    expect(screen.getByText('Register operator')).toBeTruthy();
    act(() => {
      screen.getByText('Back to sign in').click();
    });
    expect(screen.getByText('Welcome back')).toBeTruthy();
  });

  it('renders role select only when canAssignRoles is true', () => {
    const { unmount } = renderPanel({ initialMode: 'register', canAssignRoles: false });
    expect(screen.queryByLabelText('Role')).toBeNull();
    unmount();

    renderPanel({ initialMode: 'register', canAssignRoles: true });
    expect(screen.getAllByText('Role').length).toBeGreaterThan(0);
  });

  it('uses first operator title when there are no users yet', () => {
    renderPanel({ hasUsers: false, initialMode: 'register' });
    expect(screen.getByText('First operator')).toBeTruthy();
  });

  it('uses create operator title when an admin is creating users', () => {
    renderPanel({ initialMode: 'register', currentEmail: 'admin@a.test', currentRole: 'admin' });
    expect(screen.getByText('Create operator')).toBeTruthy();
    expect(screen.getByText('Admins create operators')).toBeTruthy();
  });

  it('shows return to workspace links only when currentEmail is set', () => {
    const { unmount } = renderPanel();
    expect(screen.queryByText('Return to workspace')).toBeNull();
    unmount();

    renderPanel({ currentEmail: 'a@a.test' });
    expect(screen.getAllByText('Return to workspace').length).toBeGreaterThan(0);
  });

  it('disables Sign in button when there are no users yet', () => {
    renderPanel({ hasUsers: false });
    const button = screen.getByText('Sign in') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
