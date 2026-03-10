# Architecture

## Overview

`leaflet-globe` keeps Leaflet as the public API while replacing flat-map rendering with a custom globe pipeline.

## Main components

- `createGlobeMap`: creates a Leaflet map instance configured for globe rendering and patches `addLayer`, `removeLayer`, and `setView`.
- `GlobeRenderer`: owns the WebGL canvas, vector overlay canvas, popup/marker DOM overlay, texture cache, render loop, and interaction handling.
- `GlobeCamera`: manages zoom distance and globe orientation.
- `GlobeTileManager`: chooses visible tiles and generates globe-conforming tile meshes.
- `math/*`: geographic transforms, vector math, and matrix math.

## Rendering model

1. The camera computes projection, view, and model matrices.
2. The tile manager selects nearby tiles for the current center and zoom.
3. Each tile is subdivided into a grid.
4. Every grid point is converted from `lat/lng` into 3D globe coordinates.
5. UVs are computed from exact Web Mercator tile coordinates.
6. WebGL draws the textured tile meshes.
7. Markers, paths, polygons, and popups are projected into 2D overlay layers every frame.

## Interaction model

- drag: rotate the globe around the current center
- `Alt+drag`: roll the globe
- wheel: zoom

## Compatibility model

Supported core layer shapes are detected structurally:

- tile layers expose `getTileUrl`
- markers expose `getLatLng`
- paths expose `getLatLngs`
- popups expose `getContent`

Unsupported layers can still be handed off to raw Leaflet behavior, but are not guaranteed to align with the globe renderer.

