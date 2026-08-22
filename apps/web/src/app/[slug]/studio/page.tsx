import { StudioLoader } from '@/features/design-studio/components/studio-loader';

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
  const exitHref =
    query.return === 'onboarding'
      ? `/${slug}/dashboard/start?step=design`
      : `/${slug}/dashboard/profile-page`;

  return <StudioLoader slug={slug} exitHref={exitHref} />;
}
