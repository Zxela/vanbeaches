import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WorldShaderMaterial as ShaderMaterial } from '../depth';
import type { Activity } from './tuning';

export const ANIMATIONS: Activity[] = ['idle', 'walk', 'sit', 'lie', 'wade', 'swim', 'volleyball'];
const vertexShader = `
  attribute float part;
  attribute float activity;
  attribute float phase;
  attribute float fade;
  varying vec3 tint;
  varying float opacity;
  uniform float clock;
  uniform float motion;
  mat2 rotate(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
  void main() {
    vec3 p = position;
    float t = clock * motion + phase;
    float stride = sin(t * 3.5) * motion;
    bool legs = part > 1.5 && part < 3.5;
    bool arms = part > 3.5;
    float side = mod(part, 2.0) < 0.5 ? -1.0 : 1.0;
    if ((activity > 0.5 && activity < 1.5) || (activity > 3.5 && activity < 4.5)) {
      if (legs || arms) {
        float pivot = legs ? 0.8 : 1.35;
        p.yz = rotate(stride * side * (legs ? 0.4 : -0.3)) * (p.yz - vec2(pivot, 0.0)) + vec2(pivot, 0.0);
      }
    }
    if (activity > 1.5 && activity < 2.5) {
      if (legs) p.yz = rotate(1.4) * (p.yz - vec2(0.8, 0.0)) + vec2(0.8, 0.0);
      p.y -= 0.55;
    }
    if ((activity > 2.5 && activity < 3.5) || (activity > 4.5 && activity < 5.5)) {
      if (arms && activity > 4.5) p.x += sin(t * 2.0 + side) * 0.18 * motion;
      p.yz = rotate(-1.5708) * p.yz;
      p.y += 0.2;
    }
    if (activity > 5.5) {
      if (arms) p.xy = rotate(side * (2.1 + sin(t * 2.0) * 0.5 * motion)) * (p.xy - vec2(side * 0.28, 1.35)) + vec2(side * 0.28, 1.35);
      p.y += max(0.0, sin(t * 2.0)) * 0.14 * motion;
    }
    if (activity < 0.5) p.x += sin(t) * 0.025 * motion * p.y;
    tint = instanceColor * (part < 0.5 ? 1.0 : part < 1.5 ? 1.2 : 0.76);
    opacity = fade;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  }
`;
const fragmentShader = `
  varying vec3 tint;
  varying float opacity;
  void main() {
    if (opacity < 0.01) discard;
    gl_FragColor = vec4(tint, opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function geometry(close: boolean) {
  const pieces: BufferGeometry[] = [];
  const box = (part: number, size: number[], position: number[]) => {
    const g = new BoxGeometry(...(size as [number, number, number]));
    g.translate(...(position as [number, number, number]));
    g.setAttribute(
      'part',
      new BufferAttribute(new Float32Array(g.attributes.position.count).fill(part), 1),
    );
    pieces.push(g);
  };
  box(0, [0.42, close ? 0.62 : 1.35, 0.25], [0, close ? 1.08 : 0.75, 0]);
  box(1, [0.26, 0.28, 0.26], [0, 1.55, 0]);
  if (close) {
    box(2, [0.14, 0.78, 0.16], [-0.13, 0.39, 0]);
    box(3, [0.14, 0.78, 0.16], [0.13, 0.39, 0]);
    box(4, [0.12, 0.6, 0.14], [-0.29, 1.05, 0]);
    box(5, [0.12, 0.6, 0.14], [0.29, 1.05, 0]);
  }
  const merged = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  return merged;
}

/** One draw per LOD, shared geometry and shader animations, no skeletons/mixers. */
export class CharacterBatch {
  readonly mesh: InstancedMesh;
  private transform = new Object3D();
  private tint = new Color();
  private cursor = 0;
  constructor(capacity: number, close: boolean) {
    const shape = geometry(close);
    for (const name of ['activity', 'phase', 'fade']) {
      shape.setAttribute(
        name,
        new InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(DynamicDrawUsage),
      );
    }
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: { clock: { value: 0 }, motion: { value: 1 } },
    });
    this.mesh = new InstancedMesh(shape, material, capacity);
    // Allocate before the first (possibly empty) draw so the shader always has instanceColor.
    this.mesh.instanceColor = new InstancedBufferAttribute(
      new Float32Array(capacity * 3).fill(1),
      3,
    ).setUsage(DynamicDrawUsage);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false; // CPU culling per agent; bounds span several beaches.
    this.mesh.count = 0;
  }
  begin(time: number, reduced: boolean) {
    this.cursor = 0;
    const material = this.mesh.material as ShaderMaterial;
    material.uniforms.clock.value = time;
    material.uniforms.motion.value = reduced ? 0 : 1;
  }
  add(
    x: number,
    y: number,
    z: number,
    heading: number,
    activity: Activity,
    phase: number,
    fade: number,
    color: string,
  ) {
    const i = this.cursor++;
    this.transform.position.set(x, y, z);
    this.transform.rotation.set(0, heading, 0);
    this.transform.updateMatrix();
    this.mesh.setMatrixAt(i, this.transform.matrix);
    this.mesh.setColorAt(i, this.tint.set(color));
    this.mesh.geometry.attributes.activity.setX(i, ANIMATIONS.indexOf(activity));
    this.mesh.geometry.attributes.phase.setX(i, phase);
    this.mesh.geometry.attributes.fade.setX(i, fade);
  }
  end() {
    this.mesh.count = this.cursor;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    for (const name of ['activity', 'phase', 'fade'])
      this.mesh.geometry.attributes[name].needsUpdate = true;
  }
  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
    this.mesh.dispose();
  }
}
