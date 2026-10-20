// Motion and sound-design layer for the intro video: camera moves, whip transitions, light
// sweeps, particles, grain, hit-aligned sound effects and the scored music bed.
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  getInputProps,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Aurora, clamp, Line, lines, sceneLengths, VideoId} from './kit';
import {c, FPS, fonts, LEAD, TAIL} from './theme';

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/* ---------- Sound effects ---------- */

/** Seconds from the start of each SFX file to its audible hit (matches scripts/sfx.py). */
export const SFX_HIT: Record<string, number> = {
  whoosh: 0.45,
  whoosh_short: 0.17,
  impact: 0,
  riser: 2.0,
  reverse: 1.2,
  pop: 0.004,
  click: 0,
  tick_soft: 0,
  shimmer: 0.08,
  glitch: 0,
  success: 0,
  logo_sting: 0.3,
};

/** Default level per effect, set so nothing fights the narrator. */
const SFX_VOL: Record<string, number> = {
  whoosh: 0.35,
  whoosh_short: 0.25,
  impact: 0.5,
  riser: 0.3,
  reverse: 0.3,
  pop: 0.3,
  click: 0.25,
  tick_soft: 0.18,
  shimmer: 0.3,
  glitch: 0.22,
  success: 0.3,
  logo_sting: 0.45,
};

/** Per-file trim on top of every placement, from the measured levels in public/sfx/cues.json. */
const SFX_TRIM: Record<string, number> = {tick_soft: 3, pop: 1.4, click: 1.3, shimmer: 1.3, success: 1.3, whoosh: 1.2, whoosh_short: 1.3, glitch: 1.3, logo_sting: 1.4};

/** Plays an effect so its hit lands exactly on frame `at` (relative to the enclosing Sequence). */
export const Sfx: React.FC<{name: string; at: number; volume?: number}> = ({name, at, volume}) => {
  const from = Math.round(at - (SFX_HIT[name] ?? 0) * FPS);
  return (
    <Sequence from={from} name={`sfx:${name}`} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={(volume ?? SFX_VOL[name] ?? 0.3) * (SFX_TRIM[name] ?? 1)} />
    </Sequence>
  );
};

/* ---------- Small motion helpers ---------- */

export const useEase = (from: number, dur: number, fn = ease) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, from + dur], [0, 1], {...clamp, easing: fn});
};

/** Decaying screen shake that starts at `at`. Returns a CSS transform. */
export const useShake = (at: number, strength = 14, dur = 14) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > dur) return 'none';
  const k = (1 - t / dur) ** 2 * strength;
  return `translate(${Math.sin(t * 2.7) * k}px, ${Math.cos(t * 3.9) * k * 0.7}px)`;
};

/** Number that counts up from 0 between two frames. */
export const CountUp: React.FC<{to: number; from: number; dur?: number; style?: React.CSSProperties}> = ({to, from, dur = 30, style}) => {
  const p = useEase(from, dur);
  return <span style={{fontVariantNumeric: 'tabular-nums', ...style}}>{Math.round(to * p)}</span>;
};

/** Text typed out character by character, with a blinking caret while typing. */
export const Typewriter: React.FC<{text: string; from: number; cps?: number; style?: React.CSSProperties}> = ({text, from, cps = 22, style}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - from) / FPS) * cps)));
  const typing = n < text.length;
  const caret = typing || Math.floor(frame / 15) % 2 === 0;
  return (
    <span style={style}>
      {text.slice(0, n)}
      <span style={{opacity: frame >= from && caret ? 1 : 0, marginLeft: 2, fontWeight: 300}}>|</span>
    </span>
  );
};

/** Frames at which a Typewriter reveals each character, for syncing key ticks. */
export const typeFrames = (text: string, from: number, cps = 22, every = 2) =>
  Array.from({length: Math.ceil(text.length / every)}, (_, i) => from + Math.round(((i * every) / cps) * FPS));

