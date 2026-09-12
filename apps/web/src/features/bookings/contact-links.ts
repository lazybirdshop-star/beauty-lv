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

export function instagramLink(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, '').trim()}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}
