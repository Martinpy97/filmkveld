import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import * as collection from "./app/api/collection/route";
import * as tcg from "./app/api/tcg/collection/route";
import * as catalog from "./app/api/tcg/catalog/route";
import {pokemonIds} from "./lib/pokemon";
import {setMap} from "./lib/tcg-catalog";
import { closeDatabase } from "./lib/database";

const port = Number(process.env.PORT || 8784);
const host = process.env.HOST || "127.0.0.1";
const allowedOrigins = new Map<string, string>();
for (const value of (process.env.POKEDEX_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean)) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash || url.hostname.includes("*")) {
    throw new Error("POKEDEX_ALLOWED_ORIGINS må inneholde hele http(s)-adresser uten sti, innlogging eller jokertegn.");
  }
  const authority = url.host.toLowerCase();
  if (allowedOrigins.has(authority) && allowedOrigins.get(authority) !== url.origin) {
    throw new Error("Bruk bare én protokoll per vert og port i POKEDEX_ALLOWED_ORIGINS.");
  }
  allowedOrigins.set(authority, url.origin);
}
const publicRoot = resolve("dist/client");
type Handler = (request: Request) => Promise<Response>;
const routes: Record<string, Record<string, Handler>> = {
  "/api/collection": { GET: collection.GET, PUT: collection.PUT },
  "/api/tcg/collection": { GET: tcg.GET, PUT: tcg.PUT },
  "/api/tcg/catalog": { GET: catalog.GET },
};
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon",
};
function reply(res: ServerResponse, status: number, error: string) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ error }));
}
async function serve(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  // Allow loopback by default and only explicitly configured NAS/proxy origins.
  // Never trust forwarded headers to select the public origin.
  const authority = req.headers.host || "";
  const loopback = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(authority);
  const origin = allowedOrigins.get(authority.toLowerCase()) || (loopback ? `http://${authority.toLowerCase()}` : undefined);
  if (!origin) return reply(res, 403, "Adressen er ikke tillatt. Bruk en adresse fra POKEDEX_ALLOWED_ORIGINS eller localhost.");
  if (req.headers["sec-fetch-site"] === "cross-site") return reply(res, 403, "Ugyldig forespørsel.");
  if (req.headers.origin && req.headers.origin !== origin) return reply(res, 403, "Ugyldig forespørsel.");
  let url: URL;
  try { url = new URL(req.url || "/", origin); } catch { return reply(res, 400, "Ugyldig adresse."); }
  if (url.origin !== origin) return reply(res, 400, "Ugyldig adresse.");
  if (url.pathname === "/healthz" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    return res.end('{"status":"ok"}');
  }
  if (url.pathname.startsWith("/api/")) {
    const route = routes[url.pathname];
    if (!route) return reply(res, 404, "Fant ikke funksjonen.");
    const handler = route[req.method || "GET"];
    if (!handler) { res.setHeader("Allow", Object.keys(route).join(", ")); return reply(res, 405, "Ugyldig metode."); }
    const chunks: Buffer[] = []; let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 4096) return reply(res, 413, "Forespørselen er for stor.");
      chunks.push(Buffer.from(chunk));
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    const request = new Request(url, { method: req.method, headers, ...(req.method !== "GET" && req.method !== "HEAD" ? { body: Buffer.concat(chunks) } : {}) });
    const response = await handler(request);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.writeHead(response.status); return res.end(Buffer.from(await response.arrayBuffer()));
  }
  if (req.method !== "GET" && req.method !== "HEAD") return reply(res, 405, "Ugyldig metode.");
  let pathname: string;
  try { pathname = decodeURIComponent(url.pathname); } catch { return reply(res, 400, "Ugyldig adresse."); }
  const species=pathname.match(/^\/pokemon\/(\d+)\/?$/);
  const set=pathname.match(/^\/mastersett\/([\w.-]+)\/?$/);
  const page=pathname==="/"||/^\/mastersett\/?$/.test(pathname)||!!(species&&pokemonIds.has(Number(species[1])))||!!(set&&setMap.has(set[1]));
  const file = resolve(publicRoot, page ? "index.html" : `.${pathname}`);
  if (!file.startsWith(publicRoot + sep) || pathname.includes("\0") || pathname.split("/").some(p => p.startsWith("."))) return reply(res, 404, "Fant ikke filen.");
  try {
    const info = await stat(file);
    if (!info.isFile()) return reply(res, 404, "Fant ikke filen.");
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Content-Length": info.size, "Cache-Control": extname(file) === ".html" ? "no-cache" : "public, max-age=86400" });
    if (req.method === "HEAD") return res.end();
    createReadStream(file).on("error", () => res.destroy()).pipe(res);
  } catch { return reply(res, 404, "Fant ikke filen."); }
}
const server = createServer((req, res) => { void serve(req, res).catch(() => {
  if (!res.headersSent) reply(res, 503, "Kunne ikke fullføre. Prøv igjen."); else res.destroy();
}); });
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(port, host, () => console.log(`Pokédex er klar: http://localhost:${port}`));
for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => {
  server.close(() => { closeDatabase(); process.exit(0); });
  server.closeIdleConnections();
});
