export interface GpsCoordinates {
  lat: number;
  lng: number;
}

const GPS_TIMEOUT_MS = 8000;

/**
 * Best-effort GPS capture for driver delivery confirmation.
 * Resolves null when geolocation is unavailable, denied or times out —
 * callers must treat null as "no GPS" (design D-09) and warn the driver.
 */
export function getCurrentPosition(): Promise<GpsCoordinates | null> {
  return new Promise((resolve) => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation?.getCurrentPosition
    ) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 30_000 }
    );
  });
}
