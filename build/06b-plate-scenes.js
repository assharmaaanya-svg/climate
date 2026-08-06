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
