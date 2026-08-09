/* ============================================================================
   THE WASHING LINE, AFTERWARDS

   The same place and the same structure as the clean laundry chapter, changed by the air.
   It is built on that chapter's parts rather than beside them: the same wind, the same
   cloth mesh, the same spot() for her, so the movement quality and the interaction language
   are not a lookalike — they are the same code.

   WHAT IS DIFFERENT IS WHAT THE VISITOR ALREADY KNOWS. In the clean scene they learned one
   thing: touch her and you hear her. That lesson is the whole mechanism of this scene. The
   instruction, if it appears at all, is the identical sentence from the clean chapter —
   because a prompt that said "tap her to hear her cough" would hand over the ending. They
   reach for a hum and get a cough. Nothing stages it, nothing warns them, and the sentence
   that follows is the shortest one in the piece.

   THE SPRITES. Five polluted sheets, each in its own file at 612x408, and the environment
   at 1448x1086 — different aspect, and the ink sits somewhere else in the frame, so unlike
   the clean set a single rect cannot serve as both source and destination. Each one carries
   a measured source rect and a destination on the pin its clean counterpart hung from. The
   source boxes were measured by sweeping the alpha threshold until the bounding box stopped
   moving: below about 150 every sheet measured as though it were most of the width of its
   canvas, because each file also carries a very faint cast shadow beside the cloth. The
   cloth is what gets pinned; the shadow belongs to the painting.

   NO COLOUR CORRECTION. The polluted sheets were painted for this polluted environment, so
   they are drawn exactly as they are, at full alpha, with no tint, no multiply and no haze
   pass — every one of those would fight the matching they already have. The only thing done
   to them is the wind.
   ========================================================================== */

const SHEETS_AFTER = {
  src: [
    { img:"sheetsafterpollution1.png", src:[0.0000,0.1816,0.1792,0.5019], box:[-0.0075,0.1273,0.1692,0.4213] },
    /* SHEET 2 HANGS 24 PIXELS FURTHER LEFT THAN THE ARITHMETIC PUT IT.
       Every sheet on this line has a painted pin a few pixels inside each of its top
       corners — sheet 1's left pin is 16 px in, sheet 3's is 9, sheet 4's is 2 — and this
       one had its pin 16 px OUTSIDE the cloth, hanging in the air beside a sheet it was
       not holding. The cause is upstream: these crops were measured with the alpha
       threshold low enough to include the faint cast shadow each file carries beside the
       cloth, so every source rect is a little wider than the sheet in it and every sheet
       is drawn slightly inset inside its own box. Sheets 1, 3, 4 and 5 absorb that and
       still land on their pins; sheet 2 did not, because the pin either side of it is
       closer in than the rest. Moved by measurement off the render, not by re-deriving
       the crop, which would move all five. */
    { img:"sheetsafterpollution2.png", src:[0.1481,0.2086,0.2233,0.4946], box:[ 0.1563,0.1528,0.2069,0.4074] },
    /* HER SHEET. Nothing special is declared about it: what masks her is this cloth's own
       alpha, taken by rendering it a second time, so the mask needs no measurement of where
       the ink sits inside the crop and no assumption that the hem is straight. It is not. */
    { img:"sheetsafterpollution3.png", src:[0.3785,0.2208,0.2397,0.5510], box:[ 0.3777,0.1640,0.2238,0.4573] },
    { img:"sheetsafterpollution4.png", src:[0.6155,0.2159,0.2184,0.4897], box:[ 0.5962,0.1663,0.2028,0.4042] },
    { img:"sheetsafterpollution5.png", src:[0.8262,0.1865,0.1738,0.5853], box:[ 0.8160,0.1505,0.1670,0.5000] }
  ],
  /* HER, SEEN ONLY THROUGH THE CLOTH.
     She stands behind the third sheet with the polluted sunset behind her, and the sheet is
     what we see her on. Every pixel of her is masked to that sheet: nothing of her exists
     below its hem, beyond either side, or above it. The sheet is the window.

     THIS IS WHY SHE IS A WHOLE FIGURE AND NOT A CROP. She used to be the head-to-waist crop
     with her painted skirt drawn separately below the hem, which meant her actual body hung
     out from under the washing — a woman standing in front of a sheet with her skirt showing,
     rather than a shape you notice through one. The skirt is gone. The sprite is her entire
     body, and the cloth simply runs out before her legs do, which is what happens when you
     look at somebody through a sheet on a line.

     SCALE. Her head sits where the clean chapter's does, with the same 0.117 of clear cloth
     above it, and her waist falls on the hem — those two together fix the height, since her
     waist is 0.517 of the way down this sprite. The width is that height at the aspect the
     clean chapter's plate imposes. So the visible band is head to hips, and everything from
     the hips down is behind cloth that is not there.

     DENSITY. The sprite is a near-black cut-out on transparency, and multiply against a
     transparent pixel returns the source, so it is composited into a white buffer first and
     let in at `ink` — 0.66 puts it at the same mean density as the clean chapter's grey
     shadow. It is multiplied UNDER nothing and OVER the cloth, which is what keeps the
     sheet's own weave, staining and folds visible through her: multiply cannot brighten and
     cannot cover, so the fabric stays on top of her by construction rather than by layering. */
  shadow: { img:"momshadowcoughingafterpollution.png",
            src:[0.3780,0.1435,0.2145,0.7440],
            box:[0.4040,0.2810,0.1447,0.6583],
            ink:0.66, dens:0.78, ox:0, oy:0,
            /* softened a little more than the clean figure: she is being read through a
               second layer of cloth in dirtier air, and the brief for her is diffused rather
               than crisp. It is still a shadow and not a smudge. */
            blur:0.017,
            /* SHE DOES NOT SWAY. A shadow is cast by a body onto a surface, and the body is
               standing still. If it drifts with the cloth it stops being a shadow and starts
               being a pattern printed on the sheet. */
            follow:0, at:[0.45, 0.80] },
  momAt: 2,
  /* how far through the scene she has been touched, and what follows it */
  tapped: 0, coughT: -1, lineT: -1, said: 0, glow: 0,
  built: false, cloth: []
};

