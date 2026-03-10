export type SupportedLayerKind = "tile" | "marker" | "path" | "popup" | "unknown";

export function classifyLeafletLayer(layer: unknown): SupportedLayerKind {
  if (!layer || typeof layer !== "object") return "unknown";
  const value = layer as Record<string, unknown>;
  if (typeof value.getTileUrl === "function") return "tile";
  if (typeof value.getLatLng === "function") return "marker";
  if (typeof value.getLatLngs === "function") return "path";
  if (typeof value.getContent === "function") return "popup";
  return "unknown";
}

