/* ============================================================================
   THE CURTAINS
   ============================================================================
   These are not the painted curtains pushed sideways. Warping a painted strip
   drags the wall and the window frame along with it and piles the pixels up at
   the edge, which is exactly as bad as it sounds. So the curtains are built
   here instead, as real cloth, and they are the one thing in the bedroom the
   code owns outright.

   They still belong to the painting, because everything about them is measured
   off it:

   [1] THE COLOUR RAMP is sampled from bedroomclosed.png. Fifty scan points
       across the painted cloth gave the exact path the artist's red takes from
       the black of a fold trough (38,10,0) up through the body of the velvet
       to the white-hot edge beside the light slit (253,178,48). The cloth is
       shaded by walking that ramp, so it can never be the wrong red.

   [2] THE FOLD PITCH is measured too — about 3.2% of the frame per fold, seven
       to nine folds a panel, which is what the painting shows.

   [3] THE GEOMETRY is registered to bedroomopen.png: the panels hang from the
       painted rod, and when they are fully drawn back they come to rest
       exactly on top of the gathered curtains the painting already has at
       either side. Nothing crossfades. The cloth simply arrives where the
       paint already put it.

   The fold shading is not a texture. Fabric length is conserved: a panel has a
   fixed arc length, so drawing it back must compress it, and the compression
   ratio at each point IS the cosine of the angle the cloth turns away from the
   viewer. Bunch the panel and the folds deepen on their own, because there is
   more cloth than there is space to put it.
   ========================================================================== */

/* the artist's red, sampled across the painted cloth */
const CRAMP = [
  [0.00,  38, 10, 0], [0.12,  52, 14, 0], [0.25,  67, 16, 0], [0.40,  90, 20, 0],
  [0.55, 116, 27, 0], [0.70, 150, 38, 0], [0.82, 186, 56, 1], [0.91, 218, 79, 1],
  [0.97, 245,120, 5], [1.00, 253,178,48]
];
const CLUT_N = 128;
const CLUTS = Object.create(null);
function curtainLut(airQ){
  const key = airQ|0;
  if (CLUTS[key]) return CLUTS[key];
  const a = key/4;                                  // 0..1, quantised
  const out = new Array(CLUT_N);
  for (let i=0;i<CLUT_N;i++){
    const k = i/(CLUT_N-1);
    let j=0; while (j<CRAMP.length-2 && CRAMP[j+1][0]<k) j++;
    const p=CRAMP[j], q=CRAMP[j+1];
    const f = q[0]===p[0] ? 0 : (k-p[0])/(q[0]-p[0]);
    let r = p[1]+(q[1]-p[1])*f, g = p[2]+(q[2]-p[2])*f, b = p[3]+(q[3]-p[3])*f;
    // polluted daylight is duller and slightly cooler; the room barely changes,
    // so this is deliberately small
    if (a>0){
      const l = r*0.36+g*0.5+b*0.14;
      r = lerp(r, l*1.02, a*0.26); g = lerp(g, l*0.96, a*0.26); b = lerp(b, l*0.92, a*0.26);
    }
    out[i] = "rgb("+(r|0)+","+(g|0)+","+(b|0)+")";
  }
  CLUTS[key] = out;
  return out;
}

/* geometry, registered to the new room plates. The paintings have no rod and no
   curtains in them at all now, so these numbers answer only to the window:
   the cloth clears the glass when it is drawn back, and covers the frame when
   it is not. */
const CG = {
  top:  0.046,        // just under the rod this file's neighbour draws
  hemC: 0.830,        // hem, curtains closed — on the boards
  hemO: 0.824,        // hem, drawn back
  lOut: 0.296,        // left panel, outer edge (the rod's own end)
  rOut: 0.750,        // right panel, outer edge
  mid:  0.523,        // where they meet
  lIn:  0.378,        // drawn back, clear of the glass at 0.382
  rIn:  0.664,        // drawn back, clear of the glass at 0.658
  slack: 1.55         // arc length as a multiple of the closed width
};

