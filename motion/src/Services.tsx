import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Body, Check, Chip, clamp, Enter, Glass, Kicker, Line, sentenceFrame, Stage, useSpring, Words} from './kit';
import {Burst, CountUp, PRE, Sfx, Sheen, ShowTimeline, Tilt, typeFrames, Typewriter, useEase, useShake} from './fx';
import {c, fonts, FPS, LEAD, TAIL, accentWord} from './theme';

const L0 = Math.round(LEAD * FPS);
type SceneProps = {line: Line; dur: number};

const Row: React.FC<{children: React.ReactNode; gap?: number; style?: React.CSSProperties}> = ({children, gap = 24, style}) => (
  <div style={{display: 'flex', gap, alignItems: 'center', ...style}}>{children}</div>
);

/** Headline whose words slam in from large and blurred, for the big statement beats. */
const Slam: React.FC<{text: string; delay: number; size: number; grad?: string[]; stagger?: number; style?: React.CSSProperties}> = ({
  text,
  delay,
  size,
  grad = [],
  stagger = 4,
  style,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: size * 0.26, fontFamily: fonts.display, fontWeight: 600, fontSize: size, lineHeight: 1.04, letterSpacing: -size * 0.03, color: c.text, ...style}}>
      {text.split(' ').map((w, i) => {
        const p = interpolate(frame, [delay + i * stagger, delay + i * stagger + 9], [0, 1], {...clamp, easing: Easing.bezier(0.2, 0.9, 0.3, 1.25)});
        const g = grad.includes(w.replace(/[.,!?]/g, ''));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: interpolate(p, [0, 0.5], [0, 1], clamp),
              transform: `scale(${interpolate(p, [0, 1], [1.9, 1])})`,
              filter: `blur(${(1 - Math.min(p, 1)) * 16}px)`,
              paddingBottom: size * 0.08,
              ...(g ? {...accentWord} : {}),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/* 1. Hook: chaotic manual tasks glitch in, then get pulled away */
const Hook: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const notes = ['Copy to sheet', 'Re-type records', 'Chase updates', 'Export again', 'Rename files', 'Manual SMS', 'Double-check', 'Paste into form'];
  const pull = interpolate(frame, [dur - 30, dur - 6], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const shake = useShake(L0 - 2, 10, 12);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      {notes.map((n, i) => {
        const a = (i / notes.length) * Math.PI * 2;
        const rx = 760 + (i % 2) * 40;
        const ry = 380 + (i % 2) * 40;
        const wob = Math.sin(frame / 9 + i) * 10;
        const born = 2 + i * 3;
        const glitch = frame - born >= 0 && frame - born < 8;
        const jx = glitch ? Math.sin(frame * 13 + i) * 14 : 0;
        const x = 960 + Math.cos(a + 0.4 + frame / 260) * rx * (1 - pull) - 130;
        const y = 520 + Math.sin(a + 0.4 + frame / 260) * ry * (1 - pull) - 30;
        return (
          <div
            key={n}
            style={{
              position: 'absolute',
              left: x + jx,
              top: y,
              opacity: frame < born ? 0 : 1 - pull,
              transform: `rotate(${((i * 37) % 24) - 12 + wob * 0.3 + pull * 180}deg) scale(${1 - pull * 0.7})`,
            }}
          >
            <Glass
              style={{
                padding: '16px 26px',
                borderRadius: 14,
                fontFamily: fonts.mono,
                fontSize: 26,
                color: i % 3 === 0 ? c.danger : c.dim,
                textShadow: glitch ? `3px 0 ${c.pink}, -3px 0 ${c.teal}` : undefined,
                borderColor: i % 3 === 0 ? 'rgba(252,165,165,.35)' : c.border,
              }}
            >
              {i % 3 === 0 ? '⚠ ' : ''}
              {n}
            </Glass>
          </div>
        );
      })}
      <div style={{textAlign: 'center', maxWidth: 1300, transform: `${shake} scale(${1 + pull * 0.06})`, opacity: 1 - pull * 0.6}}>
        <Slam text="Slow, messy workflow eating your team's time?" size={108} grad={['time?']} delay={L0 - 4} stagger={3} />
      </div>
      <Sfx name="glitch" at={2} volume={0.18} />
      <Sfx name="glitch" at={11} volume={0.14} />
      <Sfx name="glitch" at={20} volume={0.14} />
      <Sfx name="impact" at={L0 - 3} volume={0.3} />
      <Sfx name="whoosh_short" at={dur - 10} volume={0.22} />
    </AbsoluteFill>
  );
};

/* 2. Intro: ring draws on, portrait irises open, name lands */
const Intro: React.FC<SceneProps> = ({line}) => {
  const frame = useCurrentFrame();
  const s2 = sentenceFrame(line, 1);
  const ring = useEase(2, 34);
  const iris = useEase(8, 26);
  const pop = useSpring(6, {damping: 13});
  const R = 300;
  const circ = 2 * Math.PI * R;
  const underline = useEase(s2 + 14, 22);
  return (
    <Stage style={{justifyContent: 'center'}}>
      <Burst at={30} x={140 + 280} y={540} seed="intro" radius={460} />
      <Row gap={110}>
        <div style={{position: 'relative', width: 560, height: 560, transform: `scale(${0.85 + 0.15 * pop})`}}>
          <div
            style={{
              position: 'absolute',
              inset: -18,
              borderRadius: '50%',
              background: `conic-gradient(from ${frame * 2}deg, ${c.accent}, ${c.pink}, ${c.amber}, ${c.accent})`,
              filter: 'blur(2px)',
              opacity: iris,
            }}
          />
          <div style={{position: 'absolute', inset: -60, borderRadius: '50%', boxShadow: `0 0 120px 10px rgba(59,116,238,${0.35 * iris})`}} />
          <Img
            src={staticFile('portrait.webp')}
            style={{
              position: 'absolute',
              inset: 0,
              width: 560,
              height: 560,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `8px solid ${c.bg}`,
              clipPath: `circle(${iris * 52}% at 50% 50%)`,
              transform: `scale(${1.15 - 0.15 * iris})`,
            }}
          />
          <svg width={680} height={680} style={{position: 'absolute', left: -60, top: -60, transform: `rotate(${-90 + frame * 0.4}deg)`}}>
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={c.accent} />
                <stop offset=".5" stopColor={c.pink} />
                <stop offset="1" stopColor={c.amber} />
              </linearGradient>
            </defs>
            <circle cx={340} cy={340} r={R} fill="none" stroke="url(#ring)" strokeWidth={3} strokeLinecap="round" strokeDasharray={`${circ * ring * 0.82} ${circ}`} opacity={0.9} />
            <circle cx={340} cy={340} r={R + 22} fill="none" stroke={c.accent} strokeWidth={1.5} strokeDasharray="2 14" opacity={0.35 * ring} />
          </svg>
          <div style={{position: 'absolute', right: -10, bottom: 40}}>
            <Enter delay={L0 + 40} scale={0.6}>
              <Chip color={c.lime} style={{background: 'rgba(8,16,34,.85)'}}>
                ● Open to work
              </Chip>
            </Enter>
          </div>
        </div>
        <div style={{flex: 1}}>
          <Kicker delay={4}>Hi, I'm</Kicker>
          <div style={{height: 16}} />
          <Words text="Carl Tampus" size={140} grad={['Tampus']} delay={L0} stagger={5} />
          <div style={{height: 14}} />
          <Enter delay={L0 + 24} y={20}>
            <Row gap={14}>
              <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={c.pink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
              <span style={{fontFamily: fonts.body, fontSize: 38, color: c.muted}}>Computer Engineering student · Cebu, Philippines</span>
            </Row>
          </Enter>
          <div style={{height: 50}} />
          <div style={{display: 'inline-block', position: 'relative'}}>
            <Words text="I build software that feels alive." size={66} grad={['alive.']} delay={s2} style={{fontWeight: 600}} />
            <div style={{height: 4, width: `${underline * 100}%`, background: c.grad, borderRadius: 2, boxShadow: '0 0 20px rgba(91,140,255,.6)'}} />
          </div>
        </div>
      </Row>
      <Sfx name="whoosh_short" at={8} volume={0.25} />
      <Sfx name="impact" at={L0} volume={0.26} />
      <Sfx name="tick_soft" at={L0 + 24} />
      <Sfx name="pop" at={L0 + 42} />
      <Sfx name="shimmer" at={s2 + 14} volume={0.22} />
    </Stage>
  );
};

/* 3–5. Services */
const Service: React.FC<{
  n: string;
  title: string;
  grad: string[];
  copy: string;
  chips: string[];
  visual: React.ReactNode;
}> = ({n, title, grad, copy, chips, visual}) => {
  const frame = useCurrentFrame();
  return (
    <Stage style={{justifyContent: 'center'}}>
      <div
        style={{
          position: 'absolute',
          right: 60 - frame * 0.6,
          top: 40,
          fontFamily: fonts.display,
          fontWeight: 600,
          fontSize: 520,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: '2px rgba(158,194,255,.10)',
          letterSpacing: -20,
        }}
      >
        {n}
      </div>
      <Row gap={90}>
        <div style={{flex: 1}}>
          <Kicker delay={4}>What I build · {n}</Kicker>
          <div style={{height: 24}} />
          <Words text={title} size={96} grad={grad} delay={PRE + 4} />
          <div style={{height: 26}} />
          <Body delay={L0 + 10} size={38}>
            {copy}
          </Body>
          <div style={{height: 40}} />
          <Row gap={16} style={{flexWrap: 'wrap'}}>
            {chips.map((t, i) => (
              <Enter key={t} delay={L0 + 36 + i * 7} y={16} scale={0.7}>
                <Chip>{t}</Chip>
              </Enter>
            ))}
          </Row>
        </div>
        <Tilt delay={L0 + 6} from="right" style={{width: 720}}>
          {visual}
        </Tilt>
      </Row>
      <Sfx name="whoosh_short" at={L0 + 8} volume={0.22} />
      {chips.map((t, i) => (
        <Sfx key={t} name="pop" at={L0 + 38 + i * 7} volume={0.2} />
      ))}
    </Stage>
  );
};

const WindowBar: React.FC<{title: string}> = ({title}) => (
  <Row gap={10} style={{padding: '16px 22px', borderBottom: `1px solid ${c.border}`}}>
    {[c.danger, c.amber, c.lime].map((x) => (
      <span key={x} style={{width: 13, height: 13, borderRadius: 7, background: x, opacity: 0.8}} />
    ))}
    <span style={{fontFamily: fonts.mono, fontSize: 20, color: c.dim, marginLeft: 12}}>{title}</span>
  </Row>
);

const AppWindow: React.FC = () => {
  const frame = useCurrentFrame();
  const bars = [62, 80, 45, 92, 70, 85];
  const nav = Math.min(3, Math.max(0, Math.floor((frame - L0 - 70) / 26)));
  return (
    <Glass style={{padding: 0, overflow: 'hidden', position: 'relative'}}>
      <WindowBar title="Records dashboard · WinUI 3" />
      <Row gap={0} style={{alignItems: 'stretch', height: 400}}>
        <div style={{width: 170, borderRight: `1px solid ${c.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative'}}>
          <div style={{position: 'absolute', left: 20, right: 20, top: 20 + nav * 57, height: 43, borderRadius: 10, background: c.accentStrong + '33', transition: 'none'}} />
          {['Records', 'Schedule', 'Cases', 'Reports'].map((t, i) => (
            <div key={t} style={{position: 'relative', fontFamily: fonts.body, fontSize: 20, color: i === nav ? c.text : c.dim, padding: '8px 12px'}}>
              {t}
            </div>
          ))}
        </div>
        <div style={{flex: 1, padding: 26}}>
          <Row gap={16}>
            {[
              ['Active', 128],
              ['Today', 14],
              ['Follow-ups', 6],
            ].map(([k, v], i) => (
              <div key={k} style={{flex: 1, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.05)'}}>
                <div style={{fontFamily: fonts.mono, fontSize: 16, color: c.dim}}>{k}</div>
                <CountUp to={v as number} from={L0 + 16 + i * 4} dur={34} style={{fontFamily: fonts.display, fontSize: 40, fontWeight: 600, color: c.text}} />
              </div>
            ))}
          </Row>
          <Row gap={18} style={{alignItems: 'flex-end', height: 200, marginTop: 30}}>
            {bars.map((b, i) => {
              const h = interpolate(frame, [L0 + 20 + i * 5, L0 + 46 + i * 5], [0, b], {...clamp, easing: Easing.out(Easing.back(1.6))});
              return <div key={i} style={{flex: 1, height: `${h}%`, borderRadius: 8, background: c.grad, boxShadow: '0 0 24px rgba(91,140,255,.25)'}} />;
            })}
          </Row>
        </div>
      </Row>
      <Sheen at={L0 + 60} width={720} />
    </Glass>
  );
};

const PIPE_STEP = 16;
const Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const steps = ['Trigger', 'Collect', 'Transform', 'Deliver'];
  const start = L0 + 26;
  return (
    <Glass style={{padding: 44, position: 'relative', overflow: 'hidden'}}>
      {steps.map((s, i) => {
        const at = start + i * PIPE_STEP;
        const done = frame >= at;
        const glow = interpolate(frame, [at, at + 6, at + 18], [0, 1, 0.35], clamp);
        const fill = interpolate(frame, [at, at + PIPE_STEP], [0, 1], clamp);
        return (
          <React.Fragment key={s}>
            <Row gap={22}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  display: 'grid',
                  placeItems: 'center',
                  background: done ? c.amber : 'rgba(255,255,255,.08)',
                  color: done ? '#0a1222' : c.muted,
                  fontFamily: fonts.mono,
                  fontSize: 24,
                  fontWeight: 600,
                  boxShadow: `0 0 ${40 * glow}px rgba(56,189,248,${0.8 * glow})`,
                  transform: `scale(${1 + glow * 0.12})`,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <span style={{fontFamily: fonts.display, fontSize: 36, color: done ? c.text : c.muted, flex: 1}}>{s}</span>
              <div style={{opacity: interpolate(frame, [at + 2, at + 8], [0, 1], clamp), transform: `scale(${interpolate(frame, [at + 2, at + 10], [0.4, 1], {...clamp, easing: Easing.out(Easing.back(2))})})`}}>
                <Check size={34} color={c.amber} />
              </div>
            </Row>
            {i < 3 && (
              <div style={{position: 'relative', width: 3, height: 34, marginLeft: 31}}>
                <div style={{position: 'absolute', inset: 0, background: `repeating-linear-gradient(${c.muted} 0 4px, transparent 4px 8px)`, opacity: 0.35}} />
                <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: `${fill * 100}%`, background: c.amber, boxShadow: `0 0 12px ${c.amber}`}} />
              </div>
            )}
          </React.Fragment>
        );
      })}
      <Sheen at={start + 4 * PIPE_STEP} width={720} />
    </Glass>
  );
};

const PROMPT = '"Update today\'s cases and send the report."';
const AiBridge: React.FC = () => {
  const frame = useCurrentFrame();
  const tools = ['read_records', 'update_case', 'send_report'];
  const typeAt = L0 + 18;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 26}}>
      <Glass glow="rgba(158,194,255,.35)" style={{padding: '26px 32px'}}>
        <div style={{fontFamily: fonts.display, fontSize: 36, fontWeight: 600, color: c.accent}}>Claude · Gemini</div>
        <Typewriter text={PROMPT} from={typeAt} cps={30} style={{fontFamily: fonts.body, fontSize: 24, color: c.muted}} />
      </Glass>
      <Row gap={14} style={{justifyContent: 'center'}}>
        <span style={{fontFamily: fonts.mono, fontSize: 24, color: c.pink}}>MCP</span>
        <div style={{position: 'relative', width: 280, height: 3, background: `repeating-linear-gradient(90deg, ${c.pink}55 0 8px, transparent 8px 16px)`}}>
          {[0, 1, 2].map((k) => {
            const p = ((frame - L0 - 50 + k * 12) % 36) / 36;
            return frame > L0 + 50 ? (
              <div key={k} style={{position: 'absolute', top: -5, left: p * 270, width: 12, height: 12, borderRadius: 6, background: c.pink, boxShadow: `0 0 16px ${c.pink}`}} />
            ) : null;
          })}
        </div>
      </Row>
      <Glass style={{padding: '26px 32px'}}>
        <div style={{fontFamily: fonts.display, fontSize: 36, fontWeight: 600, color: c.text, marginBottom: 14}}>Your tools</div>
        {tools.map((t, i) => (
          <Enter key={t} delay={L0 + 60 + i * 14} x={-20} y={0}>
            <Row gap={14} style={{padding: '6px 0'}}>
              <Check size={26} color={c.pink} />
              <span style={{fontFamily: fonts.mono, fontSize: 26, color: c.muted}}>{t}</span>
              <span style={{fontFamily: fonts.mono, fontSize: 18, color: c.lime, marginLeft: 'auto'}}>200 OK</span>
            </Row>
          </Enter>
        ))}
      </Glass>
    </div>
  );
};

const Desktop: React.FC<SceneProps> = () => (
  <>
    <Service n="01" title="Desktop systems" grad={['systems']} copy="Records, scheduling and case management that run fast on the machines your team already uses." chips={['C#', 'WinUI 3', '.NET', 'SQLite']} visual={<AppWindow />} />
    <Sfx name="tick_soft" at={L0 + 22} />
    <Sfx name="tick_soft" at={L0 + 32} />
    <Sfx name="tick_soft" at={L0 + 42} />
  </>
);
const Automation: React.FC<SceneProps> = () => (
  <>
    <Service n="02" title="Automation & extensions" grad={['Automation']} copy="Browser extensions and tools that take the repetitive steps off your plate." chips={['TypeScript', 'React', 'Chrome MV3', 'JavaScript']} visual={<Pipeline />} />
    {[0, 1, 2].map((i) => (
      <Sfx key={i} name="click" at={L0 + 26 + i * PIPE_STEP} volume={0.22} />
    ))}
    <Sfx name="success" at={L0 + 26 + 3 * PIPE_STEP} volume={0.26} />
  </>
);
const Ai: React.FC<SceneProps> = () => (
  <>
    <Service n="03" title="AI integrations with MCP" grad={['MCP']} copy="Let assistants like Claude and Gemini do real work inside your tools, with you in control." chips={['MCP', 'Claude', 'Gemini', 'Node']} visual={<AiBridge />} />
    {typeFrames(PROMPT, L0 + 18, 30, 3).map((f) => (
      <Sfx key={f} name="tick_soft" at={f} volume={0.1} />
    ))}
    {[0, 1, 2].map((i) => (
      <Sfx key={i} name="click" at={L0 + 62 + i * 14} volume={0.2} />
    ))}
  </>
);

/* 6. Proof: projects, one per narrated sentence */
const PROJECTS = [
  {name: 'HealthNest', tag: 'Healthcare · Desktop', copy: 'Maternal & child health, cases and appointments', col: c.pink, stack: 'WinUI 3 · C# · SQLite'},
  {name: 'Flow Auto', tag: 'Automation · Extension', copy: 'Scripts to finished 1080p AI videos', col: c.lime, stack: 'React · TypeScript · MCP'},
];

const HealthPreview: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const bars = [48, 64, 58, 76, 70, 88, 82];
  return (
    <Row gap={30} style={{alignItems: 'stretch', height: '100%'}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 14, width: 260}}>
        {[
          ['Mothers tracked', 128],
          ['Visits today', 14],
          ['Follow-ups', 6],
        ].map(([k, v], i) => (
          <div key={k} style={{padding: '12px 18px', borderRadius: 14, background: 'rgba(255,255,255,.05)'}}>
            <div style={{fontFamily: fonts.mono, fontSize: 16, color: c.dim}}>{k}</div>
            <CountUp to={v as number} from={from + i * 4} dur={30} style={{fontFamily: fonts.display, fontSize: 34, fontWeight: 600, color: c.text}} />
          </div>
        ))}
      </div>
      <Row gap={14} style={{flex: 1, alignItems: 'flex-end'}}>
        {bars.map((b, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${interpolate(frame, [from + i * 4, from + 24 + i * 4], [0, b], {...clamp, easing: Easing.out(Easing.back(1.5))})}%`,
              borderRadius: 8,
              background: c.grad,
            }}
          />
        ))}
      </Row>
    </Row>
  );
};

