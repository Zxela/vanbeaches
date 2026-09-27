import { Color, DoubleSide, Mesh, PlaneGeometry, Vector2, Vector3, Vector4 } from 'three';
import type { Texture } from 'three';
import { tideToWorld } from './coordinates';
import { WorldShaderMaterial as ShaderMaterial } from './depth';
import type { WaterSettings, WorldManifest } from './types';

export function createWaterUniforms(manifest: WorldManifest, mobile: boolean) {
  return {
    tide: { value: tideToWorld(manifest.water.initial_tide_cd_m, manifest.chartDatumOffsetMetres) },
    recentTide: {
      value: tideToWorld(manifest.water.initial_tide_cd_m, manifest.chartDatumOffsetMetres),
    },
    marineMap: { value: null as Texture | null },
    hasMarineMap: { value: 0 },
    depthBounds: { value: new Vector4(...manifest.depthTexture.bounds) },
    depthMode: { value: 0 },
    time: { value: 0 },
    amplitude: { value: manifest.water.wave_amplitude_m },
    direction: { value: new Vector2(-1, 0) },
    speed: { value: manifest.water.wave_speed },
    wind: { value: manifest.water.wind_strength },
    sunDirection: { value: new Vector3(-0.4, 0.8, 0.2).normalize() },
    sunColour: { value: new Color('#fff6dc') },
    sunlight: { value: 0.8 },
    ambientLight: { value: 0.6 },
    hazeColour: { value: new Color('#a8c4ce') },
    hazeDensity: { value: 1 / 40000 },
    wetness: { value: 0 },
    roughness: { value: 0.2 },
    simple: { value: mobile ? 1 : 0 },
    earthRadius: { value: manifest.regional?.earthRadiusMetres ?? 0 },
    snowLine: { value: manifest.regional?.snow.lineMetres ?? 1400 },
    snowAmount: { value: manifest.regional?.snow.amount ?? 0.35 },
    snowTransition: { value: manifest.regional?.snow.transitionMetres ?? 200 },
    terrainDebug: { value: 0 },
  };
}
export type WaterUniforms = ReturnType<typeof createWaterUniforms>;

export function updateWater(uniforms: WaterUniforms, settings: WaterSettings, offset: number) {
  uniforms.tide.value = tideToWorld(settings.tideHeight, offset);
  uniforms.depthMode.value = settings.depthMode ? 1 : 0;
  uniforms.amplitude.value = settings.waveAmplitude;
  const angle = (settings.waveDirection * Math.PI) / 180;
  uniforms.direction.value.set(Math.cos(angle), -Math.sin(angle));
  uniforms.speed.value = settings.waveSpeed;
  uniforms.wind.value = settings.windStrength;
}

export const atmosphereDeclarations = `
  uniform float earthRadius;
  uniform vec3 sunDirection; uniform vec3 sunColour; uniform float sunlight; uniform float ambientLight;
  uniform vec3 hazeColour; uniform float hazeDensity; uniform float wetness; uniform float roughness;
  vec3 atmosphere(vec3 colour, vec3 point) {
    float haze=1.0-exp(-pow(distance(cameraPosition,point)*hazeDensity,1.3));
    return mix(colour,hazeColour,clamp(haze,0.0,1.0));
  }
`;

// One observer tangent plane for coast, regional terrain and water. Raw coordinates/heights
// remain in the existing projected datum; only render positions bend. Ray analysis agrees.
export const curvatureShader = `
  uniform float earthRadius;
  vec3 curveTerrain(vec3 p) {
    vec2 d = p.xz - cameraPosition.xz;
    if (earthRadius > 0.0) p.y -= dot(d,d)/(2.0*earthRadius);
    return p;
  }
  vec3 curveNormal(vec3 n, vec3 p) {
    if (earthRadius > 0.0) n.xz += (p.xz-cameraPosition.xz)*n.y/earthRadius;
    return normalize(n);
  }
`;

