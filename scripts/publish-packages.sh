#!/usr/bin/env bash
# ============================================================
# 🌒 OpenVesper — publish all packages to npm
# ============================================================
#
# Usage:
#   ./scripts/publish-packages.sh           # publish core + plugin-sdk only
#   ./scripts/publish-packages.sh --all     # publish all 53 packages
#   ./scripts/publish-packages.sh --dry-run # show what would publish
#
# Requirements:
#   - npm login completed (npm whoami)
#   - All packages built (pnpm -r build)
#   - Version bumped (CHANGELOG.md updated)
# ============================================================

set -euo pipefail

DRY_RUN=""
PUBLISH_ALL=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="--dry-run" ;;
    --all)     PUBLISH_ALL=1 ;;
    --help|-h)
      head -20 "$0" | tail -15 | sed 's/^# //'
      exit 0 ;;
  esac
done

# Sanity: build artifacts exist
if [ ! -d packages/core/dist ]; then
  echo "✗ packages/core/dist missing — run 'pnpm -r build' first"
  exit 1
fi

# Sanity: logged in
if ! npm whoami > /dev/null 2>&1; then
  echo "✗ Not logged into npm — run 'npm login' first"
  exit 1
fi
echo "✓ Logged in as $(npm whoami)"

publish_one() {
  local pkg=$1
  pushd "$pkg" > /dev/null
  echo ""
  echo "▶ Publishing $(jq -r .name package.json) v$(jq -r .version package.json)"
  npm publish $DRY_RUN
  popd > /dev/null
}

# Core packages first (others depend on them)
publish_one packages/core
publish_one packages/plugin-sdk

if [ "$PUBLISH_ALL" -eq 1 ]; then
  for d in packages/plugins/*/; do
    publish_one "$d"
  done
fi

echo ""
echo "✓ Done"
