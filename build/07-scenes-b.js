/* ============================================================================
   THE KITE
   New verb: PULL AND RELEASE. Not cursor-follow — the kite is on a line with
   real length and real tension. You pull to make it climb, and pay out to let
   it run. Its altitude drives the time of day: it climbs into evening.
   ========================================================================== */
const KITE = {
  x:0, y:0, vx:0, vy:0, line:0, pull:0, tension:0,
  handX:0, handY:0, tail:[], alt:0, best:0, lost:0, ribbon:0, turb:0
};
function resetKite(){
  KITE.handX = W*0.34; KITE.handY = 0;
  KITE.line = MIN*0.34; KITE.x = W*0.5; KITE.y = H*0.52;
  KITE.vx=KITE.vy=0; KITE.tail.length=0; KITE.alt=0; KITE.best=0; KITE.lost=0;
}
function drawKite(t, dt, o){
  o=o||{};
  OUTSIDE_T = 1;
  apFull();
  const s = drawSky();
  const sp = drawSun(t, s);
  drawMoon(t);
  drawClouds(s);
  drawPlane();
  // high on a hill: the far country shows, but nothing near — you are looking
  // at sky, not at a street
  drawLand(t, { upTo: 4 });
  drawBirds();

  // ---- the hill you are standing on
  const gy = AP.y+AP.h*0.86;
  ctx.save();
  const hg = ctx.createLinearGradient(0,gy-MIN*0.05,0,H);
  hg.addColorStop(0, rgb(farColour([96,132,68],14)));
  hg.addColorStop(1, rgb(farColour([54,84,46],10)));
  ctx.fillStyle=hg;
  ctx.beginPath(); ctx.moveTo(-4,H+4);
  for (let x=-4;x<=W+4;x+=16) ctx.lineTo(x, gy - Math.sin(x*0.0022+0.6)*MIN*0.055 - fbm(x*0.004,2)*MIN*0.02);
  ctx.lineTo(W+4,H+4); ctx.closePath(); ctx.fill();
  ctx.restore();
  const groundAt = x => gy - Math.sin(x*0.0022+0.6)*MIN*0.055 - fbm(x*0.004,2)*MIN*0.02;
  // grass on the hilltop
  for (let i=0;i<(LOW?70:150);i++){
    const g2=GEO.grassTuft[i%GEO.grassTuft.length];
    const x=g2.x*W, y=groundAt(x)+g2.y*MIN*0.06;
    const len=MIN*0.016*g2.s, sway=Math.sin(t*1.8+g2.x*30)*len*0.3*AIR.wind;
    ctx.strokeStyle=rgba(farColour([70,104,52],12), 0.7);
    ctx.lineWidth=Math.max(1,MIN*0.0014);
    ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+sway*0.5,y-len*0.6,x+g2.a*len+sway,y-len); ctx.stroke();
  }

  /* ---- flight. The hand belongs to a child who runs along the hill. ---- */
  KITE.handX = lerp(KITE.handX, P.active ? cl(P.x, W*0.12, W*0.88) : W*0.34, 0.05);
  const childFeet = groundAt(KITE.handX) + MIN*0.010;
  const childS = MIN*0.185;
  KITE.handY = childFeet - childS*1.06;          // the raised hand, not thin air

  // pulling: hold and drag downward / toward you
  const pulling = P.down && P.active;
  const pullStrength = pulling ? cl01(0.35 + (P.dy>0 ? P.dy/12 : 0) + P.speed*0.5) : 0;
  KITE.pull = lerp(KITE.pull, pullStrength, 0.14);
  if (pulling && P.dy>3 && Math.random()<0.14) sfx.line();

  // line pays out when you're not pulling
  const maxLine = MIN*1.05;
  KITE.line += (KITE.pull>0.25 ? -MIN*0.14 : MIN*0.055)*dt*6;
  KITE.line = cl(KITE.line, MIN*0.20, maxLine);

  // wind is stronger higher up
  KITE.alt = cl01((KITE.handY - KITE.y) / (H*0.78));
  const wind = 0.35 + KITE.alt*0.85 + AIR.gust*1.4;
  KITE.turb = fbm(t*0.5, 3);
  // the angle the line makes above the horizon — pulling lifts it overhead
  const lift = wind*(0.42 + KITE.pull*1.5);
  const ang = lerp(0.30, 1.30, cl01(lift*0.62)) + (KITE.turb-0.5)*0.22;
  const downwind = -1;                                        // wind blows to the left
  const tx = KITE.handX - downwind*Math.cos(ang)*KITE.line;
  const ty = KITE.handY - Math.sin(ang)*KITE.line;
  // spring toward that, with flutter
  const k = 5.4, damp = 0.86;
  KITE.vx += (tx-KITE.x)*k*dt + Math.sin(t*3.1)*wind*22*dt;
  KITE.vy += (ty-KITE.y)*k*dt + Math.cos(t*2.3)*wind*16*dt;
  KITE.vx *= damp; KITE.vy *= damp;
  KITE.x += KITE.vx; KITE.y += KITE.vy;
  KITE.tension = cl01(Math.hypot(KITE.x-KITE.handX, KITE.y-KITE.handY)/KITE.line);
  KITE.best = Math.max(KITE.best, KITE.alt);
  KITE.tail.unshift({ x:KITE.x, y:KITE.y });
  if (KITE.tail.length>(LOW?12:22)) KITE.tail.pop();

  /* ---- how visible is it? In the later flight, contrast is what you lose. ---- */
  const contrast = o.lose ? cl01(1 - KITE.alt*1.85 - AIR.h*0.55) : 1;
  KITE.lost = 1-contrast;

  /* ---- the kite's shadow, running over the hill ---- */
  if (KITE.alt<0.6 && AIR.h<0.6){
    const shx = lerp(KITE.x, KITE.handX, 0.35) - MIN*0.06;
    groundShadow(shx, groundAt(shx)+MIN*0.01, MIN*0.055*(1-KITE.alt), MIN*0.014, 0.20*(1-KITE.alt)*(1-AIR.h));
  }

  /* ---- the line: sag falls as tension rises, and it hums when tight ---- */
  const sag = (1-KITE.tension)*MIN*0.26 + MIN*0.01;
  ctx.save();
  ctx.strokeStyle = rgba(mixL([60,58,64], airlight(), AIR.h*0.6), 0.42+KITE.tension*0.34);
  ctx.lineWidth = Math.max(1, MIN*0.0015);
  ctx.beginPath();
  ctx.moveTo(KITE.handX, KITE.handY);
  const mx=(KITE.handX+KITE.x)/2, my=(KITE.handY+KITE.y)/2+sag;
  const vib = KITE.tension>0.8 ? Math.sin(t*40)*MIN*0.002 : 0;
  ctx.quadraticCurveTo(mx+vib, my, KITE.x, KITE.y);
  ctx.stroke();
  ctx.restore();

  /* ---- Whoever is holding the line is only ever a silhouette against the sky,
     plus their shadow stretched away across the grass. No face, no detail — the
     kite is the thing you are meant to be looking at. ---- */
  childShadowOnGround({ x: KITE.handX + MIN*0.03, y: childFeet, s: childS, t,
                        a: 0.24*(1-AIR.h*0.6), skew: -0.95 });
  ctx.save();
  ctx.translate(KITE.handX, childFeet);
  ctx.rotate(-cl(KITE.tension*0.13 + KITE.vx*0.002, -0.20, 0.20));
  ctx.translate(-KITE.handX, -childFeet);
  // flat, near-black, backlit
  const silh = mixL([16,20,26], airlight(), 0.10 + AIR.h*0.30);
  const cs = childS, cx0 = KITE.handX, cy0 = childFeet;
  const HD = cs*0.072;
  ctx.fillStyle = rgba(silh, 0.94);
  ctx.strokeStyle = rgba(silh, 0.94);
  ctx.lineCap="round";
  // legs mid-stride
  const strd = Math.sin(t*3.2)*0.5;
  ctx.lineWidth = cs*0.062;
  ctx.beginPath(); ctx.moveTo(cx0, cy0-cs*0.46); ctx.lineTo(cx0-cs*0.10-strd*cs*0.06, cy0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx0, cy0-cs*0.46); ctx.lineTo(cx0+cs*0.10+strd*cs*0.06, cy0); ctx.stroke();
  // body
  ctx.beginPath();
  ctx.moveTo(cx0-cs*0.085, cy0-cs*0.44);
  ctx.lineTo(cx0+cs*0.085, cy0-cs*0.44);
  ctx.lineTo(cx0+cs*0.075, cy0-cs*0.80);
  ctx.lineTo(cx0-cs*0.075, cy0-cs*0.80);
  ctx.closePath(); ctx.fill();
  // head, tipped back to watch it
  ctx.beginPath(); ctx.ellipse(cx0-cs*0.012, cy0-cs*0.885, HD*0.94, HD, -0.16, 0, TAU); ctx.fill();
  // scruff of hair lifting in the wind
  ctx.beginPath();
  ctx.ellipse(cx0-cs*0.030, cy0-cs*0.925, HD*0.95, HD*0.62,
              -0.35+Math.sin(t*2.1)*0.10, 0, TAU); ctx.fill();
  // both arms up on the line
  ctx.lineWidth = cs*0.050;
  const up = 0.55 + KITE.tension*0.45;
  for (const sd of [-1,1]){
    const shx = cx0+sd*cs*0.070, shy = cy0-cs*0.78;
    const ex = shx+sd*cs*0.055, ey = shy-cs*0.13*up;
    ctx.beginPath(); ctx.moveTo(shx,shy); ctx.lineTo(ex,ey);
    ctx.lineTo(cx0+sd*cs*0.030, cy0-cs*1.02); ctx.stroke();
  }
  ctx.restore();

  /* ---- the tail ---- */
  for (let i=KITE.tail.length-1;i>0;i--){
    const p=KITE.tail[i], q=KITE.tail[i-1], f=i/KITE.tail.length;
    ctx.strokeStyle=rgba(mixL([222,86,104], airlight(), (1-contrast)*0.9), (1-f)*0.75*contrast);
    ctx.lineWidth=Math.max(1, MIN*0.005*(1-f));
    ctx.beginPath();
    ctx.moveTo(q.x, q.y+f*MIN*0.05); ctx.lineTo(p.x, p.y+(f+0.05)*MIN*0.05); ctx.stroke();
  }
  // little bows along the tail
  for (let i=3;i<KITE.tail.length;i+=5){
    const p=KITE.tail[i], f=i/KITE.tail.length;
    ctx.fillStyle=rgba(mixL([246,206,120], airlight(), (1-contrast)*0.9), (1-f)*0.85*contrast);
    ctx.beginPath(); ctx.ellipse(p.x, p.y+f*MIN*0.05, MIN*0.008*(1-f*0.5), MIN*0.004,0,0,TAU); ctx.fill();
  }

  /* ---- the kite: paper over a cross-spar, with a fabric bulge ---- */
  const sz = MIN*(0.052 - KITE.alt*0.016);
  const roll = cl(KITE.vx*0.018, -0.5, 0.5);
  ctx.save(); ctx.translate(KITE.x, KITE.y); ctx.rotate(roll + Math.sin(t*2.2)*0.04);
  const face = mixL([214,64,72], airlight(), (1-contrast));
  const faceB = mixL([242,196,110], airlight(), (1-contrast));
  // two halves, so the light catches one side
  ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(sz*0.66,0); ctx.lineTo(0,sz*1.15); ctx.closePath();
  ctx.fillStyle=rgba(shade(face,0.86), contrast); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(-sz*0.66,0); ctx.lineTo(0,sz*1.15); ctx.closePath();
  ctx.fillStyle=rgba(face, contrast); ctx.fill();
  // a yellow diamond in the middle, the way children decorate them
  ctx.beginPath(); ctx.moveTo(0,-sz*0.34); ctx.lineTo(sz*0.24,0); ctx.lineTo(0,sz*0.4); ctx.lineTo(-sz*0.24,0);
  ctx.closePath(); ctx.fillStyle=rgba(faceB, contrast*0.95); ctx.fill();
  // spars
  ctx.strokeStyle=rgba(mixL([250,242,226],airlight(),1-contrast), 0.55*contrast);
  ctx.lineWidth=Math.max(1,MIN*0.0016);
  ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(0,sz*1.15); ctx.moveTo(-sz*0.66,0); ctx.lineTo(sz*0.66,0); ctx.stroke();
  ctx.restore();
  spot("kite-body", KITE.x, KITE.y, sz*1.6, ()=>{
    KITE.ribbon=1; sfx.chime(1175); ripple(KITE.x,KITE.y,[246,206,120],MIN*0.13);
    whisper("You tied that ribbon on yourself.");
    curiosity+=0.4;
  });

  partRole = lerp(0,2,AIR.h);
  drawParticles(t, 0.2+AIR.h*0.75, sp?{x:sp.x,y:sp.y,r:H}:null);
  drawLeaves();
  // the hilltop grasses, right against the lens
  drawFringe(t, { base: 1.055, a: 0.9 });
  if (sp && sp.up>0.02) flare(sp.x, sp.y, 0.5-AIR.h*0.2);
  return { groundAt, contrast };
}

