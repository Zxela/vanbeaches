import { WorldShaderMaterial as ShaderMaterial } from './depth';
import { atmosphereDeclarations, curvatureShader } from './materials';
import type { WaterUniforms } from './materials';
import type { Tile } from './types';

export function mountainMaterial(water: WaterUniforms, tile: Tile) {
  return new ShaderMaterial({
    uniforms: {
      ...water,
      regionalLod: { value: tile.lod },
      fallbackSource: { value: tile.source?.includes('MRDEM') ? 1 : 0 },
    },
    vertexShader: `${curvatureShader}
      varying vec3 world; varying vec3 surfaceNormal;
      void main() {
        vec4 p = modelMatrix * vec4(position,1.0);
        world = p.xyz;
        surfaceNormal = curveNormal(normalize(mat3(modelMatrix)*normal),world);
        p.xyz = curveTerrain(p.xyz);
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: `${atmosphereDeclarations}
      uniform float snowLine; uniform float snowAmount; uniform float snowTransition;
      uniform float terrainDebug; uniform float regionalLod; uniform float fallbackSource;
      varying vec3 world; varying vec3 surfaceNormal;
      void main() {
        vec3 n = normalize(surfaceNormal);
        float rock = max(smoothstep(900.0,1700.0,world.y),1.0-smoothstep(0.35,0.7,n.y));
        float macro = sin(world.x*0.0017)*sin(world.z*0.0023)*0.035;
        vec3 forest = vec3(0.065,0.12,0.085)+macro;
        vec3 colour = mix(forest,vec3(0.26,0.27,0.255),rock*0.8);
        float snow = smoothstep(snowLine-snowTransition,snowLine+snowTransition,world.y)
          * smoothstep(0.35,0.75,n.y)*snowAmount;
        colour = mix(colour,vec3(0.84,0.89,0.91),snow);
        vec3 light = vec3(ambientLight) + sunColour*sunlight*0.65*max(0.0,dot(n,sunDirection));
        colour = atmosphere(colour*light*(1.0-wetness*0.12),world);
        if(terrainDebug==1.0) colour = mix(vec3(0.15,0.75,0.5),vec3(0.85,0.35,0.7),fallbackSource);
        if(terrainDebug==2.0) colour = mix(vec3(0.2,0.5,0.95),vec3(1.0,0.65,0.1),regionalLod);
        if(terrainDebug==3.0) {
          float d=distance(cameraPosition.xz,world.xz);
          colour=d<15000.0?vec3(0.2,0.8,0.3):d<30000.0?vec3(1.0,0.7,0.2):vec3(0.5,0.4,0.85);
        }
        gl_FragColor=vec4(colour,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
