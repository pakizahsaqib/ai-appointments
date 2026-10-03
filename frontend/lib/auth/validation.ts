export type AuthMode = 'login' | 'signup';

export type AuthFormValues = {
  name: string;
  email: string;
  password: string;
};

export type AuthFieldErrors = Partial<Record<keyof AuthFormValues, string>>;

export function validateAuthForm(mode: AuthMode, values: AuthFormValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const password = values.password;

  if (mode === 'signup' && !name) {
    errors.name = 'Name is required.';
  } else if (mode === 'signup' && name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
}
