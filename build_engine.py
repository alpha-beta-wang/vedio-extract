#!/usr/bin/env python3
"""
编译 vedioNoter 独立后端引擎 (PyInstaller)
将 Flask 后端与业务处理库打包为无需安装 Python 的原生可执行程序。
"""

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def main():
    print("=== 开始构建 vedioNoter 独立后端引擎 (PyInstaller) ===")

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

    print(f"执行命令: {' '.join(cmd)}")
    subprocess.run(cmd, check=True, cwd=str(ROOT))

    out_dir = ROOT / "dist" / "vedionoter-engine"
    example_yaml = ROOT / "config.example.yaml"
    if out_dir.exists() and example_yaml.exists():
        shutil.copy2(str(example_yaml), str(out_dir / "config.example.yaml"))
        print(f"已复制配置文件模板到: {out_dir / 'config.example.yaml'}")

    print("\n======================================================")
    print("  独立后端引擎构建完成！")
    print(f"  输出目录: {out_dir}")
    print("======================================================\n")

if __name__ == "__main__":
    main()
