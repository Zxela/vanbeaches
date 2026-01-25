---
id: "008"
title: "Update SearchFilter to use webcamUrl instead of hasWebcam"
status: pending
depends_on: ["001", "002"]
test_file: null
no_test_reason: "Simple property rename - TypeScript validates, manual verification"
---

# 008: Update SearchFilter to use webcamUrl instead of hasWebcam

## Objective

Update the SearchFilter component to check `webcamUrl !== null` instead of the removed `hasWebcam` boolean field.

## Acceptance Criteria

- [ ] Change filter logic from `beach.hasWebcam` to `beach.webcamUrl !== null`
- [ ] Filter still correctly identifies beaches with webcams
- [ ] TypeScript compiles without errors
- [ ] Filter UI unchanged (still shows "Webcam" filter chip)

## Technical Notes

Current implementation:
```typescript
if (filters.hasWebcam && !beach.hasWebcam) return false;
```

After this task:
```typescript
if (filters.hasWebcam && beach.webcamUrl === null) return false;
```

Note: The filter key name `hasWebcam` in the FilterKey type and UI can stay the same - it describes what the user is filtering for, not the field name.

## Files to Modify

- `client/src/components/SearchFilter.tsx`

## Verification

- Run `pnpm type-check` in client package
- Manual test: Webcam filter still works on Discover page
