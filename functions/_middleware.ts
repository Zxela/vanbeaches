import type { ApiError } from '@van-beaches/shared';

interface Env {
  BEACH_CACHE: KVNamespace;
}

export class AppError extends Error {
  constructor(
    public code: ApiError['code'],
    message: string,
    public retryAfter: number | null = null,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function getStatusCode(code: ApiError['code']): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'RATE_LIMITED':
      return 429;
    case 'SERVICE_UNAVAILABLE':
      return 503;
    default:
      return 500;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const response = await context.next();

    // Add CORS headers to the response
    const newResponse = new Response(response.body, response);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newResponse.headers.set(key, value);
    }

    return newResponse;
  } catch (err) {
    const isAppError = err instanceof AppError;
    const status = isAppError ? getStatusCode(err.code) : 500;
    const message = isAppError ? err.message : 'Internal server error';

    if (!isAppError) {
      console.error('Unhandled error:', err);
    }

    return Response.json(
      {
        success: false,
        data: null,
        error: message,
        cached: false,
        cachedAt: null,
      },
      {
        status,
        headers: corsHeaders,
      },
    );
  }
};