/* how long the cough takes to land before anything is said. Long enough that the sentence
   is a response to it rather than a caption on it, short enough that the visitor is still
   holding the sound when they read it. */
const SA_PAUSE = 1.9;
const SA_LINE  = 7.5;

function buildSheetsAfter(){
  SHEETS_AFTER.cloth.length = 0;
  for (let i=0;i<SHEETS_AFTER.src.length;i++){
    /* their own places in the wind, from the same hash the clean sheets use, so no two of
       them move together and the line as a whole reads as cloth rather than as a row */
    SHEETS_AFTER.cloth.push({
      ph: hash(i*4.7 + 31.7)*TAU,
      rate: 0.86 + hash(i*9.1 + 5.3)*0.32,
      slack: 0.80 + hash(i*2.3 + 11.9)*0.45,
      scale: 1, lag: 0, swing: 0, seen: 0
    });
  }
  SHEETS_AFTER.built = true;
}

function resetSheetsAfter(){
  SHEETS_AFTER.tapped = 0; SHEETS_AFTER.coughT = -1;
  SHEETS_AFTER.lineT = -1; SHEETS_AFTER.said = 0; SHEETS_AFTER.glow = 0;
  SHEETS_AFTER.shadow.ox = 0; SHEETS_AFTER.shadow.oy = 0;
}

/* WHERE SHE IS ON THE FRAME — meaning the part of her the sheet lets you see, which is her
   box clipped to the sheet's. She now runs well below the hem in her own coordinates and
   none of that is visible, so a rect taken from her box alone would put the thing you touch
   in the meadow under the washing. This is also what the tests read. */
function saMomRect(rect){
  const b = SHEETS_AFTER.shadow.box;
  const s = SHEETS_AFTER.src[SHEETS_AFTER.momAt].box;
  const y0 = Math.max(b[1], s[1]), y1 = Math.min(b[1]+b[3], s[1]+s[3]);
  return { x: rect.x + b[0]*rect.w, y: rect.y + y0*rect.h,
           w: b[2]*rect.w, h: Math.max(0, y1-y0)*rect.h };
}

