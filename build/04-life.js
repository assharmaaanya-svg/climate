/* ============================================================================
   LIVING WORLD + CURIOSITY
   Two systems:
     SPOTS    — anything can be touched. Scenes declare hotspots each frame; a
                touch that isn't required by the story still does something.
                Nothing here gates progress. It exists so that a visitor who
                pokes at the world is rewarded for it.
     AMBIENT  — the world keeps moving when nobody is doing anything: wires,
                perched birds that scatter, bees, a train, a contrail, leaves,
                a cat on a roof, a moth in the curtain.
   ========================================================================== */

/* ------------------------------------------------------------------ SPOTS */
let SPOTS = [];
const FOUND = Object.create(null);
let foundN = 0;
const SECRET_TOTAL = 14;

function spot(sid, x, y, r, fn, once){
  SPOTS.push({ sid, x, y, r, fn, once:once!==false });
}
function hitSpots(x,y){
  for (let i=SPOTS.length-1;i>=0;i--){
    const s=SPOTS[i];
    if (Math.hypot(x-s.x, y-s.y) < s.r){
      if (s.once && FOUND[s.sid]) { s.fn && s.fn(true); return true; }
      if (!FOUND[s.sid]){ FOUND[s.sid]=true; foundN++; }
      s.fn && s.fn(false);
      return true;
    }
  }
  return false;
}
/* a soft halo on touchable things once the visitor has shown they explore */
let curiosity = 0;              // rises when the visitor touches non-required things
function drawSpotHints(t){
  if (curiosity < 0.25) return;
  const a = cl01(curiosity-0.25)*0.5;
  for (const s of SPOTS){
    if (FOUND[s.sid]) continue;
    const pulse = 0.5+0.5*Math.sin(t*1.7 + s.x*0.03);
    const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*0.95);
    g.addColorStop(0, rgba([255,248,220], 0.05*a*(0.5+pulse)));
    g.addColorStop(0.6, rgba([255,248,220], 0.03*a*pulse));
    g.addColorStop(1, rgba([255,248,220], 0));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*0.95,0,TAU); ctx.fill();
  }
}

/* ------------------------------------------------------------------ RIPPLES + FLASHES */
const RIPPLES = [];
function ripple(x,y,col,r){ RIPPLES.push({ x,y,r:0, max:r||MIN*0.12, life:1, col:col||[255,244,206] }); }
function updRipples(dt){
  for (let i=RIPPLES.length-1;i>=0;i--){
    const r=RIPPLES[i]; r.life-=dt*1.25; r.r += (r.max-r.r)*dt*4.2;
    if (r.life<=0) RIPPLES.splice(i,1);
  }
}
function drawRipples(){
  for (const r of RIPPLES){
    ctx.strokeStyle=rgba(r.col, r.life*0.42);
    ctx.lineWidth=Math.max(1, MIN*0.0022*r.life);
    ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,TAU); ctx.stroke();
    ctx.strokeStyle=rgba(r.col, r.life*0.18);
    ctx.beginPath(); ctx.arc(r.x,r.y,r.r*0.62,0,TAU); ctx.stroke();
  }
}

