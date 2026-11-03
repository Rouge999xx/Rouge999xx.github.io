/* =========================================================
   Carl Tampus — Portfolio journey (three.js + GSAP ScrollTrigger)
   A walk through a New York–style city behind the home page. The camera comes in over the harbor, drops
   into an avenue and travels the grid as you scroll, turning corners between chapters. Each chapter stops
   at a piece of the city: a deco tower with searchlights in the hero, a wall of screens for Flow Auto, an
   LED news ticker for HealthNest, a theater marquee for the intro film, a transit map of the toolkit, a
   split-flap departures board for Cebu, and a building going up for Contact.
   main.js marks the page with html.journey (full motion, hardware WebGL 2) so the layout is ready early;
   this adds html.journey-live once the city has drawn its first frame. Elements marked data-station tell
   the camera where each stop is. The navy theme is the city at night; the paper theme is the city by day.
   ========================================================= */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.min.js';

const root = document.documentElement;
const { gsap, ScrollTrigger } = window;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (dt, rate) => 1 - Math.exp(-dt * rate);
const idle = () => new Promise(resolve => (window.requestIdleCallback ? requestIdleCallback(resolve, { timeout: 500 }) : setTimeout(resolve, 30)));
const loadImage = src => new Promise((resolve, reject) => {
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});
// The same city on every visit (mulberry32).
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SANS = '"Inter Tight", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

/* ---------- Colors ----------
   Night on navy (lit windows, wet streets, glowing signs); day on paper (ink edges, glass, lamps off). */
const PALETTES = {
  dark: {
    bg: '#0a0f1a', skyTop: '#03060d', skyHorizon: '#131c32', skyGlow: '#2e2b4a',
    facade: '#0a111d', facadeAlt: '#161a26', roof: '#060a12', edge: '#27324c', glass: '#0b1626',
    warm: '#ffc987', cool: '#cfe0ff', asphalt: '#070b13', walk: '#0f1521', marking: '#49577a', water: '#050a14',
    metal: '#151d2d', wood: '#1d1610', plywood: '#3a2c1d', concrete: '#596173', lamp: '#ffbf6e',
    head: '#fff1d0', tail: '#ff3b3b', taxi: '#f0b31c', accent: '#3b7bff', hot: '#d6e4ff', teal: '#4fe0c8',
    tealHot: '#c9fff4', amber: '#ffb547', coral: '#ff7676', go: '#43d17f', bezel: '#04070d', standby: '#0c1528',
    stone: '#3a4256', beam: '#bcd2ff', steel: '#7d4535', crane: '#d6b347', label: '#c9d6ee',
    flap: '#121418', flapInk: '#f1f1ec', flapDim: '#8a8f99', steam: '#aab4c8'
  },
  light: {
    bg: '#f5f4f0', skyTop: '#f4f2ec', skyHorizon: '#e5e0d5', skyGlow: '#d8d1c2',
    facade: '#e2ded5', facadeAlt: '#d3cbbd', roof: '#c9c2b5', edge: '#1b2433', glass: '#a7b2c2',
    warm: '#ffc987', cool: '#cfe0ff', asphalt: '#c9c4ba', walk: '#ddd7cc', marking: '#f9f8f4', water: '#c3ccd8',
    metal: '#3b4456', wood: '#7d6449', plywood: '#c79f6b', concrete: '#9aa1ad', lamp: '#ffbf6e',
    head: '#fff1d0', tail: '#d84343', taxi: '#efb21a', accent: '#1d4ed8', hot: '#0b2a80', teal: '#0d9488',
    tealHot: '#064e45', amber: '#c27a0e', coral: '#cf4a4a', go: '#1f9d55', bezel: '#1b2433', standby: '#e7e4dc',
    stone: '#d6d0c4', beam: '#bcd2ff', steel: '#a5543b', crane: '#d3a623', label: '#1b2433',
    flap: '#1a1c22', flapInk: '#f1f1ec', flapDim: '#8a8f99', steam: '#ffffff'
  }
};
const WEATHER = { dark: { night: 1, fog: .0042, veil: .72 }, light: { night: 0, fog: .0047, veil: .62 } };
const themeName = () => (root.dataset.theme === 'light' ? 'light' : 'dark');

/* ---------- The grid ----------
   Avenues run north (−z) every 60 units, roadway ±6 and building line ±9 from their middle; streets run east
   every 26 units, roadway ±4 and building line ±6.5. A storey is 2 units; the camera rides at about the
   second floor. */
const AVENUES = [-120, -60, 0, 60, 120, 180];
const AVE_LINE = 9, ST = 26, ST_LINE = 6.5, FLOOR = 2, EYE = 3.4;
const ROWS = 21;       // blocks from the waterfront (z = 0) north
const END_STREET = 18; // the avenue at x = 60 ends at this street, at the building going up

// In over the harbor, down into the first avenue, east along a street, up the next avenue to the site.
const ROUTE = [
  [0, 36, 86], [0, 34, 60], [0, 22, 34], [0, 9, 12], [0, EYE + .4, -8], [1.6, EYE, -40], [1.6, EYE, -100],
  [.4, EYE, -150], [0, EYE, -192], [8, EYE, -208], [30, EYE, -208], [52, EYE, -208], [60, EYE, -218],
  [60.8, EYE, -270], [60.8, EYE, -330], [60, EYE + .6, -392], [59, 9, -428], [58, 17, -452]
];

// Each chapter's stop: where the camera holds, what it looks at, and where that lands on screen, as a share
// of half the screen: beside the text on wide screens (desk), above it on phones (phone).
const STOPS = {
  core: { hold: [0, 34.6, 68], subject: [26, 64, -13], desk: [.36, .2], phone: [0, .5], range: 280 },
  line: { hold: [1.4, EYE, -30], subject: [17, 13, -58.5], desk: [.42, .06], phone: [.05, .42], range: 170 },
  pulse: { hold: [1, EYE, -136], subject: [16, 12.5, -163], desk: [.42, .06], phone: [0, .42], range: 170 },
  reel: { hold: [16, EYE, -208], subject: [34, 8.5, -203], desk: [.36, .1], phone: [0, .4], range: 150 },
  orbit: { hold: [60.6, EYE, -246], subject: [78, 8.2, -266.4], desk: [.42, .06], phone: [0, .42], range: 170 },
  globe: { hold: [60.8, EYE, -318], subject: [80.2, 8, -344.3], desk: [.42, .06], phone: [0, .42], range: 170 },
  portal: { hold: [59, 11.5, -436], subject: [70, 54, -490], desk: [.1, .5], phone: [0, .3], range: 230 }
};
const HOLD = 3, HERO_PUSH = 55, LOOK = 8;

// Lots the stops stand on: [x0, x1, z0, z1, floors, glass, tone]. The two-storey corner shops keep each
// stop in view down the avenue.
const LANDMARKS = [
  [9, 25, -71.5, -58.5, 46, 1, .1], [9, 23, -45.5, -32.5, 2, 0, .8],
  [9, 25, -175.5, -162.5, 16, 0, .85], [9, 23, -149.5, -136.5, 2, 0, .6],
  [26, 42, -201.5, -188.5, 9, 0, 1],
  [69, 87, -279.5, -266.5, 22, 0, .4], [69, 83, -253.5, -240.5, 2, 0, .7],
  [69, 91, -357.5, -344.5, 20, 0, .25], [69, 83, -331.5, -318.5, 2, 0, .9]
];
const TOWER = [19, 33, -19.5, -6.5]; // the deco tower on the waterfront
const SITE = [50, 88, -504, -474.5]; // the lot that is going up

/* ---------- Shader pieces ---------- */
// The veil: the city fades toward the page color where the text sits, in a band along the left edge (beside
// the chapters on wide screens) and one along the bottom (under the hero's lines, and a phone's chapters).
// uVeil holds where each band starts and ends in pixels, uVeilAmount how strong each one is.
const VEIL = /* glsl */`
uniform vec4 uVeil; uniform vec2 uVeilAmount;
float veil() {
  float left = 1. - smoothstep(uVeil.x, uVeil.y, gl_FragCoord.x);
  float low = 1. - smoothstep(uVeil.z, uVeil.w, gl_FragCoord.y);
  return max(left * uVeilAmount.x, low * uVeilAmount.y);
}`;
// The sky, and the haze every surface fades into with distance.
const AIR = VEIL + /* glsl */`
uniform vec3 uSkyTop, uSkyHorizon, uSkyGlow, uBg;
uniform float uFog;
vec3 skyColor(vec3 dir) {
  vec3 c = mix(uSkyHorizon, uSkyTop, smoothstep(0., .42, dir.y));
  return c + uSkyGlow * exp(-abs(dir.y) * 8.) * .6;
}
vec3 fogged(vec3 color, vec3 world) {
  vec3 d = world - cameraPosition;
  float f = 1. - exp(-dot(d, d) * uFog * uFog);
  return mix(mix(color, uSkyHorizon + uSkyGlow * .6, f), uBg, veil()); // haze toward the sky's color at the horizon
}`;
const HASH = /* glsl */`
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`;
// Boxes (instanced or not) pass their local position and size, so shaders can draw edges in world units.
const BOX_VERTEX = /* glsl */`
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vSize;
void main() {
  #ifdef USE_INSTANCING
    mat4 m = modelMatrix * instanceMatrix;
  #else
    mat4 m = modelMatrix;
  #endif
  vec4 world = m * vec4(position, 1.);
  vWorld = world.xyz;
  vNormal = normalize(mat3(m) * normal);
  vLocal = position;
  vSize = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const FLAT_VERTEX = /* glsl */`
varying vec2 vUv; varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

