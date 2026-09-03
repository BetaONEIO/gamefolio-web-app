/**
 * Expands an uploaded browser-playable build (a zip of a WebGL/HTML5 export)
 * into R2 so it can be served as a static site.
 *
 * The archive comes from an untrusted uploader, so every guard here exists for
 * a reason rather than for tidiness:
 *
 *  - **Zip slip.** An entry named `../../../etc/passwd` must never escape its
 *    prefix. Keys are rebuilt from sanitised path segments and anything that
 *    still looks like traversal is dropped, not "cleaned and hoped over".
 *  - **Zip bombs.** A 40MB archive can expand to hundreds of GB. Entry count
 *    and cumulative expanded bytes are both capped mid-stream, and the whole
 *    extraction aborts the moment either is exceeded.
 *  - **Executables.** A browser build has no legitimate need for a .exe or .dll,
 *    and hosting one would make Gamefolio a convenient malware mirror.
 *
 * One thing that is NOT a guard here, and is worth understanding: the extracted
 * tree is served from R2_PUBLIC_BASE_URL, a different origin from the app. That
 * separation is what makes it safe to run a stranger's JavaScript at all — it
 * cannot read app cookies, localStorage or the session. Do not "simplify" this
 * later by proxying builds through the app's own domain.
 */

import yauzl from "yauzl";
import { Readable } from "stream";
import {
  WEB_BUILD_MAX_ENTRIES,
  WEB_BUILD_MAX_EXPANDED_BYTES,
} from "@shared/game-builds";
import { putObject } from "../r2-storage";

/** Extensions we refuse to host inside a browser-playable build. */
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".dll", ".so", ".dylib", ".bat", ".cmd", ".com", ".msi",
  ".sh", ".bash", ".ps1", ".scr", ".jar", ".app", ".deb", ".rpm", ".apk",
]);

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
  ".unityweb": "application/octet-stream",
  ".mem": "application/octet-stream",
  ".symbols": "application/octet-stream",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

function extensionOf(path: string): string {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? "" : path.slice(idx).toLowerCase();
}

function contentTypeFor(path: string): string {
  return CONTENT_TYPES[extensionOf(path)] ?? "application/octet-stream";
}

/**
 * Rebuild a zip entry path from sanitised segments. Returns null when the entry
 * is not safe to write — traversal, absolute path, or an empty result.
 *
 * Exported for tests: this is the function standing between an uploaded archive
 * and writing outside its prefix, so it is worth pinning directly rather than
 * only exercising it through a full extraction.
 */
export function safeRelativePath(entryFileName: string): string | null {
  const normalised = entryFileName.replace(/\\/g, "/");
  if (normalised.startsWith("/")) return null;
  // Windows drive letters ("C:/…") and UNC paths.
  if (/^[a-zA-Z]:/.test(normalised) || normalised.startsWith("//")) return null;

  const segments: string[] = [];
  for (const raw of normalised.split("/")) {
    if (raw === "" || raw === ".") continue;
    if (raw === "..") return null; // traversal — refuse rather than resolve
    // Control characters and NULs have no business in an object key.
    if (/[\x00-\x1f\x7f]/.test(raw)) return null;
    segments.push(raw);
  }
  if (segments.length === 0) return null;
  return segments.join("/");
}

export interface ExtractedBuild {
  /** Path within the prefix that the player's browser should load. */
  entryPath: string;
  fileCount: number;
  expandedBytes: number;
}

export class BuildExtractionError extends Error {}

/**
 * Extract `archive` into `prefix` in R2. Resolves with the entry point, or
 * throws BuildExtractionError with a message safe to show the developer.
 */
