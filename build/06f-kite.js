/* ============================================================================
   THE KITE
   ============================================================================
   Two paintings of the same field — one at sunset, one after it — with nothing
   in them. No child, no kite, no string. The chapter starts in the evening and
   the evening becomes night while you are standing in it; there is no morning
   any more, because the morning was one more picture to get through before the
   thing this chapter is about.

   The child, the kite and the line the kite is on are three separate things.
   The child stands where he was painted. The kite does not: a kite you cannot
   move is a picture of a kite, and this one comes down when you hold it.

   WHERE EVERYTHING GOES
   The sprites were cut at a different crop from the empty skies, so their own
   canvases say nothing about placement. What placed them was the painting they
   came out of: childflykiteevening.png still has the boy and the kite in it, so
   they were measured off that and then carried into the new frame through the
   mapping between the two crops, solved by matching the paintings themselves
   (normalised cross-correlation 0.989):

       old = new * (0.96, 1.08) + (0.004, 0.004)

   In the old painting the boy runs from y 0.5955 at his raised hand to y 0.795
   where his legs go into the grass, and spans x 0.2965 to 0.3435. The kite's
   diamond is x 0.788-0.822, y 0.093-0.175. Everything below is those numbers
   carried across, which is why he is small and the kite is a long way up.

   THE LIGHT
   Both sprites were cut from the evening painting, so in the evening they need
   almost nothing — a whisper of cool over them and they sit. At night they need
   a great deal, and the kite needs less of it than the boy: he goes to
   silhouette, and the kite keeps its red, because one saturated thing surviving
   the dark says more than draining everything equally.
   ========================================================================== */

const KSKY = {
  child: {
    img: "child, kite .png",
    box: [0.4759, 0.1484, 0.2090, 0.6709],   // his content inside his own canvas
    hand:[0.6048, 0.1484],                   // the topmost pixel of him: fingertips
    /* in the SKY IMAGE's own frame, before the plate crops it */
    cx: 0.3291, bottom: 0.7324, h: 0.1847
  },
  kite: {
    img: "kite image.png",
    /* the diamond alone, inside the kite's canvas — the rest of that canvas is
       the tail, which has to be allowed to hang below wherever the kite is */
    dia: [0.594, 0.086, 0.746, 0.440],
    /* The boy is placed by measurement because he has to stand exactly where he
       was painted. The kite is placed by composition, because the visitor moves
       it and because on a widescreen frame the painted spot lands underneath the
       controls in the corner. Both of these are already screen fractions. */
    home:[0.7880, 0.1750],                   // where it flies when left alone
    near:[0.5300, 0.4150],                   // where it comes to when reeled in
    hFar: 0.0759, hNear: 0.1480,             // it grows as it comes toward you
    fatten: 1.16                             // the painted kite is tilted, so its
  },                                         // box is wider than an upright one
  /* the flight */
  reel: 0, held: 0, best: 0, joy: 0, wobX: 0, wobY: 0, sway: 0,
  hint: 1
};

function resetKiteSky(){
  KSKY.reel = 0; KSKY.held = 0; KSKY.best = 0; KSKY.joy = 0;
  KSKY.wobX = 0; KSKY.wobY = 0; KSKY.hint = 1;
}

/* Darken a cut-out without touching a pixel of its alpha. The colour goes on
   with source-atop inside the sprite's own buffer, so it lands only where the
   sprite already is — on the main canvas source-atop would find the whole
   opaque frame underneath and fill the sprite's rectangle instead, which is the
   trap that put black boxes behind the washing. Cached per size and strength,
   because this runs every frame. */
const KBUF = Object.create(null);
function darkSprite(img, key, w, h, dark, col){
  w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
  const q = Math.round(dark*24);                    // quantised, or it rebuilds
  const id = key+"|"+w+"x"+h+"|"+q;                 // on every frame of a fade
  const hit = KBUF[key];
  if (hit && hit.id === id) return hit.c;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, w, h);
  if (q > 0){
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = rgba(col, q/24);
    g.fillRect(0, 0, w, h);
  }
  KBUF[key] = { id, c };
  return c;
}

/* ---------------------------------------------------------------------------
   The flight. One verb: hold. Holding reels the line in and the kite comes
   down and toward you, getting bigger because it is getting nearer. Letting go
   gives it back to the wind and it climbs away — slower than it came down,
   because that is the part you are meant to watch.
   ------------------------------------------------------------------------- */