export function terrainMaterial(water: WaterUniforms, map: Texture | null) {
  return new ShaderMaterial({
    uniforms: { ...water, aerial: { value: map }, hasAerial: { value: map ? 1 : 0 } },
    vertexShader: `
      ${curvatureShader}
      attribute vec3 color;
      varying vec3 world; varying vec3 tint; varying vec3 surfaceNormal; varying vec2 photoUV;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        world = p.xyz; tint = color; photoUV = uv;
        surfaceNormal = curveNormal(normalize(mat3(modelMatrix) * normal),world);
        p.xyz = curveTerrain(p.xyz);
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: `
      ${atmosphereDeclarations}
      uniform float tide; uniform float depthMode; uniform float hasAerial;
      uniform float recentTide; uniform sampler2D marineMap; uniform float hasMarineMap; uniform vec4 depthBounds;
      uniform sampler2D aerial;
      varying vec3 world; varying vec3 tint; varying vec3 surfaceNormal; varying vec2 photoUV;
      vec3 band(float d) {
        if (d < 2.0) return vec3(0.55, 0.91, 0.85);
        if (d < 5.0) return vec3(0.08, 0.72, 0.80);
        if (d < 10.0) return vec3(0.02, 0.40, 0.48);
        if (d < 20.0) return vec3(0.025, 0.19, 0.48);
        return vec3(0.008, 0.035, 0.15);
      }
      void main() {
        float depth = tide - world.y;
        vec2 marineUV=(world.xz-depthBounds.xy)/(depthBounds.zw-depthBounds.xy);
        vec4 marine=texture2D(marineMap,marineUV);
        float connection=(marine.r*65280.0+marine.g*255.0)*0.01-512.0;
        float inside=step(0.0,marineUV.x)*step(marineUV.x,1.0)*step(0.0,marineUV.y)*step(marineUV.y,1.0);
        if(hasMarineMap>0.5 && inside>0.5 && (marine.a<0.99 || tide<=connection)) depth=min(depth,-0.01);
        vec3 light = vec3(ambientLight) + sunColour * sunlight * 0.65 * max(0.0, dot(normalize(surfaceNormal), sunDirection));
        float grain = sin(world.x * 0.65) * sin(world.z * 0.83) * 0.015 * (1.0 - smoothstep(30.0, 160.0, distance(cameraPosition, world)));
        vec3 sand = mix(vec3(0.115, 0.105, 0.075), vec3(0.38, 0.29, 0.18), smoothstep(-0.1, 0.8, -depth)) + grain;
        vec3 land = tint;
        if (hasAerial > 0.5) {
          vec4 photo = texture2D(aerial, photoUV);
          land = mix(vec3(0.24, 0.32, 0.19), photo.rgb, photo.a);
        }
        // Photographed shorelines never determine water coverage.
        vec3 colour = mix(sand, land, smoothstep(2.5, 4.5, world.y));
        float recentlyWet=(1.0-smoothstep(recentTide,recentTide+0.6,world.y))*smoothstep(tide,tide+0.15,world.y);
        colour*=1.0-recentlyWet*0.16;
        if (depth > 0.0) {
          colour = depthMode > 0.5 ? band(depth) : mix(vec3(0.16, 0.36, 0.31), vec3(0.012, 0.09, 0.13), 1.0 - exp(-depth * 0.065));
        }
        gl_FragColor = vec4(atmosphere(colour * light * (1.0 - wetness * 0.12), world), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function createOcean(water: WaterUniforms, bounds: number[]) {
  water.depthBounds.value.fromArray(bounds);
  const material = new ShaderMaterial({
    uniforms: {
      ...water,
      deepColour: { value: new Color('#123d4b') },
      depthMap: { value: null },
      hasDepthMap: { value: 0 },
      waterDebug: { value: 0 },
      diagnosticOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    vertexShader: `${curvatureShader} varying vec3 world;
      void main() { vec4 p = modelMatrix * vec4(position, 1.0); world = p.xyz;
        p.xyz = curveTerrain(p.xyz);
        gl_Position = projectionMatrix * viewMatrix * p; }`,
    fragmentShader: `
      ${atmosphereDeclarations}
      uniform float time; uniform float depthMode; uniform float amplitude;
      uniform vec2 direction; uniform float speed; uniform float wind; uniform float simple;
      uniform vec3 deepColour; varying vec3 world;
      uniform sampler2D depthMap; uniform float hasDepthMap; uniform vec4 depthBounds; uniform float tide;
      uniform sampler2D marineMap; uniform float hasMarineMap; uniform float waterDebug; uniform float diagnosticOpacity;
      void main() {
        float phase = dot(world.xz, direction) * 0.22 - time * speed;
        float wave = sin(phase);
        if (simple < 0.5) wave += 0.4 * sin(dot(world.xz, direction.yx) * 0.71 - time * speed * 1.7);
        float attenuation = 1.0 - smoothstep(150.0, 1400.0, distance(cameraPosition, world));
        wave *= attenuation;
        vec3 n = normalize(vec3(wave * amplitude * (1.0 + wind), 1.0, cos(phase) * amplitude * attenuation));
        if (earthRadius > 0.0) n = normalize(n + vec3((world.x-cameraPosition.x)/earthRadius,0.0,(world.z-cameraPosition.z)/earthRadius));
        vec3 eye = normalize(cameraPosition - world);
        float fresnel = pow(1.0 - max(0.0, dot(n, eye)), 4.0);
        float sparkle = pow(max(0.0, dot(reflect(-sunDirection, n), eye)), mix(140.0, 35.0, roughness)) * sunlight;
        vec2 uv = (world.xz - depthBounds.xy) / (depthBounds.zw - depthBounds.xy);
        vec4 height = texture2D(depthMap, uv);
        float known = hasDepthMap * height.a * step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        float seabed = (height.r * 65280.0 + height.g * 255.0) * 0.01 - 512.0;
        float inside = step(0.0,uv.x)*step(uv.x,1.0)*step(0.0,uv.y)*step(uv.y,1.0);
        vec4 marine = texture2D(marineMap, uv);
        float connection = (marine.r * 65280.0 + marine.g * 255.0) * 0.01 - 512.0;
        // Survey gaps cannot be treated as water through parks/buildings. The connectivity
        // threshold changes with sea level, including sills, rather than fixing a coastline.
        if (hasMarineMap > 0.5 && inside > 0.5 && (marine.a < 0.99 || tide <= connection)) discard;
        if (known > 0.5 && tide <= seabed) discard;
        float depth = max(0.0, tide - seabed);
        vec3 absorption = mix(vec3(0.12, 0.30, 0.25), deepColour, 1.0 - exp(-depth * 0.09));
        vec3 colour = mix(mix(deepColour, absorption, known), hazeColour, fresnel) * (ambientLight + sunlight * 0.5) * (1.0 - wetness * 0.07) + sparkle * sunColour * 0.25;
        float foam = known * (1.0-smoothstep(0.05,0.65,depth)) * (0.45+0.15*sin(phase));
        colour = mix(colour, vec3(0.74,0.84,0.79), foam);
        if (waterDebug > 0.5 && waterDebug < 1.5) colour = vec3(0.1,0.9,0.75);
        if (waterDebug > 1.5) colour = mix(vec3(0.9,0.1,0.1),vec3(0.1,0.9,0.4),marine.a*hasMarineMap);
        colour = atmosphere(colour, world);
        gl_FragColor = vec4(colour, diagnosticOpacity * (depthMode > 0.5 && (hasDepthMap < 0.5 || known > 0.5) ? 0.035 : 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const regional = water.earthRadius.value > 0;
  const ocean = new Mesh(
    new PlaneGeometry(
      regional ? 320000 : 70000,
      regional ? 320000 : 70000,
      regional ? 128 : 1,
      regional ? 128 : 1,
    ),
    material,
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = water.tide.value;
  ocean.renderOrder = 2;
  return ocean;
}
