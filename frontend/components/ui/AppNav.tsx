'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { clearToken } from '@/lib/api/client';

export function AppNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isCalendarPage = pathname === '/appointments';
  const isDashboardPage = pathname === '/dashboard';
  const showMobileMenu = isCalendarPage || isDashboardPage;
  const primaryLink = isCalendarPage
    ? { href: '/dashboard', label: 'Dashboard' }
    : { href: '/appointments', label: 'Calendar' };

  function logout() {
    setMobileMenuOpen(false);
    clearToken();
    window.location.href = '/login';
  }

  return (
    <header className={`topbar ${isAuthPage ? 'auth-topbar' : ''} ${showMobileMenu ? 'workspace-topbar' : ''} ${isCalendarPage ? 'calendar-topbar' : ''}`.trim()}>
      <Link className="brand" href={isAuthPage ? '/login' : '/dashboard'}>
        <img src="/ai-assistant-logo.png" alt="" aria-hidden="true" />
        <span>AI Appointment Assistant</span>
      </Link>
      {showMobileMenu ? (
        <div className="calendar-mobile-menu">
          <button
            className="calendar-mobile-menu-button"
            type="button"
            aria-label="Open mobile navigation"
            aria-controls="calendar-mobile-menu-panel"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          {mobileMenuOpen ? (
            <div
              id="calendar-mobile-menu-panel"
              className="calendar-mobile-menu-panel"
              aria-label={isCalendarPage ? 'Mobile calendar menu' : 'Mobile dashboard menu'}
            >
              {isCalendarPage ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              ) : null}
              {isDashboardPage ? (
                <Link href="/appointments" onClick={() => setMobileMenuOpen(false)}>Calendar</Link>
              ) : null}
              <button type="button" onClick={logout}>
                <LogOut size={14} aria-hidden="true" />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <nav className={isAuthPage ? 'auth-topbar-nav' : undefined}>
        {isAuthPage ? (
          <Link href={pathname === '/login' ? '/signup' : '/login'}>{pathname === '/login' ? 'Sign up' : 'Log in'}</Link>
        ) : (
          <>
            <Link href={primaryLink.href}>{primaryLink.label}</Link>
            <button className="nav-logout" type="button" onClick={logout}>
              <LogOut size={15} />
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
