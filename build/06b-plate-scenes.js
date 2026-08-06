/* ============================================================================
   PLATE SCENES
   The chapters, built on the paintings.

   The pattern for every one of these: draw the plate's far bands, then the
   procedural layer that makes them live (cloth deformation, particles, insects,
   shadows, light), then the plate's near bands over the top so the foreground
   still occludes properly. The painting supplies the world; the code supplies
   the weather, the motion, and everything the visitor touches.
   ========================================================================== */

/* ---------------------------------------------------------------- THE LAUNDRY
   The washing is band 1 of the plate. Instead of letting the plate draw it, we
   skip that band and put its pixels through the cloth mesh ourselves, so the
   painted sheets billow, and part when you push into them.

   Each sheet is a column of that band. Their x-positions were measured off the
   painting: five sheets, roughly evenly spaced, the middle one widest.
*/
/* These columns tile the band edge to edge. `sheet` ones are put through the
   cloth mesh; the strips between them carry the sky and hills that show in the
   gaps, and are drawn without deformation. Tiling matters: leave a gap and the
   band behind shows through it as a bright bar. */
const WCOL = [
  { x0:-0.012, x1:0.182, sheet:0, ph:0.4 },
  { x0: 0.182, x1:0.186, sheet:-1 },
  { x0: 0.186, x1:0.356, sheet:1, ph:1.7 },
  { x0: 0.356, x1:0.374, sheet:-1 },
  { x0: 0.374, x1:0.614, sheet:2, ph:3.1 },   // the wide middle one
  { x0: 0.614, x1:0.622, sheet:-1 },
  { x0: 0.622, x1:0.794, sheet:3, ph:4.4 },
  { x0: 0.794, x1:0.812, sheet:-1 },
  { x0: 0.812, x1:1.012, sheet:4, ph:5.6 }
];
const WSHEET = WCOL.filter(c=>c.sheet>=0);
const PWASH = {
  push:[0,0,0,0,0],       // how far each sheet is currently pushed aside
  vel:[0,0,0,0,0],
  through:0,              // how many times the visitor has gone between them
  lastSide:[0,0,0,0,0],
  motherOn:0,
  progress:0              // 0..1 — walking through is what advances the air
};

function drawLaundryPlate(t, dt, o){
  o = o||{};
  const air = cl01(o.air===undefined?0:o.air);
  const which = o.mother ? "laundryMother" : "laundry";
  const pl = getPlate(which);
  if (!pl){ // assets still decoding — hold on a colour from the painting
    ctx.fillStyle = air>0.5 ? "#b9b3a2" : "#8fae7a"; ctx.fillRect(0,0,W,H);
    return;
  }
  const band = pl.def.sheetBand;

  /* ---- 1. everything behind the washing ---- */
  drawPlate(which, { air, skipBand: band });

  /* ---- 2. the air itself, between the far bands and the cloth ---- */
  const sunX = W*0.28, sunY = H*0.34;         // where the painted sun sits
  partRole = lerp(0, 2, air);
  drawParticles(t, 0.16 + air*0.72, { x:sunX, y:sunY, r:H*1.15 });
  if (LITPOP.fireflies>0.02) drawFireflies(t, LITPOP.fireflies);
  if (LITPOP.dragonflies>0.02) drawBugs(t, LITPOP.dragonflies);

  /* ---- 3. the washing, warped through cloth ---- */
  const b = pl.clean[band];
  const hb = pl.hazed ? pl.hazed[band] : null;
  const camx = PCAM.x, camy = PCAM.y;
  const w8 = AIR.wind + AIR.gust;

  for (const col of WCOL){
    const i = col.sheet;
    const ox = -b.dx + (camx*b.p*W*0.36);
    const oy = (camy*b.p*H*0.22);
    const sx = b.dx + col.x0*W, sw = (col.x1-col.x0)*W;
    const sy = 0, sh2 = b.h;

    /* a strip between two sheets: sky and hills, no cloth, no deformation */
    if (i < 0){
      const bl = 2.5;                       // overlap into both neighbours
      ctx.drawImage(b.cv, sx-bl, sy, sw+bl*2, sh2, ox+sx-bl, b.y+oy, sw+bl*2, sh2);
      if (air>0.004 && hb){
        ctx.save(); ctx.globalAlpha=air;
        ctx.drawImage(hb.cv, sx-bl, sy, sw+bl*2, sh2, ox+sx-bl, b.y+oy, sw+bl*2, sh2);
        ctx.restore();
      }
      continue;
    }
    const sh = { ph: col.ph, x0: col.x0, x1: col.x1 };
    const EX = 4;                            // outward bleed, in pixels

    // pointer pressure on this sheet
    const cx = ox + b.dx + (sh.x0+sh.x1)*0.5*W;
    const near = P.active ? cl01(1 - Math.abs(P.x-cx)/(sw*0.85)) : 0;
    const inRows = P.active && P.y > b.y+oy && P.y < b.y+oy+sh2;
    const want = (P.down && inRows) ? near*1.0 : near*0.34*(inRows?1:0);
    PWASH.vel[i] += (want - PWASH.push[i])*dt*9;
    PWASH.vel[i] *= 0.86;
    PWASH.push[i] = cl(PWASH.push[i] + PWASH.vel[i]*dt*7, -0.4, 1.4);
    // neighbours feel it too — a secondary reaction, not an animation
    if (i>0) PWASH.vel[i-1] -= PWASH.vel[i]*0.14;
    if (i<WSHEET.length-1) PWASH.vel[i+1] -= PWASH.vel[i]*0.14;

    const dir = (P.active && P.x > cx) ? -1 : 1;
    const pushAmt = PWASH.push[i];

    /* the deformation. u across the sheet, v down it. */
    const deform = (u,v)=>{
      // hanging from the line: the top edge barely moves, the hem swings
      const swing = Math.sin(t*1.25 + sh.ph + u*1.3)*W*0.011*w8;
      const flap  = Math.sin(t*2.4 + sh.ph*1.7 + u*3.1)*W*0.004*w8;
      // the push: a bulge that grows downward and sideways
      const bell2 = Math.sin(u*PI);
      const px2 = dir*pushAmt*sw*0.30*bell2*(0.25+0.75*v);
      // the cloth lifts as it is pushed aside
      const py2 = -Math.abs(pushAmt)*sh2*0.055*bell2*v;
      return {
        x: ox + sx - EX + u*(sw+EX*2) + (swing+flap)*v*v + px2,
        y: b.y + oy + v*sh2 + py2 + Math.abs(swing)*0.16*v*v
      };
    };
    // the painted pixels, deformed, sampled a little wider than the column
    warpImage(b.cv, sx-EX, sy, sw+EX*2, sh2, deform, LOW?7:11, LOW?6:9);
    // and the polluted twin over it
    if (air>0.004 && hb){
      ctx.save(); ctx.globalAlpha = air;
      warpImage(hb.cv, sx-EX, sy, sw+EX*2, sh2, deform, LOW?7:11, LOW?6:9);
      ctx.restore();
    }

    /* No procedural backlight here. The paintings already carry it, and adding
       an additive gradient clipped to the sheet quad reads as a bright rectangle
       over the cloth. The global bloom pass supplies the spill instead. */
    /* Her shadow is only drawn when the plate does not already contain her.
       The painted version is better than anything procedural, so it is used for
       the states the paintings cover; the procedural one exists for the beats
       where she has to move or leave. */
    if (o.paintedMother!==true && o.mother && i===2 && PWASH.motherOn>0.02){
      const c0 = deform(0.5, 1.0);
      shadowOnCloth({
        x: c0.x, y: c0.y, s: sh2*0.86, t,
        a: PWASH.motherOn*0.72*(1-air*0.45),
        reach: 0.62+0.30*Math.abs(Math.sin(t*0.42)),
        col: [128,104,92],
        clip: ()=>{
          ctx.beginPath();
          for (let k=0;k<=8;k++){ const p2=deform(k/8,0); k?ctx.lineTo(p2.x,p2.y):ctx.moveTo(p2.x,p2.y); }
          for (let k=8;k>=0;k--){ const p2=deform(k/8,1); ctx.lineTo(p2.x,p2.y); }
          ctx.closePath(); ctx.clip();
        }
      });
    }

    /* the pegs, which wobble when the sheet is disturbed */
    for (const u of [0.06, 0.94]){
      const p2 = deform(u, 0);
      const wob = PWASH.vel[i]*0.5;
      ctx.save();
      ctx.translate(p2.x, p2.y - H*0.006);
      ctx.rotate(cl(wob,-0.5,0.5) + Math.sin(t*1.6+sh.ph)*0.05*w8);
      const pw2 = Math.max(2, W*0.0030), ph3 = H*0.016;
      ctx.fillStyle = rgba(mixL([158,126,88], hazeTint(), air*0.6), 0.95);
      ctx.fillRect(-pw2/2, -ph3*0.35, pw2, ph3);
      ctx.fillStyle = rgba([96,74,52], 0.55);
      ctx.fillRect(-pw2/2, -ph3*0.35, pw2*0.36, ph3);
      ctx.restore();
    }

    /* going between them: the crossing is what advances the air */
    if (P.active && inRows){
      const side = P.x < cx ? -1 : 1;
      if (PWASH.lastSide[i]!==0 && PWASH.lastSide[i]!==side){
        PWASH.through++;
        PWASH.progress = Math.min(1, PWASH.progress + 0.14);
        sfx.cloth(0.95);
        ripple(cx, P.y, [255,252,238], MIN*0.11);
      }
      PWASH.lastSide[i] = side;
    } else if (P.active && Math.abs(P.x-cx) > sw) PWASH.lastSide[i] = 0;
  }

  /* ---- 4. the near bands, so the meadow still occludes the hems ---- */
  for (let i=band+1;i<pl.clean.length;i++){
    const nb = pl.clean[i];
    const ox = -nb.dx + (camx*nb.p*W*0.36);
    const oy = (camy*nb.p*H*0.22);
    ctx.drawImage(nb.cv, ox, nb.y+oy);
    if (air>0.004 && pl.hazed && pl.hazed[i] && pl.def.dissolve==="full"){
      ctx.save(); ctx.globalAlpha=air; ctx.drawImage(pl.hazed[i].cv, ox, nb.y+oy); ctx.restore();
    }
  }
  if (air>0.01 && pl.def.dissolve==="sky") relight(air, pl, camx, camy, 0, 0, 1, band);

  /* ---- 5. what belongs in front of everything ---- */
  drawLeaves();
  if (o.flare!==false) flare(sunX, sunY, (0.42-air*0.22));
}

