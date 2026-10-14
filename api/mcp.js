// Vercel serverless entry: Google Health MCP over stateless Streamable HTTP, so Claude can
// reach it from any chat without a computer on. See VERCEL.md.
//
// Env: GOOGLE_HEALTH_MCP_SECRET (URL secret), GOOGLE_HEALTH_TOKENS_B64 (base64 of
// ~/.google-health-mcp/tokens.json), GOOGLE_HEALTH_CLIENT_ID / _CLIENT_SECRET / _REDIRECT_URI.
import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DIR = join(tmpdir(), "google-health-mcp");
process.env.GOOGLE_HEALTH_TOKEN_PATH ||= join(DIR, "tokens.json");
process.env.GOOGLE_HEALTH_CACHE ||= "false";

function seedTokens() {
  const path = process.env.GOOGLE_HEALTH_TOKEN_PATH;
  if (existsSync(path)) return true; // warm instance: keep refreshed tokens
  const raw = (process.env.GOOGLE_HEALTH_TOKENS_B64 || "").trim();
  if (!raw) return false;
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    JSON.parse(json);
    mkdirSync(DIR, { recursive: true, mode: 0o700 });
    writeFileSync(path, json, { mode: 0o600 });
    chmodSync(path, 0o600);
    return true;
  } catch {
    console.error("GOOGLE_HEALTH_TOKENS_B64 is not valid base64 JSON.");
    return false;
  }
}
const seeded = seedTokens();

const { createServer } = await import("../dist/server.js");
const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");

const digest = (s) => createHash("sha256").update(String(s)).digest();
function secretOk(given) {
  const want = process.env.GOOGLE_HEALTH_MCP_SECRET || "";
  if (want.length < 24 || !given) return false;
  return timingSafeEqual(digest(given), digest(want));
}

export default async function handler(req, res) {
  const url = new URL(req.url, "http://x");
  if (url.searchParams.get("health")) {
    return res.status(200).json({
      ok: true,
      secret_configured: (process.env.GOOGLE_HEALTH_MCP_SECRET || "").length >= 24,
      tokens_seeded: seeded,
      oauth_client_configured: Boolean(process.env.GOOGLE_HEALTH_CLIENT_ID && process.env.GOOGLE_HEALTH_CLIENT_SECRET)
    });
  }
  if (!secretOk(url.searchParams.get("secret"))) return res.status(404).end("Not found");
  if (req.method !== "POST") {
    return res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
  }

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    transport.close().catch(() => undefined);
    server.close().catch(() => undefined);
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed:", error);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
}
