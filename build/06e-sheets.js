/* ============================================================================
   THE WASHING LINE
   ============================================================================
   The background is painted with the line and its pins and no washing on it.
   The sheets arrive as separate sprites — and they were cut from one composite,
   so each one still carries its own position inside its file: sheet 1 occupies
   the left sixth of its canvas, sheet 5 the right sixth, and so on. Drawn at
   the same destination rect they fall onto the painted pins by construction.
   Nothing here has to guess where a pin is.

   The mother stands in sheet 3's place. She is two sprites — a torso with its
   arms up, and a skirt — because a skirt is the only part of her that should
   move much, and it should move like cloth rather than like a picture being
   wobbled.

   HOW THE CLOTH MOVES
   Every hanging thing is pushed through the same mesh, and the mesh is built
   from three ideas rather than one sine wave:

     [1] IT IS PINNED AT THE TOP. Displacement grows with distance from the
         pins, so the top edge barely moves and the hem moves most. Two pins per
         sheet, so the top edge also sags a little between them.
     [2] THE WIND TRAVELS. A wave runs down the cloth rather than the whole
         sheet swinging as a unit — that is the difference between fabric and
         cardboard. A second, slower wave crosses it at an angle so the ripples
         are never parallel.
     [3] IT GOES SLACK AND TAUT. Gusts arrive and pass; between them the cloth
         hangs almost still, with only the weight of its own last movement in
         it. Wind that never stops reads as an animation loop.

   And where the cloth turns away from you it takes less light, which is
   computed from how much the mesh is compressing at that point — the same
   relationship the curtains use.
   ========================================================================== */

const SHEETS = {
  /* One line, nine sheets, hung along it in the order they were cut. Their
     spacing is set here rather than taken from where each sprite happened to
     sit in its own file — the line is longer than the frame now, so a sprite's
     baked position cannot place it, and the pins do not have to line up
     exactly for cloth to look pinned. */
  src: [
    { img:"sheet1.png",    box:[0.0000,0.1273,0.1542,0.4213] },
    { img:"sheet2.png",    box:[0.1976,0.1528,0.1577,0.4074] },
    { img:"sheet3.png",    box:[0.3917,0.1640,0.1958,0.4573] },
    { img:"sheet4.png",    box:[0.6014,0.1663,0.1924,0.4042] },
    { img:"sheet5.png",    box:[0.8232,0.1505,0.1525,0.5000] }
  ],
  /* Her shadow alone, on pure white, cut from the same composite as the sheets.
     Every number here and below was measured against momwithonesheetsprite.png,
     the painting of this same sheet with her really behind it — which is the
     only reason her scale and her height on the cloth are the painter's and not
     mine. That sprite is the reference and is deliberately not drawn: a shadow
     painted into a sheet goes through the cloth mesh with it and ripples like
     laundry, and a shadow does not do that.

     Her figure sits at x 0.3969-0.5841, inside sheet 3's 0.3917-0.5875, which is
     how we know the two crops agree. */
  shadow:   { img:"momshadowsillhoutecroppedbutnotperfectly.png",
                                               box:[0.3969,0.1690,0.1872,0.4398] },
  skirt:    { img:"momsskirt.png",             box:[0.2305,0.2477,0.5269,0.5764] },
  /* and how her real skirt sits under that sheet. These are absolute fractions
     of the frame, not of the sheet, because they are her size — 126 painted
     pixels wide and 103 tall in a 577x433 crop — and she does not resize when a
     different sheet is hung in front of her. `tuck` is how much of the top is
     behind the hem, where her waist is. */
  sk: { w:0.2186, h:0.2386, cx:0.4923, tuck:0.148 },
  momAt: 2,                      // she is behind the third one
  /* how far down the line you have walked. It is dragged, it carries its own
     momentum, and it can be walked back. */
  walk: 0, vel: 0, far: 0, grabbed: 0, everGrabbed: 0, hint: 0, passed: 0,
  built: false, cloth: [], wind: 0.20, skLag: 0.16,
  gust: 0, gustT: 1.5, gustD: 0, gustA: 0, gustP: 0,
  momGone: 0, momFade: 1,
  /* She hums while she works, but only once you have touched her. It is not
     something the piece announces — the halo the exploring visitor already gets
     on touchable things is the only invitation there is.

     It does not stay, either. Touching her sets this to 1 and it walks back down
     to nothing over about half a minute, so what you get is a verse and then the
     garden again — which is how you actually hear somebody humming while they
     work, rather than a loop that has been switched on. Touch her again and it
     comes back. */
  hum: 0
};
/* close enough that two or three fill the frame, so you go between them
   rather than past them — which is what pushing through washing is */
