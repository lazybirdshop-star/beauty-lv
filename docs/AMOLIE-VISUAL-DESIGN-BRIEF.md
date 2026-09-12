<!-- Saved from the Phase 2 artifact "AMOLIE Dashboard Visual Design Brief" (https://claude.ai/code/artifact/b09481a2-e454-46a9-a6db-57a040e8b9a8) on 2026-09-12. Content preserved verbatim; only the markup was converted from HTML to Markdown. -->

_Document 2 · for the visual UI designer_

# AMOLIE Dashboard — Visual Design Brief

You are redesigning the look of a working tool whose product architecture has already been decided. This brief contains everything you need to do that without the codebase: what the product is, who uses it, what every screen must contain, how roles change the screens, and where your freedom starts and stops. Read sections 11 and 21 twice.

- Product **AMOLIE, master and salon cabinet**
- Languages **Russian, Latvian, English (UI labels below are given in Russian with English gloss)**
- Status **architecture frozen; visual design open**
- Date **12 September 2026**

## 1 · What AMOLIE is

AMOLIE is an online-booking platform for beauty professionals in Latvia and the Baltics. A master (nail technician, barber, cosmetologist, brow artist) gets a public page at a short link; her clients book there themselves, around the clock, without calling or messaging. The product's definition of success is a visit that happened without the master negotiating a time.

The product has three surfaces. The **public page** is the client's side, and the master chooses its visual world from six themes; it is not part of this brief. The **marketing site** is dark and separate; not part of this brief. The **cabinet** is the master's working environment, open all shift, on a phone between clients and on a laptop at the desk. This brief is about the cabinet.

### Terms you will meet

- **Window (окно):** A published moment when a visit may start, thirty minutes apart. There is no working-hours template and no generated schedule: the master publishes exactly the moments she is free. A window can be hidden (kept in her calendar, removed from the public page) or deleted.
- **Visit / booking (запись):** One client, one start time, one or more services with a price and duration snapshot, an optional note, a source (public page, manual, client cabinet). A visit occupies as many windows as its services need.
- **Statuses:** Pending (ожидает подтверждения), confirmed, completed, cancelled by master, cancelled by client, no-show, expired (a pending request the master never answered before the start).
- **Block (блок):** "I am not here": lunch, break, personal, vacation. Holds the time against every other action. Drawn hatched in the calendar.
- **Income (доход):** Money from completed visits only. A visit nobody marked completed is money that does not exist. The word "revenue" (выручка) is not used anywhere.
- **Organisation:** The tenant. A solo master is an organisation of one; a salon is an organisation with members who are owner, admin or master.
- **Client (клиент):** A person in the organisation's address book: name, phone, email, Instagram handle, notes, a flag (favourite or attention), a blocked state, and visit statistics. Every booking writes its client into the book automatically.

## 2 · Target users

#### Anna, solo master

Nail technician renting a chair in a shared studio in Riga. Her own administrator. Uses the cabinet standing, one-handed, in forty-second sessions between clients: who is next, has anyone asked for Saturday, is my time open for next week. On Sunday evening, on a laptop, she publishes the week and looks at what she earned.

Cares about: speed, not looking at anything she does not need, never double-booking, never losing a client's note.

#### Līga, salon owner

Runs a salon with four masters and an administrator. Sees the whole organisation. In the morning: who is in the chairs, who is late, which requests wait, who forgot to mark a visit. At month end: income by master, payouts. Works mostly on a laptop at the desk, on a phone when out.

Cares about: one screen for the whole morning, being able to act on any visit without hunting for it, trustworthy numbers.

#### Jūlija, staff master

Employed in Līga's salon. Sees only her own calendar, her own visits and her own earnings; shares the salon's client book. Meets colleagues' regulars and needs their notes. Uses the phone almost exclusively.

Cares about: her day, her next client, the note about that client, her approved payouts. Must never see the salon's finances or team management.

The cabinet is one product for all three. It adapts by hiding modules, never by presenting a different structure. Section 10 gives the exact matrix.

## 3 · Product personality

AMOLIE balances professional business software, a beauty and fashion sensibility, and calm operational efficiency. It must feel like a good instrument made by people who understand the craft, not like software that happens to be about beauty.

#### [IS]

- **Composed.** Nothing competes; the day reads in one breath.
- **Exact.** Time and money set like data; aligned digits, honest counts.
- **Warm, not sweet.** Paper-warm neutrals, one rose accent used as a verb.
- **Authored.** One family, one radius scale, one shadow, one curve; craft in the seams.
- **Quietly attentive.** Notices the first-timer, the unmarked visit, the sellable gap; says it once, in place.

#### [IS NOT]

- An enterprise console: no KPI walls, no admin chrome.
- A SaaS template: no cards-in-cards, no accent rails, no gradient logo.
- Beauty-blog software: no blush washes, script faces, florals, sparkles.
- A fashion lookbook: no oversized serifs, black-and-gold, editorial asymmetry.
- An AI product: no purple-blue gradients, glow, load choreography, "smart" copy.

### Typography character

One humanist-leaning grotesk with complete Cyrillic and Latvian diacritics (ā č ē ģ ī ķ ļ ņ š ū ž), three weights at most. Titles slightly tight, body open, meta small but never faint. Numbers are the typographic heroes: time, duration, price and counts are tabular everywhere. No display face, no serif, no italic in the UI.

### Density

Calm on the phone, capable on the desk. Air is spent between sections, not inside every row.

### Surfaces

Warm paper ground; white for objects that are things; a sunken tone for inset or selected. Hairlines separate meaning. One whisper shadow for floating layers only. No glass, no gradients, no frames inside frames.

### Colour

Near-neutral greys with a faint warm bias; ink that is not pure black. One accent in the rose family, only where a booking is made or shown. Semantic colours by rule: amber waits, green is done, red is cancelled or absent. Service colours (chosen by the master per service) and member photos carry identity in lists. Dark theme is the same instrument at night.

### Motion

State change made legible: sheets, toasts, a queue row folding away, the "now" line moving. One curve, 150–260 ms. No reveals on load.

### Interaction

Inline first, sheet second, dialog last. Every row naming a visit can act on it. Reversible actions get Undo; cancelling a client gets a question. Phone for the thumb, desktop for the keyboard.

## 4 · Approved navigation

The navigation architecture is fixed. You may restyle it; you may not reorder, rename, add or remove items.

| Order                                                             | Item      | English      | Hint line under the title                                                        | Who sees it                                  |
| ----------------------------------------------------------------- | --------- | ------------ | -------------------------------------------------------------------------------- | -------------------------------------------- |
| 1                                                                 | Сегодня   | Today (Home) | What is on today and how things are going                                        | Everyone                                     |
| 2                                                                 | Календарь | Calendar     | The windows clients can book. Carries the count of pending requests on its icon. | Everyone                                     |
| 3                                                                 | Клиенты   | Clients      | Your address book: notes and visit history                                       | Everyone                                     |
| 4                                                                 | Услуги    | Services     | What you do and what it costs                                                    | Owner, admin                                 |
| 5                                                                 | Страница  | Page         | What clients see at your link                                                    | Owner, admin                                 |
| 6                                                                 | Команда   | Team         | Who works here and what each of them can do                                      | Salon owner, admin                           |
| 7                                                                 | Финансы   | Finance      | What you have earned. Payouts (Выплаты) is a sub-page.                           | Owner, admin                                 |
| 7′                                                                | Заработок | Earnings     | Your approved payouts and pay terms                                              | Staff master in a salon (instead of Finance) |
| **Group "Рабочее место" (Workspace), labelled, below a divider:** |           |              |                                                                                  |                                              |
| 8                                                                 | Настройки | Settings     | Your sign-in and cabinet language                                                | Everyone                                     |
| 9                                                                 | Помощь    | Help         | Opens an email to support                                                        | Everyone                                     |

**Desktop:** a permanent left sidebar from 1024 px: brand mark, organisation name, then the items in order, the workspace group below a label. The active item is marked. The count of pending requests sits on Calendar.

**Phone:** a bottom tab bar with exactly four positions: Сегодня · Календарь · Клиенты · Ещё (More). "More" opens a sheet with the rest of the items and the account rows. A floating "+" above the bar opens the Create sheet. The top bar carries the compact brand mark on the left and the section title with its hint line.

**Everywhere:** a search field (⌘K on desktop) that finds clients, upcoming visits, commands and sections; a bell with two kinds of news (a client booked, a client cancelled); a Create menu with New booking, Open time, Block time, New client, and in salons Add master and Add service.

Two former sections, "Ресепшен" (front desk) and "Записи" (bookings list), no longer exist as navigation. Their contents live inside Today and inside the Calendar's list view respectively. Do not draw them as sections.

## 5 · Approved Dashboard Home architecture

Home answers, in this order: who is next, what needs my answer, what is the rest of today, is anything wrong with my time. It shows one number about money, in the header, and nothing else financial. It is not an analytics page.

```text
PHONE                                      DESKTOP (main + aside)
──────────────────────────────────         ─────────────────────────────────────────────
H1  Header: greeting + facts line          H1  Header: greeting + facts line
H2  Setup card (only while incomplete)     H2  Setup card (only while incomplete)
H3  Now / next card                        H3  Now / next strip (one line above the day)
H4  Needs answer (queue)                   ┌─ main ──────────────────┐ ┌─ aside ───────────┐
H5  Today (flat or team-grouped)           │ H5  Today               │ │ H4  Needs answer  │
H6  Time (gap to open · no time ahead)     │                         │ │ H6  Time          │
H7  Team today (salon owner/admin)         │                         │ │ H7  Team today    │
                                           └─────────────────────────┘ └───────────────────┘
```

| Module              | Content (must be present)                                                                                                                                                                                                                                                                             | Actions                                                                                                      | When empty                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **H1 Header**       | Greeting by hour ("Доброе утро, Анна"); date; organisation name; facts: 5 bookings · 09:00–18:30 · 3 working (salon) · expected income 210 € (finance scope) · 4 free windows; done count (team mode)                                                                                                 | "free windows" links to the calendar                                                                         | "No bookings today" replaces the count         |
| **H2 Setup card**   | Next setup step; the page link "amolie.com/anna" with Copy                                                                                                                                                                                                                                            | Do the next step; Copy                                                                                       | Disappears when setup is complete              |
| **H3 Now / next**   | "Next in 18 min" or "In chair now"; time range; client; first-visit marker; services; client note excerpt; master's name in team mode                                                                                                                                                                 | Open visit · Call · Write                                                                                    | One line: "Day finished" / "No visits today"   |
| **H4 Needs answer** | Rows of three kinds: pending request (hollow amber marker; client, first-visit marker, services, duration, day and time); visit ended without a mark (check-square marker; client, ended at); client cancelled (struck time; client, time, reason in quotes). Master's name on every row in team mode | Confirm / Decline; Completed / No-show; "All completed (3)" for the day; "All" link to the calendar list     | Renders nothing at all                         |
| **H5 Today**        | Flat: rows with time, client, service colour dot, service, duration, status dot, first-visit marker; "free until 13:00" gap rows; past rows dimmed. Team mode: two groups "In chair" and "Next", rows add the master's photo and name                                                                 | Open visit; "Open" on a gap row; Complete / Confirm inline in team mode; link to calendar (day or team view) | "A free day" + secondary button "Open time"    |
| **H6 Time**         | "Free 12:00–14:00" (own day only); "No open time for the next week"                                                                                                                                                                                                                                   | "Open 12:00–14:00" (one tap, Undo); "Open time"                                                              | Renders nothing                                |
| **H7 Team today**   | Row per working member: photo, name, "3 bookings · 09:00–16:30"                                                                                                                                                                                                                                       | Row → that member's day; heading → team view                                                                 | Salon of one: the invite prompt "Add a master" |

**Above the fold.** Phone: H1, H3 and the first two rows of H4 (or the first rows of H5 when the queue is empty). Desktop: H1, H3, the first six rows of H5, and H4 with H6 in the aside.

### Sample data for mock-ups

```text
Tue 2 Sep 2026 · Anna Ozola · "Studija Ozols"
09:00–10:00  Marta Liepa      Classic manicure       1 h        completed
10:30–12:00  Sofija Bērziņa   Gel manicure           1 h 30     confirmed    ← next, in 18 min
12:00–13:00  free until 13:00
13:30–14:10  Elīna Kalniņa    Brow shaping           40 min     confirmed    ● first visit
15:00–17:00  Laura Zariņa     Gel manicure + Nail art 2 h       confirmed
17:30–18:30  Ilze Ozoliņa     Classic manicure       1 h        pending      ← needs answer

Queue:  ○ Ilze Ozoliņa · Sat 6 Sep 14:00 · Gel manicure · 1 h 30 · first visit   [Confirm] [Decline]
        ☐ Marta Liepa · ended 10:00                                              [Completed] [No-show]
        ✕ Dace Krūmiņa · cancelled 15:00 · "sick"

Salon team: Jūlija Krūmiņa · 3 bookings · 10:00–16:30    Kārlis Vītols · 1 booking · 12:00–13:00
```

## 6 · Key Calendar structure

The calendar is the product's strongest screen. Its interaction model is frozen; its appearance is yours.

- **Toolbar:** Today; previous / next (day or week); view segment; "Рабочее время" (Working time) opens the availability sheet; "Новая запись" (New booking).
- **Views:** Day, Week, List; plus Team (columns per person) for salon owners and admins with two or more working people. On a phone only Day and List exist. The list view is also the bookings hub (below).
- **The grid:** a time axis in 30-minute rows from the first to the last relevant hour of the day. Cells hold: an open window (visibly bookable), a hidden window (kept but not public), a visit block (client, service, duration; the accent marks booked time), a block ("hatched", with its reason and hours), and empty time. "Now" is a line that moves.
- **Interactions:** click empty time → a small quick menu at the pointer (a bottom sheet on the phone): New booking, Open this window (or range), Block time, Open a period. Drag on empty time selects a range and offers the same. Drag a visit to move it (desktop). Click a window → window card: move, hide, delete. Click a visit → the visit card. Click a block → block card: when, whose, remove.
- **Availability sheet:** member selector (only for those who manage others' time); "Repeat last week" with a preview count; add one window; open a period (from and to date, weekdays, day start and end, step, preview "will open 34 · 6 already open"); clear a period. Every publish shows a toast with Undo.
- **Block sheet:** member; reason presets (lunch, break, personal, vacation); all-day switch; date and until-date; from and to; repeat weekly until a date. Undo in the toast.
- **List view as the bookings hub:** a posture segment (Upcoming / Past / All), a status filter, a search field over the full history (name or digits), CSV export and the booking-rules button in an overflow menu, an "attention" block at the top with inline Confirm / Decline and Completed / No-show, then visits grouped by day using the same rows as Home. On the phone, search and posture stay visible; export and rules go into the overflow.

```text
WEEK (desktop)          Mon 1        Tue 2          Wed 3
09:00                   ░ open       ▓ Marta 1h     ░ open
09:30                   ░ open       ▓              ░ open
10:00                   ▒ hidden     ░ open         ▓ Elīna 40m
10:30                                ▓ Sofija 1h30  ▓
11:00                   ▧ lunch      ▓              ░ open
…                        ▧           ▓
                        ─────── now 10:12 ───────────────────
```

## 7 · Key booking workflow

### One visit card, everywhere

A visit opened from Home, the calendar, the list, a client page, the bell or a push notification opens the same card in the same sheet (bottom sheet on the phone, right side panel on desktop). Content, in order: status; time range and duration; **client strip** (name, first visit or "7 visits · last 12 Aug", flag, blocked state, note excerpt, "Open client card"); Call and Write; services with durations and prices; created when and from where; the visit's own note; actions by state: Confirm / Decline (pending), Completed / No-show (after the start), Cancel (asks a question), Edit (primary while the visit is ahead).

### New booking (approved order: who → what → when)

1. **Member** (salons only, when the person opening the form manages others): who the visit is with. Filters the windows.
2. **Client:** a typeahead over the address book by name or digits; the fall-through row creates a new client and reveals name and phone fields. Instagram handle optional.
3. **Services:** a multi-select list grouped by category with a running total: "Gel manicure + Nail art · 1 h 45 min · 65 €".
4. **Time:** windows grouped by day (first three days, then "show more"); windows that cannot hold the visit are muted with a reason ("needs 4 windows"); a "custom time" option for a time the master never published. The chosen window shows the end time.
5. **Note**, then the primary button "Создать · 14:00–15:45" (Create with the range).

**Edit** reuses the same form with services, a reschedule block (day, window, member), name, phone, Instagram, note, and Cancel at the bottom. **Cancel** asks: "Cancel Sofija Bērziņa's visit? She will be notified." **Completed** and **No-show** act immediately with an Undo toast.

### Entry points that must all exist

Create menu (desktop header), floating "+" (phone), ⌘K command, calendar quick menu on empty time, "New booking" on a client page and on a team member page.

## 8 · Important client-management patterns

- **List:** search by name or digits; sort by last visit, name, visit count; a "possible duplicates" block above the list with Merge; export; Add client. Desktop: a table (name, phone, visits, last visit, next visit, flag). Phone: rows (name, phone, last visit, flag). Row → client page.
- **Client page:** breadcrumb to Clients; name; "client since"; blocked state; Call, Write, New booking; contacts (phone, email, Instagram); Edit; Upcoming visit with Reschedule; Overview tiles: completed visits, last visit, spent, cancelled (with no-show count); favourite service; Notes with Edit; Flag (favourite / attention) with Edit; Block / Unblock with an explanation of what blocking does (the person cannot book from the page).
- **History table:** date, time, service, duration, price, status; "show 10 more".
- **Client form (sheet):** name, phone (+371 default), email, Instagram, notes, flag. Delete asks a question.
- **Client strip in the visit card** and the **first-visit marker** on rows: the same knowledge, at the moment it matters.
- **No client photos.** Clients are initials; only team members have photos.

## 9 · Team and salon patterns

- **Team list:** pending invitations in a separate block above the roster (a person who has not accepted does not work here yet); roster rows with photo, name, role, today's load; row menu: change role, suspend, restore. Invite sheet: email, display name, role (admin or master) with a line explaining what each role opens.
- **Member page:** photo with a focal point; name and role; Today (bookings today, upcoming, joined date); Schedule (opens the calendar on this person's day), New booking, Block time; Services (the whole price list as switches: does this person offer it, with own price and duration); Access (role, suspension); Pay terms (owner only: percent, chair rent, salary plus percent, effective from a date, history); Contacts.
- **Team mode of Today:** section 5, H5 grouped and H7.
- **Calendar team view:** one column per working person with photo and name in the column head.
- **Finance by master:** a table "Masters by income" (visits, average bill, share, amount) in Finance; Payouts: month picker, Calculate, per-master lines (visits, income, terms, to master, to salon), Approve, Paid, delete draft.
- **Staff Earnings:** own terms and approved payouts only, no drafts, no colleagues.

## 10 · Role-aware behaviour

One dashboard; modules appear or hide. Three inputs decide: organisation type (solo or salon, chosen at registration), role scope (owner and admin see the organisation; a master sees her own), and how many people work today (team modules appear with the second person in a salon).

| Element                  | Solo                                                              | Salon owner / admin                                               | Staff master                                       |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| Navigation               | Today, Calendar, Clients, Services, Page, Finance, Settings, Help | + Team; Finance with Payouts (admin: no payouts, no org settings) | Today, Calendar, Clients, Earnings, Settings, Help |
| Home H1 income line      | yes                                                               | yes                                                               | no                                                 |
| Home H2 setup card       | yes                                                               | yes                                                               | no                                                 |
| Home H3 now / next       | own                                                               | whole salon, named                                                | own                                                |
| Home H4 queue            | own                                                               | organisation-wide, named                                          | own                                                |
| Home H5 today            | flat with gaps                                                    | team-grouped (≥2 working); flat otherwise                         | flat with gaps                                     |
| Home H6 gap hint         | yes                                                               | no (only "no time ahead")                                         | yes                                                |
| Home H7 team today       | never                                                             | yes (invite prompt when alone)                                    | never                                              |
| Calendar views           | day / week / list                                                 | team / day / week / list                                          | day / week / list, own only                        |
| Member selector in forms | never                                                             | yes                                                               | never                                              |
| Clients                  | all                                                               | all                                                               | all (shared book)                                  |
| Services, Page           | manage                                                            | manage                                                            | none                                               |
| Settings                 | account, photo, push, password, activity log                      | same; log owner only                                              | account, photo, push, password                     |

Never design a screen that shows a staff master anyone else's income, calendar or team controls. Never design a solo screen with team elements "greyed out".

## 11 · Existing functionality that must be preserved

Every item below exists today and must survive the redesign visibly, on both phone and desktop.

- All navigation items and their role visibility (section 4); search, bell, Create menu, phone "+".
- Home: greeting and facts line; setup card; now / next with Call; pending requests for all dates; the day list with gap rows; gap hint; "no open time ahead"; client cancellations; team rows; invite prompt for a salon of one.
- Calendar: day, week, list, team views; open / hide / delete a window; open a period with weekdays and step; clear a period; block time with presets, all-day, repeat; drag to open, drag to move; quick menu on empty time; Undo after publish, block and no-show; the "now" line.
- Visits: the one card; confirm, decline, complete, no-show, cancel with a question, edit with reschedule and member; multi-service edit; note; created-from; call.
- Bookings hub (now the calendar list): posture segment, status filter, full-history search, CSV export, rules (auto-confirm, self-cancel deadline), attention rows with inline actions.
- Clients: search, sort, duplicates merge, export, add, edit, delete with a question, block, flag, notes, upcoming, history, four overview tiles, favourite service.
- Services: list, categories, showcase display toggles (prices, durations, grouping); service colour; add-on chains; performers with own price.
- Page: content form, address, preview, appearance (opens the Studio), booking rules tab; the link and QR card (moved here).
- Team: invitations, roster, roles, suspension, member page with today, services, access, pay terms, photo, contacts.
- Finance: period with trend, by service, by master, completed list, export; payouts; staff earnings.
- Settings: name, cabinet language, own photo, push notifications, password, activity log (owner).
- Everywhere: three languages, light and dark theme, empty states, skeleton loading, error banners with Retry, toasts, 44 px targets, salon-time discipline.

## 12 · Approved new functionality

These seven are approved and must appear in your designs. Nothing else new may be invented.

1. **Needs-answer queue with "All completed".** Home H4 for every role; visits that ended without a mark appear with Completed / No-show; one day-level "All completed (3)" with Undo.
2. **Client strip in the visit card and a first-visit marker** on every row that names a client (Home, calendar cards, list, queue, now / next). When the phone matches nobody: "Not in your client base · Add".
3. **One-tap gap opening:** "Free 12:00–14:00 · Open" publishes the range with an Undo toast.
4. **Repeat last week** in the availability sheet, with a preview count and Undo.
5. **New booking at parity:** client typeahead, multi-service with running total, windows that fit, end time on the button (section 7).
6. **Write to client:** a "Write" action beside "Call" opening SMS, WhatsApp, Instagram (when a handle exists). Deep links only; nothing is sent by AMOLIE.
7. **Cancellation reason** shown in quotes on the queue row, in the bell and in the visit card.

## 13 · Information density requirements

- **Two densities by device.** Phone: 56 px list rows, 20 px side margins, one column. Desktop: 40–44 px list rows, tables at 13.5 px with 12 px cell padding; the Home day list at table density, not phone density.
- **Rows never drop information to look calmer.** A visit row always shows time, client, service, duration and status. A queue row always shows what to decide on. Hierarchy comes from weight and tone, not omission.
- **Twenty visits and eight people** is a normal salon day on desktop; the day list and team view must hold that without scrolling inside a card.
- **A phone day of six visits** must fit under the now / next card and the queue on one and a half screens.
- **Numbers align.** Tabular figures for time, duration, money, counts, in every language.
- **Section headings carry counts** when a count helps ("Needs answer (3)", "Done 4 of 9") and never as decoration.

## 14 · Mobile expectations

- Mobile first. Design the 390 × 844 layout before the desktop one; the desktop is the phone with a sidebar and an aside, not a different product.
- One hand, standing, forty seconds. Primary actions in the lower half of the screen; tabs at the bottom; the floating "+" reachable by the thumb.
- Sheets slide from the bottom, with a visible close and swipe to dismiss; the primary action sits in a fixed footer outside the scroll.
- Native selects are replaced by sheet pickers; the date and time pickers reuse the window-list pattern.
- It is installed as an app (PWA): design the top bar and safe areas as an app, not a website.
- Nothing scrolls horizontally except the calendar week and team grids inside their own container.
- The Home order on the phone is fixed (section 5).

## 15 · Accessibility requirements

- WCAG 2.2 AA in both themes: body text ≥ 4.5:1, large text and icons ≥ 3:1, measured on the actual surface the text sits on. The label on the accent button must pass; today it does with white on a deepened rose.
- Every tap target ≥ 44 × 44 px, including inline row actions and tab-bar items.
- Status never by colour alone: dot + word, and the queue's three shapes.
- Visible keyboard focus (2 px ring, offset) on every control; the desktop is keyboard-driven.
- Labels above fields; helper text always in the layout; errors replace helpers with an icon and text.
- Reduced motion removes all animation and loses no information.
- Latvian diacritics, Russian and English all render in the chosen family without fallback.
- Destructive actions always carry text, never an icon alone.

## 16 · Design-system principles that should remain

- Semantic tokens: background, raised, sunken, border, ink (three levels), accent, success, warning, danger. Design in tokens so the dark theme is a second value set, not a second design.
- One accent for the whole product; semantic colours are a separate group and never the brand.
- Status as dot + word.
- Flat surfaces: no glass, no gradients.
- Bottom sheet on the phone, side panel (max about 520 px) on desktop, one primitive for both.
- Skeletons in the shape of the content; empty states that teach; error banners with Retry.
- A hint line under every section title, in plain speech.
- Tabular numerals; money and time as data.
- Light and dark themes of equal care.
- Words: short, no exclamation marks, no long dash as a stylistic pause, "income" never "revenue", real local names in mock-ups.

## 17 · Design-system principles open to visual reinterpretation

- **Radius:** currently 10 px controls, 14 px cards, 20 px large cards, pill chips. Propose one scale; do not propose "zero everywhere", which belongs to the public poster theme.
- **Surface treatment and frames:** today every block is a bordered, shadowed card. Reserve cards for objects; sections by whitespace; lists on the paper. This is the most valuable change you can make.
- **Typography:** one family of your choice within the Cyrillic and Latvian filter; three weights; a fixed seven-step scale (meta, dense, body, strong, title, page, metric). No display face.
- **Accent roles:** primary action, booked time, active navigation mark. Links, chips, counts and selections are not accent.
- **Colour values:** the paper, ink, accent and semantic values may be re-tuned; the structure (warm neutral, one rose accent, three semantic) may not.
- **Spacing and layout proportions:** sidebar width, aside width, section rhythm, row heights within the two densities.
- **Controls:** buttons, inputs, segmented controls, switches, chips, tabs, tables, sheets, toasts, the quick menu.
- **Navigation styling:** the sidebar, the tab bar, the top bar, the active marker, the badge.
- **Icons:** one outline set at one stroke weight; each navigation item its own glyph.
- **Motion:** which state changes animate, within 150–260 ms and one curve.

## 18 · Visual anti-patterns to avoid

- Cards inside cards; every block framed; identical rounded blocks with an accent rail.
- Accent used as decoration: pink links, pink chips, pink counts, pink selections, pink backgrounds.
- KPI tiles or charts on Home; "insights"; progress rings.
- Pastel washes, blush gradients, script or serif headlines, floral or sparkle glyphs, "feminine" iconography.
- Black-and-gold or oversized editorial type; asymmetric layouts in operational screens.
- Glass, blur panels, drop shadows on everything, glow.
- Filled icons; two icon sets; icon-only destructive actions.
- Phone density on the desktop; desktop density on the phone.
- Generic empty states ("Nothing here"); reassurance text where nothing is needed.
- Native-looking selects and date pickers in the phone sheets.
- Colour as the only status channel.
- Placeholder-as-label; helper text that appears only on error.

## 19 · AI-slop patterns to avoid

- Purple-to-blue gradient heroes, neon accents on near-black, "AI glow".
- Inter or Space Grotesk chosen because they are safe; a serif display paired with cream and terracotta because it is fashionable.
- Three identical feature cards; bento grids; numbered "01 / 02 / 03" markers where nothing is a sequence.
- Emoji as icons or section markers; arrows and check glyphs as text.
- Orchestrated page-load sequences, staggered fade-ups, parallax.
- Everything centred; everything the same radius; one shadow stamped on every block.
- Lorem ipsum, "John Doe", "Acme Salon". Use Latvian names and real prices in euros.
- Dashboards that show a chart because dashboards have charts.
- "Smart", "magic", "insights", "AI-powered" anywhere in copy.
- Decorative illustration of hands, phones or smiling people.

## 20 · Screens that should be redesigned first

The first visual exploration covers eight screens, each at 390 × 844 and 1440 × 900, in light and dark. Show realistic states: the loaded state with the sample data in section 5, one empty state and one loading state per screen.

#### 1 · Application shell [first]

- **Contains:** Desktop: sidebar with brand mark and organisation name, items and the workspace group; top toolbar with search (⌘K), bell, Create menu, theme, account. Phone: top bar with compact mark, title and hint; bottom tab bar with four positions; floating "+"; the More sheet.
- **States:** Active item, pending count on Calendar, bell with unread dot, More sheet open, Create sheet open.

#### 2 · Sidebar

- **Contains:** All items of section 4 for the owner of a salon (the longest list); the workspace group; the account rows at the bottom (name, organisation, sign out).
- **States:** Active, hover, item with count, collapsed on tablet if you propose one.

#### 3 · Dashboard Home [first]

- **Contains:** H1–H7 of section 5 in three renderings: solo (flat day, gap hint), salon owner in team mode (grouped day, team rows, named queue), staff master (own scope, no income). Setup card variant for a new account.
- **States:** Queue with three row kinds; queue empty (renders nothing); free day; day finished.

#### 4 · Calendar [first]

- **Contains:** Toolbar; day view (phone and desktop); week view; team view (desktop); list view as the bookings hub with its toolbar; quick menu on empty time; window card; block card; availability sheet with Repeat last week; block sheet.
- **States:** Open, hidden, booked, blocked, past; a drag selection; "now" line; a day with no windows.

#### 5 · Booking drawer [first]

- **Contains:** The visit card (section 7) in each state: pending, confirmed ahead, in progress, ended without a mark, completed, cancelled with reason. The edit form. The cancel question. The new booking form in the approved order with a running total and a muted unfit window.
- **States:** Client strip with a match; no match ("Add"); blocked client; first visit.

#### 6 · Clients list

- **Contains:** Search, sort, duplicates block with Merge, export, Add; desktop table and phone rows (section 8).
- **States:** Empty book; search with no result; duplicates present.

#### 7 · Client profile

- **Contains:** Everything in section 8, including Write beside Call, the history table, the four tiles, notes, flag, block.
- **States:** First-timer with one upcoming visit; regular with long history; blocked client.

#### 8 · Team / staff view

- **Contains:** Team list with an invitation block above the roster; member page with all sections of section 9; the calendar team view header with photos.
- **States:** Pending invitation; suspended member; owner viewing pay terms; admin without pay terms.

## 21 · Your mandate

#### [You may change]

- Visual hierarchy
- Typography (within section 17)
- Spacing and rhythm
- Surface treatment
- Borders and hairlines
- Radius
- Navigation styling
- Controls and their states
- Layout proportions, where every function is preserved
- Component appearance
- Icon set and glyphs (one outline set)
- Motion within the rules

#### [You may not]

- Invent new workflows or entry points
- Remove functionality listed in section 11
- Change the navigation architecture (section 4)
- Invent product features beyond section 12
- Simplify away required information (section 13)
- Redesign business logic, statuses or role visibility
- Add analytics, charts or KPI tiles to Home
- Rename sections, statuses or terms
- Introduce a second accent, a display face, glass or gradients
- Design for the desktop first

> **How your work will be judged.** A master should look at the Home screen and know in two seconds who is next and what needs her hand; a salon owner should see the whole morning without scrolling on a laptop; a staff master should see nothing that is not hers. If a screen is beautiful and fails one of these, it fails.

Questions about content, states or roles go back to the product owner through the implementing team. Do not resolve them by guessing.
