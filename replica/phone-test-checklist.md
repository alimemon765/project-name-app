# Phone test: paper sheet and shell (B5)

**URL (same Wi-Fi as the Mac):** http://192.168.1.2:3100
If macOS asks whether "node" may accept incoming connections, click **Allow**.

**Heads-up:** the service worker can't install on a plain `http://192.168.x.x` address, because browsers only allow service workers on HTTPS or localhost. So offline mode (item 10) won't work here; it gets tested on the HTTPS Vercel preview in Part D.

For each item, reply with ✅, ⚠️ (works, but feels off: say how) or ❌ (broken: say what happened). Note your phone model and browser (e.g. "Pixel 6a, Chrome").

| # | What to try | What should happen |
|---|---|---|
| 1 | **Drag to dismiss:** open a paper, then slowly drag the sheet down from its grey handle and let go past halfway | The sheet follows your finger exactly, then slides closed |
| 2 | **Flick:** open a paper, then flick down quickly from the handle | It closes even from a short flick; a short slow drag springs back instead |
| 3 | **Rubber-band:** with the sheet fully open, drag *up* from the handle | It moves up a little with growing resistance, then springs back. It never sticks |
| 4 | **Scroll vs drag:** open a long paper and scroll the abstract down, then back up to the top, then keep pulling down | Scrolling scrolls the text; only once you're at the top does pulling down move the sheet |
| 5 | **Back button:** open a paper, then use Android back (gesture or button) or the browser's back | The sheet closes and you stay on the feed. Back again leaves the page as normal |
| 6 | **Keyboard:** go to Settings and back, then tap anywhere text can be typed. (Search arrives in step 2; this checks nothing jumps or zooms) | No zoom-in on tap; nothing hidden behind the keyboard |
| 7 | **Safe areas / notch:** look at the top bar and the bottom tab bar, upright and sideways | Nothing sits under the notch, camera hole or home indicator |
| 8 | **Dark mode:** switch your phone to dark mode (or Settings → Appearance → Dark in the app) | Everything is readable; no white flashes; the sheet is dark too |
| 9 | **Tap targets:** tap the bookmark on a few cards, the tab bar items, and the sheet's close button | Each responds on the first tap, and you never hit the wrong thing |
| 10 | **Feel:** use it for a minute: open papers, save two, check the Saved tab | Taps feel instant and saves appear in Saved. *(Offline: n/a on this URL, see the note above)* |
