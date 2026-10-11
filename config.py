"""从 config.yaml 加载项目配置，支持环境变量覆盖。"""

import os
from pathlib import Path

import yaml

import sys

if getattr(sys, "frozen", False):
    exe_dir = Path(sys.executable).resolve().parent
    if (exe_dir.parent / "config.example.yaml").exists():
        _ROOT = exe_dir.parent
    else:
        _ROOT = exe_dir
else:
    _ROOT = Path(__file__).resolve().parent

_EXAMPLE_PATH = _ROOT / "config.example.yaml"

def _is_dir_writable(directory: Path) -> bool:
    try:
        directory.mkdir(parents=True, exist_ok=True)
        test_file = directory / ".write_test"
        test_file.touch()
        test_file.unlink()
        return True
    except Exception:
        return False

_USER_DATA_DIR = Path.home() / "vedioNoter"

# 如果 _ROOT 可写（例如本地源码运行或便携解压版），优先保存在 _ROOT
# 如果 _ROOT 不可写（例如安装在 C:\Program Files 或只读环境），则保存在用户主目录
if _is_dir_writable(_ROOT) and (_ROOT / "config.yaml").exists():
    _CONFIG_PATH = _ROOT / "config.yaml"
    _DATA_BASE_DIR = _ROOT
elif (_USER_DATA_DIR / "config.yaml").exists():
    _CONFIG_PATH = _USER_DATA_DIR / "config.yaml"
    _DATA_BASE_DIR = _USER_DATA_DIR
elif _is_dir_writable(_ROOT):
    _CONFIG_PATH = _ROOT / "config.yaml"
    _DATA_BASE_DIR = _ROOT
else:
    _USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
    _CONFIG_PATH = _USER_DATA_DIR / "config.yaml"
    _DATA_BASE_DIR = _USER_DATA_DIR

DEFAULT_CONFIG_TEMPLATE = """
server:
  host: 127.0.0.1
  port: 8765

llm:
  provider: deepseek
  api_key: ""
  base_url: https://api.deepseek.com
  model: deepseek-chat
  temperature: 0.3
  max_tokens: 8192
  max_chars_per_chunk: 30000

storage:
  video_dir: vedio
  audio_temp_dir: audio_temp
  transcript_dir: output
  note_dir: output

whisper:
  model: small
  available_models:
    - tiny
    - base
    - small
    - medium
    - large-v3-turbo

keyframe:
  scene_threshold: 0.3
  max_frames: 20
"""

if _CONFIG_PATH.exists():
    with open(_CONFIG_PATH, "r", encoding="utf-8") as _f:
        _cfg = yaml.safe_load(_f) or {}
elif _EXAMPLE_PATH.exists():
    with open(_EXAMPLE_PATH, "r", encoding="utf-8") as _f:
        _cfg = yaml.safe_load(_f) or {}
else:
    _cfg = yaml.safe_load(DEFAULT_CONFIG_TEMPLATE) or {}


# -----------------------------------------------------------
# LLM API (通用 OpenAI 兼容接口，兼容 DeepSeek / OpenAI / 硅基流动等)
# -----------------------------------------------------------

def get_llm_config() -> dict:
    llm = _cfg.get("llm") or _cfg.get("deepseek") or {}
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("DEEPSEEK_API_KEY") or llm.get("api_key") or ""
    return {
        "provider": llm.get("provider", "deepseek"),
        "api_key": api_key,
        "base_url": llm.get("base_url", "https://api.deepseek.com"),
        "model": llm.get("model", "deepseek-chat"),
        "temperature": float(llm.get("temperature", 0.3)),
        "max_tokens": int(llm.get("max_tokens", 8192)),
        "max_chars_per_chunk": int(llm.get("max_chars_per_chunk", 30000)),
    }


def get_api_key() -> str | None:
    """返回 LLM API key。优先环境变量，其次配置文件。"""
    key = get_llm_config()["api_key"]
    return key if key else None


def get_api_base_url() -> str:
    return get_llm_config()["base_url"]


