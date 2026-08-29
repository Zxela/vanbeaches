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
  const conditionWarnings =
    Number(Boolean(isWarning)) + Number(Boolean(highUV)) + Number(Boolean(highWind));

  return (
    <section className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-lg backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-sand-900 flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-emerald-600" aria-hidden="true" />
        Safety
      </h3>

      <div
        className={[
          'mt-4 rounded-xl border p-4',
          conditionWarnings > 0
            ? 'border-amber-200/80 bg-amber-50/90'
            : 'border-emerald-200/70 bg-emerald-50/80',
        ].join(' ')}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sand-600">
          Beach safety snapshot
        </p>
        <p className="mt-1 font-semibold text-sand-900">
          {conditionWarnings > 0
            ? `${conditionWarnings} ${conditionWarnings === 1 ? 'item needs' : 'items need'} attention`
            : 'No current warnings in the available data'}
        </p>
        <p className="mt-1 text-xs text-sand-600">
          Combines the reported water-quality status with guidance derived from current UV and wind.
        </p>
      </div>

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
            <p className="text-sm text-emerald-700">
              Water quality is good — no advisory is reported in the latest available status.
            </p>
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
          Water-quality labels reflect the latest available reported status. UV and wind guidance is
          generated from forecast conditions, not an official advisory. This information is for
          reference only; always follow posted signs and official advisories.
        </p>
      </div>
    </section>
  );
}
