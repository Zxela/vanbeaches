# Task: TASK-040 Coverage Target Achievement

Metadata:
- Phase: 7 - Quality Assurance
- Dependencies: All phases
- Provides: Test coverage analysis and gap filling
- Size: Variable (depends on gaps)
- Verification Level: L2 (Tests)

## Implementation Content

Review coverage reports, identify uncovered code paths, add tests to achieve the 80% coverage target (minimum 70% per technical-spec). Ensure critical paths have 100% coverage: Cache Manager, Rate Limiter, API Routes, and data transformation functions.

## Target Files

- [ ] Coverage reports
- [ ] Additional test files as needed to fill gaps

## Implementation Steps

### 1. Generate Coverage Report

```bash
# Generate coverage for all packages
cd /home/zxela/workspace
pnpm -r test -- --coverage

# Generate detailed HTML report
pnpm -r test -- --coverage --reporter=html
```

### 2. Analyze Coverage Gaps

Review coverage report and identify:
- Files with < 70% coverage (must fix)
- Files with < 80% coverage (should fix)
- Uncovered error handling paths
- Uncovered edge cases

### 3. Critical Path Coverage (Must be 100%)

#### Cache Manager
- [ ] `get()` - all branches covered
- [ ] `set()` - TTL setting, LRU eviction
- [ ] `getOrFetch()` - cache hit, cache miss, coalescing
- [ ] `clear()` - key removal
- [ ] `getStats()` - statistics calculation
- [ ] Error handling paths

#### Rate Limiter
- [ ] `acquireSlot()` - allow, deny, token replenishment
- [ ] `acquireSlotWithWait()` - queue, timeout
- [ ] `release()` - slot release
- [ ] Edge cases: bucket empty, max queue

#### API Routes
- [ ] Success responses
- [ ] 404 responses (invalid beach ID)
- [ ] 500 responses (service errors)
- [ ] Cached response metadata
- [ ] Trout Lake special case (tides)

#### Data Transformation Functions
- [ ] Weather condition mapping
- [ ] Tide type determination (high/low)
- [ ] Water quality HTML parsing
- [ ] Date/time formatting
- [ ] Temperature precision

### 4. Fill Coverage Gaps

Add tests for any uncovered paths:

```typescript
// Example: Add missing error handling test
describe('WeatherService', () => {
  it('handles timeout errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Timeout'))

    await expect(
      weatherService.getWeatherForecast(49.2867, -123.1432)
    ).rejects.toThrow()
  })
})
```

### 5. Verify Coverage Targets

```bash
# Run coverage and verify targets
pnpm -r test -- --coverage

# Expected output:
# Statements: >= 80%
# Branches: >= 80%
# Functions: >= 80%
# Lines: >= 80%
```

## Coverage Targets

| Module | Target | Critical |
|--------|--------|----------|
| Cache Manager | 100% | Yes |
| Rate Limiter | 100% | Yes |
| API Routes | 100% | Yes |
| Data Transformers | 100% | Yes |
| Services | >= 80% | No |
| Components | >= 70% | No |
| Hooks | >= 70% | No |
| Overall | >= 80% | - |

## Completion Criteria

- [ ] Overall coverage >= 80%
- [ ] Critical path coverage = 100%
- [ ] No untested error handling paths
- [ ] No untested edge cases in critical modules
- [ ] Coverage report generated and reviewed
- [ ] Verification: L2 (Tests)

## AC References from Design Doc

- Test Strategy: "Coverage Goal: 80% statement coverage"
- Quality Gate: "Coverage >= 80%"
- Critical paths must have 100% coverage

## Notes

- Focus on critical paths first
- Don't write tests just for coverage numbers
- Test meaningful behaviors, not implementation details
- Edge cases are often missed - look for boundary conditions
