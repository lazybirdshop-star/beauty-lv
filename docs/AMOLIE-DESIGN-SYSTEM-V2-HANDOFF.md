_Document 4 · Step 4 · design-system handoff · no application code changed in this phase_

# AMOLIE DESIGN SYSTEM V2 — PRODUCTION HANDOFF

How the approved F2 «Материал» direction becomes one production design system inside the existing AMOLIE cabinet. Written for the engineer who will implement Step 5 without inventing styling, guessing component behaviour, or starting a second system next to the first.

- Branch **dashboard-v2**
- Date **12 September 2026**
- Status **for owner review, then Step 5**
- Functional truth **the running cabinet** (`apps/web/src/features/*`, `components/ui/*`)
- Product truth **`docs/PRODUCT-UX-DIRECTION.md`** (frozen)
- Visual truth **`docs/AMOLIE-DESIGN-SYSTEM-V2.md`, the design guidelines attached to the Flowstep file «AMOLIE — Dashboard Visual Exploration 2026», the eight ★ F2 screens**
- Current system **`globals.css`, `features/dashboard-shell/styles/*.css`, `UI_GUIDELINES.md`, `DESIGN_SYSTEM.md`, `DESIGN.md`**
- Quality filter **Impeccable, Operate mode**
- Supersedes **the Phase 4 translation plan of the same day; its content is folded in here so there is one handoff, not two**

> **Naming note.** The brief refers to `design.md`. In this repository `DESIGN.md` specifies the public master page; the cabinet's rulebook is `UI_GUIDELINES.md` §2 plus `DESIGN_SYSTEM.md`. §14 covers all three. The brief also refers to a "final visual-direction document"; it is `docs/AMOLIE-DESIGN-SYSTEM-V2.md` together with the Flowstep design guidelines, which are identical in substance.

---

## 1 · Design principles — the production reading of F2

The eight screens are one language. Its grammar, stated so that a screen not yet drawn can still be built in it.

1. **A warm desk with white objects on it.** The page ground is ivory (`--bg`). Anything that _is_ something — a visit, a day, a panel, a queue — is a white surface lifted by one soft, wide shadow. Sections inside a surface are separated by air and one full-width hairline, never by a second box. Two surfaces never nest.
2. **Colour belongs to the service.** Every object that represents time carries a 6 px rounded bar in its service colour on its left edge: day rows, calendar blocks, the time figure in a visit panel, team-mode rows. People are told apart by photograph and name; nothing is coloured per person, per status family, or per navigation item.
3. **Selection is elevation.** The active nav item, the chosen day, the selected booking, the active segment: all lift with the `raised` shadow (in dark theme, plus one tonal step). Never a border, never an outline, never an accent fill.
4. **Free time is rose.** An open window, a gap in the day, the Time module: a rose surface with rose ink, and where there is room a rose pill that sells it. Sellable time is found by colour on any screen.
5. **Numbers are the heroes.** Time, duration, price, counts: tabular figures in every language, aligned in columns. Big moments (the next visit, the visit panel, running totals, the now marker, the greeting) may use the expressive face; nothing else does.
6. **Two densities, one language.** Spacious (solo, phone, panels) and compact (team grid, dense lists). The register changes row height, block radius, slot height, whether the client portrait is shown. It changes nothing else.
7. **One accent, used generously but only as a verb.** Rose is the primary action, the active dot, the now marker, the service-time bars' family, the free-time button. Status is sage / amber / red by rule and never as brand.
8. **Operate mode.** Familiar affordances, no page-load choreography, motion only for state change (150–260 ms, one curve), tabular data, skeletons not spinners, empty states that teach. Brand lives in the material and the details, not in surprise.
9. **Measured, not judged.** No colour pair enters the tokens without a contrast measurement in a test. Where a Flowstep value fails AA as text, the value stays for graphics and a darker text step is used (§3.1). The character is preserved; the implementation is corrected.
10. **Nothing arbitrary on a page.** Pages compose domain components; domain components compose shared primitives; primitives read tokens. Inline pixel sizes and hex literals in features are lint errors by the end of Step 5.

---

## 2 · Old → new system summary

The cabinet's look today comes from three disagreeing layers; the new system evolves the one that the shared primitives already depend on and retires the other two.

| Layer today                                                                                                                                                                                                      | What it is                                                                                                                                                                                    | Decision                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic token names read by `components/ui` and all public worlds (`--bg`, `--bg-raised`, `--bg-sunken`, `--ink*`, `--accent*`, `--success/warning/danger*`, `--panel/card/field/control-radius`, `--shadow-*`) | The contract components are written against                                                                                                                                                   | **KEEP the names, MODIFY the values.** New names only for roles F2 has and the vocabulary lacks (§3.1)                                  |
| `globals.css` cabinet block `:root:has([data-surface='dashboard'], [data-surface='client'])` (lines 584–910)                                                                                                     | The August «Дизайн система AMOLIE» world: `#F7F7F8` ground, Onest 300/400, a selector that flattens `font-medium/semibold/bold` to 400, `.rise` 900 ms reveal, lilac `--support`, bento fills | **DEPRECATE and delete.** Replaced by `tokens.css` (§3.10)                                                                              |
| `features/dashboard-shell/styles/kit.css` under `.amolie-app`                                                                                                                                                    | The August artboard kit: Geist, 10/14/20 radii, bordered cards, 36 px buttons, tinted status badges, plus a bridge that overwrites the semantic names with kit values                         | **DEPRECATE.** Its bridge is replaced by `tokens.css`; its classes stay only until the last consumer migrates, then the file is deleted |
| `app.css` (85 KB) and ten sibling stylesheets on kit variable names (`--pink`, `--hair`, `--subtle`, `--r-card`)                                                                                                 | The shell, calendar grid, Home, bookings, clients, team, finance layouts                                                                                                                      | **MODIFY.** Kept alive through a temporary alias file, migrated screen by screen, each screen's dead rules deleted with the screen      |
| `components/ui/*`                                                                                                                                                                                                | World-agnostic primitives on semantic names and Tailwind utilities                                                                                                                            | **KEEP, RESTYLE by tokens, ADD VARIANTS** (§4)                                                                                          |

Three latent defects the migration removes and must not re-introduce:

- Geist is loaded with `subsets: ['latin', 'latin-ext']` and has no Cyrillic; the Russian cabinet today renders in whatever fallback wins. Onest (already loaded with `cyrillic` and `latin-ext`) becomes the UI face.
- The weight-flattening selector in `globals.css` strips `font-semibold` from the shared `Button` and `TabsTrigger` while kit classes keep their 600. One word, two weights.
- "Selected" is drawn three ways: bordered white card in the sidebar, filled pill under the tab-bar icon, white pill with shadow in segments. F2 has one.

Usage of the kit in `features/` and `app/` (`.tsx`): `className="card…"` 58 · `t-meta` 195 · `t-section` 42 · `t-label` 50 · `btn-secondary` 54 · `btn-primary` 26 · tinted status `b-*` 100 · `font-display` 79 · arbitrary `text-[Npx]` 274 (20 distinct values) · inline `fontSize:` 146 · files on the old floating sheet 17 (9 in the cabinet) · files on the kit side sheet 8.

---

## 3 · Token architecture

Three layers: **primitives** (constants) → **semantic** (per theme, per register) → **component** (a few knobs a primitive reads). Components read semantic or component tokens only.

### 3.1 Colour

WCAG 2.2, measured on the surface the text actually sits on: text ≥ 4.5:1, large text and graphics ≥ 3:1. Values marked ✱ are re-derived from the Flowstep value because the raw value failed as text; the raw value stays for graphics.

**Base surfaces**

| Role (brief)                | Token                             | Light                                          | Intended use                                                                                                |
| --------------------------- | --------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Application background      | `--bg`                            | `#F3EEE9`                                      | The desk. Page ground, the "hidden window" block, the "All completed" flat pill                             |
| Primary surface             | `--bg-raised`                     | `#FFFFFF`                                      | Any object: card, panel, phone row, selected block, nav pill, toolbar pill                                  |
| Secondary surface           | `--bg-inset` **new**              | `#F7F3EF`                                      | The recess: fields, client strip, booked block fill, note, hover of rows, service chips in the booking form |
| Elevated surface            | `--bg-lifted` **new**             | `= --bg-raised` (dark theme: one step lighter) | The lifted state's background; components read this, never `--bg-raised`, for selection                     |
| Muted surface               | `--bg-sunken`                     | `#EAE3DC`                                      | Blocked time, unfit window, disabled fills, skeleton                                                        |
| Interactive / hover surface | `--bg-hover` **new**              | `= --bg-inset`                                 | Hover of list rows, empty calendar cells, menu items                                                        |
| Selected surface            | `--bg-lifted` + `--shadow-raised` | —                                              | Rule 03; there is no separate "selected fill"                                                               |
| Brand-tinted surface        | `--bg-free` **new**               | `#F9E8EE`                                      | Free time, the Time module, the Call button, the running-total strip                                        |

Today `--bg-sunken` carries both "inset" and "off". F2 separates them: every current `bg-bg-sunken` use in `components/ui` is re-pointed by meaning (hover, track, segment track → `--bg-inset`; disabled, skeleton → `--bg-sunken`).

**Text**

| Role              | Token                                     | Light                            | Measured                                                                                                                          |
| ----------------- | ----------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Primary           | `--ink`                                   | `#221C19`                        | 14.6:1 on `--bg`                                                                                                                  |
| Secondary         | `--ink-soft`                              | `#4B423C`                        | ≈8.5:1 on `--bg`                                                                                                                  |
| Tertiary / subtle | `--ink-faint`                             | ✱ `#6D645E` (Flowstep `#7C726B`) | 4.54 on sunken, 5.01 on bg, 5.23 on inset, 4.90 on free, 5.78 on white. The raw value measured 3.69–4.25 on four of five surfaces |
| Disabled          | `--ink-faint` on `--bg-sunken`            | —                                | 4.54:1; no separate token                                                                                                         |
| Inverse           | `--accent-contrast`, `--success-contrast` | `#FFFFFF`                        | Only on filled buttons; there is no ink-on-dark surface in the cabinet (toasts are raised surfaces)                               |

There is deliberately no fourth grey. Hierarchy below `--ink-faint` is done by size, not by a lighter colour.

**Border / divider**

| Role                                | Token             | Value                  | Use                                                                                            |
| ----------------------------------- | ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| Subtle structural divider           | `--border`        | `rgb(34 28 25 / 10%)`  | The only divider inside a surface: between sections, under a column head, between compact rows |
| Standard divider                    | `--border`        | same                   | One weight; there is no second divider                                                         |
| Strong divider / interactive border | `--border-strong` | `rgb(34 28 25 / 15%)`  | Outline of the secondary button only                                                           |
| Selected border                     | none              | —                      | Rule 03 forbids it                                                                             |
| Focus ring                          | `--accent`        | 2 px ring, 2 px offset | Every focusable control, `:focus-visible`                                                      |
| Destructive border                  | none              | —                      | Destructive is text or fill, never an outline                                                  |

