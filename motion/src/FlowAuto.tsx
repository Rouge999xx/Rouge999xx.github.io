import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Body,
  Check,
  Chip,
  clamp,
  Enter,
  Glass,
  Kicker,
  Line,
  sentenceFrame,
  Stage,
  Timeline,
  useProgress,
  useSpring,
  Words,
} from './kit';
import {c, fonts, LEAD, FPS} from './theme';

const L0 = Math.round(LEAD * FPS);
const FLOW = c.flowGrad;

const Row: React.FC<{children: React.ReactNode; gap?: number; style?: React.CSSProperties}> = ({children, gap = 24, style}) => (
  <div style={{display: 'flex', gap, alignItems: 'center', ...style}}>{children}</div>
);

const Mono: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({
  children,
  color = c.muted,
  size = 26,
  style,
}) => <span style={{fontFamily: fonts.mono, fontSize: size, color, ...style}}>{children}</span>;

const StepTag: React.FC<{n: string; label: string}> = ({n, label}) => (
  <Kicker color={c.lime}>
    {n} · {label}
  </Kicker>
);

/* 1. The repetitive loop */
const Hook: React.FC<{line: Line}> = ({line}) => {
  const frame = useCurrentFrame();
  const steps = ['Setup', 'Continuity check', 'Export'];
  const cycle = 22;
  const s2 = sentenceFrame(line, 1);
  const spin = (frame / FPS) * (frame > s2 ? 260 : 90);
  return (
    <Stage style={{justifyContent: 'center'}}>
      <Row gap={120} style={{alignItems: 'center'}}>
        <div style={{flex: 1}}>
          <Kicker>Every multi-scene AI video</Kicker>
          <div style={{height: 30}} />
          <Words text="Same setup. Same checks. Same exports." size={92} grad={['exports.']} delay={L0} />
          <div style={{height: 34}} />
          <Words text="Over, and over again." size={64} stagger={4} delay={s2} style={{color: c.dim}} />
        </div>
        <div style={{width: 560, height: 560, position: 'relative'}}>
          <svg width={560} height={560} style={{position: 'absolute', transform: `rotate(${spin}deg)`}}>
            <circle cx={280} cy={280} r={250} fill="none" stroke={c.accent} strokeOpacity={0.35} strokeWidth={3} strokeDasharray="40 22" />
          </svg>
          {steps.map((s, i) => {
            const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + (spin * Math.PI) / 180;
            const active = Math.floor(frame / cycle) % 3 === i;
            return (
              <div
                key={s}
                style={{
                  position: 'absolute',
                  left: 280 + Math.cos(a) * 250 - 150,
                  top: 280 + Math.sin(a) * 250 - 42,
                  width: 300,
                }}
              >
                <Enter delay={L0 + i * 8} scale={0.7}>
                  <Glass
                    glow={active ? c.pink : undefined}
                    style={{
                      padding: '22px 26px',
                      textAlign: 'center',
                      fontFamily: fonts.display,
                      fontSize: 32,
                      fontWeight: 600,
                      color: active ? c.text : c.muted,
                      background: active ? c.glassStrong : c.glass,
                    }}
                  >
                    {s}
                  </Glass>
                </Enter>
              </div>
            );
          })}
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            <Mono size={30} color={c.pink}>
              scene {String((Math.floor(frame / (cycle * 3)) % 10) + 1).padStart(2, '0')} / 10
            </Mono>
          </AbsoluteFill>
        </div>
      </Row>
    </Stage>
  );
};

/* 2. Introducing Flow Auto */
const Intro: React.FC<{line: Line}> = () => {
  const p = useSpring(L0 - 6, {damping: 12});
  const frame = useCurrentFrame();
  return (
    <Stage style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <div
        style={{
          transform: `scale(${p}) rotate(${(1 - p) * -20}deg)`,
          filter: `drop-shadow(0 0 ${40 + 20 * Math.sin(frame / 12)}px rgba(185,243,107,.45))`,
        }}
      >
        <Img src={staticFile('flow-auto-icon.svg')} style={{width: 220, height: 220}} />
      </div>
      <div style={{height: 34}} />
      <Words text="Flow Auto" size={150} grad={['Flow', 'Auto']} gradient={FLOW} delay={L0 + 6} stagger={6} style={{justifyContent: 'center'}} />
      <div style={{height: 10}} />
      <Body delay={L0 + 40} size={40} style={{maxWidth: 1300, color: c.text}}>
        Scene-by-scene script <span style={{color: c.lime}}>→</span> finished, numbered 1080p videos on Google Flow
      </Body>
      <div style={{height: 40}} />
      <Row gap={18} style={{justifyContent: 'center'}}>
        {['Chrome', 'Edge', 'Manifest V3', 'v0.1.122'].map((t, i) => (
          <Enter key={t} delay={L0 + 70 + i * 6} y={20}>
            <Chip color={i < 2 ? c.lime : c.teal}>{t}</Chip>
          </Enter>
        ))}
      </Row>
    </Stage>
  );
};

