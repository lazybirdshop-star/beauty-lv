'use client';

import { fmt } from '@/lib/i18n/messages';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Что человеку делать, пока мастер молчит.
 *
 * Две строки, и вторая важнее первой. Прежде экран говорил только «пока не
 * подтверждена» — обещание без срока и без канала, которое человек шёл
 * проверять единственным доступным ему способом: сообщением мастеру. Здесь
 * названы оба: до какого момента ответ придёт и куда именно.
 *
 * Вторая строка меняется по факту, а не по замыслу. Почта при записи
 * необязательна, и обещать письмо тому, кто адреса не назвал, — тот же
 * молчаливый экран, только с ложью вместо пустоты.
 *
 * Общей сценой на все миры (BRAND_STYLE_ARCHITECTURE.md §7.6): текст один на
 * продукт, классы приходят пропом. Шесть копий этой развилки разошлись бы на
 * первой же правке формулировки.
 */
export function AwaitingNote({
  email,
  className,
  hintClassName,
}: {
  /** Адрес из расписки; `null` — человек его не оставил. */
  email: string | null;
  /** Класс первой строки — им мир и подписывает свой голос. */
  className?: string;
  /** Вторая строка, если миру нужна тише первой. По умолчанию — как первая. */
  hintClassName?: string;
}) {
  const t = useT();
  return (
    <>
      <p className={className}>{t.publicPage.awaitingHint}</p>
      <p className={cn(className, hintClassName)}>
        {email ? fmt(t.publicPage.awaitingByEmail, { email }) : t.publicPage.awaitingNoEmail}
      </p>
    </>
  );
}
