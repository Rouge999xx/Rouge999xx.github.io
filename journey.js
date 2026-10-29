/* =========================================================
   Carl Tampus — Portfolio journey (three.js + GSAP ScrollTrigger)
   One world sits behind the home page and the camera travels through it as you scroll, along a trail of
   light. Each chapter has its own piece of the world: a living core in the hero, a production line of video
   frames for Flow Auto, a heartbeat for HealthNest, an orbit of tools, a globe that turns to Cebu, and a
   ring of light at the end. While a chapter holds the screen the camera eases in; between chapters it travels.
   main.js marks the page with html.journey (full motion, hardware WebGL 2) so the layout is ready early;
   this adds html.journey-live once the world has drawn its first frame. Elements marked data-station tell the
   camera where each piece of the world is framed. Colors follow the light and dark themes.
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

/* ---------- Colors ----------
   Glowing things add light on the navy theme and are drawn as ink on the paper one. */
const PALETTES = {
  dark: {
    bg: '#0a0f1a', dust: '#8fb4f5', spark: '#ffffff', trail: '#3d74f0', hot: '#d6e4ff',
    deep: '#061026', mid: '#1c47c4', rim: '#a8c6ff', edge: '#a8c6ff', dot: '#a8c6ff', glow: '#3b7bff', teal: '#4fe0c8', tealHot: '#c9fff4',
    label: '#c9d6ee', back: '#2a3b5f', frame: '#0e1729'
  },
  light: {
    bg: '#f5f4f0', dust: '#4b5a78', spark: '#1d4ed8', trail: '#1d4ed8', hot: '#0b2a80',
    deep: '#0d1c44', mid: '#1d4ed8', rim: '#a9c2ff', edge: '#1d4ed8', dot: '#2350c9', glow: '#1d4ed8', teal: '#0d9488', tealHot: '#064e45',
    label: '#1b2433', back: '#b9bfcc', frame: '#e9e6df'
  }
};
const themeName = () => (root.dataset.theme === 'light' ? 'light' : 'dark');