/* 3. Import */
const JSON_LINES = [
  '{',
  '  "story": "Ang Lihim",',
  '  "globalRules": "Rainy market, warm light…",',
  '  "scenes": [',
  '    { "n": 1, "title": "Ang Kulang na Pera" },',
  '    { "n": 2, "title": "Ang Tinapay" },',
  '    { "n": 3, "title": "Ang Pasya" },',
  '    …',
  '  ]',
  '}',
];
const Import: React.FC<{line: Line}> = ({line}) => {
  const frame = useCurrentFrame();
  const typed = Math.floor(interpolate(frame, [L0, L0 + 70], [0, JSON_LINES.join('\n').length], clamp));
  const s2 = sentenceFrame(line, 1);
  let left = typed;
  const checks = [
    ['Scenes', '10'],
    ['Batches', '4'],
    ['Global rules', 'v3'],
  ];
  return (
    <Stage>
      <StepTag n="01" label="Import" />
      <div style={{height: 24}} />
      <Words text="Paste a script. It gets checked first." size={76} grad={['checked']} gradient={FLOW} delay={L0} />
      <div style={{height: 50}} />
      <Row gap={50} style={{alignItems: 'stretch', flex: 1}}>
        <Enter delay={L0 + 6} x={-60} y={0} style={{flex: 1.25}}>
          <Glass style={{padding: 36, height: '100%'}}>
            <Row gap={10} style={{marginBottom: 22}}>
              {[c.danger, c.amber, c.lime].map((x) => (
                <span key={x} style={{width: 14, height: 14, borderRadius: 7, background: x, opacity: 0.8}} />
              ))}
              <Mono size={22} color={c.dim} style={{marginLeft: 14}}>
                ChatGPT script · JSON
              </Mono>
            </Row>
            <pre style={{margin: 0, fontFamily: fonts.mono, fontSize: 27, lineHeight: 1.5, color: c.text}}>
              {JSON_LINES.map((l, i) => {
                const show = l.slice(0, Math.max(0, left));
                left -= l.length + 1;
                return (
                  <div key={i} style={{minHeight: 40, color: l.includes('"') ? c.text : c.muted}}>
                    {show.split(/("[^"]*")/).map((part, j) => (
                      <span key={j} style={{color: part.startsWith('"') ? (part.endsWith(':') ? c.accent : c.lime) : undefined}}>
                        {part}
                      </span>
                    ))}
                  </div>
                );
              })}
            </pre>
          </Glass>
        </Enter>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 22, justifyContent: 'center'}}>
          {checks.map(([k, v], i) => (
            <Enter key={k} delay={s2 + i * 12} x={50} y={0}>
              <Glass style={{padding: '26px 32px', display: 'flex', alignItems: 'center', gap: 22}}>
                <Check size={38} />
                <span style={{fontFamily: fonts.display, fontSize: 36, color: c.text, flex: 1}}>{k}</span>
                <Mono size={30} color={c.lime}>
                  {v}
                </Mono>
              </Glass>
            </Enter>
          ))}
          <Enter delay={s2 + 48} y={20}>
            <div
              style={{
                marginTop: 10,
                padding: '22px 30px',
                borderRadius: 18,
                background: FLOW,
                color: '#0b1410',
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: 32,
                textAlign: 'center',
              }}
            >
              Accept & import
            </div>
          </Enter>
        </div>
      </Row>
    </Stage>
  );
};

