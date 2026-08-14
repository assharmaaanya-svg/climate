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
/* `S` is the flight state. It defaults to KSKY, which is the evening chapter's, because
   this scene had only one of them for a long time. The polluted chapter passes its own: the
   same model, the same constants and the same verb, with a separate reel position, so
   neither chapter inherits where the other left the kite. */
function updKiteFlight(t, dt, S){
  S = S || KSKY;
  const holding = P.down && P.active;
  S.held = holding ? S.held + dt : 0;
  /* in over about two seconds, back out over nearer four */
  const to = holding ? 1 : 0;
  S.reel += (to - S.reel) * Math.min(1, dt * (holding ? 1.15 : 0.62));
  S.best = Math.max(S.best, S.reel);
  /* a release after a real pull is worth something — the kite goes back up and
     that is the moment he laughs */
  if (!holding && S.reel > 0.35) S.joy = Math.min(1, S.joy + dt*0.5);
  else S.joy = Math.max(0, S.joy - dt*0.35);

  /* the air it is sitting in. Higher line, more weather. */
  const air = 1 - S.reel*0.55;
  S.wobX += ((Math.sin(t*0.63)*0.55 + Math.sin(t*1.07+1.9)*0.30
               + Math.sin(t*1.91+0.4)*0.15) * air - S.wobX) * Math.min(1, dt*2.2);
  S.wobY += ((Math.sin(t*0.81+2.2)*0.6 + Math.sin(t*1.43+0.7)*0.4) * air
               - S.wobY) * Math.min(1, dt*2.0);
  /* which way it is leaning: it heels over when the line is being hauled in */
  const want = S.wobX*0.22 - S.reel*0.30;
  S.sway += (want - S.sway) * Math.min(1, dt*2.6);

  if (S.hint > 0 && (S.best > 0.06 || S.held > 0.3))
    S.hint = Math.max(0, S.hint - dt*1.6);
}

/* where the kite is, in fractions of the frame */
function kiteAt(S){
  S = S || KSKY;
  const K = S.kite, e = ease.io(cl01(S.reel));
  return {
    x: lerp(K.home[0], K.near[0], e) + S.wobX*0.014,
    y: lerp(K.home[1], K.near[1], e) + S.wobY*0.012,
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
function skyPt(x, y, plate){
  const p = PLATES[plate || "kiteSky"];
  const d = (p && p.crop) || {x:0,y:0,w:1,h:1};
  return { x: (x - d.x)/d.w, y: (y - d.y)/d.h, ky: 1/d.h };
}

/* ---------------------------------------------------------------------------
   WHERE THE THREE THINGS ARE, WITHOUT DRAWING ANY OF THEM.

   Both kite chapters need exactly these numbers, and the polluted one needs to put
   weather in between two of the things they describe — so the arithmetic lives here
   once and each chapter composes its own order on top of it. Nothing in this function
   knows what light it is or what is in the air.

   Returns, all in device pixels: the boy's whole scaled canvas (bx,by,sw,sh) and the
   fingertip the line leaves from (handX,handY); and for the kite, its diamond's centre
   (cx,cy), the top-left of its canvas (kx,ky) at size (kw,kh), and the bridle (ax,ay)
   where the line actually attaches — a little below the left corner, as it is painted.
   ------------------------------------------------------------------------- */
function kiteLayout(S, o){
  const child = IMG[S.child.img], kite = IMG[S.kite.img];
  const rect = o.rect, rectS = o.rectS;
  const C = S.child, K = S.kite, at = kiteAt(S);
  const P0 = skyPt(C.cx, C.bottom, o.plate);

  const L = { at, ok:false, kiteOk:false,
              /* a fallback that keeps the line somewhere sane if his sprite is still
                 loading, rather than dropping it at the origin */
              handX: rect.x + 0.349*rect.w, handY: rect.y + 0.60*rect.h };
  if (imgReady(child)){
    const bh = C.h * P0.ky * rect.h;
    const bw = bh * (C.box[2]*child.naturalWidth) / (C.box[3]*child.naturalHeight);
    L.sw = bw / C.box[2]; L.sh = bh / C.box[3];      // his whole canvas, scaled
    L.bw = bw; L.bh = bh;
    L.bx = rect.x + P0.x*rect.w - bw*0.5 - C.box[0]*L.sw;
    L.by = rect.y + P0.y*rect.h - bh - C.box[1]*L.sh;
    L.handX = L.bx + C.hand[0]*L.sw;
    L.handY = L.by + C.hand[1]*L.sh;
    L.ok = true;
  }
  L.cx = rectS.x + at.x*rectS.w;
  L.cy = rectS.y + at.y*rectS.h;
  L.ax = L.cx; L.ay = L.cy;
  if (imgReady(kite)){
    const dh = at.h * rect.h;
    L.kh = dh / (K.dia[3] - K.dia[1]) * K.fatten;
    L.kw = L.kh * (kite.naturalWidth / kite.naturalHeight);
    /* the line pulls on its left corner, a little below the widest point */
    L.ax = L.cx - L.kw*((K.dia[2]-K.dia[0])*0.5) + L.kw*0.004;
    L.ay = L.cy + L.kh*0.020;
    L.kx = L.cx - L.kw*((K.dia[0]+K.dia[2])*0.5);
    L.ky = L.cy - L.kh*((K.dia[1]+K.dia[3])*0.5);
    L.kiteOk = true;
  }
  return L;
}

/* him. `a` is how much of him is left, which is 1 everywhere except the end of the
   polluted chapter, where he goes. */
function drawKiteChild(S, L, o){
  if (!L.ok) return;
  const img = IMG[S.child.img];
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.004) return;
  ctx.save();
  if (a < 0.999) ctx.globalAlpha = a;
  ctx.drawImage(darkSprite(img, S.bufKey || "kid", L.sw, L.sh, o.dark, o.tint), L.bx, L.by);
  ctx.restore();
}

/* the line. It is nearly straight in the painting and it should be: a flying kite has its
   line under tension. What little sag there is belongs to the length of line that is out,
   so hauling it in straightens it. It starts at his fingertips and ends at the bridle, and
   because the kite is always above and outboard of his raised hand it never crosses him —
   which is why there is no mask here and never needed to be. */
function drawKiteLine(t, S, L, o){
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.004) return;
  const night = o.night || 0, rect = o.rect;
  const sag = (1 - S.reel) * rect.h * 0.030 + rect.h * 0.004;
  ctx.save();
  const col = mixL([46,34,30], [96,92,120], night);
  const base = (0.42 + night*0.14) * a;
  /* `fade` thins the line along its own length, strongest at the far end. The evening
     chapter never asks for it and gets a plain stroke; the polluted one does, because a
     line that runs into haze has to lose itself the same way the kite on the end of it
     does — and a solid line ending at an invisible kite is the one thing that would give
     the whole effect away. */
  const fade = cl01(o.fade || 0);
  if (fade > 0.004){
    const g = ctx.createLinearGradient(L.handX, L.handY, L.ax, L.ay);
    g.addColorStop(0, rgba(col, base));
    g.addColorStop(0.45, rgba(col, base*(1 - fade*0.55)));
    g.addColorStop(1, rgba(col, base*(1 - fade)));
    ctx.strokeStyle = g;
  } else ctx.strokeStyle = rgba(col, base);
  ctx.lineWidth = Math.max(1, MIN*0.0011);
  ctx.beginPath();
  ctx.moveTo(L.handX, L.handY);
  const vib = S.reel > 0.55 ? Math.sin(t*34)*MIN*0.0014 : 0;
  ctx.quadraticCurveTo((L.handX+L.ax)*0.5 + vib, (L.handY+L.ay)*0.5 + sag, L.ax, L.ay);
  ctx.stroke();
  ctx.restore();
}

