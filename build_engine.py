#!/usr/bin/env python3
"""
Build standalone vedioNoter backend engine (PyInstaller).
Packages Flask backend and modules into a self-contained executable with zero Python dependencies.
"""

import shutil
import subprocess
import sys
from pathlib import Path

# Ensure UTF-8 output across Windows, Linux, and macOS consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent

def main():
    print("=== Building vedioNoter Standalone Backend Engine (PyInstaller) ===")

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--name",
        "vedionoter-engine",
        "--paths",
        ".",
        "--hidden-import", "flask",
        "--hidden-import", "requests",
        "--hidden-import", "yaml",
        "--hidden-import", "config",
        "--hidden-import", "transcribe",
        "--hidden-import", "summarize",
        "--hidden-import", "summarizer",
        "--hidden-import", "summarizer.api",
        "--hidden-import", "summarizer.prompts",
        "--hidden-import", "summarizer.processor",
        "--hidden-import", "summarizer.io",
        "--hidden-import", "web.backend.tasks",
        "web/backend/server.py",
    ]

    print(f"Command: {' '.join(cmd)}")
    subprocess.run(cmd, check=True, cwd=str(ROOT))

    out_dir = ROOT / "dist" / "vedionoter-engine"
    example_yaml = ROOT / "config.example.yaml"
    if out_dir.exists() and example_yaml.exists():
        shutil.copy2(str(example_yaml), str(out_dir / "config.example.yaml"))
        print(f"Copied config template to: {out_dir / 'config.example.yaml'}")

    print("\n======================================================")
    print("  Standalone backend engine built successfully!")
    print(f"  Output directory: {out_dir}")
    print("======================================================\n")

if __name__ == "__main__":
    main()
