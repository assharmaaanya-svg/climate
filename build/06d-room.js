/* ============================================================================
   THE BEDROOM
   ============================================================================
   The room arrived as two paintings with holes deliberately left in them: no
   curtains, no rod, no pull cord, no birds, and a casement window instead of a
   sash. Everything that was taken out is something that has to move, so
   everything that moves is now either a sprite with its own painted pixels or
   is drawn here.

   What is in this file:

     THE ROD          drawn, because the paintings no longer have one, and the
                      curtains need something to hang from that can be lit.
     THE CASEMENT      the two plates are identical outside the window, so the
                      window can be opened by foreshortening the shut leaves
                      toward their hinges while the open painting comes through
                      behind them. The leaf swings; nothing dissolves.
     THE PULL CORD     one transparent sprite. The cord stretches, the ball does
                      not, because that is what happens when you pull a cord.
                      It hangs from the window head and swings on the draught.
     THE WIREBIRDS         one sheet, cut into seven by alpha, each bird placed on
                      the wires outside with its own clock — settling, turning,
                      shuffling along the wire. They are outside the glass, so
                      they are clipped to it, and they scatter when the window
                      opens because that is what birds do.

   The room's darkness is not a second painting. It is one lit room dimmed by
   how far the curtains are still shut, which means the light in here always
   agrees with the cloth in front of it.
   ========================================================================== */

/* the window, measured off bedroomwithnobulb…png through the plate crop
   (image y 0.045 → 0.875 maps to the frame) */
const WIN = {
  fx0: 0.350, fx1: 0.694,      // outer frame, left and right
  gx0: 0.382, gx1: 0.658,      // glass
  mull: 0.5215,                // the centre mullion
  fy0: 0.066, fy1: 0.741,      // outer frame, top and bottom (screen fractions)
  gy0: 0.108, gy1: 0.711,      // glass
  sill: 0.777,
  rodY: 0.040, rodX0: 0.296, rodX1: 0.750,
  wireY: [0.372, 0.398]        // the utility lines the birds sit on
};

/* ------------------------------------------------------------ LIGHTING SPRITES
   source-atop composites where the DESTINATION is opaque. On its own little
   buffer that means "only where the sprite is", which is what it is for. On the
   main canvas the destination is the whole opaque room, so it means "the entire
   rectangle" — and every sprite lit that way comes out as a black box with a
   toy inside it. Sprites get their own buffer, cached per size and per light
   level, and the room only ever receives the finished thing. */
const TINTED = Object.create(null);
function litSprite(img, key, w, h, dark, warm){
  const q = Math.round(dark*24) + "|" + (w|0) + "x" + (h|0) + "|" + Math.round((warm||0)*12);
  let e = TINTED[key];
  if (e && e.q === q) return e.cv;
  const cv2 = (e && e.cv) || document.createElement("canvas");
  const cw = Math.max(1, Math.ceil(w)), ch = Math.max(1, Math.ceil(h));
  if (cv2.width !== cw || cv2.height !== ch){ cv2.width = cw; cv2.height = ch; }
  const g = cv2.getContext("2d");
  g.clearRect(0,0,cw,ch);
  g.globalCompositeOperation = "source-over";
  g.drawImage(img, 0, 0, cw, ch);
  if (warm > 0){
    g.globalCompositeOperation = "multiply";
    g.fillStyle = rgba([255,196,126], warm);
    g.fillRect(0,0,cw,ch);
  }
  if (dark > 0.002){
    g.globalCompositeOperation = "source-atop";   // here it means what it says
    g.fillStyle = rgba([12,6,1], dark);
    g.fillRect(0,0,cw,ch);
  }
  g.globalCompositeOperation = "source-over";
  TINTED[key] = { q, cv: cv2 };
  return cv2;
}

/* ---------------------------------------------------------------- THE CAMERA
   drawPlate offsets every band by the pointer camera and a slow involuntary
   drift. Anything drawn on top has to take the same offset at its own depth, or
   the painted room slides under a rod, a cord and a set of curtains that are
   nailed to the glass. These are the depths things sit at:
     0.015  outside, on the wires        0.040  the wall and the window
     0.075  the cloth, nearest the room */
function roomCam(p){
  const dx0 = Math.sin(PCAM.drift*0.06)*W*0.006;
  const dy0 = Math.cos(PCAM.drift*0.045)*H*0.004;
  return { x: PCAM.x*p*W*0.36 + dx0*p*6,
           y: PCAM.y*p*H*0.22 + dy0*p*6 };
}
const CAM_WIRE = 0.015, CAM_WALL = 0.040, CAM_CLOTH = 0.075;

/* ------------------------------------------------------------------ THE ROD
   Drawn rather than painted, so it can catch the light that arrives when the
   curtains part, and so the rings can shift as the cloth gathers. */
