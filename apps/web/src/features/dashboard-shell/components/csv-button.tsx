'use client';

import { Button } from '@/components/ui/button';

import { Icon } from './icon';

/**
 * «CSV» в шапке экрана — одна кнопка на весь кабинет.
 *
 * Записи, клиенты и финансы рисовали выгрузку тремя способами: контурной,
 * серой заливной и текстовой «Скачать CSV». Здесь один вид: тихая кнопка со
 * значком и словом «CSV»; полное действие — в подписи для читалки. Пустой
 * список кнопку гасит, а не прячет: исчезая, она сдвигала шапку.
 */
export function CsvButton({
  label,
  disabled = false,
  onClick,
}: {
  /** Полное действие для читалки: «Скачать записи в CSV». */
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="csv-button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name="download" className="ico-18" />
      <span aria-hidden="true">CSV</span>
    </Button>
  );
}