function drawKiteBody(t, S, L, o){
  if (!L.kiteOk) return;
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0.004) return;
  ctx.save();
  if (a < 0.999) ctx.globalAlpha = a;
  ctx.translate(L.cx, L.cy);
  ctx.rotate(S.sway*0.30);
  ctx.translate(-L.cx, -L.cy);
  ctx.drawImage(darkSprite(IMG[S.kite.img], S.kiteKey || "kite", L.kw, L.kh, o.dark, o.tint), L.kx, L.ky);
  ctx.restore();
}

/* ---- the signal ----
   Holding is not a thing a page teaches you, so it is shown rather than written: a ring
   that closes in on the kite, once every couple of seconds, the shape of the gesture it is
   asking for. It goes the moment you hold. */
function drawKiteRing(t, S, L, strength){
  if (S.hint <= 0.02) return;
  const p = (t*0.5) % 1;
  const r = MIN*(0.115 - 0.055*ease.io(p));
  /* `strength` lets the polluted chapter ask for less of it. By then the visitor has
     already learnt this gesture in the evening, and at full weight the ring was the
     loudest thing in a frame whose whole subject is something becoming hard to see. */
  const a = S.hint * 0.42 * (strength === undefined ? 1 : strength) * Math.sin(p*PI);
  ctx.save();
  ctx.strokeStyle = rgba([255,244,222], a);
  ctx.lineWidth = Math.max(1.2, MIN*0.0022);
  ctx.beginPath();
  ctx.arc(L.cx, L.cy, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
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

  updKiteFlight(t, dt, KSKY);

  /* He rides the band he is standing on. The plate moves each band by its own
     parallax factor, and the ground he is in is the 0.085 band — at 0.05 he
     drifted against it every time the camera moved, which is exactly what a
     figure that is not really on the ground does. The kite is in the sky and
     belongs to the far band, which barely moves at all. */
  const camG = roomCam(0.085), camS = roomCam(0.012);
  const rect  = { x: camG.x, y: camG.y, w: W, h: H };
  const rectS = { x: camS.x, y: camS.y, w: W, h: H };

  /* how much dark goes on them. In the evening they are already lit for the
     evening; at night they are not, and the boy takes more of it than the kite. */
  const tint = mixL([26,18,44], [8,10,32], night);
  const dChild = 0.05 + night*0.62;
  const dKite  = 0.04 + night*0.46;

  const L = kiteLayout(KSKY, { plate:"kiteSky", rect, rectS });
  drawKiteChild(KSKY, L, { dark:dChild, tint });
  drawKiteLine(t, KSKY, L, { night, rect });
  drawKiteBody(t, KSKY, L, { dark:dKite, tint });
  drawKiteRing(t, KSKY, L);

  /* the meadow he is standing in, back over the top of him */
  drawPlate("kiteSky", { air: night, onlyBand: FRONT });

  const vol = 0.85 - air*0.25;
  kiteSound(dt, vol, night, KSKY.joy);
  /* The day handing over, out here in the open where nothing is in the way. The
     garden bed goes as the light does rather than being switched off, and the
     crickets come up under it while there is still colour in the sky, which is
     what actually happens. */
  ambience(vol*0.62*(1 - night*0.86), 1);
  nightSound(dt, vol, night*0.85, 1);
  cv.className = P.down ? "grabbing" : "grabbable";
  if (o.gate && KSKY.best > 0.52) meet(o.gate);
}
