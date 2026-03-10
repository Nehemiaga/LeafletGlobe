# API

## `createGlobeMap(container, options)`

Creates a Leaflet map instance augmented with globe rendering.

### Options

- `center?: L.LatLngExpression`
- `zoom?: number`
- `radius?: number`
- `minZoom?: number`
- `maxZoom?: number`
- `backgroundColor?: string`

### Returns

A Leaflet `Map` instance extended with:

- `globeRenderer`
- `isGlobeMap`

## Supported layer types

### `L.TileLayer`

Used as the imagery source for the globe. Multiple tile layers can be added and will render in order.

### `L.Marker`

Rendered as a projected billboard in the DOM overlay.

### `L.Polyline` / `L.Polygon`

Rendered on a 2D canvas overlay from 3D projected points.

### `L.Popup`

Rendered in the DOM overlay and anchored to projected globe coordinates.

## Controls

- drag to rotate
- `Alt+drag` to roll
- wheel to zoom

