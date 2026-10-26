# Tiny Treads 4.0.3

Phone portrait titles now use the available screen space. Quick battle has
20-pixel text and a 64-pixel-high button; More choices and utilities remain
reachable through a scrollable title. Returning from a game or menu starts at
the top again. Desktop, tablet, landscape and battle layouts retain their
existing dimensions.

The change lives in the new v7 source drop, preserving v6. See
`qa/portrait-title/README.md` for the responsive regression checks and scope.

# Tiny Treads 4.0.2

Returning players with an obsolete saved biome can finish a match and use the
results/rematch screen again. Unsupported game-rule choices fall back to the
existing defaults; valid choices, names, garage appearances and records remain.

The fix is in the new v6 source drop. The original v5 drop is preserved.
Validated with seven complete saved-settings matches, the ordinary 21-check
quick-match smoke, and independent source, rebuild and matched full-match review.
The same old/new seeded match ends at scores 129/214 with identical terrain and
shot statistics. Only the old runtime throws before displaying the result panel.