/* They hang where they were cut. Each sprite still carries the position it had
   in the composite it came from, so drawn at the frame's own rect all five land
   on the painted pins and nothing here has to know where a pin is. */

function buildSheets(){
  SHEETS.cloth.length = 0;
  for (let i=0;i<SHEETS.src.length;i++){
    SHEETS.cloth.push({

      ph: hash(i*4.7)*TAU,         // its own place in the wind
      rate: 0.86 + hash(i*9.1)*0.32,
      slack: 0.80 + hash(i*2.3)*0.45,
      scale: 0.94 + hash(i*5.5)*0.16,
      lag: 0, swing: 0, seen: 0
    });
  }
  SHEETS.built = true;
}

/* the washing line, as it sags between its poles */
function lineY(fx){ return 0.148 + 0.034*Math.sin(cl01(fx*0.5+0.25)*PI); }

/* the wind: gusts that arrive, pass through, and leave the line still */
function updSheetWind(dt, t){
  /* A gust that appears at full strength and decays is a pop, and no amount of
     smoothing downstream hides the moment it arrives. So a gust has a shape:
     it rises over the better part of a second, holds, and falls away over two
     or three. Underneath it there is always a little air moving, from three
     sines that never line up, so the line is never completely dead either. */
  SHEETS.gustT -= dt;
  if (SHEETS.gustT <= 0 && SHEETS.gustD <= 0){
    SHEETS.gustD  = 2.4 + Math.random()*3.2;         // how long this one lasts
    SHEETS.gustA  = 0.45 + Math.random()*0.70;       // and how hard it blows
    SHEETS.gustP  = 0;
    SHEETS.gustT  = SHEETS.gustD + 1.6 + Math.random()*4.5;
  }
  if (SHEETS.gustD > 0){
    SHEETS.gustP += dt / SHEETS.gustD;
    if (SHEETS.gustP >= 1){ SHEETS.gustD = 0; SHEETS.gustP = 0; SHEETS.gust = 0; }
    else {
      // in over the first third, out over the rest — never a step
      const p = SHEETS.gustP;
      const env = p < 0.32 ? ease.io(p/0.32) : 1 - ease.io((p-0.32)/0.68);
      SHEETS.gust = SHEETS.gustA * env;
    }
  }
  const base = 0.16
    + 0.055*Math.sin(t*0.37)
    + 0.038*Math.sin(t*0.61 + 1.7)
    + 0.022*Math.sin(t*1.09 + 0.4);
  SHEETS.wind = Math.max(0.05, base + SHEETS.gust);

  for (let i=0;i<SHEETS.cloth.length;i++){
    const c = SHEETS.cloth[i];
    // the wind reaches each sheet a moment after the one before it, and every
    // sheet has its own weight, so the line ripples instead of pulsing
    const drive = SHEETS.wind * (1 - i*0.035);
    c.lag   += (drive - c.lag)   * Math.min(1, dt*(1.15 + i*0.09));
    c.swing += (c.lag - c.swing) * Math.min(1, dt*1.7);
  }
}

/* The mesh one piece of cloth is pushed through. It is built separately from
   the drawing because the mother's shadow needs it too — not to be warped by
   it, but to be clipped to it. */
function clothDeform(box, o){
  const t = o.t, c = o.c;
  const x0 = o.x + box[0]*o.w, y0 = o.y + box[1]*o.h;
  const dw = box[2]*o.w, dh = box[3]*o.h;

  const sway  = c.swing * o.give;
  const k1 = o.wave1, k2 = o.wave2;
  const ph = c.ph;
  const pin = o.pin===undefined ? 1 : o.pin;

  return (u, v)=>{
    // held at the top, free at the hem
    const hang = Math.pow(v, 1.35);
    const edge = 0.55 + 0.45*Math.abs(u*2-1);          // the sides catch more air
    // a wave travelling down the cloth, and a slower one crossing it
    const w1 = Math.sin(k1*v - t*1.35*c.rate + ph);
    const w2 = Math.sin(k2*(v*0.7 + u*0.9) - t*0.78*c.rate + ph*1.7);
    const lift = (0.62*w1 + 0.38*w2);
    const dx = sway * dw * (0.30*hang*edge + 0.16*hang*lift*c.slack);
    // cloth that swings sideways also rises, and the hem lifts most
    const dy = -Math.abs(dx) * 0.22 * hang
             + sway*dh*0.030*hang*w1
             - (1-pin) * sway*dh*0.05*(1-v);
    // the top edge sags a touch between its two pins
    const sag = pin * dh * 0.018 * Math.sin(PI*u) * (1-v);
    return { x: x0 + u*dw + dx, y: y0 + v*dh + dy + sag };
  };
}

