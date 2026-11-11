/* =========================================================
   Carl Tampus — Portfolio: the laptops in the 3D studio
   Each project stands on the turntable as a real laptop: a metal body, a keyboard, a hinge and a
   glass screen that lights the keys and the floor in front of it. three.js draws them on one canvas
   between the room's light (room.js) and the page.

   The windows in index.html stay where they are, invisible: they still take the mouse, the keyboard
   and the films (main.js), and motion.js still moves them. Every frame this file reads where the
   page has put them and stands a laptop there, its screen exactly over the window. So nothing here
   decides where anything is; it only draws.

   main.js owns site.laptops (which screen each laptop shows, how far each lid is open). If WebGL 2
   or three.js is missing, site.laptops.fail() brings the windows back.
   ========================================================= */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.min.js';

const site = window.site ||= {};
const L = site.laptops;
const root = document.documentElement;
const stage = document.querySelector('.studio-stage');

// Sizes, in screen widths. The lid leans back LEAN degrees when open: the same 8 as --lean in style.css,
// and CHIN is the same .034 as --chin (the strip of lid under the screen, down to the hinge).
const LEAN = 8, CHIN = .034, BEZEL = .018, SCREEN_H = .625;
const LID_W = 1 + BEZEL * 2, LID_H = SCREEN_H + BEZEL + CHIN, LID_T = .013;
const BASE_D = LID_H, BASE_T = .02, GAP = .004, BACK = .012;
const FLOOR = -(GAP + BASE_T + .003);
const RADIUS = 1.4; // the turntable's radius, as --r in style.css

const LOOKS = {
  dark: { shell: 0x8f98ab, deck: 0x0b0d12, key: 0x1b1e26, wall: 0x0a1020, lamp: 0x8cb4ff, lampPower: 7, fill: .5, key3: 2.4, reflect: .2, shadow: .55, pool: .5, ring: .16 },
  light: { shell: 0xd5d7dc, deck: 0x1a1c21, key: 0x2a2d35, wall: 0xcfccc2, lamp: 0xfffaf0, lampPower: 3.2, fill: 1.1, key3: 2.6, reflect: .05, shadow: .3, pool: .12, ring: .3 }
};

