import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Body, Check, Chip, clamp, Enter, Glass, Kicker, Line, sentenceFrame, Stage, Timeline, useSpring, Words} from './kit';
import {c, fonts, FPS, LEAD} from './theme';

const L0 = Math.round(LEAD * FPS);

const Row: React.FC<{children: React.ReactNode; gap?: number; style?: React.CSSProperties}> = ({children, gap = 24, style}) => (
  <div style={{display: 'flex', gap, alignItems: 'center', ...style}}>{children}</div>
);

/* 1. Hook: a messy pile of manual work */
const Hook: React.FC<{line: Line}> = () => {
  const frame = useCurrentFrame();
  const notes = ['Copy to sheet', 'Re-type records', 'Chase updates', 'Export again', 'Rename files', 'Manual SMS', 'Double-check', 'Paste into form'];
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      {notes.map((n, i) => {
        const a = (i / notes.length) * Math.PI * 2;
        const rx = 760 + (i % 2) * 40;
        const ry = 380 + (i % 2) * 40;
        const wob = Math.sin(frame / 14 + i) * 8;
        return (
          <div
            key={n}
            style={{
              position: 'absolute',
              left: 960 + Math.cos(a + 0.4) * rx - 130,
              top: 520 + Math.sin(a + 0.4) * ry - 30,
              transform: `rotate(${((i * 37) % 24) - 12 + wob * 0.3}deg)`,
            }}
          >
            <Enter delay={i * 3} scale={0.6}>
              <Glass style={{padding: '16px 26px', borderRadius: 14, fontFamily: fonts.mono, fontSize: 26, color: c.dim}}>{n}</Glass>
            </Enter>
          </div>
        );
      })}
      <div style={{textAlign: 'center', maxWidth: 1200}}>
        <Words text="Slow, messy workflow eating your team's time?" size={104} grad={['time?']} delay={L0 - 4} style={{justifyContent: 'center'}} />
      </div>
    </AbsoluteFill>
  );
};

/* 2. Intro */
const Intro: React.FC<{line: Line}> = ({line}) => {
  const p = useSpring(L0 - 8, {damping: 15});
  const frame = useCurrentFrame();
  const s2 = sentenceFrame(line, 1);
  return (
    <Stage style={{justifyContent: 'center'}}>
      <Row gap={110}>
        <div style={{position: 'relative', width: 560, height: 560, transform: `scale(${p})`}}>
          <div
            style={{
              position: 'absolute',
              inset: -18,
              borderRadius: '50%',
              background: `conic-gradient(from ${frame * 2}deg, ${c.accent}, ${c.pink}, ${c.amber}, ${c.accent})`,
              filter: 'blur(2px)',
            }}
          />
          <Img src={staticFile('portrait.webp')} style={{position: 'absolute', inset: 0, width: 560, height: 560, borderRadius: '50%', objectFit: 'cover', border: `8px solid ${c.bg}`}} />
          <div style={{position: 'absolute', right: -10, bottom: 40}}>
            <Enter delay={L0 + 40} scale={0.6}>
              <Chip color={c.lime} style={{background: 'rgba(20,30,10,.85)'}}>
                ● Open to work
              </Chip>
            </Enter>
          </div>
        </div>
        <div style={{flex: 1}}>
          <Kicker>Hi, I'm</Kicker>
          <div style={{height: 16}} />
          <Words text="Carl Tampus" size={140} grad={['Tampus']} delay={L0} stagger={5} />
          <div style={{height: 10}} />
          <Body delay={L0 + 24} size={38}>
            Computer Engineering student · Cebu, Philippines
          </Body>
          <div style={{height: 50}} />
          <Words text="I build software that feels alive." size={66} grad={['alive.']} delay={s2} style={{fontWeight: 600}} />
        </div>
      </Row>
    </Stage>
  );
};

/* 3–5. Services */
const Service: React.FC<{
  line: Line;
  n: string;
  title: string;
  grad: string[];
  copy: string;
  chips: string[];
  visual: React.ReactNode;
}> = ({n, title, grad, copy, chips, visual}) => (
  <Stage style={{justifyContent: 'center'}}>
    <Row gap={90}>
      <div style={{flex: 1}}>
        <Kicker>What I build · {n}</Kicker>
        <div style={{height: 24}} />
        <Words text={title} size={96} grad={grad} delay={L0} />
        <div style={{height: 26}} />
        <Body delay={L0 + 20} size={38}>
          {copy}
        </Body>
        <div style={{height: 40}} />
        <Row gap={16} style={{flexWrap: 'wrap'}}>
          {chips.map((t, i) => (
            <Enter key={t} delay={L0 + 36 + i * 7} y={16}>
              <Chip>{t}</Chip>
            </Enter>
          ))}
        </Row>
      </div>
      <Enter delay={L0 + 10} x={80} y={0} style={{width: 720}}>
        {visual}
      </Enter>
    </Row>
  </Stage>
);

