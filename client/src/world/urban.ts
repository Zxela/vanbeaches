import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  Path,
  Shape,
  Vector3,
} from 'three';
import type { Scene } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WorldShaderMaterial } from './depth';
import { assetUrl } from './manifest';
import { type WaterUniforms, atmosphereDeclarations, curvatureShader } from './materials';
import type { WorldManifest } from './types';

type GISPoint = [number, number, number];
export interface UrbanBridge {
  id: string;
  name: string;
  points: GISPoint[];
  width: number;
  deckHeight?: number;
  towerHeight?: number;
  towerFractions?: number[];
  towers?: { position: GISPoint; height: number }[];
  style?: string;
}
interface UrbanData {
  buildings: {
    id: string;
    footprint: [number, number][];
    holes?: [number, number][][];
    base: number;
    height: number;
    heightSource: string;
    tile?: string;
  }[];
  roads: { points: GISPoint[]; width: number; kind: string }[];
  bridges: UrbanBridge[];
  waterfront: { points: GISPoint[]; width: number; kind: string }[];
  landcover: { ring: GISPoint[]; kind: string; vertices?: GISPoint[]; faces?: number[][] }[];
}
export type UrbanLayer = 'buildings' | 'roads' | 'bridges' | 'landcover' | 'waterfront';
export type UrbanDebug = 'off' | 'height-source' | 'lod';
const world = (p: GISPoint) => new Vector3(p[0], p[2], -p[1]);

function coloured(geometry: BufferGeometry, colour: Color, source = 0) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  g.deleteAttribute('uv');
  const count = g.getAttribute('position').count;
  g.setAttribute(
    'color',
    new Float32BufferAttribute(Array.from({ length: count }, () => colour.toArray()).flat(), 3),
  );
  g.setAttribute(
    'heightSource',
    new Float32BufferAttribute(new Float32Array(count).fill(source), 1),
  );
  return g;
}
function beam(a: Vector3, b: Vector3, width: number, height: number) {
  const delta = b.clone().sub(a);
  const g = new BoxGeometry(width, height, delta.length());
  const mesh = new Mesh(g);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.lookAt(b);
  mesh.updateMatrix();
  g.applyMatrix4(mesh.matrix);
  return g;
}

