# AGENTS.md — AI Agent Guidance & Operational Manual

Welcome, AI Agent! This document provides context, architectural guidelines, technical specifications, and operational workflows for autonomous and semi-autonomous AI coding assistants working in the `vedioNoter` (`vedio_extract`) repository.

---

## 1. Project Overview & Core Mission

**`vedioNoter`** transforms raw video files (`.mp4`) into high-precision, structured academic study notes. It provides an end-to-end local and cloud-assisted pipeline consisting of:
1. **Offline Speech Recognition**: Extracts 16kHz mono audio via `ffmpeg` and transcribes speech using pre-compiled `whisper.cpp` binaries (completely offline, CPU-friendly, no GPU required).
2. **Universal Academic Summarization**: Leverages any OpenAI-compatible LLM (DeepSeek, OpenAI, SiliconFlow, Alibaba Qwen, Moonshot/Kimi, Zhipu GLM, Ollama, OpenRouter, etc.) to synthesize raw speech into structured, LaTeX-enabled, step-by-step academic notes with ASCII diagrams and examples.
3. **Multi-Interface Support**:
   - **CLI**: `transcribe.py`, `summarize.py`, `run_all.py` for command-line batch processing.
   - **Web UI**: Modern React 19 + Tailwind CSS single-page application.
   - **Desktop App**: Native Windows installer (NSIS Setup `.exe`), portable executable, and macOS application (DMG/ZIP) powered by Electron + React + Python manager.

---

## 2. Technology Stack & Architectural Layers

| Layer | Technologies & Dependencies | Purpose |
| :--- | :--- | :--- |
| **Transcription Engine** | `whisper.cpp` (prebuilt binary `whisper-cli`), `ffmpeg` | Local, fast, dependency-free speech-to-text |
| **LLM & Processing** | Python 3.11+, `requests`, `pyyaml`, OpenAI-compatible API | Text chunking, multi-stage summarization, prompt routing |
| **Backend Web Server** | Flask 3.0+, `flask-cors`, threading | RESTful API server for videos, tasks, settings, OS integration |
| **Frontend UI** | React 19, React Router 7, Tailwind CSS, Vite 8 | Drag-and-drop video upload, real-time progress, dual-pane note reading |
| **Desktop Shell** | Electron 33+, `electron-builder` | Native Windows & macOS window frame, OS dialogs, NSIS packaging |
| **Process Lifecycle** | Node.js `pythonManager.cjs` | Spawns, monitors health (`/api/health`), and terminates Python backend |

---

## 3. Directory Layout & Key Modules

```
vedio_extract/
├── AGENTS.md                      # AI agent operational manual (This file)
├── README.md                      # English documentation
├── README_CN.md                   # Chinese documentation
├── package.json                   # Root workspace scripts (desktop & frontend build)
├── start_desktop.bat              # Windows one-click desktop starter
├── start_desktop.sh               # macOS / Linux one-click desktop starter
├── desktop_app.py                 # Pure Python native App-Mode fallback launcher
├── setup.sh                       # Environment initialization script (uv + binaries)
├── config.yaml                    # Local runtime configuration (git-ignored, contains secrets)
├── config.example.yaml            # Configuration template
├── config.py                      # Centralized configuration access module
├── requirements.txt               # Minimal Python dependencies
│
├── transcribe.py                  # CLI: Audio extraction + Whisper transcription + Keyframe injection
├── summarize.py                   # CLI: Universal LLM academic note generation
├── run_all.py                     # CLI: Combined end-to-end pipeline
│
├── summarizer/                    # Core note processing Python package
│   ├── __init__.py                # Package exports
│   ├── api.py                     # Universal OpenAI-compatible HTTP client
│   ├── prompts.py                 # Structured system prompt templates (STEM / General / Architecture)
│   ├── processor.py               # Text chunking, sequential API calls, and recursive merging
│   └── io.py                      # Markdown reading and note file persistence
│
├── web/
│   ├── backend/
│   │   ├── server.py              # Flask API server & desktop OS endpoints
│   │   └── tasks.py               # Background task queue & worker thread pool
│   └── frontend/
│       ├── src/
│       │   ├── App.jsx            # Main application UI and route controller
│       │   ├── api.js             # API client and desktop IPC bridge wrappers
│       │   └── components/
│       │       ├── Layout.jsx     # Navigation, settings trigger, and output folder shortcut
│       │       ├── SettingsModal.jsx # Visual configuration modal (LLM, Storage, Whisper)
│       │       └── UploadZone.jsx # Video drag-and-drop upload component
│       ├── dist/                  # Production build output (served by Flask)
│       └── vite.config.js         # Vite configuration
│
├── desktop/                       # Electron desktop client
│   ├── main.cjs                   # Electron main process (window lifecycle, IPC, dialogs)
│   ├── preload.cjs                # Context bridge exposing window.electronAPI
│   ├── pythonManager.cjs          # Cross-platform Python & Flask backend lifecycle manager
│   ├── build.cjs                  # Standalone portable .exe folder builder
│   ├── package.json               # Desktop dependencies and NSIS packaging definition
│   └── icons/                     # Application icons (icon.png)
│
├── release/                       # [Git-Ignored] Built desktop distribution packages
│   ├── vedioNoter-Setup-1.0.0.exe # Windows native NSIS Setup installer
│   ├── vedioNoter-win-x64/        # Unpacked portable executable folder
│   └── vedioNoter-1.0.0-mac.dmg   # macOS native disk image
│
├── tools/                         # [Git-Ignored] Local precompiled binaries and models
│   ├── whisper-cpp/Release/       # whisper-cli binary
│   ├── ffmpeg/                    # ffmpeg static build
│   └── ggml-*.bin                 # Whisper model weights (ggml-small.bin, etc.)
│
├── vedio/                         # [Default/Configurable] User input video files (.mp4)
├── output/                        # [Default/Configurable] Transcripts and notes
└── audio_temp/                    # [Default/Configurable] Intermediate extracted audio files (WAV)
```