/* 4. References */
const Reference: React.FC<{line: Line}> = () => {
  const sources = [
    ['Flow', c.lime],
    ['ChatGPT', c.teal],
    ['Grok', c.accent],
    ['Meta AI', c.pink],
  ] as const;
  const files = ['storyboard_01.png', 'storyboard_02.png', 'character_sheet.png', 'storyboard_03.png'];
  return (
    <Stage>
      <StepTag n="02" label="Reference" />
      <div style={{height: 24}} />
      <Words text="Storyboards and character sheets, saved as real PNGs." size={72} grad={['PNGs.']} gradient={FLOW} delay={L0} />
      <div style={{height: 60}} />
      <Row gap={60} style={{flex: 1, alignItems: 'center'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 22, width: 320}}>
          {sources.map(([s, col], i) => (
            <Enter key={s} delay={L0 + 30 + i * 8} x={-40} y={0}>
              <Chip color={col} style={{fontSize: 30, padding: '16px 28px', width: '100%', justifyContent: 'center'}}>
                {s}
              </Chip>
            </Enter>
          ))}
        </div>
        <Flow from={L0 + 50} />
        <div style={{flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26}}>
          {files.map((f, i) => (
            <Enter key={f} delay={L0 + 80 + i * 14} scale={0.85}>
              <Glass style={{padding: 16, borderRadius: 20}}>
                <Thumb i={i} sheet={f.startsWith('character')} />
                <Row gap={10} style={{marginTop: 14}}>
                  <Check size={24} />
                  <Mono size={22} color={c.text}>
                    {f}
                  </Mono>
                </Row>
              </Glass>
            </Enter>
          ))}
        </div>
      </Row>
    </Stage>
  );
};

const Flow: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const p = useProgress(from, 30);
  return (
    <svg width={160} height={300} viewBox="0 0 160 300">
      <defs>
        <linearGradient id="fl" x1="0" x2="1">
          <stop offset="0" stopColor={c.lime} />
          <stop offset="1" stopColor={c.violet} />
        </linearGradient>
      </defs>
      {[40, 110, 190, 260].map((y, i) => (
        <path
          key={y}
          d={`M0 ${y} C 80 ${y}, 80 150, 160 150`}
          fill="none"
          stroke="url(#fl)"
          strokeWidth={3}
          strokeDasharray="10 10"
          strokeDashoffset={-frame * 2}
          opacity={p * (0.5 + 0.12 * i)}
        />
      ))}
    </svg>
  );
};

/** Abstract storyboard frame: a little painted scene, no real imagery needed. */
const Thumb: React.FC<{i: number; sheet?: boolean}> = ({i, sheet}) => {
  const frame = useCurrentFrame();
  const hues = [
    ['#2b1d5c', '#f9a8d4'],
    ['#14303a', '#4ce0c1'],
    ['#2d2a12', '#fcd34d'],
    ['#1a2c18', '#b9f36b'],
  ][i];
  return (
    <div
      style={{
        height: 170,
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(160deg, ${hues[0]}, #0b0820)`,
      }}
    >
      {sheet ? (
        <Row gap={18} style={{position: 'absolute', inset: 0, justifyContent: 'center'}}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.85}}>
              <div style={{width: 38, height: 38, borderRadius: 19, background: hues[1]}} />
              <div style={{width: 54, height: 80, borderRadius: '24px 24px 8px 8px', background: hues[1], opacity: 0.6 - k * 0.12}} />
            </div>
          ))}
        </Row>
      ) : (
        <>
          <div
            style={{
              position: 'absolute',
              width: 90,
              height: 90,
              borderRadius: 45,
              background: hues[1],
              opacity: 0.55,
              top: 22,
              left: 40 + i * 50 + Math.sin(frame / 20 + i) * 6,
              filter: 'blur(2px)',
            }}
          />
          <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'rgba(0,0,0,.35)'}} />
          <div style={{position: 'absolute', bottom: 34, left: 60 + i * 30, width: 26, height: 66, borderRadius: 12, background: '#f5f3ff', opacity: 0.85}} />
        </>
      )}
    </div>
  );
};

