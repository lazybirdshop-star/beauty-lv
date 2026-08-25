/** Sīkdatņu politika, latviešu redakcija. Struktūra atbilst `cookies.ru.ts`. */
import { type LegalEntity } from '../company';
import { formatLifetime } from '../lifetime';
import { list, table, text, type LegalDocument } from '../model';
import { STORAGE_INVENTORY, optionalCategories } from '../storage-inventory';
import { LIFETIME_WORDS_LV } from './lifetime-words';

const SCOPE_LV: Record<string, string> = {
  landing: 'Produkta vietne',
  dashboard: 'Meistara kabinets',
  publicPage: 'Pieraksta lapa',
  admin: 'Atbalsta panelis',
};

const PURPOSE_LV: Record<string, string> = {
  amolie_locale: 'Atceras valodu, kas izvēlēta ar slēdzi galvenē.',
  amolie_storage_consent:
    'Atceras jūsu atbildi uz paziņojumu par glabāšanu, lai nejautātu atkārtoti.',
  access_token: 'Uztur meistara pieteikšanos kabinetā. Lapas skriptiem nav pieejama (httpOnly).',
  impersonator_token:
    'Ļauj atbalsta darbiniekam atgriezties savā kontā pēc meistara pieteikuma izskatīšanas.',
  'amolie.device-visits.v1':
    'Atceras pēdējos pierakstus no šīs ierīces, lai klients atrastu savu apmeklējumu bez vēstules.',
  'amolie.device-guest.v1':
    'Ieliek vārdu un tālruni pieraksta formā, lai tos nevajadzētu rakstīt no jauna.',
  theme: 'Atceras gaišās vai tumšās tēmas izvēli.',
};

export function cookiesLv(entity: LegalEntity): LegalDocument {
  const optional = optionalCategories();

  return {
    slug: 'cookies',
    title: 'Sīkdatņu politika',
    summary:
      'Ko AMOLIE glabā jūsu ierīcē, kāpēc un cik ilgi. Saraksts ir pilnīgs — šeit uzskaitīts viss.',
    sections: [
      {
        id: 'what',
        title: '1. Par ko ir šis dokuments',
        blocks: [
          text(
            'E-privātuma direktīvas 5. panta 3. punkts — Latvijā tas ir Elektronisko sakaru likums — runā nevis par «sīkdatnēm», bet par jebkuru lasīšanu no jūsu ierīces un rakstīšanu tajā. Tāpēc šeit uzskaitītas gan sīkdatnes, gan localStorage ieraksti: likuma acīs tie ir vienlīdzīgi.',
          ),
        ],
      },
      {
        id: 'stance',
        title: '2. Īsi: reklāmas un analītikas sīkdatņu mums nav',
        blocks: [
          text(
            'Ne apmeklējumu skaitītāja, ne reklāmas pikseļa, ne sociālā tīkla pogas, ne iegultas tērzēšanas — AMOLIE vietnē nav neviena sveša skripta, kas jūs vērotu. Viss zemāk uzskaitītais ir mūsu pašu, un bez katra no šiem ierakstiem pakalpojums nestrādātu, kā nākas.',
          ),
          text(
            optional.length === 0
              ? 'Tieši tāpēc mēs nerādām logu ar pogām «Piekrist» un «Noraidīt». Strikti nepieciešamie ieraksti piekrišanu neprasa, un jautāt atļauju tur, kur atteikums neko nemainītu, nav pieklājība, bet izlikšanās par izvēli. Mēs vienkārši pasakām, ko glabājam, un dodam saiti uz šo tekstu.'
              : 'Ierakstus papildus strikti nepieciešamajiem liekam tikai pēc jūsu piekrišanas — to prasa paziņojums pirmajā apmeklējumā, un tur pašā to var jebkurā brīdī atsaukt.',
          ),
        ],
      },
      {
        id: 'inventory',
        title: '3. Pilns saraksts',
        blocks: [
          table(
            ['Nosaukums', 'Kur glabājas', 'Kāpēc', 'Termiņš', 'Sadaļa'],
            STORAGE_INVENTORY.map((record) => [
              record.name,
              record.medium === 'cookie' ? 'Sīkdatne' : 'localStorage',
              PURPOSE_LV[record.name] ?? '—',
              formatLifetime(record.maxAgeSeconds, LIFETIME_WORDS_LV, 'lv'),
              SCOPE_LV[record.scope] ?? '—',
            ]),
          ),
          text(
            'Visus ierakstus liek pati vietne: svešu domēnu starp tiem nav. Ieraksti ar termiņu «līdz krātuves iztīrīšanai» glabājas localStorage, kam derīguma termiņa nav pēc būtības, — tie pazūd, kad iztīrāt vietnes datus.',
          ),
        ],
      },
      {
        id: 'manage',
        title: '4. Kā no tiem atbrīvoties',
        blocks: [
          list(
            'Iztīriet vietnes datus pārlūka iestatījumos — pazudīs visi ieraksti uzreiz.',
            `Aizliedziet sīkdatnes domēnam ${entity.domain} — vietne joprojām atvērsies, bet pieteikšanās kabinetā nestrādās: sesija glabājas tieši sīkdatnē.`,
            'Atveriet vietni privātajā logā — ieraksti nepārdzīvos cilnes aizvēršanu.',
          ),
          text(
            'Atsevišķas pogas «izslēgt nepieciešamās sīkdatnes» vietnē nav, un tā nav nolaidība: bez tām nevar ne pieteikties, ne noturēt izvēlēto valodu.',
          ),
        ],
      },
      {
        id: 'push',
        title: '5. Push paziņojumi',
        blocks: [
          text(
            'Paziņojumi par jauniem pierakstiem nav sīkdatnes, bet arī tiem vajadzīga jūsu atļauja, un to prasa pats pārlūks. Atsaukt atļauju var pārlūka vietnes iestatījumos vai ar slēdzi kabinetā; pēc atsaukuma mēs dzēšam abonementa adresi.',
          ),
        ],
      },
      {
        id: 'changes',
        title: '6. Izmaiņas',
        blocks: [
          text(
            `Tabulu augstāk veido apraksts, ko uztur pats kods, — tā nevar atpalikt no tā, kas notiek vietnē. Ja sarakstā kādreiz parādīsies ieraksts, kam vajadzīga piekrišana, jūs redzēsiet jautājumu, pirms tas tiks ielikts. Jautājumi — uz ${entity.email.privacy}.`,
          ),
        ],
      },
    ],
  };
}
