# Technical Design: Webcam Visibility Improvements

## Architecture Overview

This feature touches three layers:
1. **Shared types and data** - Remove photo fields, update Beach interface
2. **Client hooks** - New `useWebcamPreference` hook for localStorage
3. **Client components** - Update WebcamEmbed, FullscreenWebcam, BeachDetail

```
┌─────────────────────────────────────────────────────────────┐
│                        BeachDetail                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Visibility Logic                        │   │
│  │  webcamUrl && showWebcam && !userHidden → WebcamEmbed│   │
│  │  webcamUrl && showWebcam && userHidden → Placeholder │   │
│  │  !webcamUrl || !showWebcam → nothing                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│         ┌─────────────────┴─────────────────┐              │
│         ▼                                   ▼              │
│  ┌─────────────┐                   ┌─────────────────┐     │
│  │ WebcamEmbed │                   │ WebcamPlaceholder│     │
│  │ + hide btn  │                   │ "Show webcam"   │     │
│  └─────────────┘                   └─────────────────┘     │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────┐                                       │
│  │ FullscreenWebcam│ (only when WebcamEmbed visible)       │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### Beach Type (shared/src/types/beach.ts)

```typescript
// Remove these fields:
// - photoUrl?: string
// - photoCredit?: string
// - photoCreditUrl?: string
// - hasWebcam: boolean (redundant with webcamUrl check)

// Updated interface:
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

### Beach Data (shared/src/data/beaches.ts)

Update all beach entries:
- Remove `photoUrl`, `photoCredit`, `photoCreditUrl`
- Remove `hasWebcam` (derive from `webcamUrl !== null`)
- For beaches with `webcamUrl`: add explicit `showWebcam: true` or `showWebcam: false`

### User Preference (localStorage)

```typescript
interface WebcamPreference {
  key: 'van-beaches:webcam-hidden';
  value: boolean; // true = hidden, false = shown
  default: false; // show by default
}
```

## Component Changes

### WebcamEmbed (client/src/components/WebcamEmbed.tsx)

**Props (simplified):**
```typescript
interface WebcamEmbedProps {
  url: string; // Now required (only rendered when exists)
  beachName: string;
  onHide: () => void; // Callback when user clicks hide
}
```

**Changes:**
- Remove `photoUrl`, `photoCredit`, `photoCreditUrl` props
- Remove photo fallback logic
- Remove "Photo coming soon" placeholder
- Add hover state for hide button
- Add hide button (camera-off icon + "Hide")

**Hide button design:**
```
┌────────────────────────────────────────┐
│                                   [X]  │  ← Appears on hover
│         Webcam Image/Iframe            │     Small, semi-transparent
│                                        │     Position: top-right
└────────────────────────────────────────┘
```

### WebcamPlaceholder (new component)

**Location:** `client/src/components/WebcamPlaceholder.tsx`

**Props:**
```typescript
interface WebcamPlaceholderProps {
  onShow: () => void; // Callback when user clicks show
}
```

**Design:**
```
┌────────────────────────────────────────┐
│  [camera icon]  Show webcam            │  ← Subtle, clickable bar
└────────────────────────────────────────┘
Height: ~40px
Background: muted (gray-100 dark:gray-800)
Text: muted (gray-500)
Hover: slightly darker background
```

### useWebcamPreference Hook (new)

**Location:** `client/src/hooks/useWebcamPreference.ts`

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

### BeachDetail (client/src/pages/BeachDetail.tsx)

**Changes:**
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

### FullscreenWebcam (client/src/components/FullscreenWebcam.tsx)

**Changes:**
- Remove photo-related logic (already minimal)
- Update prop type: `url` becomes required `string` (not `string | null`)
- Component only renders when parent decides to show it

### SearchFilter (client/src/components/SearchFilter.tsx)

**Changes:**
- Update `hasWebcam` filter logic to check `webcamUrl !== null && showWebcam === true`
- Or simplify to just `webcamUrl !== null` since `showWebcam` controls display, not existence

## Files to Modify

| File | Action |
|------|--------|
| `shared/src/types/beach.ts` | Remove photo fields, remove hasWebcam, add showWebcam |
| `shared/src/data/beaches.ts` | Remove photo data from all entries, remove hasWebcam |
| `client/src/hooks/useWebcamPreference.ts` | **Create new** |
| `client/src/components/WebcamEmbed.tsx` | Simplify props, add hide button |
| `client/src/components/WebcamPlaceholder.tsx` | **Create new** |
| `client/src/components/FullscreenWebcam.tsx` | Update prop types |
| `client/src/pages/BeachDetail.tsx` | Add visibility logic, use new hook |
| `client/src/components/SearchFilter.tsx` | Update filter logic |

## Testing Strategy

### Unit Tests
- `useWebcamPreference` hook: test localStorage read/write, state changes
- Visibility logic: test all combinations of webcamUrl/showWebcam/userPref

### Integration Tests
- BeachDetail renders WebcamEmbed when all conditions met
- BeachDetail renders placeholder when user hidden
- BeachDetail renders nothing when no webcam
- Hide/show flow works end-to-end

### Manual Testing
- Verify localStorage persists across page refresh
- Verify hide button appears on hover
- Verify placeholder is minimal and clickable
- Test on mobile (touch instead of hover)

## Security Considerations

- localStorage is same-origin only (safe)
- No user input is processed (just boolean toggle)
- Webcam URLs are from trusted configuration

## Migration Notes

Since all current beaches have `hasWebcam: false` and `webcamUrl: null`, this change has no visible impact on production until real webcam URLs are added. The migration is additive for future webcams.
