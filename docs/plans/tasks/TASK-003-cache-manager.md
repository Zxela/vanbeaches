# TASK-003: Cache Manager Implementation

**Phase**: 1 - Foundation
**Dependencies**: TASK-002
**Verification Level**: L3 (Build)

## Objective

Implement in-memory caching with TTL, LRU eviction, and request coalescing.

## Implementation Steps

1. Create `/server/src/cache/cacheManager.ts`
2. Implement in-memory Map with TTL tracking
3. Implement LRU eviction (max 1000 entries)
4. Implement `getOrFetch` with request coalescing
5. Implement cache statistics tracking
6. Add unit tests for TTL expiration, LRU eviction, coalescing

## Files to Create

- `server/src/cache/cacheManager.ts`
- `server/src/cache/__tests__/cacheManager.test.ts`

## Completion Criteria

- [ ] All interfaces from Design Doc "Cache Manager" section implemented
- [ ] Unit tests cover TTL, LRU, coalescing scenarios
- [ ] Coverage >= 80% for cache module

## AC References

- AC: "The server shall cache all external API responses"
- Property: `weatherCache.ttl === 1800000` (30 minutes)
- Property: `waterQualityCache.ttl === 21600000` (6 hours)
