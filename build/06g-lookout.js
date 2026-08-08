/* ============================================================================
   THE LOOKOUT
   A pair of binoculars, on a hill, over a whole valley.

   The version this replaces was a guided minigame wearing the costume of an
   object: the view could travel about a sixth of the frame, the magnification
   reached 1.4x, and there were four places that counted and nowhere else to go.
   Everything you could do, you did in the first fifteen seconds.

   Three things changed.

   1. THE VIEW IS A WINDOW INTO THE PAINTING, NOT A ZOOM OF THE FRAME.
      Every other chapter draws the town plate — the painting sliced into bands
      with parallax between them. That is right for a scene you stand in and
      wrong for one you look at through glass: parallax is what happens when YOU
      move, and here you do not move, the lenses turn. So this chapter ignores
      the plate and reads a sub-rectangle straight out of the source painting at
      its own resolution. One resample instead of two, no band seams to magnify,
      and the pan is not a nudge of a fixed frame — it is a real window that can
      go anywhere in the picture. At the working magnification you can put any
      part of the valley in the eyepiece: the ridge, the school, the far side of
      town, the flowers by your feet. Nothing is out of reach and nothing is
      privileged.

   2. HOLDING IS FOCUSING, AND FOCUSING TAKES TIME.
      Press and the world begins to come back, in an order: sharpness first, then
      the haze thinning, then the colour, and last the small distant things that
      were always there and could not be resolved. Full focus is about two and a
      half seconds away and it never arrives in one step. Let go and it goes,
      slower than it came. In the third chapter the same hold only gets you
      partway, and it slips faster, which is the whole argument of the piece made
      as a control rather than as a caption.

   3. EVERY PLACE ANSWERS.
      Four of them are on a list. Seven more are not on any list, are never
      marked, and say something anyway. A visitor who looks at the church because
      it is a church finds that the church was waiting. That is the difference
      between exploring and completing.

   The guidance problem — the school was genuinely hard to find — is solved
   without a single arrow. Undiscovered landmarks carry a warm bloom that is
   brightest when the lenses are OUT of focus and fades as you arrive, so the
   hint retreats as it succeeds; the metal on the tower and the glass in the
   school cupola throw an occasional glint, which is what metal and glass do; the
   birds on the wire move; a cloud shadow crosses the ridge; and if a visitor has
   sat still for a while without pressing anything, the lenses drift very slowly
   toward whatever they have not found yet, and stop the instant a hand arrives.
   ========================================================================== */

/* ----------------------------------------------------------------- THE FIELD
   What you see when you put binoculars to your face is ONE soft-edged oval, not
   two circles. This is worth being firm about, because the obvious thing to draw
   is two.

   The chapter was first built on the supplied two-circle overlay and it was wrong
   in three ways that only showed up once there was something to aim at. The two
   circles are 0.42 of the frame wide and their centres are 0.33 apart, so they
   overlap across the middle and leave a seam running down the exact centre of the
   frame — which is the one place the chapter asks the visitor to put things. Light
   falloff, which any real lens has, cannot be drawn on two overlapping discs
   without double-darkening the overlap, so the seam becomes a bruise. And the
   corner brackets are a rifle sight: this is a chapter about looking at a valley,
   not at a target.

   So the field is one oval, drawn rather than loaded, slightly wider than tall the
   way a wide-field pair looks with your eye close to the glass. A soft edge, real
   vignetting toward the rim, a warm ring inside the edge and a cool one outside
   because that is what glass does to the edge of a field, and a very dark blue-grey
   surround rather than pure black, because the inside of an eyecup is not black.
   No reticle. Nothing to read.

   `lensL`/`lensR`/`r` are kept because the dormant morph file measures the two
   lens positions off them. */
const BINOC = { lensL:0.335, lensR:0.665, cy:0.500, r:0.212 };
/* Nearly round, and a little smaller than the frame is tall. Both matter. At
   ax/ay 1.41 it read as an ellipse rather than a circle, and at ay 0.472 it touched
   within twenty pixels of the top and bottom of the frame, which leaves no
   surround for the eye to read the shape against — it looked like a soft-edged
   photograph rather than like looking through something. */
const FIELD = { cy:0.500, ay:0.437, aspect:1.14, feather:0.080 };
/* the semi-axes in pixels, which is what everything else needs */
const fieldAy = () => H*FIELD.ay;
const fieldAx = () => Math.min(W*0.46, H*FIELD.ay*FIELD.aspect);

/* ------------------------------------------------------------------ the state
   `cx`/`cy` are where the lenses are pointed, in pixels of the source painting.
   `z` is how much of the painting fits in the frame: 1 is the whole thing, which
   is exactly the framing the plate scenes use, so the chapter opens matched to
   the one before it and then the binoculars come up to your eyes. */
const PLOOK = {
  ready:false,
  cx:0, cy:0, vx:0, vy:0,          // aim, in source px, and its throw
  z:1, lift:0,                     // magnification, and the raise-to-the-eyes
  focus:0, recall:0,               // how long you have held, and what it looks like
  found:Object.create(null),       // the four, ticked
  said:Object.create(null),        // everything else, said once
  dwell:Object.create(null),
  n:0,
  aim:null,                        // what is in the middle right now
  taken:0,                         // a hand has arrived; stop helping
  idle:0,
  wsrc:0, hsrc:0, sx:0, sy:0,      // the window, cached for the hit test
  beat:""
};

