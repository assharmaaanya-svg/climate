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
    { img:"sheetsafterpollution2.png", src:[0.1481,0.2086,0.2233,0.4946], box:[ 0.1730,0.1528,0.2069,0.4074] },
    { img:"sheetsafterpollution3.png", src:[0.3785,0.2208,0.2397,0.5510], box:[ 0.3777,0.1640,0.2238,0.4573] },
    { img:"sheetsafterpollution4.png", src:[0.6155,0.2159,0.2184,0.4897], box:[ 0.5962,0.1663,0.2028,0.4042] },
    { img:"sheetsafterpollution5.png", src:[0.8262,0.1865,0.1738,0.5853], box:[ 0.8160,0.1505,0.1670,0.5000] }
  ],
  /* Her. A transparent, already-tinted silhouette rather than the clean scene's figure on
     pure white, so she is composited normally instead of multiplied — multiply against a
     transparent pixel returns the source, which would have put a hard rectangle of her own
     colour across the sheet behind her.

     She stands behind the third sheet, as she did, and she is drawn under it: encountered
     among the washing rather than presented in front of it. Her box is measured off her own
     ink and scaled to the height the clean shadow had on the cloth, so she is the same
     person the same distance away. */
  mother: { img:"momshadowcoughingafterpollution.png", src:[0.3788,0.1443,0.2137,0.7432] },
  momAt: 2,
  /* how far through the scene she has been touched, and what follows it */
  tapped: 0, coughT: -1, lineT: -1, said: 0, glow: 0,
  built: false, cloth: []
};

/* the drop and the horizontal place of her figure, as fractions of the frame. Her drawn
   height is matched to the clean scene's shadow, which was measured against the painting
   of her really standing behind that sheet — so this is the painter's scale, not mine. */
/* SHE IS BEHIND THE SHEET, NOT LOOKING OVER IT.
   At 0.1735 her head cleared the top of the cloth and she read as somebody peering over the
   washing line, which is both wrong and faintly comic. Her sheet hangs from 0.164 to 0.621,
   so she starts well inside that and finishes just below the hem: the head is covered, the
   feet show, and what the visitor sees of her is a shape through cloth and a pair of feet
   under it — which is how you actually come across someone hanging washing. */
const SA_MOM = { cx:0.4880, top:0.2150, h:0.4300 };

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
}

function saMomRect(rect){
  const h = SA_MOM.h * rect.h;
  const w = h * (SHEETS_AFTER.mother.src[2]*1254) / (SHEETS_AFTER.mother.src[3]*1254);
  return { x: rect.x + SA_MOM.cx*rect.w - w/2, y: rect.y + SA_MOM.top*rect.h, w, h };
}

/* --------------------------------------------------------------------- the scene */
function drawSheetsAfter(t, dt, o){
  o = o||{};
  if (!getPlate("lineAfter")){ ctx.fillStyle="#5d5344"; ctx.fillRect(0,0,W,H); return; }
  if (!SHEETS_AFTER.built) buildSheetsAfter();
  /* the same wind that moves the clean line, so the cloth has the same weight; the scene
     itself is stiller because there is less in it, not because the air behaves differently */
  updSheetWind(dt, t);

  drawPlate("lineAfter", { air:0 });

  const cam = roomCam(0.05);
  const rect = { x: cam.x, y: cam.y, w: W, h: H };

  for (let i=0;i<SHEETS_AFTER.src.length;i++){
    const s = SHEETS_AFTER.src[i], c = SHEETS_AFTER.cloth[i];
    const opt = { t, c, x:rect.x, y:rect.y, w:rect.w, h:rect.h,
                  give: 1, wave1: 5.2, wave2: 3.4, pin: 1, alpha: 1, src: s.src };

    /* she goes in behind her sheet, so the cloth crosses her and she is found among the
       washing. Her sheet takes less of the wind, exactly as the clean one did: she is
       standing against it. */
    if (i === SHEETS_AFTER.momAt){
      drawSheetsAfterMother(t, dt, rect);
      opt.give = 0.46;
    }
    drawCloth(IMG[s.img], s.box, opt);
  }

  /* Her, as something to touch — the same call, the same radius, the same halo the clean
     scene puts on her, because the visitor is meant to recognise this and reach for it. */
  const mr = saMomRect(rect);
  spot("mother-after", mr.x + mr.w*0.5, mr.y + mr.h*0.52, MIN*0.15, ()=>{
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
   Drawn flat, never deformed, and never brightened. Her pose is doing the work: a figure
   with a hand up at her face, seen through cloth. There are no particles, no lines coming
   off her and no animation beyond the small amount of life the scene already has — the
   brief for her was that her silhouette carries it, and it does.

   She sits UNDER her sheet in the draw order, which is why nothing about her needs keying
   or feathering: the cloth is the thing with the soft edge, and she is behind it. */
function drawSheetsAfterMother(t, dt, rect){
  const im = IMG[SHEETS_AFTER.mother.img];
  if (!imgReady(im)) return;
  const s = SHEETS_AFTER.mother.src;
  const r = saMomRect(rect);
  const iw = im.naturalWidth, ih = im.naturalHeight;

  /* a very small amount of settle, the kind a person standing still has, and a touch more
     of it in the second after the cough. Nothing that reads as an animation. */
  const after = SHEETS_AFTER.coughT >= 0 ? Math.max(0, 1 - SHEETS_AFTER.coughT/1.4) : 0;
  const bob = Math.sin(t*0.9)*r.h*0.0016 + after*Math.sin(t*7.5)*r.h*0.0042;

  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.drawImage(im, s[0]*iw, s[1]*ih, s[2]*iw, s[3]*ih,
                r.x, r.y + bob, r.w, r.h);
  ctx.restore();
}
