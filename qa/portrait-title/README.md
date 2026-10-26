# Portrait title readability

The 4.0.2 title scales its fixed 1200-pixel stage to fit the screen. At 390 x 844,
Quick battle renders at 7.475-pixel text and a 20.8-pixel button height.

The v7 source, version 4.0.3, gives portrait windows up to 600 pixels wide a
viewport-sized title. Existing logo and tank artwork, menu choices and utility
controls flow vertically. Quick battle uses 20-pixel text and a 64-pixel target;
other title buttons are at least 44 pixels high. Expanded choices and reconnect
remain reachable in the title's own scroll area. About has a reserved top strip.

Only a visible portrait title changes the stage layout. Battle and other overlays
restore the existing stage; desktop, tablet and landscape title styles remain.
Returning to the title resets its scroll position. This small DOM reset addresses
an independently identified regression in the first CSS-only candidate.

Qualification uses muted isolated headless browsers and existing DOM/game hooks.
`node tools/portrait-title-audit.mjs index.html BASELINE/index.html` checks ten
viewport sizes, the 600/601-pixel boundary, readable target bounds, text overflow,
More/reconnect placement, programmatic scroll reachability, six menu return paths,
Quick battle, pause/resume, rotation, and saved preferences. A supplied baseline
must be 4.0.2 with its companion assets; unaffected viewport geometry must match.
`node tools/verify.mjs` remains the ordinary 21-check full-match smoke gate.

Native Firefox rendering and independent source/browser review are additional
release checks. Screenshots, exact runtime hashes, complete receipts and the
silent comparison clip live with the release evidence. Physical mobile devices,
native touch gestures, keyboard injection, sound and fullscreen activation are
outside this qualification. The previous v6 drop and shared About assets remain
unchanged. Use the 4.0.2 merge b81a80de87ee0dfb0093614a2b88ead22b9352eb for rollback.