/* state. cL / cR are read by the director's gate meter, so the names stay. */
const PROOM = {
  cL:0, cR:0, grab:0, open:0, breeze:0, dust:0,
  latchReach:0, blocked:0,
  nudge:0, nudgeTo:0,          // a tap gives a little, so a tap is never nothing
  idle:0, everMoved:0, demo:0, // how much help to offer, and how loudly
  sash:0, sashGrab:0, pullSwing:0
};

let DRV = null;                 // scratch for the fold derivative

/* per-frame geometry, shared by the clip and the cloth */
const CGEO = { built:false, rev:0, L:null, R:null };

function panelGeom(side, t, rev, W_, H_){
  const NS = LOW ? 52 : 76;                 // strips across the panel
  const RB = LOW ? 6  : 9;                  // shading row bands
  const outF = side ? CG.rOut : CG.lOut;
  const inOpenF = side ? CG.rIn : CG.lIn;
  const dirn = side ? -1 : 1;               // which way the inner edge lies
  const pull = ease.io(cl01(side ? PROOM.cR : PROOM.cL));

  const CC = CGEO.cam || {x:0,y:0};
  const xOut = outF*W_ + CC.x;
  const wClosed = Math.abs(CG.mid - outF)*W_;
  const fab = wClosed*CG.slack;                            // arc length, fixed
  const xInClosed = CG.mid*W_ + CC.x, xInOpen = inOpenF*W_ + CC.x;
  const xIn0 = lerp(xInClosed, xInOpen, pull);

  const top = CG.top*H_ + CC.y;
  const hem = lerp(CG.hemC, CG.hemO, pull)*H_ + CC.y;
  const bodyH = hem - top;

  const folds = Math.max(5, Math.round(fab/(W_*0.0335)));
  const w8 = cl01(AIR.wind + AIR.gust);
  const swayA = W_*0.0055*(0.28 + PROOM.breeze*0.9)*(0.5+w8*0.7);

  const g = { side, dirn, xOut, top, hem, folds, fab, pull,
              N:NS, R:RB, edges:[], bands:[], hemX:null, hemY:null, xIn0 };

  /* one row of the mapping. u = 0 at the outer edge, 1 at the inner edge. */
  const rowMap = (v, X, K)=>{
    // the leading edge lags at the bottom, and the whole panel breathes
    const lag  = pull*(1-pull*0.35)*MIN*0.030*v*v;
    const sway = Math.sin(t*0.62 + side*2.3 + v*1.9)*swayA*(0.25+v*0.9);
    const xIn = xIn0 - dirn*lag + sway;
    const w = Math.abs(xIn - xOut);
    const s = cl01(w/fab);                                 // mean compression
    let amp = cl01(1/Math.max(0.06,s) - 1);
    // deepest at the heading, where the cloth is gathered onto the rod, easing
    // out down the drop and opening again as it nears the floor
    amp = Math.min(amp*(1.06 - 0.34*v + 0.30*v*v), 0.95);
    const ph = side*1.7 + 0.30*v + Math.sin(t*0.5+side)*0.10;
    const k1 = TAU*g.folds, k2 = TAU*g.folds*0.43;

    // integrate the derivative to get a mapping that can never fold over.
    // The derivative lives in its own buffer: writing positions over the top of
    // it as you integrate is a very quiet way to make flat cloth.
    if (!DRV || DRV.length < NS+1) DRV = new Float64Array(NS+1);
    let tot = 0;
    for (let i=0;i<=NS;i++){
      const u = i/NS;
      // no two folds in a real curtain are the same width or the same depth,
      // so the pitch is wobbled by a fixed noise the fabric carries with it
      const j = vnoise(u*g.folds*1.0 + g.side*13.7)*2 - 1;
      DRV[i] = 1 + amp*(0.62*Math.cos(k1*u + ph + j*0.85)
                      + 0.24*Math.cos(k2*u + 1.7 + ph*0.3)
                      + 0.14*j);
      if (i>0) tot += (DRV[i]+DRV[i-1])*0.5;
    }
    const norm = tot/NS;
    // second pass: positions, and the shading that falls out of the compression
    let acc = 0;
    for (let i=0;i<=NS;i++){
      const d = DRV[i]/norm;                               // mean 1
      if (i>0) acc += (d + DRV[i-1]/norm)*0.5/NS;
      const u = i/NS;
      const cosT = cl01(s*d);                              // cloth turning away
      const xPos = xOut + dirn*w*cl01(acc);
      X[i] = xPos;
      if (K){
        const kFold = 0.02 + 0.98*Math.pow(cosT, 1.45);
        // the fold face turned toward the window catches the light
        const asym = amp*Math.sin(k1*u+ph)*0.14;
        // window light raking the leading edge: one tight term, one broad
        const dx = Math.abs(xPos - xIn);
        const glow = (0.30*Math.exp(-dx/(W_*0.0065)) + 0.30*rev*Math.exp(-dx/(W_*0.042)))
                     * (0.25 + 0.75*kFold);
        const expo = (0.62 + 0.24*rev) * (1 - 0.10*CGEO.air);
        K[i] = cl01((kFold + asym)*expo + glow);
      }
    }
    return { xIn, s, amp, ph };
  };

  const tmpX = new Float64Array(NS+1);
  // silhouette rows: inner and outer edge only
  for (let r=0;r<=RB;r++){
    const v = r/RB;
    const m = rowMap(v, tmpX, null);
    g.edges.push({ xIn:tmpX[NS], xOut:tmpX[0], y:top + v*bodyH });
  }
  // one shading pass for the whole drop: cloth hangs in continuous folds, and
  // stacking per-row patterns only ever produces horizontal joins
  {
    const X = new Float64Array(NS+1), K = new Float64Array(NS+1);
    rowMap(0.45, X, K);
    g.bands.push({ y0: top, y1: top + bodyH, X, K });
  }
  // the hem, scalloped by the folds and lifted where the panel is held back
  const hx = new Float64Array(NS+1), hy = new Float64Array(NS+1);
  const hm = rowMap(1, hx, null);
  const sc = MIN*0.0007 + hm.amp*MIN*0.0011;   // barely there, on purpose
  for (let i=0;i<=NS;i++){
    const u = i/NS;
    /* One slow swag across the whole hem, and almost nothing else. A hemmed
       edge hangs in a smooth line — the folds run down into it, they do not
       scallop it. Ripple it once per fold and you get a row of teeth; ripple it
       every twenty pixels and you still do. It is measured in screen distance
       now, kept long, and kept shallow. */
    const across = Math.abs(hx[i] - hx[0]);
    hy[i] = hem
          + MIN*0.0052*Math.sin(PI*u)*(0.5+hm.amp*0.5)
          + sc*Math.cos(across/(MIN*0.060)*TAU + hm.ph)
          - pull*u*u*MIN*0.026;
  }
  g.hemX = hx; g.hemY = hy;
  // every term that can push the hem down has to be in here: the fill stops at
  // hemMax while the clip follows the hem, so anything lower than hemMax comes
  // out as an unpainted notch — a row of them reads as a pinked edge
  g.hemMax = hem + MIN*0.0052 + sc + pull*0 + 3;
  return g;
}