/* ---------------------------------------------------------------- FIREFLIES
   Environmental only, never interactive, per the brief. They arrive at dusk and
   later they are simply not there.
*/
const FLIES = [];
function buildFireflies(){
  FLIES.length=0;
  for (let i=0;i<(LOW?26:60);i++)
    FLIES.push({ x:rnd(0,1), y:rnd(0.62,1.02), tx:rnd(0,1), ty:rnd(0.62,1.02),
                 ph:rnd(0,TAU), rate:rnd(0.5,1.5), on:0, sp:rnd(0.5,1.3) });
}
function updFireflies(dt, t){
  for (const f of FLIES){
    if (Math.hypot(f.tx-f.x, f.ty-f.y) < 0.02){
      f.tx = cl01(f.x + rnd(-0.14,0.14));
      f.ty = cl(f.y + rnd(-0.09,0.09), 0.60, 1.04);
    }
    const a = Math.atan2(f.ty-f.y, f.tx-f.x);
    f.x += Math.cos(a)*0.035*dt*f.sp;
    f.y += Math.sin(a)*0.035*dt*f.sp;
    // the pulse: on for a moment, then a long dark gap. Never a steady blink.
    const cyc = (t*f.rate + f.ph) % 4.4;
    f.on = cyc < 0.55 ? Math.sin(cyc/0.55*PI) : 0;
  }
}
function drawFireflies(t, amount){
  if (amount<0.02) return;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  for (const f of FLIES){
    if (f.on<=0.01) continue;
    const x = f.x*W, y = f.y*H;
    const a = f.on*amount;
    const r = MIN*0.010;
    const g2 = ctx.createRadialGradient(x,y,0,x,y,r);
    g2.addColorStop(0, rgba([214,255,170], a*0.85));
    g2.addColorStop(0.3, rgba([176,232,120], a*0.34));
    g2.addColorStop(1, rgba([140,200,90], 0));
    ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
    ctx.fillStyle=rgba([240,255,210], a);
    ctx.beginPath(); ctx.arc(x,y,MIN*0.0013,0,TAU); ctx.fill();
  }
  ctx.restore();
}

/* the living population for the current light — set per beat by the director */
const LITPOP = { birds:1, butterflies:1, dragonflies:0.6, fireflies:0, seeds:0.7 };
function setPop(p){ for (const k in p) LITPOP[k] = p[k]; }

/* ============================================================================
   THE BEDROOM
   Two plates: curtains closed, and curtains open. Parting them is a real
   deformation of the painted curtain columns plus a dissolve to the open plate,
   so the reveal is the painting itself opening rather than a fade between two
   pictures. The final chapter uses the same open plate against its polluted twin
   — measured at 0.947 alignment, so the room stays exactly the room and only the
   view outside it dies. That contrast is the whole argument of the piece.
   ========================================================================== */
