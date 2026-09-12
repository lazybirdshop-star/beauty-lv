<!-- Saved from the Phase 2 artifact "AMOLIE Product & UX Direction" (https://claude.ai/code/artifact/f3bfd5eb-9b2c-4ea8-8b6a-8eca3a05a4ba) on 2026-09-12. Content preserved verbatim; only the markup was converted from HTML to Markdown. -->

_Document 1 · Phase 2 · no code in this phase_

# AMOLIE — Approved Product & UX Direction

The audit of 11 September turned into one direction. Every recommendation below carries a final decision, the Dashboard Home has one architecture, the navigation has one shape, and every high-frequency workflow has a verdict. Nothing here was implemented; the companion document is the brief a visual designer works from.

- Branch **dashboard-v2**
- Date **12 September 2026**
- Status **for owner review, then hand-off to visual design**
- Companion **AMOLIE Dashboard — Visual Design Brief**

## Part 0 · Corrections since the audit

Resolving the audit meant re-checking it against the code. Five facts changed a decision or a wording; they are stated up front so the rest of the document can rely on them.

1. **The phone tab bar takes three items, not four, in the master cabinet.** The shell passes three tabs plus Ещё; four is the admin panel. The audit's claim that a salon owner loses Клиенты to Ещё stands and is now verified.
2. **Solo and salon are two organisation types, chosen at registration.** The owner decided this on 11 September. A solo cabinet never shows team, invitations or a team day, whatever its size. Inside a salon, team modules still appear with the second person. Adaptation therefore has three inputs: organisation type, role scope, team size.
3. **The cabinet's rulebook is UI_GUIDELINES.md §2.0 plus the kit stylesheet, not DESIGN.md.** DESIGN.md states that the cabinet is a third territory and defers to UI_GUIDELINES.md. Part 7 therefore proposes changes to that rulebook and to the kit. None of the three files was edited.
4. **Every booking already writes the client into the address book.** Manual and public bookings both upsert the client by phone. "Create client" has an implicit path today, which shapes the workflow verdict in Part 5.
5. **The cancellation reason is already in the booking payload.** The API returns it; only the screens ignore it. Showing it needs no backend work.

> **One refinement of the audit's chosen concept.** Concept C placed "visits awaiting a mark" in the team rendering of the day section, and the needs-answer queue held them for solo and staff. That gave one fact two homes. In the final architecture the queue owns unmarked visits for every role, and the team rendering of the day has two groups, in chair and next. One fact, one place.

## Part 1 · Audit resolved

Every significant recommendation, classified. The register comes first; the detail blocks that follow cover only RESTRUCTURE, ADD and REMOVE.

| #    | Recommendation (audit ref)                                              | Decision          | Reason in one line                                                            |
| ---- | ----------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| R-1  | Home phone order: next → queue → day (P-01)                             | [RESTRUCTURE]     | The day is five blocks down on the primary device.                            |
| R-2  | Desktop next-visit card → now/next strip (P-01)                         | [POLISH]          | Same content, one line instead of a duplicate card.                           |
| R-3  | Visit-mark queue with "mark all" (P-02, F-1)                            | [ADD]             | Income equals completed visits; solo and staff have no list of unmarked ones. |
| R-4  | Client context in the visit and rows (P-03, F-2)                        | [ADD]             | The CRM never reaches the moment it matters.                                  |
| R-5  | Calendar list view absorbs the bookings screen (P-04)                   | [RESTRUCTURE]     | Search, export and inline confirm live on a screen with no door.              |
| R-6  | Gap hint publishes its own range with Undo (P-05, F-3a)                 | [ADD]             | The hint currently discards the numbers it computed.                          |
| R-7  | Manual booking: who → what → when, multi-service, fit check (P-06, F-4) | [RESTRUCTURE]     | API and public flow take a cart; the form takes one service and fails late.   |
| R-8  | Ресепшен becomes Home's team mode (P-07)                                | [RESTRUCTURE]     | Two "today" screens for the same person; Clients pushed off the tab bar.      |
| R-9  | Phone tabs fixed by key (P-07)                                          | [POLISH]          | Tabs must not depend on list position.                                        |
| R-10 | Inline Confirm / Decline on Home's pending rows (P-08)                  | [RESTRUCTURE]     | The component exists on the orphaned screen; move it.                         |
| R-11 | "Write" deep links: SMS, WhatsApp, Instagram (P-09, F-5)                | [ADD]             | The persona messages; the product only dials.                                 |
| R-12 | Duplicate "show prices" switch on the Page form (P-10)                  | [REMOVE]          | One setting, two screens.                                                     |
| R-13 | Show the cancellation reason (P-11, F-8)                                | [POLISH]          | Data is in the payload; presentation only.                                    |
| R-14 | ⌘K ships the whole address book (P-12)                                  | [KEEP]            | Fine below ~1 000 clients; server search is the noted trigger.                |
| R-15 | "Repeat last week" for windows (F-3b)                                   | [ADD]             | The weekly ritual is an eight-field form today.                               |
| R-16 | Lapsed-clients filter (F-6)                                             | [BACKLOG]         | Useful, not immediate; the sort exists.                                       |
| R-17 | Free hours per member in the pulse (F-7)                                | [BACKLOG]         | Salon-only, medium value; keep the redesign tight.                            |
| R-18 | Week's expected income in Finance (F-9)                                 | [BACKLOG]         | Not a dashboard concern.                                                      |
| R-19 | Booking-page card with QR moves to Страница                             | [RESTRUCTURE]     | A weekly need placed above an hourly one.                                     |
| R-20 | "All clear" text in the attention block                                 | [REMOVE]          | An empty queue should take no space.                                          |
| R-21 | Team pulse rows link to that member's day                               | [POLISH]          | All rows currently share one link.                                            |
| R-22 | Card discipline: cards for objects, sections by whitespace              | [POLISH]          | Every block is a bordered, shadowed card today.                               |
| R-23 | One type scale, no inline sizes                                         | [POLISH]          | 22 inline sizes in the features folder.                                       |
| R-24 | Two sheet primitives                                                    | [DEPRECATE]       | Retire the Tailwind sheet; one side sheet for the cabinet.                    |
| R-25 | Accent restricted to its roles                                          | [POLISH]          | Pink links, chips, counts and selections dilute the verb.                     |
| R-26 | Queue state encoded in form, not only words                             | [POLISH]          | Three shapes for three kinds of "answer me".                                  |
| R-27 | A display face for titles                                               | [KEEP one family] | Operate surface; one family, weight and size carry hierarchy. See Part 7.     |
| R-28 | Member photos in salon day rows                                         | [POLISH]          | Photos exist and already show elsewhere.                                      |
| R-29 | Motion: one curve, state changes only                                   | [POLISH]          | Rule change proposed in Part 7.                                               |
| R-30 | Desktop density for lists                                               | [POLISH]          | Phone rows on a 1440px screen waste the salon's day.                          |
| R-31 | Nullable client link on bookings                                        | [BACKLOG]         | Backend work; phone-key matching is enough for a hint.                        |

### Kept as is

Calendar grid and every interaction on it (drag to open, drag to move, quick menu, blocks, slot card, Undo). One visit card, one edit form, one cancel question for the whole product. Capability-driven visibility with server-side 404s. Clients page with duplicates merge and export. Finance, payouts, earnings. ⌘K, the bell, the Create menu, the phone FAB. Timezone discipline, i18n discipline, section hint lines, vocabulary ("доход", never "выручка"). Error and empty states.

### Detail: RESTRUCTURE, ADD and REMOVE decisions

#### R-1 · Home phone order [RESTRUCTURE]

- **User problem:** On a phone the aside renders first: setup card, pending list, next-visit card, gap hint, attention, QR card, team pulse, invite prompt, and then the day. The forty-second session scrolls five blocks to find who is next after this one.
- **Proposed change:** Fixed phone order: header → setup card (only while incomplete) → now/next → needs-answer queue → today → time → team today. Nothing else on Home.
- **Affected user type:** Everyone on a phone; the primary context.
- **Value:** The answer to "what matters now" fits one screen.
- **Effort:** Small. Layout order and one card removal; no API.
- **Risks:** None functional. Owners used to seeing the QR card on Home find it under Страница; a one-line link stays on Home until setup completes.

#### R-3 · Visit-mark queue with "mark all completed" [ADD]

- **User problem:** Finance counts only completed visits. The list of "ended, not marked" exists in the front-desk model but is shown only to salon owners and admins. A solo master opens each past visit and presses Complete, or forgets, and her income is under-reported.
- **Proposed change:** Unmarked visits become rows in Home's needs-answer queue for every role, with Completed and No-show per row and one "All completed" action for the day's ended visits, with Undo. Yesterday's forgotten visits appear the next morning in the same queue.
- **Affected user type:** Solo and staff most; owners through correct payouts.
- **Value:** High. It protects money the product already promised to count.
- **Effort:** Small. One Home block; the bulk action loops the existing status endpoint or gets a small batch endpoint.
- **Risks:** "All completed" could mark a no-show as income. Mitigation: the list is visible above the button, the button covers only ended visits, and the toast offers Undo, mirroring the existing no-show toast.

#### R-4 · Client context in the visit [ADD]

- **User problem:** The visit card shows the booking's own note, not the client's note, flag, visit count or blocked state. Seeing "allergic to acetone" before a visit costs three screens.
- **Proposed change:** A client strip inside the visit card: "Marta Liepa · 7 visits · last 12 Aug · ⚑ attention · note excerpt · Open card". A quiet first-visit marker on day rows, calendar cards and pending rows. Matching by phone key, as the Clients screen already does.
- **Affected user type:** Everyone; staff meeting colleagues' regulars most.
- **Value:** High. The CRM starts paying back the effort of keeping it.
- **Effort:** Small to medium. Client list is already cached by the bookings screens; a lookup map is the work.
- **Risks:** Phone-key matching is approximate (trailing digits). The strip says "client card" with a link and never asserts identity; the exact link is backlog R-31.

#### R-5 · Calendar list view absorbs the bookings screen [RESTRUCTURE]

- **User problem:** The v2 branch removed Записи from navigation but the screen stays alive and unique: full-history search, CSV export, the rules sheet and inline Confirm / Decline exist nowhere else. The calendar's list view even links its rows to that hidden screen, and the pending badge on Календарь leads to a view where nothing can be confirmed.
- **Proposed change:** The calendar's Список view becomes the bookings hub: posture segment (upcoming / past / all), status filter, search, export, rules button, attention rows with inline actions. The old route redirects there and preserves the booking id, so every existing link and push notification keeps working.
- **Affected user type:** Owners and admins on desktop most; everyone answering requests.
- **Value:** One place for visits, no hidden screen, an actionable badge.
- **Effort:** Medium. The tools move; the route and one navigation special-case are deleted.
- **Risks:** The list view gains a toolbar and must stay light on the phone: search and posture visible, export and rules in an overflow menu.

#### R-6 · The gap hint publishes its own range [ADD]

- **User problem:** Home computes "Free 12:00–14:00" and links to an empty availability sheet; the master re-types the times she was just shown.
- **Proposed change:** One tap publishes the range for the member's own day and shows "Opened 12:00–14:00 · Undo", exactly like drag-to-open in the calendar.
- **Affected user type:** Solo masters and staff (the hint is scoped to the member's own day; owners see no gap hint for other people's time).
- **Value:** Idle time becomes sellable in one tap.
- **Effort:** Small. The bulk publish endpoint already returns what it created, which is what Undo needs.
- **Risks:** A mis-tap publishes time; Undo covers it.

#### R-7 · Manual booking: who → what → when [RESTRUCTURE]

- **User problem:** The form takes one service although the API and the public page take a cart. The client picker is a native select over the whole book. Windows are not filtered by the visit's duration, so a two-hour service on a thirty-minute gap fails at submit. No end time or total before Create.
- **Proposed change:** Reorder to client → services → time. Client typeahead reusing the ⌘K matcher, with "new client" as the fall-through. Multi-select services with a running "1 h 45 min · 65 €". Windows that cannot hold the visit shown muted with the reason; the chosen window shows "ends 15:45". Custom time and member choice stay.
- **Affected user type:** Everyone who writes a client in by phone; salon admins most.
- **Value:** Failed submits and duplicate clients disappear; parity with what the client can do alone.
- **Effort:** Medium. Form rework and a fit check using the open-intervals model.
- **Risks:** Reordering changes muscle memory for existing users; the change ships with the visual pass so it is learned once.

#### R-8 · Ресепшен becomes Home's team mode [RESTRUCTURE]

- **User problem:** An owner with a team has two morning screens: Home shows a flat list with names and a pulse; Ресепшен shows the same day grouped with inline actions. On the phone the third tab goes to Ресепшен and Клиенты falls into Ещё.
- **Proposed change:** When the viewer sees the whole organisation and two or more people work, Home's day section renders in two groups, in chair and next, with inline Complete and Confirm; unmarked visits already live in the queue. The nav item retires and its route redirects to Home. Phone tabs become Сегодня · Календарь · Клиенты · Ещё for every role.
- **Affected user type:** Salon owners and admins.
- **Value:** One morning screen per person; the client base one tap away again.
- **Effort:** Medium. The model and the row component move; the screen and route go.
- **Risks:** Retiring a section built two days earlier is a product call. Nothing is lost: model, rows, inline actions and the minute refresh move intact. Owner sign-off required (Part 9).

#### R-10 · Inline Confirm / Decline on Home [RESTRUCTURE]

- **User problem:** Pending rows on Home only link to the card; the amber attention card with inline actions exists on the orphaned screen.
- **Proposed change:** Pending rows in the queue carry Confirm and Decline; Decline routes through the shared confirm sheet as today. Rows show services, duration and the first-visit marker so the decision can be made in place.
- **Affected user type:** Everyone who receives requests.
- **Value:** Confirming from a push notification becomes open app, one tap.
- **Effort:** Small. Component reuse.
- **Risks:** Mis-tap on Confirm. Acceptable: Confirm is reversible through Cancel, and Decline asks.

#### R-11 · "Write to client" deep links [ADD]

- **User problem:** The client page and the visit card only dial. "Running ten minutes late" means copying the number into a messenger.
- **Proposed change:** A "Write" action beside "Call" on the now/next block, the visit card and the client page, opening a small menu: SMS, WhatsApp, Instagram profile when a handle exists. Deep links only. No inbox, no integration, no promise.
- **Affected user type:** Everyone, daily.
- **Value:** Medium to high; it matches how the persona actually talks to clients.
- **Effort:** Small.
- **Risks:** WhatsApp links need a normalised international number; the phone field already stores one.

#### R-12 · Duplicate "show prices" switch [REMOVE]

- **User problem:** The same organisation setting is a switch in Страница → Содержание and again in Услуги → Витрина.
- **Proposed change:** Display toggles for prices, durations and grouping live only in Витрина. The Page form keeps "show contacts" and everything about the page itself.
- **Affected user type:** Owners and admins.
- **Value:** Low but free: one fewer place to be surprised.
- **Effort:** Small.
- **Risks:** None. The booking rules duplication (Page tab and the bookings sheet) is deliberate and stays, because both render one component.

#### R-15 · "Repeat last week" for windows [ADD]

- **User problem:** Publishing time is a form every week: dates, weekdays, start, end, step. The product deliberately has no working-hours template, so the weekly ritual has no shortcut.
- **Proposed change:** In the availability sheet: "Repeat last week" copies last week's published windows onto the coming week, previewing "will open 34 · 6 already open · 2 blocked", then publishes with Undo. It keeps the law of explicit publication and is the "copy the week" answer SALON.md prefers over recurrence rules.
- **Affected user type:** Solo masters and staff; admins for members.
- **Value:** High for the weekly ritual.
- **Effort:** Small to medium. Reads last week's slots, publishes through the bulk endpoint.
- **Risks:** Last week may have been unusual (holiday). The preview count and Undo make the mistake cheap.

#### R-19 · Booking-page card with QR moves to Страница [RESTRUCTURE]

- **User problem:** The link and QR are needed about once a week, at the desk or when printing; on Home they sit above the day.
- **Proposed change:** The card moves to the top of Страница. Home keeps a one-line "your page: amolie.com/anna · copy" inside the setup card, only until setup completes.
- **Affected user type:** Owners and admins.
- **Value:** Home gets lighter; the card sits next to the thing it represents.
- **Effort:** Small.
- **Risks:** None.

#### R-20 · "All clear" message [REMOVE]

- **User problem:** When nothing needs attention the block still renders a heading and two lines of reassurance.
- **Proposed change:** An empty queue renders nothing. The header line already says how the day looks.
- **Affected user type:** Everyone.
- **Value:** Less to read on the phone.
- **Effort:** Trivial.
- **Risks:** None.

#### R-24 · Two sheet primitives [DEPRECATE]

- **User problem:** The visit card opens in the kit's side sheet; the new-booking form, bulk publish, client form and rules open in an older Tailwind sheet with pill segmented controls and round chips. Two visual worlds inside one flow.
- **Proposed change:** One side sheet primitive for the cabinet (bottom sheet on the phone, right panel on desktop). The four remaining forms migrate to it during the visual pass; the old sheet is deleted.
- **Affected user type:** Everyone; it is the difference between a product and a set of screens.
- **Value:** Consistency, which in Operate mode is trust.
- **Effort:** Medium, mechanical.
- **Risks:** Migration touches the highest-frequency form (new booking); it is bundled with R-7 so the form is rebuilt once.

## Part 2 · Final Dashboard Home

> **Chosen direction: the daily command centre with a team rendering.** This is the audit's Concept C, built as Concept B plus one alternative rendering of the day section, with the refinement from Part 0. Home answers four questions in order: who is next, what needs my answer, what is the rest of today, and is anything wrong with my time. It shows one number about money, in the header, for finance scope only. It is not an analytics page.

### Hierarchy, top to bottom

```text
PHONE                                      DESKTOP (main + aside)
──────────────────────────────────         ─────────────────────────────────────────────
H1  Header: greeting + facts line          H1  Header: greeting + facts line
H2  Setup card (only while incomplete)     H2  Setup card (only while incomplete)
H3  Now / next                             H3  Now / next strip (one line above the day)
H4  Needs answer (queue)                   ┌─ main ──────────────────┐ ┌─ aside ───────────┐
H5  Today (flat or team-grouped)           │ H5  Today               │ │ H4  Needs answer  │
H6  Time (gap to open · no time ahead)     │                         │ │ H6  Time          │
H7  Team today (salon owner/admin)         │                         │ │ H7  Team today    │
                                           └─────────────────────────┘ └───────────────────┘
```

**Above the fold.** Phone (390 × 844): H1, H3 and the first two rows of H4; when the queue is empty, the first rows of H5. Desktop (1440 × 900): H1, H3, the first six rows of H5, and H4 with H6 in the aside. H7 may sit below the fold on both.

#### H1 · Header [P0]

- **Purpose:** Orient in one glance: who I am, what day it is, how big the day is.
- **Who sees it:** Everyone.
- **Data source:** Account name, organisation name and timezone, today's bookings, today's windows, confirmed items' price snapshots.
- **Primary action:** None. It is a reading.
- **Secondary actions:** "N free windows" links to the calendar day.
- **Content:** Greeting by salon-clock hour. Facts line: date · N bookings · first–last time · N working (team) · expected income (finance scope) · N free windows. Done count in team mode.
- **Empty state:** "No bookings today" replaces the count; the free-windows link stays.
- **Mobile behaviour:** Facts wrap to two lines; nothing is hidden.
- **Priority:** P0, always present.

#### H2 · Setup card [P1 · conditional]

- **Purpose:** Get a new organisation to a bookable page.
- **Who sees it:** Owners and admins, only while a setup step remains.
- **Data source:** Onboarding status.
- **Primary action:** The next step (add a service, set the address, open time).
- **Secondary actions:** "Your page: amolie.com/anna · Copy" (moved here from the QR card).
- **Empty state:** Disappears when setup is complete.
- **Mobile behaviour:** Full width; sits above now/next because a new account has no visits yet.
- **Priority:** P1 while present.

#### H3 · Now / next [P0]

- **Purpose:** Answer "who is next and when" without reading the list.
- **Who sees it:** Everyone. Solo and staff: own next visit. Owner/admin in team mode: the next arrival anywhere, with the master's name.
- **Data source:** Today model (next visit, minutes until, current visit).
- **Primary action:** Open the visit card.
- **Secondary actions:** Call · Write (R-11).
- **Content:** "Next in 18 min · 10:30–12:00 · Sofija Bērziņa · Gel manicure · first visit" or "In chair now · Marta Liepa · until 11:30". Client note excerpt when present.
- **Empty state:** "Day finished" or "No visits today" as one line, no card.
- **Mobile behaviour:** A card with two action buttons; the only card on Home.
- **Desktop behaviour:** A one-line strip above the day list; the duplicate card is gone.
- **Priority:** P0.

#### H4 · Needs answer [P0]

- **Purpose:** Everything that waits for a tap on a visit, in one list with one verb per row.
- **Who sees it:** Everyone. Solo and staff: own rows. Owner/admin: organisation-wide, rows carry the master's name.
- **Data source:** Pending bookings (all dates); bookings whose end passed without a mark (front-desk model, all roles); client cancellations since last visit, with reason.
- **Primary action:** Per row: Confirm / Decline; Completed / No-show; open the cancelled visit.
- **Secondary actions:** "All completed" for the day's ended visits, with Undo. "All" link to the calendar list, posture "upcoming", filter "pending".
- **Content:** Row: shape marker (hollow amber dot = pending, check-square = mark me, struck time = cancelled), client, first-visit marker, services and duration, day and time, master name in team mode, reason text when cancelled.
- **Empty state:** Renders nothing. No heading, no reassurance.
- **Mobile behaviour:** Rows stack; actions are two 44px buttons on the row's second line; Decline asks through the shared confirm sheet.
- **Priority:** P0.

#### H5 · Today [P0]

- **Purpose:** The rest of the day in order, with the gaps between visits visible.
- **Who sees it:** Everyone. Two renderings of one section: flat list with gaps (solo, staff, salon owner with one working person) or team-grouped (owner/admin with two or more working people).
- **Data source:** Today's bookings, today's windows, blocks; team roster for the day in team mode.
- **Primary action:** Open a visit card.
- **Secondary actions:** Flat: "Open" on a gap row (R-6). Team: Complete on an in-chair row, Confirm on a pending next row. Section link to the calendar (day, or team view).
- **Content:** Flat: time, client, service colour dot, service, duration, status dot, first-visit marker; "free until 13:00" rows for gaps; past rows dimmed. Team: group "In chair" then "Next", each row adds the master's photo and name; done count in the heading.
- **Empty state:** "A free day" with the secondary button "Open time" (existing).
- **Mobile behaviour:** Rows at 56px, one column. Team groups collapse to headings with counts when longer than eight rows.
- **Desktop behaviour:** Rows at 44px, table density, same content.
- **Priority:** P0.

#### H6 · Time [P1]

- **Purpose:** Two facts about the master's own time that money depends on.
- **Who sees it:** Gap hint: solo and staff (own day). "No open time for a week": everyone with calendar rights, including owners.
- **Data source:** Open intervals today minus blocks; windows in the next seven days.
- **Primary action:** "Open 12:00–14:00" publishes directly with Undo (R-6).
- **Secondary actions:** "Open time" leads to the availability sheet when nothing is open ahead.
- **Empty state:** Renders nothing when there is no gap and time is open ahead.
- **Mobile behaviour:** Two single-line rows under Today.
- **Priority:** P1.

#### H7 · Team today [P1 · salon]

- **Purpose:** Who is working and how loaded each person is.
- **Who sees it:** Salon owners and admins only. Never solo, never staff.
- **Data source:** Team roster for today with bookings per member.
- **Primary action:** Row → that member's day in the calendar (R-21).
- **Secondary actions:** Heading link → team view of the calendar.
- **Content:** Row per working member: photo, name, "3 bookings · 09:00–16:30". Free hours per member is backlog (R-17).
- **Empty state:** Salon with one person and setup complete: the invite prompt ("Add a master") lives here as the module's empty state instead of a separate block.
- **Mobile behaviour:** Last on the page; rows at 56px.
- **Priority:** P1.

### What is deliberately not on Home

- KPI tiles, charts, utilisation bars, revenue trend. Finance owns the period view.
- Tomorrow or the week. The calendar opens on the day strip.
- Recent clients, client shortcuts. ⌘K and Clients are faster.
- An activity feed. The bell already carries cross-screen news.
- The booking-page card with QR. It moved to Страница.
- A "create booking" button. The Create menu, the FAB and ⌘K already cover it on every screen.

## Part 3 · Role and account adaptation

> **Decision: B. One dashboard with adaptive modules.** The capability map already does this. Three separate structures would triple what must stay honest; one universal dashboard would show a staff member income lines and a team pulse that are not hers. No new permission is needed; the only gate that changes scope is the existing "can view team calendar".

### The three inputs

1. **Organisation type**, chosen at registration: solo or salon. Solo never gets team modules.
2. **Role scope**: owner and admin see the organisation; a master sees her own calendar, bookings and income. The client book is shared by all three roles.
3. **Working people today**: in a salon, team modules appear with the second person.

| Module          | Solo professional                                      | Salon owner / admin (≥2 working)               | Staff master in a salon                |
| --------------- | ------------------------------------------------------ | ---------------------------------------------- | -------------------------------------- |
| H1 Header       | own day, income                                        | whole salon, working count, income, done count | own day, no income line                |
| H2 Setup card   | yes                                                    | yes                                            | never                                  |
| H3 Now / next   | own                                                    | next arrival anywhere, with master's name      | own                                    |
| H4 Needs answer | own pending, unmarked, cancellations                   | organisation-wide, rows named                  | own                                    |
| H5 Today        | flat list with gaps                                    | team-grouped: in chair / next                  | flat list with gaps                    |
| H6 Time         | gap + no time ahead                                    | no time ahead only                             | gap + no time ahead                    |
| H7 Team today   | never                                                  | yes                                            | never                                  |
| Navigation      | Сегодня, Календарь, Клиенты, Услуги, Страница, Финансы | + Команда; Финансы with Выплаты                | Сегодня, Календарь, Клиенты, Заработок |
| Calendar views  | day / week / list                                      | team / day / week / list                       | day / week / list, own                 |

A salon with one working person renders exactly like solo, except that Команда is in navigation and H7 shows the invite prompt as its empty state. A salon admin renders like the owner minus payouts and organisation settings. The exact permission matrix is in the brief's role section.

## Part 4 · Information architecture

Six changes, none of them for looks: two sections removed by merging, one screen re-homed, one card moved, one duplicate setting removed, the phone tabs fixed. Nothing renamed, no depth added.

#### Current (dashboard-v2)

- Сегодня (all)
- Календарь · day / week / list (+ team) (pending badge here)
- Записи (route only; search, export, rules, inline confirm)
- Ресепшен (salon owner/admin, ≥2 people)
- Клиенты · client page (all)
- Услуги · Список / Категории / Витрина (owner, admin)
- Страница · Содержание / Оформление / Запись (owner, admin)
- Команда · member page (salon owner/admin)
- Финансы (→ Выплаты) (owner, admin)
- Заработок (staff in salon)
- Рабочее место: Настройки, Помощь (all)
- Phone: first 3 items + Ещё (salon loses Клиенты)

#### Proposed

- Сегодня · adaptive, team mode for salons (absorbs Ресепшен)
- Календарь · day / week / list (+ team) (list = bookings hub; badge stays)
- ~~Записи~~ (redirects to calendar list)
- ~~Ресепшен~~ (redirects to Сегодня)
- Клиенты · client page (unchanged)
- Услуги · Список / Категории / Витрина (Витрина owns display toggles)
- Страница · Содержание / Оформление / Запись (gets the link + QR card)
- Команда · member page (unchanged)
- Финансы (→ Выплаты) (unchanged)
- Заработок (unchanged)
- Рабочее место: Настройки, Помощь (unchanged)
- Phone: Сегодня · Календарь · Клиенты · Ещё (pinned by key, all roles)

### Proposed primary navigation, item by item

| Order | Item      | Group             | Icon purpose                                                              | Visible to                                      | Primary nav or settings         |
| ----- | --------- | ----------------- | ------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------- |
| 1     | Сегодня   | Work (unlabelled) | Home. "Where am I now."                                                   | Everyone                                        | Primary; phone tab 1            |
| 2     | Календарь | Work              | Calendar grid. Carries the pending count on the icon.                     | Everyone with calendar rights (all three roles) | Primary; phone tab 2            |
| 3     | Клиенты   | Work              | People. Distinct from the team glyph.                                     | Everyone                                        | Primary; phone tab 3            |
| 4     | Услуги    | Work              | Price list.                                                               | Owner, admin                                    | Primary; under Ещё on the phone |
| 5     | Страница  | Work              | Globe: what the world sees.                                               | Owner, admin                                    | Primary; under Ещё              |
| 6     | Команда   | Work              | Needs its own glyph; today it reuses the Clients icon, which is a defect. | Salon owner, admin                              | Primary; under Ещё              |
| 7     | Финансы   | Work              | Money earned. Выплаты is a sub-page reached from here.                    | Owner, admin                                    | Primary; under Ещё              |
| 7′    | Заработок | Work              | Banknote: own pay.                                                        | Staff in a salon (replaces Финансы for them)    | Primary; under Ещё              |
| 8     | Настройки | Рабочее место     | Account, photo, push, password, activity log.                             | Everyone (log: owner)                           | Settings                        |
| 9     | Помощь    | Рабочее место     | Opens mail to support; there is no help centre and none is promised.      | Everyone                                        | Settings                        |

**Phone tabs.** Three tabs pinned by key, Сегодня · Календарь · Клиенты, then Ещё. The rule "first three by list order" produces the same result once Ресепшен retires, but pinning by key guarantees that a future item can never push Clients out silently.

**What stays out of primary navigation.** Booking rules (auto-confirm, self-cancel deadline) live in Страница → Запись and in the rules sheet on the calendar list; both render one form. Organisation settings stay split as they are (page content on Страница, price on Услуги, account on Настройки); consolidating them is not worth a new section.

## Part 5 · Final workflows

The eleven highest-frequency flows, each with a verdict. "Steps" counts taps or clicks from the screen the master is on; scrolling is counted where it dominates.

#### Create booking [RESTRUCTURE]

- **Current:** Create menu, FAB, ⌘K, or click an empty cell → quick menu → New booking. Sheet: [member] → time (windows grouped by day, or custom) → one service → client from a native select or typed name and phone → note → Create. A window shorter than the service fails at Create with a conflict error. 6–7 steps, plus the retry loop.
- **Proposed:** Same entry points. Sheet: client typeahead (existing client or new name and phone) → services multi-select with "1 h 45 min · 65 €" → time: windows that fit, unfit ones muted with "needs 4 windows", or custom → note → "Create · 14:00–15:45". Member choice stays first in salons.
- **Steps saved:** 0–1 on the happy path; the conflict retry (3 steps) and the duplicate client disappear.
- **Why better:** Duration decides which windows fit; this is the public flow's law, and the master deserves the same guarantee her client has.

#### Edit booking [KEEP]

- **Current:** Open the visit (any screen) → Edit → sheet with services (multi), reschedule block with member, name, phone, Instagram, note → Save. 3 steps.
- **Proposed:** Unchanged. The card gains the client strip (R-4) and "Write" (R-11), which do not add steps.
- **Steps saved:** 0.
- **Why:** The one-card mechanic is the product's best structural decision; do not touch it.

#### Cancel booking [KEEP]

- **Current:** Open the visit → Cancel → confirm sheet names the client → confirmed; client is notified. 3 steps.
- **Proposed:** Unchanged. A cancellation has social cost; a confirm question is right, Undo would be wrong.
- **Steps saved:** 0.

#### Block time [KEEP]

- **Current:** Create → Block time, or click/drag an empty range → quick menu → Block (day, hours, member prefilled) → reason preset (lunch, break, personal, vacation) → Save; Undo in the toast. 3–4 steps.
- **Proposed:** Unchanged.
- **Steps saved:** 0.
- **Why:** Already the shortest honest form in the product, and it holds the time against every other path.

#### Find client [KEEP]

- **Current:** ⌘K from anywhere, type name or digits → Enter. Or Clients tab → search field. 2 steps.
- **Proposed:** Unchanged. The same matcher powers the booking form's client field (R-7), so "find" and "book" become one motion.
- **Steps saved:** 0 here; 2 inside create booking.

#### Create client [KEEP]

- **Current:** Clients → Add → form (name, phone, email, Instagram, notes, flag) → Save. 3 steps. Implicitly: any booking with a new phone creates the client.
- **Proposed:** Unchanged. The booking form's typeahead makes the implicit path visible: "Create Elīna Kalniņa as a new client" appears as the fall-through row.
- **Steps saved:** 0; fewer duplicates.

#### View client history [POLISH]

- **Current:** From a visit: card → Clients → search → client page → history. 4 steps. From Clients: row → page. 2 steps.
- **Proposed:** From a visit: card → client strip link → page. 2 steps. The page itself is unchanged (upcoming, history table, four tiles, notes, flag, block).
- **Steps saved:** 2 from the visit; the strip alone answers "regular or first-timer" with 0 steps.

#### Manage availability [ADD to KEEP]

- **Current:** Calendar → Рабочее время → one window, or Open period (dates, weekdays, start, end, step, preview) or Clear period. Or click/drag on the grid → Open. Weekly: 1 + 8 fields.
- **Proposed:** Same sheet plus "Repeat last week" (preview count, Undo). From Home, "Open 12:00–14:00" publishes in one tap.
- **Steps saved:** Weekly ritual: 8 fields → 2 taps. Gap: 1 + 4 fields → 1 tap.
- **Why:** Keeps explicit publication, removes the retyping. The grid interactions stay exactly as they are.

#### Manage services [KEEP]

- **Current:** Услуги → list / categories / showcase → add or edit in a sheet (name, duration, price, colour, category, add-on chain, performers with own price).
- **Proposed:** Unchanged, minus the duplicate prices toggle on the Page form (R-12).
- **Steps saved:** 0.

#### View today's workload [RESTRUCTURE]

- **Current:** Phone: open app → scroll past up to five aside blocks → day list. Desktop: day list left, duplicate next-visit card right.
- **Proposed:** Phone: open app → now/next and the queue are the first screen; the day is the second. Desktop: strip + day on the left, queue on the right.
- **Steps saved:** Up to four screens of scrolling on the phone.

#### Salon owner checking the team's schedule [RESTRUCTURE]

- **Current:** Home (flat list with names, pulse with one shared link) or Ресепшен (grouped, inline actions) or Calendar → team view. Three places, two of them for the same person on the same morning.
- **Proposed:** Home in team mode: queue (organisation-wide), in chair / next with inline Complete and Confirm, team rows → each member's day. Calendar team view unchanged for the grid.
- **Steps saved:** One navigation item and one screen; Clients returns to the tab bar.

## Part 6 · New feature decisions

#### [APPROVE] for this redesign

- N-1 Visit-mark queue with "All completed" (F-1)
- N-2 Client context in the visit and rows (F-2, phone-key version)
- N-3 One-tap gap opening with Undo (F-3a)
- N-4 "Repeat last week" for windows (F-3b)
- N-5 Manual booking at parity: typeahead, multi-service, fit check (F-4)
- N-6 "Write to client" deep links (F-5)
- N-7 Cancellation reason shown where the cancellation is shown (F-8)

#### [BACKLOG]

- Lapsed-clients filter (F-6)
- Free hours per member in Team today (F-7)
- Week's expected income in Finance (F-9)
- Nullable client link on bookings, backfilled by phone
- Server-side client search once a salon passes ~1 000 clients
- Morning digest push, once the queue exists to describe
- Waitlist / "tell me when a window opens"

#### [REJECT]

- KPI tiles, charts, utilisation or no-show rates on Home. Finance owns the period view; Home answers "now".
- Working-hours template or generated slots. Breaks the law of explicit publication; salon shifts are a separate planned task.
- No-show risk scores, AI suggestions, smart scheduling. No signal beyond a per-client count; a score would be a guess dressed as insight.
- Resources (chairs, rooms), multi-location. No tables, deferred deliberately.
- Reviews, payments, deposits, loyalty, promo codes. Roadmap; the UI may not promise them.
- Two-way Google or Apple calendar sync. A system, not a feature; the client-side .ics exists.
- In-app chat or inbox. Competes with the messengers masters use; deep links give most of the value.
- Customisable widget layout. Configuration as a substitute for a decision; the adaptive modules decide per role.
- Separate dashboards per role. Part 3.
- Gamification, streaks, goals. Wrong tone for a professional tool.
- A help centre. Mail to support is honest; an empty help page is worse than none.
- A display typeface for cabinet titles. Part 7, M4.

### Approved features, specified

#### N-1 · Visit-mark queue with "All completed" [S]

- **Behaviour:** Any visit in pending, confirmed or expired state whose end time has passed appears as a queue row with Completed and No-show. A day-level "All completed (3)" marks every ended visit of today; the toast says "3 visits completed · Undo" for 8 seconds. No-show keeps its existing Undo toast. Rows leave the queue on action.
- **Where:** Home H4 for every role; the calendar list's attention rows (same component).
- **Who:** Everyone with booking rights, own scope for staff.
- **Required data:** Bookings with status, start, item durations.
- **Backend supports:** Yes. The front-desk model computes it from the bookings the dashboard already fetches.
- **Backend changes:** None required. Optional: a batch status endpoint so "All completed" is one request instead of N.
- **Complexity:** Small.

#### N-2 · Client context in the visit [S–M]

- **Behaviour:** The visit card resolves the client by phone key and shows a strip: name, "first visit" or "7 visits · last 12 Aug", flag, blocked state, note excerpt (two lines), link "Open client card". Day rows, calendar cards, queue rows and now/next show a small first-visit marker. No match: the strip says "Not in your client base" with "Add".
- **Where:** Visit card, Home rows, calendar cards, calendar list, queue.
- **Who:** Everyone; the client book is shared across roles.
- **Required data:** Clients with visit stats, notes, flag, blocked; booking guest phone.
- **Backend supports:** Yes. Both lists are already fetched; matching is client-side, as the Clients screen does today.
- **Backend changes:** None now. The exact link (client id on bookings) is backlog.
- **Complexity:** Small for card and rows; medium if the calendar grid must load the client list where it does not yet.

#### N-3 · One-tap gap opening [S]

- **Behaviour:** H6 shows "Free 12:00–14:00 · Open". Tap publishes 30-minute windows across the range for the viewer's own member, skipping blocked or already-open times, then toasts "Opened 12:00–14:00 · Undo". Undo deletes exactly the created windows.
- **Where:** Home H6.
- **Who:** Solo and staff (own day). Not owners for other people's time.
- **Required data:** Today's open intervals, blocks.
- **Backend supports:** Yes; bulk publish returns the created ids.
- **Backend changes:** None.
- **Complexity:** Small.

#### N-4 · Repeat last week [S–M]

- **Behaviour:** In the availability sheet, a button "Repeat last week" reads the windows published Monday to Sunday of the previous week for the selected member, shifts them seven days, and previews "Will open 34 · 6 already open · 2 blocked · 1 in the past". Confirm publishes; toast with Undo. If last week had no windows the button explains that instead of hiding.
- **Where:** Availability sheet, above "Open period".
- **Who:** Anyone who publishes time; admins for members.
- **Required data:** Published slots of the previous week; blocks of the coming week.
- **Backend supports:** Yes: slots are readable by range and bulk publish skips conflicts and reports them.
- **Backend changes:** None.
- **Complexity:** Small to medium.

#### N-5 · Manual booking at parity [M]

- **Behaviour:** Client field is a typeahead over the address book (name or digits), with "New client" fall-through that reveals name and phone. Services are a multi-select list grouped by category, with a running total of duration and price. Time offers windows grouped by day; a window shows muted with "needs 4 windows" when the following windows cannot hold the visit; custom time remains. The primary button reads "Create · 14:00–15:45". Member choice, when present, comes first and filters windows as today.
- **Where:** New booking sheet, wherever it opens.
- **Who:** Everyone with booking rights.
- **Required data:** Services with durations and prices, open windows, clients.
- **Backend supports:** Yes. The create endpoint accepts a list of service ids; the fit check reuses the open-intervals model the calendar already has.
- **Backend changes:** None.
- **Complexity:** Medium.

#### N-6 · Write to client [S]

- **Behaviour:** "Write" opens a small menu: SMS, WhatsApp, Instagram (only when a handle exists). SMS and WhatsApp may carry an optional prefilled line ("Hi Sofija, running 10 minutes late") that the master edits in the messenger. Nothing is sent by AMOLIE.
- **Where:** Now/next, visit card, client page, next to "Call".
- **Who:** Everyone.
- **Required data:** Phone, Instagram handle.
- **Backend supports:** Yes.
- **Backend changes:** None.
- **Complexity:** Small.

#### N-7 · Cancellation reason [S]

- **Behaviour:** When a client cancels with a reason, the queue row, the bell entry and the visit card show it in quotes under the time.
- **Where:** Home H4, bell, visit card.
- **Who:** Everyone.
- **Required data:** Cancellation reason on the booking.
- **Backend supports:** Yes; the field is already returned.
- **Backend changes:** None.
- **Complexity:** Small.

## Part 7 · Design system evolution

The cabinet has two written authorities that disagree: the six laws in UI_GUIDELINES.md §2.0 (radius 999 or 0, no frames, opacity hierarchy, Onest 300/400, 900 ms reveal) and the kit stylesheet that every screen and all seventy artboards are built from (10/14/20 px radii, bordered cards, Geist, three weights). The code follows the kit. **Proposal: the kit wins, and three of the six laws are adopted into it.** DESIGN.md is untouched; it governs the public page and defers the cabinet to UI_GUIDELINES.md. This is a proposal, not an edit.

### KEEP

- Semantic token names (background, raised, sunken, border, ink, accent, success, warning, danger) and the bridge that maps them to the kit. Components never know the theme.
- Light and dark themes with measured contrast; a pair cannot enter the tokens unmeasured.
- One accent for the whole product; semantic colours are a separate group from the accent.
- Status as dot + word, three channels (form, word, colour).
- Tabular numerals wherever digits align; money and time set as data.
- 44 px minimum tap target held in the primitives, extended by pseudo-element where the element cannot grow.
- Label above field, helper always in the markup, error replaces helper with an icon.
- No glass, no gradients, flat surfaces in the cabinet.
- Bottom sheet on the phone, side panel on desktop, explicit close plus swipe.
- Skeletons that mirror the final shape; empty states that teach; error banners with Retry.
- Section hint line under every title; one word, one meaning across the cabinet.
- Time belongs to the salon (timezone law). Dark and light status colours follow the palette, not the visitor's phone.
- Icons: outline only, no fills; destructive actions always carry text.

### MODIFY

#### M1 · Radius [MODIFY]

- **Current rule:** Guideline: "either 999 px or 0; nothing in between". Kit and code: 10 px controls, 14 px cards, 20 px large cards, 8 px chips.
- **Proposed rule:** One small radius scale for the cabinet, as the kit has it, with the pill reserved for chips, status dots, the FAB and segmented tabs. The 999-or-0 law remains a rule of the landing and the poster world only.
- **Why:** Zero radius reads as the poster world; the cabinet is a separate territory and its built form is tested. Designers may re-tune the values, not the principle of one scale.
- **Affected:** Card, Input, Button, Sheet, chips, tables.

#### M2 · Surfaces and frames [MODIFY]

- **Current rule:** Guideline law 4: "each block in its own frame is a defect". Kit practice: every block is a white card with hairline and shadow, and rows inside are bordered again.
- **Proposed rule:** Adopt the law's intent, not its letter. A card marks an object: a visit, a client, a sheet, a metric, the now/next card on the phone. Sections separate by whitespace and a title; lists sit directly on the paper with hairlines. One whisper shadow exists, for floating layers only (sheets, popovers, toasts).
- **Why:** This single change moves the look from admin template to considered product. It is the highest-leverage visual decision.
- **Affected:** Home blocks (pending, attention, next-visit, gap, pulse), calendar list, client page sections, team page sections.

#### M3 · Accent roles [MODIFY]

- **Current rule:** Guideline law 2: accent in two roles, the booking button and booked time. Kit: also links, "on" chips, count badges, selected table rows, the next-visit label.
- **Proposed rule:** Accent in three roles: the primary action, booked time in the calendar, and the active navigation marker. Links are ink with underline on hover; counts are neutral or amber (waiting); selection is a sunken surface; "on" chips are ink-on-sunken.
- **Why:** The accent is a verb. Used as decoration it stops meaning "this books".
- **Affected:** Anchor styles, chip "on" state, nav count, table selection, pending badge, pink badges.

#### M4 · Typography [MODIFY]

- **Current rule:** Guideline: Onest, two weights (300 display, 400 text), fluid display size. Kit and code: Geist, weights 400/500/600, plus 22 inline pixel sizes across features.
- **Proposed rule:** One text family across the cabinet, chosen by the designer from faces with complete Cyrillic and Latvian diacritic coverage (Geist, Onest, or another passing that filter). Three weights at most (regular, medium, semibold); no 300. A fixed scale of seven roles: 12 meta, 13 dense, 14 body, 16 strong, 20 title, 28 page, 32 metric. Inline sizes are forbidden. No display or serif face in the cabinet.
- **Why:** Operate surface: one family, fixed scale, hierarchy by size and weight. The public page is where the master's chosen display faces live; the cabinet is the quiet room behind it.
- **Affected:** Every feature; the kit's type roles; the global weight-flattening selector, which is deleted.

#### M5 · Motion [MODIFY]

- **Current rule:** Guideline: one curve; block appearance 900 ms, 28 px rise, 14 px blur, staggered; one signature interaction per screen.
- **Proposed rule:** One curve kept. Motion only for state change: sheet enter and exit 200–260 ms, toast 200 ms, row leaving the queue 180 ms, the "now" line ticking. No page-load choreography, no rise, no blur. Reduced motion removes all of it.
- **Why:** The master opens the cabinet forty times a day into a task. A 900 ms reveal is watched once and endured thereafter. The 900 ms rule stays on the landing where it was designed.
- **Affected:** The rise class and component, sheet animations, toasts.

#### M6 · Density [MODIFY]

- **Current rule:** Guideline: density dial 3, "large cards and much air" everywhere. Code: 56 px rows and 13.5 px tables at 12 px cell padding.
- **Proposed rule:** Two densities by device, not by screen. Phone: 56 px rows, 20 px side margins, generous. Desktop: 40–44 px list rows, 13.5 px tables, the day list at table density. Never phone density on a 1440 px screen.
- **Why:** A salon owner reads twenty visits; air is premium on the phone and waste on the desk.
- **Affected:** Day list, calendar list, client list, team list, queue.

#### M7 · Sheets [MODIFY]

- **Current rule:** Two primitives coexist (kit side sheet; older Tailwind sheet with pill controls).
- **Proposed rule:** One side sheet primitive; the older one is deleted after the four forms migrate. Footer with the primary action lives outside the scroll area.
- **Why:** The visit card and the booking form must open in the same world.
- **Affected:** New booking, bulk publish, client form, rules.

#### M8 · Icons [MODIFY]

- **Current rule:** Guideline names Phosphor Regular; the kit ships its own outline set at 1.75 stroke; Team reuses the Clients glyph.
- **Proposed rule:** One outline set, the kit's, at one stroke weight; each navigation item has a distinct glyph; the queue uses three shape markers (hollow dot, check-square, struck time) instead of icons.
- **Why:** Consistency of stroke is what makes an icon set read as one; two sets never do.
- **Affected:** Navigation, queue rows.

#### M9 · Accent contrast [CONFIRM]

- **Current rule:** Guideline: white on the brand pink fails AA, so the button label is ink. Kit: a deeper pink for the button with white text.
- **Proposed rule:** Keep the kit's deep pink with white text; it measures about 4.6:1 and passes. Any accent the designer proposes must be re-measured on white, on paper and in dark, before it enters the tokens.
- **Why:** The rule was written for the brand pink; the kit already solved it by darkening the button.
- **Affected:** Primary button, booked-time cell.

### DEPRECATE

- §2.0 "six laws" as the cabinet's constitution. Replaced by the kit-based rulebook above; laws 2, 4 and 6 survive in modified form (M3, M2, M5).
- The Tailwind sheet primitive (M7).
- The 900 ms rise reveal in the cabinet (M5).
- Accent-coloured links, chips, counts and selections (M3).
- Inline font sizes (M4).
- The QR card on Home and the "all clear" text (R-19, R-20).
- The Ресепшен and Записи sections as navigation entries (R-5, R-8).

### ADD

- **Queue row**: shape marker, subject, context, one or two inline actions, 44 px each.
- **Inline row action with Undo**: the pattern behind Completed, No-show, Confirm and "All completed".
- **Client strip**: identity, count, last visit, flag, note excerpt, link.
- **First-visit marker**: one small mark, defined once, used on every row that names a client.
- **Now / next strip** (desktop) and **now / next card** (phone).
- **Section without card**: title, hint, list on paper.
- **Density modes**: phone and desktop row heights as tokens.
- **Type roles**: the seven-step scale as classes; nothing else.
- **Write-to-client menu**: three deep links, one component.
- **Member photo in rows**: 20 px with focal point, initials fallback; clients never get photos.

## Part 8 · Visual character

What AMOLIE should feel like before any component is drawn. The cabinet is a working instrument a master opens standing, between clients, forty times a day; it must feel like a good tool made by people who understand the craft, not like software that happens to be about beauty.

### Five personality attributes

1. **Composed.** Nothing on the screen competes. The day reads top to bottom in one breath; the eye lands on what needs a hand and rests everywhere else.
2. **Exact.** Time and money are set like data: aligned digits, real durations, honest counts. The interface is precise the way a good appointment book is precise.
3. **Warm, not sweet.** Paper-warm neutrals and one rose accent used as a verb. Nothing pink for pink's sake; the warmth is in the greys, the spacing and the words.
4. **Authored.** It looks decided, not assembled: one type family tuned carefully, one radius scale, one shadow, one curve. The craft is in the details, the way a tailored garment shows it in the seams.
5. **Quietly attentive.** It notices for the master: the first-timer, the visit nobody marked, the gap worth selling, the client who cancelled and why. It tells her once, in place, and never nags.

### Five things it must not feel like

1. **An enterprise console.** No KPI tiles, no dashboards of dashboards, no admin chrome for its own sake.
2. **A SaaS template.** No stock sidebar with a gradient logo, no cards-in-cards, no identical rounded blocks with an accent rail.
3. **Beauty-blog software.** No blush washes, no script faces, no floral or sparkle iconography, no "you're glowing" copy.
4. **A fashion lookbook.** No oversized serif headlines, no black-and-gold, no editorial asymmetry in a tool that must be predictable.
5. **An AI product.** No purple-to-blue gradients, no glow, no orchestrated load sequences, no "smart" language.

### Typography character

One humanist-leaning grotesk with true Cyrillic and Latvian diacritics, set in three weights. Titles slightly tight, body open, meta small but never faint. Numbers are the typographic heroes: time, duration, price, counts, all tabular. No display face, no serif, no italics in the UI. Words are short, in the master's language, without exclamation marks and without the long dash as a stylistic pause.

### Density philosophy

Calm on the phone, capable on the desk. The phone gets one column, 56 px rows and 20 px margins because it is used one-handed and standing. The desktop gets table density because a salon owner reads twenty visits and eight people. Air is spent between sections, not inside every row.

### Surface philosophy

A warm paper ground; white for objects that are things (a visit, a client, a sheet); a sunken tone for what is inset or selected. Hairlines separate meaning, not decoration. One whisper shadow lifts floating layers only. No glass, no gradients, no frames around frames. Depth is tonal, and mostly absent.

### Colour philosophy

Near-neutral greys with a faint warm bias; ink that is not pure black. One accent in the rose family, appearing where a booking is made or shown: the primary button, booked time, the active navigation mark. Semantic colours by rule and never as brand: amber waits, green is done, red is cancelled or absent. Service colours (already chosen by the master per service) and member photos carry identity in lists, so the palette never has to. Dark theme is the same instrument at night, not an inversion.

### Motion philosophy

Motion is a state change made legible, nothing more. A sheet slides in and out, a toast arrives and leaves, a queue row folds away when answered, the "now" line moves with the clock. One curve, 150–260 ms. No reveals on load, no stagger, no parallax. Reduced motion removes everything and loses nothing.

### Interaction philosophy

Inline first, sheet second, dialog last. Every row that names a visit can act on it where it stands. Reversible actions get Undo; the socially costly one, cancelling a client, gets a question. The phone is designed for the thumb: primary actions in the lower half, three tabs, one floating create button. The desktop is designed for the keyboard: ⌘K reaches any client, visit or command. Nothing moves the master's eye away from the day unless she asked.

## Part 9 · Sign-offs and hand-off

Four decisions belong to the owner before the brief goes to a designer. Everything else in this document can proceed on approval of the whole.

1. **Retire Ресепшен** as a section; its model becomes Home's team mode (R-8). Nothing is lost, the route redirects.
2. **Re-home Записи** inside the calendar's list view with all of its tools (R-5). The route redirects and keeps the booking id.
3. **The kit wins over the six laws** for the cabinet, with M1–M9 as the new rulebook (Part 7). UI_GUIDELINES.md §2.0–2.7 will be rewritten only after this is confirmed; DESIGN.md is not touched.
4. **One text family, no display face** in the cabinet (M4). The designer chooses the family within the Cyrillic and Latvian filter.

Order of work after sign-off follows the audit's sequence: Home order, queue, client strip, inline confirm, gap tap and Write links first (small, no API); then the two structural moves; then the booking form and Repeat last week; then the visual pass once screens stop moving. The companion document, **AMOLIE Dashboard — Visual Design Brief**, is self-contained for a designer without code access and freezes the architecture above.
