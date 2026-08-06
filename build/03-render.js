/* ============================================================================
   SHARED RENDERERS
   The rule here: nothing gets its own bespoke draw function if two things could
   share one. Curtains, bedsheets and the kite's skin are all the same cloth.
   Dust motes, crayon dust, soot and PM are all the same particle field. That is
   what makes the morphs possible — a morph is just a parameter moving.
   ========================================================================== */

/* ------------------------------------------------------------------ CLOTH
   A cloth is a mesh with folds. It gets its shading from the folds, light
   through its fibres from behind, a hem, pegs, and it can be pushed aside.
   part=1 → gathered at the ends (a curtain). part=0 → hanging flat (a sheet).
*/
const CC = LOW ? 10 : 14, CR = LOW ? 7 : 10;
const _mx = new Float32Array((CC+1)*(CR+1));
const _my = new Float32Array((CC+1)*(CR+1));
const _mz = new Float32Array((CC+1)*(CR+1));

function cloth(o, t){
  const ax=o.ax, ay=o.ay, bx=o.bx, by=o.by, h=o.h;
  const folds = o.folds||5, amp = o.amp||MIN*0.012, sag = o.sag||0;
  const part = o.part||0, ph = o.ph||0, sp = o.sp===undefined?1.5:o.sp;
  const windAmp = (o.windAmp===undefined? MIN*0.02 : o.windAmp) * (REDUCE?0.25:1);
  const w8 = AIR.wind + AIR.gust;
  const push = o.push, thin = o.thin===undefined?0.5:o.thin;
  const col = o.col, sun = o.light;

  // ---- build mesh
  for (let r=0;r<=CR;r++){
    const v = r/CR, v2 = v*v;
    for (let c=0;c<=CC;c++){
      let u = c/CC;
      // gathering: a curtain bunches, so u compresses toward the hanging edge
      const gu = part>0 ? (u + (Math.sin(u*PI)* (o.gatherDir||1) * part * 0.34)) : u;
      const g = cl01(gu);
      let x = lerp(ax,bx,g), y = lerp(ay,by,g);
      let z = Math.sin(u*folds*TAU + ph + t*sp) * (1 - part*0.3)
            + Math.sin(u*folds*1.7*TAU - ph*0.6 + t*sp*0.7)*0.35;
      z *= 0.75;
      y += v*h + sag*Math.sin(g*PI);
      x += z*amp*(0.22+0.78*v);
      // the hem is never a straight line: it dips where the folds hang heaviest
      if (r>=CR-1){
        const w = (r===CR) ? 1 : 0.35;
        // one slow wave the mesh can actually resolve, plus a gentle droop
        y += (Math.sin(u*folds*0.42*TAU + ph + 1.1)*0.6
              + Math.sin(u*1.7 + ph)*0.3) * amp*0.85*w;
        y += Math.sin(u*PI)*amp*0.55*w;
      }
      // wind swing — the bottom travels furthest
      const swing = Math.sin(t*1.55 + ph + g*1.4)*windAmp*w8;
      x += swing*v2;
      y -= Math.abs(swing)*0.20*v2;
      if (push){
        const dx = x-push.x, dy = y-push.y, d = Math.hypot(dx,dy);
        if (d < push.r){
          const f = (1-d/push.r); const f2 = f*f;
          const s = dx<0?-1:1;
          x += s*f2*push.k;
          y += f2*push.k*0.12;
          z += f2*1.15;
        }
      }
      const i = r*(CC+1)+c;
      _mx[i]=x; _my[i]=y; _mz[i]=cl(z,-1.4,1.4);
    }
  }

  // ---- light direction across the cloth (for a soft sheen toward the sun)
  let sunSide = 0;
  if (sun){ const midx = (ax+bx)/2; sunSide = cl((sun.x-midx)/(MIN*0.7), -1, 1); }

  /* ---- draw one horizontal strip per mesh row, filled with a gradient whose
     stops follow the folds. This is both smoother and cheaper than shading each
     quad: ten gradients per cloth instead of a hundred-odd flat fills, and no
     banding, because the fold shading is genuinely continuous. */
  const alpha = o.alpha===undefined?1:o.alpha;
  const backlit = o.backlit===undefined?1:o.backlit;
  ctx.save();
  for (let r=0;r<CR;r++){
    const iT = r*(CC+1), iB = (r+1)*(CC+1);
    const v = (r+0.5)/CR;
    // the strip outline: along the top edge, back along the bottom
    ctx.beginPath();
    ctx.moveTo(_mx[iT], _my[iT]);
    for (let c=1;c<=CC;c++) ctx.lineTo(_mx[iT+c], _my[iT+c]);
    for (let c=CC;c>=0;c--) ctx.lineTo(_mx[iB+c], _my[iB+c]);
    ctx.closePath();
    // the gradient runs across the strip, so it follows the cloth as it moves
    const gx0=_mx[iT], gy0=_my[iT], gx1=_mx[iT+CC], gy1=_my[iT+CC];
    const g = ctx.createLinearGradient(gx0,gy0,gx1,gy1);
    for (let c=0;c<=CC;c++){
      const z = (_mz[iT+c]+_mz[iB+c])*0.5;
      const u = c/CC;
      let k = 0.70 + 0.30*z;        // the folds
      k += sunSide*(u-0.5)*0.13;    // sheen toward the sun
      k -= v*v*0.10;                // weight at the hem
      let cc2 = shade(col, cl(k,0.35,1.30));
      const through = thin * cl01(1-Math.abs(z)*0.8) * backlit;
      if (through>0.01) cc2 = mixL(cc2, [255,250,232], through*0.28);
      g.addColorStop(u, rgba(cc2, alpha));
    }
    ctx.fillStyle=g; ctx.fill();
  }

  // ---- fibre grain (very fine, only when the cloth is big on screen)
  if (!LOW && h > MIN*0.16){
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
    for (let r=1;r<CR;r+=2){
      ctx.beginPath();
      for (let c=0;c<=CC;c++){ const i=r*(CC+1)+c; if(c===0)ctx.moveTo(_mx[i],_my[i]); else ctx.lineTo(_mx[i],_my[i]); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---- fold seams: a couple of crisp creases sell it as fabric
  ctx.strokeStyle = rgba(shade(col,0.62), 0.30); ctx.lineWidth = 1;
  for (let c=2;c<CC;c+=3){
    ctx.beginPath();
    for (let r=0;r<=CR;r++){ const i=r*(CC+1)+c; if(r===0)ctx.moveTo(_mx[i],_my[i]); else ctx.lineTo(_mx[i],_my[i]); }
    ctx.stroke();
  }

  // ---- hem / embroidery along the bottom edge
  if (o.hem){
    ctx.strokeStyle = rgba(o.hem, 0.34); ctx.lineWidth = Math.max(1.1, MIN*0.0018);
    ctx.beginPath();
    for (let c=0;c<=CC;c++){ const i=CR*(CC+1)+c; if(c===0)ctx.moveTo(_mx[i],_my[i]); else ctx.lineTo(_mx[i],_my[i]); }
    ctx.stroke();
    if (o.stitch && !LOW){
      ctx.strokeStyle = rgba(o.hem, 0.24); ctx.lineWidth = 1;
      for (let c=0;c<CC;c+=1){
        const i=CR*(CC+1)+c, j=(CR-1)*(CC+1)+c;
        ctx.beginPath(); ctx.moveTo(_mx[i],_my[i]);
        ctx.lineTo(lerp(_mx[i],_mx[j],0.30), lerp(_my[i],_my[j],0.30)); ctx.stroke();
      }
    }
  }

  // ---- dust settled on the upper surface
  if (o.dust>0.02){
    const n = LOW?18:36;
    for (let k2=0;k2<n;k2++){
      const hh = hash(k2*7.3 + (o.seed||0));
      const hv = hash(k2*3.1 + 91 + (o.seed||0));
      const c = (hh*CC)|0, r = (hv*hv*CR)|0;
      const i = r*(CC+1)+c;
      const s = 0.7 + hash(k2*11.7)*1.9;
      ctx.fillStyle = rgba([96,88,78], 0.34*o.dust);
      ctx.beginPath(); ctx.arc(_mx[i], _my[i], s, 0, TAU); ctx.fill();
    }
  }

  // ---- pegs on the line
  if (o.pegs){
    for (const c of [0, CC]){
      const i=c, x=_mx[i], y=_my[i];
      const pw3=Math.max(2,MIN*0.0034), ph3=MIN*0.0115;
      ctx.fillStyle = rgba([150,120,86],0.9);
      ctx.fillRect(x-pw3/2, y-ph3*0.55, pw3, ph3);
      ctx.fillStyle = rgba([104,80,56],0.7);
      ctx.fillRect(x-pw3/2, y-ph3*0.55, pw3*0.4, ph3);
    }
  }
  ctx.restore();

  // expose the mesh edges so other things can attach (the kite tears off a corner)
  o.out = { blx:_mx[CR*(CC+1)], bly:_my[CR*(CC+1)],
            brx:_mx[CR*(CC+1)+CC], bry:_my[CR*(CC+1)+CC],
            cx:_mx[((CR/2)|0)*(CC+1)+((CC/2)|0)], cy:_my[((CR/2)|0)*(CC+1)+((CC/2)|0)] };
  return o.out;
}

/* cloth's shadow cast flat on the ground — cheap, but it grounds the scene */
function clothShadow(o, groundY, t, a){
  ctx.save();
  ctx.fillStyle = rgba([40,52,36], a===undefined?0.20:a);
  ctx.beginPath();
  const n = 9;
  for (let c=0;c<=n;c++){
    const u=c/n, x=lerp(o.ax,o.bx,u) + Math.sin(t*1.55+(o.ph||0)+u*1.4)*(o.windAmp||0)*AIR.wind;
    const y = groundY + Math.sin(u*PI)*MIN*0.016;
    if(c===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  for (let c=n;c>=0;c--){
    const u=c/n, x=lerp(o.ax,o.bx,u)*0.98+W*0.01;
    ctx.lineTo(x, groundY + MIN*0.055 + Math.sin(u*PI)*MIN*0.01);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ PARTICLES
   One field. `role` blends: motes (warm, in light shafts) → crayon (waxy blue
   flecks) → pm (grey-brown, fills the volume) → soot (heavy, settles).
*/
const PART = [];
const PN = LOW ? 130 : 300;
function buildParticles(){
  PART.length=0;
  for (let i=0;i<PN;i++) PART.push(newPart(rnd(0,H)));
}
function newPart(y){
  return { x:rnd(-40,W+40), y: y===undefined?rnd(-40,H+40):y,
           vx:rnd(-4,4), vy:rnd(-2,6), ph:rnd(0,TAU),
           s:Math.pow(rnd(0,1),2.2)*2.6+0.35, z:rnd(0.14,1),
           spin:rnd(-1,1), settle:0 };
}
let partRole = 0;         // 0 motes · 1 crayon · 2 pm · 3 soot   (fractional = blending)
const ROLE_COL = [ [255,244,214], [64,124,208], [128,118,104], [72,66,60] ];

function updParticles(dt, t){
  const heavy = cl01(partRole-1.6);         // pm/soot fall
  for (const m of PART){
    const drift = (AIR.wind + AIR.gust)*(LOW?16:24)*m.z;
    m.x += (m.vx + drift)*dt*(1 + heavy*0.4);
    m.y += (m.vy*(1-heavy*0.5) + heavy*16*m.z)*dt + Math.sin(t*0.6+m.ph)*4*dt;
    m.ph += dt*m.spin*0.6;
    if (m.x > W+44) m.x = -44; else if (m.x < -44) m.x = W+44;
    if (m.y > H+44){ m.y = -44; m.x = rnd(-40,W+40); } else if (m.y < -44) m.y = H+44;
  }
}
/* amount 0..1 how much of the field is showing. light = optional {x,y,r} where
   particles catch the sun and flare — this is what gives polluted air presence. */
function drawParticles(t, amount, light, shaftOnly){
  if (amount<0.01) return;
  const ri2 = cl(partRole,0,3);
  const i0 = Math.floor(ri2), i1 = Math.min(3,i0+1), fr = ri2-i0;
  const base = mix(ROLE_COL[i0], ROLE_COL[i1], fr);
  const sz = 1 + cl01(partRole-1)*0.5;
  ctx.save();
  for (const m of PART){
    if (m.z > 0.18 + 0.82*amount) continue;
    let a = (0.05 + 0.30*amount) * m.z * (0.55 + 0.45*Math.sin(t*1.8+m.ph));
    let col = base;
    if (light){
      const d = Math.hypot(m.x-light.x, m.y-light.y);
      const f = 1 - cl01(d/(light.r||H*0.75));
      if (shaftOnly && f<0.05) continue;
      a *= 1 + f*f*3.4;
      col = mixL(base, [255,250,236], f*0.6);
    } else if (shaftOnly) continue;
    if (a<0.012) continue;
    ctx.fillStyle = rgba(col, Math.min(a,0.62));
    const r = m.s*sz;
    if (r<1.1){ ctx.fillRect(m.x, m.y, r*1.6, r*1.6); }
    else { ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ GRIME
   Soot that lands on a surface, can be wiped off, and comes back. Kept in a
   512² buffer that is stretched over whatever surface needs it.
*/
let grimeLevel = 0;
function grimeReset(){ mc.clearRect(0,0,512,512); grimeLevel=0; }
function grimeAdd(amount){
  const n = Math.ceil(amount*90);
  mc.globalCompositeOperation="source-over";
  for (let i=0;i<n;i++){
    const x=rnd(0,512), y=rnd(0,512), r=rnd(1.2,7);
    const g=mc.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,"rgba(86,78,68,0.5)"); g.addColorStop(1,"rgba(86,78,68,0)");
    mc.fillStyle=g; mc.beginPath(); mc.arc(x,y,r,0,TAU); mc.fill();
  }
  grimeLevel = Math.min(1, grimeLevel + amount*0.35);
}
function grimeWipe(x,y,r){
  mc.globalCompositeOperation="destination-out";
  const g=mc.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,"rgba(0,0,0,1)"); g.addColorStop(0.65,"rgba(0,0,0,0.85)"); g.addColorStop(1,"rgba(0,0,0,0)");
  mc.fillStyle=g; mc.beginPath(); mc.arc(x,y,r,0,TAU); mc.fill();
  mc.globalCompositeOperation="source-over";
  grimeLevel = Math.max(0, grimeLevel-0.012);
}
function drawGrime(x,y,w,h,a){
  if (a<0.02) return;
  ctx.save(); ctx.globalAlpha=a; ctx.drawImage(GRIME,0,0,512,512,x,y,w,h); ctx.restore();
}

/* ------------------------------------------------------------------ SKY */
function drawSky(){
  const s = skyStops();
  const g = ctx.createLinearGradient(0, AP.y, 0, AP.hy + AP.h*0.1);
  g.addColorStop(0, rgb(s.top));
  g.addColorStop(0.52, rgb(s.mid));
  g.addColorStop(1, rgb(s.hor));
  ctx.fillStyle=g; ctx.fillRect(AP.x-2, AP.y-2, AP.w+4, AP.h+4);

  /* Even a clear sky is not a clean gradient. Very large, very faint noise
     breaks up the banding and gives the air something to be. */
  if (NZ_CLOUD){
    texture(NZ_CLOUD, AP.x-2, AP.y-2, AP.w+4, AP.h*0.9,
            0.09 + AIR.h*0.10, 3.2, "overlay", CLOUDS.length?CLOUDS[0].fx*260:0, 0);
    texture(NZ_MOTTLE, AP.x-2, AP.y-2, AP.w+4, AP.h*0.72, 0.045, 5.0, "soft-light");
  }

  // dirty light gathering low down. Deliberately almost nothing in clean air —
  // it should arrive as a change, not be part of the childhood.
  const dirt = Math.pow(AIR.h, 1.6);
  if (dirt>0.02){
    const dl = ctx.createLinearGradient(0, AP.hy-AP.h*0.40, 0, AP.hy+AP.h*0.06);
    const dc = mixL(s.hor, [230,216,184], 0.45);
    dl.addColorStop(0, rgba(dc,0)); dl.addColorStop(1, rgba(dc, 0.46*dirt));
    ctx.fillStyle=dl; ctx.fillRect(AP.x-2, AP.hy-AP.h*0.40, AP.w+4, AP.h*0.46);
  }
  return s;
}
/* the sun. Clean: a small hard disc. Loaded: a huge soft halo and no edge at
   all — the single most legible sign that the air has changed. */
function drawSun(t, s){
  const sp = sunPos(AP);
  if (sp.up <= -0.16) return sp;
  const vis = cl01((sp.up+0.16)/0.3);
  const h = AIR.h;
  const col = s.sun;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  // aureole: grows enormously with aerosol
  const R = AP.h*(0.13 + h*1.15);
  const gl = ctx.createRadialGradient(sp.x,sp.y,0, sp.x,sp.y,R);
  gl.addColorStop(0,    rgba(col, (0.50-h*0.16)*vis));
  gl.addColorStop(0.08, rgba(col, (0.30-h*0.06)*vis));
  gl.addColorStop(0.30, rgba(col, (0.09+h*0.13)*vis));
  gl.addColorStop(1,    rgba(col, 0));
  ctx.fillStyle=gl; ctx.fillRect(AP.x-2,AP.y-2,AP.w+4,AP.h+4);
  ctx.restore();
  // the disc itself: sharp when clean, dissolved when not
  const dr = AP.h*(0.020 + h*0.030);
  const edge = 1-h;
  ctx.save();
  const d = ctx.createRadialGradient(sp.x,sp.y,0, sp.x,sp.y, dr*(1+h*1.6));
  d.addColorStop(0, rgba(mixL(col,[255,255,250],0.5), (0.98-h*0.34)*vis));
  d.addColorStop(cl(edge*0.8,0.05,0.8), rgba(col, (0.8-h*0.5)*vis));
  d.addColorStop(1, rgba(col,0));
  ctx.fillStyle=d; ctx.beginPath(); ctx.arc(sp.x,sp.y,dr*(1+h*1.6),0,TAU); ctx.fill();
  ctx.restore();
  return sp;
}

/* ------------------------------------------------------------------ CLOUDS
   A cloud is a cluster of lobes sitting on one flat base, filled with a single
   gradient in *world* coordinates so the light reads continuously across the
   whole cloud instead of per-blob. That plus the flat base is the difference
   between a cumulus and a smudge.
   As the air loads they are not greyed — they are swallowed: contrast against
   the sky collapses until they are only a slight unevenness.
*/
const CLOUDS = [];
function buildClouds(){
  CLOUDS.length=0;
  const n = LOW?7:12;
  for (let i=0;i<n;i++){
    const c = { fx: sr(-0.25,1.25), fy: sr(0.07,0.50), s: sr(0.5,1.5),
                sp: sr(0.0022,0.008), wide: sr(1.5,3.4), lobes:[] };
    const nl = ri(5,9);
    for (let j=0;j<nl;j++){
      const u = (j+sr(-0.25,0.25))/(nl-1);            // position along the cloud
      // biggest in the middle, small at the ends — a real cumulus profile
      const bulk = Math.sin(cl01(u)*PI);
      c.lobes.push({ dx:(u-0.5)*c.wide, dy:-bulk*sr(0.24,0.62)-sr(0,0.10), r:0.20+bulk*sr(0.34,0.62) });
    }
    c.lobes.sort((a,b)=>a.dy-b.dy);                   // draw high lobes last
    CLOUDS.push(c);
  }
}
function updClouds(dt){
  for (const c of CLOUDS){
    c.fx += c.sp*dt*(0.35+AIR.wind*0.8)*0.5;
    if (c.fx>1.4) c.fx=-0.4;
  }
}
function drawClouds(s){
  const h = AIR.h;
  const swallowed = cl01(h*1.35);
  if (swallowed>0.97) return;
  if (AIR.tod<0.10 || AIR.tod>0.92) return;          // at night they read as absence
  // the sun's side, so the lit edge is on the correct side of every cloud
  const sp = sunPos(AP);
  const lit    = mixL([255,255,255], s.sun, 0.30);
  const shadow = mixL([176,190,208], s.hor, 0.55);
  ctx.save();
  for (const c of CLOUDS){
    const cx = AP.x + c.fx*AP.w, base = AP.y + c.fy*AP.h*0.80;
    const rad = c.s*AP.w*0.055*CAM.zoom;
    if (cx+rad*c.wide < AP.x-40 || cx-rad*c.wide > AP.x+AP.w+40) continue;
    // contrast against the sky, not opacity against black
    const a = (1-swallowed)*0.80;
    const top = base - rad*1.5;

    // one gradient for the whole cloud: bright crown, shaded underside
    const g = ctx.createLinearGradient(0, top, 0, base+rad*0.15);
    g.addColorStop(0,    rgba(lit, a));
    g.addColorStop(0.42, rgba(mixL(lit,shadow,0.30), a));
    g.addColorStop(0.82, rgba(mixL(lit,shadow,0.78), a*0.96));
    g.addColorStop(1,    rgba(shadow, a*0.9));

    ctx.save();
    // flat bottom: clip everything below the base line away
    ctx.beginPath();
    ctx.rect(cx-rad*c.wide-rad, top-rad, rad*c.wide*2+rad*2, base-(top-rad));
    ctx.clip();
    ctx.fillStyle=g;
    for (const l of c.lobes){
      ctx.beginPath();
      ctx.ellipse(cx+l.dx*rad, base+l.dy*rad, l.r*rad*1.15, l.r*rad, 0, 0, TAU);
      ctx.fill();
    }
    // the sunlit rim, on the sun's side only
    const dir = (sp.x > cx) ? 1 : -1;
    ctx.globalCompositeOperation="lighter";
    for (const l of c.lobes){
      if (l.dy > -0.18) continue;
      const lx=cx+l.dx*rad, ly=base+l.dy*rad, lr=l.r*rad;
      const rg=ctx.createRadialGradient(lx+dir*lr*0.42, ly-lr*0.46, 0, lx, ly, lr*1.1);
      rg.addColorStop(0, rgba(mixL([255,255,255],s.sun,0.4), a*0.20*(1-h)));
      rg.addColorStop(1, rgba([255,255,255],0));
      ctx.fillStyle=rg;
      ctx.beginPath(); ctx.ellipse(lx,ly,lr*1.15,lr,0,0,TAU); ctx.fill();
    }
    ctx.restore();

    // a soft skirt under the base so it is not a hard cut line
    const sg=ctx.createLinearGradient(0, base-rad*0.10, 0, base+rad*0.34);
    sg.addColorStop(0, rgba(shadow, a*0.5)); sg.addColorStop(1, rgba(shadow,0));
    ctx.fillStyle=sg;
    ctx.beginPath();
    ctx.ellipse(cx, base, rad*c.wide*0.78, rad*0.30, 0,0,TAU); ctx.fill();
  }
  ctx.restore();
}

/* birds. They stop coming as the air loads. Nobody says so. */
const BIRDS = []; let birdT = 2;
function updBirds(dt,t){
  birdT -= dt;
  if (birdT<=0){
    birdT = rnd(2.4, 7);
    const chance = (1-AIR.h)*(AIR.tod>0.18&&AIR.tod<0.82?1:0.15);
    if (BIRDS.length< (LOW?3:6) && Math.random()<chance){
      const d = Math.random()<0.5?1:-1;
      const n = ri(1,4);
      for (let i=0;i<n;i++)
        BIRDS.push({ x: d>0?-30-i*26:W+30+i*26, y: rnd(AP.y+AP.h*0.10, AP.y+AP.h*0.45)+i*rnd(-9,9),
                     d, sp: rnd(46,92), ph: rnd(0,TAU), fl: rnd(0,TAU), s: rnd(0.75,1.15) });
    }
  }
  for (let i=BIRDS.length-1;i>=0;i--){
    const b=BIRDS[i];
    b.x += b.d*b.sp*dt; b.y += Math.sin(t*0.9+b.ph)*11*dt; b.fl += dt*(7+Math.sin(t*2+b.ph)*2);
    if (b.x<-70||b.x>W+70) BIRDS.splice(i,1);
  }
}
function drawBirds(){
  const col = farColour([44,48,58], 500);
  ctx.save(); ctx.strokeStyle=rgba(col, 0.8*(1-AIR.h*0.55)); ctx.lineCap="round";
  for (const b of BIRDS){
    const w = MIN*0.011*b.s, f = Math.sin(b.fl);
    ctx.lineWidth = Math.max(1.2, MIN*0.0022);
    ctx.beginPath();
    ctx.moveTo(b.x-w, b.y+f*w*0.5);
    ctx.quadraticCurveTo(b.x-w*0.35, b.y-f*w*0.75, b.x, b.y);
    ctx.quadraticCurveTo(b.x+w*0.35, b.y-f*w*0.75, b.x+w, b.y+f*w*0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ LAND
   The one geography, drawn back to front. Each layer dissolves toward the
   sky's own colour by its real distance — that is what makes the hazy view
   have depth instead of looking like a grey sheet over the top.
*/
/* The painted version. Each layer is a baked canvas veiled by its own distance,
   which is what gives the aerial perspective. The old vector version is kept
   below as drawLandVector only because the binocular lenses re-render the world
   at a different zoom and need geometry rather than a fixed-scale bake. */
function drawLand(t, opt){
  opt = opt||{};
  const upTo = opt.upTo===undefined? 9 : opt.upTo;
  bakeTerrain();
  if (!TERR.hills) return { hy:AP.hy, s:skyStops() };
  if (upTo>0) blitLayer(TERR.hills, LAYER.hills, 0, 0);
  if (upTo>2) blitLayer(TERR.town,  LAYER.town,  0, 0);
  if (upTo>3) blitLayer(TERR.trees, LAYER.poplars, 0, 0);
  if (upTo>4) blitLayer(TERR.roofs, LAYER.roofs, 0, 0);
  // a chimney plume, once there is something to see coming out of it
  if (AIR.h>0.10 && !REDUCE && upTo>2){
    const L=LAYER.town, T0=reads(L.d);
    if (T0>0.02){
      const x=px(L,0.190), base=AP.hy+ph(L,L.y)-ph(L,0.100);
      ctx.save();
      for (let k=0;k<7;k++){
        const kk=(t*0.11+k*0.143)%1;
        const pxx=x + kk*pw(L,0.16) + Math.sin(t*0.5+k*2)*pw(L,0.016);
        const pyy=base - kk*ph(L,0.075);
        const prr=pw(L,0.008)*(1+kk*5.5);
        const g=ctx.createRadialGradient(pxx,pyy,0,pxx,pyy,prr);
        const pc2=mixL(farColour([128,120,112], L.d), airlight(), 0.3);
        g.addColorStop(0, rgba(pc2, 0.26*AIR.h*(1-kk)*T0*2));
        g.addColorStop(1, rgba(pc2,0));
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(pxx,pyy,prr,0,TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  return { hy:AP.hy, s:skyStops() };
}

function drawLandVector(t, opt){
  opt = opt||{};
  const s = skyStops();
  const hy = AP.hy;
  const upTo = opt.upTo===undefined? 9 : opt.upTo;   // how many layers (for the kite's high air)

  // ---- hills (go first)
  if (upTo>0){
    const L=LAYER.hills, T0=reads(L.d);
    if (T0>0.012){
      const c = farColour([88,116,104], L.d);
      ctx.fillStyle = rgba(c, cl01(T0*3.2));
      ctx.beginPath(); ctx.moveTo(AP.x-4, hy+4);
      for (const hh of GEO.hills){
        const x0 = px(L,hh.x-hh.w/2), x1 = px(L,hh.x+hh.w/2), hgt = ph(L,hh.h);
        ctx.lineTo(x0, hy);
        ctx.bezierCurveTo(lerp(x0,x1,0.28), hy-hgt*(0.85+hh.k*0.3),
                          lerp(x0,x1,0.66), hy-hgt*(0.7+hh.k*0.45), x1, hy);
      }
      ctx.lineTo(AP.x+AP.w+4, hy+4); ctx.closePath(); ctx.fill();
    }
  }
  // ---- second ridge
  if (upTo>1){
    const L=LAYER.ridge, T0=reads(L.d);
    if (T0>0.012){
      const c = farColour([96,120,106], L.d);
      ctx.fillStyle = rgba(c, cl01(T0*3.0));
      ctx.beginPath(); ctx.moveTo(AP.x-4, hy+4);
      for (const hh of GEO.ridge){
        const x0=px(L,hh.x-hh.w/2), x1=px(L,hh.x+hh.w/2), hgt=ph(L,hh.h);
        ctx.lineTo(x0,hy);
        ctx.quadraticCurveTo((x0+x1)/2, hy-hgt*(1+hh.k*0.4), x1, hy);
      }
      ctx.lineTo(AP.x+AP.w+4, hy+4); ctx.closePath(); ctx.fill();
    }
  }
  // ---- the town: water tower, school, chimney, blocks
  if (upTo>2){
    const L=LAYER.town, T0=reads(L.d), base = hy + ph(L,L.y);
    if (T0>0.010){
      const c = farColour([78,96,112], L.d);
      const a = cl01(T0*2.6);
      for (const b of GEO.town){
        const x=px(L,b.x), w=pw(L,b.w), hgt=ph(L,b.h);
        ctx.fillStyle=rgba(c,a);
        if (b.kind==="block"){
          ctx.fillRect(x-w/2, base-hgt, w, hgt);
          // a few lit windows at dawn/dusk, which the haze also softens
          const nightish = (AIR.tod<0.24||AIR.tod>0.68) ? 1 : 0;
          if (nightish && b.win>0.45 && T0>0.06){
            ctx.fillStyle=rgba(mixL([255,206,132], airlight(), 1-T0), a*0.85*nightish);
            for (let r=0;r<3;r++) for (let q=0;q<2;q++){
              if (hash(b.x*97+r*7+q)>0.5) ctx.fillRect(x-w/2+w*(0.2+q*0.42), base-hgt+hgt*(0.15+r*0.26), w*0.18, hgt*0.13);
            }
          }
        } else if (b.kind==="tower"){
          ctx.fillRect(x-w*0.12, base-hgt*0.72, w*0.24, hgt*0.72);
          ctx.beginPath();
          ctx.moveTo(x-w*0.5, base-hgt*0.66); ctx.lineTo(x+w*0.5, base-hgt*0.66);
          ctx.lineTo(x+w*0.42, base-hgt*0.98); ctx.lineTo(x-w*0.42, base-hgt*0.98);
          ctx.closePath(); ctx.fill();
          ctx.fillRect(x-w*0.46, base-hgt*1.02, w*0.92, hgt*0.06);
          // legs
          ctx.lineWidth=Math.max(1,pw(L,0.002)); ctx.strokeStyle=rgba(c,a);
          ctx.beginPath(); ctx.moveTo(x-w*0.34,base); ctx.lineTo(x-w*0.1,base-hgt*0.66);
          ctx.moveTo(x+w*0.34,base); ctx.lineTo(x+w*0.1,base-hgt*0.66); ctx.stroke();
        } else if (b.kind==="school"){
          ctx.fillRect(x-w/2, base-hgt, w, hgt);
          ctx.beginPath(); ctx.moveTo(x-w*0.55, base-hgt); ctx.lineTo(x, base-hgt*1.42);
          ctx.lineTo(x+w*0.55, base-hgt); ctx.closePath(); ctx.fill();
          ctx.fillRect(x+w*0.4, base-hgt*1.9, Math.max(1,pw(L,0.0015)), hgt*0.9);   // flagpole
        } else if (b.kind==="chimney"){
          ctx.fillRect(x-w/2, base-hgt, w, hgt);
          // a plume, only once the air is loaded — the source, quietly present
          if (AIR.h>0.10 && !REDUCE){
            ctx.save();
            for (let k=0;k<5;k++){
              const kk=(t*0.16+k*0.2)%1;
              const pxx = x + kk*pw(L,0.10) + Math.sin(t*0.5+k)*pw(L,0.01);
              const pyy = base-hgt - kk*ph(L,0.05);
              const prr = pw(L,0.006)*(1+kk*4);
              const g=ctx.createRadialGradient(pxx,pyy,0,pxx,pyy,prr);
              const pcol = farColour([120,112,104], L.d);
              g.addColorStop(0, rgba(pcol, 0.30*AIR.h*(1-kk))); g.addColorStop(1, rgba(pcol,0));
              ctx.fillStyle=g; ctx.beginPath(); ctx.arc(pxx,pyy,prr,0,TAU); ctx.fill();
            }
            ctx.restore();
          }
        }
      }
    }
  }
  // ---- poplar row
  if (upTo>3){
    const L=LAYER.poplars, T0=reads(L.d), base=hy+ph(L,L.y);
    if (T0>0.02){
      const c = farColour([62,88,64], L.d), a=cl01(T0*2.2);
      for (const p of GEO.poplars){
        const x=px(L,p.x), hgt=ph(L,0.075)*p.s, w=pw(L,0.0075)*p.s;
        const sway = Math.sin(t*0.9 + p.x*22)*w*0.35*AIR.wind;
        ctx.fillStyle=rgba(c,a);
        ctx.beginPath();
        ctx.moveTo(x-w/2, base);
        ctx.quadraticCurveTo(x-w*0.62+sway, base-hgt*0.5, x+sway*1.1, base-hgt);
        ctx.quadraticCurveTo(x+w*0.62+sway, base-hgt*0.5, x+w/2, base);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  // ---- near rooftops, the last thing to go. A thin band just under the
  //      horizon, not a mass reaching to the bottom of the frame.
  if (upTo>4){
    const L=LAYER.roofs, T0=reads(L.d), base=hy+ph(L,L.y);
    const foot = base + ph(L, 0.020);
    const c = farColour([56,62,66], L.d), a=cl01(T0*1.4+0.14);
    ctx.fillStyle=rgba(c,a);
    ctx.beginPath(); ctx.moveTo(AP.x-4, foot);
    for (const r of GEO.roofs){
      const x=px(L,r.x), w=pw(L,r.w), hgt=ph(L,r.h)*0.72;
      ctx.lineTo(x-w/2, base);
      if (r.kind==="flat"){ ctx.lineTo(x-w/2, base-hgt); ctx.lineTo(x+w/2, base-hgt); }
      else { ctx.lineTo(x-w/2, base-hgt*0.52); ctx.lineTo(x, base-hgt*(0.52+r.pitch*0.62));
             ctx.lineTo(x+w/2, base-hgt*0.52); }
      ctx.lineTo(x+w/2, base);
    }
    ctx.lineTo(AP.x+AP.w+4, foot); ctx.closePath(); ctx.fill();
    // a couple of chimneys, because a roofline without them reads as scenery
    for (let i=0;i<GEO.roofs.length;i+=4){
      const r=GEO.roofs[i], x=px(L,r.x), w=pw(L,r.w), hgt=ph(L,r.h)*0.72;
      ctx.fillStyle=rgba(c,a);
      ctx.fillRect(x+w*0.22, base-hgt*(0.52+r.pitch*0.62)-ph(L,0.010), pw(L,0.006), ph(L,0.014));
    }
  }
  return { hy, s };
}

/* the ground of the garden. Delegates to the baked grass field in the paint
   layer, so every scene that ever asked for ground gets the good one. */
function drawGround(t, topY, opt){
  drawGrassField(t, topY, opt);
}
function drawGroundVector(t, topY, opt){
  opt=opt||{};
  const h = AP.y+AP.h - topY;
  if (h<=0) return;
  const lit  = farColour(mixL([116,152,74],[150,168,86],0.4), 20);
  const dark = farColour([62,92,52], 24);
  const g = ctx.createLinearGradient(0, topY, 0, AP.y+AP.h);
  g.addColorStop(0, rgb(mixL(lit,airlight(),0.30)));
  g.addColorStop(0.35, rgb(lit));
  g.addColorStop(1, rgb(dark));
  ctx.fillStyle=g; ctx.fillRect(AP.x-2, topY, AP.w+4, h+4);

  // dry patches + stones
  ctx.save();
  for (const st of GEO.stones){
    const x=AP.x+st.x*AP.w, y=topY+st.y*h;
    ctx.fillStyle=rgba([150,144,128], 0.20);
    ctx.beginPath(); ctx.ellipse(x,y, MIN*0.006*st.s, MIN*0.003*st.s, 0,0,TAU); ctx.fill();
  }
  // tufts — density increases toward the viewer
  const n = LOW?110:220;
  for (let i=0;i<n;i++){
    const g2=GEO.grassTuft[i%GEO.grassTuft.length];
    const v = g2.y*g2.y;
    const x = AP.x+g2.x*AP.w, y = topY + v*h;
    const len = MIN*(0.008+0.026*v)*g2.s;
    const sway = Math.sin(t*1.5+g2.x*30)*len*0.22*AIR.wind;
    ctx.strokeStyle = rgba(mixL(dark,[168,186,96], v*0.5+g2.s*0.2), 0.5+0.4*v);
    ctx.lineWidth = Math.max(1, MIN*0.0016*(0.5+v));
    ctx.beginPath(); ctx.moveTo(x,y);
    ctx.quadraticCurveTo(x+g2.a*len*0.5+sway*0.5, y-len*0.6, x+g2.a*len+sway, y-len);
    ctx.stroke();
  }
  ctx.restore();
  if (opt.dust>0.02) drawGrime(AP.x, topY, AP.w, h, opt.dust*0.5);
}

/* ------------------------------------------------------------------ FIGURE
   A person as a soft silhouette. Never a face — the moment you draw a face it
   becomes a character instead of a memory.
*/
/* Proportions matter more than detail here, because these are always small on
   screen and always backlit. Eight heads tall, narrow shoulders, a waist, and a
   skirt that moves. No face — a face makes it a character instead of a memory. */
function figure(o){
  const s = o.s, x=o.x, y=o.y;           // y = the feet
  const a = o.a===undefined?0.9:o.a;
  const col = o.col || farColour([48,44,50], o.d||30);
  const reach = o.reach||0;              // 0 arms down, 1 arms up
  const child = o.child;
  const t = o.t||0;
  const HEAD = s*0.062;                  // head radius: 1/8 of height
  const hipY = y - s*0.50, shY = y - s*0.80, neckY = y - s*0.855;
  ctx.save();
  ctx.fillStyle = rgba(col, a);
  ctx.strokeStyle = rgba(col, a);
  ctx.lineCap="round";

  // legs
  const stance = child ? 0.055 : 0.040;
  ctx.lineWidth = s*(child?0.055:0.050);
  for (const side of [-1,1]){
    ctx.beginPath();
    ctx.moveTo(x+side*s*0.026, hipY);
    ctx.quadraticCurveTo(x+side*s*stance*1.2, y-s*0.24, x+side*s*stance, y);
    ctx.stroke();
  }
  if (o.skirt!==false && !child){
    // a skirt, which the wind gets into
    const sw = Math.sin(t*1.4)*s*0.022*(AIR.wind+AIR.gust);
    ctx.beginPath();
    ctx.moveTo(x-s*0.085, hipY-s*0.02);
    ctx.lineTo(x+s*0.085, hipY-s*0.02);
    ctx.quadraticCurveTo(x+s*0.150+sw, y-s*0.30, x+s*0.130+sw*1.4, y-s*0.20);
    ctx.quadraticCurveTo(x+sw*1.2, y-s*0.16, x-s*0.130+sw*1.4, y-s*0.20);
    ctx.quadraticCurveTo(x-s*0.150+sw, y-s*0.30, x-s*0.085, hipY-s*0.02);
    ctx.closePath(); ctx.fill();
  }
  // torso: shoulders wider than waist
  ctx.beginPath();
  ctx.moveTo(x-s*0.072, hipY);
  ctx.quadraticCurveTo(x-s*0.062, y-s*0.66, x-s*0.088, shY);
  ctx.quadraticCurveTo(x, shY-s*0.018, x+s*0.088, shY);
  ctx.quadraticCurveTo(x+s*0.062, y-s*0.66, x+s*0.072, hipY);
  ctx.closePath(); ctx.fill();
  // neck
  ctx.lineWidth=s*0.030;
  ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x, neckY); ctx.stroke();
  // head, tipped very slightly
  ctx.beginPath();
  ctx.ellipse(x+s*0.004, neckY-HEAD*0.92, HEAD*0.88, HEAD, 0.06, 0, TAU); ctx.fill();
  // hair: a knot at the back for her, a scruff for the child
  if (child){
    ctx.beginPath();
    ctx.arc(x-s*0.004, neckY-HEAD*1.08, HEAD*0.95, PI*0.98, TAU*0.06); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x-s*0.010, neckY-HEAD*1.02, HEAD*0.94, PI*0.92, TAU*0.10); ctx.fill();
    ctx.beginPath(); ctx.arc(x-s*0.072, neckY-HEAD*0.72, HEAD*0.46, 0, TAU); ctx.fill();
  }
  // arms: upper and lower, so a raised arm bends at the elbow
  const arms = [];
  for (const side of [-1,1]){
    const up = side===1 ? reach : (o.oneArm ? reach*0.12 : reach);
    const shx = x+side*s*0.082;
    // elbow
    const ex = shx + side*s*(0.058+0.030*up);
    const ey = shY + s*(0.145*(1-up)) - s*(0.055*up);
    // hand
    const hx2 = ex + side*s*(0.028+0.052*up);
    const hy2 = ey + s*(0.150*(1-up)) - s*(0.185*up);
    ctx.lineWidth=s*(child?0.040:0.036);
    ctx.beginPath(); ctx.moveTo(shx, shY+s*0.008); ctx.lineTo(ex, ey); ctx.lineTo(hx2, hy2); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx2, hy2, s*0.024, 0, TAU); ctx.fill();
    arms.push({ x:hx2, y:hy2 });
  }
  ctx.restore();
  return { handL:arms[0], handR:arms[1], headY:neckY-HEAD*1.9 };
}

/* soft contact shadow under anything standing on the ground */
function groundShadow(x,y,rx,ry,a){
  const g=ctx.createRadialGradient(x,y,0,x,y,rx);
  g.addColorStop(0, rgba([28,36,26], a===undefined?0.30:a)); g.addColorStop(1, rgba([28,36,26],0));
  ctx.save(); ctx.translate(x,y); ctx.scale(1, ry/rx); ctx.translate(-x,-y);
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,rx,0,TAU); ctx.fill(); ctx.restore();
}

/* ------------------------------------------------------------------ light shaft
   A volumetric wedge of light. Used for the window beam and, later, for the
   same beam full of something else.
*/
function shaft(o){
  const a = o.a; if (a<0.01) return;
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const g = ctx.createLinearGradient(o.x0,o.y0, o.x1,o.y1);
  g.addColorStop(0, rgba(o.col, a));
  g.addColorStop(0.45, rgba(o.col, a*0.5));
  g.addColorStop(1, rgba(o.col, 0));
  ctx.fillStyle=g;
  ctx.beginPath();
  ctx.moveTo(o.ax,o.ay); ctx.lineTo(o.bx,o.by); ctx.lineTo(o.cx,o.cy); ctx.lineTo(o.dx,o.dy);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* a vignette that reads as lens/eye rather than a black frame */
function vignette(){
  const dark = AIR.tod<0.14||AIR.tod>0.86;
  const g = ctx.createRadialGradient(W*0.5,H*0.48, MIN*0.30, W*0.5,H*0.5, MIN*0.92);
  g.addColorStop(0,"rgba(0,0,0,0)");
  g.addColorStop(1, dark ? "rgba(2,4,12,0.62)" : rgba(mixL([26,24,16],[92,90,80],AIR.h), 0.34));
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}
/* film grain — stops large gradients from banding, and adds a little tooth */
let grainCv=null;
function buildGrain(){
  grainCv = document.createElement("canvas"); grainCv.width=grainCv.height=140;
  const g=grainCv.getContext("2d"), im=g.createImageData(140,140), d=im.data;
  for (let i=0;i<d.length;i+=4){ const v=200+Math.random()*55; d[i]=d[i+1]=d[i+2]=v; d[i+3]=Math.random()*26; }
  g.putImageData(im,0,0);
}
function drawGrain(a){
  if (!grainCv||a<0.01) return;
  ctx.save(); ctx.globalAlpha=a; ctx.globalCompositeOperation="overlay";
  for (let y=0;y<H;y+=140) for (let x=0;x<W;x+=140) ctx.drawImage(grainCv,x,y);
  ctx.restore();
}
