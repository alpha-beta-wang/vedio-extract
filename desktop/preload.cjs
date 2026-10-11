const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,

  openVideoDialog: () => ipcRenderer.invoke("dialog:open-video"),
  selectDirectory: (defaultPath) => ipcRenderer.invoke("dialog:select-directory", defaultPath),
  saveFileDialog: (defaultName) => ipcRenderer.invoke("dialog:save-file", defaultName),
  exportNote: (filename, content) => ipcRenderer.invoke("file:export-note", { filename, content }),
  openFolder: (type, name) => ipcRenderer.invoke("shell:open-folder", { type, name }),
  openPath: (targetPath) => ipcRenderer.invoke("shell:open-path", targetPath),

  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),

  selectPythonPath: () => ipcRenderer.invoke("python:select-path"),
  retryBackend: () => ipcRenderer.invoke("python:retry"),
  openExternalUrl: (url) => ipcRenderer.invoke("shell:open-external", url),

  onBackendError: (callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on("backend:error", listener);
    return () => ipcRenderer.removeListener("backend:error", listener);
  },
  onBackendStatus: (callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on("backend:status", listener);
    return () => ipcRenderer.removeListener("backend:status", listener);
  },

  onMenuTrigger: (channel, callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
