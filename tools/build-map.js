// Zet ruwe kaartdata (GeoJSON / Overpass JSON) om naar compacte SVG-paden
// voor de app. Gebruik:
//   node tools/build-map.js <provincies.geojson> <rivieren-osm.json> <uitvoer.js>
//
// Bronnen:
//   provincies: PDOK / CBS gebiedsindelingen 2023, laag provincie_gegeneraliseerd
//     https://service.pdok.nl/cbs/gebiedsindelingen/2023/wfs/v1_0?request=GetFeature&service=WFS&version=2.0.0&typeName=provincie_gegeneraliseerd&outputFormat=json&srsName=EPSG:4326
//   rivieren: OpenStreetMap via Overpass API (waterway=river|canal, op naam)
//     © OpenStreetMap-bijdragers, ODbL
const fs = require('fs');
const [provFile, riverFile, outFile] = process.argv.slice(2);
if (!provFile || !outFile) {
  console.error('Gebruik: node build-map.js <provincies.geojson> <rivieren.json|-> <uitvoer.js>');
  process.exit(1);
}

// ---- Projectie: equirectangulair, gecorrigeerd voor breedtegraad ----
const LON0 = 3.2, LAT1 = 53.62, LAT0 = 50.70, LONMAX = 7.30;
const COS = Math.cos((52.2 * Math.PI) / 180);
const K = 260; // pixels per graad breedte
const W = Math.round((LONMAX - LON0) * COS * K);
const H = Math.round((LAT1 - LAT0) * K);
const proj = ([lon, lat]) => [(lon - LON0) * COS * K, (LAT1 - lat) * K];

// ---- Douglas-Peucker ----
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    let maxD = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (r) => {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(s / 2);
};
const f1 = (n) => Math.round(n * 10) / 10;
const toPath = (pts, close) =>
  'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + (close ? 'Z' : '');

// ---- Provincies ----
const NAMEN = { 'Fryslân': 'Friesland' };
const prov = JSON.parse(fs.readFileSync(provFile, 'utf8'));
const provincies = {};
for (const f of prov.features) {
  const naam = NAMEN[f.properties.statnaam] || f.properties.statnaam;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let d = '';
  let best = null, bestA = 0;
  for (const poly of polys) {
    poly.forEach((ring, ri) => {
      const r = ring.map(proj), m = r.length >> 1;
      const p = simplify(r.slice(0, m + 1), 0.35).concat(simplify(r.slice(m), 0.35).slice(1));
      const a = area(p);
      if (a < 4) return; // piepkleine eilandjes weglaten
      d += toPath(p.slice(0, -1), true);
      if (ri === 0 && a > bestA) { bestA = a; best = p; }
    });
  }
  // label-positie: zwaartepunt van grootste ring
  let cx = 0, cy = 0;
  for (const [x, y] of best) { cx += x; cy += y; }
  provincies[naam] = { d, c: [f1(cx / best.length), f1(cy / best.length)] };
}

// ---- Rivieren ----
// OSM-namen -> naam in de app
const RIVIER = {
  'Rijn': 'Rijn', 'Boven-Rijn': 'Rijn', 'Bovenrijn': 'Rijn',
  'Nederrijn': 'Nederrijn', 'Neder-Rijn': 'Nederrijn',
  'Lek': 'Lek', 'Waal': 'Waal',
  'IJssel': 'IJssel', 'Gelderse IJssel': 'IJssel',
  'Maas': 'Maas', 'Bergsche Maas': 'Maas', 'Amer': 'Amer',
  'Boven Merwede': 'Merwede', 'Beneden Merwede': 'Merwede', 'Nieuwe Merwede': 'Merwede',
  'Nieuwe Maas': 'Nieuwe Maas', 'Nieuwe Waterweg': 'Nieuwe Waterweg',
  'Overijsselse Vecht': 'Vecht', 'Vecht': 'Vecht',
  'Eems': 'Eems', 'Ems': 'Eems',
  'Noordzeekanaal': 'Noordzeekanaal', 'Amsterdam-Rijnkanaal': 'Amsterdam-Rijnkanaal',
  'Schelde': 'Schelde', 'Westerschelde': 'Schelde',
};
const rivieren = {};
if (riverFile && riverFile !== '-') {
  const osm = JSON.parse(fs.readFileSync(riverFile, 'utf8'));
  const segs = {};
  for (const e of osm.elements) {
    const naam = RIVIER[e.tags.name];
    if (!naam || !e.geometry) continue;
    // De Utrechtse Vecht en de Overijsselse Vecht heten in OSM allebei soms 'Vecht'.
    // Voor groep 7 gebruiken we de Overijsselse Vecht (ten oosten van 5.9).
    if (naam === 'Vecht' && e.geometry[0].lon < 5.9) continue;
    (segs[naam] ||= []).push(e.geometry.map((g) => proj([g.lon, g.lat])));
  }
  for (const [naam, lines] of Object.entries(segs)) {
    // binnen het kaartvlak houden en vereenvoudigen
    const d = lines
      .map((l) => simplify(l, 0.6))
      .filter((l) => l.length > 1 && l.some(([x, y]) => x > 0 && x < W && y > 0 && y < H))
      .map((l) => toPath(l, false))
      .join('');
    rivieren[naam] = { d };
  }
}

const out =
  '// Gegenereerd door tools/build-map.js — niet met de hand bewerken.\n' +
  '// Provinciegrenzen: CBS/PDOK (CC-BY 4.0). Rivieren: © OpenStreetMap-bijdragers (ODbL).\n' +
  'window.KAART_NL = ' +
  JSON.stringify({ breedte: W, hoogte: H, projectie: { LON0, LAT1, COS, K }, provincies, rivieren }) +
  ';\n';
fs.writeFileSync(outFile, out);
console.log(`Kaart ${W}x${H}, ${Object.keys(provincies).length} provincies, rivieren: ${Object.keys(rivieren).join(', ') || '-'}; ${(out.length / 1024).toFixed(0)} kB`);