const FlowPreview: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const scroll = interpolate(frame, [from + 20, from + 140], [0, -60], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return (
    <div style={{position: 'relative', height: '100%', borderRadius: 16, overflow: 'hidden', border: `1px solid ${c.border}`, boxShadow: '0 30px 60px -20px rgba(0,0,0,.7)'}}>
      <Img src={staticFile('shots/scenes.webp')} style={{width: '100%', display: 'block', transform: `translateY(${scroll}px)`}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(transparent 60%, rgba(6,10,20,.65))'}} />
      <Sheen at={from + 16} width={800} />
    </div>
  );
};

const Proof: React.FC<SceneProps> = ({line}) => {
  const frame = useCurrentFrame();
  const current = PROJECTS.reduce((k, _, i) => (frame >= sentenceFrame(line, i) - 6 ? i : k), 0);
  return (
    <Stage>
      <Kicker delay={2}>Built and shipped</Kicker>
      <div style={{height: 20}} />
      <Words text="Real software for real workflows." size={80} grad={['real']} delay={4} />
      <div style={{height: 46}} />
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, flex: 1, minHeight: 0}}>
        {PROJECTS.map((p, i) => {
          const d = sentenceFrame(line, i) - 8;
          const on = current === i;
          const focus = interpolate(frame, [sentenceFrame(line, 1) - 10, sentenceFrame(line, 1) + 4], i === 0 ? [1, 0] : [0, 1], clamp);
          const lit = i === 0 ? Math.max(focus, frame < sentenceFrame(line, 1) - 10 ? 1 : 0) : focus;
          return (
            <Tilt key={p.name} delay={d} from="bottom" style={{minHeight: 0}}>
              <Glass
                glow={on ? `${p.col}66` : undefined}
                style={{
                  padding: '30px 36px',
                  height: '100%',
                  boxSizing: 'border-box',
                  borderColor: on ? `${p.col}88` : c.border,
                  background: on ? c.glassStrong : c.glass,
                  transform: `scale(${0.97 + 0.04 * lit})`,
                  opacity: 0.6 + 0.4 * lit,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Row gap={14}>
                  <span style={{fontFamily: fonts.mono, fontSize: 22, color: p.col}}>0{i + 1}</span>
                  <span style={{fontFamily: fonts.mono, fontSize: 20, color: c.dim}}>{p.tag}</span>
                </Row>
                <div style={{fontFamily: fonts.display, fontSize: 46, fontWeight: 600, color: c.text, margin: '10px 0 6px'}}>{p.name}</div>
                <div style={{fontFamily: fonts.body, fontSize: 28, color: c.muted}}>{p.copy}</div>
                <div style={{fontFamily: fonts.mono, fontSize: 20, color: c.dim, marginTop: 12}}>{p.stack}</div>
                <div style={{flex: 1, marginTop: 24, minHeight: 0}}>{i === 0 ? <HealthPreview from={d + 10} /> : <FlowPreview from={d + 10} />}</div>
              </Glass>
            </Tilt>
          );
        })}
      </div>
      {PROJECTS.map((p, i) => (
        <React.Fragment key={p.name}>
          <Sfx name="whoosh_short" at={sentenceFrame(line, i) - 4} volume={0.22} />
          <Sfx name="pop" at={sentenceFrame(line, i) + 4} volume={0.2} />
        </React.Fragment>
      ))}
    </Stage>
  );
};

/* 7. Approach */
const Approach: React.FC<SceneProps> = ({line, dur}) => {
  const frame = useCurrentFrame();
  const s2 = sentenceFrame(line, 1);
  const steps = [
    ['01', 'Build for the workflow', 'Start with what you need to get done.'],
    ['02', 'Make complexity legible', 'Technically deep, never complicated.'],
    ['03', 'Iterate in public', 'Build, test, refine, ship.'],
  ];
  const at = [L0 + 20, s2, s2 + 30];
  const link = interpolate(frame, [L0 + 30, s2 + 34], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return (
    <Stage style={{justifyContent: 'center'}}>
      <Kicker delay={4}>How I work</Kicker>
      <div style={{height: 24}} />
      <Words text="Engineering mindset. Human-centered output." size={88} grad={['Human-centered']} delay={L0} />
      <div style={{height: 60}} />
      <div style={{position: 'relative'}}>
        <div style={{position: 'absolute', left: '8%', right: '8%', top: 58, height: 2, background: 'rgba(255,255,255,.08)'}}>
          <div style={{height: '100%', width: `${link * 100}%`, background: c.grad, boxShadow: '0 0 16px rgba(91,140,255,.6)'}} />
        </div>
        <Row gap={30} style={{alignItems: 'stretch', position: 'relative'}}>
          {steps.map(([n, t, d], i) => {
            const glow = interpolate(frame, [at[i], at[i] + 8, at[i] + 30], [0, 1, 0.3], clamp);
            return (
              <Tilt key={n} delay={at[i]} from="bottom" style={{flex: 1}}>
                <Glass glow={glow > 0.05 ? `rgba(158,194,255,${0.5 * glow})` : undefined} style={{padding: 36, height: '100%', boxSizing: 'border-box'}}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: fonts.mono,
                      fontSize: 20,
                      color: '#0a1222',
                      background: c.grad,
                      boxShadow: `0 0 ${30 * glow}px rgba(91,140,255,.8)`,
                    }}
                  >
                    {n}
                  </div>
                  <div style={{fontFamily: fonts.display, fontSize: 40, fontWeight: 600, color: c.text, margin: '18px 0 10px'}}>{t}</div>
                  <div style={{fontFamily: fonts.body, fontSize: 28, color: c.muted}}>{d}</div>
                </Glass>
              </Tilt>
            );
          })}
        </Row>
      </div>
      {at.map((f) => (
        <Sfx key={f} name="pop" at={f + 6} volume={0.2} />
      ))}
      <Sfx name="reverse" at={dur} volume={0.34} />
    </Stage>
  );
};

