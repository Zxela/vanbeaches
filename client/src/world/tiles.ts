import { Box3, Frustum, Matrix4, Mesh, Vector3 } from 'three';
import type { BufferAttribute, Group, Material, PerspectiveCamera, Scene, Texture } from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from './manifest';
import { terrainMaterial } from './materials';
import type { WaterUniforms } from './materials';
import { mountainMaterial } from './mountains';
import { QUALITY_BUDGETS, type QualityTier } from './quality';
import type { Point, Tile } from './types';

export const tileKey = (tile: Tile) => `${tile.id}:${tile.lod}`;

export function chooseDetail(
  tiles: Tile[],
  position: Point,
  target: Point,
  mobile: boolean,
  current = new Set<string>(),
) {
  if (position[1] > 1900) return [];
  const candidates = tiles.filter((tile) => {
    if (tile.layer === 'regional' || tile.lod === 0 || (mobile && tile.lod === 2)) return false;
    const x = (tile.bounds.min[0] + tile.bounds.max[0]) / 2;
    const z = (tile.bounds.min[2] + tile.bounds.max[2]) / 2;
    const distance = Math.min(
      Math.hypot(x - position[0], z - position[2]),
      Math.hypot(x - target[0], z - target[2]),
    );
    const radius = tile.lod === 2 ? 850 : mobile ? 1400 : 2300;
    return (
      distance < radius * (current.has(tileKey(tile)) ? 1.2 : 1) &&
      (tile.lod !== 2 || position[1] < 650)
    );
  });
  candidates.sort((a, b) => b.lod - a.lod || distanceTo(a, target) - distanceTo(b, target));
  const selected = new Map<string, Tile>();
  let fine = 0;
  for (const tile of candidates) {
    if (selected.has(tile.id) || (tile.lod === 2 && fine >= 4)) continue;
    selected.set(tile.id, tile);
    if (tile.lod === 2) fine++;
  }
  return [...selected.values()].slice(0, mobile ? 8 : 12);
}

function distanceTo(tile: Tile, point: Point) {
  return Math.hypot(
    (tile.bounds.min[0] + tile.bounds.max[0]) / 2 - point[0],
    (tile.bounds.min[2] + tile.bounds.max[2]) / 2 - point[2],
  );
}

export function disposeGroup(group: Group) {
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      if (material.map) textures.add(material.map);
      if (material.uniforms?.aerial?.value) textures.add(material.uniforms.aerial.value);
    }
  });
  for (const material of materials) material.dispose();
  for (const texture of textures) {
    texture.dispose();
    texture.image?.close?.();
  }
  group.removeFromParent();
}

export class TileManager {
  private quality: QualityTier = 'HIGH';
  private draco = new DRACOLoader()
    .setDecoderPath(assetUrl('decoders/'))
    .setDecoderConfig({ type: 'wasm' })
    .setWorkerLimit(2);
  private loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setDRACOLoader(this.draco);
  private loaded = new Map<string, { tile: Tile; group: Group }>();
  private pending = new Map<string, AbortController>();
  private failures = new Map<string, { count: number; retry: number }>();
  private wanted = new Map<string, Tile>();
  private disposed = false;
  private base: Tile[];
  downloadedBytes = 0;
  private regionalDownloadedBytes = 0;
  private frustum = new Frustum();
  private matrix = new Matrix4();

  constructor(
    private scene: Scene,
    private tiles: Tile[],
    private water: WaterUniforms,
    private mobile: boolean,
    private onError: (kind: 'terrain' | 'regional') => void = () => {},
  ) {
    this.base = tiles.filter((tile) => tile.lod === 0);
  }

