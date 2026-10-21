import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  getInputProps,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import timing from './timing.json';
import {c, FPS, fonts, LEAD, OUTRO, TAIL, accentWord} from './theme';

export type Sentence = {text: string; start: number; end: number};
export type Line = {id: string; seconds: number; sentences: Sentence[]};
export type VideoId = keyof typeof timing;

export const lines = (video: VideoId) => timing[video] as Line[];
export const sceneFrames = (l: Line, outro = 0) => Math.ceil((LEAD + l.seconds + TAIL + outro) * FPS);
/** Scene lengths for a video; the last scene carries the video's outro hold. */
export const sceneLengths = (video: VideoId) => {
  const ls = lines(video);
  return ls.map((l, i) => sceneFrames(l, i === ls.length - 1 ? OUTRO[video] ?? 0 : 0));
};
export const totalFrames = (video: VideoId) => sceneLengths(video).reduce((n, d) => n + d, 0);

/** Frame (inside a scene) at which the narrator starts sentence i. */
export const sentenceFrame = (l: Line, i: number) => Math.round((LEAD + l.sentences[i].start) * FPS);

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const useSpring = (delay = 0, config: {damping?: number; stiffness?: number; mass?: number} = {}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping: 16, stiffness: 120, mass: 0.8, ...config}});
};

/** 0→1 over [from, from+dur] frames with an expo ease. */
export const useProgress = (from: number, dur: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, from + dur], [0, 1], {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)});
};

