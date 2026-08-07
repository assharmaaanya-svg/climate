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
  /* the sprites, in the order they hang. Each box is the sprite's own content
     inside its file, measured from alpha — the position IS the composition. */
  src: [
    { img:"sheet1.png", box:[0.0000,0.1273,0.1542,0.4213] },
    { img:"sheet2.png", box:[0.1976,0.1528,0.1577,0.4074] },
    { img:"sheet3.png", box:[0.3917,0.1640,0.1958,0.4573] },
    { img:"sheet4.png", box:[0.6014,0.1663,0.1924,0.4042] },
    { img:"sheet5.png", box:[0.8232,0.1505,0.1525,0.5000] }
  ],
  torso: { img:"momshadowsillhoutecroppedbutnotperfectly.png", box:[0.3934,0.1644,0.1924,0.4444] },
  skirt: { img:"momsskirt.png", box:[0.2305,0.2477,0.5269,0.5764] },
  /* where the mother stands, as a fraction of the frame: the torso's own slot,
     which is sheet 3's slot, because that is where she was painted */
  momAt: 2,
  built: false, cloth: [], wind: 0.20,
  gust: 0, gustT: 1.5, gustD: 0, gustA: 0, gustP: 0,
  momGone: 0, momFade: 1, seen: 0
};

function buildSheets(){
  SHEETS.cloth.length = 0;
  for (let i=0;i<SHEETS.src.length;i++){
    SHEETS.cloth.push({
      ph: hash(i*4.7)*TAU,           // its own place in the wind
      rate: 0.86 + hash(i*9.1)*0.32, // and its own weight
      slack: 0.80 + hash(i*2.3)*0.45,
      lag: 0, swing: 0
    });
  }
  SHEETS.built = true;
}

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

/* One piece of cloth, pushed through the mesh.
   `pin` 0..1 is how strongly the top edge is held: 1 for a pinned sheet, and
   lower for a skirt, which is gathered at the waist and swings from it. */