function drawRod(t, rev, air){
  const c  = roomCam(CAM_CLOTH);
  const y  = WIN.rodY*H + c.y;
  const x0 = WIN.rodX0*W + c.x, x1 = WIN.rodX1*W + c.x;
  const r  = Math.max(2, MIN*0.0062);
  const lit = 0.22 + 0.78*rev*(1-air*0.35);      // scales the colour, not the alpha
  const K = c => [c[0]*lit, c[1]*lit, c[2]*lit];

  ctx.save();
  ctx.fillStyle = rgba([18,8,2], 0.26*(0.4+0.6*rev));
  ctx.beginPath();
  ctx.ellipse((x0+x1)/2, y + r*2.4, (x1-x0)/2, r*1.1, 0, 0, TAU);
  ctx.fill();

  // dark iron, with one warm line along the top where the window light lands
  const g = ctx.createLinearGradient(0, y-r, 0, y+r);
  g.addColorStop(0.00, rgb(K([ 96, 66, 38])));
  g.addColorStop(0.26, rgb(K([158,116, 62])));
  g.addColorStop(0.62, rgb(K([ 56, 34, 16])));
  g.addColorStop(1.00, rgb(K([ 24, 13,  5])));
  ctx.fillStyle = g;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x0, y-r, x1-x0, r*2, r);
  else ctx.rect(x0, y-r, x1-x0, r*2);
  ctx.fill();

  for (const fx of [x0, x1]){
    const fg = ctx.createRadialGradient(fx-r*0.6, y-r*0.8, r*0.1, fx, y, r*1.9);
    fg.addColorStop(0.00, rgb(K([182,136, 76])));
    fg.addColorStop(0.55, rgb(K([ 92, 60, 28])));
    fg.addColorStop(1.00, rgb(K([ 20, 11,  4])));
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(fx, y, r*1.55, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ============================================================================
   THE CASEMENT
   Both plates are the same room; only the window differs. So the shut leaves
   are squashed toward their hinges as they swing away, and the open painting is
   already behind them. The leaf itself moves — there is no crossfade until the
   last of it, by which point the two agree.
   ========================================================================== */
function drawCasement(t, dt, o){
  const open = cl01(o.open);
  const air  = cl01(o.air||0);
  if (!getPlate("roomShut")) return false;

  if (open < 0.002){ drawPlate("roomShut", { air }); return true; }
  if (open > 0.998 || !getPlate("roomOpen")){ drawPlate("roomOpen", { air }); return true; }

  // the room with its window already open, underneath
  drawPlate("roomOpen", { air });

  // the shut room, held back to the window, with the leaves swinging out of it
  offscreen(()=>{ drawPlate("roomShut", { air, drift:false }); });

  const y0 = WIN.fy0*H, y1 = WIN.fy1*H;
  const sw = ease.io(open);
  // everything but the two leaves stays exactly where it is until the very end
  const frameA = 1 - sm(open, 0.55, 0.92);
  ctx.save();
  ctx.globalAlpha = frameA;
  ctx.beginPath();
  ctx.rect(WIN.fx0*W, y0, (WIN.fx1-WIN.fx0)*W, y1-y0);
  ctx.rect(WIN.gx0*W, WIN.gy0*H, (WIN.gx1-WIN.gx0)*W, (WIN.gy1-WIN.gy0)*H);
  ctx.clip("evenodd");
  ctx.drawImage(TMP, 0, 0);
  ctx.restore();

  for (const side of [0,1]){
    // hinged at the outer frame, so the free edge is the one at the mullion
    const hinge = (side ? WIN.fx1 : WIN.fx0)*W;
    const free  = WIN.mull*W;
    const gy0 = WIN.gy0*H, gy1 = WIN.gy1*H;
    // the leaf only cracks open, so it barely turns: a small foreshortening,
    // not a door swinging back
    const k = Math.cos(sw*0.46);
    const nw = (free - hinge)*k;
    ctx.save();
    ctx.globalAlpha = 1 - sm(open, 0.58, 0.94);
    ctx.beginPath();
    ctx.rect(Math.min(hinge, hinge+nw), gy0, Math.abs(nw), gy1-gy0);
    ctx.clip();
    // scale the painted leaf about its hinge
    ctx.translate(hinge, 0);
    ctx.scale(k, 1);
    ctx.translate(-hinge, 0);
    ctx.drawImage(TMP, 0, 0);
    ctx.restore();
    // the edge of the leaf, catching the light as it turns
    const ex = hinge + nw;
    const eg = ctx.createLinearGradient(ex - (side?-1:1)*MIN*0.010, 0, ex, 0);
    eg.addColorStop(0, rgba([255,226,168], 0));
    eg.addColorStop(1, rgba([255,226,168], 0.34*Math.sin(sw*PI)));
    ctx.fillStyle = eg;
    ctx.fillRect(Math.min(ex-MIN*0.010, ex+MIN*0.010), gy0, MIN*0.020, gy1-gy0);
  }
  return true;
}

/* ============================================================================
   THE PULL CORD
   One sprite: a long cord with a turned wooden ball on the end. The cord is
   drawn stretched to whatever length it currently has; the ball is drawn at its
   own size at the end of it, because pulling a cord lengthens the cord and does
   nothing at all to the ball.
   ========================================================================== */
const CORD = {
  x: 0.5215,           // hanging in front of the mullion
  // At rest it hangs clear of the painted latch on the mullion; pulling is what
  // brings it down over the handle, which is the whole point of pulling it.
  rest: 0.226,         // where the ball sits at rest, as a fraction of H
  drop: 0.145,         // how much further it comes down when pulled
  ballW: 0.034,        // the ball, as a fraction of MIN
  splitY: 0.845,       // where the cord ends and the ball begins, in the sprite
  swing: 0, swingV: 0, grab: 0, held: 0
};
function cordSprite(){
  const im = IMG["bulb latch png transparent.png"];
  return imgReady(im) ? im : null;
}
function cordBall(){
  const ballW = MIN*CORD.ballW;
  const c = roomCam(CAM_WALL);
  const y = (CORD.rest + PROOM.sash*CORD.drop)*H + c.y;
  const x = CORD.x*W + CORD.swing*MIN*0.055 + c.x;
  return { x, y, r: ballW*0.5 };
}
function drawCord(t, dt, o){
  const im = cordSprite();
  const b  = cordBall();
  const cc2 = roomCam(CAM_WALL);
  const topY = WIN.gy0*H - MIN*0.004 + cc2.y;
  const topX = CORD.x*W + CORD.swing*MIN*0.012 + cc2.x;
  const lit = 0.34 + 0.66*cl01(o.rev);

  if (!im){
    // the sprite has not arrived; a plain cord still reads, and still works
    ctx.save();
    ctx.strokeStyle = rgba([132,94,50], 0.8*lit);
    ctx.lineWidth = Math.max(1, MIN*0.0022);
    ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(b.x, b.y - b.r); ctx.stroke();
    ctx.fillStyle = rgba([196,142,58], lit);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.restore();
    return;
  }

  /* The sprite is mostly transparent margin. Only its own pixels are used, and
     it is drawn opaque — dimming it with globalAlpha over a bright window made
     brass read as pale plastic. The light is applied afterwards, as light. */
  const ih = im.naturalHeight;
  const CX = 75, CW = 93;                          // the sprite's content columns
  const sy = CORD.splitY*ih;                       // cord above, ball below
  const ballH = ih - sy;
  const scale = (MIN*CORD.ballW) / CW;             // the ball at its proper size
  const ballDrawW = CW*scale, ballDrawH = ballH*scale;
  const cordLen = Math.max(4, (b.y - ballDrawH*0.44) - topY);
  const cordW = Math.max(1.4, ballDrawW*0.30);     // the cord is not the ball

  offscreen(()=>{
    tc.clearRect(0,0,W,H);
    // the cord, stretched down the drop and leaning with the swing
    const lean = b.x - topX;
    tc.save();
    tc.transform(1, 0, lean/Math.max(1,cordLen), 1, topX - cordW*0.5, topY);
    tc.drawImage(im, CX + CW*0.34, 0, CW*0.32, sy, 0, 0, cordW, cordLen);
    tc.restore();
    // the ball, at its own size, at the end of it
    tc.drawImage(im, CX, sy, CW, ballH,
                 b.x - ballDrawW*0.5, b.y - ballDrawH*0.44, ballDrawW, ballDrawH);
    /* The light in the room falls on it like everything else — but only on it.
       A multiply pass over a mostly empty buffer is not a no-op: multiply
       against a transparent backdrop returns the source, so it fills the whole
       frame with flat grey. source-atop keeps it to the sprite's own pixels. */
    tc.globalCompositeOperation = "source-atop";
    tc.fillStyle = rgba([12,6,2], 1-lit);
    tc.fillRect(0,0,W,H);
    tc.globalCompositeOperation = "source-over";
  });
  ctx.drawImage(TMP, 0, 0);

  // it says it can be pulled, until it has been
  if (PROOM.sash < 0.35 && !o.quiet){
    // a breath of light around it, not a drawn ring — the ball is the object,
    // the halo is only there to say it can be taken hold of
    const a = 0.20 + 0.20*(0.5-0.5*Math.cos(t*1.7));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const hg = ctx.createRadialGradient(b.x, b.y, b.r*0.8, b.x, b.y, b.r*3.0);
    hg.addColorStop(0, rgba([255,226,168], a*0.55));
    hg.addColorStop(1, rgba([255,226,168], 0));
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r*3.0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = rgba([255,240,206], a*0.8);
    ctx.lineWidth = Math.max(1.1, MIN*0.0020);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + b.r*3.3);
    ctx.lineTo(b.x - b.r*0.62, b.y + b.r*2.4);
    ctx.moveTo(b.x, b.y + b.r*3.3);
    ctx.lineTo(b.x + b.r*0.62, b.y + b.r*2.4);
    ctx.stroke();
    ctx.restore();
  }
}
function updCord(dt, t){
  // a pendulum, driven by the draught coming through the window
  const drive = Math.sin(t*1.15)*0.030 + Math.sin(t*2.7+1.1)*0.012;
  const force = drive*(0.25 + PROOM.breeze*1.5 + PROOM.sash*0.9) - CORD.swing*0.34;
  CORD.swingV = (CORD.swingV + force*dt*9) * Math.pow(0.055, dt);
  CORD.swing += CORD.swingV*dt*9;
  CORD.swing = cl(CORD.swing, -1, 1);
}
function cordInteract(g, t, dt){
  const b = cordBall();
  const near = Math.hypot(P.x-b.x, P.y-b.y) < MIN*0.085;
  if (P.down && (CORD.grab || near)){
    if (!CORD.grab){ CORD.grab = 1; cv.className="grabbing"; sfx.cloth(0.25); }
    if (P.dy > 0) PROOM.sash = cl01(PROOM.sash + P.dy/(H*0.13));
    CORD.swingV += (P.dx/W)*5.5;
    CORD.held = 1;
  } else {
    // the window's own sounds are owned by roomSound, on the crossings
    if (CORD.grab){ CORD.grab = 0; CORD.swingV -= 0.5; }
    if (near && !P.down) cv.className = "grabbable";
    if (P.tapped && near){ P.tapped=false; PROOM.sash = cl01(PROOM.sash+0.38); }
  }
  // it settles back a little if it was barely pulled, and latches once it is
  if (!CORD.grab && PROOM.sash < 0.30) PROOM.sash *= Math.pow(0.55, dt);
  if (g && PROOM.sash > 0.55) meet(g);
}

/* ============================================================================
   THE WIREBIRDS
   One sheet, seven birds, cut apart by their own alpha. Each gets a place on
   the wires, its own clock, and its own idea of what to do next. They are the
   only living things in the frame, and they are outside it.
   ========================================================================== */
const WIRE_CUT = [                       // measured off the sheet's alpha
  { x: 21, y:160, w: 64, h:89 }, { x:108, y:174, w: 68, h:69 },
  { x:184, y:193, w: 32, h:76 }, { x:225, y:201, w: 41, h:72 },
  { x:341, y:189, w: 66, h:66 }, { x:432, y:180, w: 66, h:70 },
  { x:501, y:180, w: 66, h:70 }
];
const WIREBIRDS = [];

/* A bird on a wire is almost always completely still. What makes it read as a
   bird is not continuous movement — it is long stillness broken by one movement
   that is over before you finish noticing it. Anything that eases smoothly and
   endlessly reads as a puppet, which is what these were: a slow sinusoidal bob,
   a slow squash to turn around, a slow drift along the wire.

   So every bird here does nothing at all for seconds at a time, then makes one
   sharp discrete action lasting a fifth of a second, then does nothing again.
   Turning round happens instantly, hidden inside a wing-flutter, because that
   is how it happens — a bird does not narrow to nothing and widen the other
   way. */
const BIRD_ACTS = ["flick","flick","flick","flick","shuffle","preen","ruffle","bob","bob","settle"];
function buildWireBirds(){
  WIREBIRDS.length = 0;
  const spots = [
    { u:0.075, w:0 }, { u:0.150, w:0 }, { u:0.215, w:0 }, { u:0.268, w:0 },
    { u:0.660, w:1 }, { u:0.755, w:1 }, { u:0.830, w:1 }
  ];
  for (let i=0;i<7;i++){
    const s = spots[i];
    WIREBIRDS.push({
      cut: WIRE_CUT[i],
      u: s.u, wire: s.w,
      scale: 0.62 + hash(i*5.1)*0.30,
      flip: hash(i*9.7) > 0.62 ? -1 : 1,
      act: null, actT: 0, actD: 0, dir: 1, turnAt: -1,
      wait: 0.8 + hash(i*3.3)*5.5,
      calm: 0.7 + hash(i*7.7)*0.9,
      trem: hash(i*4.9)*TAU
    });
  }
}
function updWireBirds(dt, t, o){
  const gust = cl01(o.gust||0);
  for (let i=0;i<WIREBIRDS.length;i++){
    const b = WIREBIRDS[i];
    if (b.act){
      b.actT += dt;
      if (b.actT >= b.actD){
        b.act = null;
        b.wait = (1.5 + Math.random()*6.5) / b.calm;
      }
    } else {
      b.wait -= dt * (1 + gust*2.2);        // a draught makes them restless
      if (b.wait <= 0){
        b.act = BIRD_ACTS[(Math.random()*BIRD_ACTS.length)|0];
        b.actT = 0;
        b.dir = Math.random() < 0.5 ? -1 : 1;
        b.actD = b.act==="preen"   ? 0.40 + Math.random()*0.35
               : b.act==="settle"  ? 0.55 + Math.random()*0.30
               : b.act==="shuffle" ? 0.26
               : b.act==="ruffle"  ? 0.30
               : 0.15 + Math.random()*0.07;
        if (b.act==="shuffle") b.u = cl(b.u + b.dir*0.010, 0.035, 0.935);
        b.turnAt = (b.act==="ruffle" && Math.random()<0.45) ? 0.45 : -1;
      }
    }
    b.trem += dt*(1.6 + i*0.23);
  }
}
/* The pose, in units of the bird's own height, measured from its feet. Feet are
   the pivot for everything: a bird bobbing rotates about where it grips the
   wire, and rotating about the middle of the sprite instead is exactly what
   makes a cut-out look like a cut-out. */
function birdPose(b, t){
  // never perfectly frozen, but never visibly moving either
  const p = { dx: Math.sin(b.trem*0.9)*0.006, dy: Math.sin(b.trem*1.7)*0.005,
              rot: Math.sin(b.trem*0.6)*0.006, sy:1, sx:1 };
  if (!b.act) return p;
  const k = cl01(b.actT/b.actD);
  // out fast, back slow, with a breath of anticipation before it goes
  const anti = k < 0.12 ? -ease.io(k/0.12)*0.22 : 0;
  const snap = k < 0.34 ? ease.o3((k-0.12)/0.22) : 1 - ease.io((k-0.34)/0.66);
  const m = Math.max(0, snap) + anti;
  switch (b.act){
    case "flick":   p.rot += b.dir*0.12*m; p.dx += b.dir*0.03*m; break;
    case "bob":     p.dy -= 0.10*m; p.rot += -0.07*m; break;
    case "preen":   p.rot += b.dir*0.26*m; p.dy += 0.04*m; p.sy = 1-0.09*m; break;
    case "settle":  p.sy = 1-0.07*m; p.dy += 0.03*m; p.rot += b.dir*0.03*m; break;
    case "shuffle": { const f=Math.sin(k*PI);
                      p.dx += b.dir*0.26*f; p.dy -= 0.14*f; p.rot += b.dir*0.06*f; break; }
    case "ruffle":  { const f=Math.sin(k*PI);
                      p.sy = 1+0.10*f; p.sx = 1+0.06*f; p.dy -= 0.05*f;
                      p.rot += Math.sin(k*PI*5)*0.035*f;
                      if (b.turnAt>0 && k>=b.turnAt){ b.flip = -b.flip; b.turnAt = -1; }
                      break; }
  }
  return p;
}
function drawWireBirds(t, o){
  const im = IMG["birdsonthedistanceinbedroom.png"];
  if (!imgReady(im)) return;
  const vis = cl01(o.vis);
  if (vis < 0.02) return;
  const cw = roomCam(CAM_WALL), cb = roomCam(CAM_WIRE);
  const gx0 = WIN.gx0*W + cw.x, gx1 = WIN.gx1*W + cw.x;
  const gy0 = WIN.gy0*H + cw.y, gy1 = WIN.gy1*H + cw.y;
  const bx = cb.x - cw.x, by = cb.y - cw.y;

  ctx.save();
  ctx.beginPath();
  ctx.rect(gx0, gy0, gx1-gx0, gy1-gy0);
  ctx.clip();

  for (const b of WIREBIRDS){
    const c = b.cut;
    const dw = (gx1-gx0) * 0.050 * b.scale;
    const dh = dw * (c.h/c.w);
    const ps = birdPose(b, t);
    // the feet: where it grips the wire, and the pivot for everything it does
    const fx = gx0 + (gx1-gx0)*b.u + bx + ps.dx*dw;
    const fy = WIN.wireY[b.wire]*H + cw.y + by + ps.dy*dh;

    ctx.save();
    ctx.globalAlpha = vis;
    ctx.translate(fx, fy);
    ctx.rotate(ps.rot);
    ctx.scale(b.flip*ps.sx, ps.sy);
    ctx.drawImage(im, c.x, c.y, c.w, c.h, -dw*0.5, -dh, dw, dh);
    ctx.restore();
  }
  ctx.restore();
}

/* ============================================================================
   WHAT THE ROOM SOUNDS LIKE
   Quiet, and mostly birds. They are already out there before the curtains open;
   what changes is how much is between you and them. Shut, they are faint and
   muffled through glass. Open the window and the same birds are suddenly in the
   room — nothing new arrives, the glass just stops being there.
   ========================================================================== */
const RSND = { was: 0 };
function roomSound(dt, t, rev){
  const sash = PROOM.sash;

  // the hatch, the hinge, and the sash coming to rest — each fired once, on the
  // crossing, so the window sounds like a thing being opened and not a slider
  if (RSND.was < 0.05 && sash >= 0.05) sfx.latch();
  if (RSND.was < 0.16 && sash >= 0.16) sfx.hinge();
  if (RSND.was < 0.93 && sash >= 0.93) sfx.casementRest();
  RSND.was = sash;

  /* The birds are a recording, and it runs the whole time. Opening the window
     does not start it — it takes the glass out from in front of it. */
  const open = 0.10 + 0.16*rev + 0.74*ease.o(sash);
  const vol  = 0.16 + 0.24*rev + 0.62*ease.o(sash);
  ambience(vol, open);
}

/* ------------------------------------------------------- THE DRAWING ON THE WALL
   The picture taped over the bed is the drawing the visitor is handed, years
   later, in its original state — the sky filled corner to corner with blue.
   It is on this wall from the very first frame, before anyone has been told it
   matters, so that when it is put into their hands they have already seen it. */
const TAPED = { x0:0.786, y0:0.161, x1:0.894, y1:0.313 };
function drawTapedDrawing(t, rev, air){
  if (!paperBuilt) return;
  const c = roomCam(CAM_WALL);
  // inset, so the painted tape at its corners still holds it to the wall
  const ix = (TAPED.x1-TAPED.x0)*0.055, iy = (TAPED.y1-TAPED.y0)*0.075;
  const x0 = (TAPED.x0+ix)*W + c.x, x1 = (TAPED.x1-ix)*W + c.x;
  const y0 = (TAPED.y0+iy)*H + c.y, y1 = (TAPED.y1-iy)*H + c.y;
  const cx = (x0+x1)/2, cy = (y0+y1)/2, w = x1-x0, h = y1-y0;
  const lit = 0.20 + 0.58*rev*(1-air*0.30);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t*0.5)*0.004*(0.3+PROOM.breeze*2.2));
  // the room's own light, on it — the same warm lamp everything else is under,
  // otherwise it reads as a sticker rather than a piece of paper on a wall
  ctx.drawImage(litSprite(PAPER, "paper", w, h, 1-lit, 0.52), -w/2, -h/2, w, h);
  ctx.restore();
}

