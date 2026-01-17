# TASK-004: Rate Limiter Implementation

**Phase**: 1 - Foundation
**Dependencies**: TASK-001
**Verification Level**: L3 (Build)

## Objective

Implement token bucket rate limiter for external API calls.

## Implementation Steps

1. Create `/server/src/cache/rateLimiter.ts`
2. Implement token bucket algorithm for IWLS (3 req/sec)
3. Implement `acquireSlot` and `release` methods
4. Add slot queue for rate-limited requests
5. Add unit tests for rate limiting scenarios

## Files to Create

- `server/src/cache/rateLimiter.ts`
- `server/src/cache/__tests__/rateLimiter.test.ts`

## Completion Criteria

- [ ] Rate limiter enforces 3 req/sec limit for IWLS
- [ ] Queued requests are processed when slots available
- [ ] Unit tests pass for burst and sustained load

## AC References

- AC: "If the IWLS API rate limit is exceeded, then serve cached data"
- Constraint: "IWLS API rate limit: 3 requests/second"
