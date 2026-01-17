# Task: TASK-035 Performance Optimization

Metadata:
- Phase: 6 - Optimization
- Dependencies: All previous phases
- Provides: Response compression, ETags, code splitting, performance monitoring
- Size: Medium (Multiple files)
- Verification Level: L2 (Tests)

## Implementation Content

Implement performance optimizations including response compression (gzip), ETags for conditional requests, client bundle code splitting, image optimization for weather icons, and performance monitoring endpoints. Target: Initial page load < 3 seconds, data refresh < 1 second.

## Target Files

- [ ] `/home/zxela/workspace/server/src/middleware/compression.ts`
- [ ] `/home/zxela/workspace/server/src/middleware/etag.ts`
- [ ] `/home/zxela/workspace/client/vite.config.ts` (update for code splitting)
- [ ] `/home/zxela/workspace/server/src/routes/metricsRoute.ts`
- [ ] `/home/zxela/workspace/server/src/middleware/__tests__/compression.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables: All previous phases complete
- [ ] Write failing tests for performance optimizations:
  ```typescript
  describe('Compression Middleware', () => {
    it('compresses JSON responses', async () => {
      const response = await request(app)
        .get('/api/beaches')
        .set('Accept-Encoding', 'gzip')

      expect(response.headers['content-encoding']).toBe('gzip')
    })

    it('does not compress small responses', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Accept-Encoding', 'gzip')

      expect(response.headers['content-encoding']).toBeUndefined()
    })
  })

  describe('ETag Middleware', () => {
    it('returns ETag header', async () => {
      const response = await request(app).get('/api/beaches')

      expect(response.headers['etag']).toBeDefined()
    })

    it('returns 304 for matching ETag', async () => {
      const response1 = await request(app).get('/api/beaches')
      const etag = response1.headers['etag']

      const response2 = await request(app)
        .get('/api/beaches')
        .set('If-None-Match', etag)

      expect(response2.status).toBe(304)
    })
  })

  describe('Performance Metrics', () => {
    it('returns request latency metrics', async () => {
      const response = await request(app).get('/api/metrics')

      expect(response.body).toHaveProperty('requestLatency')
    })

    it('returns cache hit rate', async () => {
      const response = await request(app).get('/api/metrics')

      expect(response.body).toHaveProperty('cacheHitRate')
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement compression middleware:
  ```typescript
  import compression from 'compression'

  export const compressionMiddleware = compression({
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false
      }
      return compression.filter(req, res)
    }
  })
  ```
- [ ] Implement ETag middleware:
  ```typescript
  import etag from 'etag'
  import fresh from 'fresh'

  export function etagMiddleware(req, res, next) {
    const originalJson = res.json.bind(res)

    res.json = function(body) {
      const bodyString = JSON.stringify(body)
      const etagValue = etag(bodyString)

      res.setHeader('ETag', etagValue)

      if (fresh(req.headers, { etag: etagValue })) {
        return res.status(304).end()
      }

      return originalJson(body)
    }

    next()
  }
  ```
- [ ] Update Vite config for code splitting:
  ```typescript
  // vite.config.ts
  export default defineConfig({
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-utils': ['date-fns', 'lodash-es']
          }
        }
      }
    }
  })
  ```
- [ ] Implement metrics endpoint:
  ```typescript
  router.get('/metrics', (req, res) => {
    const metrics = {
      requestLatency: {
        p50: getPercentile(50),
        p95: getPercentile(95),
        p99: getPercentile(99)
      },
      cacheHitRate: cacheManager.getStats().hitRate,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
    res.json(metrics)
  })
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify initial page load < 3 seconds
- [ ] Verify data refresh < 1 second
- [ ] Verify bundle size optimized
- [ ] Run load tests to verify performance
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Response compression enabled (gzip)
- [ ] ETags for conditional requests
- [ ] Client bundle code splitting configured
- [ ] Performance monitoring endpoint available
- [ ] Initial page load < 3 seconds (AC)
- [ ] Data refresh < 1 second (AC)
- [ ] Verification: L2 (Tests)

## AC References from Design Doc

- AC: "Initial page load < 3 seconds"
- AC: "Data refresh < 1 second"
- Non-Functional: "Performance: Initial page load < 3 seconds, data refresh < 1 second"
- Metrics: "Request latency percentiles (p50, p95, p99)"

## Notes

- Impact scope: All API endpoints and client bundle
- Constraints: Compression threshold of 1KB to avoid overhead on small responses
- ETags reduce bandwidth for unchanged data
- Code splitting improves initial load time
