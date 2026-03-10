import test from "node:test";
import assert from "node:assert/strict";

import {
  cartesianToLatLng,
  latLngToCartesian,
  tileLatLngBounds,
  webMercatorUv,
} from "../../dist/math/geo.js";

test("latLngToCartesian maps equator and prime meridian to positive x", () => {
  const point = latLngToCartesian({ lat: 0, lng: 0 }, 1);
  assert.ok(Math.abs(point.x - 1) < 1e-9);
  assert.ok(Math.abs(point.y) < 1e-9);
  assert.ok(Math.abs(point.z) < 1e-9);
});

test("cartesianToLatLng round-trips a geographic point", () => {
  const original = { lat: 32.0853, lng: 34.7818 };
  const point = latLngToCartesian(original, 1);
  const roundTripped = cartesianToLatLng(point);
  assert.ok(Math.abs(roundTripped.lat - original.lat) < 1e-6);
  assert.ok(Math.abs(roundTripped.lng - original.lng) < 1e-6);
});

test("tileLatLngBounds returns expected Web Mercator bounds", () => {
  const bounds = tileLatLngBounds(0, 0, 0);
  assert.equal(bounds.north, 85.0511287798066);
  assert.equal(bounds.south, -85.0511287798066);
  assert.equal(bounds.west, -180);
  assert.equal(bounds.east, 180);
});

test("webMercatorUv computes stable normalized uv coordinates", () => {
  const uv = webMercatorUv({ lat: 0, lng: 0 }, 1, 0, 0);
  assert.ok(uv.u >= 0 && uv.u <= 1);
  assert.ok(uv.v >= 0 && uv.v <= 1);
});

