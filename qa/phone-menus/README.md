# Phone menu readability, 4.0.4

The fixed 1200 by 800 game stage previously scaled menu text and controls down
with the battlefield. At 390 by 844, How to play used 5.2-pixel instructions and
a 12.87-pixel-high return button. v8 extends the existing portrait title layout
to the remaining menu and results sheets at widths up to 600 pixels.

The stage clips overflow while a portrait overlay is open, and the page body is
fixed and clipped. Bringing a lower control into view scrolls its menu without
shifting the underlying game stage or the page, including in Firefox.
The shop preview is reparented into its footer on phones, and its flight origin
uses the actual unscaled stage width. Battle logic and network code are unchanged.

Run from the repository:

```
python tools/polish.py
node tools/phone-menus-audit.mjs index.html PATH_TO_4.0.3/index.html OUTPUT_DIR
node tools/portrait-title-audit.mjs
node tools/verify.mjs
```

The menu audit covers 16 states at 320x480, 390x844, 600x800, 601x800,
768x1024, 1280x800 and 844x390. Phone assertions check readable text, control
dimensions, clipping, scroll reachability and About separation. The four larger
or landscape sizes compare exact menu geometry with 4.0.3. Eleven DOM/game-hook
flows per viewport exercise setup, garage, manual pick, auto-deal, help return,
pause, inventory, search, a completed 20-shot match and rematch.

Online/public/connected and four-player host views are presentation fixtures;
they do not establish a network connection. The two-player result comes from
a completed match. Four-player scores are a presentation fixture. No multiplayer
qualification is claimed. Tests use owned muted headless browsers without
physical input, injected pointer/keyboard input, focus, clipboard, fullscreen or
audio actions. Native touch gestures and real mobile devices remain unqualified.

Release validation: all 112 Chrome menu cases, 77 flow checks, 1,596 phone control
measurements and 64 exact non-phone menu geometry comparisons passed. Native
headless Firefox passed 48 menu cases and 33 flows across the three phone sizes.
Paint-name measurements ensure the garage labels fit without mid-word wrapping.
The existing ten-viewport title regression and 21-check full-match smoke passed.
Independent review covered source/rebuild, rendered menus, preview rotation,
manual-pick flight geometry and exact battle-state preservation on menu return.
