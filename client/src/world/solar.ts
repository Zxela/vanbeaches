import SunCalc from 'suncalc';

// One astronomy implementation. SunCalc azimuth is south/west; runtime uses north/east.
export function solarPosition(timestamp: number, latitude: number, longitude: number) {
  const position = SunCalc.getPosition(new Date(timestamp), latitude, longitude);
  return {
    elevation: (position.altitude * 180) / Math.PI,
    azimuth: ((position.azimuth * 180) / Math.PI + 180) % 360,
  };
}

export function solarTimes(date: Date, latitude: number, longitude: number) {
  const times = SunCalc.getTimes(date, latitude, longitude);
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    goldenHourStart: times.goldenHour,
    goldenHourEnd: times.sunset,
  };
}