/* the working magnifications. Z_BASE is where the lenses settle once they are up
   — enough that there is always somewhere to pan to — and Z_MAX is what holding
   steady adds on top. Beyond about 2.4 the painting has no more detail to give
   and starts to look like a photograph of a painting. */
const Z_BASE = 1.66, Z_MAX = 2.34;
/* the out-of-focus copy of the frame, at half resolution. Its own buffer rather
   than the shared TMP2, because resizing a buffer that four other scenes draw
   full-frame into is a bug waiting for the next chapter. */
const LBLUR = document.createElement("canvas"), lbc = LBLUR.getContext("2d");

/* THE TWO PAINTINGS, ALREADY MIXED.
   The frame is a window into a blend of the clean valley and the hazed one, and
   the naive way to draw it is two scaled drawImage calls from two 1537-pixel
   paintings, every frame. That made this the most expensive chapter in the piece —
   twenty frames a second against forty for the kite — because a large source
   resampled down with smoothing is genuinely costly, and it was happening twice.

   But the blend only changes when the focus does. So the two are composited once,
   at the painting's own resolution, into a buffer that is rebuilt only when the
   mix has moved by more than two per cent; the frame is then a single window out
   of that. While the visitor is looking around with the focus steady — which is
   most of this chapter — it is one resample instead of two, and the rebuild only
   happens a few dozen times over the couple of seconds of a focus pull. */
const LCOMP = document.createElement("canvas"), lcc = LCOMP.getContext("2d");
let lcompAir = -1;
function lookComposite(im, imh, air){
  if (LCOMP.width !== im.naturalWidth || LCOMP.height !== im.naturalHeight){
    LCOMP.width = im.naturalWidth; LCOMP.height = im.naturalHeight;
    lcompAir = -1;
  }
  const q = Math.round(cl01(air)*50)/50;
  if (q === lcompAir) return LCOMP;
  lcompAir = q;
  lcc.setTransform(1,0,0,1,0,0);
  lcc.globalAlpha = 1;
  lcc.globalCompositeOperation = "source-over";
  lcc.drawImage(im, 0, 0);
  if (q > 0.004 && imgReady(imh)){
    lcc.globalAlpha = q;
    lcc.drawImage(imh, 0, 0);
    lcc.globalAlpha = 1;
  }
  return LCOMP;
}
/* how much of the source the frame shows at z=1: the same crop the town plate
   uses, so the cut into this chapter is not a cut. */
const L_HOME_H = 0.88;

/* ------------------------------------------------------------------ the places
   All coordinates are fractions of the SOURCE painting, measured off magnified
   gridded crops of viewoftown.png rather than guessed — the last version had the
   birds a full 1.5% of the frame below the wire they are sitting on.

   `r` is how big the thing is, which is how forgiving its aim needs to be.
   The first four are the list. The rest are not on any list, are never marked,
   and answer anyway. */
const LMARK = [
  { id:"school", x:0.4250, y:0.6880, r:0.070, key:true, aud:"school",
    tick:"My school",
    say:"Your school. The red brick one, with the little tower on top.",
    glint:{ x:0.4232, y:0.6560, w:0.010 } },              // the cupola glazing
  { id:"wires",  x:0.2480, y:0.4790, r:0.062, key:true, aud:"birds",
    tick:"The birds on the wire",
    say:"The birds on the wire. There were always more than you could count." },
  { id:"tower",  x:0.6752, y:0.6280, r:0.056, key:true, aud:"tower",
    tick:"The water tower",
    say:"The water tower. You could see it from anywhere in town.",
    glint:{ x:0.6690, y:0.6130, w:0.013 } },              // sun on the tank
  { id:"hills",  x:0.4550, y:0.5620, r:0.140, key:true, aud:"hills",
    tick:"The far hills",
    say:"The far hills. On a clear day, every one of them." },

  { id:"spire",  x:0.8000, y:0.6760, r:0.048, aud:"town",
    say:"The church. You could hear that bell all the way up here.",
    glint:{ x:0.7995, y:0.6480, w:0.007 } },
  { id:"lane",   x:0.2450, y:0.7130, r:0.082, aud:"town",
    say:"Your street. Fourth along, the one with the gate that stuck." },
  { id:"tree",   x:0.7450, y:0.6940, r:0.055, aud:"birds",
    say:"The big tree at the crossroads. Everybody met under that tree." },
  { id:"pole",   x:0.0970, y:0.5150, r:0.060,
    say:"The pole at the top of the field. It hummed if you leaned on it." },
  { id:"hall",   x:0.9280, y:0.7120, r:0.055, aud:"town",
    say:"The town hall, and the tower you were never allowed up." },
  { id:"clouds", x:0.1750, y:0.1450, r:0.125,
    say:"Clouds. You used to lie back here and give them names." },
  { id:"flowers",x:0.3050, y:0.9100, r:0.115,
    say:"Buttercups, the whole way down the hill." }
];

/* the top wire, which is the one the birds sit on. Two measured points, and it
   is straight enough between them that a line is honest. */
const lookWireY = fx => 0.4755 + (fx - 0.220)*0.138;

/* Birds of my own, on free stretches of wire away from the painted ones so
   nothing doubles. They sit, they shuffle, and every so often one of them drops
   off the wire, goes round, and comes back — which is the only thing in this
   painting that moves on its own, and the eye finds it without being told to. */
