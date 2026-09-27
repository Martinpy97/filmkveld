import { build } from "esbuild";
await build({ entryPoints: ["server.ts"], bundle: true, platform: "node", target: "node24", format: "esm", outfile: "dist/server.mjs", alias: { "@": process.cwd() } });
