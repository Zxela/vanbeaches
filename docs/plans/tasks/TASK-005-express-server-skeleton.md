# Task: TASK-005 Express Server Skeleton

Metadata:
- Phase: 1 - Foundation
- Dependencies: TASK-002 (Shared Types Package)
- Provides: Express server with middleware, error handling, health check
- Size: Small (4 files)
- Verification Level: L3 (Build Success) + L2 (Tests)

## Implementation Content

Create the Express server skeleton with CORS, helmet, JSON middleware, structured logging (pino), error handling middleware, and a health check endpoint. This provides the HTTP infrastructure for all API routes.

## Target Files

- [ ] `/home/zxela/workspace/server/package.json`
- [ ] `/home/zxela/workspace/server/tsconfig.json`
- [ ] `/home/zxela/workspace/server/src/index.ts`
- [ ] `/home/zxela/workspace/server/src/middleware/errorHandler.ts`
- [ ] `/home/zxela/workspace/server/src/middleware/requestLogger.ts`
- [ ] `/home/zxela/workspace/server/src/middleware/__tests__/errorHandler.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review TASK-002 deliverables (ApiError type available)
- [ ] Write failing tests for error handling middleware:
  ```typescript
  describe('errorHandler middleware', () => {
    it('transforms errors to ApiError format', () => {
      const error = new Error('Test error')
      const req = {} as Request
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response
      const next = vi.fn()

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Test error', retryAfter: null },
        data: null,
        cached: false,
        cachedAt: null
      })
    })

    it('handles 404 errors', () => {
      const error = { status: 404, message: 'Not found' }
      // ... test 404 handling
    })
  })
  ```
- [ ] Write test for health check endpoint:
  ```typescript
  describe('GET /api/health', () => {
    it('returns 200 with status', async () => {
      const response = await request(app).get('/api/health')
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status', 'ok')
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Create `/server/package.json`:
  ```json
  {
    "name": "@van-beaches/server",
    "version": "0.0.1",
    "main": "src/index.ts",
    "scripts": {
      "dev": "tsx watch src/index.ts",
      "build": "tsc",
      "start": "node dist/index.js",
      "test": "vitest"
    },
    "dependencies": {
      "express": "^4.18.2",
      "cors": "^2.8.5",
      "helmet": "^7.1.0",
      "pino": "^8.17.0",
      "pino-pretty": "^10.3.0"
    }
  }
  ```
- [ ] Create `/server/tsconfig.json` with composite: true
- [ ] Implement `/server/src/index.ts`:
  ```typescript
  import express from 'express'
  import cors from 'cors'
  import helmet from 'helmet'
  import { pinoHttp } from 'pino-http'
  import { errorHandler } from './middleware/errorHandler'

  const app = express()

  app.use(helmet())
  app.use(cors())
  app.use(express.json())
  app.use(pinoHttp())

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use(errorHandler)

  export { app }
  export function startServer(port: number = 3000) {
    return app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  }
  ```
- [ ] Implement error handling middleware with ApiError format
- [ ] Implement request logging middleware with pino
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify server starts and responds to health check
- [ ] Verify error responses follow ApiError format from Design Doc
- [ ] Verify logging outputs structured JSON
- [ ] Confirm added tests pass

## Server Interface (from Design Doc)

```typescript
// Main entry point
export function startServer(port: number): Promise<void>

// Error Response Format
interface ErrorResponse {
  success: false;
  error: {
    code: 'RATE_LIMITED' | 'API_ERROR' | 'NOT_FOUND' | 'SERVICE_UNAVAILABLE';
    message: string;
    retryAfter?: number;
  };
  data: null;
  cached: false;
  cachedAt: null;
}
```

## Completion Criteria

- [ ] Server starts and responds to health check `/api/health`
- [ ] Error responses follow ApiError format from Design Doc
- [ ] Logging outputs structured JSON (pino)
- [ ] CORS, helmet, JSON middleware configured
- [ ] Verification: L3 (Build) + L2 (Tests pass)

## AC References from Design Doc

- Component: Express Server (`/server/src/index.ts`)
- Responsibility: HTTP server setup, middleware configuration, route mounting
- Error handling: "Invalid Beach ID -> 404 response", "Cache Miss + API Fail -> 503 with retry hint"

## Notes

- Impact scope: All API routes will be mounted on this server
- Constraints: Must use pino for structured logging
- Error codes: RATE_LIMITED, API_ERROR, NOT_FOUND, SERVICE_UNAVAILABLE
- Routes will be added in subsequent tasks (Phases 2-5)