/** 3D card entrance: swings in from a tilt with depth, settles flat. */
export const Tilt: React.FC<{delay: number; from?: 'left' | 'right' | 'bottom'; style?: React.CSSProperties; children: React.ReactNode}> = ({
  delay,
  from = 'right',
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 17, stiffness: 90, mass: 0.9}});
  const rot = (1 - p) * (from === 'bottom' ? 0 : from === 'right' ? -32 : 32);
  const rotX = from === 'bottom' ? (1 - p) * 40 : 0;
  return (
    <div style={{perspective: 1600, ...style}}>
      <div
        style={{
          opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
          transform: `translate3d(${(1 - p) * (from === 'right' ? 160 : from === 'left' ? -160 : 0)}px, ${(1 - p) * (from === 'bottom' ? 120 : 0)}px, ${(1 - p) * -300}px) rotateY(${rot}deg) rotateX(${rotX}deg)`,
          filter: `blur(${(1 - Math.min(1, p)) * 10}px)`,
          height: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Radial burst of sparks from a point, starting at frame `at`. */
export const Burst: React.FC<{at: number; x: number; y: number; count?: number; colors?: string[]; radius?: number; seed?: string}> = ({
  at,
  x,
  y,
  count = 26,
  colors = [c.accent, c.pink, c.amber],
  radius = 360,
  seed = 'b',
}) => {
  const frame = useCurrentFrame();
  const t = (frame - at) / 26;
  if (t < 0 || t > 1) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: count}, (_, i) => {
        const a = (i / count) * Math.PI * 2 + random(`${seed}a${i}`) * 0.4;
        const r = radius * (0.5 + random(`${seed}r${i}`) * 0.6) * Easing.out(Easing.cubic)(t);
        const size = 4 + random(`${seed}s${i}`) * 6;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.cos(a) * r - size / 2,
              top: y + Math.sin(a) * r - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: colors[i % colors.length],
              boxShadow: `0 0 ${size * 3}px ${colors[i % colors.length]}`,
              opacity: 1 - t,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Horizontal light sweep across a panel (for shiny reveals). */
export const Sheen: React.FC<{at: number; dur?: number; width?: number}> = ({at, dur = 24, width = 2000}) => {
  const p = useEase(at, dur, Easing.inOut(Easing.cubic));
  if (p <= 0 || p >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: -40,
        bottom: -40,
        left: -300 + p * (width + 600),
        width: 180,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent)',
        transform: 'skewX(-20deg)',
        pointerEvents: 'none',
      }}
    />
  );
};

/* ---------- Atmosphere ---------- */

/** Slow bokeh dust drifting upward, deterministic per frame. */
const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: 38}, (_, i) => {
        const speed = 0.25 + random(`ps${i}`) * 0.7;
        const size = 2 + random(`pz${i}`) * (i % 7 === 0 ? 14 : 5);
        const x = random(`px${i}`) * 1920 + Math.sin(frame / 60 + i) * 18;
        const y = (((random(`py${i}`) * 1180 - frame * speed) % 1180) + 1180) % 1180 - 50;
        const col = [c.accent, c.pink, c.amber, '#ffffff'][i % 4];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: col,
              opacity: (0.12 + random(`po${i}`) * 0.3) * (0.6 + 0.4 * Math.sin(frame / 20 + i)),
              filter: size > 8 ? 'blur(3px)' : undefined,
              boxShadow: `0 0 ${size * 2}px ${col}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Film grain plus a soft vignette. The noise seed changes every other frame. */
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.16}}>
      <svg width="1920" height="1080">
        <filter id={`g${frame % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(frame / 2) % 6} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1920" height="1080" filter={`url(#g${frame % 6})`} />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- Camera and transitions ---------- */

const IN = 14; // frames of the entry move
/** Each scene's visuals start this many frames before its slot, so the next scene is already landing during the cut. */
export const PRE = 8;
const OUT = 10; // frames of the exit move

/**
 * Per-scene camera: whips in from the side with zoom and motion blur, drifts slowly forward while
 * the scene plays, and punches out in the cut direction at the end.
 */
const Camera: React.FC<{dur: number; dir: number; first: boolean; last: boolean; children: React.ReactNode}> = ({dur, dir, first, last, children}) => {
  const frame = useCurrentFrame();
  const pin = first ? interpolate(frame, [0, 24], [0, 1], {...clamp, easing: ease}) : interpolate(frame, [0, IN], [0, 1], {...clamp, easing: ease});
  const pout = last ? interpolate(frame, [dur - 14, dur], [0, 1], {...clamp, easing: easeIn}) : interpolate(frame, [dur - OUT, dur], [0, 1], {...clamp, easing: easeIn});
  const drift = interpolate(frame, [0, dur], [1, 1.035]);
  const x = first || last ? 0 : (1 - pin) * 260 * dir - pout * 260 * dir;
  const scale = drift * (first ? 1.06 - 0.06 * pin : 1.1 - 0.1 * pin) * (last ? 1 : 1 + pout * 0.08);
  const blur = (1 - pin) * (first ? 10 : 22) + pout * (last ? 6 : 18);
  const opacity = Math.min(pin * 1.6, 1 - pout * (last ? 1 : 0.85));
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${x}px) scale(${scale})`,
        filter: blur > 0.3 ? `blur(${blur}px) brightness(${1 + (1 - pin) * 0.4 + pout * 0.3})` : undefined,
        opacity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** A bright diagonal streak and a quick bloom that ride across each cut. */
const CutFlash: React.FC<{at: number; dir: number}> = ({at, dir}) => {
  const frame = useCurrentFrame();
  const t = (frame - (at - 9)) / 18;
  if (t < 0 || t > 1) return null;
  const bloom = Math.sin(t * Math.PI);
  const x = dir > 0 ? interpolate(t, [0, 1], [2300, -700]) : interpolate(t, [0, 1], [-700, 2300]);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at ${dir > 0 ? 70 : 30}% 50%, rgba(196,181,253,${0.28 * bloom}), transparent 70%)`}} />
      <div
        style={{
          position: 'absolute',
          top: -300,
          bottom: -300,
          left: x,
          width: 220,
          transform: 'rotate(18deg)',
          background: 'linear-gradient(90deg, transparent, rgba(249,168,212,.35), rgba(255,255,255,.55), rgba(252,211,77,.3), transparent)',
          filter: 'blur(18px)',
          opacity: bloom,
        }}
      />
    </AbsoluteFill>
  );
};

