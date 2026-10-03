'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearToken, getToken } from '@/lib/api/client';
import { getAuthRedirect } from '@/lib/auth/redirects';

type Props = {
  children: ReactNode;
  requireAuth?: boolean;
  guestOnly?: boolean;
};

export function AuthGate({ children, requireAuth = false, guestOnly = false }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const token = getToken();
      const redirectPath = getAuthRedirect({ hasToken: Boolean(token), requireAuth, guestOnly });

      if (redirectPath === '/login') {
        router.replace(redirectPath);
        return;
      }

      if (!token) {
        if (active) setReady(true);
        return;
      }

      try {
        await api.me();
        if (redirectPath) {
          router.replace(redirectPath);
          return;
        }
        if (active) setReady(true);
      } catch {
        clearToken();
        if (requireAuth) {
          router.replace('/login');
          return;
        }
        if (active) setReady(true);
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [guestOnly, requireAuth, router]);

  if (!ready) return null;

  return children;
}