/* ============================================================================
   THE STARS
   New verb: TRACE. Drag the whole sky with weight and momentum; tap the bright
   ones and a line follows your hand between them.
   ========================================================================== */
const SKYV = { panX:0, panY:0, vx:0, vy:0, lit:0, wish:0, wishGlow:0, sat:null, satT:16, shoot:null, shootT:6, faint:[] };
const STARS = [];
const CONST = [];      // the shape: a kite
function buildStars(){
  _sd = 771133;
  STARS.length=0;
  const n = LOW?260:520;
  for (let i=0;i<n;i++){
    STARS.push({ x:sr(0,3), y:sr(0.02,0.92), b:Math.pow(sr(0,1),2.1),
                 ph:sr(0,TAU), c:[1,1,1], k:sr(0,1) });
  }
  // colour a few of them
  for (const s of STARS){
    if (s.k>0.93) s.c=[255,206,170];
    else if (s.k>0.86) s.c=[255,240,214];
    else if (s.k<0.09) s.c=[196,214,255];
    else s.c=[236,242,255];
  }
  CONST.length=0;
  // a kite, drawn in the sky: 4 corners, a nose, and two tail stars
  const shape=[[0.50,0.22],[0.585,0.34],[0.50,0.50],[0.415,0.34],[0.50,0.22],[0.525,0.62],[0.475,0.72]];
  const seen = [];
  for (let i=0;i<shape.length;i++){
    if (i===4){ seen.push(0); continue; }             // closes back to the first
    const st = { x:shape[i][0]+1.0, y:shape[i][1], b:sr(0.72,1), ph:sr(0,TAU),
                 c:[255,246,226], lit:false, k:1, anchor:true };
    STARS.push(st); CONST.push(st); seen.push(CONST.length-1);
  }
  CONST.order = seen;
}
/* whether a star is bright enough to see. Two separate causes, kept separate:
   aerosol haze (dust) and skyglow (artificial light). */
function starFloor(){ return 0.055 + AIR.h*0.34 + AIR.glow*0.46; }
function starVisible(s){ return s.b > starFloor(); }

