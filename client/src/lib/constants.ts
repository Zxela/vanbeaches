export const WEATHER_CONDITIONS = {
  SUNNY: 'sunny',
  PARTLY_CLOUDY: 'partly-cloudy',
  CLOUDY: 'cloudy',
  RAINY: 'rainy',
  STORMY: 'stormy',
} as const;

export const GOOD_WEATHER = [WEATHER_CONDITIONS.SUNNY, WEATHER_CONDITIONS.PARTLY_CLOUDY] as const;
export const FAIR_WEATHER = [
  WEATHER_CONDITIONS.SUNNY,
  WEATHER_CONDITIONS.PARTLY_CLOUDY,
  WEATHER_CONDITIONS.CLOUDY,
] as const;
export const BAD_WEATHER = [WEATHER_CONDITIONS.RAINY, WEATHER_CONDITIONS.STORMY] as const;

export const TEMP = {
  SWIMMING_MIN: 20,
  SWIMMING_EXCELLENT: 25,
  SUNBATHING_MIN: 18,
  SUNBATHING_EXCELLENT: 22,
  WALKING_MIN: 15,
  OUTDOOR_MIN: 15,
  OUTDOOR_EXCELLENT: 20,
  OPTIMAL_LOW: 22,
  OPTIMAL_HIGH: 26,
  WARM_LOW: 18,
  WARM_HIGH: 28,
} as const;

export const WIND = {
  CALM: 15,
  MODERATE: 20,
  BREEZY: 25,
  STRONG: 35,
} as const;

export const UV = {
  LOW: 2,
  MODERATE: 5,
  HIGH: 7,
  VERY_HIGH: 10,
} as const;

export type ActivityRating = 'excellent' | 'good' | 'fair' | 'poor';

export const RATING_COLORS: Record<ActivityRating, string> = {
  excellent:
    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  good: 'bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 border-ocean-200 dark:border-ocean-800',
  fair: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  poor: 'bg-sand-100 dark:bg-sand-700 text-sand-500 dark:text-sand-400 border-sand-200 dark:border-sand-600',
};
