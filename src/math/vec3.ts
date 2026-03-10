export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function scaleVec3(a: Vec3, scalar: number): Vec3 {
  return vec3(a.x * scalar, a.y * scalar, a.z * scalar);
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

export function lengthVec3(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function normalizeVec3(a: Vec3): Vec3 {
  const length = lengthVec3(a);
  return length === 0 ? vec3(0, 0, 0) : scaleVec3(a, 1 / length);
}

