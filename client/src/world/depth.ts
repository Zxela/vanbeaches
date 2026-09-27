import { ShaderMaterial } from 'three';
import type { ShaderMaterialParameters } from 'three';

/** Shared depth encoding from metre-scale crowds to the regional horizon. */
export class WorldShaderMaterial extends ShaderMaterial {
  constructor(
    parameters: ShaderMaterialParameters & { vertexShader: string; fragmentShader: string },
  ) {
    const vertex = parameters.vertexShader;
    super({
      ...parameters,
      vertexShader: `${vertex.includes('#include <common>') ? '' : '#include <common>\n'}#include <logdepthbuf_pars_vertex>\n${vertex.replace(/}\s*$/, '\n#include <logdepthbuf_vertex>\n}')}`,
      fragmentShader: `#include <logdepthbuf_pars_fragment>\n${parameters.fragmentShader.replace(/void\s+main\s*\(\s*\)\s*{/, 'void main() {\n#include <logdepthbuf_fragment>\n')}`,
    });
  }
}
