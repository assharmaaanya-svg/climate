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
  /* The third sheet, but with her already behind it. This is one painted sprite,
     not a silhouette composited onto a sheet, so her scale, her height on the
     cloth and how far her arms reach up to the line are the painter's and not
     mine. It comes from the same composite as the five sheets — its sheet
     starts at x 0.3882 where sheet 3 starts at 0.3917 — so drawn at the frame's
     own rect it lands on the same pins. */
  momSheet: { img:"momwithonesheetsprite.png", box:[0.3882,0.1709,0.2253,0.4457] },
  skirt:    { img:"momsskirt.png",             box:[0.2305,0.2477,0.5269,0.5764] },
  /* and how her real skirt sits under that sheet, measured off the same sprite:
     97% of the sheet's width, a little over half its height, five thousandths of
     the sheet's width left of its centre, with the top seventh of the skirt
     behind the hem where her waist is. */
  sk: { w:0.970, h:0.535, dx:-0.038, tuck:0.148 },
  momAt: 2,                      // she is behind the third one
  /* how far down the line you have walked. It is dragged, it carries its own
     momentum, and it can be walked back. */
  walk: 0, vel: 0, far: 0, grabbed: 0, everGrabbed: 0, hint: 0, passed: 0,
  built: false, cloth: [], wind: 0.20, skLag: 0.16,
  gust: 0, gustT: 1.5, gustD: 0, gustA: 0, gustP: 0,
  momGone: 0, momFade: 1
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
    const dx = sway * dw * (0.30*hang*edge + 0.16*hang*lift*c.slack);
    // cloth that swings sideways also rises, and the hem lifts most
    const dy = -Math.abs(dx) * 0.22 * hang
             + sway*dh*0.030*hang*w1
             - (1-pin) * sway*dh*0.05*(1-v);
    // the top edge sags a touch between its two pins
    const sag = pin * dh * 0.018 * Math.sin(PI*u) * (1-v);
    return { x: x0 + u*dw + dx, y: y0 + v*dh + dy + sag };
  };

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
  warpImage(img, sx, sy, sw, sh, deform, cols, rows);
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
       there is no seam to hide between the two sprites. Then the bare sheet
       underneath, so that when she leaves there is a sheet still hanging where
       she was rather than a hole in the line. */
    const a = SHEETS.momFade;
    if (a > 0.01) drawSkirt(t, rect, a);
    if (a < 0.995) drawCloth(IMG[s.img], s.box, opt);
    if (a > 0.005){
      opt.alpha = a;
      drawCloth(IMG[SHEETS.momSheet.img], SHEETS.momSheet.box, opt);
    }
  }

  SHEETS.momFade = lerp(SHEETS.momFade, SHEETS.momGone ? 0 : 1, Math.min(1, dt*0.8));

  /* You are outdoors here and nothing is between you and it, so the ambience
     opens all the way — and the cloth and her humming come in on top. */
  ambience(0.72 - air*0.22, 1);
  lineSound(0.9 - air*0.3, SHEETS.wind, SHEETS.momFade);

  if (o.gate) meet(o.gate);
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
  const sb = SHEETS.momSheet.box, sk = SHEETS.skirt.box, K = SHEETS.sk;

  const w  = sb[2]*K.w, h = sb[3]*K.h;
  const cx = sb[0] + sb[2]*0.5 + sb[2]*K.dx;     // her centre, not the sheet's
  const hem = sb[1] + sb[3];
  const top = hem - h*K.tuck;                    // the waist, behind the cloth

  /* Her own weather. It is the line's wind, reaching her a moment late and
     smoothed by how much more a skirt weighs than a sheet, plus three slow
     frequencies that never come back into phase — so it drifts rather than
     loops. */
  const g = SHEETS.wind;
  SHEETS.skLag  += (g - SHEETS.skLag) * 0.03;
  const drive = 0.42 + SHEETS.skLag*1.35;
  const swing = (Math.sin(t*0.47)*0.023 + Math.sin(t*0.79 + 1.3)*0.013
               + Math.sin(t*1.23 + 0.4)*0.007) * drive;
  const lift  = (Math.sin(t*0.61 + 2.1)*0.5 + 0.5) * SHEETS.skLag * 0.06;
  /* cloth pushed sideways is also being lifted and filled, so it widens as it
     swings and shortens by as much as it gains — the hem rises on the wind */
  const flare = 1 + Math.abs(swing)*1.5 + lift*0.5;

  const dw = w*rect.w, dh = h*rect.h;
  const iw = skirt.naturalWidth, ih = skirt.naturalHeight;
  const sx = sk[0]*iw, sy = sk[1]*ih, sw = sk[2]*iw, sh = sk[3]*ih;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(rect.x + cx*rect.w, rect.y + top*rect.h);
  ctx.transform(1, 0, swing*1.9, 1, 0, 0);       // shear about the waist
  ctx.rotate(swing*0.28);                        // and a little pendulum with it
  ctx.scale(flare, 1 - lift*0.30);
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
