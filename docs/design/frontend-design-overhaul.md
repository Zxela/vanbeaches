# Frontend Design Overhaul - Design Document

## Overview

**Goal**: Transform Van Beaches from a functional app into a premium, Silicon Valley-quality experience that users instinctively trust and admire.

**Inspiration**: Apple Weather, Linear, Vercel Dashboard, Stripe Dashboard, Notion

---

## Current State Assessment

### Pain Points Identified

1. **Tides Visualization**
   - Basic SVG curve lacks sophistication
   - No interactivity (can't hover for exact values)
   - No smooth animations
   - Fixed time range (no zoom/pan)
   - Markers overlap at small screen sizes
   - No real-time updates or smooth transitions

2. **Design System Inconsistency**
   - SunTimesWidget uses `gray-*` colors while others use `sand-*`
   - BeachCard uses `gray-*` and `blue-*` instead of ocean/shore palette
   - Inconsistent spacing (mb-3 vs mb-4)
   - Mixed icon approaches (emojis everywhere - unprofessional)

3. **Visual Hierarchy Issues**
   - All cards look the same weight/importance
   - No clear information hierarchy
   - Dense information without breathing room
   - Headers blend with content

4. **Animation & Polish Gaps**
   - Basic skeleton loaders (just pulsing rectangles)
   - No micro-interactions
   - Abrupt state transitions
   - No entrance animations

5. **Typography**
   - Default Tailwind fonts
   - No typographic scale defined
   - Inconsistent font weights

---

## Design System Specification

### Color Palette (Enhanced)

```javascript
// Extended Material Design 3 Ocean Palette
colors: {
  // Primary action color
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Semantic colors
  tide: {
    high: '#10b981',  // Emerald for high tide
    low: '#06b6d4',   // Cyan for low tide
  },

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',

  // Surfaces (glassmorphism)
  surface: {
    primary: 'rgba(255, 255, 255, 0.85)',
    secondary: 'rgba(255, 255, 255, 0.6)',
    elevated: 'rgba(255, 255, 255, 0.95)',
  }
}
```

### Typography Scale

```css
/* Inter or SF Pro Display for headers, system-ui for body */
--font-display: 'Inter', 'SF Pro Display', system-ui;
--font-body: 'Inter', system-ui;
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;

/* Sizes with optical balance */
--text-xs: 0.75rem;    /* 12px - labels */
--text-sm: 0.875rem;   /* 14px - secondary */
--text-base: 1rem;     /* 16px - body */
--text-lg: 1.125rem;   /* 18px - emphasized */
--text-xl: 1.25rem;    /* 20px - card headers */
--text-2xl: 1.5rem;    /* 24px - section headers */
--text-3xl: 1.875rem;  /* 30px - page titles */
--text-4xl: 2.25rem;   /* 36px - hero */
--text-5xl: 3rem;      /* 48px - display */
```

### Spacing System

```css
/* 4px base unit */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Shadow System (Elevated)

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Colored shadows for depth */
--shadow-ocean: 0 4px 14px -3px rgba(0, 188, 212, 0.25);
--shadow-primary: 0 4px 14px -3px rgba(59, 130, 246, 0.25);
```

### Border Radius

```css
--radius-sm: 0.375rem;   /* 6px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px - cards */
--radius-full: 9999px;   /* pills */
```

---

## Component Redesign Specifications

### 1. TideCanvas (New - Replaces TideTimeline)

**Technology**: HTML5 Canvas with requestAnimationFrame

**Features**:
- Smooth sinusoidal tide curve (not linear interpolation)
- Real-time "now" indicator with glow effect
- Interactive: hover shows exact height at any time
- Touch-friendly on mobile
- Animated entrance (wave draws in from left)
- Gradient fill under curve with animated shimmer
- High/low markers with subtle bounce animation
- Optional: 7-day mini view with day selection

**Visual Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  Today's Tides                                    [7-day]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  5.0m ┬                            ┌─ HIGH 4.2m            │
│       │            ╱╲             ╱  @ 2:34 PM              │
│  2.5m ┼───────────╱──╲───────────╱────────────────          │
│       │          ╱    ╲         ╱                           │
│  0.0m ┴─────────╱──────╲───────╱─────────────────           │
│                          ╲   ╱                              │
│       │      ┌─ LOW 0.8m  ╲─╱                               │
│       │      @ 8:47 AM        │                             │
│       └──────────────────────────────────────────────────── │
│       12am    6am    12pm   NOW   6pm    12am               │
│                              ▲                              │
│                          ╔═══════╗                          │
│                          ║ 2.1m  ║                          │
│                          ╚═══════╝                          │
└─────────────────────────────────────────────────────────────┘
```

**Animation Specifications**:
- Curve draws in over 800ms with easeOutExpo
- Now indicator pulses subtly (opacity 0.7-1.0)
- Hover tooltip fades in 150ms
- Day selection slides with spring physics

### 2. TideForecast (Replaces TideChart)

**Design**: Horizontal scrollable cards with mini-charts

```
┌────────────────────────────────────────────────────────────┐
│  Upcoming Tides                                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ TODAY   │ │ TOMORROW│ │ WED     │ │ THU     │ →         │
│  │  ╱╲     │ │   ╱╲    │ │  ╱╲     │ │   ╱╲    │           │
│  │ ╱  ╲    │ │  ╱  ╲   │ │ ╱  ╲    │ │  ╱  ╲   │           │
│  │╱    ╲   │ │ ╱    ╲  │ │╱    ╲   │ │ ╱    ╲  │           │
│  │      ╲  │ │      ╲  │ │      ╲  │ │      ╲  │           │
│  │  H: 4.2 │ │  H: 4.0 │ │  H: 3.8 │ │  H: 4.1 │           │
│  │  L: 0.8 │ │  L: 1.0 │ │  L: 0.9 │ │  L: 0.7 │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 3. WeatherWidget (Enhanced)

**Changes**:
- Replace emoji with Lucide icons (animated)
- Add "feels like" temperature
- Animated background gradient based on condition
- Subtle particle effects (rain, sun rays, clouds)
- Wind direction as smooth rotating compass

### 4. Card Component (Base)

**Glassmorphism + Depth**:
```css
.card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  box-shadow:
    0 4px 24px -8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 32px -8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
```

### 5. Layout Header

**Redesign**:
- Sticky with blur-on-scroll effect
- Beach selector becomes command palette (Cmd+K)
- Animated logo on hover
- Notification dot for water quality alerts

### 6. Loading States

**Skeleton Redesign**:
- Shimmer animation (left-to-right gradient sweep)
- Match actual content shapes
- Staggered reveal animations

### 7. Icons (Replace Emojis)

**Library**: Lucide React

**Mappings**:
- Weather conditions: Sun, Cloud, CloudRain, CloudLightning, CloudFog
- Tide: Waves, TrendingUp, TrendingDown
- Navigation: Menu, X, ChevronDown, Search
- Actions: Heart, Share2, Maximize2
- Info: Droplets (humidity), Wind, Thermometer, AlertTriangle

---

## New Dependencies

```json
{
  "dependencies": {
    "framer-motion": "^11.x",
    "lucide-react": "^0.x",
    "@fontsource/inter": "^5.x",
    "class-variance-authority": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  }
}
```

**Rationale**:
- `framer-motion`: Production-grade animations (used by Vercel, Linear)
- `lucide-react`: Professional icon set, tree-shakeable
- `@fontsource/inter`: Variable weight Inter font
- `cva` + `clsx` + `tailwind-merge`: Robust component variant system (industry standard)

---

## Implementation Phases

### Phase 1: Foundation
1. Install dependencies
2. Configure Inter font
3. Update tailwind.config.js with design tokens
4. Create `cn()` utility function
5. Create base Card component with variants

### Phase 2: Icon System
1. Create Icon component wrapper
2. Replace all emoji icons with Lucide
3. Add hover/active states

### Phase 3: TideCanvas
1. Create Canvas rendering engine
2. Implement tide curve algorithm
3. Add interactivity layer
4. Implement animations
5. Mobile touch support

### Phase 4: Component Polish
1. WeatherWidget enhancement
2. SunTimesWidget redesign
3. WaterQuality redesign
4. BeachCard redesign

### Phase 5: Layout & Navigation
1. Header redesign with blur
2. Command palette
3. Mobile navigation redesign

### Phase 6: Animations & Micro-interactions
1. Page transitions
2. Loading states
3. Hover effects
4. Error states

### Phase 7: Final Polish
1. Performance optimization
2. Accessibility audit
3. Cross-browser testing
4. Dark mode refinement

---

## Success Criteria

1. **Visual Quality**: Screenshot-worthy at any scroll position
2. **Interactivity**: Every interactive element has feedback
3. **Performance**: 60fps animations, <100ms interaction latency
4. **Consistency**: Zero design system violations
5. **Accessibility**: WCAG 2.1 AA compliant
6. **Trust Signal**: Users should feel "this is professional software"

---

## Non-Goals

- Backend changes (except homepage API if needed)
- SEO optimization
- Internationalization

---

## NEW: Discovery Homepage

### Product Vision

**Problem**: Users currently land on a default beach (Kitsilano) with no way to discover which beach is best for them TODAY.

**Solution**: A discovery-focused homepage that helps users choose the right beach based on current conditions.

### User Flows

```
┌─────────────────────────────────────────────────────────────┐
│  NEW USER (no favorites)                                    │
│  └─> Discovery Homepage                                     │
│       └─> Browse beach cards                                │
│            └─> Click beach → Beach Detail                   │
│                 └─> Favorite it → Next visit goes there     │
├─────────────────────────────────────────────────────────────┤
│  RETURNING USER (has favorite)                              │
│  └─> Favorite Beach Detail (direct)                         │
│       └─> Can still access Discovery via nav                │
├─────────────────────────────────────────────────────────────┤
│  POWER USER (multiple favorites)                            │
│  └─> Favorite Beach Detail (primary favorite)               │
│       └─> Quick-switch between favorites in header          │
└─────────────────────────────────────────────────────────────┘
```

### Homepage Design

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Van Beaches          [Search] [Compare] [Theme] [Fav]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🌊 Find Your Perfect Beach Today                        │   │
│  │                                                          │   │
│  │  Friday, January 17 • Partly Cloudy, 12°C               │   │
│  │  High tide at 2:34 PM • Great for swimming              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ RECOMMENDED FOR YOU ────────────────────────────────────┐   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │  KITSILANO   │  │  ENGLISH BAY │  │  JERICHO     │   │   │
│  │  │  ────────    │  │  ────────    │  │  ────────    │   │   │
│  │  │  [Photo]     │  │  [Photo]     │  │  [Photo]     │   │   │
│  │  │              │  │              │  │              │   │   │
│  │  │  ☀️ 14°C     │  │  ⛅ 13°C     │  │  ☀️ 14°C     │   │   │
│  │  │  🌊 High 2pm │  │  🌊 High 2pm │  │  🌊 High 2pm │   │   │
│  │  │  ★★★★☆      │  │  ★★★★★      │  │  ★★★☆☆      │   │   │
│  │  │  Best for:   │  │  Best for:   │  │  Best for:   │   │   │
│  │  │  Swimming    │  │  Walking     │  │  Kayaking    │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ ALL BEACHES ────────────────────────────────────────────┐   │
│  │  [Filter: Activities ▼] [Sort: Best conditions ▼]        │   │
│  │                                                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
│  │  │ Beach 1  │ │ Beach 2  │ │ Beach 3  │ │ Beach 4  │    │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ [FUTURE: SPONSORED ZONE - hidden for now] ──────────────┐   │
│  │  <!-- Commercial slot: Local business recommendations -->│   │
│  │  <!-- e.g., "Grab lunch nearby: Tacofino, Rain or..." -->│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Default Logic

```typescript
// In App.tsx routing logic
function getDefaultRoute(): string {
  const favorites = getFavorites(); // from localStorage

  if (favorites.length > 0) {
    // User has favorites - go to primary favorite
    return `/beach/${favorites[0]}`;
  }

  // New user - show discovery homepage
  return '/discover';
}

// Route structure
<Routes>
  <Route path="/" element={<SmartRedirect />} />
  <Route path="/discover" element={<DiscoverPage />} />
  <Route path="/beach/:slug" element={<BeachDetail />} />
  <Route path="/compare" element={<Compare />} />
</Routes>
```

### Beach Ranking Algorithm (for "Recommended")

```typescript
interface BeachScore {
  beachId: string;
  score: number;
  reasons: string[];
}

function rankBeaches(beaches: Beach[], conditions: Conditions): BeachScore[] {
  return beaches.map(beach => {
    let score = 50; // base score
    const reasons: string[] = [];

    // Weather factors
    if (conditions.weather === 'sunny') {
      score += 20;
      reasons.push('Great weather');
    }

    // Tide factors (beaches with good swimming at current tide)
    if (beach.bestAtHighTide && conditions.isHighTide) {
      score += 15;
      reasons.push('Ideal tide for swimming');
    }

    // Water quality
    if (beach.waterQuality === 'excellent') {
      score += 10;
      reasons.push('Excellent water quality');
    }

    // Crowd factor (time of day + day of week)
    if (conditions.isWeekday && conditions.hour < 12) {
      score += 5;
      reasons.push('Less crowded now');
    }

    return { beachId: beach.id, score, reasons };
  }).sort((a, b) => b.score - a.score);
}
```

### Commercial-Ready Architecture

**Phase 1 (Now)**: Build the infrastructure, hide the UI
```typescript
// ContentSlot component - renders nothing now, ready for future
interface ContentSlotProps {
  slotId: 'homepage-hero' | 'beach-detail-sidebar' | 'search-results';
  fallback?: ReactNode;
}

function ContentSlot({ slotId, fallback }: ContentSlotProps) {
  // Future: fetch from CMS/ad server
  // const content = useContentSlot(slotId);
  // if (content) return <SponsoredContent {...content} />;

  return fallback || null; // Currently renders nothing
}
```

**Phase 2 (Future)**: Enable when ready
- Local restaurant recommendations near beaches
- Beach gear rental partners
- Event promotions (beach volleyball, etc.)
- Premium features (detailed forecasts, alerts)

**Design Principles for Future Ads**:
- Native integration (looks like content, not banner ads)
- Relevant (location + activity based)
- Non-intrusive (never block primary content)
- Clearly labeled ("Sponsored" / "Partner")
- Value-adding (recommendations user would want)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Canvas performance on low-end devices | Implement fallback SVG mode |
| Bundle size increase | Tree-shake aggressively, code-split |
| Breaking existing functionality | Comprehensive testing before/after |

---

## Appendix: Inspirational References

1. **Apple Weather**: Animated backgrounds, smooth data viz, premium feel
2. **Linear**: Clean typography, subtle animations, dark mode mastery
3. **Vercel Dashboard**: Glassmorphism, real-time updates, technical elegance
4. **Stripe Dashboard**: Information hierarchy, chart interactions
5. **Notion**: Smooth page transitions, attention to detail
