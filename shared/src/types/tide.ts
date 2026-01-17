export interface TidePrediction {
  time: string;
  height: number;
  type: 'high' | 'low';
}

export interface TideData {
  beachId: string;
  stationId: string;
  stationName: string;
  predictions: TidePrediction[];
  fetchedAt: string;
}

export function isTidePrediction(value: unknown): value is TidePrediction {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.time === 'string' &&
    typeof obj.height === 'number' &&
    (obj.type === 'high' || obj.type === 'low')
  );
}

export function isTideData(value: unknown): value is TideData {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.beachId === 'string' &&
    typeof obj.stationId === 'string' &&
    typeof obj.stationName === 'string' &&
    Array.isArray(obj.predictions) &&
    obj.predictions.every(isTidePrediction) &&
    typeof obj.fetchedAt === 'string'
  );
}
