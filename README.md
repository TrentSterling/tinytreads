# Tiny Treads

**Small tanks. Big grudges.** Turn-based artillery with destructible terrain and 400 wild weapons. Quick battles against the CPU, hot-seat on one screen, or online with a public quick join or a private code.

**Play:** https://tront.xyz/tinytreads/

- Aim, pick a weapon, fire, watch the hill change shape. Diggers, jump jets, repair, new landscapes, trajectory preview.
- Garage: hulls, paint, flags, names for both players.
- Online: matchmaking over public MQTT brokers, the match itself over WebRTC. No account, no server of ours.

Made by [Tront](https://tront.xyz). One HTML file, no dependencies, no external assets.

## Repo

| Path | What |
|---|---|
| `index.html` | The game as hosted. Built from the newest drop by `tools/polish.py` (canonical, social meta, em dash sweep). |
| `versions/` | The original drops, byte for byte. |
| `tools/` | `polish.py` (build), `verify.mjs` (headless smoke test), `og-shot.mjs` (renders `og-image.png` from the real title screen), `cdp.mjs` (zero-dep Chrome driver). |
| `CLAUDE.md` | Rules and workflow for working on this repo. |

```
python tools/polish.py                        # rebuild index.html from versions/
node tools/verify.mjs                         # 14 checks, headless Chrome
node tools/verify.mjs https://tront.xyz/tinytreads/
node tools/og-shot.mjs                        # regenerates og-image.png
```
