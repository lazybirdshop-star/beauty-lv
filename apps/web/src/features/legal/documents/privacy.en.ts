/** Privacy Policy, English edition. Structure mirrors `privacy.ru.ts`. */
import { formatRegistration, type LegalEntity } from '../company';
import { formatLifetime } from '../lifetime';
import { list, table, text, type LegalDocument } from '../model';
import { STORAGE_INVENTORY } from '../storage-inventory';
import { subprocessorRows } from '../subprocessors';
import { LIFETIME_WORDS_EN } from './lifetime-words';

export function privacyEn(entity: LegalEntity): LegalDocument {
  const registration = formatRegistration(entity, 'Latvia');
  const cookieCount = STORAGE_INVENTORY.length;

  return {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary:
      'How AMOLIE handles the personal data of masters, their clients, and visitors to this site.',
    sections: [
      {
        id: 'controller',
        title: '1. Who is responsible',
        blocks: [
          text(
            registration
              ? `AMOLIE (${entity.domain}) is operated by ${registration}.`
              : `AMOLIE (${entity.domain}) is operated by the AMOLIE team, established in Latvia, European Union. Company registration details will be published here once incorporation is complete.`,
          ),
          text(
            `For anything concerning personal data, write to ${entity.email.privacy}. We answer within 30 days — the outer limit set by Article 12(3) GDPR; in practice, sooner.`,
          ),
          text(
            'No Data Protection Officer has been appointed: the scale and nature of our processing do not meet the Article 37 threshold. The address above receives every request.',
          ),
        ],
      },
      {
        id: 'roles',
        title: '2. Two roles: controller and processor',
        blocks: [
          text(
            'AMOLIE is a platform on which a master runs her own booking. That gives us two distinct roles, and your rights differ between them.',
          ),
          list(
            'For the master’s own data — account, subscription, page settings — we are the controller: we decide why and how it is processed.',
            'For her clients’ data — name, phone, visit history — we are a processor. The controller is the master: she collects it, she decides its fate, and we act on her instruction and never for our own purposes.',
          ),
          text(
            'What this means for a salon client: a deletion or access request goes to the master you booked with. Write to us and we will pass it on and help her act on it, but the decision is hers. The terms of our instruction are set out in the “Processing of client data” section of the Terms of Use.',
          ),
        ],
      },
      {
        id: 'master-data',
        title: '3. The master’s data',
        blocks: [
          table(
            ['What', 'Why', 'Legal basis', 'Kept for'],
            [
              [
                'Name, email, phone, password hash',
                'Account, sign-in, account recovery',
                'Performance of a contract, Art. 6(1)(b)',
                'As long as the account exists',
              ],
              [
                'Business name, address, description, page photographs',
                'The public booking page the contract is for',
                'Performance of a contract, Art. 6(1)(b)',
                'As long as the account exists',
              ],
              [
                'Plan, subscription status, payment history',
                'Invoicing and accounting',
                'Contract and legal obligation, Art. 6(1)(b) and 6(1)(c)',
                '5 years after the last transaction, under Latvian accounting law',
              ],
              [
                'Internal audit log of actions in the dashboard',
                'Incident investigation, protection against unauthorised access',
                'Legitimate interest, Art. 6(1)(f)',
                '12 months',
              ],
              [
                'Push notification subscription endpoint',
                'Alerts about new bookings',
                'Consent, Art. 6(1)(a) — given when you allow notifications in the browser',
                'Until the permission is withdrawn',
              ],
              [
                'IP address and server logs',
                'Availability, protection against brute force and abuse',
                'Legitimate interest, Art. 6(1)(f)',
                'Up to 30 days',
              ],
            ],
          ),
          text(
            'We neither collect nor ask for special categories of data (Article 9 GDPR). Client notes are a free-text field, and the master is responsible for keeping health information out of it.',
          ),
        ],
      },
      {
        id: 'client-data',
        title: '4. The clients’ data',
        blocks: [
          text(
            'When someone books through a master’s page, we store their name and phone, optionally email or Instagram, the services chosen, the date and time of the visit, and any note the master adds.',
          ),
          text(
            'Only the master who was booked can see it. Other masters on the platform have no access to another address book — the separation is enforced at the database query level, not by hiding buttons.',
          ),
          text(
            'We do not sell this data, do not pass it to ad networks, and do not use it to train models. The only parties that touch it are the processors in section 6, and only so that the service runs.',
          ),
        ],
      },
      {
        id: 'visitor-data',
        title: '5. Visitors to this site',
        blocks: [
          text(
            `This site needs no analytics counter, no advertising pixel, no social widget — and carries none. We keep ${cookieCount} entries on a visitor’s device, all of them strictly necessary: interface language, your answer to the storage notice, the sign-in session, and a client device’s memory of its own recent bookings.`,
          ),
          table(
            ['Entry', 'Where', 'Kept for'],
            STORAGE_INVENTORY.map((record) => [
              record.name,
              record.medium === 'cookie' ? 'Cookie' : 'localStorage',
              formatLifetime(record.maxAgeSeconds, LIFETIME_WORDS_EN, 'en'),
            ]),
          ),
          text('Each entry is described in full in the Cookie Policy. We do not profile visitors.'),
        ],
      },
      {
        id: 'subprocessors',
        title: '6. Who processes data on our behalf',
        blocks: [
          text(
            'We do not run our own data centre. Data sits with the providers below, each under an Article 28 GDPR data processing agreement.',
          ),
          table(
            ['Provider', 'Purpose', 'Hosting', 'Policy'],
            subprocessorRows({
              vercel: 'Hosting for the site and dashboard',
              fly: 'Hosting for the backend',
              supabase: 'Database',
              resend: 'Transactional email — confirmations, account recovery',
              sentry: 'Error reports — so breakage is found without you reporting it',
            }),
          ),
          text(
            'Push notifications are delivered by the browsers’ own services (Google, Apple, Mozilla). They receive a subscription endpoint and an encrypted payload, never the client address book.',
          ),
          text(
            'We disclose data to public authorities only on a valid, reasoned legal request, and notify the affected master whenever the law permits.',
          ),
        ],
      },
      {
        id: 'transfers',
        title: '7. Transfers outside the EEA',
        blocks: [
          text(
            'The database and backend run in Stockholm, the site in Frankfurt. By default, data does not leave the European Economic Area.',
          ),
          text(
            'Some providers are incorporated in the United States and may, in specific cases (support, disaster recovery), access data from there. Those transfers are covered by the European Commission’s Standard Contractual Clauses (Decision 2021/914) and, where the provider participates, the EU–US Data Privacy Framework. A copy of the clauses is available on request to the address in section 1.',
          ),
        ],
      },
      {
        id: 'retention',
        title: '8. How long we keep it',
        blocks: [
          text(
            'Per-category periods are in the table in section 3. The general rule: data lives as long as the account and is deleted with it.',
          ),
          list(
            'When a master deletes her account, the data is marked deleted at once and erased from the live database within 30 days.',
            'Backups roll over within 35 days; deletion reaches them with that delay.',
            'Records the law requires us to keep — invoices and accounting entries — remain for their statutory period and are not deleted on request.',
          ),
        ],
      },
      {
        id: 'rights',
        title: '9. Your rights',
        blocks: [
          text('Under Chapter III of the GDPR you may:'),
          list(
            'obtain a copy of your data and information about the processing (Art. 15);',
            'have inaccuracies corrected (Art. 16);',
            'request erasure (Art. 17);',
            'restrict processing while a dispute is resolved (Art. 18);',
            'receive your data in a machine-readable format and port it (Art. 20);',
            'object to processing based on legitimate interest (Art. 21);',
            'withdraw consent at any time — withdrawal does not affect the lawfulness of processing before it (Art. 7(3)).',
          ),
          text(
            'We export or delete an account’s data on written request from the address on file. The copy arrives as a machine-readable file.',
          ),
        ],
      },
      {
        id: 'exercise',
        title: '10. How to exercise them',
        blocks: [
          text(
            `Write to ${entity.email.privacy} from the address on your account. We answer within 30 days; a complex request may extend that by up to two further months, and we will tell you if it does.`,
          ),
          text(
            'There is no charge. We may ask you to confirm your identity if a request arrives from an unfamiliar address — but confirming should never be harder than the request itself.',
          ),
        ],
      },
      {
        id: 'complaint',
        title: '11. Complaints',
        blocks: [
          text(
            'If our answer does not satisfy you, you may complain to the Latvian Data State Inspectorate (Datu valsts inspekcija), Elijas iela 17, Riga, LV-1050, pasts@dvi.gov.lv, dvi.gov.lv.',
          ),
          text(
            'A resident of another EU country may instead complain to the authority where they live or where the alleged infringement took place.',
          ),
        ],
      },
      {
        id: 'security',
        title: '12. Security',
        blocks: [
          list(
            'All traffic runs over TLS; the server refuses unencrypted connections.',
            'Passwords are stored as Argon2id hashes and cannot be recovered, by us either.',
            'The database sits on a private network; access to production is limited to those who need it and goes through two-factor authentication.',
            'Data separation between masters is covered by automated tests that run on every change.',
          ),
          text(
            'A breach likely to affect your rights is reported to the supervisory authority within 72 hours and to you without undue delay (Articles 33 and 34 GDPR).',
          ),
        ],
      },
      {
        id: 'children',
        title: '13. Age',
        blocks: [
          text(
            'The service is not intended for anyone under 16 — the Article 8 GDPR threshold as set in Latvian law. We do not knowingly create accounts for them and delete such data when we learn of it.',
          ),
        ],
      },
      {
        id: 'automated',
        title: '14. No automated decisions',
        blocks: [
          text(
            'We take no decisions producing legal effects for you by automated means alone, and we do not profile within the meaning of Article 22 GDPR.',
          ),
        ],
      },
      {
        id: 'changes',
        title: '15. Changes to this policy',
        blocks: [
          text(
            'The date of the current edition appears at the top. We notify masters by email at least 14 days before a material change takes effect; minor clarifications are published here without a separate message.',
          ),
        ],
      },
    ],
  };
}