function curtainGeom(t, rev, air){
  CGEO.cam = roomCam(CAM_CLOTH);      // the cloth moves with the room it is in
  CGEO.air = cl01(air||0);
  CGEO.rev = rev;
  CGEO.L = panelGeom(0, t, rev, W, H);
  CGEO.R = panelGeom(1, t, rev, W, H);
  CGEO.built = true;
}

/* the opening the curtains have actually made — used to punch the dark room
   plate so the light arrives through the gap and nowhere else */
function curtainGap(){
  if (!CGEO.built) return { x0:0, y0:0, x1:0, y1:0 };
  const x0 = CGEO.L.edges[0].xIn, x1 = CGEO.R.edges[0].xIn;
  return { x0, y0: CG.top*H, x1, y1: Math.min(CGEO.L.hemY[0], CGEO.R.hemY[0]) };
}

/* ---------------------------------------------------------------- the cloth */
function drawPanel(g, lut, t){
  const NS = g.N;
  ctx.save();
  // silhouette
  ctx.beginPath();
  ctx.moveTo(g.edges[0].xOut, g.top);
  ctx.lineTo(g.edges[0].xIn,  g.top);
  for (let r=1;r<=g.R;r++) ctx.lineTo(g.edges[r].xIn, g.edges[r].y);
  for (let i=NS;i>=0;i--) ctx.lineTo(g.hemX[i], g.hemY[i]);
  for (let r=g.R-1;r>=0;r--) ctx.lineTo(g.edges[r].xOut, g.edges[r].y);
  ctx.closePath();
  ctx.save();
  ctx.clip();

  // the velvet: one horizontal gradient per band, a stop per strip
  for (let b=0;b<g.bands.length;b++){
    const bd = g.bands[b];
    const xa = bd.X[0], xb = bd.X[NS];
    if (Math.abs(xb-xa) < 1) continue;
    const gr = ctx.createLinearGradient(xa, 0, xb, 0);
    const span = xb-xa;
    let last = -1;
    for (let i=0;i<=NS;i++){
      const o = cl01((bd.X[i]-xa)/span);
      if (o <= last) continue;                    // stops must not go backwards
      last = o;
      gr.addColorStop(o, lut[Math.min(CLUT_N-1, (bd.K[i]*(CLUT_N-1))|0)]);
    }
    ctx.fillStyle = gr;
    const y0 = b===0 ? g.top-2 : bd.y0;
    const y1 = b===g.bands.length-1 ? g.hemMax : bd.y1;
    ctx.fillRect(Math.min(xa,xb)-2, y0, Math.abs(span)+4, y1-y0);
  }

  // the light in the room, top to bottom, as one multiply
  const vg = ctx.createLinearGradient(0, g.top, 0, g.hem);
  vg.addColorStop(0.00, "rgb(112,112,112)");     // the rod's own shadow
  vg.addColorStop(0.06, "rgb(214,214,214)");
  vg.addColorStop(0.34, "rgb(255,255,255)");
  vg.addColorStop(0.78, "rgb(248,248,248)");
  vg.addColorStop(1.00, "rgb(196,196,196)");     // the hem, in its own shade
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = vg;
  ctx.fillRect(0, g.top-2, W, g.hemMax-g.top+4);
  ctx.globalCompositeOperation = "source-over";

  // the fabric's stars, tone on tone, squashed into the folds they sit on
  const ns = LOW ? 14 : 24;
  ctx.globalCompositeOperation = "lighter";
  for (let i=0;i<ns;i++){
    const us = hash(i*3.7 + g.side*11)*0.94 + 0.03;
    const vs = hash(i*7.3 + g.side*5)*0.90 + 0.05;
    const bi = Math.min(g.bands.length-1, (vs*g.bands.length)|0);
    const bd = g.bands[bi];
    const si = Math.min(NS, (us*NS)|0);
    const xs = bd.X[si];
    // local compression, so a star on the edge of a fold is edge-on too
    const comp = Math.abs(bd.X[Math.min(NS,si+1)] - bd.X[Math.max(0,si-1)]) /
                 Math.max(1e-6, Math.abs(bd.X[NS]-bd.X[0])/NS*2);
    const a = 0.075*cl01(comp)*(0.25+0.75*bd.K[si]);
    if (a < 0.004) continue;
    const rs = MIN*0.013;
    ctx.save();
    ctx.translate(xs, g.top + vs*(g.hem-g.top));
    ctx.scale(Math.max(0.10, comp), 1);
    ctx.fillStyle = rgba([255, 196, 130], a);
    ctx.beginPath();
    for (let k=0;k<10;k++){
      const ang = -PI/2 + k*PI/5, rr = (k%2 ? rs*0.42 : rs);
      k ? ctx.lineTo(Math.cos(ang)*rr, Math.sin(ang)*rr)
        : ctx.moveTo(Math.cos(ang)*rr, Math.sin(ang)*rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();                                  // out of the clip

  // the header: cloth gathered onto the rod, and the shadow it throws
  const hg = ctx.createLinearGradient(0, g.top-MIN*0.006, 0, g.top+MIN*0.020);
  hg.addColorStop(0, rgba([16,6,2], 0.55));
  hg.addColorStop(1, rgba([16,6,2], 0));
  ctx.save(); ctx.clip();                          // reuse the silhouette path
  ctx.fillStyle = hg;
  ctx.fillRect(0, g.top-MIN*0.006, W, MIN*0.030);
  ctx.restore();
  ctx.restore();

  // the shadow the panel casts on the wall beside it
  const ox = g.xOut - g.dirn*MIN*0.001;
  const sg = ctx.createLinearGradient(ox + g.dirn*MIN*0.026, 0, ox - g.dirn*MIN*0.006, 0);
  sg.addColorStop(0, rgba([10,4,1], 0));
  sg.addColorStop(1, rgba([10,4,1], 0.34*(1-CGEO.rev*0.4)));
  ctx.fillStyle = sg;
  ctx.fillRect(Math.min(ox - g.dirn*MIN*0.006, ox + g.dirn*MIN*0.026), g.top,
               MIN*0.032, g.hem-g.top);

  /* Where the hem meets the floor. A single gradient cannot do this: anchored
     at the mean hem it clamps to full strength above that line and bites teeth
     into the cloth, and anchored at the hem's highest point it smears shadow up
     the inner edge wherever the panel is held back. So the shadow is a few flat
     bands that each follow the hem exactly, fading as they go down. */
  const drop = MIN*0.030, steps = 5;
  ctx.save();
  for (let k=0;k<steps;k++){
    const o0 = drop*k/steps, o1 = drop*(k+1)/steps;
    ctx.beginPath();
    for (let i=0;i<=NS;i++){
      const x = g.hemX[i], y = g.hemY[i]+o0;
      i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
    }
    for (let i=NS;i>=0;i--) ctx.lineTo(g.hemX[i], g.hemY[i]+o1);
    ctx.closePath();
    ctx.fillStyle = rgba([12,5,1], 0.155*(1 - k/steps));
    ctx.fill();
  }
  ctx.restore();
}

function drawCurtains(t, dt, o){
  o = o||{};
  const lut = curtainLut(Math.round(cl01(o.air||0)*4));
  const gapOpen = Math.abs(CGEO.R.edges[0].xIn - CGEO.L.edges[0].xIn);

  drawPanel(CGEO.L, lut, t);
  drawPanel(CGEO.R, lut, t);

  /* the light between them. When they are all but shut this is the slit in the
     painting; once they are open it is the window doing its own work. */
  const slit = 1 - cl01(gapOpen/(W*0.045));
  if (slit > 0.01){
    const cx = (CGEO.L.edges[0].xIn + CGEO.R.edges[0].xIn)*0.5;
    const y0 = CG.top*H, y1 = CGEO.L.hemY[0];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const bw = W*0.011*(0.55+slit*0.45);
    const bg = ctx.createLinearGradient(cx-bw, 0, cx+bw, 0);
    bg.addColorStop(0.00, rgba([255,206,128], 0));
    bg.addColorStop(0.42, rgba([255,222,158], 0.16*slit));
    bg.addColorStop(0.50, rgba([255,238,198], 0.30*slit*(1-CGEO.air*0.45)));
    bg.addColorStop(0.58, rgba([255,222,158], 0.16*slit));
    bg.addColorStop(1.00, rgba([255,206,128], 0));
    ctx.fillStyle = bg;
    ctx.fillRect(cx-bw, y0, bw*2, y1-y0);
    // and the wedge it throws down onto the boards
    const fy = H*0.845;
    ctx.beginPath();
    ctx.moveTo(cx-W*0.012, fy); ctx.lineTo(cx+W*0.012, fy);
    ctx.lineTo(cx+W*0.085, H*1.02); ctx.lineTo(cx-W*0.105, H*1.02);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, fy, 0, H);
    wg.addColorStop(0, rgba([255,206,132], 0.20*slit));
    wg.addColorStop(1, rgba([255,196,120], 0));
    ctx.fillStyle = wg; ctx.fill();
    ctx.restore();
  }
}

/* ============================================================================
   TAKING HOLD OF THEM
   The first version of this asked for two long committed drags and let go of
   your progress the moment you paused. Nobody should ever be stuck on the
   first gesture of an artwork, so: a short travel, the other panel follows
   along, progress is never taken back, and a tap on its own opens them a
   little. Every route through this beat works.
   ========================================================================== */
const CTR = { travel: 0.115, follow: 0.62, need: 0.52 };

function curtainReach(x){
  // which panel is nearer the pointer, preferring whichever is further behind
  const lx = CGEO.built ? CGEO.L.edges[0].xIn : W*CG.mid;
  const rx = CGEO.built ? CGEO.R.edges[0].xIn : W*CG.mid;
  const dl = Math.abs(x - (lx + W*CG.lOut)*0.5), dr = Math.abs(x - (rx + W*CG.rOut)*0.5);
  if (PROOM.cL > 0.90 && PROOM.cR < 0.90) return 2;
  if (PROOM.cR > 0.90 && PROOM.cL < 0.90) return 1;
  return dl <= dr ? 1 : 2;
}

function bedroomInteract(g, t, dt){
  /* `pcurtain` is the same pair of curtains in the return, and it has to be on this
     list or two things silently do not happen: the gate is never met, so the scroll
     waits for ever, and the idle counter that brings the helping hands up never
     runs, so a visitor who does not know what to do is offered nothing. */
  const isCurtain = (g==="curtain" || g==="curtain2" || g==="pcurtain");
  const wasMin = Math.min(PROOM.cL, PROOM.cR);

  if (P.down && P.active){
    if (!PROOM.grab){ PROOM.grab = curtainReach(P.x); cv.className = "grabbing"; }
    // outward is progress, whichever side you are holding
    const out = PROOM.grab===1 ? -P.dx : P.dx;
    const d = out / (W*CTR.travel);
    if (Math.abs(d) > 1e-5){
      if (PROOM.grab===1){ PROOM.cL = cl01(PROOM.cL + d); PROOM.cR = cl01(PROOM.cR + d*CTR.follow); }
      else               { PROOM.cR = cl01(PROOM.cR + d); PROOM.cL = cl01(PROOM.cL + d*CTR.follow); }
      if (d>0){ PROOM.everMoved = 1; if (Math.random()<0.30) sfx.cloth(0.40); }
    }
  } else {
    if (PROOM.grab) cv.className = "grabbable";
    PROOM.grab = 0;
    // a tap is a small pull, so poking at them is never nothing
    if (P.tapped){
      P.tapped = false;
      PROOM.nudgeTo = Math.min(1, Math.max(PROOM.cL, PROOM.cR) + 0.30);
      PROOM.everMoved = 1; sfx.cloth(0.5);
    }
  }
  // the tap's pull, eased in
  if (PROOM.nudgeTo > 0){
    const k = Math.min(1, dt*3.2);
    PROOM.cL = lerp(PROOM.cL, Math.max(PROOM.cL, PROOM.nudgeTo), k);
    PROOM.cR = lerp(PROOM.cR, Math.max(PROOM.cR, PROOM.nudgeTo), k);
    if (Math.min(PROOM.cL,PROOM.cR) > PROOM.nudgeTo-0.006) PROOM.nudgeTo = 0;
  }
  // progress is never taken back
  const floor = Math.max(0, wasMin - dt*0.02);
  if (PROOM.cL < floor) PROOM.cL = floor;
  if (PROOM.cR < floor) PROOM.cR = floor;

  // how much help to offer
  if (Math.min(PROOM.cL,PROOM.cR) < CTR.need && isCurtain && !introOn){
    PROOM.idle += dt*(P.down?0.35:1);
    PROOM.demo = lerp(PROOM.demo, PROOM.idle>1.8 ? 1 : 0, Math.min(1, dt*1.6));
  } else {
    PROOM.idle = 0;
    PROOM.demo = lerp(PROOM.demo, 0, Math.min(1, dt*3));
  }

  if (isCurtain && Math.min(PROOM.cL, PROOM.cR) > CTR.need) meet(g);
}

/* ------------------------------------------------------------------ the help
   A hand on each leading edge, and an arrow showing where it goes. After a few
   seconds of nothing, the hand does the gesture itself, over and over, until
   the visitor does it. This is the only place in the piece that explains
   itself, because it is the only place a visitor can be shut out of the work.
*/
function drawHandGlyph(x, y, r, a, dirn){
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = a;
  // something to read against, on cloth of any brightness
  const dg = ctx.createRadialGradient(0,0,0,0,0,r*3.4);
  dg.addColorStop(0, rgba([8,5,2], 0.50));
  dg.addColorStop(1, rgba([8,5,2], 0));
  ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0,0,r*3.4,0,TAU); ctx.fill();

  // a grip: the one shape every visitor already knows means "take hold of this"
  const gw = r*0.78, gh = r*2.0, rr = gw*0.5;
  ctx.fillStyle   = rgba([255,250,238], 0.16);
  ctx.strokeStyle = rgba([255,250,238], 0.95);
  ctx.lineWidth = Math.max(1.4, r*0.11);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-gw*0.5, -gh*0.5, gw, gh, rr);
  else {
    ctx.moveTo(-gw*0.5+rr, -gh*0.5); ctx.lineTo(gw*0.5-rr, -gh*0.5);
    ctx.quadraticCurveTo(gw*0.5, -gh*0.5, gw*0.5, -gh*0.5+rr);
    ctx.lineTo(gw*0.5, gh*0.5-rr);
    ctx.quadraticCurveTo(gw*0.5, gh*0.5, gw*0.5-rr, gh*0.5);
    ctx.lineTo(-gw*0.5+rr, gh*0.5);
    ctx.quadraticCurveTo(-gw*0.5, gh*0.5, -gw*0.5, gh*0.5-rr);
    ctx.lineTo(-gw*0.5, -gh*0.5+rr);
    ctx.quadraticCurveTo(-gw*0.5, -gh*0.5, -gw*0.5+rr, -gh*0.5);
  }
  ctx.fill(); ctx.stroke();
  // three ridges, so it reads as grip and not as a button
  ctx.lineWidth = Math.max(1.1, r*0.08);
  for (let k=-1;k<=1;k++){
    ctx.beginPath();
    ctx.moveTo(-gw*0.22, k*r*0.42);
    ctx.lineTo( gw*0.22, k*r*0.42);
    ctx.stroke();
  }

  // and where it goes
  const ax = dirn*(gw*0.5 + r*0.55), aw = r*2.1;
  ctx.lineWidth = Math.max(1.4, r*0.11);
  ctx.beginPath();
  ctx.moveTo(ax, 0); ctx.lineTo(ax + dirn*aw, 0);
  ctx.moveTo(ax + dirn*aw, 0);
  ctx.lineTo(ax + dirn*(aw-r*0.52), -r*0.46);
  ctx.moveTo(ax + dirn*aw, 0);
  ctx.lineTo(ax + dirn*(aw-r*0.52),  r*0.46);
  ctx.stroke();
  ctx.restore();
}

