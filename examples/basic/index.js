import L from "https://esm.sh/leaflet@1.9.4";
import { createGlobeMap } from "../../dist/index.js";

const map = createGlobeMap("map", { center: [20, 0], zoom: 2 });

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

L.marker([32.0853, 34.7818], { title: "Tel Aviv" }).addTo(map);
L.marker([35.6895, 139.6917], { title: "Tokyo" }).addTo(map);
L.marker([40.7128, -74.006], { title: "New York" }).addTo(map);

L.polyline(
  [
    [32.0853, 34.7818],
    [48.8566, 2.3522],
    [40.7128, -74.006],
    [35.6895, 139.6917],
  ],
  { color: "#22d3ee", weight: 2 }
).addTo(map);

L.popup()
  .setLatLng([48.8566, 2.3522])
  .setContent("<strong>Paris</strong><br/>leaflet-globe live demo")
  .addTo(map);

