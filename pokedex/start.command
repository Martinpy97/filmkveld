#!/bin/sh
set -eu
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
if ! sh ./start.sh; then
  printf '\nOppstart feilet. Les meldingen ovenfor. Trykk Enter for å lukke.\n'
  read answer
  exit 1
fi
open http://localhost:8784
