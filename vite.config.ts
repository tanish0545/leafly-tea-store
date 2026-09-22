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
          if (urlPath === '/api/cashfree-create-order') {
            const mod = await server.ssrLoadModule('./api/cashfree-create-order.ts');
            return await mod.default(req, res);
          }
          if (urlPath === '/api/cashfree-verify') {
            const mod = await server.ssrLoadModule('./api/cashfree-verify.ts');
            return await mod.default(req, res);
          }
          if (urlPath === '/api/cashfree-webhook') {
            const mod = await server.ssrLoadModule('./api/cashfree-webhook.ts');
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
  // Populate Node process.env with server-only credentials from local .env files
  const serverEnvKeys = [
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    'ADMIN_EMAIL',
    'CASHFREE_CLIENT_ID',
    'CASHFREE_CLIENT_SECRET',
    'CASHFREE_ENV',
    'CASHFREE_API_VERSION',
    'CASHFREE_BASE_URL',
    'CASHFREE_PAYMENT_METHODS',
    'CASHFREE_UPI_APP_PRIORITY',
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_SERVICE_ACCOUNT',
    'FIREBASE_SERVICE_ACCOUNT_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS',
  ];
  for (const key of serverEnvKeys) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key];
    }
  }

  // Prevent background unhandled rejections from crashing the dev server process
  if (typeof process !== 'undefined' && typeof process.on === 'function') {
    process.on('unhandledRejection', (reason) => {
      console.warn('[Server Async Notice - Handled Rejection]:', reason instanceof Error ? reason.message : String(reason));
    });
  }

  return {
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
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
