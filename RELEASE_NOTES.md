# Tiny Treads 4.0.4

Phone portrait menus now use readable text and controls at least 44 pixels high.
Help, setup, garage, arsenal, shop, pause, lobbies, credits and results share a
scrollable layout. The weapon list stays bounded, the shop preview travels with
its controls, and returning to a menu starts at the top. Repeated updates to the
same open menu retain the current scroll position.

At 390 by 844, Help instructions grow from 5.2 to 16 pixels and Got it grows from
12.87 to 44 pixels high. Desktop, tablet, landscape and battle dimensions retain
their existing behavior. The new v8 source preserves the v7 drop.

See `qa/phone-menus/README.md` for validation and limitations.

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