/* ---------- GLSL: 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) ---------- */
const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+10.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 105.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// Soft round points, shared by every particle field.
const POINT_FRAGMENT = /* glsl */`
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .06, d);
  if (a * vAlpha < .004) discard;
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;

/* ---------- The world's map ----------
   The camera path runs into the screen with gentle bends. Each station is a distance along it; a chapter
   that holds the screen moves the camera only HOLD units either side of its station, the rest is travel. */
const STATIONS = { core: 26, line: 100, pulse: 170, reel: 232, orbit: 296, globe: 366, portal: 440 };
const HOLD = 3;
const HERO_PUSH = 24;
const LOOK = 7;
// Where each piece sits on screen when its chapter is centered: x/y as a share of half the screen, d = distance.
// Narrow screens put it above the text (mx/my) and shrink it.
const PLACES = {
  core: { x: .44, y: .04, d: 11, mx: 0, my: .5 },
  line: { x: .42, y: .02, d: 12, mx: .05, my: .44 },
  pulse: { x: .43, y: .02, d: 12, mx: 0, my: .44 },
  reel: { x: 0, y: 0, d: 16, mx: 0, my: 0 },
  orbit: { x: .46, y: .02, d: 12, mx: 0, my: .44 },
  globe: { x: .42, y: 0, d: 12, mx: 0, my: .44 },
  portal: { x: 0, y: .02, d: 15, mx: 0, my: .08 }
};

// Rough coastlines (longitude, latitude) for the dotted globe: enough to read the continents, with the
// Philippines drawn island by island because that is where the globe stops.
const LAND = [
  // Eurasia
  '-9.5,37 -9,43 -1.5,43.5 -1.2,46.2 -4.5,48 -1.5,48.8 1.6,50.4 4.2,51.6 4.8,53 8.6,53.6 8.4,57 10.6,57.6 10.3,54.5 14,54 19,54.5 21.3,55.5 21,57.3 24.2,57.3 23.6,59.2 28.5,59.7 22.5,60 21.4,61.5 21.6,63.5 25.4,65.2 22,65.8 17,61 18.9,59.8 16.4,56.4 12.8,55.6 11,59.2 5.5,58.8 5,61.5 8,63.5 12.5,66 15.5,68.5 19,70 25,71 31,70 40,68 44,68.5 53,68.5 60,69.8 68,70.5 73,72.8 80,72.5 87,74.5 100,77.5 106,77 113,73.5 127,73 140,72.5 150,71 160,70 170,69.5 180,68.8 180,65 172,64.5 165,60 163,57 156,51 156.5,57 155,59.5 142,59.3 136,54.5 141,53 140.5,48 135,43.5 131,42.7 129.5,41 129.3,37 126.5,34.5 126.2,37.7 124.8,40 121.5,39 121.2,40.7 117.7,39 119,37 122.4,37 120.4,34.3 121.8,31 121.8,28.5 119.5,25.5 116.5,22.9 113,22.2 110.3,21 109.6,21.6 106.7,20.5 105.7,18.8 108.8,15.2 109.3,11.6 106.7,10.4 104.8,8.6 105,10.4 103,10.8 101,12.6 100,13.5 99.2,10.5 100.3,7.7 101.2,6.8 103.4,4.5 104.2,1.4 103.4,1.3 101,2.8 100.3,5.3 98.3,7.9 98.6,12 97.7,16.5 94.5,16 94.2,19 92.3,20.7 91.8,22.4 89,21.8 86.9,21 85,19.5 82.2,16.6 80.2,13.5 79.9,10.3 77.5,8 76.5,8.9 74.8,12.8 73.4,16 72.8,19 72.5,21.3 70.6,20.8 68.4,23.5 66.5,25.4 61.5,25.2 57.3,25.8 56.4,26.4 56.3,24.3 58.7,23.5 59.8,22.4 58.5,20.5 57.2,18.9 55.3,17.3 52.2,15.6 48.7,14 45,12.8 43.4,12.7 42.6,15.2 40.4,20 38.4,23.8 36.6,25.8 35,28 34.4,28.6 34,31.2 35.5,33.8 35.9,36.8 32.5,36.1 29.6,36.2 27.3,37 26.2,39.5 24,40.7 23,39.3 22.7,36.4 21.6,37.8 20.2,39.6 19.4,41.8 18.5,42.5 16.2,43.5 14,45.2 13.6,45.7 12.3,45.4 12.4,44.2 14,42.6 16.2,41.4 18.5,40.1 16.5,38.4 15.6,38 15.7,40 14.3,40.8 12.2,41.7 10.5,42.9 9.8,44.1 8.5,44.3 7,43.6 4.5,43.4 3.2,43 3.1,41.8 1,41 0,39.8 -0.4,38.4 -2,36.7 -5.3,36.1 -6.3,36.8 -7.4,37.2 -8.9,37',
  // Africa, Madagascar
  '-17.1,14.7 -16.7,12.4 -15,10.8 -13.2,8.9 -11.4,6.9 -7.5,4.4 -4,5.2 1,5.9 4.3,6.3 6,4.3 8.5,4.5 9.6,3.4 9.8,1 9.3,-1.5 11.8,-4.4 12.3,-6.1 13.4,-8.6 13.8,-11.7 12.2,-14.4 11.8,-17.3 14.4,-22.6 15.2,-26.9 16.5,-28.6 18.2,-31.7 18.4,-34.1 20,-34.8 22.6,-33.9 25.6,-33.7 27.5,-33.2 30,-31.3 32,-28.8 32.6,-26 35.4,-24.1 35.4,-21.8 34.7,-19.8 36.8,-17.9 39.5,-16.7 40.6,-14.8 40.4,-10.5 39.3,-8 39.2,-4.7 40.9,-2.5 43,0.2 46,2.8 48.6,5.4 50.8,10.4 51.2,11.8 48.9,11.2 45,10.5 43.3,11.9 42.1,13.3 39.8,15.4 38.4,18 37.1,21.1 35.6,23.9 34,27 32.6,29.9 32.3,31.3 29,30.9 25,31.6 20,30.9 18.9,30.3 15.2,32.3 11.1,33.3 10.2,37.2 7.5,37 3,36.8 -1.2,35.7 -5.9,35.8 -6.9,34 -9.6,30.4 -10.1,28.6 -12.9,27.8 -14.4,26.2 -16,24 -17,21 -16.3,19.3 -16.5,16.5',
  '44.2,-25.2 43.3,-22 44.3,-16.4 47,-15.2 49.3,-12 50.4,-15.4 49.8,-17.1 48.7,-20.4 47.2,-24.9 45.5,-25.6',
  // Americas
  '-168,66 -162,70 -156,71.3 -141,69.6 -128,70.2 -115,68.5 -95,68 -85,69.5 -80,63 -90,57 -82,52 -78,59 -70,61 -64,58 -60,55 -56,52 -60,47 -66,45 -70,43 -70,41.5 -74,40.6 -76,38 -76,35 -80,32 -81,30 -80,25.5 -82,27 -84,30 -89,30 -94,29.5 -97,26 -97.5,22 -96,19 -91,18.5 -90,21 -87,21.5 -88,16 -84,15.5 -83.5,11 -81,8.7 -79,9.3 -77.5,8 -80,7.2 -82,8 -86,11 -87.5,13 -92,14.5 -96,15.7 -101,17.5 -105.5,20 -105.7,23 -109,26 -112.5,29.5 -114.5,31.5 -114,30 -110,23 -112,25 -115,29.5 -117,32.5 -120.5,34.5 -122.5,37.5 -124,40 -124.5,43 -124,46.5 -124.5,48.5 -128,51 -131,54.5 -135,57.5 -140,59.8 -146,60.8 -152,59 -156,57 -162,55 -158,58 -162,60 -165,62.5 -166,64.5',
  '-73,78 -60,82 -35,83.5 -20,82 -18,77 -22,70 -30,68 -40,65 -43,60 -48,61 -52,65 -55,70 -60,76 -68,77',
  '-80,9 -77,8.5 -75,11 -72,12 -68,10.7 -62,10.5 -60,8.5 -55,6 -51,4.5 -50,1 -48,-1 -44,-2.5 -39,-4 -35,-6 -35,-9 -37.5,-12.5 -39,-17 -40,-21 -43,-23 -48,-26 -49,-29 -52,-32 -54,-34.5 -57.5,-35 -57,-37.5 -62,-39 -65,-42 -64,-45 -67.5,-47 -69,-51 -68.5,-53 -71,-54 -74,-52 -75,-48 -74,-44 -73.5,-40 -73,-36 -71.5,-31 -71,-24 -70,-18 -75,-15.5 -77,-12 -79,-8 -81,-5 -80,-1 -80,1.5 -78,3 -77,6 -78,8',
  '-84.9,21.9 -82,23.2 -77,22.2 -74.1,20.2 -77.5,19.9 -78.5,21.6 -81.5,22.2 -84,21.7',
  '-74.5,18.4 -72.8,19.9 -69.9,19.6 -68.4,18.6 -70.9,18 -72.8,18.1',
  // Islands of the north Atlantic
  '-5.7,50 -3,50.6 1.4,51.2 1.7,52.7 0.2,53.5 -1.4,55.2 -2,56.9 -1.8,57.6 -3.3,58.6 -5,58.6 -6.2,56.8 -5.6,55.3 -4.8,54.8 -3,53.9 -3,53.3 -4.6,52.8 -4.2,51.6 -5.3,51.7',
  '-10,51.6 -6.3,52.2 -6,54 -5.8,55.2 -7.6,55.3 -10,54.2 -9.5,53',
  '-24,65.5 -21,66.4 -15,66.5 -13.6,65.1 -15,64.2 -18.7,63.4 -22.7,63.8',
  // East and Southeast Asia
  '120.1,23 121,25.1 121.9,25 121.4,23 120.7,21.9',
  '108.6,19.2 110.5,20.1 111,19.6 109.6,18.2 108.7,18.5',
  '79.8,9.6 80.3,9.8 81.9,7.4 81.3,6.2 80.1,6 79.7,8.1',
  '130.9,34 132.6,35.5 135.3,35.7 136.8,37.2 138.5,37.8 139.9,40 140,41.4 141.5,41.4 141.9,39.2 140.9,37.8 140.8,35.7 139.8,34.9 138.7,34.6 137.3,34.6 136,33.4 135,34.6 133.4,34.4 131.9,33.9',
  '140,42.5 141.5,45.4 143,44.4 145.5,43.3 143.3,41.9 141,41.8',
  '129.6,33.2 131,33.9 132,33 131.3,31.3 130.2,31.2 129.8,32.7',
  '132.4,33.5 133.6,34.3 134.7,34.2 134.2,33.2 133,32.7',
  '141.8,46 142,49 142.2,54.3 143.3,52.8 143.4,49.2 142.5,46.2',
  '109.6,1.9 111,1.6 113,3.2 115.4,5.3 116.8,6.9 118.5,5.4 119.2,5 118.1,4.3 117.7,3 118.8,1 117.8,0.8 117.5,-0.8 116.5,-2 116.2,-3.9 114.5,-3.5 111.6,-3.4 110.2,-2.9 109.4,-0.6 108.9,0.3',
  '95.3,5.6 97.5,5.2 100.3,2.2 101.4,1.6 103.7,-1 105.8,-5.8 104.5,-5.9 102.3,-4 100.9,-1.8 99,0.6 98.7,1.7 97.1,3.3',
  '105.2,-6.8 106,-5.9 108.5,-6.4 110.7,-6.5 112.5,-6.9 114.4,-7.7 114.4,-8.6 111,-8.2 108.7,-7.7 106.4,-7.4',
  '118.8,-2.8 119.5,0.4 120.9,1.3 124.9,1.5 123.5,0.4 121.1,0.5 120.5,-0.5 121.6,-1 123.3,-0.8 122.4,-1.8 121.4,-1.9 122,-3.4 122.8,-4.8 121.5,-4.6 120.9,-2.6 120.4,-5.5 119.5,-5.5 119.4,-3.5',
  '115,-8.2 116.5,-8.9 119,-8.7 122,-8.6 124.5,-8.2 127,-8.4 125.2,-9.6 123.5,-10.3 121,-9 118,-8.9 116,-8.9',
  '130.9,-1.2 132.5,-0.4 134.1,-1 135,-3.3 137.9,-1.5 141,-2.6 144.5,-3.8 146,-5.5 147.6,-6 147.2,-8 150.7,-10.5 149,-10.2 146.4,-8.5 144,-7.7 143.3,-9 141,-9.1 139,-8.1 137.9,-5.4 135.5,-4.5 133.4,-4 132,-2.8',
  // The Philippines: Luzon, Mindoro, Palawan, Panay, Negros, Cebu, Bohol, Leyte, Samar, Mindanao
  '120,18.5 121.5,18.6 122.3,18.4 122.2,17 122.5,16.3 121.6,15.7 121.7,14.3 122.6,14.2 123.8,13.8 124.1,12.6 123.3,12.9 122.6,13.2 121.8,13.9 120.6,13.9 120.6,14.5 120,14.9 119.8,16.3 120.3,16.6 120.5,18',
  '120.3,13.5 121.5,13.2 121.2,12.2 120.8,12.6 120.4,13',
  '117.2,8.4 119,10.2 119.6,11.3 119.3,10.5 118.2,9 117.4,8.2',
  '121.9,11.9 123.1,11.6 122.5,10.6 121.9,10.5 121.9,11.4',
  '122.4,10.8 123.4,10.9 123.4,9.3 123,9 122.4,9.7',
  '123.3,11.3 124.1,11 124,10.2 123.4,9.4 123.2,10.2',
  '123.7,10.1 124.6,10.1 124.5,9.6 123.9,9.6',
  '124.3,11.5 125.1,11.3 125.3,10.2 124.8,10 124.3,10.6',
  '124.3,12.5 125.3,12.6 125.8,11.1 125,11 124.4,11.6',
  '121.9,7 122.2,8 123.5,8.6 124.6,8.9 125.5,9.8 126.3,9.3 126.5,7.5 126.2,6.3 125.4,5.6 124.2,6.2 123.9,7.6 122.8,7.3',
  // Australia, Tasmania, New Zealand
  '113.6,-22 114.2,-26 115,-30 115.7,-33.5 115,-34.3 118,-35 121.5,-33.8 124,-33 126,-32.3 129,-31.6 131.2,-31.5 134.2,-32.8 135.6,-34.8 137.8,-32.6 137.4,-35.2 139.6,-35.5 140.6,-38 143.5,-38.8 146.3,-39.1 147.9,-37.9 150,-37.4 151.3,-33.8 153.1,-30.4 153.6,-28 153,-25.2 150.8,-22.8 149.2,-21 146.3,-19 145.4,-16.4 145.3,-14.9 143.8,-14.2 143.5,-12.4 142.5,-10.7 141.6,-12.6 141.6,-15 140.8,-17.4 139.3,-17.4 137,-15.9 135.4,-14.9 136.7,-12.2 136,-11.9 133,-11.4 130.3,-12 129.4,-14.9 127.8,-14.2 125.9,-14.5 124.4,-16.3 122.2,-17.9 121.1,-19.4 118.8,-20.3 116.8,-20.6 114.6,-21.8',
  '144.6,-40.7 148.3,-40.9 148,-43.2 146,-43.6 145,-42.2',
  '172.7,-34.4 174.6,-36.2 175.9,-37.4 178.5,-37.7 177.9,-39.2 176.9,-39.6 175.2,-41.6 174.6,-41.2 175,-39.8 173.8,-39.2 174.6,-37',
  '172.7,-40.5 174.3,-41.3 173.4,-42.9 172.7,-43.8 171.2,-44.5 170.6,-45.9 169,-46.6 166.5,-46 166.8,-45.2 168.4,-44 170.5,-43 171.5,-41.7'
].map(ring => {
  const points = ring.split(' ').map(pair => pair.split(',').map(Number));
  const lons = points.map(p => p[0]), lats = points.map(p => p[1]);
  return { points, box: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] };
});
const CEBU = { lat: 10.3157, lon: 123.8854 };

function onLand(lon, lat) {
  if (lat < -71) return true; // Antarctica
  for (const { points, box } of LAND) {
    if (lon < box[0] || lon > box[2] || lat < box[1] || lat > box[3]) continue;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i], [xj, yj] = points[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}
// Longitude 0 points along +x and 90°E along -z, so turning the globe by -(90° + lon) brings lon to face +z.
function latLon(lat, lon, radius, target = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(lat), lambda = THREE.MathUtils.degToRad(lon);
  return target.set(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)).multiplyScalar(radius);
}

// Words and numbers drawn once into a texture, so labels in the world cost one draw call.
function textAtlas(items) {
  const width = 1024, height = 512, row = 72, pad = 14;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  const rects = {};
  let x = 0, y = 0;
  for (const item of items) {
    ctx.font = item.font;
    const w = Math.ceil(ctx.measureText(item.text).width) + pad * 2;
    if (x + w > width) { x = 0; y += row; }
    ctx.fillText(item.text, x + pad, y + row / 2 + 2);
    rects[item.key] = { u: x / width, v: 1 - (y + row) / height, w: w / width, h: row / height, aspect: w / row };
    x += w;
  }
  return { texture: new THREE.CanvasTexture(canvas), rects };
}

function glowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.22, 'rgba(255,255,255,.42)');
  gradient.addColorStop(.55, 'rgba(255,255,255,.08)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Scroll position to distance along the path: smooth through every key, so speed never jumps.
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
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 260);
  scene.add(camera);
  const shared = { uTime: { value: 0 }, uScale: { value: 800 } };
  const palette = { ...PALETTES[themeName()] };
  const colors = {}; // one THREE.Color per palette key, shared by every material that uses it
  for (const [key, value] of Object.entries(palette)) colors[key] = new THREE.Color(value);
  const glowing = []; // materials that add light on navy and lay ink on paper
  const glowBlend = material => {
    material.blending = themeName() === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending;
    glowing.push(material);
    return material;
  };
  const glowMap = glowTexture();

  /* ---------- The path ---------- */
  const pathPoints = [];
  for (let i = 0; i < 48; i++) pathPoints.push(new THREE.Vector3(Math.sin(i * .31) * 5 + Math.sin(i * .11 + 2) * 3, Math.sin(i * .23 + 1.3) * 2.2, 20 - i * 12));
  const path = new THREE.CatmullRomCurve3(pathPoints, false, 'centripetal');
  path.arcLengthDivisions = 3000;
  const LENGTH = path.getLength();
  const pointAt = (s, target = new THREE.Vector3()) => path.getPointAt(clamp(s / LENGTH, 0, 1), target);

  // A camera pose on the path, used for the real camera and to set each station's piece in front of it.
  const lookAhead = new THREE.Vector3();
  const pose = (s, target) => {
    pointAt(s, target.position);
    target.lookAt(pointAt(s + LOOK, lookAhead));
    target.updateMatrixWorld();
    return target;
  };

  /* ---------- Dust: a field of soft points around the whole path ---------- */
  function makeDust(count) {
    const positions = new Float32Array(count * 3), seeds = new Float32Array(count), sizes = new Float32Array(count);
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      pointAt(-10 + Math.random() * (LENGTH + 10), p);
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.6 + Math.pow(Math.random(), .75) * 32;
      positions[i * 3] = p.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = p.y + Math.sin(angle) * radius * .62;
      positions[i * 3 + 2] = p.z + (Math.random() - .5) * 14;
      seeds[i] = Math.random();
      sizes[i] = .04 + Math.pow(Math.random(), 3.2) * .13;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const material = glowBlend(new THREE.ShaderMaterial({
      uniforms: { ...shared, uReveal: { value: 0 }, uDust: { value: colors.dust }, uSpark: { value: colors.spark } },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute float aSeed; attribute float aSize;
        uniform float uTime, uScale, uReveal; uniform vec3 uDust, uSpark;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * .21 + aSeed * 31.) * .3;
          p.y += cos(uTime * .17 + aSeed * 17.) * .3;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          float d = -mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(aSize * uScale / max(d, .1), 40.);
          float twinkle = .62 + .38 * sin(uTime * (.8 + aSeed * 1.6) + aSeed * 60.);
          vAlpha = smoothstep(.8, 4., d) * (1. - smoothstep(70., 130., d)) * twinkle * uReveal * .85;
          vColor = aSeed > .9 ? uSpark : uDust;
        }`,
      fragmentShader: POINT_FRAGMENT
    }));
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  /* ---------- The trail: a thread of light just below the camera, carrying pulses forward ---------- */
  function makeTrail(end) {
    const points = [];
    for (let s = 0; s <= end; s += 3) points.push(pointAt(s).add(new THREE.Vector3(1.2, -1.6, 0)));
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, Math.round(end * 2.2), .014, 4, false);
    const material = glowBlend(new THREE.ShaderMaterial({
      uniforms: { ...shared, uCam: { value: 0 }, uLength: { value: end }, uReveal: { value: 0 }, uShow: { value: 0 }, uTrail: { value: colors.trail }, uHot: { value: colors.hot } },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        varying float vS;
        uniform float uLength;
        void main() { vS = uv.x * uLength; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uCam, uReveal, uShow; uniform vec3 uTrail, uHot;
        varying float vS;
        void main() {
          float ahead = vS - uCam;
          float fade = smoothstep(-2., 6., ahead) * (1. - smoothstep(16., 58., ahead));
          float pulse = pow(fract((vS - uTime * 7.5) / 38.), 18.);
          gl_FragColor = vec4(mix(uTrail, uHot, pulse), fade * (.22 + pulse * .9) * uReveal * uShow);
        }`
    }));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    return mesh;
  }

  /* ---------- Streaks: lines that only appear when you travel fast ---------- */
  function makeStreaks(count) {
    const positions = new Float32Array(count * 6), ends = new Float32Array(count * 2), seeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, radius = 1.8 + Math.random() * 7, z = -Math.random() * 60;
      for (let k = 0; k < 2; k++) {
        positions.set([Math.cos(angle) * radius, Math.sin(angle) * radius * .7, z], (i * 2 + k) * 3);
        ends[i * 2 + k] = k;
        seeds[i * 2 + k] = Math.random();
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const material = glowBlend(new THREE.ShaderMaterial({
      uniforms: { uTravel: { value: 0 }, uSpeed: { value: 0 }, uColor: { value: colors.rim } },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute float aEnd; attribute float aSeed;
        uniform float uTravel, uSpeed;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.z = mod(p.z + uTravel * 1.6, 60.) - 60.;
          p.z -= aEnd * uSpeed * (2. + aSeed * 4.);
          vAlpha = (1. - aEnd) * smoothstep(-60., -40., p.z) * smoothstep(0., -6., p.z);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor; uniform float uSpeed;
        varying float vAlpha;
        void main() { gl_FragColor = vec4(uColor, vAlpha * clamp(uSpeed * .9, 0., .55)); }`
    }));
    const lines = new THREE.LineSegments(geometry, material);
    lines.frustumCulled = false;
    return lines;
  }

  /* ---------- Stations ----------
   Each piece of the world lives in a group posed in front of its station, facing the camera that will be
   there (+z toward it). `stage` inside it is what the reveal animates. */
  const stations = [];
  function station(name, el, build) {
    const group = new THREE.Group();
    const stage = new THREE.Group();
    group.add(stage);
    scene.add(group);
    const item = { name, el, s: STATIONS[name], place: PLACES[name], group, stage, reveal: { value: 0 }, revealed: false, progress: 0, trigger: null, update: () => {} };
    if (el && el.offsetHeight > innerHeight * 1.5 || name === 'core') {
      item.trigger = ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom' });
    } else if (el) {
      item.trigger = ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top' });
    }
    item.update = build(item) || item.update;
    stations.push(item);
    return item;
  }
  const poser = new THREE.PerspectiveCamera(50, 1, .1, 10);
  function placeStation(item) {
    const { place } = item;
    const wide = camera.aspect >= 1;
    pose(item.s, poser);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * place.d;
    const halfW = halfH * camera.aspect;
    const x = (wide ? place.x : place.mx) * halfW, y = (wide ? place.y : place.my) * halfH;
    const offset = new THREE.Vector3(x, y, -place.d).applyQuaternion(poser.quaternion);
    item.group.position.copy(poser.position).add(offset);
    item.group.quaternion.copy(poser.quaternion);
    // Sized for a 16:9 screen; a squarer one has less room beside the text.
    item.group.scale.setScalar(wide ? clamp(camera.aspect / 1.78, .62, 1.05) : clamp(camera.aspect * 1.25, .5, .9));
  }

  /* The living core: a slowly breathing form, leaning toward the mouse. */
  function buildCore(item) {
    const uniforms = {
      uTime: shared.uTime, uMorph: { value: 1 }, uPointer: { value: new THREE.Vector3() }, uGlow: { value: .8 },
      uDeep: { value: colors.deep }, uMid: { value: colors.mid }, uRim: { value: colors.rim }
    };
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1, lite ? 12 : 20), new THREE.ShaderMaterial({
      uniforms,
      vertexShader: NOISE + /* glsl */`
        uniform float uTime, uMorph; uniform vec3 uPointer;
        varying vec3 vNormalV; varying vec3 vView; varying float vWave;
        float field(vec3 n) {
          float t = uTime * .16;
          return snoise(n * .95 + vec3(t, t * .7, -t * .5)) * .7 + snoise(n * 2.1 - vec3(t * 1.2)) * .18;
        }
        vec3 shape(vec3 n, out float w) {
          w = field(n);
          float lean = pow(max(dot(n, normalize(uPointer + vec3(0., 0., .001))), 0.), 5.) * length(uPointer);
          return n * (1.2 + (w * .13 + lean * .16) * uMorph);
        }
        void main() {
          vec3 n = normalize(position);
          vec3 a = normalize(cross(n, abs(n.y) < .99 ? vec3(0., 1., 0.) : vec3(1., 0., 0.)));
          vec3 b = cross(n, a);
          float w, w1, w2;
          vec3 p0 = shape(n, w);
          vec3 p1 = shape(normalize(n + a * .015), w1);
          vec3 p2 = shape(normalize(n + b * .015), w2);
          vec3 nrm = normalize(cross(p1 - p0, p2 - p0));
          if (dot(nrm, n) < 0.) nrm = -nrm;
          vWave = w;
          vec4 mv = modelViewMatrix * vec4(p0, 1.);
          vView = mv.xyz;
          vNormalV = normalize(normalMatrix * nrm);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uDeep, uMid, uRim; uniform float uGlow;
        varying vec3 vNormalV; varying vec3 vView; varying float vWave;
        void main() {
          vec3 N = normalize(vNormalV), V = normalize(-vView);
          float facing = clamp(dot(N, V), 0., 1.);
          float fres = pow(1. - facing, 2.6);
          vec3 L = normalize(vec3(-.45, .75, .55));
          float diff = clamp(dot(N, L), 0., 1.);
          float spec = pow(clamp(dot(reflect(-L, N), V), 0., 1.), 36.);
          // a deep core with light moving through it, bright at the rim like glass catching a lamp
          float bands = .5 + .5 * sin(vWave * 7. + facing * 3.);
          vec3 col = mix(uDeep, uMid, clamp(smoothstep(-.6, .8, vWave) * .55 + diff * .3 + bands * .15, 0., 1.));
          col = mix(col, uRim, fres * .9);
          col += uRim * (spec * .5 + pow(fres, 4.) * uGlow);
          gl_FragColor = vec4(col, 1.);
        }`
    }));
    orb.scale.setScalar(1.15);
    item.stage.add(orb);

    const halo = new THREE.Sprite(glowBlend(new THREE.SpriteMaterial({ map: glowMap, color: colors.glow, transparent: true, depthWrite: false, opacity: .6 })));
    halo.scale.setScalar(8.5);
    halo.position.z = -1.2;
    item.stage.add(halo);

    const rings = [];
    [[2.25, .9, .3], [2.9, -.5, 1.1]].forEach(([radius, tiltX, tiltZ], index) => {
      const ring = new THREE.Group();
      ring.rotation.set(tiltX + Math.PI / 2, 0, tiltZ);
      const band = new THREE.Mesh(new THREE.TorusGeometry(radius, .006, 3, 220), glowBlend(new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: .55, depthWrite: false })));
      ring.add(band);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 12), new THREE.MeshBasicMaterial({ color: colors.rim }));
      moon.position.x = radius;
      const spin = new THREE.Group();
      spin.add(moon);
      ring.add(spin);
      rings.push({ ring, spin, speed: index ? -.22 : .3 });
      item.stage.add(ring);
    });

    // A shell of points turning around the core.
    const count = lite ? 260 : 520;
    const positions = new Float32Array(count * 3), orbit = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3().randomDirection();
      const radius = 1.75 + Math.pow(Math.random(), 1.6) * 2.2;
      positions.set([dir.x * radius, dir.y * radius * .8, dir.z * radius], i * 3);
      orbit.set([.05 + Math.random() * .18, Math.random(), .02 + Math.random() * .05], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aOrbit', new THREE.BufferAttribute(orbit, 3));
    const shell = new THREE.Points(geometry, glowBlend(new THREE.ShaderMaterial({
      uniforms: { ...shared, uReveal: item.reveal, uColor: { value: colors.hot } },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute vec3 aOrbit;
        uniform float uTime, uScale, uReveal; uniform vec3 uColor;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float a = uTime * aOrbit.x + aOrbit.y * 6.2831;
          mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
          vec3 p = position; p.xz = r * p.xz;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(aOrbit.z * uScale / -mv.z, 24.);
          vAlpha = uReveal * (.35 + .65 * fract(aOrbit.y * 7.));
          vColor = uColor;
        }`,
      fragmentShader: POINT_FRAGMENT
    })));
    shell.frustumCulled = false;
    item.stage.add(shell);

    item.stage.scale.setScalar(.001);
    return (dt, local, pointer) => {
      uniforms.uPointer.value.set(pointer.x * 1.1, pointer.y * .9, .5).multiplyScalar(.7);
      orb.rotation.y += dt * .08;
      rings.forEach(({ ring, spin, speed }) => { ring.rotation.y += dt * speed * .25; spin.rotation.z += dt * speed; });
      item.stage.rotation.y = pointer.x * .18;
      item.stage.rotation.x = -pointer.y * .12;
    };
  }

  /* Flow Auto: a production line. Frames flow toward you, pass a gate and come out as finished screens. */
  function buildLine(item, screens, atlas) {
    const N = 9;
    // The line comes out of the distance and sweeps past on the right.
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.8, 2, -22), new THREE.Vector3(-1, 1.3, -13), new THREE.Vector3(-.15, .6, -6),
      new THREE.Vector3(1.1, -.15, -.6), new THREE.Vector3(3, -.95, 4.4)
    ]);
    const conveyor = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, .008, 3, false), glowBlend(new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: .22, depthWrite: false })));
    conveyor.renderOrder = -1; // under the frames that ride it
    item.stage.add(conveyor);

    const GATE = .42;
    const gate = new THREE.Group();
    gate.position.copy(curve.getPointAt(GATE));
    gate.lookAt(gate.position.clone().add(curve.getTangentAt(GATE)));
    const gateRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, .014, 4, 160), glowBlend(new THREE.MeshBasicMaterial({ color: colors.edge, transparent: true, opacity: .8, depthWrite: false })));
    gate.add(gateRing);
    const gateGlow = new THREE.Sprite(glowBlend(new THREE.SpriteMaterial({ map: glowMap, color: colors.glow, transparent: true, depthWrite: false, opacity: .35 })));
    gateGlow.scale.setScalar(4.2);
    gate.add(gateGlow);
    item.stage.add(gate);

    const geometry = new THREE.PlaneGeometry(1.6, 1);
    const cells = new Float32Array(N), numbers = new Float32Array(N * 4), states = new Float32Array(N * 2);
    geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
    geometry.setAttribute('aNum', new THREE.InstancedBufferAttribute(numbers, 4));
    geometry.setAttribute('aState', new THREE.InstancedBufferAttribute(states, 2));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uScreens: { value: screens }, uAtlas: { value: atlas.texture },
        uLine: { value: colors.edge }, uPanel: { value: colors.frame }, uGlow: { value: colors.glow }, uReveal: item.reveal
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        attribute float aCell; attribute vec4 aNum; attribute vec2 aState;
        varying vec2 vUv; varying float vCell; varying vec4 vNum; varying vec2 vState;
        void main() {
          vUv = uv; vCell = aCell; vNum = aNum; vState = aState;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uScreens, uAtlas; uniform vec3 uLine, uPanel, uGlow; uniform float uReveal;
        varying vec2 vUv; varying float vCell; varying vec4 vNum; varying vec2 vState;
        float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
        void main() {
          float develop = vState.x, alpha = vState.y * uReveal;
          vec2 p = (vUv - .5) * vec2(1.6, 1.);
          float d = box(p, vec2(.8, .5), .07);
          if (d > .01) discard;
          float edge = 1. - smoothstep(.0, .012, abs(d + .006));
          // the screen sits under a slim title bar
          float bar = step(.89, vUv.y);
          vec2 suv = vec2(vUv.x, vUv.y / .89);
          float col = mod(vCell, 2.), row = floor(vCell / 2.);
          vec3 shot = texture2D(uScreens, vec2((col + suv.x) * .5, ((1. - row) + suv.y) * .5)).rgb;
          // develops from the top down as it passes the gate, with a bright line where it is developing
          float shown = smoothstep(1. - develop - .02, 1. - develop + .02, suv.y);
          float sweep = (1. - smoothstep(0., .03, abs(suv.y - (1. - develop)))) * step(.01, develop) * step(develop, .99);
          float grid = max(step(.96, fract(vUv.x * 16.)), step(.94, fract(vUv.y * 10.))) * .18;
          vec3 base = mix(uPanel, uLine, grid);
          vec3 color = mix(base, shot * .92, shown * (1. - bar));
          color = mix(color, uPanel * 1.15 + uLine * .08, bar);
          color += uGlow * sweep * .9;
          color = mix(color, uLine, edge * .85);
          // frame number in the title bar
          vec2 nuv = (vUv - vec2(.03, .9)) / vec2(.066, .095);
          if (nuv.x > 0. && nuv.x < 1. && nuv.y > 0. && nuv.y < 1.) {
            float ink = texture2D(uAtlas, vNum.xy + nuv * vNum.zw).a;
            color = mix(color, uLine, ink);
          }
          gl_FragColor = vec4(color, alpha * (.55 + .45 * max(shown, edge)));
        }`
    });
    const frames = new THREE.InstancedMesh(geometry, material, N);
    frames.frustumCulled = false;
    frames.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    item.stage.add(frames);

    // Frames are drawn far to near, so their soft edges blend in the right order.
    const order = [...Array(N).keys()];
    const us = new Float32Array(N);
    const at = new THREE.Vector3(), ahead = new THREE.Vector3(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
    let drift = 0;
    item.stage.scale.setScalar(.001);
    return (dt, local) => {
      drift += dt * .012;
      const flow = drift + item.progress * 1.1 + local * .25;
      for (let i = 0; i < N; i++) us[i] = (((i / N + flow) % 1) + 1) % 1;
      order.sort((a, b) => us[a] - us[b]);
      order.forEach((i, slot) => {
        const u = us[i];
        curve.getPointAt(u, at);
        curve.getPointAt(Math.min(1, u + .01), ahead);
        const yaw = Math.atan2(ahead.x - at.x, ahead.z - at.z);
        e.set(0, yaw * .35 - .2, 0);
        q.setFromEuler(e);
        const size = 1.1 + u * .9;
        m.compose(at, q, sc.set(size, size, size));
        frames.setMatrixAt(slot, m);
        // Every lap a frame comes back as a different screen; its number stays its place in the line.
        const label = item.labels[(N - i) % N];
        cells[slot] = (i + Math.floor(i / N + flow)) % 4;
        numbers[slot * 4] = label.u;
        numbers[slot * 4 + 1] = label.v;
        numbers[slot * 4 + 2] = label.w;
        numbers[slot * 4 + 3] = label.h;
        states[slot * 2] = smooth(GATE - .06, GATE + .1, u);
        states[slot * 2 + 1] = smooth(0, .12, u) * (1 - smooth(.86, 1, u));
      });
      frames.instanceMatrix.needsUpdate = true;
      geometry.attributes.aCell.needsUpdate = true;
      geometry.attributes.aNum.needsUpdate = true;
      geometry.attributes.aState.needsUpdate = true;
      gateRing.rotation.z += dt * .4;
      const passing = us.some(u => Math.abs(u - GATE) < .03);
      gateGlow.material.opacity = lerp(gateGlow.material.opacity, passing ? .7 : .3, damp(dt, 6));
      item.stage.rotation.y = -.12 + local * .1;
    };
  }

  /* HealthNest: a heartbeat traced across the dark, with a ring of appointments filling in. */
  function buildPulse(item) {
    const beat = [[0, 0], [.55, 0], [.72, .2], [.9, 0], [1.08, 0], [1.16, -.28], [1.3, 1.6], [1.44, -.58], [1.56, 0], [1.95, 0], [2.2, .36], [2.5, 0], [3.2, 0]];
    const trace = new THREE.CurvePath();
    let last = null;
    for (let k = 0; k < 3; k++) {
      for (const [x, y] of beat) {
        const point = new THREE.Vector3(-4.2 + (k * 3.2 + x) * .875, y * .9, 0);
        if (last && point.distanceTo(last) > 1e-4) trace.add(new THREE.LineCurve3(last, point));
        last = point;
      }
    }
    const uniforms = { ...shared, uHead: { value: 0 }, uReveal: item.reveal, uColor: { value: colors.teal }, uHot: { value: colors.tealHot } };
    const line = new THREE.Mesh(new THREE.TubeGeometry(trace, 900, .024, 4, false), glowBlend(new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: /* glsl */`varying float vX; void main() { vX = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: /* glsl */`
        uniform float uHead, uReveal; uniform vec3 uColor, uHot;
        varying float vX;
        void main() {
          float behind = uHead - vX;
          float trail = behind >= 0. ? exp(-behind * 2.6) : 0.;
          float head = exp(-pow(behind / .012, 2.));
          gl_FragColor = vec4(mix(uColor, uHot, head), (.1 + trail * .9 + head) * uReveal);
        }`
    })));
    item.stage.add(line);
    const spark = new THREE.Sprite(glowBlend(new THREE.SpriteMaterial({ map: glowMap, color: colors.teal, transparent: true, depthWrite: false, opacity: .9 })));
    spark.scale.setScalar(1.1);
    item.stage.add(spark);

    // Appointments: dots around the trace that fill in as the chapter goes on.
    const count = 36;
    const positions = new Float32Array(count * 3), index = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = Math.PI / 2 - i / count * Math.PI * 2;
      positions.set([Math.cos(a) * 3.3, Math.sin(a) * 3.3, -.8], i * 3);
      index[i] = i / count;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aIndex', new THREE.BufferAttribute(index, 1));
    const dotUniforms = { ...shared, uFill: { value: 0 }, uReveal: item.reveal, uColor: { value: colors.teal }, uBack: { value: colors.back } };
    const dots = new THREE.Points(geometry, glowBlend(new THREE.ShaderMaterial({
      uniforms: dotUniforms, transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute float aIndex;
        uniform float uScale, uFill, uReveal, uTime; uniform vec3 uColor, uBack;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_Position = projectionMatrix * mv;
          float on = smoothstep(aIndex, aIndex + .03, uFill);
          gl_PointSize = (.09 + on * .07) * uScale / -mv.z;
          vColor = mix(uBack, uColor, on);
          vAlpha = (.45 + on * .55) * uReveal;
        }`,
      fragmentShader: POINT_FRAGMENT
    })));
    dots.frustumCulled = false;
    item.stage.add(dots);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.85, .005, 3, 200), glowBlend(new THREE.MeshBasicMaterial({ color: colors.teal, transparent: true, opacity: .25, depthWrite: false })));
    ring.position.z = -.8;
    item.stage.add(ring);
    const headPoint = new THREE.Vector3();

    item.stage.scale.setScalar(.001);
    return (dt, local) => {
      const head = (shared.uTime.value * .17) % 1.25;
      uniforms.uHead.value = head;
      trace.getPointAt(clamp(head, 0, 1), headPoint);
      spark.position.copy(headPoint);
      spark.material.opacity = head <= 1 ? .9 : 0;
      dotUniforms.uFill.value = lerp(dotUniforms.uFill.value, clamp(item.progress * 1.15, 0, 1), damp(dt, 4));
      ring.rotation.z += dt * .05;
      item.stage.rotation.y = -.16 + local * .12;
    };
  }

  /* Toolkit: the tools on three tilted orbits around a small core; the chapter's current group glows. */
  function buildOrbit(item, atlas) {
    const groups = [
      ['C#', 'C', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
      ['WinUI 3', 'WinForms', '.NET', 'XAML', 'React'],
      ['SQLite', 'MySQL', 'SQL', 'MS Access', 'MCP'],
      ['Algorithms', 'Data structures', 'Linear algebra']
    ];
    const orbits = [
      { radius: 1.7, tilt: new THREE.Euler(1.2, 0, .25), speed: .16 },
      { radius: 2.5, tilt: new THREE.Euler(1.36, 0, -.42), speed: -.11 },
      { radius: 3.25, tilt: new THREE.Euler(1.08, 0, .62), speed: .08 },
      { radius: 3.9, tilt: new THREE.Euler(1.44, 0, -.12), speed: -.05 }
    ];
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshBasicMaterial({ color: colors.mid, wireframe: true, transparent: true, opacity: .55 }));
    core.scale.setScalar(.55);
    item.stage.add(core);
    const coreGlow = new THREE.Sprite(glowBlend(new THREE.SpriteMaterial({ map: glowMap, color: colors.glow, transparent: true, depthWrite: false, opacity: .55 })));
    coreGlow.scale.setScalar(3.6);
    item.stage.add(coreGlow);
    const ringMaterials = orbits.map(({ radius, tilt }) => {
      const material = glowBlend(new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: .22, depthWrite: false }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .005, 3, 240), material);
      ring.quaternion.setFromEuler(tilt).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
      item.stage.add(ring);
      return material;
    });

    const labels = groups.flatMap((names, ring) => names.map((name, k) => ({ ring, phase: k / names.length * Math.PI * 2 + ring, rect: atlas.rects[name] })));
    const count = labels.length;
    const base = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute('position', base.attributes.position);
    geometry.setAttribute('uv', base.attributes.uv);
    geometry.instanceCount = count;
    const centers = new Float32Array(count * 3), rects = new Float32Array(count * 4), glow = new Float32Array(count);
    labels.forEach(({ rect }, i) => rects.set([rect.u, rect.v, rect.w, rect.h], i * 4));
    geometry.setAttribute('aCenter', new THREE.InstancedBufferAttribute(centers, 3));
    geometry.setAttribute('aRect', new THREE.InstancedBufferAttribute(rects, 4));
    geometry.setAttribute('aGlow', new THREE.InstancedBufferAttribute(glow, 1));
    const uniforms = { uAtlas: { value: atlas.texture }, uSize: { value: .3 }, uColor: { value: colors.label }, uHot: { value: colors.hot }, uReveal: item.reveal, uCore: { value: 0 } };
    const words = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute vec3 aCenter; attribute vec4 aRect; attribute float aGlow;
        uniform float uSize, uCore;
        varying vec2 vUv; varying float vGlow; varying float vFront;
        void main() {
          vec4 mv = modelViewMatrix * vec4(aCenter, 1.);
          float aspect = 2. * aRect.z / aRect.w; // the atlas is twice as wide as it is tall
          mv.xy += position.xy * vec2(aspect, 1.) * uSize * (1. + aGlow * .25);
          gl_Position = projectionMatrix * mv;
          vUv = aRect.xy + uv * aRect.zw;
          vGlow = aGlow;
          vFront = smoothstep(uCore - 1.2, uCore + .6, mv.z);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uAtlas; uniform vec3 uColor, uHot; uniform float uReveal;
        varying vec2 vUv; varying float vGlow; varying float vFront;
        void main() {
          float a = texture2D(uAtlas, vUv).a;
          if (a < .02) discard;
          gl_FragColor = vec4(mix(uColor, uHot, vGlow), a * (.28 + .72 * mix(.35, 1., vGlow)) * mix(.3, 1., vFront) * uReveal);
        }`
    }));
    words.frustumCulled = false;
    item.stage.add(words);

    const spot = new THREE.Vector3(), center = new THREE.Vector3();
    const tilts = orbits.map(({ tilt }) => new THREE.Quaternion().setFromEuler(tilt));
    const lit = orbits.map(() => 0);
    let spin = 0;
    item.stage.scale.setScalar(.001);
    return (dt, local) => {
      spin += dt;
      const active = Math.min(3, Math.floor(item.progress * 4.3));
      lit.forEach((value, ring) => { lit[ring] = lerp(value, ring === active && item.progress > 0 ? 1 : 0, damp(dt, 5)); });
      ringMaterials.forEach((material, ring) => { material.opacity = .16 + lit[ring] * .5; });
      labels.forEach(({ ring, phase }, i) => {
        const { radius, speed } = orbits[ring];
        const a = phase + spin * speed + local * speed * 3;
        spot.set(Math.cos(a) * radius, 0, Math.sin(a) * radius).applyQuaternion(tilts[ring]);
        centers[i * 3] = spot.x;
        centers[i * 3 + 1] = spot.y;
        centers[i * 3 + 2] = spot.z;
        glow[i] = lit[ring];
      });
      geometry.attributes.aCenter.needsUpdate = true;
      geometry.attributes.aGlow.needsUpdate = true;
      center.setFromMatrixPosition(item.stage.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      uniforms.uCore.value = center.z;
      core.rotation.y += dt * .3;
      core.rotation.x += dt * .12;
      item.stage.rotation.y = local * .25;
    };
  }

  /* About: a dotted globe that turns until Cebu faces you, with a pin and a beam of light. */
  function buildGlobe(item, atlas) {
    const RADIUS = 2.5;
    const spin = new THREE.Group(), tilt = new THREE.Group();
    tilt.rotation.x = THREE.MathUtils.degToRad(CEBU.lat);
    tilt.add(spin);
    item.stage.add(tilt);
    const settled = THREE.MathUtils.degToRad(-90 - CEBU.lon);

    const candidates = lite ? 12000 : 22000;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const positions = [], seeds = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < candidates; i++) {
      const y = 1 - (i + .5) / candidates * 2, r = Math.sqrt(1 - y * y), phi = i * golden;
      v.set(Math.cos(phi) * r, y, Math.sin(phi) * r);
      const lat = THREE.MathUtils.radToDeg(Math.asin(v.y));
      const lon = THREE.MathUtils.radToDeg(Math.atan2(-v.z, v.x));
      if (!onLand(lon, lat)) continue;
      positions.push(v.x * RADIUS, v.y * RADIUS, v.z * RADIUS);
      seeds.push(Math.random());
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    const dots = new THREE.Points(geometry, glowBlend(new THREE.ShaderMaterial({
      uniforms: { ...shared, uReveal: item.reveal, uColor: { value: colors.dot }, uBack: { value: colors.back } },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute float aSeed;
        uniform float uScale, uReveal; uniform vec3 uColor, uBack;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.);
          vec3 center = (modelMatrix * vec4(0., 0., 0., 1.)).xyz;
          float facing = dot(normalize(world.xyz - center), normalize(cameraPosition - world.xyz));
          vec4 mv = viewMatrix * world;
          gl_Position = projectionMatrix * mv;
          float grow = smoothstep(aSeed * .55, aSeed * .55 + .45, uReveal);
          float front = smoothstep(-.1, .3, facing);
          gl_PointSize = min((.042 + front * .018) * uScale / -mv.z * grow, 14.);
          vColor = mix(uBack, uColor, front);
          vAlpha = mix(.22, 1., front) * grow;
        }`,
      fragmentShader: POINT_FRAGMENT
    })));
    dots.frustumCulled = false;
    spin.add(dots);

    const air = new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.09, 48, 32), glowBlend(new THREE.ShaderMaterial({
      uniforms: { uColor: { value: colors.glow }, uReveal: item.reveal },
      transparent: true, depthWrite: false, side: THREE.BackSide,
      vertexShader: /* glsl */`varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor; uniform float uReveal;
        varying vec3 vN; varying vec3 vV;
        void main() { float rim = pow(clamp(1. - abs(dot(vN, vV)), 0., 1.), 3.); gl_FragColor = vec4(uColor, rim * .55 * uReveal); }`
    })));
    item.stage.add(air);

    // Cebu: a bright point, rings that ripple out from it, and a beam with its name.
    const home = latLon(CEBU.lat, CEBU.lon, RADIUS);
    const normal = home.clone().normalize();
    const pin = new THREE.Group();
    pin.position.copy(home);
    pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    spin.add(pin);
    const point = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 16), new THREE.MeshBasicMaterial({ color: colors.hot }));
    pin.add(point);
    const ripples = [0, .5].map(phase => {
      const ripple = new THREE.Mesh(new THREE.RingGeometry(.09, .11, 48), glowBlend(new THREE.MeshBasicMaterial({ color: colors.hot, transparent: true, depthWrite: false, side: THREE.DoubleSide })));
      pin.add(ripple);
      return { ripple, phase };
    });
    const beamMaterial = glowBlend(new THREE.ShaderMaterial({
      uniforms: { uColor: { value: colors.hot }, uReveal: item.reveal },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`varying float vY; void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: /* glsl */`uniform vec3 uColor; uniform float uReveal; varying float vY; void main() { gl_FragColor = vec4(uColor, (1. - vY) * .9 * uReveal); }`
    }));
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1.1, 6, 1, true), beamMaterial);
    beam.rotation.x = Math.PI / 2;
    beam.position.z = .55;
    pin.add(beam);
    const tag = atlas.rects['Cebu, Philippines'];
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: atlas.texture.clone(), color: colors.label, transparent: true, depthWrite: false }));
    label.material.map.offset.set(tag.u, tag.v);
    label.material.map.repeat.set(tag.w, tag.h);
    label.scale.set(.3 * tag.aspect, .3, 1);
    label.center.set(-.08, .5);
    label.position.z = 1.15;
    pin.add(label);

    item.stage.scale.setScalar(.001);
    return (dt, local) => {
      // The globe spins in from the east and settles with Cebu in front while the chapter holds.
      const turn = smooth(-1.1, -.05, local);
      spin.rotation.y = settled + (1 - turn) * 2.4 + Math.max(0, local) * .5 + Math.sin(shared.uTime.value * .2) * .02;
      ripples.forEach(({ ripple, phase }) => {
        const t = (shared.uTime.value * .55 + phase) % 1;
        ripple.scale.setScalar(1 + t * 5);
        ripple.material.opacity = (1 - t) * .8 * item.reveal.value;
      });
      label.material.opacity = item.reveal.value * smooth(.5, .9, turn);
      point.scale.setScalar(1 + Math.sin(shared.uTime.value * 3) * .15);
    };
  }

  /* Contact: a ring of light the trail runs into, with points drifting toward its center. */
  function buildPortal(item) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, .022, 4, 320), glowBlend(new THREE.MeshBasicMaterial({ color: colors.edge, transparent: true, opacity: .7, depthWrite: false })));
    item.stage.add(ring);
    const outer = new THREE.Mesh(new THREE.TorusGeometry(5.45, .006, 3, 320), glowBlend(new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: .35, depthWrite: false })));
    item.stage.add(outer);
    const count = lite ? 380 : 800;
    const orbit = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) orbit.set([Math.random(), Math.random() * Math.PI * 2, .4 + Math.random() * .9], i * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aOrbit', new THREE.BufferAttribute(orbit, 3));
    const vortex = new THREE.Points(geometry, glowBlend(new THREE.ShaderMaterial({
      uniforms: { ...shared, uReveal: item.reveal, uColor: { value: colors.rim }, uHot: { value: colors.hot } },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute vec3 aOrbit;
        uniform float uTime, uScale, uReveal; uniform vec3 uColor, uHot;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float t = fract(aOrbit.x - uTime * .025 * aOrbit.z);
          float r = mix(.3, 5.2, t);
          float a = aOrbit.y + uTime * .22 * aOrbit.z / (r * .35 + .5);
          vec3 p = vec3(cos(a) * r, sin(a) * r, -(1. - t) * 3.);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min((.03 + aOrbit.z * .022) * uScale / -mv.z, 10.);
          vColor = mix(uHot, uColor, t);
          vAlpha = smoothstep(0., .25, t) * (1. - smoothstep(.85, 1., t)) * .6 * uReveal;
        }`,
      fragmentShader: POINT_FRAGMENT
    })));
    vortex.frustumCulled = false;
    item.stage.add(vortex);
    const heart = new THREE.Sprite(glowBlend(new THREE.SpriteMaterial({ map: glowMap, color: colors.glow, transparent: true, depthWrite: false, opacity: .5 })));
    heart.scale.setScalar(5);
    heart.position.z = -3;
    item.stage.add(heart);
    item.stage.scale.setScalar(.001);
    return dt => {
      ring.rotation.z += dt * .05;
      outer.rotation.z -= dt * .03;
    };
  }

  /* ---------- Build: the hero first, so it can appear right away; the rest while the page is idle ---------- */
  const elements = Object.fromEntries([...document.querySelectorAll('[data-station]')].map(el => [el.dataset.station, el]));
  const dust = makeDust(lite ? 1100 : 2600);
  scene.add(dust);
  const trail = makeTrail(STATIONS.portal + 16);
  scene.add(trail);
  const streaks = lite ? null : makeStreaks(220);
  if (streaks) camera.add(streaks);
  const core = elements.core ? station('core', elements.core, buildCore) : null;

  /* ---------- Scroll to camera ---------- */
  let toS = () => STATIONS.core;
  let jumped = true;
  function measure() {
    jumped = true;
    const vh = innerHeight;
    const max = Math.max(1, ScrollTrigger.maxScroll(window));
    const keys = [];
    const ordered = [...stations].sort((a, b) => a.s - b.s);
    ordered.forEach((item, index) => {
      const rect = item.el.getBoundingClientRect();
      const top = rect.top + scrollY, height = rect.height;
      const holds = height > vh * 1.5;
      if (index === 0) {
        keys.push({ y: 0, s: item.s });
        if (holds) keys.push({ y: top + height - vh, s: item.s + HERO_PUSH });
      } else if (holds) {
        keys.push({ y: top, s: item.s - HOLD }, { y: top + height - vh, s: item.s + HOLD });
      } else if (camera.aspect < 1 && item.el.matches('.chapter')) {
        // Phones: a chapter leaves the top of the screen empty for its piece, so frame it as the chapter arrives.
        keys.push({ y: top, s: item.s });
      } else {
        keys.push({ y: top + height / 2 - vh / 2, s: item.s });
      }
    });
    keys.forEach(key => { key.y = clamp(key.y, 0, max); });
    for (let i = 1; i < keys.length; i++) keys[i].y = Math.max(keys[i].y, keys[i - 1].y + 1);
    // Past the last station the camera only drifts, so the end of the page never flies into the ring.
    const last = keys[keys.length - 1];
    if (max > last.y + 1) keys.push({ y: max, s: last.s + 2 });
    toS = monotone(keys.map(key => key.y), keys.map(key => key.s));
  }

  function layout() {
    const width = canvas.clientWidth || innerWidth, height = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5) * quality);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    shared.uScale.value = height * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    stations.forEach(placeStation);
  }

  /* ---------- Frame loop, on GSAP's ticker so it moves in step with smooth scrolling ---------- */
  let quality = 1;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, moved: 0 };
  addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    pointer.tx = event.clientX / innerWidth * 2 - 1;
    pointer.ty = -(event.clientY / innerHeight * 2 - 1);
    pointer.moved = performance.now();
  }, { passive: true });
  let paused = false;
  document.addEventListener('reel:toggle', event => { paused = event.detail.open; });

  const look = new THREE.Vector3(), side = new THREE.Vector3(), lift = new THREE.Vector3();
  let camS = toS(scrollY), speed = 0, frameCount = 0, lastScroll = scrollY, stillSince = 0, skipped = 0;
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
    if (Math.abs(y - lastScroll) > innerHeight * 1.5) jumped = true;
    lastScroll = y;
    if (moving || performance.now() - pointer.moved < 400) stillSince = time;
    frameCount++;
    // At rest on a fast screen, every other frame is plenty for the slow drift of the world.
    if (!moving && perf.native < 12 && time - stillSince > .5 && frameCount % 2) {
      skipped += deltaMs;
      return;
    }
    const dt = Math.min(deltaMs + skipped, 64) / 1000;
    skipped = 0;

    const s = toS(y);
    // A re-measured page or a restored scroll position is a jump, not travel: no streaks for it.
    if (jumped) jumped = false;
    else speed = lerp(speed, Math.abs(s - camS) / Math.max(dt, 1 / 240), damp(dt, 5));
    camS = s;
    pointer.x = lerp(pointer.x, pointer.tx, damp(dt, 2.6));
    pointer.y = lerp(pointer.y, pointer.ty, damp(dt, 2.6));

    pose(s, camera);
    side.set(1, 0, 0).applyQuaternion(camera.quaternion);
    lift.set(0, 1, 0).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(side, pointer.x * .35).addScaledVector(lift, pointer.y * .22);
    pointAt(s + LOOK, look).addScaledVector(side, pointer.x * .9).addScaledVector(lift, pointer.y * .6);
    camera.lookAt(look);
    camera.updateMatrixWorld();

    // The trail shows while travelling between chapters and steps aside while one holds the screen.
    let nearest = Infinity;
    for (const item of stations) nearest = Math.min(nearest, Math.abs(s - item.s));
    trail.material.uniforms.uCam.value = s;
    trail.material.uniforms.uShow.value = lerp(trail.material.uniforms.uShow.value, smooth(HOLD + 1, HOLD + 12, nearest), damp(dt, 6));
    if (streaks) {
      streaks.material.uniforms.uTravel.value = s;
      streaks.material.uniforms.uSpeed.value = lerp(streaks.material.uniforms.uSpeed.value, clamp((speed - 18) / 50, 0, 1.2), damp(dt, 4));
    }

    // Each piece shows only as its chapter nears, so nothing far ahead peeks out from behind the text.
    for (const item of stations) {
      const ahead = item.s + item.place.d;
      const visible = s > item.s - 58 && s < ahead + 4;
      item.group.visible = visible;
      if (!visible) continue;
      if (!item.revealed) reveal(item);
      item.progress = item.trigger ? item.trigger.progress : 0;
      const local = clamp((s - item.s) / 40, -1.5, 1.5);
      item.update(dt, local, pointer);
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

  // A piece of the world assembles the first time the camera comes near it.
  function reveal(item) {
    item.revealed = true;
    gsap.to(item.reveal, { value: 1, duration: 2.4, ease: 'power2.out' });
    gsap.to(item.stage.scale, { x: 1, y: 1, z: 1, duration: 2.2, ease: 'expo.out' });
    gsap.fromTo(item.stage.position, { z: -4 }, { z: 0, duration: 2.6, ease: 'expo.out' });
  }

  /* ---------- Themes: colors ease over with the page; glow switches between light and ink ---------- */
  function applyTheme() {
    const next = PALETTES[themeName()];
    const additive = themeName() === 'dark';
    glowing.forEach(material => {
      material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.needsUpdate = true;
    });
    for (const [key, value] of Object.entries(next)) {
      const target = new THREE.Color(value);
      gsap.to(colors[key], { r: target.r, g: target.g, b: target.b, duration: .4, ease: 'power1.out', overwrite: true });
    }
  }
  new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- Start ---------- */
  layout();
  measure();
  if (core) core.revealed = true; // it assembles with the intro below, not on first sight
  await renderer.compileAsync(scene, camera);
  gsap.ticker.add(render);
  ScrollTrigger.addEventListener('refresh', () => { measure(); layout(); });
  addEventListener('resize', layout, { passive: true });

  // The first frame is drawn: the world fades in behind the hero and its core assembles.
  requestAnimationFrame(() => {
    root.classList.add('journey-live');
    gsap.to(dust.material.uniforms.uReveal, { value: 1, duration: 2.6, ease: 'power2.out' });
    gsap.to(trail.material.uniforms.uReveal, { value: 1, duration: 3, delay: .6, ease: 'power2.out' });
    if (core) {
      gsap.to(core.reveal, { value: 1, duration: 2.4, delay: .3, ease: 'power2.out' });
      gsap.to(core.stage.scale, { x: 1, y: 1, z: 1, duration: 2.8, delay: .2, ease: 'expo.out' });
    }
  });

  // The other pieces are built while the page is idle, each in its own task, before anyone scrolls to them.
  const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise(resolve => setTimeout(resolve, 1500))]);
  await fonts;
  const words = [
    'C#', 'C', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'WinUI 3', 'WinForms', '.NET', 'XAML', 'React',
    'SQLite', 'MySQL', 'SQL', 'MS Access', 'MCP', 'Algorithms', 'Data structures', 'Linear algebra'
  ].map(text => ({ key: text, text, font: '500 44px "Inter Tight", system-ui, sans-serif' }));
  const tags = ['01', '02', '03', '04', '05', '06', '07', '08', '09'].map(text => ({ key: text, text, font: '500 44px "JetBrains Mono", ui-monospace, monospace' }));
  const atlas = textAtlas([...words, ...tags, { key: 'Cebu, Philippines', text: 'Cebu, Philippines', font: '500 44px "Inter Tight", system-ui, sans-serif' }]);
  atlas.texture.anisotropy = 4;
  renderer.initTexture(atlas.texture);

  const builders = [
    ['line', async item => {
      const images = await Promise.all(['scenes', 'story', 'settings', 'connect'].map(name => loadImage(`img/flow-auto/${name}.webp`)));
      const sheet = document.createElement('canvas');
      sheet.width = 2048;
      sheet.height = 1280;
      const ctx = sheet.getContext('2d');
      images.forEach((image, i) => ctx.drawImage(image, (i % 2) * 1024, Math.floor(i / 2) * 640, 1024, 640));
      const screens = new THREE.CanvasTexture(sheet);
      screens.anisotropy = 4;
      renderer.initTexture(screens);
      item.labels = tags.map(tag => atlas.rects[tag.key]);
      return buildLine(item, screens, atlas);
    }],
    ['pulse', buildPulse],
    ['reel', () => () => {}],
    ['orbit', item => buildOrbit(item, atlas)],
    ['globe', item => buildGlobe(item, atlas)],
    ['portal', buildPortal]
  ];
  for (const [name, build] of builders) {
    if (!elements[name]) continue;
    await idle();
    const item = station(name, elements[name], () => () => {});
    item.update = (await build(item)) || item.update;
    placeStation(item);
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
