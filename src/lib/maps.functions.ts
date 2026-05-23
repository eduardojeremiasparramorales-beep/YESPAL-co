import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { haversineKm } from "./fare";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY missing");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
  };
}

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      address: z.string().min(3).max(255),
      city: z.string().min(2).max(80).default("Acacías"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const query = `${data.address}, ${data.city}, Colombia`;
    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=co&language=es`;
    const res = await fetch(url, { headers: gatewayHeaders() });
    const json = await res.json();
    if (!res.ok || json.status !== "OK" || !json.results?.[0]) {
      throw new Error(json.error_message || "No se pudo geocodificar la dirección");
    }
    const r = json.results[0];
    return {
      lat: r.geometry.location.lat as number,
      lng: r.geometry.location.lng as number,
      formatted: r.formatted_address as string,
    };
  });

export const computeRouteDistance = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      origin: z.object({ lat: z.number(), lng: z.number() }),
      destination: z.object({ lat: z.number(), lng: z.number() }),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
        method: "POST",
        headers: {
          ...gatewayHeaders(),
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: { location: { latLng: data.origin } },
          destination: { location: { latLng: data.destination } },
          travelMode: "TWO_WHEELER",
          routingPreference: "TRAFFIC_AWARE",
        }),
      });
      const j = await res.json();
      if (res.ok && j.routes?.[0]?.distanceMeters) {
        return { distance_km: j.routes[0].distanceMeters / 1000, source: "routes" as const };
      }
    } catch (e) {
      console.error("Routes API error", e);
    }
    // Fallback: haversine
    return { distance_km: haversineKm(data.origin, data.destination), source: "haversine" as const };
  });
