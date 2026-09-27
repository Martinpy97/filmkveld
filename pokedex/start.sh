#!/bin/sh
set -eu
cd "$(dirname "$0")"
command -v docker >/dev/null 2>&1 || { echo "Installer Docker Desktop eller Docker Engine med Compose først."; exit 1; }
docker info >/dev/null 2>&1 || { echo "Start Docker først."; exit 1; }
docker compose up -d --build --wait --wait-timeout 120
echo "Pokédex er klar: http://localhost:8784"
if command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:8784 >/dev/null 2>&1 || true; fi
