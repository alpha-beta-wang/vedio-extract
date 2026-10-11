"""Flask 后端 —— 视频上传、转码、笔记整理的 Web API，支持通用 LLM 与动态存储目录。"""

import json
import os
import re
import shutil
import sys
from pathlib import Path

# 将项目根目录加入 sys.path
PROJECT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_DIR))

import requests
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from config import (
    get_api_key,
    get_server_host,
    get_server_port,
    get_raw_config,
    save_config,
    get_video_dir,
    get_audio_temp_dir,
    get_transcript_dir,
    get_note_dir,
    get_llm_config,
)
from web.backend.tasks import (
    get_task,
    start_summarization,
    start_transcription,
    tasks as task_store,
)

app = Flask(__name__, static_folder=None)
CORS(app)


# ============================================================
# 视频管理
# ============================================================

@app.route("/api/videos", methods=["GET"])
def list_videos():
    """列出所有视频及其状态。"""
    video_dir = get_video_dir()
    transcript_dir = get_transcript_dir()
    note_dir = get_note_dir()

    videos = []
    for f in sorted(video_dir.glob("*.mp4")):
        if f.name.startswith("."):
            continue
        md = transcript_dir / f"{f.stem}.md"
        note = note_dir / f"{f.stem}.note.md"
        videos.append({
            "name": f.name,
            "size_mb": round(f.stat().st_size / 1024 / 1024, 1),
            "has_transcript": md.exists(),
            "has_note": note.exists(),
        })
    return jsonify(videos)


@app.route("/api/upload", methods=["POST"])
def upload_video():
    """上传视频文件到当前配置的视频目录。"""
    if "file" not in request.files:
        return jsonify({"error": "未选择文件"}), 400

    file = request.files["file"]
    if not file.filename.endswith(".mp4"):
        return jsonify({"error": "仅支持 .mp4 文件"}), 400

    video_dir = get_video_dir()
    path = video_dir / file.filename
    file.save(str(path))
    return jsonify({
        "name": file.filename,
        "size_mb": round(path.stat().st_size / 1024 / 1024, 1),
    })


@app.route("/api/videos/<name>", methods=["DELETE"])
def delete_video(name: str):
    """删除视频及相关转录、笔记、音频缓存文件。"""
    stem = Path(name).stem
    dirs_to_check = [
        (get_video_dir(), [".mp4", ".mov", ".mkv", ".flv", ".webm", ".avi"]),
        (get_transcript_dir(), [".md"]),
        (get_note_dir(), [".note.md"]),
        (get_audio_temp_dir(), [".wav"]),
    ]

    for directory, exts in dirs_to_check:
        for ext in exts:
            p = directory / f"{stem}{ext}"
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass
    return jsonify({"ok": True})


# ============================================================
# 转码 & 笔记
# ============================================================

@app.route("/api/transcribe/<name>", methods=["POST"])
def start_transcribe(name: str):
    """启动语音转录任务。"""
    video_dir = get_video_dir()
    video_path = video_dir / name
    if not video_path.exists():
        return jsonify({"error": f"视频不存在于目录: {video_dir}"}), 404

    data = request.get_json(silent=True) or {}
    model = data.get("model", "small")
    lang = data.get("language") or None
    language = lang if lang and lang != "auto" else None
    extract_frames = bool(data.get("extract_frames", False))

    task_id = start_transcription(
        video_path, PROJECT_DIR, model, language, extract_frames
    )
    return jsonify({"task_id": task_id})


@app.route("/api/summarize/<name>", methods=["POST"])
def start_summarize(name: str):
    """启动通用 LLM 笔记整理任务。"""
    stem = Path(name).stem
    transcript_dir = get_transcript_dir()
    md_path = transcript_dir / f"{stem}.md"
    if not md_path.exists():
        # 兼容原 output 目录搜索
        alt_path = PROJECT_DIR / "output" / f"{stem}.md"
        if alt_path.exists():
            md_path = alt_path
        else:
            return jsonify({"error": f"转录文件不存在，请先执行转录 (查找路径: {md_path})"}), 404

    data = request.get_json(silent=True) or {}
    api_key = data.get("api_key") or get_api_key()
    style = data.get("style", "general")

    task_id = start_summarization(md_path, PROJECT_DIR, api_key, style=style)
    return jsonify({"task_id": task_id})


