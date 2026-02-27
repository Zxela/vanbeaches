import type { Beach, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { AlertTriangle, CheckCircle, Info, ShieldCheck, UserX, Users } from 'lucide-react';

interface SafetyInfoProps {
  beach: Beach;
  waterQuality: WaterQualityStatus | null;
  weather: WeatherForecast | null;
}

export function SafetyInfo({ beach, waterQuality, weather }: SafetyInfoProps) {
  const wqLevel = waterQuality?.level ?? null;
  const isWarning = wqLevel === 'advisory' || wqLevel === 'closed';
  const isInfo = wqLevel === 'unknown' || wqLevel === 'off-season';
  const isGood = wqLevel === 'good';

  const highUV = weather && weather.current.uvIndex > 7;
  const highWind = weather && weather.current.windSpeed > 30;

  const lifeguard = beach.amenities?.lifeguard;
  const hasLifeguard = lifeguard === 'seasonal' || lifeguard === 'year-round';

  const safetyNotes = beach.safetyNotes ?? [];

  return (
    <div className="rounded-2xl border border-sand-200 bg-white shadow-sm p-4">
      <h3 className="text-lg font-semibold text-sand-900 flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-emerald-600" aria-hidden="true" />
        Safety
      </h3>

      <div className="mt-4 space-y-4">
        {/* AC-001: Warning banner for advisory (amber) or closed (red) */}
        {isWarning && (
          <div
            role="alert"
            className={[
              'flex items-start gap-3 rounded-xl p-4 border',
              wqLevel === 'closed'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800',
            ].join(' ')}
          >
            <AlertTriangle
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${wqLevel === 'closed' ? 'text-red-500' : 'text-amber-500'}`}
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                {wqLevel === 'closed' ? 'Beach Closed' : 'Water Quality Advisory'}
              </p>
              {waterQuality?.advisoryReason && (
                <p className="text-sm mt-1">{waterQuality.advisoryReason}</p>
              )}
            </div>
          </div>
        )}

        {/* AC-002: Informational message for unknown or off-season */}
        {isInfo && (
          <div className="flex items-start gap-3 rounded-xl p-4 bg-sky-50 border border-sky-200 text-sky-800">
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-sky-500" aria-hidden="true" />
            <p className="text-sm">
              {wqLevel === 'off-season'
                ? 'Off-season: Water quality monitoring is paused until summer.'
                : 'Water quality data not available at this time.'}
            </p>
          </div>
        )}

        {/* AC-003: Positive status indicator when no warnings */}
        {isGood && (
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-emerald-700">Water quality is good — safe for swimming.</p>
          </div>
        )}

        {/* AC-005: Weather warnings */}
        {(highUV || highWind) && (
          <div className="space-y-2">
            {highUV && (
              <div className="flex items-center gap-3 rounded-lg p-3 bg-orange-50 border border-orange-200 text-orange-800">
                <AlertTriangle
                  className="w-4 h-4 text-orange-500 flex-shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm">
                  High UV index ({weather?.current.uvIndex}) — wear sunscreen and limit exposure.
                </p>
              </div>
            )}
            {highWind && (
              <div className="flex items-center gap-3 rounded-lg p-3 bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle
                  className="w-4 h-4 text-amber-500 flex-shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm">
                  High wind speeds ({weather?.current.windSpeed} km/h) — use caution near the water.
                </p>
              </div>
            )}
          </div>
        )}

        {/* AC-006: Lifeguard info */}
        {beach.amenities && (
          <div className="flex items-center gap-3">
            {hasLifeguard ? (
              <>
                <Users className="w-5 h-5 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-emerald-700">Lifeguard on duty ({lifeguard}).</p>
              </>
            ) : (
              <>
                <UserX className="w-5 h-5 text-sand-500 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-sand-600">
                  No lifeguard on duty — swim at your own risk.
                </p>
              </>
            )}
          </div>
        )}

        {/* AC-004: Safety notes list */}
        {safetyNotes.length > 0 && (
          <ul className="space-y-1 list-disc list-inside text-sm text-sand-700">
            {safetyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {/* AC-007: Disclaimer */}
        <p className="text-xs text-sand-500 border-t border-sand-200 pt-3">
          Safety information is for reference only. Always follow posted signs and official
          advisories.
        </p>
      </div>
    </div>
  );
}
