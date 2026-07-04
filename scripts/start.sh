#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Не найден '$1'. Установите его и повторите." >&2; exit 1; }
}
need uv
need npm
need setsid

if [ ! -f config.yaml ]; then
  echo "config.yaml не найден. Создайте из шаблона:" >&2
  echo "  cp config.example.yaml config.yaml" >&2
  exit 1
fi

if [ ! -d frontend/node_modules ]; then
  echo "== Устанавливаю зависимости фронтенда =="
  (cd frontend && npm install)
fi

echo "== Синхронизирую окружение бэкенда =="
uv sync

# Каждый сервис — в своей process-группе (setsid), чтобы при остановке погасить
# и его потомков (uvicorn, vite/esbuild), а не только процесс-обёртку.
groups=()
cleanup() {
  trap - INT TERM EXIT
  echo
  echo "== Останавливаю =="
  for pgid in "${groups[@]}"; do
    kill -TERM -"$pgid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "== Бэкенд   → http://127.0.0.1:1488 (Swagger: /docs) =="
setsid uv run python -m app.main &
groups+=($!)

echo "== Фронтенд → http://127.0.0.1:5173 =="
setsid bash -c 'cd frontend && npm run dev' &
groups+=($!)

# Завершаемся, как только упадёт любой из сервисов; cleanup погасит второй.
wait -n