@app.route("/api/tasks/<task_id>", methods=["GET"])
def poll_task(task_id: str):
    """轮询任务状态。"""
    task = get_task(task_id)
    if not task:
        return jsonify({"error": "任务不存在"}), 404
    return jsonify(task)


@app.route("/api/transcript/<name>", methods=["GET"])
def get_transcript(name: str):
    """获取转录文本内容。"""
    stem = Path(name).stem
    transcript_dir = get_transcript_dir()
    md_path = transcript_dir / f"{stem}.md"
    if not md_path.exists():
        alt = PROJECT_DIR / "output" / f"{stem}.md"
        if alt.exists():
            md_path = alt
        else:
            return jsonify({"error": "转录文件不存在"}), 404

    raw = md_path.read_text(encoding="utf-8")
    full_text = raw
    ts_section = ""

    m = re.search(r"(##\s*带时间戳的转录.*)", raw, re.DOTALL)
    if m:
        ts_section = m.group(1)
        full_text = raw[: m.start()].strip()

    return jsonify({"full_text": full_text, "timestamped": ts_section, "raw": raw})


@app.route("/api/note/<name>", methods=["GET"])
def get_note(name: str):
    """获取整理后的学习笔记内容。"""
    stem = Path(name).stem
    note_dir = get_note_dir()
    note_path = note_dir / f"{stem}.note.md"
    if not note_path.exists():
        alt = PROJECT_DIR / "output" / f"{stem}.note.md"
        if alt.exists():
            note_path = alt
        else:
            return jsonify({"error": "笔记不存在"}), 404

    raw = note_path.read_text(encoding="utf-8")
    return jsonify({"content": raw})


# ============================================================
# 通用 LLM 模型列表获取接口 (类似 CC Switch / OpenAI /models)
# ============================================================

@app.route("/api/llm/models", methods=["POST"])
def fetch_llm_models():
    """获取通用 OpenAI 兼容服务商的模型列表。"""
    data = request.get_json(silent=True) or {}
    llm_cfg = get_llm_config()
    base_url = (data.get("base_url") or llm_cfg["base_url"]).strip().rstrip("/")
    api_key = data.get("api_key") or llm_cfg["api_key"]

    if not base_url:
        return jsonify({"ok": False, "error": "缺少 API Base URL"}), 400

    clean_url = re.sub(r"/chat/completions/?$", "", base_url)
    clean_url = re.sub(r"/models/?$", "", clean_url)

    # 构造探测列表
    candidates = []
    if clean_url.endswith("/v1"):
        candidates.append(f"{clean_url}/models")
    else:
        candidates.append(f"{clean_url}/models")
        candidates.append(f"{clean_url}/v1/models")

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    models = []
    last_err = ""

    for url in candidates:
        try:
            resp = requests.get(url, headers=headers, timeout=12)
            if resp.status_code == 200:
                res_data = resp.json()
                raw_list = []
                if "data" in res_data and isinstance(res_data["data"], list):
                    raw_list = res_data["data"]
                elif "models" in res_data and isinstance(res_data["models"], list):
                    raw_list = res_data["models"]

                for item in raw_list:
                    if isinstance(item, dict):
                        m_id = item.get("id") or item.get("name")
                        if m_id:
                            models.append(str(m_id))
                    elif isinstance(item, str):
                        models.append(item)

                if models:
                    break
            else:
                last_err = f"HTTP {resp.status_code}: {resp.text[:100]}"
        except Exception as e:
            last_err = str(e)

    if models:
        unique_models = sorted(list(set(models)))
        return jsonify({"ok": True, "models": unique_models})
    else:
        return jsonify({
            "ok": False,
            "error": f"无法自动获取模型列表（{last_err or '服务商未提供公开 /models 接口'}），您可以手动输入模型名称。",
        })


# ============================================================
# 桌面专属配置 & 系统集成
# ============================================================

@app.route("/api/config", methods=["GET"])
def get_config():
    """获取当前系统配置。"""
    return jsonify(get_raw_config())


@app.route("/api/config", methods=["POST"])
def update_config():
    """更新配置并写回 config.yaml。"""
    data = request.get_json(silent=True) or {}
    current = get_raw_config()
    for section in ["llm", "deepseek", "storage", "whisper", "keyframe", "server"]:
        if section in data and isinstance(data[section], dict):
            current.setdefault(section, {}).update(data[section])
    save_config(current)
    return jsonify({"ok": True, "config": get_raw_config()})


