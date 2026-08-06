/* ============================================================================
   CHAPTER THREE — THE CHANGE IS ALMOST INVISIBLE
   No new scenes here. The same places, the same actions, a different air. The
   one new verb is HOLD TO REMEMBER: press and a circle of the old atmosphere
   opens under your hand. Because every layer of this world reads its colour
   from a single air value, the hills simply come back inside that circle. You
   are not shown a photograph of the past. You are shown this place, breathing
   the air it used to.
   ========================================================================== */
const PAST = { pm:6, glow:0.05 };

function pastLens(t, x, y, r, a, extra){
  if (a<0.01 || r<2) return;
  const pm0=AIR.pm, g0=AIR.glow;
  ctx.save();
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.clip();
  ctx.globalAlpha = a;
  AIR.pm = PAST.pm; AIR.glow = PAST.glow; updateAir();
  const s = drawSky();
  drawSun(t,s);
  drawMoon(t);
  drawClouds(s);
  drawLand(t,{});
  if (extra) extra(t,s);
  AIR.pm = pm0; AIR.glow = g0; updateAir();
  ctx.restore();
  // the rim of the circle: a soft bright edge, like looking through water
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const rg=ctx.createRadialGradient(x,y,r*0.80,x,y,r*1.06);
  rg.addColorStop(0,"rgba(255,250,232,0)");
  rg.addColorStop(0.6,rgba([255,250,232], a*0.16));
  rg.addColorStop(1,"rgba(255,250,232,0)");
  ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(x,y,r*1.06,0,TAU); ctx.fill();
  ctx.restore();
}
/* the lens grows while you hold and shrinks when you let go — so letting go is
   itself an action with a cost */
const LENS = { r:0, a:0 };
function updLens(dt, allowed){
  const want = (allowed && P.down && P.active) ? 1 : 0;
  LENS.a = lerp(LENS.a, want, want ? 0.09 : 0.045);
  LENS.r = lerp(LENS.r, want ? MIN*0.34 : 0, want ? 0.07 : 0.05);
  if (want && LENS.a>0.5 && !FOUND["lens"]){
    FOUND["lens"]=true; foundN++;
    whisper("It is all still there. It is just not visible from here.");
    sfx.found();
  }
}

/* ============================================================================
   CHAPTER FOUR — HABITS CHANGE BEFORE ANYONE NAMES THE CAUSE
   New verb: CARRY. Nobody explains anything. You are simply asked to help take
   the washing in, and you do it, one sheet at a time, until the line is empty.
   That is the whole chapter. It is the saddest thing in the work and it never
   says a word about pollution.
   ========================================================================== */
