import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraPose, Destination } from './types';

export type CameraState = 'overview' | 'approach' | 'beach' | 'explore';
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export class CameraNavigation {
  state: CameraState = 'overview';
  private flight: {
    start: number;
    duration: number;
    from: Vector3;
    target: Vector3;
    to: Vector3;
    endTarget: Vector3;
    lift: number;
    arrival: CameraState;
  } | null = null;

  constructor(
    private camera: PerspectiveCamera,
    private controls: OrbitControls,
    private reducedMotion: () => boolean,
  ) {}

  cancel = () => {
    this.flight = null;
    this.state = 'explore';
  };

  flyToBeach(beach: Destination, close = false) {
    if (close && beach.beachView) {
      this.fly(beach.beachView, 'beach');
      return;
    }
    const target = new Vector3(...beach.cameraTarget);
    const position = new Vector3(...beach.cameraApproach);
    if (close) position.sub(target).multiplyScalar(0.22).add(target);
    this.fly({ position: position.toArray(), target: target.toArray() }, 'beach');
  }

  fly(pose: CameraPose, arrival: CameraState = 'overview') {
    this.controls.update();
    const to = new Vector3(...pose.position);
    const endTarget = new Vector3(...pose.target);
    if (this.reducedMotion()) {
      this.camera.position.copy(to);
      this.controls.target.copy(endTarget);
      this.controls.update();
      this.flight = null;
      this.state = arrival;
      return;
    }
    const distance = this.camera.position.distanceTo(to);
    this.flight = {
      start: performance.now(),
      duration: Math.min(6500, Math.max(1800, distance * 0.6)),
      from: this.camera.position.clone(),
      target: this.controls.target.clone(),
      to,
      endTarget,
      lift: Math.min(1800, distance * 0.23),
      arrival,
    };
    this.state = 'approach';
  }

  update(now: number) {
    const f = this.flight;
    if (!f) return;
    // A single smooth arch pulls away, travels, then descends. No roll or target snapping.
    const t = this.reducedMotion() ? 1 : Math.min(1, (now - f.start) / f.duration);
    const s = ease(t);
    this.camera.position.lerpVectors(f.from, f.to, s);
    this.camera.position.y += f.lift * Math.sin(Math.PI * s) ** 2;
    this.controls.target.lerpVectors(f.target, f.endTarget, s);
    if (t === 1) {
      this.flight = null;
      this.state = f.arrival;
    }
  }
}
