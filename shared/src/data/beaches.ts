import type { Beach } from '../types/beach.js';

export const BEACHES: Beach[] = [
  {
    id: 'english-bay',
    name: 'English Bay',
    slug: 'english-bay',
    location: { latitude: 49.2867, longitude: -123.1432 },
    tideStationId: '7735',
    hasWebcam: true,
    webcamUrl: 'https://www.skylinewebcams.com/en/webcam/canada/british-columbia/vancouver/vancouver-english-bay.html',
  },
  {
    id: 'jericho-beach',
    name: 'Jericho Beach',
    slug: 'jericho-beach',
    location: { latitude: 49.2727, longitude: -123.1978 },
    tideStationId: '7735',
    hasWebcam: true,
    webcamUrl: 'https://www.earthtv.com/en/webcam/vancouver-jericho-sailing-centre',
  },
  {
    id: 'kitsilano-beach',
    name: 'Kitsilano Beach',
    slug: 'kitsilano-beach',
    location: { latitude: 49.2732, longitude: -123.1536 },
    tideStationId: '7735',
    hasWebcam: true,
    webcamUrl: 'http://www.katkam.ca/',
  },
  {
    id: 'locarno-beach',
    name: 'Locarno Beach',
    slug: 'locarno-beach',
    location: { latitude: 49.2768, longitude: -123.2062 },
    tideStationId: '7735',
    hasWebcam: false,
    webcamUrl: null,
  },
  {
    id: 'second-beach',
    name: 'Second Beach',
    slug: 'second-beach',
    location: { latitude: 49.2904, longitude: -123.1464 },
    tideStationId: '7735',
    hasWebcam: false,
    webcamUrl: null,
  },
  {
    id: 'spanish-banks',
    name: 'Spanish Banks',
    slug: 'spanish-banks',
    location: { latitude: 49.2766, longitude: -123.2249 },
    tideStationId: '7735',
    hasWebcam: false,
    webcamUrl: null,
  },
  {
    id: 'sunset-beach',
    name: 'Sunset Beach',
    slug: 'sunset-beach',
    location: { latitude: 49.2785, longitude: -123.1352 },
    tideStationId: '7735',
    hasWebcam: false,
    webcamUrl: null,
  },
  {
    id: 'third-beach',
    name: 'Third Beach',
    slug: 'third-beach',
    location: { latitude: 49.2994, longitude: -123.1585 },
    tideStationId: '7735',
    hasWebcam: false,
    webcamUrl: null,
  },
  {
    id: 'trout-lake',
    name: 'Trout Lake',
    slug: 'trout-lake',
    location: { latitude: 49.2554, longitude: -123.0643 },
    tideStationId: null,
    hasWebcam: false,
    webcamUrl: null,
  },
];

export function getBeachById(id: string): Beach | undefined {
  return BEACHES.find((b) => b.id === id);
}

export function getBeachBySlug(slug: string): Beach | undefined {
  return BEACHES.find((b) => b.slug === slug);
}

export const beachTideStationMap = new Map<string, string | null>(
  BEACHES.map((b) => [b.id, b.tideStationId])
);
