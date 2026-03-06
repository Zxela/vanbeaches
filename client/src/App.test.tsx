import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('App Routing (task-012: Remove Compare page and route)', () => {
  it('Compare component is not imported in App.tsx', () => {
    const appPath = path.join(process.cwd(), 'src', 'App.tsx');
    const appSource = fs.readFileSync(appPath, 'utf-8');
    expect(appSource).not.toMatch(/import.*Compare/i);
  });

  it('does not have a /compare route — catch-all handles the redirect (AC-014)', () => {
    const appPath = path.join(process.cwd(), 'src', 'App.tsx');
    const appSource = fs.readFileSync(appPath, 'utf-8');
    // AC-014: The /compare route must not exist; the catch-all redirects unknown routes to /discover
    expect(appSource).not.toMatch(/path=["']\/compare["']/);
  });

  it('routes /* (catch-all) with Navigate redirect to /discover', () => {
    const appPath = path.join(process.cwd(), 'src', 'App.tsx');
    const appSource = fs.readFileSync(appPath, 'utf-8');
    expect(appSource).toMatch(
      /path=["']\*["']\s+element=\{<Navigate\s+to=["']\/discover["']\s+replace\s*\/>\}/,
    );
  });
});
