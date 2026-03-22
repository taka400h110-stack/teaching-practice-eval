import { serveStatic } from "hono/cloudflare-pages";
const mw = serveStatic({ path: "./index.html" });