function drawBedroomPlate(t, dt, o){
  o = o||{};
  const air = cl01(o.air===undefined?0:o.air);
  if (!getPlate("bedroomOpen")){ ctx.fillStyle="#2b1b11"; ctx.fillRect(0,0,W,H); return; }

  if (o.forceOpen){ PROOM.cL = 1; PROOM.cR = 1; }
  PROOM.open = lerp(PROOM.open, Math.min(PROOM.cL,PROOM.cR), Math.min(1, dt*3.0));
  const rev = ease.io(cl01(PROOM.open));

  /* the room with the light already in it, and the window with the world in it */
  drawPlate("bedroomOpen", { air });

  /* the same room before any of that, laid over the top, with a hole in it
     exactly the size of the opening the curtains have actually made. Nothing
     crossfades through the window: the light arrives through the gap or not at
     all, and the rest of the room comes up as the whole plate lets go. */
  curtainGeom(t, rev, air);
  if (rev < 0.995 && getPlate("bedroomClosed")){
    const gp = curtainGap();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,W,H);
    if (gp.x1-gp.x0 > 1) ctx.rect(gp.x0, gp.y0, gp.x1-gp.x0, gp.y1-gp.y0);
    ctx.clip("evenodd");
    drawPlate("bedroomClosed", { a: 1-rev*rev*0.55-rev*0.45 });
    ctx.restore();
  }

  /* the cloth itself */
  drawCurtains(t, dt, { air });

  /* ---- what the light does once it is in the room ----
     The painting already has the pool of light on the boards, painted better
     than any quad of mine. All that is added here is what a still image cannot
     carry: the dust turning over in the beam, and the beam very slightly
     breathing. Anything with a straight edge was stamping rectangles on the rug
     and has been taken out. */
  const lit = rev*(1-air*0.55);
  if (lit>0.03){
    const wx0 = W*0.415, wx1 = W*0.683;
    const cx = (wx0+wx1)*0.5;
    // a soft, edgeless warm lift where the light lands, keyed to the painting
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const wash = ctx.createRadialGradient(cx, H*0.72, 0, cx, H*0.72, W*0.44);
    const wc = mixL([255,214,146], [238,232,214], air);
    wash.addColorStop(0.00, rgba(wc, 0.070*lit*(0.94+0.06*Math.sin(t*0.5))));
    wash.addColorStop(0.55, rgba(wc, 0.028*lit));
    wash.addColorStop(1.00, rgba(wc, 0));
    ctx.fillStyle = wash;
    ctx.fillRect(0, H*0.30, W, H*0.70);
    ctx.restore();

    // dust turning over in the beam, faded out at every edge so the shaft has
    // no boundary of its own
    ctx.save();
    offscreen2(()=>{
      partRole = lerp(0, 2.3, air);
      drawParticles(t, 0.30+lit*0.45, { x:cx, y:H*0.34, r:H*1.0 }, true);
      // the mask has to be built on the surface it is used on
      const beam = tc2.createRadialGradient(cx, H*0.52, 0, cx, H*0.52, W*0.30);
      beam.addColorStop(0, "rgba(255,255,255,1)");
      beam.addColorStop(0.6, "rgba(255,255,255,0.55)");
      beam.addColorStop(1, "rgba(255,255,255,0)");
      tc2.globalCompositeOperation = "destination-in";
      tc2.fillStyle = beam;
      tc2.fillRect(0,0,W,H);
      tc2.globalCompositeOperation = "source-over";
    });
    ctx.drawImage(TMP2, 0, 0);
    ctx.restore();
  }
  PROOM.breeze = lerp(PROOM.breeze, rev*(1-air*0.5), 0.02);
  AIR.wind = 0.26 + PROOM.breeze*0.42 + AIR.gust;

  /* ---- the plant answers the breeze, because everything should ---- */
  if (PROOM.breeze>0.02) plantSway(t, PROOM.breeze);

  /* ---- and the curtains say, unmistakably, that they can be pulled ---- */
  if (!o.noHint) curtainHelp(t, dt);
}

