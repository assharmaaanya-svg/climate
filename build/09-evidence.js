/* ============================================================================
   THE EVIDENCE
   Four beats. Each one is a thing from the story that becomes its own proof, so
   nothing here is a panel floating over a scene. The words are HTML only so the
   source links are real links; every image is drawn.
   ========================================================================== */
const EV = {
  lift:0, lifted:0, mag:0,          // the sill
  pull:0, held:0, revealed:0,       // the hills
  gather:0, phase:0,                // the stars
  cards:null
};

const EV_CARDS = [
  { id:"e-dust", tag:"what was in the air", lit:false,
    h:"This is what had been landing on the windowsill.",
    p:"Soot, brake and tyre dust, smoke, road grit, and particles that form in the air itself out of "+
       "exhaust gases. The mixture is measured by size. PM2.5 means everything under 2.5 micrometres "+
       "across — small enough to pass the nose and throat entirely and reach the deepest part of the lung.",
    src:'Definitions and health effects: <a href="https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health" target="_blank" rel="noopener">WHO — Ambient air quality and health</a> · '+
        '<a href="https://www.epa.gov/pm-pollution/particulate-matter-pm-basics" target="_blank" rel="noopener">US EPA — Particulate matter basics</a>' },

  { id:"e-hills", tag:"how far you could see", lit:true,
    h:"The hills never moved.",
    p:"Fine particles scatter light. That scattered light fills in the space between you and anything "+
       "distant, and contrast falls away with distance — so the farthest things go first, and the sky "+
       "turns from blue to white. Hold the air clean and the hills come back. They were always there.",
    src:'The visibility distance shown here is computed with the Koschmieder relation used in air-quality '+
        'monitoring — <a href="https://www.epa.gov/visibility/basic-information-about-visibility" target="_blank" rel="noopener">US EPA — Visibility &amp; haze</a> · '+
        'why particles whiten the sky: <a href="https://earthobservatory.nasa.gov/features/Aerosols" target="_blank" rel="noopener">NASA Earth Observatory — Aerosols</a>' },

  { id:"e-stars", tag:"who this happens to", lit:false,
    h:"Ninety-nine of every hundred people.",
    p:"99% of the world's population breathes air that exceeds WHO guideline levels, and outdoor air "+
       "pollution is linked to around 4.2 million premature deaths a year. Children take in more air for "+
       "their body weight than adults, breathe faster, and are still growing the lungs they will use for "+
       "the rest of their lives.<br><br><em>The stars are a separate story.</em> Most of the ones this work "+
       "took away are lost to artificial light at night, not to dust — night skies are brightening by "+
       "roughly 9.6% a year, which would take a place with 250 visible stars down to about 100 over a "+
       "childhood. Haze makes it worse by scattering that light back down, but the two causes are not "+
       "the same and this work does not merge them.",
    src:'<a href="https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health" target="_blank" rel="noopener">WHO — 99%, 4.2 million</a> · '+
        '<a href="https://www.unicef.org/media/123156/file/Childhood_Air_Pollution_Key_Messages_2022.pdf" target="_blank" rel="noopener">UNICEF — why children</a> · '+
        '<a href="https://www.science.org/doi/10.1126/science.abq7781" target="_blank" rel="noopener">Kyba et al. 2023, <em>Science</em> — 9.6%/yr, 250→100 stars</a>' }
];

function buildEvidenceCards(){
  const host = document.getElementById("ev");
  host.innerHTML = "";
  EV.cards = {};
  for (const c of EV_CARDS){
    const d = document.createElement("div");
    d.className = "card" + (c.lit?" lit":"");
    d.innerHTML = '<span class="tag">'+c.tag+'</span><h2>'+c.h+'</h2><p>'+c.p+'</p><p class="src">'+c.src+'</p>';
    host.appendChild(d);
    EV.cards[c.id]=d;
  }
}
function showCard(which){
  if (!EV.cards) return;
  for (const k in EV.cards) EV.cards[k].classList.toggle("on", k===which);
  const host=document.getElementById("ev");
  host.classList.toggle("on", !!which);
  host.setAttribute("aria-hidden", which?"false":"true");
}

