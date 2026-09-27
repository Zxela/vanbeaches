import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { afterEach, expect, it, vi } from 'vitest';
import { CameraNavigation } from './camera';

afterEach(() => vi.restoreAllMocks());
it('flies continuously, arrives exactly, and lets input cancel a flight', () => {
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const camera = new PerspectiveCamera();
  camera.position.set(0, 100, 0);
  const controls = new OrbitControls(camera, document.createElement('canvas'));
  const flight = new CameraNavigation(camera, controls, () => false);
  flight.fly({ position: [1000, 200, 500], target: [1000, 0, 500] });
  flight.update(0);
  expect(camera.position.x).toBeCloseTo(0);
  flight.update(900);
  expect(camera.position.x).toBeGreaterThan(0);
  expect(camera.position.x).toBeLessThan(1000);
  flight.update(10000);
  expect(camera.position.toArray()).toEqual([1000, 200, 500]);
  flight.fly({ position: [0, 100, 0], target: [0, 0, 0] });
  flight.cancel();
  flight.update(10000);
  expect(camera.position.x).toBe(1000);
  expect(flight.state).toBe('explore');
  controls.dispose();
});

it('honours reduced motion with no intermediate flight', () => {
  const camera = new PerspectiveCamera();
  const controls = new OrbitControls(camera, document.createElement('canvas'));
  const flight = new CameraNavigation(camera, controls, () => true);
  flight.fly({ position: [200, 140, 100], target: [100, 0, 0] }, 'beach');
  expect(camera.position.x).toBeCloseTo(200);
  expect(flight.state).toBe('beach');
  controls.dispose();
});
