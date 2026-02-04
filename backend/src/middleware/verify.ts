import { Request, Response, NextFunction } from 'express';

/**
 * Webhook signature verification middleware.
 * Skipped for development/interview demo.
 */
export function verifyWebhook(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
