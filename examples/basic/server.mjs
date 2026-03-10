import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "../..");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  let filePath;

  if (url.pathname === "/" || url.pathname === "/index.html") {
    filePath = path.join(__dirname, "index.html");
  } else if (url.pathname === "/index.js") {
    filePath = path.join(__dirname, "index.js");
  } else if (url.pathname.startsWith("/dist/")) {
    filePath = path.join(packageRoot, url.pathname.slice(1));
  } else {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  if (!fs.existsSync(filePath)) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  response.setHeader("Content-Type", mimeTypes[path.extname(filePath)] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`leaflet-globe demo running at http://${host}:${port}`);
});
