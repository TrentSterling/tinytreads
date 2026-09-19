# CLAUDE.md, Tiny Treads

Single-file turn-based artillery game (Pocket Tanks / Scorched Earth lineage): destructible terrain, 400 weapons, garage, quick battle against the CPU, local and online play. Live at https://tront.xyz/tinytreads/ (GitHub Pages, `main` root). ChatGPT writes the drops; this repo hosts them.

## Read first

- `index.html` is built from the newest drop in `versions/` by `tools/polish.py`. The drop is the source of truth; do not hand-edit `index.html`.
- The drop's own header comments ("a machined little arcade, not a dashboard", "once connected, the lobby is a lobby") are the design brief. Keep it that way.

## Rules

- One static HTML file. No bundler, no npm, no CDN, no fonts. Canvas 2D.
- Online play uses public MQTT brokers over WebSocket for matchmaking plus WebRTC between players. No backend of ours. "Experimental" until a real separate-network match has been played.
- No em dashes in player-facing strings or docs (code comments in the drop are left alone). Discord links are `tront.xyz/discord/`.
- Hosting edits live only in `tools/polish.py`: canonical and social meta after the author tag, the em dash sweep. Anything else is a game change and belongs to the next drop.

## Workflow

1. New drop lands in `~/Downloads/tiny-treads-vN.html`: copy it to `versions/`, point `tools/polish.py` at it (or pass the path), run it. The script aborts if an anchor is missing; fix the anchor, never hand-merge.
2. `node tools/verify.mjs` (14 checks: boot, title, arsenal count, quick battle, fire, field canvas, back to menu, reload, storage, console). Also accepts the live URL.
3. `node tools/og-shot.mjs` only if the look changed (title screen at 1200x630 with buttons hidden; candidates scored by weapon-trail pixels from the attract battle). Bump `?v=N` on the og-image meta in `tools/polish.py` when the image changes.
4. Commit, push. Pages deploys in about a minute. Re-run `verify.mjs` against https://tront.xyz/tinytreads/.

## Public hooks

`window.POCKET` (alias `window.TINY`): `version` (`4.0.0`), `WEAPONS` (400), `PACKS`, `settings`, `startPractice`, `showTitle`. Title ids: `#title`, `#quickPlay`, `#titleGarage`, `#titleArsenal`, `#titleHelp`, `#titlePrivate`, `#titleSound`, `#fullscreenTitle`, `#attractCaption`. Battle ids: `#hud`, `#field` (terrain canvas), `#fire`, `#moveLeft`, `#moveRight`, `#angleUp`, `#angleDown`, `#nextWeapon`, `#previousWeapon`, `#shotNote`, `#ammo`, `#moves`, `#menuBtn`, `#arsenalBtn`, `#helpBtn`. `window.TINY_DEMO` is set inside the attract-mode iframe.

Harness driver notes: `tools/cdp.mjs` (zero-dep Chrome DevTools driver, real GPU, `--mute-audio`; the game has audio and the harness would otherwise play it through the speakers).
