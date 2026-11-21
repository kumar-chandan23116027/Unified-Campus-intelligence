import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getSource, sources } from "./mcp/registry.js";
import { getDashboardSnapshot, routeAssistant } from "./server/assistantRouter.js";
import { handleMcpRequest } from "./server/mcpRuntime.js";
import { readJsonBody, sendJson, sendText, serveStatic } from "./server/http.js";
import { HttpError, methodNotAllowed, notFound, tooManyRequests } from "./server/errors.js";
import { createRateLimiter } from "./server/rateLimit.js";
import { validateAssistantMessage } from "./server/validation.js";
import { handleAdminRequest } from "./server/admin.js";

const PORT = Number(process.env.PORT || 4173);

async function handleApi(request, response, pathname) {
  if (pathname === "/api/health") {
    if (request.method !== "GET") throw methodNotAllowed();
    sendJson(response, 200, {
      ok: true,
      app: "Campus Intelligence Dashboard",
      now: new Date().toISOString(),
      status: "healthy"
    });
    return true;
  }

  if (pathname === "/api/ready") {
    if (request.method !== "GET") throw methodNotAllowed();
    sendJson(response, 200, {
      ok: true,
      status: "ready",
      dataSources: sources.length
    });
    return true;
  }

  if (pathname === "/api/dashboard") {
    if (request.method !== "GET") throw methodNotAllowed();
    sendJson(response, 200, await getDashboardSnapshot());
    return true;
  }

  if (pathname === "/api/assistant") {
    if (request.method !== "POST") throw methodNotAllowed();
    const body = await readJsonBody(request);
    const message = validateAssistantMessage(body);
    sendJson(response, 200, await routeAssistant(message));
    return true;
  }

  const adminMatch = pathname.match(/^\/api\/admin\/([a-z-]+)(?:\/([^/]+))?$/);
  if (adminMatch) {
    const result = await handleAdminRequest(request, response, adminMatch[1], adminMatch[2] ? decodeURIComponent(adminMatch[2]) : null);
    const status = request.method === "POST" ? 201 : 200;
    sendJson(response, status, { ok: true, result });
    return true;
  }

  return false;
}

async function handleMcp(request, response, pathname) {
  const match = pathname.match(/^\/mcp\/([a-z-]+)$/);
  if (!match) {
    return false;
  }

  const source = getSource(match[1]);
  if (!source) {
    sendJson(response, 404, { error: "Unknown MCP source" });
    return true;
  }

  if (request.method === "GET") {
    sendJson(response, 200, {
      id: source.id,
      label: source.label,
      description: source.description,
      endpoint: `/mcp/${source.id}`,
      methods: ["tools/list", "tools/call", "source/overview"]
    });
    return true;
  }

  if (request.method === "POST") {
    const body = await readJsonBody(request);
    sendJson(response, 200, await handleMcpRequest(source, body));
    return true;
  }

  throw methodNotAllowed();
}

export function createCampusServer() {
  const rateLimit = createRateLimiter();
  return createServer(async (request, response) => {
    const startedAt = Date.now();
    try {
      const limit = rateLimit(request);
      response.setHeader("X-RateLimit-Limit", String(Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120)));
      response.setHeader("X-RateLimit-Remaining", String(limit.remaining));
      response.setHeader("X-RateLimit-Reset", String(Math.ceil(limit.resetAt / 1000)));
      if (!limit.allowed) {
        throw tooManyRequests();
      }

      const url = new URL(request.url, "http://localhost");
      const pathname = url.pathname;

      if (await handleApi(request, response, pathname)) {
        return;
      }

      if (await handleMcp(request, response, pathname)) {
        return;
      }

      if (request.method === "GET" || request.method === "HEAD") {
        await serveStatic(request, response);
        return;
      }

      throw notFound();
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.status, {
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {})
          }
        });
        return;
      }

      if (error instanceof SyntaxError) {
        sendJson(response, 400, {
          error: { code: "BAD_REQUEST", message: "Malformed JSON body" }
        });
        return;
      }

      console.error("Unhandled request error", { message: error.message, durationMs: Date.now() - startedAt });
      sendJson(response, 500, {
        error: { code: "INTERNAL_ERROR", message: "Internal server error" }
      });
    }
  });
}

const isMainModule = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const server = createCampusServer();
  let shuttingDown = false;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Campus Intelligence Dashboard running at http://localhost:${PORT}`);
  });

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down gracefully`);
    server.close((error) => {
      if (error) {
        console.error("Graceful shutdown failed", error);
        process.exit(1);
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
