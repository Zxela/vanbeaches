import { BEACHES, type EnvironmentalState } from '@van-beaches/shared';
import {
  BufferAttribute,
  BufferGeometry,
  Frustum,
  Matrix4,
  type PerspectiveCamera,
  Points,
  type Scene,
  Vector3,
} from 'three';
import { WorldShaderMaterial as ShaderMaterial } from '../depth';
import type { WorldManifest } from '../types';
import { CharacterBatch } from './characters';
import { estimateCrowd } from './model';
import {
  type BeachPopulation,
  activityAvailable,
  fadeToward,
  moveAgent,
  representationCount,
  spawnAgent,
} from './population';
import { CROWD_RENDER } from './tuning';
import { type HeightSampler, atlasSampler, buildActivityMask } from './zones';

export class CrowdRuntime {
  private budget: number = CROWD_RENDER.maxAgents;
  setBudget(maximum: number) {
    this.budget = Math.max(0, maximum);
    this.sincePlan = 1;
  }
  private close = new CharacterBatch(CROWD_RENDER.maxAgents, true);
  private medium = new CharacterBatch(CROWD_RENDER.maxAgents, false);
  private points: Points<BufferGeometry, ShaderMaterial>;
  private populations: BeachPopulation[] = [];
  private sample: HeightSampler | null = null;
  private environment: EnvironmentalState | null = null;
  private elapsed = 0;
  private sinceFrame = 0;
  private sincePlan = 1;
  private frustum = new Frustum();
  private matrix = new Matrix4();
  private position = new Vector3();
  private maskStatus = 'loading';
  private counts = { close: 0, medium: 0, far: 0 };

