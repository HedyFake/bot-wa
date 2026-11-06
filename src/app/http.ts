import { createServer, type Server } from 'node:http';
import type { HealthReport } from './health.js';

/**
 * Endpoint /health/live dan /health/ready — bind ke localhost (lihat HEALTH_HOST).
 * Status untuk user tetap via `.status` di WhatsApp; endpoint ini untuk operator/systemd.
 */
export function startHealthServer(opts: {
  host: string;
  port: number;
  ready: () => Promise<HealthReport>;
}): Server {
  const server = createServer((req, res) => {
    const send = (code: number, body: unknown) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'GET') return send(405, { error: 'method_not_allowed' });
    if (req.url === '/health/live') return send(200, { status: 'ok' });
    if (req.url === '/health/ready') {
      opts.ready()
        .then((r) => send(r.status === 'down' ? 503 : 200, r))
        .catch(() => send(503, { status: 'down' }));
      return;
    }
    send(404, { error: 'not_found' });
  });
  server.listen(opts.port, opts.host);
  return server;
}
