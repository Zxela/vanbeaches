import type { EnvironmentalState } from '@van-beaches/shared';
import {
  Color,
  LinearFilter,
  NearestFilter,
  NoColorSpace,
  PerspectiveCamera,
  Raycaster,
  Scene,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Atmosphere } from './atmosphere';
import { CameraNavigation } from './camera';
import { tideToWorld } from './coordinates';
import { CrowdRuntime } from './crowd/runtime';
import { smoothTide } from './environment';
import { assetUrl } from './manifest';
import { MarineNavigation } from './marine';
import { createOcean, createWaterUniforms, updateWater } from './materials';
import { type MovingLayers, MovingRuntime } from './moving/runtime';
import { QUALITY_BUDGETS, type QualityTier, chooseQuality, lowerQuality } from './quality';
import { RegionalDebug } from './regionalDebug';
import type { TerrainDebugMode } from './regionalDebug';
import { WorldTelemetry } from './telemetry';
import { TileManager } from './tiles';
import type { Destination, RuntimeStats, WaterSettings, WorldManifest } from './types';
import { type UrbanDebug, type UrbanLayer, UrbanRuntime } from './urban';

export class CoastRuntime {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(48, 1, 1, 240000);
  readonly controls: OrbitControls;
  readonly navigation: CameraNavigation;
  private tiles: TileManager;
  private water;
  private atmosphere: Atmosphere;
  private regionalDebug: RegionalDebug;
  private crowds: CrowdRuntime;
  private urban: UrbanRuntime;
  private moving: MovingRuntime;
  private marine = new MarineNavigation();
  private telemetry = new WorldTelemetry();
  private quality: QualityTier = 'HIGH';
  private peopleEnabled = true;
  private softwareRenderer = false;
  private selectedBeach: Destination | null = null;
  private environment: EnvironmentalState | null = null;
  private targetTide: number | null = null;
  private manualTide: number | null = null;
  private ocean;
  private observer: ResizeObserver;
  private disposed = false;
  private frame = 0;
  private lastFrame = 0;
  private lastTiles = 0;
  private lastStats = 0;
  private frameTimes: number[] = [];
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  readonly mobile =
    window.matchMedia('(pointer: coarse)').matches ||
    ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  private raycaster = new Raycaster();
  private down = new Vector3(0, -1, 0);
  private project = new Vector3();
  private markers = new Map<string, HTMLElement>();
  private stats: RuntimeStats | null = null;
  private lowDetail = false;
  private lastResolutionChange = 0;

