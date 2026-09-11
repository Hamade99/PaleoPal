#!/usr/bin/env python3
"""Run the art editor as a tool instead of as a web page.

The editor's job is to write src/00-art.js, and a browser will only let a page
write a file through the File System Access API, which is Chrome and Edge only.
Firefox has none of it and Mozilla has declined to add it, so in Firefox the
editor can hand you a download and nothing better.

So the writing moves out of the browser. This serves the project folder on a
free port, opens the editor, and answers POST /save by writing src/00-art.js
itself. No file dialog, no permission prompt, nothing to move afterwards, and
every browser behaves the same way.

    python tools/edit.py                  # your default browser
    python tools/edit.py -b firefox       # a particular one
    python tools/edit.py -n               # serve only; open the URL yourself

Ctrl+C, or closing the window, stops it.
"""

import argparse
import http.server
import socket
import sys
import threading
import webbrowser
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
PAGE = "/tools/editor.html"

# The files the editor may write, and the markers each one must still contain
# to be recognisable as itself. Nothing else can be written, whatever the
# request says: the name is looked up in here rather than joined onto a path,
# so "?file=../../something" finds no entry and is refused.
TARGETS = {
    "00-art.js": (ROOT / "src" / "00-art.js",
                  ("/*<data:PIX>*/", "/*</data>*/", "/*<data:STAGE>*/")),
}
DEFAULT = "00-art.js"

# The editor sends the whole file. The real one is about 30 KB; the ceiling is
# only here so a confused request cannot make us read an unbounded body.
MAX_BODY = 8 * 1024 * 1024

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def do_GET(self):
        # A health check, so the page can tell whether it was opened through
        # this launcher or just double-clicked. Without it the editor cannot
        # know that Save is about to degrade into a file dialog, and the first
        # anyone hears of it is the dialog.
        if self.path.split("?")[0] == "/save":
            self.reply(200, "paleopal-editor")
            return
        super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/save":
            self.send_error(404, "nothing here but /save")
            return
        name = parse_qs(urlparse(self.path).query).get("file", [DEFAULT])[0]
        if name not in TARGETS:
            self.reply(400, "Save refused: %r is not a file this writes." % name)
            return
        target, required = TARGETS[name]
        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_BODY:
            self.reply(400, "Save refused: body was %d bytes." % length)
            return

        body = self.rfile.read(length)
        try:
            text = body.decode("utf-8")
        except UnicodeDecodeError:
            self.reply(400, "Save refused: not UTF-8.")
            return

        missing = [m for m in required if m not in text]
        if missing:
            self.reply(400, "Save refused: %s missing from %s." % (", ".join(missing), name))
            return

        # UTF-8 and LF, explicitly, both for the same reason as in build.py:
        # the default encoding here is cp1252 and the default newline is CRLF,
        # and either one silently rewrites the whole file.
        try:
            with open(target, "w", encoding="utf-8", newline="") as f:
                f.write(text)
        except OSError as e:
            self.reply(500, "Could not write the file: %s" % e)
            return

        print("  saved  %s  (%d bytes)" % (name, len(text)), flush=True)
        self.reply(200, "Saved to src/%s. Reload the game to see it." % name)

    def reply(self, code, message):
        payload = message.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
        if code >= 400:
            print("  %s" % message, flush=True)

    def log_message(self, fmt, *args):
        # Serving the game's fourteen scripts on every reload is not news.
        # Saves and failures print themselves; everything else stays quiet.
        pass


def main():
    ap = argparse.ArgumentParser(description="Paleopal art editor.")
    ap.add_argument("-b", "--browser", help="which browser to open (e.g. firefox)")
    ap.add_argument("-n", "--no-open", action="store_true", help="do not open a browser")
    ap.add_argument("-p", "--port", type=int, default=0, help="port (default: any free one)")
    args = ap.parse_args()

    for path, _ in TARGETS.values():
        if not path.exists():
            sys.exit("Cannot find %s — run this from inside the project." % path)

    # Port 0 asks the OS for a free one, so a second copy of this, or anything
    # else already sitting on 8000, is not an error you have to think about.
    server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    url = "http://127.0.0.1:%d%s" % (server.server_address[1], PAGE)

    print("Paleopal art editor")
    print("  serving %s" % ROOT)
    for path, _ in TARGETS.values():
        print("  writing %s" % path)
    print("  %s" % url)
    print("  Ctrl+C to stop.", flush=True)

    if not args.no_open:
        opener = webbrowser
        if args.browser:
            try:
                opener = webbrowser.get(args.browser)
            except webbrowser.Error:
                print("  (%s not registered here — using the default browser)"
                      % args.browser)
        threading.Timer(0.3, lambda: opener.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
