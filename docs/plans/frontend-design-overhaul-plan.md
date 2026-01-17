# Work Plan: Frontend Design Overhaul

**Design Doc**: `docs/design/frontend-design-overhaul.md`
**Priority**: High
**Scope**: Complete frontend redesign with Silicon Valley aesthetic

---

## Phase 1: Foundation Setup

### TASK-001: Install Premium Dependencies
**Scope**: Add core libraries for professional UI
**Files**: `client/package.json`
**Changes**:
- Add framer-motion for animations
- Add lucide-react for professional icons
- Add @fontsource/inter for typography
- Add class-variance-authority, clsx, tailwind-merge for component variants

### TASK-002: Configure Design Tokens
**Scope**: Update Tailwind with comprehensive design system
**Files**: `client/tailwind.config.js`, `client/src/index.css`
**Changes**:
- Add Inter font family
- Extend color palette with semantic colors
- Add shadow system (colored shadows)
- Add animation keyframes
- Define CSS custom properties for design tokens

### TASK-003: Create Utility Functions
**Scope**: Create component composition utilities
**Files**: `client/src/lib/utils.ts` (new)
**Changes**:
- Create `cn()` function (clsx + tailwind-merge)
- Export type utilities

---

## Phase 2: Base Components

### TASK-004: Create Card Component with Variants
**Scope**: Base card with glassmorphism, elevation variants
**Files**: `client/src/components/ui/Card.tsx` (new)
**Changes**:
- Implement Card, CardHeader, CardContent, CardFooter
- Add variants: default, elevated, interactive
- Glassmorphism styling with backdrop-blur
- Hover animations

### TASK-005: Create Icon Component Wrapper
**Scope**: Consistent icon rendering with Lucide
**Files**: `client/src/components/ui/Icon.tsx` (new)
**Changes**:
- Create Icon wrapper for Lucide icons
- Size variants (sm, md, lg)
- Color variants
- Animation support

### TASK-006: Create Skeleton Loader Components
**Scope**: Premium shimmer loading states
**Files**: `client/src/components/ui/Skeleton.tsx` (new)
**Changes**:
- Shimmer animation (not just pulse)
- Skeleton.Text, Skeleton.Circle, Skeleton.Card variants
- Staggered animation support

---

## Phase 3: TideCanvas (Core Feature)

### TASK-007: Create TideCanvas Rendering Engine
**Scope**: HTML5 Canvas tide visualization
**Files**: `client/src/components/TideCanvas.tsx` (new)
**Changes**:
- Canvas setup with proper DPI handling
- Smooth sinusoidal curve interpolation
- Gradient fill under curve
- Grid lines and axis labels
- High/low tide markers

### TASK-008: Add TideCanvas Interactivity
**Scope**: Mouse and touch interaction
**Files**: `client/src/components/TideCanvas.tsx`
**Changes**:
- Hover detection on curve
- Tooltip showing height at any time
- Touch support for mobile
- Current time indicator with glow

### TASK-009: Add TideCanvas Animations
**Scope**: Smooth entrance and real-time animations
**Files**: `client/src/components/TideCanvas.tsx`
**Changes**:
- Curve draw-in animation
- Now indicator pulse
- Smooth data transitions
- Shimmer effect on gradient

### TASK-010: Create TideForecast Component
**Scope**: Horizontal scrolling daily forecasts
**Files**: `client/src/components/TideForecast.tsx` (new)
**Changes**:
- Day cards with mini tide curves
- Horizontal scroll with snap
- Selected day highlight
- Animation on selection

---

## Phase 4: Widget Redesign

### TASK-011: Redesign WeatherWidget
**Scope**: Premium weather display with icons
**Files**: `client/src/components/WeatherWidget.tsx`
**Changes**:
- Replace emojis with Lucide icons
- Add animated condition backgrounds
- Improve visual hierarchy
- Add feels-like temperature
- Animated wind compass

### TASK-012: Redesign SunTimesWidget
**Scope**: Consistent with design system
**Files**: `client/src/components/SunTimesWidget.tsx`
**Changes**:
- Replace gray colors with design system
- Lucide icons (Sunrise, Sunset)
- Improved golden hour indicator
- Animation for countdown

### TASK-013: Redesign WaterQuality Component
**Scope**: Clear status indicators
**Files**: `client/src/components/WaterQuality.tsx`
**Changes**:
- Status badge redesign
- Icon improvements
- Better visual hierarchy
- Animated status transitions

### TASK-014: Redesign BeachCard
**Scope**: Dashboard card polish
**Files**: `client/src/components/BeachCard.tsx`
**Changes**:
- Consistent color palette
- Lucide icons
- Improved hover state
- Mini tide indicator
- Better temperature display

---

## Phase 5: Layout & Navigation

### TASK-015: Redesign Layout Header
**Scope**: Premium header with blur effects
**Files**: `client/src/components/Layout.tsx`
**Changes**:
- Blur-on-scroll effect
- Improved beach selector (button style)
- Animated logo
- Better mobile header

