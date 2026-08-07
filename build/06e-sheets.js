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
    { img:"sheet5.png",    box:[0.8232,0.1505,0.1525,0.5000] },
    { img:"sheetsss6.png", box:[0.0486,0.1339,0.1580,0.3880] },
    { img:"sheetsss7.png", box:[0.3160,0.1640,0.1198,0.4296] },
    { img:"sheetsss8.png", box:[0.4878,0.1709,0.2361,0.4388] },
    { img:"sheetsss9.png", box:[0.7865,0.1547,0.1597,0.4134] }
  ],
  torso: { img:"momshadowsillhoutecroppedbutnotperfectly.png", box:[0.3934,0.1644,0.1924,0.4444] },
  skirt: { img:"momsskirt.png", box:[0.2305,0.2477,0.5269,0.5764] },
  momAt: 2,                      // she is behind the third one
  /* how far down the line you have walked. It is dragged, it carries its own
     momentum, and it can be walked back. */
  walk: 0, vel: 0, far: 0, grabbed: 0, everGrabbed: 0, hint: 0, passed: 0,
  built: false, cloth: [], wind: 0.20,
  gust: 0, gustT: 1.5, gustD: 0, gustA: 0, gustP: 0,
  momGone: 0, momFade: 1
};
/* close enough that two or three fill the frame, so you go between them
   rather than past them — which is what pushing through washing is */
const SHEET_GAP = 0.255;
const SHEET_END = SHEET_GAP*8;   // where the last one is

function buildSheets(){
  SHEETS.cloth.length = 0;
  for (let i=0;i<SHEETS.src.length;i++){
    SHEETS.cloth.push({
      u: 0.30 + i*SHEET_GAP,       // its place on the line
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
   One painting, held still, and nine sheets travelling past it. Walking down a
   line does not move the field or the hills — it moves you past the washing —
   so the background stays where it is and only the cloth streams. That also
   means there is no second painting to arrive at, and no seam to hide.
   ========================================================================== */
function drawSheetsScene(t, dt, o){
  o = o||{};
  const air = cl01(o.air===undefined?0:o.air);
  if (!getPlate("lineScene")){ ctx.fillStyle="#caa06a"; ctx.fillRect(0,0,W,H); return; }
  if (!SHEETS.built) buildSheets();
  updSheetWind(dt, t);

  /* You take hold of the washing and pull yourself along it. The velocity is
     what is dragged, not the position, so the line has weight: it takes a
     moment to get going and it coasts when you let go. */
  if (P.down && P.active){
    if (!SHEETS.grabbed){ SHEETS.grabbed = 1; SHEETS.everGrabbed = 1; }
    cv.className = "grabbing";
    SHEETS.vel += (-P.dx/W)*2.6;
  } else {
    SHEETS.grabbed = 0;
    cv.className = "grabbable";
  }
  SHEETS.vel *= Math.pow(0.00025, dt);
  SHEETS.walk = cl(SHEETS.walk + SHEETS.vel*dt*8, -0.10, SHEET_END + 0.55);
  SHEETS.far = Math.max(SHEETS.far, SHEETS.walk);

  /* She finishes and goes in while you are further down the line. The trigger
     is not "you went far enough" on its own — that fired while she was still in
     shot and she dissolved in front of the visitor, which is a special effect
     rather than an absence. It is "you went past her AND you have come back",
     by which point her sheet has been off the side of the frame for a while.
     Nothing is seen to happen. */
  if (SHEETS.far > SHEETS.cloth[SHEETS.momAt].u + 1.6 && SHEETS.walk < SHEETS.far - 1.2)
    SHEETS.momGone = 1;
  SHEETS.momFade = lerp(SHEETS.momFade, SHEETS.momGone ? 0 : 1, Math.min(1, dt*0.8));

  drawPlate("lineScene", { air });

  const cam = roomCam(0.05);
  for (let i=0;i<SHEETS.src.length;i++){
    const s = SHEETS.src[i], c = SHEETS.cloth[i];
    const img = IMG[s.img];
    if (!imgReady(img)) continue;

    // where it is now, and whether any of it is on screen
    const u = c.u - SHEETS.walk;
    const bw = s.box[2]*c.scale, bh = s.box[3]*c.scale;
    const fx = u - bw*0.5;
    if (fx > 1.10 || fx + bw < -0.10) continue;

    // hung from the line, which sags
    const fy = lineY(u) - s.box[1];
    const rect = { x: cam.x + (fx - s.box[0])*W, y: cam.y + fy*H, w: W*(bw/s.box[2]), h: H*(bh/s.box[3]) };

    drawCloth(img, s.box, {
      t, c, x:rect.x, y:rect.y, w:rect.w, h:rect.h,
      give: 1, wave1: 5.2, wave2: 3.4, pin: 1, alpha: 1
    });

    if (i === SHEETS.momAt && SHEETS.momFade > 0.01) drawMother(t, dt, rect, c, air, s.box);

    // one more of them behind you
    if (!c.seen && u < 0.42){ c.seen = 1; SHEETS.passed++; sfx.cloth(0.40); }
  }

  // the invitation: before anyone takes hold, the line breathes a little
  if (!SHEETS.everGrabbed){
    SHEETS.hint += dt;
    SHEETS.vel += Math.sin(SHEETS.hint*0.55)*dt*0.16;
  }

  // going down the line and coming back is the whole of it
  if (o.gate && SHEETS.passed >= 5) meet(o.gate);
}

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