/* The outline of that mesh, as a path — the cloth's own silhouette after the
   wind has had it. Walked round the four edges rather than sampled as a grid,
   because only the boundary matters. */
function clothPath(deform, n){
  n = n || 14;
  const p = new Path2D();
  let q = deform(0,0); p.moveTo(q.x,q.y);
  for (let i=1;i<=n;i++){ q = deform(i/n, 0);   p.lineTo(q.x,q.y); }
  for (let i=1;i<=n;i++){ q = deform(1, i/n);   p.lineTo(q.x,q.y); }
  for (let i=1;i<=n;i++){ q = deform(1-i/n, 1); p.lineTo(q.x,q.y); }
  for (let i=1;i<=n;i++){ q = deform(0, 1-i/n); p.lineTo(q.x,q.y); }
  p.closePath();
  return p;
}

/* One piece of cloth, pushed through the mesh.
   `pin` 0..1 is how strongly the top edge is held: 1 for a pinned sheet, and
   lower for a skirt, which is gathered at the waist and swings from it. */
function drawCloth(img, box, o){
  if (!imgReady(img)) return;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const sx = box[0]*iw, sy = box[1]*ih, sw = box[2]*iw, sh = box[3]*ih;

  /* Warp the sprite and stop. Every version of the fold shading has ended up
     painting outside the cloth: clipped to the mesh outline it filled the gaps
     the sheet's curved hem leaves inside that outline, and moved onto its own
     surface it was one composite operation away from the same thing again. The
     sheets are painted with their folds already in them and are backlit by a
     low sun; they do not need a shading pass, and no shading pass is worth a
     black box round every sheet on the line. */
  const cols = LOW ? 8 : 13, rows = LOW ? 9 : 15;
  ctx.save();
  ctx.globalAlpha = o.alpha===undefined ? 1 : o.alpha;
  warpImage(img, sx, sy, sw, sh, o.deform || clothDeform(box, o), cols, rows);
  ctx.restore();
}

/* ---------------------------------------------------------------- the scene
   One painting, five sheets, hung where they were painted. The line is one
   view: there is nowhere to travel to and nothing to pull yourself along, and
   the chapter is better for it — you stand in front of the washing and the wind
   moves it, which is all this moment ever was.
   ========================================================================== */
function drawSheetsScene(t, dt, o){
  o = o||{};
  const air = cl01(o.air===undefined?0:o.air);
  if (!getPlate("lineScene")){ ctx.fillStyle="#caa06a"; ctx.fillRect(0,0,W,H); return; }
  if (!SHEETS.built) buildSheets();
  updSheetWind(dt, t);

  drawPlate("lineScene", { air });

  const cam = roomCam(0.05);
  const rect = { x: cam.x, y: cam.y, w: W, h: H };

  for (let i=0;i<SHEETS.src.length;i++){
    const s = SHEETS.src[i], c = SHEETS.cloth[i];
    const opt = { t, c, x:rect.x, y:rect.y, w:rect.w, h:rect.h,
                  give: 1, wave1: 5.2, wave2: 3.4, pin: 1, alpha: 1 };

    if (i !== SHEETS.momAt){ drawCloth(IMG[s.img], s.box, opt); continue; }

    /* Her sheet. The skirt goes down first so the sheet's own hem covers her
       waist — which is the whole reason the waist never has to be drawn, and why
       there is no seam to hide between the two sprites. Then the sheet, warped
       like every other one. Then her shadow on it, which is not warped at all. */
    const a = SHEETS.momFade;
    if (a > 0.01) drawSkirt(t, rect, a);
    /* Her sheet takes less of the wind than the others. She is standing right
       behind it with both hands on it, which is reason enough — and it is also
       what keeps a shadow that does not move from sliding off the cloth it is
       supposed to be falling on. */
    opt.give = 0.46;
    opt.deform = clothDeform(s.box, opt);
    drawCloth(IMG[s.img], s.box, opt);
    if (a > 0.005) drawShadow(rect, a, opt.deform, s.box);
  }

  SHEETS.momFade = lerp(SHEETS.momFade, SHEETS.momGone ? 0 : 1, Math.min(1, dt*0.8));

  /* Her, as something to touch. The circle sits on her body rather than on her
     whole sheet, so it is her you are reaching for and not the washing, and it
     is registered every frame because the camera drifts. `once:false` — it is a
     switch, not a one-time discovery, so you can put her back to silence. */
  if (SHEETS.momFade > 0.4){
    const sb = SHEETS.shadow.box;
    spot("mother",
         rect.x + (sb[0] + sb[2]*0.5)*rect.w,
         rect.y + (sb[1] + sb[3]*0.62)*rect.h,
         MIN*0.15,
         ()=>{
           SHEETS.hum = SHEETS.hum > 0.35 ? 0 : 1.18;   // a little over 1: it
           ripple(rect.x + (sb[0]+sb[2]*0.5)*rect.w,    // holds full before it
                  rect.y + (sb[1]+sb[3]*0.62)*rect.h,   // starts to go
                  [255,236,198], MIN*0.16);
           curiosity += 0.3;
         }, false);
  }
  /* she runs down slowly: a few seconds at full, then most of half a minute
     coming apart. Nothing restarts her but another touch. */
  if (SHEETS.hum > 0) SHEETS.hum = Math.max(0, SHEETS.hum - dt/34);

  /* You are outdoors here and nothing is between you and it, so the ambience
     opens all the way — and the cloth comes in on top. Her humming does not,
     until she is touched. */
  ambience(0.72 - air*0.22, 1);
  lineSound(0.9 - air*0.3, SHEETS.wind, SHEETS.momFade * SHEETS.hum);

  if (o.gate) meet(o.gate);
}

