# typed: false
# frozen_string_literal: true

# Nexus — Multi-model AI CLI tool for humans and agents
# Homebrew formula

class Nexus < Formula
  desc "Multi-model AI CLI tool for humans and agents"
  homepage "https://github.com/ZakVir/nexus"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_intel do
      url "https://github.com/ZakVir/nexus/releases/download/v#{version}/nexus-darwin-x64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_DARWIN_X64"
    end

    on_arm do
      url "https://github.com/ZakVir/nexus/releases/download/v#{version}/nexus-darwin-arm64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_DARWIN_ARM64"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/ZakVir/nexus/releases/download/v#{version}/nexus-linux-x64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_LINUX_X64"
    end

    on_arm do
      url "https://github.com/ZakVir/nexus/releases/download/v#{version}/nexus-linux-arm64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_LINUX_ARM64"
    end
  end

  def install
    bin.install "nexus"
  end

  test do
    assert_match "nexus v#{version}", shell_output("#{bin}/nexus --version")
  end
end