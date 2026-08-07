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
  /* Two panels of the same line. Everything is measured off each sprite's own
     alpha, and every sprite keeps the position it had in the composite it was
     cut from, so a sheet drawn at its panel's rect lands on a painted pin
     without anything here knowing where a pin is. */
  panels: [
    { plate:"lineScene", src:[
      { img:"sheet1.png", box:[0.0000,0.1273,0.1542,0.4213] },
      { img:"sheet2.png", box:[0.1976,0.1528,0.1577,0.4074] },
      { img:"sheet3.png", box:[0.3917,0.1640,0.1958,0.4573] },
      { img:"sheet4.png", box:[0.6014,0.1663,0.1924,0.4042] },
      { img:"sheet5.png", box:[0.8232,0.1505,0.1525,0.5000] }
    ]},
    { plate:"lineScene2", src:[
      { img:"sheetsss6.png", box:[0.0486,0.1339,0.1580,0.3880] },
      { img:"sheetsss7.png", box:[0.3160,0.1640,0.1198,0.4296] },
      { img:"sheetsss8.png", box:[0.4878,0.1709,0.2361,0.4388] },
      { img:"sheetsss9.png", box:[0.7865,0.1547,0.1597,0.4134] }
    ]}
  ],
  torso: { img:"momshadowsillhoutecroppedbutnotperfectly.png", box:[0.3934,0.1644,0.1924,0.4444] },
  skirt: { img:"momsskirt.png", box:[0.2305,0.2477,0.5269,0.5764] },
  /* where the mother stands, as a fraction of the frame: the torso's own slot,
     which is sheet 3's slot, because that is where she was painted */
  momPanel: 0, momAt: 2,
  pan: 0, panPeak: 0,            // how far along the line, and how far you went
  built: false, cloth: [], wind: 0.20,
  gust: 0, gustT: 1.5, gustD: 0, gustA: 0, gustP: 0,
  momGone: 0, momFade: 1, seen: 0
};

function buildSheets(){
  SHEETS.cloth.length = 0;
  let n = 0;
  for (const p of SHEETS.panels) for (let i=0;i<p.src.length;i++){
    SHEETS.cloth.push({
      ph: hash(n*4.7)*TAU,           // its own place in the wind
      rate: 0.86 + hash(n*9.1)*0.32, // and its own weight
      slack: 0.80 + hash(n*2.3)*0.45,
      lag: 0, swing: 0
    });
    n++;
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
    const dx = sway * dw * (0.30*hang*edge + 0.16*hang*lift*c.slack);
    // cloth that swings sideways also rises, and the hem lifts most
    const dy = -Math.abs(dx) * 0.22 * hang
             + sway*dh*0.030*hang*w1
             - (1-pin) * sway*dh*0.05*(1-v);
    // the top edge sags a touch between its two pins
    const sag = pin * dh * 0.018 * Math.sin(PI*u) * (1-v);
    return { x: x0 + u*dw + dx, y: y0 + v*dh + dy + sag };
  };

  const cols = LOW ? 8 : 13, rows = LOW ? 9 : 15;

  /* The cloth and its shading are built on their own surface and arrive as one
     finished thing.

     The shading used to be a gradient clipped to the mesh outline. The outline
     is a quadrilateral grid; the sheet inside it is not — it has a curved hem
     and edges that fall away — so everywhere the outline was not filled by
     actual cloth, the multiply landed on the sky instead. That is the dark box
     around every sheet. Masking by the sprite's own alpha is the only thing
     that can be right, and source-atop on a surface of its own is what "its own
     alpha" means. */
  offscreen2(()=>{
    warpImage(img, sx, sy, sw, sh, deform, cols, rows);

    // where the mesh is compressing, the cloth is turning away from a low sun
    const mid = 0.55;
    const pa = deform(0, mid), pb = deform(1, mid);
    if (Math.abs(pb.x - pa.x) > 2){
      const g = tc2.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
      let last = -1;
      for (let i=0;i<=cols;i++){
        const u = i/cols;
        const q0 = deform(Math.max(0,u-1/cols), mid), q1 = deform(Math.min(1,u+1/cols), mid);
        const spread = Math.abs(q1.x-q0.x) / Math.max(1e-6, (2*dw/cols));
        const shade = (1 - cl01(spread)) * 0.42;          // edge-on cloth is darker
        const off = cl01((deform(u,mid).x - pa.x)/(pb.x - pa.x));
        if (off <= last) continue;
        last = off;
        g.addColorStop(off, "rgba(46,26,8," + shade.toFixed(3) + ")");
      }
      tc2.globalCompositeOperation = "source-atop";
      tc2.fillStyle = g;
      tc2.fillRect(0, 0, W, H);
    }
    // cloth nearer the ground sits out of the direct sun
    if (o.dim > 0){
      tc2.globalCompositeOperation = "source-atop";
      tc2.fillStyle = rgba([54,30,10], o.dim);
      tc2.fillRect(0, 0, W, H);
    }
    tc2.globalCompositeOperation = "source-over";
  });

  ctx.save();
  ctx.globalAlpha = o.alpha===undefined ? 1 : o.alpha;
  ctx.drawImage(TMP2, 0, 0);
  ctx.restore();
}