/* 5. Generate */
const Generate: React.FC<{line: Line}> = () => {
  const frame = useCurrentFrame();
  const engines = [
    {name: 'Google Flow', sub: 'Standard · Agent', col: c.lime},
    {name: 'Grok Imagine', sub: 'Image to video', col: c.accent},
  ];
  return (
    <Stage>
      <StepTag n="03" label="Generate" />
      <div style={{height: 24}} />
      <Words text="Every scene sent, with its rules and references." size={72} grad={['rules', 'references.']} gradient={FLOW} delay={L0} />
      <div style={{height: 60}} />
      <Row gap={80} style={{flex: 1, alignItems: 'center'}}>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 16}}>
          {[0, 1, 2, 3, 4].map((i) => {
            const sent = L0 + 40 + i * 34;
            const state = frame < sent - 20 ? 'queued' : frame < sent ? 'sending' : 'sent';
            const engine = i % 3 === 2 ? 'Grok Imagine' : 'Flow';
            const fly = interpolate(frame, [sent - 20, sent], [0, 1], clamp);
            return (
              <Enter key={i} delay={L0 + 10 + i * 6} x={-40} y={0}>
                <div style={{position: 'relative'}}>
                  <Glass
                    glow={state === 'sending' ? 'rgba(185,243,107,.4)' : undefined}
                    style={{padding: '18px 26px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 18, background: state === 'sending' ? c.glassStrong : c.glass}}
                  >
                    <Mono size={28} color={c.lime}>
                      {String(i + 1).padStart(2, '0')}
                    </Mono>
                    <span style={{fontFamily: fonts.display, fontSize: 30, color: c.text, flex: 1}}>Scene prompt</span>
                    <Chip color={c.teal} style={{fontSize: 20, padding: '6px 14px'}}>
                      + rules
                    </Chip>
                    <Chip color={c.pink} style={{fontSize: 20, padding: '6px 14px'}}>
                      + reference
                    </Chip>
                    <Mono size={22} color={state === 'sent' ? c.lime : state === 'sending' ? c.amber : c.dim} style={{width: 210, textAlign: 'right'}}>
                      {state === 'sent' ? `→ ${engine}` : state}
                    </Mono>
                  </Glass>
                  {state === 'sending' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: `${100 + fly * 12}%`,
                        width: 16,
                        height: 16,
                        marginTop: -8,
                        borderRadius: 8,
                        background: engine === 'Flow' ? c.lime : c.accent,
                        boxShadow: `0 0 24px ${engine === 'Flow' ? c.lime : c.accent}`,
                        opacity: 1 - fly * 0.6,
                      }}
                    />
                  )}
                </div>
              </Enter>
            );
          })}
        </div>
        <div style={{width: 560, display: 'flex', flexDirection: 'column', gap: 40}}>
          {engines.map((e, i) => {
            const pulse = 0.5 + 0.5 * Math.sin(frame / 8 + i * 2);
            return (
              <Enter key={e.name} delay={L0 + 14 + i * 10} x={60} y={0}>
                <Glass glow={`${e.col}${Math.round(40 + pulse * 50).toString(16)}`} style={{padding: '34px 40px'}}>
                  <div style={{fontFamily: fonts.display, fontWeight: 700, fontSize: 46, color: e.col}}>{e.name}</div>
                  <Mono size={26}>{e.sub}</Mono>
                </Glass>
              </Enter>
            );
          })}
        </div>
      </Row>
    </Stage>
  );
};

