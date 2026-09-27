export type Point = [number, number, number];
export interface Bounds {
  min: Point;
  max: Point;
}
export interface Tile {
  layer?: 'regional';
  source?: string;
  sourceSpacing?: number;
  id: string;
  lod: number;
  assetUrl: string;
  bounds: Bounds;
  worldTransform: Point;
  bytes: number;
  triangles: number;
  sha256: string;
}
export interface Destination {
  id: string;
  slug: string;
  worldPosition: Point;
  cameraTarget: Point;
  cameraApproach: Point;
  preferredAltitude: number;
  beachView?: CameraPose | null;
}
export interface CameraPose {
  position: Point;
  target: Point;
}
export interface WorldManifest {
  worldBuildId?: string;
  marineTexture?: { assetUrl: string; bounds: number[]; bytes: number; sha256: string };
  urban?: {
    assetUrl: string;
    coarseAssetUrl?: string;
    sha256: string;
    bytes: number;
    counts?: Record<string, number>;
    attribution?: string;
  };
  regional?: {
    horizonsUrl: string;
    earthRadiusMetres: number;
    maxDistanceMetres: number;
    snow: { lineMetres: number; amount: number; transitionMetres: number };
    measured: Record<string, number>;
    budgets: Record<string, number>;
  };
  version: 1;
  units: 'metres';
  axes: string;
  origin: { latitude: number; longitude: number; utm: Point; crs: string };
  bounds: Bounds;
  verticalDatum: string;
  chartDatumOffsetMetres: number;
  datumRelationship: string;
  overview: CameraPose;
  beaches: Destination[];
  tiles: Tile[];
  noticesUrl: string;
  depthTexture: { assetUrl: string; bounds: [number, number, number, number]; bytes: number };
  water: {
    initial_tide_cd_m: number;
    wave_amplitude_m: number;
    wave_direction_degrees: number;
    wave_speed: number;
    wind_strength: number;
    depth_bands: { max_m: number; color: number[] }[];
  };
}
export interface WaterSettings {
  tideHeight: number;
  depthMode: boolean;
  waveAmplitude: number;
  waveDirection: number;
  waveSpeed: number;
  windStrength: number;
}
export interface RuntimeStats {
  quality?: 'LOW' | 'MEDIUM' | 'HIGH';
  renderScale?: number;
  regionalTiles?: number;
  regionalTriangles?: number;
  regionalDownloadedBytes?: number;
  fps: number;
  frameP95: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  loadedTiles: number;
  detailTiles: number;
  pendingTiles: number;
  failedTiles: number;
  downloadedBytes: number;
  estimatedGpuBytes: number;
  detail: 'mobile' | 'desktop';
}