function curtainHelp(t, dt){
  if (introOn) return;                    // nothing demonstrates behind the card
  const need = cl01((CTR.need - Math.min(PROOM.cL,PROOM.cR))/CTR.need);
  if (need < 0.02 || !CGEO.built) return;
  const r = MIN*0.036;
  const y = H*0.44;
  const pulse = 0.5 - 0.5*Math.cos(t*1.5);
  for (const side of [0,1]){
    const gg = side ? CGEO.R : CGEO.L;
    const dirn = side ? 1 : -1;
    const pull = side ? PROOM.cR : PROOM.cL;
    const a = 0.94*cl01((CTR.need-pull)/CTR.need);
    if (a < 0.03) continue;
    // it rides the leading edge, so it is always on the thing you must hold
    const edge = gg.edges[Math.round(gg.R*0.44)].xIn;
    // when it demonstrates, it travels the whole gesture and starts again
    const travel = PROOM.demo * (0.5-0.5*Math.cos(cl01((t*0.42)%1)*TAU)) * W*CTR.travel*0.9;
    const bob = (1-PROOM.demo)*Math.sin(t*1.5)*W*0.004;
    drawHandGlyph(edge + dirn*(r*2.6 + travel + bob), y, r, a, dirn);
  }
  /* No words here. There used to be a sentence painted on the canvas under the
     hands, on the theory that an instruction belongs where the hands are — but
     canvas text has no layout, no hinting and nowhere to sit, and it looked like
     a debug overlay next to everything else in the piece. The hands say where;
     the one instruction pill at the bottom of the screen says what, in the same
     type, in the same place, in every chapter. */
}
