import L from "leaflet";

import { GlobeRenderer } from "../render/GlobeRenderer.js";
import { classifyLeafletLayer } from "./layerSupport.js";
import type { GlobeMap, GlobeMapOptions } from "../types/public.js";

export function createGlobeMap(container: string | HTMLElement, options: GlobeMapOptions = {}): GlobeMap {
  const map = L.map(container, {
    center: options.center ?? [0, 0],
    zoom: options.zoom ?? 2,
    minZoom: options.minZoom ?? 0,
    maxZoom: options.maxZoom ?? 18,
    zoomControl: true,
    attributionControl: true,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  }) as GlobeMap;

  const renderer = new GlobeRenderer(map.getContainer(), {
    radius: options.radius ?? 1,
    center: latLngToPlainObject(map.getCenter()),
    zoom: map.getZoom(),
    backgroundColor: options.backgroundColor,
  });

  const originalAddLayer = map.addLayer.bind(map);
  const originalRemoveLayer = map.removeLayer.bind(map);
  const originalSetView = map.setView.bind(map);

  map.globeRenderer = renderer;
  map.isGlobeMap = true;

  map.setView = ((center: L.LatLngExpression, zoom?: number, setViewOptions?: L.ZoomPanOptions) => {
    const latLng = L.latLng(center);
    renderer.setView({ lat: latLng.lat, lng: latLng.lng }, zoom ?? map.getZoom());
    return originalSetView(center, zoom ?? map.getZoom(), { ...(setViewOptions ?? {}), animate: false });
  }) as typeof map.setView;

  map.addLayer = ((layer: L.Layer) => {
    switch (classifyLeafletLayer(layer)) {
      case "tile":
        renderer.addTileLayer(layer as unknown as { getTileUrl(coords: { x: number; y: number; z: number }): string; options?: { opacity?: number } });
        break;
      case "marker":
        renderer.addMarker(layer as unknown as { getLatLng(): L.LatLng; options?: { title?: string } });
        break;
      case "path":
        renderer.addPath(layer as unknown as {
          getLatLngs(): unknown;
          options?: { color?: string; weight?: number; fillColor?: string; fillOpacity?: number };
        });
        break;
      case "popup":
        renderer.addPopup(layer as unknown as { getLatLng(): L.LatLng; getContent(): string | HTMLElement });
        break;
      default:
        originalAddLayer(layer);
        break;
    }
    return map;
  }) as typeof map.addLayer;

  map.removeLayer = ((layer: L.Layer) => {
    switch (classifyLeafletLayer(layer)) {
      case "tile":
        renderer.removeTileLayer(layer as unknown as { getTileUrl(coords: { x: number; y: number; z: number }): string });
        break;
      case "marker":
        renderer.removeMarker(layer as unknown as { getLatLng(): L.LatLng });
        break;
      case "path":
        renderer.removePath(layer as unknown as { getLatLngs(): unknown });
        break;
      case "popup":
        renderer.removePopup(layer as unknown as { getLatLng(): L.LatLng; getContent(): string | HTMLElement });
        break;
      default:
        originalRemoveLayer(layer);
        break;
    }
    return map;
  }) as typeof map.removeLayer;

  map.on("unload", () => renderer.destroy());
  return map;
}

function latLngToPlainObject(latLng: L.LatLng) {
  return { lat: latLng.lat, lng: latLng.lng };
}
