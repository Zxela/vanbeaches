# Task: TASK-006 React Client Skeleton with Vite

Metadata:
- Phase: 1 - Foundation
- Dependencies: TASK-001 (Monorepo Setup), TASK-002 (Shared Types)
- Provides: React + Vite + TypeScript client with routing and Tailwind
- Size: Medium (5 files)
- Verification Level: L3 (Build Success)

## Implementation Content

Initialize the Vite + React + TypeScript project in `/client` with path aliases to shared types, React Router for navigation, Tailwind CSS for styling, and placeholder pages for Dashboard and BeachDetail.

## Target Files

- [ ] `/home/zxela/workspace/client/package.json`
- [ ] `/home/zxela/workspace/client/tsconfig.json`
- [ ] `/home/zxela/workspace/client/vite.config.ts`
- [ ] `/home/zxela/workspace/client/tailwind.config.js`
- [ ] `/home/zxela/workspace/client/postcss.config.js`
- [ ] `/home/zxela/workspace/client/index.html`
- [ ] `/home/zxela/workspace/client/src/main.tsx`
- [ ] `/home/zxela/workspace/client/src/App.tsx`
- [ ] `/home/zxela/workspace/client/src/index.css`
- [ ] `/home/zxela/workspace/client/src/pages/Dashboard.tsx` (placeholder)
- [ ] `/home/zxela/workspace/client/src/pages/BeachDetail.tsx` (placeholder)
- [ ] `/home/zxela/workspace/client/src/components/Layout.tsx`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review TASK-001 and TASK-002 deliverables
- [ ] Verify Vite project can be initialized in `/client`
- [ ] Write test that route `/` renders Dashboard placeholder
- [ ] Write test that route `/beach/:slug` renders BeachDetail placeholder

### 2. Green Phase
- [ ] Create `/client/package.json`:
  ```json
  {
    "name": "@van-beaches/client",
    "version": "0.0.1",
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview",
      "test": "vitest"
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.21.0"
    },
    "devDependencies": {
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "@vitejs/plugin-react": "^4.2.0",
      "autoprefixer": "^10.4.16",
      "postcss": "^8.4.32",
      "tailwindcss": "^3.4.0",
      "vite": "^5.0.0"
    }
  }
  ```
- [ ] Create `/client/tsconfig.json` with path alias to shared
- [ ] Create `/client/vite.config.ts`:
  ```typescript
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import path from 'path'

  export default defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, '../shared'),
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3000'
      }
    }
  })
  ```
- [ ] Create Tailwind and PostCSS configuration
- [ ] Create base HTML template with viewport meta tag
- [ ] Implement `/client/src/App.tsx` with React Router:
  ```typescript
  import { BrowserRouter, Routes, Route } from 'react-router-dom'
  import Layout from './components/Layout'
  import Dashboard from './pages/Dashboard'
  import BeachDetail from './pages/BeachDetail'

  export default function App() {
    return (
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/beach/:slug" element={<BeachDetail />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    )
  }
  ```
- [ ] Create placeholder Dashboard page
- [ ] Create placeholder BeachDetail page with route param handling
- [ ] Create base Layout component
- [ ] Configure Tailwind CSS with custom theme

### 3. Refactor Phase
- [ ] Verify `pnpm dev` starts development server
- [ ] Verify routes `/` and `/beach/:slug` render placeholders
- [ ] Verify Tailwind styles apply correctly
- [ ] Verify shared types can be imported
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] `pnpm dev` starts development server (Vite)
- [ ] Routes `/` and `/beach/:slug` render placeholders
- [ ] Tailwind styles apply correctly
- [ ] Path aliases to shared types work (`@shared/types`)
- [ ] Base layout component wraps all pages
- [ ] Verification: L3 (Build passes)

## AC References from Design Doc

- Component: Dashboard Page (`/client/src/pages/Dashboard.tsx`)
- Component: Beach Detail Page (`/client/src/pages/BeachDetail.tsx`)
- AC: "Support viewport widths from 320px to 2560px"
- AC: "Mobile-responsive layout with touch-friendly navigation"

## Notes

- Impact scope: All client components will be built on this foundation
- Constraints: Must use Vite (not CRA), Tailwind CSS (not other CSS frameworks)
- Placeholder pages will be fully implemented in Phase 5
- E2E test skeletons already exist at `/client/e2e/`
