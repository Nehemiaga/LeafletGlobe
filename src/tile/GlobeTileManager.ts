import { latLngToCartesian, tileLatLngBounds, tileCenterLatLng, webMercatorUv, type LatLngLike } from "../math/geo.js";

export type GlobeTileCoordinates = {
  z: number;
  x: number;
  y: number;
};

export type GlobeTileMesh = {
  positions: number[];
  uvs: number[];
  indices: number[];
};

export type GlobeTileManagerOptions = {
  radius?: number;
  subdivision?: number;
  tileRadiusOffset?: number;
};

export class GlobeTileManager {
  private radius: number;
  private subdivision: number;
  private tileRadiusOffset: number;
  private meshCache = new Map<string, GlobeTileMesh>();

  constructor(options: GlobeTileManagerOptions = {}) {
    this.radius = options.radius ?? 1;
    this.subdivision = options.subdivision ?? 12;
    this.tileRadiusOffset = options.tileRadiusOffset ?? 0.001;
  }

  getVisibleTiles(view: { zoom: number; center: LatLngLike }): GlobeTileCoordinates[] {
    const z = Math.max(0, Math.floor(view.zoom));
    const tileCount = 2 ** z;
    const center = tileCenterLatLng(z, Math.floor(((view.center.lng + 180) / 360) * tileCount), Math.floor(((1 - Math.log(Math.tan((Math.max(-85, Math.min(85, view.center.lat)) * Math.PI) / 180) + 1 / Math.cos((Math.max(-85, Math.min(85, view.center.lat)) * Math.PI) / 180)) / Math.PI) / 2) * tileCount));
    const centerX = Math.floor(((center.lng + 180) / 360) * tileCount);
    const latRad = Math.max(-85, Math.min(85, center.lat)) * (Math.PI / 180);
    const centerY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * tileCount);
    const radius = z <= 2 ? 2 : z <= 5 ? 1 : 1;
    const tiles: GlobeTileCoordinates[] = [];

    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = ((centerX + dx) % tileCount + tileCount) % tileCount;
        const y = centerY + dy;
        if (y < 0 || y >= tileCount) continue;
        tiles.push({ z, x, y });
      }
    }
    return tiles;
  }

  buildTileMesh(tile: GlobeTileCoordinates): GlobeTileMesh {
    const cacheKey = `${tile.z}/${tile.x}/${tile.y}/${this.subdivision}`;
    const cached = this.meshCache.get(cacheKey);
    if (cached) return cached;

    const bounds = tileLatLngBounds(tile.z, tile.x, tile.y);
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const steps = this.subdivision;
    const radius = this.radius + this.tileRadiusOffset;

    for (let row = 0; row <= steps; row += 1) {
      const rowT = row / steps;
      const lat = bounds.north + (bounds.south - bounds.north) * rowT;
      for (let col = 0; col <= steps; col += 1) {
        const colT = col / steps;
        const lng = bounds.west + (bounds.east - bounds.west) * colT;
        const point = latLngToCartesian({ lat, lng }, radius);
        const uv = webMercatorUv({ lat, lng }, tile.z, tile.x, tile.y);
        positions.push(point.x, point.y, point.z);
        uvs.push(uv.u, uv.v);
      }
    }

    const stride = steps + 1;
    for (let row = 0; row < steps; row += 1) {
      for (let col = 0; col < steps; col += 1) {
        const topLeft = row * stride + col;
        const topRight = topLeft + 1;
        const bottomLeft = topLeft + stride;
        const bottomRight = bottomLeft + 1;
        indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
      }
    }

    const mesh = { positions, uvs, indices };
    this.meshCache.set(cacheKey, mesh);
    return mesh;
  }
}

