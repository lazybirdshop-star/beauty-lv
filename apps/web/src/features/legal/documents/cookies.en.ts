/** Cookie Policy, English edition. Structure mirrors `cookies.ru.ts`. */
import { type LegalEntity } from '../company';
import { formatLifetime } from '../lifetime';
import { list, table, text, type LegalDocument } from '../model';
import { STORAGE_INVENTORY, optionalCategories } from '../storage-inventory';
import { LIFETIME_WORDS_EN } from './lifetime-words';

const SCOPE_EN: Record<string, string> = {
  landing: 'Product site',
  dashboard: 'Master’s dashboard',
  publicPage: 'Booking page',
  admin: 'Support panel',
};

const PURPOSE_EN: Record<string, string> = {
  amolie_locale: 'Remembers the language chosen with the switch in the header.',
  amolie_storage_consent: 'Remembers your answer to the storage notice so it is not shown again.',
  access_token: 'Keeps a master signed in. Not readable by page scripts (httpOnly).',
  impersonator_token:
    'Lets a support agent return to their own account after looking into a master’s request.',
  'amolie.device-visits.v1':
    'Remembers bookings made from this device so a client can find a visit without an email.',
  'amolie.device-guest.v1': 'Pre-fills name and phone on the booking form so they are typed once.',
  theme: 'Remembers the light or dark theme.',
};

export function cookiesEn(entity: LegalEntity): LegalDocument {
  const optional = optionalCategories();

  return {
    slug: 'cookies',
    title: 'Cookie Policy',
    summary:
      'What AMOLIE stores on your device, why, and for how long. The list is complete — everything is here.',
    sections: [
      {
        id: 'what',
        title: '1. What this covers',
        blocks: [
          text(
            'Article 5(3) of the ePrivacy Directive — in Latvia, the Electronic Communications Law — is not about “cookies” but about any reading from or writing to your device. So this page lists cookies and localStorage entries together: in law they are the same thing.',
          ),
        ],
      },
      {
        id: 'stance',
        title: '2. In short: no advertising or analytics cookies',
        blocks: [
          text(
            'No analytics counter, no ad pixel, no social button, no embedded chat — the AMOLIE site carries not one third-party script that watches you. Everything below is set by us, and the service would misbehave without each of these entries.',
          ),
          text(
            optional.length === 0
              ? 'That is why there is no “Accept / Reject” dialog. Strictly necessary storage requires no consent, and asking permission where refusal would change nothing is not politeness — it is a staged choice. We simply tell you what is stored and link to this page.'
              : 'Anything beyond strictly necessary is set only after you agree — the notice on your first visit asks, and the same control withdraws consent at any time.',
          ),
        ],
      },
      {
        id: 'inventory',
        title: '3. The full list',
        blocks: [
          table(
            ['Name', 'Where', 'Purpose', 'Kept for', 'Area'],
            STORAGE_INVENTORY.map((record) => [
              record.name,
              record.medium === 'cookie' ? 'Cookie' : 'localStorage',
              PURPOSE_EN[record.name] ?? '—',
              formatLifetime(record.maxAgeSeconds, LIFETIME_WORDS_EN, 'en'),
              SCOPE_EN[record.scope] ?? '—',
            ]),
          ),
          text(
            'Every entry is first-party; none belongs to another domain. Entries marked “until storage is cleared” live in localStorage, which has no expiry by design — they disappear when you clear the site’s data.',
          ),
        ],
      },
      {
        id: 'manage',
        title: '4. How to get rid of them',
        blocks: [
          list(
            'Clear the site’s data in your browser settings — everything goes at once.',
            `Block cookies for ${entity.domain} — the site still opens, but signing in will not work: the session lives in a cookie.`,
            'Open the site in a private window — nothing survives closing the tab.',
          ),
          text(
            'There is no “turn off necessary cookies” switch, and that is not an omission: without them you can neither sign in nor keep the language you chose.',
          ),
        ],
      },
      {
        id: 'push',
        title: '5. Push notifications',
        blocks: [
          text(
            'Booking alerts are not cookies, but they also need your permission, and the browser asks for it. Withdraw it in the browser’s site settings or with the switch in the dashboard; we delete the subscription endpoint once you do.',
          ),
        ],
      },
      {
        id: 'changes',
        title: '6. Changes',
        blocks: [
          text(
            `The table above is generated from an inventory the code itself maintains — it cannot fall behind what the site does. Should an entry that requires consent ever appear, you will be asked before it is set. Questions go to ${entity.email.privacy}.`,
          ),
        ],
      },
    ],
  };
}
