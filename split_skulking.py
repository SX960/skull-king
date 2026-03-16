#!/usr/bin/env python3
"""
split_skulking.py
-----------------
Splits skulking.html into focused source files.
Run once (idempotent) from the claude_test/ directory:

    python split_skulking.py

Output:
    css/skulking.css
    js/deck.js
    js/logic.js
    js/state.js
    js/render.js
    js/main.js
    skulking.html  (rewritten with <link> and <script src> references)
"""

import os
import re

SOURCE = "skulking.html"

# ---------------------------------------------------------------------------
# Read source
# ---------------------------------------------------------------------------
with open(SOURCE, encoding="utf-8") as f:
    html = f.read()

# ---------------------------------------------------------------------------
# Extract <style> block
# ---------------------------------------------------------------------------
style_match = re.search(r"<style>(.*?)</style>", html, re.DOTALL)
if not style_match:
    raise ValueError("No <style> block found in " + SOURCE)
css_content = style_match.group(1).strip()

# ---------------------------------------------------------------------------
# Extract <script> block (the big one, not src= references)
# ---------------------------------------------------------------------------
script_match = re.search(r"<script>(.*?)</script>", html, re.DOTALL)
if not script_match:
    raise ValueError("No inline <script> block found in " + SOURCE)
js_content = script_match.group(1)

# ---------------------------------------------------------------------------
# Section boundary markers (matches "// ---- KEYWORD" anywhere in line)
# ---------------------------------------------------------------------------
SECTION_MARKERS = [
    "STATE",
    "DECK",
    "LEGAL PLAY",
    "TRICK WINNER",
    "BONUSES",
    "SCORING",
    "TRANSITIONS",
    "PERSISTENCE",
    "CARD RENDERING",
    "OVERLAYS",
    "PHASE RENDERS",
    "MAIN RENDER",
    "BOOT",
]

def find_section_positions(js: str) -> dict:
    """Return {marker: char_offset} for each section comment found."""
    positions = {}
    for marker in SECTION_MARKERS:
        pattern = re.compile(r"^// ----[^\n]*" + re.escape(marker), re.MULTILINE)
        m = pattern.search(js)
        if m:
            positions[marker] = m.start()
    return positions

pos = find_section_positions(js_content)

def slice_js(start_markers: list, end_markers: list) -> str:
    """Extract JS between the first of start_markers and the first of end_markers."""
    starts = [pos[m] for m in start_markers if m in pos]
    ends   = [pos[m] for m in end_markers   if m in pos]
    if not starts:
        raise ValueError(f"None of {start_markers} found")
    start = min(starts)
    end   = min(ends) if ends else len(js_content)
    return js_content[start:end].rstrip()

# Header comment before STATE marker
header_end = min(pos[m] for m in ["STATE"] if m in pos)
header = js_content[:header_end].rstrip()

# ---------------------------------------------------------------------------
# Build each JS file
# ---------------------------------------------------------------------------
# deck.js: header + CONSTANTS + STATE + DECK
deck_start = 0  # include header from top of file
deck_end   = pos.get("LEGAL PLAY", len(js_content))
deck_js    = js_content[deck_start:deck_end].rstrip()

# logic.js: LEGAL PLAY → TRANSITIONS
logic_js = slice_js(["LEGAL PLAY"], ["TRANSITIONS"])

# state.js: TRANSITIONS + PERSISTENCE (event handlers are inside TRANSITIONS block)
state_js = slice_js(["TRANSITIONS"], ["CARD RENDERING"])

# render.js: CARD RENDERING → BOOT
render_js = slice_js(["CARD RENDERING"], ["BOOT"])

# main.js: BOOT → end
boot_start = pos.get("BOOT", len(js_content))
main_js    = js_content[boot_start:].rstrip()

# ---------------------------------------------------------------------------
# Write files
# ---------------------------------------------------------------------------
os.makedirs("css", exist_ok=True)
os.makedirs("js",  exist_ok=True)

files_written = []

def write_file(path: str, content: str):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content + "\n")
    lines = content.count("\n") + 1
    files_written.append((path, lines))

write_file("css/skulking.css", css_content)
write_file("js/deck.js",    deck_js)
write_file("js/logic.js",   logic_js)
write_file("js/state.js",   state_js)
write_file("js/render.js",  render_js)
write_file("js/main.js",    main_js)

# ---------------------------------------------------------------------------
# Rewrite skulking.html
# ---------------------------------------------------------------------------
new_html = re.sub(
    r"\s*<style>.*?</style>",
    '\n  <link rel="stylesheet" href="css/skulking.css">',
    html,
    flags=re.DOTALL
)
new_html = re.sub(
    r"\s*<script>.*?</script>",
    (
        '\n<script src="js/deck.js"></script>'
        '\n<script src="js/logic.js"></script>'
        '\n<script src="js/state.js"></script>'
        '\n<script src="js/render.js"></script>'
        '\n<script src="js/main.js"></script>'
    ),
    new_html,
    flags=re.DOTALL
)

with open(SOURCE, "w", encoding="utf-8") as f:
    f.write(new_html)
files_written.append((SOURCE, new_html.count("\n") + 1))

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\nSplit complete. Files written:\n")
total_js = 0
for path, lines in files_written:
    print(f"  {path:<30} {lines:>5} lines")
    if path.startswith("js/"):
        total_js += lines
print(f"\n  {'JS total':<30} {total_js:>5} lines")
print()
