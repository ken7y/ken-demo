import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  console.error('Error:', err);

  res.status(500).json({
    success: false,
    error: err.message,
    ...(isDevelopment && { stack: err.stack }),
  });
}

/**
 * Not found middleware for unmatched routes
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
}