/* 6. Upscale + download */
const Export: React.FC<{line: Line}> = ({line}) => {
  const frame = useCurrentFrame();
  const up = useProgress(L0 + 10, 90);
  const s2 = sentenceFrame(line, 0) + 120;
  const res = Math.round(interpolate(up, [0, 1], [720, 1080]));
  return (
    <Stage>
      <Row gap={30}>
        <StepTag n="04" label="Upscale" />
        <StepTag n="05" label="Download" />
      </Row>
      <div style={{height: 24}} />
      <Words text="Flow's own 1080p upscale. Files numbered and verified." size={72} grad={['1080p', 'verified.']} gradient={FLOW} delay={L0} />
      <div style={{height: 56}} />
      <Row gap={60} style={{flex: 1, alignItems: 'flex-start'}}>
        <Enter delay={L0 + 6} style={{flex: 1}}>
          <Glass style={{padding: 40}}>
            <Mono size={24} color={c.dim}>
              UPSCALE THROUGH FLOW
            </Mono>
            <div style={{fontFamily: fonts.display, fontWeight: 700, fontSize: 120, color: c.text, margin: '12px 0'}}>
              {res}p
            </div>
            <div style={{height: 16, borderRadius: 8, background: 'rgba(255,255,255,.08)', overflow: 'hidden'}}>
              <div style={{width: `${up * 100}%`, height: '100%', background: FLOW}} />
            </div>
            <Row gap={14} style={{marginTop: 22, opacity: up > 0.98 ? 1 : 0.3}}>
              <Check />
              <Mono size={24} color={c.text}>
                Nothing re-encoded on your machine
              </Mono>
            </Row>
          </Glass>
        </Enter>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 16}}>
          <Enter delay={s2 - 20} y={10}>
            <Mono size={26} color={c.dim}>
              ~/Downloads/story/
            </Mono>
          </Enter>
          {[1, 2, 3, 4, 5].map((n, i) => {
            const d = s2 + i * 12;
            const ok = frame > d + 18;
            return (
              <Enter key={n} delay={d} x={40} y={0}>
                <Glass style={{padding: '18px 28px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 18}}>
                  <Mono size={30} color={c.text} style={{flex: 1}}>
                    {n}.mp4
                  </Mono>
                  <Mono size={22} color={ok ? c.lime : c.dim}>
                    1920×1080
                  </Mono>
                  <div style={{opacity: ok ? 1 : 0.15}}>
                    <Check size={28} />
                  </div>
                </Glass>
              </Enter>
            );
          })}
        </div>
      </Row>
    </Stage>
  );
};

/* 7. Continuity */
const Continuity: React.FC<{line: Line}> = () => {
  const frame = useCurrentFrame();
  const rules = ['Rainy market at dusk, warm bakery light', 'Lola: 70s, grey bun, blue duster', 'Handheld, 35mm, soft rain on lens'];
  return (
    <Stage>
      <Kicker color={c.teal}>Continuity that sticks</Kicker>
      <div style={{height: 24}} />
      <Words text="The same world in every prompt." size={80} grad={['every']} gradient={FLOW} delay={L0} />
      <div style={{height: 50}} />
      <Row gap={70} style={{flex: 1, alignItems: 'center'}}>
        <Enter delay={L0 + 10} x={-50} y={0} style={{width: 640}}>
          <Glass glow="rgba(76,224,193,.35)" style={{padding: 36}}>
            <Row gap={14} style={{marginBottom: 20}}>
              <Chip color={c.teal}>Global rules · v3</Chip>
            </Row>
            {rules.map((r, i) => (
              <div key={r} style={{fontFamily: fonts.body, fontSize: 28, color: c.text, padding: '12px 0', borderTop: i ? `1px solid ${c.border}` : 'none'}}>
                {r}
              </div>
            ))}
          </Glass>
        </Enter>
        <div style={{flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22}}>
          {['Scene 01 · image', 'Scene 02 · video', 'Scene 03 · image', 'Scene 04 · video'].map((s, i) => {
            const d = L0 + 50 + i * 14;
            const lit = interpolate(frame, [d + 10, d + 25], [0, 1], clamp);
            return (
              <Enter key={s} delay={d} scale={0.9}>
                <Glass style={{padding: 24, borderRadius: 20}}>
                  <Mono size={22} color={c.dim}>
                    {s}
                  </Mono>
                  <div style={{marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10}}>
                    {[0, 1, 2].map((k) => (
                      <div
                        key={k}
                        style={{
                          height: 12,
                          width: `${92 - k * 18}%`,
                          borderRadius: 6,
                          background: k === 0 ? c.teal : 'rgba(255,255,255,.12)',
                          opacity: k === 0 ? lit : 1,
                        }}
                      />
                    ))}
                  </div>
                </Glass>
              </Enter>
            );
          })}
        </div>
      </Row>
    </Stage>
  );
};

