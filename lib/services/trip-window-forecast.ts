/**
 * Open-Meteo forecast for a calendar window (no API key).
 * Coordinates are [lng, lat] per app conventions.
 *
 * Open-Meteo `/v1/forecast` only serves a limited horizon (typically 16 days
 * from “today”); longer `end_date` values return 400. We clamp to the last
 * available day so the snippet still loads.
 */
import { addDays, format, parseISO, startOfDay } from "date-fns";

/** Inclusive day count Open-Meteo allows from run date (see API docs). */
const OPEN_METEO_FORECAST_DAYS_INCLUSIVE = 16;

export interface TripWindowDaily {
  date: string;
  maxC: number;
  minC: number;
  weatherCode: number;
}

/** Clamp [start,end] to dates Open-Meteo will accept, or null if entirely past horizon. */
export function clampTripDatesForOpenMeteoForecast(
  startDate: string,
  endDate: string
): { start: string; end: string } | null {
  const today = startOfDay(new Date());
  const lastForecastDay = addDays(
    today,
    OPEN_METEO_FORECAST_DAYS_INCLUSIVE - 1
  );

  let start = startOfDay(parseISO(startDate));
  let end = startOfDay(parseISO(endDate));
  if (Number.isNaN(+start) || Number.isNaN(+end)) return null;
  if (end < start) [start, end] = [end, start];

  if (start < today) start = today;
  if (start > lastForecastDay) return null;
  if (end > lastForecastDay) end = lastForecastDay;

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

export async function fetchTripWindowForecast(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<TripWindowDaily[] | null> {
  const range = clampTripDatesForOpenMeteoForecast(startDate, endDate);
  if (!range) return null;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("start_date", range.start);
  url.searchParams.set("end_date", range.end);
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,weather_code"
  );
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as {
    daily?: {
      time?: string[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      weather_code?: number[];
    };
  };
  const d = data.daily;
  if (!d?.time?.length) return null;

  const out: TripWindowDaily[] = [];
  for (let i = 0; i < d.time.length; i++) {
    const maxC = d.temperature_2m_max?.[i];
    const minC = d.temperature_2m_min?.[i];
    if (maxC == null || minC == null) continue;
    out.push({
      date: d.time[i]!,
      maxC,
      minC,
      weatherCode: d.weather_code?.[i] ?? 0,
    });
  }
  return out.length ? out : null;
}

/** WMO-ish: precipitation likely when code is in these bands */
function isPrecipLikely(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 99) ||
    code === 45 ||
    code === 48
  );
}

export function summarizeTripWindowForecast(
  daily: TripWindowDaily[]
): string {
  if (daily.length === 0) return "";
  let sumH = 0;
  let sumL = 0;
  let rainish = 0;
  for (const row of daily) {
    sumH += row.maxC;
    sumL += row.minC;
    if (isPrecipLikely(row.weatherCode)) rainish += 1;
  }
  const n = daily.length;
  const hi = Math.round(sumH / n);
  const lo = Math.round(sumL / n);
  const rainPart =
    rainish > 0
      ? ` · ${rainish} day${rainish === 1 ? "" : "s"} may see rain`
      : " · mostly dry";
  return `Typical highs around ${hi}°C, lows ~${lo}°C${rainPart} for these dates.`;
}
