# Independent aim-error sampling correction

All four reviewer-reported failures now score **90 points at both translated positions**. Hard flat seed 4 remains a 47-point Single Shot. The new 1,344-shot neighborhood set introduces no hit-to-miss cases versus the first candidate, `bfe5167`, and the earlier 1,472-shot suite still passes. This is a new, unpushed candidate on `codex/cpu-independent-errors-20261023`, awaiting independent review.

The withdrawn paired-sample candidate `0a3cc5ab441895110b0dedcd0b126322fd6510d2` and first candidate `bfe5167fe8c8a950a21ecc0612426daee5138224` remain unchanged on their original branches. Their historical receipts remain in `qa/cpu-noise/` and `qa/cpu-tactics/`. Original main and rollback remain `977b718513cdbd099093320e5e2bb170c9b2bb35`.

## Correction and bounded cost

The paired sampler checked negative angle with negative power and positive angle with positive power. These errors cancel much of the range difference on the reported high arc. The game draws angle and power error independently, so the omitted opposite-sign pairs can miss even when both sampled endpoints score.

Each shell plan now samples the Cartesian product of negative, zero and positive difficulty error: nine angle/power pairs including the center, all four corners and the axes. Laser power has no effect, so each beam plan samples three angles. The selector ranks the lowest sampled net score, with ideal score as the tie break. If no plan has a positive minimum sampled score, it retains the earlier **bfe5167 ideal-score policy**. This fallback is not the original main branch's random/raw-damage policy.

Actual aim noise remains Easy +/-4.8 degrees and 7 power, Normal +/-1.6 and 2.8, Hard +/-0.4 and 0.8, with unchanged clamping, RNG consumption and comparison gates. There are no seed-specific exceptions. The four modeled weapons remain Single Shot, Big Shot, Laser and Super Laser. Other choices and buried recovery retain their existing paths. No live physics, weapons, controls, saves or networking were changed in this correction.

The worst case is **752 prediction calls**, up 12 from 740 (1.62%). The bound is two shell plans at at most 363 aim-search calls plus nine probes each, and two beam plans at one aim-search call plus three probes each: `2 * (363 + 9) + 2 * (1 + 3) = 752`. Plans are cached by weapon ID, so duplicate slots do not increase the bound. The complete-match test and every expanded neighborhood decision enforce this limit. Measured expanded-set decision p95 was 2.2 ms, maximum 4.7 ms on this machine; timing is not a portable runtime guarantee.

The grid addresses the independent-error defect. It is still a finite heuristic, not a proof over continuous errors or arbitrary terrain. The fallback deliberately declines to claim confidence when even these samples fail.

## Exact regressions

The fixture has the shooter at `(sx,400)`, target at `(sx + distance,400 + dy)`, terrain stepped halfway between them, no wind, and inventory Single Shot / Big Shot / Laser / Super Laser. Each case is run at `sx=140` and `sx=190`.

| Difficulty / seed | Distance / dy | Gravity | Original main points | bfe5167 points | 0a3cc5ab points | Corrected points |
|---|---|---|---:|---:|---:|---:|
| Normal / 3733412389 | 740 / -8 | Normal | 90 | 90 | 0 | 90 |
| Easy / 4049056649 | 820 / -2 | Normal | 9 | 90 | 0 | 90 |
| Normal / 3733412389 | 820 / -2 | Normal | 0 | 90 | 0 | 90 |
| Normal / 3733412389 | 780 / 0 | Low | 0 | 90 | 0 | 90 |

For the first case, Single Shot's ideal solution is 69 degrees / 86 power. A separate 25-shot live grid reproduces 47-point hits at both paired extreme endpoints and zero points at both opposite-sign corners. The actual seed produces -1.410963 degrees and +2.274929 power. `independent-candidate.json` records the live grid and instrumentation proving all nine shell samples and all three beam angles are actually called.

## Distribution evidence and tradeoffs

The expanded corpus uses 48 distributed seeds for each of nine geometries at all three difficulties, plus eight Hard seeds on each of six natural layouts: **1,344 shots per source**. It includes the reviewer's 12 seeds, both firing directions, elevation differences, shorter ranges, wind and low gravity. Four sources plus eight translated regressions per source make 5,408 comparison shots, with the 25 forced-error witness shots additional. The runner asserts identical decision RNG state versus bfe5167, the prediction bound, restored review cases, and no new misses versus bfe5167 in this corpus.