const IN = { held:null, carried:0, basket:0, sheets:[], doorGlow:0, lastDrop:0 };
function buildIndoors(){
  IN.sheets.length=0;
  const cols=[[248,246,240],[224,232,244],[246,228,226],[232,242,232],[250,244,220]];
  for (let i=0;i<5;i++)
    IN.sheets.push({ u:0.20+i*0.145, w:0.115, h:0.30, col:cols[i], ph:i*1.7, seed:i*23, gone:0, x:0, y:0 });
  IN.carried=0; IN.held=null;
}
function drawIndoors(t, dt){
  OUTSIDE_T = 0.55;
  apFull();
  const s = drawSky();
  const sp = drawSun(t,s);
  drawClouds(s);
  drawLand(t,{});
  const roofBase = AP.hy+ph(LAYER.roofs,LAYER.roofs.y);
  drawWires(t, AP.hy-AP.h*0.10, {});
  drawCat(t, roofBase-ph(LAYER.roofs,0.032));
  drawBirds();

  const groundY = AP.hy+AP.h*0.12;
  drawGround(t, groundY, { dust:0.55 });
  drawBugs(t, 0.4);

  // ---- the back door of the house, on the right. A warm rectangle. The inside.
  const dx=W*0.80, dy=groundY-MIN*0.20, dw=MIN*0.17, dh=MIN*0.24;
  ctx.fillStyle=rgb(farColour([150,124,102], 14));
  ctx.fillRect(dx-MIN*0.02, dy-MIN*0.02, dw+MIN*0.04, dh+MIN*0.02);
  const dg=ctx.createLinearGradient(dx,dy,dx,dy+dh);
  const warmth = 0.55 + IN.doorGlow*0.45;
  dg.addColorStop(0, rgba([70,48,34], 1));
  dg.addColorStop(0.35, rgba(mixL([120,80,50],[255,212,150], warmth*0.5), 1));
  dg.addColorStop(1, rgba(mixL([90,62,42],[255,224,170], warmth*0.7), 1));
  ctx.fillStyle=dg; ctx.fillRect(dx,dy,dw,dh);
  // the light spilling out onto the grass
  ctx.save(); ctx.globalCompositeOperation="lighter";
  const spill=ctx.createLinearGradient(dx,dy+dh,dx-MIN*0.05,dy+dh+MIN*0.12);
  spill.addColorStop(0,rgba([255,214,150],0.24*warmth)); spill.addColorStop(1,rgba([255,214,150],0));
  ctx.fillStyle=spill;
  ctx.beginPath(); ctx.moveTo(dx,dy+dh); ctx.lineTo(dx+dw,dy+dh);
  ctx.lineTo(dx+dw+MIN*0.05,dy+dh+MIN*0.13); ctx.lineTo(dx-MIN*0.06,dy+dh+MIN*0.13); ctx.closePath(); ctx.fill();
  ctx.restore();
  IN.doorGlow = lerp(IN.doorGlow, IN.held?1:0.25, 0.05);

  // the basket by the door, filling up
  const bkx=dx-MIN*0.08, bky=groundY+MIN*0.03;
  ctx.fillStyle=rgb(farColour([166,128,78],14));
  ctx.beginPath(); ctx.moveTo(bkx-MIN*0.048,bky-MIN*0.044);
  ctx.lineTo(bkx+MIN*0.048,bky-MIN*0.044); ctx.lineTo(bkx+MIN*0.038,bky); ctx.lineTo(bkx-MIN*0.038,bky);
  ctx.closePath(); ctx.fill();
  // the folded washing inside it
  for (let i=0;i<IN.carried;i++){
    const sh=IN.sheets[i];
    ctx.fillStyle=rgb(mixL(farColour(sh.col,14),[170,164,152],0.3));
    ctx.fillRect(bkx-MIN*0.040+((i%2)*MIN*0.004), bky-MIN*0.050-i*MIN*0.009, MIN*0.080, MIN*0.010);
  }
  ctx.strokeStyle=rgba([120,90,52],0.55); ctx.lineWidth=1;
  for (let i=1;i<4;i++){ const yy=bky-MIN*0.044+i*MIN*0.011;
    ctx.beginPath(); ctx.moveTo(bkx-MIN*0.046,yy); ctx.lineTo(bkx+MIN*0.046,yy); ctx.stroke(); }

  // ---- the line
  const lineY = AP.y+AP.h*0.22;
  ctx.strokeStyle=rgba(farColour([58,48,42],26),0.85);
  ctx.lineWidth=Math.max(1.4,MIN*0.0026);
  ctx.beginPath();
  for (let i=0;i<=26;i++){ const u=i/26; ctx.lineTo(AP.x+u*AP.w, lineY+Math.sin(u*PI)*MIN*0.022); }
  ctx.stroke();
  for (const pu of [0.02,0.72]){
    const x=AP.x+pu*AP.w;
    ctx.strokeStyle=rgba(farColour([96,76,56],26),0.9); ctx.lineWidth=MIN*0.010;
    ctx.beginPath(); ctx.moveTo(x,lineY); ctx.lineTo(x,groundY+MIN*0.02); ctx.stroke();
  }

  // ---- mother, taking one down herself. She does not look at you.
  const mu = 0.14;
  const mx = AP.x+mu*AP.w;
  groundShadow(mx, groundY+MIN*0.055, MIN*0.05, MIN*0.014, 0.20);
  figure({ x:mx, y:groundY+MIN*0.055, s:MIN*0.30, d:26,
           col:farColour([58,52,58],26), a:0.85, reach:0.72+0.2*Math.sin(t*0.4) });

  // ---- the sheets still out, and the one in your hand
  const push = P.active ? { x:P.x, y:P.y, r:MIN*0.24, k:MIN*0.10 } : null;
  for (let i=0;i<IN.sheets.length;i++){
    const sh=IN.sheets[i];
    if (sh.gone>=1 && IN.held!==sh) continue;
    let ax, ay, bx2, by2, h=sh.h*AP.h;
    if (IN.held===sh){
      // it hangs from your hand, heavy, and drags
      ax = P.x-sh.w*AP.w*0.5; bx2 = P.x+sh.w*AP.w*0.5;
      ay = by2 = P.y;
      h *= 0.78;
    } else {
      const x=AP.x+sh.u*AP.w;
      ax=x-sh.w*AP.w/2; bx2=x+sh.w*AP.w/2;
      ay=by2=lineY+Math.sin(sh.u*PI)*MIN*0.022+MIN*0.005;
      clothShadow({ax:ax+MIN*0.02,bx:bx2+MIN*0.02,ph:sh.ph,windAmp:MIN*0.014}, groundY+MIN*0.03, t, 0.10);
    }
    cloth({ ax, ay, bx:bx2, by:by2, h,
            col: mixL(farColour(sh.col,22), [170,164,152], 0.34),
            ph:sh.ph, folds:5, amp:MIN*0.012, windAmp:MIN*0.012, thin:0.6,
            light:sp, pegs:IN.held!==sh, dust:0.5, seed:sh.seed, push:IN.held===sh?null:push }, t);
    sh.x = (ax+bx2)/2; sh.y = ay + h*0.4;
    if (IN.held!==sh){
      spot("take"+i, sh.x, sh.y, MIN*0.10, ()=>{}, false);
    }
  }

  // the empty pegs left behind on the line — the detail that hurts
  for (let i=0;i<IN.sheets.length;i++){
    if (IN.sheets[i].gone<1) continue;
    const x=AP.x+IN.sheets[i].u*AP.w, y=lineY+Math.sin(IN.sheets[i].u*PI)*MIN*0.022;
    for (const off of [-IN.sheets[i].w*AP.w/2, IN.sheets[i].w*AP.w/2]){
      ctx.fillStyle=rgba(farColour([148,112,80],26),0.9);
      ctx.fillRect(x+off-2.5, y-MIN*0.006, 5, MIN*0.017);
    }
  }

  partRole=2;
  drawParticles(t, 0.6, sp?{x:sp.x,y:sp.y,r:H}:null);
  drawLeaves();

  // the last sheet gone: hold on the empty line for a moment
  if (IN.carried>=IN.sheets.length){
    const q = cl01((t-IN.lastDrop)/2.2);
    ctx.save();
    ctx.fillStyle=rgba([12,14,20], q*0.14); ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  return { lineY, groundY, bkx, bky };
}
function indoorsInteract(t, dt){
  const r = { bkx: W*0.80-MIN*0.08, bky: AP.hy+AP.h*0.12+MIN*0.03 };
  if (P.down && P.active){
    if (!IN.held){
      let best=null, bd=MIN*0.16;
      for (const sh of IN.sheets){
        if (sh.gone>=1) continue;
        const d=Math.hypot(sh.x-P.x, sh.y-P.y);
        if (d<bd){ bd=d; best=sh; }
      }
      if (best){ IN.held=best; sfx.cloth(1); }
    }
  } else if (IN.held){
    // dropped: near the basket it counts, otherwise it goes back up
    const d = Math.hypot(P.x-r.bkx, P.y-r.bky);
    if (d < MIN*0.22){
      IN.held.gone=1;
      // keep the basket order stable
      const idx=IN.sheets.indexOf(IN.held);
      IN.sheets.splice(idx,1); IN.sheets.unshift(IN.held);
      IN.carried++; IN.lastDrop=t;
      sfx.thud(); ripple(r.bkx,r.bky,[255,224,180],MIN*0.12);
      if (IN.carried===1) whisper("She didn't say why.");
      if (IN.carried===3) whisper("After a while you stopped asking.");
      if (IN.carried>=IN.sheets.length){ whisper("That was the last time they were out there."); sfx.found(); }
    } else sfx.cloth(0.5);
    IN.held=null;
  }
}

/* ============================================================================
   CHAPTER FIVE — RECOGNITION
   The first room again. Everything is where it was. The light is not.
   New verb: BREATHE ON THE GLASS. While you are stopped at the latch there is
   nothing to do, so you do what anyone does at a cold window — and you can
   write in it with a finger, and watch it go.
   ========================================================================== */
const FOG = document.createElement("canvas"); const fgc = FOG.getContext("2d");
const BREATH = { amt:0, on:false, lx:0, ly:0, drawn:0 };
function fogFit(){ if (FOG.width!==360){ FOG.width=360; FOG.height=360; } }
function breathe(x,y,r){
  fogFit();
  fgc.globalCompositeOperation="source-over";
  const g=fgc.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,"rgba(255,255,255,0.55)"); g.addColorStop(0.6,"rgba(255,255,255,0.24)"); g.addColorStop(1,"rgba(255,255,255,0)");
  fgc.fillStyle=g; fgc.beginPath(); fgc.arc(x,y,r,0,TAU); fgc.fill();
  BREATH.amt = Math.min(1, BREATH.amt+0.04);
}
function fogWipe(x0,y0,x1,y1,r){
  fogFit();
  fgc.globalCompositeOperation="destination-out";
  fgc.lineCap="round"; fgc.lineWidth=r*2; fgc.strokeStyle="rgba(0,0,0,1)";
  fgc.beginPath(); fgc.moveTo(x0,y0); fgc.lineTo(x1,y1); fgc.stroke();
  fgc.globalCompositeOperation="source-over";
  BREATH.drawn = Math.min(1, BREATH.drawn+0.03);
}
function fogFade(dt){
  if (BREATH.amt<=0) return;
  fogFit();
  fgc.globalCompositeOperation="destination-out";
  fgc.fillStyle="rgba(0,0,0,"+(dt*0.22)+")";
  fgc.fillRect(0,0,360,360);
  fgc.globalCompositeOperation="source-over";
  BREATH.amt = Math.max(0, BREATH.amt - dt*0.10);
  BREATH.drawn = Math.max(0, BREATH.drawn - dt*0.09);
}
function drawFog(x,y,w,h,a){
  if (BREATH.amt<0.01) return;
  ctx.save();
  ctx.globalAlpha = a*0.9;
  ctx.drawImage(FOG, 0,0,360,360, x,y,w,h);
  ctx.restore();
}