def get_llm_model() -> str:
    return get_llm_config()["model"]


def get_max_chars_per_chunk() -> int:
    return get_llm_config()["max_chars_per_chunk"]


def get_llm_temperature() -> float:
    return get_llm_config()["temperature"]


def get_llm_max_tokens() -> int:
    return get_llm_config()["max_tokens"]


# -----------------------------------------------------------
# 存储与目录配置 (Storage Directories)
# -----------------------------------------------------------

def get_storage_config() -> dict:
    storage = _cfg.get("storage") or {}
    return {
        "video_dir": storage.get("video_dir", "vedio"),
        "audio_temp_dir": storage.get("audio_temp_dir", "audio_temp"),
        "transcript_dir": storage.get("transcript_dir", "output"),
        "note_dir": storage.get("note_dir", "output"),
    }


def _resolve_dir(path_str: str) -> Path:
    p = Path(path_str.strip())
    if not p.is_absolute():
        p = _DATA_BASE_DIR / p
    try:
        p.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return p


def get_video_dir() -> Path:
    """返回视频输入目录。"""
    return _resolve_dir(get_storage_config()["video_dir"])


def get_audio_temp_dir() -> Path:
    """返回提取音频缓存目录。"""
    return _resolve_dir(get_storage_config()["audio_temp_dir"])


def get_transcript_dir() -> Path:
    """返回语音转写/撰写输出目录。"""
    return _resolve_dir(get_storage_config()["transcript_dir"])


def get_note_dir() -> Path:
    """返回结构化笔记输出目录。"""
    return _resolve_dir(get_storage_config()["note_dir"])


# -----------------------------------------------------------
# Whisper
# -----------------------------------------------------------

def get_whisper_model() -> str:
    return _cfg.get("whisper", {}).get("model", "small")


def get_available_whisper_models() -> list[str]:
    return list(_cfg.get("whisper", {}).get("available_models", [
        "tiny", "base", "small", "medium", "large-v3-turbo"
    ]))


# -----------------------------------------------------------
# Keyframe extraction
# -----------------------------------------------------------

def get_scene_threshold() -> float:
    return float(_cfg.get("keyframe", {}).get("scene_threshold", 0.3))


def get_max_keyframes() -> int:
    return int(_cfg.get("keyframe", {}).get("max_frames", 20))


# -----------------------------------------------------------
# Server
# -----------------------------------------------------------

def get_server_host() -> str:
    return os.environ.get("FLASK_HOST") or _cfg.get("server", {}).get("host", "0.0.0.0")


def get_server_port() -> int:
    env_port = os.environ.get("FLASK_PORT")
    if env_port:
        return int(env_port)
    return int(_cfg.get("server", {}).get("port", 8765))


def get_raw_config() -> dict:
    """获取完整配置字典，并附带动态解析的绝对路径。"""
    cfg = dict(_cfg)
    cfg["resolved_storage"] = {
        "video_dir": str(get_video_dir()),
        "audio_temp_dir": str(get_audio_temp_dir()),
        "transcript_dir": str(get_transcript_dir()),
        "note_dir": str(get_note_dir()),
    }
    cfg["llm"] = get_llm_config()
    return cfg


def save_config(new_config: dict) -> None:
    """将新配置写回 config.yaml。"""
    global _cfg
    to_save = dict(new_config)
    to_save.pop("resolved_storage", None)

    # 保持 deepseek 字段同步兼容
    if "llm" in to_save and isinstance(to_save["llm"], dict):
        llm_cfg = to_save["llm"]
        to_save["deepseek"] = {
            "api_key": llm_cfg.get("api_key", ""),
            "base_url": llm_cfg.get("base_url", "https://api.deepseek.com"),
            "model": llm_cfg.get("model", "deepseek-chat"),
            "max_chars_per_chunk": llm_cfg.get("max_chars_per_chunk", 30000),
        }

    _CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_CONFIG_PATH, "w", encoding="utf-8") as _f:
        yaml.safe_dump(to_save, _f, allow_unicode=True, sort_keys=False)
    _cfg = to_save