/* --------------------------------------------------------------- 1 · the sill
   You drag upward and what settled on the sill comes off it, and keeps rising,
   and keeps getting bigger, until it is the size of the thing it actually is
   next to a hair and a cell.
*/
function evDust(t, dt, f){
  // a night-time room edge: we are still at the window we were just stopped at
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#0d141d"); bg.addColorStop(0.6,"#131c26"); bg.addColorStop(1,"#0a1017");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  const sillY = H*0.80;
  // the sill itself, lit from one side
  const sg=ctx.createLinearGradient(0,sillY,0,H);
  sg.addColorStop(0,"#6b5644"); sg.addColorStop(0.10,"#54422f"); sg.addColorStop(1,"#2a2018");
  ctx.fillStyle=sg; ctx.fillRect(0,sillY,W,H-sillY);
  ctx.fillStyle="rgba(255,236,200,0.10)"; ctx.fillRect(0,sillY,W,MIN*0.006);
  // wood grain
  for (let i=0;i<26;i++){
    ctx.strokeStyle="rgba(30,22,14,0.22)"; ctx.lineWidth=Math.max(1,MIN*0.0015);
    const y=sillY+MIN*0.012+i*MIN*0.008;
    ctx.beginPath();
    for (let x=0;x<=W;x+=30) ctx.lineTo(x, y+Math.sin(x*0.01+i)*MIN*0.0018);
    ctx.stroke();
  }
  // the grime still on it
  drawGrime(0, sillY, W, MIN*0.09, (1-EV.lifted)*0.85);

  EV.lift = lerp(EV.lift, (P.down&&P.active) ? cl01((sillY-P.y)/(H*0.55)) : 0, 0.10);
  EV.lifted = Math.max(EV.lifted, EV.lift);
  if (EV.lifted>0.72) meet("lift");
  EV.mag = lerp(EV.mag, EV.lifted>0.7 ? 1 : 0, 0.045);

  /* the risen particles, drifting up and turning over */
  const n = LOW?46:90;
  for (let i=0;i<n;i++){
    const hh=hash(i*3.7), hv=hash(i*7.1+3), hs=hash(i*11.3+9);
    const rise = cl01(EV.lift*1.4 - hh*0.4);
    const x = W*0.06 + hh*W*0.88 + Math.sin(t*0.6+i)*MIN*0.02*rise;
    const y = sillY - rise*(H*0.52+hv*H*0.16) + Math.cos(t*0.5+i*2)*MIN*0.012*rise;
    if (rise<=0.01) continue;
    const r = MIN*(0.0012+hs*0.0026)*(1+rise*1.4);
    ctx.save();
    ctx.translate(x,y); ctx.rotate(t*0.4+i);
    // irregular, because real particles are not spheres
    ctx.fillStyle=rgba([128,118,104], 0.34+rise*0.42);
    ctx.beginPath();
    for (let k=0;k<7;k++){
      const a=k/7*TAU, rr=r*(0.62+hash(i*13+k)*0.7);
      if(k===0) ctx.moveTo(Math.cos(a)*rr, Math.sin(a)*rr); else ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* the scale, once it is up: real sizes, drawn to scale against each other */
  if (EV.mag>0.02){
    const a=EV.mag;
    const cy = H*0.36;
    const scale = MIN*0.0072;                       // px per micrometre
    const items = [
      { um:70,  lab:"a hair",            col:[168,132,96],  sub:"70 µm" },
      { um:10,  lab:"PM10",              col:[150,140,124], sub:"10 µm" },
      { um:7.5, lab:"a red blood cell",  col:[196,86,86],   sub:"7.5 µm" },
      { um:2.5, lab:"PM2.5",             col:[122,112,100], sub:"2.5 µm" }
    ];
    let x = W*0.13;
    ctx.save(); ctx.globalAlpha=a;
    for (const it of items){
      const r = Math.max(1.2, it.um*scale*0.5);
      // the hair drawn as a hair, not a circle
      if (it.um===70){
        ctx.strokeStyle=rgba(it.col,0.9); ctx.lineWidth=it.um*scale;
        ctx.beginPath();
        ctx.moveTo(x-MIN*0.02, cy-MIN*0.11);
        ctx.bezierCurveTo(x+MIN*0.03, cy-MIN*0.03, x-MIN*0.03, cy+MIN*0.04, x+MIN*0.02, cy+MIN*0.11);
        ctx.stroke();
      } else {
        ctx.fillStyle=rgba(it.col, it.um<3?0.95:0.8);
        ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU); ctx.fill();
        if (it.um<3){
          // ring it, or nobody would find it
          ctx.strokeStyle=rgba([236,200,150], 0.55+0.35*Math.sin(t*2));
          ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(x, cy, Math.max(r+MIN*0.014, MIN*0.02), 0, TAU); ctx.stroke();
        }
        if (it.lab==="a red blood cell"){
          ctx.fillStyle=rgba(shade(it.col,0.72),0.9);
          ctx.beginPath(); ctx.arc(x,cy,r*0.45,0,TAU); ctx.fill();
        }
      }
      ctx.font = (MIN*0.019|0)+"px "+MONO;
      ctx.fillStyle=rgba([236,240,246],0.82); ctx.textAlign="center";
      ctx.fillText(it.lab, x, cy+MIN*0.15);
      ctx.fillStyle=rgba([236,240,246],0.45);
      ctx.fillText(it.sub, x, cy+MIN*0.178);
      x += W*0.215;
    }
    ctx.restore();
  }
  // a hint drawn rather than written: an arrow of dust wanting to go up
  if (EV.lifted<0.2){
    const a=0.3+0.2*Math.sin(t*2);
    ctx.strokeStyle=rgba([236,230,214],a); ctx.lineWidth=Math.max(1.4,MIN*0.0024); ctx.lineCap="round";
    for (let k=0;k<3;k++){
      const yy=sillY-MIN*0.05-k*MIN*0.035;
      ctx.beginPath();
      ctx.moveTo(W*0.5-MIN*0.016, yy+MIN*0.014); ctx.lineTo(W*0.5, yy);
      ctx.lineTo(W*0.5+MIN*0.016, yy+MIN*0.014); ctx.stroke();
    }
  }
  showCard(EV.mag>0.35 ? "e-dust" : null);
}

/* --------------------------------------------------------------- 2 · the hills
   Drag downward and you are pulling the air clean. The landscape you searched
   for with the binoculars comes back — the same renderer, a different number.
   Let go and it leaves, because you cannot hold it.
*/
function evHills(t, dt, f){
  const pull = (P.down&&P.active) ? cl01((P.y - H*0.16)/(H*0.62)) : 0;
  EV.pull = lerp(EV.pull, (P.down&&P.active) ? cl01(1 - pull) : 0, 0.10);
  if (EV.pull>0.55){ EV.revealed = Math.max(EV.revealed, EV.pull); meet("pull"); }

  // the air we are showing right now
  const pmNow = lerp(168, 5, EV.pull);
  const keep = AIR.pm, kg = AIR.glow, kt = AIR.tod;
  AIR.pm = pmNow; AIR.tod = 0.42; AIR.glow = 0; updateAir();

  apFull();
  const s = drawSky();
  const sp = drawSun(t,s);
  drawClouds(s);
  drawLand(t,{});
  drawWires(t, AP.hy-AP.h*0.08, { a:0.7 });
  if (EV.pull>0.45) drawBirds();
  drawGround(t, AP.hy+AP.h*0.14, {});
  partRole=2;
  drawParticles(t, 0.22+AIR.h*0.8, sp?{x:sp.x,y:sp.y,r:H}:null);

  /* the readout. Drawn, not a widget: a vertical scale at the right edge with a
     mark you are holding, the distance in kilometres beside it. */
  const rx = W-MIN*0.10, y0=H*0.16, y1=H*0.78;
  ctx.save();
  ctx.strokeStyle="rgba(255,255,255,0.20)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(rx,y0); ctx.lineTo(rx,y1); ctx.stroke();
  for (let i=0;i<=8;i++){
    const yy=lerp(y0,y1,i/8);
    ctx.beginPath(); ctx.moveTo(rx-MIN*0.010, yy); ctx.lineTo(rx, yy); ctx.stroke();
  }
  const my = lerp(y1, y0, EV.pull);
  ctx.fillStyle="rgba(255,248,232,0.92)";
  ctx.beginPath();
  ctx.moveTo(rx-MIN*0.022,my); ctx.lineTo(rx-MIN*0.006,my-MIN*0.009);
  ctx.lineTo(rx-MIN*0.006,my+MIN*0.009); ctx.closePath(); ctx.fill();
  ctx.textAlign="right";
  ctx.font=(MIN*0.050|0)+"px "+SERIF;
  ctx.fillStyle="rgba(255,252,244,0.95)";
  ctx.fillText(AIR.vr<10 ? AIR.vr.toFixed(1) : Math.round(AIR.vr)+"", rx-MIN*0.034, my+MIN*0.017);
  ctx.font=(MIN*0.016|0)+"px "+MONO;
  ctx.fillStyle="rgba(255,252,244,0.55)";
  ctx.fillText("km of visibility", rx-MIN*0.034, my+MIN*0.040);
  ctx.fillText(Math.round(pmNow)+" µg/m³ PM2.5", rx-MIN*0.034, my+MIN*0.062);
  ctx.restore();

  // the landmark names quietly return as they become visible again
  ctx.save();
  ctx.font=(MIN*0.017|0)+"px "+MONO; ctx.textAlign="center";
  for (const m of MARKS){
    const L=LAYER[m.L];
    const T0=reads(L.d);
    const a = cl01((T0-0.06)*3.2);
    if (a<0.03) continue;
    const x=px(L,m.fx), y=AP.hy+ph(L,L.y)-ph(L,0.035);
    ctx.fillStyle=rgba([255,252,244], a*0.62);
    ctx.fillText(m.label, x, y-MIN*0.014);
    ctx.strokeStyle=rgba([255,252,244], a*0.28); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x,y-MIN*0.010); ctx.lineTo(x,y-MIN*0.002); ctx.stroke();
  }
  ctx.restore();

  // a drawn instruction: a hand-shaped pull, only until you've done it
  if (EV.revealed<0.1){
    const a=0.34+0.22*Math.sin(t*1.9);
    ctx.save();
    ctx.strokeStyle=rgba([20,26,34],a); ctx.lineWidth=Math.max(1.6,MIN*0.003); ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(W*0.5, H*0.62); ctx.lineTo(W*0.5, H*0.30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W*0.5-MIN*0.02,H*0.34); ctx.lineTo(W*0.5,H*0.29);
    ctx.lineTo(W*0.5+MIN*0.02,H*0.34); ctx.stroke();
    ctx.restore();
  }

  AIR.pm=keep; AIR.glow=kg; AIR.tod=kt; updateAir();
  showCard(EV.revealed>0.3 ? "e-hills" : null);
}

