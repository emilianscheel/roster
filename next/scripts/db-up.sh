#!/usr/bin/env bash
set -euo pipefail

NAME="${ROSTER_PG_NAME:-roster-pg}"
VOLUME="${ROSTER_PG_VOLUME:-roster-pg-data}"
PORT="${ROSTER_PG_PORT:-5432}"
USER="${ROSTER_PG_USER:-roster}"
PASSWORD="${ROSTER_PG_PASSWORD:-roster}"
DB="${ROSTER_PG_DB:-roster}"
IMAGE="${ROSTER_PG_IMAGE:-postgres:16-alpine}"

if ! command -v container >/dev/null 2>&1; then
  echo "Apple container CLI not found. Install from https://github.com/apple/container"
  exit 1
fi

if ! container system status >/dev/null 2>&1; then
  echo "Starting Apple container system..."
  container system start
fi

if ! container volume list 2>/dev/null | grep -q "$VOLUME"; then
  echo "Creating volume $VOLUME..."
  container volume create "$VOLUME" >/dev/null 2>&1 || true
fi

if container list --all 2>/dev/null | grep -q "$NAME"; then
  if container list 2>/dev/null | grep -q "$NAME"; then
    echo "Postgres already running ($NAME)"
  else
    echo "Starting existing Postgres container ($NAME)..."
    container start "$NAME" || {
      echo "Recreating $NAME..."
      container rm "$NAME" >/dev/null 2>&1 || true
      container run \
        --name "$NAME" \
        --detach \
        --publish "${PORT}:5432" \
        --env POSTGRES_USER="$USER" \
        --env POSTGRES_PASSWORD="$PASSWORD" \
        --env POSTGRES_DB="$DB" \
        --env PGDATA=/var/lib/postgresql/data/pgdata \
        --volume "${VOLUME}:/var/lib/postgresql/data" \
        "$IMAGE"
    }
  fi
else
  echo "Starting Postgres ($IMAGE) as $NAME on :$PORT..."
  container run \
    --name "$NAME" \
    --detach \
    --publish "${PORT}:5432" \
    --env POSTGRES_USER="$USER" \
    --env POSTGRES_PASSWORD="$PASSWORD" \
    --env POSTGRES_DB="$DB" \
    --env PGDATA=/var/lib/postgresql/data/pgdata \
    --volume "${VOLUME}:/var/lib/postgresql/data" \
    "$IMAGE"
fi

echo "Waiting for Postgres..."
for i in $(seq 1 45); do
  if container exec "$NAME" pg_isready -U "$USER" -d "$DB" >/dev/null 2>&1; then
    echo "Postgres ready at postgresql://${USER}:****@127.0.0.1:${PORT}/${DB}"
    exit 0
  fi
  # Also try host-side check once container has an IP
  if command -v pg_isready >/dev/null 2>&1; then
    if pg_isready -h 127.0.0.1 -p "$PORT" -U "$USER" >/dev/null 2>&1; then
      echo "Postgres ready at postgresql://${USER}:****@127.0.0.1:${PORT}/${DB}"
      exit 0
    fi
  fi
  sleep 1
done

echo "Postgres did not become ready in time"
container logs "$NAME" 2>&1 | tail -30 || true
exit 1
