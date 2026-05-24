#!/usr/bin/env bash
# ============================================================
# 🌒 OpenVesper installer
#
# Usage:
#   curl -fsSL https://openvesper.com/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/openvesper/openvesper/main/scripts/install.sh | bash
#
# What it does:
#   1. Detect Node.js version (install hint if missing)
#   2. Detect pnpm (install via npm if missing)
#   3. Clone openvesper into ~/.local/share/openvesper
#   4. Run pnpm install + pnpm -r build
#   5. Symlink vesper CLI into ~/.local/bin
#   6. Print next steps (run `vesper onboard`)
#
# Environment variables:
#   OPENVESPER_INSTALL_DIR  — default ~/.local/share/openvesper
#   OPENVESPER_BIN_DIR      — default ~/.local/bin
#   OPENVESPER_BRANCH       — default main
#   OPENVESPER_REPO_URL     — default https://github.com/openvesper/openvesper.git
# ============================================================

set -euo pipefail

INSTALL_DIR="${OPENVESPER_INSTALL_DIR:-$HOME/.local/share/openvesper}"
BIN_DIR="${OPENVESPER_BIN_DIR:-$HOME/.local/bin}"
BRANCH="${OPENVESPER_BRANCH:-main}"
REPO_URL="${OPENVESPER_REPO_URL:-https://github.com/openvesper/openvesper.git}"

# ── Helpers ─────────────────────────────────────────────────────────

GREEN="\033[32m"
CYAN="\033[36m"
RED="\033[31m"
DIM="\033[2m"
BOLD="\033[1m"
RESET="\033[0m"

step()  { echo -e "${CYAN}▶${RESET} $1"; }
ok()    { echo -e "  ${GREEN}✓${RESET} ${DIM}$1${RESET}"; }
warn()  { echo -e "  ${BOLD}!${RESET} $1"; }
fail()  { echo -e "  ${RED}✗${RESET} $1" >&2; exit 1; }

# ── Pre-flight checks ───────────────────────────────────────────────

echo ""
echo -e "${CYAN}${BOLD}  🌒 OpenVesper installer${RESET}"
echo -e "  ${DIM}https://github.com/openvesper/openvesper${RESET}"
echo ""

step "Checking prerequisites"

if ! command -v git > /dev/null 2>&1; then
  fail "git is required but not installed. Install git first."
fi
ok "git: $(git --version | head -1)"

# ── Node.js (auto-install if missing) ──────────────────────────────

install_node_via_fnm() {
  # fnm is a fast, Rust-based Node manager. It installs into ~/.local/share/fnm
  # and works without root. We use it as the auto-installer for sh systems.
  step "Installing Node via fnm (https://github.com/Schniz/fnm)"
  curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell > /tmp/fnm-install.log 2>&1 || {
    cat /tmp/fnm-install.log
    fail "fnm install failed. Install Node manually from https://nodejs.org and re-run."
  }
  export PATH="$HOME/.local/share/fnm:$PATH"
  eval "$(fnm env)" 2>/dev/null || true
  fnm install --lts > /tmp/fnm-node.log 2>&1 || {
    cat /tmp/fnm-node.log
    fail "fnm could not install Node LTS. See /tmp/fnm-node.log."
  }
  fnm use lts-latest > /dev/null 2>&1 || fnm default lts-latest > /dev/null 2>&1 || true
  ok "Node installed via fnm: $(node --version 2>/dev/null || echo missing)"
  warn "Add fnm to your shell so 'node' is on PATH in new terminals:"
  warn "  echo 'eval \"\$(fnm env --use-on-cd)\"' >> ~/.bashrc"
}

if ! command -v node > /dev/null 2>&1; then
  warn "node not found — attempting auto-install"
  install_node_via_fnm
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 18 ]; then
  warn "node $NODE_MAJOR found, but OpenVesper needs v18 or later — upgrading"
  install_node_via_fnm
  NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
  if [ "$NODE_MAJOR" -lt 18 ]; then
    fail "Could not get node v18+. Install manually from https://nodejs.org and re-run."
  fi
fi
ok "node: $(node --version)"

# pnpm — auto-install if missing
if ! command -v pnpm > /dev/null 2>&1; then
  warn "pnpm not found — installing via npm"
  npm install -g pnpm@9 || fail "Failed to install pnpm. Run 'npm install -g pnpm@9' manually."
fi
ok "pnpm: $(pnpm --version)"

# ── Clone / update ──────────────────────────────────────────────────

if [ -d "$INSTALL_DIR/.git" ]; then
  step "Updating existing checkout at $INSTALL_DIR"
  cd "$INSTALL_DIR"
  git fetch origin "$BRANCH" --quiet
  git checkout "$BRANCH" --quiet
  git pull --ff-only --quiet
  ok "On branch $BRANCH at $(git rev-parse --short HEAD)"
elif [ -d "$INSTALL_DIR" ]; then
  fail "$INSTALL_DIR exists but is not a git checkout. Remove it or pick another OPENVESPER_INSTALL_DIR."
else
  step "Cloning $REPO_URL → $INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR" --quiet
  ok "Cloned at $(cd "$INSTALL_DIR" && git rev-parse --short HEAD)"
fi

# ── Install + build ─────────────────────────────────────────────────

cd "$INSTALL_DIR"

step "Installing dependencies (~2 min, please wait)"
# --ignore-scripts: skip optional native deps (better-sqlite3, keytar)
pnpm install --frozen-lockfile --ignore-scripts --silent || \
  pnpm install --ignore-scripts --silent || \
  fail "pnpm install failed. See ~/.npm/_logs for details."
ok "Dependencies installed"

step "Building all packages (~1 min)"
pnpm -r build > /tmp/openvesper-build.log 2>&1 || {
  echo ""
  tail -20 /tmp/openvesper-build.log
  fail "Build failed. Full log at /tmp/openvesper-build.log"
}
ok "Build complete"

# ── Symlink CLI ─────────────────────────────────────────────────────

step "Installing 'vesper' CLI to $BIN_DIR"
mkdir -p "$BIN_DIR"

CLI_ENTRY="$INSTALL_DIR/apps/cli/dist/index.js"
if [ ! -f "$CLI_ENTRY" ]; then
  fail "CLI entry point missing: $CLI_ENTRY (build may have failed silently)"
fi

# Wrapper script — uses absolute paths so it works from anywhere
cat > "$BIN_DIR/vesper" << EOF
#!/usr/bin/env bash
exec node "$CLI_ENTRY" "\$@"
EOF
chmod +x "$BIN_DIR/vesper"
ok "Installed: $BIN_DIR/vesper"

# Check if BIN_DIR is on PATH
case ":$PATH:" in
  *":$BIN_DIR:"*) PATH_OK=1 ;;
  *)              PATH_OK=0 ;;
esac

# ── Done ────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}  ✓ OpenVesper installed${RESET}"
echo ""

if [ "$PATH_OK" -eq 0 ]; then
  echo -e "${BOLD}  Add $BIN_DIR to your PATH:${RESET}"
  echo ""
  echo "    echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
  echo "    source ~/.bashrc"
  echo ""
fi

echo -e "${BOLD}  Next:${RESET}"
echo -e "    ${CYAN}vesper onboard${RESET}     ${DIM}# guided setup (~2 min)${RESET}"
echo -e "    ${CYAN}vesper doctor${RESET}      ${DIM}# health check${RESET}"
echo -e "    ${CYAN}vesper --help${RESET}      ${DIM}# command reference${RESET}"
echo ""
