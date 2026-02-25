import type { WeatherForecast } from '@van-beaches/shared';
import { Star } from 'lucide-react';
import { Card, CardContent, CardTitle } from './ui';
import { Icon } from './ui';

interface ActivityRecommendationsProps {
  weather: WeatherForecast | null;
  activities?: string[];
}

interface Recommendation {
  activity: string;
  icon: string;
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  reason: string;
}

export function ActivityRecommendations({ weather, activities }: ActivityRecommendationsProps) {
  if (!weather) return null;

  const { temperature, windSpeed, condition, uvIndex } = weather.current;

  const getRecommendations = (): Recommendation[] => {
    const recs: Recommendation[] = [];

    // Swimming
    if (temperature >= 20 && ['sunny', 'partly-cloudy'].includes(condition)) {
      recs.push({
        activity: 'Swimming',
        icon: '🏊',
        rating: temperature >= 25 ? 'excellent' : 'good',
        reason: 'Great water conditions',
      });
    } else if (temperature >= 15) {
      recs.push({ activity: 'Swimming', icon: '🏊', rating: 'fair', reason: 'Water may be cool' });
    }

    // Sunbathing
    if (temperature >= 18 && ['sunny', 'partly-cloudy'].includes(condition) && windSpeed < 20) {
      if (uvIndex <= 5) {
        recs.push({
          activity: 'Sunbathing',
          icon: '☀️',
          rating: temperature >= 22 ? 'excellent' : 'good',
          reason: 'Perfect sun, moderate UV',
        });
      } else if (uvIndex <= 7) {
        recs.push({
          activity: 'Sunbathing',
          icon: '☀️',
          rating: 'good',
          reason: `Use sunscreen (UV ${uvIndex})`,
        });
      } else {
        recs.push({
          activity: 'Sunbathing',
          icon: '☀️',
          rating: 'fair',
          reason: 'High UV - limit exposure',
        });
      }
    }

    // Beach walking
    recs.push({
      activity: 'Beach Walking',
      icon: '🚶',
      rating:
        windSpeed < 15 && !['rainy', 'stormy'].includes(condition)
          ? 'excellent'
          : condition === 'rainy'
            ? 'poor'
            : 'good',
      reason: windSpeed >= 15 ? 'Breezy conditions' : 'Pleasant for walking',
    });

    // Volleyball
    if (
      activities?.includes('volleyball') &&
      ['sunny', 'partly-cloudy', 'cloudy'].includes(condition) &&
      windSpeed < 25
    ) {
      recs.push({
        activity: 'Volleyball',
        icon: '🏐',
        rating: windSpeed < 15 ? 'excellent' : 'good',
        reason: windSpeed < 15 ? 'Ideal conditions' : 'Slightly windy',
      });
    }

    // Kiteboarding/Windsurfing
    if (windSpeed >= 15 && windSpeed <= 35 && !['rainy', 'stormy'].includes(condition)) {
      recs.push({
        activity: 'Kiteboarding',
        icon: '🪁',
        rating: windSpeed >= 20 ? 'excellent' : 'good',
        reason: `${windSpeed} km/h winds`,
      });
    }

    // Photography
    if (['sunny', 'partly-cloudy'].includes(condition)) {
      recs.push({
        activity: 'Photography',
        icon: '📸',
        rating: 'excellent',
        reason: 'Great lighting conditions',
      });
    }

    // Picnicking
    if (temperature >= 15 && windSpeed < 20 && !['rainy', 'stormy'].includes(condition)) {
      recs.push({
        activity: 'Picnic',
        icon: '🧺',
        rating: temperature >= 20 ? 'excellent' : 'good',
        reason: 'Nice weather for outdoors',
      });
    }

    return recs.slice(0, 4);
  };

  const recommendations = getRecommendations();

  if (recommendations.length === 0) return null;

  const ratingColors = {
    excellent:
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    good: 'bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 border-ocean-200 dark:border-ocean-800',
    fair: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    poor: 'bg-sand-100 dark:bg-sand-700 text-sand-500 dark:text-sand-400 border-sand-200 dark:border-sand-600',
  };

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
              className={`flex items-center gap-3 p-3 rounded-lg border ${ratingColors[rec.rating]}`}
            >
              <span className="text-2xl">{rec.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{rec.activity}</p>
                <p className="text-xs opacity-75 truncate">{rec.reason}</p>
              </div>
              <span className="text-xs font-medium uppercase px-2 py-1 rounded bg-white/50 dark:bg-black/20">
                {rec.rating}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
