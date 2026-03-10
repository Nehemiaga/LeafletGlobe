import test from "node:test";
import assert from "node:assert/strict";

import { GlobeCamera } from "../../dist/camera/GlobeCamera.js";

test("GlobeCamera returns matrices and position", () => {
  const camera = new GlobeCamera({ radius: 1, distance: 2.5 });
  const state = camera.getState();
  assert.equal(state.yaw, 0);
  assert.equal(state.pitch, 0);
  assert.ok(Array.isArray(camera.getViewMatrix()));
  assert.equal(camera.getViewMatrix().length, 16);
  assert.equal(camera.getProjectionMatrix(1.6).length, 16);
  assert.ok(camera.getPosition().length > 0);
});

test("GlobeCamera orbit and zoom update state predictably", () => {
  const camera = new GlobeCamera({ radius: 1, distance: 3 });
  camera.orbit(Math.PI / 4, Math.PI / 8, Math.PI / 16);
  camera.zoom(-0.75);
  const state = camera.getState();
  assert.ok(state.yaw > 0);
  assert.ok(state.pitch > 0);
  assert.ok(state.roll > 0);
  assert.ok(state.distance < 3);
});

