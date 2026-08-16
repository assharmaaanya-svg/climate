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

/* RESIZING MUST NOT MOVE THE STORY, AND IT DID.
   The scroll height is `TOTAL*H*0.92 + H`, so it is a function of the viewport, and the
   playhead is read as `scrollY / (scrollHeight - innerHeight)`. Change the viewport and
   the denominator changes while `scrollY` — an absolute pixel count the browser keeps —
   does not, so the same scroll position becomes a different point in the piece. Entering
   full screen makes the page taller and threw the visitor backwards; leaving it made the
   page shorter and threw them forwards. It was never a full-screen bug: it was every
   resize, and full screen is simply the one that happens mid-sentence.

   So the fraction is the thing that survives, not the pixel. It is read before the layout
   changes and written back after, which makes `T.target` come out of the next frame
   exactly as it went into this one. Nothing else has to be told: `T.p` eases toward a
   target that has not moved, and the ceiling and the floor are in playhead units already. */
function refit(){
  const before = TOTAL > 0 ? T.target / TOTAL : 0;
  const ok = fit();
  if (spine && TOTAL > 0){
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const y = Math.round(cl01(before) * max);
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
  }
  return ok;
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
  /* THE CANVAS IS NOT GIVEN A SIZE IN PIXELS ANY MORE, and this is the centring fix.
     It used to be set to exactly W and H, which is correct only for as long as W and H are
     correct. `#scene` is `position:fixed; inset:0`, and an element with `inset:0` AND an
     explicit width is anchored to the TOP-LEFT — so the single frame in which the viewport
     had changed and `fit()` had not yet run put a smaller canvas in the corner of a bigger
     window, with everything drawn in it, including the ending's centred sentence, up and to
     the left of where it belonged. Entering full screen is precisely the moment a viewport
     changes without a resize event necessarily arriving first, and it is the one place this
     was ever reported.

     The stylesheet already says `width:100%; height:100%`, so leaving the size alone lets
     the element fill the viewport at all times. The bitmap is then stretched to whatever
     the viewport is — and a stretch preserves the CENTRE, so a stale frame is at worst
     very slightly scaled and can never be off-centre. `pos()` below divides the stretch
     back out so the pointer still lands where it is pointing. */
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
    line:"Mum was always up first." },
  /* the instruction says what the cord is FOR. "Pull the cord down" is an errand; a cord in
     a window recess is not self-evidently a window opener, and the visitor who has just
     opened the curtains is looking for the next thing about the window, not the next thing
     to drag. The polluted room's cord carries the identical sentence, because it is the
     identical action and the whole point of that room is that it is the same room. */
  /* NO LINE HERE. "She always opened it first." was replaced by "Mum was always up first."
     on the beat before, and kept here as well, so the same fact was stated twice in the
     first thirty seconds of the piece. The one that survives is the one that is about her
     rather than about the window. An empty line also means the instruction does not have to
     wait for anything: `lineFirst` short-circuits on a beat with nothing to say. */
  { id:"light",     ch:1, len:1.4,  gate:"sash",    ask:"Pull the cord down to open the window",
    line:"" },
  /* No line here any more. "And the whole outside came in at once." was doing the
     environment's job for it: the window has just been opened, the ambience opens all the
     way, the garden arrives, and saying so as well is narration explaining a thing the
     visitor is in the middle of experiencing. The beat keeps its length and its silence. */
  { id:"breathe",   ch:1, len:1.1,
    line:"" },
  /* ---------------- chapter two: life happened outdoors ---------------- */
  { id:"laundry",   ch:2, len:2.10, gate:"sheets",  ask:"Tap your mother to hear her hum",
    line:"Sheets that had been in the sun all morning." },
  { id:"shirt",     ch:2, len:1.0,  gate:"shirt",   ask:"",
    line:"" },
  { id:"kite",      ch:2, len:1.6,  gate:"kite",    ask:"Hold to bring the kite closer",
    line:"You never once let go of the string." },
  /* The fireflies get their one line here, and here rather than anywhere else because
     this is the beat they actually arrive in: the population ramps them up from a sixth of
     the way through, which is the same stretch the narration is on screen for, so the
     sentence and the thing it is about are in the frame together. Nothing is explained and
     nothing is foreshadowed — they are simply another ordinary part of the evening, which
     is the whole reason their absence can mean something later without being pointed at. */
  { id:"climb",     ch:2, len:1.25,
    line:"The fireflies always come out before it gets properly dark" },
  { id:"stars",     ch:2, len:1.55, gate:"stars",   ask:"Tap a bright star to discover its story",
    line:"There were so many.\nIt was hard to look at one." },
  /* ROOM BEFORE THE BINOCULARS.
     This was 0.95, the shortest beat in the piece, and it sat between the star chapter and
     the hill — so the end of one memory and the arrival of the next fitted inside a single
     wheel gesture, and the transition happened TO the visitor rather than being made by
     them. At 1.9 it is in the same range as the memories either side of it (the washing
     line is 2.10, the hill 1.75, the stars 1.55): enough distance to feel the star chapter
     finish, sit in its last state, and go on deliberately. */
  { id:"wish",      ch:2, len:1.9,
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
  /* THE SAME LINE, AFTERWARDS, AND THE SAME THING TO DO WITH IT.
     The instruction is word for word the one from the clean chapter, and that is the point:
     the visitor is being invited to do the thing that worked before. What they get is not
     what they got before, and nothing here warns them. The gate is her, not the dust — this
     scene is about touching her — and the beat is longer than it was because the cough, the
     pause and the sentence all have to fit inside it. */
  { id:"r-laundry", ch:3, len:1.9, gate:"cough",  ask:"Tap your mother to hear her hum",
    line:"Mum still hung them out." },
  /* the same instruction as the evening chapter, word for word, because it is the same
     gesture and the same kite, and a chapter that renames the verb implies a new one */
  /* longer than the beat it replaced, because the light is the visitor's to move now and it
     needs room to be moved through. Measured at 1.6 the whole evening went to night in about
     three turns of a wheel, which is responsive but not an evening. The clean chapter spends
     2.85 beats getting there, across `kite` and `climb`; this spends about 1.8 of its 2.4. */
  { id:"r-kite",    ch:3, len:2.4,  gate:"rkite",   ask:"Hold to bring the kite closer",
    line:"" },
  /* No instruction, because there is nothing to do here and inventing something to do
     would be the one thing this chapter must not have. It is a beat you stand in and
     read, and it holds the scroll while five sentences go by with silence between them —
     which is only tolerable because the progress marker is moving the whole time. */
  { id:"r-stars",   ch:3, len:2.2,  gate:"rstars",  ask:"",
    line:"" },
  { id:"r-horizon", ch:3, len:1.3,  gate:"rfind",   ask:"Press and hold to zoom in with the binoculars",
    line:"" },
  { id:"r-drawing", ch:3, len:1.3,
    line:"She put it up in my room." },
  /* ------------- THE ENDING -------------
     One beat, and the only one in the piece that does not care where the scroll is.
     It pins the playhead when it is entered and runs on its own clock: the colouring
     goes out, the air goes with it, and then six sentences over a black screen with
     the memories coming back as sound. `len` here is scroll geometry and nothing else
     — the timing lives in the score. */
  { id:"end",       ch:3, len:1.6, line:"" }
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
/* EVERY REQUIRED INTERACTION HOLDS THE SCROLL, not a hand-picked three.
   It used to be the curtains, her humming and the kite, on the reasoning that those were
   the three moments worth insisting on. The rest were free, which meant a visitor
   scrolling at any pace slid straight past the binoculars, the drawing, the stars and the
   whole of the finale without touching them, and a piece you can scroll past is a
   slideshow. So the table is built from the beat list: any beat that declares a gate
   waits for that gate.

   With one condition. A beat only holds if it also has something to SAY — a wall with no
   instruction behind it is indistinguishable from a broken page, which is the one thing
   this must not feel like. `shirt`, the walk through the washing, has no instruction and
   therefore no wall. And the release in HOLD_PATIENCE below is the backstop for anything
   that cannot be satisfied for a reason nobody predicted. */
/* AND EXPLORATION IS NEVER A TOLL GATE.
   The lookout's four places are opportunities, not requirements. Holding the scroll until
   somebody has found three of them turns a valley you were invited to look around into a
   list you have to clear, which is the opposite of what the chapter is for. The checklist,
   the ticks, the per-place memories and the guidance all stay exactly as they are, and a
   visitor who finds none of them carries on unimpeded. */
/* BOTH LOOKOUTS WAIT, AND THEY WAIT FOR THE SAME THING.
   This was the asymmetry: the polluted chapter held the scroll until the lenses had been
   pressed and the clean one did not, so the same interaction was compulsory in one half of
   the piece and optional in the other. The binoculars are the one mechanic the work
   teaches, and a visitor who scrolled through the clean valley without ever pressing
   arrives at the polluted one being asked for something they have never done.

   Neither of them asks for anything to be FOUND. The list of four places is a thing to
   discover, not a toll. All either chapter waits for is that the lenses were held long
   enough to come into focus once — see `LOOK_HOLD` in the lookout, which both gates read.
   HOLD_NEVER is empty and stays empty: a gate that carries an instruction is a gate the
   scroll waits at, with no exceptions to keep in step. */
const HOLD_NEVER = {};
/* THREE GATES THE BACKSTOP DOES NOT OPEN.
   `HOLD_PATIENCE` exists so nobody can be permanently stuck: lean on the wheel for
   twenty-five seconds and the wait gives up. That is right for an interaction somebody
   might not manage. It is wrong for these three, because these three ARE the piece —
   colouring the drawing, and picking up the binoculars in either valley — and each of
   them asks for about a second of effort. Twenty-five seconds of scrolling let a visitor
   past the colouring having never touched a crayon, which is the one thing that beat
   exists to prevent.

   Nobody is trapped: the Skip control meets the current beat's gate outright, so the way
   through is a deliberate press rather than an accidental timeout. */
const HOLD_KEEP = { colour:1, find:1, rfind:1 };
const HOLD_AT = {};
for (const _b of BEATS){
  if (!_b.gate || !_b.ask || HOLD_NEVER[_b.gate]) continue;
  const g = _b.gate;
  HOLD_AT[_b.id] = {
    done: () => gateMet(g),
    prog: () => gateProgress(g),
    noFree: !!HOLD_KEEP[g],
    pass: () => { done[g] = true; }
  };
}
/* and the three that are not simply "is the gate met" */

/* The washing line never waited for its own gate, which is met the instant the scene
   draws. What is actually worth waiting for there is touching her, and hearing her. */
/* the polluted line holds until its whole disappearance has played out, not until she has
   spoken: the sheets leaving one by one and the empty line at the end of it are the point of
   the chapter, and they are behind this. */
HOLD_AT["r-laundry"] = { done: () => !!SHEETS_AFTER.over,
                         prog: () => gateProgress("cough"),
                         running: () => !!SHEETS_AFTER.said,
                         pass: () => { SHEETS_AFTER.said = 1; SHEETS_AFTER.over = 1;
                                       done.cough = true; } };

/* The polluted field is the washing line's shape again: an interaction, and then a
   sequence that plays itself out. It holds until the whole of it has — the light going,
   the kite lost, him gone, the empty field and the sentence over it are the chapter, and
   they all sit behind this. `running` exempts it from the patience backstop once the
   ending has started, so nobody is dropped into the next chapter mid-disappearance. */
HOLD_AT["r-kite"] = { done: () => !!KSKY_A.over,
                      prog: () => kiteAfterProgress(),
                      running: () => KSKY_A.goT >= 0,
                      pass: () => { KSKY_A.flew = 1; KSKY_A.over = 1;
                                    KSKY_A.kiteA = 0; KSKY_A.childA = 0;
                                    done.rkite = true; } };

/* The sky afterwards is a reading beat: no gesture, five sentences, and one long silence in
   the middle of them that is the whole point. It holds until the sequence has finished
   saying nothing, and `running` keeps the patience backstop off it once it has started —
   the sequence cannot be stuck, it can only be unfinished. */
HOLD_AT["r-stars"] = { done: () => !!SKYA.over,
                       prog: () => starsAfterProgress(),
                       running: () => SKYA.seq >= 0,
                       pass: () => { SKYA.over = 1; done.rstars = true; } };

HOLD_AT.laundry = { done: () => !!SHEETS.tapped,
                    prog: () => SHEETS.tapped ? 1 : 0,
                    pass: () => { SHEETS.tapped = 1; } };

/* The polluted bedroom is a whole sequence in one beat, and it holds until the sequence
   has finished rather than until any single interaction has: the curtains, then the cord,
   then the phone, then the line, and then a breath. Its own file owns the question. */
HOLD_AT["p-room"] = { done: () => returnDone(),
                      prog: () => returnProgress(),
                      /* `begun` too, or the pass is undone a moment later: onEnter fires for this
                beat on the way through and resetReturn zeroes the sequence unless the scene
                has already been marked as set up. */
                      running: () => !!PRET.tried,
             pass: () => { done.pcurtain = true; PRET.begun = 1;
                           PRET.tried = 1; PRET.settled = 1; } };
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

/* how far into a beat the visitor has to be before that beat's start becomes the boundary
   behind them. A fifth: past the transition in, before anything in the beat has happened. */
const MEM_IN = 0.20;
let memFloor = 0;

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
    /* THE BACKSTOP DOES NOT FIRE ON A SEQUENCE THAT IS ALREADY RUNNING.
       Two beats hold for a timed chain rather than for an interaction: the polluted bedroom
       after the cord is pulled, and the polluted washing line after she has spoken. Both
       finish on their own clocks and cannot be stuck, so releasing them because somebody
       leant on the wheel for twenty-five seconds would drop the visitor into the next
       chapter with the sequence still playing behind them. Before the chain starts the
       backstop is exactly as it was — that is the case where being stuck is possible. */
    if (T.wait > HOLD_PATIENCE && !h.noFree && !(h.running && h.running())){ holdFreed[b.id] = 1; continue; }
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
  /* AND THE ENDING, WHICH IS THE SAME KIND OF WAIT AGAIN AND STRICTER.
     Not a gate: it asks for nothing and cannot be failed. It is forty seconds of authored
     time with six sentences in it, each one paced against reading speed and against the
     sounds leaving one at a time, and a trackpad flick through it would turn the whole
     argument into a flicker. So the playhead is pinned just inside the beat for exactly
     as long as the sequence is running, and released the moment it finishes. */
  const ei = typeof endBeatIndex === "function" ? endBeatIndex() : -1;
  if (ei >= 0 && endingHolding()){
    T.ceil = Math.min(T.ceil, ofs[ei] + BEATS[ei].len*0.28);
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
  /* the same guard for the ending, for the same reason: a beat 1.6 long is well inside
     one step of a hard flick, and stepping over this one would skip the end of the piece */
  if (ei >= 0 && !endingPlayed()){
    const start = ofs[ei] + 0.02;
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
  /* EVERY MEMORY CLOSES BEHIND THE VISITOR, NOT JUST THE STATISTICS.
     A memory is a scroll chapter of its own: inside it you may scrub back and forth as
     much as you like — back to the beginning of the washing line, of the field, of the
     sky — and that is right, because a memory you cannot look at twice is a slideshow.
     But once you have properly entered the next one, the one before it is shut. Scrolling
     up from the start of the memory you are in does not reopen the memory before it, does
     not reverse the transition you just came through, and cannot drop you somewhere you
     have already been and finished with.

     `memFloor` is that boundary, and it only ever moves forward. It is raised when the
     playhead is MEM_IN into a beat and not the instant it touches one: a boundary set on
     contact would close behind somebody who is still halfway through the transition into
     the beat, and strand them inside it. A fifth of a beat is comfortably past that and
     comfortably before anything in the beat has happened.

     It is deliberately a floor and not a lock. Forward scrolling is untouched, and inside
     the current beat the visitor still has the whole of it to move around in. */
  /* AND THE BOUNDARY SITS ONE MEMORY BACK, NOT AT THE FEET OF THE CURRENT ONE.
     Closing the door the instant a memory is entered punishes the visitor for something
     they may not have meant to do: transitions can be crossed by accident, and a boundary
     with no give turns a mis-scroll into a thing that cannot be undone. So it is set to the
     START OF THE PREVIOUS memory — one step of recovery, and no more. From where they are
     they can go back into the memory before it and change their mind; from the beginning of
     THAT one they can go no further, because the floor is a high-water mark and never falls.
     What it buys is exactly one undo, which is what an accident needs, and it still cannot
     become a rewind through the whole story. */
  if (T.p >= MEM_IN){
    let k = 0;
    for (let i=0;i<N;i++){ if (T.p >= ofs[i] + MEM_IN) k = i; else break; }
    const back = ofs[Math.max(0, k-1)];
    if (back > memFloor) memFloor = back;
  }
  T.floor = memFloor;
  /* AND THE ENDING CLOSES BEHIND THE VISITOR THE INSTANT IT STARTS, not a fifth of the
     way in like every other memory. The per-memory rule would leave the door to the
     colouring open for the whole of the first sentence, and a wheel flick backward there
     abandons the sequence mid-thought with the sound still playing. Both directions are
     shut for as long as it runs; it opens again by itself at the end, so nobody is left
     on a page that will not move. */
  if (ei >= 0 && endingHolding() && ofs[ei] > T.floor) T.floor = ofs[ei];
  if (T.floor > 0 && want < T.floor) want = T.floor;

  if (oi >= 0 && onsPlayed()){
    /* the floor is the bedroom door. Not the black behind it: the black has already
       been left, by the piece rather than by the visitor, so there is nothing back
       there to return to and a floor inside it would only let them scroll back onto
       an empty screen. Back as far as the first post-pollution scene, and no further. */
    /* the statistics raise the boundary further than the per-memory one does — through the
       black rather than merely to the start of the beat behind it — so it takes the higher
       of the two rather than replacing it */
    T.floor = Math.max(T.floor, ofs[oi+1]);
    memFloor = T.floor;
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
  /* in the canvas's own drawing units, which are only the same as CSS pixels while the
     layout is current — see the note in `fit()` about why it may briefly not be */
  const r = cv.getBoundingClientRect();
  const sx = r.width  ? W / r.width  : 1;
  const sy = r.height ? H / r.height : 1;
  return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
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
/* and the same events tell the onboarding card that somebody has started. It cannot read
   the scroll position for that, because during onboarding the page is deliberately pinned
   and the position never changes. */
const askPace = px => { if (typeof paceInput === "function") paceInput(px); };
window.addEventListener("wheel", e=>{ stamp(); askPace(e.deltaY || 0); }, {passive:true});
let _tY = null;
window.addEventListener("touchstart", e=>{
  _tY = (e.touches && e.touches[0]) ? e.touches[0].clientY : null;
}, {passive:true});
window.addEventListener("touchmove", e=>{
  stamp();
  const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : null;
  if (y !== null && _tY !== null) askPace(y - _tY);
  _tY = y;
}, {passive:true});
window.addEventListener("keydown", e=>{
  /* only the keys that still scroll. Space and the page keys do nothing now, so counting
     them as "the visitor is asking to move on" would dismiss the pace card on a press that
     had no effect on anything else. */
  if (e.key==="ArrowDown"||e.key==="ArrowUp"){
    stamp(); askPace(H*0.28);
  }
}, {passive:true});

window.addEventListener("keydown", e=>{
  KEY[e.key]=true; KEY[e.key.toLowerCase()]=true;
  const k=e.key;
  /* the way out of the statistics, for anyone who needs one. It is the only key
     that does anything there, so nothing ends it by accident. */
  /* Escape leaves full screen in every browser, and it is also the one key that leaves the
     statistics. One press must never do both, so if this press belongs to full screen the
     piece does not read it at all. */
  if (k==="Escape" && typeof escapeBelongsToFullscreen==="function" && escapeBelongsToFullscreen()) return;
  if (k==="Escape" && typeof onsSkip==="function" && onsSkip()){ e.preventDefault(); return; }
  /* NOTHING MOVES A WHOLE SCREEN AT ONCE ANY MORE.
     Space and the page keys scrolled 0.85 of the viewport, and a beat's whole extent is
     only about 1.2 of it — so ONE accidental press was most of a memory, and two was all of
     it. Space in particular is the key people hit without meaning to: it is the pause key
     on everything else, and here it silently spent the scene they were in. That is not a
     thing to make smaller; it is a thing to remove.

     They are swallowed rather than merely un-handled, because the page is a real scrolling
     document and the BROWSER's own space-scroll would do exactly the same jump if this
     simply stopped listening. Home and End go too — they are the same accident with a
     bigger stride.

     WHAT SURVIVES IS THE ARROWS, at 0.28 of the viewport: less than a quarter of a beat,
     so no single press and no plausible run of them can cross a memory, and somebody
     working through this on a keyboard is not left with no way forward at all.

     And never when the focus is on a control: Space on a focused button is how that button
     is pressed, and a visitor who has tabbed to CC, Full, Skip or Begin must be able to use
     it. That check is what keeps this from being an accessibility regression. */
  const onCtl = e.target && e.target.closest && e.target.closest("button, a, input, select, textarea, [tabindex]");
  if (!onCtl){
    if (k===" " || k==="PageDown" || k==="PageUp" || k==="Home" || k==="End"){ e.preventDefault(); }
    else if (k==="ArrowDown"){ window.scrollBy(0,H*0.28); e.preventDefault(); }
    else if (k==="ArrowUp"){ window.scrollBy(0,-H*0.28); e.preventDefault(); }
  }
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
