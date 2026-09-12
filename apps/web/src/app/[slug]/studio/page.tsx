import { redirect } from 'next/navigation';

import { capabilitiesOf } from '@/features/dashboard-shell/capabilities';
import { StudioLoader } from '@/features/design-studio/components/studio-loader';
import { requireOrganization } from '@/lib/require-organization';

interface StudioPageProps {
  params: Promise<{ slug: string }>;
  /* Откуда мастер пришла. Единственный разбираемый ответ — `onboarding`;
     всё остальное, включая подделанное вручную, ведёт по умолчанию. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Студия — режим во весь экран, и выход из неё обязан вести туда, откуда в неё
 * вошли.
 *
 * Пока адрес выхода был один на всех, настройка кабинета оказывалась дорогой
 * в один конец: шаг «Облик» уводил сюда, выход возвращал в «Страницу мастера»,
 * и к шести шагам нельзя было вернуться иначе как кнопкой «назад» в самом
 * браузере. Обратный адрес считается на сервере, а не читается хуком в
 * компоненте: `useSearchParams` увёл бы весь режим в клиентский рендер и
 * потребовал бы собственной границы Suspense ради одной строки.
 */
export default async function StudioPage({ params, searchParams }: StudioPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  /* Студия правит страницу заведения — право то же, что у «Страницы». Без
     него студия падала на первом же запросе; теперь адрес ведёт в кабинет. */
  if (!capabilitiesOf(await requireOrganization(slug)).canManagePage) {
    redirect(`/${slug}/dashboard`);
  }
  const exitHref =
    query.return === 'onboarding'
      ? `/${slug}/dashboard/start?step=design`
      : `/${slug}/dashboard/profile-page`;

  return <StudioLoader slug={slug} exitHref={exitHref} />;
}
