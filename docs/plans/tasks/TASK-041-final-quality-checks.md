# Task: TASK-041 Final Quality Checks

Metadata:
- Phase: 7 - Quality Assurance
- Dependencies: All phases
- Provides: Final quality verification before release
- Size: N/A (Verification only)
- Verification Level: L3 (Build Success)

## Implementation Content

Run all quality checks including Biome lint/format, TypeScript type-check, production build, all tests, security audit, bundle size analysis, and Lighthouse audit. This is the final verification before the project is considered complete.

## Quality Check Commands

### 1. Lint and Format Check

```bash
# Run Biome lint and format check
pnpm -r check

# Expected: No lint errors, no format issues
```

### 2. TypeScript Type Check

```bash
# Run TypeScript type check
pnpm -r type-check

# Expected: No type errors
```

### 3. Production Build

```bash
# Build all packages for production
pnpm -r build

# Expected: Build succeeds without errors
```

### 4. Test Suite

```bash
# Run all tests
pnpm -r test

# Expected: All tests pass
# Expected: Coverage >= 80%
```

### 5. Security Audit

```bash
# Run security audit
pnpm audit

# Expected: No critical vulnerabilities
# Expected: No high vulnerabilities
```

### 6. Bundle Size Analysis

```bash
# Analyze client bundle size
cd /home/zxela/workspace/client
pnpm build
npx vite-bundle-analyzer

# Expected: Main bundle < 200KB (gzipped)
# Expected: Vendor bundle < 100KB (gzipped)
```

### 7. Lighthouse Audit

```bash
# Start production server
cd /home/zxela/workspace
pnpm -r build
pnpm -r start &

# Run Lighthouse audit
npx lighthouse http://localhost:3000 --view

# Expected Scores:
# Performance: >= 90
# Accessibility: >= 90
# Best Practices: >= 90
# SEO: >= 90
```

## Quality Gates

### Required (Must Pass)

| Check | Criteria | Status |
|-------|----------|--------|
| Lint | No errors | [ ] |
| Type Check | No errors | [ ] |
| Build | Succeeds | [ ] |
| Tests | All pass | [ ] |
| Coverage | >= 80% | [ ] |
| Security | No critical/high | [ ] |

### Recommended (Should Pass)

| Check | Criteria | Status |
|-------|----------|--------|
| Lighthouse Performance | >= 90 | [ ] |
| Lighthouse Accessibility | >= 90 | [ ] |
| Lighthouse Best Practices | >= 90 | [ ] |
| Bundle Size | < 300KB total | [ ] |

## Verification Steps

### Step 1: Run All Quality Checks
```bash
cd /home/zxela/workspace

# Run all checks in sequence
pnpm -r check && \
pnpm -r type-check && \
pnpm -r build && \
pnpm -r test && \
pnpm audit
```

### Step 2: Document Results
Record the output of each check:

- Lint errors: ___
- Type errors: ___
- Build status: ___
- Test results: ___ passed, ___ failed
- Coverage: ___%
- Security vulnerabilities: ___

### Step 3: Address Any Issues
If any checks fail:
1. Fix the issue
2. Re-run the affected check
3. Verify all checks pass

### Step 4: Generate Final Report
```bash
# Generate coverage report
pnpm -r test -- --coverage --reporter=html

# Generate bundle analysis
cd client && npx vite-bundle-visualizer

# Generate Lighthouse report
npx lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html
```

## Completion Criteria

- [ ] No lint errors
- [ ] No type errors
- [ ] Build succeeds
- [ ] All tests pass
- [ ] Coverage >= 80%
- [ ] No critical security vulnerabilities
- [ ] Lighthouse performance score >= 90
- [ ] Bundle size acceptable

## AC References from Design Doc

- Quality Gate: "No lint errors"
- Quality Gate: "No type errors"
- Quality Gate: "Build succeeds"
- Quality Gate: "All tests pass"
- Quality Gate: "Lighthouse performance score >= 90"
- Quality Gate: "Security audit clean"

## Notes

- This is the final quality gate before release
- All checks must pass for release
- Document any accepted exceptions with reasoning
- Keep evidence of passing checks