/* --------------------------------------------------------------- 3 · the stars
   The shape you traced comes apart and re-forms as the count. Then it becomes a
   sky of 250 stars that loses 150 of them — and that one is light, not dust.
*/
const GRID = [];
function buildGrid(){
  GRID.length=0;
  for (let i=0;i<100;i++){
    GRID.push({ x:rnd(0,1), y:rnd(0,1), tx:0, ty:0, b:rnd(0.5,1), ph:rnd(0,TAU),
                on: i>0, sx:rnd(0,1), sy:rnd(0,1) });
  }
}
function evStars(t, dt, f){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#060b1c"); bg.addColorStop(0.7,"#0a1128"); bg.addColorStop(1,"#101832");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  const phaseB = sm(f, 0.46, 0.62);
  EV.gather = lerp(EV.gather, 1, 0.03);

  if (phaseB < 0.5){
    /* --- 99 in 100 --- */
    const cols=10, rows=10;
    const gw = Math.min(W*0.60, H*0.52), cell = gw/cols;
    const gx = (W-gw)/2, gy = H*0.30;
    for (let i=0;i<100;i++){
      const g2=GRID[i];
      const tx = gx + (i%cols)*cell + cell/2;
      const ty = gy + Math.floor(i/cols)*cell + cell/2;
      const q = cl01(EV.gather*1.3 - (i%cols)*0.02);
      const x = lerp(g2.x*W, tx, ease.o3(q));
      const y = lerp(g2.y*H, ty, ease.o3(q));
      const tw = 0.7+0.3*Math.sin(t*2+g2.ph);
      const r = MIN*0.0032*(0.7+g2.b*0.6);
      if (g2.on){
        ctx.fillStyle=rgba([255,232,178], (0.55+0.4*tw)*q);
        ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation="lighter";
        const gg=ctx.createRadialGradient(x,y,0,x,y,r*6);
        gg.addColorStop(0,rgba([255,226,160],0.26*q)); gg.addColorStop(1,rgba([255,226,160],0));
        ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(x,y,r*6,0,TAU); ctx.fill(); ctx.restore();
      } else {
        // the one. Drawn as an outline, so the eye finds it.
        ctx.strokeStyle=rgba([150,190,230], 0.75*q); ctx.lineWidth=1.4;
        ctx.beginPath(); ctx.arc(x,y,r*1.9,0,TAU); ctx.stroke();
      }
    }
    const a = cl01(EV.gather*1.2-0.35);
    ctx.save(); ctx.textAlign="center";
    ctx.font="400 "+(MIN*0.15|0)+"px "+SERIF;
    ctx.fillStyle=rgba([255,246,226], a*0.95);
    ctx.fillText("99", W*0.5, gy-MIN*0.055);
    ctx.font=(MIN*0.019|0)+"px "+MONO;
    ctx.fillStyle=rgba([226,232,244], a*0.7);
    ctx.fillText("of every hundred people breathe air", W*0.5, gy+gw+MIN*0.062);
    ctx.fillText("above WHO guideline levels", W*0.5, gy+gw+MIN*0.090);
    ctx.restore();
  } else {
    /* --- 250 → 100, and this one is light --- */
    const lose = sm(f, 0.66, 0.94);
    // the skyglow rising from below, which is the actual cause
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const g=ctx.createRadialGradient(W*0.5,H*1.05,MIN*0.1,W*0.5,H*1.05,H*1.15);
    g.addColorStop(0, rgba([216,178,120], 0.30*lose));
    g.addColorStop(0.4, rgba([190,160,120], 0.10*lose));
    g.addColorStop(1, rgba([190,160,120],0));
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H); ctx.restore();

    let shown=0;
    for (let i=0;i<250;i++){
      const hx=hash(i*4.1), hy=hash(i*8.3+2), hb=hash(i*2.7+5);
      // the faintest 150 go first
      const survives = hb > lose*0.60;
      const x=W*0.08+hx*W*0.84, y=H*0.16+hy*H*0.56;
      const tw=0.65+0.35*Math.sin(t*1.8+i);
      const a = survives ? (0.35+hb*0.6)*tw : (0.35+hb*0.6)*tw*cl01(1-lose*1.9);
      if (a<0.02) continue;
      shown++;
      ctx.fillStyle=rgba([226,234,255], a);
      ctx.beginPath(); ctx.arc(x,y, MIN*0.0011+hb*MIN*0.0019, 0, TAU); ctx.fill();
    }
    ctx.save(); ctx.textAlign="center";
    ctx.font="400 "+(MIN*0.10|0)+"px "+SERIF;
    ctx.fillStyle=rgba([236,242,255],0.92);
    const n = Math.round(lerp(250, 100, lose));
    ctx.fillText(n+"", W*0.5, H*0.86);
    ctx.font=(MIN*0.018|0)+"px "+MONO;
    ctx.fillStyle=rgba([226,232,244],0.62);
    ctx.fillText(lose<0.5 ? "stars, at the start of a childhood"
                          : "by the end of it — and this one is light, not dust", W*0.5, H*0.90);
    ctx.restore();
  }
  showCard("e-stars");
}

/* --------------------------------------------------------------- 4 · the ledger
   Behind the words, the world of the piece, quiet and hazy, still moving.
*/
function evLedger(t, dt, f){
  const keep=AIR.tod; AIR.tod=0.40;
  apFull();
  const s=drawSky(); drawSun(t,s); drawClouds(s); drawLand(t,{});
  drawGround(t, AP.hy+AP.h*0.14, { dust:0.5 });
  partRole=2; drawParticles(t, 0.75, null);
  ctx.fillStyle="rgba(8,12,20,0.62)"; ctx.fillRect(0,0,W,H);
  AIR.tod=keep;
  showCard(null);
  const l=document.getElementById("ledger");
  l.classList.add("on"); l.setAttribute("aria-hidden","false");
}
function hideLedger(){
  const l=document.getElementById("ledger");
  l.classList.remove("on"); l.setAttribute("aria-hidden","true");
}