/* the air-quality panel, and the hand that stops */
const STOP = { reach:0, blocked:0, shown:0, tried:0, motherGhost:0 };
function updateStopped(t, dt, geo){
  const lx=geo.lx, ly=geo.ly;
  const near = Math.hypot(P.x-lx, P.y-ly) < MIN*0.13;
  if (P.down && near){
    STOP.reach = Math.min(1, STOP.reach + dt*0.9);
    if (STOP.reach>0.55 && !STOP.shown){
      STOP.shown=1; STOP.tried++;
      document.getElementById("aq").classList.add("on");
      document.getElementById("aq").setAttribute("aria-hidden","false");
      sfx.alarm();
      meet("latch");
    }
  } else {
    STOP.reach = Math.max(0, STOP.reach - dt*0.5);
  }
  STOP.blocked = lerp(STOP.blocked, STOP.shown?1:0, 0.05);
  // the hand that hesitates, drawn as a soft shape near the latch
  if (STOP.reach>0.03){
    ctx.save();
    const a=STOP.reach*(1-STOP.blocked*0.4);
    const g=ctx.createRadialGradient(lx,ly,0,lx,ly,MIN*0.10);
    g.addColorStop(0, rgba([255,224,190], a*0.22)); g.addColorStop(1, rgba([255,224,190],0));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(lx,ly,MIN*0.10,0,TAU); ctx.fill();
    ctx.restore();
  }
}
function hideAQ(){
  const a=document.getElementById("aq");
  a.classList.remove("on"); a.setAttribute("aria-hidden","true");
}
