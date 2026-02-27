import type { TideData } from '@van-beaches/shared';
import type { WaterQualityStatus } from '@van-beaches/shared';
import type { WeatherForecast } from '@van-beaches/shared';
import { Target } from 'lucide-react';
import { Card, CardContent, CardTitle, Icon } from './ui';

interface BeachScoreProps {
  weather: WeatherForecast | null;
  tides: TideData | null;
  waterQuality: WaterQualityStatus | null;
}

interface ScoreFactor {
  label: string;
  delta: number;
}

function computeBeachScore(
  weather: WeatherForecast,
  tides: TideData | null,
  waterQuality: WaterQualityStatus | null,
): { score: number; factors: ScoreFactor[] } {
  let score = 50;
  const factors: ScoreFactor[] = [];

  // Weather condition
  const condition = weather.current.condition;
  if (condition === 'sunny' || condition === 'partly-cloudy') {
    score += 20;
    factors.push({ label: 'Sunny conditions', delta: 20 });
  } else if (condition === 'cloudy' || condition === 'foggy') {
    score += 10;
    factors.push({ label: 'Overcast sky', delta: 10 });
  } else if (condition === 'rainy') {
    score -= 10;
    factors.push({ label: 'Rain expected', delta: -10 });
  } else if (condition === 'stormy') {
    score -= 20;
    factors.push({ label: 'Storm warning', delta: -20 });
  }

  // Temperature
  const temp = weather.current.temperature;
  if (temp >= 22 && temp <= 26) {
    score += 15;
    factors.push({ label: 'Ideal temperature', delta: 15 });
  } else if (temp >= 18 && temp <= 28) {
    score += 10;
    factors.push({ label: 'Good temperature', delta: 10 });
  } else if (temp >= 15 && temp < 18) {
    score += 5;
    factors.push({ label: 'Cool but ok', delta: 5 });
  }

  // Wind
  const wind = weather.current.windSpeed;
  if (wind < 15) {
    score += 10;
    factors.push({ label: 'Calm winds', delta: 10 });
  } else if (wind < 25) {
    score += 5;
    factors.push({ label: 'Light breeze', delta: 5 });
  } else if (wind < 35) {
    score -= 5;
    factors.push({ label: 'Moderate wind', delta: -5 });
  } else {
    score -= 15;
    factors.push({ label: 'Strong winds', delta: -15 });
  }

  // UV index
  const uv = weather.current.uvIndex;
  if (uv >= 3 && uv <= 6) {
    score += 5;
    factors.push({ label: 'Moderate UV', delta: 5 });
  } else if (uv > 8) {
    score -= 5;
    factors.push({ label: 'Very high UV', delta: -5 });
  }

  // Water quality
  if (waterQuality) {
    if (waterQuality.level === 'good') {
      score += 5;
      factors.push({ label: 'Clean water', delta: 5 });
    } else if (waterQuality.level === 'advisory') {
      score -= 10;
      factors.push({ label: 'Water advisory', delta: -10 });
    } else if (waterQuality.level === 'closed') {
      score -= 30;
      factors.push({ label: 'Beach closed', delta: -30 });
    }
  }

  // Tide timing: +5 for low tide within 2 hours (great for beach walking)
  if (tides?.predictions) {
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    const nearLowTide = tides.predictions.find((p) => {
      if (p.type !== 'low') return false;
      const tideTime = new Date(p.time).getTime();
      return Math.abs(tideTime - now) <= twoHours;
    });
    if (nearLowTide) {
      score += 5;
      factors.push({ label: 'Low tide soon', delta: 5 });
    }
  }

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, score));

  return { score, factors };
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Great';
  if (score >= 55) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

function buildRecommendation(score: number, factors: ScoreFactor[]): string {
  const label = getScoreLabel(score);

  // Top positive and negative factors
  const positives = factors.filter((f) => f.delta > 0).sort((a, b) => b.delta - a.delta);
  const negatives = factors.filter((f) => f.delta < 0).sort((a, b) => a.delta - b.delta);

  if (score >= 70) {
    const highlights = positives
      .slice(0, 2)
      .map((f) => f.label.toLowerCase())
      .join(' and ');
    return `${label} day for the beach${highlights ? ` — ${highlights}` : ''}.`;
  }

  if (score >= 40) {
    const concern = negatives[0]?.label.toLowerCase();
    return `${label} conditions${concern ? ` — watch for ${concern}` : ''}.`;
  }

  const topIssue = negatives[0]?.label ?? 'Poor conditions';
  return `${topIssue} — consider visiting another day.`;
}

function getProgressBarColor(score: number): string {
  if (score >= 70) return 'from-green-400 to-emerald-500';
  if (score >= 50) return 'from-yellow-400 to-amber-500';
  return 'from-orange-400 to-red-500';
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
}

export function BeachScore({ weather, tides, waterQuality }: BeachScoreProps) {
  if (!weather) return null;

  const { score, factors } = computeBeachScore(weather, tides, waterQuality);
  const recommendation = buildRecommendation(score, factors);
  const label = getScoreLabel(score);
  const progressColor = getProgressBarColor(score);
  const scoreTextColor = getScoreTextColor(score);

  return (
    <Card variant="ocean" padding="none">
      <div className="p-5">
        <CardTitle className="flex items-center gap-2 mb-4">
          <Icon icon={Target} size="lg" color="ocean" />
          Beach Score
        </CardTitle>
        <CardContent>
          {/* Score display */}
          <div className="flex items-end gap-3 mb-3">
            <span data-testid="beach-score-value" className={`text-5xl font-bold tabular-nums ${scoreTextColor}`}>{score}</span>
            <div className="pb-1">
              <span className="text-sand-400 text-lg">/100</span>
              <p className={`text-sm font-semibold ${scoreTextColor}`}>{label}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-3 bg-sand-100 rounded-full overflow-hidden mb-4"
          >
            <div
              data-score-bar
              className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500`}
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Recommendation */}
          <p className="text-sand-700 text-sm leading-relaxed">{recommendation}</p>

          {/* Top factors */}
          {factors.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {factors.slice(0, 4).map((factor) => (
                <span
                  key={factor.label}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    factor.delta > 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {factor.delta > 0 ? '+' : ''}
                  {factor.delta} {factor.label}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