/* 8. Call to action: the drop */
const Cta: React.FC<SceneProps> = ({line}) => {
  const s2 = sentenceFrame(line, 1);
  const shake = useShake(s2 + 2, 12, 14);
  const frame = useCurrentFrame();
  const shake0 = useShake(PRE, 16, 16);
  // Chips play big on the drop, then settle above the headline when it lands.
  const shrink = useEase(s2 - 10, 16, Easing.inOut(Easing.cubic));
  return (
    <Stage style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <div style={{transform: `${shake0 === 'none' ? '' : shake0} translateY(${(1 - shrink) * 190}px) scale(${1.7 - 0.7 * shrink})`}}>
        <Row gap={20} style={{justifyContent: 'center'}}>
          {['Internships', 'Freelance', 'Collaborations'].map((t, i) => (
            <Enter key={t} delay={PRE + 2 + i * 5} scale={0.5} y={40}>
              <Chip color={[c.accent, c.pink, c.amber][i]} style={{fontSize: 34, padding: '16px 34px'}}>
                {t}
              </Chip>
            </Enter>
          ))}
        </Row>
      </div>
      <div style={{height: 70}} />
      <div style={{transform: shake}}>
        <Slam text="Let's build something worth using." size={124} grad={['worth', 'using.']} delay={s2} stagger={4} style={{maxWidth: 1500}} />
      </div>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 45%, rgba(235,242,255,.55), rgba(158,194,255,.15) 45%, transparent 75%)', opacity: interpolate(frame, [PRE, PRE + 2, PRE + 16], [0, 1, 0], clamp), pointerEvents: 'none'}} />
      <Burst at={PRE + 1} x={960} y={440} count={40} radius={900} seed="drop" />
      <Burst at={s2 + 18} x={960} y={640} count={30} radius={700} seed="cta" />
      <Sfx name="impact" at={PRE} volume={0.5} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="pop" at={PRE + 4 + i * 5} volume={0.22} />
      ))}
      <Sfx name="impact" at={s2 + 2} volume={0.24} />
    </Stage>
  );
};