const AppWindow: React.FC = () => {
  const frame = useCurrentFrame();
  const bars = [62, 80, 45, 92, 70, 85];
  return (
    <Glass style={{padding: 0, overflow: 'hidden'}}>
      <Row gap={10} style={{padding: '16px 22px', borderBottom: `1px solid ${c.border}`}}>
        {[c.danger, c.amber, c.lime].map((x) => (
          <span key={x} style={{width: 13, height: 13, borderRadius: 7, background: x, opacity: 0.8}} />
        ))}
        <span style={{fontFamily: fonts.mono, fontSize: 20, color: c.dim, marginLeft: 12}}>Patient dashboard · WinUI 3</span>
      </Row>
      <Row gap={0} style={{alignItems: 'stretch', height: 400}}>
        <div style={{width: 170, borderRight: `1px solid ${c.border}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 14}}>
          {['Patients', 'Schedule', 'Cases', 'Reports'].map((t, i) => (
            <div key={t} style={{fontFamily: fonts.body, fontSize: 20, color: i === 0 ? c.text : c.dim, padding: '8px 12px', borderRadius: 10, background: i === 0 ? c.accentStrong + '33' : 'none'}}>
              {t}
            </div>
          ))}
        </div>
        <div style={{flex: 1, padding: 26}}>
          <Row gap={16}>
            {[
              ['Active', '128'],
              ['Today', '14'],
              ['Follow-ups', '6'],
            ].map(([k, v]) => (
              <div key={k} style={{flex: 1, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.05)'}}>
                <div style={{fontFamily: fonts.mono, fontSize: 16, color: c.dim}}>{k}</div>
                <div style={{fontFamily: fonts.display, fontSize: 40, fontWeight: 700, color: c.text}}>{v}</div>
              </div>
            ))}
          </Row>
          <Row gap={18} style={{alignItems: 'flex-end', height: 200, marginTop: 30}}>
            {bars.map((b, i) => {
              const h = interpolate(frame, [L0 + 20 + i * 5, L0 + 50 + i * 5], [0, b], clamp);
              return <div key={i} style={{flex: 1, height: `${h}%`, borderRadius: 8, background: c.grad}} />;
            })}
          </Row>
        </div>
      </Row>
    </Glass>
  );
};

const Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const steps = ['Trigger', 'Collect', 'Transform', 'Deliver'];
  return (
    <Glass style={{padding: 44}}>
      {steps.map((s, i) => {
        const active = Math.floor((frame - L0) / 14) % 4 === i;
        return (
          <React.Fragment key={s}>
            <Row gap={22}>
              <div style={{width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', background: active ? c.amber : 'rgba(255,255,255,.08)', color: active ? '#1b0b3a' : c.muted, fontFamily: fonts.mono, fontSize: 24, fontWeight: 600}}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <span style={{fontFamily: fonts.display, fontSize: 36, color: active ? c.text : c.muted, flex: 1}}>{s}</span>
              {active && <Check size={34} color={c.amber} />}
            </Row>
            {i < 3 && <div style={{width: 3, height: 34, marginLeft: 31, background: `repeating-linear-gradient(${c.muted} 0 4px, transparent 4px 8px)`, opacity: 0.5}} />}
          </React.Fragment>
        );
      })}
    </Glass>
  );
};

const AiBridge: React.FC = () => {
  const frame = useCurrentFrame();
  const tools = ['read_records', 'update_case', 'send_report'];
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 26}}>
      <Glass glow="rgba(196,181,253,.35)" style={{padding: '26px 32px'}}>
        <div style={{fontFamily: fonts.display, fontSize: 36, fontWeight: 600, color: c.accent}}>Claude · Gemini</div>
        <div style={{fontFamily: fonts.body, fontSize: 24, color: c.muted}}>"Update today's cases and send the report."</div>
      </Glass>
      <Row gap={14} style={{justifyContent: 'center'}}>
        <span style={{fontFamily: fonts.mono, fontSize: 24, color: c.pink}}>MCP</span>
        <div style={{width: 240, height: 3, background: `repeating-linear-gradient(90deg, ${c.pink} 0 8px, transparent 8px 16px)`, backgroundPositionX: frame * 2}} />
      </Row>
      <Glass style={{padding: '26px 32px'}}>
        <div style={{fontFamily: fonts.display, fontSize: 36, fontWeight: 600, color: c.text, marginBottom: 14}}>Your tools</div>
        {tools.map((t, i) => (
          <Enter key={t} delay={L0 + 40 + i * 12} x={-20} y={0}>
            <Row gap={14} style={{padding: '6px 0'}}>
              <Check size={26} color={c.pink} />
              <span style={{fontFamily: fonts.mono, fontSize: 26, color: c.muted}}>{t}</span>
            </Row>
          </Enter>
        ))}
      </Glass>
    </div>
  );
};

const Desktop: React.FC<{line: Line}> = ({line}) => (
  <Service line={line} n="01" title="Desktop systems" grad={['systems']} copy="Records, scheduling and case management that run fast on the machines your team already uses." chips={['C#', 'WinUI 3', '.NET', 'SQLite']} visual={<AppWindow />} />
);
const Automation: React.FC<{line: Line}> = ({line}) => (
  <Service line={line} n="02" title="Automation & extensions" grad={['Automation']} copy="Browser extensions and tools that take the repetitive steps off your plate." chips={['TypeScript', 'React', 'Chrome MV3', 'JavaScript']} visual={<Pipeline />} />
);
const Ai: React.FC<{line: Line}> = ({line}) => (
  <Service line={line} n="03" title="AI integrations with MCP" grad={['MCP']} copy="Let assistants like Claude and Gemini do real work inside your tools, with you in control." chips={['MCP', 'Claude', 'Gemini', 'Node']} visual={<AiBridge />} />
);

/* 6. Proof: projects, one per narrated sentence */
const PROJECTS = [
  {name: 'HealthNest', tag: 'Healthcare · Desktop', copy: 'Maternal & child health, cases and appointments', col: c.pink, stack: 'WinUI 3 · C# · SQLite'},
  {name: 'Flow Auto', tag: 'Automation · Extension', copy: 'Scripts to finished 1080p AI videos', col: c.lime, stack: 'React · TypeScript · MCP'},
];
/** Small product previews that fill the lower half of each proof card. */
const HealthPreview: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const bars = [48, 64, 58, 76, 70, 88, 82];
  return (
    <Row gap={30} style={{alignItems: 'stretch', height: '100%'}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 14, width: 260}}>
        {[
          ['Mothers tracked', '128'],
          ['Visits today', '14'],
          ['Follow-ups', '6'],
        ].map(([k, v]) => (
          <div key={k} style={{padding: '12px 18px', borderRadius: 14, background: 'rgba(255,255,255,.05)'}}>
            <div style={{fontFamily: fonts.mono, fontSize: 16, color: c.dim}}>{k}</div>
            <div style={{fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: c.text}}>{v}</div>
          </div>
        ))}
      </div>
      <Row gap={14} style={{flex: 1, alignItems: 'flex-end'}}>
        {bars.map((b, i) => (
          <div
            key={i}
            style={{flex: 1, height: `${interpolate(frame, [from + i * 4, from + 26 + i * 4], [0, b], clamp)}%`, borderRadius: 8, background: c.grad}}
          />
        ))}
      </Row>
    </Row>
  );
};

const FlowPreview: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  return (
    <Row gap={30} style={{alignItems: 'center', height: '100%'}}>
      <Img src={staticFile('flow-auto-icon.svg')} style={{width: 150, height: 150, filter: 'drop-shadow(0 0 30px rgba(185,243,107,.4))'}} />
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 10}}>
        {[1, 2, 3, 4].map((n, i) => (
          <Row
            key={n}
            gap={14}
            style={{padding: '10px 18px', borderRadius: 12, background: 'rgba(255,255,255,.05)', opacity: interpolate(frame, [from + i * 6, from + 10 + i * 6], [0, 1], clamp)}}
          >
            <span style={{fontFamily: fonts.mono, fontSize: 22, color: c.text, flex: 1}}>story/{n}.mp4</span>
            <span style={{fontFamily: fonts.mono, fontSize: 18, color: c.lime}}>1080p</span>
            <Check size={22} />
          </Row>
        ))}
      </div>
    </Row>
  );
};

const Proof: React.FC<{line: Line}> = ({line}) => {
  const frame = useCurrentFrame();
  const current = PROJECTS.reduce((k, _, i) => (frame >= sentenceFrame(line, i) - 6 ? i : k), 0);
  return (
    <Stage>
      <Kicker>Built and shipped</Kicker>
      <div style={{height: 20}} />
      <Words text="Real software for real workflows." size={80} grad={['real']} delay={4} />
      <div style={{height: 50}} />
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, flex: 1}}>
        {PROJECTS.map((p, i) => {
          const d = sentenceFrame(line, i) - 8;
          const on = current === i;
          return (
            <Enter key={p.name} delay={d} scale={0.9}>
              <Glass
                glow={on ? `${p.col}66` : undefined}
                style={{
                  padding: '30px 36px',
                  height: '100%',
                  boxSizing: 'border-box',
                  borderColor: on ? `${p.col}88` : c.border,
                  background: on ? c.glassStrong : c.glass,
                  transform: `scale(${on ? 1.02 : 1})`,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Row gap={14}>
                  <span style={{fontFamily: fonts.mono, fontSize: 22, color: p.col}}>0{i + 1}</span>
                  <span style={{fontFamily: fonts.mono, fontSize: 20, color: c.dim}}>{p.tag}</span>
                </Row>
                <div style={{fontFamily: fonts.display, fontSize: 46, fontWeight: 700, color: c.text, margin: '10px 0 6px'}}>{p.name}</div>
                <div style={{fontFamily: fonts.body, fontSize: 28, color: c.muted}}>{p.copy}</div>
                <div style={{fontFamily: fonts.mono, fontSize: 20, color: c.dim, marginTop: 14}}>{p.stack}</div>
                <div style={{flex: 1, marginTop: 30, minHeight: 0}}>
                  {i === 0 ? <HealthPreview from={d + 10} /> : <FlowPreview from={d + 10} />}
                </div>
              </Glass>
            </Enter>
          );
        })}
      </div>
    </Stage>
  );
};

/* 7. Approach */
const Approach: React.FC<{line: Line}> = ({line}) => {
  const s2 = sentenceFrame(line, 1);
  const steps = [
    ['01', 'Build for the workflow', 'Start with what you need to get done.'],
    ['02', 'Make complexity legible', 'Technically deep, never complicated.'],
    ['03', 'Iterate in public', 'Build, test, refine, ship.'],
  ];
  return (
    <Stage style={{justifyContent: 'center'}}>
      <Kicker>How I work</Kicker>
      <div style={{height: 24}} />
      <Words text="Engineering mindset. Human-centered output." size={88} grad={['Human-centered']} delay={L0} />
      <div style={{height: 60}} />
      <Row gap={30} style={{alignItems: 'stretch'}}>
        {steps.map(([n, t, d], i) => (
          <Enter key={n} delay={(i === 1 ? s2 : L0 + 20) + (i === 2 ? 30 : 0)} style={{flex: 1}}>
            <Glass style={{padding: 36, height: '100%', boxSizing: 'border-box'}}>
              <div style={{fontFamily: fonts.mono, fontSize: 24, color: c.accent}}>{n}</div>
              <div style={{fontFamily: fonts.display, fontSize: 40, fontWeight: 700, color: c.text, margin: '14px 0 10px'}}>{t}</div>
              <div style={{fontFamily: fonts.body, fontSize: 28, color: c.muted}}>{d}</div>
            </Glass>
          </Enter>
        ))}
      </Row>
    </Stage>
  );
};

/* 8. Call to action */
const Cta: React.FC<{line: Line}> = ({line}) => {
  const s2 = sentenceFrame(line, 1);
  return (
    <Stage style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <Row gap={20} style={{justifyContent: 'center'}}>
        {['Internships', 'Freelance', 'Collaborations'].map((t, i) => (
          <Enter key={t} delay={L0 + 20 + i * 14} scale={0.8}>
            <Chip color={[c.accent, c.pink, c.amber][i]} style={{fontSize: 34, padding: '16px 34px'}}>
              {t}
            </Chip>
          </Enter>
        ))}
      </Row>
      <div style={{height: 70}} />
      <Words text="Let's build something worth using." size={120} grad={['worth', 'using.']} delay={s2} stagger={4} style={{justifyContent: 'center', maxWidth: 1500}} />
    </Stage>
  );
};

/* 9. Contact */
const Contact: React.FC<{line: Line}> = () => {
  const frame = useCurrentFrame();
  const shine = ((frame - L0) * 14) % 2400;
  return (
    <Stage style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <Kicker>Start a conversation</Kicker>
      <div style={{height: 40}} />
      <Enter delay={L0} scale={0.9}>
        <Glass glow="rgba(249,168,212,.4)" style={{padding: '44px 70px', position: 'relative', overflow: 'hidden'}}>
          <div style={{fontFamily: fonts.display, fontSize: 92, fontWeight: 700, background: c.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>
            carltampus5@gmail.com
          </div>
          <div style={{position: 'absolute', top: 0, bottom: 0, left: shine - 400, width: 160, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)', transform: 'skewX(-20deg)'}} />
        </Glass>
      </Enter>
      <div style={{height: 46}} />
      <Enter delay={L0 + 30}>
        <div style={{fontFamily: fonts.mono, fontSize: 36, color: c.muted}}>rouge999xx.github.io</div>
      </Enter>
      <div style={{height: 30}} />
      <Enter delay={L0 + 50}>
        <Chip color={c.lime}>● Available for internships & freelance</Chip>
      </Enter>
    </Stage>
  );
};

export const ServicesVideo: React.FC = () => (
  <Timeline
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
