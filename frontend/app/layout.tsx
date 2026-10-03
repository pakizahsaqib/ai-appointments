import type { Metadata } from 'next';
import { AppNav } from '@/components/ui/AppNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Appointment Assistant',
  description: 'AI-assisted appointment booking prototype',
  icons: {
    icon: '/ai-assistant-logo.png',
    apple: '/ai-assistant-logo.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