const LBIRD = [];
function buildLookBirds(){
  if (LBIRD.length) return;
  for (const fx of [0.352, 0.487, 0.665]){
    LBIRD.push({ home:fx, x:fx, y:lookWireY(fx), st:"sit", t:rnd(3,14),
                 fx:0, fy:0, ph:rnd(0,TAU), flip: Math.random()<0.5 ? -1 : 1 });
  }
}
function updLookBirds(dt, alive){
  for (const b of LBIRD){
    b.t -= dt;
    if (b.st === "sit"){
      b.x = b.home; b.y = lookWireY(b.home);
      if (b.t <= 0 && alive > 0.4){
        b.st = "fly"; b.t = rnd(3.4, 5.2); b.dur = b.t;
        b.flip = Math.random()<0.5 ? -1 : 1;
      }
    } else {
      // out and back along a shallow arc, so it always lands where it left
      const u = 1 - cl01(b.t / b.dur);
      const s = Math.sin(u*PI);
      b.x = b.home + b.flip * s * 0.055;
      b.y = lookWireY(b.home) - s*0.048 - Math.sin(u*PI*2)*0.010;
      if (b.t <= 0){ b.st = "sit"; b.t = rnd(6, 22); }
    }
  }
}

/* one bird, in source-fraction space, drawn at whatever the view makes of it.
   The painted birds on this wire are about 0.9% of the painting's width tall, so
   these are matched to them: anything larger and a starling reads as a crow. */