/* 8. Resilience */
const Resilience: React.FC<{line: Line}> = ({line}) => {
  const frame = useCurrentFrame();
  const crash = L0 + 50;
  const flash = interpolate(frame, [crash, crash + 3, crash + 14], [0, 1, 0], clamp);
  const s2 = sentenceFrame(line, 1);
  const done = Math.min(6, Math.floor(interpolate(frame, [L0, crash], [2, 5.99], clamp)) + (frame > crash + 30 ? 1 : 0));
  return (
    <Stage>
      <Row gap={70} style={{flex: 1, alignItems: 'center'}}>
        <div style={{flex: 1}}>
          <Kicker color={c.amber}>A queue that survives restarts</Kicker>
          <div style={{height: 24}} />
          <Words text="Crash. Refresh. Carry on." size={86} grad={['Carry', 'on.']} gradient={FLOW} delay={L0} />
          <div style={{height: 26}} />
          <Body delay={L0 + 30}>Submission intent is saved before Generate is pressed, so a result is never sent twice.</Body>
          <div style={{height: 40}} />
          <Enter delay={s2}>
            <Glass glow="rgba(252,211,77,.3)" style={{padding: 32}}>
              <div style={{fontFamily: fonts.display, fontSize: 34, color: c.amber, fontWeight: 600}}>Result unclear for scene 7</div>
              <Row gap={14} style={{marginTop: 20, flexWrap: 'wrap'}}>
                {['Retry export', 'Attach existing', 'Crop one panel'].map((t, i) => (
                  <Enter key={t} delay={s2 + 16 + i * 8} y={14}>
                    <Chip color={i === 0 ? c.amber : c.muted}>{t}</Chip>
                  </Enter>
                ))}
              </Row>
            </Glass>
          </Enter>
        </div>
        <Enter delay={L0 + 6} x={60} y={0} style={{width: 560}}>
          <Glass style={{padding: 30, position: 'relative', overflow: 'hidden'}}>
            <Mono size={22} color={c.dim}>
              QUEUE
            </Mono>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
              const state = n <= done ? 'done' : n === done + 1 ? 'running' : 'waiting';
              return (
                <Row key={n} gap={16} style={{padding: '10px 0', borderTop: n > 1 ? `1px solid ${c.border}` : 'none'}}>
                  <Mono size={24} color={c.text} style={{flex: 1}}>
                    Scene {String(n).padStart(2, '0')}
                  </Mono>
                  <Mono size={20} color={state === 'done' ? c.lime : state === 'running' ? c.amber : c.dim}>
                    {state === 'running' && frame > crash && frame < crash + 30 ? 'resuming…' : state}
                  </Mono>
                </Row>
              );
            })}
            <AbsoluteFill style={{background: '#fff', opacity: flash * 0.5}} />
          </Glass>
        </Enter>
      </Row>
    </Stage>
  );
};