/** Burned-in captions: a clean lower third with a thin bar tracking the sentence. */
const Captions: React.FC<{line: Line}> = ({line}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS - LEAD;
  const i = line.sentences.findIndex((x, k) => t >= x.start - 0.05 && t < (line.sentences[k + 1]?.start ?? x.end + TAIL - 0.15));
  if (i < 0) return null;
  const s = line.sentences[i];
  const local = t - s.start;
  const o = interpolate(local, [-0.05, 0.18], [0, 1], clamp) * interpolate(t, [s.end + TAIL - 0.45, s.end + TAIL - 0.15], [1, 0], clamp);
  const prog = interpolate(t, [s.start, s.end], [0, 1], clamp);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 50, pointerEvents: 'none'}}>
      <div
        style={{
          opacity: o,
          transform: `translateY(${(1 - o) * 10}px)`,
          maxWidth: 1480,
          padding: '14px 30px 16px',
          borderRadius: 16,
          background: 'rgba(8,5,22,.66)',
          border: '1px solid rgba(255,255,255,.08)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,.6)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{fontFamily: fonts.body, fontWeight: 500, fontSize: 33, lineHeight: 1.35, color: c.text, textAlign: 'center'}}>{s.text}</div>
        <div style={{position: 'absolute', left: 0, bottom: 0, height: 3, width: `${prog * 100}%`, background: c.grad, opacity: 0.85}} />
      </div>
    </AbsoluteFill>
  );
};

/** Music bed level: sits at `base` between lines and ducks under the narrator with short ramps. */
const musicVolume = (video: VideoId, f: number, total: number, base = 0.22, ducked = 0.075) => {
  const ramp = 9;
  const lens = sceneLengths(video);
  let from = 0;
  let duck = 0;
  lines(video).forEach((l, i) => {
    const a = from + LEAD * FPS;
    const b = a + l.seconds * FPS;
    duck = Math.max(duck, interpolate(f, [a - ramp, a, b, b + ramp * 1.5], [0, 1, 1, 0], clamp));
    from += lens[i];
  });
  const fade = interpolate(f, [0, 6, total - 4, total], [0, 1, 1, 0], clamp);
  return fade * (base - (base - ducked) * duck);
};

/** The intro's timeline: scenes with camera moves and cut flashes, voiceover, captions, score and SFX. */
export const ShowTimeline: React.FC<{video: VideoId; scenes: Record<string, React.FC<{line: Line; dur: number}>>}> = ({video, scenes}) => {
  const total = sceneLengths(video).reduce((a, b) => a + b, 0);
  const lens = sceneLengths(video);
  const ls = lines(video);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  const captions = getInputProps().captions !== false;
  return (
    <AbsoluteFill style={{background: c.bg}}>
      <Aurora />
      <Particles />
      <Audio src={staticFile('music/intro.wav')} volume={(f) => musicVolume(video, f, total)} />
      {ls.map((l, i) => {
        const Scene = scenes[l.id];
        const dir = i % 2 === 0 ? 1 : -1;
        return (
          <React.Fragment key={l.id}>
            <Sequence from={starts[i] - (i ? PRE : 0)} durationInFrames={lens[i] + (i ? PRE : 0)} name={l.id}>
              <Camera dur={lens[i] + (i ? PRE : 0)} dir={dir} first={i === 0} last={i === ls.length - 1}>
                <Scene line={l} dur={lens[i] + (i ? PRE : 0)} />
              </Camera>
            </Sequence>
            <Sequence from={starts[i]} durationInFrames={lens[i]} name={`${l.id} audio`}>
            <Sequence from={Math.round(LEAD * FPS)} layout="none">
              <Audio src={staticFile(`vo/${video}/${l.id}.wav`)} />
            </Sequence>
            {captions && <Captions line={l} />}
            </Sequence>
          </React.Fragment>
        );
      })}
      {starts.slice(1).map((s, i) => (
        <React.Fragment key={s}>
          <CutFlash at={s} dir={(i + 1) % 2 === 0 ? 1 : -1} />
          <Sfx name="whoosh" at={s} />
        </React.Fragment>
      ))}
      <Grain />
    </AbsoluteFill>
  );
};
