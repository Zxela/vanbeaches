---
id: "004"
title: "Create WebcamPlaceholder component"
status: pending
depends_on: []
test_file: "client/src/components/WebcamPlaceholder.test.tsx"
---

# 004: Create WebcamPlaceholder component

## Objective

Create a new minimal placeholder component that appears when the user has hidden the webcam. Clicking it restores the webcam view.

## Acceptance Criteria

- [ ] Component renders a thin bar (~40px height)
- [ ] Shows camera/video icon and "Show webcam" text
- [ ] Muted styling: `bg-sand-100 dark:bg-sand-800`, `text-sand-500`
- [ ] Hover state: slightly darker background
- [ ] Click anywhere on bar triggers `onShow` callback
- [ ] Rounded corners matching other cards (`rounded-xl`)
- [ ] Accessible: proper button semantics or clickable role

## Technical Notes

From WIREFRAMES.md:

```
┌────────────────────────────────────────────────────────────────┐
│  📹  Show webcam                                                │
└────────────────────────────────────────────────────────────────┘

Bar specs:
- Height: h-10 (~40px)
- Background: bg-sand-100 dark:bg-sand-800
- Text: text-sand-500 dark:text-sand-400
- Icon: Video from Lucide
- Border radius: rounded-xl (match other cards)
- Cursor: pointer
- Hover: bg-sand-200 dark:bg-sand-700
- Flexbox: items-center justify-center gap-2
```

## Files to Create

- `client/src/components/WebcamPlaceholder.tsx`
- `client/src/components/WebcamPlaceholder.test.tsx`

## Test Requirements

- Renders with correct text "Show webcam"
- Renders camera/video icon
- Calls `onShow` when clicked
- Has correct accessibility attributes