function updKiteFlight(t, dt){
  const holding = P.down && P.active;
  KSKY.held = holding ? KSKY.held + dt : 0;
  /* in over about two seconds, back out over nearer four */
  const to = holding ? 1 : 0;
  KSKY.reel += (to - KSKY.reel) * Math.min(1, dt * (holding ? 1.15 : 0.62));
  KSKY.best = Math.max(KSKY.best, KSKY.reel);
  /* a release after a real pull is worth something — the kite goes back up and
     that is the moment he laughs */
  if (!holding && KSKY.reel > 0.35) KSKY.joy = Math.min(1, KSKY.joy + dt*0.5);
  else KSKY.joy = Math.max(0, KSKY.joy - dt*0.35);

  /* the air it is sitting in. Higher line, more weather. */
  const air = 1 - KSKY.reel*0.55;
  KSKY.wobX += ((Math.sin(t*0.63)*0.55 + Math.sin(t*1.07+1.9)*0.30
               + Math.sin(t*1.91+0.4)*0.15) * air - KSKY.wobX) * Math.min(1, dt*2.2);
  KSKY.wobY += ((Math.sin(t*0.81+2.2)*0.6 + Math.sin(t*1.43+0.7)*0.4) * air
               - KSKY.wobY) * Math.min(1, dt*2.0);
  /* which way it is leaning: it heels over when the line is being hauled in */
  const want = KSKY.wobX*0.22 - KSKY.reel*0.30;
  KSKY.sway += (want - KSKY.sway) * Math.min(1, dt*2.6);

  if (KSKY.hint > 0 && (KSKY.best > 0.06 || KSKY.held > 0.3))
    KSKY.hint = Math.max(0, KSKY.hint - dt*1.6);
}

/* where the kite is, in fractions of the frame */
function kiteAt(){
  const K = KSKY.kite, e = ease.io(cl01(KSKY.reel));
  return {
    x: lerp(K.home[0], K.near[0], e) + KSKY.wobX*0.014,
    y: lerp(K.home[1], K.near[1], e) + KSKY.wobY*0.012,
    h: lerp(K.hFar, K.hNear, e)
  };
}

/* ---------------------------------------------------------------------------
   The scene.
   `night` runs 0 at sunset to 1 after it and is only the dissolve between the
   two skies — it is not the air getting worse, which is a different axis and a
   different chapter, so it is kept out of the particles and out of the tint.
   ------------------------------------------------------------------------- */
/* The plate stretches a crop of the painting across the whole frame, so a point
   measured in the painting is not the same point on screen. This is that map. */
function skyPt(x, y){
  const d = PLATES.kiteSky.crop || {x:0,y:0,w:1,h:1};
  return { x: (x - d.x)/d.w, y: (y - d.y)/d.h, ky: 1/d.h };
}

