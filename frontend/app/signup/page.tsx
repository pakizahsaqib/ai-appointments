import { AuthForm } from '@/components/ui/AuthForm';
import { AuthGate } from '@/components/ui/AuthGate';

export default function SignupPage() {
  return (
    <AuthGate guestOnly>
      <AuthForm mode="signup" />
    </AuthGate>
  );
}
