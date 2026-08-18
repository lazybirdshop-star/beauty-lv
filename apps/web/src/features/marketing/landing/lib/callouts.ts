/* Четыре выноски вокруг устройства: здесь их порядок и угол, а слова — в
   словарях (`i18n/messages.ts`). Разделение не косметическое: угол читает
   раскладка, а текст читает переводчик, и связывать их в одном литерале
   значило бы отдать переводчику вёрстку. */
export const CALLOUTS = [
  { id: 'double', corner: 'tl' },
  { id: 'clients', corner: 'tr' },
  { id: 'handsOff', corner: 'bl' },
  { id: 'reminders', corner: 'br' },
] as const;

export type CalloutId = (typeof CALLOUTS)[number]['id'];
