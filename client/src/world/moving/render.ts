import {
  BoxGeometry,
  BufferAttribute,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WorldShaderMaterial } from '../depth';
import { type WaterUniforms, atmosphereDeclarations, curvatureShader } from '../materials';

/** Small metre-scale silhouette models. +Z is aft; -Z is the heading direction. */
function geometry(kind: string) {
  const parts: BoxGeometry[] = [];
  const box = (size: number[], offset: number[], tint: string, rotation = 0) => {
    const part = new BoxGeometry(...(size as [number, number, number]));
    part.rotateZ(rotation);
    part.translate(...(offset as [number, number, number]));
    const colour = new Color(tint);
    const colors = new Float32Array(part.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) colour.toArray(colors, i);
    part.setAttribute('color', new BufferAttribute(colors, 3));
    parts.push(part);
  };
  if (kind === 'bulk-carrier') {
    box([30, 9, 190], [0, 4, 0], '#465b62');
    box([24, 4, 135], [0, 10, -12], '#805548');
    box([24, 16, 20], [0, 16, 62], '#d0cbc0');
    box([7, 8, 7], [0, 27, 65], '#843c32');
  } else if (kind === 'local-ferry' || kind === 'seabus') {
    const scale = kind === 'seabus' ? 3 : 1;
    box([4 * scale, 1.3 * scale, 9 * scale], [0, 0.6 * scale, 0], '#37576d');
    box([3.5 * scale, 2 * scale, 6 * scale], [0, 2 * scale, 0], '#e6dcb9');
    box([3.6 * scale, 0.8 * scale, 4 * scale], [0, 2.6 * scale, -0.4], '#3a626c');
  } else if (kind === 'sloop') {
    box([2.8, 1.1, 9], [0, 0.5, 0], '#e4dfd0');
    box([0.13, 12, 0.13], [0, 6, 0], '#ddd8c8');
    box([0.06, 8, 3.8], [0, 6, 1.8], '#ece7d5');
  } else if (kind === 'jet' || kind === 'floatplane') {
    const scale = kind === 'jet' ? 1 : 0.3;
    box([3.5 * scale, 3.5 * scale, 35 * scale], [0, 0, 0], '#dadbd9');
    box([34 * scale, 0.5 * scale, 5 * scale], [0, 0, 0], '#c6cdcf');
    box([13 * scale, 0.5 * scale, 3 * scale], [0, 0.7 * scale, 13 * scale], '#768d9c');
    box([0.5 * scale, 5 * scale, 4 * scale], [0, 3 * scale, 13 * scale], '#436278');
    if (kind === 'floatplane') {
      box([0.6, 0.6, 7], [-1.2, -1.4, 0], '#adb9bd');
      box([0.6, 0.6, 7], [1.2, -1.4, 0], '#adb9bd');
    }
  } else if (kind === 'helicopter') {
    box([2.5, 2.8, 5], [0, 0, -1], '#d8d6bc');
    box([0.5, 0.6, 6], [0, 0, 3], '#65797f');
    box([12, 0.06, 0.4], [0, 2, 0], '#77817e');
    box([0.4, 0.06, 12], [0, 2, 0], '#77817e');
  } else if (kind === 'seabird') {
    box([0.3, 0.2, 0.7], [0, 0, 0], '#d9d8cd');
    box([0.85, 0.07, 0.35], [-0.5, 0.08, 0], '#e3e2db', -0.18);
    box([0.85, 0.07, 0.35], [0.5, 0.08, 0], '#e3e2db', 0.18);
  } else {
    box([1.8, 1.0, 4.3], [0, 0.6, 0], '#8c9a9f');
    box([1.5, 0.6, 2.3], [0, 1.4, 0], '#3d555d');
  }
  // Navigation lights are real small geometry; no screen-space sprites through terrain.
  if (kind !== 'seabird') {
    box([0.18, 0.18, 0.18], [-1, 2, -1], '#ff2818');
    box([0.18, 0.18, 0.18], [1, 2, -1], '#19ef58');
  }
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('Moving silhouette geometry is incompatible');
  return merged;
}

export function createBatch(kind: string, water: WaterUniforms, capacity = 32) {
  const material = new WorldShaderMaterial({
    uniforms: { ...water },
    side: DoubleSide,
    vertexShader: `${curvatureShader}
      attribute vec3 color; varying vec3 tint; varying vec3 world; varying vec3 surfaceNormal;
      void main() {
        vec4 p = modelMatrix * instanceMatrix * vec4(position, 1.0);
        world = p.xyz; tint = color;
        surfaceNormal = curveNormal(normalize(mat3(modelMatrix * instanceMatrix) * normal), world);
        p.xyz = curveTerrain(p.xyz);
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: `${atmosphereDeclarations}
      varying vec3 tint; varying vec3 world; varying vec3 surfaceNormal;
      void main() {
        vec3 light = vec3(ambientLight) + sunColour * sunlight * max(0.0, dot(surfaceNormal, sunDirection));
        float navigation = step(0.85, max(tint.r, tint.g)) * (1.0 - step(0.12, min(tint.r,tint.g)));
        vec3 colour = tint * light + tint * navigation * (1.0 - sunlight) * 0.65;
        gl_FragColor = vec4(atmosphere(colour, world), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new InstancedMesh(geometry(kind), material, capacity);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.count = 0;
  // We cull individual entities; one stale bounding sphere must not drop a whole moving batch.
  mesh.frustumCulled = false;
  return mesh;
}