/** Static geometry is merged by spatial tile/material role, never one draw call per building. */
export class UrbanRuntime {
  private coarse = new Group();
  private detail = new Group();
  private abort = new AbortController();
  private material: WorldShaderMaterial;
  private low = false;
  private loaded = false;
  private failed = 0;
  private bytes = 0;
  private buildings = 0;
  private layers: Record<UrbanLayer, boolean> = {
    buildings: true,
    roads: true,
    bridges: true,
    landcover: true,
    waterfront: true,
  };
  private bridges: UrbanBridge[] = [];
  private started = false;
  private detailStarted = false;
  private disposed = false;
  constructor(
    private scene: Scene,
    private manifest: WorldManifest,
    water: WaterUniforms,
    private onBridges: (bridges: UrbanBridge[]) => void,
    private onFailure: () => void,
  ) {
    this.material = new WorldShaderMaterial({
      uniforms: { ...water, urbanDebug: { value: 0 } },
      vertexShader: `${curvatureShader}
        attribute vec3 color; attribute float heightSource; varying vec3 tint; varying vec3 world; varying vec3 n; varying float source;
        void main() { vec4 p=modelMatrix*vec4(position,1.0); world=p.xyz; tint=color; source=heightSource;
          n=curveNormal(normalize(mat3(modelMatrix)*normal),world); p.xyz=curveTerrain(p.xyz); gl_Position=projectionMatrix*viewMatrix*p; }`,
      fragmentShader: `${atmosphereDeclarations}
        uniform float urbanDebug; varying vec3 tint; varying vec3 world; varying vec3 n; varying float source;
        void main() { vec3 colour=tint;
          if (urbanDebug > 0.5 && urbanDebug < 1.5) colour=mix(vec3(0.23,0.62,0.76),vec3(0.9,0.55,0.22),source);
          if (urbanDebug > 1.5) colour=vec3(0.45,0.7,0.5);
          vec3 light=vec3(ambientLight)+sunColour*sunlight*0.65*max(0.0,dot(normalize(n),sunDirection));
          float windows=step(0.72,fract(world.y/3.2))*step(0.65,fract((world.x+world.z)/5.0))*(1.0-step(0.5,abs(n.y)));
          colour=colour*light+vec3(0.9,0.64,0.25)*windows*max(0.0,0.25-sunlight)*0.3;
          gl_FragColor=vec4(atmosphere(colour,world),1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    scene.add(this.coarse, this.detail);
  }
  start(low: boolean) {
    if (this.started) return;
    this.low = low;
    if (!this.started && this.manifest.urban) {
      this.started = true;
      void this.load(this.manifest.urban.coarseAssetUrl ?? this.manifest.urban.assetUrl, false);
    }
    this.visibility();
  }
  setLow(low: boolean) {
    this.low = low;
    this.visibility();
    this.refine();
  }
  get ready() {
    return this.loaded;
  }
  get unavailable() {
    return this.failed > 0;
  }
  setLayer(layer: UrbanLayer, enabled: boolean) {
    this.layers[layer] = enabled;
    this.visibility();
  }
  setDebug(mode: UrbanDebug) {
    this.material.uniforms.urbanDebug.value = ['off', 'height-source', 'lod'].indexOf(mode);
  }
  private refine() {
    if (!this.low && this.loaded && !this.detailStarted && this.manifest.urban?.coarseAssetUrl) {
      this.detailStarted = true;
      void this.load(this.manifest.urban.assetUrl, true);
    }
  }
  private async load(url: string, detail: boolean) {
    try {
      const response = await fetch(assetUrl(url), { signal: this.abort.signal });
      if (!response.ok) throw new Error('Urban asset unavailable');
      const text = await response.text();
      this.bytes += text.length;
      const data = JSON.parse(text) as UrbanData;
      if (this.disposed) return;
      const group = detail ? this.detail : this.coarse;
      this.build(data, group);
      this.buildings = data.buildings.length;
      this.bridges = data.bridges;
      this.onBridges(data.bridges);
      this.loaded = true;
      this.visibility();
      this.refine();
    } catch {
      if (!this.disposed) {
        this.failed++;
        this.onFailure();
      }
    }
  }
  private build(data: UrbanData, group: Group) {
    const batches = new Map<string, BufferGeometry[]>();
    const add = (layer: UrbanLayer, g: BufferGeometry, c: string, source = 0) => {
      g.computeBoundingBox();
      const centre = g.boundingBox?.getCenter(new Vector3()) ?? new Vector3();
      const key = `${layer}:${Math.floor(centre.x / 1500)}:${Math.floor(centre.z / 1500)}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key)?.push(coloured(g, new Color(c), source));
    };
    for (const b of data.buildings) {
      if (b.footprint.length < 3 || !Number.isFinite(b.base + b.height) || b.height <= 0) continue;
      const shape = new Shape(b.footprint.map(([x, y]) => ({ x, y }) as import('three').Vector2));
      for (const hole of b.holes ?? [])
        shape.holes.push(new Path(hole.map(([x, y]) => ({ x, y }) as import('three').Vector2)));
      const g = new ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false, steps: 1 });
      g.translate(0, 0, b.base);
      g.rotateX(-Math.PI / 2);
      add(
        'buildings',
        g,
        b.height > 45 ? '#809899' : '#a5a59d',
        /fallback|levels/i.test(b.heightSource) ? 1 : 0,
      );
    }
    const ribbons = (items: UrbanData['roads'], layer: UrbanLayer) => {
      for (const item of items) {
        if (item.kind === 'tunnel' || (layer === 'roads' && item.kind === 'bridge')) continue;
        for (let i = 1; i < item.points.length; i++) {
          const a = world(item.points[i - 1]);
          const b = world(item.points[i]);
          a.y += 0.25;
          b.y += 0.25;
          add(layer, beam(a, b, item.width || 3, 0.25), layer === 'roads' ? '#555957' : '#a9a597');
        }
      }
    };
    ribbons(data.roads, 'roads');
    ribbons(data.waterfront, 'waterfront');
    for (const bridge of data.bridges) {
      const points = bridge.points.map(world);
      const colour = /lions/i.test(bridge.name) ? '#578b83' : '#a0a196';
      for (let i = 1; i < points.length; i++)
        add(
          'bridges',
          beam(
            points[i - 1].clone().add(new Vector3(0, -1, 0)),
            points[i].clone().add(new Vector3(0, -1, 0)),
            bridge.width,
            2,
          ),
          colour,
        );
      if (points.length < 2) continue;
      const start = points[0];
      const end = points[points.length - 1];
      for (const [index, fraction] of (bridge.towerFractions ?? [0.28, 0.72]).entries()) {
        const p = start.clone().lerp(end, fraction);
        const tower = bridge.towers?.[index];
        const top = tower ? world(tower.position) : p.clone();
        top.y = tower?.height ?? bridge.towerHeight ?? p.y;
        const bottom = top.clone();
        bottom.y = 0;
        add('bridges', beam(bottom, top, 4, bridge.width * 0.8), colour);
        if (top.y > p.y + 30) {
          for (const side of [-1, 1]) {
            const offset = new Vector3(end.z - start.z, 0, start.x - end.x)
              .normalize()
              .multiplyScalar((bridge.width / 2) * side);
            for (const target of [start, start.clone().lerp(end, 0.5), end])
              add(
                'bridges',
                beam(top.clone().add(offset), target.clone().add(offset), 1.2, 1.2),
                colour,
              );
          }
        }
      }
    }
    // Survey-following park/forest triangles are broad cover, not high-poly individual trees.
    for (const area of data.landcover) {
      if (area.vertices?.length && area.faces?.length) {
        const g = new BufferGeometry();
        g.setAttribute(
          'position',
          new Float32BufferAttribute(
            area.vertices.flatMap((p) => [p[0], p[2] + 0.15, -p[1]]),
            3,
          ),
        );
        g.setIndex(area.faces.flat());
        g.computeVertexNormals();
        add('landcover', g, area.kind === 'forest' ? '#304934' : '#647457');
        continue;
      }
      if (area.ring.length < 3) continue;
      const shape = new Shape(area.ring.map(([x, y]) => ({ x, y }) as import('three').Vector2));
      const g = new ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false, steps: 1 });
      // Vertex heights interpolate from nearest sourced ring point; ground remains visible between patches.
      const positions = g.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        let nearest = area.ring[0];
        let distance = Number.POSITIVE_INFINITY;
        for (const p of area.ring) {
          const d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
          if (d < distance) {
            nearest = p;
            distance = d;
          }
        }
        positions.setZ(i, nearest[2] + 0.3 + positions.getZ(i));
      }
      g.rotateX(-Math.PI / 2);
      g.computeVertexNormals();
      add('landcover', g, area.kind === 'forest' ? '#304934' : '#647457');
    }
    for (const [key, parts] of batches) {
      const geometry = mergeGeometries(parts);
      for (const part of parts) part.dispose();
      if (!geometry) continue;
      const mesh = new Mesh(geometry, this.material);
      mesh.userData.layer = key.split(':')[0];
      // Curvature moves vertices; bounding spheres are extended vertically to avoid false culls.
      geometry.computeBoundingSphere();
      if (geometry.boundingSphere) geometry.boundingSphere.radius += 150;
      group.add(mesh);
    }
  }
  private visibility() {
    this.detail.visible = !this.low && this.detail.children.length > 0;
    this.coarse.visible = !this.detail.visible;
    for (const group of [this.coarse, this.detail])
      for (const child of group.children)
        child.visible = this.layers[child.userData.layer as UrbanLayer];
  }
  snapshot() {
    let estimatedGpuBytes = 0;
    for (const group of [this.coarse, this.detail])
      for (const child of group.children) {
        if (child instanceof Mesh)
          for (const attribute of Object.values(child.geometry.attributes))
            estimatedGpuBytes += (attribute as import('three').BufferAttribute).array.byteLength;
      }
    return {
      estimatedGpuBytes,
      loaded: this.loaded,
      failed: this.failed,
      buildings: this.buildings,
      bridges: this.bridges.length,
      downloadedBytes: this.bytes,
      lod: this.detail.visible ? 'mid' : 'skyline',
      drawCalls: (this.detail.visible ? this.detail : this.coarse).children.filter((c) => c.visible)
        .length,
    };
  }
  dispose() {
    this.disposed = true;
    this.abort.abort();
    for (const group of [this.coarse, this.detail]) {
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      this.scene.remove(group);
    }
    this.material.dispose();
  }
}
