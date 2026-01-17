export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  cached: boolean;
  cachedAt: string | null;
}

export interface ApiError {
  code: 'RATE_LIMITED' | 'API_ERROR' | 'NOT_FOUND' | 'SERVICE_UNAVAILABLE';
  message: string;
  retryAfter: number | null;
}

export function createSuccessResponse<T>(data: T, cached = false, cachedAt: string | null = null): ApiResponse<T> {
  return { success: true, data, error: null, cached, cachedAt };
}

export function createErrorResponse<T>(error: string): ApiResponse<T> {
  return { success: false, data: null, error, cached: false, cachedAt: null };
}