/* ---------------------------------------------------------------- the scene */
function drawSheetsScene(t, dt, o){
  o = o||{};
  const air = cl01(o.air===undefined?0:o.air);
  if (!getPlate("lineScene")){ ctx.fillStyle="#caa06a"; ctx.fillRect(0,0,W,H); return; }
  if (!SHEETS.built) buildSheets();
  updSheetWind(dt, t);

  /* Scrolling walks you down the line. The two painted panels sit side by side
     in a world two frames wide: you start where she is, walk on into the second
     stretch of washing, and walk back. Coming back is the point — by then she
     has finished and gone in, and nothing is said about it. */
  const f = cl01(o.f===undefined ? 0 : o.f);
  const away = Math.sin(f*PI);                 // 0 at the start, 1 out there, 0 back
  SHEETS.pan = away;
  SHEETS.panPeak = Math.max(SHEETS.panPeak, away);
  /* She leaves while your back is turned. The trigger is not "you went far
     enough" — that fired while she was still in shot and she dissolved in front
     of the visitor, which is a special effect rather than an absence. It is
     "you went to the far end AND you are on your way back", by which point her
     sheet is off the side of the frame. Nothing is seen to happen. You simply
     arrive and she has finished and gone in. */
  if (SHEETS.panPeak > 0.88 && away < 0.80) SHEETS.momGone = 1;
  SHEETS.momFade = lerp(SHEETS.momFade, SHEETS.momGone ? 0 : 1, Math.min(1, dt*0.7));

  const c0 = roomCam(0.05);
  const panX = away * W;                        // one whole frame's worth of walking
  let n = 0;

  for (let p=0;p<SHEETS.panels.length;p++){
    const panel = SHEETS.panels[p];
    const ox = p*W - panX;
    // nothing to do for a panel that is entirely off the side
    if (ox > W || ox < -W){ n += panel.src.length; continue; }

    ctx.save();
    ctx.translate(ox, 0);
    /* Each panel is clipped to its own frame. Band canvases are drawn wider
       than the frame with their outermost columns stretched outward, so that
       parallax always has material to slide — which is right for one plate and
       wrong for two side by side: the second panel's stretched left edge paints
       a smear of streaked pixels straight over the first panel's good content
       at the seam. Clipped, they meet exactly. */
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    if (!drawPlate(panel.plate, { air })){ ctx.restore(); n += panel.src.length; continue; }
    /* The two paintings are the same field but not the same paint — panel two's
       sky is a shade lighter — so butted together they show a seam. The later
       panel's leading edge is faded out over a slice of the frame, which is
       enough because their horizons already line up. */
    if (p > 0){
      const fw = W*0.075;
      const fg = ctx.createLinearGradient(0, 0, fw, 0);
      fg.addColorStop(0, "rgba(0,0,0,1)");
      fg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, fw, H);
      ctx.restore();
    }
    const rect = { x: c0.x, y: c0.y, w: W, h: H };

    for (let i=0;i<panel.src.length;i++, n++){
      const s = panel.src[i];
      const img = IMG[s.img];
      const c = SHEETS.cloth[n];
      if (!c) continue;

      drawCloth(img, s.box, {
        t, c, x:rect.x, y:rect.y, w:rect.w, h:rect.h,
        give: 1, wave1: 5.2, wave2: 3.4, pin: 1,
        alpha: 1
      });

      /* She goes on AFTER her sheet, not behind it. Behind it she was simply
         covered — cloth is opaque. What you see of someone on the far side of a
         backlit sheet is their shadow thrown onto it, which is a multiply over
         the cloth rather than a sprite underneath. */
      if (p === SHEETS.momPanel && i === SHEETS.momAt && SHEETS.momFade > 0.01)
        drawMother(t, dt, rect, c, air, panel.src[i].box);
    }
    ctx.restore();
  }

  // walking the line is the whole of it; there is nothing else to do here
  if (o.gate && f > 0.80) meet(o.gate);
}

/* There is no reaching into the washing any more. It asked the visitor to
   "push through the sheets", which meant nothing on a screen, and it put a
   prompt over a painting that did not need one. Walking down the line is the
   whole of this chapter. */