**Brand**

| Role                   | Token                     | Light                                               | Notes                                                                                                                                                            |
| ---------------------- | ------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary brand          | `--accent`                | `#C9437A`                                           | Primary button fill, FAB, service-bar family, now marker, active dot, queue count pill, free-time button                                                         |
| Brand hover            | `--accent-hover`          | `= --accent`                                        | Hover is elevation, not colour (`--shadow-control` → `--shadow-raised`)                                                                                          |
| Brand active (pressed) | `--accent-active` **new** | `color-mix(in srgb, var(--accent) 90%, var(--ink))` | Pressed fill; the lift returns to zero                                                                                                                           |
| Label on brand         | `--accent-contrast`       | `#FFFFFF`                                           | 4.60:1, confirms M9                                                                                                                                              |
| Subtle brand surface   | `--accent-soft`           | `= --bg-free`                                       | One value, two names (old name kept for `Button ghost:hover` and public worlds)                                                                                  |
| Brand text             | `--accent-ink` **new**    | ✱ `#B73D6F`                                         | 4.55 on free, 4.66 on bg, 5.37 on white. Flowstep writes "12:00 free", "Next in 18 min", "Call" in `#C9437A` on rose (3.90:1, fails). Visually indistinguishable |

**Semantic states.** Three families, each with graphic / text / fill / soft steps. No "informational" colour exists: information is neutral ink.

| Family                          | Graphic (dot, bar, dashed outline)                                          | Text                                                  | Fill (button)                                   | Soft (pill background)     |
| ------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- | -------------------------- |
| Success (done)                  | `--success` `#6E8F72`                                                       | `--success-ink` ✱ `#5A755D` (4.60 inset / 5.08 white) | `--success-fill` ✱ `#607C63` (white label 4.60) | `--success-soft` `#E4EDE6` |
| Warning (waiting)               | `--warning` `#B07A21` (3.72 white, 3.37 inset — the pending dashed outline) | `--warning-ink` ✱ `#90641B` (4.73 inset / 4.53 bg)    | —                                               | `--warning-soft` `#FBEFD6` |
| Destructive (cancelled, danger) | `--danger` `#C23D3D`                                                        | `= --danger` (5.21 white, 4.52 bg)                    | `--danger` (white 5.21)                         | `--danger-soft` `#F9E2E2`  |

**Service tones** (belong to the service, chosen by the master; graphics only, 3:1 on inset verified): `--service-rose #C2748A` (3.09) · `--service-sage #6E8F72` (3.26) · `--service-clay #B5714B` (3.50) · `--service-slate #5E7192` (4.47). `services.color` and `service_categories.color` already exist (nullable hex); the swatch picker's eight current colours (which include the old accent `#A63A5F` and candy amber `#D9A441`) are replaced by these four; stored values keep rendering; `serviceTone(id)` (fallback for `null`) hashes over the four tones instead of eight cool ones.

**Dark theme.** Same instrument at night, derived by role and measured; approved only after a live-screen check (open question 4).

| Token                                                                               | Dark                                                                  | Measured                                                                                   |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `--bg` / `--bg-raised` / `--bg-lifted` / `--bg-inset` / `--bg-sunken` / `--bg-free` | `#1C1613` / `#27201C` / `#322A25` / `#2E2622` / `#3A302A` / `#3B2230` | raised vs bg 1.12, so lifted = tone step + shadow                                          |
| `--ink` / `--ink-soft` / `--ink-faint`                                              | `#F3EDE7` / `#D3C9C1` / `#B0A49B`                                     | faint: 7.35 bg, 6.59 raised, 6.09 inset, 5.27 sunken                                       |
| `--accent` / `--accent-contrast` / `--accent-ink`                                   | `#E27AA3` / **`#1C1613`** / `#F0A3C0`                                 | white on accent fails (2.78); dark label 6.43 — same device as today's `--danger-contrast` |
| `--success` / `--success-ink` / `--success-fill` (dark label)                       | `#8FB394`                                                             | text 6.91, fill 7.71                                                                       |
| `--warning` / `--warning-ink`                                                       | `#D9A455`                                                             | 7.17 raised, 6.63 inset                                                                    |
| `--danger`                                                                          | `#E8807A`                                                             | 5.96                                                                                       |
| `--service-*`                                                                       | `#D68CA0` / `#8FB394` / `#CF8F6A` / `#8EA1C2`                         | bars 5.5–6.4 on inset                                                                      |

### 3.2 Typography

**UI face: Onest 400 / 500 / 600** (`--font-ui`). Already loaded with Cyrillic and Latvian diacritics; the same face as the landing and the public default. Weights 300 and 700 are not used in the cabinet; the weight-flattening selector goes.

**Expressive face** (`--font-figure`, open question 1): if approved, chosen from the already-loaded families that pass the Cyrillic filter and have tabular figures — Playfair Display (closest to F2), Cormorant Garamond, Spectral. Instrument Serif (what Flowstep rendered) has no Cyrillic and is excluded; the Russian greeting must be in the same face as the English one. If not approved, the three serif roles below are set in Onest 600 at the same sizes.

**JetBrains Mono** stops being the data face; figures are tabular Onest. It remains only for invite codes and `kbd`.

The scale. Twelve roles, as CSS classes on the cabinet scope; arbitrary sizes are forbidden in features.

| Role (brief)              | Class                            | Size / weight / leading / tracking                                            | Use                                                                                                       |
| ------------------------- | -------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Page title                | `.type-page`                     | 20 / 600 / 1.2 / −0.02em                                                      | Page header, panel title ("New booking")                                                                  |
| Section title             | `.type-title`                    | 18 / 600 / 1.25 / −0.012em                                                    | Title inside a surface ("Today", "Needs answer", "Time")                                                  |
| Subsection title          | `.type-meta` in `--ink-faint`    | 12.5 / 400                                                                    | Group labels ("In chair (2)", "Services", "Client", "Note"). F2 has no bold subsection; it labels quietly |
| Body                      | `.type-body`                     | 14 / 400 / 1.45                                                               | Default text, nav items, menu rows                                                                        |
| Compact body              | `.type-dense`                    | 13 / 400 / 1.4 (compact register 12)                                          | Row second line on desktop, block content, calendar gutter                                                |
| Label                     | `.type-meta`                     | 12.5 / 400 / 1.4 (compact 11.5)                                               | Field labels, helper lines, hint under titles                                                             |
| Metadata / caption        | `.type-meta`                     | same                                                                          | One role; a separate caption step is not needed                                                           |
| Navigation                | `.type-body` 500; active 600     | 14                                                                            | Sidebar; tab bar 11 / 500, active 600                                                                     |
| Button                    | `.type-body` 600; small 13 / 500 | 14                                                                            | Primary and secondary 14; `sm` and pills inside objects 13                                                |
| Input                     | 16 / 400 on phone, 14 desktop    | —                                                                             | iOS zoom rule; the field is a control, not a text role                                                    |
| List primary              | `.type-strong`                   | 14 / 600 (client strip 16 / 600)                                              | Client name in rows and strip                                                                             |
| List secondary            | `.type-dense` in `--ink-faint`   | 13 / 400                                                                      | Service · duration · status                                                                               |
| Calendar time             | `.type-dense` tabular            | 13 (compact 12)                                                               | Block time, gutter hours                                                                                  |
| Calendar booking title    | `.type-strong`                   | 13.5 / 600 (compact 12.5)                                                     | Client name in a block                                                                                    |
| Calendar booking meta     | `.type-meta`                     | 12.5 (compact 11.5)                                                           | Service · duration · status in a block                                                                    |
| Numeric emphasis — facts  | `.type-facts`                    | 22 / 600 tabular (phone 19)                                                   | The facts line on Home                                                                                    |
| Numeric emphasis — figure | `.type-figure`                   | `--figure-size` (44 desktop / 38 phone) / serif 400 / 1.05 / −0.03em, tabular | Next-visit time, visit-panel time, running totals (26 in the form)                                        |
| Greeting / date title     | `.type-greeting`                 | 34 desktop / 26 phone / serif / −0.03em                                       | Home greeting; the date above the calendar (26)                                                           |
| Now marker                | `.type-now`                      | 20 / serif / `--accent`                                                       | Gutter figure of the now line                                                                             |

Register (§3.9) scales only `dense` and `meta` (13→12, 12.5→11.5). Nothing is uppercase; no italic; `text-wrap: balance` on titles.

### 3.3 Spacing

Base 4. Scale: `2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 40 · 48 · 64`. (`2` and `6` are micro steps for insets and bars only.) Semantic tiers; values are from the screens, expressed as tokens:

| Tier                                      | Token                  | Desktop           | Phone            | Notes                                                                                   |
| ----------------------------------------- | ---------------------- | ----------------- | ---------------- | --------------------------------------------------------------------------------------- |
| Shell · sidebar width                     | `--sidebar-w`          | 220               | —                | Flowstep 220 (today 236)                                                                |
| Shell · sidebar padding                   | `--space-sidebar`      | 24 top, 16 sides  | —                |                                                                                         |
| Shell · topbar height                     | `--topbar-h`           | 60                | 56               | The page header row; not a bar with a border on desktop, a hairline-bottom bar on phone |
| Shell · page gutter                       | `--gutter`             | 28                | 20               | Today 32 / 16; phone 20 per brief §13                                                   |
| Page · header → content                   | `--space-page`         | 20                | 16               |                                                                                         |
| Page · between surfaces / major sections  | `--space-section`      | 20                | 16               | Objects stand 16–20 apart on the ivory                                                  |
| Page · inside a surface, between sections | `--space-subsection`   | 16                | 16               | Plus one hairline                                                                       |
| Surface padding                           | `--pad-surface`        | 20 (hero card 24) | 16               |                                                                                         |
| Operational · list row height             | `--row-h`              | 58 (compact 44)   | 64               |                                                                                         |
| Operational · calendar slot (30 min)      | `--slot-h`             | 28 (compact 22)   | 30               |                                                                                         |
| Operational · grid inset                  | `--pad-grid`           | 24                | 16               | Block inset from column edge 8                                                          |
| Forms · label → field                     | `--space-field`        | 8                 | 8                | Helper always in layout, 8 below                                                        |
| Forms · between fields                    | `--space-form`         | 16                | 16               |                                                                                         |
| Forms · between form sections             | `--space-form-section` | 28 + hairline     | 24 + hairline    | The three hairline sections of the booking form                                         |
| Overlay · panel padding                   | `--pad-panel`          | 32 sides, 28 top  | 20 sides, 16 top |                                                                                         |
| Overlay · footer                          | `--pad-footer`         | 20 top, 28 bottom | 16 + safe-area   |                                                                                         |
| Overlay · popover                         | `--pad-popover`        | 6                 | 6                | Menu items 9 px radius, 40 px min height                                                |
| Mobile · control gap                      | `--space-control`      | 8                 | 8                | Buttons in a row                                                                        |

