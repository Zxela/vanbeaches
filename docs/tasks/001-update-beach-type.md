---
id: "001"
title: "Update Beach type to remove photo fields and add showWebcam"
status: pending
depends_on: []
test_file: null
no_test_reason: "Type definitions only - TypeScript compiler validates"
---

# 001: Update Beach type to remove photo fields and add showWebcam

## Objective

Modify the Beach interface in the shared types package to remove photo-related fields and add the new `showWebcam` configuration option.

## Acceptance Criteria

- [ ] Remove `photoUrl?: string` from Beach interface
- [ ] Remove `photoCredit?: string` from Beach interface
- [ ] Remove `photoCreditUrl?: string` from Beach interface
- [ ] Remove `hasWebcam: boolean` from Beach interface (redundant)
- [ ] Add `showWebcam?: boolean` to Beach interface
- [ ] Update `isBeach` type guard if it validates removed fields
- [ ] TypeScript compiles without errors

## Technical Notes

From TECHNICAL_DESIGN.md:

```typescript
export interface Beach {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  tidalStation: string;
  weatherStation: string;
  webcamUrl: string | null;
  showWebcam?: boolean; // Must be set when webcamUrl is not null
  amenities: Amenities;
  activities: Activity[];
}
```

## Files to Modify

- `shared/src/types/beach.ts`

## Verification

- Run `pnpm type-check` to verify TypeScript compiles
- Subsequent tasks will fix type errors in beach data
