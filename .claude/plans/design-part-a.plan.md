# Plan: /replica-design, part A (direction exploration)

**Complexity:** Medium. **Stops at:** Ali's direction pick. No app code. Prototypes are throwaway, under `replica/design/directions/`.

## Patterns to mirror
No app code exists yet, so there is nothing to mirror. Sources of truth: PRODUCT.md, `replica/design/shape-brief.md`, D008 (libraries), `data/topics.json` (our labels).

## Tasks
1. **Fixture data.** Pull 20 real recent papers from our journals via OpenAlex (one list call, select fields). Add the worst cases: a 40-word title, 30+ authors, no abstract, non-Latin author names, a long DOI. Output `replica/design/directions/_data/papers.json` (metadata only, CC0 from OpenAlex). Validate: a script checks each worst case is present.
2. **Direction research.** Read taste-skill (app-screens mode), prototype, apple-design and emil-design-eng. Define 3 directions: editorial (light-first), instrument (data-dense), plus one taste-skill pick. Each gets a type pairing (open fonts: Google Fonts/OFL), a palette, 13 topic hues and the journal treatment (no left colour bar). Validate: our own contrast check script, AA for text and chips in both themes.
3. **Prototype builds.** One shared HTML/JS shell + 3 CSS token sets. Screens: feed (sticky chip row, New chip), paper sheet (spring open, drag dismiss, interruptible; reduced motion), Region sheet (South Asia sub-regions). `?theme=light|dark` and `?screen=` params so screenshots are deterministic. Validate: lint.mjs clean.
4. **Look-and-fix.** inspect.mjs + the built-in browser at 390 and 1280, light and dark. Fix, then re-inspect.
5. **Capture.** 3 directions × 3 screens × 4 variants = 36 PNG/JPGs + a README per direction. Local URL via a static server (`.claude/launch.json`).
6. Commit and update PROGRESS.md. **STOP** for the pick.

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Prototype drifts toward the reference app's look | medium | explicit anti-reference checks: no dark-teal default, no left colour bar, no mascot |
| 13 AA-safe hues in both themes | high | hues used as tinted chip fills with dark/light text + a shape glyph per topic; computed contrast check |
| Font licensing | low | Google Fonts OFL only, recorded per direction |
| Screenshot theme emulation on static files | medium | `?theme=` param instead of relying on emulation |
