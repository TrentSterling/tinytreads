"""Build index.html from the latest ChatGPT drop in versions/ for hosting at https://tront.xyz/tinytreads/.
Exact bytes except: social meta + canonical after the description, and em dashes out of player-facing strings.
Every replacement must match exactly once (or the stated count) or the script aborts. Run from the repo root:
    python tools/polish.py [versions/tiny-treads-v5.html]
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'versions' / 'tiny-treads-v6.html'
DST = ROOT / 'index.html'
html = SRC.read_text(encoding='utf-8')
orig = html

def rep(old, new, count=1):
    global html
    n = html.count(old)
    if n != count:
        sys.exit(f'ABORT: expected {count} match(es), found {n} for: {old[:90]!r}')
    html = html.replace(old, new)

# ---- social meta + canonical (the drop already has title, description and author) ----
rep('<meta name="author" content="Trent Sterling (Tront)">\n',
    '<meta name="author" content="Trent Sterling (Tront)">\n'
    '<link rel="canonical" href="https://tront.xyz/tinytreads/">\n'
    '<meta property="og:type" content="website">\n'
    '<meta property="og:title" content="Tiny Treads by Tront">\n'
    '<meta property="og:description" content="Small tanks. Big grudges. Turn-based artillery with destructible terrain and 400 wild weapons, against the CPU or online. Free in the browser.">\n'
    '<meta property="og:url" content="https://tront.xyz/tinytreads/">\n'
    '<meta property="og:image" content="https://tront.xyz/tinytreads/og-image.png?v=2">\n'
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">\n'
    '<meta name="twitter:card" content="summary_large_image">\n'
    '<meta name="twitter:title" content="Tiny Treads by Tront">\n'
    '<meta name="twitter:description" content="Small tanks. Big grudges. Turn-based artillery with destructible terrain and 400 wild weapons, against the CPU or online. Free in the browser.">\n'
    '<meta name="twitter:image" content="https://tront.xyz/tinytreads/og-image.png?v=2">\n')

# ---- em dashes out of player-facing strings (code comments untouched) ----
rep("`<div class=\"draft-slot empty\">${String(j+1).padStart(2,'0')} &nbsp; —</div>`", "`<div class=\"draft-slot empty\">${String(j+1).padStart(2,'0')} &nbsp; ·</div>`", 2)
rep("'Buried — use a digger or jump jets.'", "'Buried. Use a digger or jump jets.'")

left = [(i + 1, l[:120]) for i, l in enumerate(html.split('\n')) if '—' in l and not l.lstrip().startswith(('/*', '//', '*'))]
print('em-dash lines outside comments:', left)
DST.write_text(html, encoding='utf-8', newline='\n')
print(f'wrote {DST} ({len(orig)} -> {len(html)} bytes)')
# ---- SEO About block (prose, crosslinks, JSON-LD) so the page is not just a canvas to Google ----
import subprocess
# Keep the approved About integration reproducible without an external checkout.
import re
html = DST.read_text(encoding='utf-8')
fragment = (ROOT / 'tools' / 'about-fragment.html').read_text(encoding='utf-8').strip()
html = re.sub(r'<!-- tront-about:start -->.*?<!-- tront-about:end -->', '', html, flags=re.S)
html = html.replace('</body>', fragment + '\n</body>')
head = '<link rel="stylesheet" href="tront-about-discovery.css">\n<link rel="stylesheet" href="tront-about-shell.css">\n<script src="tront-about-shell.js"></script>\n'
html = html.replace('<head>', '<head>\n' + head, 1)
DST.write_text(html, encoding='utf-8', newline='\n')

# Mark the animated game surface for the shared preview resource policy.
html = html.replace('id="stage"', 'id="stage" data-tront-discovery-game-surface', 1)
DST.write_text(html, encoding='utf-8', newline='\n')