/* ============================================================================
   THE TOYS
   The room is painted without them, so they are four sprites on the floor and
   the basket is a fifth. Two things make this read as objects in a room rather
   than stickers dragged over a picture:

   [1] DEPTH. The floor recedes, so a toy further back is smaller and sits
       higher in the frame. Its size comes from where it is, not from where it
       started, and it changes while it is being carried.
   [2] THE BASKET HAS AN INSIDE. The sprite is cut at its front rim: the back
       half is drawn before the toys, the front half after. A toy put in is
       behind the front wall, which is the whole difference between a thing in a
       basket and a thing on top of one.

   Nothing is asked of the visitor here and no gate waits on it. It is a thing
   to find, in a room they were going to look at anyway.
   ========================================================================== */
const TOYS = [];
const TOY_SRC = ["childrenstoyforbedroom.png","childrenstoyforbedroom2.png",
                 "childrenstoyforbedroom3.png","childrensbedroomtoy4.png"];
/* the floor, as seen: depth 0 at the far wall, 1 at the bottom of the frame */
function floorDepth(y){ return cl01((y/H - 0.72) / 0.30); }
function floorScale(y){ return 0.70 + 0.55*floorDepth(y); }

function buildToys(){
  TOYS.length = 0;
  const rest = [ {x:0.128,y:0.892}, {x:0.300,y:0.948}, {x:0.828,y:0.888}, {x:0.892,y:0.940} ];
  for (let i=0;i<TOY_SRC.length;i++){
    TOYS.push({ src:TOY_SRC[i], x:rest[i].x, y:rest[i].y,
                w:0.057 + hash(i*6.1)*0.011, rot:(hash(i*2.7)-0.5)*0.16,
                held:0, settle:0, vy:0, seen:0 });
  }
}
function toyRect(tt){
  const im = IMG[tt.src];
  if (!imgReady(im)) return null;
  const c = roomCam(CAM_CLOTH);
  const y = tt.y*H + c.y;
  const sc = floorScale(y);
  const w = tt.w*W*sc, h = w * (im.naturalHeight/im.naturalWidth);
  return { im, x: tt.x*W + c.x, y, w, h, sc };
}
function drawOneToy(tt, t, lit){
  const r = toyRect(tt);
  if (!r) return;
  ctx.save();
  ctx.translate(r.x, r.y - tt.settle);
  ctx.rotate(tt.rot + tt.held*Math.sin(t*3.1)*0.03);
  // a contact shadow, tight when it is down and spread when it is lifted
  const lift = tt.held;
  ctx.save();
  ctx.globalAlpha = (0.34 - lift*0.16)*(0.4+0.6*lit);
  ctx.fillStyle = "rgb(24,12,3)";
  ctx.beginPath();
  ctx.ellipse(0, tt.settle + r.h*0.02 + lift*r.h*0.28,
              r.w*(0.34+lift*0.16), r.h*0.075*(1+lift*0.5), 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(litSprite(r.im, tt.src, r.w, r.h, 1-lit, 0), -r.w*0.5, -r.h, r.w, r.h);
  ctx.restore();
}
/* The basket arrived as a flattened export: the transparency checkerboard its
   editor was showing is baked into the pixels, so drawn straight it is a grey
   tiled rectangle with a basket in the middle. The two checker greys are read
   off the sprite's own corner — no guessing — and every pixel that is both
   colourless and one of those two values is cut away. The basket itself is
   strongly coloured wood, so nothing of it is at risk. Done once, then cached. */
/* The basket is not here, and it is worth saying why rather than quietly
   leaving it out. basketforbedroom.png is a flattened export: the transparency
   checkerboard its editor was displaying is baked into the pixels, so drawn as
   it is, it is a grey tiled rectangle with a basket in the middle of it. It can
   be keyed out — but only by reading the sprite back off a canvas, and a
   browser refuses that for an image loaded from file://, which is how this is
   opened. So the strip works when the piece is served and silently does nothing
   when it is not, and a half-keyed basket is worse than no basket.

   Re-exported with real transparency — the way the toys and the birds already
   are — it drops straight back in: cut the sprite at its front rim, draw the
   back half before the toys and the front half after, and a toy put in is
   behind the front wall. That is the whole of it. Until then the toys are
   simply things on a floor, which can be picked up and put down. */

function toysInteract(t, dt){
  const held = TOYS.find(tt => tt.held);
  if (P.down && P.active){
    if (!held){
      // the nearest toy under the pointer, by its own drawn size
      for (let i=TOYS.length-1;i>=0;i--){
        const r = toyRect(TOYS[i]);
        if (!r) continue;
        if (Math.abs(P.x-r.x) < r.w*0.60 && P.y < r.y+r.h*0.18 && P.y > r.y-r.h*1.05){
          TOYS[i].held = 1; TOYS[i].seen = 1;
          cv.className = "grabbing"; sfx.thud();
          break;
        }
      }
    } else {
      const c = roomCam(CAM_CLOTH);
      held.x = cl((P.x - c.x)/W, 0.055, 0.945);
      held.y = cl((P.y - c.y)/H, 0.760, 0.985);
      held.rot = lerp(held.rot, cl(P.dx*0.010, -0.22, 0.22), Math.min(1, dt*6));
    }
  } else if (held){
    // set down where it was let go, with a small drop onto the boards
    held.held = 0;
    cv.className = "";
    held.rot = lerp(held.rot, (Math.random()-0.5)*0.10, 0.6);
    held.settle = Math.max(held.settle, MIN*0.010);
    held.vy = 0;
    sfx.thud();
  }
  // whatever was dropped comes to rest
  for (const tt of TOYS){
    if (tt.settle > 0.05){
      tt.vy += dt*1400;
      tt.settle -= tt.vy*dt;
      if (tt.settle <= 0){ tt.settle = 0; tt.vy = 0; }
    }
  }
  if (!P.down && !held){
    for (const tt of TOYS){
      const r = toyRect(tt);
      if (r && Math.abs(P.x-r.x) < r.w*0.60 && P.y < r.y && P.y > r.y-r.h){
        cv.className = "grabbable"; break;
      }
    }
  }
}
function drawToys(t, dt, lit){
  if (!TOYS.length) buildToys();
  // furthest back first, so one standing in front of another overlaps it
  const order = TOYS.slice().sort((a,b)=> (a.held-b.held) || (a.y-b.y));
  for (const tt of order) drawOneToy(tt, t, lit);
}

/* ============================================================================
   THE CHAPTER
   ========================================================================== */
function drawRoom(t, dt, o){
  o = o||{};
  const air = cl01(o.air===undefined?0:o.air);
  if (!getPlate("roomShut")){ ctx.fillStyle="#2b1b11"; ctx.fillRect(0,0,W,H); return; }
  if (!WIREBIRDS.length) buildWireBirds();

  if (o.forceOpen){ PROOM.cL = 1; PROOM.cR = 1; }
  PROOM.open = lerp(PROOM.open, Math.min(PROOM.cL,PROOM.cR), Math.min(1, dt*3.0));
  const rev = ease.io(cl01(PROOM.open));

  /* the room, and the window in whatever state it is in */
  drawCasement(t, dt, { open: ease.io(cl01(PROOM.sash)), air });

  /* the birds, before the curtains, because they are outside */
  /* They do not leave. A window opening across a garden makes birds look up,
     not abandon the wire, and a flock of cut-outs sliding off screen was the
     least convincing thing in the room. */
  updWireBirds(dt, t, { gust: PROOM.sash*0.8 + PROOM.breeze*0.4 });
  drawWireBirds(t, { vis: rev });

  /* the room is one room. How dark it is, is how far the curtains are still
     shut — so the light in here always agrees with the cloth in front of it. */
  curtainGeom(t, rev, air);
  const dark = 1 - rev;
  if (dark > 0.004){
    /* The dark is built in its own buffer and the opening is erased out of it
       with a soft edge. Clipping a rectangle out instead gives light with a
       straight vertical border running from the ceiling to the floor, which is
       not what a gap in a curtain does to a room. */
    const gp = curtainGap();
    const fe = W*0.028;                       // how far the light bleeds sideways
    offscreen(()=>{
      const dg = tc.createLinearGradient(0, 0, 0, H);
      const k0 = lerp(1, 0.40, dark), k1 = lerp(1, 0.29, dark);
      dg.addColorStop(0,    rgb([255*k0, 244*k0, 232*k0]));
      dg.addColorStop(0.62, rgb([255*k1, 240*k1, 230*k1]));
      dg.addColorStop(1,    rgb([255*k1*0.92, 238*k1*0.92, 232*k1*0.92]));
      tc.fillStyle = dg;
      tc.fillRect(0,0,W,H);
      if (gp.x1-gp.x0 > 1){
        tc.globalCompositeOperation = "destination-out";
        const eg = tc.createLinearGradient(gp.x0-fe, 0, gp.x1+fe, 0);
        const span = (gp.x1-gp.x0) + fe*2;
        eg.addColorStop(0, "rgba(0,0,0,0)");
        eg.addColorStop(cl01(fe/span),     "rgba(0,0,0,1)");
        eg.addColorStop(cl01(1-fe/span),   "rgba(0,0,0,1)");
        eg.addColorStop(1, "rgba(0,0,0,0)");
        tc.fillStyle = eg;
        tc.fillRect(gp.x0-fe, 0, span, H);
        tc.globalCompositeOperation = "source-over";
      }
    });
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(TMP, 0, 0);
    ctx.restore();
  }

  /* the floor: the basket, and whatever is still lying on it */
  if (rev > 0.15){
    toysInteract(t, dt);
    drawToys(t, dt, 0.24 + 0.62*rev*(1-air*0.3));
  }

  /* the drawing taped over the bed, years before it is handed over */
  drawTapedDrawing(t, rev, air);

  /* the cord hangs in the window recess — behind the cloth, in front of nothing */
  updCord(dt, t);
  if (!o.noCord) drawCord(t, dt, { rev, quiet: o.quietCord || rev < 0.55 });

  /* the rod, then the cloth on it */
  drawRod(t, rev, air);
  drawCurtains(t, dt, { air });

  /* dust in the light, once there is light. The painting already has the pool
     of it on the boards; this is only what a still image cannot hold. */
  const lit = rev*(1-air*0.55);
  if (lit>0.03){
    const cx = (WIN.gx0+WIN.gx1)*0.5*W;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const wash = ctx.createRadialGradient(cx, H*0.70, 0, cx, H*0.70, W*0.42);
    const wc = mixL([255,214,146], [238,232,214], air);
    wash.addColorStop(0.00, rgba(wc, 0.060*lit*(0.94+0.06*Math.sin(t*0.5))));
    wash.addColorStop(0.55, rgba(wc, 0.024*lit));
    wash.addColorStop(1.00, rgba(wc, 0));
    ctx.fillStyle = wash;
    ctx.fillRect(0, H*0.26, W, H*0.74);
    ctx.restore();

    ctx.save();
    offscreen2(()=>{
      partRole = lerp(0, 2.3, air);
      drawParticles(t, 0.30+lit*0.45, { x:cx, y:H*0.34, r:H*1.0 }, true);
      const beam = tc2.createRadialGradient(cx, H*0.50, 0, cx, H*0.50, W*0.30);
      beam.addColorStop(0, "rgba(255,255,255,1)");
      beam.addColorStop(0.6, "rgba(255,255,255,0.5)");
      beam.addColorStop(1, "rgba(255,255,255,0)");
      tc2.globalCompositeOperation = "destination-in";
      tc2.fillStyle = beam;
      tc2.fillRect(0,0,W,H);
      tc2.globalCompositeOperation = "source-over";
    });
    ctx.drawImage(TMP2, 0, 0);
    ctx.restore();
  }

  /* the breeze the open window lets in, and everything that answers it */
  const inflow = PROOM.sash*rev;
  PROOM.breeze = lerp(PROOM.breeze, rev*0.35 + inflow*0.65, Math.min(1, dt*0.6));
  AIR.wind = 0.26 + PROOM.breeze*0.52 + AIR.gust;
  if (PROOM.breeze>0.02) plantSway(t, PROOM.breeze);

  roomSound(dt, t, rev);

  if (!o.noHint) curtainHelp(t, dt);
}
