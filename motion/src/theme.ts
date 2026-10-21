// Fonts are bundled from npm (fontsource) so rendering never depends on a font CDN.
// Same type as the site: Inter Tight, Instrument Serif italic for accent words, JetBrains Mono.
import '@fontsource/inter-tight/latin-400.css';
import '@fontsource/inter-tight/latin-500.css';
import '@fontsource/inter-tight/latin-600.css';
import '@fontsource/inter-tight/latin-700.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';

// Same palette as the site's "Midnight & Cobalt" theme (style.css :root): deep navy, cool off-white
// and one blue family. The old names are kept so every scene picks the new colours up.
export const fonts = {
  display: '"Inter Tight", Inter, sans-serif',
  body: '"Inter Tight", Inter, system-ui, sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
  mono: '"JetBrains Mono", monospace',
};

export const c = {
  bg: '#0a0f1a',
  text: '#e9eef7',
  muted: '#aab6cb',
  dim: 'rgba(233,238,247,.55)',
  accent: '#9ec2ff',
  accentStrong: '#7eaaff',
  pink: '#5b8cff',
  amber: '#38bdf8',
  lime: '#8cb4ff',
  teal: '#22d3ee',
  violet: '#3b74ee',
  danger: '#fca5a5',
  glass: 'rgba(160,182,220,.06)',
  glassStrong: 'rgba(160,182,220,.11)',
  border: 'rgba(160,182,220,.18)',
  grad: 'linear-gradient(115deg, #dbe7ff 0%, #9ec2ff 45%, #5b8cff 100%)',
  flowGrad: 'linear-gradient(115deg, #e6f0ff 0%, #9ec2ff 40%, #38bdf8 100%)',
};

/** Accent words: the site's italic serif in light blue, instead of gradient-filled text. */
export const accentWord = {fontFamily: fonts.serif, fontStyle: 'italic' as const, fontWeight: 400, color: c.accent, letterSpacing: 0};

export const FPS = 30;
export const LEAD = 0.6; // seconds of motion before the narrator starts
export const TAIL = 0.7; // seconds held after the line ends
/** Extra hold on a video's last scene (the intro ends on a logo lockup). */
export const OUTRO: Record<string, number> = {flowauto: 0, services: 2.5};
