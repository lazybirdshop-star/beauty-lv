import { RegisterForm } from '@/features/registration/components/register-form';
import { liveRegistrationMode } from '@/features/registration/registration-mode';

/**
 * Режим спрашивается на сервере, а не в браузере: экран, который сначала
 * называется «Регистрация», а через мгновение — «Заявка на регистрацию»,
 * читается как ошибка.
 */
export default async function RegisterPage() {
  return <RegisterForm mode={await liveRegistrationMode()} />;
}
