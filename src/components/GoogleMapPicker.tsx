import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/useI18n";

type LatLng = { lat: number; lng: number };

type GoogleMapClickEvent = { latLng?: { lat(): number; lng(): number } | null };
type GoogleMap = {
  setCenter(center: LatLng): void;
  addListener(eventName: "click", handler: (event: GoogleMapClickEvent) => void): void;
};
type GoogleMarker = { setPosition(position: LatLng): void };
type GoogleMaps = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: LatLng;
        zoom: number;
        disableDefaultUI: boolean;
        zoomControl: boolean;
      },
    ) => GoogleMap;
    Marker: new (options: { map: GoogleMap }) => GoogleMarker;
  };
};

declare global {
  interface Window {
    google?: GoogleMaps;
  }
}

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("No window."));
  if (window.google?.maps) return Promise.resolve(window.google);

  const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="1"]');
  if (existing) {
    return new Promise<GoogleMaps>((resolve, reject) => {
      existing.addEventListener("load", () => {
        const g = window.google;
        if (!g?.maps) {
          reject(new Error("Failed to load Google Maps script."));
          return;
        }
        resolve(g);
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script.")));
    });
  }

  return new Promise<GoogleMaps>((resolve, reject) => {
    const script = document.createElement("script");
    script.dataset.googleMaps = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = () => {
      const g = window.google;
      if (!g?.maps) {
        reject(new Error("Failed to load Google Maps script."));
        return;
      }
      resolve(g);
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);
  });
}

export function GoogleMapPicker({
  apiKey,
  value,
  onChange,
  defaultCenter,
}: {
  apiKey?: string;
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  defaultCenter: LatLng;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const [error, setError] = useState<string>("");

  const center = useMemo(() => value ?? defaultCenter, [defaultCenter, value]);
  const missingApiKeyError = useMemo(() => (!apiKey ? t("map.missingApiKey") : ""), [apiKey, t]);

  useEffect(() => {
    if (!apiKey) return;
    if (!containerRef.current) return;

    let isMounted = true;

    loadGoogleMaps(apiKey)
      .then((g) => {
        if (!isMounted) return;
        setError("");

        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(containerRef.current!, {
            center,
            zoom: value ? 15 : 12,
            disableDefaultUI: true,
            zoomControl: true,
          });

          mapRef.current.addListener("click", (e) => {
            const latLng = e.latLng;
            if (!latLng) return;
            onChange({ lat: latLng.lat(), lng: latLng.lng() });
          });
        }

        mapRef.current.setCenter(center);
        if (value) {
          if (!markerRef.current) {
            markerRef.current = new g.maps.Marker({ map: mapRef.current });
          }
          markerRef.current.setPosition(value);
        }
      })
      .catch((e) => {
        if (!isMounted) return;
        const msg =
          e instanceof Error && e.message === "Failed to load Google Maps script."
            ? t("map.failedLoadScript")
            : e instanceof Error
              ? e.message
              : t("map.failedLoad");
        setError(msg);
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey, center, onChange, t, value]);

  if (!apiKey) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder={t("map.latitude")}
          value={value ? String(value.lat) : ""}
          onChange={(e) => {
            const lat = Number(e.target.value);
            if (Number.isFinite(lat) && value) onChange({ lat, lng: value.lng });
            if (Number.isFinite(lat) && !value) onChange({ lat, lng: defaultCenter.lng });
          }}
        />
        <Input
          placeholder={t("map.longitude")}
          value={value ? String(value.lng) : ""}
          onChange={(e) => {
            const lng = Number(e.target.value);
            if (Number.isFinite(lng) && value) onChange({ lat: value.lat, lng });
            if (Number.isFinite(lng) && !value) onChange({ lat: defaultCenter.lat, lng });
          }}
        />
        {missingApiKeyError ? (
          <div className="sm:col-span-2 text-xs text-muted-foreground">{missingApiKeyError}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="h-[280px] w-full overflow-hidden rounded-md border" />
      {value ? (
        <div className="text-xs text-muted-foreground">
          {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </div>
      ) : null}
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}