function drawKiteSky(t, dt, o){
  o = o || {};
  const night = cl01(o.night === undefined ? 0 : o.night);
  const air   = cl01(o.air === undefined ? 0 : o.air);
  if (!getPlate("kiteSky")){ ctx.fillStyle = "#2b3350"; ctx.fillRect(0,0,W,H); return; }

  /* everything but the near grass. The boy goes down in front of that and the
     grass comes back over him, which is how he is standing in the meadow rather
     than on it — in the painting his legs simply disappear into it. */
  const FRONT = PLATES.kiteSky.bands.length - 1;
  drawPlate("kiteSky", { air: night, skipBand: FRONT });

  partRole = lerp(0, 2, air);
  drawParticles(t, 0.10 + air*0.70, { x:W*0.26, y:H*0.30, r:H*1.1 });
  if (LITPOP.birds > 0.05) drawBirds();
  if (LITPOP.fireflies > 0.02) drawFireflies(t, LITPOP.fireflies);

  updKiteFlight(t, dt);

  /* He rides the band he is standing on. The plate moves each band by its own
     parallax factor, and the ground he is in is the 0.085 band — at 0.05 he
     drifted against it every time the camera moved, which is exactly what a
     figure that is not really on the ground does. The kite is in the sky and
     belongs to the far band, which barely moves at all. */
  const camG = roomCam(0.085), camS = roomCam(0.012);
  const rect  = { x: camG.x, y: camG.y, w: W, h: H };
  const rectS = { x: camS.x, y: camS.y, w: W, h: H };
  const child = IMG[KSKY.child.img], kite = IMG[KSKY.kite.img];

  /* how much dark goes on them. In the evening they are already lit for the
     evening; at night they are not, and the boy takes more of it than the kite. */
  const tint = mixL([26,18,44], [8,10,32], night);
  const dChild = 0.05 + night*0.62;
  const dKite  = 0.04 + night*0.46;

  /* ---- the boy ---- */
  const P0 = skyPt(KSKY.child.cx, KSKY.child.bottom);
  let handX = rect.x + 0.349*rect.w, handY = rect.y + 0.60*rect.h;
  if (imgReady(child)){
    const C = KSKY.child;
    const bh = C.h * P0.ky * rect.h;
    const bw = bh * (C.box[2]*child.naturalWidth) / (C.box[3]*child.naturalHeight);
    const sw = bw / C.box[2], sh = bh / C.box[3];       // his whole canvas, scaled
    const bx = rect.x + P0.x*rect.w - bw*0.5 - C.box[0]*sw;
    const by = rect.y + P0.y*rect.h - bh - C.box[1]*sh;
    handX = bx + C.hand[0]*sw;
    handY = by + C.hand[1]*sh;
    ctx.drawImage(darkSprite(child, "kid", sw, sh, dChild, tint), bx, by);
  }

  /* ---- the kite ---- */
  const K = KSKY.kite, at = kiteAt();
  let ax = rectS.x + at.x*rectS.w, ay = rectS.y + at.y*rectS.h;   // the bridle
  let kx = 0, ky = 0, kw = 0, kh = 0;
  if (imgReady(kite)){
    const dh = at.h * rect.h;
    kh = dh / (K.dia[3] - K.dia[1]) * K.fatten;
    kw = kh * (kite.naturalWidth / kite.naturalHeight);
    const cxk = rectS.x + at.x*rectS.w, cyk = rectS.y + at.y*rectS.h;
    /* the line pulls on its left corner, a little below the widest point */
    ax = cxk - kw*((K.dia[2]-K.dia[0])*0.5) + kw*0.004;
    ay = cyk + kh*0.020;
    kx = cxk - kw*((K.dia[0]+K.dia[2])*0.5);
    ky = cyk - kh*((K.dia[1]+K.dia[3])*0.5);
  }

  /* ---- the line ---- */
  /* It is nearly straight in the painting and it should be: a flying kite has
     its line under tension. What little sag there is belongs to the length of
     line that is out, so hauling it in straightens it. */
  const sag = (1 - KSKY.reel) * rect.h * 0.030 + rect.h * 0.004;
  ctx.save();
  ctx.strokeStyle = rgba(mixL([46,34,30], [96,92,120], night), 0.42 + night*0.14);
  ctx.lineWidth = Math.max(1, MIN*0.0011);
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  const vib = KSKY.reel > 0.55 ? Math.sin(t*34)*MIN*0.0014 : 0;
  ctx.quadraticCurveTo((handX+ax)*0.5 + vib, (handY+ay)*0.5 + sag, ax, ay);
  ctx.stroke();
  ctx.restore();

  if (imgReady(kite)){
    ctx.save();
    ctx.translate(rectS.x + at.x*rectS.w, rectS.y + at.y*rectS.h);
    ctx.rotate(KSKY.sway*0.30);
    ctx.translate(-(rectS.x + at.x*rectS.w), -(rectS.y + at.y*rectS.h));
    ctx.drawImage(darkSprite(kite, "kite", kw, kh, dKite, tint), kx, ky);
    ctx.restore();
  }

  /* ---- the signal ---- */
  /* Holding is not a thing a page teaches you, so it is shown rather than
     written: a ring that closes in on the kite, once every couple of seconds,
     the shape of the gesture it is asking for. It goes the moment you hold. */
  if (KSKY.hint > 0.02){
    const p = (t*0.5) % 1;
    const r = MIN*(0.115 - 0.055*ease.io(p));
    const a = KSKY.hint * 0.42 * Math.sin(p*PI);
    ctx.save();
    ctx.strokeStyle = rgba([255,244,222], a);
    ctx.lineWidth = Math.max(1.2, MIN*0.0022);
    ctx.beginPath();
    ctx.arc(rectS.x + at.x*rectS.w, rectS.y + at.y*rectS.h, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /* the meadow he is standing in, back over the top of him */
  drawPlate("kiteSky", { air: night, onlyBand: FRONT });

  kiteSound(dt, 0.85 - air*0.25, night, KSKY.joy);
  /* the day handing over. The crickets start while there is still light in the
     sky, which is what actually happens, and the afternoon's birds go with it. */
  nightSound(0.85 - air*0.25, night*0.85);
  cv.className = P.down ? "grabbing" : "grabbable";
  if (o.gate && KSKY.best > 0.52) meet(o.gate);
}
