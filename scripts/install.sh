#!/usr/bin/env bash
# Nexus installer
# Usage: curl -fsSL https://raw.githubusercontent.com/ZakVir/nexus/main/scripts/install.sh | bash
set -euo pipefail

NEXUS_VERSION="${NEXUS_VERSION:-0.1.0}"
INSTALL_DIR="${HOME}/.local/bin"

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

# Check for bun
check_bun() {
  if command -v bun &>/dev/null; then
    ok "bun found: $(bun --version)"
    return 0
  fi
  return 1
}

# Check for npm
check_npm() {
  if command -v npm &>/dev/null; then
    ok "npm found: $(npm --version)"
    return 0
  fi
  return 1
}

# Install bun if needed
install_bun() {
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
  echo -e "${CYAN}║       Nexus Installer v${NEXUS_VERSION}         ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
  echo ""

  # Check prerequisites
  if ! check_bun; then
    if ! check_npm; then
      install_bun
    fi
  fi

  # Create install directory
  mkdir -p "${INSTALL_DIR}"

  PLATFORM=$(detect_platform)
  info "Platform: ${PLATFORM}"

  # Try npm global install first
  if command -v npm &>/dev/null; then
    info "Installing via npm..."
    if npm install -g @nexus-ai/nexus 2>/dev/null; then
      ok "Installed via npm"
      echo ""
      ok "Run 'nexus --help' to get started"
      return 0
    fi
    warn "npm install failed, trying alternative methods..."
  fi

  # Try bun global install
  if command -v bun &>/dev/null; then
    info "Installing via bun..."
    if bun install -g @nexus-ai/nexus 2>/dev/null; then
      ok "Installed via bun"
      echo ""
      ok "Run 'nexus --help' to get started"
      return 0
    fi
    warn "bun install failed, trying alternative methods..."
  fi

  # Try Homebrew (only if our tap is already added)
  if command -v brew &>/dev/null && brew list nexus-cli &>/dev/null 2>&1; then
    info "Installing/updating via Homebrew..."
    if brew upgrade nexus-cli 2>/dev/null; then
      ok "Installed via Homebrew"
      echo ""
      ok "Run 'nexus-cli --help' to get started"
      return 0
    fi
  fi
  info "Downloading nexus binary from GitHub releases..."
  local download_url="https://github.com/ZakVir/nexus/releases/download/v${NEXUS_VERSION}/nexus-cli-${PLATFORM}.tar.gz"
  local tmp_dir
  tmp_dir=$(mktemp -d)

  if curl -fsSL "${download_url}" -o "${tmp_dir}/nexus-cli.tar.gz" 2>/dev/null; then
    tar -xzf "${tmp_dir}/nexus-cli.tar.gz" -C "${tmp_dir}"
    cp "${tmp_dir}/nexus-cli" "${INSTALL_DIR}/nexus-cli"
    chmod +x "${INSTALL_DIR}/nexus-cli"
    rm -rf "${tmp_dir}"
    ok "Binary installed to ${INSTALL_DIR}/nexus-cli"
  else
    warn "No binary release available yet for ${PLATFORM}"
    echo ""
    echo "  Install manually:"
    echo "    npm install -g @nexus-ai/nexus"
    echo "  Or clone and build from source:"
    echo "    git clone https://github.com/ZakVir/nexus.git"
    echo "    cd nexus && bun install && bun run build"
    echo ""
    return 1
  fi

  # Check if INSTALL_DIR is in PATH
  if [[ ":${PATH}:" != *":${INSTALL_DIR}:"* ]]; then
    warn "${INSTALL_DIR} is not in your PATH"
    echo "  Add to your shell profile:"
    echo "    export PATH=\"${INSTALL_DIR}:\$PATH\""
    echo ""
  fi

  echo ""
  ok "Installation complete!"
  echo "  Run 'nexus --help' to get started"
  echo "  Run 'nexus setup' to configure providers"
  echo ""
}

main "$@"