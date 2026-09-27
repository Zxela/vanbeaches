import {
  Box3,
  Box3Helper,
  BufferGeometry,
  Group,
  Line,
  type LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three';
import type { Scene } from 'three';
import { WorldShaderMaterial as ShaderMaterial } from './depth';
import { assetUrl } from './manifest';
import { curvatureShader } from './materials';
import type { WaterUniforms } from './materials';
import type { CameraPose, WorldManifest } from './types';

export type TerrainDebugMode =
  | 'off'
  | 'source'
  | 'lod'
  | 'distance'
  | 'bounds'
  | 'horizon'
  | 'rays'
  | 'visibility';
interface HorizonPoint {
  azimuth: number;
  angle: number;
  distance: number | null;
  elevation: number | null;
  point: [number, number, number] | null;
}
interface HorizonBeach {
  id: string;
  heading: number;
  position: [number, number, number];
  profile: HorizonPoint[];
  diagnosticRays?: { visible: boolean; point: [number, number, number] }[][];
}

export class RegionalDebug {
  private root = new Group();
  private abort = new AbortController();
  private beaches: HorizonBeach[] = [];
  private mode: TerrainDebugMode = 'off';
  private beachId = '';
  constructor(
    scene: Scene,
    private manifest: WorldManifest,
    private water: WaterUniforms,
  ) {
    scene.add(this.root);
  }
  private clear() {
    for (const object of [...this.root.children]) {
      if (object instanceof Line || object instanceof LineSegments) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          material.dispose();
      }
      object.removeFromParent();
    }
  }
  async set(mode: TerrainDebugMode, beachId: string): Promise<CameraPose | null> {
    this.mode = mode;
    this.beachId = beachId;
    this.water.terrainDebug.value =
      ({ source: 1, lod: 2, distance: 3 } as Partial<Record<TerrainDebugMode, number>>)[mode] ?? 0;
    this.clear();
    if (mode === 'off' || !this.manifest.regional) return null;
    if (!this.beaches.length) {
      try {
        const response = await fetch(assetUrl(this.manifest.regional.horizonsUrl), {
          signal: this.abort.signal,
        });
        if (!response.ok) throw new Error('Horizon diagnostics unavailable');
        this.beaches = (await response.json()).beaches;
      } catch {
        return null;
      }
      if (this.abort.signal.aborted || this.mode !== mode || this.beachId !== beachId) return null;
    }
    const beach = this.beaches.find((b) => b.id === beachId) ?? this.beaches[0];
    this.clear();
    const material = (colour: string) =>
      new ShaderMaterial({
        uniforms: { ...this.water },
        depthTest: false,
        vertexShader: `${curvatureShader} void main(){vec3 p=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(curveTerrain(p),1.0);}`,
        fragmentShader: `void main(){gl_FragColor=vec4(${colour},1.0);}`,
      });
    if (mode === 'bounds') {
      for (const tile of this.manifest.tiles.filter((t) => t.layer === 'regional' && t.lod === 0)) {
        const box = new Box3Helper(
          new Box3(new Vector3(...tile.bounds.min), new Vector3(...tile.bounds.max)),
          0xffbb44,
        );
        (box.material as LineBasicMaterial).dispose();
        box.material = material('1.0,0.7,0.2');
        this.root.add(box);
      }
    }
    if (['horizon', 'rays', 'visibility'].includes(mode)) {
      const segments: Vector3[] = [];
      if (mode === 'horizon') {
        for (let i = 1; i < beach.profile.length; i++) {
          const a = beach.profile[i - 1].point;
          const b = beach.profile[i].point;
          if (a && b) segments.push(new Vector3(...a), new Vector3(...b));
        }
      } else if (mode === 'rays') {
        for (const point of beach.profile.filter((_, i) => i % 40 === 0))
          if (point.point)
            segments.push(new Vector3(...beach.position), new Vector3(...point.point));
      } else {
        for (const visible of [true, false]) {
          const points: Vector3[] = [];
          for (const ray of beach.diagnosticRays ?? [])
            for (const p of ray) {
              if (p.visible === visible)
                points.push(
                  new Vector3(...p.point),
                  new Vector3(p.point[0], p.point[1] + 25, p.point[2]),
                );
            }
          this.root.add(
            new LineSegments(
              new BufferGeometry().setFromPoints(points),
              material(visible ? '0.1,1.0,0.4' : '1.0,0.2,0.25'),
            ),
          );
        }
      }
      this.root.add(
        new LineSegments(new BufferGeometry().setFromPoints(segments), material('0.2,1.0,0.7')),
      );
      const p = new Vector3(...beach.position);
      this.root.add(
        new LineSegments(
          new BufferGeometry().setFromPoints([
            p.clone().add(new Vector3(-20, 0, 0)),
            p.clone().add(new Vector3(20, 0, 0)),
            p.clone(),
            p.clone().add(new Vector3(0, 40, 0)),
          ]),
          material('1.0,0.8,0.1'),
        ),
      );
    }
    const a = (beach.heading * Math.PI) / 180;
    return {
      position: beach.position,
      target: [
        beach.position[0] + Math.sin(a) * 400,
        beach.position[1] - 3,
        beach.position[2] - Math.cos(a) * 400,
      ],
    };
  }
  dispose() {
    this.abort.abort();
    this.clear();
    this.root.removeFromParent();
  }
}
