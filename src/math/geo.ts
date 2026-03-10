import { vec3, type Vec3 } from "./vec3.js";

export type LatLngLike = {
  lat: number;
  lng: number;
};

export type TileBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const MAX_MERCATOR_LAT = 85.0511287798066;

export function clampLatitude(lat: number): number {
  return Math.min(MAX_MERCATOR_LAT, Math.max(-MAX_MERCATOR_LAT, lat));
}

export function wrapLongitude(lng: number): number {
  let wrapped = ((lng + 180) % 360 + 360) % 360 - 180;
  if (wrapped === -180 && lng > 0) wrapped = 180;
  return wrapped;
}

export function latLngToCartesian(latLng: LatLngLike, radius = 1): Vec3 {
  const lat = latLng.lat * DEG_TO_RAD;
  const lng = latLng.lng * DEG_TO_RAD;
  const cosLat = Math.cos(lat);
  return vec3(
    radius * cosLat * Math.cos(lng),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lng),
  );
}

export function cartesianToLatLng(point: Vec3): LatLngLike {
  const radius = Math.hypot(point.x, point.y, point.z) || 1;
  return {
    lat: Math.asin(point.y / radius) * RAD_TO_DEG,
    lng: Math.atan2(point.z, point.x) * RAD_TO_DEG,
  };
}

export function lngToTileX(lng: number, zoom: number): number {
  const scale = 2 ** zoom;
  return ((wrapLongitude(lng) + 180) / 360) * scale;
}

export function latToTileY(lat: number, zoom: number): number {
  const clamped = clampLatitude(lat) * DEG_TO_RAD;
  const scale = 2 ** zoom;
  return (
    (1 - Math.log(Math.tan(clamped) + 1 / Math.cos(clamped)) / Math.PI) /
    2
  ) * scale;
}

export function tileXToLng(x: number, zoom: number): number {
  return (x / (2 ** zoom)) * 360 - 180;
}

export function tileYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (2 ** zoom);
  return RAD_TO_DEG * Math.atan(Math.sinh(n));
}

export function tileLatLngBounds(z: number, x: number, y: number): TileBounds {
  return {
    north: tileYToLat(y, z),
    south: tileYToLat(y + 1, z),
    west: tileXToLng(x, z),
    east: tileXToLng(x + 1, z),
  };
}

export function webMercatorUv(latLng: LatLngLike, z: number, x: number, y: number): { u: number; v: number } {
  const tileX = lngToTileX(latLng.lng, z);
  const tileY = latToTileY(latLng.lat, z);
  return {
    u: tileX - x,
    v: tileY - y,
  };
}

export function tileCenterLatLng(z: number, x: number, y: number): LatLngLike {
  const bounds = tileLatLngBounds(z, x, y);
  return {
    lat: (bounds.north + bounds.south) / 2,
    lng: wrapLongitude((bounds.west + bounds.east) / 2),
  };
}

