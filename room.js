/* =========================================================
   Carl Tampus — Portfolio: the light in the 3D studio
   A small fragment shader paints the room behind the turntable: a soft cone of
   light coming down through slow haze, fluted wall panels that catch it rib by
   rib, and a polished floor. Everything is worked out per pixel and dithered, so
   the light has no edges and no steps (CSS gradients on dark navy show bands).
   Without WebGL the CSS room in style.css stays instead.

   motion.js animates the numbers in site.light; this file draws them, and only
   when they change or while the haze is drifting on screen. Colors and strengths
   come from the --room-* tokens in style.css.
   ========================================================= */
(() => {
  window.site ||= {};
  // reach: how far down the light has come. open: how wide the cone is. opacity: the cone and its pool.
  // x: how far the room has slid, in CSS pixels. zoom: how close the camera is to the wall.
  const light = window.site.light = { reach: 1, open: 1, opacity: 1, x: 0, zoom: 1 };
  const KEYS = Object.keys(light);

  const root = document.documentElement;
  const room = document.querySelector('.studio-room');
  if (!room) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'studio-light';
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true });
  if (!gl) return;

  const VERTEX = 'attribute vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }';
  const FRAGMENT = `
    precision highp float;
    uniform vec2 uSize;                              // canvas size in device pixels
    uniform float uTime, uRib, uReach, uOpen, uBeam, uPan, uZoom;
    uniform vec3 uWall, uFloor, uEdge, uLamp, uGain; // uGain: ambient, rib light, beam strength

    const float FOOT = .66;                          // where the wall meets the floor, down the screen
    const vec2 VANISH = vec2(0., .4);                // the stage's perspective-origin

    float hash(vec2 p) {
      vec3 q = fract(p.xyx * .1031);
      q += dot(q, q.yzx + 33.33);
      return fract((q.x + q.y) * q.z);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
    }

    // How much lamp light lands on this spot of the wall: a bright middle with a long, soft tail.
    float wash(vec2 s) {
      vec2 d = (s - vec2(0., .5)) * vec2(.85, 1.25);
      float r = dot(d, d);
      return .7 * exp(-r * 7.) + .3 * exp(-r * 1.3);
    }

    // One flute of the wall panels: a shallow cylinder turned toward or away from the lamp, with a dark seam each side.
    float flute(float across, vec2 toLamp) {
      float f = fract(across / uRib) - .5;
      float a = f * 2.3;
      return max(0., sin(a) * toLamp.x + cos(a) * toLamp.y) * smoothstep(.5, .37, abs(f));
    }

    // The light hanging in the air. Across the cone it is rounded, with shoulders that soften as they spread;
    // along it the light thins with distance from the lamp, as it does in real haze. There is no edge to draw.
    float cone(vec2 p, out float across) {
      vec2 d = p - vec2(0., -.3);                    // the lamp hangs above the top of the screen
      across = d.x / (d.y * mix(.035, .44, uOpen));
      float t2 = across * across;
      float body = exp(-t2 * t2 * .85 - t2 * .75);
      float core = exp(-t2 * 8.);
      float fall = 1. / (1. + d.y * d.y * 1.15);
      float land = smoothstep(FOOT + .24, FOOT - .02, p.y);
      float front = smoothstep(0., .24, uReach * 1.5 - .25 - p.y);
      float glow = (body * .66 + core * .34) * fall * land * front * mix(2.4, 1., uOpen);
      if (glow < .002) return 0.;
      float h = log(d.y + .2);
      float streak = noise(vec2(across * 3.2 + 9., uTime * .035));
      float cloud = noise(vec2(across * 1.1 - uTime * .012, h * 2.6 - uTime * .05)) * .6
                  + noise(vec2(across * 2.5 + uTime * .02, h * 5.4 - uTime * .08)) * .4;
      return glow * (.5 + .22 * streak + .5 * cloud);
    }

    // Specks of dust, seen only where the cone lights them.
    float motes(vec2 p, float scale, float speed) {
      vec2 g = p * scale + vec2(sin(uTime * .05 + p.y * 2.) * .35, -uTime * speed);
      vec2 id = floor(g);
      float r = hash(id);
      if (r < .62) return 0.;
      vec2 at = (vec2(hash(id + 3.1), hash(id + 7.7)) - .5) * .7;
      float size = .02 + .05 * hash(id + 11.3);
      return smoothstep(size, size * .2, length(fract(g) - .5 - at)) * (.45 + .55 * sin(uTime * (.4 + r) + r * 40.));
    }

    void main() {
      vec2 p = vec2(gl_FragCoord.x / uSize.y - uSize.x / uSize.y * .5, 1. - gl_FragCoord.y / uSize.y);
      vec2 s = VANISH + (p - VANISH) / uZoom;        // the room as the camera sees it

      float lamp = (.25 + .75 * uOpen) * smoothstep(.5, 1., uReach);
      float lit = wash(s) * lamp * mix(.46, 1., uBeam);
      vec2 toLamp = normalize(vec2(-s.x, .62));
      float rib = flute(s.x + uPan, toLamp);

      // The wall: darker toward the ceiling, the flutes melting away and a soft shadow where it meets the floor.
      float melt = smoothstep(FOOT - .2, FOOT, s.y);
      float shade = mix(rib, .72, melt);
      vec3 wall = uWall * (uGain.x * (.55 + .45 * smoothstep(0., .42, s.y)) + uGain.y * shade * lit) + uLamp * shade * lit * lit * .12;
      wall *= 1. - .4 * smoothstep(FOOT - .09, FOOT, s.y);

      // The floor: a pool of light where the cone lands, and a faint mirror image of the lit wall.
      float depth = max(0., s.y - FOOT);
      vec2 pd = (s - vec2(0., FOOT + .09)) * vec2(1.35, 5.2);
      float pool = exp(-dot(pd, pd) * 1.1) * lamp * uBeam;
      float mirror = wash(vec2(s.x, 2. * FOOT - s.y)) * lamp * mix(.46, 1., uBeam) * exp(-depth * 6.);
      vec3 ground = uFloor * (uGain.x + uGain.y * .3 * mirror) + uLamp * (pool * .2 + mirror * (.035 + .05 * rib));
      ground = mix(ground, uEdge, smoothstep(.08, .34, depth));

      vec3 col = mix(wall, ground, smoothstep(FOOT - .0015, FOOT + .0015, s.y));

      if (uBeam > .002) {
        float across;
        float air = cone(p, across) * uBeam;
        if (air > 0.) {
          float dust = motes(p, 15., .045) + motes(p + 3.7, 27., .03) * .6;
          col += uLamp * air * (uGain.z + dust * 1.1);
        }
      }

      // Falls off into the dark toward the corners.
      vec2 v = p - vec2(0., .46);
      col *= 1. - .34 * smoothstep(.45, 1.25, length(v * vec2(.8, 1.)));

      // Triangular dither over one 8-bit step: this is what keeps slow gradients free of bands.
      vec2 c = gl_FragCoord.xy;
      float d1 = fract(52.9829189 * fract(dot(c, vec2(.06711056, .00583715))));
      float d2 = fract(52.9829189 * fract(dot(c + 17.3, vec2(.06711056, .00583715))));
      gl_FragColor = vec4(col + (d1 + d2 - 1.) / 255., 1.);
    }`;

  const u = {};
  let ready = false;
  let onScreen = true;
  let filmOpen = false;
  let drawnAt = 0;
  const last = {};
  const drifting = root.dataset.motion !== 'reduced';

  /* ---------- Palette: read from the tokens, eased when the theme changes ---------- */
  const token = name => getComputedStyle(root).getPropertyValue(name).trim();
  const color = name => { const hex = token(name); return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); };
  const readPalette = () => [...color('--room-wall'), ...color('--room-floor'), ...color('--bg'), ...color('--room-lamp'), parseFloat(token('--room-ambient')), parseFloat(token('--room-ribs')), parseFloat(token('--room-beam'))];
  let palette = readPalette();
  let paletteDirty = true;
  const setPalette = () => {
    gl.uniform3fv(u.uWall, palette.slice(0, 3));
    gl.uniform3fv(u.uFloor, palette.slice(3, 6));
    gl.uniform3fv(u.uEdge, palette.slice(6, 9));
    gl.uniform3fv(u.uLamp, palette.slice(9, 12));
    gl.uniform3fv(u.uGain, palette.slice(12, 15));
    paletteDirty = false;
  };
  new MutationObserver(() => {
    const target = readPalette();
    if (!window.gsap) { palette = target; paletteDirty = true; return; }
    const from = [...palette];
    const fade = { t: 0 };
    gsap.to(fade, { t: 1, duration: .35, ease: 'power1.inOut', onUpdate: () => {
      palette = from.map((value, i) => value + (target[i] - value) * fade.t);
      paletteDirty = true;
    } });
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- Drawing ---------- */
  function render(now) {
    if (paletteDirty) setPalette();
    gl.uniform1f(u.uTime, now / 1000 % 3600);
    gl.uniform1f(u.uReach, light.reach);
    gl.uniform1f(u.uOpen, light.open);
    gl.uniform1f(u.uBeam, light.opacity);
    gl.uniform1f(u.uPan, light.x / (canvas.height / ratio()));
    gl.uniform1f(u.uZoom, light.zoom);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    KEYS.forEach(key => { last[key] = light[key]; });
    drawnAt = now;
  }

  const ratio = () => Math.min(window.devicePixelRatio || 1, 1.5);
  function resize() {
    const scale = ratio();
    const width = Math.round(room.clientWidth * scale), height = Math.round(room.clientHeight * scale);
    if (!width || !height || (canvas.width === width && canvas.height === height)) return;
    canvas.width = width;
    canvas.height = height;
    if (!ready) return;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(u.uSize, width, height);
    gl.uniform1f(u.uRib, Math.min(40, Math.max(22, room.clientWidth * .024)) / room.clientHeight);
    render(performance.now());
  }

  // Follows the scroll whenever the numbers move. The haze only needs about 36 updates a second, and none at
  // all once the cone has gone, the studio has left the screen, or a film is playing over it.
  function tick() {
    if (!ready || !onScreen || document.hidden) return;
    const now = performance.now();
    const moved = paletteDirty || KEYS.some(key => light[key] !== last[key]);
    const haze = drifting && !filmOpen && light.opacity > .01 && light.reach > 0 && now - drawnAt >= 27;
    if (moved || haze) render(now);
  }

  /* ---------- Starting up: the shader compiles off the main thread where the browser allows it ---------- */
  function build() {
    ready = false;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    const parallel = gl.getExtension('KHR_parallel_shader_compile');
    const finish = () => {
      if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) { setTimeout(finish, 16); return; }
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return; // the CSS room stays
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const corner = gl.getAttribLocation(program, 'a');
      gl.enableVertexAttribArray(corner);
      gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
      ['uSize', 'uTime', 'uRib', 'uReach', 'uOpen', 'uBeam', 'uPan', 'uZoom', 'uWall', 'uFloor', 'uEdge', 'uLamp', 'uGain'].forEach(name => { u[name] = gl.getUniformLocation(program, name); });
      ready = true;
      paletteDirty = true;
      canvas.width = canvas.height = 0;
      resize();
      // Fades in over the CSS room, which then goes away so it isn't painted underneath for nothing.
      requestAnimationFrame(() => root.classList.add('room-lit'));
      setTimeout(() => root.classList.add('room-settled'), 800);
    };
    finish();
  }

  room.appendChild(canvas);
  build();
  new ResizeObserver(resize).observe(room);
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(room);
  document.addEventListener('film:toggle', event => { filmOpen = event.detail.open; });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    ready = false;
    root.classList.remove('room-lit', 'room-settled');
  });
  canvas.addEventListener('webglcontextrestored', build);
  if (window.gsap) gsap.ticker.add(tick);
  else (function loop() { tick(); requestAnimationFrame(loop); })();
})();