---

## 4. Architectural Rules & Invariants

When modifying or extending this codebase, you **MUST** uphold the following invariants:

### 4.1 Security & Secret Management
* **NEVER hardcode API keys**: All API keys must be loaded via `config.py` (which falls back to the `LLM_API_KEY` or `DEEPSEEK_API_KEY` environment variables).
* **Protect `config.yaml`**: `config.yaml` is strictly ignored by `.gitignore`. Never track or commit it. When introducing new configuration fields, add them to `config.example.yaml` with blank or dummy default values.
* **GitHub Secret Scanning**: GitHub push protection is active on this repository. Never write strings matching active secret patterns (such as `sk-[a-zA-Z0-9]{32,}`) into tracked files.

### 4.2 Portable & Lightweight Python Philosophy
* **Standard Library First**: `transcribe.py` must only use the Python standard library. Avoid adding heavy dependencies like PyTorch, HuggingFace transformers, or CUDA bindings.
* **HTTP via `requests`**: In `summarizer/api.py`, use standard HTTP requests adhering to the OpenAI-compatible `/chat/completions` specification, ensuring maximum portability across varied Python distributions (such as MinGW / UCRT64).

### 4.3 Universal LLM & Model Discovery
* **OpenAI-Compatible Standardization**: Support any endpoint implementing standard `/chat/completions` and `/models` (or `/v1/models`).
* **Clean Payloads**: Only send model-specific non-standard fields (like `thinking`) when targeting reasoning models (e.g. `deepseek-reasoner` or `r1`), ensuring generic OpenAI endpoints do not reject requests with HTTP 400.

### 4.4 Configurable Storage Architecture
* **No Hardcoded Directories**: Always resolve directories through `get_video_dir()`, `get_transcript_dir()`, `get_note_dir()`, and `get_audio_temp_dir()` from `config.py`. Never assume `vedio/` or `output/` exist statically.

### 4.5 Desktop IPC & Process Isolation
* **Secure Electron Context Bridge**: In `desktop/main.cjs` and `desktop/preload.cjs`, never expose Node.js built-ins (`child_process`, `fs`, `path`) directly to the renderer. Always expose explicit, parameterized methods via `contextBridge.exposeInMainWorld("electronAPI", ...)`.
* **Zero Orphan Processes**: When the desktop application terminates, `desktop/pythonManager.cjs` must ensure all spawned Python and Whisper processes are cleanly killed.

### 4.6 Note Quality & Prompt Principles
* **STEM Notes Must Not Skip Derivations**: When generating academic/STEM notes (`STEM_SYSTEM_PROMPT`), never abbreviate mathematical formulas or dismiss derivation steps with generic summaries. Keep all intermediate steps, intuitive analogies, and full concrete examples intact.
* **ASCII Diagrams**: Use pure ASCII diagrams and Markdown tables. Do not use Mermaid or PlantUML syntax that requires external renderer engines, ensuring universal readability in any Markdown viewer.

---

## 5. Development & Build Commands

### 5.1 Environment Setup
```bash
# Setup virtual environment and download binaries
bash setup.sh
```

### 5.2 Running CLI Scripts
```bash
# Full pipeline
uv run python run_all.py --language zh

# Transcription only
uv run python transcribe.py --language zh

# Summarization only
uv run python summarize.py --style stem
```

### 5.3 Frontend Development & Build
```bash
# In web/frontend:
npm install
npm run dev      # Local Vite dev server (http://localhost:5173)
npm run build    # Compile to web/frontend/dist for production
```

### 5.4 Desktop Client Development & Packaging
```bash
# In desktop/:
npm install
npm start                # Run Electron desktop app in development

# From project root:
npm run build:installer      # Build native Windows NSIS Setup (release/vedioNoter-Setup-1.0.0.exe)
npm run build:installer:mac  # Build macOS DMG & ZIP
npm run build:exe            # Assemble portable executable folder (release/vedioNoter-win-x64)
```

---

## 6. Git Hygiene & Commit Conventions

* **Format**: Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
* **Ignore Patterns**: Ensure `node_modules/`, `release/`, `dist/`, `tools/`, `vedio/`, `output/`, and `audio_temp/` remain completely untracked. Both the root `.gitignore` and `desktop/.gitignore` enforce these rules.
* **Line Endings**: Maintain consistent LF/CRLF handling; avoid accidental mass newline conversions across Windows and Unix environments.

---

## 7. Troubleshooting & Common Pitfalls

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `whisper-cli: command not found` | Tools directory not downloaded | Run `bash setup.sh` or configure path in `config.yaml` |
| LLM API Error 401 / 402 | Missing or expired API key | Configure key via Desktop UI Settings panel or `export LLM_API_KEY="..."` |
| Electron fails to launch Python | Python executable not in path | `pythonManager.cjs` checks `.venv/Scripts/python.exe`, `.venv/bin/python`, and system `python` |
| Frontend changes not visible in desktop | Frontend static bundle not updated | Run `npm run build:frontend` then restart the desktop app |
