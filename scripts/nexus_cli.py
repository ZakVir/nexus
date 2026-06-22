"""
Nexus CLI — Python shim for pip installation.

This is a thin wrapper that invokes the Nexus CLI binary.
Install with: pip install nexus-cli

The actual Nexus CLI is a TypeScript/Bun application.
This shim ensures it's available in Python environments.
"""

import subprocess
import sys
import shutil
import os


def main():
    """Find and execute the nexus binary."""
    # Try to find nexus in PATH
    nexus_path = shutil.which("nexus")
    
    if nexus_path is None:
        print(
            "Error: nexus binary not found in PATH.\n"
            "Install nexus first:\n"
            "  curl -fsSL https://nexus.ai/install | bash\n"
            "  # or\n"
            "  npm install -g @nexus-ai/nexus\n",
            file=sys.stderr,
        )
        sys.exit(1)
    
    # Execute nexus with all arguments
    result = subprocess.run(
        [nexus_path] + sys.argv[1:],
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()