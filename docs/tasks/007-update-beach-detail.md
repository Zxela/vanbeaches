---
id: "007"
title: "Update BeachDetail page with webcam visibility logic"
status: pending
depends_on: ["003", "004", "005", "006"]
test_file: "client/src/pages/BeachDetail.test.tsx"
---

# 007: Update BeachDetail page with webcam visibility logic

## Objective

Integrate the webcam visibility logic into BeachDetail, orchestrating when to show the webcam, placeholder, or nothing.

## Acceptance Criteria

- [ ] Import and use `useWebcamPreference` hook
- [ ] Import `WebcamPlaceholder` component
- [ ] Implement visibility logic:
  - Show WebcamEmbed when: `webcamUrl !== null && showWebcam === true && !isHidden`
  - Show WebcamPlaceholder when: `webcamUrl !== null && showWebcam === true && isHidden`
  - Show nothing when: `webcamUrl === null || showWebcam !== true`
- [ ] Pass `onHide` callback to WebcamEmbed
- [ ] Pass `onShow` callback to WebcamPlaceholder
- [ ] FullscreenWebcam only rendered alongside WebcamEmbed
- [ ] Remove photoUrl/photoCredit props from WebcamEmbed call

## Technical Notes

From TECHNICAL_DESIGN.md:

```typescript
const { isHidden, hide, show } = useWebcamPreference();

// Visibility logic
const hasWebcam = beach.webcamUrl !== null && beach.showWebcam === true;
const showWebcamEmbed = hasWebcam && !isHidden;
const showPlaceholder = hasWebcam && isHidden;

// In JSX:
{showWebcamEmbed && (
  <div className="relative">
    <WebcamEmbed url={beach.webcamUrl!} beachName={beach.name} onHide={hide} />
    <FullscreenWebcam url={beach.webcamUrl!} beachName={beach.name} />
  </div>
)}
{showPlaceholder && (
  <WebcamPlaceholder onShow={show} />
)}
```

## Files to Modify

- `client/src/pages/BeachDetail.tsx`

## Files to Create

- `client/src/pages/BeachDetail.test.tsx` (if doesn't exist)

## Test Requirements

- Renders nothing when beach has no webcamUrl
- Renders nothing when beach has `showWebcam: false`
- Renders WebcamEmbed when webcam available and user hasn't hidden
- Renders WebcamPlaceholder when user has hidden webcams
- Hide/show flow works correctly
