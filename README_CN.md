# vedioNoter —— 视频转文字与 AI 结构化学习笔记

[English](README.md) | [简体中文](README_CN.md)

**vedioNoter** 将 MP4 视频批量转录为 Markdown 笔记，并通过大模型深度重构为结构清晰的学术学习笔记。支持命令行 CLI、Web 前端界面以及 **Windows & macOS 跨平台原生桌面客户端**。

* **本地离线语音引擎**：基于 [whisper.cpp](https://github.com/ggml-org/whisper.cpp) 进行语音识别（无需联网、无需高端 GPU），配合 ffmpeg 自动进行高质量音频预处理与关键帧切片。
* **通用大模型接入（OpenAI 兼容协议）**：深度支持 DeepSeek、OpenAI、硅基流动 (SiliconFlow)、阿里通义千问 (Qwen/DashScope)、月之暗面 (Moonshot/Kimi)、智谱 GLM、本地 Ollama、OpenRouter 及任意自定义端点；支持 CC Switch 风格预设切换与一键获取在线模型列表。
* **完全自由的存储与输出目录**：视频输入、临时音频缓存、转录文本与 AI 笔记目录均可自由独立指定，并在界面中一键唤起系统资源管理器打开。
* **全平台原生桌面客户端**：提供 Windows 原生 **NSIS 安装向导安装包**（`.exe`）、免安装绿色版、macOS 原生镜像（DMG/ZIP），内置热配置面板。

---

## 🌟 核心功能

### 1. 离线语音转录 (`transcribe.py`)
- 自动提取视频中的音频（转换为 16kHz 16-bit 单声道 WAV）
- 使用 Whisper 模型进行语音识别（支持中文、英文、日语等 99 种语言）
- 生成带精准时间戳的原始转录 Markdown
- **关键帧提取**（可选）：基于 ffmpeg 场景变动检测，将视频关键帧按时间戳自动嵌入笔记对应段落

### 2. AI 笔记深度学术整理 (`summarize.py` / `summarizer/` 包)
- 调用通用大模型，将口语化转录重构为结构化学术笔记
- **三套专业提示词模板**：
  - **理论推导型（STEM）**：保留数学物理推导过程、变量物理意义、几何直觉、ASCII 框图、完整例题，绝不跳步压缩
  - **机制架构型**：系统痛点剖析、拓扑流程图、算法细节、参数调优与避坑指南
  - **通用型**：修正错音别字、提炼核心要点、按逻辑分段分层
- 自动分块处理超长文本并智能多阶段递归合并

### 3. 通用大模型服务商中心 (CC Switch 风格)
- **内置预设切换**：DeepSeek、OpenAI、硅基流动、阿里通义千问、月之暗面 (Kimi)、智谱 GLM、本地 Ollama、OpenRouter、自定义端点
- **在线模型列表动态获取**：点击「获取在线模型列表」按钮实时查询提供商可用的模型，并在界面中一键点选填充
- **模型高级参数**：自由微调 Temperature 采样温度与 Max Tokens 生成上限

### 4. 自由配置存储与输出目录
- **视频输入目录 (`video_dir`)**：扫描与上传 `.mp4` 原始视频的目录
- **语音转录目录 (`transcript_dir`)**：存放 Whisper 转录 Markdown 稿与关键帧图片的目录
- **AI 笔记目录 (`note_dir`)**：存放大模型深度整理生成的最终学术笔记 (`.note.md`) 的目录
- **音频缓存目录 (`audio_temp_dir`)**：临时存放 16kHz WAV 音频的目录
- 桌面客户端支持直接弹出系统文件夹选择对话框，并提供「打开目录」快捷按钮

### 5. 跨平台桌面客户端 (`desktop/` / `release/`)
- **Windows 原生安装程序 (Setup)**：标准 Windows 安装向导 `release/vedioNoter-Setup-1.1.0.exe`，支持自定义安装目录，自动创建桌面和开始菜单图标，注册控制面板卸载程序。
- **免安装绿色便携版**：解压即用目录 `release/vedioNoter-win-x64/vedioNoter.exe`。
- **macOS 原生适配**：一键运行脚本 `./start_desktop.sh` 或使用 `release/vedioNoter-1.1.0-mac.dmg`。
- **可视化设置面板**：无需手动编辑配置文件，在界面中直接切换大模型、调整目录、选择 Whisper 模型。

### 6. Web 前端界面 (`web/`)
- 现代化 React 19 + Tailwind CSS SPA 界面
- 拖拽上传视频、实时进度条轮询追踪
- 双栏对照阅读：转录原文（全文/时间戳视图）与结构化 Markdown 笔记双向对照

---

## 📂 项目架构

```
vedio_extract/
├── start_desktop.bat              # Windows 桌面客户端一键启动
├── start_desktop.sh               # macOS / Linux 桌面客户端一键启动
├── desktop_app.py                 # Python 原生独立窗口备用启动器
├── setup.sh                       # 一键开发环境配置脚本 (uv + tools)
├── run_all.py                     # 全流程命令行工具 (转码 → 整理)
├── transcribe.py                  # 视频转录核心脚本
├── summarize.py                   # 笔记整理脚本
├── summarizer/                    # 笔记整理核心模块
│   ├── __init__.py
│   ├── api.py                     # 通用 OpenAI 兼容协议大模型客户端
│   ├── prompts.py                 # 结构化系统提示词 (通用 / 理工科 / 架构型)
│   ├── processor.py               # 文本长分块切分与合并
│   └── io.py                      # 转录解析与输出读写
├── desktop/                       # Electron 原生桌面客户端源码
│   ├── main.cjs                   # 桌面主进程 (窗口管理、原生文件对话框)
│   ├── preload.cjs                # 安全 IPC 通信桥
│   ├── pythonManager.cjs          # Python 后端生命周期管理
│   ├── build.cjs                  # Windows .exe 打包组装工具
│   └── package.json               # 桌面端依赖与 NSIS 打包配置
├── release/                       # [构建产物] 打包好的桌面客户端
│   ├── vedioNoter-Setup-1.1.0.exe # Windows 原生 NSIS 安装程序
│   ├── vedioNoter-win-x64/        # Windows 解压即用免安装程序
│   └── vedioNoter-1.1.0-mac.dmg   # macOS 原生安装镜像
├── web/                           # Web 应用
│   ├── backend/
│   │   ├── server.py              # Flask API 后端服务器 & 系统路由
│   │   └── tasks.py               # 线程池异步任务控制
│   └── frontend/                  # React 19 SPA 前端
│       ├── src/
│       │   ├── App.jsx            # 核心业务界面
│       │   ├── api.js             # API 与桌面桥通信
│       │   └── components/
│       │       ├── Layout.jsx     # 全局布局 (含导航栏/输出目录)
│       │       ├── SettingsModal.jsx # 可视化配置面板 (LLM/存储/Whisper)
│       │       └── UploadZone.jsx # 拖拽上传
│       └── dist/                  # 前端静态构建资产
├── config.yaml                    # 本地私有配置文件 (API Key、模型参数、存储路径)
├── config.example.yaml            # 配置文件模板
├── config.py                      # 统一配置加载器
├── requirements.txt               # Python 依赖清单
├── README.md                      # 英文说明文档
└── README_CN.md                   # 中文说明文档 (本文件)
```

---

## 🚀 快速上手

### 选项 A：使用原生桌面客户端（最便捷）

#### 1. Windows 原生安装包（推荐普通用户）
直接运行安装向导：
```text
release/vedioNoter-Setup-1.1.0.exe
```
安装向导会自动创建开始菜单与桌面快捷方式。

#### 2. Windows 便携版 / 免安装直接运行
- **双击打开**：`release/vedioNoter-win-x64/vedioNoter.exe`
- **或运行脚本**：[`start_desktop.bat`](start_desktop.bat)

#### 3. macOS
运行一键启动脚本或挂载 DMG 安装包：
```bash
chmod +x start_desktop.sh
./start_desktop.sh
```

#### 4. Python 原生 App 模式（零 Node.js 依赖）
直接启动无边框独立桌面窗口：
```bash
python desktop_app.py
```

---

### 选项 B：命令行流水线 (CLI)

#### 1. 安装环境与依赖
```bash
# 默认下载 small 模型（推荐，466MB，速度与效果平衡）
bash setup.sh

# 或指定其他尺寸模型：
bash setup.sh medium           # 1.5GB，精度更高
bash setup.sh large-v3-turbo   # 1.6GB，最高性能
```

#### 2. 配置大模型 API 密钥
复制模板并修改：
```bash
cp config.example.yaml config.yaml
```
或直接设置环境变量：
```bash
export LLM_API_KEY="sk-your-key-here"
# 或者 export DEEPSEEK_API_KEY="sk-your-key-here"
```

#### 3. 运行处理流程
将 `.mp4` 视频放入配置的视频目录（默认为 `vedio/`），然后运行：

```bash
# 一键运行全流程：转录 + AI 笔记整理
uv run python run_all.py --language zh

# 或分步运行：
# 第 1 步：语音转录
uv run python transcribe.py --language zh

# 第 2 步：整理笔记（可选 general 通用 / stem 理工科）
uv run python summarize.py --style stem
```

---

### 选项 C：Web 浏览器界面

```bash
# 构建前端（若有源码修改）
cd web/frontend && npm install && npm run build && cd ../..

# 启动后端服务
uv run python web/backend/server.py

# 访问浏览器
http://localhost:8765
```

---

## 🛠️ 桌面端打包构建命令

若修改了桌面端或前端代码，可通过以下命令重新打包：

```bash
# 构建 Windows 原生 NSIS 安装向导安装包 (release/vedioNoter-Setup-1.1.0.exe)
npm run build:installer

# 构建 macOS 原生 DMG 安装镜像与 ZIP
npm run build:installer:mac

# 组装 Windows 绿色免安装独立程序文件夹 (release/vedioNoter-win-x64)
npm run build:exe

# 单独重新编译前端资源
npm run build:frontend
```

---

## ⚙️ 配置文件说明 (`config.yaml`)

项目运行配置集中于 `config.yaml`：

```yaml
# 通用大模型配置 (兼容 OpenAI 规范)
llm:
  provider: "deepseek"                # deepseek / openai / siliconflow / qwen / moonshot / zhipu / ollama / openrouter / custom
  base_url: "https://api.deepseek.com"
  api_key: ""                         # 未填写时自动读取 LLM_API_KEY 或 DEEPSEEK_API_KEY 环境变量
  model: "deepseek-chat"
  temperature: 0.3
  max_tokens: 4096

# 自定义存储与输出目录
storage:
  video_dir: "vedio"                  # 视频输入目录
  audio_temp_dir: "audio_temp"        # 临时音频缓存目录
  transcript_dir: "output"            # 语音转录文本输出目录
  note_dir: "output"                  # 最终整理笔记输出目录

# Whisper 语音识别
whisper:
  model: "small"                      # 默认使用的 Whisper 模型尺寸: tiny, base, small, medium, large-v3-turbo

# 关键帧提取
keyframe:
  scene_threshold: 0.3                # 场景变动检测灵敏度 (0.0 - 1.0)
  max_frames: 20                      # 每个视频最多提取关键帧数量

# Web 与桌面后端服务
server:
  host: "0.0.0.0"
  port: 8765
```

---

## 📊 Whisper 离线模型选型参考

| 模型尺寸 | 磁盘占用 | 转录速度 | 识别精度 | 适用场景推荐 |
|:---|:---|:---|:---|:---|
| `tiny` | 78 MB | 极快 | 基础 | 极速草稿、快速功能验证 |
| `base` | 148 MB | 很快 | 良好 | 日常清晰对话 |
| `small` | 466 MB | 中等 | 优秀 | **默认推荐**，课堂网课与讲座的最佳平衡 |
| `medium` | 1.5 GB | 较慢 | 极佳 | 嘈杂背景、专业生僻学科术语 |
| `large-v3-turbo` | 1.6 GB | 中等偏快 | 卓越 | 复杂多语言混杂视频 |
| `large-v3` | 3.1 GB | 慢 | 顶尖 | 对识别精度有极致苛刻要求的场景 |

---

## 📄 开源许可证

本项目采用 [MIT 许可证](LICENSE)。
