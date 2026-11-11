#!/bin/bash
# Assemble js/*.js into one IIFE and wrap with head.html -> dist/island-rush.html (published) and dist/test.html (local test)
set -e
cd "$(dirname "$0")"; mkdir -p dist
{ echo "(function(){'use strict';"; for f in js/0[1-9]_*.js js/1[0-9]_*.js js/99_main.js; do echo "/* ---- $f ---- */"; cat "$f"; echo; done; echo "})();"; } > dist/game.js
node --check dist/game.js
THREE_URL="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
{ cat head.html; echo "<script src=\"$THREE_URL\"></script>"; echo "<script>"; cat dist/game.js; echo "</script>"; } > dist/island-rush.html
{ echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">'; cat dist/island-rush.html; echo '</body></html>'; } > dist/test.html
ls -la dist
