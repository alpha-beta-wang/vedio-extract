const fs = require("fs");
const path = require("path");

const DESKTOP_DIR = __dirname;
const ROOT_DIR = path.resolve(__dirname, "..");
const ELECTRON_DIST = path.join(DESKTOP_DIR, "node_modules", "electron", "dist");
const OUT_DIR = path.join(ROOT_DIR, "release", "vedioNoter-win-x64");
const APP_DIR = path.join(OUT_DIR, "resources", "app");

console.log("=== 开始构建 Windows 原生独立可执行文件 (vedioNoter.exe) ===");

if (!fs.existsSync(ELECTRON_DIST)) {
  console.error("[X] 未找到 Electron 运行时: " + ELECTRON_DIST);
  process.exit(1);
}

// 1. 创建输出目录
fs.mkdirSync(APP_DIR, { recursive: true });

// 2. 复制 Electron 运行时
console.log("[1/3] 复制 Electron 引擎二进制文件...");
fs.cpSync(ELECTRON_DIST, OUT_DIR, { recursive: true });

// 3. 将 electron.exe 重命名为 vedioNoter.exe
const origExe = path.join(OUT_DIR, "electron.exe");
const targetExe = path.join(OUT_DIR, "vedioNoter.exe");
if (fs.existsSync(origExe)) {
  if (fs.existsSync(targetExe)) fs.unlinkSync(targetExe);
  fs.renameSync(origExe, targetExe);
  console.log("[2/3] 已生成原生可执行文件: " + targetExe);
}

// 4. 将应用脚本放置到 resources/app
console.log("[3/4] 组装应用代码资源 (resources/app)...");
const filesToCopy = ["main.cjs", "preload.cjs", "pythonManager.cjs", "startup.html", "package.json"];
for (const file of filesToCopy) {
  const src = path.join(DESKTOP_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(APP_DIR, file));
  }
}
if (fs.existsSync(path.join(DESKTOP_DIR, "icons"))) {
  fs.cpSync(path.join(DESKTOP_DIR, "icons"), path.join(APP_DIR, "icons"), { recursive: true });
}

// 5. 组装 Python 后端、配置与前端静态产物 (resources/)
console.log("[4/4] 组装后端与静态资源 (resources/)...");
const extraResources = [
  { from: path.join(ROOT_DIR, "web", "frontend", "dist"), to: path.join(OUT_DIR, "resources", "web", "frontend", "dist") },
  { from: path.join(ROOT_DIR, "web", "backend"), to: path.join(OUT_DIR, "resources", "web", "backend") },
  { from: path.join(ROOT_DIR, "summarizer"), to: path.join(OUT_DIR, "resources", "summarizer") },
  { from: path.join(ROOT_DIR, "config.py"), to: path.join(OUT_DIR, "resources", "config.py") },
  { from: path.join(ROOT_DIR, "config.example.yaml"), to: path.join(OUT_DIR, "resources", "config.example.yaml") },
  { from: path.join(ROOT_DIR, "transcribe.py"), to: path.join(OUT_DIR, "resources", "transcribe.py") },
  { from: path.join(ROOT_DIR, "summarize.py"), to: path.join(OUT_DIR, "resources", "summarize.py") },
  { from: path.join(ROOT_DIR, "run_all.py"), to: path.join(OUT_DIR, "resources", "run_all.py") },
  { from: path.join(ROOT_DIR, "requirements.txt"), to: path.join(OUT_DIR, "resources", "requirements.txt") },
];

for (const item of extraResources) {
  if (fs.existsSync(item.from)) {
    fs.mkdirSync(path.dirname(item.to), { recursive: true });
    if (fs.statSync(item.from).isDirectory()) {
      fs.cpSync(item.from, item.to, { recursive: true });
    } else {
      fs.copyFileSync(item.from, item.to);
    }
  }
}

console.log("\n======================================================");
console.log("  构建成功！");
console.log("  Windows 原生独立程序已生成: " + targetExe);
console.log("======================================================\n");
