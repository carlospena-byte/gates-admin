import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/useI18n";

type LatLng = { lat: number; lng: number };

type GoogleLatLng = { lat(): number; lng(): number };
type GoogleMapClickEvent = { latLng?: GoogleLatLng | null };
type GoogleMap = {
  setCenter(center: LatLng): void;
  setZoom(zoom: number): void;
  addListener(eventName: "click", handler: (event: GoogleMapClickEvent) => void): void;
};
type GoogleMarker = {
  setPosition(position: LatLng): void;
  addListener(eventName: "dragend", handler: (event: GoogleMapClickEvent) => void): void;
};
type PlaceResult = { formatted_address?: string; name?: string; geometry?: { location?: GoogleLatLng } };
type GoogleAutocomplete = { addListener(eventName: "place_changed", handler: () => void): void; getPlace(): PlaceResult };
type GoogleMaps = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: { center: LatLng; zoom: number; disableDefaultUI: boolean; zoomControl: boolean },
    ) => GoogleMap;
    Marker: new (options: { map: GoogleMap; draggable: boolean }) => GoogleMarker;
    places: {
      Autocomplete: new (input: HTMLInputElement, options: { fields: string[] }) => GoogleAutocomplete;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMaps;
  }
}

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("No window."));
  if (window.google?.maps?.places) return Promise.resolve(window.google);

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
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

/**
 * Map with a draggable pin and a search box (Places Autocomplete). Picking a result moves the pin
 * and reports its address through onAddressSelect; clicking the map or dragging the pin updates the point.
 */
export function GoogleMapPicker({
  apiKey,
  value,
  onChange,
  onAddressSelect,
  defaultCenter,
}: {
  apiKey?: string;
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  onAddressSelect?: (address: string) => void;
  defaultCenter: LatLng;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const [error, setError] = useState<string>("");

  // Handlers live in refs so the map is built once, not on every render.
  const onChangeRef = useRef(onChange);
  const onAddressRef = useRef(onAddressSelect);
  useEffect(() => {
    onChangeRef.current = onChange;
    onAddressRef.current = onAddressSelect;
  });

  const missingApiKeyError = useMemo(() => (!apiKey ? t("map.missingApiKey") : ""), [apiKey, t]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let isMounted = true;

    loadGoogleMaps(apiKey)
      .then((g) => {
        if (!isMounted || mapRef.current) return;
        setError("");

        const map = new g.maps.Map(containerRef.current!, {
          center: defaultCenter,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
        });
        const marker = new g.maps.Marker({ map, draggable: true });
        mapRef.current = map;
        markerRef.current = marker;

        map.addListener("click", (e) => {
          if (e.latLng) onChangeRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        marker.addListener("dragend", (e) => {
          if (e.latLng) onChangeRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });

        if (searchRef.current) {
          const autocomplete = new g.maps.places.Autocomplete(searchRef.current, {
            fields: ["formatted_address", "name", "geometry"],
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const loc = place.geometry?.location;
            if (!loc) return;
            onChangeRef.current({ lat: loc.lat(), lng: loc.lng() });
            const address = place.formatted_address ?? place.name;
            if (address) onAddressRef.current?.(address);
          });
        }
      })
      .catch((e) => {
        if (!isMounted) return;
        setError(
          e instanceof Error && e.message === "Failed to load Google Maps script."
            ? t("map.failedLoadScript")
            : e instanceof Error
              ? e.message
              : t("map.failedLoad"),
        );
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Keep the pin and view in sync with the value.
  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return;
    markerRef.current.setPosition(value);
    mapRef.current.setCenter(value);
    mapRef.current.setZoom(17);
  }, [value]);

  if (!apiKey) {
    return <div className="text-xs text-muted-foreground">{missingApiKeyError}</div>;
  }

  return (
    <div className="space-y-2">
      <Input
        ref={searchRef}
        label={t("map.search")}
        placeholder={t("map.searchPlaceholder")}
        autoComplete="off"
      />
      <div ref={containerRef} className="h-[300px] w-full overflow-hidden rounded-md border" />
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}