function drawLookBird(b, px, py, sc, t, dark){
  const s = Math.max(1.0, sc*0.0042);          // body length, in screen px
  ctx.save();
  if (b.st === "fly"){
    /* A bird in the air at this distance is not a body with wings attached to it,
       it is two curves. Drawn as a filled ellipse plus two straight strokes it came
       out as a black cartoon bat, which is what it looks like when you draw the
       anatomy instead of the silhouette. Two arcs meeting at nothing, stroked thin,
       is the whole bird. */
    const beat = Math.sin(t*15 + b.ph);
    const sp = s*0.95;
    ctx.strokeStyle = rgba(dark, 0.85);
    ctx.lineWidth = Math.max(0.7, sp*0.14);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px - sp, py + sp*0.34*beat);
    ctx.quadraticCurveTo(px - sp*0.45, py - sp*0.30*beat, px, py);
    ctx.quadraticCurveTo(px + sp*0.45, py - sp*0.30*beat, px + sp, py + sp*0.34*beat);
    ctx.stroke();
  } else {
    // on the wire: a body, a head, and a tail hanging off the back of it
    ctx.fillStyle = rgba(dark, 0.9);
    ctx.beginPath();
    ctx.ellipse(px, py - s*0.55, s*0.40, s*0.60, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + b.flip*s*0.28, py - s*1.02, s*0.23, s*0.23, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px - b.flip*s*0.44, py - s*0.24, s*0.30, s*0.12, b.flip*0.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ the frame */
function resetLookout(bid){
  const im = loadImg("viewoftown.png");
  const SW = imgReady(im) ? im.naturalWidth : 1537;
  const SH = imgReady(im) ? im.naturalHeight : 1023;
  PLOOK.cx = SW*0.5;
  PLOOK.cy = SH*L_HOME_H*0.5;
  PLOOK.vx = PLOOK.vy = 0;
  PLOOK.z = 1; PLOOK.lift = 0;
  PLOOK.focus = 0; PLOOK.recall = 0;
  PLOOK.taken = 0; PLOOK.idle = 0;
  PLOOK.aim = null;
  PLOOK.beat = bid || "";
  for (const k in PLOOK.dwell) PLOOK.dwell[k] = 0;
  buildLookBirds();
  buildLookList();
}

/* `o.air0` is how the valley looks with the lenses out of focus, `o.air1` is the
   most that holding can ever get back. In chapter two that second number is
   zero: hold long enough and you have the day as it was. In chapter three it is
   not, and no amount of holding moves it, which is the point. */
function drawLookout(t, dt, o){
  o = o||{};
  apFull();
  const im  = loadImg("viewoftown.png");
  const imh = loadImg("viewoftownafterpollution.png");
  if (!imgReady(im)){
    // until it decodes, the plate, so the beat is never a blank screen
    drawPlate("town", { air:o.air0===undefined?0.4:o.air0 });
    return;
  }
  PLOOK.ready = true;
  const SW = im.naturalWidth, SH = im.naturalHeight;
  const air0 = o.air0===undefined ? 0.40 : o.air0;
  const air1 = o.air1===undefined ? 0.00 : o.air1;
  const fall = o.fall || 3.6;

  /* ---------------------------------------------------------- raising them */
  PLOOK.lift = cl01(PLOOK.lift + dt/2.1);
  const lift = ease.io(PLOOK.lift);

  /* ---------------------------------------------------------- holding still
     Focus is what holding buys, and it is deliberately slow: a little over three
     seconds of hold from cold, and it arrives in an order rather than all at once.
     Sweeping the lenses hard does not stop it, it only slows it — a visitor who is
     looking around should not be punished for looking around. */
  const held = P.down ? 1 : 0;
  if (held) PLOOK.taken = 1;
  const spd  = Math.hypot(PLOOK.vx, PLOOK.vy) / Math.max(1, PLOOK.wsrc);
  const calm = 0.35 + 0.65*cl01(1 - spd*2.0);
  /* and the world helps, slightly, when there is something in the middle worth
     resolving. Not a marker: the same soft focus pull a real lens gives you when
     you happen to be pointed at something with an edge on it. */
  const warm = (PLOOK.aim && !PLOOK.found[PLOOK.aim.id]) ? 1.15 : 1;
  PLOOK.focus = cl01(PLOOK.focus + (held ? dt/3.20*calm*warm : -dt/fall));
  PLOOK.recall = lerp(PLOOK.recall, ease.io(PLOOK.focus), Math.min(1, dt*2.6));
  const rec = PLOOK.recall;

  /* ---------------------------------------------------------- where they point
     While a hand is down the world moves with it, one for one — a real object
     does not lag behind your grip. Let go and the throw carries on and settles.
     Under all of it, a tremor, because nobody holds binoculars still. */
  const zTarget = Z_BASE + (Z_MAX - Z_BASE)*ease.io(PLOOK.focus);
  PLOOK.z = lerp(PLOOK.z, lerp(1, zTarget, lift), Math.min(1, dt*1.9));
  const wsrc = (SW*1.0) / PLOOK.z;
  const hsrc = (SH*L_HOME_H) / PLOOK.z;
  const kx = wsrc / W, ky = hsrc / H;              // source px per screen px

  if (P.down){
    PLOOK.cx -= P.dx * kx;
    PLOOK.cy -= P.dy * ky;
    if (dt > 0){
      PLOOK.vx = lerp(PLOOK.vx, -P.dx*kx/dt, 0.30);
      PLOOK.vy = lerp(PLOOK.vy, -P.dy*ky/dt, 0.30);
    }
  } else {
    PLOOK.cx += PLOOK.vx*dt;
    PLOOK.cy += PLOOK.vy*dt;
    const k2 = Math.pow(0.015, dt);
    PLOOK.vx *= k2; PLOOK.vy *= k2;
    /* Coming up, the aim settles on the valley rather than on the sky. The plate
       framing this chapter inherits is centred at 0.44 of the painting, which is
       most of the way up the sky; magnify that by 1.66 about its own centre and the
       town, the school and the tower all fall out of the bottom of the frame, so
       raising the binoculars CROPPED AWAY everything the chapter is about. They
       come down to the valley as they come up, which is also what a person does. */
    if (!PLOOK.taken && PLOOK.lift < 0.999){
      PLOOK.cy += (SH*0.585 - PLOOK.cy) * Math.min(1, dt*0.9);
    }
    /* Nobody has touched anything for a while. Rather than putting an arrow on
       screen, the lenses wander — very slowly, and toward whatever has not been
       found — which shows that they CAN wander. The moment a hand arrives this
       never happens again. */
    PLOOK.idle += dt;
    if (!PLOOK.taken && PLOOK.idle > 4.5 && lift > 0.9){
      let tgt = null;
      for (const m of LMARK) if (m.key && !PLOOK.found[m.id]){ tgt = m; break; }
      if (tgt){
        const gx = tgt.x*SW, gy = tgt.y*SH;
        PLOOK.cx += (gx - PLOOK.cx) * Math.min(1, dt*0.16);
        PLOOK.cy += (gy - PLOOK.cy) * Math.min(1, dt*0.16);
      }
    }
  }
  // the window never leaves the painting
  PLOOK.cx = cl(PLOOK.cx, wsrc*0.5, SW - wsrc*0.5);
  PLOOK.cy = cl(PLOOK.cy, hsrc*0.5, SH - hsrc*0.5);

  /* ---- and what that clamp does to aiming ----
     Because the window cannot leave the painting, its centre can never get closer
     than half a frame to any edge of it: at working magnification the leftmost the
     centre goes is 0.21 across. The left-hand telephone pole is at 0.097 and the
     buttercups are at 0.91, so neither can EVER be put in the middle of the field,
     however hard the visitor drags — and judged on centre distance alone they were
     permanently unfindable while sitting in plain view.

     So when the window is pressed up against an edge of the painting, the point
     that counts as "what you are looking at" slides that way. Pressed to the left
     edge, you are looking at the left of the valley; there is nothing else you
     could be looking at. It is invisible, it needs no input, and it is the reason
     the poles and the flowers answer at all. */
  const roomL = PLOOK.cx - wsrc*0.5, roomR = (SW - wsrc*0.5) - PLOOK.cx;
  const roomT = PLOOK.cy - hsrc*0.5, roomB = (SH - hsrc*0.5) - PLOOK.cy;
  const push = (a, b, span) => {
    const near = Math.min(a, b);
    const lim = span*0.30;
    if (near >= lim) return 0;
    return (a < b ? -1 : 1) * (1 - near/lim) * 0.34;
  };
  const aofX = push(roomL, roomR, wsrc);
  const aofY = push(roomT, roomB, hsrc);

  // the tremor is a render offset, not a change of aim, so it never accumulates
  const trem = MIN*0.0034*(0.55 + 0.45*(1-rec));
  const tx = (Math.sin(t*0.47) + Math.sin(t*1.19)*0.42)*trem;
  const ty = (Math.cos(t*0.41) + Math.cos(t*1.07)*0.38)*trem*0.8;

  const sx = PLOOK.cx - wsrc*0.5 + tx*kx;
  const sy = PLOOK.cy - hsrc*0.5 + ty*ky;
  PLOOK.wsrc = wsrc; PLOOK.hsrc = hsrc; PLOOK.sx = sx; PLOOK.sy = sy;
  // a source fraction to a screen point, and the scale between them
  const SCX = fx => (fx*SW - sx)/wsrc * W;
  const SCY = fy => (fy*SH - sy)/hsrc * H;
  /* how wide the whole painting would be on screen at this magnification. Sizes
     given as fractions of the painting are multiplied by this to become pixels,
     so a bird stays the same size relative to the wire it is sitting on. */
  const spanX = W * (SW/wsrc);

  /* ---------------------------------------------------------- the two worlds
     The valley as it is, and the valley as it was, in one image: the clean
     painting with the hazed one over the top of it, and how much of the hazed one
     is what holding controls. The pair is framed identically, so this is a
     dissolve between two states of the same place rather than between two
     pictures. */
  const airNow = lerp(air0, air1, rec);
  const world = lookComposite(im, imh, airNow);
  const OV = 10;                                   // overscan: see the blur note
  offscreen(()=>{
    ctx.drawImage(world, sx, sy, wsrc, hsrc, -OV, -OV, W+OV*2, H+OV*2);
    /* things that are alive, drawn in here so the lens softness applies to them
       as it does to everything else */
    drawLookLife(t, dt, SCX, SCY, spanX, airNow, rec);
  });

  /* ---------------------------------------------------------- focus, as optics
     Two things are soft in this frame and they are soft for different reasons.
     The lenses are out of focus, which is the whole mechanic; and the meadow at
     your feet is four feet away from a pair of binoculars set on a valley, which
     no amount of holding will fix. One blurred copy serves both: drawn over the
     whole frame while the focus is out, and again through a bottom ramp so the
     grass never comes good.

     The overscan matters. `ctx.filter` blurs the OUTPUT of a draw, and outside
     the drawn rectangle there is transparent black, so a blur at the edge of the
     frame pulls a dark border in. Drawing ten pixels beyond every edge puts that
     border off-screen where it belongs. */
  const sharp = sm(PLOOK.focus, 0.0, 0.52);
  const soft  = 1 - sharp;
  const meadowY = SCY(0.815);
  const nearOn  = meadowY < H*1.02 ? 1 : 0;
  /* Two things are soft in this frame and they are soft for different reasons: the
     lenses are out of focus, and the meadow at your feet is four feet from a pair
     of binoculars set on a valley, which no amount of holding will fix. One blurred
     copy serves both — over the whole frame while the focus is out, and again
     through a bottom ramp so the grass never comes good.

     THE COST. This one pass was, on its own, the whole reason the chapter ran at
     twenty frames a second when the kite ran at forty: `ctx.filter="blur()"` over a
     full frame is a real gaussian, and at 1280x780 it measured 11.75 ms out of a
     50 ms frame while everything else in the chapter added up to under one. So the
     copy is built at a QUARTER of each dimension — a sixteenth of the pixels — with
     a small gaussian on top of the reduction. A downsample is itself a low-pass, so
     the two agree with each other rather than fighting, and scaling the result back
     up adds a third one for free. Radius scales with the reduction.

     And while the lenses are properly out of focus the near-ground pass is skipped
     entirely, because a blur laid over a blur is not visible and that was the exact
     state the chapter spent most of its time in. */
  const NEAR_SKIP = 0.80;
  const wantNear = nearOn && soft < NEAR_SKIP;
  const needBlur = soft > 0.012 || wantNear;
  const DIV = 4;
  if (needBlur){
    const Rb = Math.max(1.2, 0.4 + 3.6*soft, wantNear ? 2.6 : 0) / DIV;
    const qw = Math.max(2, (W/DIV)|0), qh = Math.max(2, (H/DIV)|0);
    if (LBLUR.width !== qw || LBLUR.height !== qh){ LBLUR.width = qw; LBLUR.height = qh; }
    const OV2 = Math.ceil(Rb) + 2;
    lbc.setTransform(1,0,0,1,0,0);
    lbc.globalCompositeOperation = "source-over";
    lbc.globalAlpha = 1;
    lbc.imageSmoothingQuality = "high";
    lbc.clearRect(0,0,qw,qh);
    lbc.filter = "blur(" + Rb.toFixed(2) + "px)";
    lbc.drawImage(TMP, -OV2, -OV2, qw+OV2*2, qh+OV2*2);
    lbc.filter = "none";
  }

  ctx.drawImage(TMP, 0, 0);
  if (needBlur){
    if (soft > 0.012){
      ctx.globalAlpha = soft;
      ctx.drawImage(LBLUR, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (wantNear){
      // mask the blurred copy down to the near ground and lay it back on. The pass
      // above has already had its use of it, so this can be destructive.
      const qh = LBLUR.height;
      const y0 = Math.max(-qh, meadowY/DIV), y1 = y0 + qh*0.42;
      const gr = lbc.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(1, "rgba(0,0,0,1)");
      lbc.globalCompositeOperation = "destination-in";
      lbc.fillStyle = gr;
      lbc.fillRect(0, 0, LBLUR.width, qh);
      lbc.globalCompositeOperation = "source-over";
      // ramped in so the near softness arrives with the focus rather than snapping
      ctx.globalAlpha = cl01((NEAR_SKIP - soft)/0.22);
      ctx.drawImage(LBLUR, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------------------------------------------------- colour, last
     Colour is the slowest thing to come back, because it is the slowest thing to
     come back. Out of focus the valley is nearly grey and slightly milky, the way
     a place is before you have properly remembered it. */
  if (rec < 0.985){
    const g = 1 - rec;
    ctx.save();
    ctx.globalCompositeOperation = "saturation";
    ctx.globalAlpha = g*0.46;
    ctx.fillStyle = "rgb(128,128,128)";
    ctx.fillRect(0,0,W,H);
    ctx.restore();
    ctx.fillStyle = rgba(airlight(), g*0.085);
    ctx.fillRect(0,0,W,H);
  }

  /* ---------------------------------------------------------- what you are looking at
     "Looking at" is not "the centre pixel is on it". Two things had to be right
     here and neither is obvious.

     First, SIZE. A landmark counts once it is inside the field, near the middle,
     and closer to the middle than anything else — so its own extent is subtracted
     before the distance is judged. The meadow is a third of the frame across, and
     requiring its centroid to sit on the crosshair means the visitor is looking
     straight at a hillside of buttercups and being told they are looking at
     nothing.

     Second, THE CLAMP. The window cannot leave the painting, so at working
     magnification its centre can never get within about a fifth of the frame of
     the painting's own edges — which means the left-hand telephone pole, at 0.097
     across, can never be put in the middle of the field no matter how hard you
     drag. Judging by centre alone made a prominent object permanently unfindable.
     Distance is measured in units of the field's own semi-axes instead, with a
     tolerance of 0.62 of the field, so anything comfortably inside the glass
     counts. */
  const fax = fieldAx(), fay = fieldAy();
  const aimX = W*0.5 + aofX*fax, aimY = H*FIELD.cy + aofY*fay;
  let best = null, bestD = 1e9;
  for (const m of LMARK){
    const px = SCX(m.x), py = SCY(m.y);
    m._x = px; m._y = py;
    const q = Math.hypot((px-aimX)/fax, (py-aimY)/fay);
    const own = (spanX*m.r*0.5)/fax;              // how much of the field it fills
    const d = Math.max(0, q - own);
    m._on = d < 0.62;
    if (m._on && d < bestD){ best = m; bestD = d; }
  }
  PLOOK.aim = best;

  /* Long enough is a second and three quarters of holding a focused pair of
     lenses on the thing — not a touch, not a sweep past it. */
  for (const m of LMARK){
    const k = m.id;
    /* A place that is not on the list has to be settled on, not swept past: it
       needs more focus and more time than one that is, so that its line reads as
       something the visitor found rather than something that went off. */
    if (m === best && rec > (m.key ? 0.52 : 0.64)){
      PLOOK.dwell[k] = (PLOOK.dwell[k]||0) + dt;
      const need = m.key ? 1.75 : 1.55;
      if (PLOOK.dwell[k] >= need){
        if (m.key && !PLOOK.found[k]){
          PLOOK.found[k] = true; PLOOK.n++;
          tickLookList(k);
          whisper(m.say);
          if (!FOUND["mark-"+k]){ FOUND["mark-"+k] = true; foundN++; }
        } else if (!m.key && !PLOOK.said[k]){
          PLOOK.said[k] = true;
          whisper(m.say);
          if (!FOUND["look-"+k]){ FOUND["look-"+k] = true; foundN++; curiosity += 0.22; }
        }
      }
    } else {
      PLOOK.dwell[k] = Math.max(0, (PLOOK.dwell[k]||0) - dt*0.7);
    }
  }

  /* ---------------------------------------------------------- the hints
     Light, not markers. An undiscovered landmark carries a warm bloom that is at
     its strongest when the lenses are out of focus and gone by the time they are
     sharp — a hint that retreats as it works — and the metal and glass in the
     valley throw the occasional glint, because that is what metal and glass do at
     four in the afternoon. */
  drawLookHints(t, dt, SCX, SCY, spanX, rec);

  /* dust and pollen in the air in front of the lenses */
  partRole = airNow > 0.5 ? 2 : 0.6;
  drawParticles(t, 0.10 + airNow*0.42*(1-rec*0.6), { x:W*0.30, y:H*0.26, r:H*1.15 });

  /* ---------------------------------------------------------- the field of view
     Drawn over everything, and growing from small as the binoculars come up. */
  drawField(t, lift, rec);

  /* There is no readout, and there was one. A hairline under the field that filled
     up as the focus came in: it collided with the scroll cue, and worse, it was
     telling the visitor a thing the picture in front of them was already saying
     better. The image coming clear IS the progress bar. */

  /* The valley, and then one place in it. `bed` is how loud the wider world is
     while nothing in particular is being remembered — quieter on the second visit,
     because by then there is less out there making a noise. */
  lookSound(dt, 0.95, best && best.aud, PLOOK.focus, o.bed===undefined?0.60:o.bed);
  cv.className = P.down ? "grabbing" : "grabbable";
}

/* -------------------------------------------------------------------- the field
   One oval, four passes, and every one of them is something a real pair of
   binoculars does:
     1. vignette   — light falls off toward the rim of any field of view
     2. surround   — everything outside is the inside of the eyecup
     3. chromatism — a warm ring just inside the edge and a cool one just outside,
                     which is lateral colour error, and is the single detail that
                     makes the difference between a circular crop and glass
     4. lift       — the whole field grows from small as they come up to your face

   Drawn, not loaded. The whole thing is four fills and it is exact at any size,
   which a 740-pixel flattened PNG with a checkerboard baked into it is not. */
function drawField(t, lift, rec){
  const s = lerp(0.50, 1, ease.o3(lift));
  const cx = W*0.5 + Math.sin(t*0.5)*W*0.0026;
  const cy = H*FIELD.cy + Math.cos(t*0.43)*H*0.0022;
  const ax = fieldAx()*s, ay = fieldAy()*s;
  const fe = FIELD.feather;

  // an ellipse is a scaled circle, so everything below works in circle space
  const ell = (fn) => { ctx.save(); ctx.translate(cx,cy); ctx.scale(ax/ay,1);
                        ctx.translate(-cx,-cy); fn(ay); ctx.restore(); };

  /* 1. the vignette. Barely anything until 0.62 of the way out, then a real
        falloff — and a little deeper while the lenses are out of focus, because
        an unfocused field genuinely does lose its edges first. */
  ell(R => {
    const edge = 1 - rec*0.16;
    const g = ctx.createRadialGradient(cx,cy,R*0.10, cx,cy,R*1.001);
    g.addColorStop(0,    "rgba(255,255,255,1)");
    g.addColorStop(0.62, "rgba(252,252,253,1)");
    g.addColorStop(0.86, "rgba("+Math.round(214*edge+20)+","+Math.round(218*edge+20)+","+Math.round(226*edge+20)+",1)");
    g.addColorStop(1,    "rgba("+Math.round(120*edge)+","+Math.round(128*edge)+","+Math.round(140*edge)+",1)");
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx,cy,R*1.001,0,TAU); ctx.fill();
    ctx.restore();
  });

  /* 2. the surround. Not pure black: the inside of a rubber eyecup with a valley
        in front of it is a very dark blue-grey, and pure black against a painting
        reads as a hole cut in card. The edge is feathered by laying the surround
        down twice, once hard outside the oval and once as a soft ramp across it. */
  ctx.save();
  ctx.fillStyle = "#04070b";
  ctx.beginPath();
  ctx.rect(0,0,W,H);
  ctx.ellipse(cx,cy,ax,ay,0,0,TAU);
  ctx.fill("evenodd");
  ctx.restore();
  ell(R => {
    const g = ctx.createRadialGradient(cx,cy,R*(1-fe), cx,cy,R*(1+fe*0.15));
    g.addColorStop(0, "rgba(4,7,11,0)");
    g.addColorStop(1, "rgba(4,7,11,1)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx,cy,R*(1+fe*0.15),0,TAU); ctx.fill();
  });

  /* 3. the colour at the edge of the field. Warm inside, cool just outside, both
        at a few per cent — invisible as an effect, and the reason the oval reads
        as something you are looking through. */
  ell(R => {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const g = ctx.createRadialGradient(cx,cy,R*0.86, cx,cy,R*1.0);
    g.addColorStop(0,    "rgba(255,196,132,0)");
    g.addColorStop(0.55, "rgba(255,190,124,0.052)");
    g.addColorStop(1,    "rgba(255,182,116,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,TAU); ctx.fill();
    const b = ctx.createRadialGradient(cx,cy,R*0.985, cx,cy,R*1.07);
    b.addColorStop(0,   "rgba(120,168,255,0)");
    b.addColorStop(0.4, "rgba(126,170,255,0.055)");
    b.addColorStop(1,   "rgba(120,164,255,0)");
    ctx.fillStyle = b;
    ctx.beginPath(); ctx.arc(cx,cy,R*1.07,0,TAU); ctx.fill();
    ctx.restore();
  });
}

/* ------------------------------------------------------------------ the living
   Everything here is in source-fraction space and gets whatever the window makes
   of it, so a bird on the wire is a speck at rest and a bird when you are looking
   at it. */
let lcloud = 0.12;
function drawLookLife(t, dt, SCX, SCY, spanX, air, rec){
  const alive = cl01(1 - air*0.85);            // the hazed valley is emptier

  /* a cloud shadow crossing the ridge. The one piece of weather in a still
     painting, slow enough that you notice it rather than see it happen. */
  lcloud += dt*0.0075;
  if (lcloud > 1.35) lcloud = -0.35;
  const cxx = SCX(lcloud), cyy = SCY(0.575);
  const cw = spanX*0.30, ch2 = spanX*0.052;
  if (cxx > -cw && cxx < W+cw){
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const g = ctx.createRadialGradient(cxx, cyy, 0, cxx, cyy, cw);
    const a = 0.15*(0.4+0.6*alive);
    g.addColorStop(0, "rgba(150,158,172,"+a.toFixed(3)+")");
    g.addColorStop(0.6, "rgba(186,192,204,"+(a*0.5).toFixed(3)+")");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cxx, cyy); ctx.scale(1, ch2/cw); ctx.translate(-cxx, -cyy);
    ctx.beginPath(); ctx.arc(cxx, cyy, cw, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  /* the birds on the wire */
  updLookBirds(dt, alive);
  /* Matched to the birds the painting already has on this wire, which are a lit
     grey-brown rather than a silhouette — at near-black these read as a different
     species sitting among them, and at 0.42 of the airlight they came out as mauve
     smudges. Some of the sky, a little more of it as the air loads. */
  const dark = mixL([46,48,50], airlight(), 0.22 + 0.30*air);
  for (const b of LBIRD){
    const px = SCX(b.x), py = SCY(b.y);
    if (px < -40 || px > W+40 || py < -40 || py > H+40) continue;
    if (b.st === "sit" && alive < 0.35) continue;      // later, most of them are not there
    drawLookBird(b, px, py, spanX, t, dark);
  }

  /* two butterflies over the meadow, which only exist if the meadow is in the
     frame at all — a thing to find by looking down, which nobody expects to be
     worth doing with a pair of binoculars */
  if (alive > 0.5){
    for (let i=0;i<2;i++){
      const ph = t*0.19 + i*2.7;
      const fx = 0.20 + i*0.34 + Math.sin(ph)*0.055 + Math.sin(ph*2.3)*0.014;
      const fy = 0.888 + Math.cos(ph*1.31)*0.016 + i*0.012;
      const px = SCX(fx), py = SCY(fy);
      if (px < 0 || px > W || py < 0 || py > H) continue;
      const s = Math.max(1.4, spanX*0.0055);
      const flap = Math.abs(Math.sin(t*7.5 + i));
      ctx.save();
      ctx.fillStyle = rgba([232,164,58], 0.82*alive);
      ctx.translate(px, py);
      ctx.beginPath();
      ctx.ellipse(-s*0.5*flap, 0, s*0.55*flap+0.4, s*0.72, -0.3, 0, TAU);
      ctx.ellipse( s*0.5*flap, 0, s*0.55*flap+0.4, s*0.72,  0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------------ the hints */
const LGLINT = { t: 2.4, on:null, life:0 };
function drawLookHints(t, dt, SCX, SCY, spanX, rec){
  /* the bloom. Warm, wide, weak, and inversely proportional to focus: it is
     brightest when you cannot see and gone by the time you can, which means it
     can never be mistaken for a marker sitting on top of the world. */
  const amp = (1 - rec*0.88);
  if (amp > 0.02){
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const m of LMARK){
      if (!m.key || PLOOK.found[m.id]) continue;
      const px = SCX(m.x), py = SCY(m.y);
      const R = spanX*m.r*0.85 + MIN*0.02;
      if (px < -R || px > W+R || py < -R || py > H+R) continue;
      const br = 0.5 + 0.5*Math.sin(t*0.62 + m.x*11);
      const a = 0.052*amp*(0.55 + 0.45*br);
      const g = ctx.createRadialGradient(px, py, 0, px, py, R);
      g.addColorStop(0, "rgba(255,232,186,"+a.toFixed(4)+")");
      g.addColorStop(0.45, "rgba(255,224,170,"+(a*0.42).toFixed(4)+")");
      g.addColorStop(1, "rgba(255,220,160,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, R, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* the glint. Metal and glazing catch the sun for about a third of a second and
     then stop, which is long enough to turn a head and too short to be a UI. It
     picks an unfound landmark while there is one, and after that any of them, so
     that a glint never becomes a tell. */
  LGLINT.t -= dt;
  if (LGLINT.t <= 0){
    const pool = LMARK.filter(m => m.glint && !PLOOK.found[m.id]);
    const any  = LMARK.filter(m => m.glint);
    LGLINT.on = pool.length ? pick(pool) : (any.length ? pick(any) : null);
    LGLINT.life = 1;
    LGLINT.t = pool.length ? rnd(2.6, 5.4) : rnd(7, 15);
  }
  if (LGLINT.life > 0){
    LGLINT.life = Math.max(0, LGLINT.life - dt*2.9);
    const m = LGLINT.on;
    if (m && m.glint){
      const px = SCX(m.glint.x), py = SCY(m.glint.y);
      const e = Math.sin(LGLINT.life*PI);
      const R = spanX*(m.glint.w||0.01)*(1.5 + 2.4*(1-rec));
      if (px > -R && px < W+R && py > -R && py < H+R){
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(px, py, 0, px, py, R);
        g.addColorStop(0, "rgba(255,252,238,"+(0.62*e).toFixed(3)+")");
        g.addColorStop(0.30, "rgba(255,240,206,"+(0.22*e).toFixed(3)+")");
        g.addColorStop(1, "rgba(255,236,196,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, R, 0, TAU); ctx.fill();
        // the four-point flare a lens gives a point source
        ctx.strokeStyle = "rgba(255,250,232,"+(0.30*e).toFixed(3)+")";
        ctx.lineWidth = Math.max(0.7, R*0.055);
        ctx.beginPath();
        ctx.moveTo(px-R*1.5, py); ctx.lineTo(px+R*1.5, py);
        ctx.moveTo(px, py-R*1.05); ctx.lineTo(px, py+R*1.05);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

/* ------------------------------------------------------------------ the gate */
function lookoutInteract(g, dt){
  if (g === "find"  && PLOOK.n >= 3) meetQuiet(g);
  if (g === "rfind" && PLOOK.recall > 0.75) meetQuiet(g);
}

/* ------------------------------------------------------------------ the list
   Four lines, top left, under the chapter mark. It is not a score and it does
   not congratulate anybody: the box becomes a tick, over most of a second, and
   nothing else happens. There is no sound. */
const lookEl = document.getElementById("look");
let lookBuilt = false;
function buildLookList(){
  if (lookBuilt || !lookEl) return;
  const ul = lookEl.querySelector("ul");
  let h = "";
  for (const m of LMARK){
    if (!m.key) continue;
    h += '<li data-k="'+m.id+'">' +
         '<svg viewBox="0 0 15 15" aria-hidden="true">' +
         '<rect class="bx" x="1.4" y="1.4" width="12.2" height="12.2" rx="1.7"/>' +
         '<path class="tk" d="M3.7 7.8 6.4 10.6 11.4 4.2"/></svg>' +
         '<span>'+m.tick+'</span></li>';
  }
  ul.innerHTML = h;
  lookBuilt = true;
}
function tickLookList(k){
  if (!lookEl) return;
  const li = lookEl.querySelector('li[data-k="'+k+'"]');
  if (li) li.classList.add("got");
}
function showLookList(on){
  if (!lookEl) return;
  if (on) buildLookList();
  lookEl.classList.toggle("on", !!on);
  lookEl.setAttribute("aria-hidden", String(!on));
}
