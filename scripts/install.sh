#!/usr/bin/env bash
# Nexus installer — curl -fsSL https://raw.githubusercontent.com/nexus-ai/nexus/main/scripts/install.sh | bash
set -euo pipefail

NEXUS_VERSION="${NEXUS_VERSION:-0.1.0}"
NEXUS_DIR="${HOME}/.nexus"
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

# Check for node
check_node() {
  if command -v node &>/dev/null; then
    ok "node found: $(node --version)"
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
    if ! check_node; then
      install_bun
    fi
  fi

  # Create install directory
  mkdir -p "${INSTALL_DIR}"
  mkdir -p "${NEXUS_DIR}"

  # Determine install method
  PLATFORM=$(detect_platform)
  info "Platform: ${PLATFORM}"

  # Try npm global install
  if command -v npm &>/dev/null; then
    info "Installing via npm..."
    npm install -g @nexus-ai/nexus 2>/dev/null && {
      ok "Installed via npm"
      echo ""
      ok "Run 'nexus --help' to get started"
      return 0
    }
  fi

  # Try bun global install
  if command -v bun &>/dev/null; then
    info "Installing via bun..."
    bun install -g @nexus-ai/nexus 2>/dev/null && {
      ok "Installed via bun"
      echo ""
      ok "Run 'nexus --help' to get started"
      return 0
    }
  fi

  # Fallback: download binary
  info "Downloading nexus binary..."
  local download_url="https://github.com/nexus-ai/nexus/releases/download/v${NEXUS_VERSION}/nexus-${PLATFORM}.tar.gz"
  local tmp_dir
  tmp_dir=$(mktemp -d)
  
  if curl -fsSL "${download_url}" -o "${tmp_dir}/nexus.tar.gz" 2>/dev/null; then
    tar -xzf "${tmp_dir}/nexus.tar.gz" -C "${tmp_dir}"
    cp "${tmp_dir}/nexus" "${INSTALL_DIR}/nexus"
    chmod +x "${INSTALL_DIR}/nexus"
    rm -rf "${tmp_dir}"
    ok "Binary installed to ${INSTALL_DIR}/nexus"
  else
    error "Failed to download binary. Try: npm install -g @nexus-ai/nexus"
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