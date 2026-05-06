#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${SESSION_NAME:-profile}"
LOCAL_PATH="${LOCAL_PATH:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
REMOTE_HOST="${REMOTE_HOST:-medusa.dgp.toronto.edu}"
REMOTE_USER="${REMOTE_USER:-joonho}"
REMOTE_PATH="${REMOTE_PATH:-/www/public_user/joonho/}"
REMOTE_URL="${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"
SYNC_IGNORES=(
  "/courses/csc317-2025-09/showcase"
)

usage() {
  cat <<USAGE
Usage: ./sync.sh [setup|recreate|status|monitor|flush|fix-perms]

Commands:
  setup      Start Mutagen and create the session if it is missing.
  recreate  Terminate and recreate the session with web-safe permissions.
  status    Show detailed Mutagen status.
  monitor   Stream Mutagen status.
  flush     Force a synchronization cycle.
  fix-perms Set remote directories to 755 and files to 644.

Environment overrides:
  SESSION_NAME=${SESSION_NAME}
  LOCAL_PATH=${LOCAL_PATH}
  REMOTE_USER=${REMOTE_USER}
  REMOTE_HOST=${REMOTE_HOST}
  REMOTE_PATH=${REMOTE_PATH}
USAGE
}

ignore_args() {
  for path in "${SYNC_IGNORES[@]}"; do
    printf '%s\n' --ignore "${path}"
  done
}

require_mutagen() {
  if ! command -v mutagen >/dev/null 2>&1; then
    echo "error: mutagen is not installed or not on PATH" >&2
    exit 1
  fi
}

start_daemon() {
  mutagen daemon start
}

session_exists() {
  mutagen sync list "${SESSION_NAME}" >/dev/null 2>&1
}

create_session() {
  mutagen sync create \
    --name "${SESSION_NAME}" \
    --mode two-way-safe \
    --default-file-mode-alpha 0644 \
    --default-directory-mode-alpha 0755 \
    --default-file-mode-beta 0644 \
    --default-directory-mode-beta 0755 \
    $(ignore_args) \
    "${REMOTE_URL}" \
    "${LOCAL_PATH}"
}

terminate_session() {
  if session_exists; then
    mutagen sync terminate "${SESSION_NAME}"
  fi
}

fix_remote_permissions() {
  ssh "${REMOTE_USER}@${REMOTE_HOST}" \
    "find '${REMOTE_PATH}' -type d -exec chmod 755 {} + && find '${REMOTE_PATH}' -type f -exec chmod 644 {} +"
}

setup_session() {
  require_mutagen
  start_daemon
  if ! session_exists; then
    create_session
  fi
  fix_remote_permissions
  mutagen sync flush "${SESSION_NAME}"
  mutagen sync list --long "${SESSION_NAME}"
}

case "${1:-setup}" in
  setup)
    setup_session
    ;;
  recreate)
    require_mutagen
    start_daemon
    terminate_session
    create_session
    fix_remote_permissions
    mutagen sync flush "${SESSION_NAME}"
    mutagen sync list --long "${SESSION_NAME}"
    ;;
  status)
    require_mutagen
    start_daemon
    mutagen sync list --long "${SESSION_NAME}"
    ;;
  monitor)
    require_mutagen
    start_daemon
    mutagen sync monitor "${SESSION_NAME}"
    ;;
  flush)
    require_mutagen
    start_daemon
    mutagen sync flush "${SESSION_NAME}"
    ;;
  fix-perms)
    fix_remote_permissions
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
