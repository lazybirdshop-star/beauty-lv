/** Terms of Use, English edition. Structure mirrors `terms.ru.ts`. */
import { formatRegistration, type LegalEntity } from '../company';
import { list, text, type LegalDocument } from '../model';
import { SUBPROCESSORS } from '../subprocessors';

export function termsEn(entity: LegalEntity): LegalDocument {
  const registration = formatRegistration(entity, 'Latvia');
  const providers = SUBPROCESSORS.map((item) => item.name).join(', ');

  return {
    slug: 'terms',
    title: 'Terms of Use',
    summary:
      'The agreement between a master and AMOLIE: what we promise, what we expect, and what happens when something goes wrong.',
    sections: [
      {
        id: 'parties',
        title: '1. The parties',
        blocks: [
          text(
            registration
              ? `The service is provided by ${registration} — “we” or “AMOLIE”.`
              : 'The service is provided by the AMOLIE team, established in Latvia, European Union — “we” or “AMOLIE”. Company registration details will be published here once incorporation is complete.',
          ),
          text(
            'The service is used by the master, salon, or other person who created the account — “you”. A client is someone who books through your page; they are not a party to this agreement.',
          ),
          text(
            'Creating an account accepts these terms. If you act for an organisation, you confirm you may bind it.',
          ),
        ],
      },
      {
        id: 'service',
        title: '2. What you get',
        blocks: [
          text(
            'AMOLIE is an online booking service: a public page where a client picks a time from the windows you published, a dashboard with your schedule and client book, and alerts about new bookings.',
          ),
          text(
            'We grant you a non-exclusive, non-transferable right to use the service for the term of your subscription. You acquire no other rights in the software.',
          ),
          text(
            'The service is a tool, not a party to your relationship with a client. You provide the service to the client; its quality, price, refunds, and disputes are yours.',
          ),
        ],
      },
      {
        id: 'account',
        title: '3. Your account',
        blocks: [
          list(
            'Registration details must be accurate and kept current.',
            'Your password is your responsibility. Report any suspicion of unauthorised access at once.',
            'One account, one person or organisation. Sharing access with third parties is not allowed; staff belong in organisation members.',
            'You must be at least 18 to use the service.',
          ),
        ],
      },
      {
        id: 'payment',
        title: '4. Plans and payment',
        blocks: [
          text(
            'Current plans, what each includes, and how billing works are published on the site and in the dashboard. Accepting these terms accepts the plan you chose at sign-up.',
          ),
          list(
            'A subscription renews automatically for the same period until you cancel.',
            'Cancellation takes effect at the end of the paid period; a period already started is not refunded except where the law requires it.',
            'We give at least 30 days’ notice of a price change. The new price applies from the next period; you disagree by cancelling.',
            'Late payment lets us suspend access after 7 days’ notice.',
          ),
        ],
      },
      {
        id: 'withdrawal',
        title: '5. Consumer right of withdrawal',
        blocks: [
          text(
            'If you are an individual contracting outside your trade or profession, you may withdraw within 14 days without giving a reason (Directive 2011/83/EU; Latvian Cabinet Regulation No. 255).',
          ),
          text(
            'The service starts working the moment you register. By using it within those 14 days you ask us to begin performance immediately and acknowledge that the right of withdrawal is lost once the service has been fully performed; for the part already performed, a proportionate amount is retained.',
          ),
          text(`Send a withdrawal notice to ${entity.email.legal}.`),
        ],
      },
      {
        id: 'your-duties',
        title: '6. Your obligations',
        blocks: [
          text(
            'You are responsible for what you publish and what you enter. In particular you undertake to:',
          ),
          list(
            'comply with the law towards your clients, including data protection and consumer law;',
            'have a legal basis for processing a client’s data before entering it, and tell the client who you are and how to reach you;',
            'keep health information and other special categories of data (Art. 9 GDPR) out of free-text fields unless you have a separate basis for them;',
            'publish only images and text you have the rights to;',
            'not use the service for messages the recipient did not agree to receive.',
          ),
        ],
      },
      {
        id: 'acceptable-use',
        title: '7. Unacceptable use',
        blocks: [
          text('You may not:'),
          list(
            'circumvent technical limits, security-test the service without our written permission, or scrape its content;',
            'pass off another page or brand as your own;',
            'publish unlawful, misleading, or abusive content;',
            'resell access or offer the service to third parties as your own without our agreement.',
          ),
        ],
      },
      {
        id: 'dpa',
        title: '8. Processing of client data — an Article 28 GDPR agreement',
        blocks: [
          text(
            'This section has the force of a data processing agreement. You are the controller of your clients’ data; AMOLIE acts as processor and only on your documented instruction, which is constituted by your use of the service and the settings you choose in the dashboard.',
          ),
          list(
            'Subject matter and purpose: running bookings, schedule, and the client book on the service side.',
            'Duration: for the term of your subscription, plus the deletion window in section 8 of the Privacy Policy.',
            'Categories of data subjects: clients who book with you.',
            'Categories of data: name, phone, optionally email and Instagram, the services and times of visits, and your notes.',
          ),
          text('As processor, we undertake to:'),
          list(
            'process data only on your instruction, and where EU or Latvian law compels us otherwise, to tell you unless the law forbids it;',
            'ensure confidentiality: access is limited to people bound by an obligation of confidence who need it for their work;',
            'apply the security measures required by Article 32 GDPR — they are listed in section 12 of the Privacy Policy;',
            `engage sub-processors (${providers}) on terms no less strict than these, and give you at least 30 days’ notice of changes to that list, with a right to object and to terminate;`,
            'assist you in answering data subject requests and in meeting your obligations under Articles 32–36 GDPR, to the extent reasonable for the nature of the processing;',
            'notify you of a personal data breach without undue delay after becoming aware of it;',
            'on the end of the service, delete the data or return it to you at your choice, except what the law requires us to keep;',
            'make available the information needed to demonstrate compliance with Article 28 and allow an audit — no more than once a year and on reasonable notice, unless an incident gives cause.',
          ),
          text(
            'Transfers outside the EEA, where they occur, are covered by the European Commission’s Standard Contractual Clauses — see section 7 of the Privacy Policy.',
          ),
        ],
      },
      {
        id: 'availability',
        title: '9. Availability and changes',
        blocks: [
          text(
            'We aim to keep the service available around the clock, but we do not promise uninterrupted operation: there is planned maintenance, provider failure, and force majeure. We give notice of planned work that affects booking.',
          ),
          text(
            'We develop the product and may change what it includes. A material reduction in features you rely on entitles you to terminate with a refund of the unused period.',
          ),
        ],
      },
      {
        id: 'liability',
        title: '10. Liability',
        blocks: [
          text(
            'The service is provided as is. To the extent the law allows, we are not liable for lost profit, lost reputation, or indirect damage.',
          ),
          text(
            'Our aggregate liability is limited to the amount you paid in the 12 months before the event. The limit does not apply to intent, gross negligence, harm to life or health, or anything the law forbids limiting — including consumer rights.',
          ),
          text(
            'Data is a shared concern: we take backups, and you should keep your own export of what matters.',
          ),
        ],
      },
      {
        id: 'termination',
        title: '11. Suspension and termination',
        blocks: [
          list(
            'You may leave at any time by cancelling in the dashboard or in writing.',
            'We may suspend access for non-payment, a security threat, or a breach of section 7 — with notice and a chance to fix it where possible.',
            'We may terminate on 30 days’ notice, or immediately on a serious breach.',
            'After termination you have 30 days to request an export. The data is then deleted under section 8 of the Privacy Policy.',
          ),
        ],
      },
      {
        id: 'changes',
        title: '12. Changes to these terms',
        blocks: [
          text(
            'We give at least 14 days’ notice by email before these terms change. Continued use after the change takes effect is acceptance; you disagree by cancelling before that date.',
          ),
        ],
      },
      {
        id: 'law',
        title: '13. Governing law and disputes',
        blocks: [
          text(
            'These terms are governed by the law of the Republic of Latvia. Disputes go to the Latvian courts; for a consumer this does not remove the right to sue where they live.',
          ),
          text(
            'A consumer may also turn to the Latvian Consumer Rights Protection Centre (ptac.gov.lv) or use the European online dispute resolution platform.',
          ),
        ],
      },
      {
        id: 'contact',
        title: '14. Contact',
        blocks: [
          text(
            `Contractual and claims matters: ${entity.email.legal}. Data questions: ${entity.email.privacy}. Everything else: ${entity.email.support}.`,
          ),
        ],
      },
    ],
  };
}
