# /impeccable critique: build steps 0–1 (2026-10-21)

**Method:** dual-agent. Assessment A (design review, 3 personas) and Assessment B (detector + browser measurements) were run isolated and synthesised afterwards.

## Design Health Score (Nielsen): 25/40, "acceptable–good"
| # | Heuristic | Score | Key issue (A) |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Feed silently stopped at 30 of 111 → **fixed** (Show more + end-of-list line) |
| 2 | Match system / real world | 3 | Publisher monograms (Co/El) read as noise; "build step" copy → **copy fixed** |
| 3 | User control and freedom | 3 | Unsave has no undo (Sonner toast arrives in step 2) |
| 4 | Consistency and standards | 2 | "Newest first" looked like a chip → **fixed** (plain text) |
| 5 | Error prevention | 2 | One tap unsaves on Saved, no undo |
| 6 | Recognition rather than recall | 2 | The 13-slot register has no legend |
| 7 | Flexibility and efficiency | 2 | No shortcuts; Save before title in tab order → **tab order fixed** |
| 8 | Aesthetic and minimalist design | 4 | Calm, dense, deliberate in both themes |
| 9 | Error recovery | 2 | Load error has no retry button |
| 10 | Help and documentation | 2 | "Open methods" not yet linked from the register |

**Detector (B):**
- source scan: 0 findings;
- URL scan: 1 (Geist overused, a true positive, deferred to /replica-brand).

**Measured (B):**
- contrast: 0 failures in 16 views;
- overflow: none;
- headings: correct;
- sheet: dialog/aria-modal/inert correct;
- first card visible at 606 ms and LCP 636 ms on Fast 4G + 4× CPU;
- 409 KB transferred, 175 KB of it fonts.

## Fixed now (all P0/P1 within built scope)
| Sev | Issue | Fix |
|---|---|---|
| P1 | Feed truncated at 30, no end marker | Keyset `/api/feed?cursor=` + "Show more (n of N)" + "That's every paper from the last 30 days." |
| P1 | Two taps to an abstract failed on phone (abstract below the 60% detent) | Abstract moved directly under the title/date; clamp 10 lines; DOI, authors and chips follow |
| P1 | Region invisible on cards (South Asia persona) | First region shown in the card meta row |
| P1 | Focus fell to `<body>` after a mouse/tap close (B measured) | Fallback to the card link that opened the sheet |
| P2 | Targets < 44px: Save 40, theme 36, copy-DOI 32, home link 24, offline link 18 | All raised to 44px |
| P2 | Save before the title in tab order | Title link first in DOM; Save positioned top-right |
| P2 | Fake "Newest first" chip; "build step" copy shown to users | Plain muted text; user-facing copy |

## Persona P0 outside built scope (decision for Ali)
**Professor: "what's new *for me*".** There are no topic preferences until onboarding (planned step 4).

**Proposal:** pull the onboarding topic picker into step 2. Step 2 builds the Topic filter anyway, so "my topics" can be its saved default.

## Logged for later
| Sev | Issue | Owner |
|---|---|---|
| P2 | Register legend + method link; first-visit hint | step 2 |
| P2 | Unsave undo toast (Sonner) | step 2 |
| P2 | Retry button on load errors | step 2 |
| P2 | Fonts 175 KB: subset / fewer weights | step 2 (perf pass) |
| P2 | Left-off line (DESIGN.md) not rendered; new-dot is the only cue | step 2 |
| P2 | No data/code signal for the engineer persona | v1.5 (Code & data badge) |
| P2 | Desktop rail (300 px) absent; 2-line abstract snippet on desktop cards | step 2 |
| P3 | "Nothing new since <today>" on a same-day revisit → relative time | step 2 |
| P3 | Desktop sidebar links 34 px (pointer-only) | keep |
| P3 | PROJECT_NAME placeholder in title/manifest | /replica-brand |