No 13, 17, 23. The one optical exception: the running-total strip in the booking form is 64 px tall with 26 px figures, an optical centre that is documented here and expressed as the `.type-figure` compact size, not an ad-hoc number.

### 3.4 Radius

| Role                                                              | Token                                    | Spacious desktop | Phone | Compact |
| ----------------------------------------------------------------- | ---------------------------------------- | ---------------- | ----- | ------- |
| Compact control (menu item, compact block)                        | `--radius-compact`                       | 10               | 10    | 10      |
| Standard control (button, chip, pill, FAB, avatar, nav pill)      | `--control-radius`                       | 999              | 999   | 999     |
| Field (recess)                                                    | `--field-radius`                         | 14               | 14    | 14      |
| Small surface (block, row, note, day-strip cell, client strip 20) | `--card-radius`                          | 16               | 16    | 10      |
| Large surface (card, calendar sheet, Time module)                 | `--panel-radius`                         | 28               | 22    | 24      |
| Overlay (side panel corner, bottom sheet top, popover 16)         | `--panel-radius` / `--radius-popover` 16 | 28               | 22    | —       |

Deprecated: the kit's `--r-ctl: 10px` on every button and chip (F2 is pill), `8px` chips, the old world's `999-or-0` law, the old `32/24/12` product defaults inside the cabinet. Not every component is equally rounded: controls are pills, objects are 16, containers are 28, and that difference is what stops the "card soup" reading.

### 3.5 Borders, dividers, outlines

- **No border**: every surface, every block, every field, every nav item, every selected thing. The edge of a white object on ivory is 1.15:1 and is carried by the shadow and by the object's content, not by a line.
- **Divider** (`--border`, 1 px): inside a surface between sections; under the team column head; between compact rows; between the three sections of the booking form; between the queue rows on phone? No: phone queue rows are separate small surfaces (Flowstep), desktop queue rows are air-separated inside one surface.
- **Outline** (`--border-strong`, 1 px): only the secondary button (Write, Decline, No-show, Reschedule, Open time on white). Pending calendar block: 1.5 px dashed `--warning`, no fill.
- **Focus**: 2 px `--accent` ring, offset 2, everywhere. Never removed for aesthetics.

### 3.6 Shadow and depth

F2 needs shadows: depth _is_ the direction. Four semantic levels, ink-tinted, never black, never on text, never to "make a surface visible" — every surface also has content and, in dark theme, a tonal step.

| Level                    | Token                                 | Desktop                                                                      | Phone                                               | Use                                                                   |
| ------------------------ | ------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| Control                  | `--shadow-control`                    | `0 6px 18px rgb(34 28 25 / 6%)`                                              | `0 1px 3px rgb(34 28 25 / 10%)`                     | Toolbar pills, search, bell, active nav pill, selected day-strip cell |
| Rest                     | `--shadow-rest`                       | `0 14px 36px rgb(34 28 25 / 8%)`                                             | `0 3px 14px / 5%` rows, `0 4px 18px / 7%` hero card | Any surface at rest                                                   |
| Raised (selected, hover) | `--shadow-raised`                     | `0 14px 38px rgb(34 28 25 / 14%)`                                            | `0 8px 22px / 12%`                                  | Rule 03                                                               |
| Float                    | `--shadow-float` / `--shadow-popover` | side panel `-18px 0 36px / 16%`; popover and toast `0 30px 80px -20px / 35%` | bottom sheet `0 -12px 40px -12px / 18%`             | Anything that leaves the page                                         |
| Footer seam              | `--shadow-footer`                     | `0 -10px 24px rgb(34 28 25 / 8%)`                                            | same                                                | Fixed footer of a panel over its scrolling body                       |

Aliases so existing readers keep working: `--shadow-soft → control`, `--shadow-lifted → float`, `--surface-shadow → rest`. Dark theme: same levels, alpha raised; `rest` is not `none` (rule 03 needs it), but the tonal step does most of the work.

### 3.7 Interaction states

One state language for navigation, buttons, calendar, lists, forms, booking controls, drawers, menus:

| State                | Expression                                                                                                                                                   | Where it differs                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| default              | as specified                                                                                                                                                 | —                                                                 |
| hover (pointer only) | surfaces and controls: `--shadow-control` → `--shadow-raised`; rows and cells: `--bg-hover`; secondary button: outline → `--ink-soft`; text links: underline | never a colour change of the accent                               |
| active / pressed     | lift returns to 0; filled accent → `--accent-active`; no scale                                                                                               | `--press-scale: 1` stays                                          |
| selected             | `data-selected` / `aria-current` / `aria-selected` → `--bg-lifted` + `--shadow-raised` (+ 600 weight on nav)                                                 | free-time slot selected in the form: same lift on the rose object |
| focus-visible        | 2 px `--accent` ring, offset 2                                                                                                                               | on the selected block the ring is the second channel              |
| disabled             | `--bg-sunken` fill, `--ink-faint` text, no shadow, `cursor-not-allowed`                                                                                      | unfit window: sunken pill, struck time, amber reason below        |
| loading              | skeleton in the shape of the content (`--bg-sunken`); buttons keep width and show a spinner replacing the label                                              | never a spinner in the middle of content                          |
| destructive          | text `--danger` (Cancel visit) or fill `--danger` with white (confirm sheet)                                                                                 | always carries words                                              |
| error                | field helper replaced by `--danger` text + icon, `role="alert"`; field keeps its recess, no red border                                                       | inline banner with Retry for failed loads                         |

Motion (M5): one curve `cubic-bezier(0.22, 1, 0.36, 1)`; sheet 240 / 180 ms, overlay 200 / 160, toast 200, queue row leaving 180 (`grid-template-rows` 1fr→0fr, the one named exception to transform/opacity), hover 150, press 120, now line ticks per minute. No reveal on load: `.rise`, `--dur-reveal`, `--amp-y` leave the cabinet. `prefers-reduced-motion` collapses all to 0.01 ms.

### 3.8 Icons

One outline set: the cabinet's own (`dashboard-shell/components/icon.tsx`, stroke 1.75) at 16 / 18 / 20 / 24. Phosphor stays on the public page and leaves the cabinet primitives (`Sheet` close, `Toast`, `FieldError`, `LoadError` currently import it). Required glyphs to add: a distinct Team glyph (today Team reuses `clients`), `eyeOff` (hidden window), three queue shape markers (hollow dot, check-square, struck time), `messageCircle` (Write). Lucide in the Flowstep JSX is the tool's default, not a decision.

### 3.9 Density register

`data-density="spacious" | "compact"` on a screen root or on the calendar root in team view. It switches only: `--row-h`, `--slot-h`, `--card-radius`, `--panel-radius`, `--figure-size` (compact: none), `--type-dense`, `--type-meta`, and whether the row shows the client portrait. Phone is always spacious.

The calendar's hour height lives today in two places (`calendar-model.ts` `HOUR = 50` and `app.css` `50px`). Rule: **the source is TypeScript** (`DENSITY.spacious.slotPx = 28`, `DENSITY.compact.slotPx = 22`); the grid root writes `--slot-h` as an inline custom property; CSS reads `var(--slot-h)`; drag geometry and painting share one number.

### 3.10 Where tokens live

```
apps/web/src/features/dashboard-shell/styles/
  tokens.css            NEW. Scope `.amolie-app, [data-surface='client']`. Three blocks:
                        light, system dark (@media + :not([data-theme='light'])), explicit dark.
                        Primitives → semantic → component tokens; register block; phone block.
  legacy-aliases.css    NEW, TEMPORARY. `--pink-deep: var(--accent)`, `--hair: var(--border)`,
                        `--subtle: var(--bg-inset)`, `--r-card: var(--card-radius)` … keeps the
                        11 shell stylesheets alive while they migrate. Deleted in Phase G.
  primitives.css        NEW. The type roles, `[data-selected]`/lifted, `.rule` hairline,
                        service-bar and free-time shapes that are pure CSS.
  kit.css               loses its value block and bridge; classes remain until unused; then deleted.
  index.css             order: tokens → legacy-aliases → primitives → kit → app → …
apps/web/src/app/globals.css
  cabinet block (584–910) deleted; `@theme inline` extended with the new names; `:root`
  gets neutral defaults for them (`--bg-inset: var(--bg-sunken)`, `--accent-ink: var(--accent)`,
  `--shadow-rest: var(--shadow-soft)` …) so a utility on a foreign surface never resolves to nothing.
apps/web/src/app/layout.tsx
  Onest stays; the chosen serif stays; Geist and Geist Mono are removed once kit.css is gone.
packages/shared-kernel/src/theme.ts
  untouched; `contrastRatio` / `meetsContrastAA` are read by the new tokens test.
apps/web/src/features/dashboard-shell/styles/tokens.test.ts
  NEW, mandatory: every pair in §3.1 asserted. A pair not in the test is not a token.
```

Why this scope and not `:root:has(...)`: sheets and popovers render through portals outside the shell tree and already carry `.amolie-app`; the client cabinet (`/me`) carries `data-surface="client"` and shares tokens without the kit; the public page carries neither and receives nothing.

---

## 4 · Shared primitives — decisions

One AMOLIE component family. No `*V2`, no `New*`.

