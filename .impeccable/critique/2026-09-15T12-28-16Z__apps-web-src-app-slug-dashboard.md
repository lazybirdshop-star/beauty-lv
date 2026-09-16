---
target: дашборд
total_score: 24
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
target_identity: 'file:/Users/main/Documents/Projects/Beaty/apps/web/src/app/[slug]/dashboard'
timestamp: 2026-09-15T12-28-16Z
slug: apps-web-src-app-slug-dashboard
---

Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score — 24/40 (Acceptable)

| #   | Heuristic                       | Score | Key issue                                                                         |
| --- | ------------------------------- | ----- | --------------------------------------------------------------------------------- |
| 1   | Visibility of System Status     | 3     | Calendar tiles contradict the list: 6 vs 11 free slots, 0 pending vs badge 17     |
| 2   | Match System / Real World       | 3     | «Отклонить» opens «Отменить запись?»; «Рабочее время» opens «Опубликовать период» |
| 3   | User Control and Freedom        | 2     | «Не пришёл» one tap, no confirm, irreversible after the toast                     |
| 4   | Consistency and Standards       | 2     | Member colour differs across screens; dashed = free AND pending                   |
| 5   | Error Prevention                | 2     | «Не пришёл» (28px) next to «Завершить»; disabled buttons without reason           |
| 6   | Recognition Rather Than Recall  | 3     | Members distinguished by colour only on the day strip                             |
| 7   | Flexibility and Efficiency      | 3     | ⌘K and bulk complete good; no bulk confirm, front desk hidden in «Ещё»            |
| 8   | Aesthetic and Minimalist Design | 2     | Phone home 3480px long; redundant «Подтверждена» chips                            |
| 9   | Error Recovery                  | 2     | «Опубликовать 0 окон» disabled without explanation                                |
| 10  | Help and Documentation          | 2     | Good hints in finance/settings; empty payouts is one line                         |

## Design Specificity

Careful but category-interchangeable (Fresha/Booksy with a serif). Product-specific: the «now» layer (in the chair, now-line, rings). Prototype weakness.
Detector: 185 advisory findings (136 font-size, 43 radius — ~174 are prototype literals, DESIGN.md out of date; off-prototype: 9px, radii 7/13/18/28px; 2 side-tab from prototype; 4 colour). Browser: low-contrast ×52 = sage #2e7a58 on #ddf0e6 at 4.38:1; h1→h3 skip (CardTitle is h3); tab labels 10–10.5px; text-occlusion ×38 likely closed menus (false positive).

## Priority Issues

- [P1] Member colour inconsistent: home uses teamTones(), calendar-columns.ts:111 / calendar-grid.tsx:256 / team-screen.tsx:177 use raw memberTone() hash (collisions). Fix: one teamTones map everywhere + initials. /impeccable harden
- [P1] Touch targets 28–34px (Завершить/Не пришёл 28, primary 34, segments 32, close 32×32, links 19px tall), tab labels 10.5px. Fix: ≥44px hit areas, 8px gaps. /impeccable adapt
- [P1] «Не пришёл» irreversible (no_show in CLOSED, booking-detail-sheet.tsx:33). Fix: «Вернуть статус» action, move to ⋯ or confirm with client name. /impeccable harden
- [P2] Accessibility below AA: sage chip 4.38:1, heading skip, dashed ambiguity, colour-only no-show in dark. Fix: darken --sage-ink, CardTitle h2/level prop, non-colour pending cue. /impeccable audit
- [P2] Phone Today/Calendar overloaded and self-contradicting (3480px home, ~20 controls before first visit, tiles vs list, 17 ×3). Fix: collapse requests to one row, drop redundant chip, scope-label or drop tiles. /impeccable distill

## Persona Red Flags

Alex: no bulk confirm/swipes, no skip link, noisy week grid pills.
Sam: colour-only members with collisions, small targets, 4.38:1 chips, h1→h3, dashed ambiguity.
Casey: top-of-screen actions, «Не пришёл» 8px from «Завершить», front desk in «Ещё», long scroll.
Solo Riga nail master: period sheet defaults to 0 windows with disabled CTA, 1h step vs 1h30 service, dd/mm/yyyy native dates; QR/share on home is right.

## Minor Observations

/pricing overflows at 390 (421px); duplicate clock on front desk; duplicate create buttons on desktop; reject/cancel both in request sheet; toggle label describes off-state; admin sees salon income; «2 из 5 мастеров заняты» counts owner/admin; «Сменить пароль» looks disabled; CSV as primary on phone; «Рассчитать сентябрь» mid-month without warning; DESIGN.md sidecar stale.

## Questions

1. 17 pending requests: daily work or a case for auto-confirm? Why is the first screen a queue, not her day?
2. Is member colour identity or decoration — why a hash, not the owner's choice?
3. What makes the cabinet AMOLIE rather than «Fresha with serifs»?
4. Why a separate front desk when Today already has in-chair / to-mark / next?
