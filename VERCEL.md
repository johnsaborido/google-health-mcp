# Running this server on Vercel

Lets Claude read Google Health data from any chat (including phone) without a computer on.

- `api/mcp.js` serves the normal server on a stateless Streamable HTTP transport.
- MCP endpoint: `https://<project>.vercel.app/mcp/<GOOGLE_HEALTH_MCP_SECRET>` — every other
  path 404s, so the secret in the URL is the password. Treat the full URL like a password.
- `https://<project>.vercel.app/healthz` shows whether the secret, token and OAuth client are set.
- The docs site in `docs/` is still served as the static output.

## 1. Token (once, on your computer)

Run the normal local setup/auth (`npx -y google-health-mcp-unofficial setup`, then `auth`).
That writes `~/.google-health-mcp/tokens.json`. Turn it into one line:

macOS / Linux: `base64 < ~/.google-health-mcp/tokens.json | tr -d '\n'`

Windows (PowerShell, copies to clipboard):
`[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\.google-health-mcp\tokens.json")) | Set-Clipboard`

Google refresh tokens don't rotate, so the local server and this deployment can share it.

## 2. Vercel environment variables

| Name | Value |
| --- | --- |
| `GOOGLE_HEALTH_TOKENS_B64` | output of step 1 |
| `GOOGLE_HEALTH_CLIENT_ID` | same as your local config |
| `GOOGLE_HEALTH_CLIENT_SECRET` | same as your local config |
| `GOOGLE_HEALTH_REDIRECT_URI` | same as your local config (e.g. `http://127.0.0.1:3000/callback`) |
| `GOOGLE_HEALTH_MCP_SECRET` | any random string, 24+ characters |

Redeploy after adding them, then open `/healthz`.

## 3. Add to Claude

claude.ai → Settings → Connectors → Add custom connector → paste the full `/mcp/<secret>` URL.