| Primitive                                          | Where                                                                                                                            | Decision                                           | Required change                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                                             | `components/ui/button.tsx`                                                                                                       | **RESTYLE + ADD VARIANT**                          | Pill in the cabinet via `--control-radius`; variants `soft` (rose recess + `--accent-ink`: Call), `success` (`--success-fill`, white: Completed); `danger` becomes text-only, `danger-solid` the fill; sizes `default` 48 (panel footer), `sm` 44 (rows, toolbar), `pill` 36 (inside objects, hit area 44 via `::after`); hover = shadow lift; keep `asChild`, `--action-*` tokens                                                                |
| IconButton                                         | `Button size="icon"` + `RowAction`                                                                                               | **KEEP**                                           | Both are 44 px; `RowAction` is the list-row icon button, `Button icon` the toolbar one. Restyle to pill + `--shadow-control` in toolbars                                                                                                                                                                                                                                                                                                          |
| Input                                              | `components/ui/input.tsx`                                                                                                        | **RESTYLE**                                        | Recess: `--field-bg` (= inset), `--field-border-width` (cabinet 0, `:root` 1 px), radius 14, height 48 (44 compact), 16 px text on phone; focus ring unchanged                                                                                                                                                                                                                                                                                    |
| Textarea                                           | `textarea.tsx`                                                                                                                   | **RESTYLE**                                        | Same recess; `rows`-based height kept                                                                                                                                                                                                                                                                                                                                                                                                             |
| Search                                             | kit `.search` button in `WorkspaceToolbar`                                                                                       | **RESTYLE**                                        | A `Button variant="secondary" size="sm"` shaped 220 px pill with `--shadow-control` and no outline; opens ⌘K as today                                                                                                                                                                                                                                                                                                                             |
| Select                                             | `select.tsx` (native)                                                                                                            | **RESTYLE**                                        | Recess styling; native stays for simple enumerations (member, category) — the platform wheel is the better phone picker                                                                                                                                                                                                                                                                                                                           |
| Combobox                                           | none                                                                                                                             | **NEW COMPONENT REQUIRED**                         | Client typeahead in New booking (approved N-5). Radix Popover + listbox on desktop, a bottom `Sheet` with a search field on phone; reuses the ⌘K matcher. Not a general dropdown                                                                                                                                                                                                                                                                  |
| Checkbox / Radio                                   | none in `ui`; kit `.cb`                                                                                                          | **not required for the golden slice**              | Multi-service selection in the form is a list with add/remove rows (Flowstep); weekday pickers in availability keep their chips. Retire `.cb` with its screens later                                                                                                                                                                                                                                                                              |
| Switch                                             | `switch.tsx`                                                                                                                     | **KEEP**                                           | Re-measure track on `--bg-inset`; knob tokens already exist                                                                                                                                                                                                                                                                                                                                                                                       |
| Tabs                                               | `tabs.tsx`                                                                                                                       | **RESTYLE**                                        | Active trigger = lifted pill (rule 03) — already `bg-bg-raised shadow-soft`; alias makes it `--shadow-control`. Track `--bg-inset`                                                                                                                                                                                                                                                                                                                |
| SegmentedControl                                   | kit `.seg`, `.calendar-views`                                                                                                    | **DEPRECATE → Tabs**                               | Calendar view switcher and booking posture segment move to `Tabs`                                                                                                                                                                                                                                                                                                                                                                                 |
| Badge / Status                                     | `badge.tsx` (dot + word)                                                                                                         | **KEEP + ADD VARIANT**                             | Word may take `--*-ink`; `variant="pill"` (soft background, dot, word) for the visit-panel header. Kit `.badge.b-*` (100 uses) migrate to these two                                                                                                                                                                                                                                                                                               |
| Tooltip                                            | none                                                                                                                             | **not required**                                   | Icon-only controls carry `title` + `sr-only` already                                                                                                                                                                                                                                                                                                                                                                                              |
| Popover                                            | Radix Popover (`cal-quick`, `cal-popover`)                                                                                       | **RESTYLE**                                        | `--radius-popover` 16, `--shadow-popover`, no border, padding 6, items 40 min / radius 10                                                                                                                                                                                                                                                                                                                                                         |
| DropdownMenu                                       | `RowMenu` (`<details>`)                                                                                                          | **KEEP, RESTYLE**                                  | Same popover tokens                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ContextMenu                                        | `CalendarQuickActions`                                                                                                           | **KEEP, RESTYLE**                                  | Same popover tokens; sheet on phone unchanged                                                                                                                                                                                                                                                                                                                                                                                                     |
| Modal / Dialog                                     | none centred; `ConfirmSheet`                                                                                                     | **KEEP**                                           | Dialog last; the confirm sheet stays a sheet                                                                                                                                                                                                                                                                                                                                                                                                      |
| Drawer / Sheet                                     | `components/ui/sheet.tsx` (floating bottom card, drag) **and** `dashboard-shell/components/side-sheet.tsx` (right panel, footer) | **EXTEND `sheet.tsx`, DEPRECATE `side-sheet.tsx`** | `sheet.tsx` keeps its API and `surface` prop; under `surface="app"` it renders the F2 panel: right, 480 px, `rounded-l-[--panel-radius]`, `--shadow-float`, header / scrolling body / fixed footer with `--shadow-footer`; bottom sheet under 1024 with the existing drag-to-dismiss. `surface="plain"` keeps today's floating card for the public page and client cabinet. Eight `SideSheet` files migrate; poster-world consumers are untouched |
| Toast                                              | `toast.tsx`                                                                                                                      | **RESTYLE**                                        | `--bg-raised`, `--shadow-popover`, radius 16; kit `.toast` (ink fill) retired                                                                                                                                                                                                                                                                                                                                                                     |
| EmptyState                                         | inline in three places (`today-empty`, `bookings-empty`, `cal-empty`)                                                            | **NEW COMPONENT REQUIRED**                         | `EmptyState({ title, hint, action })`: title `.type-strong`, hint `.type-meta`, secondary button. Three implementations become one                                                                                                                                                                                                                                                                                                                |
| Skeleton                                           | `skeleton.tsx`                                                                                                                   | **KEEP**                                           | Colour from `--bg-sunken`; kit `.sk` gradient retired                                                                                                                                                                                                                                                                                                                                                                                             |
| InlineAlert                                        | `LoadError` (Card + Retry), `attention` amber box                                                                                | **RESTYLE `LoadError`; DEPRECATE `.attention`**    | The amber box becomes queue rows (§8)                                                                                                                                                                                                                                                                                                                                                                                                             |
| Divider                                            | kit `.divider`                                                                                                                   | **DEPRECATE → `.rule`**                            | A one-line CSS class in `primitives.css`; no component                                                                                                                                                                                                                                                                                                                                                                                            |
| Card                                               | `card.tsx`                                                                                                                       | **RESTYLE, narrow the API**                        | See §4.1                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| StatTile, LeadMetric, BarChart, Sparkline, CountUp | `components/ui`                                                                                                                  | **KEEP for Finance; forbidden on Home**            | Uppercase tracked labels inside them → `.type-meta`; not part of Step 5                                                                                                                                                                                                                                                                                                                                                                           |

### 4.1 Is "Card" a component?

Today `Card` is a default container: 58 kit `.card` usages plus `Card` from `ui`, every Home block boxed, rows bordered again inside. F2 keeps surfaces but gives them a meaning: **a surface is an object or a module, never a wrapper.**

Legitimate roles of `Card` (restyled to `--bg-raised`, `--panel-radius`, `--shadow-rest`, no border, `fill` bento prop removed, `CardLabel` uppercase removed):

1. **Module surface** — one Home module (Today, Needs answer, Team today), the calendar sheet, a settings group. Title `.type-title` + hint `.type-meta` in the head; sections inside separated by `.rule`.
2. **Object surface** — the next-visit card, a phone visit row, a phone queue row. Elevation `lead` for the hero.
3. **Tinted module** — `tone="free"`: the Time module. The only tinted surface in the system.

Not a Card: a section of a page (title + list on the ground), a form group (label + hairline), a table (rows on the surface with hairlines), a stat (§1: no KPI tiles on Home). `Card` inside `Card` is a dev-time warning.

---

## 5 · Application shell system

