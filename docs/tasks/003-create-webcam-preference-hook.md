---
id: "003"
title: "Create useWebcamPreference hook for localStorage persistence"
status: pending
depends_on: []
test_file: "client/src/hooks/useWebcamPreference.test.ts"
---

# 003: Create useWebcamPreference hook for localStorage persistence

## Objective

Create a new React hook that manages the user's webcam visibility preference, persisting it to localStorage.

## Acceptance Criteria

- [ ] Hook returns `{ isHidden, hide, show, toggle }` interface
- [ ] Initial state reads from localStorage key `van-beaches:webcam-hidden`
- [ ] `hide()` sets localStorage to 'true' and updates state
- [ ] `show()` sets localStorage to 'false' and updates state
- [ ] `toggle()` switches between hidden/shown states
- [ ] Default value is `false` (webcams shown by default)
- [ ] Hook handles missing localStorage gracefully

## Technical Notes

From TECHNICAL_DESIGN.md:

```typescript
export function useWebcamPreference(): {
  isHidden: boolean;
  hide: () => void;
  show: () => void;
  toggle: () => void;
} {
  const [isHidden, setIsHidden] = useState(() => {
    const stored = localStorage.getItem('van-beaches:webcam-hidden');
    return stored === 'true';
  });

  const hide = useCallback(() => {
    localStorage.setItem('van-beaches:webcam-hidden', 'true');
    setIsHidden(true);
  }, []);

  const show = useCallback(() => {
    localStorage.setItem('van-beaches:webcam-hidden', 'false');
    setIsHidden(false);
  }, []);

  const toggle = useCallback(() => {
    isHidden ? show() : hide();
  }, [isHidden, hide, show]);

  return { isHidden, hide, show, toggle };
}
```

## Files to Create

- `client/src/hooks/useWebcamPreference.ts`
- `client/src/hooks/useWebcamPreference.test.ts`

## Test Requirements

Create unit tests that verify:
- Initial state is `false` when localStorage is empty
- Initial state is `true` when localStorage has 'true'
- Initial state is `false` when localStorage has 'false'
- `hide()` updates state and localStorage
- `show()` updates state and localStorage
- `toggle()` switches state correctly