| Expanded set | Original main hits | bfe5167 hits | 0a3cc5ab hits | Corrected hits |
|---|---:|---:|---:|---:|
| Easy, 432 shots | 191 | 187 | 185 | 187 |
| Normal, 432 shots | 275 | 262 | 305 | 292 |
| Hard, 480 shots | 372 | 449 | 480 | 480 |

There are **44 lost hits versus the withdrawn paired sampler**, eight Easy and 36 Normal. All 44 were also misses in bfe5167; 31 were hits on original main. The corrected version also restores paired-sampler misses, giving the net counts above. This is a real tradeoff from withdrawing unsupported confidence, not a claim of universally improved hit reliability. Compared with original main, 70 Easy and 54 Normal hit-to-miss cases remain; all were already misses in bfe5167. No Hard hit-to-miss cases versus either original main or bfe5167 occur here. Raw per-seed results and these loss counts are retained in `independent-*.json` and `summary.json`.

Expanded total points for original main / bfe5167 / paired / corrected are Easy `8463 / 11780 / 9875 / 11780`, Normal `12063 / 17682 / 11281 / 14652`, and Hard `19007 / 33269 / 27186 / 25916`. All four sources have zero self-hit shots in this corpus. Aggregate score does not excuse individual misses, and these fixtures are not a win-rate study.

The earlier **1,472-shot distribution per source** also passes unchanged: no new misses versus bfe5167 across all difficulties, and none versus original main across its 640 Hard shots. Hard flat scoring remains 118/128 versus 94/128 original main and 87/128 bfe5167; all Hard samples score 608/640 versus 497/640 and 528/640. Easy and Normal outcomes in this earlier corpus match bfe5167. Hard-flat total points remain 6,242 versus 6,311 original main and 7,862 bfe5167, preserving the previously documented hit-rate/point-yield tradeoff. Receipts are `distribution-*.json`.

## Functional verification

- `after.json`: 260 comparison shots, eight complete matches, 7,581 points, zero self-hit shots, 217 terrain-changing shots and no safety timeouts. All 12 buried cases recover. The separate autonomous three-CPU, 40-shot brawl completes with wind and low gravity.
- 32 beam prediction/live-score and purity checks, difficulty noise checks, duplicate-inventory cost bounds, and duel/party checkpoint round trips pass. `repeat-check.json` confirms the entire report repeats exactly excluding timing.
- `desktop-verify.json` and `mobile-verify.json`: 21/21 assertions each at desktop and 844x390. `negative.json`: deliberately broken fire, turn and results each cause the smoke test to fail.
- `about-contract.txt`: existing three contracts pass. `build-check.json`: regenerating index.html from the authoritative v5 drop is byte-identical. Generated HTML SHA256: `1fc820b388328d641280742642d9343559bb8171790eff5bb9050d2c1c75a6d6`.

All browser runs used owned muted headless Chrome under exclusive browser/GPU leases. No physical input, cursor changes, keyboard injection, focus stealing, pointer lock, audio playback/testing or system audio changes occurred. Separate-network online play and physical mobile interaction remain untested. Checkpoint round trips and a narrow viewport are the coverage provided here.

## Reproduce

From the candidate checkout with Node 24, Python and Chrome available, use index.html and its local About assets from original main, bfe5167 and 0a3cc5ab in the three sibling paths. Check out or extract those exact commits; the JSON receipts identify every tested HTML by SHA256. The test fixture is shared through `tools/cpu-fixture.mjs` and is not shipped in the game.

```powershell
python tools/polish.py
node --test tests/about-contract.cjs
node tools/cpu-independent-errors.mjs ../tinytreads-base/index.html ../tinytreads-held/index.html ../tinytreads-paired/index.html index.html
node tools/cpu-robustness.mjs ../tinytreads-base/index.html ../tinytreads-held/index.html index.html
node tools/cpu-check.mjs index.html tools/out/current.json
node tools/verify.mjs
$env:WIDTH='844'
$env:HEIGHT='390'
node tools/verify.mjs
Remove-Item Env:WIDTH, Env:HEIGHT
node tools/verify-negative.mjs
git diff --check
```

Runtime outputs go to ignored `tools/out/independent-errors/`, `tools/out/robustness/` and `tools/out/`. Committed receipts here are from the corrected source. Publication remains held for review of this exact candidate and the explicit limitations above.
