import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { BEACHES } from '@van-beaches/shared';
import { useFavorites } from '../hooks/useFavorites';

// Design token hex values (used in divIcon inline styles since Tailwind classes
// are not processed inside Leaflet's divIcon HTML)
const COLORS = {
  ocean500: '#00bcd4',
  ocean600: '#00acc1',
  shore500: '#009688',
};

export interface BeachMapProps {
  selectedBeachId?: string;
  onSelectBeach?: (beachId: string) => void;
}

interface MarkerConfig {
  bgColor: string;
  size: number;
  border: string;
  shadow: string;
  heartHtml: string;
  transform: string;
}

function getMarkerConfig(isSelected: boolean, isFav: boolean): MarkerConfig {
  if (isSelected) {
    return {
      bgColor: COLORS.ocean600,
      size: 16,
      border: '3px solid white',
      shadow: '0 2px 8px rgba(0,172,193,0.6)',
      heartHtml: '',
      transform: 'scale(1.3)',
    };
  }
  if (isFav) {
    return {
      bgColor: COLORS.shore500,
      size: 12,
      border: '2px solid white',
      shadow: '0 1px 4px rgba(0,150,136,0.5)',
      heartHtml: '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:white;font-size:6px;line-height:1;">&#x2665;</span>',
      transform: '',
    };
  }
  return {
    bgColor: COLORS.ocean500,
    size: 12,
    border: '2px solid white',
    shadow: '0 1px 4px rgba(0,188,212,0.5)',
    heartHtml: '',
    transform: '',
  };
}

function createMarkerIcon(isSelected: boolean, isFav: boolean): L.DivIcon {
  const cfg = getMarkerConfig(isSelected, isFav);
  const styleStr = [
    `width:${cfg.size}px`,
    `height:${cfg.size}px`,
    'border-radius:50%',
    `background:${cfg.bgColor}`,
    `border:${cfg.border}`,
    `box-shadow:${cfg.shadow}`,
    cfg.transform ? `transform:${cfg.transform}` : '',
    'position:relative',
  ].filter(Boolean).join(';');

  const html = `<div class="beach-marker" style="${styleStr}">${cfg.heartHtml}</div>`;

  return L.divIcon({
    html,
    className: '',
    iconSize: [cfg.size, cfg.size],
    iconAnchor: [cfg.size / 2, cfg.size / 2],
  });
}

// Vancouver coastal area bounds for map constraints
const VANCOUVER_BOUNDS: [[number, number], [number, number]] = [
  [49.18, -123.35],
  [49.37, -122.95],
];

const VANCOUVER_CENTER: [number, number] = [49.277, -123.155];

export function BeachMap({ selectedBeachId, onSelectBeach }: BeachMapProps) {
  const navigate = useNavigate();
  const { isFavorite } = useFavorites();

  const handleClick = (beachId: string) => {
    if (onSelectBeach) {
      onSelectBeach(beachId);
    } else {
      navigate(`/beach/${beachId}`);
    }
  };

  return (
    <div className="bg-white dark:bg-sand-800 rounded-xl overflow-hidden shadow-lg">
      <style>{`
        .dark .leaflet-tile-pane {
          filter: brightness(0.7) invert(1) contrast(1.1) hue-rotate(200deg) saturate(0.3);
        }
        .leaflet-tooltip {
          background: #212121;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          padding: 2px 8px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .dark .leaflet-tooltip {
          background: #fafafa;
          color: #212121;
        }
        .leaflet-tooltip::before {
          display: none;
        }
      `}</style>
      <div className="aspect-[4/3] md:aspect-[16/9]">
        <MapContainer
          center={VANCOUVER_CENTER}
          zoom={12}
          minZoom={10}
          maxZoom={16}
          maxBounds={VANCOUVER_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {BEACHES.map((beach) => {
            const isSelected = beach.id === selectedBeachId;
            const isFav = isFavorite(beach.id);
            const icon = createMarkerIcon(isSelected, isFav);
            const cfg = getMarkerConfig(isSelected, isFav);

            return (
              <Marker
                key={beach.id}
                position={[beach.location.latitude, beach.location.longitude]}
                icon={icon}
                eventHandlers={{
                  click: () => handleClick(beach.id),
                }}
                // Extra data attributes passed to the mock for testability
                // (these are ignored by real Leaflet Marker but accessible in jsdom mock)
                {...{
                  'data-beach-id': beach.id,
                  'data-bg-color': cfg.bgColor,
                  'data-has-heart': cfg.heartHtml ? 'true' : 'false',
                  'data-transform': cfg.transform,
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} permanent={false}>
                  {beach.name}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