/** Fade + lift in, and fade out near the end of the scene. */
export const Enter: React.FC<{
  delay?: number;
  y?: number;
  x?: number;
  scale?: number;
  blur?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({delay = 0, y = 40, x = 0, scale = 1, blur = true, style, children}) => {
  const p = useSpring(delay);
  return (
    <div
      style={{
        opacity: interpolate(p, [0, 1], [0, 1], clamp),
        transform: `translate(${(1 - p) * x}px, ${(1 - p) * y}px) scale(${interpolate(p, [0, 1], [scale, 1])})`,
        filter: blur ? `blur(${(1 - Math.min(1, p)) * 12}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Aurora glass background: drifting colour blobs, a fine grid and grain. */
export const Aurora: React.FC<{tint?: 'aurora' | 'flow'}> = ({tint = 'aurora'}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const blobs =
    tint === 'flow'
      ? [c.lime, c.teal, c.violet, c.accentStrong]
      : [c.accentStrong, c.pink, c.amber, '#1e3a8a'];
  const pos = [
    [18 + 8 * Math.sin(t * 0.21), 22 + 7 * Math.cos(t * 0.17)],
    [80 + 7 * Math.cos(t * 0.19), 28 + 9 * Math.sin(t * 0.23)],
    [70 + 9 * Math.sin(t * 0.15), 84 + 6 * Math.cos(t * 0.2)],
    [26 + 6 * Math.cos(t * 0.13), 80 + 8 * Math.sin(t * 0.18)],
  ];
  return (
    <AbsoluteFill style={{background: c.bg, overflow: 'hidden'}}>
      {blobs.map((col, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${pos[i][0]}%`,
            top: `${pos[i][1]}%`,
            width: 980,
            height: 980,
            marginLeft: -490,
            marginTop: -490,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${col} 0%, transparent 62%)`,
            opacity: i === 3 ? 0.22 : 0.3,
            filter: 'blur(40px)',
          }}
        />
      ))}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          backgroundPosition: `${(t * 6) % 80}px ${(t * 10) % 80}px`,
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 78%)',
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(3,6,14,.78) 100%)'}} />
    </AbsoluteFill>
  );
};

export const Glass: React.FC<{style?: React.CSSProperties; children?: React.ReactNode; glow?: string}> = ({
  style,
  children,
  glow,
}) => (
  <div
    style={{
      background: c.glass,
      border: `1px solid ${c.border}`,
      borderRadius: 26,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.16), 0 40px 100px -20px rgba(2,6,16,.75)${
        glow ? `, 0 0 80px -10px ${glow}` : ''
      }`,
      backdropFilter: 'blur(18px)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Chip: React.FC<{children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({
  children,
  color = c.accent,
  style,
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 20px',
      borderRadius: 999,
      border: `1px solid ${color}55`,
      background: `${color}1f`,
      color,
      fontFamily: fonts.mono,
      fontSize: 24,
      letterSpacing: 0.5,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

export const Kicker: React.FC<{children: React.ReactNode; color?: string; delay?: number}> = ({
  children,
  color = c.accent,
  delay = 0,
}) => (
  <Enter delay={delay} y={16}>
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 26,
        letterSpacing: 4,
        textTransform: 'uppercase',
        color,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <span style={{width: 44, height: 2, background: color, display: 'inline-block'}} />
      {children}
    </div>
  </Enter>
);

/** Headline revealed word by word. `grad` words get the brand gradient. */
export const Words: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  stagger?: number;
  grad?: string[];
  gradient?: string;
  style?: React.CSSProperties;
}> = ({text, delay = 0, size = 96, stagger = 3, grad = [], gradient = c.grad, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: -size * 0.03,
        color: c.text,
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: size * 0.26,
        ...style,
      }}
    >
      {text.split(' ').map((w, i) => {
        const p = spring({frame: frame - delay - i * stagger, fps, config: {damping: 18, stiffness: 140}});
        const g = grad.includes(w.replace(/[.,!?]/g, ''));
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.08}}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - p) * 105}%)`,
                opacity: p,
                ...(g
                  ? {...accentWord}
                  : {}),
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const Body: React.FC<{children: React.ReactNode; delay?: number; size?: number; style?: React.CSSProperties}> = ({
  children,
  delay = 0,
  size = 36,
  style,
}) => (
  <Enter delay={delay} y={20}>
    <p style={{fontFamily: fonts.body, fontSize: size, lineHeight: 1.45, color: c.muted, margin: 0, ...style}}>
      {children}
    </p>
  </Enter>
);

/** Burned-in subtitles, timed to each narrated sentence. */
export const Captions: React.FC<{line: Line}> = ({line}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS - LEAD;
  const s = line.sentences.find((x, i) => t >= x.start - 0.05 && t < (line.sentences[i + 1]?.start ?? x.end + TAIL));
  if (!s) return null;
  const local = t - s.start;
  const o = interpolate(local, [-0.05, 0.15], [0, 1], clamp);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 54, pointerEvents: 'none'}}>
      <div
        style={{
          opacity: o,
          maxWidth: 1500,
          padding: '14px 30px',
          borderRadius: 16,
          background: 'rgba(8,5,22,.62)',
          border: '1px solid rgba(255,255,255,.08)',
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 34,
          lineHeight: 1.35,
          color: c.text,
          textAlign: 'center',
        }}
      >
        {s.text}
      </div>
    </AbsoluteFill>
  );
};

/** Music sits at 0.16 between lines and ducks to 0.06 under the narrator, with short ramps. */
const musicVolume = (video: VideoId, f: number, total: number) => {
  const ramp = 8;
  let from = 0;
  let duck = 0;
  for (const l of lines(video)) {
    const a = from + LEAD * FPS;
    const b = a + l.seconds * FPS;
    duck = Math.max(duck, interpolate(f, [a - ramp, a, b, b + ramp], [0, 1, 1, 0], clamp));
    from += sceneFrames(l);
  }
  const fade = interpolate(f, [0, 30, total - 60, total], [0, 1, 1, 0], clamp);
  return fade * (0.16 - 0.1 * duck);
};

/** Lays scenes end to end, each with its own voiceover clip and captions, over one music bed. */
export const Timeline: React.FC<{
  video: VideoId;
  scenes: Record<string, React.FC<{line: Line}>>;
  tint?: 'aurora' | 'flow';
}> = ({video, scenes, tint}) => {
  const frame = useCurrentFrame();
  const total = totalFrames(video);
  const withAudio = getInputProps().audio !== false;
  let from = 0;
  return (
    <AbsoluteFill style={{background: c.bg}}>
      <Aurora tint={tint} />
      {withAudio && <Audio src={staticFile('music/bed.wav')} volume={(f) => musicVolume(video, f, total)} />}
      {lines(video).map((l) => {
        const dur = sceneFrames(l);
        const Scene = scenes[l.id];
        const start = from;
        from += dur;
        const local = frame - start;
        const fade = interpolate(local, [0, 10, dur - 10, dur], [0, 1, 1, 0], clamp);
        return (
          <Sequence key={l.id} from={start} durationInFrames={dur} name={l.id}>
            <AbsoluteFill style={{opacity: fade}}>
              <Scene line={l} />
            </AbsoluteFill>
            {withAudio && (
              <Sequence from={Math.round(LEAD * FPS)}>
                <Audio src={staticFile(`vo/${video}/${l.id}.wav`)} />
              </Sequence>
            )}
            {getInputProps().captions !== false && <Captions line={l} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Standard scene frame: generous padding, content stays above the caption band. */
export const Stage: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <AbsoluteFill style={{padding: '110px 140px 190px', ...style}}>{children}</AbsoluteFill>
);

export const Check: React.FC<{size?: number; color?: string}> = ({size = 30, color = c.lime}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
