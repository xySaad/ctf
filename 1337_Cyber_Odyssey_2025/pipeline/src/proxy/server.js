import net from "node:net";

const LISTEN_PORT = 8082;
const ORIGIN_HOST = "app";
const ORIGIN_PORT = 3000;

function parseHeaders(buf) {
  const s = buf.toString("latin1");
  const idx = s.indexOf("\r\n\r\n");
  if (idx === -1) return null;
  const head = s.slice(0, idx);
  const lines = head.split("\r\n");
  const requestLine = lines.shift();
  const parts = requestLine.trim().split(/\s+/);
  const method = parts[0] || "";
  const path = parts.length >= 2 ? parts[1] : "";
  const headers = {};
  for (const line of lines) {
    const p = line.indexOf(":");
    if (p !== -1)
      headers[line.slice(0, p).toLowerCase()] = line.slice(p + 1).trim();
  }
  return { idx, method, path, headers };
}

const server = net.createServer((client) => {
  const upstream = net.connect(ORIGIN_PORT, ORIGIN_HOST);
  let clientBuf = Buffer.alloc(0);

  client.on("data", (chunk) => {
    clientBuf = Buffer.concat([clientBuf, chunk]);

    const meta = parseHeaders(clientBuf);
    if (!meta) return;

    const { idx, method, path, headers } = meta;

    let required = 0;
    if (headers["content-length"]) {
      required = parseInt(headers["content-length"], 10) || 0;
    } else if (headers["transfer-encoding"]) {
      required = 0;
    }
    const headerEnd = idx + 4;
    let checkPath = path || "";
    console.log(checkPath);

    try {
      if (/^https?:\/\//i.test(checkPath)) {
        const u = new URL(checkPath);
        checkPath = u.pathname || "";
      }
    } catch (_) {}
    if (checkPath.toLowerCase().startsWith("/debug")) {
      client.write(
        "HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: 9\r\n\r\nforbidden"
      );
      client.end();
      upstream.end();
      return;
    }

    if (clientBuf.length >= headerEnd + required) {
      upstream.write(clientBuf);
      clientBuf = Buffer.alloc(0);
    }
  });

  client.on("end", () => upstream.end());
  client.on("error", () => upstream.end());

  upstream.on("data", (d) => client.write(d));
  upstream.on("end", () => client.end());
  upstream.on("error", () => client.end());
});

server.listen(LISTEN_PORT, () => {
  console.log(`vuln proxy listening on ${LISTEN_PORT}`);
});