function start() {
  const items = [...stage.querySelectorAll('.orbit-item')];
  const tilts = items.map(item => item.querySelector('.orbit-tilt'));
  const dolly = stage.querySelector('.studio-dolly');
  const cameraEl = stage.querySelector('.studio-camera');
  const ringEl = stage.querySelector('.studio-ring');
  const gsap = window.gsap;

  const canvas = document.createElement('canvas');
  canvas.className = 'studio-laptops';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL 2 is needed');
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  stage.querySelector('.studio-room').after(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.matrixAutoUpdate = false;
  const lampLight = new THREE.DirectionalLight(0xffffff, 2);
  lampLight.position.set(-.25, 1, .55);
  const fill = new THREE.HemisphereLight(0xffffff, 0x000000, .5);
  scene.add(lampLight, fill);

  /* ---------- Materials: one set, shared by the three laptops ---------- */
  const shell = new THREE.MeshStandardMaterial({ metalness: 1, roughness: .4 });
  const pad = new THREE.MeshStandardMaterial({ metalness: 1, roughness: .26 });
  const deck = new THREE.MeshStandardMaterial({ metalness: .3, roughness: .75 });
  const keyCap = new THREE.MeshStandardMaterial({ metalness: .1, roughness: .55 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x030406, metalness: 0, roughness: .16 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x08090c, metalness: .8, roughness: .5 });

  // What stands around the laptops, for the metal to reflect: the lamp overhead, two dim strips at the
  // sides and the wall. Drawn once per theme into a small environment map.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envs = {};
  function envFor(name) {
    if (envs[name]) return envs[name];
    const look = LOOKS[name];
    const room = new THREE.Scene();
    const lit = (w, h, color, power) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    room.add(new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: look.wall, side: THREE.BackSide })));
    const lamp = lit(4.5, 4.5, look.lamp, look.lampPower);
    lamp.position.set(0, 3.9, .5);
    lamp.rotation.x = Math.PI / 2;
    const left = lit(1.2, 5, look.lamp, look.lampPower * .22);
    left.position.set(-5.9, 0, 1);
    left.rotation.y = Math.PI / 2;
    const right = left.clone();
    right.position.x = 5.9;
    const front = lit(9, 2.2, look.lamp, look.lampPower * .1);
    front.position.set(0, 1.6, 5.9);
    room.add(lamp, left, right, front);
    envs[name] = pmrem.fromScene(room, .06).texture;
    room.traverse(node => { node.geometry?.dispose(); node.material?.dispose(); });
    return envs[name];
  }

  /* ---------- Shapes ---------- */
  function roundedRect(w, h, r) {
    const x = -w / 2, y = -h / 2, shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
  }
  // A plate with rounded corners and softened edges, w by h, from z = 0 to z = t.
  function slab(w, h, t, r, bevel = .0028) {
    const geometry = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, r), { depth: t - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12 });
    geometry.translate(0, 0, bevel);
    return geometry;
  }
  // The same outline, flat and facing up.
  function plate(w, d, r) {
    const geometry = new THREE.ShapeGeometry(roundedRect(w, d, r), 10);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }

  const lidGeometry = slab(LID_W, LID_H, LID_T, .02).translate(0, LID_H / 2, -LID_T);
  const baseGeometry = slab(LID_W, BASE_D, BASE_T, .02).rotateX(Math.PI / 2).translate(0, -GAP, BASE_D / 2 - BACK);
  const glassGeometry = new THREE.ShapeGeometry(roundedRect(LID_W - .007, LID_H - .007, .017), 10).translate(0, LID_H / 2, .0004);
  const screenGeometry = new THREE.PlaneGeometry(1, SCREEN_H).translate(0, CHIN + SCREEN_H / 2, .0009);
  const hingeGeometry = new THREE.CylinderGeometry(.0085, .0085, LID_W * .8, 20).rotateZ(Math.PI / 2).translate(0, -.0015, -.0035);

  // The keyboard: six rows in a shallow well, then the trackpad.
  const UNIT = .8 / 14.5, KEY_GAP = UNIT * .13, WELL_Z = .045, WELL_D = UNIT * 5.5 + .012;
  const ROWS = [
    { depth: .5, keys: Array(14).fill(14.5 / 14) },
    { depth: 1, keys: [...Array(13).fill(1), 1.5] },
    { depth: 1, keys: [1.5, ...Array(13).fill(1)] },
    { depth: 1, keys: [1.75, ...Array(11).fill(1), 1.75] },
    { depth: 1, keys: [2.25, ...Array(10).fill(1), 2.25] },
    { depth: 1, keys: [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1.5] }
  ];
  const KEYS = [];
  {
    let z = WELL_Z + .006;
    ROWS.forEach(row => {
      let x = -.4;
      row.keys.forEach(width => {
        KEYS.push([x + width * UNIT / 2, z + row.depth * UNIT / 2, width * UNIT - KEY_GAP, row.depth * UNIT - KEY_GAP]);
        x += width * UNIT;
      });
      z += row.depth * UNIT;
    });
  }
  const wellGeometry = plate(.8 + .012, WELL_D, .01).translate(0, -GAP + .0005, WELL_Z + WELL_D / 2);
  const padGeometry = plate(.3, .185, .012).translate(0, -GAP + .0005, .515);
  const keyGeometry = new THREE.BoxGeometry(1, 1, 1);
  const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

  /* ---------- The screen: two pictures and a wipe between them, under glass ---------- */
  const blank = new THREE.DataTexture(new Uint8Array([6, 8, 14, 255]), 1, 1);
  blank.needsUpdate = true;
  const SCREEN_VERTEX = `
    varying vec2 vUv; varying vec3 vNormal, vView;
    void main() {
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.);
      vNormal = normalMatrix * normal;
      vView = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`;
  const SCREEN_FRAGMENT = `
    uniform sampler2D tFrom, tTo;
    uniform vec4 uFitFrom, uFitTo;      // how each picture is cropped to the 16:10 screen: scale, then offset
    uniform float uMix, uDir, uPower, uDim;
    uniform vec3 uLamp;
    varying vec2 vUv; varying vec3 vNormal, vView;
    vec3 shot(sampler2D picture, vec4 fit, vec2 uv) { return texture2D(picture, clamp(uv, 0., 1.) * fit.xy + fit.zw).rgb; }
    void main() {
      // The next screen comes across from the side you are heading to, behind a soft lit edge.
      float along = uDir > 0. ? 1. - vUv.x : vUv.x;
      float old = smoothstep(uMix * 1.25 - .25, uMix * 1.25, along);
      vec3 from = shot(tFrom, uFitFrom, vUv - vec2(uDir * .035 * uMix, 0.));
      vec3 to = shot(tTo, uFitTo, vUv + vec2(uDir * .035 * (1. - uMix), 0.));
      vec3 color = mix(to, from, old);
      color += uLamp * old * (1. - old) * .5;
      color *= uPower * uDim;
      // Glass: the lamp shows in it at a glancing angle, and a faint sheen always crosses one corner.
      float glance = pow(1. - abs(dot(normalize(vNormal), normalize(vView))), 3.);
      color += uLamp * (glance * .42 + .035 * smoothstep(.35, 1.1, vUv.x * .7 + vUv.y));
      gl_FragColor = vec4(color, 1.);
    }`;
  // Light the screen throws: on the keys (uShape 0), on the floor in front (1), or its picture mirrored in the floor (2).
  const GLOW_VERTEX = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
  const GLOW_FRAGMENT = `
    uniform sampler2D tTo; uniform vec4 uFitTo;
    uniform vec3 uColor; uniform float uPower; uniform int uShape;
    varying vec2 vUv;
    void main() {
      vec2 p = vUv * 2. - 1.;
      float a;
      vec3 color = uColor;
      if (uShape == 0) a = pow(vUv.y, 1.6) * (1. - smoothstep(.55, 1., abs(p.x)));
      else if (uShape == 1) a = exp(-dot(p, p) * 3.2);
      else {
        // Five taps soften the mirrored picture, and it fades with distance from the hinge.
        vec2 uv = vec2(vUv.x, vUv.y) * uFitTo.xy + uFitTo.zw;
        color = texture2D(tTo, uv).rgb * .36;
        color += (texture2D(tTo, uv + vec2(.02, 0.)).rgb + texture2D(tTo, uv - vec2(.02, 0.)).rgb + texture2D(tTo, uv + vec2(0., .03)).rgb + texture2D(tTo, uv - vec2(0., .03)).rgb) * .16;
        a = pow(1. - vUv.y, 2.2) * (1. - smoothstep(.7, 1., abs(p.x)));
      }
      gl_FragColor = vec4(color * a * uPower, 0.);
    }`;
  const SHADOW_FRAGMENT = `
    uniform float uPower; varying vec2 vUv;
    void main() {
      vec2 p = abs(vUv * 2. - 1.);
      float d = length(max(p - vec2(.52, .46), 0.));
      gl_FragColor = vec4(0., 0., 0., (1. - smoothstep(0., .5, d)) * uPower);
    }`;
  // Adds light without covering what is behind the canvas: color in, no alpha.
  const additive = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };

  /* ---------- One laptop ---------- */
  const lampColor = new THREE.Color();
  function build(index) {
    const rig = new THREE.Group();          // stands where the page puts the hinge
    rig.matrixAutoUpdate = false;
    const body = new THREE.Group();
    const lid = new THREE.Group();          // turns on the hinge
    const mirror = new THREE.Group();       // the lid again, under the floor
    mirror.position.y = FLOOR * 2;
    mirror.scale.y = -1;
    const mirrorLid = new THREE.Group();
    mirror.add(mirrorLid);

    const keys = new THREE.InstancedMesh(keyGeometry, keyCap, KEYS.length);
    const place = new THREE.Matrix4();
    KEYS.forEach(([x, z, w, d], i) => keys.setMatrixAt(i, place.makeScale(w, .0052, d).setPosition(x, -GAP + .003, z)));
    keys.instanceMatrix.needsUpdate = true;

    const uniforms = {
      tFrom: { value: blank }, tTo: { value: blank },
      uFitFrom: { value: new THREE.Vector4(1, 1, 0, 0) }, uFitTo: { value: new THREE.Vector4(1, 1, 0, 0) },
      uMix: { value: 1 }, uDir: { value: 1 }, uPower: { value: 0 }, uDim: { value: 1 }, uLamp: { value: lampColor }
    };
    const screen = new THREE.Mesh(screenGeometry, new THREE.ShaderMaterial({ uniforms, vertexShader: SCREEN_VERTEX, fragmentShader: SCREEN_FRAGMENT }));
    const glow = (shape, w, d) => {
      const material = new THREE.ShaderMaterial({
        uniforms: { tTo: uniforms.tTo, uFitTo: uniforms.uFitTo, uColor: { value: new THREE.Color(0x4a6cff) }, uPower: { value: 0 }, uShape: { value: shape } },
        vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT, side: THREE.DoubleSide, ...additive
      });
      const mesh = new THREE.Mesh(shape === 2 ? screenGeometry : flat, material);
      if (shape !== 2) mesh.scale.set(w, 1, d);
      return mesh;
    };
    const onKeys = glow(0, .96, .4);
    onKeys.position.set(0, -GAP + .0075, .2);
    const onFloor = glow(1, 2.1, 1.5);
    onFloor.position.set(0, FLOOR + .0012, BASE_D + .12);
    const inFloor = glow(2);
    mirrorLid.add(inFloor);
    const shadow = new THREE.Mesh(flat, new THREE.ShaderMaterial({ uniforms: { uPower: { value: .5 } }, vertexShader: GLOW_VERTEX, fragmentShader: SHADOW_FRAGMENT, transparent: true, depthWrite: false }));
    shadow.scale.set(LID_W * 1.9, 1, BASE_D * 2.1);
    shadow.position.set(0, FLOOR + .0006, BASE_D / 2 - BACK);
    shadow.renderOrder = -1;

    lid.add(new THREE.Mesh(lidGeometry, shell), new THREE.Mesh(glassGeometry, glass), screen);
    body.add(new THREE.Mesh(baseGeometry, shell), new THREE.Mesh(wellGeometry, deck), new THREE.Mesh(padGeometry, pad), new THREE.Mesh(hingeGeometry, dark), keys, onKeys, lid);
    rig.add(body, mirror, onFloor, shadow);
    scene.add(rig);
    return { index, rig, lid, mirrorLid, uniforms, onKeys, onFloor, inFloor, shadow, dim: 1, at: -1, from: -1, slides: [], tint: new THREE.Color(0x4a6cff) };
  }
  const laptops = items.map((item, index) => build(index));

  // The track the laptops stand on, flat on the floor.
  const track = new THREE.Group();
  track.matrixAutoUpdate = false;
  const trackLine = new THREE.Mesh(new THREE.RingGeometry(RADIUS - .004, RADIUS + .004, 160).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16, depthWrite: false, toneMapped: false }));
  trackLine.renderOrder = -2;
  track.add(trackLine);
  scene.add(track);

  /* ---------- Pictures ---------- */
  const loader = new THREE.ImageBitmapLoader();
  loader.setOptions({ imageOrientation: 'flipY' });
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const average = document.createElement('canvas');
  average.width = average.height = 8;
  const averageContext = average.getContext('2d', { willReadFrequently: true });
  let dirty = true;
  const invalidate = () => { dirty = true; };

  // Crop a picture of this shape to the 16:10 screen, from its center (as object-fit: cover does).
  const fitFor = (w, h) => {
    const shape = w / h / (1 / SCREEN_H);
    return shape > 1 ? new THREE.Vector4(1 / shape, 1, (1 - 1 / shape) / 2, 0) : new THREE.Vector4(1, shape, 0, (1 - shape) / 2);
  };
  function loadSlide(laptop, k) {
    const slide = laptop.slides[k];
    if (!slide || slide.loading) return slide?.loading;
    slide.loading = new Promise(resolve => {
      loader.load(slide.src, bitmap => {
        const texture = new THREE.Texture(bitmap);
        texture.flipY = false;                    // already flipped while decoding, off the main thread
        texture.colorSpace = THREE.NoColorSpace;  // the screen shows its pixels as they are
        texture.anisotropy = maxAnisotropy;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.needsUpdate = true;
        slide.still = texture;
        slide.fit = fitFor(bitmap.width, bitmap.height);
        averageContext.drawImage(bitmap, 0, 0, 8, 8);
        const data = averageContext.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
        slide.tint = new THREE.Color(r / 64 / 255, g / 64 / 255, b / 64 / 255);
        renderer.initTexture(texture);
        if (laptop.at === k || laptop.from === k) apply(laptop);
        resolve();
      }, undefined, () => resolve());
    });
    return slide.loading;
  }
  // A slide that is a clip shows the clip once the page's own <video> has a frame; until then, its still.
  function pictureOf(laptop, k) {
    const slide = laptop.slides[k];
    if (!slide) return { texture: blank, fit: new THREE.Vector4(1, 1, 0, 0) };
    if (slide.clip) {
      const video = items[laptop.index].querySelector('video.orbit-preview');
      if (video && video.readyState >= 2 && video.videoWidth) {
        if (slide.video !== video) {
          slide.film?.dispose();
          slide.video = video;
          slide.film = new THREE.VideoTexture(video);
          slide.film.colorSpace = THREE.NoColorSpace;
          slide.filmFit = fitFor(video.videoWidth, video.videoHeight);
          // Draw again whenever the clip has a new frame, and only then.
          const onFrame = () => { invalidate(); if (slide.video === video) video.requestVideoFrameCallback(onFrame); };
          if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(onFrame);
          else slide.everyFrame = true;
        }
        return { texture: slide.film, fit: slide.filmFit };
      }
    }
    return slide.still ? { texture: slide.still, fit: slide.fit } : { texture: blank, fit: new THREE.Vector4(1, 1, 0, 0) };
  }
  function apply(laptop) {
    const to = pictureOf(laptop, laptop.at), from = pictureOf(laptop, laptop.from < 0 ? laptop.at : laptop.from);
    laptop.uniforms.tTo.value = to.texture;
    laptop.uniforms.uFitTo.value = to.fit;
    laptop.uniforms.tFrom.value = from.texture;
    laptop.uniforms.uFitFrom.value = from.fit;
    const tint = laptop.slides[laptop.at]?.tint;
    if (tint) laptop.tint.copy(tint);
    invalidate();
  }
  // Show slide k on laptop i. dir is the way the visitor is heading: 1 forward, -1 back, 0 to cut.
  function show(i, k, dir = 1) {
    const laptop = laptops[i];
    if (!laptop || !laptop.slides[k] || laptop.at === k) return;
    loadSlide(laptop, k);
    laptop.from = laptop.at;
    laptop.at = k;
    gsap.killTweensOf(laptop.uniforms.uMix);
    laptop.uniforms.uDir.value = dir || 1;
    apply(laptop);
    if (laptop.from < 0 || !dir) laptop.uniforms.uMix.value = 1;
    else gsap.fromTo(laptop.uniforms.uMix, { value: 0 }, { value: 1, duration: .8, ease: 'power3.inOut', onUpdate: invalidate });
  }

  /* ---------- Theme ---------- */
  let look = LOOKS.dark;
  function applyTheme() {
    const name = root.dataset.theme === 'light' ? 'light' : 'dark';
    look = LOOKS[name];
    scene.environment = envFor(name);
    shell.color.set(look.shell);
    pad.color.set(look.shell).multiplyScalar(.9);
    deck.color.set(look.deck);
    keyCap.color.set(look.key);
    lampColor.set(look.lamp).multiplyScalar(name === 'light' ? .5 : .6);
    lampLight.color.set(look.lamp);
    lampLight.intensity = look.key3;
    fill.intensity = look.fill;
    trackLine.material.opacity = look.ring;
    trackLine.material.color.set(name === 'light' ? 0x15171c : 0xffffff);
    invalidate();
  }
  new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- Where everything is: read from the page, every frame ---------- */
  const IDENTITY = new DOMMatrixReadOnly();
  const matrixOf = style => (style.transform === 'none' ? IDENTITY : new DOMMatrixReadOnly(style.transform));
  const styles = { dolly: getComputedStyle(dolly), camera: getComputedStyle(cameraEl), ring: getComputedStyle(ringEl), items: items.map(item => getComputedStyle(item)), stage: getComputedStyle(stage) };
  let size = { w: 0, h: 0, win: 0, winH: 0 }, itemMatrices = [], pixelRatio = 1, quality = 1;
  function measure() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    size = { w, h, win: items[0].offsetWidth, winH: items[0].offsetHeight };
    itemMatrices = styles.items.map(matrixOf);
    pixelRatio = Math.min(devicePixelRatio || 1, 2) * quality;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    // The same eye as the stage's CSS perspective: that far in front of the page, at its perspective-origin.
    const distance = parseFloat(styles.stage.perspective) || w * 1.5;
    const [ox, oy] = styles.stage.perspectiveOrigin.split(' ').map(parseFloat);
    const ex = ox - w / 2, ey = h / 2 - oy, near = 40, far = distance + 9000, k = near / distance;
    camera.projectionMatrix.makePerspective((-w / 2 - ex) * k, (w / 2 - ex) * k, (h / 2 - ey) * k, (-h / 2 - ey) * k, near, far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.matrix.makeTranslation(ex, ey, distance);
    camera.matrixWorld.copy(camera.matrix);
    camera.matrixWorldInverse.copy(camera.matrix).invert();
    invalidate();
  }
  // A CSS matrix (y down) as a three.js one (y up).
  const flipped = new THREE.Matrix4(), turn = new THREE.Matrix4(), shift = new THREE.Matrix4(), grow = new THREE.Matrix4();
  function fromCSS(matrix, target) {
    target.fromArray(matrix.toFloat64Array());
    const e = target.elements;
    e[1] = -e[1]; e[4] = -e[4]; e[6] = -e[6]; e[7] = -e[7]; e[9] = -e[9]; e[13] = -e[13];
    return target;
  }

  let lastKey = '', onScreen = true, lastTime = 0, wide = stage.classList.contains('is-wide');
  const RAD = Math.PI / 180, CLOSED = Math.PI / 2 - .02;
  const ease = t => t * t * (3 - 2 * t);
  function frame(time) {
    if (!onScreen || document.hidden || !size.w) return;
    const dt = Math.min(.1, time - lastTime || .016);
    lastTime = time;
    const dollyT = styles.dolly.transform, cameraT = styles.camera.transform, ringT = styles.ring.transform;
    let key = dollyT + cameraT + ringT + L.fold;
    laptops.forEach((laptop, i) => {
      const front = items[i].classList.contains('is-front');
      const target = front || wide ? 1 : .36;
      if (Math.abs(target - laptop.dim) > .002) { laptop.dim += (target - laptop.dim) * Math.min(1, dt * 5); dirty = true; } else laptop.dim = target;
      laptop.yaw = +gsap.getProperty(tilts[i], 'rotationY') || 0;
      laptop.pitch = +gsap.getProperty(tilts[i], 'rotationX') || 0;
      key += `|${laptop.yaw.toFixed(3)},${laptop.pitch.toFixed(3)},${L.lids[i].open.toFixed(4)}`;
    });
    if (key === lastKey && !dirty) return;
    lastKey = key;
    let again = false;

    const chain = matrixOf({ transform: dollyT }).multiply(matrixOf({ transform: cameraT })).multiply(matrixOf({ transform: ringT }));
    const hinge = -(size.winH / 2 + CHIN * size.win);
    grow.makeScale(size.win, size.win, size.win);
    fromCSS(chain, track.matrix).multiply(shift.makeTranslation(0, hinge + FLOOR * size.win, 0)).multiply(grow);
    track.matrixWorldNeedsUpdate = true;
    laptops.forEach((laptop, i) => {
      fromCSS(chain.multiply(itemMatrices[i]), laptop.rig.matrix).multiply(shift.makeTranslation(0, hinge, 0)).multiply(turn.makeRotationY(laptop.yaw * RAD)).multiply(grow);
      laptop.rig.matrixWorldNeedsUpdate = true;
      const open = ease(Math.max(0, Math.min(1, L.lids[i].open * (1 - L.fold))));
      const angle = CLOSED + (-laptop.pitch * RAD - CLOSED) * open;
      laptop.lid.rotation.x = laptop.mirrorLid.rotation.x = angle;
      // The screen wakes as the lid passes halfway, and what it throws on the keys and the floor follows it.
      const power = Math.max(0, Math.min(1, (open - .45) / .45));
      laptop.uniforms.uPower.value = power;
      laptop.uniforms.uDim.value = laptop.dim;
      const lit = power * laptop.dim;
      laptop.onKeys.material.uniforms.uColor.value.copy(laptop.tint);
      laptop.onKeys.material.uniforms.uPower.value = lit * .5;
      laptop.onFloor.material.uniforms.uColor.value.copy(laptop.tint).lerp(lampColor, .35);
      laptop.onFloor.material.uniforms.uPower.value = lit * look.pool;
      laptop.inFloor.material.uniforms.uPower.value = lit * look.reflect;
      laptop.shadow.material.uniforms.uPower.value = look.shadow;
      // A clip is looked at again each frame until the page's video has its first picture.
      const slide = laptop.slides[laptop.at];
      if (slide?.clip && items[i].classList.contains('is-playing')) {
        apply(laptop);
        again ||= !slide.film || (slide.everyFrame && !slide.video.paused);
      }
    });
    dirty = again;
    renderer.render(scene, camera);
  }

  /* ---------- Go ---------- */
  laptops.forEach((laptop, i) => { laptop.slides = (L.slides[i] || []).map(slide => ({ ...slide })); });
  applyTheme();
  measure();
  new ResizeObserver(measure).observe(stage);
  new MutationObserver(() => { wide = stage.classList.contains('is-wide'); invalidate(); }).observe(stage, { attributes: true, attributeFilter: ['class'] });
  items.forEach(item => new MutationObserver(invalidate).observe(item, { attributes: true, attributeFilter: ['class'] }));
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; invalidate(); }).observe(stage);
  document.addEventListener('visibilitychange', invalidate);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); L.fail(); });

  L.show = show;
  L.invalidate = invalidate;
  L.view = { renderer, scene, camera, frame };
  // The first screen of each laptop, then the stage can open; the rest load while the visitor reads.
  Promise.all(laptops.map((laptop, i) => { laptop.at = L.at[i] || 0; return loadSlide(laptop, laptop.at); })).then(() => {
    laptops.forEach(apply);
    renderer.compile(scene, camera);
    gsap.ticker.add(frame);
    frame(0);
    canvas.classList.add('is-on');
    L.ready();
    const rest = laptops.flatMap(laptop => laptop.slides.map((slide, k) => () => loadSlide(laptop, k)));
    const next = () => { const job = rest.shift(); if (job) job().then(() => (window.requestIdleCallback || setTimeout)(next, { timeout: 1200 })); };
    setTimeout(next, 1500);
  });
}

if (stage && L && !L.failed && root.classList.contains('has-studio-pin') && window.gsap) {
  try { start(); } catch (error) { console.warn('The 3D laptops could not start:', error); L.fail(); }
} else L?.fail?.();