function drawCloth(img, box, o){
  if (!imgReady(img)) return;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const sx = box[0]*iw, sy = box[1]*ih, sw = box[2]*iw, sh = box[3]*ih;
  const t = o.t, c = o.c;
  const x0 = o.x + box[0]*o.w, y0 = o.y + box[1]*o.h;
  const dw = box[2]*o.w, dh = box[3]*o.h;

  const sway  = c.swing * o.give;
  const k1 = o.wave1, k2 = o.wave2;
  const ph = c.ph;
  const pin = o.pin===undefined ? 1 : o.pin;

  const deform = (u, v)=>{
    // held at the top, free at the hem
    const hang = Math.pow(v, 1.35);
    const edge = 0.55 + 0.45*Math.abs(u*2-1);          // the sides catch more air
    // a wave travelling down the cloth, and a slower one crossing it
    const w1 = Math.sin(k1*v - t*1.35*c.rate + ph);
    const w2 = Math.sin(k2*(v*0.7 + u*0.9) - t*0.78*c.rate + ph*1.7);
    const lift = (0.62*w1 + 0.38*w2);
    // and where a hand is going through it, the cloth folds away from that point
    const push = c.push || 0;
    const at = c.at===undefined ? 0.5 : c.at;
    const bulge = push * Math.exp(-Math.pow((u-at)/0.34, 2)) * (0.30+0.70*hang);
    const dx = sway * dw * (0.30*hang*edge + 0.16*hang*lift*c.slack)
             + Math.sign(u-at || 1) * bulge * dw * 0.30;
    // cloth that swings sideways also rises, and the hem lifts most
    const dy = -Math.abs(dx) * 0.22 * hang
             + sway*dh*0.030*hang*w1
             - (1-pin) * sway*dh*0.05*(1-v);
    // the top edge sags a touch between its two pins
    const sag = pin * dh * 0.018 * Math.sin(PI*u) * (1-v);
    return { x: x0 + u*dw + dx, y: y0 + v*dh + dy + sag };
  };

  const cols = LOW ? 8 : 13, rows = LOW ? 9 : 15;
  ctx.save();
  ctx.globalAlpha = o.alpha===undefined ? 1 : o.alpha;
  warpImage(img, sx, sy, sw, sh, deform, cols, rows);
  ctx.restore();

  /* Light. Where the mesh is compressing horizontally the cloth is turning away
     from the viewer, so it takes less of the low sun. Drawn as one horizontal
     gradient with a stop per column, multiplied over the piece — the same thing
     the curtains do, for the same reason. */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(deform(0,0).x, deform(0,0).y);
  for (let i=1;i<=cols;i++){ const p=deform(i/cols,0); ctx.lineTo(p.x,p.y); }
  for (let j=1;j<=rows;j++){ const p=deform(1,j/rows); ctx.lineTo(p.x,p.y); }
  for (let i=cols-1;i>=0;i--){ const p=deform(i/cols,1); ctx.lineTo(p.x,p.y); }
  for (let j=rows-1;j>=0;j--){ const p=deform(0,j/rows); ctx.lineTo(p.x,p.y); }
  ctx.closePath();
  ctx.clip();
  const mid = 0.55;
  const a = deform(0,mid), b = deform(1,mid);
  if (Math.abs(b.x-a.x) > 2){
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    let last = -1;
    for (let i=0;i<=cols;i++){
      const u = i/cols;
      const p0 = deform(Math.max(0,u-1/cols), mid), p1 = deform(Math.min(1,u+1/cols), mid);
      const spread = Math.abs(p1.x-p0.x) / Math.max(1e-6, (2*dw/cols));
      const kk = cl01(0.34 + 0.66*Math.pow(cl01(spread), 0.9));
      const off = cl01((deform(u,mid).x - a.x)/(b.x - a.x));
      if (off <= last) continue;
      last = off;
      const v = Math.round(255*(0.62 + 0.38*kk));
      g.addColorStop(off, "rgb("+v+","+Math.round(v*0.99)+","+Math.round(v*0.96)+")");
    }
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = g;
    ctx.fillRect(x0-dw, y0-dh*0.2, dw*3, dh*1.6);
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- the scene */
function drawSheetsScene(t, dt, o){
  o = o||{};
  const air = cl01(o.air===undefined?0:o.air);
  if (!drawPlate("lineScene", { air })) { ctx.fillStyle="#caa06a"; ctx.fillRect(0,0,W,H); return; }
  if (!SHEETS.built) buildSheets();
  updSheetWind(dt, t);

  // the plate fills the frame, and the sprites share its geometry exactly
  const c0 = roomCam(0.05);
  const rect = { x: c0.x, y: c0.y, w: W, h: H };

  sheetsInteract(dt, rect);

  for (let i=0;i<SHEETS.src.length;i++){
    const s = SHEETS.src[i];
    const img = IMG[s.img];
    const c = SHEETS.cloth[i];
    if (!c) continue;

    drawCloth(img, s.box, {
      t, c, x:rect.x, y:rect.y, w:rect.w, h:rect.h,
      give: 1, wave1: 5.2, wave2: 3.4, pin: 1,
      alpha: 1
    });

    /* She goes on AFTER her sheet, not behind it. Behind it she was simply
       covered — the cloth is opaque. What you actually see of someone standing
       on the far side of a backlit sheet is their shadow thrown onto it, and
       that is a multiply over the cloth, not a sprite underneath. */
    if (i === SHEETS.momAt && SHEETS.momFade > 0.01) drawMother(t, dt, rect, c, air);
  }
}

/* ------------------------------------------------------- pushing through them
   The washing is between you and the rest of the morning, so you go through it.
   Whichever sheet the pointer is on gives way in front of it — the cloth folds
   away from your hand rather than the whole sheet sliding — and each new one
   you pass through is one more of them behind you. */
function sheetsInteract(dt, rect){
  const px = P.active ? P.x : -1e4;
  for (let i=0;i<SHEETS.cloth.length;i++){
    const c = SHEETS.cloth[i], b = SHEETS.src[i].box;
    const x0 = rect.x + b[0]*rect.w, x1 = x0 + b[2]*rect.w;
    const inside = px > x0 - rect.w*0.02 && px < x1 + rect.w*0.02;
    const near = inside ? 1 - cl01(Math.abs(px - (x0+x1)*0.5) / ((x1-x0)*0.75)) : 0;
    c.push = lerp(c.push||0, near*(P.down ? 1.35 : 0.85), Math.min(1, dt*5));
    c.at   = inside ? cl01((px - x0)/(x1 - x0)) : 0.5;
    if (near > 0.55 && !c.passed){
      c.passed = 1;
      PWASH.through = (PWASH.through||0) + 1;
      sfx.cloth(0.55);
    }
  }
}

/* ------------------------------------------------------------- the mother
   She is one sprite, drawn exactly where and how big she was cut, multiplied
   onto the sheet. Three things I got wrong on the way here, each worth keeping
   written down:

   THE WHITE BOX. Her sprite has no transparency at all — she is a silhouette
   painted on solid white. Multiply is the fix and the truth at once: white
   under multiply leaves the backdrop untouched, so the matte vanishes without
   being keyed, and darkening what is behind you by your own colour is what a
   shadow does.

   THE DARK BOX. Softening her with ctx.filter="blur()" put a dark rectangle
   round her. A blur on a drawImage samples outside the region it drew, and
   outside it is transparent black — which multiply then multiplies. Whatever
   softness she needs has to come from her own edges, not from a filter.

   THE SKIRT. momsskirt.png is not used here, and it is worth saying why rather
   than quietly leaving it out. Her shadow on the sheet ends where the sheet
   ends: sheet 3's hem is at 0.621 of the frame and the sprite already reaches
   0.609. There is no room under her for a skirt, and stretching one into the
   gap is what made her look pulled out of shape. If the skirt is meant to be
   her real skirt showing below the hem rather than part of the shadow, that is
   a different and better idea — say so and it goes in, smaller than the shadow,
   because a shadow cast on nearby cloth is larger than the person casting it.
*/
function drawMother(t, dt, rect, c, air){
  const torso = IMG[SHEETS.torso.img];
  if (!imgReady(torso)) return;
  const tb = SHEETS.torso.box;
  const a = SHEETS.momFade;

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = a*0.78;
  // she leans with the sheet she is holding, from where her feet are
  const sway = (c.swing||0) * 0.05;
  ctx.translate(rect.x + (tb[0]+tb[2]*0.5)*rect.w, rect.y + (tb[1]+tb[3])*rect.h);
  ctx.rotate(Math.sin(t*0.6 + c.ph)*0.006*(0.4+sway*6));
  ctx.drawImage(torso,
    tb[0]*torso.naturalWidth, tb[1]*torso.naturalHeight,
    tb[2]*torso.naturalWidth, tb[3]*torso.naturalHeight,
    -tb[2]*rect.w*0.5, -tb[3]*rect.h, tb[2]*rect.w, tb[3]*rect.h);
  ctx.restore();
}
