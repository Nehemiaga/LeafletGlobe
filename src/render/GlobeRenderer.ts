import type L from "leaflet";

import { GlobeCamera } from "../camera/GlobeCamera.js";
import { latLngToCartesian, type LatLngLike } from "../math/geo.js";
import { multiplyMat4, transformVec4 } from "../math/mat4.js";
import { GlobeTileManager, type GlobeTileCoordinates, type GlobeTileMesh } from "../tile/GlobeTileManager.js";

type TileLayerLike = {
  getTileUrl(coords: { x: number; y: number; z: number }): string;
  options?: {
    opacity?: number;
  };
};

type MarkerLike = {
  getLatLng(): L.LatLng;
  options?: {
    title?: string;
  };
};

type PathLike = {
  getLatLngs(): unknown;
  options?: {
    color?: string;
    weight?: number;
    fillColor?: string;
    fillOpacity?: number;
  };
};

type PopupLike = {
  getLatLng(): L.LatLng;
  getContent(): string | HTMLElement;
};

type RendererOptions = {
  radius?: number;
  center?: LatLngLike;
  zoom?: number;
  backgroundColor?: string;
};

type TileTextureRecord = {
  texture: WebGLTexture;
  image: HTMLImageElement;
  loaded: boolean;
  url: string;
};

type MeshBuffers = {
  positionBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  indexCount: number;
};

export class GlobeRenderer {
  private readonly container: HTMLElement;
  private readonly glCanvas: HTMLCanvasElement;
  private readonly vectorCanvas: HTMLCanvasElement;
  private readonly overlayPane: HTMLDivElement;
  private readonly gl: WebGLRenderingContext;
  private readonly camera: GlobeCamera;
  private readonly tileManager: GlobeTileManager;
  private readonly tileLayers: TileLayerLike[] = [];
  private readonly markers = new Set<MarkerLike>();
  private readonly paths = new Set<PathLike>();
  private readonly popups = new Set<PopupLike>();
  private readonly tileTextures = new Map<string, TileTextureRecord>();
  private readonly meshBuffers = new Map<string, MeshBuffers>();
  private readonly markerNodes = new Map<MarkerLike, HTMLDivElement>();
  private readonly popupNodes = new Map<PopupLike, HTMLDivElement>();
  private readonly resizeObserver: ResizeObserver;
  private readonly program: WebGLProgram;
  private readonly aPosition: number;
  private readonly aUv: number;
  private readonly uMvp: WebGLUniformLocation;
  private readonly uTexture: WebGLUniformLocation;
  private readonly uOpacity: WebGLUniformLocation;
  private zoom: number;
  private center: LatLngLike;
  private isDisposed = false;
  private renderRequested = false;
  private dragPointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;

  constructor(container: HTMLElement, options: RendererOptions = {}) {
    this.container = container;
    this.center = options.center ?? { lat: 0, lng: 0 };
    this.zoom = options.zoom ?? 2;
    this.camera = new GlobeCamera({
      radius: options.radius ?? 1,
      center: this.center,
      distance: this.distanceFromZoom(this.zoom),
    });
    this.tileManager = new GlobeTileManager({ radius: options.radius ?? 1, subdivision: 8 });

    this.glCanvas = document.createElement("canvas");
    this.vectorCanvas = document.createElement("canvas");
    this.overlayPane = document.createElement("div");
    Object.assign(this.container.style, { position: this.container.style.position || "relative", overflow: "hidden" });
    Object.assign(this.glCanvas.style, this.absoluteFillStyles(), { background: options.backgroundColor ?? "#020617" });
    Object.assign(this.vectorCanvas.style, this.absoluteFillStyles(), { pointerEvents: "none" });
    Object.assign(this.overlayPane.style, this.absoluteFillStyles(), { pointerEvents: "none" });
    this.overlayPane.className = "leaflet-globe-overlay";
    this.glCanvas.className = "leaflet-globe-canvas";
    this.vectorCanvas.className = "leaflet-globe-vectors";

    this.container.append(this.glCanvas, this.vectorCanvas, this.overlayPane);

    const gl = this.glCanvas.getContext("webgl", { alpha: true, antialias: true });
    if (!gl) {
      throw new Error("leaflet-globe requires WebGL support.");
    }
    this.gl = gl;
    this.program = this.createProgram();
    this.gl.useProgram(this.program);
    this.aPosition = this.gl.getAttribLocation(this.program, "a_position");
    this.aUv = this.gl.getAttribLocation(this.program, "a_uv");
    this.uMvp = this.getUniformLocation("u_mvp");
    this.uTexture = this.getUniformLocation("u_texture");
    this.uOpacity = this.getUniformLocation("u_opacity");
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.bindInteractions();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.requestRender();
  }

