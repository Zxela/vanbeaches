import type { WeatherForecast } from '@van-beaches/shared';
import { Star } from 'lucide-react';
import {
  type ActivityRating,
  BAD_WEATHER,
  FAIR_WEATHER,
  GOOD_WEATHER,
  RATING_COLORS,
  TEMP,
  UV,
  WIND,
} from '../lib/constants';
import { Card, CardContent, CardTitle, Icon } from './ui';

interface ActivityRecommendationsProps {
  weather: WeatherForecast | null;
  activities?: string[];
}

interface Recommendation {
  activity: string;
  icon: string;
  rating: ActivityRating;
  reason: string;
}

interface Conditions {
  temperature: number;
  windSpeed: number;
  condition: string;
  uvIndex: number;
}

type ActivityRule = {
  activity: string;
  icon: string;
  requires?: string;
  evaluate: (c: Conditions) => { rating: ActivityRating; reason: string } | null;
};

const ACTIVITY_RULES: ActivityRule[] = [
  {
    activity: 'Swimming',
    icon: '\u{1F3CA}',
    evaluate: ({ temperature, condition }) => {
      if (
        temperature >= TEMP.SWIMMING_MIN &&
        GOOD_WEATHER.includes(condition as (typeof GOOD_WEATHER)[number])
      ) {
        return {
          rating: temperature >= TEMP.SWIMMING_EXCELLENT ? 'excellent' : 'good',
          reason: 'Great water conditions',
        };
      }
      if (temperature >= TEMP.WALKING_MIN) {
        return { rating: 'fair', reason: 'Water may be cool' };
      }
      return null;
    },
  },
  {
    activity: 'Sunbathing',
    icon: '\u2600\uFE0F',
    evaluate: ({ temperature, windSpeed, condition, uvIndex }) => {
      if (
        temperature < TEMP.SUNBATHING_MIN ||
        windSpeed >= WIND.MODERATE ||
        !GOOD_WEATHER.includes(condition as (typeof GOOD_WEATHER)[number])
      ) {
        return null;
      }
      if (uvIndex <= UV.MODERATE) {
        return {
          rating: temperature >= TEMP.SUNBATHING_EXCELLENT ? 'excellent' : 'good',
          reason: 'Perfect sun, moderate UV',
        };
      }
      if (uvIndex <= UV.HIGH) {
        return { rating: 'good', reason: `Use sunscreen (UV ${uvIndex})` };
      }
      return { rating: 'fair', reason: 'High UV - limit exposure' };
    },
  },
  {
    activity: 'Beach Walking',
    icon: '\u{1F6B6}',
    evaluate: ({ windSpeed, condition }) => {
      if (BAD_WEATHER.includes(condition as (typeof BAD_WEATHER)[number])) {
        return { rating: 'poor', reason: 'Poor weather for walking' };
      }
      return {
        rating: windSpeed < WIND.CALM ? 'excellent' : 'good',
        reason: windSpeed >= WIND.CALM ? 'Breezy conditions' : 'Pleasant for walking',
      };
    },
  },
  {
    activity: 'Volleyball',
    icon: '\u{1F3D0}',
    requires: 'volleyball',
    evaluate: ({ windSpeed, condition }) => {
      if (
        !FAIR_WEATHER.includes(condition as (typeof FAIR_WEATHER)[number]) ||
        windSpeed >= WIND.BREEZY
      ) {
        return null;
      }
      return {
        rating: windSpeed < WIND.CALM ? 'excellent' : 'good',
        reason: windSpeed < WIND.CALM ? 'Ideal conditions' : 'Slightly windy',
      };
    },
  },
  {
    activity: 'Kiteboarding',
    icon: '\u{1FA81}',
    evaluate: ({ windSpeed, condition }) => {
      if (
        windSpeed < WIND.CALM ||
        windSpeed > WIND.STRONG ||
        BAD_WEATHER.includes(condition as (typeof BAD_WEATHER)[number])
      ) {
        return null;
      }
      return {
        rating: windSpeed >= WIND.MODERATE ? 'excellent' : 'good',
        reason: `${windSpeed} km/h winds`,
      };
    },
  },
  {
    activity: 'Photography',
    icon: '\u{1F4F8}',
    evaluate: ({ condition }) => {
      if (!GOOD_WEATHER.includes(condition as (typeof GOOD_WEATHER)[number])) return null;
      return { rating: 'excellent', reason: 'Great lighting conditions' };
    },
  },
  {
    activity: 'Picnic',
    icon: '\u{1F9FA}',
    evaluate: ({ temperature, windSpeed, condition }) => {
      if (
        temperature < TEMP.OUTDOOR_MIN ||
        windSpeed >= WIND.MODERATE ||
        BAD_WEATHER.includes(condition as (typeof BAD_WEATHER)[number])
      ) {
        return null;
      }
      return {
        rating: temperature >= TEMP.OUTDOOR_EXCELLENT ? 'excellent' : 'good',
        reason: 'Nice weather for outdoors',
      };
    },
  },
];

function evaluateActivities(
  conditions: Conditions,
  availableActivities?: string[],
): Recommendation[] {
  const results: Recommendation[] = [];

  for (const rule of ACTIVITY_RULES) {
    if (rule.requires && !availableActivities?.includes(rule.requires)) continue;
    const result = rule.evaluate(conditions);
    if (result) {
      results.push({ activity: rule.activity, icon: rule.icon, ...result });
    }
    if (results.length >= 4) break;
  }

  return results;
}

export function ActivityRecommendations({ weather, activities }: ActivityRecommendationsProps) {
  if (!weather) return null;

  const recommendations = evaluateActivities(weather.current, activities);
  if (recommendations.length === 0) return null;

  return (
    <Card variant="default">
      <CardTitle className="flex items-center gap-2">
        <Icon icon={Star} size="lg" color="warning" />
        Recommended Activities
      </CardTitle>
      <CardContent className="mt-3">
        <div className="space-y-2">
          {recommendations.map((rec) => (
            <div
              key={rec.activity}
              className={`flex items-center gap-3 p-3 rounded-lg border ${RATING_COLORS[rec.rating]}`}
            >
              <span className="text-2xl">{rec.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{rec.activity}</p>
                <p className="text-xs opacity-75 truncate">{rec.reason}</p>
              </div>
              <span className="text-xs font-medium uppercase px-2 py-1 rounded bg-white/50">
                {rec.rating}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
