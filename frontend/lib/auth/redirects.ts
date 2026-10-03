type AuthRedirectOptions = {
  hasToken: boolean;
  requireAuth?: boolean;
  guestOnly?: boolean;
};

export function getAuthRedirect({ hasToken, requireAuth = false, guestOnly = false }: AuthRedirectOptions) {
  if (requireAuth && !hasToken) return '/login';
  if (guestOnly && hasToken) return '/dashboard';
  return null;
}