  addTileLayer(layer: TileLayerLike) {
    this.tileLayers.push(layer);
    this.requestRender();
  }

  removeTileLayer(layer: TileLayerLike) {
    const index = this.tileLayers.indexOf(layer);
    if (index >= 0) this.tileLayers.splice(index, 1);
    this.requestRender();
  }

  addMarker(layer: MarkerLike) {
    this.markers.add(layer);
    const node = document.createElement("div");
    node.textContent = "•";
    Object.assign(node.style, {
      position: "absolute",
      color: "#f97316",
      fontSize: "24px",
      transform: "translate(-50%, -50%)",
      textShadow: "0 0 8px rgba(15,23,42,0.9)",
      pointerEvents: "none",
    });
    if (layer.options?.title) node.title = layer.options.title;
    this.overlayPane.append(node);
    this.markerNodes.set(layer, node);
    this.requestRender();
  }

  removeMarker(layer: MarkerLike) {
    this.markers.delete(layer);
    const node = this.markerNodes.get(layer);
    node?.remove();
    this.markerNodes.delete(layer);
    this.requestRender();
  }

  addPath(layer: PathLike) {
    this.paths.add(layer);
    this.requestRender();
  }

  removePath(layer: PathLike) {
    this.paths.delete(layer);
    this.requestRender();
  }

  addPopup(layer: PopupLike) {
    this.popups.add(layer);
    const node = document.createElement("div");
    node.className = "leaflet-globe-popup";
    Object.assign(node.style, {
      position: "absolute",
      minWidth: "160px",
      maxWidth: "280px",
      padding: "10px 12px",
      background: "rgba(15,23,42,0.92)",
      color: "#e2e8f0",
      border: "1px solid rgba(148,163,184,0.35)",
      borderRadius: "10px",
      transform: "translate(-50%, calc(-100% - 16px))",
      boxShadow: "0 12px 30px rgba(2,6,23,0.35)",
      pointerEvents: "none",
      backdropFilter: "blur(6px)",
    });
    const content = layer.getContent();
    if (typeof content === "string") {
      node.innerHTML = content;
    } else {
      node.append(content);
    }
    this.overlayPane.append(node);
    this.popupNodes.set(layer, node);
    this.requestRender();
  }

  removePopup(layer: PopupLike) {
    this.popups.delete(layer);
    const node = this.popupNodes.get(layer);
    node?.remove();
    this.popupNodes.delete(layer);
    this.requestRender();
  }

  setView(center: LatLngLike, zoom: number) {
    this.center = center;
    this.zoom = zoom;
    this.camera.setCenter(center.lat, center.lng);
    this.camera.zoom(this.distanceFromZoom(zoom) - this.camera.getPosition().x);
    this.requestRender();
  }

  getCenter(): LatLngLike {
    return this.center;
  }

  getZoom(): number {
    return this.zoom;
  }

  destroy() {
    this.isDisposed = true;
    this.resizeObserver.disconnect();
    this.glCanvas.remove();
    this.vectorCanvas.remove();
    this.overlayPane.remove();
  }

  private absoluteFillStyles(): CSSStyleDeclaration | Record<string, string> {
    return {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
    };
  }

