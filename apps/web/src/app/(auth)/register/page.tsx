import { DEFAULT_REGISTRATION_MODE, type RegistrationMode } from '@amolie/shared-kernel';

import { RegisterForm } from '@/features/registration/components/register-form';
import { serverApiFetch } from '@/lib/server-api';

/**
 * Режим спрашивается на сервере, а не в браузере: экран, который сначала
 * называется «Регистрация», а через мгновение — «Заявка на регистрацию»,
 * читается как ошибка. Недоступный API не должен обещать открытую
 * регистрацию, поэтому умолчание — модерация.
 */
async function registrationMode(): Promise<RegistrationMode> {
  try {
    const response = await serverApiFetch<{ mode: RegistrationMode }>('/auth/registration-mode');
    return response.mode;
  } catch {
    return DEFAULT_REGISTRATION_MODE;
  }
}

export default async function RegisterPage() {
  return <RegisterForm mode={await registrationMode()} />;
}
