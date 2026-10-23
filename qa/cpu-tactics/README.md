# CPU tactics candidate, 2026-10-23

This is an unpushed review candidate based on `977b718513cdbd099093320e5e2bb170c9b2bb35`. Publication requires independent review. The shared `C:/trontstack/tinytreads` checkout was clean at older commit `b391b7a229e79f530b4609387d007280288ca09e` and was left untouched. Remote main was rechecked and still matched the baseline, with no open PRs at intake.

The authoritative source is `versions/tiny-treads-v5.html` (game version 4.0.1). `tools/polish.py` generates `index.html`; the original v4 drop is retained byte for byte. Existing About assets and content remain unchanged.

## Change and scope

Fixed-seed shots reproduced wasted lasers against a lower target and an intervening wall, plus close-range self-hits from Big Shot. The CPU now compares predicted net score for Single Shot, Big Shot, Laser and Super Laser when its original choice is one of those four. It caches each distinct weapon's plan within the decision. Other weapon choices and buried recovery follow the original policy. Easy uses this comparison 35% of the time, Normal 70%, and Hard always. The original angle/power noise remains: Easy 4.8 degrees / 7 power, Normal 1.6 / 2.8, Hard 0.4 / 0.8.

Beam prediction now follows the live beam's hit radius, penetration budget and terrain clearing along the ray. It evaluates temporary cleared-circle bounds without modifying the terrain or consuming RNG. The trajectory preview shares this predictor. Live weapon physics, controls, transport, save formats and weapon definitions are unchanged. Shell scoring remains an estimate based on the existing ballistic solver's landing point; this round does not model all 400 weapons or fix precision-rifle aiming.

The smoke test's unconditional `|| true` pass was replaced with actual shot/ammo accounting, turn completion, terrain change and a full 20-shot result. The driver connects through the port file of its fresh profile and closes that owned browser. It never attaches to an existing browser session.

## Evidence

`before.json` and `after.json` contain raw per-shot decisions, scores, self-hit counts, terrain-change flags, simulation step counts, costs and full match states. Both identify their source SHA256. The comparison includes 60 fixture shots and 200 shots across six two-tank matches (Easy/Normal/Hard, seeds 41 and 42) and two four-tank matches (seeds 51 and 52). Matches use the real generated plain layout and real shot/turn/result engine; the tactical fixtures use deliberately constructed geometry. Each shot must settle and advance exactly one turn without the safety timeout.

| Measured outcome | Before | Candidate |
|---|---:|---:|
| Total score over 260 measured shots | 7,113 | 8,593 |
| Shots with a self-hit | 3 | 0 |
| Complete comparison matches | 8/8 | 8/8 |
| Shots changing terrain | 203 | 200 |
| Buried tank recovered | 12/12 | 12/12 |
| Lower-target fixture zero-score shots | 7/12 | 0/12 |
| Wall fixture points | 456 | 632 |
| Close-range fixture points | 364 | 496 |
| Flat-ground fixture zero-score shots | 4/12 | 5/12 |

The last row is an observed limitation: preferring a stronger beam can still miss after aim noise. Precision-rifle choices retain their original misses. These results support this small selection improvement, not a general win-rate claim. Scores across complete matches are not paired identical board states after the first differing choice, because shots alter the terrain.

Additional checks in `cpu-check.mjs`:

- 32 beam oracle cases agree with live immediate scoring, including both directions, multiple wall thicknesses and blocked lines. Prediction leaves terrain, RNG, time and shot counters unchanged.
- A ten-slot inventory with duplicates makes 732 prediction calls, below the asserted bound of 740. There are at most four distinct modeled plans per decision. Raw timing samples are in each report; timing includes cold-start/JIT noise and is not a frame-time guarantee.
- All original difficulty noise ranges remain active.
- A repeated seed produces the same shot. A second fresh-browser candidate run reproduced all 260 measured shot records excluding wall-clock cost; `repeat-check.json` records this comparison.
- Duel and four-player party checkpoint serialization/application preserve modified terrain, scores, shot counts and inventories.
- A separate autonomous brawl with three CPUs, wind and low gravity finishes all 40 shots without a timeout (seed 817). This is additional to the 260-shot comparison.

`desktop-verify.json` and `mobile-verify.json`: 21/21 checks each at 1280x800 and 844x390. Both finish the deterministic quick battle, inspect labeled controls, pause/resume, return from results and reload successfully. The first human slot is set to Single Shot through the existing test hook so terrain change has a known cause; human shots use the existing auto-aim hook and CPU turns run normally. The associated PNGs show the actual headless render. The narrow viewport is desktop Chrome emulation, not a physical mobile-device test.

`negative.json`: three deliberately broken temporary pages each exit 1 on the relevant fire, turn or result assertion. The negative-test runner exits 0 only after proving all three failures. `about-contract.txt` records 3/3 existing About contract tests.

## Reproduce

Run from the candidate repository with Python, Node 24 and Chrome available. `CHROME` may select an installed executable. The tests require exclusive browser test ownership on this shared machine. They create only owned muted headless browsers, set game sound off in those temporary profiles, use DOM activation or engine hooks and do not invoke mouse, keyboard, focus, pointer-lock or audio testing APIs.

```powershell
python tools/polish.py
node --test tests/about-contract.cjs
node tools/cpu-check.mjs ../tinytreads-base/index.html tools/out/before.json
node tools/cpu-check.mjs index.html tools/out/after.json
node tools/verify.mjs
$env:WIDTH='844'
$env:HEIGHT='390'
node tools/verify.mjs
Remove-Item Env:WIDTH, Env:HEIGHT
node tools/verify-negative.mjs
```

The sibling `tinytreads-base` checkout is retained at the baseline SHA. Elsewhere, create a detached baseline worktree at that SHA and pass its `index.html` path. Keep its local About assets alongside the HTML. All harness outputs default to ignored `tools/out`; the committed receipts are the final validated runs, not scratch output.

## Rollback and remaining review

Branch `rollback/pre-cpu-tactics-20261023` points to `977b718513cdbd099093320e5e2bb170c9b2bb35` in the local clone. The candidate branch is `codex/cpu-tactics-20261023`; no push, PR, merge or deployment was performed. Reverting the eventual candidate commit restores the previous generated file, drop selection and harness. Do not regenerate from v4 with the v5 default still selected.

Independent review remains pending. Actual separate-network online matches, touchscreen interaction, physical keyboard/mouse input and audio behavior were not tested. No audio or physical input testing is authorized in this round. Online coverage here is checkpoint compatibility plus unchanged transport code, not an end-to-end connectivity claim. The hosted page could not be opened by the web reader; no live-browser acceptance or publication is claimed.
