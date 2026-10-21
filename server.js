import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || process.argv[2] || '5500', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4'
};

// Map of API routes to module paths
const API_ROUTES = {
  '/api/orders': './api/orders.js',
  '/api/products': './api/products.js',
  '/api/init': './api/init.js',
  '/api/auth': './api/auth.js'
};

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Safeguard against extremely large payloads (15MB for base64 images)
      if (body.length > 15 * 1024 * 1024) {
        req.destroy();
        resolve({});
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({ raw: body });
      }
    });
  });
}

function createApiResponse(res) {
  let statusCode = 200;
  return {
    setHeader: (name, value) => {
      try { res.setHeader(name, value); } catch (e) {}
    },
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          try {
            res.writeHead(statusCode, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
            });
            res.end(JSON.stringify(data));
          } catch (e) {}
        },
        end: (msg) => {
          try {
            res.writeHead(statusCode, {
              'Access-Control-Allow-Origin': '*'
            });
            res.end(msg || '');
          } catch (e) {}
        }
      };
    },
    json: (data) => {
      try {
        res.writeHead(statusCode, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        });
        res.end(JSON.stringify(data));
      } catch (e) {}
    },
    end: (msg) => {
      try {
        res.writeHead(statusCode, {
          'Access-Control-Allow-Origin': '*'
        });
        res.end(msg || '');
      } catch (e) {}
    }
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  // Handle API routes
  const matchedApiRoute = Object.keys(API_ROUTES).find(route => pathname === route || pathname.startsWith(route + '?'));
  if (matchedApiRoute) {
    try {
      const modulePath = API_ROUTES[matchedApiRoute];
      const handlerModule = await import(modulePath);
      const handler = handlerModule.default;

      const body = (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')
        ? await parseBody(req)
        : {};

      const queryObj = Object.fromEntries(parsedUrl.searchParams.entries());

      const apiReq = {
        method: req.method,
        query: queryObj,
        body,
        headers: req.headers,
        url: req.url
      };

      const apiRes = createApiResponse(res);
      await handler(apiReq, apiRes);
      return;
    } catch (apiError) {
      console.error(`[API Error] ${pathname}:`, apiError);
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify({ success: false, error: apiError.message }));
    }
  }

  // Handle Static Files
  let relativePath = (pathname === '/' || pathname === '/admin' || pathname === '/admin/')
    ? 'index.html'
    : (pathname === '/about' || pathname === '/about/')
    ? 'about.html'
    : pathname.replace(/^\/+/, '');

  let filePath = path.join(__dirname, decodeURIComponent(relativePath));

  // Security check: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback: If not found and not an API call, serve index.html for SPA routing
      if (!pathname.startsWith('/api/')) {
        const indexPath = path.join(__dirname, 'index.html');
        fs.readFile(indexPath, (indexErr, indexContent) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
          }
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          });
          return res.end(indexContent);
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function startServer(portToTry) {
  server.listen(portToTry, () => {
    console.log(`\n========================================================`);
    console.log(`🚀 Balalem.co Full-Stack Server with Neon DB active!`);
    console.log(`📡 Local URL: http://localhost:${portToTry}/`);
    console.log(`🛠️ Admin URL: http://localhost:${portToTry}/?view=admin`);
    console.log(`⚡ Connected to: Neon PostgreSQL Database`);
    console.log(`========================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${portToTry} in use, trying ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
