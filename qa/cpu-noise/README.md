# Bounded CPU aim-error robustness follow-up

This unpushed candidate follows held commit `bfe5167fe8c8a950a21ecc0612426daee5138224`. That commit remains on `codex/cpu-tactics-20261023`; the follow-up is on `codex/cpu-noise-robustness-20261023`. Re-review is required before publication. The original baseline remains `977b718513cdbd099093320e5e2bb170c9b2bb35` on `rollback/pre-cpu-tactics-20261023`.

## Problem and correction

The held candidate ranks ideal score before applying difficulty error. On Hard seed 4, it replaces a 47-point Single Shot with an ideal 90-point Super Laser. The retained +0.222479 degree error shifts the beam outside the target's hit radius, producing zero points. This was a new selection regression, separate from the existing rifle misses.

Each modeled plan now evaluates its ideal aim plus two deterministic probes at the difficulty's negative and positive angle/power error endpoints. Selection prioritizes the lowest sampled net score. Equal robustness scores retain the old ideal-score ranking, which avoids all-zero ties abandoning useful choices on Easy/Normal. Actual firing still draws the same two random aim errors, with the same ranges and clamping. Sampling neither consumes RNG nor modifies terrain. No seed, map-coordinate or weapon hit/miss result is hardcoded into selection.

There are still at most four distinct modeled plans. Two extra predictions per plan raise the measured worst-path count from 732 to **740**, within the existing 740-call budget. No search expansion, weapon changes, live-physics changes or new runtime dependencies are introduced. The versioned v5 drop remains authoritative and index.html is regenerated.

This is a conservative sample, not a full probability model or proof over every angle/power pair. In particular, the two diagonal shell probes do not enumerate every mixed-sign perturbation. It intentionally trades some maximum point yield for hit reliability. Actual difficulty imperfection remains.

## Reproduced evidence

`comparison.json` and the three `distribution-*.json` files cover **1,472 real-engine shots per source**, 4,416 total. Sources are identified by SHA256. The suite uses 128 seeds in the reported flat geometry, nearby ranges 770/810/850 with target elevations -4/0/+4, additional ranges 65/300/500/950, both firing directions, wind -20/+20 and low gravity. Easy and Normal each have 416 samples; Hard has 640. Neighborhood seeds include sequential and multiplicatively distributed values.

| Outcome | Original baseline | Held candidate | Follow-up |
|---|---:|---:|---:|
| Hard seed 4 points | 47 | 0 | 47 |
| Original 12 flat fixtures: scoring shots | 8 | 7 | 10 |
| 128 Hard flat shots: scoring shots | 94 | 87 | 118 |
| All 640 Hard samples: scoring shots | 497 | 528 | 608 |
| 416 Easy samples: scoring shots | 126 | 131 | 131 |
| 416 Normal samples: scoring shots | 209 | 223 | 223 |
| 128 Hard flat shots: total points | 6,311 | 7,862 | 6,242 |
| Original 260-shot comparison: total points | 7,113 | 8,593 | 7,581 |
| Original comparison: self-hit shots | 3 | 0 | 0 |

The follow-up introduces **zero hit-to-miss cases versus the held candidate across all 1,472 samples**, and **zero versus the original baseline across all 640 Hard samples**. Easy/Normal sample scoring and point outcomes match the held candidate; existing differences from the original baseline remain. The decision RNG state matches the held candidate after every selection in the entire distribution. The runner asserts these no-new-miss properties, the seed-4 correction and exact RNG preservation.

The lower Hard-flat total score is an explicit tradeoff, not hidden by the improved hit rate: the selector often chooses a dependable 47-point shell instead of a fragile 90-point beam. Full-match totals also differ because different shots create different subsequent terrain. This is not a general win-rate claim.

`after.json`: all eight comparison matches plus the separate autonomous three-CPU brawl complete with no timeouts; all 12 buried fixtures recover; 32 beam oracle/purity cases, checkpoint round trips, difficulty-noise checks and the 740-call bound pass. The 260-shot run repeats exactly excluding cost (`repeat-check.json`). Measured decision p95 is about 1.5 ms on this machine; raw cost samples are retained and are not a runtime guarantee.

`desktop-verify.json` and `mobile-verify.json`: 21/21 checks each. `negative.json`: all three deliberately broken fire/turn/result cases fail as intended. Existing About contracts and build-byte consistency also pass. Earlier held-candidate receipts remain under `qa/cpu-tactics/` for historical comparison.

## Reproduce

From the follow-up checkout, with Node 24, Python and Chrome available:

```powershell
python tools/polish.py
node --test tests/about-contract.cjs
node tools/cpu-check.mjs index.html tools/out/follow-up.json
node tools/cpu-robustness.mjs ../tinytreads-base/index.html ../tinytreads-held/index.html index.html
node tools/verify.mjs
$env:WIDTH='844'
$env:HEIGHT='390'
node tools/verify.mjs
Remove-Item Env:WIDTH, Env:HEIGHT
node tools/verify-negative.mjs
```

The sibling baseline checkout is at `977b718`; the held HTML/assets snapshot is from `bfe5167`. Elsewhere, extract or check out those exact commits and pass their index.html paths. The scripts use the shared test-only `tools/cpu-fixture.mjs`; no QA fixture is shipped in game HTML. Raw robustness outputs go to ignored `tools/out/robustness/`. Committed distribution receipts are compact JSON to limit repository size.

All browser runs used owned muted headless Chrome under exclusive leases. No physical mouse/cursor changes, keyboard injection, focus stealing, pointer lock, audio playback/testing or system audio changes occurred. Separate-network online play and physical mobile interaction remain untested; checkpoint compatibility and narrow-viewport rendering are the coverage provided here. Publication remains held for independent re-review.
