import { useState, useEffect } from "react";
import { getConfig, updateConfig, getSystemInfo, fetchModels, openFolderPath } from "../api";

const LLM_PRESETS = [
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com", defaultModel: "deepseek-chat" },
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini" },
  { id: "siliconflow", name: "硅基流动", baseUrl: "https://api.siliconflow.cn/v1", defaultModel: "deepseek-ai/DeepSeek-V3" },
  { id: "qwen", name: "阿里通义", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", defaultModel: "qwen-plus" },
  { id: "moonshot", name: "月之暗面", baseUrl: "https://api.moonshot.cn/v1", defaultModel: "moonshot-v1-8k" },
  { id: "zhipu", name: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", defaultModel: "glm-4-flash" },
  { id: "ollama", name: "Ollama 本地", baseUrl: "http://localhost:11434/v1", defaultModel: "deepseek-r1:8b" },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "deepseek/deepseek-chat" },
  { id: "custom", name: "自定义", baseUrl: "", defaultModel: "" }
];

export default function SettingsModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(null);
  const [sysInfo, setSysInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("llm"); // "llm" | "storage" | "whisper"
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Model fetching state
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState([]);
  const [modelFetchMsg, setModelFetchMsg] = useState("");

  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  useEffect(() => {
    if (isOpen) {
      getConfig().then((data) => {
        // Ensure llm and storage structures exist
        const llm = data.llm || {
          provider: "deepseek",
          base_url: data.deepseek?.base_url || "https://api.deepseek.com",
          api_key: data.deepseek?.api_key || "",
          model: data.deepseek?.model || "deepseek-chat",
          temperature: 0.3,
          max_tokens: 4096,
        };
        const storage = data.storage || {
          video_dir: "vedio",
          audio_temp_dir: "audio_temp",
          transcript_dir: "output",
          note_dir: "output",
        };
        setConfig({ ...data, llm, storage });
      }).catch(console.error);

      getSystemInfo().then(setSysInfo).catch(console.error);
      setSavedMsg("");
      setModelFetchMsg("");
      setFetchedModels([]);
    }
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const handlePresetSelect = (preset) => {
    setConfig((prev) => {
      const currentApiKey = prev.llm?.api_key || "";
      return {
        ...prev,
        llm: {
          ...prev.llm,
          provider: preset.id,
          base_url: preset.baseUrl || prev.llm?.base_url || "",
          model: preset.defaultModel || prev.llm?.model || "",
          api_key: currentApiKey,
        },
      };
    });
    setFetchedModels([]);
    setModelFetchMsg("");
  };

  const handleFetchModels = async () => {
    const baseUrl = config.llm?.base_url?.trim();
    const apiKey = config.llm?.api_key?.trim();
    if (!baseUrl) {
      setModelFetchMsg("请先填写 API Base URL");
      return;
    }
    setFetchingModels(true);
    setModelFetchMsg("正在查询模型列表...");
    try {
      const data = await fetchModels(baseUrl, apiKey);
      if (data.models && data.models.length > 0) {
        setFetchedModels(data.models);
        setModelFetchMsg(`成功获取到 ${data.models.length} 个模型`);
      } else {
        setModelFetchMsg("接口返回成功，但未返回模型列表");
      }
    } catch (err) {
      setModelFetchMsg(`获取失败: ${err.message}`);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSelectDir = async (key) => {
    if (window.electronAPI?.selectDirectory) {
      const current = config.storage?.[key] || "";
      const selected = await window.electronAPI.selectDirectory(current);
      if (selected) {
        setConfig((prev) => ({
          ...prev,
          storage: {
            ...prev.storage,
            [key]: selected,
          },
        }));
      }
    }
  };

  const handleOpenDir = async (dirPath) => {
    if (!dirPath) return;
    try {
      if (window.electronAPI?.openPath) {
        await window.electronAPI.openPath(dirPath);
      } else {
        await openFolderPath(dirPath);
      }
    } catch (err) {
      alert("无法打开目录: " + err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg("");
    try {
      // Sync back deepseek keys for full backwards compatibility
      const payload = {
        ...config,
        deepseek: {
          api_key: config.llm?.api_key || "",
          base_url: config.llm?.base_url || "https://api.deepseek.com",
          model: config.llm?.model || "deepseek-chat",
        },
      };
      await updateConfig(payload);
      setSavedMsg("配置已保存并即时生效！");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err) {
      alert("保存失败: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <h3 className="font-semibold text-base text-[var(--text)]">vedioNoter 设置</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[var(--border)] px-6 bg-[var(--bg)]/40 gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("llm")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "llm"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <span>🤖</span> 大模型配置 (LLM)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("storage")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "storage"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <span>📁</span> 存储与输出目录 (Storage)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("whisper")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "whisper"
                ? "border-indigo-500 text-indigo-400 font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <span>🎙️</span> 语音转写与系统 (Whisper)
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs md:text-sm flex-1">
          {/* TAB 1: LLM */}
          {activeTab === "llm" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[var(--text-muted)] mb-1.5 text-xs font-medium">快捷接入预设 (Provider)</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {LLM_PRESETS.map((p) => {
                    const isSelected = config.llm?.provider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetSelect(p)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                          isSelected
                            ? "bg-indigo-600/15 border-indigo-500 text-indigo-400 font-semibold shadow-sm"
                            : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-indigo-500/40 hover:text-[var(--text)]"
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 text-xs">API Key (密钥)</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={config.llm?.api_key || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        llm: { ...config.llm, api_key: e.target.value },
                      })
                    }
                    placeholder="sk-..."
                    className="w-full px-3 py-2 pr-16 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    {showKey ? "隐藏" : "显示"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 text-xs">API Base URL (端点接口地址)</label>
                <input
                  type="text"
                  value={config.llm?.base_url || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      llm: { ...config.llm, base_url: e.target.value },
                    })
                  }
                  placeholder="https://api.deepseek.com / https://api.openai.com/v1"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[var(--text-muted)] text-xs">笔记整理模型 (Model)</label>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <span>{fetchingModels ? "🔄" : "⚡"}</span>
                    {fetchingModels ? "正在获取..." : "获取在线模型列表"}
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={config.llm?.model || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        llm: { ...config.llm, model: e.target.value },
                      })
                    }
                    placeholder="如: deepseek-chat, gpt-4o, qwen-plus"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />

                  {modelFetchMsg && (
                    <div className="text-xs text-[var(--text-muted)] bg-[var(--bg)]/60 px-2.5 py-1.5 rounded border border-[var(--border)]">
                      {modelFetchMsg}
                    </div>
                  )}

                  {fetchedModels.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] space-y-1.5">
                      <div className="text-xs text-[var(--text-muted)] font-medium">点击快速选取在线模型：</div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                        {fetchedModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              setConfig({
                                ...config,
                                llm: { ...config.llm, model: m },
                              })
                            }
                            className={`px-2 py-1 rounded text-xs font-mono transition-colors border ${
                              config.llm?.model === m
                                ? "bg-indigo-600 text-white border-indigo-500"
                                : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)] hover:border-indigo-400"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 text-xs">Temperature (采样温度: 0.0 ~ 1.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={config.llm?.temperature ?? 0.3}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        llm: { ...config.llm, temperature: parseFloat(e.target.value) || 0.3 },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 text-xs">Max Tokens (最大生成长度)</label>
                  <input
                    type="number"
                    step="512"
                    min="1024"
                    max="32768"
                    value={config.llm?.max_tokens ?? 4096}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        llm: { ...config.llm, max_tokens: parseInt(e.target.value, 10) || 4096 },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STORAGE */}
          {activeTab === "storage" && (
            <div className="space-y-4">
              <div className="text-xs text-[var(--text-muted)] mb-2">
                可自由设置视频输入及各类生成物输出目录（支持相对路径或完整绝对路径）。保存后实时生效。
              </div>

              {[
                {
                  key: "video_dir",
                  title: "视频输入目录 (Video Dir)",
                  desc: "用于扫描与拖拽存放原始 .mp4 视频文件的目录",
                },
                {
                  key: "transcript_dir",
                  title: "语音转录文本目录 (Transcript Dir)",
                  desc: "存放 Whisper 语音识别生成的 Markdown 转录稿及关键帧",
                },
                {
                  key: "note_dir",
                  title: "AI 整理笔记目录 (Note Dir)",
                  desc: "存放由大模型深度结构化生成的最终学术学习笔记 (.note.md)",
                },
                {
                  key: "audio_temp_dir",
                  title: "临时音频缓存目录 (Audio Temp)",
                  desc: "存放 FFmpeg 抽取的临时 16kHz WAV 音频文件",
                },
              ].map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[var(--text)] text-xs font-medium">{item.title}</label>
                    <span className="text-[11px] text-[var(--text-muted)]">{item.desc}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.storage?.[item.key] || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          storage: {
                            ...config.storage,
                            [item.key]: e.target.value,
                          },
                        })
                      }
                      placeholder={item.key}
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    />
                    {isElectron && (
                      <button
                        type="button"
                        onClick={() => handleSelectDir(item.key)}
                        className="px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-medium hover:bg-[var(--border)] transition-colors whitespace-nowrap"
                      >
                        选择...
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenDir(config.storage?.[item.key])}
                      className="px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
                    >
                      打开目录
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: WHISPER & SYSTEM */}
          {activeTab === "whisper" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 text-xs">默认 Whisper 离线识别模型</label>
                <select
                  value={config.whisper?.model || "small"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      whisper: { ...config.whisper, model: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-indigo-500 text-xs"
                >
                  {(config.whisper?.available_models || ["tiny", "base", "small", "medium", "large-v3-turbo"]).map((m) => (
                    <option key={m} value={m}>
                      {m} {m === "small" ? "(推荐，平衡速度与精准度)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  模型保存在 tools/ 目录下。若首次使用该尺寸，系统将自动提示加载。
                </p>
              </div>

              {sysInfo && (
                <div className="border-t border-[var(--border)] pt-4">
                  <h4 className="font-medium text-xs tracking-wider uppercase text-indigo-400 mb-2">系统运行环境状态</h4>
                  <div className="p-3.5 rounded-xl bg-[var(--bg)]/70 border border-[var(--border)] text-xs text-[var(--text-muted)] space-y-1.5">
                    <div className="flex justify-between">
                      <span>操作系统架构:</span>
                      <span className="text-[var(--text)] font-medium">{sysInfo.os} ({sysInfo.arch})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CPU 核心计算线程:</span>
                      <span className="text-[var(--text)] font-medium">{sysInfo.cpu_count} 线程</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Whisper 本地离线引擎:</span>
                      <span className={sysInfo.whisper_ready ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                        {sysInfo.whisper_ready ? "✓ whisper.cpp 就绪" : "! whisper-cli 未检测到"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alert feedback */}
          {savedMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium animate-fade-in">
              {savedMsg}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存设置"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
