import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Replit terminates TLS and reverse-proxies everything through 443, so the
  // browser's HMR client needs to be told to reconnect via wss on 443
  // rather than the app's actual internal port. Plain local dev (no proxy,
  // no TLS) has no such indirection — forcing the same wss/443 override
  // there makes the browser try to open a secure WebSocket to a port
  // nothing is listening on, which fails immediately and breaks HMR.
  const isReplit = !!process.env.REPL_ID;
  const serverOptions = {
    middlewareMode: true,
    hmr: isReplit ? { server, clientPort: 443, protocol: 'wss' as const } : { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Hashed JS/CSS bundles (e.g. index-Bi09A_U6.js) are content-addressed and
  // safe to cache aggressively. Everything else (index.html, favicon, etc.)
  // must never be cached so mobile browsers always get the latest entry point.
  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      const isHashedAsset = /\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|eot|png|svg|webp)$/i.test(filePath);
      if (isHashedAsset) {
        // Immutable — the hash changes when content changes, so this is safe.
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        // index.html and any un-hashed file must always be re-fetched so
        // mobile browsers pick up new JS chunk filenames after a deploy.
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