/* 9. MCP */
const Mcp: React.FC<{line: Line}> = ({line}) => {
  const s2 = sentenceFrame(line, 1);
  const s3 = sentenceFrame(line, 2);
  const nodes = [
    ['Claude / Gemini', 'Desktop, CLI, web or phone', c.accent],
    ['Flow Auto MCP', 'Node server on your machine', c.teal],
    ['Flow Auto extension', 'Chrome / Edge', c.lime],
    ['Google Flow', 'Your signed-in project', c.amber],
  ] as const;
  const frame = useCurrentFrame();
  return (
    <Stage>
      <Kicker color={c.accent}>MCP server · 18 tools</Kicker>
      <div style={{height: 24}} />
      <Words text="Claude and Gemini can run it too." size={80} grad={['Claude', 'Gemini']} delay={L0} />
      <div style={{height: 46}} />
      <Row gap={60} style={{flex: 1, alignItems: 'flex-start'}}>
        <div style={{flex: 1.1, display: 'flex', flexDirection: 'column', gap: 18}}>
          <Enter delay={s2} x={40} y={0} style={{alignSelf: 'flex-end'}}>
            <div style={{padding: '18px 26px', borderRadius: '22px 22px 6px 22px', background: c.accentStrong, color: '#1b0b3a', fontFamily: fonts.body, fontSize: 28, fontWeight: 500}}>
              Import tonight's script and check scene 4.
            </div>
          </Enter>
          {[
            ['import_script', '10 scenes · 4 batches'],
            ['get_scene', 'scene 4 · ready'],
          ].map(([tool, out], i) => (
            <Enter key={tool} delay={s2 + 26 + i * 16} x={-30} y={0}>
              <Glass style={{padding: '14px 22px', borderRadius: 14, display: 'flex', gap: 18, alignItems: 'center'}}>
                <Mono size={24} color={c.teal}>
                  {tool}
                </Mono>
                <Mono size={22} color={c.dim}>
                  {out}
                </Mono>
              </Glass>
            </Enter>
          ))}
          <Enter delay={s3} x={-30} y={0}>
            <Glass glow="rgba(196,181,253,.3)" style={{padding: '20px 26px', borderRadius: '22px 22px 22px 6px'}}>
              <span style={{fontFamily: fonts.body, fontSize: 28, color: c.text}}>
                Starting generation spends Flow credits. <span style={{color: c.amber}}>Should I run batch 2?</span>
              </span>
            </Glass>
          </Enter>
        </div>
        <div style={{width: 520, display: 'flex', flexDirection: 'column', gap: 14}}>
          {nodes.map(([n, sub, col], i) => (
            <React.Fragment key={n}>
              <Enter delay={L0 + 20 + i * 10} x={40} y={0}>
                <Glass style={{padding: '18px 26px', borderRadius: 18, borderColor: `${col}66`}}>
                  <div style={{fontFamily: fonts.display, fontSize: 30, fontWeight: 600, color: col}}>{n}</div>
                  <Mono size={20}>{sub}</Mono>
                </Glass>
              </Enter>
              {i < 3 && (
                <div style={{height: 18, display: 'flex', justifyContent: 'center'}}>
                  <div
                    style={{
                      width: 3,
                      height: '100%',
                      background: `repeating-linear-gradient(${c.muted} 0 4px, transparent 4px 8px)`,
                      backgroundPositionY: frame,
                      opacity: 0.6,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </Row>
    </Stage>
  );
};

/* 10. Private by design */
const Private: React.FC<{line: Line}> = ({line}) => {
  const items = ['Hosted backend', 'API keys', 'Analytics'];
  const frame = useCurrentFrame();
  const sLast = sentenceFrame(line, line.sentences.length - 1);
  return (
    <Stage style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <Kicker color={c.lime}>Private by design</Kicker>
      <div style={{height: 50}} />
      <Row gap={36} style={{justifyContent: 'center'}}>
        {items.map((t, i) => {
          const d = sentenceFrame(line, i);
          const strike = interpolate(frame, [d + 10, d + 22], [0, 100], clamp);
          return (
            <Enter key={t} delay={d - 4} scale={0.85}>
              <Glass style={{padding: '30px 44px', position: 'relative'}}>
                <span style={{fontFamily: fonts.display, fontSize: 48, fontWeight: 600, color: strike > 50 ? c.dim : c.text}}>{t}</span>
                <div style={{position: 'absolute', left: 30, top: '50%', height: 4, width: `calc(${strike}% - 60px)`, background: c.danger, borderRadius: 2}} />
              </Glass>
            </Enter>
          );
        })}
      </Row>
      <div style={{height: 70}} />
      <Words text="Runs in your own signed-in browser." size={84} grad={['your', 'own']} gradient={FLOW} delay={sLast} style={{justifyContent: 'center'}} />
    </Stage>
  );
};

/* 11. Outro */
const Outro: React.FC<{line: Line}> = () => {
  const p = useSpring(L0 - 10, {damping: 14});
  return (
    <Stage style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <div style={{transform: `scale(${p})`, filter: 'drop-shadow(0 0 50px rgba(185,243,107,.45))'}}>
        <Img src={staticFile('flow-auto-icon.svg')} style={{width: 180, height: 180}} />
      </div>
      <div style={{height: 30}} />
      <Words text="Flow Auto" size={130} grad={['Flow', 'Auto']} gradient={FLOW} delay={L0} stagger={6} style={{justifyContent: 'center'}} />
      <Words text="A production line for AI video." size={56} delay={L0 + 30} style={{justifyContent: 'center', color: c.muted, fontWeight: 500}} />
      <div style={{height: 56}} />
      <Enter delay={L0 + 70}>
        <Chip color={c.accent} style={{fontSize: 28, padding: '14px 30px'}}>
          Built by Carl Tampus · rouge999xx.github.io
        </Chip>
      </Enter>
    </Stage>
  );
};

export const FlowAutoVideo: React.FC = () => (
  <Timeline
    video="flowauto"
    tint="flow"
    scenes={{
      hook: Hook,
      intro: Intro,
      import: Import,
      reference: Reference,
      generate: Generate,
      export: Export,
      continuity: Continuity,
      resilience: Resilience,
      mcp: Mcp,
      private: Private,
      outro: Outro,
    }}
  />
);