export async function extractWebBuild(
  archive: Buffer,
  prefix: string,
): Promise<ExtractedBuild> {
  const written: { path: string; bytes: number }[] = [];
  let expandedBytes = 0;
  let entryCount = 0;

  const zipfile = await openZip(archive);

  await new Promise<void>((resolve, reject) => {
    // Serialise entry handling: yauzl emits the next entry only when asked, so
    // an await-per-entry keeps memory bounded to one file at a time.
    zipfile.on("entry", (entry: any) => {
      void (async () => {
        try {
          const isDirectory = /\/$/.test(entry.fileName);
          if (isDirectory) {
            zipfile.readEntry();
            return;
          }

          entryCount += 1;
          if (entryCount > WEB_BUILD_MAX_ENTRIES) {
            throw new BuildExtractionError(
              `That archive contains more than ${WEB_BUILD_MAX_ENTRIES} files. Please upload a build export rather than a whole project folder.`,
            );
          }

          const relPath = safeRelativePath(entry.fileName);
          if (!relPath) {
            throw new BuildExtractionError(
              `The archive contains an unsafe file path (${entry.fileName}). Re-export the build and try again.`,
            );
          }

          if (BLOCKED_EXTENSIONS.has(extensionOf(relPath))) {
            throw new BuildExtractionError(
              `Browser-playable builds cannot contain executables (found ${relPath}). Upload it as a downloadable build instead.`,
            );
          }

          const declared = Number(entry.uncompressedSize ?? 0);
          if (expandedBytes + declared > WEB_BUILD_MAX_EXPANDED_BYTES) {
            throw new BuildExtractionError(
              "That archive expands to more than the size limit for browser-playable builds.",
            );
          }

          const contents = await readEntry(zipfile, entry);
          expandedBytes += contents.length;
          if (expandedBytes > WEB_BUILD_MAX_EXPANDED_BYTES) {
            throw new BuildExtractionError(
              "That archive expands to more than the size limit for browser-playable builds.",
            );
          }

          await putObject({
            key: `${prefix}${relPath}`,
            body: contents,
            contentType: contentTypeFor(relPath),
            // Immutable: each build gets its own prefix, so a rebuild is a new
            // URL rather than a cache invalidation problem.
            cacheControl: "public, max-age=31536000, immutable",
          });
          written.push({ path: relPath, bytes: contents.length });

          zipfile.readEntry();
        } catch (err) {
          reject(err);
        }
      })();
    });

    zipfile.on("end", resolve);
    zipfile.on("error", reject);
    zipfile.readEntry();
  });

  if (written.length === 0) {
    throw new BuildExtractionError("That archive is empty.");
  }

  const entryPath = findEntryPoint(written.map((w) => w.path));
  if (!entryPath) {
    throw new BuildExtractionError(
      "No index.html found in the archive. A browser-playable build needs an HTML entry point at the top level (or inside a single top-level folder).",
    );
  }

  return { entryPath, fileCount: written.length, expandedBytes };
}

/**
 * Locate the file a browser should open. Handles the common case where the zip
 * wraps everything in one folder ("MyGame/index.html") as well as a flat export,
 * and falls back to the shallowest HTML file when the export named it something
 * other than index.html.
 */
export function findEntryPoint(paths: string[]): string | null {
  const htmlFiles = paths.filter((p) => /\.html?$/i.test(p));
  if (htmlFiles.length === 0) return null;

  const depth = (p: string) => p.split("/").length;
  const named = htmlFiles.filter((p) => /(^|\/)index\.html?$/i.test(p));
  const candidates = named.length > 0 ? named : htmlFiles;

  return candidates.sort((a, b) => depth(a) - depth(b) || a.length - b.length)[0];
}

function openZip(buffer: Buffer): Promise<any> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(new BuildExtractionError("That file could not be read as a zip archive."));
        return;
      }
      resolve(zipfile);
    });
  });
}

function readEntry(zipfile: any, entry: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err: Error | null, stream?: Readable) => {
      if (err || !stream) {
        reject(new BuildExtractionError(`Could not read ${entry.fileName} from the archive.`));
        return;
      }
      const chunks: Buffer[] = [];
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  });
}