/* ------------------------------------------------------------- the mother
   Two sprites doing two different jobs.

   THE SHADOW is her upper body thrown onto the sheet she is pegging. It was cut
   straight out of that shadow, so its own box is where it belongs and how big
   it is — no decision to make. It is drawn with multiply, which is both the
   right blend for a shadow and the reason her sprite needs no keying: she is a
   silhouette painted on solid white, and white under multiply leaves the
   backdrop exactly as it was.

   THE SKIRT is not part of that shadow. It is her, below the hem, in the open
   air — which is why it is smaller than the shadow above it. A shadow cast on
   cloth a foot behind someone is bigger than the person casting it, so a skirt
   drawn at the shadow's width would be a giant's. It hangs from just under the
   sheet's hem, gathered at the waist and free below, and it goes through the
   same cloth mesh as everything else on this line.
*/
function drawMother(t, dt, rect, c, air, sheetBoxIn){
  const torso = IMG[SHEETS.torso.img], skirt = IMG[SHEETS.skirt.img];
  const a = SHEETS.momFade;
  const tb = SHEETS.torso.box;
  const sheetBox = sheetBoxIn;
  const hemY = sheetBox[1] + sheetBox[3];          // where her sheet ends

  /* Her sprite stops at her hips — above the sheet's hem — so on its own she
     reads as a woman cut in half by a straight line. The skirt closes that, and
     it does two jobs at once because it is in two places at once:

       ABOVE THE HEM it is still her shadow on the cloth, so it is drawn with
       multiply like the rest of her, starting at her waist and clipped to the
       sheet. That is what joins her back together.
       BELOW THE HEM it is her, in the open air, and so it is drawn plainly —
       and smaller, because a shadow cast on cloth a foot behind someone is
       larger than the person casting it.
  */
  if (imgReady(skirt)){
    const sk = SHEETS.skirt.box;
    const aspect = (sk[3]*skirt.naturalHeight) / (sk[2]*skirt.naturalWidth);
    const midX = tb[0] + tb[2]*0.5;
    const waistY = tb[1] + tb[3]*0.955;

    // [1] the shadow half — her width, meeting her waist, stopped at the hem
    const shW = tb[2]*0.92;
    const shH = shW * aspect * (rect.w/rect.h);
    const shX = midX - shW*0.5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x + (shX-shW)*rect.w, rect.y + waistY*rect.h,
             shW*3*rect.w, (hemY-waistY)*rect.h);
    ctx.clip();
    ctx.globalCompositeOperation = "multiply";
    drawCloth(skirt, [0,0,1,1], {
      t, c: { ph:c.ph+1.9, rate:c.rate*0.68, slack:1.30, swing:c.swing },
      x: rect.x + shX*rect.w - sk[0]*(shW/sk[2])*rect.w,
      y: rect.y + waistY*rect.h - sk[1]*(shH/sk[3])*rect.h,
      w: (shW/sk[2])*rect.w, h: (shH/sk[3])*rect.h,
      give: 0.85, wave1: 2.6, wave2: 1.9, pin: 0.22, alpha: a*0.78
    });
    ctx.restore();

    /* [2] Her actual skirt, below the hem. The size is not guessed: it is taken
       off momwithonesheetsprite.png, which is this exact sheet with her really
       behind it. There the skirt is 0.96 of the sheet's width and hangs 0.44 of
       the sheet's height below its hem — far more than the small thing I had
       assumed. About a third of it is hidden behind the cloth, so it is drawn
       taller than it shows and clipped at the hem. */
    const sheetW = sheetBox[2], sheetH = sheetBox[3];
    const skW = sheetW * 0.96;
    const skH = sheetH * 0.62;                     // 0.44 shows, the rest is behind
    const skX = midX - skW*0.5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x + (skX-skW)*rect.w, rect.y + hemY*rect.h,
             skW*3*rect.w, (1-hemY)*rect.h);
    ctx.clip();
    drawCloth(skirt, [0,0,1,1], {
      t, c: { ph:c.ph+1.9, rate:c.rate*0.68, slack:1.30, swing:c.swing },
      x: rect.x + skX*rect.w - sk[0]*(skW/sk[2])*rect.w,
      y: rect.y + (hemY - skH*0.28)*rect.h - sk[1]*(skH/sk[3])*rect.h,
      w: (skW/sk[2])*rect.w, h: (skH/sk[3])*rect.h,
      give: 0.85, wave1: 2.6, wave2: 1.9, pin: 0.22, alpha: a*0.90, dim: 0.30
    });
    ctx.restore();
  }

  /* the shadow on the sheet */
  if (!imgReady(torso)) return;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = a*0.78;
  const sway = (c.swing||0) * 0.05;
  ctx.translate(rect.x + (tb[0]+tb[2]*0.5)*rect.w, rect.y + (tb[1]+tb[3])*rect.h);
  ctx.rotate(Math.sin(t*0.6 + c.ph)*0.006*(0.4+sway*6));
  ctx.drawImage(torso,
    tb[0]*torso.naturalWidth, tb[1]*torso.naturalHeight,
    tb[2]*torso.naturalWidth, tb[3]*torso.naturalHeight,
    -tb[2]*rect.w*0.5, -tb[3]*rect.h, tb[2]*rect.w, tb[3]*rect.h);
  ctx.restore();
}