@app.route("/api/open-folder", methods=["POST"])
def open_folder():
    """跨平台在系统文件管理器中打开指定目录（Win Explorer / macOS Finder）。"""
    import platform
    import subprocess

    data = request.get_json(silent=True) or {}
    target_type = data.get("type", "transcript")
    file_name = data.get("name")
    custom_path = data.get("path")

    if custom_path:
        target = Path(custom_path)
        if not target.is_absolute():
            target = PROJECT_DIR / target
    elif target_type in ("video", "vedio"):
        target = get_video_dir()
    elif target_type == "audio":
        target = get_audio_temp_dir()
    elif target_type == "note":
        target = get_note_dir()
    elif target_type in ("transcript", "output"):
        target = get_transcript_dir()
    else:
        target = PROJECT_DIR

    try:
        target.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    if file_name:
        candidate = target / file_name
        if candidate.exists():
            target = candidate

    try:
        os_name = platform.system()
        if os_name == "Windows":
            if target.is_file():
                subprocess.Popen(["explorer.exe", f"/select,{str(target)}"])
            else:
                subprocess.Popen(["explorer.exe", str(target)])
        elif os_name == "Darwin":  # macOS
            if target.is_file():
                subprocess.Popen(["open", "-R", str(target)])
            else:
                subprocess.Popen(["open", str(target)])
        else:  # Linux
            subprocess.Popen(["xdg-open", str(target.parent if target.is_file() else target)])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/import-file", methods=["POST"])
def import_local_file():
    """桌面端直接导入本地视频文件（复制到当前配置的视频目录）。"""
    data = request.get_json(silent=True) or {}
    file_path = data.get("path")
    if not file_path:
        return jsonify({"error": "缺少文件路径"}), 400

    src = Path(file_path)
    if not src.exists() or not src.is_file():
        return jsonify({"error": "指定的文件不存在"}), 404

    allowed_exts = {".mp4", ".mov", ".mkv", ".flv", ".webm", ".avi"}
    if src.suffix.lower() not in allowed_exts:
        return jsonify({"error": f"不支持的文件格式: {src.suffix}"}), 400

    video_dir = get_video_dir()
    dest = video_dir / src.name
    if not dest.exists():
        shutil.copy2(str(src), str(dest))

    return jsonify({
        "name": dest.name,
        "size_mb": round(dest.stat().st_size / 1024 / 1024, 1),
    })


@app.route("/api/system-info", methods=["GET"])
def system_info():
    """返回操作系统、硬件及底层推理工具状态。"""
    import platform
    whisper_exe = PROJECT_DIR / "tools" / "whisper-cpp" / "Release" / ("whisper-cli.exe" if platform.system() == "Windows" else "whisper-cli")
    ffmpeg_exe = PROJECT_DIR / "tools" / "ffmpeg" / ("ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg")

    return jsonify({
        "app_name": "vedioNoter",
        "os": platform.system(),
        "arch": platform.machine(),
        "cpu_count": os.cpu_count() or 1,
        "whisper_ready": whisper_exe.exists() or bool(shutil.which("whisper-cli")),
        "ffmpeg_ready": ffmpeg_exe.exists() or bool(shutil.which("ffmpeg")),
        "models": [p.stem.replace("ggml-", "") for p in (PROJECT_DIR / "tools").glob("ggml-*.bin")],
    })


# ============================================================
# 静态文件（前端构建产物）
# ============================================================

FRONTEND_DIST = PROJECT_DIR / "web" / "frontend" / "dist"

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path: str):
    """Serve React frontend or fallback to index.html."""
    if not FRONTEND_DIST.exists():
        return jsonify({"message": "前端尚未构建，请运行 cd web/frontend && npm run build"}), 200

    file_path = FRONTEND_DIST / path
    if path and file_path.exists() and file_path.is_file():
        return send_file(str(file_path))

    return send_file(str(FRONTEND_DIST / "index.html"))


def main():
    host = get_server_host()
    port = get_server_port()
    print(f"======================================================")
    print(f"  vedioNoter 服务启动: http://localhost:{port}")
    print(f"  视频目录: {get_video_dir()}")
    print(f"  撰写输出: {get_transcript_dir()}")
    print(f"  笔记输出: {get_note_dir()}")
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host=host, port=port, debug=debug, threaded=True)


if __name__ == "__main__":
    main()