  constructor(
    private host: HTMLElement,
    readonly manifest: WorldManifest,
    private onStats: (stats: RuntimeStats) => void,
    private onFailure: (message: string) => void,
  ) {
    this.renderer = new WebGLRenderer({
      antialias: !this.mobile,
      alpha: false,
      powerPreference: 'default',
      logarithmicDepthBuffer: !!manifest.regional,
    });
    const gl = this.renderer.getContext();
    const gpuInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = gpuInfo ? String(gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL)) : '';
    this.lowDetail = this.mobile || /swiftshader|llvmpipe|software/i.test(gpu);
    this.softwareRenderer = /swiftshader|llvmpipe|software/i.test(gpu);
    this.quality = chooseQuality({
      coarsePointer: this.mobile,
      softwareRenderer: this.softwareRenderer,
    });
    this.lowDetail = this.quality === 'LOW';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.lowDetail ? 1 : 1.5));
    this.scene.background = new Color('#a5c8ce');
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Vancouver coast in 3D. Drag to orbit; right-drag or two fingers to pan; scroll or pinch to zoom. Arrow keys pan; plus and minus zoom.',
    );
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.renderer.domElement.addEventListener('keydown', this.keyDown);
    this.host.appendChild(this.renderer.domElement);
    this.camera.position.fromArray(manifest.overview.position);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.fromArray(manifest.overview.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 25;
    this.controls.maxDistance = 45000;
    this.controls.maxPolarAngle = Math.PI * 0.499;
    this.controls.rotateSpeed = 0.45;
    this.controls.zoomSpeed = 0.7;
    this.controls.update();
    this.controls.listenToKeyEvents(this.renderer.domElement);
    this.navigation = new CameraNavigation(
      this.camera,
      this.controls,
      () => this.reducedMotion.matches,
    );
    this.controls.addEventListener('start', this.navigation.cancel);
    this.water = createWaterUniforms(manifest, this.lowDetail);
    this.crowds = new CrowdRuntime(this.scene, manifest);
    this.moving = new MovingRuntime(this.scene, manifest, this.water);
    this.urban = new UrbanRuntime(
      this.scene,
      manifest,
      this.water,
      (bridges) => this.moving.setBridges(bridges),
      () => this.telemetry.error('building'),
    );
    this.ocean = createOcean(this.water, manifest.depthTexture.bounds);
    this.ocean.visible = !manifest.marineTexture;
    new TextureLoader().load(
      assetUrl(manifest.depthTexture.assetUrl),
      (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.flipY = false;
        texture.colorSpace = NoColorSpace;
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = false;
        this.ocean.material.uniforms.depthMap.value = texture;
        this.ocean.material.uniforms.hasDepthMap.value = 1;
        this.crowds.setAtlas(texture.image);
        try {
          this.marine.setAtlas('height', texture.image, manifest.depthTexture.bounds);
        } catch {
          this.telemetry.error('water');
        }
        if (this.marine.ready) this.moving.setNavigation(this.marine);
      },
      undefined,
      () => {
        this.telemetry.error('water');
      },
    );
    if (manifest.marineTexture)
      new TextureLoader().load(
        assetUrl(manifest.marineTexture.assetUrl),
        (texture) => {
          if (this.disposed) {
            texture.dispose();
            return;
          }
          texture.flipY = false;
          texture.colorSpace = NoColorSpace;
          texture.minFilter = NearestFilter;
          texture.magFilter = NearestFilter;
          texture.generateMipmaps = false;
          this.ocean.material.uniforms.marineMap.value = texture;
          this.ocean.material.uniforms.hasMarineMap.value = 1;
          this.ocean.visible = true;
          try {
            this.marine.setAtlas(
              'connection',
              texture.image,
              manifest.marineTexture?.bounds ?? manifest.depthTexture.bounds,
            );
          } catch {
            this.telemetry.error('water');
          }
          if (this.marine.ready) this.moving.setNavigation(this.marine);
        },
        undefined,
        () => {
          this.telemetry.error('water');
          this.ocean.visible = false;
        },
      );
    this.scene.add(this.ocean);
    this.atmosphere = new Atmosphere(this.scene, this.water, this.lowDetail);
    this.tiles = new TileManager(this.scene, manifest.tiles, this.water, this.lowDetail, (kind) =>
      this.telemetry.error(kind),
    );
    this.regionalDebug = new RegionalDebug(this.scene, manifest, this.water);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.setQuality(this.quality);
    this.renderer.debug.onShaderError = () => {
      this.telemetry.error('webgl');
      this.onFailure(
        'This device could not render the coastal materials. Beach conditions remain available on the beach pages.',
      );
    };
    this.resize();
    document.addEventListener('visibilitychange', this.visibilityChanged);
    this.frame = requestAnimationFrame(this.tick);
  }

  private resize = () => {
    const { width, height } = this.host.getBoundingClientRect();
    this.renderer.setSize(Math.max(1, width), Math.max(1, height));
    this.camera.aspect = width / Math.max(1, height);
    // Keep the selected shoreline above the bottom control panel during flyovers.
    this.camera.setViewOffset(
      Math.max(1, width),
      Math.max(1, height),
      0,
      height * 0.18,
      Math.max(1, width),
      Math.max(1, height),
    );
    this.camera.updateProjectionMatrix();
    if (this.navigation.state === 'overview') {
      this.camera.position.fromArray(this.overviewPose().position);
      this.controls.update();
    }
  };

  private contextLost = (event: Event) => {
    event.preventDefault();
    this.telemetry.error('webgl');
    cancelAnimationFrame(this.frame);
    this.onFailure(
      'The 3D connection was interrupted. You can reload the coast or browse the beach pages.',
    );
  };

  private keyDown = (event: KeyboardEvent) => {
    if (event.key.startsWith('Arrow')) this.navigation.cancel();
    if (!['+', '=', '-'].includes(event.key)) return;
    event.preventDefault();
    this.navigation.cancel();
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.multiplyScalar(event.key === '-' ? 1.15 : 0.87);
    this.camera.position.copy(this.controls.target).add(offset);
  };

  private visibilityChanged = () => {
    cancelAnimationFrame(this.frame);
    this.lastFrame = 0;
    if (!document.hidden && !this.disposed) this.frame = requestAnimationFrame(this.tick);
  };

  private tick = (now: number) => {
    if (this.disposed || document.hidden) return;
    this.frame = requestAnimationFrame(this.tick);
    if (this.lowDetail && now - this.lastFrame < 30) return;
    if (this.lastFrame) this.frameTimes.push(now - this.lastFrame);
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.1) : 0;
    this.lastFrame = now;
    if (this.targetTide !== null && this.environment) {
      this.water.tide.value = smoothTide(
        this.water.tide.value,
        this.targetTide,
        dt,
        this.environment.mode,
      );
      this.ocean.position.y = this.water.tide.value;
    }
    this.navigation.update(now);
    this.controls.update();
    const { min, max } = this.manifest.bounds;
    this.controls.target.x = Math.max(min[0], Math.min(max[0], this.controls.target.x));
    this.controls.target.z = Math.max(min[2], Math.min(max[2], this.controls.target.z));
    this.controls.target.y = Math.max(-20, Math.min(250, this.controls.target.y));
    this.camera.position.y = Math.max(this.water.tide.value + 5, this.camera.position.y);
    // A metre-scale near plane at regional altitude loses shoreline depth precision.
    const near = Math.max(1, Math.min(100, this.camera.position.y * 0.02));
    if (Math.abs(this.camera.near - near) > 0.1) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
    if (now - this.lastTiles > 250) {
      this.tiles.update(this.camera, this.controls.target);
      if (this.camera.position.y < 350) {
        this.raycaster.set(
          new Vector3(this.camera.position.x, 1000, this.camera.position.z),
          this.down,
        );
        const hit = this.raycaster.intersectObjects(this.tiles.groups, true)[0];
        if (hit) this.camera.position.y = Math.max(this.camera.position.y, hit.point.y + 5);
      }
      this.lastTiles = now;
    }
    this.water.time.value = this.reducedMotion.matches ? 0 : now / 1000;
    this.water.recentTide.value = Math.max(
      this.water.tide.value,
      this.water.recentTide.value - dt * 0.005,
    );
    this.atmosphere.update(this.camera, this.reducedMotion.matches, this.lowDetail);
    this.crowds.update(
      this.camera,
      dt,
      this.water.tide.value,
      this.lowDetail,
      this.reducedMotion.matches,
    );
    if (this.tiles.loadedCount > 0) {
      this.urban.start(this.quality === 'LOW');
      if (this.urban.ready || this.urban.unavailable || !this.manifest.urban)
        this.moving.update(
          this.camera,
          dt,
          this.water.tide.value,
          this.lowDetail,
          this.reducedMotion.matches,
        );
    }
    this.renderer.render(this.scene, this.camera);
    if (this.tiles.loadedCount > 0) this.telemetry.firstRender(now);
    this.updateMarkers();
    if (now - this.lastStats > 1000) {
      const samples = this.frameTimes.sort((a, b) => a - b);
      const mean = samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
      const info = this.renderer.info;
      this.stats = {
        quality: this.quality,
        fps: Math.round(1000 / Math.max(1, mean)),
        frameP95: samples[Math.floor(samples.length * 0.95)] ?? 0,
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        ...this.tiles.stats,
        detail: this.lowDetail ? 'mobile' : 'desktop',
        renderScale: this.renderer.getPixelRatio(),
      };
      const atlas = this.ocean.material.uniforms.depthMap.value;
      this.stats.estimatedGpuBytes += this.urban.snapshot().estimatedGpuBytes;
      if (
        this.selectedBeach &&
        this.navigation.state === 'beach' &&
        this.stats.detailTiles > 0 &&
        this.stats.pendingTiles === 0
      )
        this.telemetry.beachDetailReady(now);
      if (atlas?.image) this.stats.estimatedGpuBytes += atlas.image.width * atlas.image.height * 4;
      this.onStats(this.stats);
      this.frameTimes = [];
      this.lastStats = now;
      // Sustained slow devices fall back to one physical pixel per CSS pixel.
      if (
        now > 8000 &&
        (mean > 45 || this.stats.estimatedGpuBytes > QUALITY_BUDGETS[this.quality].maxGpuBytes) &&
        this.quality !== 'LOW' &&
        now - this.lastResolutionChange > 4000
      ) {
        this.setQuality(lowerQuality(this.quality));
        this.lastResolutionChange = now;
      } else if (
        this.lowDetail &&
        mean > 50 &&
        now - this.lastResolutionChange > 4000 &&
        this.renderer.getPixelRatio() > 0.5
      ) {
        // Software GPUs can remain fill-rate limited after LOD reduction. Bound their
        // render resolution separately; DOM controls and geographic camera poses stay crisp.
        this.renderer.setPixelRatio(
          Math.max(0.5, this.renderer.getPixelRatio() * Math.sqrt(34 / mean)),
        );
        this.lastResolutionChange = now;
        this.resize();
      }
    }
  };

  private updateMarkers() {
    const occupied: { x: number; y: number }[] = [];
    for (const beach of this.manifest.beaches) {
      const element = this.markers.get(beach.id);
      if (!element) continue;
      this.project.fromArray(beach.worldPosition);
      this.project.y += 15;
      this.project.project(this.camera);
      const x = (this.project.x * 0.5 + 0.5) * this.host.clientWidth;
      const y = (-this.project.y * 0.5 + 0.5) * this.host.clientHeight;
      const visible =
        this.project.z > -1 &&
        this.project.z < 1 &&
        x > 65 &&
        x < this.host.clientWidth - 65 &&
        y > 40 &&
        y < this.host.clientHeight - 180 &&
        !occupied.some((p) => Math.abs(p.x - x) < 130 && Math.abs(p.y - y) < 36);
      element.style.visibility = visible ? 'visible' : 'hidden';
      element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      if (visible) occupied.push({ x, y });
    }
  }

  setMarkers(markers: Map<string, HTMLElement>) {
    this.markers = markers;
  }
  setWater(settings: WaterSettings) {
    this.targetTide = null;
    updateWater(this.water, settings, this.manifest.chartDatumOffsetMetres);
    this.ocean.position.y = this.water.tide.value;
  }
  setEnvironment(state: EnvironmentalState, depthMode: boolean) {
    this.environment = state;
    this.targetTide =
      this.manualTide === null
        ? tideToWorld(state.tide.heightCD, this.manifest.chartDatumOffsetMetres)
        : null;
    this.water.depthMode.value = depthMode ? 1 : 0;
    this.atmosphere.set(state);
    this.crowds.setEnvironment(state);
    this.moving.setEnvironment(state);
  }
  setMountainSnow(lineMetres: number, amount: number) {
    if (!Number.isFinite(lineMetres) || !Number.isFinite(amount)) return;
    this.water.snowLine.value = Math.max(0, Math.min(4000, lineMetres));
    this.water.snowAmount.value = Math.max(0, Math.min(1, amount));
  }
  async setTerrainDebug(mode: TerrainDebugMode, beachId: string, move = false) {
    const pose = await this.regionalDebug.set(mode, beachId);
    if (pose && move && !this.disposed) this.navigation.fly(pose, 'beach');
  }
  flyToBeach(beach: Destination, close = false) {
    this.selectedBeach = beach;
    this.telemetry.selectBeach();
    this.navigation.flyToBeach(beach, close);
  }
  private overviewPose() {
    const target = new Vector3(...this.manifest.overview.target);
    const position = new Vector3(...this.manifest.overview.position)
      .sub(target)
      .multiplyScalar(Math.max(1, 1.25 / this.camera.aspect))
      .add(target);
    return { target: target.toArray(), position: position.toArray() };
  }
  overview() {
    this.navigation.fly(this.overviewPose());
  }
  retry() {
    this.tiles.retry();
  }
  setQuality(tier: QualityTier) {
    this.quality = chooseQuality({ requested: tier, softwareRenderer: this.softwareRenderer });
    const budget = QUALITY_BUDGETS[this.quality];
    this.lowDetail = this.quality === 'LOW';
    this.tiles.setQuality(this.quality);
    this.water.simple.value = budget.richWater ? 0 : 1;
    this.crowds.setBudget(this.peopleEnabled ? budget.maxPeople : 0);
    this.moving.setBudget(budget.maxEntities);
    this.atmosphere.setBudget(budget.maxParticles);
    this.urban.setLow(this.lowDetail);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, budget.maxDpr));
    this.resize();
  }
  setLayers(layers: Partial<MovingLayers> & { people?: boolean }) {
    this.moving.setLayers(layers);
    if (layers.people !== undefined) {
      this.peopleEnabled = layers.people;
      this.crowds.setBudget(layers.people ? QUALITY_BUDGETS[this.quality].maxPeople : 0);
    }
  }
  setUrbanLayer(layer: UrbanLayer, enabled: boolean) {
    this.urban.setLayer(layer, enabled);
  }
  setUrbanDebug(mode: UrbanDebug) {
    this.urban.setDebug(mode);
  }
  setWaterDebug(mode: 'off' | 'occlusion' | 'marine', opacity = 1) {
    this.ocean.material.uniforms.waterDebug.value = ['off', 'occlusion', 'marine'].indexOf(mode);
    this.ocean.material.uniforms.diagnosticOpacity.value = Math.max(0.05, Math.min(1, opacity));
  }
  setTide(heightCD: number | null) {
    if (heightCD === null) {
      this.manualTide = null;
      if (this.environment)
        this.targetTide = tideToWorld(
          this.environment.tide.heightCD,
          this.manifest.chartDatumOffsetMetres,
        );
      return;
    }
    if (!Number.isFinite(heightCD)) return;
    this.manualTide = heightCD;
    this.targetTide = null;
    this.water.tide.value = tideToWorld(heightCD, this.manifest.chartDatumOffsetMetres);
    this.ocean.position.y = this.water.tide.value;
  }
  snapshot() {
    return {
      ...this.stats,
      quality: this.quality,
      telemetry: this.telemetry.snapshot(),
      urban: this.urban.snapshot(),
      moving: this.moving.snapshot(),
      marine: { ready: this.marine.ready, mask: this.ocean.material.uniforms.hasMarineMap.value },
      cameraState: this.navigation.state,
      position: this.camera.position.toArray(),
      target: this.controls.target.toArray(),
      tide: this.water.tide.value,
      depthMode: this.water.depthMode.value,
      targetTide: this.targetTide,
      environment: this.environment,
      atmosphere: this.atmosphere.snapshot(),
      crowds: this.crowds.snapshot(),
      mountains: {
        snowLine: this.water.snowLine.value,
        snowAmount: this.water.snowAmount.value,
        earthRadius: this.water.earthRadius.value,
        debug: this.water.terrainDebug.value,
      },
      visual: {
        amplitude: this.water.amplitude.value,
        speed: this.water.speed.value,
        roughness: this.water.roughness.value,
        haze: this.water.hazeDensity.value,
        sunlight: this.water.sunlight.value,
        wetness: this.water.wetness.value,
      },
    };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.visibilityChanged);
    this.controls.removeEventListener('start', this.navigation.cancel);
    this.controls.dispose();
    this.tiles.dispose();
    this.atmosphere.dispose();
    this.regionalDebug.dispose();
    this.crowds.dispose();
    this.urban.dispose();
    this.moving.dispose();
    this.ocean.geometry.dispose();
    this.ocean.material.dispose();
    this.ocean.material.uniforms.depthMap.value?.dispose();
    this.ocean.material.uniforms.marineMap.value?.dispose();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.renderer.domElement.removeEventListener('keydown', this.keyDown);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
