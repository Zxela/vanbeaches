---
id: "005"
title: "Update WebcamEmbed component to remove photo support and add hide button"
status: pending
depends_on: ["001", "002"]
test_file: "client/src/components/WebcamEmbed.test.tsx"
---

# 005: Update WebcamEmbed component to remove photo support and add hide button

## Objective

Simplify the WebcamEmbed component by removing photo fallback logic and adding a hide button that appears on hover.

## Acceptance Criteria

- [ ] Remove `photoUrl` prop
- [ ] Remove `photoCredit` prop
- [ ] Remove `photoCreditUrl` prop
- [ ] Change `url` prop from `string | null` to required `string`
- [ ] Add `onHide` callback prop
- [ ] Remove "Photo coming soon" placeholder (component won't render without URL)
- [ ] Remove photo credit display logic
- [ ] Add hide button that appears on hover (top-right, left of fullscreen button position)
- [ ] Hide button: semi-transparent bg-black/50, camera-off or X icon, "Hide" text
- [ ] Hide button visible by default on mobile (touch devices)

## Technical Notes

From TECHNICAL_DESIGN.md - new props interface:

```typescript
interface WebcamEmbedProps {
  url: string; // Now required (only rendered when exists)
  beachName: string;
  onHide: () => void; // Callback when user clicks hide
}
```

Hide button design from WIREFRAMES.md:
- Position: absolute top-3 right-12 (left of fullscreen button)
- Background: bg-black/50 hover:bg-black/70
- Text color: white
- Border radius: rounded-lg
- Padding: p-2
- Fade in on hover (opacity transition 150ms)

## Files to Modify

- `client/src/components/WebcamEmbed.tsx`

## Files to Create

- `client/src/components/WebcamEmbed.test.tsx` (if doesn't exist)

## Test Requirements

- Renders webcam image/iframe with given URL
- Hide button appears on hover (or always on mobile)
- Hide button calls `onHide` when clicked
- No photo-related elements rendered