/* 9. Contact, then the logo lockup */
const EMAIL = 'carltampus5@gmail.com';
const Contact: React.FC<SceneProps> = ({line}) => {
  const frame = useCurrentFrame();
  const typeAt = L0 + 4;
  const typed = typeAt + Math.round((EMAIL.length / 28) * FPS);
  // The scene starts PRE frames early, so the outro (and its music resolve) is PRE frames later in scene time.
  const outroAt = Math.ceil((LEAD + line.seconds + TAIL) * FPS) + PRE;
  const out = useEase(outroAt - 8, 16, Easing.inOut(Easing.cubic));
  const logo = useSpring(outroAt + 4, {damping: 14, stiffness: 110});
  const glow = interpolate(frame, [typed, typed + 10, typed + 40], [0, 1, 0.4], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: 1 - out, transform: `scale(${1 - out * 0.08})`, filter: out > 0 ? `blur(${out * 12}px)` : undefined}}>
        <Stage style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
          <Kicker delay={2}>Start a conversation</Kicker>
          <div style={{height: 40}} />
          <Enter delay={2} scale={0.9}>
            <Glass glow={`rgba(91,140,255,${0.25 + 0.35 * glow})`} style={{padding: '44px 70px', position: 'relative', overflow: 'hidden', minWidth: 1160}}>
              <div style={{fontFamily: fonts.display, fontSize: 92, fontWeight: 500, letterSpacing: -2, color: c.accent}}>
                <Typewriter text={EMAIL} from={typeAt} cps={28} />
              </div>
              <Sheen at={typed + 2} dur={26} width={1200} />
            </Glass>
          </Enter>
          <div style={{height: 46}} />
          <Enter delay={typed + 6}>
            <div style={{fontFamily: fonts.mono, fontSize: 36, color: c.muted}}>rouge999xx.github.io</div>
          </Enter>
          <div style={{height: 30}} />
          <Enter delay={typed + 22}>
            <Chip color={c.lime}>● Available for internships & freelance</Chip>
          </Enter>
        </Stage>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: interpolate(logo, [0, 0.3], [0, 1], clamp)}}>
        <div style={{transform: `scale(${0.8 + 0.2 * logo})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28}}>
          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: 40,
              display: 'grid',
              placeItems: 'center',
              background: c.grad,
              boxShadow: `0 0 ${90 * logo}px rgba(91,140,255,.55)`,
              fontFamily: fonts.display,
              fontWeight: 600,
              fontSize: 72,
              color: '#0a1222',
              letterSpacing: -3,
            }}
          >
            CT
          </div>
          <div style={{fontFamily: fonts.display, fontWeight: 600, fontSize: 84, color: c.text, letterSpacing: -2}}>
            Carl{' '}
            <span style={{...accentWord}}>Tampus</span>
          </div>
          <div style={{fontFamily: fonts.mono, fontSize: 28, color: c.muted, letterSpacing: 4, opacity: interpolate(frame, [outroAt + 14, outroAt + 26], [0, 1], clamp)}}>
            ROUGE999XX.GITHUB.IO
          </div>
        </div>
      </AbsoluteFill>
      <Burst at={outroAt + 10} x={960} y={470} count={34} radius={520} seed="logo" />
      {typeFrames(EMAIL, typeAt, 28, 2).map((f) => (
        <Sfx key={f} name="tick_soft" at={f} volume={0.12} />
      ))}
      <Sfx name="shimmer" at={typed + 2} volume={0.26} />
      <Sfx name="pop" at={typed + 24} volume={0.18} />
      <Sfx name="logo_sting" at={outroAt + 12} />
    </AbsoluteFill>
  );
};

export const ServicesVideo: React.FC = () => (
  <ShowTimeline
    video="services"
    scenes={{
      hook: Hook,
      intro: Intro,
      desktop: Desktop,
      automation: Automation,
      ai: Ai,
      proof: Proof,
      approach: Approach,
      cta: Cta,
      contact: Contact,
    }}
  />
);
