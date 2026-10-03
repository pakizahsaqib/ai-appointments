import { AuthForm } from '@/components/ui/AuthForm';
import { AuthGate } from '@/components/ui/AuthGate';

export default function LoginPage() {
  return (
    <AuthGate guestOnly>
      <AuthForm mode="login" />
    </AuthGate>
  );
}
