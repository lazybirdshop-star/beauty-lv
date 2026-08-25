import Link from 'next/link';

/* `plural`/`fmt` берутся из словаря, а не из `@/lib/i18n`: тот модуль помечен
   'use client' ради провайдера и хуков, и вызов его функции из серверного
   компонента роняет страницу целиком. */
import { plural, type Messages } from '@/lib/i18n/messages';

interface AttentionRowProps {
  /** Сколько заявок на регистрацию ещё никто не разобрал. */
  pending: number;
  locale: string;
  t: Messages;
}

/**
 * Строка работы, которая ждёт человека.
 *
 * Панель открывают не ради шести чисел, а чтобы понять, надо ли что-то делать.
 * Пока этот вопрос отвечался значком на пункте меню — заметить его можно было
 * только зная, куда смотреть; сама главная про ждущие заявки молчала.
 *
 * Строки нет, когда делать нечего: пустое «0 заявок ждут ответа» приучает
 * пролистывать место, где однажды появится настоящая работа. Точка акцентом —
 * та самая метка «новое» из системы, единственная роль, в которой розовому
 * разрешено появляться вне заливки действия.
 */
export function AttentionRow({ pending, locale, t }: AttentionRowProps) {
  if (pending <= 0) return null;

  return (
    <Link
      href="/admin/registration-requests"
      className="card bg-cell-rose action-motion flex items-center gap-3 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
    >
      <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-accent" />
      <span className="min-w-0 text-[15px] text-ink">
        {pending}{' '}
        {plural(locale, pending, {
          zero: t.adminHome.requestsWaitingZero,
          one: t.adminHome.requestsWaitingOne,
          few: t.adminHome.requestsWaitingFew,
          many: t.adminHome.requestsWaitingMany,
          other: t.adminHome.requestsWaitingMany,
        })}
      </span>
      {/* Чернилами с подчёркиванием, а не акцентом: #E2568A текстом на светлом
          поле даёт 3.54:1 и провалил бы AA — то же правило, что у контактов
          в карточке записи. */}
      <span className="ml-auto shrink-0 text-sm text-ink underline underline-offset-4">
        {t.adminHome.openRequests}
      </span>
    </Link>
  );
}
