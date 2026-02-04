import { Router, Request, Response } from 'express';

const router: Router = Router();

// In-memory set of connected SSE clients. webhook.ts pushes events through here.
const clients = new Set<Response>();

/** Push a named event to every connected SSE client. */
export function pushToClients(eventName: string, data: unknown): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

/**
 * GET /api/events
 * Server-Sent Events (SSE) endpoint.
 *
 * The frontend connects here to receive real-time transcript and participant
 * events as they arrive via the /api/webhook endpoint.
 */
router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Send headers immediately so the browser establishes the SSE connection

  clients.add(res);

  // Keep-alive heartbeat so the connection doesn't time out
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

export { router as eventsRoutes };