/* --------------------------------------------------------------------- the scene */
function drawSheetsAfter(t, dt, o){
  o = o||{};
  if (!getPlate("lineAfter")){ ctx.fillStyle="#5d5344"; ctx.fillRect(0,0,W,H); return; }
  if (!SHEETS_AFTER.built) buildSheetsAfter();
  /* the same wind that moves the clean line, so the cloth has the same weight; the scene
     itself is stiller because there is less in it, not because the air behaves differently.
     Its own row of cloth is what the wind is reaching — passing this is what makes these
     sheets move at all. */
  updSheetWind(dt, t, SHEETS_AFTER.cloth);

  drawPlate("lineAfter", { air:0 });

  const cam = roomCam(0.05);
  const rect = { x: cam.x, y: cam.y, w: W, h: H };

  for (let i=0;i<SHEETS_AFTER.src.length;i++){
    const s = SHEETS_AFTER.src[i], c = SHEETS_AFTER.cloth[i];
    const opt = { t, c, x:rect.x, y:rect.y, w:rect.w, h:rect.h,
                  give: 1, wave1: 5.2, wave2: 3.4, pin: 1, alpha: 1, src: s.src };

    if (i !== SHEETS_AFTER.momAt){ drawCloth(IMG[s.img], s.box, opt); continue; }

    /* HER SHEET. Nothing of her is drawn before it — there is no separate skirt any more, and
       that is the point: the ONLY thing that puts her on screen is the shadow below, and that
       is masked to this cloth. The sheet goes down first, then she is multiplied onto it, so
       the cloth's weave, staining and folds sit over her rather than under her. */
    updSheetsAfterMother(dt);
    /* HER SHEET BARELY MOVES, AND THAT IS NOT A COMPROMISE.
       She is standing right behind it with both hands on it. At 0.46 it billowed nearly as
       much as its unheld neighbours, and the hem — the most active part of any cloth mesh —
       swung far enough out from under her that the mask took a piece of her. Held cloth does
       not billow; 0.24 is a sheet with somebody's weight against it. */
    opt.give = 0.24;
    opt.deform = clothDeform(s.box, opt);
    drawCloth(IMG[s.img], s.box, opt);
    drawShadowOf(SHEETS_AFTER.shadow, rect, 1, opt.deform, s.box,
                 ()=>drawCloth(IMG[s.img], s.box, opt));
    /* exactly what this frame used, kept for __bluer.momProbe(): the only way to ask "is any
       pixel of her outside the cloth's own alpha" and get a truthful answer is to re-render
       her and the cloth from the identical state, in the same frame, before anything moves. */
    SHEETS_AFTER.last = { rect, deform: opt.deform, box: s.box, img: s.img, opt };
  }

  /* Her, as something to touch — the same call, the same radius, and in the same place on
     the frame as the clean chapter's, because the visitor is meant to recognise this and
     reach for it without being told. */
  const mr = saMomRect(rect);
  spot("mother-after", mr.x + mr.w*0.5, mr.y + mr.h*0.62, MIN*0.15, ()=>{
    SHEETS_AFTER.tapped = 1;
    if (SHEETS_AFTER.coughT < 0 && !SHEETS_AFTER.said){
      SHEETS_AFTER.coughT = 0;
      coughSound();
      /* no ripple and no chime. The clean scene answers a touch with a small warm ring
         because what follows is pleasant; here the answer is the sound itself. */
      curiosity += 0.3;
    }
  }, false);

  /* the cough, then a breath, then the sentence */
  if (SHEETS_AFTER.coughT >= 0){
    SHEETS_AFTER.coughT += dt;
    if (SHEETS_AFTER.coughT > SA_PAUSE && !SHEETS_AFTER.said){
      SHEETS_AFTER.said = 1;
      SHEETS_AFTER.lineT = SA_LINE;
      if (typeof sayLine === "function") sayLine("She’d had asthma for a while by then.", SA_LINE);
    }
  }
  if (SHEETS_AFTER.lineT > 0) SHEETS_AFTER.lineT -= dt;

  /* THE SOUND OF A PLACE WITH LESS IN IT.
     The bed is the tunnel recording rather than the garden, and it is the loudest thing
     here by a wide margin: the hierarchy is ambience, then cloth, then her, then nothing.
     No birds — they are not quiet in this scene, they are absent from it. */
  OUTSIDE = 1; MUFFLE = 0;
  /* 0.72 through the shared lift lands the layer just under unity, which is where the
     loudest thing in a scene should sit: the master trim is 0.85, so there is headroom and
     nothing is asking the buffer to clip. */
  ambienceAfter(0.72);
  lineSound(0.52, SHEETS_AFTER.wind === undefined ? SHEETS.wind : SHEETS.wind, 0);

  if (o.gate && SHEETS_AFTER.said) meet(o.gate);
}

/* ------------------------------------------------------------------------ her
   Nothing here draws her. Her drawing is the clean chapter's, called with her sprites —
   what this does is the one thing that is hers alone: a cough is a whole body folding, and
   for a second or so after it her shadow on the cloth is not quite still.

   It is a handful of pixels at most, and it decays. A shadow that keeps twitching would
   turn into an animation, and the pose is already carrying the moment. */
function updSheetsAfterMother(dt){
  const sh = SHEETS_AFTER.shadow;
  if (SHEETS_AFTER.coughT < 0){ sh.ox = 0; sh.oy = 0; return; }
  const k = Math.max(0, 1 - SHEETS_AFTER.coughT/1.6);
  const p = SHEETS_AFTER.coughT * 9.0;
  sh.oy = k*k * 0.0060 * Math.abs(Math.sin(p));      // down into the fold, never up
  sh.ox = k*k * 0.0016 * Math.sin(p*0.7);
}
