import test from "node:test";
import assert from "node:assert/strict";

import { classifyLeafletLayer } from "../../dist/leaflet/layerSupport.js";

test("classifyLeafletLayer detects supported layer shapes", () => {
  assert.equal(classifyLeafletLayer({ getTileUrl() {} }), "tile");
  assert.equal(classifyLeafletLayer({ getLatLng() {} }), "marker");
  assert.equal(classifyLeafletLayer({ getLatLngs() {} }), "path");
  assert.equal(classifyLeafletLayer({ getContent() {} }), "popup");
  assert.equal(classifyLeafletLayer({}), "unknown");
});
