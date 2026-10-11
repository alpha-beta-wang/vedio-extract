# vedioNoter v1.1.0-beta

**vedioNoter** transforms MP4 videos into high-precision, LaTeX-enabled academic study notes using local speech recognition and universal LLM models.

## Highlights in v1.1.0-beta

- **Global Rebranding**: Rebranded to **vedioNoter** across desktop apps, window titles, CLI scripts, and web UI.
- **Universal LLM Integration**: Full OpenAI-compatible API support. Connect to DeepSeek, OpenAI, SiliconFlow, Alibaba Qwen, Moonshot/Kimi, Zhipu GLM, Ollama, OpenRouter, or custom endpoints.
- **Provider Hub & Live Model Discovery**: CC Switch-style presets with a single-click "Fetch Models List" to probe live available models from your provider.
- **Fully Configurable Storage Directories**: Freely configure input video, temporary audio, transcription Markdown, and study note directories. Native OS directory picker and one-click folder exploration supported.
- **Cross-Platform Native Desktop Packages**:
  - **Windows**: Native NSIS Setup wizard (`vedioNoter-Setup-1.1.0.exe`).
  - **macOS**: Native Apple Disk Image (`vedioNoter-1.1.0-mac.dmg`) and standalone archive (`vedioNoter-1.1.0-mac.zip`).
- **Enhanced Desktop Launcher**: Bundled complete backend runtime assets and frontend distribution directly into installer packages; fixed startup hangs and elevated CPU usage; included native multi-resolution application icons and interactive Python environment diagnostics.
- **Offline Speech-to-Text**: Powered by `whisper.cpp` (CPU-friendly, zero GPU or cloud requirement) with optional `ffmpeg` scene detection keyframe extraction.

