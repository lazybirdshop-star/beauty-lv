/**
 * Ссылки «Написать клиенту» — только глубокие ссылки, ничего не
 * отправляется продуктом (approved N-6).
 *
 * WhatsApp хочет международный номер без плюса и разделителей; SMS —
 * `sms:` с номером как есть; Instagram — профиль по хэндлу без `@`.
 */
export function smsLink(phone: string): string {
  return `sms:${phone.replace(/\s/g, '')}`;
}

export function whatsAppLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

/**
 * Имя профиля из того, что человек напечатал.
 *
 * Поле Instagram свободное — и в него вписывают «anna», «@anna» и ссылку
 * целиком, скопированную из приложения. Без этого разбора ссылка вида
 * `instagram.com/anna` склеивалась в `https://instagram.com/https://...`
 * и вела в никуда.
 */
export function instagramName(handle: string): string {
  return handle
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
    .trim();
}

export function instagramLink(handle: string): string {
  return `https://instagram.com/${instagramName(handle)}`;
}

/** Подпись в карточке — всегда с «@»: так хэндл читают и произносят. */
export function instagramLabel(handle: string): string {
  return `@${instagramName(handle)}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}
