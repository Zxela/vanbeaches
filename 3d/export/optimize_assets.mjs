// Bounded, serial optimization: keep peak build memory independent of world size.
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const input = path.resolve(process.argv[2] || '3d/output/web-raw');
const output = path.resolve(process.argv[3] || 'client/public/coast-assets');
await mkdir(output, { recursive: true });
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'draco3d.encoder': await draco3d.createEncoderModule() });
const source = JSON.parse(await readFile(path.join(input, 'export.json'), 'utf8'));
const tiles = [];
const profile = { rawBytes: 0, optimizedBytes: 0, overviewBytes: 0, overviewTriangles: 0,
  textureInputBytes: 0, textureOutputBytes: 0, maxAssetBytes: 0, seconds: 0 };
const start = performance.now();
for (const tile of source.tiles) {
  const raw = await readFile(path.join(input, tile.file));
  profile.rawBytes += raw.length;
  for (const lod of tile.lod === 1 ? [0, 1] : [2]) {
    const doc = await io.readBinary(raw);
    if (lod === 0) {
      // Small regional photos avoid misleading triangular colour interpolation.
      await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 60, resize: [128, 128] }));
      await doc.transform(prune(), weld(), simplify({ simplifier: MeshoptSimplifier,
        ratio: 0.08, error: 0.004, lockBorder: true }));
    } else {
      for (const texture of doc.getRoot().listTextures()) profile.textureInputBytes += texture.getImage().byteLength;
      await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 78 }));
      for (const texture of doc.getRoot().listTextures()) profile.textureOutputBytes += texture.getImage().byteLength;
    }
    // 16-bit positions limit quantization to <8mm on a 500m tile.
    await doc.transform(lod === 0 ? meshopt({ encoder: MeshoptEncoder, level: 'medium',
      quantizePosition: 16, quantizeNormal: 10, quantizeTexcoord: 14, quantizeColor: 8 }) : draco({ quantizePosition: 16, quantizeNormal: 10, quantizeTexcoord: 14, quantizeColor: 8 }));
    let triangles = 0;
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const primitive of mesh.listPrimitives()) triangles += primitive.getIndices().getCount() / 3;
    }
    const bytes = await io.writeBinary(doc);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const file = `${tile.id}-lod${lod}-${hash.slice(0, 12)}.glb`;
    if (bytes.length >= 25 * 1024 * 1024) throw new Error(`Pages asset exceeds 25 MiB: ${file}`);
    await writeFile(path.join(output, file), bytes);
    tiles.push({ ...tile, file, lod, compression: lod === 0 ? 'meshopt' : 'draco', bytes: bytes.length, triangles, sha256: hash });
    profile.optimizedBytes += bytes.length;
    profile.maxAssetBytes = Math.max(profile.maxAssetBytes, bytes.length);
    if (lod === 0) { profile.overviewBytes += bytes.length; profile.overviewTriangles += triangles; }
  }
  if (tiles.length % 50 === 0) process.stdout.write(`Optimized ${tiles.length} assets\n`);
}
profile.seconds = Math.round((performance.now() - start) / 1000);
await mkdir(path.join(output, 'decoders'), { recursive: true });
for (const file of ['draco_wasm_wrapper.js', 'draco_decoder.wasm']) {
  await copyFile(new URL(`../../client/node_modules/three/examples/jsm/libs/draco/gltf/${file}`, import.meta.url), path.join(output, 'decoders', file));
}
await writeFile(path.join(input, 'optimized.json'), JSON.stringify({ ...source, tiles, profile }, null, 2));
console.log(profile);
