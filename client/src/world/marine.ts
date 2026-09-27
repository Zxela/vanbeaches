import { type HeightSampler, atlasSampler } from './crowd/zones';

/** A sill is a threshold, not an elevation to average into adjacent deep water. */
export function connectionSampler(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: readonly number[],
): HeightSampler {
  const [west, north, east, south] = bounds;
  return (x, z) => {
    const c = Math.floor(((x - west) / (east - west)) * width - 0.5);
    const r = Math.floor(((z - north) / (south - north)) * height - 0.5);
    if (c < 0 || r < 0 || c + 1 >= width || r + 1 >= height) return null;
    const indices = [
      r * width + c,
      r * width + c + 1,
      (r + 1) * width + c,
      (r + 1) * width + c + 1,
    ];
    if (indices.some((i) => data[i * 4 + 3] !== 255 || data[i * 4 + 2] > 127)) return null;
    // Includes the GPU's nearest texel. Navigation can be more conservative than
    // the visible shoreline, but must never allow a boat through a dry GPU cell.
    return Math.max(...indices.map((i) => (data[i * 4] * 256 + data[i * 4 + 1]) * 0.01 - 512));
  };
}

/** Navigation respects every adjacent GPU marine threshold and requires surveyed depth. */
export class MarineNavigation {
  private height: HeightSampler | null = null;
  private connection: HeightSampler | null = null;
  setAtlas(kind: 'height' | 'connection', image: HTMLImageElement, bounds: number[]) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0);
    this[kind] = (kind === 'connection' ? connectionSampler : atlasSampler)(
      context.getImageData(0, 0, image.width, image.height).data,
      image.width,
      image.height,
      bounds,
    );
  }
  isNavigable(x: number, z: number, tide: number, draft: number) {
    const height = this.height?.(x, z);
    const connection = this.connection?.(x, z);
    return height != null && connection != null && tide > connection && tide - height > draft;
  }
  get ready() {
    return !!this.height && !!this.connection;
  }
}