/* an accidental memory: a shape blooms and dies. No words needed. */
const FLASHES = [];
function memFlash(kind, x, y){ FLASHES.push({ kind, x, y, life:1, t:0 }); }
function updFlashes(dt){
  for (let i=FLASHES.length-1;i>=0;i--){
    const f=FLASHES[i]; f.life-=dt*0.42; f.t+=dt;
    if (f.life<=0) FLASHES.splice(i,1);
  }
}
function drawFlashes(){
  for (const f of FLASHES){
    const a = Math.sin(cl01(f.life)*PI)*0.9;
    const s = MIN*0.10*(1+ (1-f.life)*0.45);
    ctx.save(); ctx.translate(f.x,f.y); ctx.globalAlpha=a;
    if (f.kind==="sea"){
      // a blurred blue-green horizon: the photograph on the bedside table
      const g=ctx.createRadialGradient(0,0,0,0,0,s);
      g.addColorStop(0,"rgba(150,200,206,0.9)"); g.addColorStop(0.55,"rgba(96,150,170,0.5)"); g.addColorStop(1,"rgba(96,150,170,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,s,0,TAU); ctx.fill();
      ctx.strokeStyle="rgba(255,252,240,0.55)"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-s*0.7,s*0.05); ctx.quadraticCurveTo(0,-s*0.03,s*0.7,s*0.05); ctx.stroke();
    } else if (f.kind==="flower"){
      // a pressed flower falling out of a book
      ctx.rotate(f.t*0.9);
      for (let k=0;k<6;k++){
        ctx.rotate(TAU/6);
        ctx.fillStyle="rgba(226,176,196,0.85)";
        ctx.beginPath(); ctx.ellipse(0,-s*0.26,s*0.10,s*0.24,0,0,TAU); ctx.fill();
      }
      ctx.fillStyle="rgba(232,206,120,0.95)"; ctx.beginPath(); ctx.arc(0,0,s*0.10,0,TAU); ctx.fill();
    } else if (f.kind==="chime"){
      for (let k=0;k<3;k++){
        ctx.strokeStyle=rgba([255,238,196], a*0.5*(1-k*0.3));
        ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,0,s*(0.4+k*0.34)*(2-f.life),0,TAU); ctx.stroke();
      }
    } else if (f.kind==="warm"){
      // holding something that was warm: a slow soft pulse
      const g=ctx.createRadialGradient(0,0,0,0,0,s*1.3);
      g.addColorStop(0,"rgba(255,214,150,0.5)"); g.addColorStop(1,"rgba(255,214,150,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,s*1.3,0,TAU); ctx.fill();
    } else if (f.kind==="blue"){
      const g=ctx.createRadialGradient(0,0,0,0,0,s*1.2);
      g.addColorStop(0,"rgba(56,126,214,0.62)"); g.addColorStop(1,"rgba(56,126,214,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,s*1.2,0,TAU); ctx.fill();
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ WHISPERS
   Discoveries speak in a different, quieter voice than the narration, so an
   aside never gets mistaken for the story.
*/
const whEl = document.createElement("div");
whEl.id="whisper";
whEl.setAttribute("aria-live","polite");
whEl.style.cssText = "position:fixed;left:50%;bottom:20vh;transform:translate(-50%,6px);z-index:6;"+
  "font-family:var(--serif);font-style:italic;font-size:clamp(.85rem,2.5vw,1.02rem);letter-spacing:.01em;"+
  "opacity:0;transition:opacity 1s,transform 1s;pointer-events:none;text-align:center;width:min(84vw,30ch);"+
  "text-shadow:var(--sh);line-height:1.45;";
document.body.appendChild(whEl);
let whT = 0;
function whisper(txt, dark){
  whEl.textContent = txt;
  whEl.style.color = dark ? "#243040" : "#fbfaf5";
  whEl.style.textShadow = dark ? "0 1px 16px rgba(255,255,255,.85)" : "var(--sh)";
  whEl.style.opacity = ".92"; whEl.style.transform="translate(-50%,0)";
  whT = 4.2;
}
function updWhisper(dt){
  if (whT>0){ whT-=dt; if (whT<=0){ whEl.style.opacity="0"; whEl.style.transform="translate(-50%,6px)"; } }
}

/* ------------------------------------------------------------------ AMBIENT LIFE */

/* telephone wires with birds that sit, shuffle, and scatter when touched */
const WIRE = { birds:[], scatter:0 };
function buildWire(){
  WIRE.birds.length=0;
  const n = ri(5,9);
  for (let i=0;i<n;i++) WIRE.birds.push({ u: sr(0.08,0.92), hop:0, ph:sr(0,TAU), gone:0, vx:0, vy:0, x:0, y:0 });
}
function wireY(u, y0, sagPx){ return y0 + Math.sin(u*PI)*sagPx; }
function drawWires(t, y0, opt){
  opt=opt||{};
  const d = LAYER.roofs.d;
  const col = farColour([38,42,48], d);
  const a = cl01(reads(d)*1.5+0.15) * (opt.a===undefined?1:opt.a);
  const sag = MIN*0.028;
  ctx.save();
  ctx.strokeStyle=rgba(col, a*0.7); ctx.lineWidth=Math.max(1, MIN*0.0016);
  for (let k=0;k<3;k++){
    const yy=y0+k*MIN*0.014;
    ctx.beginPath();
    for (let i=0;i<=20;i++){ const u=i/20, x=AP.x+u*AP.w, y=wireY(u,yy,sag);
      if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); }
    ctx.stroke();
  }
  // poles, which have to actually reach the ground or they float
  const footY = opt.ground!==undefined ? opt.ground : AP.y+AP.h*0.86;
  for (const u of [0.12, 0.78]){
    const x=AP.x+u*AP.w, y=wireY(u,y0,sag);
    ctx.strokeStyle=rgba(col,a*0.85); ctx.lineWidth=Math.max(1.6,MIN*0.0038);
    ctx.beginPath(); ctx.moveTo(x,y-MIN*0.014); ctx.lineTo(x, footY); ctx.stroke();
    ctx.lineWidth=Math.max(1.2,MIN*0.0024);
    for (const cy of [y+MIN*0.004, y+MIN*0.020]){
      ctx.beginPath(); ctx.moveTo(x-MIN*0.016,cy); ctx.lineTo(x+MIN*0.016,cy); ctx.stroke();
    }
  }
  // the birds
  for (const b of WIRE.birds){
    if (b.gone>0){
      b.gone += 0.016; b.vy -= 0.4; b.x += b.vx; b.y += b.vy;
      if (b.gone>1.6) continue;
      const w=MIN*0.010, f=Math.sin(b.gone*22);
      ctx.strokeStyle=rgba(col, a*(1-cl01(b.gone-0.8)/0.8));
      ctx.lineWidth=Math.max(1.2,MIN*0.0022); ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(b.x-w,b.y+f*w*0.5);
      ctx.quadraticCurveTo(b.x,b.y-f*w,b.x,b.y);
      ctx.quadraticCurveTo(b.x,b.y-f*w,b.x+w,b.y+f*w*0.5); ctx.stroke();
      continue;
    }
    const x = AP.x + b.u*AP.w, y = wireY(b.u, y0, sag) - MIN*0.009;
    b.x=x; b.y=y;
    const hop = Math.abs(Math.sin(t*0.7+b.ph))>0.985 ? -MIN*0.004 : 0;
    ctx.fillStyle=rgba(col,a);
    ctx.beginPath(); ctx.ellipse(x, y+hop, MIN*0.0068, MIN*0.0092, 0.1,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x-MIN*0.0052, y-MIN*0.0058+hop, MIN*0.0042,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+MIN*0.005,y+MIN*0.004+hop);
    ctx.lineTo(x+MIN*0.016, y+MIN*0.010+hop); ctx.lineTo(x+MIN*0.004,y+MIN*0.008+hop); ctx.closePath(); ctx.fill();
    spot("wire", x, y, MIN*0.05, ()=>{
      for (const bb of WIRE.birds){ if(!bb.gone){ bb.gone=0.01; bb.vx=rnd(-3,3); bb.vy=rnd(-4,-1.5); } }
      sfx.flap(); whisper("They used to sit there every morning.");
      curiosity += 0.4;
    });
  }
  ctx.restore();
}

/* bees / small insects in the garden. They vanish as the air loads. */
const BUGS = [];
function buildBugs(){
  BUGS.length=0;
  for (let i=0;i<(LOW?4:8);i++)
    BUGS.push({ x:rnd(0,W), y:rnd(H*0.5,H*0.9), tx:rnd(0,W), ty:rnd(H*0.5,H*0.9), ph:rnd(0,TAU), sp:rnd(0.5,1.2) });
}
function updBugs(dt,t){
  for (const b of BUGS){
    if (Math.hypot(b.tx-b.x,b.ty-b.y)<20){ b.tx=cl(b.x+rnd(-W*0.3,W*0.3),0,W); b.ty=cl(b.y+rnd(-H*0.2,H*0.2),H*0.42,H*0.95); }
    const a=Math.atan2(b.ty-b.y,b.tx-b.x);
    b.x += Math.cos(a)*46*dt*b.sp + Math.sin(t*7+b.ph)*10*dt;
    b.y += Math.sin(a)*46*dt*b.sp + Math.cos(t*8+b.ph)*10*dt;
  }
}
function drawBugs(t, amount){
  const a = amount*(1-AIR.h*1.3);
  if (a<0.04) return;
  for (const b of BUGS){
    ctx.fillStyle=rgba([70,62,34], a*0.75);
    ctx.beginPath(); ctx.arc(b.x,b.y, MIN*0.0026, 0, TAU); ctx.fill();
    ctx.strokeStyle=rgba([240,240,220], a*0.28); ctx.lineWidth=1;
    const f=Math.sin(t*40+b.ph)*MIN*0.003;
    ctx.beginPath(); ctx.moveTo(b.x-MIN*0.001,b.y-MIN*0.001); ctx.lineTo(b.x-MIN*0.004,b.y-MIN*0.001-f); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x+MIN*0.001,b.y-MIN*0.001); ctx.lineTo(b.x+MIN*0.004,b.y-MIN*0.001-f); ctx.stroke();
  }
}

/* a train that crosses the town, now and then. You hear it before you see it. */
const TRAIN = { on:0, x:0, dir:1, warned:false };
let trainT = 14;
function updTrain(dt){
  if (!TRAIN.on){ trainT-=dt; if (trainT<=0){ TRAIN.on=1; TRAIN.dir=Math.random()<0.5?1:-1; TRAIN.x=TRAIN.dir>0?-0.2:1.2; TRAIN.warned=false; } }
  else {
    TRAIN.x += TRAIN.dir*dt*0.055;
    if (!TRAIN.warned && TRAIN.x>0.1 && TRAIN.x<0.9){ TRAIN.warned=true; sfx.train(); }
    if (TRAIN.x>1.35||TRAIN.x<-0.35){ TRAIN.on=0; trainT=rnd(26,52); }
  }
}
function drawTrain(){
  if (!TRAIN.on) return;
  const L=LAYER.town, T0=reads(L.d);
  if (T0<0.02) return;
  const base = AP.hy + ph(L,L.y);
  const c = farColour([56,60,68], L.d), a=cl01(T0*2.2);
  const x = px(L, TRAIN.x), h = ph(L,0.010), w = pw(L,0.075);
  ctx.fillStyle=rgba(c,a*0.9);
  for (let i=0;i<7;i++) ctx.fillRect(x+i*w*0.15*TRAIN.dir, base-h, w*0.12, h);
  return;
}

/* a contrail, very high. Its slow persistence is a nice quiet clock. */
const PLANE = { on:0, x:0, y:0, trail:[] };
let planeT = 26;
function updPlane(dt){
  if (!PLANE.on){ planeT-=dt; if (planeT<=0){ PLANE.on=1; PLANE.x=-0.1; PLANE.y=sr(0.08,0.26); PLANE.trail.length=0; } }
  else {
    PLANE.x += dt*0.028;
    PLANE.trail.push({ x:PLANE.x, y:PLANE.y+Math.sin(PLANE.x*8)*0.004, a:1 });
    if (PLANE.trail.length>170) PLANE.trail.shift();
    for (const p of PLANE.trail) p.a -= dt*0.09;
    if (PLANE.x>1.2 && PLANE.trail.every(p=>p.a<=0)){ PLANE.on=0; planeT=rnd(40,80); }
  }
}
function drawPlane(){
  if (!PLANE.on) return;
  const a0 = (1-AIR.h*0.8);
  ctx.save(); ctx.lineCap="round";
  for (let i=1;i<PLANE.trail.length;i++){
    const p=PLANE.trail[i], q=PLANE.trail[i-1];
    if (p.a<=0) continue;
    ctx.strokeStyle=rgba([255,255,255], p.a*0.20*a0);
    ctx.lineWidth = MIN*0.0034*(1+ (1-p.a)*2);
    ctx.beginPath(); ctx.moveTo(AP.x+q.x*AP.w, AP.y+q.y*AP.h); ctx.lineTo(AP.x+p.x*AP.w, AP.y+p.y*AP.h); ctx.stroke();
  }
  if (PLANE.x<1.15){
    ctx.fillStyle=rgba([255,255,255],0.7*a0);
    ctx.beginPath(); ctx.arc(AP.x+PLANE.x*AP.w, AP.y+PLANE.y*AP.h, MIN*0.0022,0,TAU); ctx.fill();
  }
  ctx.restore();
}

/* leaves that blow through on a gust */
const LEAVES = [];
function gustLeaves(n){
  for (let i=0;i<(n||6);i++)
    LEAVES.push({ x:-30, y:rnd(H*0.25,H*0.9), vx:rnd(90,190), vy:rnd(-24,12), r:rnd(0,TAU), vr:rnd(-5,5),
                  s:rnd(MIN*0.005,MIN*0.012), col: pick([[150,120,58],[172,142,70],[126,140,62],[186,150,88]]) });
}
function updLeaves(dt){
  for (let i=LEAVES.length-1;i>=0;i--){
    const l=LEAVES[i];
    l.x += l.vx*dt; l.y += l.vy*dt + Math.sin(l.r)*30*dt; l.r += l.vr*dt; l.vy += 26*dt;
    if (l.x>W+50||l.y>H+50) LEAVES.splice(i,1);
  }
}
function drawLeaves(){
  for (const l of LEAVES){
    ctx.save(); ctx.translate(l.x,l.y); ctx.rotate(l.r);
    ctx.fillStyle=rgba(l.col,0.9);
    ctx.beginPath(); ctx.ellipse(0,0,l.s, l.s*0.42*Math.abs(Math.cos(l.r)),0,0,TAU); ctx.fill();
    ctx.restore();
  }
}

/* a cat on a roof. Does almost nothing. That is the point. */
const CAT = { u:0.68, stretch:0, ph:0, gone:false };
function drawCat(t, baseY){
  if (CAT.gone) return;
  const L=LAYER.roofs, T0=reads(L.d);
  if (T0<0.15) return;
  const x = px(L, CAT.u), y = baseY;
  const s = MIN*0.020, col = farColour([44,40,42], L.d), a=cl01(T0*1.5);
  const br = Math.sin(t*0.8)*s*0.05;
  CAT.stretch = Math.max(0, CAT.stretch-0.012);
  const st = CAT.stretch;
  ctx.save(); ctx.fillStyle=rgba(col,a*0.95);
  ctx.beginPath(); ctx.ellipse(x, y-s*0.42+br, s*(0.78+st*0.5), s*0.36, 0,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x-s*0.72, y-s*0.66+br, s*0.28,0,TAU); ctx.fill();
  // ears
  ctx.beginPath(); ctx.moveTo(x-s*0.9,y-s*0.86+br); ctx.lineTo(x-s*0.82,y-s*1.06+br); ctx.lineTo(x-s*0.70,y-s*0.88+br); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-s*0.64,y-s*0.88+br); ctx.lineTo(x-s*0.54,y-s*1.04+br); ctx.lineTo(x-s*0.46,y-s*0.86+br); ctx.closePath(); ctx.fill();
  // tail, always moving
  ctx.strokeStyle=rgba(col,a*0.95); ctx.lineWidth=s*0.16; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(x+s*0.7, y-s*0.44+br);
  ctx.quadraticCurveTo(x+s*1.2, y-s*0.44+Math.sin(t*1.6)*s*0.5, x+s*1.15, y-s*0.95+Math.sin(t*1.6+1)*s*0.3);
  ctx.stroke();
  ctx.restore();
  spot("cat", x, y-s*0.6, s*2.0, ()=>{ CAT.stretch=1; sfx.chime(880); whisper("It never let you get close."); curiosity+=0.4; });
}

/* a moth that lives in the curtain and comes out once */
const MOTH = { out:false, x:0, y:0, tx:0, ty:0, ph:0, life:0 };
function releaseMoth(x,y){ if (MOTH.out) return; MOTH.out=true; MOTH.x=x; MOTH.y=y; MOTH.tx=x; MOTH.ty=y; MOTH.life=1; }
function updMoth(dt,t){
  if (!MOTH.out) return;
  MOTH.life = Math.min(1, MOTH.life+dt*0.2);
  if (Math.hypot(MOTH.tx-MOTH.x,MOTH.ty-MOTH.y)<24){ MOTH.tx=cl(MOTH.x+rnd(-W*0.3,W*0.3),W*0.1,W*0.9); MOTH.ty=cl(MOTH.y+rnd(-H*0.25,H*0.25),H*0.1,H*0.8); }
  const a=Math.atan2(MOTH.ty-MOTH.y,MOTH.tx-MOTH.x);
  MOTH.x += Math.cos(a)*66*dt + Math.sin(t*11)*22*dt;
  MOTH.y += Math.sin(a)*66*dt + Math.cos(t*13)*22*dt;
}
function drawMoth(t){
  if (!MOTH.out) return;
  const f = Math.sin(t*26)*0.7+0.3;
  ctx.save(); ctx.translate(MOTH.x,MOTH.y);
  ctx.fillStyle=rgba([238,230,208],0.82);
  ctx.beginPath(); ctx.ellipse(-MIN*0.006,0, MIN*0.007, MIN*0.005*Math.abs(f)+MIN*0.001, -0.3,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse( MIN*0.006,0, MIN*0.007, MIN*0.005*Math.abs(f)+MIN*0.001,  0.3,0,TAU); ctx.fill();
  ctx.fillStyle=rgba([120,108,92],0.9);
  ctx.beginPath(); ctx.ellipse(0,0,MIN*0.0018,MIN*0.005,0,0,TAU); ctx.fill();
  ctx.restore();
}

/* the moon, when it's night. Touch it and it brightens. */
let moonTouched = 0;
function drawMoon(t){
  if (AIR.tod>0.14 && AIR.tod<0.84) return;
  const x = AP.x+AP.w*0.20, y = AP.y+AP.h*0.19;
  const r = MIN*0.036;
  moonTouched = Math.max(0, moonTouched-0.006);
  const boost = 1+moonTouched*0.9;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const halo = ctx.createRadialGradient(x,y,0,x,y,r*(5+AIR.h*16));
  const hc = mixL([214,224,246],[236,230,208],AIR.h);
  halo.addColorStop(0, rgba(hc, (0.20+AIR.h*0.22)*boost));
  halo.addColorStop(0.16, rgba(hc, (0.08+AIR.h*0.16)*boost));
  halo.addColorStop(1, rgba(hc,0));
  ctx.fillStyle=halo; ctx.fillRect(AP.x,AP.y,AP.w,AP.h);
  ctx.restore();
  ctx.fillStyle=rgba(mixL([238,242,252],[232,226,206],AIR.h*0.7), (0.94-AIR.h*0.34)*boost);
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
  // maria
  ctx.fillStyle=rgba([190,198,216],0.30);
  ctx.beginPath(); ctx.arc(x-r*0.26,y-r*0.18,r*0.30,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x+r*0.28,y+r*0.22,r*0.20,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x+r*0.06,y-r*0.42,r*0.14,0,TAU); ctx.fill();
  spot("moon", x, y, r*2.4, ()=>{
    moonTouched=1; ripple(x,y,[220,230,255],MIN*0.2); sfx.chime(1319);
    whisper("It was always the same one.");
    curiosity+=0.4;
  });
}
