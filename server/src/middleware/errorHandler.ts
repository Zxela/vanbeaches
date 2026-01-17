import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '@van-beaches/shared';

export class AppError extends Error {
  constructor(
    public code: ApiError['code'],
    message: string,
    public retryAfter: number | null = null
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(getStatusCode(err.code)).json({
      success: false,
      data: null,
      error: err.message,
      cached: false,
      cachedAt: null,
    });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    data: null,
    error: 'Internal server error',
    cached: false,
    cachedAt: null,
  });
}

function getStatusCode(code: ApiError['code']): number {
  switch (code) {
    case 'NOT_FOUND': return 404;
    case 'RATE_LIMITED': return 429;
    case 'SERVICE_UNAVAILABLE': return 503;
    default: return 500;
  }
}