### TASK-016: Redesign MobileBottomNav
**Scope**: iOS-style bottom navigation
**Files**: `client/src/components/MobileBottomNav.tsx`
**Changes**:
- Lucide icons
- Active state indicator
- Subtle blur background
- Safe area handling

### TASK-017: Redesign BeachDetail Page
**Scope**: Improved layout and spacing
**Files**: `client/src/pages/BeachDetail.tsx`
**Changes**:
- Integrate new TideCanvas
- Replace TideTimeline/TideChart
- Consistent card usage
- Improved section spacing

---

## Phase 6: Animations & Polish

### TASK-018: Add Page Transitions
**Scope**: Smooth navigation animations
**Files**: `client/src/App.tsx`, components
**Changes**:
- Framer Motion AnimatePresence
- Page fade/slide transitions
- Scroll position handling

### TASK-019: Add Loading State Animations
**Scope**: Premium loading experience
**Files**: Multiple components
**Changes**:
- Replace all skeleton loaders with new Shimmer
- Staggered entrance animations
- Content reveal animations

### TASK-020: Add Micro-interactions
**Scope**: Interactive feedback everywhere
**Files**: Multiple components
**Changes**:
- Button press feedback
- Toggle animations
- Favorite button animation
- Share button feedback

---

## Phase 7: Discovery Homepage

### TASK-021: Create SmartRedirect Component
**Scope**: Route users to favorite beach or discovery page
**Files**: `client/src/components/SmartRedirect.tsx` (new), `client/src/App.tsx`
**Changes**:
- Check localStorage for favorites
- Redirect to primary favorite if exists
- Otherwise redirect to /discover
- Update App.tsx routing

### TASK-022: Create DiscoverPage Layout
**Scope**: Build the discovery homepage structure
**Files**: `client/src/pages/Discover.tsx` (new)
**Changes**:
- Hero section with today's summary
- Recommended beaches section
- All beaches grid
- ContentSlot placeholder (hidden)

### TASK-023: Create BeachRanking Utility
**Scope**: Algorithm to rank beaches by conditions
**Files**: `client/src/utils/beachRanking.ts` (new)
**Changes**:
- Score beaches by weather, tides, water quality
- Return sorted list with reasons
- Hook for real-time ranking updates

### TASK-024: Create DiscoverBeachCard Component
**Scope**: Enhanced card for discovery page
**Files**: `client/src/components/DiscoverBeachCard.tsx` (new)
**Changes**:
- Larger format with photo
- Condition indicators
- "Best for" tags
- Quick favorite action
- Score/ranking display (subtle)

### TASK-025: Create ContentSlot Component
**Scope**: Future-ready ad/content placeholder
**Files**: `client/src/components/ContentSlot.tsx` (new)
**Changes**:
- Renders nothing currently
- Props for slot identification
- Ready for future CMS integration

---

## Phase 8: Final Polish

### TASK-026: Dark Mode Refinement
**Scope**: Perfect dark mode colors
**Files**: `client/tailwind.config.js`, all components
**Changes**:
- Review all dark: utilities
- Consistent surface colors
- Proper contrast ratios
- Smooth theme transition

### TASK-027: Accessibility Audit
**Scope**: WCAG 2.1 AA compliance
**Files**: All components
**Changes**:
- Focus indicators
- Screen reader labels
- Keyboard navigation
- Color contrast fixes

### TASK-028: Performance Optimization
**Scope**: Smooth 60fps everywhere
**Files**: TideCanvas, animations
**Changes**:
- Canvas optimization
- Animation performance
- Lazy loading
- Bundle analysis

### TASK-029: Quality Assurance
**Scope**: Final testing and fixes
**Files**: All
**Changes**:
- Cross-browser testing
- Mobile device testing
- Edge case handling
- Final bug fixes

---

## Success Metrics

- [ ] All emojis replaced with Lucide icons
- [ ] TideCanvas renders at 60fps
- [ ] All cards use new Card component
- [ ] Consistent design tokens throughout
- [ ] Dark mode perfectly polished
- [ ] Accessibility score > 95
- [ ] Build passes, no TypeScript errors
- [ ] Visual quality matches inspiration references
- [ ] Discovery homepage helps users choose a beach
- [ ] Smart routing works (favorites → direct, new users → discover)
- [ ] Commercial slots ready but hidden

---

## Dependencies Graph

```
TASK-001 (deps) ─┬─> TASK-002 (tokens) ─┬─> TASK-003 (utils)
                 │                      │
                 └─> TASK-005 (icons) ──┤
                                        │
TASK-003 ───────────────────────────────┼─> TASK-004 (Card)
                                        │
TASK-002 + TASK-003 + TASK-005 ─────────┼─> TASK-007..010 (Tide)
                                        │
TASK-004 + TASK-005 ────────────────────┴─> TASK-011..014 (Widgets)
                                            │
                                            └─> TASK-015..17 (Layout)
                                                │
                                                └─> TASK-018..24 (Polish)
```
