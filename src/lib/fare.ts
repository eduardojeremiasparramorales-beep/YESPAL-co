// MotoYa fare logic — single source of truth (client + server)
export const FARE_BASE_COP = 6000;
export const FARE_PER_KM_COP = 1500;
export const FARE_BASE_KM = 2;
export const PLATFORM_FEE_RATE = 0.20;

export interface FareBreakdown {
  distance_km: number;
  fare_cop: number;
  platform_fee_cop: number;
  courier_earnings_cop: number;
}

export function calculateFare(distanceKm: number): FareBreakdown {
  const km = Math.max(0, distanceKm);
  const extra = Math.max(0, km - FARE_BASE_KM);
  const raw = FARE_BASE_COP + extra * FARE_PER_KM_COP;
  // Round up to nearest 500 COP
  const fare = Math.ceil(raw / 500) * 500;
  const fee = Math.round(fare * PLATFORM_FEE_RATE);
  return {
    distance_km: Math.round(km * 100) / 100,
    fare_cop: fare,
    platform_fee_cop: fee,
    courier_earnings_cop: fare - fee,
  };
}

export function formatCop(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

// Haversine distance (km) — used as fallback if Routes API fails
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