  update(camera: PerspectiveCamera, target: Vector3) {
    if (this.disposed) return;
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(
      this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    const visible = this.base.filter((tile) =>
      this.frustum.intersectsBox(
        new Box3(
          new Vector3(...tile.bounds.min).add(
            new Vector3(0, tile.layer === 'regional' ? -3000 : -30, 0),
          ),
          new Vector3(...tile.bounds.max),
        ),
      ),
    );
    visible.sort((a, b) => distanceTo(a, target.toArray()) - distanceTo(b, target.toArray()));
    // Reserve early requests for the shared mountain silhouette; coastal loading still starts
    // in the same batch. Higher regional LODs wait for their coarse replacement to arrive.
    const regional = visible.filter((tile) => tile.layer === 'regional');
    const coastal = visible.filter((tile) => tile.layer !== 'regional');
    const detail = chooseDetail(
      this.tiles,
      camera.position.toArray(),
      target.toArray(),
      this.mobile,
      new Set(this.wanted.keys()),
    ).slice(0, QUALITY_BUDGETS[this.quality].maxDetailTiles);
    const regionalDetail =
      this.mobile || camera.position.y > 1900
        ? []
        : regional
            .filter(
              (tile) =>
                this.loaded.has(tileKey(tile)) &&
                distanceTo(tile, camera.position.toArray()) < 35000,
            )
            .slice(0, QUALITY_BUDGETS[this.quality].maxRegionalDetailTiles)
            .map((tile) =>
              this.tiles.find((candidate) => candidate.id === tile.id && candidate.lod === 1),
            )
            .filter((tile): tile is Tile => !!tile);
    const early: Tile[] = [];
    for (let i = 0; i < Math.max(coastal.length, regional.length); i += 2)
      early.push(...coastal.slice(i, i + 2), ...regional.slice(i, i + 2));
    this.wanted = new Map(
      [...early, ...detail, ...regionalDetail].map((tile) => [tileKey(tile), tile]),
    );
    for (const [key, abort] of this.pending) if (!this.wanted.has(key)) abort.abort();
    for (const [key, loaded] of this.loaded) {
      if (!this.wanted.has(key) && (loaded.tile.lod > 0 || this.loaded.size > 220)) {
        disposeGroup(loaded.group);
        this.loaded.delete(key);
      }
    }
    this.visibility();
    this.pump();
  }

  private visibility() {
    for (const { tile, group } of this.loaded.values()) {
      group.visible =
        (tile.layer !== 'regional' || this.wanted.has(tileKey(tile))) &&
        (tile.lod > 0 || ![1, 2].some((lod) => this.loaded.has(`${tile.id}:${lod}`)));
    }
  }

  private pump() {
    if (this.disposed) return;
    for (const [key, tile] of this.wanted) {
      if (this.pending.size >= QUALITY_BUDGETS[this.quality].maxConcurrentLoads) break;
      const failure = this.failures.get(key);
      if (
        this.loaded.has(key) ||
        this.pending.has(key) ||
        (failure && (failure.count >= 3 || performance.now() < failure.retry))
      )
        continue;
      const abort = new AbortController();
      this.pending.set(key, abort);
      void this.load(tile, abort).finally(() => {
        this.pending.delete(key);
        this.pump();
      });
    }
  }

  private async load(tile: Tile, abort: AbortController) {
    const key = tileKey(tile);
    try {
      const response = await fetch(assetUrl(tile.assetUrl), { signal: abort.signal });
      if (!response.ok) throw new Error(`Terrain ${response.status}`);
      const bytes = await response.arrayBuffer();
      this.downloadedBytes += bytes.byteLength;
      if (tile.layer === 'regional') this.regionalDownloadedBytes += bytes.byteLength;
      if (abort.signal.aborted || this.disposed) return;
      const { scene: group } = await this.loader.parseAsync(bytes, '');
      if (abort.signal.aborted || this.disposed || !this.wanted.has(key)) {
        disposeGroup(group);
        return;
      }
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        if (tile.layer === 'regional') object.frustumCulled = false;
        const previous = object.material;
        const map = previous.map ?? null;
        object.material =
          tile.layer === 'regional'
            ? mountainMaterial(this.water, tile)
            : terrainMaterial(this.water, map);
        previous.dispose();
      });
      group.position.fromArray(tile.worldTransform);
      this.loaded.set(key, { tile, group });
      this.failures.delete(key);
      this.scene.add(group);
      this.visibility();
    } catch (error) {
      if (abort.signal.aborted || this.disposed) return;
      const count = (this.failures.get(key)?.count ?? 0) + 1;
      this.failures.set(key, { count, retry: performance.now() + count * 2000 });
      this.onError(tile.layer === 'regional' ? 'regional' : 'terrain');
      console.warn('Coast tile could not load', tile.id, error);
    }
  }

  get groups() {
    return [...this.loaded.values()].filter(({ group }) => group.visible).map(({ group }) => group);
  }
  get loadedCount() {
    return this.loaded.size;
  }
  get stats() {
    let estimatedGpuBytes = 0;
    for (const { group } of this.loaded.values())
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        for (const attribute of Object.values(object.geometry.attributes) as BufferAttribute[])
          estimatedGpuBytes += attribute.array.byteLength;
        estimatedGpuBytes += object.geometry.index?.array.byteLength ?? 0;
        const texture = object.material.uniforms?.aerial?.value;
        if (texture?.image)
          estimatedGpuBytes += (texture.image.width * texture.image.height * 4 * 4) / 3;
      });
    return {
      loadedTiles: this.loaded.size,
      detailTiles: [...this.loaded.values()].filter(({ tile }) => tile.lod > 0).length,
      pendingTiles: this.pending.size,
      failedTiles: [...this.failures.keys()].filter((key) => this.wanted.has(key)).length,
      downloadedBytes: this.downloadedBytes,
      estimatedGpuBytes,
      regionalTiles: [...this.loaded.values()].filter(
        ({ tile, group }) => tile.layer === 'regional' && group.visible,
      ).length,
      regionalTriangles: [...this.loaded.values()]
        .filter(({ tile, group }) => tile.layer === 'regional' && group.visible)
        .reduce((n, { tile }) => n + tile.triangles, 0),
      regionalDownloadedBytes: this.regionalDownloadedBytes,
    };
  }
  retry() {
    this.failures.clear();
    this.pump();
  }
  reduceDetail() {
    this.mobile = true;
  }
  setQuality(quality: QualityTier) {
    this.quality = quality;
    this.mobile = !QUALITY_BUDGETS[quality].fineTerrain;
  }
  dispose() {
    this.disposed = true;
    for (const abort of this.pending.values()) abort.abort();
    for (const { group } of this.loaded.values()) disposeGroup(group);
    this.loaded.clear();
    this.wanted.clear();
    this.draco.dispose();
  }
}
