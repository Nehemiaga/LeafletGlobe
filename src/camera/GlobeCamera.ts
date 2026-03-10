import {
  identityMat4,
  lookAtMat4,
  multiplyMat4,
  perspectiveMat4,
  rotationXMat4,
  rotationYMat4,
  rotationZMat4,
  type Mat4,
} from "../math/mat4.js";
import { vec3, type Vec3 } from "../math/vec3.js";

export type GlobeCameraOptions = {
  radius?: number;
  distance?: number;
  center?: { lat: number; lng: number };
  yaw?: number;
  pitch?: number;
  roll?: number;
  fovRadians?: number;
  near?: number;
  far?: number;
};

export type GlobeCameraPosition = Vec3 & {
  length: number;
};

type GlobeCameraState = {
  radius: number;
  distance: number;
  centerLat: number;
  centerLng: number;
  yaw: number;
  pitch: number;
  roll: number;
  fovRadians: number;
  near: number;
  far: number;
};

export class GlobeCamera {
  private state: GlobeCameraState;

  constructor(options: GlobeCameraOptions = {}) {
    this.state = {
      radius: options.radius ?? 1,
      distance: options.distance ?? 2.6,
      centerLat: options.center?.lat ?? 0,
      centerLng: options.center?.lng ?? 0,
      yaw: options.yaw ?? 0,
      pitch: options.pitch ?? 0,
      roll: options.roll ?? 0,
      fovRadians: options.fovRadians ?? Math.PI / 4,
      near: options.near ?? 0.1,
      far: options.far ?? 100,
    };
  }

  getState() {
    return {
      radius: this.state.radius,
      distance: this.state.distance,
      center: { lat: this.state.centerLat, lng: this.state.centerLng },
      yaw: this.state.yaw,
      pitch: this.state.pitch,
      roll: this.state.roll,
    };
  }

  setCenter(lat: number, lng: number) {
    this.state.centerLat = lat;
    this.state.centerLng = lng;
  }

  orbit(deltaYaw: number, deltaPitch: number, deltaRoll = 0) {
    this.state.yaw += deltaYaw;
    this.state.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.state.pitch + deltaPitch));
    this.state.roll += deltaRoll;
  }

  zoom(delta: number) {
    this.state.distance = Math.max(this.state.radius * 1.1, this.state.distance + delta);
  }

  getPosition(): GlobeCameraPosition {
    return {
      ...vec3(this.state.distance, 0, 0),
      length: this.state.distance,
    };
  }

  getViewMatrix(): Mat4 {
    return lookAtMat4(this.getPosition(), vec3(0, 0, 0), vec3(0, 1, 0));
  }

  getProjectionMatrix(aspect: number): Mat4 {
    return perspectiveMat4(this.state.fovRadians, aspect, this.state.near, this.state.far);
  }

  getModelMatrix(): Mat4 {
    const centerRotation = multiplyMat4(
      rotationZMat4(-this.state.centerLat * (Math.PI / 180)),
      rotationYMat4(-this.state.centerLng * (Math.PI / 180)),
    );
    const orbitRotation = multiplyMat4(
      multiplyMat4(rotationYMat4(this.state.yaw), rotationXMat4(this.state.pitch)),
      rotationZMat4(this.state.roll),
    );
    return multiplyMat4(orbitRotation, centerRotation);
  }

  getModelViewProjectionMatrix(aspect: number): Mat4 {
    return multiplyMat4(
      this.getProjectionMatrix(aspect),
      multiplyMat4(this.getViewMatrix(), this.getModelMatrix()),
    );
  }

  reset() {
    this.state.yaw = 0;
    this.state.pitch = 0;
    this.state.roll = 0;
  }

  getIdentityModelMatrix(): Mat4 {
    return identityMat4();
  }
}
