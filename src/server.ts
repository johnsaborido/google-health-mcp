import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerGoogleHealthPrompts } from "./prompts/google-health-prompts.js";
import { registerGoogleHealthResources } from "./resources/google-health-resources.js";
import { installClientSafeToolSchemas } from "./services/client-safe-json-schema.js";
import { registerGoogleHealthTools } from "./tools/google-health-tools.js";

/** Builds a fully registered MCP server (shared by stdio, local HTTP and the Vercel function). */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  registerGoogleHealthTools(server);
  registerGoogleHealthResources(server);
  registerGoogleHealthPrompts(server);
  installClientSafeToolSchemas(server);
  return server;
}