  constructor(
    private scene: Scene,
    private manifest: WorldManifest,
  ) {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(CROWD_RENDER.maxAgents * 3), 3),
    );
    geometry.setAttribute('fade', new BufferAttribute(new Float32Array(CROWD_RENDER.maxAgents), 1));
    geometry.setDrawRange(0, 0);
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader:
        'attribute float fade; varying float opacity; void main() { opacity = fade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 2.0; }',
      fragmentShader:
        'varying float opacity; void main() { if (length(gl_PointCoord - 0.5) > 0.5 || opacity < 0.01) discard; gl_FragColor = vec4(0.28, 0.32, 0.3, opacity * 0.65); }',
    });
    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.close.mesh, this.medium.mesh, this.points);
  }

  setAtlas(image: HTMLImageElement) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Atlas decoding unavailable');
      context.drawImage(image, 0, 0);
      this.sample = atlasSampler(
        context.getImageData(0, 0, image.width, image.height).data,
        image.width,
        image.height,
        this.manifest.depthTexture.bounds,
      );
      this.maskStatus = 'ready';
      if (this.environment) this.setEnvironment(this.environment);
    } catch {
      // No arbitrary fallback positions when CPU survey coverage is unavailable.
      this.maskStatus = 'unavailable';
    }
  }

  setEnvironment(environment: EnvironmentalState) {
    this.environment = environment;
    if (!this.sample) return;
    for (const beach of this.manifest.beaches) {
      const location = BEACHES.find((b) => b.id === beach.id)?.location;
      if (!location) continue;
      const state = estimateCrowd(beach.id, environment, location);
      if (!state) continue;
      const existing = this.populations.find((p) => p.beach.id === beach.id);
      if (existing) existing.state = state;
      else
        this.populations.push({
          beach,
          state,
          cells: buildActivityMask(beach, this.sample),
          agents: [],
          nextId: 0,
          target: 0,
        });
    }
    this.sincePlan = 1;
  }

  update(camera: PerspectiveCamera, dt: number, tide: number, mobile: boolean, reduced: boolean) {
    if (!this.environment || !this.sample) return;
    this.elapsed += dt;
    this.sinceFrame += dt;
    this.sincePlan += dt;
    const max = Math.min(
      this.budget,
      mobile ? CROWD_RENDER.mobileMaxAgents : CROWD_RENDER.maxAgents,
    );
    const cull = mobile ? CROWD_RENDER.mobileCullDistance : CROWD_RENDER.cullDistance;
    if (this.sincePlan >= 1) {
      this.sincePlan = 0;
      const sorted = [...this.populations].sort(
        (a, b) =>
          camera.position.distanceToSquared(this.position.fromArray(a.beach.worldPosition)) -
          camera.position.distanceToSquared(this.position.fromArray(b.beach.worldPosition)),
      );
      let budget = max;
      for (const population of sorted) {
        const distance = camera.position.distanceTo(
          this.position.fromArray(population.beach.worldPosition),
        );
        population.target =
          distance > cull
            ? 0
            : Math.min(
                budget,
                representationCount(population.state.normalizedDensity, mobile, this.budget),
              );
        budget -= population.target;
        let kept = 0;
        for (const agent of population.agents) {
          const valid = activityAvailable(agent.activity, agent.cell, tide, this.environment);
          agent.retiring = !valid || kept >= population.target;
          if (!agent.retiring) kept++;
        }
      }
    }
    let total = this.populations.reduce((sum, p) => sum + p.agents.length, 0);
    let spawnBudget = 4; // Amortize mask selection and fade-in across frames.
    for (const p of this.populations) {
      const active = p.agents.filter((a) => !a.retiring).length;
      if (active < p.target && total < max && spawnBudget > 0) {
        const agent = spawnAgent(p.nextId++, p.beach, p.cells, tide, this.environment);
        spawnBudget--;
        if (
          agent &&
          !p.agents.some(
            (other) =>
              Math.hypot(other.x - agent.x, other.z - agent.z) < CROWD_RENDER.spawnSeparation,
          )
        ) {
          p.agents.push(agent);
          total++;
        }
      }
      for (const agent of p.agents) {
        agent.alpha = fadeToward(agent.alpha, agent.retiring ? 0 : 1, dt);
        if (!reduced && !agent.retiring)
          moveAgent(agent, p.beach, this.sample, tide, this.environment, dt);
      }
      p.agents = p.agents.filter((a) => !a.retiring || a.alpha > 0);
    }
    const hz = mobile ? CROWD_RENDER.mobileHz : CROWD_RENDER.closeHz;
    if (this.sinceFrame < 1 / hz) return;
    this.sinceFrame = 0;
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(
      this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    this.close.begin(this.elapsed, reduced);
    this.medium.begin(
      Math.floor(this.elapsed * CROWD_RENDER.mediumHz) / CROWD_RENDER.mediumHz,
      reduced,
    );
    const positions = this.points.geometry.attributes.position;
    const fades = this.points.geometry.attributes.fade;
    let far = 0;
    for (const p of this.populations)
      for (const agent of p.agents) {
        const y = agent.activity === 'swim' ? tide - 0.12 : agent.cell.y + 0.12;
        this.position.set(agent.x, y + 0.8, agent.z);
        const distance = camera.position.distanceTo(this.position);
        if (distance > cull || !this.frustum.containsPoint(this.position)) continue;
        const fade = agent.alpha * Math.max(0, Math.min(1, (cull - distance) / 200));
        // Crossfade representations over distance bands to avoid LOD popping.
        const closeWeight = mobile
          ? 0
          : Math.max(0, Math.min(1, (CROWD_RENDER.closeDistance + 20 - distance) / 40));
        const farWeight = Math.max(
          0,
          Math.min(1, (distance - CROWD_RENDER.mediumDistance + 70) / 140),
        );
        if (closeWeight > 0)
          this.close.add(
            agent.x,
            y,
            agent.z,
            agent.heading,
            agent.activity,
            agent.phase,
            fade * closeWeight,
            agent.color,
          );
        const mediumWeight = (1 - closeWeight) * (1 - farWeight);
        if (mediumWeight > 0)
          this.medium.add(
            agent.x,
            y,
            agent.z,
            agent.heading,
            agent.activity,
            agent.phase,
            fade * mediumWeight,
            agent.color,
          );
        if (farWeight > 0) {
          positions.setXYZ(far, agent.x, y + 0.8, agent.z);
          fades.setX(far++, fade * farWeight);
        }
      }
    this.close.end();
    this.medium.end();
    this.points.geometry.setDrawRange(0, far);
    positions.needsUpdate = true;
    fades.needsUpdate = true;
    this.counts = { close: this.close.mesh.count, medium: this.medium.mesh.count, far };
  }

  snapshot() {
    return {
      maskStatus: this.maskStatus,
      activeAgents: this.populations.reduce((sum, p) => sum + p.agents.length, 0),
      representations: this.counts,
      beaches: this.populations.map((p) => ({
        id: p.beach.id,
        state: p.state,
        maskCells: p.cells.length,
        target: p.target,
        agents: p.agents.length,
        activities: Object.fromEntries(
          ['idle', 'walk', 'sit', 'lie', 'wade', 'swim', 'volleyball'].map((activity) => [
            activity,
            p.agents.filter((a) => a.activity === activity).length,
          ]),
        ),
      })),
    };
  }

  dispose() {
    this.close.dispose();
    this.medium.dispose();
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.populations = [];
    this.sample = null;
  }
}
