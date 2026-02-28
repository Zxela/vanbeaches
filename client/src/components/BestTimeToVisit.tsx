import type { TideData, WeatherForecast } from '@van-beaches/shared';
import { Target } from 'lucide-react';
import { formatSunTime, useSunTimes } from '../hooks/useSunTimes';
import { Card, CardContent, CardTitle, Icon } from './ui';

interface BestTimeToVisitProps {
  weather: WeatherForecast | null;
  tides: TideData | null;
  latitude: number;
  longitude: number;
}

interface TimeSlot {
  time: string;
  score: number;
  reasons: string[];
}

export function BestTimeToVisit({ weather, tides, latitude, longitude }: BestTimeToVisitProps) {
  const sunTimes = useSunTimes(latitude, longitude);

  if (!weather) return null;

  const now = new Date();
  const slots: TimeSlot[] = [];

  // Generate time slots for the rest of today
  for (let hour = now.getHours() + 1; hour <= 20; hour++) {
    let score = 50;
    const reasons: string[] = [];

    // Use hourly forecast data if available, fall back to current conditions
    const hourlyEntry = weather.hourly.find((h) => {
      const hDate = new Date(h.time);
      return hDate.getHours() === hour;
    });

    const condition = hourlyEntry?.condition ?? weather.current.condition;
    const temp = hourlyEntry?.temperature ?? weather.current.temperature;

    // Weather bonus
    if (['sunny', 'partly-cloudy'].includes(condition)) {
      score += 20;
      reasons.push('Good weather');
    }

    // Temperature bonus (optimal around 22-26°C)
    if (temp >= 22 && temp <= 26) {
      score += 15;
      reasons.push('Perfect temperature');
    } else if (temp >= 18 && temp <= 28) {
      score += 10;
    }

    // Golden hour bonus
    const goldenStart = sunTimes.goldenHourStart.getHours();
    if (hour >= goldenStart && hour <= goldenStart + 2) {
      score += 15;
      reasons.push('Golden hour');
    }

    // Midday UV penalty
    if (hour >= 11 && hour <= 14 && weather.current.uvIndex > 6) {
      score -= 10;
      reasons.push('High UV');
    }

    // Check tide conditions
    if (tides?.predictions) {
      const upcomingTide = tides.predictions.find((t) => {
        const tideHour = new Date(t.time).getHours();
        return Math.abs(tideHour - hour) <= 1;
      });
      if (upcomingTide?.type === 'low') {
        score += 5;
        reasons.push('Low tide');
      }
    }

    // Evening wind typically calmer
    if (hour >= 17 && weather.current.windSpeed > 15) {
      score += 5;
      reasons.push('Winds calming');
    }

    const timeStr =
      hour <= 12 ? `${hour === 12 ? 12 : hour}${hour < 12 ? 'am' : 'pm'}` : `${hour - 12}pm`;

    slots.push({ time: timeStr, score: Math.min(100, Math.max(0, score)), reasons });
  }

  // Find best slots
  const sortedSlots = [...slots].sort((a, b) => b.score - a.score);
  const bestSlots = sortedSlots.slice(0, 3);

  if (bestSlots.length === 0) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-ocean-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-sand-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <Card variant="ocean">
      <CardTitle className="flex items-center gap-2">
        <Icon icon={Target} size="lg" color="ocean" />
        Best Time to Visit
      </CardTitle>
      <CardContent className="mt-3">
        <div className="space-y-2">
          {bestSlots.map((slot, idx) => (
            <div
              key={slot.time}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                idx === 0
                  ? 'bg-white/70 shadow-sm'
                  : 'bg-white/40'
              }`}
            >
              <div className="text-center min-w-[60px]">
                <p className="text-lg font-bold text-sand-900">{slot.time}</p>
                {idx === 0 && (
                  <span className="text-xs text-ocean-600">Best</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-sand-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-ocean-500 rounded-full transition-all"
                      style={{ width: `${slot.score}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${getScoreColor(slot.score)}`}>
                    {getScoreLabel(slot.score)}
                  </span>
                </div>
                <p className="text-xs text-sand-500 mt-1">
                  {slot.reasons.slice(0, 2).join(' • ')}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-sand-500 mt-3 text-center">
          Sunset at {formatSunTime(sunTimes.sunset)}
        </p>
      </CardContent>
    </Card>
  );
}
