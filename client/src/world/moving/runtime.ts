import type { EnvironmentalState } from '@van-beaches/shared';
import {
  Frustum,
  Matrix4,
  Object3D,
  type PerspectiveCamera,
  type Scene,
  Sphere,
  Vector3,
} from 'three';
import { blenderToWeb } from '../coordinates';
import type { WaterUniforms } from '../materials';
import type { Point, WorldManifest } from '../types';
import {
  type NavigationMask,
  type Route,
  createRoutes,
  isMarine,
  routeNavigable,
  sampleRoute,
} from './model';
import { createBatch } from './render';

export interface MovingLayers {
  ships: boolean;
  ferries: boolean;
  sailboats: boolean;
  aircraft: boolean;
  traffic: boolean;
  birds: boolean;
}
export const DEFAULT_MOVING_LAYERS: MovingLayers = {
  ships: true,
  ferries: true,
  sailboats: true,
  aircraft: true,
  traffic: false,
  birds: true,
};
export interface TrafficBridge {
  id: string;
  points: Point[];
  width: number;
}

export class MovingRuntime {
  private routes: Route[];
  private batches = new Map<string, ReturnType<typeof createBatch>>();
  private navigation: NavigationMask | null = null;
  private allowed = new Set<string>();
  private layers = { ...DEFAULT_MOVING_LAYERS };
  private seconds = Date.UTC(2026, 5, 21, 19) / 1000;
  private sinceFrame = 1;
  private checkedTide = Number.NaN;
  private environment: EnvironmentalState | null = null;
  private frustum = new Frustum();
  private matrix = new Matrix4();
  private sphere = new Sphere(new Vector3(), 120);
  private transform = new Object3D();
  private visible = 0;
  private maxEntities = 64;

