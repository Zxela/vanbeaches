import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock HTMLCanvasElement.getContext (not available in jsdom)
HTMLCanvasElement.prototype.getContext = () => null;

// Runs a cleanup after each test case
afterEach(() => {
  cleanup();
});
