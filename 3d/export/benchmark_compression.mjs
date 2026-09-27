import { readFile, writeFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, meshopt, textureCompress } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

await MeshoptEncoder.ready;
const encoder = await draco3d.createEncoderModule();
const decoder = await draco3d.createDecoderModule();
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': encoder, 'draco3d.decoder': decoder,
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const source = JSON.parse(await readFile('3d/output/web-raw/export.json', 'utf8'));
const samples = [source.tiles.find((t) => t.lod === 1),
  source.tiles.find((t) => t.lod === 1 && t.id.includes('483500_5458000')),
  source.tiles.find((t) => t.lod === 2)];
const results = [];
for (const tile of samples.filter(Boolean)) {
  const raw = await readFile(`3d/output/web-raw/${tile.file}`);
  const record = { tile: tile.id, lod: tile.lod, rawBytes: raw.length };
  for (const mode of ['draco', 'meshopt']) {
    const doc = await io.readBinary(raw);
    await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 78 }));
    const start = performance.now();
    await doc.transform(mode === 'draco' ? draco({ quantizePosition: 16 }) : meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16 }));
    const output = await io.writeBinary(doc);
    const encodeMs = performance.now() - start;
    const beforeDecode = performance.now();
    for (let i = 0; i < 5; i++) await io.readBinary(output);
    record[mode] = { bytes: output.length, encodeMs: Math.round(encodeMs), decodeMs: (performance.now() - beforeDecode) / 5 };
  }
  results.push(record);
}
await writeFile('3d/data/metadata/web-compression-benchmark.json', `${JSON.stringify({
  environment: { node: process.version, platform: process.platform }, samples: results,
  textureDecision: 'WebP: 128x128 regional, 256x256 nearby. At most 12 detail textures require about 4 MiB with mipmaps. Regional textures and the elevation atlas keep total estimated residency below 64 MiB in profiling. KTX2/Basis deferred pending a measured GPU-memory bottleneck; no KTX2 encoder benchmark was run.',
}, null, 2)}\n`);
console.log(results);
