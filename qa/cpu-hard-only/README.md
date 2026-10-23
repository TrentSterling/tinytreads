# Hard-only tactical selection

This candidate adopts the independent review's scope recommendation. The production change from `0c80efa34aa07a3894d291db6bce06d42e55a18c` is one condition and its comment in `versions/tiny-treads-v5.html`, plus regenerated `index.html`: tactical comparison runs only on Hard. Easy and Normal bypass it entirely, including the additional random comparison-gate draw. Their original-main weapon selection, commanded aim and RNG behavior are restored. Hard retains the corrected independent angle/power samples, fallback policy and 752-prediction bound without changes.

The candidate is on `codex/cpu-hard-only-20261023`, pending final review. Original main is `977b718513cdbd099093320e5e2bb170c9b2bb35`; the all-difficulty comparison reference is `0c80efa34aa07a3894d291db6bce06d42e55a18c`. Both and the earlier held candidates remain preserved. No publication has occurred.

## Exact behavior checks

`tools/cpu-difficulty-parity.mjs` adapts the independent reviewer's fresh seed corpus and complete quick-battle setup. It tests the actual generated HTML, without replacing the selector at runtime.

- **24/24 Easy/Normal complete quick battles match original main exactly**, including initial inventory/terrain/clock/RNG, every CPU weapon/angle/power and RNG transition, shot history, final terrain, scores, shot count, self-hit events and simulation steps.
- **12/12 Hard complete quick battles match 0c80efa exactly** on those same fields.
- **1,024 fresh Easy/Normal fixture decisions and shots match original main exactly**; all 512 Hard shots match 0c80efa. An additional 48 Easy/Normal single-weapon cases prove the gate does not consume an extra random draw when only one modeled weapon remains.
- The earlier 1,344-shot and 1,472-shot corpora pass their updated scope contracts: all lower-difficulty outcomes and decision RNG states match original main; Hard retains its previous improvements. The eight translated lower-difficulty review cases now match original main, with points `90, 9, 0, 0` per position. They intentionally no longer use the all-difficulty candidate's choices.

Shot equivalence excludes timing and the beam predictor's diagnostic `error` metadata. Actual angle, power, RNG, terrain changes, self hits, points, turn completion and settling steps must match. Full-battle comparisons likewise use gameplay state rather than display-only prediction metadata.

## Hard results and limits

| Fixed-seed corpus | Original-main scoring shots | Candidate scoring shots |
|---|---:|---:|
| Fresh reviewer geometries, 512 shots | 441 | 512 |
| Expanded neighborhoods, 480 shots | 372 | 480 |
| Earlier distribution, 640 shots | 497 | 608 |
| Earlier flat subset, 128 shots | 94 | 118 |

There are no new Hard hit-to-miss cases against original main in these corpora. The original Hard seed-4 regression remains a **47-point Single Shot**. Fresh Hard total points are 27,254 versus main's 24,788. The Hard-flat subset still trades point yield for hit frequency: 6,242 points versus main's 6,311. These targeted fixtures do not establish a general win-rate improvement. The representative quick games expose few modeled choices and do not establish tactical benefit by themselves.

Nine shell probes cover independent negative/zero/positive angle and power combinations; beams use three angles because power is inert. Grid coverage and the mixed-sign live witness remain tested. This is a finite heuristic, not a continuous-error guarantee. Maximum observed and asserted cost is **752 predictions** on Hard; Easy/Normal make at most 363 in the fresh four-weapon corpus. Fresh Hard decision p95 was about 2.2 ms on this machine, not a portable timing guarantee. Actual difficulty noise is unchanged.

## Functional coverage and receipts

`full-suite.json` records 260 comparison shots, eight complete matches, 7,657 points, zero self-hit shots and 213 terrain-changing shots. All 12 buried fixtures recover. The additional autonomous 40-shot brawl completes. Beam prediction/purity checks, noise limits, duplicate-inventory bounds, deterministic repeat and duel/party checkpoint round trips pass.

Desktop and 844x390 smoke checks each pass 21/21; all three negative fire/turn/result cases fail as intended. Existing About contracts pass. The generated source is byte-identical after regeneration, with its exact hash in `build-check.json`. `parity-*.json` contain the fresh comparison and complete-match receipts. Current candidate records and summaries from the older corpora are `independent-*.json` and `distribution-*.json`; unchanged reference receipts remain in `qa/cpu-independent-errors/`. Earlier reports are historical.

All browser work used owned muted headless Chrome under exclusive leases. No physical input, cursor change, keyboard injection, focus stealing, pointer lock, audio playback/testing or system audio change occurred. Separate-network online play and physical mobile interaction remain untested; checkpoint contracts and a narrow viewport provide the relevant existing coverage.

## Reproduce

Use the original-main snapshot in `tinytreads-base`, the 0c80efa snapshot in `tinytreads-independent`, bfe5167 in `tinytreads-held`, and 0a3cc5ab in `tinytreads-paired`. Each snapshot needs index.html and its local About JS/CSS assets; receipts identify the exact HTML hashes.

```powershell
python tools/polish.py
node tools/cpu-difficulty-parity.mjs ../tinytreads-base/index.html ../tinytreads-independent/index.html index.html
node tools/cpu-independent-errors.mjs ../tinytreads-base/index.html ../tinytreads-held/index.html ../tinytreads-paired/index.html index.html
node tools/cpu-robustness.mjs ../tinytreads-base/index.html ../tinytreads-held/index.html index.html
node tools/cpu-check.mjs
node tools/verify.mjs
$env:WIDTH='844'
$env:HEIGHT='390'
node tools/verify.mjs
Remove-Item Env:WIDTH, Env:HEIGHT
node tools/verify-negative.mjs
node --test tests/about-contract.cjs
git diff --check
```

Independent review input: `task-2/evidence-independent/review-report.json` and `player-outcomes.mjs`. The reviewed scope was implemented without changing weapons, live physics, controls, saves, transport or the shared About integration. Final exact-commit approval is still required before publication.
