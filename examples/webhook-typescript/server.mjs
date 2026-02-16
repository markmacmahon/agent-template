/**
 * Minimal webhook server (Node http only). Implements the sync contract:
 * POST JSON body with message_received payload -> respond with { "reply": "..." }.
 * Port 8081 to avoid conflict with main app (3000, 8000).
 */
import http from "node:http";
import crypto from "node:crypto";

const PORT = 8081;

function verifySignature(secret, rawBody, timestamp, signature) {
  if (!secret || !timestamp || !signature) return true;
  try {
    const signed = `${timestamp}.${rawBody}`;
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(signed).digest("hex");
    const a = Buffer.from(signature, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end();
    return;
  }

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    const secret = process.env.WEBHOOK_SECRET || "";
    const ts = (req.headers["x-timestamp"] ?? "").toString();
    const sig = (req.headers["x-signature"] ?? "").toString();

    if (secret && !verifySignature(secret, raw, ts, sig)) {
      res.writeHead(401);
      res.end();
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const content = data.message?.content ?? "";
    const reply = `Echo: ${content}`;

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ reply }));
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Webhook listening on http://0.0.0.0:${PORT}`);
});
