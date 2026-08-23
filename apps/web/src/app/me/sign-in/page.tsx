import { ClientShell } from '@/features/client-account/components/client-shell';
import { ClientSignInPanel } from '@/features/client-account/components/sign-in-panel';
import { SignInConsumer } from '@/features/client-account/components/sign-in-consumer';

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Куда ведёт ссылка из письма. Без токена — обычная форма запроса ссылки:
 * человек мог открыть адрес по памяти или прийти по старой ссылке из истории.
 */
export default async function ClientSignInPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  return (
    <ClientShell signedIn={false}>
      {token ? <SignInConsumer token={token} /> : <ClientSignInPanel />}
    </ClientShell>
  );
}
