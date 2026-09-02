#!/usr/bin/env python3
"""Inline every source file into dist/paleopal.html.

The game ships as one self-contained HTML file so it can be opened from disk or
dropped into a WebView. Development happens in src/ and index.html; this script
is the only thing that knows the load order.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).parent
ORDER = [
    "src/00-core.js",
    "src/01-colour.js",
    "src/02-sprite-engine.js",
    "src/species/rex.js",
    "src/species/triceratops.js",
    "src/species/brachiosaurus.js",
    "src/species/registry.js",
    "src/04-world.js",
    "src/05-sim.js",
    "src/06-render.js",
    "src/07-ui.js",
]

def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "src/style.css").read_text(encoding="utf-8")
    js = "\n".join((ROOT / f).read_text(encoding="utf-8") for f in ORDER)

    html = html.replace('<link rel="stylesheet" href="src/style.css">',
                        "<style>\n" + css + "\n</style>")
    html = re.sub(r'(<script src="[^"]+"></script>\s*)+',
                  "<script>\n" + js + "\n</script>\n", html)

    out = ROOT / "dist" / "paleopal.html"
    out.parent.mkdir(exist_ok=True)
    # newline="\n" is load-bearing on Windows. The default translates every "\n"
    # to "\r\n", so a rebuild with no source change still rewrites all 133KB and
    # lands as a whole-file diff. The encoding is spelled out for the same
    # reason: the default is the machine's locale, cp1252 on Windows, which
    # both mangles the em dashes and would fall over on the first character
    # outside that set.
    out.write_text(html, newline="\n", encoding="utf-8")
    print("wrote", out, f"({len(html):,} bytes)")

if __name__ == "__main__":
    main()
