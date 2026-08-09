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
    { img:"sheetsafterpollution3.png", src:[0.3785,0.2208,0.2397,0.5510], box:[ 0.3777,0.1640,0.2238,0.4573] },
    { img:"sheetsafterpollution4.png", src:[0.6155,0.2159,0.2184,0.4897], box:[ 0.5962,0.1663,0.2028,0.4042] },
    { img:"sheetsafterpollution5.png", src:[0.8262,0.1865,0.1738,0.5853], box:[ 0.8160,0.1505,0.1670,0.5000] }
  ],
  /* HER, BUILT THE WAY SHE IS BUILT IN THE CLEAN CHAPTER.
     She was wrong here before: a semi-transparent cut-out of her whole body laid behind the
     sheet, at a size I had picked, with no skirt below the hem and nothing falling on the
     cloth. So she was neither a shadow nor a person — she was a faint picture behind a sheet,
     and small enough to miss entirely.

     She is now the same three-part figure the clean line has, in the same order: her skirt,
     then the sheet, then her shadow cast onto that sheet and clipped to it.

     HER BOX IS NOT THE CLEAN SCENE'S BOX, AND IT CANNOT BE. The two crops do not start at
     the same part of her: in the clean sprite her arms are straight up, so the top of that
     crop is her HANDS and her head sits a quarter of the way down it; in this one her hand
     is at her mouth and the top of the crop is the top of her head. Drawn into the clean
     rect she was therefore stood up to where the fingertips had been — head against the
     pins, shoulders across the middle of the cloth, looming.

     SHE IS ONE FIGURE, NOT A TORSO AND A SKIRT. This is the thing that was wrong and it was
     not a matter of a few pixels: the crop's bottom edge is her WAIST, and it was sitting
     0.0125 of the frame above the sheet's hem while the mask faded her out over the last
     inch of cloth as well. So she ended in mid air, there was a band of bare sheet under
     her, and then a skirt began on its own — a woman cut in half.

     Her box now ends exactly ON the hem, 0.2740 + 0.3473 = 0.6213, and the mask is pushed
     PAST the hem rather than inset from it, so a lifting hem can never take a slice off the
     join. Her waist meets the top of the skirt at the one line where the cloth stops and the
     skirt takes over, which is how the clean chapter has always worked.

     The size then follows from two things and nothing else. Vertically: her feet on the hem,
     and her head with the same 0.117 of clear cloth above it that the clean chapter leaves,
     which fixes the height at 0.3473. Horizontally: the aspect the clean chapter's plate
     imposes, 0.1326/0.3116, which is 0.1478. Her waist is 0.724 of that — and the skirt's
     `sk` below is then solved so its own width at the hem is the same number. Same size at
     the join, because they are the same body.

     The sprite is a cut-out on transparency rather than a figure on white, so it goes
     through the white buffer in shadowBuf and is let in at `ink` — the file is nearly
     black, and the clean shadow it has to match is a mid grey. 0.66 puts the two at the
     same mean density, so she reads as a shadow on cloth and not as a hole in it. */
  shadow: { img:"momshadowcoughingcropped.png",
            src:[0.3788,0.2730,0.2137,0.7270],
            box:[0.4020,0.2740,0.1478,0.3473],
            ink:0.66, dens:0.78, ox:0, oy:0,
            /* SHE DOES NOT SWAY. A shadow is cast by a body onto a surface, and the body is
               standing still; if it drifts with the cloth it stops being a shadow and becomes
               a pattern printed on the sheet, which is the one thing this whole approach
               exists to avoid. It followed 0.90 of the drift as a way of keeping the clip
               from cutting her, and that is not needed any more — the mask is feathered and
               her sheet barely moves, so she can be still, which is what she should be. */
            follow:0, at:[0.45, 0.80] },
  /* HER REAL SKIRT, BELOW THE HEM, IN THE SAME WIND. The after-pollution painting of it is a
     1254-square with the skirt filling the frame, so it needs its own source rect.

     THE SKIRT IS THE SAME WIDTH AS SHE IS, AT THE ONE PLACE THEY MEET.
     Not bigger, not smaller — solved. Her waist is 0.724 of her box's width and the skirt
     sprite's own cloth at the hem is 0.454 of its drawn width, so the skirt's width is her
     waist divided by 0.454, and its height follows from the clean skirt's aspect so the
     painting is not stretched. `cx` puts the sprite's ink centre, which is 0.509 of its width
     and not 0.5, on her waist centre.

     Everything below the hem is flare, and flare is what makes it read as a skirt rather than
     a tube — the width that matters is the width at the join, and at the join they are the
     same body. Both numbers were then checked against the render, because the boxes measure
     ink and a visitor sees ink plus softening, and the softening differs between a blurred
     multiply and a painted sprite. */
  skirt: { img:"skirtafterpollution.png", box:[0.0159,0.0837,0.9681,0.7903],
           sk: { w:0.2357, h:0.2573, cx:0.4909, tuck:0.148 } },
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

/* where she is on the frame, for the thing you touch and for the tests. Taken from her
   shadow's box, exactly as the clean chapter takes it from hers. */
function saMomRect(rect){
  const b = SHEETS_AFTER.shadow.box;
  return { x: rect.x + b[0]*rect.w, y: rect.y + b[1]*rect.h,
           w: b[2]*rect.w, h: b[3]*rect.h };
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

    /* HER SHEET, IN THE CLEAN CHAPTER'S ORDER. Skirt first, so the sheet's own hem covers
       her waist and there is no seam between the two sprites to hide. Then the sheet,
       warped like every other one but taking less of the wind, because she is standing
       right behind it with both hands on it. Then her shadow on the cloth, which is not
       warped at all — a shadow does not flap — only clipped to the cloth's outline so it
       travels with the sheet instead of hanging in the air when a gust takes it. */
    updSheetsAfterMother(dt);
    drawSkirtOf({ img: SHEETS_AFTER.skirt.img, box: SHEETS_AFTER.skirt.box,
                  sk: SHEETS_AFTER.skirt.sk, hem: s.box,
                  /* the cough, passed through, so she moves as one body */
                  ox: SHEETS_AFTER.shadow.ox, oy: SHEETS_AFTER.shadow.oy }, t, rect, 1);
    /* HER SHEET BARELY MOVES, AND THAT IS NOT A COMPROMISE.
       She is standing right behind it with both hands on it. At 0.46 it billowed nearly as
       much as its unheld neighbours, and the hem — the most active part of any cloth mesh —
       swung far enough out from under her that the mask took a piece of her. Held cloth does
       not billow; 0.24 is a sheet with somebody's weight against it. */
    opt.give = 0.24;
    opt.deform = clothDeform(s.box, opt);
    drawCloth(IMG[s.img], s.box, opt);
    /* the sheet, handed over as a way of drawing it: her mask is that cloth's own alpha,
       which is what keeps her inside it however the wind takes it. The sprite's alpha is
       binary to within a feathered edge — 97.6% of it sits at 224-254 — so masking her with
       it bounds her without printing the cloth's folds onto her: the folds are colour, not
       transparency, and a shadow must not brighten and dim as the cloth moves. */
    drawShadowOf(SHEETS_AFTER.shadow, rect, 1, opt.deform, s.box,
                 ()=>drawCloth(IMG[s.img], s.box, opt));
    /* exactly what this frame used, for __bluer.momProbe() */
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
