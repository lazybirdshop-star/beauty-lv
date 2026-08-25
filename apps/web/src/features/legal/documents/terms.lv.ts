/** Lietošanas noteikumi, latviešu redakcija. Struktūra atbilst `terms.ru.ts`. */
import { formatRegistration, type LegalEntity } from '../company';
import { list, text, type LegalDocument } from '../model';
import { SUBPROCESSORS } from '../subprocessors';

export function termsLv(entity: LegalEntity): LegalDocument {
  const registration = formatRegistration(entity, 'Latvija');
  const providers = SUBPROCESSORS.map((item) => item.name).join(', ');

  return {
    slug: 'terms',
    title: 'Lietošanas noteikumi',
    summary:
      'Līgums starp meistaru un AMOLIE: ko mēs solām, ko gaidām un kas notiek, ja kaut kas nogājis greizi.',
    sections: [
      {
        id: 'parties',
        title: '1. Puses',
        blocks: [
          text(
            registration
              ? `Pakalpojumu sniedz ${registration} — turpmāk «mēs» vai «AMOLIE».`
              : 'Pakalpojumu sniedz AMOLIE komanda, kas darbojas Latvijā, Eiropas Savienībā, — turpmāk «mēs» vai «AMOLIE». Juridiskās personas reģistrācijas dati tiks norādīti šeit pēc reģistrācijas pabeigšanas.',
          ),
          text(
            'Pakalpojumu izmanto meistars, salons vai cita persona, kas izveidojusi kontu, — turpmāk «jūs». Par klientu saucam cilvēku, kas piesakās caur jūsu lapu; viņš nav šī līguma puse.',
          ),
          text(
            'Izveidojot kontu, jūs pieņemat šos noteikumus. Ja rīkojaties organizācijas vārdā, jūs apliecināt, ka esat tiesīgs to saistīt.',
          ),
        ],
      },
      {
        id: 'service',
        title: '2. Ko jūs saņemat',
        blocks: [
          text(
            'AMOLIE ir tiešsaistes pieraksta pakalpojums: publiska lapa, kurā klients izvēlas laiku no jūsu publicētajiem logiem, kabinets ar grafiku un klientu bāzi, paziņojumi par jauniem pierakstiem.',
          ),
          text(
            'Mēs piešķiram jums neekskluzīvas, nenododamas tiesības lietot pakalpojumu abonementa darbības laikā. Citas tiesības uz programmu jūs neiegūstat.',
          ),
          text(
            'Pakalpojums ir rīks, nevis puse jūsu attiecībās ar klientu. Pakalpojumu klientam sniedzat jūs; par tā kvalitāti, cenu, atmaksu un strīdiem atbildat arī jūs.',
          ),
        ],
      },
      {
        id: 'account',
        title: '3. Konts',
        blocks: [
          list(
            'Reģistrācijas datiem jābūt patiesiem un uzturētiem aktuāliem.',
            'Parole ir jūsu atbildība. Par jebkurām aizdomām par svešu piekļuvi ziņojiet nekavējoties.',
            'Viens konts — viena persona vai viena organizācija. Nodot piekļuvi trešajām personām nedrīkst; darbiniekiem paredzēti organizācijas dalībnieki.',
            'Pakalpojumu drīkst lietot personas, kas nav jaunākas par 18 gadiem.',
          ),
        ],
      },
      {
        id: 'payment',
        title: '4. Tarifi un samaksa',
        blocks: [
          text(
            'Spēkā esošie tarifi, katra saturs un norēķinu kārtība tiek publicēti vietnē un kabinetā. Pieņemot šos noteikumus, jūs piekrītat tarifam, kas izvēlēts pieslēgšanas brīdī.',
          ),
          list(
            'Abonements automātiski pagarinās uz to pašu periodu, kamēr to neatceļat.',
            'Atcelšana stājas spēkā ar apmaksātā perioda beigām; par jau iesākto periodu atmaksa nav paredzēta, izņemot gadījumus, kad to nosaka likums.',
            'Par cenas izmaiņām brīdinām ne vēlāk kā 30 dienas iepriekš. Jaunā cena tiek piemērota no nākamā perioda; nepiekrišana izpaužas kā abonementa atcelšana.',
            'Maksājuma kavējums dod mums tiesības apturēt piekļuvi, brīdinot 7 dienas iepriekš.',
          ),
        ],
      },
      {
        id: 'withdrawal',
        title: '5. Patērētāja atteikuma tiesības',
        blocks: [
          text(
            'Ja esat fiziska persona un slēdzat līgumu ārpus saimnieciskās darbības, jums ir tiesības no tā atteikties 14 dienu laikā, nenorādot iemeslu (Direktīva 2011/83/ES, Ministru kabineta noteikumi Nr. 255).',
          ),
          text(
            'Pakalpojums sāk darboties uzreiz pēc reģistrācijas. Sākot to lietot četrpadsmit dienu termiņa laikā, jūs lūdzat sākt pakalpojuma sniegšanu nekavējoties un apliecināt, ka pēc pakalpojuma pilnīgas sniegšanas atteikuma tiesības zūd; par jau sniegto daļu tiek ieturēta samērīga samaksa.',
          ),
          text(`Atteikuma pieteikumu sūtiet uz ${entity.email.legal}.`),
        ],
      },
      {
        id: 'your-duties',
        title: '6. Jūsu pienākumi',
        blocks: [
          text('Jūs atbildat par to, ko publicējat un ko ievadāt bāzē. Jo īpaši jūs apņematies:'),
          list(
            'ievērot likumu attiecībā pret saviem klientiem — tostarp datu aizsardzības un patērētāju tiesību jomā;',
            'pirms datu ievadīšanas pakalpojumā iegūt tiesisku pamatu klienta datu apstrādei un pateikt klientam, kas jūs esat un kā ar jums sazināties;',
            'neievadīt brīvajos laukos ziņas par veselību un citu īpašu kategoriju datus (VDAR 9. pants), ja jums nav atsevišķa pamata;',
            'ievietot tikai tos attēlus un tekstus, uz kuriem jums ir tiesības;',
            'neizmantot pakalpojumu sūtījumiem, kuriem saņēmējs nav devis piekrišanu.',
          ),
        ],
      },
      {
        id: 'acceptable-use',
        title: '7. Nepieļaujama lietošana',
        blocks: [
          text('Nedrīkst:'),
          list(
            'apiet tehniskos ierobežojumus, pārbaudīt pakalpojuma drošību bez mūsu rakstiskas atļaujas, automātiski izgūt saturu;',
            'izdot svešu lapu vai svešu zīmolu par savu;',
            'ievietot pretlikumīgu, maldinošu vai aizskarošu saturu;',
            'pārdot tālāk piekļuvi pakalpojumam vai sniegt to trešajām personām kā savu pakalpojumu bez mūsu piekrišanas.',
          ),
        ],
      },
      {
        id: 'dpa',
        title: '8. Klientu datu apstrāde — pilnvarojums pēc VDAR 28. panta',
        blocks: [
          text(
            'Šai sadaļai ir personas datu apstrādes līguma spēks. Jūsu klientu datu pārzinis esat jūs; AMOLIE ir apstrādātājs un rīkojas tikai pēc jūsu dokumentēta norādījuma, par ko uzskatāma pati pakalpojuma lietošana un kabinetā izvēlētie iestatījumi.',
          ),
          list(
            'Priekšmets un mērķis: pieraksta, grafika un klientu bāzes uzturēšana pakalpojuma pusē.',
            'Termiņš: kamēr darbojas jūsu abonements, plus dzēšanas termiņš no privātuma politikas 8. sadaļas.',
            'Datu subjektu kategorijas: klienti, kas piesakās pie jums.',
            'Datu kategorijas: vārds, tālrunis, ja ir — e-pasts un Instagram, apmeklējumu sastāvs un laiks, jūsu piezīmes.',
          ),
          text('Mēs kā apstrādātājs apņemamies:'),
          list(
            'apstrādāt datus tikai pēc jūsu norādījuma, bet, ja to prasa ES vai Latvijas tiesības, — brīdināt jūs, ja likums to neaizliedz;',
            'nodrošināt konfidencialitāti: piekļuve ir tikai ar konfidencialitātes pienākumu saistītām personām, kurām tā vajadzīga darbā;',
            'veikt VDAR 32. panta drošības pasākumus — tie uzskaitīti privātuma politikas 12. sadaļā;',
            `piesaistīt apakšapstrādātājus (${providers}) ar noteikumiem, kas nav mazāk stingri par šiem, un brīdināt jūs par saraksta izmaiņām ne vēlāk kā 30 dienas iepriekš, atstājot jums tiesības iebilst un izbeigt abonementu;`,
            'palīdzēt jums atbildēt uz datu subjektu pieprasījumiem un pildīt VDAR 32.–36. panta pienākumus — apjomā, kas saprātīgs apstrādes raksturam;',
            'ziņot jums par noplūdi bez nepamatotas kavēšanās pēc tam, kad par to uzzinām;',
            'pēc pakalpojuma sniegšanas beigām dzēst datus vai atdot tos jums pēc jūsu izvēles, izņemot to, kas jāglabā pēc likuma;',
            'sniegt ziņas, kas nepieciešamas 28. panta ievērošanas apliecināšanai, un pieļaut pārbaudi — ne biežāk kā reizi gadā un ar saprātīgu iepriekšēju brīdinājumu, ja vien iemeslu nav devis incidents.',
          ),
          text(
            'Nosūtīšanu ārpus EEZ, ja tāda notiek, sedz Eiropas Komisijas standarta līguma klauzulas — skat. privātuma politikas 7. sadaļu.',
          ),
        ],
      },
      {
        id: 'availability',
        title: '9. Pieejamība un pakalpojuma izmaiņas',
        blocks: [
          text(
            'Mēs cenšamies uzturēt pakalpojumu pieejamu diennakts garumā, taču nesolām nepārtrauktību: mēdz būt plānoti darbi, apstrādātāju kļūmes un nepārvarama vara. Par plānotiem darbiem, kas skar pierakstu, brīdinām iepriekš.',
          ),
          text(
            'Mēs attīstām produktu un esam tiesīgi mainīt tā sastāvu. Būtiska to iespēju samazināšana, kuras izmantojat, dod jums tiesības izbeigt abonementu ar samaksas atmaksu par neizmantoto periodu.',
          ),
        ],
      },
      {
        id: 'liability',
        title: '10. Atbildība',
        blocks: [
          text(
            'Pakalpojums tiek sniegts tāds, kāds tas ir. Likuma pieļautajās robežās mēs neatbildam par negūto peļņu, reputācijas zaudējumu un netiešiem zaudējumiem.',
          ),
          text(
            'Mūsu kopējā atbildība pēc līguma ir ierobežota ar summu, ko samaksājāt 12 mēnešos pirms notikuma. Ierobežojums neattiecas uz nodomu, rupju neuzmanību, kaitējumu dzīvībai un veselībai un uz to, ko likums aizliedz ierobežot, — tostarp uz patērētāja tiesībām.',
          ),
          text(
            'Dati ir kopīga rūpe: mēs veidojam rezerves kopijas, bet arī jums vērts glabāt savu svarīgākā izgūtu kopiju.',
          ),
        ],
      },
      {
        id: 'termination',
        title: '11. Apturēšana un izbeigšana',
        blocks: [
          list(
            'Jūs varat aiziet jebkurā brīdī, atceļot abonementu kabinetā vai ar vēstuli.',
            'Mēs varam apturēt piekļuvi par nesamaksāšanu, drošības apdraudējuma gadījumā vai par 7. sadaļas pārkāpumu — pēc iespējas brīdinot un dodot termiņu izlabot.',
            'Izbeigt līgumu vienpusēji esam tiesīgi, brīdinot 30 dienas iepriekš, bet rupja pārkāpuma gadījumā — nekavējoties.',
            'Pēc izbeigšanas jums ir 30 dienas, lai pieprasītu datu izgūšanu. Pēc tam tie tiek dzēsti privātuma politikas 8. sadaļas kārtībā.',
          ),
        ],
      },
      {
        id: 'changes',
        title: '12. Noteikumu izmaiņas',
        blocks: [
          text(
            'Par šo noteikumu izmaiņām brīdinām pa e-pastu ne vēlāk kā 14 dienas iepriekš. Turpināta lietošana pēc izmaiņu spēkā stāšanās nozīmē piekrišanu; nepiekrišana izpaužas kā abonementa atcelšana līdz šim datumam.',
          ),
        ],
      },
      {
        id: 'law',
        title: '13. Piemērojamās tiesības un strīdi',
        blocks: [
          text(
            'Līgumam piemērojamas Latvijas Republikas tiesības. Strīdus izšķir Latvijas tiesas; patērētājam tas neatņem tiesības vērsties tiesā pēc dzīvesvietas.',
          ),
          text(
            'Patērētājs var vērsties arī Patērētāju tiesību aizsardzības centrā (ptac.gov.lv) vai izmantot Eiropas strīdu izšķiršanas tiešsaistes platformu.',
          ),
        ],
      },
      {
        id: 'contact',
        title: '14. Saziņa',
        blocks: [
          text(
            `Līguma un pretenziju jautājumi — ${entity.email.legal}. Jautājumi par datiem — ${entity.email.privacy}. Viss pārējais — ${entity.email.support}.`,
          ),
        ],
      },
    ],
  };
}
