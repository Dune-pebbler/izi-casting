const http = require("http");
const path = require("path");
const fs = require("fs");

const PORT = 3001;
const API_DIR = path.join(__dirname, "api");

// Mimics Vercel's file-based routing, including [param] dynamic segments,
// so nested routes like api/v1/playlists/[playlistId]/toggle.js resolve
// and req.query gets populated with the matched params.
function findRoute(baseDir, segments, params = {}) {
  if (segments.length === 0) return null;
  const [head, ...rest] = segments;

  let entries;
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return null;
  }

  if (rest.length === 0) {
    const literalFile = entries.find(
      (e) => e.isFile() && e.name === `${head}.js`
    );
    if (literalFile) {
      return { filePath: path.join(baseDir, literalFile.name), params };
    }

    const dynamicFile = entries.find(
      (e) => e.isFile() && /^\[.+\]\.js$/.test(e.name)
    );
    if (dynamicFile) {
      const paramName = dynamicFile.name.slice(1, -4);
      return {
        filePath: path.join(baseDir, dynamicFile.name),
        params: { ...params, [paramName]: head },
      };
    }

    return null;
  }

  const literalDir = entries.find((e) => e.isDirectory() && e.name === head);
  if (literalDir) {
    const result = findRoute(path.join(baseDir, literalDir.name), rest, params);
    if (result) return result;
  }

  const dynamicDir = entries.find(
    (e) => e.isDirectory() && /^\[.+\]$/.test(e.name)
  );
  if (dynamicDir) {
    const paramName = dynamicDir.name.slice(1, -1);
    const result = findRoute(path.join(baseDir, dynamicDir.name), rest, {
      ...params,
      [paramName]: head,
    });
    if (result) return result;
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const segments = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const route = findRoute(API_DIR, segments);

  if (!route) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `No handler found for ${url.pathname}` }));
    return;
  }

  let handler;
  try {
    const mod = require(route.filePath);
    handler = typeof mod === "function" ? mod : mod.default;
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Failed to load handler: ${err.message}` }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      if (body) req.body = JSON.parse(body);
    } catch {}

    req.query = { ...route.params, ...Object.fromEntries(url.searchParams) };

    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    };
    res.send = (data) => {
      res.end(data);
    };

    try {
      await handler(req, res);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});
