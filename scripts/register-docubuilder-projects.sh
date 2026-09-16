#!/usr/bin/env bash
# register-docubuilder-projects.sh
#
# Register DocuBuilder (non-runnable) and a worker/source project (runnable)
# with DocuBuilder as --sub-project, using npm-winccoa-register-project.
#
# Usable locally and in CI.
#
# Example:
#   ./scripts/register-docubuilder-projects.sh \
#     --project-path ./src/Squirt \
#     --version 3.21 \
#     --langs en_US.utf8
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROJECT_PATH=""
VERSION=""
LANGS="en_US.utf8"
DOCU_BUILDER_PATH="${PKG_ROOT}/winccoa/DocuBuilder"
REGISTER_CLI=""
DRY_RUN=0

usage() {
  cat <<EOF
Usage: $(basename "$0") --project-path <workerProject> [options]

Register:
  1) DocuBuilder as non-runnable WinCC OA project
  2) Worker project as runnable with --sub-project DocuBuilder

Options:
  --project-path <path>         Runnable worker/source project (required)
  -v, --version <ver>           WinCC OA version (e.g. 3.21)
  --langs <csv>                 Languages (default: en_US.utf8)
  --docu-builder-path <path>    DocuBuilder path (default: package winccoa/DocuBuilder)
  --register-cli <path>         Path to npm-winccoa-register CLI js entry
  --dry-run                     Print commands only
  -h, --help                    Show help

Environment:
  WINCCOA_VERSION               Fallback for --version
  WINCCOA_REGISTER_CLI          Fallback for --register-cli

After success, run docs build with worker config, e.g.:
  WCCOActrl -config <worker>/config/config -n -log +stderr buildHelp.ctl <Company>
  # or:
  winccoa-docu-builder build <worker> -v <ver> --no-register -c <Company>
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-path)
      PROJECT_PATH="${2:-}"; shift 2 ;;
    -v|--version)
      VERSION="${2:-}"; shift 2 ;;
    --langs)
      LANGS="${2:-}"; shift 2 ;;
    --docu-builder-path)
      DOCU_BUILDER_PATH="${2:-}"; shift 2 ;;
    --register-cli)
      REGISTER_CLI="${2:-}"; shift 2 ;;
    --dry-run)
      DRY_RUN=1; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1 ;;
  esac
done

VERSION="${VERSION:-${WINCCOA_VERSION:-}}"
REGISTER_CLI="${REGISTER_CLI:-${WINCCOA_REGISTER_CLI:-}}"

if [[ -z "${PROJECT_PATH}" ]]; then
  echo "Error: --project-path is required" >&2
  usage >&2
  exit 1
fi
if [[ -z "${VERSION}" ]]; then
  echo "Error: --version is required (or set WINCCOA_VERSION)" >&2
  exit 1
fi

PROJECT_PATH="$(cd "${PROJECT_PATH}" && pwd)"
DOCU_BUILDER_PATH="$(cd "${DOCU_BUILDER_PATH}" && pwd)"

if [[ ! -f "${DOCU_BUILDER_PATH}/scripts/buildHelp.ctl" ]]; then
  echo "Error: buildHelp.ctl not found under ${DOCU_BUILDER_PATH}/scripts" >&2
  exit 1
fi

find_register_cli() {
  if [[ -n "${REGISTER_CLI}" && -f "${REGISTER_CLI}" ]]; then
    printf '%s' "${REGISTER_CLI}"
    return 0
  fi
  local candidates=(
    "${PKG_ROOT}/node_modules/@winccoa-tools-pack/npm-winccoa-register-project/dist/cjs/cli.js"
    "${PKG_ROOT}/../npm-winccoa-register-project/dist/cjs/cli.js"
  )
  local c
  for c in "${candidates[@]}"; do
    if [[ -f "${c}" ]]; then
      printf '%s' "${c}"
      return 0
    fi
  done
  if command -v npm-winccoa-register >/dev/null 2>&1; then
    command -v npm-winccoa-register
    return 0
  fi
  return 1
}

run_register() {
  local cli
  if ! cli="$(find_register_cli)"; then
    echo "Error: could not find npm-winccoa-register-project CLI" >&2
    exit 1
  fi
  echo "register: ${cli} $*"
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    return 0
  fi
  if [[ "${cli}" == *.js ]]; then
    node "${cli}" "$@"
  else
    "${cli}" "$@"
  fi
}

echo "DocuBuilder (non-runnable): ${DOCU_BUILDER_PATH}"
echo "Worker project (runnable): ${PROJECT_PATH}"
echo "WinCC OA version: ${VERSION}"
echo "Langs: ${LANGS}"

run_register \
  --project-path "${DOCU_BUILDER_PATH}" \
  --runnable false \
  --wincc-oa-version "${VERSION}"

run_register \
  --project-path "${PROJECT_PATH}" \
  --runnable true \
  --wincc-oa-version "${VERSION}" \
  --langs "${LANGS}" \
  --sub-project "${DOCU_BUILDER_PATH}"

echo "Registration complete."
