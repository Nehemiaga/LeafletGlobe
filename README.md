# leaflet-globe

`leaflet-globe` turns Leaflet into a true 3D globe renderer without delegating rendering to another map engine.

## Status

This package is currently being developed in-repo. It includes:

- a standalone package layout
- a dedicated git repository
- a custom WebGL globe renderer
- globe-aware adapters for core Leaflet layers
- docs and examples

## Features

- Leaflet-first public API via `createGlobeMap`
- Custom WebGL globe rendering pipeline
- Accurate draping of XYZ tiles onto a globe mesh
- Full-axis interaction: orbit, pan-style globe rotation, zoom, roll with `Alt+drag`
- Globe-aware support for `TileLayer`, `Marker`, `Polyline`, `Polygon`, and `Popup`
- Standalone docs and example assets

## Quick Start

```ts
import L from "leaflet";
import { createGlobeMap } from "leaflet-globe";

const map = createGlobeMap("map", {
  center: [20, 0],
  zoom: 2,
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
L.marker([32.0853, 34.7818], { title: "Tel Aviv" }).addTo(map);
L.polyline([
  [32.0853, 34.7818],
  [48.8566, 2.3522],
]).addTo(map);
```

## Local development

```bash
npm run build
npm run test
npm run demo
```

`npm run demo` builds the package and starts a local server for the live example at `http://127.0.0.1:4173`.

## Design

See [docs/architecture.md](./docs/architecture.md) and [docs/api.md](./docs/api.md).

## Notes

- The current release targets globe rendering for standard XYZ imagery tiles.
- The renderer uses a spherical earth model.
- Third-party Leaflet plugins that depend on 2D panes are not yet guaranteed to work unchanged.
