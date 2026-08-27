'use client';

import { useRouter } from 'next/navigation';

import { LoadError } from '@/components/ui/load-error';

/**
 * Сервис не ответил — и это не то же самое, что «вы не вошли».
 *
 * `/me` ловила **любую** ошибку одним `catch` и показывала форму входа:
 * человеку с действующей сессией продукт сообщал, что он не вошёл, а его
 * визиты при этом просто не загрузились. Самая пугающая фраза, какую тут можно
 * сказать, — «записей нет»; вторая по силе — «вы не тот, кем себя считаете».
 *
 * `router.refresh()`, а не перезагрузка страницы: повторить надо серверный
 * запрос, а не всё приложение.
 */
export function VisitsUnavailable() {
  const router = useRouter();
  return <LoadError onRetry={() => router.refresh()} className="mt-6" />;
}
