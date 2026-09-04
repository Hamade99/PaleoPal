#!/usr/bin/env python3
"""Inline every source file into dist/paleopal.html.

The game ships as one self-contained HTML file so it can be opened from disk or
dropped into a WebView. Development happens in src/ and index.html, and the
load order is whatever index.html loads.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).parent
SCRIPT_RE = re.compile(r'<script src="([^"]+)"></script>')


def load_order(html):
    """The load order is index.html's own list of script tags.

    It used to be repeated here as a second list. Adding a source file and
    updating only one of the two produced a development build and a shipped
    build that ran different code, with nothing to say so. There is now one
    list, and it is the one the browser reads during development.
    """
    order = SCRIPT_RE.findall(html)
    if not order:
        raise SystemExit("no <script src> tags found in index.html")
    missing = [f for f in order if not (ROOT / f).is_file()]
    if missing:
        raise SystemExit("index.html loads files that do not exist: " + ", ".join(missing))
    return order


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "src/style.css").read_text(encoding="utf-8")
    order = load_order(html)
    js = "\n".join((ROOT / f).read_text(encoding="utf-8") for f in order)

    html = html.replace('<link rel="stylesheet" href="src/style.css">',
                        "<style>\n" + css + "\n</style>")
    # The replacement is a function, not a string. As a string it is a regex
    # template, so any backslash escape in the source — the font table's
    # "▶" was the first — is re-interpreted here and the build dies with
    # "bad escape \u" pointing at a line number in the generated file.
    html = re.sub(r'(<script src="[^"]+"></script>\s*)+',
                  lambda m: "<script>\n" + js + "\n</script>\n", html)

    out = ROOT / "dist" / "paleopal.html"
    out.parent.mkdir(exist_ok=True)
    # newline="\n" is load-bearing on Windows. The default translates every "\n"
    # to "\r\n", so a rebuild with no source change still rewrites all 133KB and
    # lands as a whole-file diff. The encoding is spelled out for the same
    # reason: the default is the machine's locale, cp1252 on Windows, which
    # both mangles the em dashes and would fall over on the first character
    # outside that set.
    out.write_text(html, newline="\n", encoding="utf-8")
    print("wrote", out, f"({len(html):,} bytes, {len(order)} scripts)")

if __name__ == "__main__":
    main()
