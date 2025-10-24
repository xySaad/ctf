import express from "express";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const app = express();
const PORT = process.env.PORT || 3000;
app.set("trust proxy", true);
app.use(express.text({ type: "*/*", limit: "1mb" }));

const FLAG = fs
  .readFileSync(path.join(process.cwd(), "FLAG.txt"), "utf8")
  .trim();

let cachedKeys = null;

async function getKeys() {
  if (cachedKeys) return cachedKeys;
  const res = await fetch("http://localhost:5000/.well-known/jwks.json");
  if (!res.ok) throw new Error("Failed to fetch JWKS");
  const data = await res.json();
  if (!data || !data.keys || !data.keys[0] || !data.keys[0].pem)
    throw new Error("Bad JWKS");
  const pem = data.keys[0].pem;
  const hmacSecret = (data.keys[0].n || "").toString();
  cachedKeys = { pem, hmacSecret };
  return cachedKeys;
}

async function verifyToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.payload)
    throw new Error("bad token");
  const alg = decoded.header.alg;
  const { pem, hmacSecret } = await getKeys();
  if (alg === "RS256") {
    return jwt.verify(token, pem, { algorithms: ["RS256"] });
  }
  if (alg === "HS256") {
    return jwt.verify(token, hmacSecret, { algorithms: ["HS256"] });
  }
  throw new Error("unsupported alg");
}

function requireAuth(req, res, next) {
  const auth = req.headers["authorization"] || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: "no token" });
  verifyToken(m[1])
    .then((payload) => {
      req.user = payload;
      next();
    })
    .catch((e) => res.status(401).json({ error: "invalid token" }));
}

app.get("/debug/fetch", async (req, res) => {
  const xff = (req.headers["x-forwarded-for"] || "").toString();
  const fromProxy = xff.includes("127.0.0.1") || req.ip === "127.0.0.1";
  if (!fromProxy) return res.status(403).json({ error: "forbidden" });

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "missing url" });

  let target = url.toString();
  try {
    const u = new URL(target, "http://localhost");
    if (u.protocol === "http:" && u.port === "5000") {
      if (
        u.hostname !== "localhost" &&
        u.hostname !== "127.0.0.1" &&
        u.hostname !== "metadata"
      ) {
        u.hostname = "localhost";
        u.port = "5000";
        target = u.toString();
      }
    }
  } catch (_) {}
  try {
    const r = await fetch(target, { redirect: "manual" });
    const text = await r.text();
    res.set("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: "fetch failed" });
  }
});

app.get("/admin/flag", requireAuth, (req, res) => {
  if (req.user && req.user.role === "admin") {
    return res.json({ flag: FLAG });
  }
  return res.status(403).json({ error: "admins only" });
});

app.get("/", (req, res) => {
  res.type("text").send("OK");
});

app.listen(PORT, () => {
  console.log("app listening on", PORT);
});

const jwks = {
  keys: [
    {
      kty: "RSA",
      kid: "test-key-1",
      alg: "RS256",
      use: "sig",
      n: "random-string-for-hmac-secret",
      e: "random-string-for-e",
      pem: `random-string-for-pem`,
    },
  ],
};

http
  .createServer((req, res) => {
    if (req.method === "GET" && req.url === "/.well-known/jwks.json") {
      const body = JSON.stringify(jwks);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
      return;
    }
    res.statusCode = 404;
    res.end("Not Found");
  })
  .listen(5000, () => {
    console.log("local JWKS listening on 5000");
  });
