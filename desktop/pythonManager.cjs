const { spawn, spawnSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

class PythonManager {
  constructor(projectDir, port = 8765) {
    this.projectDir = projectDir;
    this.port = port;
    this.process = null;
    this.isQuitting = false;
    this.lastError = null;
    this.customPythonPath = null;
  }

  setCustomPython(p) {
    if (p && fs.existsSync(p)) {
      this.customPythonPath = p;
      return true;
    }
    return false;
  }

  findPython() {
    if (this.customPythonPath && fs.existsSync(this.customPythonPath)) {
      return this.customPythonPath;
    }

    const isWin = process.platform === "win32";
    if (isWin) {
      // 1. 尝试使用 where.exe 查找系统 PATH 中的真实 python（过滤掉 WindowsApps 虚拟别名）
      try {
        const whereRes = spawnSync("where.exe", ["python.exe"], { encoding: "utf-8", timeout: 2000 });
        if (whereRes.status === 0 && whereRes.stdout) {
          const lines = whereRes.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          for (const line of lines) {
            if (!line.toLowerCase().includes("windowsapps") && fs.existsSync(line)) {
              return line;
            }
          }
        }
      } catch (_) {}

      try {
        const whereRes = spawnSync("where.exe", ["python"], { encoding: "utf-8", timeout: 2000 });
        if (whereRes.status === 0 && whereRes.stdout) {
          const lines = whereRes.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          for (const line of lines) {
            if (!line.toLowerCase().includes("windowsapps") && fs.existsSync(line)) {
              return line;
            }
          }
        }
      } catch (_) {}

      // 2. 检查常见安装路径及虚拟环境
      const userHome = process.env.USERPROFILE || "";
      const localAppData = process.env.LOCALAPPDATA || "";
      const progFiles = process.env.ProgramFiles || "";

      const candidates = [
        path.join(this.projectDir, ".venv", "Scripts", "python.exe"),
        path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
        "D:\\Developer Tools\\MinGW\\ucrt64\\bin\\python.exe",
        "C:\\msys64\\ucrt64\\bin\\python.exe",
        "C:\\msys64\\mingw64\\bin\\python.exe",
        path.join(localAppData, "Programs", "Python", "Python313", "python.exe"),
        path.join(localAppData, "Programs", "Python", "Python312", "python.exe"),
        path.join(localAppData, "Programs", "Python", "Python311", "python.exe"),
        path.join(localAppData, "Programs", "Python", "Python310", "python.exe"),
        path.join(progFiles, "Python313", "python.exe"),
        path.join(progFiles, "Python312", "python.exe"),
        path.join(progFiles, "Python311", "python.exe"),
        path.join(progFiles, "Python310", "python.exe"),
        path.join(userHome, "miniconda3", "python.exe"),
        path.join(userHome, "anaconda3", "python.exe"),
        path.join(userHome, "scoop", "shims", "python.exe"),
      ];

      for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
      }

      for (const cmd of ["python.exe", "python", "py.exe", "py"]) {
        try {
          const res = spawnSync(cmd, ["--version"], { encoding: "utf-8", timeout: 2000 });
          if (res.status === 0) return cmd;
        } catch (_) {}
      }
      return "python";
    } else {
      // macOS / Linux
      try {
        const whichRes = spawnSync("which", ["python3"], { encoding: "utf-8", timeout: 2000 });
        if (whichRes.status === 0 && whichRes.stdout) {
          const p = whichRes.stdout.trim();
          if (fs.existsSync(p)) return p;
        }
      } catch (_) {}

      const candidates = [
        path.join(this.projectDir, ".venv", "bin", "python3"),
        path.join(this.projectDir, ".venv", "bin", "python"),
        "/opt/homebrew/bin/python3",
        "/usr/local/bin/python3",
        "/usr/bin/python3",
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) return p;
      }
      return "python3";
    }
  }

  async checkHealth() {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${this.port}/api/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(350, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async startBackend() {
    const isRunning = await this.checkHealth();
    if (isRunning) {
      console.log(`[PythonManager] 后端服务已在端口 ${this.port} 运行`);
      return { ok: true };
    }

    const pythonPath = this.findPython();
    let serverScript = path.join(this.projectDir, "web", "backend", "server.py");
    if (!fs.existsSync(serverScript) && process.resourcesPath) {
      serverScript = path.join(process.resourcesPath, "web", "backend", "server.py");
    }
    console.log(`[PythonManager] 尝试启动服务: ${pythonPath} "${serverScript}"`);

    if (!fs.existsSync(serverScript)) {
      const err = `未找到后端服务器入口文件: ${serverScript}。\n请确认安装包完整。`;
      console.error(`[PythonManager] ${err}`);
      this.lastError = err;
      return { ok: false, error: err };
    }

    const env = {
      ...process.env,
      PYTHONUNBUFFERED: "1",
      PYTHONIOENCODING: "utf-8",
      FLASK_PORT: String(this.port),
      FLASK_HOST: "127.0.0.1",
    };

    let spawnError = null;
    let stderrOutput = "";

    try {
      this.process = spawn(pythonPath, [serverScript], {
        cwd: this.projectDir,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e) {
      this.lastError = `执行 Python 失败 (${pythonPath}): ${e.message}`;
      return { ok: false, error: this.lastError };
    }

    this.process.on("error", (err) => {
      spawnError = err;
      this.lastError = `Python 启动错误: ${err.message}`;
      console.error("[PythonManager] 进程错误:", err);
    });

    this.process.stdout.on("data", (data) => {
      const line = data.toString().trim();
      if (line) console.log(`[Flask] ${line}`);
    });

    this.process.stderr.on("data", (data) => {
      const line = data.toString().trim();
      stderrOutput += line + "\n";
      if (line) console.log(`[Flask] ${line}`);
    });

    // 轮询检查服务就绪状态 (最大等待 12 秒)
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 400));
      if (spawnError) {
        this.lastError = `未能运行 Python 解释器 (${pythonPath}):\n${spawnError.message}\n请检查系统是否安装了 Python 3.10+。`;
        return { ok: false, error: this.lastError };
      }
      if (this.process && this.process.exitCode !== null) {
        this.lastError = `Python 后端异常退出 (退出码 ${this.process.exitCode}):\n${stderrOutput.trim() || "未捕获到错误输出，请确认已安装 requirements.txt 依赖。"}`;
        return { ok: false, error: this.lastError };
      }
      if (await this.checkHealth()) {
        console.log("[PythonManager] 后端就绪！");
        this.lastError = null;
        return { ok: true };
      }
    }

    this.lastError = `后端服务响应超时 (端口 ${this.port})。\n${stderrOutput.trim() || "未能成功建立连接。"}`;
    return { ok: false, error: this.lastError };
  }

  stopBackend() {
    if (!this.process) return;
    this.isQuitting = true;
    const pid = this.process.pid;
    console.log(`[PythonManager] 正在关闭后端 (PID: ${pid})...`);
    if (process.platform === "win32") {
      try {
        spawn("taskkill", ["/pid", pid.toString(), "/f", "/t"]);
      } catch (e) {}
    } else {
      try {
        process.kill(-pid, "SIGTERM");
      } catch (e) {
        try { this.process.kill("SIGTERM"); } catch (_) {}
      }
    }
    this.process = null;
  }
}

module.exports = PythonManager;