function drawStars(t, dt, o){
  o=o||{};
  apFull();
  const s = drawSky();
  // milky way
  const mwA = (1-cl01(AIR.h*1.5))*(1-cl01(AIR.glow*1.4))*0.16;
  if (mwA>0.005){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    ctx.translate(W*0.5 - SKYV.panX*W*0.3, H*0.42 - SKYV.panY*H*0.3); ctx.rotate(-0.62);
    for (let i=0;i<3;i++){
      const wdt = W*(0.11+i*0.07);
      const g=ctx.createLinearGradient(-wdt,0,wdt,0);
      g.addColorStop(0,rgba([180,196,255],0)); g.addColorStop(0.5,rgba([224,228,255],mwA/(i+1)));
      g.addColorStop(1,rgba([180,196,255],0));
      ctx.fillStyle=g; ctx.fillRect(-wdt,-H*1.2,wdt*2,H*2.4);
    }
    // dust lanes
    ctx.globalCompositeOperation="source-over";
    for (let i=0;i<7;i++){
      ctx.fillStyle=rgba([8,10,26], mwA*2.4);
      ctx.beginPath();
      ctx.ellipse(sr(-W*0.06,W*0.06), sr(-H*0.7,H*0.7), W*0.02, H*0.16, 0.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // skyglow dome at the horizon — this is light pollution, and it looks different
  // from haze: it is a bright wash from below, not a veil in front.
  if (AIR.glow>0.02){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const g=ctx.createRadialGradient(W*0.5,H*1.08,MIN*0.1, W*0.5,H*1.08,H*1.15);
    const gcol = mixL([120,132,160],[214,176,120], 0.55);
    g.addColorStop(0, rgba(gcol, 0.30*AIR.glow));
    g.addColorStop(0.35, rgba(gcol, 0.12*AIR.glow));
    g.addColorStop(1, rgba(gcol,0));
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  drawMoon(t);

  // ---- the stars themselves
  const floor = starFloor();
  ctx.save();
  for (const st of STARS){
    if (st.b <= floor) continue;
    const sx = ((st.x - SKYV.panX)%3 + 3)%3;
    if (sx<0.02||sx>0.98) continue;
    const x = AP.x + (sx/1)*AP.w - AP.w*0.0;
    const xx = AP.x + ((sx%1))*AP.w;
    const y = AP.y + (st.y - SKYV.panY*0.4)*AP.h*0.96;
    if (y<AP.y-10||y>AP.y+AP.h*0.94) continue;
    const above = cl01((st.b-floor)*3.4);
    const tw = 0.62 + 0.38*Math.sin(t*(1.4+st.k*2.6) + st.ph);
    const a = above*tw;
    const r = MIN*(0.0011 + st.b*0.0030)*(st.anchor?1.5:1);
    ctx.fillStyle = rgba(st.lit ? [255,232,176] : st.c, a);
    ctx.beginPath(); ctx.arc(xx, y, r, 0, TAU); ctx.fill();
    if (st.b>0.62 || st.anchor){
      ctx.save(); ctx.globalCompositeOperation="lighter";
      const g=ctx.createRadialGradient(xx,y,0,xx,y,r*(st.lit?11:7));
      g.addColorStop(0, rgba(st.lit?[255,226,160]:st.c, a*0.42)); g.addColorStop(1, rgba(st.c,0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(xx,y,r*(st.lit?11:7),0,TAU); ctx.fill();
      if (st.b>0.85 && !LOW){
        ctx.strokeStyle=rgba(st.c, a*0.20); ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(xx-r*7,y); ctx.lineTo(xx+r*7,y);
        ctx.moveTo(xx,y-r*7); ctx.lineTo(xx,y+r*7); ctx.stroke();
      }
      ctx.restore();
    }
    st._sx = xx; st._sy = y; st._vis = above>0.02;
  }
  ctx.restore();

  // ---- the traced shape
  ctx.save();
  ctx.lineCap="round";
  const litList = CONST.order.map(i=>CONST[i]).filter(st=>st && st.lit);
  if (litList.length>1){
    ctx.strokeStyle=rgba([196,216,255],0.36);
    ctx.lineWidth=Math.max(1,MIN*0.0013);
    ctx.beginPath();
    let started=false;
    for (const i of CONST.order){
      const st=CONST[i];
      if (!st || !st.lit || st._sx===undefined){ started=false; continue; }
      if (!started){ ctx.moveTo(st._sx,st._sy); started=true; } else ctx.lineTo(st._sx,st._sy);
    }
    ctx.stroke();
  }
  // a line from your hand to the last lit star while you're tracing
  if (P.active && litList.length && litList.length<CONST.length){
    const last = litList[litList.length-1];
    if (last._sx!==undefined){
      ctx.strokeStyle=rgba([196,216,255],0.16); ctx.setLineDash([3,6]);
      ctx.beginPath(); ctx.moveTo(last._sx,last._sy); ctx.lineTo(P.x,P.y); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  ctx.restore();

  // ---- a satellite. It is not a star, and you can tell.
  SKYV.satT -= dt;
  if (!SKYV.sat && SKYV.satT<=0){ SKYV.sat={ x:-0.05, y:sr(0.1,0.5), sp:sr(0.035,0.06), ph:0 }; }
  if (SKYV.sat){
    SKYV.sat.x += SKYV.sat.sp*dt;
    const x=AP.x+SKYV.sat.x*AP.w, y=AP.y+SKYV.sat.y*AP.h;
    const fl = 0.5+0.5*Math.sin(t*2.4);
    ctx.fillStyle=rgba([255,250,240], 0.55+0.4*fl);
    ctx.beginPath(); ctx.arc(x,y,MIN*0.0017,0,TAU); ctx.fill();
    spot("sat", x, y, MIN*0.05, ()=>{
      sfx.chime(1568); whisper("That one isn't a star.");
      curiosity+=0.4;
    });
    if (SKYV.sat.x>1.05){ SKYV.sat=null; SKYV.satT=rnd(20,45); }
  }

  // ---- a meteor you can actually catch
  SKYV.shootT -= dt;
  if (!SKYV.shoot && SKYV.shootT<=0 && AIR.h<0.62){
    SKYV.shoot = { x:rnd(W*0.2,W*0.85), y:rnd(H*0.10,H*0.42), vx:rnd(-9,-4), vy:rnd(2.4,4.6), life:1 };
    cc("a meteor");
  }
  if (SKYV.shoot){
    const sh=SKYV.shoot;
    sh.x += sh.vx*dt*60; sh.y += sh.vy*dt*60; sh.life -= dt*0.85;
    ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.lineCap="round";
    const g=ctx.createLinearGradient(sh.x,sh.y, sh.x-sh.vx*22, sh.y-sh.vy*22);
    g.addColorStop(0,rgba([255,255,246],sh.life)); g.addColorStop(1,rgba([255,255,246],0));
    ctx.strokeStyle=g; ctx.lineWidth=Math.max(1.4,MIN*0.0028);
    ctx.beginPath(); ctx.moveTo(sh.x,sh.y); ctx.lineTo(sh.x-sh.vx*22, sh.y-sh.vy*22); ctx.stroke();
    ctx.restore();
    spot("wish", sh.x, sh.y, MIN*0.13, ()=>{
      SKYV.wish=1; SKYV.wishGlow=1; SKYV.shoot=null; SKYV.shootT=rnd(9,20);
      sfx.wish(); whisper("You always wished for the same thing, and never told anyone.");
      curiosity+=0.6;
    });
    if (sh.life<=0){ SKYV.shoot=null; SKYV.shootT=rnd(9,22); }
  }
  if (SKYV.wishGlow>0){
    SKYV.wishGlow -= dt*0.35;
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const g=ctx.createRadialGradient(W*0.5,H*0.45,0,W*0.5,H*0.45,MIN*1.1);
    g.addColorStop(0,rgba([255,248,220],SKYV.wishGlow*0.16)); g.addColorStop(1,rgba([255,248,220],0));
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H); ctx.restore();
  }

  // ---- faint stars that answer a tap on apparently empty sky
  for (let i=SKYV.faint.length-1;i>=0;i--){
    const f=SKYV.faint[i]; f.life-=dt*0.5;
    if (f.life<=0){ SKYV.faint.splice(i,1); continue; }
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const a=Math.sin(cl01(f.life)*PI);
    ctx.fillStyle=rgba([210,224,255],a*0.8);
    ctx.beginPath(); ctx.arc(f.x,f.y,MIN*0.0014,0,TAU); ctx.fill();
    const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,MIN*0.02);
    g.addColorStop(0,rgba([210,224,255],a*0.25)); g.addColorStop(1,rgba([210,224,255],0));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(f.x,f.y,MIN*0.02,0,TAU); ctx.fill();
    ctx.restore();
  }

  // ---- the horizon, so the sky has a bottom
  drawLand(t, { upTo: 5 });
  partRole = 2;
  drawParticles(t, AIR.h*0.55, null);
  // sparse dark stems along the bottom, the way every night-sky photograph has
  drawFringe(t, { base: 1.07, a: 0.75 });
}
function starsInteract(g, dt){
  if (P.down && P.active && P.drag>6){
    SKYV.vx += (-P.dx/W)*0.9;
    SKYV.vy += (-P.dy/H)*0.5;
  }
  SKYV.vx*=0.93; SKYV.vy*=0.93;
  SKYV.panX = (SKYV.panX + SKYV.vx*dt*8 + 3)%3;
  SKYV.panY = cl(SKYV.panY + SKYV.vy*dt*8, -0.35, 0.35);
  let lit=0, vis=0;
  for (const st of CONST){ if (st.lit) lit++; if (starVisible(st)) vis++; }
  SKYV.lit = lit;
  if (g==="stars" && lit>=CONST.length) meet("stars");
  // in the revisit, completing means finding the ones that are still there
  if (g==="rstars" && vis>0 && lit>=vis) meet("rstars");
}
function tapStar(x,y){
  let best=null, bd=MIN*0.055;
  for (const st of CONST){
    if (!starVisible(st) || st._sx===undefined) continue;
    const d=Math.hypot(st._sx-x, st._sy-y);
    if (d<bd){ bd=d; best=st; }
  }
  if (best && !best.lit){
    best.lit=true; sfx.chime(pick([784,880,988,1175,1319]));
    ripple(best._sx,best._sy,[255,232,176],MIN*0.07);
    return true;
  }
  if (best) return true;
  // tapped nothing — reward it anyway with a star you couldn't quite see
  if (Math.random()<0.72){
    SKYV.faint.push({ x, y, life:1 });
    if (!FOUND["faint"]){ FOUND["faint"]=true; foundN++; whisper("There are always more than you can see."); }
    sfx.chime(2093);
  }
  return false;
}

/* ============================================================================
   THE HORIZON
   New verb: FOCUS. The lenses follow your hand, but nothing resolves until you
   hold still. Later, holding still stops working, which is the whole point.
   ========================================================================== */
const MARKS = [
  { key:"hills",  L:"hills",   fx:0.16, label:"the far hills",   need:0.34 },
  { key:"tower",  L:"town",    fx:0.505,label:"the water tower",  need:0.20 },
  { key:"school", L:"town",    fx:0.775,label:"your school",      need:0.20 },
  { key:"trees",  L:"poplars", fx:0.37, label:"the poplar row",   need:0.12 },
  { key:"roofs",  L:"roofs",   fx:0.62, label:"the rooftops",     need:0.05 }
];
const LOOK = { fx:0.5, fy:0.5, focus:0, on:null, found:{}, nFound:0, remember:0, hold:0 };
function drawHorizon(t, dt, o){
  o=o||{};
  OUTSIDE_T=1;
  // the naked view, dimmed at the edges
  apFull();
  const s = drawSky();
  const sp = drawSun(t,s);
  drawClouds(s);
  drawLand(t,{});
  const roofBase = AP.hy+ph(LAYER.roofs,LAYER.roofs.y);
  drawWires(t, AP.hy-AP.h*0.08, {});
  drawTrain(); drawCat(t, roofBase-ph(LAYER.roofs,0.032)); drawBirds();
  drawGround(t, AP.hy+AP.h*0.14, {});
  partRole = lerp(0,2,AIR.h);
  drawParticles(t, 0.2+AIR.h*0.8, sp?{x:sp.x,y:sp.y,r:H}:null);
  drawCanopy(t, { a: 0.7 });
  drawFringe(t, { base: 1.05, a: 0.85 });
  if (sp && sp.up>0.02) flare(sp.x, sp.y, 0.42-AIR.h*0.18);

  /* ---- the binoculars ---- */
  LOOK.fx = lerp(LOOK.fx, P.active? cl(P.x/W,0.08,0.92) : 0.5, 0.14);
  LOOK.fy = lerp(LOOK.fy, P.active? cl(P.y/H,0.18,0.80) : 0.5, 0.14);
  const cx = LOOK.fx*W, cy = LOOK.fy*H;
  const R = MIN*(mobile?0.20:0.185), sep = R*0.86;

  // darken outside the lenses (an eyecup, not a black mask)
  ctx.save();
  ctx.fillStyle="rgba(6,9,14,0.55)";
  ctx.beginPath(); ctx.rect(0,0,W,H);
  ctx.arc(cx-sep,cy,R,0,TAU); ctx.arc(cx+sep,cy,R,0,TAU);
  ctx.fill("evenodd");
  ctx.restore();

  // focus rises while you hold still
  const target = cl01(P.still*1.5);
  LOOK.focus = lerp(LOOK.focus, o.canFocus===false ? Math.min(0.30,target) : target, 0.07);

  // what are we pointed at?
  LOOK.on = null;
  for (const m of MARKS){
    const L = LAYER[m.L];
    const x = px(L, m.fx);
    const y = AP.hy + ph(L,L.y) - ph(L, 0.03);
    if (Math.hypot(x-cx, y-cy) < R*0.85){ LOOK.on = m; m._x=x; m._y=y; break; }
  }

  // magnified content inside each lens
  const zoomK = 1 + 2.6*LOOK.focus;
  for (const off of [-sep, sep]){
    const ex=cx+off;
    ctx.save();
    ctx.beginPath(); ctx.arc(ex,cy,R,0,TAU); ctx.clip();
    // re-render the world, zoomed about the aim point
    const oz=CAM.zoom, ox=CAM.x, oy=CAM.y;
    CAM.zoom = zoomK;
    CAM.x = (LOOK.fx-0.5)*1.9;
    CAM.y = (LOOK.fy-0.5)*1.2;
    setAp({ mode:"rect", x:0, y:0, w:W, h:H, hf:0.66 });
    // shift so the aim point lands in the lens centre
    ctx.translate(ex-cx, 0);
    const s2 = drawSky(); drawSun(t,s2); drawClouds(s2);
    drawLand(t,{});
    drawBirds();
    drawGround(t, AP.hy+AP.h*0.14, {});
    // the extra light scattered into the lens by whatever is in the air
    if (AIR.h>0.02){
      ctx.fillStyle=rgba(mixL(airlight(),[255,252,242],0.25), AIR.h*0.42);
      ctx.fillRect(-W,0,W*3,H);
    }
    partRole=2; drawParticles(t, AIR.h*0.85, null);
    CAM.zoom=oz; CAM.x=ox; CAM.y=oy; apFull();
    ctx.restore();

    // the lens itself: a barrel, a bright ring, chromatic edge
    ctx.save();
    const rim = ctx.createRadialGradient(ex,cy,R*0.86, ex,cy,R*1.02);
    rim.addColorStop(0,"rgba(8,11,16,0)"); rim.addColorStop(0.7,"rgba(8,11,16,0.7)"); rim.addColorStop(1,"rgba(8,11,16,1)");
    ctx.fillStyle=rim; ctx.beginPath(); ctx.arc(ex,cy,R*1.03,0,TAU); ctx.fill();
    ctx.strokeStyle="rgba(226,232,240,0.13)"; ctx.lineWidth=Math.max(2,MIN*0.004);
    ctx.beginPath(); ctx.arc(ex,cy,R*0.96,0,TAU); ctx.stroke();
    // a faint flare across the glass
    ctx.globalCompositeOperation="lighter";
    const fl=ctx.createLinearGradient(ex-R,cy-R,ex+R*0.4,cy+R*0.6);
    fl.addColorStop(0,"rgba(255,255,255,0.09)"); fl.addColorStop(0.4,"rgba(255,255,255,0.01)"); fl.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=fl; ctx.beginPath(); ctx.arc(ex,cy,R*0.95,0,TAU); ctx.fill();
    ctx.restore();
  }
  // the bridge between the barrels
  ctx.fillStyle="rgba(8,11,16,0.95)";
  ctx.fillRect(cx-sep*0.5, cy-R*0.14, sep, R*0.28);

  // an identification, once it resolves
  if (LOOK.on){
    const m=LOOK.on;
    const T0 = reads(LAYER[m.L].d) * (1+LOOK.focus*1.4);
    const ok = T0 > m.need*0.5 && LOOK.focus>0.62 && o.canFocus!==false;
    if (ok && !LOOK.found[m.key]){
      LOOK.found[m.key]=true; LOOK.nFound++;
      sfx.chime(pick([784,880,988]));
      ripple(cx, cy, [255,244,214], R*1.2);
      whisper(m.label);
      if (!FOUND["mark-"+m.key]){ FOUND["mark-"+m.key]=true; }
    }
    // a reticle that tightens as it resolves
    ctx.save();
    const rr = R*(0.42 - LOOK.focus*0.22);
    ctx.strokeStyle=rgba([255,248,230], 0.10+LOOK.focus*0.26);
    ctx.lineWidth=1;
    for (const off of [-sep,sep]){
      ctx.beginPath(); ctx.arc(cx+off, cy, rr, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  // focus meter, drawn as a thin arc under the barrels — no words
  if (LOOK.focus>0.03){
    ctx.save();
    ctx.strokeStyle=rgba([255,250,236], 0.22);
    ctx.lineWidth=Math.max(1.6,MIN*0.003); ctx.lineCap="round";
    ctx.beginPath(); ctx.arc(cx, cy, R*1.24, PI*0.30, PI*0.30+PI*0.40*LOOK.focus); ctx.stroke();
    ctx.restore();
  }
}
function horizonInteract(g, dt){
  if (g==="find" && LOOK.nFound>=3) meet("find");
  if (g==="rfind"){
    // later: holding still no longer resolves anything. What you can do is
    // hold, and remember. That is the gate.
    if (P.down) LOOK.hold += dt; else LOOK.hold = Math.max(0, LOOK.hold-dt*0.5);
    LOOK.remember = lerp(LOOK.remember, cl01(LOOK.hold/1.5), 0.08);
    if (LOOK.remember>0.75) meet("rfind");
  }
}

/* ============================================================================
   THE DRAWING
   It opens ALREADY BLUE — a sky gone over so many times the wax has a shine on
   it, out past the edge of the paper. Nothing to fill in from scratch. What the
   visitor does is go over it again, the way you would.
   ========================================================================== */
const PW = 1200, PH = 880;
function crayon(c, x0,y0,x1,y1, col, wd, a, jitter){
  const steps = Math.max(2, Math.ceil(Math.hypot(x1-x0,y1-y0)/5));
  c.lineCap="round";
  for (let pass=0; pass<2; pass++){
    c.beginPath();
    for (let i=0;i<=steps;i++){
      const f=i/steps;
      const jx = (hash(i*3.1+x0*0.07+pass*9)-0.5)*(jitter||2.4);
      const jy = (hash(i*5.7+y0*0.09+pass*4)-0.5)*(jitter||2.4);
      const x = lerp(x0,x1,f)+jx, y = lerp(y0,y1,f)+jy;
      if (i===0) c.moveTo(x,y); else c.lineTo(x,y);
    }
    c.strokeStyle = rgba(col, a*(pass?0.5:1));
    c.lineWidth = wd*(pass?0.55:1);
    c.stroke();
  }
  // the grain a crayon leaves: wax catching on the tooth of the paper
  const n = Math.ceil(Math.hypot(x1-x0,y1-y0)/3.5);
  for (let i=0;i<n;i++){
    const f=i/n;
    const x=lerp(x0,x1,f)+(Math.random()-0.5)*wd*1.5;
    const y=lerp(y0,y1,f)+(Math.random()-0.5)*wd*1.5;
    c.fillStyle=rgba(col, a*rnd(0.15,0.5));
    c.fillRect(x, y, rnd(0.7,2.2), rnd(0.7,2.2));
  }
}
function buildPaper(){
  if (paperBuilt) return;
  PAPER.width=PW; PAPER.height=PH; paperW=PW; paperH=PH;
  _sd = 4417;
  const c = pc;
  c.clearRect(0,0,PW,PH);

  /* --- the paper: cheap sugar paper, warm, with fibre and foxing --- */
  const pg=c.createLinearGradient(0,0,PW,PH);
  pg.addColorStop(0,"#f3ecd6"); pg.addColorStop(0.5,"#efe7cd"); pg.addColorStop(1,"#e9dfc2");
  c.fillStyle=pg; c.fillRect(0,0,PW,PH);
  for (let i=0;i<2600;i++){
    c.fillStyle=`rgba(${140+sr(0,60)|0},${120+sr(0,50)|0},${86+sr(0,40)|0},${sr(0.02,0.09)})`;
    c.fillRect(sr(0,PW), sr(0,PH), sr(1,7), sr(0.6,1.6));
  }
  // age spots
  for (let i=0;i<26;i++){
    const x=sr(0,PW), y=sr(0,PH), r=sr(6,30);
    const g=c.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,"rgba(176,146,88,0.10)"); g.addColorStop(1,"rgba(176,146,88,0)");
    c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,TAU); c.fill();
  }

  /* --- THE SKY. This is the whole point. A child filling in blue, hard, for a
         long time, over the lines, off the edge of the paper, pressing harder
         in some places than others, and never stopping to be neat. --- */
  const BL = [ [30,92,196], [40,108,206], [22,78,182], [52,122,214], [36,100,200] ];
  const skyBottom = PH*0.615;
  // pass 1: broad diagonal fill, going off both edges
  for (let i=0;i<300;i++){
    const y = sr(-30, skyBottom+34);
    const x = sr(-90, PW+50);
    const len = sr(70, 320);
    const ang = sr(-0.16, 0.16);
    crayon(c, x, y, x+len*Math.cos(ang), y+len*Math.sin(ang),
           BL[(sr(0,BL.length))|0], sr(13,26), sr(0.30,0.62), 3.0);
  }
  // pass 2: shorter cross-hatching, the way you fill in a corner
  for (let i=0;i<190;i++){
    const y = sr(-20, skyBottom+20);
    const x = sr(-60, PW+40);
    const len = sr(34, 130);
    const ang = sr(1.1, 2.0);
    crayon(c, x, y, x+len*Math.cos(ang), y+len*Math.sin(ang),
           BL[(sr(0,BL.length))|0], sr(11,20), sr(0.22,0.46), 2.6);
  }
  // pass 3: the places gone over again and again — a waxy shine
  for (let k=0;k<7;k++){
    const cx0=sr(0,PW), cy0=sr(0,skyBottom*0.8);
    for (let i=0;i<44;i++){
      const y=cy0+sr(-70,70), x=cx0+sr(-130,130);
      crayon(c, x,y, x+sr(60,190), y+sr(-14,14), [20,72,178], sr(15,24), sr(0.34,0.6), 2.2);
    }
  }
  // a wax sheen over the most worked areas
  c.save(); c.globalCompositeOperation="lighter";
  for (let i=0;i<50;i++){
    const x=sr(0,PW), y=sr(0,skyBottom), r=sr(30,110);
    const g=c.createRadialGradient(x-r*0.3,y-r*0.3,0,x,y,r);
    g.addColorStop(0,"rgba(180,214,255,0.07)"); g.addColorStop(1,"rgba(180,214,255,0)");
    c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,TAU); c.fill();
  }
  c.restore();
  // the ragged bottom edge of the sky, where the child stopped
  for (let x=-40;x<PW+40;x+=16){
    const yb = skyBottom + Math.sin(x*0.013)*22 + fbm(x*0.02,2)*26;
    crayon(c, x, yb-sr(0,26), x+sr(20,60), yb+sr(-8,16), BL[(sr(0,BL.length))|0], sr(10,20), sr(0.2,0.44), 3);
  }

  /* --- clouds: scrubbed back to something near the paper colour with a white
         crayon, the way a child does it, then gone round in white --- */
  const PAPER_C = [240,232,208];
  const clouds=[[0.20,0.16,1.0],[0.62,0.10,0.72],[0.83,0.245,0.55]];
  for (const cd of clouds){
    const cx0=cd[0]*PW, cy0=cd[1]*PH, cs=cd[2];
    // white crayon over the blue: it never fully covers, which is the point
    for (let i=0;i<70;i++){
      const a2=sr(0,TAU), rr=sr(0,86*cs)*Math.sqrt(srnd());
      const x=cx0+Math.cos(a2)*rr, y=cy0+Math.sin(a2)*rr*0.50;
      crayon(c, x-sr(20,54)*cs, y, x+sr(20,54)*cs, y+sr(-7,7),
             mixL([255,255,255],PAPER_C,sr(0,0.5)), sr(15,26)*cs, sr(0.34,0.62), 2.6);
    }
    // then round the outside in white, twice, not quite meeting up
    for (let k=0;k<2;k++){
      let px0=cx0-95*cs, py0=cy0+16*cs;
      for (let i=1;i<=9;i++){
        const f=i/9;
        const nx=cx0-95*cs+f*190*cs, ny=cy0+16*cs-Math.sin(f*PI)*54*cs+sr(-6,6);
        crayon(c, px0,py0,nx,ny, [255,255,255], sr(8,13), 0.72, 2.4);
        px0=nx; py0=ny;
      }
      crayon(c, cx0-92*cs, cy0+16*cs, cx0+88*cs, cy0+16*cs, [255,255,255], 10, 0.6, 3);
    }
  }

  /* --- the sun: yellow, gone over hard, with rays --- */
  const sx0=PW*0.845, sy0=PH*0.135, sr0=88;
  for (let k=0;k<26;k++){
    const a2=sr(0,TAU);
    crayon(c, sx0+Math.cos(a2)*sr(0,sr0*0.9), sy0+Math.sin(a2)*sr(0,sr0*0.9),
              sx0+Math.cos(a2+1.6)*sr(0,sr0*0.9), sy0+Math.sin(a2+1.6)*sr(0,sr0*0.9),
              [246,196,44], sr(18,30), sr(0.4,0.75), 3);
  }
  for (let k=0;k<11;k++){
    const a2=k/11*TAU+0.2;
    crayon(c, sx0+Math.cos(a2)*sr0*1.06, sy0+Math.sin(a2)*sr0*1.06,
              sx0+Math.cos(a2)*sr0*(1.42+sr(0,0.3)), sy0+Math.sin(a2)*sr0*(1.42+sr(0,0.3)),
              [242,178,36], sr(9,15), 0.8, 3.4);
  }

  /* --- birds: three v's, one bigger than the others --- */
  for (const b of [[0.40,0.20,1],[0.47,0.165,0.75],[0.53,0.215,0.62]]){
    const bx0=b[0]*PW, by0=b[1]*PH, bs=b[2]*30;
    crayon(c, bx0-bs,by0, bx0,by0-bs*0.6, [58,54,66], 7, 0.85, 2);
    crayon(c, bx0,by0-bs*0.6, bx0+bs,by0, [58,54,66], 7, 0.85, 2);
  }

  /* --- the grass: not a green rectangle. Blades. --- */
  const gTop = PH*0.66;
  const GR=[[104,150,52],[86,132,44],[124,164,58],[70,116,40]];
  for (let i=0;i<230;i++){
    const x=sr(-30,PW+30), y=sr(gTop-24,PH+20);
    crayon(c, x,y, x+sr(-40,40), y+sr(30,90), GR[(sr(0,GR.length))|0], sr(12,24), sr(0.3,0.6), 3);
  }
  for (let i=0;i<300;i++){
    const x=sr(-20,PW+20), y=sr(gTop, PH);
    crayon(c, x,y+sr(10,40), x+sr(-14,14), y-sr(18,52), GR[(sr(0,GR.length))|0], sr(4,9), sr(0.45,0.85), 1.6);
  }
  // a path up to the front door, scribbled in grey-brown, not erased
  for (let i=0;i<64;i++){
    const f=i/64;
    const x=lerp(PW*0.52,PW*0.30,f), y=lerp(PH+10,PH*0.70,f);
    const wd=lerp(60,20,f);
    crayon(c, x-wd, y+sr(-8,8), x+wd, y+sr(-8,8),
           mixL([206,190,158],[176,158,124],srnd()), sr(14,22), sr(0.34,0.6), 2.6);
  }

  /* --- flowers along the bottom --- */
  for (let i=0;i<11;i++){
    const fx0=sr(30,PW-30), fy0=sr(PH*0.84,PH-30);
    crayon(c, fx0,fy0+40, fx0+sr(-6,6),fy0, [70,120,40], 7, 0.85, 1.6);
    const fc = pick([[224,86,116],[248,196,60],[226,120,190],[240,140,60]]);
    for (let k=0;k<5;k++){
      const a2=k/5*TAU;
      crayon(c, fx0,fy0, fx0+Math.cos(a2)*15, fy0+Math.sin(a2)*15, fc, 11, 0.9, 1.6);
    }
  }

  /* --- the house: a square, a triangle, a chimney with smoke --- */
  const hx0=PW*0.235, hy0=PH*0.50, hw0=250, hh0=200;
  // walls, scribbled in
  for (let i=0;i<60;i++){
    const y=hy0+sr(0,hh0);
    crayon(c, hx0+sr(-8,8), y, hx0+hw0+sr(-8,8), y+sr(-6,6), [206,148,102], sr(13,22), sr(0.3,0.6), 2.4);
  }
  // outline
  crayon(c, hx0,hy0, hx0+hw0,hy0, [128,74,44], 9, 0.9, 3);
  crayon(c, hx0,hy0, hx0,hy0+hh0, [128,74,44], 9, 0.9, 3);
  crayon(c, hx0+hw0,hy0, hx0+hw0,hy0+hh0, [128,74,44], 9, 0.9, 3);
  crayon(c, hx0,hy0+hh0, hx0+hw0,hy0+hh0, [128,74,44], 9, 0.9, 3);
  // roof, overshooting on both sides
  for (let i=0;i<42;i++){
    const f=sr(0,1);
    crayon(c, lerp(hx0-34,hx0+hw0/2,f), lerp(hy0+4,hy0-96,f),
              lerp(hx0+hw0/2,hx0+hw0+34,f), lerp(hy0-96,hy0+4,f), [186,72,54], sr(12,20), sr(0.35,0.62), 2.6);
  }
  crayon(c, hx0-34,hy0+4, hx0+hw0/2,hy0-98, [150,52,40], 10, 0.9, 3);
  crayon(c, hx0+hw0/2,hy0-98, hx0+hw0+34,hy0+4, [150,52,40], 10, 0.9, 3);
  // door + two windows with crosses
  for (let i=0;i<16;i++) crayon(c, hx0+hw0*0.42, hy0+hh0-sr(0,86), hx0+hw0*0.58, hy0+hh0-sr(0,86), [128,74,44], 14, 0.5, 2);
  crayon(c, hx0+hw0*0.40,hy0+hh0-88, hx0+hw0*0.60,hy0+hh0-88, [96,54,32], 8, 0.9, 2);
  crayon(c, hx0+hw0*0.40,hy0+hh0-88, hx0+hw0*0.40,hy0+hh0, [96,54,32], 8, 0.9, 2);
  crayon(c, hx0+hw0*0.60,hy0+hh0-88, hx0+hw0*0.60,hy0+hh0, [96,54,32], 8, 0.9, 2);
  c.fillStyle="rgba(60,40,24,0.8)"; c.beginPath(); c.arc(hx0+hw0*0.565, hy0+hh0-44, 6,0,TAU); c.fill();
  for (const wx of [hx0+hw0*0.16, hx0+hw0*0.80]){
    for (let i=0;i<12;i++) crayon(c, wx-32,hy0+22+sr(0,58), wx+32,hy0+22+sr(0,58), [128,192,226], 12, 0.45, 2);
    crayon(c, wx-32,hy0+22, wx+32,hy0+22, [70,110,150], 7, 0.9, 2);
    crayon(c, wx-32,hy0+80, wx+32,hy0+80, [70,110,150], 7, 0.9, 2);
    crayon(c, wx-32,hy0+22, wx-32,hy0+80, [70,110,150], 7, 0.9, 2);
    crayon(c, wx+32,hy0+22, wx+32,hy0+80, [70,110,150], 7, 0.9, 2);
    crayon(c, wx,hy0+22, wx,hy0+80, [70,110,150], 6, 0.85, 2);
    crayon(c, wx-32,hy0+51, wx+32,hy0+51, [70,110,150], 6, 0.85, 2);
  }
  // chimney + smoke, a spiral
  crayon(c, hx0+hw0*0.74,hy0-58, hx0+hw0*0.74,hy0-120, [150,52,40], 20, 0.85, 2.4);
  crayon(c, hx0+hw0*0.86,hy0-30, hx0+hw0*0.86,hy0-112, [150,52,40], 20, 0.85, 2.4);
  crayon(c, hx0+hw0*0.74,hy0-120, hx0+hw0*0.86,hy0-112, [150,52,40], 18, 0.85, 2.4);
  let smx=hx0+hw0*0.80, smy=hy0-124;
  for (let i=0;i<5;i++){
    const rr=16+i*8;
    for (let k=0;k<10;k++){
      const a0=k/10*TAU, a1=(k+1)/10*TAU;
      crayon(c, smx+Math.cos(a0)*rr, smy+Math.sin(a0)*rr*0.7,
                smx+Math.cos(a1)*rr, smy+Math.sin(a1)*rr*0.7, [180,180,186], 6, 0.4, 2);
    }
    smy -= 22; smx += 8;
  }

  /* --- the family: three figures and a cat, all the same height ish --- */
  function stick(x,y,h,col,skirt){
    crayon(c, x,y-h*0.72, x,y-h*0.28, col, 8, 0.9, 2);        // body
    for (let k=0;k<16;k++) crayon(c, x-h*0.16,y-h*0.66+sr(-6,6), x+h*0.16,y-h*0.66+sr(-6,6), col, 6, 0.25, 2);
    crayon(c, x,y-h*0.62, x-h*0.20,y-h*0.44, col, 7, 0.9, 2); // arms
    crayon(c, x,y-h*0.62, x+h*0.20,y-h*0.44, col, 7, 0.9, 2);
    if (skirt){
      crayon(c, x,y-h*0.30, x-h*0.19,y, col, 8, 0.9, 2);
      crayon(c, x,y-h*0.30, x+h*0.19,y, col, 8, 0.9, 2);
      crayon(c, x-h*0.19,y, x+h*0.19,y, col, 8, 0.9, 2);
      for (let k=0;k<12;k++) crayon(c, x-h*0.15+sr(0,h*0.3),y-h*0.05, x-h*0.10+sr(0,h*0.24),y-h*0.24, col, 7, 0.3, 2);
    } else {
      crayon(c, x,y-h*0.28, x-h*0.11,y, col, 7, 0.9, 2);
      crayon(c, x,y-h*0.28, x+h*0.11,y, col, 7, 0.9, 2);
    }
    // head, and hair scribbled on
    for (let k=0;k<14;k++){ const a2=sr(0,TAU);
      crayon(c, x+Math.cos(a2)*sr(0,h*0.12), y-h*0.84+Math.sin(a2)*sr(0,h*0.12),
                x+Math.cos(a2+2)*sr(0,h*0.12), y-h*0.84+Math.sin(a2+2)*sr(0,h*0.12), [240,196,150], 12, 0.5, 2); }
    for (let k=0;k<11;k++){ const a2=sr(PI*0.95,PI*2.05);
      crayon(c, x+Math.cos(a2)*h*0.12, y-h*0.84+Math.sin(a2)*h*0.12,
                x+Math.cos(a2)*h*0.17, y-h*0.84+Math.sin(a2)*h*0.17, [72,52,40], 8, 0.8, 2); }
    crayon(c, x-h*0.05,y-h*0.86, x-h*0.03,y-h*0.86, [50,44,40], 5, 0.95, 1);
    crayon(c, x+h*0.03,y-h*0.86, x+h*0.05,y-h*0.86, [50,44,40], 5, 0.95, 1);
    // a smile that is much too wide
    for (let k=0;k<7;k++){ const f=k/6;
      crayon(c, x-h*0.07+f*h*0.14, y-h*0.79-Math.sin(f*PI)*h*0.02,
                x-h*0.07+(f+0.17)*h*0.14, y-h*0.79-Math.sin((f+0.17)*PI)*h*0.02, [190,70,70], 5, 0.9, 1); }
  }
  stick(PW*0.545, PH*0.885, 210, [86,110,180], true);      // her
  stick(PW*0.645, PH*0.900, 155, [200,90,110], false);     // you, smaller
  stick(PW*0.720, PH*0.885, 200, [90,120,90], false);
  // the cat, at knee height
  crayon(c, PW*0.79,PH*0.895, PW*0.83,PH*0.895, [90,84,86], 16, 0.85, 2);
  crayon(c, PW*0.835,PH*0.885, PW*0.845,PH*0.870, [90,84,86], 12, 0.85, 2);
  crayon(c, PW*0.785,PH*0.888, PW*0.775,PH*0.862, [90,84,86], 9, 0.85, 2);

  /* --- handwriting, bottom left, in the wrong direction slightly --- */
  c.save();
  c.translate(PW*0.055, PH*0.945); c.rotate(-0.035);
  c.strokeStyle="rgba(64,58,72,0.88)"; c.lineWidth=6; c.lineCap="round"; c.lineJoin="round";
  const strokes=[
    // f
    [[0,0],[0,-34],[6,-42],[13,-38]], [[-7,-20],[10,-20]],
    // o
    [[22,-14],[30,-20],[38,-14],[36,-3],[27,0],[21,-6],[22,-14]],
    // r
    [[48,0],[50,-22]], [[50,-15],[57,-22],[63,-19]],
    // m
    [[86,0],[88,-22]], [[88,-16],[95,-22],[99,-14],[100,0]], [[100,-14],[107,-22],[112,-14],[112,0]],
    // u
    [[122,-22],[122,-6],[129,0],[135,-8],[136,-22]], [[136,-8],[137,0]],
    // m
    [[147,0],[149,-22]], [[149,-16],[156,-22],[160,-14],[161,0]], [[161,-14],[168,-22],[173,-14],[173,0]]
  ];
  for (const st of strokes){
    c.beginPath();
    for (let i=0;i<st.length;i++){ const p=st[i]; if(i===0)c.moveTo(p[0],p[1]); else c.lineTo(p[0],p[1]); }
    c.stroke();
  }
  c.restore();

  /* --- creases and a coffee ring, because it was on a fridge for years --- */
  c.save();
  c.strokeStyle="rgba(120,104,72,0.16)"; c.lineWidth=3;
  c.beginPath(); c.moveTo(PW*0.5+8,0); c.lineTo(PW*0.5-6,PH); c.stroke();
  c.strokeStyle="rgba(255,255,255,0.22)"; c.lineWidth=2;
  c.beginPath(); c.moveTo(PW*0.5+11,0); c.lineTo(PW*0.5-3,PH); c.stroke();
  c.strokeStyle="rgba(120,104,72,0.10)"; c.lineWidth=3;
  c.beginPath(); c.moveTo(0,PH*0.47); c.lineTo(PW,PH*0.44); c.stroke();
  // ring
  c.strokeStyle="rgba(150,110,60,0.13)"; c.lineWidth=7;
  c.beginPath(); c.arc(PW*0.72,PH*0.60,52,0.3,TAU-0.4); c.stroke();
  // pinholes in the corners
  for (const p of [[26,26],[PW-26,30],[30,PH-28],[PW-30,PH-24]]){
    c.fillStyle="rgba(90,74,50,0.30)"; c.beginPath(); c.arc(p[0],p[1],4,0,TAU); c.fill();
    c.fillStyle="rgba(255,255,255,0.3)"; c.beginPath(); c.arc(p[0]-1,p[1]-1,2,0,TAU); c.fill();
  }
  c.restore();

  paperBuilt = true;
}

/* the drawing on screen: fills the frame like a thing on a table under a lamp */
const DRAW = { bleach:0, strokes:0, sunTouched:0, lastX:0, lastY:0, on:false, greyCrayon:0 };
function paperRect(){
  const m = MIN*0.055;
  let w = W-m*2, h = w*(PH/PW);
  if (h > H-m*2){ h = H-m*2; w = h*(PW/PH); }
  return { x:(W-w)/2, y:(H-h)/2, w, h };
}
function drawDrawing(t, o){
  o=o||{};
  buildPaper();
  const r = paperRect();
  // the table it is lying on
  const tg=ctx.createLinearGradient(0,0,0,H);
  tg.addColorStop(0,"#3a2c22"); tg.addColorStop(0.5,"#4a382a"); tg.addColorStop(1,"#2e231c");
  ctx.fillStyle=tg; ctx.fillRect(0,0,W,H);
  for (let i=0;i<16;i++){
    ctx.strokeStyle="rgba(20,14,10,0.20)"; ctx.lineWidth=Math.max(1,MIN*0.002);
    ctx.beginPath(); ctx.moveTo(0, H*i/16+Math.sin(i)*4); ctx.lineTo(W, H*i/16+Math.sin(i+1)*4); ctx.stroke();
  }
  // lamp light falling on it
  ctx.save(); ctx.globalCompositeOperation="lighter";
  const lg=ctx.createRadialGradient(W*0.42,H*0.28,0,W*0.42,H*0.34,MIN*1.1);
  lg.addColorStop(0,"rgba(255,236,196,0.20)"); lg.addColorStop(0.5,"rgba(255,230,180,0.07)"); lg.addColorStop(1,"rgba(255,230,180,0)");
  ctx.fillStyle=lg; ctx.fillRect(0,0,W,H); ctx.restore();
  // its shadow, and a slight lift at one corner
  ctx.save();
  ctx.translate(r.x+r.w/2, r.y+r.h/2); ctx.rotate(-0.008);
  ctx.fillStyle="rgba(0,0,0,0.42)";
  ctx.fillRect(-r.w/2+MIN*0.012, -r.h/2+MIN*0.016, r.w, r.h);
  ctx.restore();

  ctx.save();
  ctx.translate(r.x+r.w/2, r.y+r.h/2); ctx.rotate(-0.008); ctx.translate(-r.w/2,-r.h/2);
  ctx.drawImage(PAPER, 0,0, r.w, r.h);

  /* --- bleaching: the pigment gives up. It does NOT go grey — it goes pale
         blue, then the colour of the sky outside, which is worse. --- */
  const b = DRAW.bleach;
  if (b>0.005){
    // lift the saturation out
    ctx.save();
    ctx.globalCompositeOperation="saturation";
    ctx.fillStyle=rgba([128,128,128], b*0.62);
    ctx.fillRect(0,0,r.w,r.h);
    ctx.restore();
    // then wash it toward the actual outside sky colour
    ctx.save();
    ctx.globalCompositeOperation="source-atop";
    const target = mixL(airlight(), [226,224,214], 0.4);
    ctx.fillStyle=rgba(target, b*0.46);
    ctx.fillRect(0,0,r.w,r.h);
    ctx.restore();
    // dust in the tooth of the paper
    drawGrime(0,0,r.w,r.h, b*0.5);
    // and the light on it gets flatter
    ctx.fillStyle=rgba([210,206,196], b*0.14); ctx.fillRect(0,0,r.w,r.h);
  }
  ctx.restore();

  /* --- the crayons on the table --- */
  const cr = [
    { col:[34,96,200], name:"blue",   x:0.16, worn:0.72 },
    { col:[238,192,44], name:"yellow",x:0.24, worn:0.3 },
    { col:[92,148,56],  name:"green", x:0.32, worn:0.35 },
    { col:[204,72,72],  name:"red",   x:0.40, worn:0.2 }
  ];
  if (DRAW.greyCrayon>0.02) cr.push({ col:[150,162,172], name:"pale", x:0.48, worn:0.05, ghost:DRAW.greyCrayon });
  for (const c2 of cr){
    const cx2 = W*c2.x, cy2 = H*0.945, len=MIN*0.10*(1-c2.worn*0.45);
    ctx.save();
    ctx.globalAlpha = c2.ghost!==undefined ? c2.ghost : 1;
    ctx.translate(cx2, cy2); ctx.rotate(-0.22+ (c2.name==="blue"?0.1:0));
    groundShadow(0, len*0.5, MIN*0.03, MIN*0.008, 0.4);
    // paper sleeve
    ctx.fillStyle=rgb(shade(c2.col,0.9)); ctx.fillRect(-MIN*0.011, -len*0.5, MIN*0.022, len*0.72);
    ctx.fillStyle="rgba(255,255,255,0.20)"; ctx.fillRect(-MIN*0.011,-len*0.34, MIN*0.022, MIN*0.008);
    ctx.fillStyle="rgba(0,0,0,0.14)"; ctx.fillRect(MIN*0.005,-len*0.5, MIN*0.006, len*0.72);
    // the wax tip, blunted from use
    ctx.fillStyle=rgb(c2.col);
    ctx.beginPath();
    ctx.moveTo(-MIN*0.011, len*0.22); ctx.lineTo(MIN*0.011, len*0.22);
    ctx.lineTo(MIN*0.005, len*0.44); ctx.lineTo(-MIN*0.005, len*0.44); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (c2.name==="blue"){
      spot("crayon-blue", cx2, cy2, MIN*0.07, ()=>{
        whisper("Worn right down. It was the one that ran out first.");
        ripple(cx2,cy2,[52,120,210],MIN*0.12); sfx.crayon(); curiosity+=0.4;
      });
    }
  }

  // touching the drawn sun makes it glow, because of course it should
  DRAW.sunTouched = Math.max(0, DRAW.sunTouched-0.01);
  const dsx = r.x+r.w*0.845, dsy = r.y+r.h*0.135;
  if (DRAW.sunTouched>0){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const g=ctx.createRadialGradient(dsx,dsy,0,dsx,dsy,MIN*0.22);
    g.addColorStop(0,rgba([255,226,120],DRAW.sunTouched*0.4)); g.addColorStop(1,rgba([255,226,120],0));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(dsx,dsy,MIN*0.22,0,TAU); ctx.fill(); ctx.restore();
  }
  spot("paper-sun", dsx, dsy, MIN*0.075, ()=>{
    DRAW.sunTouched=1; sfx.chime(1319); curiosity+=0.4;
  }, false);
  spot("for-mum", r.x+r.w*0.10, r.y+r.h*0.945, MIN*0.09, ()=>{
    whisper("You could barely write. She kept it anyway.");
    sfx.paper(); curiosity+=0.5;
  });

  // crayon dust that has come off the page over the years
  if (b>0.1){
    partRole = lerp(1, 2, cl01((b-0.2)/0.7));
    drawParticles(t, b*0.6, { x:W*0.42, y:H*0.30, r:MIN*1.0 });
  }
}
/* going over the sky again with the blue crayon */
function crayonDown(x,y){
  DRAW.on=true; DRAW.lastX=x; DRAW.lastY=y; crayonTo(x,y);
}
function crayonTo(x,y){
  const r = paperRect();
  const px2 = (x-r.x)/r.w*PW, py2=(y-r.y)/r.h*PH;
  const qx = (DRAW.lastX-r.x)/r.w*PW, qy=(DRAW.lastY-r.y)/r.h*PH;
  if (px2<-40||px2>PW+40||py2<-40||py2>PH+40){ DRAW.lastX=x; DRAW.lastY=y; return; }
  const col = DRAW.bleach>0.5 ? mixL([34,96,200],[150,162,172], cl01((DRAW.bleach-0.5)*1.6)) : [34,96,200];
  crayon(pc, qx,qy, px2,py2, col, rnd(20,30), 0.6, 3);
  // going over it also lifts the wash back off
  pc.save(); pc.globalCompositeOperation="destination-out"; pc.restore();
  DRAW.lastX=x; DRAW.lastY=y;
  DRAW.strokes += Math.hypot(px2-qx,py2-qy)/PW;
  if (Math.random()<0.35) sfx.crayon();
}
function drawingInteract(g){
  if (g==="colour" && DRAW.strokes>0.55) meet("colour");
}
