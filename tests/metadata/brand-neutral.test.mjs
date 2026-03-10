import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "../..");
const forbidden = [
  new RegExp(["bam", "qam"].join(""), "i"),
  new RegExp(["us", "vs", "ir"].join(""), "i"),
  new RegExp(["us", " ", "vs", " ", "ir"].join(""), "i"),
];
const scanDirectories = ["src", "docs", "examples"];
const scanFiles = [
  "README.md",
  "LICENSE",
  "package.json",
  "tsconfig.json",
  ".gitignore",
  "tests/camera/GlobeCamera.test.mjs",
  "tests/leaflet/createGlobeMap.test.mjs",
  "tests/math/geo.test.mjs",
  "tests/tile/GlobeTileManager.test.mjs",
];

test("package files stay brand-neutral", () => {
  const filePaths = [];

  for (const directory of scanDirectories) {
    collectFiles(path.join(packageRoot, directory), filePaths);
  }

  for (const fileName of scanFiles) {
    filePaths.push(path.join(packageRoot, fileName));
  }

  const matches = [];

  for (const filePath of filePaths) {
    const content = fs.readFileSync(filePath, "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(content)) {
        matches.push({ filePath, pattern: pattern.toString() });
      }
    }
  }

  assert.deepEqual(matches, []);
});

test("license includes explicit maintainer attribution", () => {
  const license = fs.readFileSync(path.join(packageRoot, "LICENSE"), "utf8");
  assert.match(license, /Nehemiaga and contributors/);
});

test("package exposes a runnable local demo script", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  assert.equal(typeof packageJson.scripts?.demo, "string");
  assert.ok(packageJson.scripts.demo.length > 0);
  assert.ok(fs.existsSync(path.join(packageRoot, "examples/basic/server.mjs")));
});

function collectFiles(directory, output) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "dist" || entry.name === "node_modules") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, output);
    } else {
      output.push(fullPath);
    }
  }
}
