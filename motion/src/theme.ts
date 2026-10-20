// Fonts are bundled from npm (fontsource) so rendering never depends on a font CDN.
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';

// Same palette and type as the site's aurora glass theme (style.css :root).
export const fonts = {
  display: '"Space Grotesk", Inter, sans-serif',
  body: 'Inter, system-ui, sans-serif',
  mono: '"JetBrains Mono", monospace',
};

export const c = {
  bg: '#0a0718',
  text: '#f5f3ff',
  muted: '#c3bedb',
  dim: 'rgba(245,243,255,.55)',
  accent: '#c4b5fd',
  accentStrong: '#a78bfa',
  pink: '#f9a8d4',
  amber: '#fcd34d',
  lime: '#b9f36b',
  teal: '#4ce0c1',
  violet: '#9a8bff',
  danger: '#fca5a5',
  glass: 'rgba(255,255,255,.055)',
  glassStrong: 'rgba(255,255,255,.1)',
  border: 'rgba(255,255,255,.14)',
  grad: 'linear-gradient(115deg, #c4b5fd 0%, #f9a8d4 45%, #fcd34d 100%)',
  flowGrad: 'linear-gradient(115deg, #efffc4 0%, #b9f36b 30%, #4ce0c1 65%, #a18dff 100%)',
};

export const FPS = 30;
export const LEAD = 0.6; // seconds of motion before the narrator starts
export const TAIL = 0.7; // seconds held after the line ends
