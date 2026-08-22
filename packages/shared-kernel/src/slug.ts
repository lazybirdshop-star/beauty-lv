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

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 40;

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
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');

  /* A name of only symbols/emoji would otherwise produce an empty slug and an
     unreachable page. Not `master` or `studio`: both are reserved below, and
     the fallback must be a value the master is allowed to keep. The caller
     adds a uniqueness suffix on top, and onboarding invites her to replace it
     with an address she chose herself. */
  return base || 'beauty';
}

/**
 * Addresses the platform needs for itself, plus words a visitor would read as
 * belonging to AMOLIE rather than to a master.
 *
 * Three groups, and all three are load-bearing:
 *
 * - **Routes.** `amolie.com/login` and `amolie.com/admin` are real pages. A
 *   master holding one of those slugs would be shadowed by the application's
 *   own route and her page would simply never open.
 * - **Infrastructure.** `www`, `api`, `mail`, `cdn` become hostnames the day
 *   the page moves from `/slug` to `{slug}.amolie.com` (ARCHITECTURE.md §3).
 *   Reserving them now costs nothing; taking one back later means breaking a
 *   printed business card.
 * - **Impersonation.** `amolie`, `support`, `security`, `billing` — an address
 *   from which a stranger can credibly ask a client for a card number.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Application routes (apps/web/src/app)
  'admin',
  'api',
  'dashboard',
  'studio',
  'studio-preview',
  'login',
  'logout',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'booking',
  'bookings',
  'prices',
  'contacts',
  'settings',
  'profile',
  'account',
  'onboarding',
  'start',
  // Infrastructure and future hostnames
  'www',
  'app',
  'mail',
  'smtp',
  'cdn',
  'static',
  'assets',
  'media',
  'files',
  'img',
  'images',
  'status',
  'health',
  'test',
  'staging',
  'dev',
  'demo',
  'ftp',
  'ns',
  'mx',
  '_next',
  'well-known',
  // The platform's own voice
  'amolie',
  'support',
  'help',
  'security',
  'billing',
  'payments',
  'legal',
  'terms',
  'privacy',
  'about',
  'pricing',
  'blog',
  'docs',
  'news',
  'press',
  'careers',
  'contact',
  'faq',
  'master',
  'masters',
  'salon',
  'salons',
  'client',
  'clients',
  'user',
  'users',
  'me',
  'new',
  'search',
]);

/** Why an address cannot be used. The words belong to the client, not here. */
export type SlugIssue = 'too-short' | 'too-long' | 'format' | 'reserved';

/**
 * What the master typed, cleaned into what the address bar would receive.
 *
 * Deliberately forgiving where forgiveness is unambiguous — a pasted
 * `https://amolie.com/anna-nails/` is obviously the address `anna-nails`, an
 * uppercase `Anna` is obviously `anna` — and deliberately strict everywhere
 * else: what this returns is what gets stored, so a character it lets through
 * is a character that ends up in a public URL.
 *
 * Length is not touched here. Silently truncating a long address would hand
 * the master a different one than she typed without saying so; `too-long` is
 * a sentence the interface can show instead.
 */
export function normalizePublicSlug(value: string): string {
  return repairPublicSlugInput(value)
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Everything the product is willing to fix silently, and nothing more.
 *
 * A pasted `https://amolie.com/Anna Nails/` is unambiguously the address
 * `anna-nails`: the wrapper is not part of the name, case is not a decision a
 * URL can carry, and a space, an underscore and a dot are all the same
 * keystroke aimed at a dash. What comes out of here may still contain
 * characters an address cannot: that is deliberate, so `validatePublicSlug`
 * can see them and say so.
 */
function repairPublicSlugInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^(?:www\.)?amolie\.com\//, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[\s_.]+/g, '-');
}

/**
 * `null` means the address is usable. Checked against the *normalized* value:
 * validating raw input would report "format" for a leading space the product
 * silently fixes anyway.
 *
 * Uniqueness is not decided here — only the database knows that.
 */
export function validatePublicSlug(value: string): SlugIssue | null {
  const slug = normalizePublicSlug(value);

  /*
   * A character the product had to delete is a typo, not a repair.
   *
   * `anna?nails` normalizes to `annanails`, which is a perfectly legal
   * address — so the field went green and the master was told her address was
   * free while the sentence beside it said only letters, digits and dashes
   * were allowed. She would then get a page at an address she never typed.
   * Dropping the character is fine for reading a pasted link; it is not fine
   * as an answer to «is this mine?».
   */
  if (/[^a-z0-9-]/.test(repairPublicSlugInput(value))) return 'format';

  if (slug.length < SLUG_MIN_LENGTH) return 'too-short';
  if (slug.length > SLUG_MAX_LENGTH) return 'too-long';
  /* Must start and end with a letter or digit: `-anna` and `anna-` read as
     typos in a text message, and a leading dash is indistinguishable from a
     command-line flag in every tool that will ever touch this value. */
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) return 'format';
  if (RESERVED_SLUGS.has(slug)) return 'reserved';

  return null;
}

/** Sugar for the places that only care whether the address may be stored. */
export function isValidPublicSlug(value: string): boolean {
  return validatePublicSlug(value) === null;
}
