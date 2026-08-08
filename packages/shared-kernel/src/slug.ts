/**
 * A master's slug becomes her public address (`{slug}.amolie.com`, see
 * ARCHITECTURE.md §3), so it has to survive being typed, texted and read
 * aloud — that means plain latin, no diacritics, no cyrillic.
 */
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function transliterate(value: string): string {
  return value
    .split('')
    .map((char) => CYRILLIC_MAP[char] ?? char)
    .join('');
}

/**
 * Latvian diacritics (ā č ē ģ ī ķ ļ ņ š ū ž) are handled by NFD
 * normalization — decompose, then drop the combining marks.
 */
export function toOrganizationSlug(name: string): string {
  const base = transliterate(name.trim().toLowerCase())
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');

  // A name of only symbols/emoji would otherwise produce an empty slug and
  // an unreachable page; the caller adds a uniqueness suffix on top.
  return base || 'master';
}
