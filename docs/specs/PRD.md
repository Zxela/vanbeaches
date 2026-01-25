# Product Requirements Document: Webcam Visibility Improvements

## Problem Statement

The current beach detail page always displays a media section, showing either a webcam feed, a stock photo, or a "Photo coming soon" placeholder. This creates several issues:

1. **Stock photos provide no value** - Generic Unsplash images don't represent actual beach conditions
2. **Placeholders waste space** - "Photo coming soon" takes up prime real estate without adding information
3. **No user control** - Users cannot hide the webcam section if they find it unhelpful or distracting
4. **Unclear data model** - The distinction between `webcamUrl`, `photoUrl`, and `hasWebcam` creates confusion

## Goals

1. **Simplify the media model** - Remove the photo feature entirely; webcams are either available or not
2. **Clean up empty states** - Hide the webcam section completely when no feed exists
3. **Give users control** - Allow users to hide/show webcams via a toggle that persists across sessions
4. **Explicit configuration** - Require explicit `showWebcam` setting for beaches with webcam URLs

## Non-Goals

- Adding new webcam sources or integrations
- Creating a photo gallery or image upload feature
- Building a settings page (toggle lives on the component itself)
- Changing the fullscreen webcam functionality beyond visibility rules

## User Stories

### US-1: Remove Photo Placeholders
**As a** beach visitor
**I want** the webcam section to only appear when there's an actual live feed
**So that** I don't see irrelevant stock photos or placeholder messages

**Acceptance Criteria:**
- Webcam section is completely hidden when `webcamUrl` is null
- No "Photo coming soon" placeholder is ever shown
- `photoUrl`, `photoCredit`, `photoCreditUrl` fields are removed from the codebase

### US-2: Hide Webcam Preference
**As a** user who doesn't care about webcams
**I want** to hide the webcam section with a button
**So that** I can focus on weather and tide information

**Acceptance Criteria:**
- A "hide" button appears on hover over the webcam component
- Clicking the button hides the webcam and shows a minimal placeholder bar
- The preference is saved to localStorage and persists across sessions
- The preference applies to all beaches (global setting)

### US-3: Show Webcam After Hiding
**As a** user who previously hid webcams
**I want** to easily restore the webcam view
**So that** I can change my mind without clearing browser data

**Acceptance Criteria:**
- A minimal bar appears where the webcam was, with an icon and "Show webcam" text
- Clicking the bar restores the webcam view
- The preference update persists to localStorage

### US-4: Per-Beach Webcam Configuration
**As a** developer configuring beaches
**I want** explicit control over which webcams are displayed
**So that** I can disable broken or low-quality webcam feeds

**Acceptance Criteria:**
- Beaches with `webcamUrl` must have an explicit `showWebcam: boolean` property
- TypeScript enforces this at compile time
- `showWebcam: false` hides the webcam even when URL exists
- User preference to hide overrides `showWebcam: true` (user always wins)

### US-5: Fullscreen Follows Visibility
**As a** user
**I want** the fullscreen button to only appear when the webcam is visible
**So that** I don't see a broken or confusing UI state

**Acceptance Criteria:**
- Fullscreen button only renders when webcam section is visible
- Fullscreen modal is not accessible when webcams are hidden

## Success Metrics

- Reduced component complexity (fewer props, cleaner logic)
- No visual regressions for beaches with active webcams
- Preference persistence works correctly across browser sessions
