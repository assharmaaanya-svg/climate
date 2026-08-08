/* ============================================================================
   BLUER — Aanya Sharma
   One continuous world. One aperture. One atmosphere.

   Structure of this file:
     [1] maths + colour
     [2] canvas, sizing, offscreen surfaces
     [3] ATMOSPHERE — the whole piece is driven by one number: pm (µg/m³ PM2.5).
         Everything visible derives from it through real optics:
           extinction  σ = 3·pm + σ_rayleigh   (Mm⁻¹, dry fine-mode approximation)
           visual range Vr = 3.912 / σ         (standard visibility relation)
           transmission T(d) = exp(−σ·d)       (Beer–Lambert)
         Distant things are blended toward AIRLIGHT, never toward flat grey.
         This is why the polluted view has depth: each layer loses contrast by
         its own real distance.
     [4] APERTURE — one shape that becomes the window, the open world, the
         binocular lenses, the drawing paper, and the window again. Every scene
         renders inside it. Because it is continuous, there are no cuts.
     [5] CAMERA — one persistent geography; scenes are viewpoints on it.
     [6] BEATS — timeline with interaction gates.
     [7] INPUT
   ========================================================================== */
(() => {
"use strict";

const cv = document.getElementById("scene");
if (!cv || !cv.getContext) return;
/* `ctx` is deliberately a let: the finale renders the remembered world into an
   offscreen buffer by swapping this reference, so that every scene function can
   be reused to draw the past without any of them knowing about it. */
let ctx = cv.getContext("2d", { alpha:false });
const MAIN = ctx;
if (!ctx) return;
const noscene = document.querySelector(".noscene");
if (noscene) noscene.remove();

/* ------------------------------------------------------------------ [1] maths */
const TAU = Math.PI * 2, PI = Math.PI;
const cl = (v,a,b) => v<a?a:v>b?b:v;
const cl01 = v => v<0?0:v>1?1:v;
const lerp = (a,b,t) => a+(b-a)*t;
const inv = (v,a,b) => b===a ? 0 : cl01((v-a)/(b-a));
const sm = (v,a,b) => { const t=inv(v,a,b); return t*t*(3-2*t); };
const sm5 = (v,a,b) => { const t=inv(v,a,b); return t*t*t*(t*(t*6-15)+10); };
const bell = (v,a,b) => { const t=inv(v,a,b); return Math.sin(t*PI); };
const ease = { io:t=>t<.5?2*t*t:1-2*(1-t)*(1-t), o:t=>1-(1-t)*(1-t), i:t=>t*t,
               o3:t=>1-Math.pow(1-t,3), back:t=>1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2) };
const rnd = (a,b) => a+Math.random()*(b-a);
const ri  = (a,b) => (a+Math.random()*(b-a+1))|0;
const pick = a => a[(Math.random()*a.length)|0];

const SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
const MONO  = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';

/* deterministic noise so the world is the same every visit */
let _sd = 20260806;
const srnd = () => { _sd = (_sd*1664525 + 1013904223) & 0x7fffffff; return _sd/0x7fffffff; };
const sr = (a,b) => a+srnd()*(b-a);
const hash = n => { const s=Math.sin(n*127.1)*43758.5453; return s-Math.floor(s); };
const vnoise = x => { const i=Math.floor(x), f=x-i, u=f*f*(3-2*f); return lerp(hash(i),hash(i+1),u); };
const fbm = (x,oct) => { let a=0,m=.5,f=1; for(let i=0;i<(oct||3);i++){ a+=vnoise(x*f)*m; m*=.5; f*=2; } return a; };

/* colour: plain [r,g,b] arrays, mixed in linear-ish space for nicer blends */
const mix = (A,B,t) => [ lerp(A[0],B[0],t), lerp(A[1],B[1],t), lerp(A[2],B[2],t) ];
const mixL = (A,B,t) => [
  Math.sqrt(lerp(A[0]*A[0], B[0]*B[0], t)),
  Math.sqrt(lerp(A[1]*A[1], B[1]*B[1], t)),
  Math.sqrt(lerp(A[2]*A[2], B[2]*B[2], t)) ];
const rgb  = c => "rgb("+(c[0]|0)+","+(c[1]|0)+","+(c[2]|0)+")";
const rgba = (c,a) => "rgba("+(c[0]|0)+","+(c[1]|0)+","+(c[2]|0)+","+(a<0?0:a>1?1:a)+")";
const lum  = c => .2126*c[0] + .7152*c[1] + .0722*c[2];
const shade = (c,k) => [c[0]*k, c[1]*k, c[2]*k];
const gray = (c,t) => { const g=lum(c); return [lerp(c[0],g,t),lerp(c[1],g,t),lerp(c[2],g,t)]; };

/* ------------------------------------------------------------------ [2] canvas */
let W=0,H=0,DPR=1,MIN=0, mobile=false, LOW=false;
const RM = window.matchMedia("(prefers-reduced-motion: reduce)");
let REDUCE = RM.matches;

const _w0 = window.innerWidth||1200, _h0 = window.innerHeight||800;
mobile = Math.min(_w0,_h0) < 760 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
LOW = mobile || (navigator.hardwareConcurrency||8) <= 4;

/* offscreen surfaces:
     PAPER — the child's drawing, painted once, then bleached and re-coloured
     GLASS — the blue crayon patch drawn on the window at the very end
     GRIME — soot that accumulates on the sill/glass, can be wiped, comes back  */
const PAPER = document.createElement("canvas"), pc = PAPER.getContext("2d");
const GLASS = document.createElement("canvas"), gc = GLASS.getContext("2d");
const GRIME = document.createElement("canvas"), mc = GRIME.getContext("2d");
/* TMP holds a whole remembered frame so it can be masked by the crayon marks.
   TMP2 is a second one, because the binoculars need the world as it is and the
   world as it was held at the same time. */
const TMP = document.createElement("canvas"), tc = TMP.getContext("2d");
const TMP2 = document.createElement("canvas"), tc2 = TMP2.getContext("2d");
let paperBuilt=false, paperW=0, paperH=0;

/* render `fn` into an offscreen buffer instead of the screen */
function offscreen(fn){
  const keep = ctx;
  ctx = tc;
  tc.setTransform(1,0,0,1,0,0);
  tc.clearRect(0,0,TMP.width,TMP.height);
  tc.lineJoin="round";
  fn();
  ctx = keep;
}
function offscreen2(fn){
  const keep = ctx;
  ctx = tc2;
  tc2.setTransform(1,0,0,1,0,0);
  tc2.clearRect(0,0,TMP2.width,TMP2.height);
  tc2.lineJoin="round";
  fn();
  ctx = keep;
}

function fit(){
  /* clientWidth first, innerWidth only as a fallback: innerWidth counts the
     scrollbar and this canvas has to match the box the centred UI is measured
     against, or the whole painting sits half a scrollbar to the right of it. */
  const w = document.documentElement.clientWidth || window.innerWidth || _w0;
  const h = document.documentElement.clientHeight || window.innerHeight || _h0;
  W=w; H=h; MIN=Math.min(W,H);
  DPR = Math.min(window.devicePixelRatio||1, LOW?1.6:2);
  cv.width = Math.max(1,(W*DPR)|0); cv.height = Math.max(1,(H*DPR)|0);
  cv.style.width=W+"px"; cv.style.height=H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.lineJoin="round";
  if (GLASS.width!==W || GLASS.height!==H){ GLASS.width=Math.max(1,W); GLASS.height=Math.max(1,H); }
  if (TMP.width!==W || TMP.height!==H){ TMP.width=Math.max(1,W); TMP.height=Math.max(1,H); }
  if (TMP2.width!==W || TMP2.height!==H){ TMP2.width=Math.max(1,W); TMP2.height=Math.max(1,H); }
  if (GRIME.width!==512){ GRIME.width=512; GRIME.height=512; }
  buildGeography();
  layoutSpine();
  return W>0 && H>0;
}

/* =========================================================================
   [3] ATMOSPHERE
   ========================================================================= */
const AIR = {
  pm: 6,                 // µg/m³ PM2.5 — the master variable
  sigma: 0,              // extinction, Mm⁻¹
  vr: 0,                 // visual range, km
  h: 0,                  // 0..1 "haze look", a convenience derived from pm
  tod: 0.06,             // time of day 0=night 0.25=dawn 0.5=noon 0.75=dusk
  wind: 0.45,
  gust: 0,
  glow: 0                // artificial skyglow at night, 0..1 (light pollution — separate cause)
};
const SIG_RAYLEIGH = 11;         // Mm⁻¹, clean-air molecular scattering
const MASS_EFF = 3.0;            // m²/g — dry fine-mode mass scattering efficiency

function airFromPM(pm){
  const sigma = MASS_EFF*pm + SIG_RAYLEIGH;      // Mm⁻¹
  const vr = 3.912 / (sigma*1e-6) / 1000;        // km
  return { sigma, vr };
}
function updateAir(){
  const a = airFromPM(AIR.pm);
  AIR.sigma = a.sigma; AIR.vr = a.vr;
  // "haze look" — log-ish so the first few µg/m³ read as a real change
  AIR.h = cl01(Math.log(AIR.pm/4)/Math.log(52));
}

/* transmission of contrast over d metres */
const trans = d => Math.exp(-AIR.sigma*1e-6*d);

/* ---- sky palette. Derived from time of day, then loaded with aerosol. ----
   The crucial physical detail: aerosol adds WHITE and lifts the horizon, and it
   raises the sky's own brightness. Clean sky = deep blue top, pale horizon.
   Hazy sky = pale everywhere, brightest around the sun, horizon dirty-warm. */
const SKY = {
  night: { top:[6,11,30],  mid:[13,21,48],  hor:[26,36,66],  sun:[150,160,200] },
  dawn:  { top:[38,64,124], mid:[132,120,150], hor:[236,158,110], sun:[255,196,132] },
  day:   { top:[46,104,196], mid:[112,164,220], hor:[186,214,232], sun:[255,246,214] },
  dusk:  { top:[28,44,102], mid:[126,96,142], hor:[232,138,96],  sun:[255,178,118] }
};
function skyStops(){
  const t = AIR.tod;
  let A,B,f;
  if (t < 0.25)      { A=SKY.night; B=SKY.dawn; f=inv(t,0.02,0.25); }
  else if (t < 0.5)  { A=SKY.dawn;  B=SKY.day;  f=inv(t,0.25,0.5); }
  else if (t < 0.72) { A=SKY.day;   B=SKY.dusk; f=inv(t,0.5,0.72); }
  else               { A=SKY.dusk;  B=SKY.night;f=inv(t,0.72,0.97); }
  const h = AIR.h, s = {};
  // aerosol target: near-neutral, slightly warm, brightening downward
  const gr = Math.max(0.14, 1 - AIR.tod*0 );
  s.top = mixL(mixL(A.top,B.top,f), [186,190,190], h*0.86);
  s.mid = mixL(mixL(A.mid,B.mid,f), [206,206,201], h*0.82);
  s.hor = mixL(mixL(A.hor,B.hor,f), [222,215,199], h*0.7);
  s.sun = mixL(mixL(A.sun,B.sun,f), [244,240,228], h*0.55);
  // night keeps its darkness but gains a milky lift from scattered city light
  if (AIR.tod<0.14 || AIR.tod>0.88){
    const g = AIR.glow;
    s.hor = mixL(s.hor, [104,92,74], g*0.7);
    s.mid = mixL(s.mid, [46,46,54],  g*0.45*(0.4+h));
    s.top = mixL(s.top, [22,26,38],  g*0.3*(0.4+h));
  }
  s.gr = gr;
  return s;
}
/* airlight — the colour distant things dissolve into. Not grey: the sky's own
   horizon colour, which is what actually happens. */
function airlight(){ const s=skyStops(); return s.hor; }

/* blend an object's colour toward airlight by its distance */
function farColour(c, d, extra){
  const T = trans(d) * (extra===undefined?1:extra);
  const al = airlight();
  // contrast loss: colour → airlight, and the object also gets slightly brighter
  return mixL(c, al, 1-T);
}
/* how strongly a thing at distance d still reads. Used for alpha and for
   deciding whether to bother drawing detail. */
const reads = d => trans(d);

/* sun position on screen, in the current aperture */
function sunPos(ap){
  const t = AIR.tod;
  // rises left, arcs, sets right
  const a = (t-0.25)*PI;                    // 0 at dawn, PI at dusk
  const x = ap.cx + Math.cos(PI-a)*ap.w*0.34;
  const y = ap.hy - Math.sin(a)*ap.h*0.62;
  return { x, y, up: Math.sin(a) };
}

/* =========================================================================
   [4] APERTURE — the single morphing opening
   ========================================================================= */
const AP = {
  mode:"rect",        // rect | binoc | circle
  x:0,y:0,w:0,h:0,    // rect bounds
  r:0,                // corner radius (paper has soft corners)
  cx:0,cy:0,
  hy:0,               // horizon on screen, inside the aperture
  sep:0, rad:0,       // binocular: lens separation + radius
  rot:0,
  zoom:1
};
function apFull(){ setAp({mode:"rect",x:0,y:0,w:W,h:H,r:0}); }
function setAp(o){
  AP.mode = o.mode || "rect";
  AP.x = o.x||0; AP.y=o.y||0; AP.w = o.w!==undefined?o.w:W; AP.h = o.h!==undefined?o.h:H;
  AP.r = o.r||0; AP.sep = o.sep||0; AP.rad = o.rad||0; AP.rot = o.rot||0;
  AP.cx = AP.x + AP.w/2; AP.cy = AP.y + AP.h/2;
  AP.hy = AP.y + AP.h*(o.hf!==undefined?o.hf:0.66);
}
function apPath(c){
  c.beginPath();
  if (AP.mode==="binoc"){
    c.arc(AP.cx-AP.sep, AP.cy, AP.rad, 0, TAU);
    c.moveTo(AP.cx+AP.sep+AP.rad, AP.cy);
    c.arc(AP.cx+AP.sep, AP.cy, AP.rad, 0, TAU);
  } else if (AP.mode==="circle"){
    c.arc(AP.cx, AP.cy, AP.rad, 0, TAU);
  } else if (AP.r>0){
    const r=Math.min(AP.r, AP.w/2, AP.h/2);
    c.moveTo(AP.x+r,AP.y);
    c.arcTo(AP.x+AP.w,AP.y,AP.x+AP.w,AP.y+AP.h,r);
    c.arcTo(AP.x+AP.w,AP.y+AP.h,AP.x,AP.y+AP.h,r);
    c.arcTo(AP.x,AP.y+AP.h,AP.x,AP.y,r);
    c.arcTo(AP.x,AP.y,AP.x+AP.w,AP.y,r);
    c.closePath();
  } else c.rect(AP.x,AP.y,AP.w,AP.h);
}
function clipAp(c){ apPath(c); c.clip(); }
/* is a screen point inside the aperture (for hit tests) */
function inAp(x,y){
  if (AP.mode==="binoc") return Math.hypot(x-(AP.cx-AP.sep),y-AP.cy)<AP.rad || Math.hypot(x-(AP.cx+AP.sep),y-AP.cy)<AP.rad;
  if (AP.mode==="circle") return Math.hypot(x-AP.cx,y-AP.cy)<AP.rad;
  return x>=AP.x&&x<=AP.x+AP.w&&y>=AP.y&&y<=AP.y+AP.h;
}
/* the window's rest rectangle, in the bedroom */
function winRect(){
  const w = Math.min(W*0.44, H*0.55), h = w*1.20;
  return { x:(W-w)/2 - W*0.015, y:H*0.155, w, h };
}

/* =========================================================================
   [5] CAMERA + GEOGRAPHY — one place, seen from different points
   ========================================================================= */
const CAM = { x:0, y:0, zoom:1, tilt:0 };

/* Layers carry a REAL distance in metres (for optics) and a parallax factor
   (for looks). The distances are chosen so that the hills go first, the town
   next, and the near roofs last — which is what the physics gives you. */
const LAYER = {
  hills:   { d:  6200, p: 0.030, y: 0.00 },
  ridge:   { d:  3400, p: 0.055, y: 0.02 },
  town:    { d:  1500, p: 0.115, y: 0.05 },
  poplars: { d:   700, p: 0.190, y: 0.07 },
  roofs:   { d:   240, p: 0.400, y: 0.11 },
  garden:  { d:    26, p: 0.860, y: 0.30 },
  near:    { d:     4, p: 1.000, y: 0.55 }
};
const GEO = { hills:[], ridge:[], town:[], poplars:[], roofs:[], grassTuft:[], stones:[] };

function buildGeography(){
  _sd = 20260806;
  GEO.hills.length=0;
  for (let i=0;i<9;i++) GEO.hills.push({ x: sr(-0.25,1.25), w: sr(0.22,0.5), h: sr(0.055,0.135), k: sr(0,1) });
  GEO.ridge.length=0;
  for (let i=0;i<7;i++) GEO.ridge.push({ x: sr(-0.2,1.2), w: sr(0.18,0.4), h: sr(0.03,0.07), k: sr(0,1) });
  GEO.town.length=0;
  // a real little town: blocks, one water tower, one school with a flagpole, one chimney
  for (let i=0;i<26;i++){
    GEO.town.push({ x: sr(-0.1,1.1), w: sr(0.014,0.045), h: sr(0.018,0.062), kind:"block", win: sr(0,1) });
  }
  GEO.town.push({ x:0.505, w:0.028, h:0.088, kind:"tower" });
  GEO.town.push({ x:0.775, w:0.075, h:0.040, kind:"school" });
  GEO.town.push({ x:0.19,  w:0.012, h:0.105, kind:"chimney" });
  GEO.poplars.length=0;
  for (let i=0;i<14;i++) GEO.poplars.push({ x: 0.30+i*0.0165+sr(-.003,.003), s: sr(0.8,1.15) });
  GEO.roofs.length=0;
  for (let i=0;i<16;i++) GEO.roofs.push({ x: sr(-0.1,1.1), w: sr(0.05,0.13), h: sr(0.03,0.075), pitch: sr(0.3,0.62), kind: srnd()<0.25?"flat":"pitch" });
  GEO.grassTuft.length=0;
  for (let i=0;i<220;i++) GEO.grassTuft.push({ x: sr(0,1), y: sr(0,1), s: sr(0.5,1.3), a: sr(-0.4,0.4) });
  GEO.stones.length=0;
  for (let i=0;i<40;i++) GEO.stones.push({ x: sr(0,1), y: sr(0,1), s: sr(0.4,1) });
}

/* project a layer-relative fraction to screen inside the aperture */
function px(L, fx){ return AP.cx + (fx-0.5 - CAM.x*L.p)*AP.w*CAM.zoom; }
function pyBase(L){ return AP.hy + L.y*AP.h*CAM.zoom - CAM.y*L.p*AP.h; }
function pw(L, fw){ return fw*AP.w*CAM.zoom; }
function ph(L, fh){ return fh*AP.h*CAM.zoom; }

/* =========================================================================
   [6] BEATS — the timeline. Each beat may gate progress until you act.
   ========================================================================= */
const BEATS = [
  /* ---------------- chapter one: the world came inside ---------------- */
  { id:"dark",      ch:1, len:1.5,  gate:"curtain", ask:"Gently pull the curtains apart",
    line:"Before you were awake, someone was already up." },
  { id:"light",     ch:1, len:1.4,  gate:"sash",    ask:"Pull the cord down",
    line:"She always opened it first." },
  { id:"breathe",   ch:1, len:1.1,
    line:"And the whole outside came in at once." },
  /* ---------------- chapter two: life happened outdoors ---------------- */
  { id:"laundry",   ch:2, len:2.10, gate:"sheets",  ask:"Tap your mother to hear her hum",
    line:"Sheets that had been in the sun all morning." },
  { id:"shirt",     ch:2, len:1.0,  gate:"shirt",   ask:"",
    line:"" },
  { id:"kite",      ch:2, len:1.6,  gate:"kite",    ask:"Hold to bring the kite closer",
    line:"You put it up into all of that." },
  { id:"climb",     ch:2, len:1.25,
    line:"" },
  { id:"stars",     ch:2, len:1.55, gate:"stars",   ask:"Tap a bright star to discover its story",
    line:"There were so many it was hard to look at one." },
  { id:"wish",      ch:2, len:0.95,
    line:"" },
  { id:"horizon",   ch:2, len:1.75, gate:"find",    ask:"Press and hold to zoom in with the binoculars",
    line:"On a good day you could see all the way to the hills." },
  { id:"drawing",   ch:2, len:1.45, gate:"colour",  ask:"Colour it in",
    line:"You never had to think about which blue." },
  /* The hinge. Chapter 7 has no name, which is deliberate: this sequence gets no
     chapter mark, no narration and no instruction, because it is not part of the
     memory and it is not asking the visitor for anything. See build/09b-onslaught.js
     for why it is the one beat that runs on a clock rather than on the scroll. */
  { id:"onslaught", ch:7, len:1.0,
    line:"" },
  /* THE RETURN. Chapter 7 has no name, so no chapter mark appears across either of
     these: the visitor is supposed to recognise the room, not be told about it.
     Both lines are empty on purpose. They have just been shown the statistics and
     they can see out of the window; a sentence here would be the piece explaining
     its own photograph. */
  { id:"p-room",  ch:7, len:2.0, gate:"pcurtain",
    ask:"Gently pull the curtains apart", line:"" },
  { id:"p-shut",  ch:7, len:2.0, line:"" },
  /* ------------- chapter three: the change is almost invisible ------------- */
  { id:"r-laundry", ch:3, len:1.35, gate:"brush",   ask:"Brush it off",
    line:"Later. The same line, the same sheets." },
  { id:"r-kite",    ch:3, len:1.3,  gate:"rkite",   ask:"Put it up again",
    line:"" },
  { id:"r-stars",   ch:3, len:1.35, gate:"rstars",  ask:"Find the shape again",
    line:"" },
  { id:"r-horizon", ch:3, len:1.3,  gate:"rfind",   ask:"Press and hold to zoom in with the binoculars",
    line:"" },
  { id:"r-drawing", ch:3, len:1.3,
    line:"She kept it on the fridge for eleven years." },
  /* ------------- chapter four: habits change before anyone names it ------------- */
  { id:"indoors",   ch:4, len:1.4,
    line:"Nobody announced it. The washing simply started coming in." },
  /* ---------------- chapter five: recognition ---------------- */
  { id:"return",    ch:5, len:1.2,  gate:"curtain2",ask:"Open the curtains",
    line:"" },
  { id:"stopped",   ch:5, len:1.35, gate:"latch",   ask:"Reach for the latch",
    line:"" },
  { id:"named",     ch:5, len:1.15,
    line:"Air pollution. This is the first time the word appears." },
  /* ---------------- the evidence ----------------
     Four beats, not seven. Each is a memory from the work that turns into its
     own evidence, and each is built to be felt before it is read. The physics
     stays in the renderer where it belongs; here it only ever gets one line. */
  { id:"e-dust",    ch:6, len:1.4, gate:"lift",  ask:"Lift the dust" },
  { id:"e-hills",   ch:6, len:1.9, gate:"pull",  ask:"Pull the air clean" },
  { id:"e-stars",   ch:6, len:1.6 },
  { id:"e-ledger",  ch:6, len:1.6 },
  /* ---------------- the ending ---------------- */
  { id:"f-curtain", ch:7, len:1.2, gate:"fcurtain", ask:"Part them" },
  { id:"f-both",    ch:7, len:1.6, gate:"fhold",    ask:"Hold the latch" },
  { id:"f-open",    ch:7, len:1.3, gate:"fopen",    ask:"You can still open it" },
  { id:"f-crayon",  ch:7, len:1.9, gate:"fdraw",    ask:"Draw on the glass" },
  { id:"f-rest",    ch:7, len:1.5 },
  { id:"f-end",     ch:7, len:1.7 }
];
const CH_NAME = { 1:"i · the world came inside", 2:"ii · life happened outdoors",
                  3:"iii · the change is almost invisible", 4:"iv · habits change first",
                  5:"v · recognition", 6:"the evidence", 7:"" };

/* THE THREE PLACES THE SCROLL WAITS.
   Scrolling is free through the whole piece, with three exceptions, and each one is
   there for its own reason rather than as a difficulty.

   The curtains are the first thing anyone touches, and a visitor who scrolls
   straight past them has not learned that this piece is a thing you touch at all —
   everything after that reads as a slideshow, because they were never shown
   otherwise. Her humming and the kite are the two moments the memory is actually
   made of: the sound of her, and the thing he put into the sky. Somebody who misses
   those has been through the chapters without being in them.

   Everywhere else the scroll never waits. And Skip is offered here as everywhere
   else, so nobody is trapped by an interaction they cannot work out — the wait is
   an invitation to try, not a lock.

   `prog` only feeds the little progress mark under the prompt. The washing line has
   no gate of its own to measure, because the chapter never waited for her before. */
const HOLD_AT = {
  dark:    { done: () => gateMet("curtain"), prog: () => gateProgress("curtain"),
             pass: () => { done.curtain = true; } },
  laundry: { done: () => !!SHEETS.tapped,    prog: () => SHEETS.tapped ? 1 : 0,
             pass: () => { SHEETS.tapped = 1; } },
  kite:    { done: () => gateMet("kite"),    prog: () => gateProgress("kite"),
             pass: () => { done.kite = true; } },
  /* and the curtains again, on the way back. Same reason as the first pair: a
     visitor who scrolls past them never finds out that the room is still here.

     AND IT LETS GO IF THERE IS NO ROOM TO OPEN. This hold is the one that stranded a
     reviewer completely: the bedroom painting was missing from their copy of the file,
     so the scene drew as a black rectangle, so there were no curtains to pull, so the
     gate could never be met, so the scroll waited on a black screen for ever. Asking
     somebody to interact with a scene that failed to load is not a wait, it is a dead
     end, and it must be impossible by construction rather than by the asset list
     happening to be right. */
  "p-room":{ done: () => gateMet("pcurtain") || !getPlate("roomAfter"),
             prog: () => gateProgress("pcurtain"),
             pass: () => { done.pcurtain = true; } }
};

/* AND NO HOLD MAY EVER BECOME A WALL, whatever goes wrong behind it.
   The three deliberate waits are all satisfiable and all show a pair of hands after a
   few idle seconds, so nobody who is engaging with them will ever reach this. It is
   here for everything I have not thought of: a plate that fails, a pointer event that
   never lands, a touch device that cannot make the gesture. Time spent actively
   pushing against a hold is counted, and it only counts while pushing — a nudge does
   not accumulate, and letting go bleeds it away — so this cannot fire on somebody who
   is simply taking their time in a scene. Once a hold has let go it stays let go. */
const HOLD_PATIENCE = 25;
const holdFreed = Object.create(null);

const N = BEATS.length;
let ofs = [0]; for (let i=0;i<N;i++) ofs.push(ofs[i]+BEATS[i].len);
const TOTAL = ofs[N];

const T = {
  p: 0,          // eased position along the timeline, in beat-length units
  target: 0,     // where scroll wants us
  ceil: 0,       // furthest we're allowed (only the onslaught uses this now)
  floor: 0,      // and the furthest BACK, once the statistics have been seen
  i: 0,          // current beat index
  f: 0,          // fraction through current beat
  blocked: false,
  push: 0,       // 0..1 how hard the visitor is pushing against a closed gate
  wait: 0,       // seconds spent pushing, so a hold can never become permanent
  inT: -1e9      // when scroll input last arrived
};
const spine = document.getElementById("spine");
function layoutSpine(){ if (spine) spine.style.height = (TOTAL*H*0.92 + H) + "px"; }

function beat(i){ return BEATS[cl(i,0,N-1)]; }
function id(){ return BEATS[T.i].id; }
/* progress inside beat `bid`: 0 before it, 1 after it */
function at(bid){
  const k = BEATS.findIndex(b=>b.id===bid);
  if (k<0) return 0;
  return cl01((T.p - ofs[k]) / BEATS[k].len);
}
function since(bid){ const k=BEATS.findIndex(b=>b.id===bid); return k<0?0:T.p-ofs[k]; }

const done = Object.create(null);   // gate id -> true
function gateMet(g){ return !g || done[g]===true; }
function meet(g){ if (g && !done[g]){ done[g]=true; ping(); } }
/* Same thing, without the bell. The lookout's four places acknowledge themselves
   by becoming a tick and nothing else: a chime on top of that would turn quietly
   recognising a school into scoring a point. */
function meetQuiet(g){ if (g && !done[g]){ done[g]=true; } }

function readTimeline(dt){
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  T.target = cl01(window.scrollY / max) * TOTAL;

  /* NOTHING HOLDS THE SCROLL ANY MORE.
     The ceiling used to sit at the end of the first beat whose interaction was
     undone, so a visitor who did not want to pull a curtain, or could not work out
     how, was stopped there. That is a puzzle gate in a piece that is not a puzzle:
     the interactions are how you spend time in a memory, not a toll to get to the
     next one. They are all still here and still do what they did, and `done` still
     records what was actually touched so the ending can count it. They simply do
     not stand in the doorway.

     `T.ceil` is left in place at the end of the piece rather than deleted, because
     `T.blocked` and `T.push` feed the resistance, the gate marker and the scroll
     cue, and all three now resolve to "not blocked" on their own. */
  /* how long they have been leaning on whatever is in front of them: blocked AND
     actually scrolling, this instant. Sitting still bleeds it away again, so the clock
     only runs for somebody repeatedly asking to leave and getting nowhere. */
  const pushing = T.blocked && (performance.now() - T.inT) < 400;
  if (pushing) T.wait += dt; else T.wait = Math.max(0, T.wait - dt*0.7);

  T.ceil = TOTAL;
  /* the three places the scroll waits: the first beat in the piece whose interaction
     has not happened yet, and no further */
  for (let i=0;i<N;i++){
    const b = BEATS[i], h = HOLD_AT[b.id];
    if (!h || h.done() || holdFreed[b.id]) continue;
    if (T.wait > HOLD_PATIENCE){ holdFreed[b.id] = 1; continue; }
    T.ceil = ofs[i] + b.len*0.86; break;
  }
  /* And the onslaught, which is a different kind of wait: not a gate at all. It is a
     shot with a length — it waits for nothing, asks for nothing, and lets go by
     itself after about twenty-eight seconds. Scrolling through it at speed would turn
     eleven facts into three, so the playhead is pinned for exactly as long as it is
     running and released the moment it stops. */
  const oi = typeof onsBeatIndex === "function" ? onsBeatIndex() : -1;
  if (oi >= 0 && onslaughtHolding()){
    T.ceil = Math.min(T.ceil, ofs[oi] + BEATS[oi].len*0.70);
  }

  let want = Math.min(T.target, T.ceil);

  /* AND IT CANNOT BE JUMPED OVER.
     The pin above only exists once the sequence has started, and the sequence starts
     when the beat is entered — which assumes the playhead visits every beat. It does
     not. T.p eases toward the target by about a sixth of the remaining distance each
     frame, so a hard flick of a trackpad moves it several beat-lengths in one step
     and can step straight across a beat 1.35 long: the whole hinge of the piece,
     skipped, silently, without ever having been entered. Found by sweeping the piece
     quickly and noticing the beat list came back one short.

     So the playhead is not allowed to cross the start of it in a single step. It
     lands just inside instead, the beat is entered properly, the clock starts and
     the pin takes over from there. Once it has played it is free ground again. */
  if (oi >= 0 && !onsPlayed()){
    const start = ofs[oi] + 0.02;
    if (T.p < start && want > start) want = start;
  }

  /* AND ONCE THEY HAVE BEEN SEEN, THERE IS NO GOING BACK TO THE CLEAN WORLD.
     After the statistics the piece is on the other side of something. Being able to
     scroll back up into the kite and the buttercups would make the whole middle of
     the work a slideshow the visitor can rewind, and would undo the one thing the
     black screen is for.

     The floor sits on the black at the end of the sequence, NOT on the beat after it.
     That distinction turned out to matter a great deal: a floor one beat further on
     does not only stop the visitor going back, it PUSHES them forward, because the
     playhead is clamped up to it from below. The held silence ended and the piece
     immediately threw them into the next scene — the exact opposite of ending on
     black. Here they are left on the black, free to go on when they choose and unable
     to go back before it. */
  T.floor = 0;
  if (oi >= 0 && onsPlayed()){
    T.floor = ofs[oi] + BEATS[oi].len*0.70;
    if (want < T.floor) want = T.floor;
  }
  const over = T.target - T.ceil;
  T.blocked = over > 0.03;
  T.push = cl01(over/0.5);

  // ease, with a touch of resistance at the very end of the piece
  const k = REDUCE ? 1 : (T.blocked ? 0.055 : 0.085);
  T.p += (want - T.p) * Math.min(1, k*dt*60);
  if (Math.abs(want-T.p) < 0.0004) T.p = want;

  let i=N-1; for (let j=0;j<N;j++){ if (T.p < ofs[j+1]){ i=j; break; } }
  if (i!==T.i){ T.i=i; onBeat(); }
  T.f = cl01((T.p - ofs[T.i]) / BEATS[T.i].len);
}
/* when blocked, hold the scrollbar near the gate so the page doesn't feel broken */
/* Hold the scrollbar itself against whichever limit is in force, so the page never
   feels like it has come unstuck from the thing on screen. */
function clampScroll(){
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  if (T.floor > 0){
    const y0 = (T.floor/TOTAL) * max;
    if (window.scrollY < y0){ window.scrollTo(0, y0); return; }
  }
  if (!T.blocked) return;
  /* Only a little slack past the ceiling. At 0.34 of a beat-length the scrollbar sat
     well beyond the end of the beat it was holding, so releasing the onslaught's pin
     threw the playhead straight through the black tail and into the next scene. */
  const y = (T.ceil + 0.12)/TOTAL * max;
  if (window.scrollY > y) window.scrollTo(0, y);
}

let beatEnter = 0, tSinceAct = 0;
function onBeat(){ beatEnter = performance.now(); tSinceAct = 0; onEnter(BEATS[T.i].id); }

/* =========================================================================
   [7] INPUT
   ========================================================================= */
const P = {
  x:-1e4, y:-1e4, px:-1e4, py:-1e4, dx:0, dy:0,
  down:false, active:false, speed:0, still:0, held:0,
  downX:0, downY:0, downT:0, drag:0, tapped:false
};
const KEY = Object.create(null);
let usedKeyboard = false;

function pos(e){
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
cv.addEventListener("pointerdown", e=>{
  const p = pos(e);
  P.down=true; P.active=true; P.x=p.x; P.y=p.y; P.px=p.x; P.py=p.y;
  P.downX=p.x; P.downY=p.y; P.downT=performance.now(); P.drag=0; P.held=0;
  try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  onDown(p.x,p.y);
  if (e.pointerType!=="mouse") e.preventDefault();
}, {passive:false});
cv.addEventListener("pointermove", e=>{
  const p = pos(e);
  if (!P.active){ P.px=p.x; P.py=p.y; }
  P.x=p.x; P.y=p.y; P.active=true;
  if (P.down){ P.drag += Math.hypot(p.x-P.px, p.y-P.py); onDrag(p.x,p.y); }
  onMove(p.x,p.y);
}, {passive:true});
function up(){
  if (P.down){ P.tapped = (P.drag<9 && performance.now()-P.downT<420); onUp(P.x,P.y); }
  P.down=false; P.held=0;
}
window.addEventListener("pointerup", up, {passive:true});
window.addEventListener("pointercancel", ()=>{ P.down=false; P.held=0; }, {passive:true});
cv.addEventListener("pointerleave", ()=>{ if(!P.down) P.active=false; }, {passive:true});

/* touch: let vertical swipes scroll, but never while a scene needs the drag */
cv.addEventListener("touchmove", e=>{ if (P.down && needsDrag()) e.preventDefault(); }, {passive:false});

/* WHEN THE VISITOR IS ACTUALLY ASKING TO GO ON.
   `T.blocked` cannot answer this. Once the scroll has been clamped the scrollbar rests
   a little past the ceiling — that slack is deliberate, it is what gives the wait some
   give instead of feeling dead — and the resting position on its own is far enough past
   to keep `blocked` true for ever, with nobody touching anything. So the patience timer
   read as if a hold were being leaned on the whole time a visitor sat quietly working
   out the curtains, which is the opposite of what it is for. Real input is stamped here
   instead, and only real input runs the clock. */
const stamp = () => { T.inT = performance.now(); };
window.addEventListener("wheel", stamp, {passive:true});
window.addEventListener("touchmove", stamp, {passive:true});
window.addEventListener("keydown", e=>{
  if (e.key===" "||e.key==="PageDown"||e.key==="PageUp"||e.key==="ArrowDown"||e.key==="ArrowUp") stamp();
}, {passive:true});

window.addEventListener("keydown", e=>{
  KEY[e.key]=true; KEY[e.key.toLowerCase()]=true;
  const k=e.key;
  /* the way out of the statistics, for anyone who needs one. It is the only key
     that does anything there, so nothing ends it by accident. */
  if (k==="Escape" && typeof onsSkip==="function" && onsSkip()){ e.preventDefault(); return; }
  if (k===" "||k==="PageDown"){ window.scrollBy(0,H*0.85); e.preventDefault(); }
  else if (k==="PageUp"){ window.scrollBy(0,-H*0.85); e.preventDefault(); }
  else if (k==="ArrowDown"){ window.scrollBy(0,H*0.28); e.preventDefault(); }
  else if (k==="ArrowUp"){ window.scrollBy(0,-H*0.28); e.preventDefault(); }
  if (k==="ArrowLeft"||k==="ArrowRight"||k==="Enter"||k==="a"||k==="d"||k==="w"||k==="s"){ usedKeyboard=true; onKey(k); }
}, {passive:false});
window.addEventListener("keyup", e=>{ KEY[e.key]=false; KEY[e.key.toLowerCase()]=false; }, {passive:true});

/* keyboard drive: a virtual pointer so every gate is reachable without a mouse */
const KP = { on:false, x:0, y:0, down:false };
function keyDrive(dt){
  const l = KEY["ArrowLeft"]||KEY["a"], r = KEY["ArrowRight"]||KEY["d"];
  const u = KEY["w"], d = KEY["s"], ent = KEY["Enter"];
  if (!(l||r||u||d||ent)){ if(KP.on){ KP.down=false; } return; }
  if (!KP.on){ KP.on=true; KP.x = W*0.5; KP.y = H*0.5; }
  const sp = MIN*0.9*dt;
  if (l) KP.x -= sp; if (r) KP.x += sp;
  if (u) KP.y -= sp; if (d) KP.y += sp;
  KP.x = cl(KP.x, 0, W); KP.y = cl(KP.y, 0, H);
  KP.down = true;
  P.px=P.x; P.py=P.y; P.x=KP.x; P.y=KP.y; P.active=true;
  if (!P.down){ P.down=true; onDown(P.x,P.y); } else onDrag(P.x,P.y);
}

function updPointer(dt){
  P.dx = P.x-P.px; P.dy = P.y-P.py;
  const mv = Math.hypot(P.dx,P.dy);
  P.speed = lerp(P.speed, Math.min(1, mv/16), 0.3);
  P.still = mv < 1.6 ? P.still+dt : 0;
  if (P.down) P.held += dt;
  P.px=P.x; P.py=P.y;
  if (mv>0.5) tSinceAct = 0; else tSinceAct += dt;
}