| Element              | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Existing component                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar              | 220 px, ground colour (no border-right, no raised fill), sticky 100dvh, padding 24 / 16. Top: master portrait 44 + name `.type-strong` + organisation `.type-meta` (the account card moves from bottom to top — in all eight screens). Items 44 px, `.type-body` 500, `--ink-faint`; icon 20. Active: lifted white pill, 600, `--ink`, rose dot 6 px at the right. Hover: `--bg-hover` pill. Count (pending on Calendar): `--warning-ink` number, no tinted chip. Group "Workspace" as `.type-meta` after a `.rule`. Sign out last, `mt-auto`. No collapse on tablet (derived: below 1024 the tab bar replaces it, as today) | `sidebar.tsx` **RESTYLE**; `AccountMenu` moves to the top slot, keeps theme + sign-out menu                                      |
| Topbar / page header | Desktop: a 60 px row: title `.type-page` + hint `.type-meta` left; search pill 220, bell pill 40, Create primary pill right. No bar background, no border. Phone: 56 px fixed bar, master portrait 32 + title 16 / 600 + hint, bell 36 right, hairline bottom, ground colour                                                                                                                                                                                                                                                                                                                                                 | `PageHeader` + `WorkspaceToolbar` **RESTYLE**; the two merge visually into one row on desktop (composition, not a new component) |
| Page container       | Gutter 28 desktop / 20 phone; content max width 1200 (derived — Flowstep is 1140 wide); Home grid `minmax(0,1fr) 320px` gap 20 (today 380)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `app-main` **RESTYLE**                                                                                                           |
| Scrolling            | Page scrolls; sidebar sticky; calendar grid scrolls inside its sheet on desktop (existing `cal-scroll`), page-scroll on phone (existing)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | keep                                                                                                                             |
| Sticky               | Grid head + gutter sticky (existing); panel footer fixed (existing); phone top bar fixed (new to match F2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | keep / extend                                                                                                                    |
| Mobile navigation    | Tab bar 74 px + safe area, ground colour, hairline top; four positions Today · Calendar · Clients · More pinned by key (approved); active: label 600 `--ink` + rose dot 6 px below; count as a number on the icon. FAB 56 px `--accent` `--shadow-float` at right 20 / bottom 86. More sheet: `Sheet surface="app"` bottom                                                                                                                                                                                                                                                                                                   | `bottom-tab-bar.tsx` **RESTYLE** (drop `bnav__pill` fill); `workspace-fab` keep                                                  |
| Search (⌘K)          | `QuickSearch` **RESTYLE** via popover tokens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | keep                                                                                                                             |
| Bell                 | `ActivityBell` **RESTYLE**: white pill 40 with `--shadow-control`, dot `--warning` or `--success` by event kind                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | keep                                                                                                                             |
| Create menu          | `WorkspaceToolbar` details menu **RESTYLE** via popover tokens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | keep                                                                                                                             |

Route and permission behaviour of every item is untouched (nav config, capabilities, badges).

---

## 6 · Calendar system

The calendar is a domain design system on the shared foundation. Interaction model frozen; every behaviour in `calendar-screen.tsx`, `calendar-grid.tsx`, `use-grid-drag.ts`, `use-booking-move.ts` stays.

| Piece                      | Existing                          | Decision             | Visual rule                                                                                                                                                                                                                                                                                    |
| -------------------------- | --------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CalendarShell              | `cal-card` (kit card, padding 0)  | RESTYLE              | One `Card` (module surface) holding head + grid; `--panel-radius`, `--shadow-rest`, `--pad-grid` 24 (16 phone); `data-density` set here: `compact` in team view, else `spacious`                                                                                                               |
| CalendarToolbar            | `calendar-toolbar.tsx`            | RESTYLE              | Left: Today (secondary pill 44), ‹ › (icon pills 44), range label `.type-greeting` 26 in the serif (spacious) / `.type-page` (compact), "today" `.type-meta`. Right: view switcher, Working time (secondary), New booking (primary). Wraps under 1100 as today                                 |
| DateNavigation             | inside toolbar                    | KEEP                 |                                                                                                                                                                                                                                                                                                |
| ViewSwitcher               | kit `.seg`                        | DEPRECATE → `Tabs`   | Text-only triggers, active `.type-body` 600 lifted pill                                                                                                                                                                                                                                        |
| DayStrip                   | `day-strip.tsx`                   | RESTYLE              | Seven cells: weekday `.type-meta`, number 18 / 600 tabular, dots 4 px in service tones (max 4, today's day 6 px `--accent`), selected cell = lifted (today: ink fill — deprecated). Desktop shows it too (Flowstep) — a **derived extension** of today's phone-only strip; behaviour unchanged |
| Staff / resource control   | `team-filter.tsx`, `cal-popover`  | RESTYLE              | Chips as pills; popover tokens                                                                                                                                                                                                                                                                 |
| ResourceHeader             | `cal-person-head`                 | RESTYLE              | Portrait 28 (`MemberAvatar`), name 13 / 600, "6 visits · 09:00–18:00" 11.5 `--ink-faint`; hairline below the head row; column separators `--border` at 5%                                                                                                                                      |
| TimeColumn                 | `cal-gutter`                      | RESTYLE              | 72 px, hours `.type-dense` `--ink-faint` right-aligned; now figure `.type-now` + dot                                                                                                                                                                                                           |
| TimeGrid                   | `cal-col`, `cal-body`             | RESTYLE              | Hour lines `--border`; team columns get a 6% ink wash (`--bg-grid` = color-mix); day view white                                                                                                                                                                                                |
| BookingItem                | `cal-appt`                        | RESTYLE              | `--bg-inset`, `--card-radius` (16 / 10), no border, `ServiceBar` 6 px, portrait 28 in spacious, one line in compact; time `.type-dense` tabular, name `.type-strong`, meta `.type-meta`; height honest to duration; past → opacity .5                                                          |
| SelectedBooking            | none                              | ADD STATE            | `data-selected` → `--bg-lifted` + `--shadow-raised`; set while its sheet is open                                                                                                                                                                                                               |
| BookingHover               | `cal-appt:hover`                  | RESTYLE              | `--shadow-control` on hover (pointer only)                                                                                                                                                                                                                                                     |
| Pending booking            | `cal-appt.is-pending`             | RESTYLE              | No fill, 1.5 px dashed `--warning`, word in `--warning-ink`                                                                                                                                                                                                                                    |
| BlockedTime                | `cal-block`                       | RESTYLE              | `--bg-sunken`, no hatch, no border, no bar; title `.type-dense` `--ink-faint`, time right                                                                                                                                                                                                      |
| Off hours                  | `cal-off`                         | RESTYLE              | `--bg-sunken` at 55 % (as today, new tone)                                                                                                                                                                                                                                                     |
| Availability (free window) | `cal-free`                        | RESTYLE → `FreeTime` | Rose object: `--bg-free`, `--accent-ink`, `--radius-slot`, height `--slot-h`; "Open" `Button size="pill"` at right where width allows; hidden window: `--bg` fill, `--ink-faint`, `eyeOff` glyph                                                                                               |
| EmptyTime                  | `cal-slot`                        | RESTYLE              | transparent; hover `--bg-hover`; click → quick menu (unchanged)                                                                                                                                                                                                                                |
| DraggingState              | `cal-select`, `is-ghost`          | RESTYLE              | Selection range: `--bg-free` at 60 % with dashed `--accent-ink`; ghost block: the BookingItem at 70 % opacity with `--shadow-raised`                                                                                                                                                           |
| CurrentTimeIndicator       | `cal-now`                         | RESTYLE              | 2 px `--accent` line + 8 px dot + gutter figure                                                                                                                                                                                                                                                |
| Conflict / error           | toast + `LoadError`               | KEEP                 |                                                                                                                                                                                                                                                                                                |
| Agenda / list view         | `calendar-agenda.tsx` → `DayList` | RESTYLE → `VisitRow` | Same row as Home; posture segment → `Tabs`; attention rows → `QueueRow`                                                                                                                                                                                                                        |

Nothing visual is written in `calendar-screen.tsx`; it composes. The grid's geometry constants move behind `DENSITY` (§3.9).

---

## 7 · Booking system

Booking Details (`booking-detail-sheet.tsx`, `SideSheet`) and New Booking (`new-booking-sheet.tsx`, old `Sheet`) live in different worlds today. One visual language, two components: the details panel is read-only composition; the form is editing composition; they share parts, not a mega-component.

| Pattern             | Shared part                                                                                                       | Details panel                                                                                                                                      | New booking form                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel               | `Sheet surface="app"`                                                                                             | title row: status pill left, close right                                                                                                           | title `.type-page` "New booking", close right                                                                                                                                     |
| Booking header      | `TimeFigure` (`.type-figure` + `ServiceBar` 6 px)                                                                 | "10:30–12:00", line "Tuesday 2 September · 1 h 30"                                                                                                 | not shown; the computed range lives on the primary button                                                                                                                         |
| Status              | `Badge variant="pill"`                                                                                            | Confirmed / Pending / Completed / Cancelled                                                                                                        | —                                                                                                                                                                                 |
| Client identity     | `ClientStrip` (recess: avatar 48, name 16 / 600, "7 visits · last 12 Aug", note excerpt, link "Open client card") | read-only                                                                                                                                          | same strip with "Change" action; empty state "Not in your client base · Add"; the `Combobox` fills it                                                                             |
| Service             | `ServiceLine` (dot in service tone, name, duration `.type-meta`, price tabular)                                   | list + total line "1 h 30 · **65 €**"                                                                                                              | list with remove (44 icon), "Add service" (`Button variant="ghost"` on a recess pill), running total on a `--bg-free` strip in `.type-figure` 26                                  |
| Specialist          | "with Jūlija Krūmiņa" `.type-meta` + 20 px portrait (team mode)                                                   | in the header line                                                                                                                                 | member select first (salons), native `Select` in recess                                                                                                                           |
| Date / time         | `TimeFigure`                                                                                                      | header                                                                                                                                             | windows grouped by day: pills 44 px on `--bg-inset` (selected = lifted), unfit = `--bg-sunken` + struck + amber reason 11.5 below; "Show more days", "Custom time" as ghost links |
| Duration            | in `TimeFigure` line and total                                                                                    |                                                                                                                                                    | in running total                                                                                                                                                                  |
| Notes               | recess block `--bg-inset` radius 16                                                                               | read-only text                                                                                                                                     | `Textarea` recess + helper "Only you see this"                                                                                                                                    |
| Metadata (origin)   | `.type-meta` list                                                                                                 | "Booked 28 Aug at 21:14 · From the booking page"                                                                                                   | —                                                                                                                                                                                 |
| Action groups       | panel footer (`--shadow-footer`)                                                                                  | Edit (primary 48) + Reschedule (secondary), then "Cancel visit" as danger text; by state: Confirm / Decline (pending), Completed / No-show (ended) | "Create · 14:00–15:45" (primary 52 full width) + Cancel (ghost)                                                                                                                   |
| Call / Write        | `ContactActions` (soft + secondary 44, two columns)                                                               | yes                                                                                                                                                | —                                                                                                                                                                                 |
| Validation / errors | `FieldError` under the field; disabled primary until valid                                                        | —                                                                                                                                                  | as today                                                                                                                                                                          |
| Loading             | skeleton of the panel; button spinner                                                                             |                                                                                                                                                    |                                                                                                                                                                                   |
| Confirmation        | `ConfirmSheet` (cancel asks; complete/no-show act with Undo toast)                                                |                                                                                                                                                    |                                                                                                                                                                                   |

Section separators inside both panels: `.rule` with 28 above and below; section labels `.type-meta` `--ink-faint`. Edit form reuses the details layout with fields swapped for recesses (existing `EditBookingSheet` composition kept).

---

## 8 · Dashboard Home composition system

Approved module order and content are frozen (`PRODUCT-UX-DIRECTION.md` Part 2). This section only says what each module is made of.

| Module          | Container                                                                                                                                                 | Parts                                                                                                                                                                                                                                               | Reusable elsewhere                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| H1 Header       | none (on the ground)                                                                                                                                      | greeting `.type-greeting`; `FactsLine`: cells of `.type-facts` + `.type-meta`, separated by 1 px `--border` verticals; wraps to two lines on phone, hides nothing                                                                                   | `FactsLine` reused by member page today block                     |
| H2 Setup card   | `Card` (module)                                                                                                                                           | existing `SetupProgressCard` content                                                                                                                                                                                                                | —                                                                 |
| H3 Now / next   | phone: `Card elevation="lead"`; desktop: the same card (Flowstep shows a card in both; the strip variant of R-2 is a composition option, not a component) | portrait 56, "Next in 18 min" `--accent-ink`, `TimeFigure`, client · service · duration, note excerpt, `ContactActions` stacked right                                                                                                               | `TimeFigure`, `ContactActions` shared with the visit panel        |
| H4 Needs answer | desktop: `Card` (module) in the aside; phone: heading on the ground, each row its own small `Card`                                                        | `QueueRow` ×3 kinds (pending: hollow amber marker, Confirm primary pill + Decline secondary; ended: check-square, Completed success + No-show secondary; cancelled: struck time + reason in quotes); footer "All completed (n)" flat pill on `--bg` | `QueueRow` reused by the calendar list's attention block          |
| H5 Today        | `Card` (module)                                                                                                                                           | `VisitRow` (spacious desktop 58 / phone 64; team mode: master name first, action pill right), `FreeTime` gap rows, group labels "In chair (2)" / "Next (3)" `.type-meta`                                                                            | `VisitRow` reused by calendar list, member page, front-desk model |
| H6 Time         | `Card tone="free"`                                                                                                                                        | two lines: "Free 12:00–14:00" + Open (primary pill), "No open time for the next week" + Open time (ghost on white pill)                                                                                                                             | the only tinted module                                            |
| H7 Team today   | `Card` (module)                                                                                                                                           | rows: `MemberAvatar` 32, name 13 / 600, "6 bookings · 09:00–18:00" `.type-meta`; 46 px rows                                                                                                                                                         | `TeamPulse` restyled                                              |

Priority treatment: nothing is red; attention is the queue's position (second on phone, first in the aside) and the amber marker. Quick actions are inline pills inside rows, never a toolbar. Role-aware containers: the existing capability gates decide presence; the composition never renders a greyed-out module.

Deprecated Home-only conventions: `today-pending` bordered box, `today-attention` amber card with "All clear" text, `booking-page-card` on Home (moves to Страница per R-19), `DayRail` signature bar (KPI-adjacent, removed from Home; component may stay for Finance).

---

## 9 · Responsive system

Breakpoints stay as the code has them (they are functional truths): phone `< 768` (`useNarrow`), tablet `768–1023` (no sidebar, tab bar + FAB), desktop `≥ 1024`, wide `≥ 1100` (Home two columns), `≥ 1280` (search in the header row). Flowstep defined desktop (1140 canvas) and phone (390) only; tablet rules below are **derived** and marked.

| Surface           | Desktop ≥ 1024                                                            | Tablet 768–1023 (derived)                                                                | Phone < 768                                                                                                                |
| ----------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Shell             | sidebar 220 + header row                                                  | tab bar + FAB, header row with search hidden < 1280                                      | fixed top bar 56 + tab bar + FAB (approved)                                                                                |
| Home              | main + aside 320 (≥ 1100); single column 1024–1099                        | single column, spacious, modules as desktop cards                                        | approved phone order; queue rows as separate cards                                                                         |
| Calendar          | day / week / list / team; grid scrolls inside sheet; day strip above grid | day / week / list (team allowed if ≥ 2 people; columns min 156 scroll sideways as today) | day / list only; day strip; page scrolls; blocks show portrait 28                                                          |
| Calendar toolbar  | one row                                                                   | wraps to two rows (today's behaviour)                                                    | date row with ‹ › + Today pill; view segment hidden (only two views, switched by a `Tabs` under the strip)                 |
| Booking Details   | right panel 480                                                           | right panel 480 (derived: width ≥ 768 leaves the grid visible)                           | bottom sheet, footer fixed, drag to dismiss                                                                                |
| New Booking       | right panel 480                                                           | right panel                                                                              | bottom sheet; client `Combobox` opens as a nested search sheet; window pills wrap; primary button full width in the footer |
| Overlays          | popover at pointer                                                        | popover                                                                                  | bottom sheet (existing behaviour of the quick menu)                                                                        |
| Filters           | pills in a row                                                            | wrap                                                                                     | horizontal scroll strip (existing `cal-filter`)                                                                            |
| Action groups     | inline pills in rows                                                      | inline                                                                                   | second line of the row, two 44 px pills                                                                                    |
| Forms             | recess fields 48                                                          | 48                                                                                       | 48, 16 px text, sheet pickers for lists longer than the platform wheel serves                                              |
| Dense information | compact register available                                                | spacious only                                                                            | spacious only; team grid unavailable                                                                                       |

Nothing shrinks: radii step 28 → 22, shadows lighten, layers reduce (approved). Horizontal scroll only inside the week and team grids.

---

## 10 · Accessibility rules

- **Contrast** measured per pair in `tokens.test.ts`; the four re-derived text values (§3.1) are the documented deviations from Flowstep, preserving its character.
- **Selection by elevation** is never the only channel: `aria-current="page"` on nav, `aria-selected` on windows and days, `aria-pressed` on segments, 600 weight on nav labels, and the focus ring on the selected calendar block. Dark theme adds the tonal step.
- **Touch targets** ≥ 44 everywhere; the 36 px in-object pills and the 28 px free-time slot extend their hit area with `::after` (existing rule §4A). Toolbar controls are 44 (Flowstep drew 40; the floor wins).
- **Keyboard**: every control focusable in visual order; ⌘K, Escape on sheets, arrow keys in the quick search stay.
- **Semantics**: nav is `<nav>` + links; rows that act are buttons or links, never `div onClick`; queue markers carry `sr-only` words; icon-only controls carry `title` + `sr-only`.
- **Forms**: label above field, helper always present, error replaces helper with icon + `role="alert"`; no placeholder-as-label; required fields marked in words.
- **Disabled**: `--bg-sunken` / `--ink-faint` (4.54:1), `aria-disabled` where the control must stay focusable (unfit windows keep their reason readable).
- **Motion**: `prefers-reduced-motion` collapses everything; no information lives in motion.
- **Screen readers**: the now line is `aria-hidden`; time figures carry a `time` element with `dateTime`; status is dot + word so the word is always read.

---

## 11 · Flowstep → production mapping

Format: Flowstep element → current production component → decision → system role → notes.

**Shell and navigation**

| Flowstep element             | Current                            | Decision                 | Role                 | Notes                                                           |
| ---------------------------- | ---------------------------------- | ------------------------ | -------------------- | --------------------------------------------------------------- |
| Sidebar with portrait at top | `Sidebar` + `AccountMenu` (bottom) | RESTYLE                  | shell                | account slot moves to top; menu behaviour kept                  |
| Active nav pill + rose dot   | `.nav.is-on` (bordered card)       | RESTYLE + selected state | navigation primitive | the clay bar on Home's "Today" is a Flowstep artefact; dot only |
| Pending count on Calendar    | `.nav .cnt` (rose chip)            | RESTYLE                  | navigation primitive | `--warning-ink` number                                          |
| Workspace group label        | `.nav-grp` uppercase               | RESTYLE                  | navigation primitive | `.type-meta`, no caps                                           |
| Header row: title + hint     | `PageHeader`                       | RESTYLE                  | page header          |                                                                 |
| Search pill 220              | `.search` button                   | RESTYLE                  | control              |                                                                 |
| Bell pill with dot           | `ActivityBell`                     | RESTYLE                  | control              |                                                                 |
| Create primary pill          | `WorkspaceToolbar` summary         | RESTYLE                  | control              |                                                                 |
| Phone top bar                | none (page header)                 | ADD composition          | shell                | fixed, 56 px                                                    |
| Tab bar with dot             | `BottomTabBar`                     | RESTYLE                  | navigation           | drop filled pill                                                |
| FAB                          | `WorkspaceFab`                     | RESTYLE                  | control              | tokens only                                                     |

**Surfaces and controls**

| Flowstep element                           | Current                         | Decision              | Role                                             | Notes                                    |
| ------------------------------------------ | ------------------------------- | --------------------- | ------------------------------------------------ | ---------------------------------------- |
| White lifted module                        | kit `.card` / `Card`            | RESTYLE               | `Card` module                                    | no border, `--shadow-rest`, 28           |
| Rose Time module                           | none                            | ADD VARIANT           | `Card tone="free"`                               |                                          |
| Recess field                               | `Input`/`Textarea`/`Select`     | RESTYLE               | field                                            |                                          |
| Primary / secondary / soft / success pills | `Button` variants, kit `.btn-*` | RESTYLE + ADD VARIANT | control                                          | kit classes deprecated                   |
| Flat "All completed (n)" pill              | none                            | ADD VARIANT           | `Button variant="flat"` (`--bg` fill, underline) | one use today; keep as variant not class |
| Status pill in panel header                | kit `.badge.b-*`                | ADD VARIANT           | `Badge variant="pill"`                           |                                          |
| Dot + word status                          | `Badge`                         | KEEP                  | status                                           |                                          |
| Hairline between sections                  | kit `.divider`                  | DEPRECATE → `.rule`   | primitive CSS                                    |                                          |
| Popover / quick menu                       | Radix + `cal-quick`             | RESTYLE               | overlay                                          |                                          |
| Toast                                      | `Toast`                         | RESTYLE               | overlay                                          |                                          |

**Home modules**

| Flowstep element                  | Current                                                    | Decision                           | Role                | Notes                                          |
| --------------------------------- | ---------------------------------------------------------- | ---------------------------------- | ------------------- | ---------------------------------------------- |
| Greeting                          | none (title only)                                          | ADD role                           | `.type-greeting`    | serif pending Q1                               |
| Facts line                        | `today-summary`                                            | RESTYLE → `FactsLine`              | domain (home)       |                                                |
| Next visit card                   | `NextVisitCard`                                            | RESTYLE                            | domain (booking)    | uses `TimeFigure`, `ContactActions`            |
| Queue rows                        | `PendingConfirmations`, `today-attention`, `AttentionCard` | REPLACE → `QueueRow`               | domain (booking)    | three implementations → one                    |
| Today rows with bars              | `DayList` / `day-row`                                      | REPLACE → `VisitRow`               | domain (booking)    | also replaces `desk-row`, `bookings-list` rows |
| Gap row "free until 13:00 · Open" | `day-list__gap`                                            | REPLACE → `FreeTime variant="row"` | domain (scheduling) |                                                |
| Team today rows                   | `TeamPulse`                                                | RESTYLE                            | domain (team)       |                                                |

**Calendar** — see §6 table (each row is a mapping).

**Booking Details / New Booking** — see §7 table.

**Statuses and actions**

| Flowstep element         | Current                 | Decision                               | Role         |
| ------------------------ | ----------------------- | -------------------------------------- | ------------ |
| "pending" amber word     | `.badge.b-amber`        | RESTYLE → `Badge` with `--warning-ink` | status       |
| Confirm / Decline pair   | `AttentionCard` buttons | RESTYLE → `QueueRow` actions           | action group |
| Completed / No-show pair | `desk-row__actions`     | RESTYLE → `QueueRow` actions           | action group |
| Cancel visit red text    | `.btn-danger`           | RESTYLE → `Button variant="danger"`    | destructive  |
| Create · 14:00–15:45     | `Button` submit         | KEEP, label computed                   | primary      |

---

## 12 · Deprecated patterns

Nothing is deleted in this phase. Each entry: old pattern → replacement → where used → priority → risk.

| Old pattern                                                                                                                      | Replacement                        | Where                          | Priority          | Risk                                                     |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------ | ----------------- | -------------------------------------------------------- |
| `globals.css` cabinet block (Onest 300, weight flattening, `.rise`, lilac, bento)                                                | `tokens.css`                       | every cabinet screen           | **A** (first)     | Medium: `data-surface="client"` must be in the new scope |
| kit bridge (`.amolie-app { --bg: var(--paper) … }`)                                                                              | `tokens.css`                       | everything under `.amolie-app` | **A**             | Low with aliases                                         |
| Bordered card with `--shadow-1` (`.card`, `Card` with `.card` rule)                                                              | `Card` restyled                    | 58 kit uses + `ui` Card users  | B–G               | Medium                                                   |
| `.btn`, `.btn-*` 36 px, 10 px radius                                                                                             | `Button` variants                  | 80+ uses                       | B–G               | Medium (heights change layouts)                          |
| Tinted status plaques `.badge.b-*`                                                                                               | `Badge` / `Badge pill`             | 100 uses                       | C–G               | Low                                                      |
| `.t-label` uppercase, `CardLabel`, `StatTile` labels                                                                             | `.type-meta`                       | 50 + Finance                   | G                 | Low                                                      |
| `.t-*` type classes, `text-[Npx]`, inline `fontSize`                                                                             | `.type-*` roles + lint             | 274 + 146 + 300                | C–G               | Low, mechanical                                          |
| `.seg`, `.tabs`, `.calendar-views`                                                                                               | `Tabs`                             | calendar, bookings, services   | D                 | Low                                                      |
| `side-sheet.tsx`                                                                                                                 | `Sheet surface="app"`              | 8 files                        | B                 | Medium (highest-frequency forms)                         |
| Old floating `Sheet` in cabinet forms                                                                                            | `Sheet surface="app"`              | 9 cabinet files                | B–F               | Medium                                                   |
| `.nav.is-on` bordered card, `.bnav__pill` fill, `.day-strip__day.is-on` ink fill, `.table tr.is-sel` rose fill                   | lifted state                       | shell, calendar, tables        | C–D               | Low                                                      |
| `.cal-free` dashed outline, `.cal-block` hatch + border, `.cal-appt` border + 3 px accent mark, `.cal-daynum.is-today` rose pill | §6 states                          | calendar                       | D                 | Medium (drag geometry untouched, only paint)             |
| `.attention` amber box, `today-pending` box, "All clear" text                                                                    | `QueueRow` + empty renders nothing | Home, bookings                 | G                 | Low                                                      |
| `avatarTint` six colours                                                                                                         | one neutral tint                   | every initials avatar          | B                 | Low                                                      |
| `serviceTone` eight cool tones; eight swatches                                                                                   | four warm tones                    | services, calendar, home       | B                 | Low (stored colours untouched)                           |
| JetBrains Mono as data face (`.mono`)                                                                                            | tabular Onest                      | prices, times                  | C–G               | Low                                                      |
| Geist / Geist Mono in `layout.tsx`                                                                                               | removed                            | fonts                          | G                 | Low (bytes saved)                                        |
| `DayRail` on Home                                                                                                                | removed from Home                  | Home                           | G                 | Low                                                      |
| `--support`, `--cell-rose`, `--cell-lilac`, `Card fill`                                                                          | none                               | Finance bento                  | G (Finance later) | Low                                                      |
| Lucide-looking glyphs in mocks                                                                                                   | cabinet icon set                   | —                              | —                 | none (never in code)                                     |

---

## 13 · New components and variants required

Genuinely new (no existing family covers them):

| Name                                               | Layer            | Location                                            | Why                                                                                          |
| -------------------------------------------------- | ---------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `ServiceBar`                                       | primitive        | `components/cabinet/service-bar.tsx` (+ CSS)        | Rule 02 on four surfaces; today a 3 px accent mark and a 7 px dot exist, neither is the rule |
| `FreeTime` (`variant="slot" \| "row" \| "module"`) | primitive        | `components/cabinet/free-time.tsx`                  | Rule 04; today a dashed outline                                                              |
| lifted state                                       | CSS convention   | `primitives.css`                                    | Rule 03; today three treatments                                                              |
| `TimeFigure`                                       | domain (booking) | `features/bookings/components/time-figure.tsx`      | shared by next-visit card and visit panel                                                    |
| `ContactActions`                                   | domain (booking) | same folder                                         | Call + Write (approved N-6) shared by card, panel, client page                               |
| `ClientStrip`                                      | domain (booking) | same folder                                         | approved N-2; read-only and pickable variants                                                |
| `ServiceLine`                                      | domain (booking) | same folder                                         | details list and form list share it                                                          |
| `VisitRow` (spacious / compact / team)             | domain (booking) | same folder                                         | replaces four row implementations                                                            |
| `QueueRow` (pending / ended / cancelled)           | domain (booking) | same folder                                         | replaces three implementations                                                               |
| `FactsLine`                                        | domain (home)    | `features/dashboard-home/components/facts-line.tsx` | header facts, member page                                                                    |
| `EmptyState`                                       | shared           | `components/ui/empty-state.tsx`                     | three inline copies today                                                                    |
| `Combobox`                                         | shared           | `components/ui/combobox.tsx`                        | client typeahead (approved N-5)                                                              |
| `.type-*` classes, `.rule`                         | CSS              | `primitives.css`                                    | the type scale and the one divider                                                           |

Variants on existing components: `Button soft / success / flat / danger-text`, `Button size="pill"`, `Badge variant="pill"`, `Card tone="free"`, `Sheet surface="app"` panel behaviour, `Tabs` lifted active (already), `Input/Textarea/Select` recess via tokens.

Not created: `Surface`, `ButtonV2`, `SidebarItem`, any `*New`. The sidebar item stays markup inside `Sidebar`; a component would be a wrapper around a link.

---

## 14 · `design.md` changes

In this repository the cabinet is specified by `UI_GUIDELINES.md` §2–§9 and `DESIGN_SYSTEM.md`; `DESIGN.md` owns the public page and only refers to the cabinet. Proposed edits, to be applied after owner review (§18), in one commit with the Phase A tokens so that "a rule changed only in code does not exist" (`DESIGN_SYSTEM.md` §17):

**`DESIGN.md`**

- KEEP everything about the poster and soft worlds, the theme mechanics, the do/don't list for the public page.
- MODIFY the "Мир второй — продуктовый" paragraph of the Overview and the "Кабинет не принадлежит ни одному из миров" section: the cabinet is no longer "Blush Rose, glass, 24 px cards"; it is the F2 material world specified in `UI_GUIDELINES.md` §2 (rewritten) with `docs/AMOLIE-DESIGN-SYSTEM-V2.md` as the source. One paragraph, a pointer.
- REMOVE the Don't "Don't write theme tokens on a wrapper instead of `:root` — the sheet in a portal will not see them" as a universal rule: it stays true for the public page's `ThemeStyle`, but the cabinet deliberately scopes tokens to `.amolie-app` because its portals carry that class. Reword to "public page".
- ADD nothing else; `DESIGN.md` does not gain cabinet content.

**`UI_GUIDELINES.md`**

- REMOVE §2.0 "six laws" as the constitution (replaced by §1 of this handoff), §2.4 "999 or 0", §2.5 "no shadows in the cabinet", §2.6 900 ms reveal, the Onest 300/400 rule in §2.2, the Phosphor rule in §2.7.
- MODIFY §2.1 colour tables → §3.1 of this handoff with measurements; §2.2 typography → §3.2; §2.3 spacing → §3.3; §3 navigation → §5; §4 buttons → §4 Button; §5 forms → recess rules; §6 cards → §4.1; §8 sheets → one `Sheet`; §9 feedback → EmptyState, Toast, LoadError.
- KEEP §2.1.1 (contrast is measured), §2A (words), §4A (44 px), §6A (time belongs to the salon), §10 PWA, §11 tone, §12 open questions (rewritten).
- ADD the density register, the three rules, the interaction-state table, the deprecation list pointer.

**`DESIGN_SYSTEM.md`**

- MODIFY §4.3 "Blush Rose" → the F2 palette pointer; §6 radius table cabinet column; §7.2 "glass as material" → material surfaces (no glass anywhere now: cabinet is flat with shadow, public worlds keep their own); §8 shadow levels → four cabinet levels; §9.2–9.4 cabinet durations and vocabulary; §11 icons (cabinet set, Phosphor public); §13.6 sheet.
- KEEP §1 philosophy, §2 principles, §3.1 slots, §3.2 Cyrillic filter, §4.4 measured pairs, §5.3 touch, §10 animation principles, §14 accessibility, §15 mobile, §16 bans (add: no card inside card, no colour per person), §17 governance.
- Version bump to 3.0 (breaking: cabinet world replaced).

**`Дизайн система AMOLIE/readme.md`, `AI-RULES.md`, `.impeccable/design.json`**: scope note "landing and public page; the cabinet follows `docs/AMOLIE-DESIGN-SYSTEM-V2.md`". `kit.css` header: "consumer of `tokens.css`; deleted when unused".

No competing `design-v2-final.md` is created. After Step 5 the authoritative cabinet specification is `UI_GUIDELINES.md` (rewritten) + `DESIGN_SYSTEM.md` 3.0; `docs/AMOLIE-DESIGN-SYSTEM-V2.md` remains the visual-direction record and this handoff the migration record.

---

## 15 · Migration strategy — no parallel systems

The failure mode to avoid: old world + Flowstep + V2 + page CSS all alive. The mechanism:

1. **One source of values from day one.** Phase A replaces both value sources (`globals.css` cabinet block and the kit bridge) with `tokens.css`. From that commit there is exactly one place a cabinet colour, radius or shadow comes from. The look shifts globally in one step — that is intended and reviewed as one visual diff.
2. **Aliases, not forks.** `legacy-aliases.css` maps every kit variable name to a semantic token. Old classes keep working with new values; nobody writes a new kit rule (lint: `--pink`, `--hair`, `--subtle`, `--r-` are forbidden in new CSS from Phase A).
3. **Primitives first, screens second.** A screen is migrated only by replacing its kit classes with primitives and domain components; the rules it leaves without a consumer are deleted in the same commit. `app.css` shrinks screen by screen; it never grows.
4. **Coexistence is bounded and visible.** During Phases C–G a migrated screen and an unmigrated one look 90 % alike (same tokens) and differ in details (borders, type classes). The remaining gap is listed per phase in the CHANGELOG and closed by Phase G, where `kit.css`, `legacy-aliases.css` and the Geist fonts are removed and the lint rules become errors.
5. **Public surfaces are physically isolated.** Values live on `.amolie-app` / `[data-surface='client']`; `:root` gets neutral defaults for new names; `theme.test.ts` for the public worlds stays green as the proof.
6. **Definition of done for the system**: `grep -r "amolie-app .btn\|t-meta\|b-green\|--pink" apps/web/src` is empty; `pnpm lint` rejects `text-[Npx]` and `fontSize:` in cabinet features; `tokens.test.ts` green; both themes and three languages checked on the five golden screens.

---

## 16 · Step 5 implementation plan

Sequence as preferred by the brief; the codebase supports it. Each phase is an independent, fully working step with green `lint / typecheck / test / build`, a CHANGELOG entry, its own commit, and `visual:check` run as a list diff (baselines are stale; compare lists, not zero).

### Phase A · Tokens and foundations

- **Files**: new `styles/tokens.css`, `styles/legacy-aliases.css`, `styles/primitives.css`, `styles/tokens.test.ts`; `styles/index.css` order; `globals.css` (delete cabinet block, extend `@theme inline`, `:root` defaults); `kit.css` (remove value block + bridge); `layout.tsx` (serif choice); `eslint.config.mjs` (warnings for inline sizes and kit variables); `calendar-model.ts` (`DENSITY` export, `HOUR` derived from it so nothing else changes yet).
- **Prerequisites**: owner answers to Q1–Q3 (§18).
- **Untouched**: all markup, all behaviour, routes, capabilities.
- **Visual regression risk**: High by design (global recolour, radius, shadow); one reviewed diff.
- **Functional risk**: Low. Watch: `data-surface="client"` scope, `Switch` track contrast on inset, sticky inside `.card` (backdrop-filter must stay `none`).
- **Tests**: `tokens.test.ts` (all pairs), public `theme.test.ts` unchanged, `visual:check` list.
- **Output**: one value source; Onest cabinet; lint guardrails.

### Phase B · Shared primitives

- **Files**: `components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `badge.tsx`, `tabs.tsx`, `card.tsx`, `sheet.tsx` (absorb `SideSheet`), `toast.tsx`, `skeleton.tsx`, `load-error.tsx`, new `empty-state.tsx`, `combobox.tsx`; new `components/cabinet/service-bar.tsx`, `free-time.tsx`; `lib/avatar.ts` (neutral tint), `dashboard-home/service-tone.ts` (four tones, moved to `features/services/service-tone.ts`), `services/components/color-swatch-picker.tsx` (palette); `icon.tsx` (new glyphs); migrate the 8 `SideSheet` consumers to `Sheet surface="app"`.
- **Prerequisites**: Phase A.
- **Untouched**: sheet open/close state flows, form submit logic, drag-to-dismiss.
- **Visual risk**: Medium (button heights 36→44/48 shift rows; sheets change geometry).
- **Functional risk**: Medium on the sheet merge (highest-frequency forms). Mitigation: migrate one consumer per commit; existing `new-booking-sheet.test.tsx`, `confirm-sheet.test.tsx`, `toast.test.tsx`, `status-primitives.test.tsx` must pass; add tests for `Combobox` keyboard behaviour and `Sheet` footer/scroll.
- **Output**: the whole primitive vocabulary of §4 and §13, tested.

### Phase C · Application shell

- **Files**: `sidebar.tsx`, `account-menu.tsx`, `bottom-tab-bar.tsx`, `page-header.tsx`, `workspace-toolbar.tsx`, `activity-bell.tsx`, `quick-search.tsx`, `workspace-fab.tsx`, `dashboard-shell.tsx` (phone top bar composition); `app.css` shell section, `workspace.css`, `workspace-fab.css`, `activity-bell.css` (delete replaced rules); `nav-config.ts` only for the Team icon key.
- **Prerequisites**: A, B.
- **Untouched**: nav items, capabilities, badges, admin nav, ⌘K commands.
- **Visual risk**: Medium. **Functional risk**: Low.
- **Tests**: `capabilities.test.ts`, `workspace-commands.test.ts`; manual keyboard pass of sidebar and tab bar; `visual:check` shell screens.
- **Output**: shell tokens (`--sidebar-w`, `--topbar-h`, `--gutter`), lifted nav, phone top bar.

### Phase D · Calendar

- **Files**: `calendar-grid.tsx` (class names + `data-density`, `--slot-h` inline), `calendar-toolbar.tsx` (Tabs, buttons), `day-strip.tsx`, `team-filter.tsx`, `calendar-quick-actions.tsx`, `calendar-agenda.tsx` (→ `VisitRow`), `calendar-screen.tsx` (composition only), `calendar.css`, `calendar-interactions.css`, `calendar-blocks.css`, `app.css` calendar section; `grid-geometry.ts` reads `DENSITY`; new `features/bookings/components/visit-row.tsx`, `queue-row.tsx`, `time-figure.tsx`, `contact-actions.tsx`, `client-strip.tsx`, `service-line.tsx` (built here because the list view needs rows).
- **Prerequisites**: A–C.
- **Untouched**: `use-grid-drag.ts`, `use-booking-move.ts`, `use-slot-mutations.ts`, `open-intervals.ts`, `calendar-columns.ts`, every sheet's logic, Undo flows.
- **Visual risk**: High (the strongest screen). **Functional risk**: Medium — the only real one: geometry. Mitigation: `grid-geometry.test.ts` and `calendar-model.test.ts` extended for both registers; drag/move/select tested manually in day, week, team.
- **Tests**: all `scheduling/*.test.ts`, `bookings/*.test.ts`; `visual:check` day / week / team / list, both themes, phone.
- **Output**: the five time states, register switch, `VisitRow`, `QueueRow`.

### Phase E · Booking Details

- **Files**: `booking-detail-sheet.tsx` (composition on `TimeFigure`, `Badge pill`, `ClientStrip`, `ContactActions`, `ServiceLine`, footer), `edit-booking-sheet.tsx` (recess fields), `reschedule-block.tsx`, `booking-sheets.tsx` (unchanged API), `app.css` booking section.
- **Prerequisites**: A–D.
- **Untouched**: status transitions, cancel confirm, edit submit, member reschedule logic.
- **Visual risk**: Medium. **Functional risk**: Low.
- **Tests**: `status-meta.test.ts`, `activity.test.ts`, manual state matrix (pending / confirmed / in progress / ended / completed / cancelled with reason).
- **Output**: the booking read-only composition.

### Phase F · New Booking

- **Files**: `new-booking-sheet.tsx` (→ `Sheet surface="app"`, `Combobox` client, `ServiceLine` list with running total, window pills with fit state, footer with computed range), `new-booking-sheet.test.tsx`.
- **Prerequisites**: A–E; **the approved N-5 behaviour (multi-service, fit check) is product work bundled with this phase by decision R-7/R-24** — the form is rebuilt once.
- **Untouched**: `bookable.ts`, `open-intervals.ts` (the fit check reads them), create endpoint contract.
- **Visual risk**: Medium. **Functional risk**: Medium (highest-frequency form). Mitigation: the existing test file grows to cover typeahead fall-through, unfit windows, custom time, member filter.
- **Output**: editing composition; `Combobox` proven.

### Phase G · Dashboard Home and closure

- **Files**: `app/[slug]/dashboard/page.tsx` (composition), `next-visit-card.tsx`, `pending-confirmations.tsx` (→ `QueueRow`), `day-list.tsx` (→ `VisitRow` + `FreeTime`), `team-pulse.tsx`, new `facts-line.tsx`, `today-model.ts` (queue kinds, if not already from Phase D), `front-desk` screen retired per R-8 (route redirect), `booking-page-card.tsx` moves to Страница (R-19); `workspace.css` Home section; then removal of `kit.css`, `legacy-aliases.css`, Geist fonts; lint rules to error; new `visual:baseline`; documentation edits of §14.
- **Prerequisites**: A–F.
- **Untouched**: `today-model.ts` computations, capability gates, server fetches.
- **Visual risk**: High. **Functional risk**: Low–Medium (route redirects for R-5/R-8 are product changes already approved).
- **Tests**: `today-model.test.ts`, `today-bookings.test.ts`, `front-desk-model.test.ts`; three role renderings; phone order; empty queue renders nothing.
- **Output**: the golden slice complete; one system; docs updated.

Remaining screens (Clients, Services, Page, Team, Finance, Settings, admin) follow after Step 5 on tokens and primitives only; they are not part of the golden slice.

---

## 17 · Risks

| Risk                                                                             | Mitigation                                                                                                                         |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Two value sources during Phase A if the `globals.css` block is left "for safety" | Delete it in the same commit as `tokens.css`; `[data-surface='client']` is in the new scope                                        |
| Public page or landing picks up cabinet values through shared primitives         | Values only on the cabinet scope; `:root` neutral defaults for new names; public `theme.test.ts` and `landing:contrast` stay green |
| Sheet merge breaks the highest-frequency forms                                   | One consumer per commit; existing tests; keep `SideSheet` file until its last consumer moves, then delete                          |
| Calendar geometry drifts between TS and CSS with two registers                   | Single source in `DENSITY`; inline `--slot-h`; tests per register                                                                  |
| Dark theme guessed by formula                                                    | Candidate marked; live check before approval; the tokens test refuses an unmeasured pair                                           |
| 274 + 146 inline sizes cannot be removed at once                                 | Aliases + lint warning → error at G; sizes leave with their screens                                                                |
| Button height change (36 → 44/48) reflows dense toolbars                         | Toolbar layout reviewed per screen in its phase; 44 is the product's own floor                                                     |
| "Selected by elevation" is invisible to some users or in dark theme              | aria + weight + focus ring; dark tonal step                                                                                        |
| Client photographs appear in mocks but not in data                               | Initials in a neutral circle; `avatar?` slot reserved (Q2)                                                                         |
| Serif face without Cyrillic or tabular figures chosen by look                    | Filter enforced by `next/font` subsets; tabular check before Phase A                                                               |
| Regression baselines are stale (26 known failures)                               | Compare failure lists per phase; new baselines only at G                                                                           |

---

## 18 · Open questions

Only what neither Flowstep nor the code answers.

1. **Expressive serif in the cabinet** (overrides M4). Approve, and pick from Playfair Display / Cormorant Garamond / Spectral after the tabular-figure check; or decline, and the three serif roles are Onest 600.
2. **Client photographs** (overrides brief §8). No field, no upload, personal data. Recommendation: initials now, slot reserved; a separate task with backend and consent if ever.
3. **Admin panel scope.** It shares `.amolie-app`. Recommendation: tokens and primitives yes (Phase A affects it automatically), screen redesign no; its six sheets migrate in Phase B.
4. **Dark theme approval** by live screen after Phase A, not by table.

---

## Final validation — four screens, one vocabulary

| Element           | Home                                                                          | Calendar                                        | Booking Details                            | New Booking                                                 |
| ----------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| Ground / surfaces | `--bg`; `Card` module ×3, `Card lead` (next visit), `Card tone="free"` (Time) | `--bg`; `Card` module (sheet)                   | dimmed calendar; `Sheet surface="app"`     | same `Sheet`                                                |
| Type roles        | greeting, facts, title, meta, strong, dense, figure                           | greeting (date), page, dense, strong, meta, now | figure, strong, meta, dense, title (total) | page, meta, dense, figure (totals), body                    |
| Rule 02 bar       | `VisitRow`, `TimeFigure` (card)                                               | `BookingItem`                                   | `TimeFigure`                               | `ServiceLine` dots (bars appear when the visit exists)      |
| Rule 03 lift      | nav pill, hover rows                                                          | selected block, day-strip cell, view tab        | none needed (panel floats)                 | selected window pill                                        |
| Rule 04 rose      | gap row, Time module, Call                                                    | free slots + Open                               | Call                                       | running-total strip, selected window                        |
| Status            | `Badge` dot+word, `QueueRow` markers                                          | dashed pending, word in `--warning-ink`         | `Badge pill`                               | unfit window reason `--warning-ink`                         |
| Actions           | primary / secondary / success / soft / flat pills                             | primary / secondary / icon pills, `pill` Open   | primary 48 / secondary / danger text       | primary 52 / ghost                                          |
| Fields            | —                                                                             | —                                               | note recess (read)                         | recess `Input`, `Textarea`, `Select`, `Combobox`            |
| Density           | spacious (compact in team Home rows: no; rows stay 56 with names)             | spacious / compact                              | spacious                                   | spacious                                                    |
| Exceptions        | none                                                                          | none                                            | none                                       | the 64 px total strip = figure role at 26 (documented §3.3) |

No screen needs an arbitrary token, class or colour outside §3–§4. The four screens are one language; the fifth (shell) is the frame they share.
