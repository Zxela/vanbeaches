const themes: Record<string, string> = {
  sunny: 'weather-sunny',
  'partly-cloudy': 'weather-partly-cloudy',
  cloudy: 'weather-cloudy',
  rainy: 'weather-rainy',
  stormy: 'weather-stormy',
  foggy: 'weather-foggy',
  snowy: 'weather-snowy',
};

export function weatherTheme(condition?: string) {
  return themes[condition ?? ''] ?? themes.cloudy;
}
