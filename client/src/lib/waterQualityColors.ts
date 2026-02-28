import type { WaterQualityLevel } from '@van-beaches/shared';

const dotColorMap: Record<WaterQualityLevel, string> = {
  good: 'bg-emerald-500',
  advisory: 'bg-amber-500',
  closed: 'bg-red-500',
  unknown: 'bg-sand-300',
  'off-season': 'bg-sand-300',
};

const labelMap: Record<WaterQualityLevel, string> = {
  good: 'Water quality: Good',
  advisory: 'Water quality: Advisory',
  closed: 'Water quality: Closed',
  unknown: 'Water quality: Unknown',
  'off-season': 'Water quality: Off-season',
};

export function getWaterQualityDotColor(level: WaterQualityLevel): string {
  return dotColorMap[level] ?? 'bg-sand-300';
}

export function getWaterQualityLabel(level: WaterQualityLevel): string {
  return labelMap[level] ?? 'Water quality: Unknown';
}