/* ---------- Helpers ---------- */
function paint(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}
// Words drawn once into a texture, so labels in the world cost one draw call.
function textAtlas(items) {
  const width = 512, height = 128, row = 64, pad = 10;
  const rects = {};
  const texture = paint(width, height, ctx => {
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    let x = 0, y = 0;
    for (const item of items) {
      ctx.font = item.font;
      const w = Math.ceil(ctx.measureText(item.text).width) + pad * 2;
      if (x + w > width) { x = 0; y += row; }
      ctx.fillText(item.text, x + pad, y + row / 2 + 2);
      rects[item.key] = { u: x / width, v: 1 - (y + row) / height, w: w / width, h: row / height, aspect: w / row };
      x += w;
    }
  });
  return { texture, rects };
}
function glowTexture() {
  return paint(128, 128, (ctx, w) => {
    const gradient = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(.22, 'rgba(255,255,255,.42)');
    gradient.addColorStop(.55, 'rgba(255,255,255,.08)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, w);
  });
}
// Several small shapes as one geometry: [geometry, x, y, z, turn].
function merge(parts) {
  const positions = [], normals = [];
  const m = new THREE.Matrix4();
  for (const [shape, x, y, z, turn = 0] of parts) {
    const g = shape.index ? shape.toNonIndexed() : shape.clone();
    g.applyMatrix4(m.makeRotationY(turn).setPosition(x, y, z));
    positions.push(g.attributes.position.array);
    normals.push(g.attributes.normal.array);
  }
  const join = arrays => {
    const out = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
    let offset = 0;
    for (const a of arrays) { out.set(a, offset); offset += a.length; }
    return out;
  };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(join(positions), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(join(normals), 3));
  return geometry;
}
// Scroll position to distance along the route: smooth through every key, so speed never jumps.
function monotone(xs, ys) {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (!d[i]) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return x => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1] + (x - xs[n - 1]) * m[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

async function start() {
  THREE.ColorManagement.enabled = false; // colors are written exactly as the CSS hex values
  const lite = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  const random = seeded(1913);

  const canvas = document.createElement('canvas');
  canvas.className = 'journey-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true, stencil: false });
  } catch (error) {
    canvas.remove();
    throw error;
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, .5, 480);
  scene.add(camera);
  const shared = { uTime: { value: 0 }, uScale: { value: 800 } };
  const colors = {}; // one THREE.Color per palette key, shared by every material that uses it
  for (const [key, value] of Object.entries(PALETTES[themeName()])) colors[key] = new THREE.Color(value);
  const air = {
    uSkyTop: { value: colors.skyTop }, uSkyHorizon: { value: colors.skyHorizon }, uSkyGlow: { value: colors.skyGlow }, uBg: { value: colors.bg },
    uFog: { value: WEATHER[themeName()].fog }, uNight: { value: WEATHER[themeName()].night },
    uVeil: { value: new THREE.Vector4(0, 1, 0, 1) }, uVeilAmount: { value: new THREE.Vector2() }
  };
  const veilStrength = { value: WEATHER[themeName()].veil };
  const glowing = []; // materials that add light at night and lay ink by day
  const glowBlend = material => {
    material.blending = themeName() === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
    glowing.push(material);
    return material;
  };
  const glowMap = glowTexture();
  const redraws = []; // textures painted in theme colors, repainted when the theme changes

  /* ---------- The route ---------- */
  const curve = new THREE.CatmullRomCurve3(ROUTE.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
  curve.arcLengthDivisions = 4000;
  const LENGTH = curve.getLength();
  const STEP = .5;
  const lut = [];
  for (let s = 0; s <= LENGTH + STEP; s += STEP) lut.push(curve.getPointAt(Math.min(1, s / LENGTH)));
  const pointAt = (s, target = new THREE.Vector3()) => {
    const f = clamp(s, 0, LENGTH) / STEP, i = Math.min(lut.length - 2, Math.floor(f));
    return target.copy(lut[i]).lerp(lut[i + 1], f - i);
  };
  const nearestS = ([x, y, z]) => {
    let best = 0, closest = Infinity;
    lut.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2;
      if (d < closest) { closest = d; best = i * STEP; }
    });
    return best;
  };
  const ahead = new THREE.Vector3();
  const pose = (s, target) => {
    pointAt(s, target.position);
    target.lookAt(pointAt(s + LOOK, ahead));
    target.updateMatrixWorld();
    return target;
  };

  /* ---------- Shared materials ---------- */
  const propMaterial = color => new THREE.ShaderMaterial({
    uniforms: { ...air, uColor: { value: color } },
    vertexShader: BOX_VERTEX,
    fragmentShader: AIR + /* glsl */`
      uniform vec3 uColor; uniform float uNight;
      varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vSize;
      void main() {
        vec3 col = uColor * (.5 + .5 * max(vNormal.y, 0.) + .15 * abs(vNormal.x));
        gl_FragColor = vec4(fogged(col * mix(1., .65, uNight), vWorld), 1.);
      }`
  });
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const addBox = (material, [x, y, z], [w, h, d], parent = scene) => {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  };
  const addPlane = (material, [x, y, z], [w, h], turn = 0, parent = scene) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = turn;
    parent.add(mesh);
    return mesh;
  };
  // Soft points of light; `night` ones only shine in the navy theme, `blink` ones flash like beacons.
  function glowPoints(positions, color, size, { night = false, blink = false, parent = scene } = {}) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(positions.length / 3).map(() => random()), 1));
    const points = new THREE.Points(geometry, glowBlend(new THREE.ShaderMaterial({
      uniforms: { ...shared, uColor: { value: color }, uSize: { value: size }, uNight: air.uNight, uVeil: air.uVeil, uVeilAmount: air.uVeilAmount, uOnlyNight: { value: night ? 1 : 0 }, uBlink: { value: blink ? 1 : 0 }, uOn: { value: 1 } },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute float aPhase;
        uniform float uScale, uSize, uTime, uNight, uOnlyNight, uBlink, uOn;
        uniform vec3 uColor;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(uSize * uScale / -mv.z, 72.);
          float shine = mix(1., uNight, uOnlyNight) * mix(1., step(.55, fract(uTime * .6 + aPhase)), uBlink);
          vAlpha = shine * uOn * smoothstep(.6, 2.5, -mv.z);
          vColor = uColor;
        }`,
      fragmentShader: VEIL + /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - .5);
          float core = exp(-d * d * 90.);
          float a = (exp(-d * d * 18.) * .7 + core) * vAlpha * (1. - veil());
          if (a < .01) discard;
          gl_FragColor = vec4(vColor * (1. + core * .6), min(a, 1.));
        }`
    })));
    points.frustumCulled = false;
    parent.add(points);
    return points;
  }

  /* ---------- The city ----------
     Blocks along the route are cut into lots; each lot gets a building whose height follows two clusters,
     downtown by the water and midtown near the end. Tall ones step back as they rise. */
  const boxes = []; // [x0, x1, y0, y1, z0, z1, seed, lit, tone, glass]
  const towers = []; // water towers on low roofs: [x, y, z, size]
  const antennas = []; // red lights on the tallest roofs
  const building = (x0, x1, y0, y1, z0, z1, info) => boxes.push([x0, x1, y0, y1, z0, z1, ...info]);
  const reserved = [...LANDMARKS.map(lot => lot.slice(0, 4)), TOWER, SITE];
  const isReserved = (x0, x1, z0, z1) => reserved.some(([a0, a1, b0, b1]) => x0 < a1 && x1 > a0 && z0 < b1 && z1 > b0);
  const routeMarks = lut.filter((_, i) => i % 8 === 0);
  const nearRoute = (x, z, r) => routeMarks.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r);
  const floorsAt = (x, z) => 6 + 20 * Math.exp(-((z + 100) ** 2) / 9000 - ((x - 10) ** 2) / 14000) + 30 * Math.exp(-((z + 330) ** 2) / 9000 - ((x - 100) ** 2) / 9000);
  function lot(x0, x1, z0, z1) {
    if (isReserved(x0, x1, z0, z1)) return;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    let floors = floorsAt(cx, cz) * (.45 + random() * .95);
    if (random() < .05) floors *= 1.7;
    floors = Math.max(3, Math.round(floors));
    const h = floors * FLOOR;
    const glass = floors > 18 && random() < .22 ? 1 : 0;
    const info = [random(), .18 + random() * .4, random() < .3 ? .7 + random() * .3 : random() * .35, glass];
    if (floors > 22 && random() < .6) {
      const h1 = h * (.42 + random() * .16), h2 = h * (.7 + random() * .1);
      const i1 = Math.min(x1 - x0, z1 - z0) * .14, i2 = i1 * 2.2;
      building(x0, x1, 0, h1, z0, z1, info);
      building(x0 + i1, x1 - i1, h1, h2, z0 + i1, z1 - i1, info);
      building(x0 + i2, x1 - i2, h2, h, z0 + i2, z1 - i2, info);
      if (floors > 38 && random() < .5) {
        building(cx - .15, cx + .15, h, h + 7, cz - .15, cz + .15, [0, 0, 0, 0]);
        antennas.push(cx, h + 7.2, cz);
      }
    } else {
      building(x0, x1, 0, h, z0, z1, info);
      if (floors < 18 && random() < .32) towers.push([x0 + (x1 - x0) * (.3 + random() * .4), h, z0 + (z1 - z0) * (.3 + random() * .4), .8 + random() * .45]);
    }
  }
  for (let k = 0; k < AVENUES.length - 1; k++) {
    for (let j = 0; j <= ROWS; j++) {
      const x0 = AVENUES[k] + AVE_LINE;
      // North of the last street the avenue at x = 60 is gone, so the blocks either side of it join up.
      const x1 = j >= END_STREET && AVENUES[k + 1] === 60 ? 60 + AVE_LINE : AVENUES[k + 1] - AVE_LINE;
      const z1 = -ST * j - ST_LINE, z0 = -ST * (j + 1) + ST_LINE;
      if (!nearRoute((x0 + x1) / 2, (z0 + z1) / 2, 160)) continue;
      const mid = (z0 + z1) / 2, kept = [boxes.length, towers.length, antennas.length];
      for (const [a, b] of [[z0, mid], [mid, z1]]) {
        let x = x0;
        while (x < x1 - 1.5) {
          const w = Math.min(x1 - x, 5 + random() * 7);
          lot(x, x + w, a, b);
          x += w;
        }
      }
      // Phones draw fewer blocks, but every block is still rolled, so the skyline (and every sightline to a
      // stop) is the same city as on a wide screen.
      if (lite && !nearRoute((x0 + x1) / 2, (z0 + z1) / 2, 110)) [boxes.length, towers.length, antennas.length] = kept;
    }
  }
  LANDMARKS.forEach(([x0, x1, z0, z1, floors, glass, tone], i) => building(x0, x1, 0, floors * FLOOR, z0, z1, [.37 + i * .07, .38, tone, glass]));
  // The deco tower: three stages of stone; its crown and spire light up with the hero.
  building(19, 33, 0, 40, -19.5, -6.5, [.11, .5, 1, 0]);
  building(20.5, 31.5, 40, 52, -18, -8, [.13, .5, 1, 0]);
  building(22, 30, 52, 60, -16.5, -9.5, [.17, .55, 1, 0]);
  // The site's finished lower floors, in glass.
  building(51.8, 85.2, 0, 19.6, -503.2, -476.3, [.5, .45, .2, 1]);

  const buildingVertex = /* glsl */`
    attribute vec4 aInfo;
    varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vSize; varying vec4 vInfo;
    void main() {
      mat4 m = modelMatrix * instanceMatrix;
      vec4 world = m * vec4(position, 1.);
      vWorld = world.xyz;
      vNormal = normal;
      vLocal = position;
      vSize = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
      vInfo = aInfo;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`;
  const buildingMaterial = new THREE.ShaderMaterial({
    uniforms: {
      ...air, ...shared, uFacade: { value: colors.facade }, uFacadeAlt: { value: colors.facadeAlt }, uRoof: { value: colors.roof },
      uEdge: { value: colors.edge }, uGlass: { value: colors.glass }, uWarm: { value: colors.warm }, uCool: { value: colors.cool }
    },
    vertexShader: buildingVertex,
    fragmentShader: AIR + HASH + /* glsl */`
      uniform vec3 uFacade, uFacadeAlt, uRoof, uEdge, uGlass, uWarm, uCool;
      uniform float uNight;
      varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vSize; varying vec4 vInfo;
      void main() {
        bool sideX = abs(vNormal.x) > .5;
        float u = sideX ? vWorld.z : vWorld.x;
        float glass = vInfo.w;
        vec2 size = mix(vec2(1.45, 2.), vec2(1.05, 2.), glass);
        vec2 cell = vec2(u, vWorld.y) / size;
        vec2 fw = max(fwidth(cell), vec2(1e-4));
        vec3 e = (.5 - abs(vLocal)) * vSize;
        vec3 col;
        if (vNormal.y > .5) {
          col = mix(uRoof, uEdge, (1. - smoothstep(0., .35, min(e.x, e.z))) * .55);
        } else if (vNormal.y < -.5) {
          col = uRoof;
        } else {
          vec2 id = floor(cell), f = fract(cell);
          vec2 lo = mix(vec2(.2, .24), vec2(.07, .09), glass), hi = 1. - lo;
          vec2 inside = smoothstep(lo - fw, lo + fw, f) * (1. - smoothstep(hi - fw, hi + fw, f));
          float win = inside.x * inside.y;
          // one roll per window decides whether it is lit, its color, brightness and glass; one per storey
          float r = hash(id + vInfo.x * 37.);
          float storey = hash(vec2(id.y, vInfo.x * 11.));
          float lit = step(r * .65 + storey * .35, vInfo.y) * uNight;
          vec3 light = mix(uWarm, uCool, step(.64, fract(r * 13.7))) * (.5 + .5 * fract(r * 7.31));
          vec3 pane = uGlass * (.72 + .28 * fract(r * 3.17));
          vec3 facade = mix(uFacade, uFacadeAlt, vInfo.z);
          col = mix(facade, mix(pane, light, lit), win);
          // shopfronts along the street
          if (vWorld.y < 2.4) {
            float bay = fract(u / 3.2);
            float open = step(.3, hash(vec2(floor(u / 3.2), vInfo.x * 5.)));
            float front = step(.25, vWorld.y) * step(.08, bay) * step(bay, .92);
            col = mix(col, mix(pane, uWarm * .85, uNight * open), front);
          }
          // up close, windows and shopfronts settle toward the wall, so near facades frame the view instead of glaring
          col = mix(col, facade, (1. - smoothstep(14., 64., length(vWorld - cameraPosition))) * .6);
          // far off, the window grid melts into its average instead of shimmering
          float far = smoothstep(.4, 1., max(fw.x, fw.y));
          col = mix(col, mix(facade, mix(pane, uWarm * .7, vInfo.y * uNight), .4), far);
          // corners and cornices: a little light on navy, ink on paper
          float corner = 1. - smoothstep(0., .12 + fw.x * size.x * 1.5, sideX ? e.z : e.x);
          float cornice = 1. - smoothstep(0., .2 + fw.y * size.y, e.y);
          col = mix(col, uEdge, max(corner * .75, cornice * .5));
        }
        gl_FragColor = vec4(fogged(col, vWorld), 1.);
      }`
  });
  // The city's depth is laid down first, so the window shader only runs once per pixel instead of once for
  // every building stacked behind it. Pushed a hair back, so the real pass always wins on the same surface.
  const depthOnly = new THREE.ShaderMaterial({
    vertexShader: buildingVertex, fragmentShader: 'void main() {}',
    colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2
  });
  // The city is drawn in slices along the route, so slices out of view are skipped.
  const slices = new Map();
  for (const b of boxes) {
    const key = Math.floor(-(b[4] + b[5]) / 2 / 110);
    if (!slices.has(key)) slices.set(key, []);
    slices.get(key).push(b);
  }
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), at = new THREE.Vector3(), size = new THREE.Vector3();
    for (const list of slices.values()) {
      const geometry = unitBox.clone();
      const info = new Float32Array(list.length * 4);
      geometry.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
      const mesh = new THREE.InstancedMesh(geometry, buildingMaterial, list.length);
      list.forEach(([x0, x1, y0, y1, z0, z1, a, b, c, d], i) => {
        mesh.setMatrixAt(i, m.compose(at.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), q, size.set(x1 - x0, y1 - y0, z1 - z0)));
        info.set([a, b, c, d], i * 4);
      });
      mesh.computeBoundingSphere();
      scene.add(mesh);
      const early = new THREE.InstancedMesh(geometry, depthOnly, list.length);
      early.instanceMatrix = mesh.instanceMatrix;
      early.boundingSphere = mesh.boundingSphere;
      early.renderOrder = -1;
      scene.add(early);
    }
  }

  /* ---------- Streets, the harbor and the sky ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(440, 860).rotateX(-Math.PI / 2).translate(30, 0, -230), new THREE.ShaderMaterial({
    uniforms: {
      ...air, ...shared, uAsphalt: { value: colors.asphalt }, uWalk: { value: colors.walk }, uMarking: { value: colors.marking },
      uWater: { value: colors.water }, uLamp: { value: colors.lamp }, uWarm: { value: colors.warm }, uCool: { value: colors.cool }
    },
    vertexShader: /* glsl */`varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: AIR + HASH + /* glsl */`
      uniform vec3 uAsphalt, uWalk, uMarking, uWater, uLamp, uWarm, uCool;
      uniform float uNight, uTime;
      varying vec3 vWorld;
      // A lamp's pool of light, stretched toward the eye like a reflection on a wet street.
      float pool(vec2 p, vec2 lamp, vec2 view) {
        vec2 d = p - lamp;
        float along = dot(d, view), across = d.x * view.y - d.y * view.x;
        return exp(-dot(d, d) * .08) * .6 + exp(-(across * across * 1.4 + along * along * .02)) * .3;
      }
      void main() {
        vec2 p = vWorld.xz;
        vec2 view = normalize(cameraPosition.xz - p + vec2(1e-4));
        vec3 col;
        if (p.y > 7.5) {
          // the harbor: dark water with the skyline's lights smeared across it
          float t = uTime;
          float ripple = sin(p.x * .4 + t * .5) * sin(p.y * 1.6 - t * .8) * .5 + sin(p.x * 1.3 - t * .6 + p.y * .2) * sin(p.y * 3.1 + t * 1.2) * .5;
          float column = step(.58, hash(vec2(floor(p.x / 2.4), 3.)));
          float glint = pow(max(ripple, 0.), 5.) * column * exp(-(p.y - 7.5) * .02);
          col = uWater * (1. + ripple * .06) + mix(uWarm, uCool, hash(vec2(floor(p.x / 2.4), 9.))) * glint * uNight * 1.4;
        } else {
          float ax = floor(p.x / 60. + .5) * 60.;
          float dx = p.x - ax;
          float sz = floor(p.y / 26. + .5) * 26.;
          float dz = p.y - sz;
          float ends = step(59., ax) * step(ax, 61.) * step(p.y, -474.5); // the last avenue stops at the site
          float onAve = step(abs(dx), 6.) * (1. - ends);
          float onSt = step(abs(dz), 4.);
          float road = max(onAve, onSt);
          vec2 slab = fract(p / 1.6);
          float seam = (1. - road) * max(step(slab.x, .035), step(slab.y, .035));
          col = mix(uWalk, uAsphalt, road) * (1. - seam * .12);
          // lane dashes mid-block, zebra crossings at the corners
          float lane = onAve * (1. - onSt) * step(6.5, abs(dz)) * (1. - smoothstep(.06, .1, abs(abs(dx) - 3.))) * step(.45, fract(p.y / 3.2));
          float crossAve = onAve * step(4.4, abs(dz)) * step(abs(dz), 6.3) * step(.5, fract(dx / .9));
          float crossSt = onSt * (1. - ends) * step(6.4, abs(dx)) * step(abs(dx), 8.6) * step(.5, fract(dz / .9));
          col = mix(col, uMarking, max(lane, max(crossAve, crossSt)) * .8);
          // street lamps every 15 along each sidewalk, clear of the corners (the same spots the lamps stand on)
          if (uNight > 0.) {
            float lz = floor((p.y - 7.5) / 15. + .5) * 15. + 7.5;
            float aveLamp = step(7., abs(lz - floor(lz / 26. + .5) * 26.)) * (1. - ends);
            float lx = floor((p.x - 7.5) / 15. + .5) * 15. + 7.5;
            float stLamp = step(10., abs(lx - floor(lx / 60. + .5) * 60.));
            float glow = (pool(p, vec2(ax - 7.25, lz), view) + pool(p, vec2(ax + 7.25, lz), view)) * aveLamp
                       + (pool(p, vec2(lx, sz - 5.3), view) + pool(p, vec2(lx, sz + 5.3), view)) * stLamp;
            col += uLamp * glow * uNight * .5;
          }
        }
        gl_FragColor = vec4(fogged(col, vWorld), 1.);
      }`
  }));
  scene.add(ground);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    uniforms: { ...air }, side: THREE.BackSide, depthWrite: false,
    vertexShader: /* glsl */`varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = vec4(p.xy, p.w * .99999, p.w); }`,
    fragmentShader: AIR + /* glsl */`varying vec3 vDir; void main() { gl_FragColor = vec4(mix(skyColor(normalize(vDir)), uBg, veil()), 1.); }`
  }));
  sky.frustumCulled = false;
  sky.renderOrder = 10; // after the buildings, so it only fills what they leave open
  scene.add(sky);

  /* ---------- Street life: lamps, water towers, steam and red lights on the roofs ---------- */
  function buildStreets() {
    const spots = []; // [x, z, turn]
    const avenue = (ax, z0, z1) => {
      for (let z = Math.ceil((z0 - 7.5) / 15) * 15 + 7.5; z <= z1; z += 15) {
        if (Math.abs(z - Math.round(z / ST) * ST) <= 7) continue;
        spots.push([ax - 7.25, z, 0], [ax + 7.25, z, Math.PI]);
      }
    };
    const street = (sz, x0, x1) => {
      for (let x = Math.ceil((x0 - 7.5) / 15) * 15 + 7.5; x <= x1; x += 15) {
        if (Math.abs(x - Math.round(x / 60) * 60) <= 10) continue;
        spots.push([x, sz - 5.3, -Math.PI / 2], [x, sz + 5.3, Math.PI / 2]);
      }
    };
    avenue(0, -205, 4);
    avenue(60, -470, -212);
    street(0, -70, 70);
    street(-208, 8, 52);
    // No lamp between a street-level stop and its piece, where it would stand in front of it.
    const blocking = ([x, z]) => Object.values(STOPS).some(({ hold: [hx, hy, hz], subject: [sx, , sz] }) =>
      hy < 6 && x > Math.min(hx, sx) - 3 && x < Math.max(hx, sx) + 3 && z > Math.min(hz, sz) - 3 && z < Math.max(hz, sz) + 3);
    const standing = spots.filter(spot => !blocking(spot));
    const lampGeometry = merge([[new THREE.BoxGeometry(.16, 5.8, .16), 0, 2.9, 0], [new THREE.BoxGeometry(1.3, .09, .09), .65, 5.75, 0], [new THREE.BoxGeometry(.46, .14, .26), 1.3, 5.66, 0]]);
    const lamps = new THREE.InstancedMesh(lampGeometry, propMaterial(colors.metal), standing.length);
    const m = new THREE.Matrix4(), heads = [];
    standing.forEach(([x, z, turn], i) => {
      lamps.setMatrixAt(i, m.makeRotationY(turn).setPosition(x, 0, z));
      heads.push(x + Math.cos(turn) * 1.3, 5.52, z - Math.sin(turn) * 1.3);
    });
    lamps.computeBoundingSphere();
    scene.add(lamps);
    glowPoints(heads, colors.lamp, 1.6, { night: true });

    const tankGeometry = merge([
      [new THREE.CylinderGeometry(1, 1, 2.2, 10), 0, 2.7, 0], [new THREE.ConeGeometry(1.1, .9, 10), 0, 4.25, 0],
      ...[[-.62, -.62], [.62, -.62], [-.62, .62], [.62, .62]].map(([x, z]) => [new THREE.BoxGeometry(.12, 1.6, .12), x, .8, z])
    ]);
    const tanks = new THREE.InstancedMesh(tankGeometry, propMaterial(colors.wood), towers.length);
    towers.forEach(([x, y, z, size], i) => tanks.setMatrixAt(i, m.makeScale(size, size, size).setPosition(x, y, z)));
    tanks.computeBoundingSphere();
    scene.add(tanks);
    glowPoints(antennas, colors.tail, 1.1, { blink: true });

    // Steam stacks in the middle of the road, striped orange and white.
    const stacks = [[-.4, -46], [47, -209.6], [60.2, -304]];
    const stackMaterial = new THREE.ShaderMaterial({
      uniforms: { ...air, uA: { value: new THREE.Color('#f07a2a') }, uB: { value: new THREE.Color('#f4f1ea') } },
      vertexShader: BOX_VERTEX,
      fragmentShader: AIR + /* glsl */`
        uniform vec3 uA, uB; uniform float uNight;
        varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vSize;
        void main() { vec3 col = mix(uA, uB, step(.5, fract(vWorld.y / .5))) * mix(1., .6, uNight); gl_FragColor = vec4(fogged(col, vWorld), 1.); }`
    });
    const puffs = [], seeds = [];
    for (const [x, z] of stacks) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, 2.4, 14), stackMaterial);
      stack.position.set(x, 1.2, z);
      scene.add(stack);
      for (let i = 0; i < (lite ? 8 : 16); i++) { puffs.push(x, 2.4, z); seeds.push(random()); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(puffs, 3));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    const steam = new THREE.Points(geometry, new THREE.ShaderMaterial({
      uniforms: { ...shared, uColor: { value: colors.steam }, uVeil: air.uVeil, uVeilAmount: air.uVeilAmount },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute float aSeed;
        uniform float uTime, uScale;
        varying float vAlpha;
        void main() {
          float t = fract(uTime * .11 + aSeed);
          vec3 p = position + vec3(sin(aSeed * 40. + uTime * .6) * .4 * t + t * t * 2.2, t * 10., cos(aSeed * 30. + uTime * .5) * .4 * t);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min((1.1 + t * 5.5) * uScale / -mv.z, 180.);
          vAlpha = (1. - t) * smoothstep(0., .12, t) * .3 * smoothstep(1.5, 5., -mv.z);
        }`,
      fragmentShader: VEIL + /* glsl */`
        uniform vec3 uColor; varying float vAlpha;
        void main() { float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .05, d) * vAlpha * (1. - veil()); if (a < .004) discard; gl_FragColor = vec4(uColor, a); }`
    }));
    steam.frustumCulled = false;
    scene.add(steam);
  }

  /* ---------- Traffic: cabs and cars along the route, tail lights going your way, headlights coming back ---------- */
  function buildTraffic(count) {
    const start = nearestS([0, EYE, -6]), end = nearestS([60, EYE, -420]);
    const geometry = merge([[new THREE.BoxGeometry(1.25, .55, 3.1), 0, .45, 0], [new THREE.BoxGeometry(1.05, .45, 1.55), 0, .95, -.1]]);
    const tints = new Float32Array(count * 3);
    const paints = [colors.taxi, colors.taxi, new THREE.Color('#1c2333'), new THREE.Color('#2b3346'), new THREE.Color('#3d4458'), new THREE.Color('#c9ced8')];
    for (let i = 0; i < count; i++) paints[Math.floor(random() * paints.length)].toArray(tints, i * 3);
    geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));
    const cars = new THREE.InstancedMesh(geometry, new THREE.ShaderMaterial({
      uniforms: { ...air, uGlass: { value: colors.glass } },
      vertexShader: /* glsl */`
        attribute vec3 aTint;
        varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vTint;
        void main() {
          mat4 m = modelMatrix * instanceMatrix;
          vec4 w = m * vec4(position, 1.);
          vWorld = w.xyz; vNormal = normalize(mat3(m) * normal); vLocal = position; vTint = aTint;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: AIR + /* glsl */`
        uniform vec3 uGlass; uniform float uNight;
        varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vTint;
        void main() {
          vec3 col = vTint * (.45 + .55 * max(vNormal.y, 0.) + .12 * abs(vNormal.x));
          col = mix(col, uGlass * .8, step(.72, vLocal.y) * (1. - step(.5, vNormal.y)));
          gl_FragColor = vec4(fogged(col * mix(1., .55, uNight), vWorld), 1.);
        }`
    }), count);
    cars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cars.frustumCulled = false;
    scene.add(cars);
    const lights = new Float32Array(count * 6);
    const tones = new Float32Array(count * 6);
    const lightGeometry = new THREE.BufferGeometry();
    lightGeometry.setAttribute('position', new THREE.BufferAttribute(lights, 3).setUsage(THREE.DynamicDrawUsage));
    lightGeometry.setAttribute('aTone', new THREE.BufferAttribute(tones, 3));
    const lamps = new THREE.Points(lightGeometry, glowBlend(new THREE.ShaderMaterial({
      uniforms: { ...shared, uNight: air.uNight, uVeil: air.uVeil, uVeilAmount: air.uVeilAmount },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute vec3 aTone;
        uniform float uScale, uNight;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(mix(.45, .9, uNight) * uScale / -mv.z, 40.);
          vColor = aTone; vAlpha = mix(.75, 1., uNight) * smoothstep(1., 3., -mv.z);
        }`,
      fragmentShader: VEIL + /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() { float d = length(gl_PointCoord - .5); float core = exp(-d * d * 80.); float a = (exp(-d * d * 16.) * .6 + core) * vAlpha * (1. - veil()); if (a < .01) discard; gl_FragColor = vec4(vColor * (1. + core * .5), min(a, 1.)); }`
    })));
    lamps.frustumCulled = false;
    scene.add(lamps);
    const fleet = Array.from({ length: count }, (_, i) => {
      const dir = i % 3 === 2 ? -1 : 1;
      return { s: start + random() * (end - start), dir, lane: dir * (random() < .5 ? 2 : 4.6), speed: 4 + random() * 4 };
    });
    fleet.forEach((car, i) => {
      const tone = car.dir > 0 ? colors.tail : colors.head;
      tone.toArray(tones, i * 6);
      tone.toArray(tones, i * 6 + 3);
    });
    const at = new THREE.Vector3(), next = new THREE.Vector3(), forward = new THREE.Vector3(), right = new THREE.Vector3();
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    return (dt, camS) => {
      fleet.forEach((car, i) => {
        car.s += car.dir * car.speed * dt;
        if (car.s < camS - 25 || car.s > camS + 170 || car.s < start || car.s > end) car.s = clamp(camS + 40 + random() * 130, start, end);
        pointAt(car.s, at);
        pointAt(car.s + 1, next);
        forward.subVectors(next, at).setY(0).normalize();
        right.set(-forward.z, 0, forward.x);
        const across = car.lane * (Math.abs(forward.x) > Math.abs(forward.z) ? .62 : 1);
        at.addScaledVector(right, across).setY(0);
        forward.multiplyScalar(car.dir);
        q.setFromAxisAngle(up, Math.atan2(forward.x, forward.z));
        cars.setMatrixAt(i, m.compose(at, q, one));
        const back = car.dir > 0 ? -1.58 : 1.58;
        for (let k = 0; k < 2; k++) {
          const sideways = k ? .45 : -.45;
          lights[i * 6 + k * 3] = at.x + forward.x * back + right.x * sideways;
          lights[i * 6 + k * 3 + 1] = .55;
          lights[i * 6 + k * 3 + 2] = at.z + forward.z * back + right.z * sideways;
        }
      });
      cars.instanceMatrix.needsUpdate = true;
      lightGeometry.attributes.position.needsUpdate = true;
    };
  }

  /* ---------- Stops ----------
     Each stop is built where it stands in the city. While the camera holds at a stop it turns to face it,
     so the piece lands beside the text (or above it on a phone). */
  const stations = [];
  const elements = Object.fromEntries([...document.querySelectorAll('[data-station]')].map(el => [el.dataset.station, el]));
  function station(name) {
    const stop = STOPS[name], el = elements[name];
    const group = new THREE.Group();
    scene.add(group);
    const item = { name, el, stop, s: nearestS(stop.hold), subject: new THREE.Vector3(...stop.subject), group, reveal: { value: 0 }, revealed: false, progress: 0, aim: { yaw: 0, pitch: 0 }, update: () => {} };
    const holds = el.offsetHeight > innerHeight * 1.5 || name === 'core';
    item.trigger = ScrollTrigger.create(holds ? { trigger: el, start: 'top top', end: 'bottom bottom' } : { trigger: el, start: 'top bottom', end: 'bottom top' });
    stations.push(item);
    return item;
  }
  const poser = new THREE.PerspectiveCamera(55, 1, .5, 10);
  const local = new THREE.Vector3();
  let crowd = 0; // how much further right the text column reaches than on a 16:9 laptop, as a share of half the screen
  function aimAt(item) {
    pose(item.s, poser);
    local.copy(item.subject).applyMatrix4(poser.matrixWorldInverse);
    const [nx, ny] = camera.aspect >= 1 ? [item.stop.desk[0] + crowd * .6, item.stop.desk[1]] : item.stop.phone;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), tanH = tanV * camera.aspect;
    item.aim.yaw = Math.atan2(local.x, -local.z) - Math.atan(nx * tanH);
    item.aim.pitch = Math.atan2(local.y, Math.hypot(local.x, local.z)) - Math.atan(ny * tanV);
  }

  /* The deco tower: a crown of light that climbs and breathes, two searchlights sweeping the sky, a beacon. */
  function buildCore(item) {
    const crown = new THREE.ShaderMaterial({
      uniforms: { ...air, ...shared, uStone: { value: colors.stone }, uAccent: { value: colors.accent }, uHot: { value: colors.hot }, uReveal: item.reveal },
      vertexShader: BOX_VERTEX,
      fragmentShader: AIR + /* glsl */`
        uniform vec3 uStone, uAccent, uHot; uniform float uTime, uNight, uReveal;
        varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vSize;
        void main() {
          vec3 e = (.5 - abs(vLocal)) * vSize;
          bool side = abs(vNormal.y) < .5;
          bool alongX = abs(vNormal.x) > .5;
          float across = alongX ? vLocal.z * vSize.z : vLocal.x * vSize.x;
          float d = side ? min(alongX ? e.z : e.x, e.y) : min(e.x, e.z);
          float edge = 1. - smoothstep(0., .18, d);
          float wave = .55 + .45 * sin(vWorld.y * 1.3 - uTime * 1.5);
          float slot = side ? step(.62, abs(fract(across / 1.2) - .5) * 2.) * step(.35, e.y) : 0.;
          vec3 col = uStone * mix(1., .4, uNight);
          col = mix(col, uAccent, slot * (.35 + .65 * wave) * uReveal);
          col = mix(col, uHot, edge * (.55 + .45 * wave) * uReveal);
          gl_FragColor = vec4(fogged(col, vWorld), 1.);
        }`
    });
    [[8.8, 7.2, 61.3], [6.4, 5.2, 63.9], [4.2, 3.4, 66.5]].forEach(([w, d, y]) => addBox(crown, [26, y, -13], [w, 2.6, d], item.group));
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.1, 14, 8), crown);
    spire.position.set(26, 74.8, -13);
    item.group.add(spire);

    const beamGeometry = new THREE.ConeGeometry(6, 150, 28, 1, true).translate(0, -75, 0).rotateX(Math.PI);
    const beamMaterial = glowBlend(new THREE.ShaderMaterial({
      uniforms: { uColor: { value: colors.beam }, uNight: air.uNight, uVeil: air.uVeil, uVeilAmount: air.uVeilAmount, uReveal: item.reveal },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        varying float vY; varying vec3 vN; varying vec3 vV;
        void main() { vY = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: VEIL + /* glsl */`
        uniform vec3 uColor; uniform float uNight, uReveal;
        varying float vY; varying vec3 vN; varying vec3 vV;
        void main() { float a = smoothstep(0., 10., vY) * exp(-vY / 70.) * pow(abs(dot(vN, vV)), 2.) * .36 * uNight * uReveal * (1. - veil()); gl_FragColor = vec4(uColor, a); }`
    }));
    const beams = [0, Math.PI].map(phase => {
      const pivot = new THREE.Group();
      pivot.position.set(26, 67.5, -13);
      pivot.add(new THREE.Mesh(beamGeometry, beamMaterial));
      item.group.add(pivot);
      return { pivot, phase };
    });
    glowPoints([26, 82.2, -13], colors.tail, 2.2, { blink: true, parent: item.group });
    return () => {
      const t = shared.uTime.value;
      beams.forEach(({ pivot, phase }) => {
        pivot.rotation.set(0, 0, 0);
        pivot.rotateY(t * .22 + phase);
        pivot.rotateZ(.32 + .1 * Math.sin(t * .4 + phase));
      });
    };
  }

  /* Flow Auto: a wall of screens. Each comes on as its step lights up; the big one cycles the app's screens. */
  function buildScreens(item, shots, tags) {
    const wall = [[9.8, 3.4, 6.8, 4.25, 1], [17.2, 3.4, 7.2, 4.5, 3], [9.8, 19, 7, 4.375, 2], [17.4, 19, 7, 4.375, 0], [9.8, 8.6, 14.6, 9.125, -1]];
    const count = wall.length;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const cells = new Float32Array(count), sizes = new Float32Array(count * 2), numbers = new Float32Array(count * 4), states = new Float32Array(count * 2);
    geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
    geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 2));
    geometry.setAttribute('aNum', new THREE.InstancedBufferAttribute(numbers, 4));
    geometry.setAttribute('aState', new THREE.InstancedBufferAttribute(states, 2));
    const screens = new THREE.InstancedMesh(geometry, new THREE.ShaderMaterial({
      uniforms: {
        ...air, ...shared, uShots: { value: shots }, uTags: { value: tags.texture }, uBezel: { value: colors.bezel },
        uStandby: { value: colors.standby }, uAccent: { value: colors.accent }, uHot: { value: colors.hot }, uReveal: item.reveal
      },
      vertexShader: /* glsl */`
        attribute float aCell; attribute vec2 aSize; attribute vec4 aNum; attribute vec2 aState;
        varying vec2 vUv; varying float vCell; varying vec2 vSize; varying vec4 vNum; varying vec2 vState; varying vec3 vWorld;
        void main() {
          vUv = uv; vCell = aCell; vSize = aSize; vNum = aNum; vState = aState;
          vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: AIR + /* glsl */`
        uniform sampler2D uShots, uTags; uniform vec3 uBezel, uStandby, uAccent, uHot; uniform float uTime, uReveal;
        varying vec2 vUv; varying float vCell; varying vec2 vSize; varying vec4 vNum; varying vec2 vState; varying vec3 vWorld;
        void main() {
          vec2 px = vUv * vSize;
          float bezel = 1. - step(.12, px.x) * step(px.x, vSize.x - .12) * step(.12, px.y) * step(px.y, vSize.y - .12);
          float index = vCell < 0. ? mod(floor(uTime / 4.), 4.) : vCell;
          float col = mod(index, 2.), row = floor(index / 2.);
          vec3 shot = texture2D(uShots, vec2((col + vUv.x) * .5, ((1. - row) + vUv.y) * .5)).rgb;
          float develop = vState.x, power = vState.y * uReveal;
          float scan = .5 + .5 * sin(px.y * 9. - uTime * 5.);
          vec3 standby = uStandby + uAccent * (.06 + .05 * scan) + uAccent * .35 * smoothstep(.985, 1., fract(vUv.y * 2. - uTime * .3));
          float shown = smoothstep(1. - develop - .015, 1. - develop + .015, vUv.y);
          float sweep = (1. - smoothstep(0., .02, abs(vUv.y - (1. - develop)))) * step(.01, develop) * step(develop, .99);
          vec3 color = mix(standby, shot * 1.08, shown) + uHot * sweep;
          vec2 tag = (px - vec2(.4, vSize.y - 1.2)) / vec2(.9, .8);
          if (tag.x > 0. && tag.x < 1. && tag.y > 0. && tag.y < 1. && vCell >= 0.) {
            float ink = texture2D(uTags, vNum.xy + tag * vNum.zw).a;
            color = mix(mix(color, uBezel, .7), uHot, ink);
          }
          color = mix(color * power, uBezel, bezel);
          gl_FragColor = vec4(fogged(color, vWorld), 1.);
        }`
    }), count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), at = new THREE.Vector3(), size = new THREE.Vector3();
    wall.forEach(([x, y, w, h, shot], i) => {
      screens.setMatrixAt(i, m.compose(at.set(x + w / 2, y + h / 2, -58.32), q, size.set(w, h, 1)));
      cells[i] = shot;
      sizes.set([w, h], i * 2);
      const rect = tags.rects[String(i + 1).padStart(2, '0')];
      numbers.set([rect.u, rect.v, rect.w, rect.h], i * 4);
    });
    screens.frustumCulled = false;
    item.group.add(screens);

    // A news strip along the top, and a blade sign on the corner.
    const strip = led(['FLOW AUTO', 'A PRODUCTION LINE FOR AI VIDEO', 'NUMBERED 1080P EXPORTS', '18 MCP TOOLS'], ' · ');
    const ticker = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 1.5), ledMaterial(strip, colors.hot, 14.6 / 1.5, item.reveal));
    ticker.position.set(17.1, 24.4, -58.32);
    item.group.add(ticker);
    const blade = paint(256, 1860, (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.font = `600 190px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      'FLOW AUTO'.split('').forEach((letter, i) => ctx.fillText(letter, w / 2, 140 + i * 200));
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, w - 28, h - 28);
    });
    const sign = new THREE.Mesh(unitBox, signMaterial(blade, colors.hot, colors.accent, item.reveal));
    sign.position.set(8, 15, -57.5);
    sign.scale.set(2.2, 16, .35);
    sign.rotation.y = -Math.PI / 4;
    item.group.add(sign);
    const glow = new THREE.Sprite(glowBlend(new THREE.SpriteMaterial({ map: glowMap, color: colors.accent, transparent: true, depthWrite: false, opacity: 0 })));
    glow.position.set(17, 13, -56);
    glow.scale.set(30, 26, 1);
    item.group.add(glow);

    let scroll = 0;
    return dt => {
      for (let i = 0; i < count; i++) {
        const order = wall[i][4] < 0 ? 4 : i;
        states[i * 2] = clamp(item.progress * 5.4 - order, 0, 1);
        states[i * 2 + 1] = clamp(item.progress * 5.4 - order + 1, .18, 1);
      }
      geometry.attributes.aState.needsUpdate = true;
      scroll += dt * .035;
      ticker.material.uniforms.uScroll.value = scroll % 1;
      glow.material.opacity = item.reveal.value * .22 * air.uNight.value;
    };
  }

  /* HealthNest: an LED ticker wrapping the corner with a heartbeat, and clinic windows filling in teal. */
  function buildTicker(item) {
    const text = led(['HEALTHNEST', 'PATIENT CASES', 'APPOINTMENTS', 'STATUS OVER TIME'], 'ecg');
    const y0 = 9.4, y1 = 10.8, west = 13.1, south = 16.2, length = west + south;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      8.84, y0, -175.6, 8.84, y0, -162.5, 8.84, y1, -162.5, 8.84, y1, -175.6,
      9, y0, -162.34, 25.2, y0, -162.34, 25.2, y1, -162.34, 9, y1, -162.34
    ], 3));
    const split = west / length;
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, split, 0, split, 1, 0, 1, split, 0, 1, 0, 1, 1, split, 1], 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    const band = new THREE.Mesh(geometry, ledMaterial(text, colors.teal, length / (y1 - y0), item.reveal));
    band.material.side = THREE.DoubleSide;
    item.group.add(band);

    const windows = new THREE.ShaderMaterial({
      uniforms: { ...air, ...shared, uFill: { value: 0 }, uReveal: item.reveal, uFacade: { value: colors.facadeAlt }, uGlass: { value: colors.glass }, uTeal: { value: colors.teal }, uTealHot: { value: colors.tealHot }, uWarm: { value: colors.warm } },
      vertexShader: FLAT_VERTEX,
      fragmentShader: AIR + HASH + /* glsl */`
        uniform float uFill, uReveal, uNight, uTime; uniform vec3 uFacade, uGlass, uTeal, uTealHot, uWarm;
        varying vec2 vUv; varying vec3 vWorld;
        void main() {
          vec2 cell = vUv * vec2(10., 7.);
          vec2 id = floor(cell), f = fract(cell);
          float win = step(.2, f.x) * step(f.x, .8) * step(.22, f.y) * step(f.y, .78);
          float order = hash(id * 1.3 + 4.);
          float on = step(order, uFill) * uReveal;
          vec3 pane = mix(uGlass, uWarm * .6, step(.8, hash(id + 9.)) * uNight);
          vec3 lit = mix(uTeal, uTealHot, .2 + .2 * sin(uTime * 2. + order * 20.));
          gl_FragColor = vec4(fogged(mix(uFacade * mix(1., .9, uNight), mix(pane, lit, on), win), vWorld), 1.);
        }`
    });
    addPlane(windows, [17.1, 19, -162.32], [15.4, 14], 0, item.group);
    const neon = paint(1024, 180, (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 22;
      ctx.font = `600 104px ${SANS}`;
      ctx.textBaseline = 'middle';
      ctx.fillText('HealthNest', 150, h / 2 + 4);
      ctx.fillRect(40, h / 2 - 12, 80, 24);
      ctx.fillRect(68, h / 2 - 40, 24, 80);
    });
    addPlane(glowBlend(new THREE.MeshBasicMaterial({ map: neon, color: colors.teal, transparent: true, depthWrite: false })), [17, 5.8, -162.28], [11.4, 2], 0, item.group);

    let scroll = 0;
    return dt => {
      scroll += dt * .045;
      band.material.uniforms.uScroll.value = scroll % 1;
      windows.uniforms.uFill.value = lerp(windows.uniforms.uFill.value, clamp(item.progress * 1.15, 0, 1), damp(dt, 4));
    };
  }

  /* Meet Carl: a theater marquee with chasing bulbs and a blade sign above it. */
  function buildMarquee(item) {
    const board = (top, bottom) => paint(1400, 520, (ctx, w, h) => {
      ctx.fillStyle = '#fff4dc';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#14161b';
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, w - 60, h - 60);
      ctx.fillStyle = '#14161b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 66px ${SANS}`;
      ctx.fillText(top, w / 2, 130);
      ctx.font = `600 184px ${SANS}`;
      ctx.fillText(bottom, w / 2, 330);
    });
    const faces = [[[34, -205.2], [28, -201.6], board('NOW SHOWING · A SHORT INTRO FILM', 'MEET CARL')], [[40, -201.6], [34, -205.2], board('NOW SHOWING', 'MEET CARL')]];
    const bulbs = [];
    for (const [[ax, az], [bx, bz], texture] of faces) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([ax, 4.6, az, bx, 4.6, bz, bx, 7.2, bz, ax, 7.2, az], 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      const material = new THREE.ShaderMaterial({
        uniforms: { ...air, uMap: { value: texture }, uReveal: item.reveal },
        side: THREE.DoubleSide,
        vertexShader: FLAT_VERTEX,
        fragmentShader: AIR + /* glsl */`
          uniform sampler2D uMap; uniform float uReveal;
          varying vec2 vUv; varying vec3 vWorld;
          void main() { gl_FragColor = vec4(fogged(texture2D(uMap, vUv).rgb * (.35 + .75 * uReveal), vWorld), 1.); }`
      });
      item.group.add(new THREE.Mesh(geometry, material));
      const n = 22;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        for (const y of [4.45, 7.35]) bulbs.push(lerp(ax, bx, t) - .05, y, lerp(az, bz, t) - .08);
      }
    }
    const cap = new THREE.BufferGeometry();
    cap.setAttribute('position', new THREE.Float32BufferAttribute([28, 7.2, -201.5, 34, 7.2, -205.2, 40, 7.2, -201.5, 28, 4.6, -201.5, 40, 4.6, -201.5, 34, 4.6, -205.2], 3));
    cap.computeVertexNormals();
    item.group.add(new THREE.Mesh(cap, new THREE.MeshBasicMaterial({ color: colors.metal, side: THREE.DoubleSide })));
    // Bulbs chase in groups of four: replace the random phases and switch them on with the reveal.
    const chase = glowPoints(bulbs, colors.lamp, .42, { parent: item.group });
    chase.material.vertexShader = chase.material.vertexShader.replace('float shine =', 'float shine = step(.5, fract(aPhase + uTime * 1.2)) * .6 + .4; shine *=');
    chase.geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(Array.from({ length: bulbs.length / 3 }, (_, i) => (i % 4) / 4), 1));
    chase.material.uniforms.uOn = { value: 0 };

    const carl = paint(300, 1180, (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.font = `600 220px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      'CARL'.split('').forEach((letter, i) => ctx.fillText(letter, w / 2, 190 + i * 265));
      for (let y = 30; y < h; y += 52) { ctx.beginPath(); ctx.arc(28, y, 11, 0, Math.PI * 2); ctx.arc(w - 28, y, 11, 0, Math.PI * 2); ctx.fill(); }
    });
    const sign = new THREE.Mesh(unitBox, signMaterial(carl, colors.hot, colors.lamp, item.reveal, 'x'));
    sign.position.set(34, 12.5, -202.7);
    sign.scale.set(.35, 9.4, 2.4);
    item.group.add(sign);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(16, 7).rotateX(-Math.PI / 2), glowBlend(new THREE.MeshBasicMaterial({ map: glowMap, color: colors.lamp, transparent: true, depthWrite: false, opacity: 0 })));
    pool.position.set(34, .04, -204.5);
    item.group.add(pool);
    return () => {
      chase.material.uniforms.uOn.value = item.reveal.value;
      pool.material.opacity = .55 * item.reveal.value * air.uNight.value;
    };
  }

  /* Toolkit: a transit map. Four lines (one per group of tools) all meet at the CARL interchange; the line for
     the step you are on lights up and a train runs along it. */
  const LINES = [
    { color: 'accent', name: 'Languages', path: [[150, 520], [1400, 520]], stops: [['C#', 150, 520, 'up'], ['C', 290, 520, 'up'], ['JavaScript', 450, 520, 'up'], ['TypeScript', 1080, 520, 'up'], ['HTML', 1240, 520, 'up'], ['CSS', 1400, 520, 'up']] },
    { color: 'teal', name: 'Desktop & UI', path: [[800, 190], [800, 790]], stops: [['WinUI 3', 800, 190, 'right'], ['WinForms', 800, 300, 'right'], ['.NET', 800, 410, 'right'], ['XAML', 800, 650, 'right'], ['React', 800, 790, 'right']] },
    { color: 'amber', name: 'Data', path: [[200, 300], [580, 300], [1000, 720], [1360, 720]], stops: [['SQLite', 200, 300, 'up'], ['MySQL', 380, 300, 'up'], ['SQL', 1060, 720, 'down'], ['MS Access', 1210, 720, 'down'], ['MCP', 1360, 720, 'down']] },
    { color: 'coral', name: 'Foundations', path: [[200, 740], [580, 740], [1000, 320], [1360, 320]], stops: [['Data structures', 200, 740, 'down'], ['Algorithms', 380, 740, 'down'], ['Numerical methods', 1090, 320, 'up'], ['Linear algebra', 1360, 320, 'up']] }
  ];
  function buildTransit(item) {
    const hex = key => `#${colors[key].getHexString()}`;
    const map = paint(1600, 896, () => {});
    const drawMap = () => {
      const ctx = map.image.getContext('2d');
      const dark = themeName() === 'dark';
      ctx.fillStyle = dark ? '#0b1322' : '#ffffff';
      ctx.fillRect(0, 0, 1600, 896);
      ctx.fillStyle = dark ? '#05090f' : '#14161b';
      ctx.fillRect(0, 0, 1600, 112);
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.font = `600 58px ${SANS}`;
      ctx.fillText('Toolkit', 56, 60);
      ctx.font = `500 26px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillText('TRANSIT MAP · 4 LINES · 20 STOPS', 1544, 60);
      ctx.textAlign = 'left';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const line of LINES) {
        ctx.strokeStyle = hex(line.color);
        ctx.lineWidth = 22;
        ctx.beginPath();
        line.path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
      ctx.font = `600 30px ${SANS}`;
      for (const line of LINES) {
        for (const [name, x, y, side] of line.stops) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = dark ? '#0b1322' : '#14161b';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = dark ? '#dbe5f7' : '#14161b';
          ctx.textAlign = side === 'right' ? 'left' : 'center';
          ctx.fillText(name, side === 'right' ? x + 30 : x, side === 'up' ? y - 40 : side === 'down' ? y + 42 : y);
        }
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = dark ? '#0b1322' : '#14161b';
      ctx.lineWidth = 8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(720, 488, 160, 64, 32);
      else ctx.rect(720, 488, 160, 64); // older browsers: a square-cornered sign rather than no city at all
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#14161b';
      ctx.font = `600 32px ${SANS}`;
      ctx.fillText('CARL', 800, 522);
      ctx.textAlign = 'left';
      ctx.font = `500 22px ${MONO}`;
      LINES.forEach((line, i) => {
        const x = 960 + i * 158;
        ctx.fillStyle = hex(line.color);
        ctx.beginPath();
        ctx.arc(x, 858, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dark ? '#8f9bb3' : '#4b5261';
        ctx.fillText(line.name.toUpperCase(), x + 18, 859);
      });
      map.needsUpdate = true;
    };
    drawMap();
    redraws.push(drawMap);
    const mask = paint(1600, 896, ctx => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 34;
      LINES.forEach((line, i) => {
        ctx.strokeStyle = `rgb(${(i + 1) * 60}, 0, 0)`;
        ctx.beginPath();
        line.path.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      });
    });
    mask.minFilter = mask.magFilter = THREE.NearestFilter;
    mask.generateMipmaps = false;
    const panel = new THREE.ShaderMaterial({
      uniforms: { ...air, ...shared, uMap: { value: map }, uMask: { value: mask }, uActive: { value: 0 }, uReveal: item.reveal },
      vertexShader: FLAT_VERTEX,
      fragmentShader: AIR + /* glsl */`
        uniform sampler2D uMap, uMask; uniform float uActive, uReveal, uTime;
        varying vec2 vUv; varying vec3 vWorld;
        void main() {
          vec3 base = texture2D(uMap, vUv).rgb;
          float id = floor(texture2D(uMask, vUv).r * 255. / 60. + .5);
          float isLine = step(.5, id);
          float current = isLine * (1. - step(.5, abs(id - uActive)));
          float dimmed = isLine * (1. - current) * step(.5, uActive);
          vec3 color = mix(base, base * .3, dimmed * .65);
          color += base * current * (.3 + .15 * sin(uTime * 3.));
          gl_FragColor = vec4(fogged(color * (.25 + .75 * uReveal), vWorld), 1.);
        }`
    });
    addPlane(panel, [78, 8.2, -266.32], [17.6, 9.86], 0, item.group);
    addBox(propMaterial(colors.metal), [78, 8.2, -266.5], [18.4, 10.6, .3], item.group);
    // A subway entrance beside it: two green globes.
    const posts = propMaterial(colors.metal);
    const globes = [];
    for (const z of [-268.2, -271.8]) {
      addBox(posts, [67.6, 1.2, z], [.12, 2.4, .12], item.group);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(.28, 14, 10), new THREE.MeshBasicMaterial({ color: colors.go }));
      globe.position.set(67.6, 2.65, z);
      item.group.add(globe);
      globes.push(67.6, 2.65, z);
    }
    glowPoints(globes, colors.go, 1.2, { night: true, parent: item.group });
    const train = new THREE.Sprite(glowBlend(new THREE.SpriteMaterial({ map: glowMap, color: colors.hot, transparent: true, depthWrite: false, opacity: 0 })));
    train.scale.setScalar(1.3);
    item.group.add(train);
    const toWorld = ([x, y]) => [69.2 + x / 1600 * 17.6, 3.27 + (1 - y / 896) * 9.86];
    let ride = 0;
    return dt => {
      // The line for the step you are on; a phone, which shows every step at once, takes each line in turn.
      const active = camera.aspect < 1 ? 1 + Math.floor(shared.uTime.value / 3) % 4
        : item.progress > 0 && item.progress < 1 ? Math.min(4, Math.floor(item.progress * 4.3) + 1) : 0;
      panel.uniforms.uActive.value = active;
      train.material.opacity = active ? item.reveal.value : 0;
      if (!active) return;
      ride = (ride + dt * .16) % 1;
      const path = LINES[active - 1].path;
      const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
      let left = ride * lengths.reduce((a, b) => a + b, 0), k = 0;
      while (k < lengths.length - 1 && left > lengths[k]) left -= lengths[k++];
      const t = left / lengths[k];
      const [x, y] = toWorld([lerp(path[k][0], path[k + 1][0], t), lerp(path[k][1], path[k + 1][1], t)]);
      train.position.set(x, y, -266.15);
    };
  }

  /* About: a split-flap departures board. Rows flip while you scroll toward it and land one by one. */
  const GLYPHS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,+-/&:';
  const BOARD = ['FROM       CEBU, PHILIPPINES', 'COORDS     10.32 N  123.89 E', 'STUDYING   COMPUTER ENGINEERING', 'BUILDS     DESKTOP + AUTOMATION', 'STATUS     OPEN TO INTERNSHIPS'];
  function buildBoard(item) {
    const glyphs = paint(1024, 1024, ctx => {
      ctx.fillStyle = '#fff';
      ctx.font = `500 120px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      GLYPHS.split('').forEach((glyph, i) => ctx.fillText(glyph, (i % 8) * 128 + 64, Math.floor(i / 8) * 170 + 90));
    });
    const columns = 32, count = columns * BOARD.length;
    const geometry = new THREE.PlaneGeometry(.52, .86);
    const target = new Float32Array(count), seeds = new Float32Array(count), rows = new Float32Array(count), dims = new Float32Array(count);
    const m = new THREE.Matrix4();
    const flaps = new THREE.InstancedMesh(geometry, null, count);
    BOARD.forEach((line, r) => {
      const padded = line.padEnd(columns);
      for (let c = 0; c < columns; c++) {
        const i = r * columns + c;
        flaps.setMatrixAt(i, m.makeTranslation(70.9 + c * .6, 10.1 - r * 1.05, -344.2));
        target[i] = Math.max(0, GLYPHS.indexOf(padded[c]));
        seeds[i] = random();
        rows[i] = r;
        dims[i] = c < 11 ? 1 : 0;
      }
    });
    geometry.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(target, 1));
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    geometry.setAttribute('aRow', new THREE.InstancedBufferAttribute(rows, 1));
    geometry.setAttribute('aDim', new THREE.InstancedBufferAttribute(dims, 1));
    const settle = [1e6, 1e6, 1e6, 1e6, 1e6];
    flaps.material = new THREE.ShaderMaterial({
      uniforms: { ...air, ...shared, uGlyphs: { value: glyphs }, uRows: { value: settle }, uReveal: item.reveal, uFlap: { value: colors.flap }, uInk: { value: colors.flapInk }, uDim: { value: colors.flapDim } },
      vertexShader: /* glsl */`
        attribute float aGlyph; attribute float aSeed; attribute float aRow; attribute float aDim;
        varying vec2 vUv; varying float vGlyph; varying float vSeed; varying float vRow; varying float vDim; varying vec3 vWorld;
        void main() {
          vUv = uv; vGlyph = aGlyph; vSeed = aSeed; vRow = aRow; vDim = aDim;
          vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: AIR + HASH + /* glsl */`
        uniform sampler2D uGlyphs; uniform float uRows[5]; uniform float uTime, uReveal; uniform vec3 uFlap, uInk, uDim;
        varying vec2 vUv; varying float vGlyph; varying float vSeed; varying float vRow; varying float vDim; varying vec3 vWorld;
        void main() {
          float since = uTime - uRows[int(vRow + .5)] - vSeed * .9;
          float glyph = since > 0. ? vGlyph : floor(hash(vec2(floor(uTime * 12. + vSeed * 31.), vSeed * 7.)) * 43.) + 1.;
          vec2 at = vec2((mod(glyph, 8.) + vUv.x) / 8., 1. - (floor(glyph / 8.) + 1. - vUv.y) * (170. / 1024.));
          float ink = texture2D(uGlyphs, at).a * uReveal;
          vec3 flap = uFlap * (vUv.y > .5 ? 1.08 : .94);
          vec3 color = mix(flap, mix(uInk, uDim, vDim), ink);
          color = mix(color, flap * .3, 1. - smoothstep(0., .025, abs(vUv.y - .5)));
          color += uInk * .05 * uReveal * (since > 0. ? smoothstep(.3, 0., since) : 1.);
          gl_FragColor = vec4(fogged(color, vWorld), 1.);
        }`
    });
    flaps.frustumCulled = false;
    item.group.add(flaps);
    addBox(propMaterial(colors.bezel), [80.2, 8, -344.45], [20.2, 7.6, .4], item.group);
    const header = paint(1024, 48, (ctx, w, h) => {
      ctx.fillStyle = '#0d0f13';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `500 28px ${MONO}`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffb547';
      ctx.fillText('DEPARTURES', 16, h / 2 + 1);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c9ced8';
      ctx.fillText('ABOUT · 05', w - 16, h / 2 + 1);
    });
    addPlane(new THREE.MeshBasicMaterial({ map: header }), [80.2, 11.25, -344.23], [19.6, .9], 0, item.group);
    return () => {
      if (!item.revealed) return;
      const now = shared.uTime.value;
      for (let r = 0; r < BOARD.length; r++) {
        const landed = item.progress >= (r + .6) / (BOARD.length + .4);
        if (landed && settle[r] > now) settle[r] = now;
        if (!landed) settle[r] = 1e6;
      }
    };
  }

  /* Contact: a building going up. Steel rises floor by floor as you read, a tower crane swings a beam over it. */
  function buildSite(item) {
    const xs = [52.5, 60.5, 68.5, 76.5, 84.5], zs = [-477, -485.5, -494, -502.5], first = 7, last = 23, storey = 2.8;
    const parts = []; // [x, y, z, w, h, d, floor]
    for (let f = first; f < last; f++) {
      const y = f * storey;
      for (const x of xs) for (const z of zs) parts.push([x, y + storey / 2, z, .45, storey, .45, f]);
      for (const z of zs) for (let i = 0; i < xs.length - 1; i++) parts.push([(xs[i] + xs[i + 1]) / 2, y + storey - .2, z, 8, .4, .35, f]);
      for (const x of xs) for (let i = 0; i < zs.length - 1; i++) parts.push([x, y + storey - .2, (zs[i] + zs[i + 1]) / 2, .35, .4, 8.5, f]);
    }
    const geometry = unitBox.clone();
    const floors = new Float32Array(parts.length);
    geometry.setAttribute('aFloor', new THREE.InstancedBufferAttribute(floors, 1));
    const built = { value: first };
    const steel = new THREE.InstancedMesh(geometry, new THREE.ShaderMaterial({
      uniforms: { ...air, uBuilt: built, uSteel: { value: colors.steel }, uWarm: { value: colors.warm } },
      vertexShader: /* glsl */`
        attribute float aFloor; uniform float uBuilt;
        varying vec3 vWorld; varying vec3 vNormal;
        void main() {
          mat4 m = modelMatrix * instanceMatrix;
          vec4 world = m * vec4(position, 1.);
          vWorld = world.xyz;
          vNormal = normal;
          gl_Position = aFloor >= uBuilt ? vec4(2., 2., 2., 1.) : projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: AIR + /* glsl */`
        uniform vec3 uSteel, uWarm; uniform float uNight;
        varying vec3 vWorld; varying vec3 vNormal;
        void main() {
          vec3 col = uSteel * (.55 + .45 * max(vNormal.y, 0.) + .2 * abs(vNormal.x)) * mix(1., .6, uNight);
          col += uWarm * .1 * uNight;
          gl_FragColor = vec4(fogged(col, vWorld), 1.);
        }`
    }), parts.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), at = new THREE.Vector3(), size = new THREE.Vector3();
    parts.forEach(([x, y, z, w, h, d, f], i) => {
      steel.setMatrixAt(i, m.compose(at.set(x, y, z), q, size.set(w, h, d)));
      floors[i] = f;
    });
    steel.computeBoundingSphere();
    item.group.add(steel);

    // The crane: a lattice mast, a jib that swings, a counterweight, and a beam on the hook.
    const truss = new THREE.ShaderMaterial({
      uniforms: { ...air, uColor: { value: colors.crane } },
      side: THREE.DoubleSide,
      vertexShader: BOX_VERTEX,
      fragmentShader: AIR + /* glsl */`
        uniform vec3 uColor; uniform float uNight;
        varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vSize;
        void main() {
          vec3 s = vSize, l = vLocal * vSize, a = abs(vLocal);
          float along, across, halfWidth;
          if (s.y > max(s.x, s.z)) {
            along = l.y;
            across = a.x > a.z ? l.z : l.x;
            halfWidth = (a.x > a.z ? s.z : s.x) * .5;
          } else {
            bool longX = s.x > s.z;
            along = longX ? l.x : l.z;
            bool topFace = a.y > (longX ? a.z : a.x);
            across = topFace ? (longX ? l.z : l.x) : l.y;
            halfWidth = (topFace ? (longX ? s.z : s.x) : s.y) * .5;
          }
          float w = max(.09, fwidth(along) * 1.2);
          float pitch = halfWidth * 2.;
          float rail = step(halfWidth - w, abs(across));
          float rung = step(abs(fract(along / pitch) - .5) * pitch, w * .7);
          float diagonal = step(abs(fract((along + across) / pitch + .5) - .5) * pitch, w * .9);
          if (max(rail, max(rung, diagonal)) < .5) discard;
          vec3 col = uColor * (.6 + .4 * clamp(dot(vNormal, normalize(vec3(.3, 1., .4))), 0., 1.)) * mix(1., .85, uNight);
          gl_FragColor = vec4(fogged(col, vWorld), 1.);
        }`
    });
    const solid = propMaterial(colors.concrete);
    addBox(truss, [92, 34, -499], [1.8, 68, 1.8], item.group);
    const head = new THREE.Group();
    head.position.set(92, 68, -499);
    item.group.add(head);
    addBox(truss, [-25, 0, 0], [52, 1.4, 1.4], head);
    addBox(truss, [7.5, 0, 0], [15, 1.2, 1.2], head);
    addBox(truss, [0, 4, 0], [.8, 8, .8], head);
    addBox(solid, [13, -1.9, 0], [3, 2.6, 2.2], head);
    addBox(propMaterial(colors.hot), [-1.6, -1.6, 1.4], [2.2, 2, 2.2], head);
    const tie = x => {
      const dy = .7 - 8, len = Math.hypot(x, dy);
      const bar = addBox(solid, [x / 2, (8 + .7) / 2, 0], [len, .08, .08], head);
      bar.rotation.z = Math.atan2(dy, x);
    };
    tie(-51);
    tie(15);
    addBox(solid, [-34, -.9, 0], [1.6, .8, 1.6], head);
    addBox(solid, [-34, -13.4, 0], [.07, 25, .07], head);
    addBox(solid, [-34, -26.3, 0], [.7, .9, .7], head);
    const load = addBox(propMaterial(colors.steel), [-34, -27.5, 0], [7, .45, .45], head);
    glowPoints([-51, .2, 0, 0, 8.3, 0, 15, .2, 0], colors.tail, 1.6, { blink: true, parent: head });
    glowPoints([52.5, 21, -476.4, 84.5, 30, -476.4, 68.5, 39, -476.4, 60.5, 47, -502.9], colors.lamp, 2.4, { night: true, parent: item.group });

    // A plywood fence round the lot, with a banner on it.
    addBox(propMaterial(colors.plywood), [68.5, 1.3, -474.9], [36.5, 2.6, .25], item.group);
    const banner = paint(2048, 112, (ctx, w, h) => {
      ctx.fillStyle = '#14161b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 64px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('YOUR PROJECT  ·  COMING SOON', w / 2, h / 2 + 3);
    });
    addPlane(new THREE.MeshBasicMaterial({ map: banner }), [68.5, 1.45, -474.74], [30, 1.64], 0, item.group);

    return dt => {
      const t = shared.uTime.value;
      const goal = first + (last - first) * clamp(item.reveal.value * .35 + item.progress * .9, 0, 1);
      built.value = lerp(built.value, goal, damp(dt, 2.5));
      head.rotation.y = .3 + Math.sin(t * .07) * .4;
      load.rotation.y = Math.sin(t * .5) * .25;
      load.rotation.z = Math.sin(t * .8) * .03;
    };
  }

  // LED text: a strip of words (and heartbeats) drawn once; ledMaterial scrolls it across a field of dots.
  function led(words, joiner) {
    const font = `600 46px ${MONO}`;
    const ecg = 200;
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = font;
    const gap = joiner === 'ecg' ? ecg + 60 : measure.measureText(joiner).width + 60;
    const width = Math.ceil(words.reduce((sum, word) => sum + measure.measureText(word).width + gap, 15));
    const texture = paint(width, 64, (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.font = font;
      ctx.textBaseline = 'middle';
      let x = 15;
      for (const word of words) {
        ctx.fillText(word, x, h / 2 + 3);
        x += ctx.measureText(word).width + 30;
        if (joiner === 'ecg') {
          const beat = [[0, 0], [40, 0], [55, -8], [70, 0], [85, 0], [93, 10], [103, -24], [113, 16], [121, 0], [150, 0], [165, -10], [182, 0], [200, 0]];
          ctx.beginPath();
          beat.forEach(([bx, by], i) => (i ? ctx.lineTo(x + bx, h / 2 + by) : ctx.moveTo(x + bx, h / 2 + by)));
          ctx.stroke();
          x += ecg + 30;
        } else {
          ctx.fillText(joiner, x, h / 2 + 3);
          x += ctx.measureText(joiner).width + 30;
        }
      }
    });
    texture.wrapS = THREE.RepeatWrapping;
    texture.userData.aspect = width / 64;
    return texture;
  }
  function ledMaterial(texture, color, ratio, reveal) {
    const rows = 14;
    return new THREE.ShaderMaterial({
      uniforms: { ...air, uText: { value: texture }, uScroll: { value: 0 }, uWindow: { value: ratio / texture.userData.aspect }, uGrid: { value: new THREE.Vector2(rows * ratio, rows) }, uOn: { value: color }, uOff: { value: colors.bezel }, uReveal: reveal },
      vertexShader: FLAT_VERTEX,
      fragmentShader: AIR + /* glsl */`
        uniform sampler2D uText; uniform float uScroll, uWindow, uReveal; uniform vec2 uGrid; uniform vec3 uOn, uOff;
        varying vec2 vUv; varying vec3 vWorld;
        void main() {
          vec2 cell = vUv * uGrid;
          vec2 id = floor(cell), f = fract(cell) - .5;
          float dots = 1. - smoothstep(.28, .42, length(f));
          dots = mix(dots, .6, smoothstep(.3, .8, fwidth(cell.x)));
          float on = step(.45, texture2D(uText, vec2((id.x + .5) / uGrid.x * uWindow + uScroll, (id.y + .5) / uGrid.y)).a) * uReveal;
          vec3 color = mix(uOff, mix(uOff * 2.2 + .02, uOn * 1.15, on), dots);
          gl_FragColor = vec4(fogged(color, vWorld), 1.);
        }`
    });
  }
  // A box sign: letters on its two broad faces (the thin side along `thin`), dark metal round the edges.
  function signMaterial(texture, ink, glow, reveal, thin = 'z') {
    return new THREE.ShaderMaterial({
      uniforms: { ...air, ...shared, uMap: { value: texture }, uInk: { value: ink }, uGlow: { value: glow }, uMetal: { value: colors.metal }, uReveal: reveal },
      vertexShader: /* glsl */`
        varying vec3 vWorld; varying vec3 vObject; varying vec2 vUv;
        void main() { vUv = uv; vObject = normal; vec4 w = modelMatrix * vec4(position, 1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: AIR + /* glsl */`
        uniform sampler2D uMap; uniform vec3 uInk, uGlow, uMetal; uniform float uReveal, uTime;
        varying vec3 vWorld; varying vec3 vObject; varying vec2 vUv;
        void main() {
          float face = abs(vObject.${thin});
          float letters = texture2D(uMap, vUv).a * step(.5, face);
          float pulse = .82 + .18 * sin(uTime * 2.2);
          vec3 color = mix(uMetal, uInk * pulse + uGlow * .25, letters * uReveal);
          gl_FragColor = vec4(fogged(color, vWorld), 1.);
        }`
    });
  }

  /* ---------- Scroll to camera ---------- */
  let toS = () => 0;
  let heroEnd = 0; // where the hero's stage ends on the page; the hero's veil fades as it scrolls away
  function measure() {
    const vh = innerHeight;
    const max = Math.max(1, ScrollTrigger.maxScroll(window));
    const keys = [];
    [...stations].sort((a, b) => a.s - b.s).forEach((item, index) => {
      const rect = item.el.getBoundingClientRect();
      const top = rect.top + scrollY, height = rect.height;
      const holds = height > vh * 1.5;
      if (index === 0) {
        heroEnd = top + height;
        keys.push({ y: 0, s: item.s });
        if (holds) keys.push({ y: top + height - vh, s: item.s + HERO_PUSH });
      } else if (holds) {
        keys.push({ y: top, s: item.s - HOLD }, { y: top + height - vh, s: item.s + HOLD });
      } else if (camera.aspect < 1 && item.el.matches('.chapter')) {
        // Phones: a chapter leaves the top of the screen open for its piece, so arrive as the chapter does.
        keys.push({ y: top, s: item.s });
      } else {
        keys.push({ y: top + height / 2 - vh / 2, s: item.s });
      }
    });
    keys.forEach(key => { key.y = clamp(key.y, 0, max); });
    for (let i = 1; i < keys.length; i++) keys[i].y = Math.max(keys[i].y, keys[i - 1].y + 1);
    // Past the last stop the camera only drifts, so the end of the page never runs into the site.
    const last = keys[keys.length - 1];
    if (max > last.y + 1) keys.push({ y: max, s: last.s + 2 });
    toS = monotone(keys.map(key => key.y), keys.map(key => key.s));
  }

  // The city fills the screen behind the text, so one render pixel per CSS pixel is plenty: on a laptop at
  // 125% scaling that is a third fewer pixels than its native resolution. Retina screens get a little more.
  let quality = 1;
  function layout() {
    const width = canvas.clientWidth || innerWidth, height = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.25 : devicePixelRatio >= 2 ? 1.5 : 1) * quality);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1 ? 72 : 55; // a phone held upright sees wider, so each piece fits above the text
    camera.updateProjectionMatrix();
    shared.uScale.value = height * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    // The left band lies under the chapters' text column; the bottom band under the hero's lines, or the lower
    // half of a phone where its chapter text sits.
    const pr = renderer.getPixelRatio(), wide = camera.aspect >= 1;
    const right = wide ? Math.max(width * .3, ...[...document.querySelectorAll('.chapter-copy')].map(el => el.getBoundingClientRect().right)) : 0;
    air.uVeil.value.set(right * .7 * pr, (right + width * .12) * pr, height * (wide ? .38 : .5) * pr, height * (wide ? .62 : .7) * pr);
    // Where the text column takes more of the width (a squarer screen), each piece moves over to make room.
    crowd = wide ? clamp(2 * right / width - 1.02, 0, .3) : 0;
    stations.forEach(aimAt);
  }

  /* ---------- Frame loop, on GSAP's ticker so it moves in step with smooth scrolling ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, moved: 0 };
  addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    pointer.tx = event.clientX / innerWidth * 2 - 1;
    pointer.ty = -(event.clientY / innerHeight * 2 - 1);
    pointer.moved = performance.now();
  }, { passive: true });
  let paused = false;
  document.addEventListener('reel:toggle', event => { paused = event.detail.open; });

  let traffic = () => {};
  const look = new THREE.Vector3(), side = new THREE.Vector3(), lift = new THREE.Vector3();
  let frameCount = 0, lastScroll = scrollY, stillSince = 0, skipped = 0;
  // Frames that keep running late lower the resolution a step; a long smooth stretch raises it back.
  const perf = { native: 1000 / 60, samples: [], late: 0, count: 0, upgrades: 0, calm: 0, after: performance.now() + 4000 };

  function render(time, deltaMs) {
    shared.uTime.value = time;
    perf.samples.length < 40 && deltaMs > 2 && perf.samples.push(deltaMs);
    if (perf.samples.length === 40 && !perf.ready) {
      perf.native = [...perf.samples].sort((a, b) => a - b)[8];
      perf.ready = true;
    }
    if (paused || document.hidden) return;

    const y = scrollY;
    const moving = Math.abs(y - lastScroll) > .1;
    lastScroll = y;
    if (moving || performance.now() - pointer.moved < 400) stillSince = time;
    frameCount++;
    // At rest on a fast screen, every other frame is plenty for the slow life of the city.
    if (!moving && perf.native < 12 && time - stillSince > .5 && frameCount % 2) {
      skipped += deltaMs;
      return;
    }
    const dt = Math.min(deltaMs + skipped, 64) / 1000;
    skipped = 0;

    const s = toS(y);
    // The veil: always beside the chapters on wide screens, and under the hero's lines while the hero is up.
    const wide = camera.aspect >= 1;
    air.uVeilAmount.value.set(wide ? veilStrength.value : 0, veilStrength.value * (wide ? clamp((heroEnd - y) / innerHeight, 0, 1) : 1));
    pointer.x = lerp(pointer.x, pointer.tx, damp(dt, 2.6));
    pointer.y = lerp(pointer.y, pointer.ty, damp(dt, 2.6));

    pose(s, camera);
    side.set(1, 0, 0).applyQuaternion(camera.quaternion);
    lift.set(0, 1, 0).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(side, pointer.x * .3).addScaledVector(lift, pointer.y * .18);
    camera.lookAt(pointAt(s + LOOK, look));
    // Near a stop the camera turns to it, so its piece of the city sits beside the text.
    let yaw = 0, pitch = 0;
    for (const item of stations) {
      const w = 1 - smooth(HOLD + 2, 32, Math.abs(s - item.s));
      yaw += item.aim.yaw * w;
      pitch += item.aim.pitch * w;
    }
    camera.rotateY(-yaw - pointer.x * .035);
    camera.rotateX(pitch + pointer.y * .025);
    camera.updateMatrixWorld();
    sky.position.copy(camera.position);

    traffic(dt, s);
    for (const item of stations) {
      const near = Math.abs(s - item.s) < item.stop.range;
      item.group.visible = near;
      if (!near) continue;
      if (!item.revealed && s > item.s - 75) reveal(item);
      // A phone doesn't hold a chapter, so its piece plays out as the camera arrives instead.
      item.progress = wide ? (item.trigger ? item.trigger.progress : 0) : clamp(1 - (item.s - s) / 50, 0, 1);
      item.update(dt);
    }

    renderer.setClearColor(colors.bg);
    renderer.render(scene, camera);
    watch(deltaMs, moving);
  }

  function watch(deltaMs, moving) {
    // Only steady scrolling counts: a long gap means the tab was hidden or busy elsewhere, not a slow frame.
    if (!perf.ready || !moving || deltaMs > 120 || performance.now() < perf.after) return;
    perf.count++;
    if (deltaMs > perf.native * 1.6) perf.late++;
    if (perf.count < 90) return;
    const lateShare = perf.late / perf.count;
    perf.count = perf.late = 0;
    if (lateShare > .18 && quality > .55) {
      quality = Math.max(.55, quality * .8);
      perf.calm = 0;
      layout();
    } else if (lateShare < .03 && quality < 1 && perf.upgrades < 2 && ++perf.calm > 4) {
      quality = Math.min(1, quality / .8);
      perf.upgrades++;
      perf.calm = 0;
      layout();
    }
  }

  // A stop powers up the first time the camera comes near it.
  function reveal(item) {
    item.revealed = true;
    gsap.to(item.reveal, { value: 1, duration: 2.2, ease: 'power2.out' });
  }

  /* ---------- Themes: colors ease over with the page; night switches to day ---------- */
  function applyTheme() {
    const name = themeName();
    glowing.forEach(material => {
      material.blending = name === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.needsUpdate = true;
    });
    for (const [key, value] of Object.entries(PALETTES[name])) {
      const target = new THREE.Color(value);
      gsap.to(colors[key], { r: target.r, g: target.g, b: target.b, duration: .4, ease: 'power1.out', overwrite: true });
    }
    gsap.to(air.uNight, { value: WEATHER[name].night, duration: .4, ease: 'power1.out', overwrite: true });
    gsap.to(air.uFog, { value: WEATHER[name].fog, duration: .4, ease: 'power1.out', overwrite: true });
    gsap.to(veilStrength, { value: WEATHER[name].veil, duration: .4, ease: 'power1.out', overwrite: true });
    gsap.delayedCall(.42, () => redraws.forEach(draw => draw()));
  }
  new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- Start: the city and the hero first, the rest while the page is idle ---------- */
  const core = elements.core ? station('core') : null;
  if (core) core.update = buildCore(core);
  layout();
  measure();
  if (core) core.revealed = true; // it lights up with the intro below, not on first sight
  await renderer.compileAsync(scene, camera);
  gsap.ticker.add(render);
  ScrollTrigger.addEventListener('refresh', () => { measure(); layout(); });
  addEventListener('resize', layout, { passive: true });

  // The first frame is drawn: the city fades in behind the hero and the tower's crown comes on.
  requestAnimationFrame(() => {
    root.classList.add('journey-live');
    if (core) gsap.to(core.reveal, { value: 1, duration: 2.6, delay: .6, ease: 'power2.out' });
  });

  await idle();
  buildStreets();
  traffic = buildTraffic(lite ? 18 : 44);
  await renderer.compileAsync(scene, camera);

  const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise(resolve => setTimeout(resolve, 1500))]);
  await fonts;
  const tags = textAtlas(['01', '02', '03', '04', '05'].map(text => ({ key: text, text, font: `500 40px ${MONO}` })));
  const builders = [
    ['line', async item => {
      const images = await Promise.all(['scenes', 'story', 'settings', 'connect'].map(name => loadImage(`img/flow-auto/${name}.webp`)));
      const shots = paint(2048, 1280, ctx => images.forEach((image, i) => ctx.drawImage(image, (i % 2) * 1024, Math.floor(i / 2) * 640, 1024, 640)));
      renderer.initTexture(shots);
      return buildScreens(item, shots, tags);
    }],
    ['pulse', buildTicker],
    ['reel', buildMarquee],
    ['orbit', buildTransit],
    ['globe', buildBoard],
    ['portal', buildSite]
  ];
  for (const [name, build] of builders) {
    if (!elements[name]) continue;
    await idle();
    const item = station(name);
    item.update = (await build(item)) || item.update;
    aimAt(item);
    measure();
    await renderer.compileAsync(scene, camera);
  }
}

if (root.classList.contains('journey') && gsap && ScrollTrigger) {
  start().catch(error => {
    root.classList.remove('journey-live');
    console.warn('The 3D journey could not start:', error);
  });
}