/* the potted plant in the painting, given some life */
function plantSway(t, amt){
  const px2 = W*0.795, py2 = H*0.545;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const g = ctx.createRadialGradient(px2,py2,0,px2,py2,MIN*0.16);
  g.addColorStop(0, rgba([180,220,140], 0.03*amt*(0.6+0.4*Math.sin(t*1.2))));
  g.addColorStop(1, rgba([180,220,140], 0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px2,py2,MIN*0.16,0,TAU); ctx.fill();
  ctx.restore();
}

/* ============================================================================
   THE STARS
   The plate carries the sky, the ground and the Milky Way. The named stars are
   drawn over it, because they have to be touchable — and because in the polluted
   chapter they simply are not there, which only works if the code owns them.

   Nothing announces their absence. The visitor traced this shape once; later they
   reach for it and most of it has gone.
   ========================================================================== */
const DIPPER = [
  { id:"dubhe",  x:0.315, y:0.245, b:0.86, name:null },
  { id:"merak",  x:0.330, y:0.352, b:0.80, name:null },
  { id:"phecda", x:0.437, y:0.392, b:0.76, name:null },
  { id:"megrez", x:0.432, y:0.300, b:0.44, name:"Megrez" },
  { id:"alioth", x:0.531, y:0.262, b:0.88, name:null },
  { id:"mizar",  x:0.628, y:0.243, b:0.82, name:"Mizar & Alcor", double:true },
  { id:"alkaid", x:0.722, y:0.276, b:0.90, name:"Alkaid" }
];
const OUTLIERS = [
  { id:"polaris",  x:0.140, y:0.120, b:0.84, name:"Polaris" },
  { id:"alrischa", x:0.812, y:0.560, b:0.52, name:"Alrischa" }
];
/* bowl, then handle */
const DIP_LINKS = [[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]];

const STARY = {
  lit:Object.create(null),        // id -> true once traced
  told:Object.create(null),       // id -> true once its story has been read
  hover:null,
  pan:0, panV:0,
  wish:0, shoot:null, shootT:7,
  story:null, storyT:0
};
/* Each is one to three sentences: what people did with it, and what it costs to
   lose it. Never an astronomy lesson. */
const STAR_STORY = {
  "mizar":    "For centuries, people used these two stars as a test of their eyesight. Seeing both meant your eyes were sharp enough to travel safely at night. Today, millions of people couldn't see either, even with perfect vision.",
  "alkaid":   "The last star in the handle of the Big Dipper. Travellers and sailors learned to find it long before maps fit in a pocket. It helped people find their way home.",
  "megrez":   "The faintest star of the Big Dipper. It was often the first to disappear when the sky became hazy. Many people never noticed it was gone.",
  "alrischa": "Its name means “the cord.” For thousands of years, people imagined it tying two fish together across the sky. Every culture looked up and found different stories in the same stars.",
  "polaris":  "For over a thousand years, Polaris guided travellers, sailors and explorers across deserts and oceans. It stayed almost perfectly still while the rest of the sky turned around it."
};

/* how faint a star can be and still show, given the air and the town's light */
function starFloorP(air, glow){ return 0.06 + air*0.52 + glow*0.30; }
function starSeen(s, air, glow){ return s.b > starFloorP(air, glow); }

function starScreen(s){
  return { x: AP.x + ((s.x + STARY.pan)%1)*AP.w, y: AP.y + s.y*AP.h*0.92 };
}

function drawStarsPlate(t, dt, o){
  o = o||{};
  const air = cl01(o.air===undefined?0:o.air);
  const glow = o.glow===undefined?0.06:o.glow;
  const which = air>0.5 ? "starsHazed" : "stars";
  const pl = getPlate(which);
  if (!pl){ ctx.fillStyle="#0a1024"; ctx.fillRect(0,0,W,H); return; }

  /* the painted sky, panning slowly with the drag */
  drawPlate(which, { air:0, camx: STARY.pan*2.4 });

  /* the named stars, over the painting */
  const floor = starFloorP(air, glow);
  const all = DIPPER.concat(OUTLIERS);
  ctx.save();
  // the traced lines first, behind the stars
  ctx.lineCap="round";
  for (const [a,b2] of DIP_LINKS){
    const sa = DIPPER[a], sb = DIPPER[b2];
    if (!STARY.lit[sa.id] || !STARY.lit[sb.id]) continue;
    if (!starSeen(sa,air,glow) || !starSeen(sb,air,glow)) continue;
    const pa = starScreen(sa), pb = starScreen(sb);
    ctx.strokeStyle = rgba([200,220,255], 0.30*(1-air*0.6));
    ctx.lineWidth = Math.max(1, MIN*0.0013);
    ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();
  }
  // a dashed hint of where the shape used to close, once some of it is missing
  let missing = 0;
  for (const s of DIPPER) if (!starSeen(s,air,glow)) missing++;
  if (missing>0 && Object.keys(STARY.lit).length>1){
    ctx.setLineDash([2, 8]);
    ctx.strokeStyle = rgba([150,168,206], 0.16);
    ctx.lineWidth = 1;
    for (const [a,b2] of DIP_LINKS){
      const sa=DIPPER[a], sb=DIPPER[b2];
      if (starSeen(sa,air,glow) && starSeen(sb,air,glow)) continue;
      const pa=starScreen(sa), pb=starScreen(sb);
      ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  STARY.hover = null;
  for (const s of all){
    if (!starSeen(s, air, glow)) continue;
    const p = starScreen(s);
    if (p.x < AP.x-20 || p.x > AP.x+AP.w+20) continue;
    const above = cl01((s.b-floor)*3.2);
    const tw = 0.68 + 0.32*Math.sin(t*(1.3+s.b*2.2) + s.x*30);
    const a = above*tw;
    const r = MIN*(0.0016 + s.b*0.0026);
    const lit2 = !!STARY.lit[s.id];
    const near = P.active && Math.hypot(P.x-p.x, P.y-p.y) < MIN*0.05;
    if (near && s.name) STARY.hover = s;

    // a touchable star wears a ring, so nobody has to be told it is touchable
    if (s.name && !STARY.told[s.id]){
      const pulse = 0.5+0.5*Math.sin(t*1.5 + s.x*20);
      ctx.strokeStyle = rgba([190,214,255], (near?0.55:0.16+0.10*pulse)*(1-air*0.4));
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, MIN*(near?0.030:0.022+0.003*pulse), 0, TAU); ctx.stroke();
    }
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    const g2 = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*(lit2?13:8));
    g2.addColorStop(0, rgba(lit2?[255,232,178]:[226,238,255], a*0.5));
    g2.addColorStop(1, rgba([200,220,255], 0));
    ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(p.x,p.y,r*(lit2?13:8),0,TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = rgba(lit2?[255,240,200]:[240,246,255], a);
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.fill();
    // Mizar has Alcor beside it, which is the whole point of Mizar
    if (s.double && air<0.42){
      ctx.fillStyle = rgba([228,238,255], a*0.72);
      ctx.beginPath(); ctx.arc(p.x+MIN*0.0115, p.y-MIN*0.0062, r*0.56, 0, TAU); ctx.fill();
    }
    s._p = p;
  }
  ctx.restore();

  /* a meteor, catchable */
  STARY.shootT -= dt;
  if (!STARY.shoot && STARY.shootT<=0 && air<0.55){
    STARY.shoot = { x:rnd(W*0.2,W*0.85), y:rnd(H*0.10,H*0.40), vx:rnd(-8,-4), vy:rnd(2.2,4.2), life:1 };
    cc("a meteor");
  }
  if (STARY.shoot){
    const sh=STARY.shoot;
    sh.x+=sh.vx*dt*60; sh.y+=sh.vy*dt*60; sh.life-=dt*0.8;
    ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.lineCap="round";
    const g3=ctx.createLinearGradient(sh.x,sh.y, sh.x-sh.vx*24, sh.y-sh.vy*24);
    g3.addColorStop(0,rgba([255,255,246],sh.life)); g3.addColorStop(1,rgba([255,255,246],0));
    ctx.strokeStyle=g3; ctx.lineWidth=Math.max(1.4,MIN*0.0028);
    ctx.beginPath(); ctx.moveTo(sh.x,sh.y); ctx.lineTo(sh.x-sh.vx*24, sh.y-sh.vy*24); ctx.stroke();
    ctx.restore();
    if (sh.life<=0){ STARY.shoot=null; STARY.shootT=rnd(10,22); }
  }

  /* fireflies in the meadow, until the light they belong to has gone */
  if (LITPOP.fireflies>0.02) drawFireflies(t, LITPOP.fireflies);

  /* the cursor says what is possible without a sentence telling you */
  cv.className = STARY.hover ? "grabbable" : (P.down ? "grabbing" : "grabbable");
}

function starsInteractP(g, dt, o){
  o=o||{};
  const air = o.air||0, glow = o.glow||0.06;
  if (P.down && P.active && P.drag>6){
    STARY.panV += (-P.dx/W)*0.55;
  }
  STARY.panV *= 0.93;
  STARY.pan = (STARY.pan + STARY.panV*dt*7 + 1)%1;
  if (STARY.storyT>0){ STARY.storyT -= dt; if (STARY.storyT<=0) hideStarStory(); }

  let lit=0, seen=0;
  for (const s of DIPPER){ if (STARY.lit[s.id]) lit++; if (starSeen(s,air,glow)) seen++; }
  if (g && seen>0 && lit>=seen) meet(g);
}
function tapStarP(x,y,air,glow){
  const all = DIPPER.concat(OUTLIERS);
  let best=null, bd=MIN*0.055;
  for (const s of all){
    if (!starSeen(s,air,glow) || !s._p) continue;
    const d = Math.hypot(s._p.x-x, s._p.y-y);
    if (d<bd){ bd=d; best=s; }
  }
  if (best){
    if (!STARY.lit[best.id]){
      STARY.lit[best.id]=true;
      sfx.chime(pick([784,880,988,1175,1319]));
      ripple(best._p.x, best._p.y, [255,236,186], MIN*0.07);
    }
    if (best.name && STAR_STORY[best.id]){
      showStarStory(best.name, STAR_STORY[best.id]);
      if (!STARY.told[best.id]){ STARY.told[best.id]=true; if(!FOUND["star-"+best.id]){FOUND["star-"+best.id]=true; foundN++;} }
    }
    return true;
  }
  if (STARY.shoot && Math.hypot(STARY.shoot.x-x, STARY.shoot.y-y) < MIN*0.14){
    STARY.wish=1; STARY.shoot=null; STARY.shootT=rnd(9,18);
    sfx.wish(); whisper("You always wished for the same thing, and never told anyone.");
    return true;
  }
  return false;
}

/* the story panel — quiet, and it holds long enough to be read */
const stEl = document.createElement("div");
stEl.id="starstory";
stEl.setAttribute("aria-live","polite");
stEl.style.cssText = "position:fixed;left:50%;bottom:8vh;transform:translate(-50%,10px);z-index:8;"+
  "width:min(88vw,34rem);opacity:0;transition:opacity 1.1s,transform 1.1s;pointer-events:none;"+
  "background:rgba(8,12,26,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);"+
  "border:1px solid rgba(190,214,255,.18);border-radius:14px;padding:1.05rem 1.25rem;"+
  "box-shadow:0 24px 70px rgba(0,0,0,.45);";
stEl.innerHTML = '<div class="nm"></div><p class="bd"></p>';
document.body.appendChild(stEl);
{
  const st = document.createElement("style");
  st.textContent = "#starstory .nm{font-family:var(--mono);font-size:.6rem;letter-spacing:.24em;"+
    "text-transform:uppercase;color:#cfe0ff;opacity:.72;margin-bottom:.5rem}"+
    "#starstory .bd{margin:0;font-size:clamp(.88rem,2.5vw,1.0rem);line-height:1.62;color:#eef4ff;opacity:.95}";
  document.head.appendChild(st);
}
function showStarStory(name, body){
  stEl.querySelector(".nm").textContent = name;
  stEl.querySelector(".bd").textContent = body;
  stEl.style.opacity="1"; stEl.style.transform="translate(-50%,0)";
  STARY.storyT = 11;
}
function hideStarStory(){
  stEl.style.opacity="0"; stEl.style.transform="translate(-50%,10px)";
}

/* ============================================================================
   THE HORIZON, AND THE BINOCULARS THAT REMEMBER
   Outside the lenses: the hazed plate. Inside: the clean one, but it does not
   simply appear. Holding still lets it come back — visibility first, then
   colour, then the air itself — and it blooms outward from where you are
   looking. Move, and it starts to go again. It should feel like the world
   remembering, not like a filter being switched off.
   ========================================================================== */
const PLOOK = {
  ax:0, ay:0, vx:0, vy:0,          // aim, with inertia
  hold:0, recall:0, radius:0, mag:1,
  found:Object.create(null), n:0
};
/* The four things worth finding, measured off viewoftown.png. The plate is
   cropped to the top 88% of the source, so a source y becomes y/0.88 on screen.
   Each says one plain thing when you land on it — no explanation, no fact. */
const PMARK = [
  { id:"hills",  x:0.450, y:0.653, r:0.30,
    label:"The far hills. On a clear day, every one of them." },
  { id:"school", x:0.424, y:0.790, r:0.13,
    label:"Your school. The red brick one, with the little tower on top." },
  { id:"tower",  x:0.675, y:0.722, r:0.11,
    label:"The water tower. You could see it from anywhere in town." },
  { id:"wires",  x:0.262, y:0.563, r:0.16,
    label:"The birds on the wire. There were always more than you could count." }
];

/* The binocular graphic is the supplied asset: a black field with two soft
   white circles and a reticle. It is opaque, so it is used as a multiply
   overlay — white passes the world through, black masks it out. No procedural
   barrel, no rim, no flare. The asset plus black around it, and nothing else.

   The eyepieces stay where they are, as they would if you were holding them to
   your face, and the world moves behind them. Magnification comes up slowly, so
   there is time to understand what you are looking at.
*/
const BINOC = { file:"binoculras png.avif", lensL:0.335, lensR:0.665, cy:0.500, r:0.212,
                mask:null, built:false };

/* The supplied file is a flattened export of a transparent PNG displayed on a
   transparency checkerboard — that grey checker is baked into its pixels, so it
   cannot be multiplied over the world as it stands. So the geometry is taken
   from the file itself and the checker is removed: threshold the luminance to
   separate the black surround from the open circles, blur the result to give the
   edges their softness back, then redraw the reticle crisply on top. The design
   is the asset's; only the checkerboard is discarded. */
function buildBinocMask(){
  if (BINOC.built) return BINOC.mask;
  const im = loadImg(BINOC.file);
  if (!imgReady(im)) return null;
  const iw = im.naturalWidth, ih = im.naturalHeight;

  const a = document.createElement("canvas"); a.width=iw; a.height=ih;
  const ag = a.getContext("2d", { willReadFrequently:true });
  ag.drawImage(im, 0, 0);
  const d = ag.getImageData(0,0,iw,ih).data;
  // the surround reads near 0; the checker squares read 179 and 255. Anything
  // above this is open sky as far as the mask is concerned.
  const THRESH = 90;
  const out = ag.createImageData(iw, ih);
  const o = out.data;
  for (let i=0;i<d.length;i+=4){
    const l = 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
    const v = l > THRESH ? 255 : 0;
    o[i]=o[i+1]=o[i+2]=v; o[i+3]=255;
  }
  /* The asset's own reticle is dark, so thresholding turns it into mask and it
     survives as a second set of brackets. A short dilation of the open area
     closes those thin lines while barely touching the circle edges, and then the
     reticle is drawn once, crisply, below. Separable, so it stays cheap. */
  const RAD = Math.max(2, Math.round(iw*0.010));
  const lin = new Uint8Array(iw*ih);
  for (let i=0,p2=0;i<lin.length;i++,p2+=4) lin[i] = o[p2];
  const tmpRow = new Uint8Array(iw*ih);
  for (let y=0;y<ih;y++){
    const row = y*iw;
    for (let x=0;x<iw;x++){
      let m=0;
      const x0=Math.max(0,x-RAD), x1=Math.min(iw-1,x+RAD);
      for (let k=x0;k<=x1;k++){ const v=lin[row+k]; if(v>m) m=v; }
      tmpRow[row+x]=m;
    }
  }
  for (let x=0;x<iw;x++){
    for (let y=0;y<ih;y++){
      let m=0;
      const y0=Math.max(0,y-RAD), y1=Math.min(ih-1,y+RAD);
      for (let k=y0;k<=y1;k++){ const v=tmpRow[k*iw+x]; if(v>m) m=v; }
      const i4=(y*iw+x)*4; o[i4]=o[i4+1]=o[i4+2]=m;
    }
  }
  ag.putImageData(out, 0, 0);

  // blur it into a soft-edged vignette. No second hard pass: multiplying the
  // crisp version back over the blur is what made the rim stair-step.
  const b = document.createElement("canvas"); b.width=iw; b.height=ih;
  const bg = b.getContext("2d");
  bg.fillStyle="#000"; bg.fillRect(0,0,iw,ih);
  bg.filter = "blur(" + Math.max(2.5, iw*0.009) + "px)";
  bg.drawImage(a, 0, 0);
  bg.filter = "none";

  // the reticle: corner brackets in each eyepiece and a centre crosshair,
  // matching the asset's own layout
  const lx = iw*BINOC.lensL, rx = iw*BINOC.lensR, cy2 = ih*BINOC.cy;
  const R = iw*BINOC.r;
  bg.strokeStyle = "#1a1a1a";
  bg.lineWidth = Math.max(1.5, iw*0.0034);
  bg.lineCap = "butt";
  for (const cx2 of [lx, rx]){
    const k = R*0.52, len = R*0.20;
    for (const sx of [-1,1]) for (const sy of [-1,1]){
      bg.beginPath();
      bg.moveTo(cx2+sx*k, cy2+sy*k - sy*len);
      bg.lineTo(cx2+sx*k, cy2+sy*k);
      bg.lineTo(cx2+sx*k - sx*len, cy2+sy*k);
      bg.stroke();
    }
  }
  // the crosshair sits across the join between the two circles
  const mid = (lx+rx)/2;
  bg.beginPath();
  bg.moveTo(mid - R*0.62, cy2); bg.lineTo(mid - R*0.10, cy2);
  bg.moveTo(mid + R*0.10, cy2); bg.lineTo(mid + R*0.62, cy2);
  bg.moveTo(mid, cy2 + R*0.30); bg.lineTo(mid, cy2 + R*0.52);
  bg.stroke();

  BINOC.mask = b; BINOC.built = true;
  return b;
}

function drawHorizonPlate(t, dt, o){
  o = o||{};
  const air = cl01(o.air===undefined?0.85:o.air);
  const pl = getPlate("town");
  if (!pl){ ctx.fillStyle="#b8b4a6"; ctx.fillRect(0,0,W,H); return; }
  const mask = buildBinocMask();

  /* ---- where the world is aimed. Inertia, then a sway that never settles. ---- */
  const tx = P.active ? cl((P.x/W-0.5)*2, -1, 1) : 0;
  const ty = P.active ? cl((P.y/H-0.5)*2, -1, 1) : 0;
  PLOOK.vx += (tx-PLOOK.ax)*dt*4.2; PLOOK.vy += (ty-PLOOK.ay)*dt*4.2;
  PLOOK.vx *= 0.90; PLOOK.vy *= 0.90;
  PLOOK.ax = (PLOOK.ax||0) + PLOOK.vx*dt*7;
  PLOOK.ay = (PLOOK.ay||0) + PLOOK.vy*dt*7;
  const swx = Math.sin(t*0.47)*0.010 + Math.sin(t*1.19)*0.004;
  const swy = Math.cos(t*0.41)*0.008 + Math.cos(t*1.07)*0.003;

  /* ---- holding still. Everything here is deliberately slow. ---- */
  const moving = Math.hypot(PLOOK.vx, PLOOK.vy)*30;
  const steady = cl01(1-moving) * (P.still>0.3 ? 1 : 0.2);
  PLOOK.hold = cl01(PLOOK.hold + (steady>0.45 ? dt*0.17 : -dt*0.30));
  PLOOK.recall = lerp(PLOOK.recall, ease.io(PLOOK.hold), 0.022);
  PLOOK.radius = lerp(PLOOK.radius, PLOOK.recall, 0.020);
  // magnification climbs slowly and only a little, so the view stays readable
  PLOOK.mag = lerp(PLOOK.mag||1, 1 + 0.42*ease.io(PLOOK.hold), 0.020);

  const MAG = PLOOK.mag;
  const panX = (PLOOK.ax + swx) * W * 0.16;
  const panY = (PLOOK.ay + swy) * H * 0.10;

  /* ---- the world as it is now, and the world as it was, both magnified ---- */
  offscreen(()=>{ drawPlate("town", { air, drift:false, camx:0, camy:0 }); });
  const showRecall = PLOOK.recall > 0.005;
  if (showRecall) offscreen2(()=>{ drawPlate("town", { air:0, drift:false, camx:0, camy:0 }); });

  ctx.save();
  ctx.translate(W*0.5, H*0.5);
  ctx.scale(MAG, MAG);
  ctx.translate(-W*0.5 - panX/MAG, -H*0.5 - panY/MAG);
  ctx.drawImage(TMP, 0, 0);
  ctx.restore();

  /* the remembered world, returning from the middle of each eyepiece outward */
  if (showRecall){
    const edge = cl01(PLOOK.radius*1.30);
    // mask TMP2 down to two blooming discs, on its own context
    const cxL = W*BINOC.lensL, cxR = W*BINOC.lensR, mcy = H*BINOC.cy;
    const rr = W*BINOC.r*1.02;
    tc2.globalCompositeOperation="destination-in";
    tc2.clearRect(0,0,0,0);
    for (const [cxx, first] of [[cxL,true],[cxR,false]]){
      const g2 = tc2.createRadialGradient(cxx, mcy, 0, cxx, mcy, rr);
      g2.addColorStop(0, "rgba(255,255,255,1)");
      g2.addColorStop(Math.max(0.02, edge*0.70), "rgba(255,255,255,1)");
      g2.addColorStop(Math.min(0.999, edge*1.06+0.02), "rgba(255,255,255,0)");
      g2.addColorStop(1, "rgba(255,255,255,0)");
      tc2.globalCompositeOperation = first ? "destination-in" : "destination-atop";
      tc2.fillStyle = g2;
      tc2.fillRect(0,0,TMP2.width,TMP2.height);
    }
    tc2.globalCompositeOperation="source-over";
    ctx.save();
    ctx.globalAlpha = cl01(PLOOK.recall*1.4);
    ctx.translate(W*0.5, H*0.5);
    ctx.scale(MAG, MAG);
    ctx.translate(-W*0.5 - panX/MAG, -H*0.5 - panY/MAG);
    ctx.drawImage(TMP2, 0, 0);
    ctx.restore();
    // colour is the last thing to come back
    if (PLOOK.recall < 0.92){
      ctx.save();
      ctx.globalCompositeOperation="saturation";
      ctx.globalAlpha=(1-PLOOK.recall)*0.55;
      ctx.fillStyle="rgb(128,128,128)";
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    }
  }

  /* the air in front of it all */
  partRole = 2;
  drawParticles(t, 0.14+air*0.55*(1-PLOOK.recall*0.7), { x:W*0.30, y:H*0.28, r:H*1.1 });
  if (LITPOP.birds>0.05 && PLOOK.recall>0.5) drawBirds();

  /* ---- the eyepieces: the asset, multiplied over everything ---- */
  if (mask){
    // cover the frame, keeping the asset's aspect, with a breath of sway
    const ar = mask.width/mask.height;
    let mw = W, mh = W/ar;
    if (mh < H){ mh = H; mw = H*ar; }
    mw *= 1.06; mh *= 1.06;
    const mx = (W-mw)/2 + Math.sin(t*0.5)*W*0.0035;
    const my = (H-mh)/2 + Math.cos(t*0.43)*H*0.0030;
    ctx.save();
    ctx.globalCompositeOperation="multiply";
    ctx.drawImage(mask, mx, my, mw, mh);
    ctx.restore();
    // and black around it, so nothing of the frame is ever left showing
    ctx.save();
    ctx.fillStyle="#000";
    if (mx>0){ ctx.fillRect(0,0,mx+1,H); ctx.fillRect(mx+mw-1,0,W-(mx+mw)+1,H); }
    if (my>0){ ctx.fillRect(0,0,W,my+1); ctx.fillRect(0,my+mh-1,W,H-(my+mh)+1); }
    ctx.restore();
  } else {
    // until it decodes, two plain black-surround circles
    ctx.save(); ctx.fillStyle="#000";
    ctx.beginPath(); ctx.rect(0,0,W,H);
    ctx.arc(W*BINOC.lensL, H*BINOC.cy, W*BINOC.r, 0, TAU);
    ctx.arc(W*BINOC.lensR, H*BINOC.cy, W*BINOC.r, 0, TAU);
    ctx.fill("evenodd"); ctx.restore();
  }

  /* ---- what is inside the eyepieces right now ---- */
  // a landmark's screen position, after the same pan and zoom the world got
  const place = (m)=>({
    x: W*0.5 + ((AP.x + m.x*AP.w) - W*0.5 - panX/MAG)*MAG,
    y: H*0.5 + ((AP.y + m.y*AP.h) - H*0.5 - panY/MAG)*MAG
  });
  let onMark = null, onD = 1e9;
  for (const m of PMARK){
    const q = place(m);
    m._x=q.x; m._y=q.y;
    for (const cxx of [W*BINOC.lensL, W*BINOC.lensR]){
      const d = Math.hypot(q.x-cxx, q.y-H*BINOC.cy);
      const reach = W*BINOC.r*(m.r?cl(m.r/0.13,0.6,2.2):1)*0.72;
      if (d < reach && d < onD){ onMark = m; onD = d; }
    }
  }
  if (onMark && PLOOK.recall>0.55 && !PLOOK.found[onMark.id]){
    PLOOK.found[onMark.id]=true; PLOOK.n++;
    sfx.chime(pick([784,880,988]));
    whisper(onMark.label);
    if (!FOUND["mark-"+onMark.id]){ FOUND["mark-"+onMark.id]=true; }
  }

  /* the only feedback: a slim arc under the eyepieces, closing as it remembers */
  if (PLOOK.hold>0.015 && PLOOK.hold<0.995){
    ctx.save();
    ctx.strokeStyle=rgba([236,230,214], 0.30);
    ctx.lineWidth=Math.max(1.6,MIN*0.0026); ctx.lineCap="round";
    const ay2 = H*BINOC.cy + W*BINOC.r*1.16;
    const half = W*0.10;
    ctx.beginPath();
    ctx.moveTo(W*0.5-half, ay2);
    ctx.lineTo(W*0.5-half + half*2*PLOOK.hold, ay2);
    ctx.stroke();
    ctx.restore();
  }
  cv.className = "grabbable";
}

function horizonInteractP(g, dt){
  if (g && PLOOK.n>=3) meet(g);
}

/* ============================================================================
   THE KITE
   The paintings give four lights: blue day, golden, dusk, and the drained one.
   Two of those pairs are aligned well enough to dissolve, so the sky can travel
   from afternoon to night without a cut.

   The painted kite has to go, because a kite you cannot fly is a picture of a
   kite. It sits in open sky, so patching it out is invisible — and the painted
   child stays exactly where they are, because a silhouette is what the brief
   asked for and the painting does it better than code would.
   ========================================================================== */
const PKITE = {
  x:0, y:0, vx:0, vy:0, line:0, pull:0, tension:0,
  handX:0, handY:0, best:0, lost:0, tail:[], patched:Object.create(null)
};
/* where the painted kite sits in each plate, as fractions of the frame, and
   where the painted child's raised hand is */
const KITE_ART = {
  kiteDay:     { kite:{x:0.755, y:0.075, w:0.105, h:0.165}, hand:{x:0.335, y:0.605} },
  kiteEvening: { kite:{x:0.775, y:0.055, w:0.110, h:0.175}, hand:{x:0.345, y:0.590} },
  kiteHazed:   { kite:{x:0.755, y:0.075, w:0.105, h:0.165}, hand:{x:0.320, y:0.615} }
};

function resetPKite(){
  PKITE.line = MIN*0.42; PKITE.x = W*0.62; PKITE.y = H*0.30;
  PKITE.vx=PKITE.vy=0; PKITE.best=0; PKITE.tail.length=0;
}
/* remove the painted kite from a plate's bands, once */
function patchPlateKite(name){
  if (PKITE.patched[name+PLATE_CACHE.key]) return;
  const pl = getPlate(name); if (!pl) return;
  const art = KITE_ART[name]; if (!art) return;
  const k = art.kite;
  for (const which of [pl.clean, pl.hazed]){
    if (!which) continue;
    for (const b of which){
      // does the kite fall inside this band?
      const ky0 = k.y*H, ky1 = (k.y+k.h)*H;
      if (ky1 < b.y || ky0 > b.y+b.h) continue;
      const y0 = Math.max(0, ky0-b.y), y1 = Math.min(b.h, ky1-b.y);
      patchOut(b.cv, b.dx + k.x*W, y0, k.w*W, Math.max(2, y1-y0));
    }
  }
  PKITE.patched[name+PLATE_CACHE.key] = true;
}

function drawKitePlate(t, dt, o){
  o = o||{};
  const name = o.plate || "kiteDay";
  const air = cl01(o.air===undefined?0:o.air);
  const pl = getPlate(name);
  if (!pl){ ctx.fillStyle= air>0.5?"#c9c4b4":"#7fb0dc"; ctx.fillRect(0,0,W,H); return; }
  patchPlateKite(name);

  /* the world */
  drawPlate(name, { air });

  const art = KITE_ART[name] || KITE_ART.kiteDay;
  partRole = lerp(0,2,air);
  drawParticles(t, 0.12+air*0.72, { x:W*0.26, y:H*0.30, r:H*1.1 });
  if (LITPOP.birds>0.05) drawBirds();
  if (LITPOP.fireflies>0.02) drawFireflies(t, LITPOP.fireflies);

  /* ---- flight. The hand is the painted child's; the kite is ours. ---- */
  PKITE.handX = AP.x + art.hand.x*AP.w + PCAM.x*W*0.06;
  PKITE.handY = AP.y + art.hand.y*AP.h;

  const pulling = P.down && P.active;
  const pullStrength = pulling ? cl01(0.35 + (P.dy>0 ? P.dy/12 : 0) + P.speed*0.5) : 0;
  PKITE.pull = lerp(PKITE.pull, pullStrength, 0.12);
  if (pulling && P.dy>3 && Math.random()<0.12) sfx.line();

  const maxLine = MIN*1.15;
  PKITE.line += (PKITE.pull>0.25 ? -MIN*0.13 : MIN*0.050)*dt*6;
  PKITE.line = cl(PKITE.line, MIN*0.24, maxLine);

  const alt = cl01((PKITE.handY - PKITE.y)/(H*0.72));
  const wind = 0.34 + alt*0.80 + AIR.gust*1.3;
  const lift = wind*(0.42 + PKITE.pull*1.45);
  const ang = lerp(0.32, 1.28, cl01(lift*0.60)) + (fbm(t*0.5,3)-0.5)*0.20;
  const tx = PKITE.handX + Math.cos(ang)*PKITE.line;
  const ty = PKITE.handY - Math.sin(ang)*PKITE.line;
  const k2 = 5.0, damp = 0.87;
  PKITE.vx += (tx-PKITE.x)*k2*dt + Math.sin(t*3.0)*wind*20*dt;
  PKITE.vy += (ty-PKITE.y)*k2*dt + Math.cos(t*2.2)*wind*15*dt;
  PKITE.vx *= damp; PKITE.vy *= damp;
  PKITE.x += PKITE.vx; PKITE.y += PKITE.vy;
  PKITE.tension = cl01(Math.hypot(PKITE.x-PKITE.handX, PKITE.y-PKITE.handY)/PKITE.line);
  PKITE.best = Math.max(PKITE.best, alt);
  PKITE.tail.unshift({x:PKITE.x, y:PKITE.y});
  if (PKITE.tail.length > (LOW?12:20)) PKITE.tail.pop();

  /* how much of it you can still see. The kite keeps its red longest — one
     saturated thing surviving says more than draining everything equally. */
  const contrast = o.lose ? cl01(1 - alt*1.5 - air*0.55) : 1;
  PKITE.lost = 1-contrast;

  /* the line: sag falls as tension rises, and it sings when tight */
  const sag = (1-PKITE.tension)*MIN*0.26 + MIN*0.008;
  ctx.save();
  ctx.strokeStyle = rgba(mixL([48,44,50], hazeTint(), air*0.7), 0.34+PKITE.tension*0.34);
  ctx.lineWidth = Math.max(1, MIN*0.0013);
  ctx.beginPath();
  ctx.moveTo(PKITE.handX, PKITE.handY);
  const mx=(PKITE.handX+PKITE.x)/2, my=(PKITE.handY+PKITE.y)/2+sag;
  const vib = PKITE.tension>0.82 ? Math.sin(t*38)*MIN*0.0018 : 0;
  ctx.quadraticCurveTo(mx+vib, my, PKITE.x, PKITE.y);
  ctx.stroke();
  ctx.restore();

  /* the tail */
  for (let i=PKITE.tail.length-1;i>0;i--){
    const p=PKITE.tail[i], q=PKITE.tail[i-1], f=i/PKITE.tail.length;
    ctx.strokeStyle=rgba(mixL([214,66,74], hazeTint(), (1-contrast)*0.85), (1-f)*0.72*contrast);
    ctx.lineWidth=Math.max(1, MIN*0.0042*(1-f));
    ctx.beginPath();
    ctx.moveTo(q.x, q.y+f*MIN*0.045); ctx.lineTo(p.x, p.y+(f+0.05)*MIN*0.045);
    ctx.stroke();
  }
  for (let i=3;i<PKITE.tail.length;i+=5){
    const p=PKITE.tail[i], f=i/PKITE.tail.length;
    ctx.fillStyle=rgba(mixL([246,206,120], hazeTint(), (1-contrast)*0.85), (1-f)*0.8*contrast);
    ctx.beginPath(); ctx.ellipse(p.x, p.y+f*MIN*0.045, MIN*0.007*(1-f*0.5), MIN*0.0035,0,0,TAU); ctx.fill();
  }

  /* the kite: a red diamond with a pale centre, exactly the one in the paintings */
  const sz = MIN*(0.046 - alt*0.013);
  const roll = cl(PKITE.vx*0.016, -0.45, 0.45);
  ctx.save();
  ctx.translate(PKITE.x, PKITE.y); ctx.rotate(roll + Math.sin(t*2.0)*0.035);
  const face  = mixL([206,54,60], hazeTint(), (1-contrast)*0.9);
  const faceD = mixL([166,38,46], hazeTint(), (1-contrast)*0.9);
  ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(sz*0.60,0); ctx.lineTo(0,sz*1.10); ctx.closePath();
  ctx.fillStyle=rgba(faceD, contrast); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(-sz*0.60,0); ctx.lineTo(0,sz*1.10); ctx.closePath();
  ctx.fillStyle=rgba(face, contrast); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,-sz*0.30); ctx.lineTo(sz*0.20,0); ctx.lineTo(0,sz*0.34); ctx.lineTo(-sz*0.20,0);
  ctx.closePath(); ctx.fillStyle=rgba(mixL([248,232,190],hazeTint(),(1-contrast)*0.8), contrast*0.95); ctx.fill();
  ctx.strokeStyle=rgba([80,40,40], 0.30*contrast); ctx.lineWidth=Math.max(1,MIN*0.0011);
  ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(0,sz*1.10); ctx.moveTo(-sz*0.60,0); ctx.lineTo(sz*0.60,0); ctx.stroke();
  ctx.restore();

  /* the moment it stops being visible while you are still holding it */
  if (PKITE.lost>0.85 && !FOUND["lostkite"]){
    FOUND["lostkite"]=true; foundN++;
    whisper("It's still up there. You can feel it pulling.");
    sfx.line();
  }
  /* affordance: while it is low and untouched, the line shows a soft pull cue */
  if (PKITE.best<0.18 && !P.down){
    const a = 0.24+0.14*Math.sin(t*1.8);
    ctx.save();
    ctx.strokeStyle=rgba([255,248,230],a); ctx.lineWidth=Math.max(1.4,MIN*0.0026); ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(PKITE.handX, PKITE.handY+MIN*0.03);
    ctx.lineTo(PKITE.handX, PKITE.handY+MIN*0.075); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PKITE.handX-MIN*0.014, PKITE.handY+MIN*0.058);
    ctx.lineTo(PKITE.handX, PKITE.handY+MIN*0.078);
    ctx.lineTo(PKITE.handX+MIN*0.014, PKITE.handY+MIN*0.058); ctx.stroke();
    ctx.restore();
  }
  cv.className = P.down ? "grabbing" : "grabbable";
}

