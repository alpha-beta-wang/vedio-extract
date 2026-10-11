const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const PythonManager = require("./pythonManager.cjs");

function findProjectRoot() {
  let cur = __dirname;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(cur, "vedio")) && fs.existsSync(path.join(cur, "web"))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return path.resolve(__dirname, "..");
}

const PROJECT_DIR = findProjectRoot();
const BACKEND_PORT = 8765;
const pythonManager = new PythonManager(PROJECT_DIR, BACKEND_PORT);

let mainWindow = null;
const isMac = process.platform === "darwin";

function buildMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: "vedioNoter",
            submenu: [
              { role: "about", label: "关于 vedioNoter" },
              { type: "separator" },
              { role: "services", label: "服务" },
              { type: "separator" },
              { role: "hide", label: "隐藏" },
              { role: "hideOthers", label: "隐藏其他" },
              { role: "unhide", label: "全部显示" },
              { type: "separator" },
              { role: "quit", label: "退出 vedioNoter" },
            ],
          },
        ]
      : []),
    {
      label: "文件",
      submenu: [
        {
          label: "导入视频...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            if (mainWindow) {
              const res = await handleOpenVideoDialog();
              if (res && res.length > 0) {
                mainWindow.webContents.send("menu:video-imported", res);
              }
            }
          },
        },
        {
          label: "打开视频目录",
          click: () => {
            shell.openPath(path.join(PROJECT_DIR, "vedio"));
          },
        },
        {
          label: "打开笔记输出目录",
          accelerator: "CmdOrCtrl+Shift+O",
          click: () => {
            shell.openPath(path.join(PROJECT_DIR, "output"));
          },
        },
        { type: "separator" },
        isMac ? { role: "close", label: "关闭窗口" } : { role: "quit", label: "退出" },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤消" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "forceReload", label: "强制重新加载" },
        { role: "toggleDevTools", label: "切换开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "切换全屏" },
      ],
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "访问 GitHub 仓库",
          click: () => {
            shell.openExternal("https://github.com/alpha-beta-wang/vedioNoter");
          },
        },
        {
          label: "使用文档",
          click: () => {
            shell.openPath(path.join(PROJECT_DIR, "README_CN.md"));
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function handleOpenVideoDialog() {
  if (!mainWindow) return [];
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "选择待转录的视频文件",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "视频文件", extensions: ["mp4", "mov", "mkv", "flv", "webm", "avi"] },
      { name: "所有文件", extensions: ["*"] },
    ],
  });

  if (canceled || filePaths.length === 0) return [];

  const vedioDir = path.join(PROJECT_DIR, "vedio");
  if (!fs.existsSync(vedioDir)) fs.mkdirSync(vedioDir, { recursive: true });

  const imported = [];
  for (const src of filePaths) {
    const filename = path.basename(src);
    const dest = path.join(vedioDir, filename);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
    imported.push(filename);
  }
  return imported;
}

function createWindow() {
  const iconPath = path.join(__dirname, "icons", "icon.png");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 640,
    title: "vedioNoter —— 视频转文字与 AI 学习笔记",
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
    show: false,
    backgroundColor: "#0f172a",
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  const appUrl = `http://127.0.0.1:${BACKEND_PORT}`;
  mainWindow.loadURL(appUrl).catch((err) => {
    setTimeout(() => mainWindow && mainWindow.loadURL(appUrl), 1500);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// -----------------------------------------------------------
// IPC 通信处理
// -----------------------------------------------------------

ipcMain.handle("dialog:open-video", async () => {
  return await handleOpenVideoDialog();
});

ipcMain.handle("dialog:select-directory", async (_, defaultPath) => {
  let target = defaultPath || PROJECT_DIR;
  if (!path.isAbsolute(target)) target = path.join(PROJECT_DIR, target);
  const res = await dialog.showOpenDialog(mainWindow, {
    title: "选择目录",
    defaultPath: fs.existsSync(target) ? target : PROJECT_DIR,
    properties: ["openDirectory", "createDirectory"],
  });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle("dialog:save-file", async (_, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "保存文件",
    defaultPath: defaultName || "note.md",
    filters: [{ name: "Markdown 文件", extensions: ["md"] }],
  });
  return canceled ? null : filePath;
});

ipcMain.handle("file:export-note", async (_, { filename, content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "导出笔记",
    defaultPath: filename || "video-note.md",
    filters: [{ name: "Markdown 笔记", extensions: ["md"] }],
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, content, "utf-8");
    return { ok: true, path: filePath };
  }
  return { ok: false };
});

ipcMain.handle("shell:open-folder", async (_, { type, name }) => {
  let targetDir = path.join(PROJECT_DIR, type === "vedio" ? "vedio" : "output");
  if (name) {
    const specific = path.join(targetDir, name);
    if (fs.existsSync(specific)) {
      shell.showItemInFolder(specific);
      return { ok: true };
    }
  }
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  await shell.openPath(targetDir);
  return { ok: true };
});

ipcMain.handle("shell:open-path", async (_, targetPath) => {
  if (!targetPath) return { ok: false };
  let resolved = targetPath;
  if (!path.isAbsolute(resolved)) {
    resolved = path.join(PROJECT_DIR, resolved);
  }
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  await shell.openPath(resolved);
  return { ok: true };
});

ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("window:close", () => mainWindow?.close());
ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false);

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    buildMenu();
    await pythonManager.startBackend();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("before-quit", () => {
    pythonManager.stopBackend();
  });

  app.on("will-quit", () => {
    pythonManager.stopBackend();
  });

  app.on("window-all-closed", () => {
    pythonManager.stopBackend();
    if (!isMac) app.quit();
  });
}
