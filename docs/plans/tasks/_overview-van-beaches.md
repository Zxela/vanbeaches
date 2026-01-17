# Overall Design Document: Van Beaches

Generation Date: 2026-01-17
Target Plan Document: van-beaches-work-plan.md

## Project Overview

### Purpose and Goals
Build a web dashboard application providing comprehensive beach conditions for Vancouver's 9 public beaches. The system aggregates weather forecasts, tide information, water quality reports, and live webcam feeds into a responsive, mobile-friendly interface for beachgoers and local residents.

### Background and Context
Vancouver residents and visitors need a centralized, easy-to-use dashboard to check beach conditions before visiting. Currently, this information is scattered across multiple government websites and sources, making trip planning time-consuming and inconvenient.

## Task Division Design

### Division Policy
**Selected Strategy**: Vertical Slice with Foundation Layer
**Rationale**:
- Each beach data type (weather, tides, water quality) can be implemented end-to-end independently
- Foundation layer (cache, rate limiter) must be built first as all slices depend on it
- Allows early user feedback on individual features
- Minimizes integration risk by testing each slice in isolation

**Verification Level Distribution**:
- Phase 1 (Foundation): L3 - Build Success Verification
- Phases 2-5 (Vertical Slices): L1 - Functional Operation Verification
- Phase 6 (Optimization): L2 - Test Operation Verification
- Phase 7 (Quality Assurance): L3 - Build Success Verification (Final)

### Inter-task Relationship Map

```
Phase 1: Foundation (L3)
  TASK-001: Monorepo Setup
    |
    +---> TASK-002: Shared Types Package
    |       |
    |       +---> TASK-003: Cache Manager
    |       |       |
    |       |       +---> [Phase 2, 3, 4 Services]
    |       |
    |       +---> TASK-005: Express Server Skeleton
    |       |       |
    |       |       +---> [Phase 2, 3, 4 Routes]
    |       |
    |       +---> TASK-006: React Client Skeleton
    |       |       |
    |       |       +---> [Phase 2, 3, 4 Hooks/Components]
    |       |
    |       +---> TASK-007: Beach Configuration Data
    |               |
    |               +---> [Phase 2, 3, 4 Services]
    |
    +---> TASK-004: Rate Limiter
            |
            +---> [TASK-008: IWLS Service]

Phase 2: Tides Slice (L1) - Depends on Phase 1
  TASK-008: IWLS Service
    |
    +---> TASK-009: Tides API Route
            |
            +---> TASK-010: useTides Hook
                    |
                    +---> TASK-011: TideChart Component

Phase 3: Weather Slice (L1) - Depends on Phase 1 (parallel with Phase 2, 4)
  TASK-012: Weather Service
    |
    +---> TASK-013: Weather API Route
            |
            +---> TASK-014: useWeather Hook
                    |
                    +---> TASK-015: WeatherWidget Component

Phase 4: Water Quality Slice (L1) - Depends on Phase 1 (parallel with Phase 2, 3)
  TASK-016: VCH Scraper Service
    |
    +---> TASK-017: Water Quality API Route
            |
            +---> TASK-018: useWaterQuality Hook
                    |
                    +---> TASK-019: WaterQuality Component

Phase 5: Webcams + Dashboard (L1) - Depends on Phases 2, 3, 4
  TASK-020: Webcam Service
    |
    +---> TASK-021: WebcamEmbed Component

  TASK-022: BeachCard Component (depends on TASK-002)
    |
    +---> TASK-024: Dashboard Page

  TASK-023: useBeaches Hook + Beaches API Route
    |
    +---> TASK-024: Dashboard Page
            |
            +---> TASK-025: BeachDetail Page (depends on all widgets)
                    |
                    +---> TASK-026: Navigation + Routing

Phase 6: Optimization (L2) - Depends on Phase 5
  TASK-027: Background Scheduler
  TASK-028: Request Coalescing Enhancement
  TASK-029: Performance Optimization
  TASK-030: Mobile Responsiveness Polish

Phase 7: Quality Assurance (L3) - Depends on Phase 6
  TASK-031: E2E Test Implementation
  TASK-032: Acceptance Criteria Verification
  TASK-033: Coverage Target Achievement
  TASK-034: Final Quality Checks
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|-------------------|---------------|-------------------|-------------------|
| N/A (Greenfield) | Beach types | None | TASK-002 |
| N/A (Greenfield) | API types | None | TASK-002 |
| N/A (Greenfield) | Cache Manager | None | TASK-003 |
| N/A (Greenfield) | Rate Limiter | None | TASK-004 |

### Common Processing Points

**Shared Foundation Components**:
1. **Type Definitions** (TASK-002): Used by all server services and client components
2. **Cache Manager** (TASK-003): Used by all external API services
3. **Beach Configuration** (TASK-007): Used by all services and routes

**Design Policy to Avoid Duplicate Implementation**:
- All type definitions centralized in `/shared/types/`
- All beach configuration data centralized in `/shared/data/`
- Cache Manager provides unified `getOrFetch` interface for all services
- API Response format standardized via `ApiResponse<T>` type

## Implementation Considerations

### Principles to Maintain Throughout
1. **Type Safety**: All data flows must be fully typed from API to UI
2. **Graceful Degradation**: Always serve cached data when external APIs fail
3. **Error Boundaries**: Clear error handling at each layer
4. **TDD Approach**: Red-Green-Refactor for all implementation tasks
5. **Verification at Each Phase**: L1/L2/L3 as specified per phase

### Risks and Countermeasures

| Risk | Probability | Impact | Countermeasure | Corresponding Task |
|------|-------------|--------|----------------|-------------------|
| IWLS API Unavailability | Low | High | Aggressive caching, stale-while-revalidate | TASK-003, TASK-008 |
| VCH Website Redesign | Medium | Medium | Isolated scraper module, HTML fixture tests | TASK-016 |
| Rate Limit Exhaustion | Medium | Medium | Request coalescing, background refresh | TASK-004, TASK-027, TASK-028 |
| Performance Degradation | Low | Medium | Performance budgets, lazy loading | TASK-029, TASK-030 |
| External API Changes | Low | High | Service abstraction layer | All service tasks |

### Impact Scope Management

**Allowed Change Scope**:
- All new files in `/server`, `/client`, `/shared` directories
- Package configuration files (`package.json`, `tsconfig.json`, etc.)
- Vite and ESLint configuration

**No-change Areas**:
- Existing project documentation (except work plan progress updates)
- E2E test skeleton structure (only fill in implementation)

## Task Summary

| Phase | Task Count | Verification Level | Dependencies |
|-------|-----------|-------------------|--------------|
| Phase 1: Foundation | 7 tasks + 1 completion | L3 | None |
| Phase 2: Tides Slice | 4 tasks + 1 completion | L1 | Phase 1 |
| Phase 3: Weather Slice | 4 tasks + 1 completion | L1 | Phase 1 |
| Phase 4: Water Quality Slice | 4 tasks + 1 completion | L1 | Phase 1 |
| Phase 5: Webcams + Dashboard | 7 tasks + 1 completion | L1 | Phases 2, 3, 4 |
| Phase 6: Optimization | 4 tasks + 1 completion | L2 | Phase 5 |
| Phase 7: Quality Assurance | 4 tasks + 1 completion | L3 | Phase 6 |

**Total**: 34 tasks + 7 phase completion tasks = 41 task files