/* ============================================================================
   CHAPTER FIVE — STOPPED AT THE WINDOW
   The paintings hang a brass ball on a cord in the middle of the window. That is
   the thing you reach for, and the thing that stops you. Nothing about the room
   has changed; the reading is about what is outside it.
   ========================================================================== */
const PSTOP = { reach:0, shown:0, blocked:0, tries:0, fog:0 };
const PULL = { x:0.500, y:0.215 };            // the pull-ball, off the paintings

function updateStoppedPlate(t, dt){
  const px2 = AP.x + PULL.x*AP.w, py2 = AP.y + PULL.y*AP.h;
  const d = Math.hypot(P.x-px2, P.y-py2);
  const near = d < MIN*0.13;

  /* the cord sways a little, and more when you are close to it */
  const sway = Math.sin(t*0.9)*MIN*0.004 + (near?Math.sin(t*3.1)*MIN*0.002:0);
  ctx.save();
  ctx.strokeStyle="rgba(70,56,38,0.55)";
  ctx.lineWidth=Math.max(1,MIN*0.0016);
  ctx.beginPath();
  ctx.moveTo(px2, AP.y+AP.h*0.10);
  ctx.quadraticCurveTo(px2+sway*0.5, py2-MIN*0.03, px2+sway, py2);
  ctx.stroke();
  const bg = ctx.createRadialGradient(px2+sway-MIN*0.003, py2-MIN*0.003, 0, px2+sway, py2, MIN*0.011);
  bg.addColorStop(0,"#f0d9a2"); bg.addColorStop(0.5,"#c8a25c"); bg.addColorStop(1,"#7d6132");
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.arc(px2+sway, py2, MIN*0.011, 0, TAU); ctx.fill();
  ctx.restore();

  /* an affordance, not an instruction: it brightens as your hand approaches */
  if (!PSTOP.shown){
    const a = near ? 0.5 : 0.18 + 0.12*Math.sin(t*1.4);
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const g2 = ctx.createRadialGradient(px2+sway, py2, 0, px2+sway, py2, MIN*0.048);
    g2.addColorStop(0, rgba([255,232,180], a*0.5));
    g2.addColorStop(1, rgba([255,232,180], 0));
    ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(px2+sway,py2,MIN*0.048,0,TAU); ctx.fill();
    ctx.restore();
  }

  /* reaching for it */
  if (P.down && near){
    PSTOP.reach = Math.min(1, PSTOP.reach + dt*0.85);
    if (PSTOP.reach>0.55 && !PSTOP.shown){
      PSTOP.shown = 1; PSTOP.tries++;
      const aq = document.getElementById("aq");
      aq.classList.add("on"); aq.setAttribute("aria-hidden","false");
      sfx.alarm();
      meet("latch");
    }
  } else {
    PSTOP.reach = Math.max(0, PSTOP.reach - dt*0.5);
  }
  PSTOP.blocked = lerp(PSTOP.blocked, PSTOP.shown?1:0, 0.05);

  /* the hand that hesitates: a soft warmth near the pull, which withdraws */
  if (PSTOP.reach>0.03){
    const a = PSTOP.reach*(1-PSTOP.blocked*0.55);
    ctx.save();
    const g3 = ctx.createRadialGradient(px2,py2+MIN*0.02,0, px2,py2+MIN*0.02, MIN*0.085);
    g3.addColorStop(0, rgba([255,222,186], a*0.20));
    g3.addColorStop(1, rgba([255,222,186], 0));
    ctx.fillStyle=g3; ctx.beginPath(); ctx.arc(px2,py2+MIN*0.02,MIN*0.085,0,TAU); ctx.fill();
    ctx.restore();
  }

  /* breath on cold glass, while there is nothing to do but stand there */
  const onGlass = P.x>AP.x+AP.w*0.30 && P.x<AP.x+AP.w*0.70 &&
                  P.y>AP.y+AP.h*0.12 && P.y<AP.y+AP.h*0.62;
  if (onGlass && !P.down && P.still>1.3){
    const fx=((P.x-(AP.x+AP.w*0.30))/(AP.w*0.40))*360;
    const fy=((P.y-(AP.y+AP.h*0.12))/(AP.h*0.50))*360;
    breathe(fx, fy, 44);
    if (BREATH.amt>0.3 && !FOUND["breath"]){
      FOUND["breath"]=true; foundN++; sfx.breath();
      whisper("You always used to do this.");
    }
  }
  if (onGlass && P.down && BREATH.amt>0.12){
    const fx=((P.x-(AP.x+AP.w*0.30))/(AP.w*0.40))*360;
    const fy=((P.y-(AP.y+AP.h*0.12))/(AP.h*0.50))*360;
    const qx=((P.px-(AP.x+AP.w*0.30))/(AP.w*0.40))*360;
    const qy=((P.py-(AP.y+AP.h*0.12))/(AP.h*0.50))*360;
    fogWipe(qx,qy,fx,fy,11);
  }
  if (BREATH.amt>0.01){
    drawFog(AP.x+AP.w*0.30, AP.y+AP.h*0.12, AP.w*0.40, AP.h*0.50, 0.8);
  }
  fogFade(dt);
}
