---
target: 'landing page on localhost:3000'
total_score: 24
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 1
target_identity: 'file:/Users/main/Documents/Projects/Beaty/apps/web/src/app/page.tsx'
target_fingerprint: 'sha256:fd6daa90013c205e2e2eda9d70c5064bbf69b7af87324a4ef7a23fe8bb33dbc2'
target_path: /Users/main/Documents/Projects/Beaty/apps/web/src/app/page.tsx
timestamp: 2026-09-21T11-29-27Z
slug: apps-web-src-app-page-tsx
---

Method: dual-agent (A: design review · B: detector + overlay)

## Health score: 24/36 (67%, Acceptable). H7 n/a (single-path landing)

H1 3 · H2 3 (hero shows a 3-master salon to solo audience) · H3 3 · H4 2 (application-mode copy leaks open-registration wording) · H5 2 (.reveal hides content without JS) · H6 3 · H7 n/a · H8 2 (17.7k px desktop / 19.6k px mobile, repeated sections) · H9 3 · H10 3 (nothing on what happens after applying)

## Specificity

Authored: the night-DM scene collapsing into one calendar, the same Tuesday 9 Sep across every mockup, mockups drawn in dashboard material, LV names, GDPR footer. Generic: serif-italic accent in every headline (Instrument Serif over Inter, not Piazzolla), six-card feature grid, two plan cards, cream bg, kickers above every h2.
Detector: CLI 110 advisory (all CSS; 107 design-system-* false positives vs stale DESIGN.md landing section), 2 bounce-easing (tokens.css:75 --ease-spring), 1 layout-transition (sections.css:599 .faq__a height). Browser 80 desktop / 82 mobile: bounce-easing 15, undersized/tiny text in mockups 17, low-contrast 5 (white on #e2568a = 3.54:1), kicker-above-heading 5, skipped-heading 1, nested-cards 5 (mockups).

## Priority issues

- [P1] Content below the hero is invisible without JS or before hydration: motion.css:4 `.reveal{opacity:0}` has no `.js` scope (28 blocks). Fix: `.js .reveal`. → harden
- [P2] Hero sells a salon to a solo master: 3-column team calendar + specialist picker; .hero__for hidden on mobile. Fix: single-chair day in hero, team calendar only in #salons, audience line on mobile. → clarify
- [P2] Application-mode copy leaks: finalLede, faqA6 ("about ten minutes"), metaDescription (en.ts:2477 "Set up in about 10 minutes"; generateMetadata ignores overrides), /register "a couple of minutes"; "Requesting access is free" (en.ts:2842) + LV "bez maksas" against the no-"free" decision. → clarify
- [P2] Length and repetition: 11 sections, ~24 phone screens; Solo/Growth/Features/Plans restate each other. Pricing → "What happens after you apply". → distill
- [P2] White on pink #e2568a 3.54:1 on "Записано ✓" button and time chip; spring overshoot easing against one-curve rule; FAQ animates height. → polish
- [P3] 1024px: salon card time labels collide, chips clipped; footer links 32px and nav CTA 42px on touch; 11px caps eyebrows; footer h4 after h2. → adapt

## Personas

Jordan: application never explained; "Тарифы" with no numbers reads as hiding. Riley: no-JS blank; locale switch leaves menu open; LV H1 fills 355px exactly. Casey: 24 screens, language switch at bottom of menu. Riga nail master: sees a salon, no nail signal on mobile, no live example page, no reply time; "Мы читаем каждую" buried.

## Minor

~19 font families declared on <html>; hero section lacks id; RU "Тарифы" vs EN/LV "Plans"; em-dash density 29; footer disclaimer ~104 ch.
