'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, setToken } from '@/lib/api/client';
import { AuthFieldErrors, validateAuthForm } from '@/lib/auth/validation';

type Props = { mode: 'login' | 'signup' };

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const nextFieldErrors = validateAuthForm(mode, { name, email, password });
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;
    setLoading(true);
    try {
      const response =
        mode === 'signup'
          ? await api.signup({ name: name.trim(), email: email.trim(), password })
          : await api.login({ email: email.trim(), password });
      setToken(response.accessToken);
      router.push('/dashboard');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function clearFieldError(field: keyof AuthFieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  return (
    <main className="auth-page">
      <form className="panel auth-card" onSubmit={submit} noValidate>
        <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p>Sign in to book appointments with the assistant and review confirmed times.</p>
        {error ? <div className="error">{error}</div> : null}
        {mode === 'signup' ? (
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearFieldError('name');
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            />
            {fieldErrors.name ? <small id="name-error" className="field-error">{fieldErrors.name}</small> : null}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError('email');
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
          {fieldErrors.email ? <small id="email-error" className="field-error">{fieldErrors.email}</small> : null}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError('password');
            }}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          />
          {fieldErrors.password ? <small id="password-error" className="field-error">{fieldErrors.password}</small> : null}
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Working...' : mode === 'signup' ? 'Sign up' : 'Log in'}</button>
        <p className="auth-switch">
          {mode === 'signup' ? 'Already have an account? ' : 'Need an account? '}
          <Link href={mode === 'signup' ? '/login' : '/signup'}>{mode === 'signup' ? 'Log in' : 'Sign up'}</Link>
        </p>
      </form>
    </main>
  );
}
