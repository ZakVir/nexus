#!/usr/bin/env bash
# Nexus CLI installer
# Usage: curl -fsSL https://raw.githubusercontent.com/ZakVir/nexus/main/scripts/install.sh | bash
set -euo pipefail

NEXUS_VERSION="${NEXUS_VERSION:-0.1.0}"
REPO_DIR="${HOME}/.nexus/repo"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

# Detect OS and arch
detect_platform() {
  local os arch
  case "$(uname -s)" in
    Linux*)  os="linux" ;;
    Darwin*) os="darwin" ;;
    *)       error "Unsupported OS: $(uname -s)" ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64)  arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)             error "Unsupported architecture: $(uname -m)" ;;
  esac
  echo "${os}-${arch}"
}

# Install bun if not present
ensure_bun() {
  if command -v bun &>/dev/null; then
    ok "bun found: $(bun --version)"
    return 0
  fi

  info "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${HOME}/.bun"
  export PATH="${BUN_INSTALL}/bin:${PATH}"
  ok "bun installed: $(bun --version)"
}

# Main install
main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║       Nexus CLI Installer v${NEXUS_VERSION}       ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
  echo ""

  ensure_bun

  PLATFORM=$(detect_platform)
  info "Platform: ${PLATFORM}"

  # Clone the repo
  if [ -d "$REPO_DIR" ]; then
    info "Updating existing installation..."
    cd "$REPO_DIR"
    git pull --ff-only
  else
    info "Cloning Nexus CLI..."
    git clone https://github.com/ZakVir/nexus.git "$REPO_DIR"
    cd "$REPO_DIR"
  fi

  # Install dependencies
  info "Installing dependencies..."
  export PATH="$HOME/.bun/bin:$PATH"
  bun install

  # Build
  info "Building..."
  bun run build

  # Create wrapper script
  local BIN_DIR="${HOME}/.local/bin"
  mkdir -p "$BIN_DIR"

  cat > "$BIN_DIR/nexus-cli" << 'WRAPPER'
#!/usr/bin/env bash
# Nexus CLI wrapper
export PATH="$HOME/.bun/bin:$PATH"
exec bun run /home/oplaptop/.nexus/repo/packages/cli/src/index.ts "$@"
WRAPPER

  # Fix the wrapper path if not on oplaptop
  sed -i.bak "s|/home/oplaptop/.nexus/repo|${REPO_DIR}|g" "$BIN_DIR/nexus-cli"
  rm -f "$BIN_DIR/nexus-cli.bak"
  chmod +x "$BIN_DIR/nexus-cli"

  # Check if BIN_DIR is in PATH
  if [[ ":${PATH}:" != *":${BIN_DIR}:"* ]]; then
    warn "${BIN_DIR} is not in your PATH"
    echo "  Add to your shell profile (~/.zshrc):"
    echo "    export PATH=\"${BIN_DIR}:\$PATH\""
    echo ""
  fi

  echo ""
  ok "Installation complete!"
  echo "  Run 'nexus-cli --help' to get started"
  echo "  Run 'nexus-cli setup' to configure providers"
  echo ""
}

main "$@"