/* ---------------------------------------------------------------- her shadow
   A shadow does not flap. She is standing still behind the sheet with her arms
   up, and the sun is where it is; the cloth is only the surface her shadow
   lands on. Painting her into the sheet sprite meant she went through the cloth
   mesh with it and rippled like laundry, which is exactly wrong.

   So she is drawn flat, from her own sprite, and never deformed. What the wind
   does affect is where there is cloth to catch her: the shadow is clipped to
   the sheet's warped outline, so when a gust swings the sheet out from under her
   the shadow goes with the cloth rather than hanging in the sky.

   Multiply is both the right blend for a shadow — it darkens what is behind it
   and cannot brighten anything — and the reason this sprite needs no keying at
   all: it is a figure on pure white, and white under multiply is the identity.
   The white margin is genuinely 255,255,255 in every corner, which is the only
   thing that makes this safe. */
let SHBUF = null;
/* The sprite is a hard-edged figure, and a shadow falling on the far side of a
   sheet is not: the cloth scatters it. So it is softened once, into its own
   buffer, and cached — the drawing never changes, only where it is put.

   The buffer is filled white before the figure goes into it. That matters
   twice: white is what multiply ignores, so the margin never darkens anything;
   and a blur samples outside whatever it is drawing, which on an empty canvas
   means transparent black and a dark rim round the figure. Against white there
   is nothing to pull in but more white. */
function shadowBuf(img, b, w, h){
  w = Math.max(16, Math.round(w)); h = Math.max(16, Math.round(h));
  if (SHBUF && SHBUF.w === w && SHBUF.h === h) return SHBUF.c;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  const iw = img.naturalWidth, ih = img.naturalHeight;
  g.filter = "blur(" + Math.max(1.2, w*0.012) + "px)";
  g.drawImage(img, b[0]*iw, b[1]*ih, b[2]*iw, b[3]*ih, 0, 0, w, h);
  g.filter = "none";
  SHBUF = { w, h, c };
  return c;
}
function drawShadow(rect, a, deform, sb){
  const sh = IMG[SHEETS.shadow.img];
  if (!imgReady(sh) || a < 0.005) return;
  const b = SHEETS.shadow.box, m = 0.07;             // white margin, so the blur
  const bx = b[0]-b[2]*m, by = b[1]-b[3]*m;          // has room to fall off
  const bw = b[2]*(1+2*m), bh = b[3]*(1+2*m);
  const dw = bw*rect.w, dh = bh*rect.h;
  const buf = shadowBuf(sh, [bx,by,bw,bh], dw, dh);

  /* She does not ripple, but the surface she is being cast onto does travel,
     and a shadow pinned to the screen while the cloth slides out from under it
     loses an arm to the clip. So the shadow takes a little over half of the
     sheet's bulk drift — the displacement at its middle, not at any point on
     its surface, so nothing of the ripple reaches her. At this amplitude it is
     a handful of pixels: she still reads as standing perfectly still. */
  const mid = deform(0.5, 0.55);
  const ox = (mid.x - (rect.x + (sb[0] + sb[2]*0.5)*rect.w)) * 0.58;
  const oy = (mid.y - (rect.y + (sb[1] + sb[3]*0.55)*rect.h)) * 0.58;

  ctx.save();
  ctx.clip(clothPath(deform));
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = a*0.70;
  ctx.drawImage(buf, rect.x + bx*rect.w + ox, rect.y + by*rect.h + oy, dw, dh);
  ctx.restore();
}

