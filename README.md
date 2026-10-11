# vedioNoter —— Video Speech Transcription & Academic Note Generator

[English](README.md) | [简体中文](README_CN.md)

**vedioNoter** batch-transcribes MP4 videos into high-precision Markdown documents, and transforms raw transcripts into comprehensive, structured academic study notes using Large Language Models. Supports CLI workflow, Web interface, and **native cross-platform desktop applications for Windows & macOS**.

* **Local Offline Engine**: Powered by [whisper.cpp](https://github.com/ggml-org/whisper.cpp) for fast, offline speech recognition (no GPU or internet required), coupled with `ffmpeg` for automatic audio extraction and normalization.
* **Universal LLM Integration (OpenAI-Compatible)**: Supports DeepSeek, OpenAI, SiliconFlow, Alibaba Qwen/DashScope, Moonshot/Kimi, Zhipu GLM, Ollama (local), OpenRouter, and custom endpoints, featuring live model discovery and preset switching.
* **Customizable Storage & Output Directories**: Configure video input, audio temp cache, transcript text, and study note directories independently, with one-click folder exploration.
* **Native Desktop Client**: Includes a standard Windows **NSIS Setup Installer** (`.exe`), portable unpacked folder, and macOS application (DMG/ZIP), with in-app settings management.

---

## 🌟 Key Features

### 1. High-Precision Speech Transcription (`transcribe.py`)
- Automatically extracts 16kHz 16-bit mono WAV audio from MP4 videos.
- Transcribes speech using Whisper models supporting 99+ languages (Chinese, English, Japanese, etc.).
- Generates raw transcripts with accurate segment timestamps.
- **Optional Keyframe Extraction**: Utilizes `ffmpeg` scene detection to extract representative frames and embed them directly into the Markdown notes.

### 2. Deep Academic Note Synthesis (`summarize.py` / `summarizer/` package)
- Formats unstructured transcripts into coherent academic notes using universal LLMs.
- **Multiple Note Styles**:
  - **STEM / Theoretical Derivations**: Preserves mathematical and physical derivations step-by-step, intuitive physical analogies, LaTeX formulas, and ASCII diagrams without skipping steps or omitting examples.
  - **Mechanisms & Architecture**: Focuses on system bottlenecks, topological flowcharts, algorithms, and practical debugging guides.
  - **General**: Fixes homophone typos, cleans spoken redundancies, and organizes content into hierarchical sections with key summaries.
- Handles ultra-long video transcripts via chunking and intelligent hierarchical merging.

### 3. Universal LLM Provider Hub (CC Switch Style)
- **Built-in Presets**: DeepSeek, OpenAI, SiliconFlow, Alibaba Qwen, Moonshot/Kimi, Zhipu GLM, Ollama (Local), OpenRouter, and Custom.
- **Live Model List Fetching**: Click "获取在线模型列表" (Fetch Models) to query live `/v1/models` from your provider endpoint and select from the dropdown.
- **Customizable Parameters**: Adjust temperature, max token limits, and custom base URLs.

### 4. Fully Configurable Storage Directories
- **Video Input Directory (`video_dir`)**: Where `.mp4` source videos are scanned and uploaded.
- **Transcript Directory (`transcript_dir`)**: Where Whisper transcripts and extracted keyframe images are stored.
- **Note Directory (`note_dir`)**: Where AI-generated study notes (`.note.md`) are saved.
- **Audio Temp Directory (`audio_temp_dir`)**: Where intermediate 16kHz audio caches are stored.
- All directories can be selected via native OS file dialogs and opened directly in Explorer/Finder.

### 5. Cross-Platform Desktop Client (`desktop/` / `release/`)
- **Windows Native Setup Installer**: Standard installer (`release/vedioNoter-Setup-1.1.0.exe`) with customizable install directory, Start Menu and Desktop shortcuts, and Control Panel uninstaller registration.
- **Windows Portable Edition**: Pre-assembled portable executable at `release/vedioNoter-win-x64/vedioNoter.exe`.
- **macOS Native Integration**: Run via `./start_desktop.sh` or install `vedioNoter-1.1.0-mac.dmg`.
- **GUI Settings Modal**: Visually manage API keys, LLM providers, model selection, Whisper models, and storage folders.

### 6. Interactive Web Interface (`web/`)
- Built with React 19 and Tailwind CSS.
- Drag-and-drop video upload with real-time task progress tracking.
- Dual-pane view: read raw transcripts (with timestamp view) side-by-side with rendered Markdown notes.

---

## 📂 Project Architecture

```
vedio_extract/
├── start_desktop.bat              # Windows desktop client one-click launcher
├── start_desktop.sh               # macOS / Linux desktop client one-click launcher
├── desktop_app.py                 # Standalone Python App-Mode fallback launcher
├── setup.sh                       # One-click environment installer (uv + binaries)
├── run_all.py                     # Full end-to-end CLI pipeline (transcribe -> summarize)
├── transcribe.py                  # Video transcription CLI script
├── summarize.py                   # Note summarization CLI script
├── summarizer/                    # Note summarization Python package
│   ├── __init__.py
│   ├── api.py                     # Universal OpenAI-compatible LLM client
│   ├── prompts.py                 # Structured system prompts (General / STEM / Architecture)
│   ├── processor.py               # Text chunking, API orchestration, and merging
│   └── io.py                      # Markdown reading and note writing
├── desktop/                       # Electron desktop client source code
│   ├── main.cjs                   # Main process (window management, native dialogs)
│   ├── preload.cjs                # Context bridge IPC
│   ├── pythonManager.cjs          # Python backend lifecycle manager
│   ├── build.cjs                  # Windows standalone .exe packager
│   └── package.json               # Desktop dependencies and packaging config
├── release/                       # [Build Artifacts] Packaged desktop client
│   ├── vedioNoter-Setup-1.1.0.exe # Windows native NSIS Setup installer
│   ├── vedioNoter-win-x64/        # Unpacked portable executable folder
│   └── vedioNoter-1.1.0-mac.dmg   # macOS native disk image installer
├── web/                           # Web application
│   ├── backend/
│   │   ├── server.py              # Flask API server & system endpoints
│   │   └── tasks.py               # Thread pool asynchronous task runner
│   └── frontend/                  # React 19 SPA frontend
│       ├── src/
│       │   ├── App.jsx            # Main application UI
│       │   ├── api.js             # API client & desktop bridge calls
│       │   └── components/
│       │       ├── Layout.jsx     # Header navigation & folder shortcut
│       │       ├── SettingsModal.jsx # Visual configuration modal (LLM, Storage, Whisper)
│       │       └── UploadZone.jsx # Drag-and-drop upload component
│       └── dist/                  # Static frontend build artifacts
├── config.yaml                    # Local configuration file (API keys, models, storage)
├── config.example.yaml            # Configuration template
├── config.py                      # Centralized configuration loader
├── requirements.txt               # Python package dependencies
├── README.md                      # English documentation (This file)
└── README_CN.md                   # Chinese documentation
```

---

## 🚀 Quick Start

### Option A: Native Desktop App (Recommended)

#### 1. Windows Native Installer
Download or run the setup installer:
```text
release/vedioNoter-Setup-1.1.0.exe
```
Follow the installation wizard to choose the destination directory. The installer will automatically create shortcuts and register an uninstaller.

#### 2. Windows Portable / Direct Launch
- **Double-click**: `release/vedioNoter-win-x64/vedioNoter.exe`
- **Or run script**: [`start_desktop.bat`](start_desktop.bat)

#### 3. macOS
Run via script or open the DMG installer:
```bash
chmod +x start_desktop.sh
./start_desktop.sh
```

#### 4. Standalone Python App Mode
Launch the native window directly via Python:
```bash
python desktop_app.py
```

---

### Option B: Command Line Interface (CLI)

#### 1. Setup Environment
```bash
# Using the default 'small' model (recommended, 466MB, balanced speed & accuracy)
bash setup.sh

# Or specify a different model size:
bash setup.sh medium           # 1.5GB, higher accuracy
bash setup.sh large-v3-turbo   # 1.6GB, best performance
```

#### 2. Set LLM API Key & Model
Copy the configuration template and edit your preferences:
```bash
cp config.example.yaml config.yaml
```
Or set environment variables:
```bash
export LLM_API_KEY="sk-your-key-here"
# or export DEEPSEEK_API_KEY="sk-your-key-here"
```

#### 3. Run Pipeline
Place your `.mp4` video files into your configured video directory (`vedio/` by default), then run:

```bash
# Run full pipeline: transcription + note generation
uv run python run_all.py --language zh

# Or step-by-step:
# Step 1: Transcribe video
uv run python transcribe.py --language zh

# Step 2: Generate notes (choose style: general / stem)
uv run python summarize.py --style stem
```

Output files:
- `<transcript_dir>/<video_name>.md`: Raw speech transcript with timestamps.
- `<note_dir>/<video_name>.note.md`: Structured AI study note.

---

### Option C: Web Interface

```bash
# Build frontend (if modified)
cd web/frontend && npm install && npm run build && cd ../..

# Start backend server
uv run python web/backend/server.py

# Open your browser at
http://localhost:8765
```

---

## 🛠️ Desktop Packaging Commands

To recompile or package the desktop client after modifying code:

```bash
# Package the native Windows NSIS Setup installer (release/vedioNoter-Setup-1.1.0.exe)
npm run build:installer

# Package macOS DMG & ZIP
npm run build:installer:mac

# Assemble the portable unpacked binary folder (release/vedioNoter-win-x64)
npm run build:exe

# Rebuild frontend assets
npm run build:frontend
```

---

## ⚙️ Configuration (`config.yaml`)

All runtime options are centralized in `config.yaml`:

```yaml
# Universal LLM Provider Configuration
llm:
  provider: "deepseek"                # deepseek / openai / siliconflow / qwen / moonshot / zhipu / ollama / openrouter / custom
  base_url: "https://api.deepseek.com"
  api_key: ""                         # Falls back to LLM_API_KEY or DEEPSEEK_API_KEY
  model: "deepseek-chat"
  temperature: 0.3
  max_tokens: 4096

# Customizable Storage & Output Directories
storage:
  video_dir: "vedio"                  # Input video folder
  audio_temp_dir: "audio_temp"        # Intermediate WAV audio cache
  transcript_dir: "output"            # Speech transcript output folder
  note_dir: "output"                  # Academic notes output folder

# Whisper Speech-to-Text
whisper:
  model: "small"                      # Default Whisper model: tiny, base, small, medium, large-v3-turbo

# Keyframe Extraction
keyframe:
  scene_threshold: 0.3                # Scene detection sensitivity (0.0 - 1.0)
  max_frames: 20                      # Maximum extracted keyframes per video

# Web & Desktop Backend Server
server:
  host: "0.0.0.0"
  port: 8765
```

---

## 📊 Whisper Model Comparison

| Model | Disk Size | Transcription Speed | Accuracy | Recommended Use Case |
|:---|:---|:---|:---|:---|
| `tiny` | 78 MB | Extremely Fast | Basic | Quick drafts, short testing clips |
| `base` | 148 MB | Very Fast | Good | Casual conversations |
| `small` | 466 MB | Moderate | Great | **Default Choice**, optimal balance for lectures |
| `medium` | 1.5 GB | Slower | Excellent | Noisy audio, specialized domain vocabulary |
| `large-v3-turbo` | 1.6 GB | Moderate | Superior | Complex multilingual videos |
| `large-v3` | 3.1 GB | Slow | Maximum | Highest fidelity transcription |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
