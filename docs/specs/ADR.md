# Architecture Decision Record: Webcam Visibility System

## Status

Proposed

## Context

The beach app currently has a complex media display system with multiple fallback layers:
1. `webcamUrl` - Live webcam feed (iframe or image)
2. `photoUrl` - Static photo (currently Unsplash stock images)
3. Placeholder - "Photo coming soon" message

This creates confusion in the data model and displays unhelpful content when real webcam feeds aren't available. We need to simplify this to show webcams only when they exist, and give users control over visibility.

## Decision Drivers

- **Simplicity**: Remove unused/unhelpful features (stock photos)
- **User control**: Allow hiding webcams without settings page
- **Data integrity**: Make webcam configuration explicit and type-safe
- **Consistency**: Single source of truth for visibility logic

## Options Considered

### Option 1: Keep Photo Fallback, Add Hide Toggle
Keep the photo system but add a user toggle to hide the entire media section.

**Pros:**
- Less breaking change
- Photos could be useful if sourced properly later

**Cons:**
- Maintains complexity
- Stock photos provide no value currently
- More props to manage

### Option 2: Remove Photos, Conditional Rendering (Selected)
Remove photo feature entirely. Webcam section only renders when `webcamUrl` exists AND `showWebcam` is true AND user hasn't hidden it.

**Pros:**
- Dramatically simpler component
- Clean data model
- Clear visibility hierarchy
- Easy to add photos back later if needed

**Cons:**
- Breaking change to Beach type
- Need to update all beach data

### Option 3: Feature Flag System
Add a comprehensive feature flag system for all optional components.

**Pros:**
- Maximum flexibility
- Could apply to other features

**Cons:**
- Over-engineered for this use case
- Adds infrastructure complexity

## Decision

**Option 2: Remove Photos, Conditional Rendering**

The visibility hierarchy will be:
1. Does `webcamUrl` exist? If no → hide entirely
2. Is `showWebcam` set to true? If no → hide entirely
3. Has user chosen to hide webcams? If yes → show minimal placeholder bar

## Consequences

### Positive
- Cleaner Beach type (remove 3 optional fields)
- Simpler WebcamEmbed component (fewer props)
- Explicit webcam configuration prevents accidental display of broken feeds
- User preference system is reusable for future features

### Negative
- Must update shared types (breaking change)
- Must update all beach data entries
- Need new localStorage key for preference

### Neutral
- FullscreenWebcam component logic unchanged, just conditional rendering
- SearchFilter's `hasWebcam` filter remains valid (checks `webcamUrl` existence)

## Technical Approach

### Data Model Changes
```typescript
// Before
interface Beach {
  hasWebcam: boolean;
  webcamUrl: string | null;
  photoUrl?: string;
  photoCredit?: string;
  photoCreditUrl?: string;
}

// After
interface Beach {
  webcamUrl: string | null;
  showWebcam?: boolean; // Required when webcamUrl is not null
}
```

### User Preference Storage
```typescript
const WEBCAM_PREF_KEY = 'van-beaches:webcam-hidden';
// Value: 'true' | 'false' | undefined (show by default)
```

### Component Visibility Logic
```typescript
const shouldShowWebcam =
  beach.webcamUrl !== null &&
  beach.showWebcam === true &&
  !userHiddenPreference;

const shouldShowPlaceholder =
  beach.webcamUrl !== null &&
  beach.showWebcam === true &&
  userHiddenPreference;
```
