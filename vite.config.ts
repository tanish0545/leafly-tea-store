import { defineConfig, loadEnv, type ViteDevServer, type Connect } from 'vite'
import type { ServerResponse } from 'http'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const urlPath = req.url.split('?')[0];
        try {
          if (urlPath === '/api/newsletter') {
            const mod = await server.ssrLoadModule('./api/newsletter.ts');
            return await mod.default(req, res);
          }
          if (urlPath === '/api/gifting') {
            const mod = await server.ssrLoadModule('./api/gifting.ts');
            return await mod.default(req, res);
          }
          if (urlPath === '/api/contact') {
            const mod = await server.ssrLoadModule('./api/contact.ts');
            return await mod.default(req, res);
          }
          if (urlPath === '/api/order-notification') {
            const mod = await server.ssrLoadModule('./api/order-notification.ts');
            return await mod.default(req, res);
          }
          if (urlPath === '/api/welcome') {
            const mod = await server.ssrLoadModule('./api/welcome.ts');
            return await mod.default(req, res);
          }
        } catch (err) {
          console.error(`[API Dev Middleware Error on ${urlPath}]:`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err) }));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Populate Node process.env with any SMTP credentials from local .env files
  if (env.GMAIL_USER && !process.env.GMAIL_USER) process.env.GMAIL_USER = env.GMAIL_USER;
  if (env.GMAIL_APP_PASSWORD && !process.env.GMAIL_APP_PASSWORD) process.env.GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;
  if (env.ADMIN_EMAIL && !process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = env.ADMIN_EMAIL;

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiDevMiddleware(),
      {
        name: 'generate-version-json',
        apply: 'build',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: JSON.stringify({
              version: '1.4.0',
              buildTime: Date.now()
            })
          });
        }
      }
    ],
    define: {
      __APP_BUILD_TIME__: JSON.stringify(Date.now()),
    },
  };
})
