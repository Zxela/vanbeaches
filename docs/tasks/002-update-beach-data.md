---
id: "002"
title: "Update beach data to remove photo fields"
status: pending
depends_on: ["001"]
test_file: null
no_test_reason: "Configuration data only - TypeScript compiler validates shape"
---

# 002: Update beach data to remove photo fields

## Objective

Update all beach entries in the shared data file to remove photo-related fields and `hasWebcam`. Since all current beaches have `webcamUrl: null`, no `showWebcam` field needs to be added yet.

## Acceptance Criteria

- [ ] Remove `photoUrl` from all 9 beach entries
- [ ] Remove `photoCredit` from all beach entries (if present)
- [ ] Remove `photoCreditUrl` from all beach entries (if present)
- [ ] Remove `hasWebcam` from all beach entries
- [ ] TypeScript compiles without errors
- [ ] All beaches still have `webcamUrl: null` (no changes needed for showWebcam)

## Technical Notes

Current beaches all have:
```typescript
hasWebcam: false,
webcamUrl: null,
photoUrl: 'https://images.unsplash.com/...',
```

After this task:
```typescript
webcamUrl: null,
// No showWebcam needed when webcamUrl is null
```

## Files to Modify

- `shared/src/data/beaches.ts`

## Verification

- Run `pnpm type-check` to verify TypeScript compiles
- Run `pnpm build` to verify shared package builds
