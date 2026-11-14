#!/bin/bash
# Assemble js/*.js into one IIFE and wrap with head.html -> dist/island-rush.html (published) and dist/test.html (local test)
# three.js is inlined from vendor/ so the output is a single self-contained file with no network dependency.
# Set IR_VERSION to stamp a build; the deploy workflow passes the release tag. A plain local build is
# stamped "dev" on purpose: dist/ is committed, so a git hash here would bake in a stale version and
# make the artifact differ for every developer.
set -e
# Pin collation: the globs below decide load order, and every file shares one scope. Under a UTF-8
# locale the shell ignores the underscore when sorting, so 07_airport_gfx.js would come before
# 07_airport.js -- a different bundle on a Mac than on a CI runner. LC_ALL=C makes it byte order.
export LC_ALL=C
cd "$(dirname "$0")"; mkdir -p dist
RAW_VERSION="${IR_VERSION:-dev}"
# Keep only characters that are safe inside a single-quoted JS string literal.
VERSION="$(printf '%s' "$RAW_VERSION" | tr -cd 'A-Za-z0-9._+-' | cut -c1-32)"
[ -n "$VERSION" ] || VERSION=dev
{ echo "(function(){'use strict';"; echo "const IR_VERSION='$VERSION';"; for f in js/0[1-9]_*.js js/1[0-9]_*.js js/99_main.js; do echo "/* ---- $f ---- */"; cat "$f"; echo; done; echo "})();"; } > dist/game.js
node --check dist/game.js
{ cat head.html; echo "<script>"; cat vendor/three.min.js; echo "</script>"; echo "<script>"; cat dist/game.js; echo "</script>"; } > dist/island-rush.html
{ echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">'; cat dist/island-rush.html; echo '</body></html>'; } > dist/test.html
echo "built version $VERSION"
ls -la dist
