'use client';

import Link from 'next/link';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import { COMPANY } from '../company';

interface PersonalDataNoticeProps {
  /**
   * Что именно собирает эта форма и зачем. Цель у записи и у заявки разная, а
   * хранитель и ссылка — одни.
   */
  purpose: 'booking' | 'registration';
  /** Строка целиком. Умолчание — тон продуктовой формы. */
  className?: string;
  /** Ссылка внутри строки: у лендинга своя типографика ссылок. */
  linkClassName?: string;
}

/**
 * Кто хранит введённое и зачем — там, где его вводят.
 *
 * Политика в продукте написана и обещает статью 13 GDPR, но до места сбора не
 * доходила: ни на шаге контактов публичной записи, ни на форме заявки мастера
 * не было ни строки о том, кто и зачем хранит имя, телефон и Instagram. Статья
 * 13 требует назвать это **в момент получения данных**, а не на отдельной
 * странице, до которой человек может не дойти никогда.
 *
 * Галочки согласия здесь нет намеренно. Обработка нужна для исполнения того,
 * ради чего человек и пришёл — записи или заявки, — а лишняя галочка на форме
 * записи стоит конверсии и приучает не читать те галочки, которые однажды
 * будут значить выбор. Если юрист скажет, что законного интереса
 * недостаточно, галочка встанет сюда же, и текст уже на месте.
 */
export function PersonalDataNotice({ purpose, className, linkClassName }: PersonalDataNoticeProps) {
  const t = useT();
  const body = purpose === 'booking' ? t.legal.dataNoticeBooking : t.legal.dataNoticeRegistration;

  return (
    <p className={className ?? 'text-[13px] leading-snug text-ink-faint'}>
      {fmt(body, { brand: COMPANY.brand })}{' '}
      <Link
        href="/privacy"
        className={cn('underline underline-offset-2 hover:opacity-70', linkClassName)}
      >
        {t.legal.dataNoticeLink}
      </Link>
    </p>
  );
}
