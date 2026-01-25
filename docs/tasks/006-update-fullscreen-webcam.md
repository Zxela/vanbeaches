---
id: "006"
title: "Update FullscreenWebcam component prop types"
status: pending
depends_on: ["001"]
test_file: null
no_test_reason: "Prop type change only - existing functionality unchanged, TypeScript validates"
---

# 006: Update FullscreenWebcam component prop types

## Objective

Update the FullscreenWebcam component to require a non-null URL, since it will only be rendered when a webcam is visible.

## Acceptance Criteria

- [ ] Change `url` prop from `string | null` to required `string`
- [ ] Remove null check at start of component (parent handles visibility)
- [ ] Existing fullscreen functionality unchanged
- [ ] TypeScript compiles without errors

## Technical Notes

Current implementation:
```typescript
interface FullscreenWebcamProps {
  url: string | null;
  beachName: string;
}

export function FullscreenWebcam({ url, beachName }: FullscreenWebcamProps) {
  // ...
  if (!url) return null;
  // ...
}
```

After this task:
```typescript
interface FullscreenWebcamProps {
  url: string; // Now required
  beachName: string;
}

export function FullscreenWebcam({ url, beachName }: FullscreenWebcamProps) {
  // No null check needed - parent ensures url exists
  // ...
}
```

## Files to Modify

- `client/src/components/FullscreenWebcam.tsx`

## Verification

- Run `pnpm type-check` in client package
- Manual test: fullscreen still works when webcam is visible
