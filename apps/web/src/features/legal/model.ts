/**
 * Форма юридического документа.
 *
 * Документ — это данные, а не разметка. Из-за этого один компонент рисует все
 * четыре текста на трёх языках, оглавление собирается само, а переводчик
 * правит строки, не трогая JSX. Разрешённых блоков ровно три: абзац, список и
 * таблица. Четвёртого не будет — политика конфиденциальности не то место, где
 * нужен произвольный HTML.
 */
import type { LegalEntity } from './company';

export const LEGAL_SLUGS = ['privacy', 'cookies', 'terms'] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

export type LegalBlock =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'list'; readonly items: readonly string[] }
  | {
      readonly kind: 'table';
      readonly caption?: string;
      readonly head: readonly string[];
      readonly rows: readonly (readonly string[])[];
    };

export interface LegalSection {
  /**
   * Якорь раздела. Обязан пережить перевод и правку заголовка: на него
   * ссылаются из других документов и из писем, и ссылка не должна ломаться
   * оттого, что заголовок переписали.
   */
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly LegalBlock[];
}

export interface LegalDocument {
  readonly slug: LegalSlug;
  readonly title: string;
  /** Одно предложение под заголовком: о чём документ и кого касается. */
  readonly summary: string;
  readonly sections: readonly LegalSection[];
}

/**
 * Документ собирается из реквизитов, а не хранит их копию: наименование и
 * адрес живут в `company.ts` в одном экземпляре.
 */
export type LegalDocumentFactory = (entity: LegalEntity) => LegalDocument;

/** Короткие помощники — чтобы содержание документов читалось как текст. */
export const text = (value: string): LegalBlock => ({ kind: 'text', text: value });

export const list = (...items: string[]): LegalBlock => ({ kind: 'list', items });

export const table = (
  head: readonly string[],
  rows: readonly (readonly string[])[],
  caption?: string,
): LegalBlock => ({ kind: 'table', head, rows, caption });
