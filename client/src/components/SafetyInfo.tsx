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
    <section className="weather-panel p-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
        <ShieldCheck className="h-6 w-6 text-emerald-300" aria-hidden="true" />
        Safety
      </h3>

      <div
        className={[
          'mt-4 rounded-xl border p-4 backdrop-blur-md',
          conditionWarnings > 0
            ? 'border-amber-300/35 bg-amber-400/15'
            : 'border-emerald-300/30 bg-emerald-400/10',
        ].join(' ')}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Beach safety snapshot
        </p>
        <p className="mt-1 font-semibold text-white">
          {conditionWarnings > 0
            ? `${conditionWarnings} ${conditionWarnings === 1 ? 'item needs' : 'items need'} attention`
            : 'No current warnings in the available data'}
        </p>
        <p className="mt-1 text-xs text-white/65">
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
                ? 'border-red-300/40 bg-red-500/15 text-red-50'
                : 'border-amber-300/40 bg-amber-400/15 text-amber-50',
            ].join(' ')}
          >
            <AlertTriangle
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${wqLevel === 'closed' ? 'text-red-300' : 'text-amber-300'}`}
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
          <div className="flex items-start gap-3 rounded-xl border border-sky-200/30 bg-sky-400/10 p-4 text-sky-50">
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-sky-200" aria-hidden="true" />
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
            <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-white/80">
              Water quality is good — no advisory is reported in the latest available status.
            </p>
          </div>
        )}

        {/* AC-005: Weather warnings */}
        {(highUV || highWind) && (
          <div className="space-y-2">
            {highUV && (
              <div className="flex items-center gap-3 rounded-lg border border-orange-300/35 bg-orange-400/15 p-3 text-orange-50">
                <AlertTriangle
                  className="w-4 h-4 text-orange-200 flex-shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm">
                  High UV index ({weather?.current.uvIndex}) — wear sunscreen and limit exposure.
                </p>
              </div>
            )}
            {highWind && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-300/35 bg-amber-400/15 p-3 text-amber-50">
                <AlertTriangle
                  className="w-4 h-4 text-amber-200 flex-shrink-0"
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
                <p className="text-sm text-white/80">Lifeguard on duty ({lifeguard}).</p>
              </>
            ) : (
              <>
                <UserX className="w-5 h-5 text-white/55 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-white/75">
                  No lifeguard on duty — swim at your own risk.
                </p>
              </>
            )}
          </div>
        )}

        {/* AC-004: Safety notes list */}
        {safetyNotes.length > 0 && (
          <ul className="space-y-1 list-disc list-inside text-sm text-white/75">
            {safetyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {/* AC-007: Disclaimer */}
        <p className="border-t border-white/15 pt-3 text-xs text-white/55">
          Water-quality labels reflect the latest available reported status. UV and wind guidance is
          generated from forecast conditions, not an official advisory. This information is for
          reference only; always follow posted signs and official advisories.
        </p>
      </div>
    </section>
  );
}
