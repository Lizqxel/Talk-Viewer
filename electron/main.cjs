const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeByExt = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".map": "application/json; charset=utf-8",
  };

  return mimeByExt[ext] ?? "application/octet-stream";
}

function resolveFilePath(rootDir, requestPathname) {
  const safePath = decodeURIComponent(requestPathname).replace(/\\/g, "/");
  const normalized = path.normalize(safePath).replace(/^([.][.][/\\])+/, "");

  const candidates = [];
  if (normalized === "/" || normalized === "") {
    candidates.push("index.html");
  } else {
    const noLeadingSlash = normalized.replace(/^\//, "");
    candidates.push(noLeadingSlash);

    if (!path.extname(noLeadingSlash)) {
      candidates.push(path.join(noLeadingSlash, "index.html"));
      candidates.push(`${noLeadingSlash}.html`);
    }
  }

  for (const candidate of candidates) {
    const fullPath = path.join(rootDir, candidate);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  }

  const fallback = path.join(rootDir, "index.html");
  return fs.existsSync(fallback) ? fallback : null;
}

function createStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://localhost");
    const filePath = resolveFilePath(rootDir, url.pathname);

    if (!filePath) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": getMimeType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });

  return server;
}

function getStaticRootDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar", "out");
  }

  return path.join(app.getAppPath(), "out");
}

async function createWindow() {
  const rootDir = getStaticRootDir();
  const server = createStaticServer(rootDir);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 3000;
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f5f5f4",
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    server.close();
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(() => {
  createWindow().catch((error) => {
    console.error("Failed to launch desktop app", error);
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) => {
        console.error("Failed to relaunch desktop app", error);
        app.quit();
      });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
