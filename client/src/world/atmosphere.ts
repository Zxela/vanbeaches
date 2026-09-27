import type { EnvironmentalState } from '@van-beaches/shared';
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  Points,
  SphereGeometry,
  Vector3,
} from 'three';
import type { PerspectiveCamera, Scene } from 'three';
import { WorldShaderMaterial as ShaderMaterial } from './depth';
import { ENVIRONMENT_TUNING, clamp, visualWeather } from './environment';
import type { WaterUniforms } from './materials';

export class Atmosphere {
  private budget = ENVIRONMENT_TUNING.maxRainParticles;
  setBudget(maximum: number) {
    this.budget = Math.max(0, maximum);
  }
  readonly sun = new DirectionalLight(0xffffff, 1);
  readonly ambient = new HemisphereLight(0xc5e5f5, 0x344238, 0.6);
  private sky: Mesh<SphereGeometry, ShaderMaterial>;
  private rain: Points<BufferGeometry, ShaderMaterial>;
  private state: EnvironmentalState | null = null;
  constructor(
    scene: Scene,
    private water: WaterUniforms,
    mobile: boolean,
  ) {
    this.sky = new Mesh(
      new SphereGeometry(220000, 24, 12),
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: {
          ...water,
          cloud: { value: 0.35 },
          daylight: { value: 1 },
          golden: { value: 0 },
        },
        vertexShader:
          'varying vec3 direction; void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
        varying vec3 direction; uniform vec3 sunDirection; uniform vec3 sunColour;
        uniform vec3 hazeColour; uniform float hazeDensity; uniform float sunlight; uniform float cloud; uniform float daylight;
        uniform float golden; uniform float time;
        float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
        void main() {
          vec3 d=normalize(direction); float up=max(0.0,d.y);
          vec3 zenith=mix(vec3(0.012,0.025,0.065),vec3(0.20,0.48,0.68),daylight);
          zenith=mix(hazeColour,zenith,exp(-hazeDensity*6000.0));
          vec3 c=mix(hazeColour,zenith,pow(up,0.45));
          float alignment=max(0.0,dot(d,sunDirection));
          c+=sunColour*pow(alignment,18.0)*golden*0.22*(1.0-cloud);
          c+=sunColour*smoothstep(0.9997,0.99993,alignment)*sunlight*(1.0-cloud);
          vec2 p=d.xz/(0.2+up)*3.0+time*0.002;
          float layer=noise(p)*0.7+noise(p*2.3)*0.3;
          float coverage=smoothstep(1.0-cloud*0.94,1.15-cloud*0.6,layer);
          vec3 grey=mix(vec3(0.045,0.055,0.08),vec3(0.64,0.69,0.70),daylight);
          c=mix(c,grey,coverage*smoothstep(0.02,0.2,d.y));
          c=mix(c,grey,cloud*0.28*smoothstep(0.02,0.2,d.y));
          gl_FragColor=vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      }),
    );
    this.sky.renderOrder = -10;
    const count = ENVIRONMENT_TUNING.maxRainParticles;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < positions.length; i++) positions[i] = Math.random() * 80 - 40;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setDrawRange(0, mobile ? ENVIRONMENT_TUNING.mobileRainParticles : count);
    this.rain = new Points(
      geometry,
      new ShaderMaterial({
        uniforms: { ...water },
        transparent: true,
        depthWrite: false,
        vertexShader: `uniform float time; uniform float wetness; uniform vec2 direction; varying float alpha;
        void main() { vec3 p=position; p.y=mod(p.y-time*18.0+40.0,80.0)-40.0;
          p.xz+=direction*p.y*0.12; vec4 mv=modelViewMatrix*vec4(p,1.0);
          gl_Position=projectionMatrix*mv; gl_PointSize=clamp(90.0/max(1.0,-mv.z),1.0,4.0);
          alpha=wetness*0.3; }`,
        fragmentShader:
          'varying float alpha; void main() { float drop=1.0-smoothstep(0.1,0.5,abs(gl_PointCoord.x-0.5)); gl_FragColor=vec4(0.72,0.81,0.85,drop*alpha); }',
      }),
    );
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 3;
    this.rain.visible = false;
    scene.add(this.sky, this.rain, this.sun, this.sun.target, this.ambient);
  }

  set(state: EnvironmentalState) {
    this.state = state;
    const elevation = (state.sun.elevation * Math.PI) / 180;
    const azimuth = (state.sun.azimuth * Math.PI) / 180;
    const direction = new Vector3(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      -Math.cos(azimuth) * Math.cos(elevation),
    );
    const cloud = clamp(state.weather.cloudCover / 100, 0, 1);
    const daylight = clamp((state.sun.elevation + 9) / 18, 0, 1);
    const golden = (1 - clamp(Math.abs(state.sun.elevation - 2) / 12, 0, 1)) * daylight;
    this.water.sunDirection.value.copy(direction);
    this.water.sunColour.value.set('#fff6dc').lerp(new Color('#edab6f'), golden * 0.7);
    this.water.sunlight.value = clamp(state.sun.elevation / 12, 0, 1) * (1 - cloud * 0.8);
    this.water.ambientLight.value = 0.16 + daylight * (0.44 - cloud * 0.08);
    this.water.hazeColour.value
      .set('#111c30')
      .lerp(new Color('#a8c4ce'), daylight)
      .lerp(new Color('#d4ac8c'), golden * (1 - cloud) * 0.28);
    const cloudHaze = new Color(0.045, 0.055, 0.08).lerp(new Color(0.64, 0.69, 0.7), daylight);
    this.water.hazeColour.value.lerp(cloudHaze, cloud * 0.28);
    const visual = visualWeather(state.weather);
    this.water.hazeDensity.value = visual.haze;
    this.water.wetness.value = visual.rain;
    this.water.roughness.value = visual.roughness;
    this.water.amplitude.value = visual.amplitude;
    this.water.speed.value = visual.speed;
    this.water.wind.value = visual.wind;
    this.water.direction.value.set(visual.direction.x, visual.direction.y);
    this.sun.position.copy(direction).multiplyScalar(10000);
    this.sun.color.copy(this.water.sunColour.value);
    this.sun.intensity = this.water.sunlight.value;
    this.ambient.intensity = this.water.ambientLight.value;
    this.sky.material.uniforms.cloud.value = cloud;
    this.sky.material.uniforms.daylight.value = daylight;
    this.sky.material.uniforms.golden.value = golden;
  }

  update(camera: PerspectiveCamera, reducedMotion: boolean, lowDetail: boolean) {
    this.sky.position.copy(camera.position);
    this.rain.position.copy(camera.position);
    this.rain.visible = !reducedMotion && !!this.state && this.state.weather.rain > 0.02;
    this.rain.geometry.setDrawRange(
      0,
      Math.min(
        this.budget,
        lowDetail ? ENVIRONMENT_TUNING.mobileRainParticles : ENVIRONMENT_TUNING.maxRainParticles,
      ),
    );
  }

  dispose() {
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.sky.removeFromParent();
    this.rain.geometry.dispose();
    this.rain.material.dispose();
    this.rain.removeFromParent();
    this.sun.removeFromParent();
    this.sun.target.removeFromParent();
    this.ambient.removeFromParent();
  }

  snapshot() {
    return {
      rainVisible: this.rain.visible,
      rainParticles: this.rain.visible ? this.rain.geometry.drawRange.count : 0,
      sunDirection: this.water.sunDirection.value.toArray(),
      cloudCover: this.sky.material.uniforms.cloud.value,
    };
  }
}