  constructor(
    private scene: Scene,
    manifest: WorldManifest,
    private water: WaterUniforms,
  ) {
    this.routes = createRoutes(manifest);
    this.ensureBatches();
  }
  private ensureBatches() {
    for (const route of this.routes)
      if (!this.batches.has(route.subtype)) {
        const batch = createBatch(route.subtype, this.water);
        this.batches.set(route.subtype, batch);
        this.scene.add(batch);
      }
  }
  setEnvironment(environment: EnvironmentalState) {
    this.environment = environment;
    const seconds = Date.parse(environment.timestamp) / 1000;
    if (Number.isFinite(seconds)) this.seconds = seconds;
    this.sinceFrame = 1;
  }
  setNavigation(navigation: NavigationMask | null) {
    this.navigation = navigation;
    this.checkedTide = Number.NaN;
    this.sinceFrame = 1;
  }
  setLayers(layers: Partial<MovingLayers>) {
    this.layers = { ...this.layers, ...layers };
    this.sinceFrame = 1;
  }
  setBudget(maxEntities: number) {
    this.maxEntities = Math.max(0, Math.min(64, Math.floor(maxEntities)));
    this.sinceFrame = 1;
  }
  /** Uses the same source deck lines as the visible bridge mesh; no invented road coordinates. */
  setBridges(bridges: TrafficBridge[]) {
    this.routes = this.routes.filter((route) => route.type !== 'vehicle');
    for (const bridge of bridges.slice(0, 4)) {
      if (bridge.points.length < 2) continue;
      for (let i = 0; i < 6; i++) {
        const points = bridge.points.map(blenderToWeb);
        const a = points[0];
        const b = points[points.length - 1];
        const distance = Math.hypot(b[0] - a[0], b[2] - a[2]);
        const side = i % 2 ? 1 : -1;
        const lane = Math.min(3, bridge.width / 4) * side;
        const offsetX = (-(b[2] - a[2]) / Math.max(1, distance)) * lane;
        const offsetZ = ((b[0] - a[0]) / Math.max(1, distance)) * lane;
        for (const point of points) {
          point[0] += offsetX;
          point[2] += offsetZ;
          point[1] += 0.3;
        }
        if (side < 0) points.reverse();
        this.routes.push({
          id: `bridge-${bridge.id}-${i}`,
          type: 'vehicle',
          subtype: 'car',
          points,
          speed: 11,
          phase: i * 15,
          beam: 1.8,
          draft: 0,
        });
      }
    }
    this.ensureBatches();
    this.sinceFrame = 1;
  }
  update(
    camera: PerspectiveCamera,
    dt: number,
    tide: number,
    lowDetail: boolean,
    reducedMotion: boolean,
  ) {
    if (!reducedMotion && this.environment?.mode !== 'TIMELINE')
      this.seconds += Math.max(0, Math.min(dt, 0.25));
    this.sinceFrame += dt;
    if (this.sinceFrame < (lowDetail ? 0.2 : 0.08)) return;
    this.sinceFrame = 0;
    // Quantize downward so falling water can never reuse a less conservative draft check.
    const checkedTide = Math.floor(tide * 5) / 5;
    if (checkedTide !== this.checkedTide) {
      this.checkedTide = checkedTide;
      this.allowed = new Set(
        this.routes
          .filter((r) => isMarine(r) && routeNavigable(r, this.navigation, checkedTide))
          .map((r) => r.id),
      );
    }
    for (const batch of this.batches.values()) batch.count = 0;
    this.frustum.setFromProjectionMatrix(
      this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    this.visible = 0;
    for (const route of this.routes) {
      if (this.visible >= this.maxEntities) break;
      const layer = (
        {
          vessel: 'ships',
          ferry: 'ferries',
          sailboat: 'sailboats',
          aircraft: 'aircraft',
          vehicle: 'traffic',
          bird: 'birds',
        } as const
      )[route.type];
      if (!this.layers[layer] || (isMarine(route) && !this.allowed.has(route.id))) continue;
      if (lowDetail && (route.type === 'bird' || route.type === 'vehicle')) continue;
      const entity = sampleRoute(route, this.seconds);
      if (!entity.active) continue;
      if (isMarine(route)) {
        entity.position[1] = tide;
        if (!reducedMotion)
          entity.position[1] +=
            Math.sin(this.seconds * 0.7 + route.phase) *
            Math.min(0.16, this.water.amplitude.value * 0.1);
      }
      this.sphere.center.fromArray(entity.position);
      const distance = camera.position.distanceTo(this.sphere.center);
      const maxDistance =
        route.type === 'bird'
          ? 1600
          : route.type === 'vehicle'
            ? 5000
            : route.type === 'sailboat'
              ? 9000
              : 55000;
      if (distance > maxDistance) continue;
      const radius = this.water.earthRadius.value;
      if (radius > 0)
        this.sphere.center.y -=
          ((entity.position[0] - camera.position.x) ** 2 +
            (entity.position[2] - camera.position.z) ** 2) /
          (2 * radius);
      if (!this.frustum.intersectsSphere(this.sphere)) continue;
      const batch = this.batches.get(route.subtype);
      if (!batch || batch.count >= 32) continue;
      this.transform.position.fromArray(entity.position);
      this.transform.rotation.set(0, -entity.heading, 0);
      // Sailing heel follows the shared wind without changing the certified water corridor.
      if (route.type === 'sailboat' && !reducedMotion)
        this.transform.rotation.z =
          Math.sin(
            entity.heading + Math.atan2(this.water.direction.value.y, this.water.direction.value.x),
          ) * Math.min(0.13, this.water.wind.value * 0.04);
      this.transform.updateMatrix();
      batch.setMatrixAt(batch.count++, this.transform.matrix);
      this.visible++;
    }
    for (const batch of this.batches.values()) batch.instanceMatrix.needsUpdate = true;
  }
  snapshot() {
    return {
      mode: 'SIMULATED',
      source: 'procedural-vancouver-v1',
      live: false,
      entities: this.routes.length,
      visible: this.visible,
      drawCalls: [...this.batches.values()].filter((b) => b.count).length,
      budget: this.maxEntities,
      navigation: this.navigation ? 'ready' : 'unavailable',
      navigableRoutes: this.allowed.size,
      suppressedMarineRoutes: this.routes.filter(isMarine).length - this.allowed.size,
      timestamp: new Date(this.seconds * 1000).toISOString(),
      layers: { ...this.layers },
    };
  }
  dispose() {
    for (const batch of this.batches.values()) {
      batch.removeFromParent();
      batch.geometry.dispose();
      batch.material.dispose();
      batch.dispose();
    }
    this.batches.clear();
  }
}
