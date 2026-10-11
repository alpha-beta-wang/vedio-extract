# vedioNoter v1.1.1-beta

**vedioNoter** transforms video files into high-precision, LaTeX-enabled academic study notes using local speech recognition and universal LLM models.

## What's New in v1.1.1-beta

### 🚀 Standalone Precompiled Backend Engine
- **Zero Python Prerequisites**: The Python backend server is now compiled into a standalone native binary (`vedionoter-engine`) using PyInstaller and packaged directly inside the desktop distribution.
- **Out-of-the-Box Execution**: Users no longer need Python, `pip`, or virtual environments installed on their machines. Missing packages like `flask-cors` are fully resolved with built-in native handlers.
- **Faster Startup & Lower CPU Usage**: Instantaneous process initialization with automated background lifecycle management.

### 🎨 Redesigned Flagship 3D Glassmorphism Icon
- **Modern Aesthetic**: Completely redesigned 3D glassmorphism application icon featuring an academic notebook, glowing frosted play button, stylus, and AI knowledge sparks.
- **Proper System Shortcut Integration**: Full multi-resolution Windows ICO (16x16 up to 256x256) with standard DIB headers, correctly bound to desktop shortcuts, Windows PE executable headers, taskbar, and NSIS installer dialogs.

### 🌐 Universal LLM Provider Hub & Live Discovery
- **OpenAI-Compatible Integration**: Seamlessly connect to DeepSeek, OpenAI, SiliconFlow, Alibaba Qwen, Moonshot/Kimi, Zhipu GLM, Ollama, OpenRouter, or custom self-hosted endpoints.
- **Live Model Discovery**: Single-click "Fetch Models List" dynamically retrieves all available models from your configured provider.

### 📁 Configurable Storage Architecture
- Freely customize storage directories for input videos, temporary audio, transcription Markdown, and generated notes.
- Integrated native OS directory pickers and one-click folder exploration shortcuts.

### 🎙️ 100% Offline Speech-to-Text
- Powered by `whisper.cpp` (CPU-friendly, zero GPU requirement) for fast, private, offline speech recognition with optional scene-detection keyframe extraction.

---

## Downloads & Assets
- **Windows**: `vedioNoter-Setup-1.1.1.exe` (NSIS Setup Installer)
- **macOS**: `vedioNoter-1.1.1-mac.dmg` (Apple Disk Image) & `vedioNoter-1.1.1-mac.zip`