/* ------------------------------------------------------------------ her skirt
   She used to be assembled here: a silhouette sprite laid on top of a sheet
   sprite, at a size and a height I had chosen. That is what was wrong with her
   proportions — I was rebuilding a figure the painter had already painted.

   She is not assembled any more. Her sheet is one sprite with her shadow
   already on it, so her scale, where her head falls on the cloth and how far
   her arms reach are the painting's. The only thing drawn separately is the
   part of her that is not shadow: her real skirt, hanging below the hem, which
   has to move like cloth in the same wind.

   All the numbers below were measured off that sprite. The skirt there is 124
   painted pixels wide against a 130-pixel sheet and drops 88 against its 193 —
   which is where 0.970 and 0.535 come from — and it sits five pixels left of the
   sheet's centre because she is standing a little to the left behind it.

   It swings as one piece from the waist. A shear about the waist line moves
   every point by an amount proportional to its distance below her — the hem
   travels furthest, the waist not at all — which is what a gathered skirt does,
   and unlike the banded version it has no seams in it. The lag between hem and
   waist lives in the wind driving it, not in the geometry. */
function drawSkirt(t, rect, a){
  const skirt = IMG[SHEETS.skirt.img];
  if (!imgReady(skirt) || a < 0.01) return;
  const sk = SHEETS.skirt.box, K = SHEETS.sk;
  const sb = SHEETS.src[SHEETS.momAt].box;

  const w = K.w, h = K.h, cx = K.cx;
  const hem = sb[1] + sb[3];                     // the sheet she is standing behind
  const top = hem - h*K.tuck;                    // the waist, behind the cloth

  /* How much a skirt actually moves. Very little: she is standing still in a
     field, the wind is a breeze most of the time, and a gathered cotton skirt
     is heavy. The first version of this swung her about, scaled her wider as
     she went and rotated her on top of that, which read as a flag rather than a
     person. What is left is a shear of a couple of per cent, and it is the lag
     that sells it — her wind is the line's wind smoothed over about a second,
     so a gust reaches the sheets first and her afterwards. */
  SHEETS.skLag += (SHEETS.wind - SHEETS.skLag) * 0.018;
  const drive = 0.30 + SHEETS.skLag*0.75;
  const swing = (Math.sin(t*0.41)*0.011 + Math.sin(t*0.67 + 1.3)*0.006
               + Math.sin(t*1.09 + 0.4)*0.003) * drive;
  const lift  = (Math.sin(t*0.53 + 2.1)*0.5 + 0.5) * SHEETS.skLag * 0.022;

  const dw = w*rect.w, dh = h*rect.h;
  const iw = skirt.naturalWidth, ih = skirt.naturalHeight;
  const sx = sk[0]*iw, sy = sk[1]*ih, sw = sk[2]*iw, sh = sk[3]*ih;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(rect.x + cx*rect.w, rect.y + top*rect.h);
  ctx.transform(1, 0, swing, 1, 0, 0);           // shear about the waist, and
  ctx.scale(1, 1 - lift);                        // the hem lifting a little
  /* The sprite stops at her waist, and the sheet's hem does not hold still: it
     lifts on the wind, and where it lifts past the waist you were seeing the
     straight top edge of a cut-out against the sky. So a couple of rows of the
     waist are stretched upward first, into the space behind the cloth. It is
     almost never seen; when a gust does show a sliver of it, a sliver of skirt
     is what it looks like. */
  const ext = dh*0.24;
  ctx.drawImage(skirt, sx, sy + ih*0.006, sw, ih*0.004, -dw*0.5, -ext, dw, ext + 1);
  ctx.drawImage(skirt, sx, sy, sw, sh, -dw*0.5, 0, dw, dh);
  ctx.restore();
}
