import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('App Routing (task-016: Update routing and remove Compare)', () => {
  it('Compare component is not imported in App.tsx', () => {
    const appPath = path.join(process.cwd(), 'src', 'App.tsx');
    const appSource = fs.readFileSync(appPath, 'utf-8');
    // AC-001: Compare page component is no longer imported in App.tsx
    expect(appSource).not.toMatch(/import.*Compare/i);
  });

  it('routes /compare with Navigate redirect to /discover', () => {
    const appPath = path.join(process.cwd(), 'src', 'App.tsx');
    const appSource = fs.readFileSync(appPath, 'utf-8');
    // AC-002: Route for /compare should redirect to /discover
    expect(appSource).toMatch(/path=["']\/compare["']\s+element=\{<Navigate\s+to=["']\/discover["']\s+replace\s*\/>\}/);
  });

  it('routes /* (catch-all) with Navigate redirect to /discover', () => {
    const appPath = path.join(process.cwd(), 'src', 'App.tsx');
    const appSource = fs.readFileSync(appPath, 'utf-8');
    // AC-003: Unknown routes should redirect to /discover
    expect(appSource).toMatch(/path=["']\*["']\s+element=\{<Navigate\s+to=["']\/discover["']\s+replace\s*\/>\}/);
  });
});
