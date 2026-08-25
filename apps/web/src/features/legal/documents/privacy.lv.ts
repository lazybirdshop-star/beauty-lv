/** Privātuma politika, latviešu redakcija. Struktūra atbilst `privacy.ru.ts`. */
import { formatRegistration, type LegalEntity } from '../company';
import { formatLifetime } from '../lifetime';
import { list, table, text, type LegalDocument } from '../model';
import { STORAGE_INVENTORY } from '../storage-inventory';
import { subprocessorRows } from '../subprocessors';
import { LIFETIME_WORDS_LV } from './lifetime-words';

export function privacyLv(entity: LegalEntity): LegalDocument {
  const registration = formatRegistration(entity, 'Latvija');
  const cookieCount = STORAGE_INVENTORY.length;

  return {
    slug: 'privacy',
    title: 'Privātuma politika',
    summary: 'Kā AMOLIE apstrādā meistaru, viņu klientu un vietnes apmeklētāju personas datus.',
    sections: [
      {
        id: 'controller',
        title: '1. Kas atbild par datiem',
        blocks: [
          text(
            registration
              ? `AMOLIE (${entity.domain}) pakalpojumu sniedz ${registration}.`
              : `AMOLIE (${entity.domain}) pakalpojumu sniedz AMOLIE komanda, kas darbojas Latvijā, Eiropas Savienībā. Uzņēmuma reģistrācijas dati tiks norādīti šeit pēc reģistrācijas pabeigšanas.`,
          ),
          text(
            `Par jebko, kas skar personas datus, rakstiet uz ${entity.email.privacy}. Atbildam 30 dienu laikā — tas ir VDAR 12. panta 3. punkta termiņš; praksē ātrāk.`,
          ),
          text(
            'Datu aizsardzības speciālists nav iecelts: apstrādes apjoms un raksturs neatbilst VDAR 37. panta kritērijiem. Visus pieprasījumus pieņem iepriekš norādītā adrese.',
          ),
        ],
      },
      {
        id: 'roles',
        title: '2. Divas lomas: pārzinis un apstrādātājs',
        blocks: [
          text(
            'AMOLIE ir platforma, kurā meistars pats vada savu pierakstu. Tāpēc mums ir divas atšķirīgas lomas, un jūsu tiesības tajās nav vienādas.',
          ),
          list(
            'Attiecībā uz meistara datiem — kontu, abonementu, lapas iestatījumiem — mēs esam pārzinis: mēs paši nosakām, kāpēc un kā tos apstrādāt.',
            'Attiecībā uz meistara klientu datiem — vārdu, tālruni, apmeklējumu vēsturi — mēs esam apstrādātājs. Pārzinis šeit ir meistars: viņš tos vāc, viņš lemj par to likteni, bet mēs rīkojamies pēc viņa norādījuma un savām vajadzībām tos neizmantojam.',
          ),
          text(
            'Praktiskais secinājums salona klientam: pieprasījums par dzēšanu vai datu izsniegšanu adresējams meistaram, pie kura pierakstījāties. Ja uzrakstīsiet mums, mēs pieprasījumu nodosim un palīdzēsim to izpildīt, bet lēmumu pieņem viņš. Mūsu pilnvarojuma noteikumi ir Lietošanas noteikumu sadaļā «Klientu datu apstrāde».',
          ),
        ],
      },
      {
        id: 'master-data',
        title: '3. Meistara dati',
        blocks: [
          table(
            ['Kas', 'Kāpēc', 'Pamats', 'Termiņš'],
            [
              [
                'Vārds, e-pasts, tālrunis, paroles jaucējkods',
                'Konts, pieteikšanās, piekļuves atjaunošana',
                'Līguma izpilde, 6(1)(b) pants',
                'Kamēr pastāv konts',
              ],
              [
                'Nosaukums, adrese, apraksts, pieraksta lapas fotogrāfijas',
                'Publiskā pieraksta lapa, kuras dēļ līgums noslēgts',
                'Līguma izpilde, 6(1)(b) pants',
                'Kamēr pastāv konts',
              ],
              [
                'Tarifs, abonementa statuss, maksājumu vēsture',
                'Rēķinu izrakstīšana un grāmatvedība',
                'Līguma izpilde un juridisks pienākums, 6(1)(b) un 6(1)(c) pants',
                '5 gadi pēc pēdējā darījuma — Grāmatvedības likuma termiņš',
              ],
              [
                'Darbību žurnāls kabinetā',
                'Incidentu izmeklēšana, aizsardzība pret nesankcionētu piekļuvi',
                'Leģitīmās intereses, 6(1)(f) pants',
                '12 mēneši',
              ],
              [
                'Push paziņojumu abonementa adrese',
                'Paziņojumi par jauniem pierakstiem',
                'Piekrišana, 6(1)(a) pants — dota, atļaujot paziņojumus pārlūkā',
                'Līdz atļaujas atsaukšanai',
              ],
              [
                'IP adrese un servera tehniskie žurnāli',
                'Darbspēja, aizsardzība pret paroļu uzlaušanu un ļaunprātībām',
                'Leģitīmās intereses, 6(1)(f) pants',
                'Līdz 30 dienām',
              ],
            ],
          ),
          text(
            'Īpašu kategoriju datus (VDAR 9. pants) mēs nevācam un neprasām. Piezīmes par klientu ir brīvs lauks, un meistars atbild par to, lai tur nenonāktu ziņas par veselību.',
          ),
        ],
      },
      {
        id: 'client-data',
        title: '4. Meistara klientu dati',
        blocks: [
          text(
            'Kad cilvēks piesakās caur meistara lapu, datubāzē nonāk viņa vārds un tālrunis, pēc vēlēšanās e-pasts vai Instagram, izvēlētie pakalpojumi, apmeklējuma datums un laiks, kā arī piezīme, ko atstāj meistars.',
          ),
          text(
            'Šos datus redz tikai tas meistars, pie kura cilvēks pierakstījās. Citiem meistariem platformā piekļuves svešai bāzei nav — nodalījums nodrošināts datubāzes vaicājumu līmenī, nevis ar saskarnes iestatījumiem.',
          ),
          text(
            'Mēs šos datus nepārdodam, nenododam reklāmas tīkliem un neizmantojam modeļu apmācībai. Vienīgie, kas tiem pieskaras, ir 6. sadaļas apstrādātāji, un tikai tāpēc, lai pakalpojums strādātu.',
          ),
        ],
      },
      {
        id: 'visitor-data',
        title: '5. Vietnes apmeklētāja dati',
        blocks: [
          text(
            `Vietnei nav vajadzīgs ne apmeklējumu skaitītājs, ne reklāmas pikselis, ne sociālā tīkla logrīks — neviena no tiem šeit nav. Apmeklētāja ierīcē glabājam ${cookieCount} ierakstus, un visi ir strikti nepieciešami: saskarnes valoda, jūsu atbilde uz paziņojumu par glabāšanu, pieteikšanās sesija un klienta ierīces atmiņa par saviem pēdējiem pierakstiem.`,
          ),
          table(
            ['Ieraksts', 'Kur', 'Termiņš'],
            STORAGE_INVENTORY.map((record) => [
              record.name,
              record.medium === 'cookie' ? 'Sīkdatne' : 'localStorage',
              formatLifetime(record.maxAgeSeconds, LIFETIME_WORDS_LV, 'lv'),
            ]),
          ),
          text(
            'Katra ieraksta pilns apraksts ir Sīkdatņu politikā. Apmeklētāju profilēšanu neveicam.',
          ),
        ],
      },
      {
        id: 'subprocessors',
        title: '6. Kam uzticam apstrādi',
        blocks: [
          text(
            'Savu datu centru mēs nebūvējam. Dati glabājas pie zemāk uzskaitītajiem pakalpojumu sniedzējiem, ar katru no kuriem noslēgts VDAR 28. panta apstrādes līgums.',
          ),
          table(
            ['Apstrādātājs', 'Kāpēc', 'Kur glabā', 'Politika'],
            subprocessorRows({
              vercel: 'Vietnes un kabineta mitināšana',
              fly: 'Servera daļas mitināšana',
              supabase: 'Datubāze',
              resend: 'Vēstuļu sūtīšana — apstiprinājumi, piekļuves atjaunošana',
            }),
          ),
          text(
            'Push paziņojumus piegādā pašu pārlūku dienesti (Google, Apple, Mozilla). Tie saņem abonementa adresi un šifrētu ziņojumu, bet ne klientu bāzi.',
          ),
          text(
            'Valsts iestādēm datus nododam tikai pēc pamatota likumīga pieprasījuma. Ikreiz, kad likums to atļauj, brīdinām skarto meistaru.',
          ),
        ],
      },
      {
        id: 'transfers',
        title: '7. Nosūtīšana ārpus EEZ',
        blocks: [
          text(
            'Datubāze un servera daļa strādā Stokholmā, vietne — Frankfurtē. Proti, pēc noklusējuma dati Eiropas Ekonomikas zonu neatstāj.',
          ),
          text(
            'Daļa apstrādātāju reģistrēti ASV un atsevišķos gadījumos (atbalsts, avārijas atjaunošana) var piekļūt datiem no turienes. Šādu nosūtīšanu sedz Eiropas Komisijas standarta līguma klauzulas (lēmums 2021/914) un Data Privacy Framework tur, kur apstrādātājs tajā piedalās. Klauzulu kopiju izsniedzam pēc pieprasījuma uz 1. sadaļā norādīto adresi.',
          ),
        ],
      },
      {
        id: 'retention',
        title: '8. Cik ilgi glabājam',
        blocks: [
          text(
            'Termiņi katrai kategorijai norādīti 3. sadaļas tabulā. Vispārīgais noteikums: dati dzīvo tik ilgi, cik konts, un tiek dzēsti kopā ar to.',
          ),
          list(
            'Meistars dzēš kontu — dati tiek atzīmēti kā dzēsti uzreiz un izņemti no darba datubāzes 30 dienu laikā.',
            'Rezerves kopijas pārrakstās 35 dienu laikā; līdz tām dzēšana nonāk ar šo aizturi.',
            'Dokumenti, kas jāglabā pēc likuma — rēķini un grāmatvedības ieraksti — paliek noteikto termiņu un pēc pieprasījuma netiek dzēsti.',
          ),
        ],
      },
      {
        id: 'rights',
        title: '9. Jūsu tiesības',
        blocks: [
          text('Saskaņā ar VDAR III nodaļu jums ir tiesības:'),
          list(
            'saņemt savu datu kopiju un ziņas par apstrādi (15. pants);',
            'labot neprecizitāti (16. pants);',
            'prasīt dzēšanu (17. pants);',
            'ierobežot apstrādi strīda laikā (18. pants);',
            'saņemt datus mašīnlasāmā formātā un pārnest tos (20. pants);',
            'iebilst pret apstrādi, kas balstīta leģitīmajās interesēs (21. pants);',
            'jebkurā brīdī atsaukt piekrišanu — atsaukums neietekmē līdz tam veiktās apstrādes likumību (7. panta 3. punkts).',
          ),
          text(
            'Konta datu izgūšanu un dzēšanu veicam pēc rakstiska pieprasījuma no kontā norādītās adreses. Kopija pienāk mašīnlasāmā failā.',
          ),
        ],
      },
      {
        id: 'exercise',
        title: '10. Kā tās izmantot',
        blocks: [
          text(
            `Rakstiet uz ${entity.email.privacy} no kontā norādītās adreses. Atbilde — 30 dienu laikā; sarežģīta pieprasījuma gadījumā termiņu var pagarināt vēl par diviem mēnešiem, par ko brīdināsim atsevišķi.`,
          ),
          text(
            'Maksa netiek ņemta. Varam lūgt apstiprināt identitāti, ja pieprasījums nāk no nezināmas adreses, — bet apstiprināšana nedrīkst būt smagāka par pašu pieprasījumu.',
          ),
        ],
      },
      {
        id: 'complaint',
        title: '11. Sūdzība uzraudzības iestādei',
        blocks: [
          text(
            'Ja mūsu atbilde jūs neapmierina, varat vērsties Datu valsts inspekcijā, Elijas iela 17, Rīga, LV-1050, pasts@dvi.gov.lv, dvi.gov.lv.',
          ),
          text(
            'Citas ES valsts iedzīvotājs var vērsties uzraudzības iestādē pēc dzīvesvietas vai pēc iespējamā pārkāpuma vietas.',
          ),
        ],
      },
      {
        id: 'security',
        title: '12. Drošība',
        blocks: [
          list(
            'Visa apmaiņa notiek pa TLS; nešifrētu savienojumu serveris nepieņem.',
            'Paroles glabājas Argon2id jaucējkodā un nav atjaunojamas pat mums.',
            'Datubāze atrodas slēgtā tīklā, piekļuve darba sistēmām — tikai tiem, kam tā vajadzīga darbā, un ar divfaktoru autentifikāciju.',
            'Datu nodalījumu starp meistariem pārbauda automātiski testi pie katras koda izmaiņas.',
          ),
          text(
            'Par noplūdi, kas apdraud jūsu tiesības, ziņosim uzraudzības iestādei 72 stundu laikā, bet jums — bez nepamatotas kavēšanās (VDAR 33. un 34. pants).',
          ),
        ],
      },
      {
        id: 'children',
        title: '13. Vecums',
        blocks: [
          text(
            'Pakalpojums nav paredzēts personām, kas jaunākas par 16 gadiem (VDAR 8. panta slieksnis, kas noteikts Latvijas likumā). Apzināti kontus tādiem lietotājiem neveidojam; uzzinot par šādu gadījumu, datus dzēšam.',
          ),
        ],
      },
      {
        id: 'automated',
        title: '14. Automatizētu lēmumu nav',
        blocks: [
          text(
            'Mēs nepieņemam lēmumus, kas jums rada tiesiskas sekas, tikai automatizēti, un neveicam profilēšanu VDAR 22. panta izpratnē.',
          ),
        ],
      },
      {
        id: 'changes',
        title: '15. Politikas izmaiņas',
        blocks: [
          text(
            'Pēdējās redakcijas datums norādīts dokumenta sākumā. Par būtiskām izmaiņām brīdinām meistarus pa e-pastu ne vēlāk kā 14 dienas pirms stāšanās spēkā; sīki precizējumi tiek publicēti šeit bez atsevišķas vēstules.',
          ),
        ],
      },
    ],
  };
}
