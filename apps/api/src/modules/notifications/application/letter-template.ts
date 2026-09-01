import type { UserLocale } from '@amolie/shared-kernel';

/**
 * Общая форма письма — и общая вёрстка для всех, кто их пишет.
 *
 * Разметка нарочно примитивная: почтовые клиенты десятилетиями поддерживают
 * разное подмножество CSS, и единственная надёжная вёрстка — та, которой почти
 * нет. Текстовая версия обязательна: без неё письмо заметно вероятнее уедет в
 * спам.
 */
export interface Letter {
  subject: string;
  heading: string;
  body: string[];
  action?: { label: string; note: string };
}

/** Письмо на трёх языках — форма, которую принимает каждый словарь писем. */
export type LetterByLocale<Args extends unknown[] = []> = Record<
  UserLocale,
  Args extends [] ? Letter : (...args: Args) => Letter
>;

/** Экранирование: имя мастера и услуги — пользовательский ввод, и оно попадает в HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render(letter: Letter, url: string): { html: string; text: string } {
  const paragraphs = letter.body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#635b52">${escapeHtml(line)}</p>`,
    )
    .join('');

  const action = letter.action
    ? `<p style="margin:24px 0 8px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#16130f;color:#f2efe9;text-decoration:none;padding:14px 26px;font-size:15px">${escapeHtml(letter.action.label)}</a></p>
       <p style="margin:0;font-size:13px;color:#8c8377">${escapeHtml(letter.action.note)}</p>
       <p style="margin:16px 0 0;font-size:13px;color:#8c8377;word-break:break-all">${escapeHtml(url)}</p>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;background:#ede9e3;padding:32px 16px;font-family:-apple-system,Segoe UI,system-ui,sans-serif">
<table role="presentation" style="max-width:520px;margin:0 auto;background:#f6f4f0;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 28px;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#a63a5f">AMOLIE</p>
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.2;color:#16130f;font-weight:500">${escapeHtml(letter.heading)}</h1>
${paragraphs}${action}
</td></tr></table></body></html>`;

  const text = [letter.heading, '', ...letter.body, '', letter.action ? url : ''].join('\n').trim();

  return { html, text };
}

export function renderLetter(
  letter: Letter,
  url = '',
): {
  subject: string;
  html: string;
  text: string;
} {
  return { subject: letter.subject, ...render(letter, url) };
}
