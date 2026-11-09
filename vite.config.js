// Vite configuration with Tailwind CSS and local dev middleware mounting /api/* Vercel handlers
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }

  return {
    plugins: [
      tailwindcss(),
      {
        name: "vercel-api-dev-adapter",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url?.split("?")[0] || "";
            if (!url.startsWith("/api/")) {
              next();
              return;
            }

            const routeMap = {
              "/api/health": "/api/health.ts",
              "/api/quiz": "/api/quiz.ts",
              "/api/assist": "/api/assist.ts",
            };

            const modulePath = routeMap[url];
            if (!modulePath) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Not found" }));
              return;
            }

            try {
              let rawBody = "";
              if (req.method === "POST") {
                for await (const chunk of req) {
                  rawBody += chunk;
                }
              }
              const parsedBody = rawBody ? JSON.parse(rawBody) : {};
              const mod = await server.ssrLoadModule(modulePath);
              const handler = mod.default;

              const vercelReq = {
                method: req.method,
                body: parsedBody,
              };
              const vercelRes = {
                status(code) {
                  res.statusCode = code;
                  return this;
                },
                json(data) {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify(data));
                },
              };

              await handler(vercelReq, vercelRes);
            } catch {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ fallback: true, aiMode: false }));
            }
          });
        },
      },
    ],
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
