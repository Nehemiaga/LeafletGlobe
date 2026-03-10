import type L from "leaflet";
import type { GlobeRenderer } from "../render/GlobeRenderer.js";

export type GlobeMapOptions = {
  center?: L.LatLngExpression;
  zoom?: number;
  radius?: number;
  minZoom?: number;
  maxZoom?: number;
  inertia?: boolean;
  backgroundColor?: string;
};

export type GlobeMarkerOptions = {
  color?: string;
  radius?: number;
  label?: string;
};

export type GlobePathOptions = {
  color?: string;
  width?: number;
  fill?: string;
};

export type GlobePolygonOptions = GlobePathOptions;

export type GlobePopupOptions = {
  className?: string;
};

export type GlobeMap = L.Map & {
  globeRenderer: GlobeRenderer;
  isGlobeMap: true;
};

