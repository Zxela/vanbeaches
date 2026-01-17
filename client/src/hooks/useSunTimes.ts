import { useMemo } from 'react';

interface SunTimes {
  sunrise: Date;
  sunset: Date;
  goldenHourStart: Date;
  goldenHourEnd: Date;
}

// Simple sun calculation for Vancouver area (approximate)
export function useSunTimes(latitude: number, longitude: number): SunTimes {
  return useMemo(() => {
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
    );

    // Approximate calculation for Vancouver latitude (~49.3)
    const declination = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
    const latRad = (latitude * Math.PI) / 180;
    const decRad = (declination * Math.PI) / 180;

    const hourAngle = (Math.acos(-Math.tan(latRad) * Math.tan(decRad)) * 180) / Math.PI;
    // Get timezone offset in hours (negative for west of UTC)
    const timezoneOffset = now.getTimezoneOffset() / 60;
    // Solar noon: 12 UTC adjusted for longitude, then converted to local time
    const solarNoon = 12 - longitude / 15 - timezoneOffset;

    const sunriseHour = solarNoon - hourAngle / 15;
    const sunsetHour = solarNoon + hourAngle / 15;

    const sunrise = new Date(now);
    sunrise.setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0, 0);

    const sunset = new Date(now);
    sunset.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0);

    const goldenHourStart = new Date(sunset.getTime() - 60 * 60 * 1000);
    const goldenHourEnd = new Date(sunset.getTime() + 30 * 60 * 1000);

    return { sunrise, sunset, goldenHourStart, goldenHourEnd };
  }, [latitude, longitude]);
}

export function formatSunTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