  private bindInteractions() {
    this.glCanvas.addEventListener("pointerdown", (event) => {
      this.dragPointerId = event.pointerId;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.glCanvas.setPointerCapture(event.pointerId);
    });
    this.glCanvas.addEventListener("pointermove", (event) => {
      if (this.dragPointerId !== event.pointerId) return;
      const dx = event.clientX - this.lastPointerX;
      const dy = event.clientY - this.lastPointerY;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      if (event.altKey) {
        this.camera.orbit(0, 0, dx * 0.005);
      } else {
        this.center = {
          lat: Math.max(-85, Math.min(85, this.center.lat - dy * 0.15)),
          lng: ((this.center.lng - dx * 0.2 + 540) % 360) - 180,
        };
        this.camera.setCenter(this.center.lat, this.center.lng);
      }
      this.requestRender();
    });
    const endDrag = (event: PointerEvent) => {
      if (this.dragPointerId !== event.pointerId) return;
      this.dragPointerId = null;
      this.glCanvas.releasePointerCapture(event.pointerId);
    };
    this.glCanvas.addEventListener("pointerup", endDrag);
    this.glCanvas.addEventListener("pointercancel", endDrag);
    this.glCanvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.zoom = Math.max(0, Math.min(18, this.zoom - Math.sign(event.deltaY) * 0.35));
      this.camera.zoom(Math.sign(event.deltaY) * 0.08);
      this.requestRender();
    }, { passive: false });
  }

  private resize() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    const dpr = window.devicePixelRatio || 1;

    this.glCanvas.width = Math.round(width * dpr);
    this.glCanvas.height = Math.round(height * dpr);
    this.vectorCanvas.width = Math.round(width * dpr);
    this.vectorCanvas.height = Math.round(height * dpr);
    this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
    const context2d = this.vectorCanvas.getContext("2d");
    context2d?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.requestRender();
  }

  private requestRender() {
    if (this.renderRequested || this.isDisposed) return;
    this.renderRequested = true;
    requestAnimationFrame(() => {
      this.renderRequested = false;
      this.render();
    });
  }

  private render() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    const aspect = width / height;
    const projection = this.camera.getProjectionMatrix(aspect);
    const view = this.camera.getViewMatrix();
    const model = this.camera.getModelMatrix();
    const mvp = multiplyMat4(projection, multiplyMat4(view, model));

    this.gl.clearColor(0.01, 0.03, 0.09, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    for (const layer of this.tileLayers) {
      const tiles = this.tileManager.getVisibleTiles({ zoom: Math.round(this.zoom), center: this.center });
      for (const tile of tiles) {
        const texture = this.getOrCreateTileTexture(layer, tile);
        if (!texture.loaded) continue;
        const mesh = this.tileManager.buildTileMesh(tile);
        const buffers = this.getMeshBuffers(tile, mesh);
        this.drawTile(buffers, texture.texture, mvp, layer.options?.opacity ?? 1);
      }
    }

    this.drawVectors(width, height, mvp);
    this.positionDomOverlays(width, height, mvp);
  }

  private drawTile(buffers: MeshBuffers, texture: WebGLTexture, mvp: number[], opacity: number) {
    this.gl.uniformMatrix4fv(this.uMvp, false, new Float32Array(mvp));
    this.gl.uniform1f(this.uOpacity, opacity);
    this.gl.uniform1i(this.uTexture, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.positionBuffer);
    this.gl.enableVertexAttribArray(this.aPosition);
    this.gl.vertexAttribPointer(this.aPosition, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.uvBuffer);
    this.gl.enableVertexAttribArray(this.aUv);
    this.gl.vertexAttribPointer(this.aUv, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.drawElements(this.gl.TRIANGLES, buffers.indexCount, this.gl.UNSIGNED_SHORT, 0);
  }

  private drawVectors(width: number, height: number, mvp: number[]) {
    const context = this.vectorCanvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);

    for (const path of this.paths) {
      const latLngs = this.flattenLatLngs(path.getLatLngs());
      if (latLngs.length < 2) continue;
      const screenPoints = latLngs.map((latLng) => this.project(latLng, width, height, mvp)).filter((point): point is { x: number; y: number; visible: boolean } => point !== null);
      if (screenPoints.length < 2) continue;
      context.beginPath();
      screenPoints.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.lineWidth = path.options?.weight ?? 2;
      context.strokeStyle = path.options?.color ?? "#38bdf8";
      context.stroke();
      if (path.options?.fillColor) {
        context.fillStyle = path.options.fillColor;
        context.globalAlpha = path.options.fillOpacity ?? 0.25;
        context.fill();
        context.globalAlpha = 1;
      }
    }
  }

  private positionDomOverlays(width: number, height: number, mvp: number[]) {
    for (const [marker, node] of this.markerNodes) {
      const point = this.project(marker.getLatLng(), width, height, mvp);
      node.style.display = point?.visible ? "block" : "none";
      if (!point?.visible) continue;
      node.style.left = `${point.x}px`;
      node.style.top = `${point.y}px`;
    }

    for (const [popup, node] of this.popupNodes) {
      const point = this.project(popup.getLatLng(), width, height, mvp);
      node.style.display = point?.visible ? "block" : "none";
      if (!point?.visible) continue;
      node.style.left = `${point.x}px`;
      node.style.top = `${point.y}px`;
    }
  }

  private project(latLng: LatLngLike, width: number, height: number, mvp: number[]) {
    const world = latLngToCartesian(latLng, 1.0015);
    const clip = transformVec4(mvp, [world.x, world.y, world.z, 1]);
    if (clip[3] === 0) return null;
    const ndcX = clip[0] / clip[3];
    const ndcY = clip[1] / clip[3];
    const ndcZ = clip[2] / clip[3];
    const visible = clip[3] > 0 && ndcX >= -1.25 && ndcX <= 1.25 && ndcY >= -1.25 && ndcY <= 1.25 && ndcZ >= -1 && ndcZ <= 1;
    return {
      x: ((ndcX + 1) / 2) * width,
      y: ((1 - ndcY) / 2) * height,
      visible,
    };
  }

  private flattenLatLngs(latLngs: unknown): L.LatLng[] {
    if (!Array.isArray(latLngs)) return [];
    if (latLngs.length > 0 && Array.isArray(latLngs[0])) {
      return (latLngs as unknown[]).flat(2) as L.LatLng[];
    }
    return latLngs as L.LatLng[];
  }

  private getMeshBuffers(tile: GlobeTileCoordinates, mesh: GlobeTileMesh): MeshBuffers {
    const meshId = `${tile.z}/${tile.x}/${tile.y}`;
    const cached = this.meshBuffers.get(meshId);
    if (cached) return cached;

    const positionBuffer = this.requireBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mesh.positions), this.gl.STATIC_DRAW);

    const uvBuffer = this.requireBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mesh.uvs), this.gl.STATIC_DRAW);

    const indexBuffer = this.requireBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), this.gl.STATIC_DRAW);

    const buffers = {
      positionBuffer,
      uvBuffer,
      indexBuffer,
      indexCount: mesh.indices.length,
    };
    this.meshBuffers.set(meshId, buffers);
    return buffers;
  }

  private getOrCreateTileTexture(layer: TileLayerLike, tile: GlobeTileCoordinates): TileTextureRecord {
    const url = layer.getTileUrl(tile);
    const existing = this.tileTextures.get(url);
    if (existing) return existing;

    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error("Failed to allocate tile texture.");
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      1,
      1,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );

    const image = new Image();
    image.crossOrigin = "anonymous";
    const record: TileTextureRecord = { texture, image, loaded: false, url };
    image.onload = () => {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
      this.gl.generateMipmap(this.gl.TEXTURE_2D);
      record.loaded = true;
      this.requestRender();
    };
    image.src = url;
    this.tileTextures.set(url, record);
    return record;
  }

  private requireBuffer(): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error("Failed to allocate WebGL buffer.");
    return buffer;
  }

  private getUniformLocation(name: string): WebGLUniformLocation {
    const location = this.gl.getUniformLocation(this.program, name);
    if (!location) throw new Error(`Missing uniform ${name}`);
    return location;
  }

  private createProgram(): WebGLProgram {
    const vertexSource = `
      attribute vec3 a_position;
      attribute vec2 a_uv;
      uniform mat4 u_mvp;
      varying vec2 v_uv;

      void main() {
        v_uv = a_uv;
        gl_Position = u_mvp * vec4(a_position, 1.0);
      }
    `;
    const fragmentSource = `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      uniform float u_opacity;

      void main() {
        vec4 color = texture2D(u_texture, v_uv);
        gl_FragColor = vec4(color.rgb, color.a * u_opacity);
      }
    `;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
    const program = this.gl.createProgram();
    if (!program) {
      throw new Error("Failed to create WebGL program.");
    }
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program) ?? "Failed to link WebGL program.");
    }
    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader.");
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader) ?? "Failed to compile shader.");
    }
    return shader;
  }

  private distanceFromZoom(zoom: number): number {
    return Math.max(1.4, 5.5 - zoom * 0.24);
  }
}
