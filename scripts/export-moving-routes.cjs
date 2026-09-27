// The browser route definitions remain authoritative for both runtimes.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText,
    filename,
  );
const { createRoutes } = require('../client/src/world/moving/model.ts');
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'client/public/coast-assets/manifest.json')),
);
const output = {
  version: 1,
  source: 'procedural-vancouver-v1',
  live: false,
  axes: manifest.axes,
  origin: manifest.origin,
  routes: createRoutes(manifest),
};
fs.writeFileSync(
  path.join(root, '3d/config/moving-routes.json'),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(`Exported ${output.routes.length} simulated routes for Blender.`);
