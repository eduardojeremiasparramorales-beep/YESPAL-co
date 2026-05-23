/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/maps-loader";

interface Marker { lat: number; lng: number; label?: string; color?: string }

interface Props {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  courier?: { lat: number; lng: number } | null;
  className?: string;
}

export function LiveMap({ pickup, dropoff, courier, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled || !ref.current) return;
      const map = new g.maps.Map(ref.current, {
        center: pickup,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#9a9a9a" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0a" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
          { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#3a3a3a" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FFCC00" }, { lightness: -40 }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
          { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1f1f1f" }] },
          { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2a1a" }] },
          { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1f1f1f" }] },
        ],
      });
      mapRef.current = map;
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const items: Marker[] = [
      { ...pickup, label: "A", color: "#FFCC00" },
      { ...dropoff, label: "B", color: "#22c55e" },
    ];
    if (courier) items.push({ ...courier, label: "🏍", color: "#ffffff" });

    const bounds = new window.google.maps.LatLngBounds();
    items.forEach((m) => {
      const marker = new window.google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map,
        label: { text: m.label ?? "", color: "#fff", fontWeight: "700" },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: m.color,
          fillOpacity: 1,
          strokeColor: "#0f172a",
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: m.lat, lng: m.lng });
    });
    map.fitBounds(bounds, 64);
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, courier?.lat, courier?.lng]);

  return <div ref={ref} className={className ?? "h-72 w-full rounded-2xl border border-border"} />;
}
