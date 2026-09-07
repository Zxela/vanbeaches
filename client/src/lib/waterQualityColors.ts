import type { WaterQualityLevel } from '@van-beaches/shared';

const dotColorMap: Record<WaterQualityLevel, string> = {
  good: 'bg-emerald-500',
  advisory: 'bg-amber-500',
  closed: 'bg-red-500',
  unknown: 'bg-slate-300',
  'off-season': 'bg-slate-300',
};

const labelMap: Record<WaterQualityLevel, string> = {
  good: 'Water quality: Good',
  advisory: 'Water quality: Advisory',
  closed: 'Water quality: Closed',
  unknown: 'Water quality: Unknown',
  'off-season': 'Water quality: Off-season',
};

export function getWaterQualityDotColor(level: WaterQualityLevel): string {
  return dotColorMap[level] ?? 'bg-slate-300';
}

export function getWaterQualityLabel(level: WaterQualityLevel): string {
  return labelMap[level] ?? 'Water quality: Unknown';
}

export function getWaterQualityTextLabel(level: WaterQualityLevel): string {
  const map: Record<WaterQualityLevel, string> = {
    good: 'Safe',
    advisory: 'Advisory',
    closed: 'Closed',
    unknown: 'Unknown',
    'off-season': 'Off-Season',
  };
  return map[level] ?? 'Unknown';
}

export function getWaterQualityBgColor(level: WaterQualityLevel): string {
  const map: Record<WaterQualityLevel, string> = {
    good: 'bg-emerald-100 text-emerald-800',
    advisory: 'bg-amber-100 text-amber-800',
    closed: 'bg-red-100 text-red-800',
    unknown: 'bg-slate-100 text-slate-600',
    'off-season': 'bg-slate-100 text-slate-600',
  };
  return map[level] ?? 'bg-slate-100 text-slate-600';
}
