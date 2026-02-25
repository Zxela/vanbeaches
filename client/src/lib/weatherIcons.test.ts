import { Cloud, CloudFog, CloudLightning, CloudRain, Sun, Thermometer } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { getWeatherColor, getWeatherIcon, weatherLabels } from './weatherIcons';

describe('weatherIcons', () => {
  describe('getWeatherIcon', () => {
    it('returns Sun for sunny', () => {
      expect(getWeatherIcon('sunny')).toBe(Sun);
    });
    it('returns Cloud for partly-cloudy', () => {
      expect(getWeatherIcon('partly-cloudy')).toBe(Cloud);
    });
    it('returns Cloud for cloudy', () => {
      expect(getWeatherIcon('cloudy')).toBe(Cloud);
    });
    it('returns CloudRain for rainy', () => {
      expect(getWeatherIcon('rainy')).toBe(CloudRain);
    });
    it('returns CloudLightning for stormy', () => {
      expect(getWeatherIcon('stormy')).toBe(CloudLightning);
    });
    it('returns CloudFog for foggy', () => {
      expect(getWeatherIcon('foggy')).toBe(CloudFog);
    });
    it('returns Thermometer for unknown values', () => {
      expect(getWeatherIcon('unknown')).toBe(Thermometer);
      expect(getWeatherIcon('')).toBe(Thermometer);
    });
  });

  describe('getWeatherColor', () => {
    it('returns text-amber-500 for sunny', () => {
      expect(getWeatherColor('sunny')).toBe('text-amber-500');
    });
    it('returns text-sky-400 for partly-cloudy', () => {
      expect(getWeatherColor('partly-cloudy')).toBe('text-sky-400');
    });
    it('returns text-sand-400 for cloudy', () => {
      expect(getWeatherColor('cloudy')).toBe('text-sand-400');
    });
    it('returns text-sky-500 for rainy', () => {
      expect(getWeatherColor('rainy')).toBe('text-sky-500');
    });
    it('returns text-purple-500 for stormy', () => {
      expect(getWeatherColor('stormy')).toBe('text-purple-500');
    });
    it('returns text-sand-400 for foggy', () => {
      expect(getWeatherColor('foggy')).toBe('text-sand-400');
    });
    it('returns text-sand-500 for unknown values', () => {
      expect(getWeatherColor('unknown')).toBe('text-sand-500');
    });
  });

  describe('weatherLabels', () => {
    it('maps sunny to Sunny', () => {
      expect(weatherLabels['sunny']).toBe('Sunny');
    });
    it('maps partly-cloudy to Partly Cloudy', () => {
      expect(weatherLabels['partly-cloudy']).toBe('Partly Cloudy');
    });
    it('maps cloudy to Cloudy', () => {
      expect(weatherLabels['cloudy']).toBe('Cloudy');
    });
    it('maps rainy to Rainy', () => {
      expect(weatherLabels['rainy']).toBe('Rainy');
    });
    it('maps stormy to Stormy', () => {
      expect(weatherLabels['stormy']).toBe('Stormy');
    });
    it('maps foggy to Foggy', () => {
      expect(weatherLabels['foggy']).toBe('Foggy');
    });
  });
});
