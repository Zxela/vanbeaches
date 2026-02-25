import { Cloud, CloudFog, CloudLightning, CloudRain, Sun, Thermometer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const weatherIconMap: Record<string, LucideIcon> = {
  sunny: Sun,
  'partly-cloudy': Cloud,
  cloudy: Cloud,
  rainy: CloudRain,
  stormy: CloudLightning,
  foggy: CloudFog,
};

const weatherColorMap: Record<string, string> = {
  sunny: 'text-amber-500',
  'partly-cloudy': 'text-sky-400',
  cloudy: 'text-sand-400',
  rainy: 'text-sky-500',
  stormy: 'text-purple-500',
  foggy: 'text-sand-400',
};

export const weatherLabels: Record<string, string> = {
  sunny: 'Sunny',
  'partly-cloudy': 'Partly Cloudy',
  cloudy: 'Cloudy',
  rainy: 'Rainy',
  stormy: 'Stormy',
  foggy: 'Foggy',
};

export function getWeatherIcon(condition: string): LucideIcon {
  return weatherIconMap[condition] ?? Thermometer;
}

export function getWeatherColor(condition: string): string {
  return weatherColorMap[condition] ?? 'text-sand-500';
}
