# Step 2 design pass (in progress, 2026-10-22)

Ali asked for the five design skills on everything built in step 2. Status when the usage limit hit:

| Skill | Status |
|---|---|
| impeccable (critique + audit) | context + craft floor loaded; Assessment A (design review) and B (detector + browser) sub-agents launched; **reports not yet collected** |
| taste-skill (app screens) | lint 0/0; inspect: Explore 1 FAIL (onboarding dialog shadow: a real overlay, defensible) + 1 WARN (edge text @390); Settings 2 WARN (unused canvas, defensible: 560px form column) |
| emil-design-eng | reviewed (findings below) |
| review-animations | **cannot be started by Claude** (user-invoked only): Ali types `/review-animations` |
| break-ui | 12 worst-case scenarios × 320/412(dark)/640px shot to `.localdb/scratch/breakui/` (no horizontal overflow at any width); **screenshots not yet reviewed** |

## Findings so far (to fix next session)
1. [P1] Onboarding initial focus lands on the scroll container: a blue ring around the whole topic list (phone). Focus the heading (tabIndex -1) instead.
2. [P1] A first-time visitor opening a shared link (`/?q=…`) gets the onboarding modal on top of it. Show onboarding only on the plain Explore URL.
3. [P2] Desktop onboarding uses the right side panel and wraps topic names; use a centred dialog (~560px) on desktop.
4. [P2] Topic picker draws round radio marks for a multi-select; use square check marks. In Settings it nests bordered boxes in a bordered card; use tone-step rows.
5. [P2] Tiny uppercase tracked labels ("TOPICS" rail heading, journal group legends in the sheet): banned by taste-skill and impeccable. Sentence case.
6. [P2] Chip row on tablet loads scrolled sideways (new-since chip cut off) despite overflow-anchor:none; investigate snap-x.
7. [P3] Settings switch animates `left` (layout); use transform translateX. Dialog exit should be faster than enter (150ms). Status line and new-since count need tabular-nums. Review-page buttons need a visible "Saving…" state. FilterDialog `autoFocus` on Done shows a focus ring on mouse open.

## Emil review (Before / After)
| Before | After | Why |
| --- | --- | --- |
| switch thumb `transition-[left]` | `transform: translateX()` | animate transform only |
| dialog enter = exit 200ms | exit 150ms, enter 200ms | exit faster than enter |
| proportional digits in status line / new count | `tabular-nums` | counts change on every filter |
| onboarding reuses side-panel slide on desktop | centred dialog, opacity + scale(0.97) from center | modals stay centred |
