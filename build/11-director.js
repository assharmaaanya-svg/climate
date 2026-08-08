/* ============================================================================
   THE DIRECTOR
   Sets the air for each beat, dispatches the scene, and owns the morphs.

   On morphs: there is no crossfade anywhere in this piece. Every boundary is
   handled one of two ways.
     1. Continuity. The sky's colour comes from (time of day, air) and both are
        continuous across boundaries, so a boundary in the middle of dusk simply
        keeps getting darker. Nothing to hide.
     2. A carried object plus a moving aperture. One thing survives the cut and
        changes shape into the next thing, while the frame you are looking
        through physically travels: window → open world → two lenses → a circle →
        a sheet of paper → a window again.
   ========================================================================== */

const AIRPLAN = {
  "dark":      { pm:[5,5],      tod:[0.115,0.185], glow:[0.04,0.02] },
  "light":     { pm:[5,5],      tod:[0.185,0.265], glow:[0.02,0] },
  "breathe":   { pm:[5,6],      tod:[0.265,0.335], glow:[0,0] },
  "laundry":   { pm:[6,6],      tod:[0.355,0.435], glow:[0,0] },
  "shirt":     { pm:[6,7],      tod:[0.435,0.470], glow:[0,0] },
  "kite":      { pm:[7,7],      tod:[0.470,0.620], glow:[0,0] },
  "climb":     { pm:[7,8],      tod:[0.620,0.885], glow:[0,0.04] },
  "stars":     { pm:[8,9],      tod:[0.945,0.965], glow:[0.05,0.06] },
  "wish":      { pm:[9,9],      tod:[0.965,0.985], glow:[0.06,0.06] },
  "horizon":   { pm:[10,12],    tod:[0.215,0.425], glow:[0.03,0] },
  "drawing":   { pm:[12,14],    tod:[0.440,0.465], glow:[0,0] },
  /* chapter three: this is where it becomes visible, and it happens fast */
  "r-laundry": { pm:[34,48],    tod:[0.400,0.440], glow:[0,0] },
  "r-kite":    { pm:[52,68],    tod:[0.460,0.560], glow:[0,0] },
  "r-stars":   { pm:[72,84],    tod:[0.950,0.975], glow:[0.48,0.60] },
  "r-horizon": { pm:[88,102],   tod:[0.360,0.420], glow:[0,0] },
  "r-drawing": { pm:[104,116],  tod:[0.440,0.460], glow:[0,0] },
  "indoors":   { pm:[120,136],  tod:[0.365,0.395], glow:[0,0] },
  "return":    { pm:[142,158],  tod:[0.245,0.285], glow:[0,0] },
  "stopped":   { pm:[164,168],  tod:[0.285,0.305], glow:[0,0] },
  "named":     { pm:[168,168],  tod:[0.305,0.320], glow:[0,0] },
  "e-dust":    { pm:[168,168],  tod:[0.03,0.03],   glow:[0.2,0.2] },
  "e-hills":   { pm:[168,168],  tod:[0.42,0.42],   glow:[0,0] },
  "e-stars":   { pm:[168,168],  tod:[0.97,0.97],   glow:[0.5,0.5] },
  "e-ledger":  { pm:[168,168],  tod:[0.40,0.40],   glow:[0,0] },
  "f-curtain": { pm:[160,158],  tod:[0.245,0.275], glow:[0,0] },
  "f-both":    { pm:[158,156],  tod:[0.275,0.295], glow:[0,0] },
  "f-open":    { pm:[156,154],  tod:[0.295,0.315], glow:[0,0] },
  "f-crayon":  { pm:[154,152],  tod:[0.315,0.335], glow:[0,0] },
  "f-rest":    { pm:[152,150],  tod:[0.335,0.350], glow:[0,0] },
  "f-end":     { pm:[150,148],  tod:[0.350,0.365], glow:[0,0] }
};
function setAir(bid, f){
  const a = AIRPLAN[bid];
  if (!a) return;
  const e = ease.io(f);
  AIR.pm   = lerp(a.pm[0],  a.pm[1],  e);
  AIR.tod  = lerp(a.tod[0], a.tod[1], e);
  AIR.glow = lerp(a.glow[0],a.glow[1],e);
  updateAir();
}

/* gusts: the wind is never constant, and a gust is a good excuse for leaves */
let gustT = 3;
function updWind(dt){
  gustT -= dt;
  if (gustT<=0){
    gustT = rnd(4.5, 11);
    AIR.gustTarget = rnd(0.15, 0.55) * (1-AIR.h*0.4);
    if (!REDUCE && Math.random()<0.55 && OUTSIDE>0.4 && SILENCE<0.02){ gustLeaves(ri(3,9)); sfx.gust(); }
  }
  AIR.gust = lerp(AIR.gust, AIR.gustTarget||0, 0.02);
  if (Math.random()<0.008) AIR.gustTarget = rnd(0, 0.3);
}

/* the transition amount out of the current beat */
const TQ = () => sm(T.f, 0.80, 1.0);

/* Beats with something to do that is not a gate. `true` once it is done. */
const OPTIONAL = {
  laundry: () => !!SHEETS.tapped
};

/* ------------------------------------------------------------------ morph 1
   The window becomes the world. The frame widens until it is the edge of the
   screen, the walls thin out to nothing, and the two curtain panels lengthen
   and separate until they are two sheets on a line.
*/
function morphRoomToWorld(t, q){
  const wr = winRect();
  const e = ease.io(q);
  const inx=lerp(wr.x+wr.w*0.055, 0, e), iny=lerp(wr.y+wr.h*0.05, 0, e);
  const inw=lerp(wr.w*0.89, W, e), inh=lerp(wr.h*0.82, H, e);
  setAp({ mode:"rect", x:inx, y:iny, w:inw, h:inh, hf:lerp(0.70,0.66,e) });

  ctx.save(); clipAp(ctx);
  const s=drawSky(); const sp=drawSun(t,s); drawClouds(s); drawPlane();
  drawLand(t,{});
  drawWires(t, AP.hy-AP.h*0.10, { a:1-e*0.4 });
  drawBirds();
  // the garden arrives from underneath as the frame opens
  const groundY = AP.hy+AP.h*0.12;
  if (e>0.15) drawGround(t, groundY, {});
  // the line, and the sheets that used to be curtains
  const lineY = lerp(wr.y-MIN*0.014, AP.y+AP.h*0.20, e);
  if (e>0.25){
    ctx.strokeStyle=rgba(farColour([58,48,42],26), (e-0.25)/0.75*0.85);
    ctx.lineWidth=Math.max(1.4,MIN*0.0026);
    ctx.beginPath();
    for (let i=0;i<=26;i++){ const u=i/26; ctx.lineTo(AP.x+u*AP.w, lineY+Math.sin(u*PI)*MIN*0.022); }
    ctx.stroke();
  }
  drawParticles(t, 0.3, sp?{x:sp.x,y:sp.y,r:H}:null);
  ctx.restore();

  // the room, dissolving as a solid, not as a fade: the wall shrinks to the edges
  ctx.save();
  ctx.globalAlpha = 1-ease.i(q);
  ctx.beginPath(); ctx.rect(0,0,W,H); ctx.rect(inx,iny,inw,inh);
  ctx.fillStyle=rgb(mixL([158,146,152],[186,172,168],0.5)); ctx.fill("evenodd");
  ctx.restore();
  // the frame itself thins and goes
  ctx.strokeStyle=rgba([58,46,38], 0.96*(1-ease.i(q)));
  ctx.lineWidth=Math.max(2,MIN*0.026*(1-e*0.8));
  ctx.strokeRect(inx,iny,inw,inh);

  /* the carried object: curtain → sheet. Same renderer, parameters travelling. */
  const panelW = wr.w*0.56;
  const curCol = mixL([176,74,66], [250,248,242], e);
  const sheetH = lerp(wr.h*1.045, H*0.34, e);
  const part = lerp(0.90, 0, e);
  const rodY = lineY;
  for (const side of [1,-1]){
    const restA = side===1 ? wr.x-MIN*0.030-panelW*0.62 : wr.x+wr.w+MIN*0.030+panelW*0.62-panelW*0.58;
    const restB = restA + panelW*0.58;
    // where the sheet ends up on the line
    const tA = AP.x + (side===1 ? 0.20 : 0.56)*AP.w;
    const tB = tA + 0.20*AP.w;
    const ax = lerp(restA, tA, e), bx2 = lerp(restB, tB, e);
    cloth({ ax, ay:rodY, bx:bx2, by:rodY, h:sheetH,
            col:curCol, ph:side===1?0.4:2.6, folds:lerp(6,5,e),
            amp:lerp(MIN*0.013,MIN*0.014,e), windAmp:lerp(MIN*0.030,MIN*0.036,e),
            thin:lerp(0.30,0.82,e), part, gatherDir:side,
            light:sunPos(AP), backlit:1, pegs:e>0.6, hem:e>0.5?[206,170,120]:null,
            seed:side===1?1:2 }, t);
  }
}

/* ------------------------------------------------------------------ morph 2
   A corner of a sheet lifts free, folds twice, and is a kite.
*/
function morphSheetToKite(t, q){
  const e = ease.io(q);
  apFull();
  const s=drawSky(); const sp=drawSun(t,s); drawClouds(s);
  drawLand(t, { upTo: lerp(9,5,e)|0 });
  drawBirds();
  // the hill rises to meet the kite scene
  const gy = lerp(AP.hy+AP.h*0.12, AP.y+AP.h*0.86, e);
  drawGround(t, gy, {});
  // the line still there, receding
  if (e<0.9){
    const lineY = AP.y+AP.h*0.20;
    ctx.strokeStyle=rgba(farColour([58,48,42],26), 0.85*(1-e));
    ctx.lineWidth=Math.max(1.4,MIN*0.0026);
    ctx.beginPath();
    for (let i=0;i<=26;i++){ const u=i/26; ctx.lineTo(AP.x+u*AP.w, lineY+Math.sin(u*PI)*MIN*0.022); }
    ctx.stroke();
    // the remaining sheets, shrinking away
    for (let k=0;k<3;k++){
      const u=0.14+k*0.28;
      cloth({ ax:AP.x+u*AP.w, ay:lineY, bx:AP.x+(u+0.18)*AP.w, by:lineY,
              h:H*0.34*(1-e*0.5), col:farColour([248,246,240],24), ph:k*2.1,
              folds:5, amp:MIN*0.014, windAmp:MIN*0.036, thin:0.82, light:sp,
              pegs:true, seed:k*17, alpha:1-e*0.9 }, t);
    }
  }
  /* the corner: a triangle of cloth that folds in on itself and stiffens */
  const from = { x: AP.x+0.32*AP.w, y: AP.y+0.20*AP.h + H*0.30 };
  const to   = { x: W*0.55, y: H*0.36 };
  const x = lerp(from.x, to.x, ease.o3(e));
  const y = lerp(from.y, to.y, ease.o3(e));
  const sz = lerp(MIN*0.075, MIN*0.052, e);
  const fold = e;                       // 0 = a limp corner, 1 = a taut diamond
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(lerp(-0.5, 0.18, e) + Math.sin(t*2)*0.04*e);
  const col = mixL([250,248,242], [214,64,72], sm(e,0.30,0.85));
  // it starts as a soft flapping triangle and becomes a rigid four-sided kite
  ctx.beginPath();
  ctx.moveTo(0, -sz*lerp(0.55,1,fold));
  ctx.lineTo(sz*lerp(0.85,0.66,fold), lerp(sz*0.5,0,fold));
  ctx.lineTo(0, sz*lerp(0.7,1.15,fold));
  ctx.lineTo(-sz*lerp(0.2,0.66,fold), lerp(sz*0.35,0,fold));
  ctx.closePath();
  ctx.fillStyle=rgb(col); ctx.fill();
  if (e>0.4){
    ctx.beginPath();
    ctx.moveTo(0,-sz*0.34); ctx.lineTo(sz*0.24,0); ctx.lineTo(0,sz*0.4); ctx.lineTo(-sz*0.24,0);
    ctx.closePath();
    ctx.fillStyle=rgba([242,196,110], (e-0.4)/0.6*0.95); ctx.fill();
    ctx.strokeStyle=rgba([250,242,226],(e-0.4)/0.6*0.5); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,-sz); ctx.lineTo(0,sz*1.15); ctx.moveTo(-sz*0.66,0); ctx.lineTo(sz*0.66,0); ctx.stroke();
  }
  ctx.restore();
  // the string appears, drawn from a hand on the hill
  if (e>0.3){
    const hx=W*0.32, hy=gy-MIN*0.10;
    ctx.strokeStyle=rgba([64,60,66], (e-0.3)/0.7*0.5);
    ctx.lineWidth=Math.max(1,MIN*0.0015);
    ctx.beginPath(); ctx.moveTo(hx,hy);
    ctx.quadraticCurveTo((hx+x)/2, (hy+y)/2+MIN*0.18*(1-e), x, y); ctx.stroke();
  }
  drawParticles(t, 0.24, sp?{x:sp.x,y:sp.y,r:H}:null);
  drawLeaves();
}

/* ------------------------------------------------------------------ morph 3
   The kite is a long way up and the sky has gone dark behind it. It stops being
   a shape and becomes a point of light. The line you are holding stays, and
   becomes the line drawn between two stars.
*/
function morphKiteToStar(t, dt, q){
  const e = ease.io(q);
  drawStars(t, dt, {});
  const kx = lerp(KITE.x||W*0.55, W*0.5+ (CONST[0]? 0 : 0), e*0.35);
  const ky = lerp(KITE.y||H*0.34, AP.y+0.22*AP.h, e*0.5);
  // the kite shrinking to a star, and brightening as it goes
  const sz = lerp(MIN*0.040, MIN*0.0022, ease.i(e));
  ctx.save();
  ctx.translate(kx,ky); ctx.rotate(0.18+Math.sin(t*2)*0.04*(1-e));
  const col = mixL([214,64,72],[255,246,226], e);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(0,-sz); ctx.lineTo(sz*0.66,0); ctx.lineTo(0,sz*1.15); ctx.lineTo(-sz*0.66,0);
  ctx.closePath(); ctx.fillStyle=rgb(col); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation="lighter";
  const g=ctx.createRadialGradient(kx,ky,0,kx,ky,MIN*0.05*e);
  g.addColorStop(0,rgba([255,246,226],0.7*e)); g.addColorStop(1,rgba([255,246,226],0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(kx,ky,MIN*0.05*e,0,TAU); ctx.fill(); ctx.restore();
  // the string, becoming a constellation line
  const hx=W*0.32, hy=H*0.90;
  ctx.strokeStyle=rgba(mixL([64,60,66],[196,216,255],e), lerp(0.45,0.30,e));
  ctx.lineWidth=Math.max(1,MIN*0.0014);
  ctx.beginPath(); ctx.moveTo(hx,hy);
  const sagAmt = MIN*0.16*(1-e);
  ctx.quadraticCurveTo((hx+kx)/2, (hy+ky)/2+sagAmt, kx, ky);
  ctx.stroke();
  if (e>0.55){
    // a second star at the hand end, so the line reads as a constellation line
    ctx.fillStyle=rgba([236,242,255],(e-0.55)/0.45);
    ctx.beginPath(); ctx.arc(hx,hy,MIN*0.0022,0,TAU); ctx.fill();
  }
}

/* ------------------------------------------------------------------ morph 4
   Two bright stars swell until they are the two lenses of a pair of binoculars,
   and the night behind them turns into a morning.
*/
function morphStarsToLenses(t, dt, q){
  const e = ease.io(q);
  // the sky is already brightening because tod is moving; draw both worlds'
  // shared sky once and let the stars fade into it naturally
  apFull();
  const s = drawSky();
  if (e<0.8) { const keep=ctx.globalAlpha; ctx.globalAlpha=1-e*1.2; drawStars(t,dt,{}); ctx.globalAlpha=keep; }
  else { drawSun(t,s); drawClouds(s); drawLand(t,{}); drawGround(t,AP.hy+AP.h*0.14,{}); }

  const cx=W*0.5, cy=H*0.5;
  const sep = lerp(MIN*0.055, MIN*(mobile?0.20:0.185)*0.86, e);
  const R = lerp(MIN*0.004, MIN*(mobile?0.20:0.185), ease.o3(e));
  // the two swelling discs
  for (const off of [-sep, sep]){
    const ex=cx+off;
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    const g=ctx.createRadialGradient(ex,cy,0,ex,cy,R*1.6);
    g.addColorStop(0, rgba([255,250,236], 0.5*(1-e))); g.addColorStop(1, rgba([255,250,236],0));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ex,cy,R*1.6,0,TAU); ctx.fill();
    ctx.restore();
    if (e>0.25){
      // once they are big enough, they start showing the daylit world instead
      ctx.save();
      ctx.beginPath(); ctx.arc(ex,cy,R,0,TAU); ctx.clip();
      ctx.globalAlpha=cl01((e-0.25)/0.5);
      const oz=CAM.zoom; CAM.zoom=1+2.0*cl01((e-0.25)/0.75);
      const s2=drawSky(); drawSun(t,s2); drawClouds(s2); drawLand(t,{});
      drawGround(t, AP.hy+AP.h*0.14, {});
      CAM.zoom=oz;
      ctx.restore();
      ctx.strokeStyle=rgba([226,232,240], cl01((e-0.3))*0.5);
      ctx.lineWidth=Math.max(1.5,MIN*0.004*e);
      ctx.beginPath(); ctx.arc(ex,cy,R*0.97,0,TAU); ctx.stroke();
    }
  }
  // the barrel bridge grows in last
  if (e>0.62){
    ctx.fillStyle=rgba([8,11,16], (e-0.62)/0.38*0.95);
    ctx.fillRect(cx-sep*0.5, cy-R*0.14, sep, R*0.28);
  }
  // and the night around them closes out as an eyecup
  ctx.save();
  ctx.fillStyle=rgba([6,9,14], e*0.55);
  ctx.beginPath(); ctx.rect(0,0,W,H);
  ctx.arc(cx-sep,cy,R,0,TAU); ctx.arc(cx+sep,cy,R,0,TAU);
  ctx.fill("evenodd");
  ctx.restore();
}

/* ------------------------------------------------------------------ morph 5
   The lens circle contracts, and the thing it contracts into is the yellow sun
   in the middle of a drawing lying on a table.
*/
function morphLensToPaper(t, dt, q){
  const e = ease.io(q);
  buildPaper();
  const r = paperRect();
  // the table arrives from behind
  const tg=ctx.createLinearGradient(0,0,0,H);
  tg.addColorStop(0,"#3a2c22"); tg.addColorStop(0.5,"#4a382a"); tg.addColorStop(1,"#2e231c");
  ctx.fillStyle=tg; ctx.fillRect(0,0,W,H);
  // the paper, scaling up from the size of the sun
  const sunOnPaper = { x: r.x+r.w*0.845, y: r.y+r.h*0.135 };
  const k = ease.o3(e);
  const pw2 = lerp(MIN*0.10, r.w, k), ph2 = pw2*(PH/PW);
  const cx0 = lerp(W*0.5, r.x+r.w/2, k), cy0 = lerp(H*0.5, r.y+r.h/2, k);
  ctx.save();
  ctx.translate(cx0,cy0); ctx.rotate(lerp(0.5,-0.008,k));
  ctx.fillStyle="rgba(0,0,0,0.4)";
  ctx.fillRect(-pw2/2+MIN*0.01,-ph2/2+MIN*0.012,pw2,ph2);
  ctx.drawImage(PAPER, -pw2/2, -ph2/2, pw2, ph2);
  ctx.restore();
  // the lens circle still visible, shrinking onto the drawn sun
  if (e<0.85){
    const R = lerp(MIN*(mobile?0.20:0.185), MIN*0.055, k);
    const lx = lerp(W*0.5, sunOnPaper.x, k), ly = lerp(H*0.5, sunOnPaper.y, k);
    ctx.save();
    ctx.globalAlpha = 1-e;
    ctx.beginPath(); ctx.arc(lx,ly,R,0,TAU); ctx.clip();
    const oz=CAM.zoom; CAM.zoom=1+2.6;
    const s2=drawSky(); drawSun(t,s2); drawClouds(s2); drawLand(t,{});
    CAM.zoom=oz;
    ctx.restore();
    ctx.strokeStyle=rgba([234,190,66], (1-e)*0.9);
    ctx.lineWidth=Math.max(2,MIN*0.005);
    ctx.beginPath(); ctx.arc(lx,ly,R,0,TAU); ctx.stroke();
    // the eyecup dark receding
    ctx.save();
    ctx.fillStyle=rgba([6,9,14],(1-e)*0.5);
    ctx.beginPath(); ctx.rect(0,0,W,H); ctx.arc(lx,ly,R,0,TAU); ctx.fill("evenodd");
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ morph 6
   The dust that has come off the drawing over the years does not settle. It goes
   into the air and stays there, and it is the same particles from now on.
*/
function morphPaperToAir(t, q){
  const e = ease.io(q);
  const r = paperRect();
  /* The paper falls away and the world it was a drawing OF comes back behind it.
     That world used to be built from code — drawSky, drawLand, drawGround — which
     was right when the whole piece was vector, and became the one place a visitor
     could see the old engine showing through: a grey vector skyline with hedges,
     directly behind a chapter whose neighbours are all paintings. It is the town
     plate now, which is also the view the visitor was holding binoculars on two
     beats ago, so the paper falls away onto the place it was drawn from. */
  apFull();
  drawPlate("town", { air: 0.10 + e*0.06 });
  const sp = null;
  ctx.save();
  ctx.globalAlpha=1-ease.i(e);
  ctx.translate(r.x+r.w/2, r.y+r.h/2 + e*H*0.7); ctx.rotate(-0.008+e*0.4);
  const k=1-e*0.35;
  ctx.drawImage(PAPER, -r.w*k/2, -r.h*k/2, r.w*k, r.h*k);
  ctx.restore();
  // the crayon dust, becoming what is in the air
  partRole = lerp(1, 2, e);
  drawParticles(t, 0.35+e*0.5, sp?{x:sp.x,y:sp.y,r:H}:null);
}

/* ------------------------------------------------------------------ morph 7
   Back to the window. The drawing turns in the air and its edges become the
   frame of the window in the room where all of this started.
*/
function morphAirToWindow(t, q){
  const e = ease.io(q);
  const wr = winRect();
  // the room fades up behind, but the *frame* is the thing that travels
  const k = ease.o3(e);
  const inx = lerp(W*0.5-W*0.30, wr.x+wr.w*0.055, k);
  const iny = lerp(H*0.5-H*0.22, wr.y+wr.h*0.05, k);
  const inw = lerp(W*0.60, wr.w*0.89, k);
  const inh = lerp(H*0.44, wr.h*0.82, k);
  setAp({ mode:"rect", x:inx, y:iny, w:inw, h:inh, hf:0.70 });
  // the wall
  ctx.fillStyle=rgb(mixL([150,142,148],[172,166,164],0.5));
  ctx.fillRect(0,0,W,H);
  ctx.save(); clipAp(ctx);
  const s=drawSky(); drawSun(t,s); drawClouds(s); drawLand(t,{});
  partRole=2; drawParticles(t, 0.55, null);
  ctx.restore();
  ctx.lineWidth=Math.max(3,MIN*0.026*k); ctx.strokeStyle=rgb(shade([58,46,38],0.6));
  ctx.strokeRect(inx,iny,inw,inh);
  apFull();
}

/* ============================================================================
   DISPATCH
   ========================================================================== */
let lastId = "";
function render(t, dt){
  const bid = id(), f = T.f, q = TQ();
  setAir(bid, f);
  OUTSIDE = lerp(OUTSIDE, OUTSIDE_T, 0.03);
  SPOTS.length = 0;

  const nxt = BEATS[Math.min(N-1, T.i+1)].id;

  switch (bid){
    /* -------------------------------- chapter one */
    case "dark": {
      setPop({ birds:0.7, butterflies:0.4, dragonflies:0.3, fireflies:0, seeds:0.5 });
      bedroomInteract("curtain", t, dt);
      drawRoom(t, dt, { air:0, quietCord:true });
      break;
    }
    case "light": {
      // the curtains are open; now the window, on the cord hanging in front of it
      setPop({ birds:0.8, butterflies:0.5, dragonflies:0.4, fireflies:0, seeds:0.6 });
      bedroomInteract(null, t, dt);
      cordInteract("sash", t, dt);
      drawRoom(t, dt, { air:0, noHint:true });
      break;
    }
    case "breathe": {
      setPop({ birds:0.9, butterflies:0.6, dragonflies:0.5, fireflies:0, seeds:0.8 });
      bedroomInteract(null, t, dt);
      cordInteract(null, t, dt);
      drawRoom(t, dt, { air:0, noHint:true, quietCord:true });
      break;
    }
    /* -------------------------------- chapter two */
    case "laundry":
    case "shirt": {
      // the washing line, built from the painted scene and the sheet sprites
      if (getPlate("lineScene")){
        setPop({ birds:0.9, butterflies:0.8, dragonflies:0.8, fireflies:0, seeds:0.9 });
        drawSheetsScene(t, dt, { air: PWASH.progress*0.30, f: T.f, gate: BEATS[T.i].gate });
        // she is there the first time and not the second
        SHEETS.seen = Math.max(SHEETS.seen, 1);
        SHEETS.momFade = lerp(SHEETS.momFade, SHEETS.momGone ? 0 : 1, Math.min(1, dt*0.8));
        break;
      }
      // the paintings are the world here; walking between the sheets is what
      // makes the air change, so the visitor causes it rather than watching it
      setPop({ birds:0.9, butterflies:0.8, dragonflies:0.8, fireflies:0, seeds:0.9 });
      drawLaundryPlate(t, dt, { air: PWASH.progress*0.30, mother:true, paintedMother:true });
      PWASH.motherOn = lerp(PWASH.motherOn, 1, 0.02);
      if (PWASH.through>=3) meet("sheets");
      if (bid==="shirt" && PWASH.through>=5) meet("shirt");
      break;
    }
    case "kite": {
      // the chapter opens in the evening. There is no morning any more: the
      // morning was one more picture to get through before the thing this
      // chapter is actually about.
      setPop({ birds:0.8, butterflies:0.35, dragonflies:0.6, fireflies:sm(f,0.55,1.0), seeds:0.8 });
      drawKiteSky(t, dt, { night: sm(f, 0.55, 1.0)*0.22, air:0, gate:"kite" });
      break;
    }
    case "climb": {
      // and the evening becomes night while you are standing in it
      setPop({ birds:0.35, butterflies:0.05, dragonflies:0.35, fireflies:sm(f,0.15,0.8), seeds:0.4 });
      drawKiteSky(t, dt, { night: lerp(0.22, 1, sm(f, 0.02, 0.88)), air:0 });
      break;
    }
    case "stars": {
      setPop({ birds:0, butterflies:0, dragonflies:0, fireflies:1.0, seeds:0.2 });
      starsInteractP("stars", dt, { air:0.06, glow:0.06 });
      drawStarsPlate(t, dt, { air:0.06, glow:0.06 });
      /* the afternoon is hours gone, and he is not wanted here */
      ambience(0.02, 1);
      nightSound(dt, 0.95, 1, 0);
      break;
    }
    case "wish": {
      setPop({ birds:0, butterflies:0, dragonflies:0, fireflies:0.9, seeds:0.2 });
      starsInteractP(null, dt, { air:0.08, glow:0.07 });
      ambience(0.02, 1);
      nightSound(dt, 0.95, 1, 0);
      drawStarsPlate(t, dt, { air:0.08, glow:0.07 });
      break;
    }
    case "horizon": {
      /* The binoculars belong to this chapter and nowhere else. `air0` is the
         valley with the lenses out of focus and `air1` is what holding gets you:
         here, all of it. The day was actually like that. */
      setPop({ birds:0.8, butterflies:0.4, dragonflies:0.4, fireflies:0, seeds:0.7 });
      OUTSIDE = 1;
      lookoutInteract("find", dt);
      drawLookout(t, dt, { air0:0.42, air1:0.0, fall:3.4, bed:0.60 });
      break;
    }
    case "drawing": {
      drawingInteract("colour");
      DRAW.bleach = 0;
      if (q>0.01) morphPaperToAir(t, q);
      else drawDrawing(t, {});
      break;
    }
    case "onslaught": {
      // no life, no air, no weather. The memory has stopped.
      setPop({ birds:0, butterflies:0, dragonflies:0, fireflies:0, seeds:0 });
      drawOnslaught(t, dt);
      break;
    }
    /* -------------------------------- chapter three */
    case "r-laundry": {
      setPop({ birds:0.15, butterflies:0.05, dragonflies:0.1, fireflies:0, seeds:0.3 });
      // the same line, years later. She is not on it, and nothing says so.
      SHEETS.momGone = 1;
      SHEETS.momFade = lerp(SHEETS.momFade, 0, Math.min(1, dt*0.9));
      if (getPlate("lineScene")){
        drawSheetsScene(t, dt, { air: 0.55 + PWASH.progress*0.35, f: T.f });
        WASH.dust = 0.55;
        washInteract("brush", dt);
        updLens(dt, done["brush"]);
        break;
      }
      drawLaundryPlate(t, dt, { air: 0.55 + PWASH.progress*0.35, mother:true, paintedMother:true });
      PWASH.motherOn = lerp(PWASH.motherOn, 0.45, 0.02);
      WASH.dust = 0.55;
      washInteract("brush", dt);
      if (false) drawLaundry(t, { mother:true });
      updLens(dt, done["brush"]);
      pastLens(t, P.x, P.y, LENS.r, LENS.a, (tt,ss)=>{
        const lineY=AP.y+AP.h*0.20;
        for (let k=0;k<4;k++){
          const u=0.10+k*0.24;
          cloth({ ax:AP.x+u*AP.w, ay:lineY, bx:AP.x+(u+0.20)*AP.w, by:lineY,
                  h:H*0.34, col:[250,248,242], ph:k*2.1, folds:5, amp:MIN*0.014,
                  windAmp:MIN*0.036, thin:0.82, pegs:true, seed:k*17 }, tt);
        }
      });
      break;
    }
    case "r-kite": {
      setPop({ birds:0.05, butterflies:0, dragonflies:0.05, fireflies:0, seeds:0.2 });
      drawKitePlate(t, dt, { plate:"kiteHazed", air:0.55, lose:true });
      if (PKITE.best>0.36) meet("rkite");
      if (false){ const r = drawKite(t, dt, { lose:true }); }
      // the moment the line is all that is left
      if (KITE.lost>0.86 && !FOUND["lostkite"]){
        FOUND["lostkite"]=true; foundN++;
        whisper("It's still up there. You can feel it pulling.");
        sfx.line();
      }
      break;
    }
    case "r-stars": {
      // the fireflies are simply not here any more, and nothing says so
      setPop({ birds:0, butterflies:0, dragonflies:0, fireflies:0, seeds:0.05 });
      starsInteractP("rstars", dt, { air:0.78, glow:0.55 });
      /* years later the insects are thinner too, and he has stopped calling */
      ambience(0.02, 1);
      nightSound(dt, 0.55, 0.30, 0);
      drawStarsPlate(t, dt, { air:0.78, glow:0.55 });
      if (false){ starsInteract("rstars", dt); drawStars(t, dt, {}); }
      // the gaps where the shape used to close
      let missing=0;
      for (const st of CONST) if (!starVisible(st)) missing++;
      if (missing>0 && SKYV.lit>0){
        ctx.save();
        ctx.setLineDash([2,7]);
        ctx.strokeStyle="rgba(150,164,200,0.22)"; ctx.lineWidth=1;
        ctx.beginPath();
        let prev=null;
        for (const i of CONST.order){
          const st=CONST[i]; if (!st) continue;
          const sx=((st.x-SKYV.panX)%3+3)%3;
          const xx=AP.x+(sx%1)*AP.w, yy=AP.y+(st.y-SKYV.panY*0.4)*AP.h*0.96;
          if (prev){ ctx.moveTo(prev[0],prev[1]); ctx.lineTo(xx,yy); }
          prev=[xx,yy];
        }
        ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
      }
      break;
    }
    case "r-horizon": {
      /* The same hill, the same lenses, the same hold. It only ever comes half
         way back now, and it slips faster than it did. Nothing says so. */
      setPop({ birds:0.05, butterflies:0, dragonflies:0, fireflies:0, seeds:0.1 });
      OUTSIDE = 1;
      lookoutInteract("rfind", dt);
      drawLookout(t, dt, { air0:0.97, air1:0.52, fall:2.2, bed:0.34 });
      break;
    }
    case "r-drawing": {
      DRAW.bleach = sm(f, 0.08, 0.86);
      DRAW.greyCrayon = sm(f, 0.55, 0.95);
      grimeAdd(dt*0.06);
      drawDrawing(t, {});
      updLens(dt, true);
      if (LENS.a>0.02){
        // holding brings the pigment back under your hand
        const r=paperRect();
        ctx.save();
        ctx.beginPath(); ctx.arc(P.x,P.y,LENS.r,0,TAU); ctx.clip();
        ctx.globalAlpha=LENS.a;
        ctx.translate(r.x+r.w/2, r.y+r.h/2); ctx.rotate(-0.008); ctx.translate(-r.w/2,-r.h/2);
        ctx.drawImage(PAPER,0,0,r.w,r.h);
        ctx.restore();
      }
      break;
    }
    /* -------------------------------- chapter four */
    case "indoors": {
      indoorsInteract(t, dt);
      drawIndoors(t, dt);
      break;
    }
    /* -------------------------------- chapter five */
    case "return": {
      setPop({ birds:0.05, butterflies:0, dragonflies:0, fireflies:0, seeds:0.1 });
      bedroomInteract("curtain2", t, dt);
      grimeAdd(dt*0.02);
      drawRoom(t, dt, { air:1 });
      break;
    }
    case "stopped": {
      setPop({ birds:0, butterflies:0, dragonflies:0, fireflies:0, seeds:0.05 });
      drawRoom(t, dt, { air:1, forceOpen:true, noHint:true, quietCord:true });
      updateStoppedPlate(t, dt);
      break;
    }
    case "named": {
      setPop({ birds:0, butterflies:0, dragonflies:0, fireflies:0, seeds:0.05 });
      drawRoom(t, dt, { air:1, forceOpen:true, noHint:true, quietCord:true });
      updateStoppedPlate(t, dt);
      if (f>0.55) hideAQ();
      break;
    }
    /* -------------------------------- the evidence */
    case "e-dust":   evDust(t, dt, f); break;
    case "e-hills":  evHills(t, dt, f); break;
    case "e-stars":  evStars(t, dt, f); break;
    case "e-ledger": evLedger(t, dt, f); break;
    /* -------------------------------- the ending */
    case "f-curtain": {
      hideLedger(); showCard(null);
      if (T.p - ofs[BEATS.findIndex(b=>b.id==="f-curtain")] < 0.14){ /* settle */ }
      const geo = drawFinaleRoom(t, dt, {});
      finaleInteract(bid, t, dt, geo);
      break;
    }
    case "f-both":
    case "f-open":
    case "f-crayon":
    case "f-rest": {
      const geo = drawFinaleRoom(t, dt, {});
      finaleInteract(bid, t, dt, geo);
      break;
    }
    case "f-end": {
      const geo = drawFinaleRoom(t, dt, {});
      finaleInteract(bid, t, dt, geo);
      break;
    }
  }

  // things that live above every scene
  updRipples(dt); drawRipples();
  drawFlashes();
  drawMoth(t);
  drawSpotHints(t);
  /* The post pass, except during the onslaught, where black has to mean black.
     The vignette lays a warm 34%-opacity gradient into the corners of every frame,
     which is invisible over a painting and is a pair of brown smudges over an empty
     screen — and the sequence has a good deal of empty screen in it. It brings its
     own static instead. */
  if (bid !== "onslaught"){
    // bloom first, so light spills before the frame is darkened
    const night = (AIR.tod<0.14||AIR.tod>0.86);
    bloom(autoLow ? 0.16 : (night ? 0.34 : 0.26 + AIR.h*0.18), night);
    vignette();
    drawGrain(REDUCE?0.02:0.055);
  }
  lastId = bid;
}

/* ============================================================================
   TEXT, CHAPTER LABEL, TITLE
   ========================================================================== */
const capEl=document.getElementById("cap"), askEl=document.getElementById("ask"),
      gateEl=document.getElementById("gate"), gateTxt=document.getElementById("gateTxt"),
      gateBar=document.getElementById("gateBar"), chEl=document.getElementById("chapter"),
      sdownEl=document.getElementById("sdown"),
      titleEl=document.getElementById("title"), ctlEl=document.querySelector(".ctl");

const FIN_LINES = [
  { at:"f-rest", f:0.34, text:"My mother used to open the window before I was awake." },
  { at:"f-end",  f:0.30, text:"I check the air before I do." }
];
let shownFin = -1, lastCap="", lastCh=-1;

/* EVERY LINE IN THE PIECE IS WHITE.
   This used to flip the narration to near-black over the bright scenes — the washing
   line, the drawing, the evidence hills — on the reasoning that dark ink reads better
   on a pale sky. It does, in isolation. What it actually produced was one voice that
   changed colour halfway through the work: the same narrator, speaking in white for
   two chapters and then in brown on the washing line. A voice does not change colour
   because the weather did.

   So it is white everywhere, and the shadow underneath it does the work instead —
   see --sh, which is now heavy enough to hold white type over a noon sky. */
function isLight(){ return false; }
function updText(now, dt){
  if (introOn){ askEl.classList.remove("on"); capEl.classList.remove("on");
    gateEl.classList.remove("on"); sdownEl.classList.remove("on"); return; }
  const bid=id(), f=T.f, B=BEATS[T.i];
  const light = isLight();
  capEl.classList.toggle("dark", light);
  askEl.classList.toggle("dark", light);
  gateEl.classList.toggle("dark", light);
  chEl.classList.toggle("dark", light);
  ctlEl.classList.toggle("dark", light);

  /* narration: one line, early in the beat, then it goes away */
  let line = B.line || "";
  for (const L of FIN_LINES){
    if (bid===L.at && f>=L.f) line = L.text;
  }
  // the last line holds a long time, then goes out on its own, and only then does
  // the title come up. They must never share the frame.
  const titleFrom = 0.74;
  const lineOut = bid==="f-end" && f>titleFrom-0.06;
  const show = line && !lineOut &&
    ((bid.startsWith("f-")) ? f>=0.28 : (f>0.06 && f<0.62));
  const want = show ? line : "";
  if (want!==lastCap){
    lastCap=want;
    if (want){ capEl.textContent=want; capEl.classList.add("on"); }
    else capEl.classList.remove("on");
  }

  /* the prompt: only while the action is still undone, and it steps back once
     the visitor is clearly getting on with it */
  const g = B.gate;
  const needed = g && !gateMet(g);
  /* Some things a visitor can do are not gates. Touching her on the washing line
     is one: the chapter does not wait for it and never told anyone it was there,
     which is the same as it not existing. So a beat may also declare an optional
     action, and its instruction stays up until that action has happened. */
  const optional = OPTIONAL[bid];
  const askTxt = (needed || (optional && !optional())) ? (B.ask||"") : "";
  askEl.textContent = askTxt;
  const busy = P.down || tSinceAct < 1.4;
  askEl.classList.toggle("on", !!askTxt && (T.push>0.05 || !busy || (now-beatEnter)<3600));

  /* Is this one of the three places the scroll waits? That is not the same question
     as "does this beat have a gate". The washing line's own gate is met the instant
     the scene draws, and the thing actually being waited on there is her humming,
     which was never a gate at all. */
  const hold = HOLD_AT[bid];
  const holding = !!(hold && !hold.done());

  /* the scroll arrow: small, and there the whole way, because scrolling is the
     one thing the visitor has to know and the only thing the card tells them */
  const moreToGo = T.p < TOTAL-0.35 && bid!=="f-end";
  /* not while the scroll is waiting: one says carry on down and the other says you
     have something to do here first, and they were sitting on top of each other */
  const cue = moreToGo && !introOn && !(T.blocked && holding);
  sdownEl.classList.toggle("on", cue);
  sdownEl.classList.toggle("dark", light);
  sdownEl.setAttribute("aria-hidden", String(!cue));
  askEl.classList.toggle("urge", T.push>0.3);

  /* the mark that says the scroll is waiting, and roughly how far in you are */
  gateEl.classList.toggle("on", T.blocked && holding);
  if (T.blocked && holding){
    gateTxt.textContent = "";
    gateBar.style.width = Math.round(cl01(hold.prog())*100)+"%";
  }

  /* chapter label, on arrival only */
  if (B.ch!==lastCh){
    lastCh=B.ch;
    const nm=CH_NAME[B.ch]||"";
    chEl.textContent=nm;
    chEl.classList.toggle("on", !!nm);
    if (nm) setTimeout(()=>chEl.classList.remove("on"), 5200);
  }

  /* the title, only after the last line has been up a long while */
  const endShow = bid==="f-end" && f>0.74;
  if (endShow && titleEl.getAttribute("aria-hidden")==="true"){
    titleEl.setAttribute("aria-hidden","false");
    titleEl.classList.add("on");
    const c=titleEl.querySelector(".c");
    if (foundN>0){
      c.innerHTML = "Earth Partner Prize · drawn live in your browser<br>"+
        "every figure is linked to its source<br><br>"+
        "you found "+foundN+" small thing"+(foundN===1?"":"s")+" that nobody asked you to look for";
    }
  }
  if (!endShow && bid!=="f-end"){
    titleEl.classList.remove("on"); titleEl.setAttribute("aria-hidden","true");
  }
}
function gateProgress(g){
  switch(g){
    case "curtain": case "curtain2": return Math.min(PROOM.cL,PROOM.cR)/CTR.need;
    case "sash":    return PROOM.sash/0.55;
    case "sheets":  return 1;
    case "shirt":   return PWASH.through/5;
    case "kite":  return KSKY.best/0.52;
    case "stars": { let n=0; for (const id of ["mizar","alkaid","megrez","alrischa","polaris"]) if (STARY.lit[id]) n++; return n/3; }
    case "rkite": return PKITE.best/0.40;
    case "stars":   { let n=0; for(const s2 of DIPPER) if(STARY.lit[s2.id])n++; return n/DIPPER.length; }
    case "rstars":  { let v=0,n=0; for(const s2 of DIPPER){ if(starSeen(s2,0.78,0.55)){v++; if(STARY.lit[s2.id])n++;} } return v? n/v : 1; }
    case "find":    return PLOOK.n/3;
    case "rfind":   return PLOOK.recall/0.75;
    case "colour":  return DRAW.strokes/0.55;
    case "brush":   return WASH.brushed/0.85;
    case "lift":    return EV.lifted/0.72;
    case "pull":    return EV.pull/0.55;
    case "fcurtain":return Math.min(FIN.cL,FIN.cR)/0.55;
    case "fhold":   return FIN.memPeak/0.8;
    case "fopen":   return FIN.sash/0.16;
    case "fdraw":   return FIN.patch/0.22;
    default: return 0;
  }
}

/* ============================================================================
   INPUT ROUTING
   ========================================================================== */
function needsDrag(){
  const b=id();
  return b!=="e-ledger" && b!=="named";
}
function onDown(x,y){
  const b=id();
  // discoveries first: a touch on something touchable always wins
  if (hitSpots(x,y)) return;
  if (b==="stars"||b==="wish"){ tapStarP(x,y,0.07,0.06); return; }
  if (b==="r-stars"){ tapStarP(x,y,0.78,0.55); return; }
  if (b==="drawing"||b==="r-drawing"){ crayonDown(x,y); return; }
  if (b.startsWith("f-")){ glassDown(x,y); return; }
}
function onDrag(x,y){
  const b=id();
  if (b==="drawing"||b==="r-drawing"){ crayonTo(x,y); return; }
  if (b.startsWith("f-") && FIN.crayon){ glassTo(x,y); return; }
}
function onMove(){}
function onUp(){ DRAW.on=false; }
/* ---------------------------------------------------------------- the pace card
   It is up for a few seconds after Begin and then it goes, and it goes early if
   the visitor is already scrolling — somebody who has started does not need to
   be told to start. It is deliberately not a dialogue and cannot be clicked
   through, because there is nothing in it to agree to: it sets a speed and makes
   a promise, and then the piece gets on with it. */
const paceEl = document.getElementById("pace");
let paceT = 0, paceGone = false;
function showPace(){
  if (!paceEl || paceGone) return;
  paceEl.classList.add("on");
  document.body.classList.add("pacing");
  paceEl.setAttribute("aria-hidden", "false");
  paceT = 6.5;
}
function hidePace(){
  if (!paceEl || paceGone) return;
  paceGone = true; paceT = 0;
  paceEl.classList.remove("on");
  document.body.classList.remove("pacing");
  paceEl.setAttribute("aria-hidden", "true");
}
function updPace(dt){
  if (paceGone || paceT <= 0) return;
  /* any real scroll takes it away at once. A couple of hundred pixels, so a
     trackpad twitch or a bounce does not count as having started. */
  if (window.scrollY > 180){ hidePace(); return; }
  paceT -= dt;
  if (paceT <= 0) hidePace();
}

function onKey(k){
  const b=id();
  if (k==="Enter"){
    if (b==="stars"||b==="wish"||b==="r-stars"){
      const air2 = b==="r-stars"?0.78:0.07, gl2 = b==="r-stars"?0.55:0.06;
      let bb=null, bdd=1e9;
      for (const s2 of DIPPER.concat(OUTLIERS)){
        if (STARY.lit[s2.id] || !starSeen(s2,air2,gl2) || !s2._p) continue;
        const d2=Math.hypot(s2._p.x-W*0.5, s2._p.y-H*0.5);
        if (d2<bdd){ bdd=d2; bb=s2; }
      }
      if (bb){ tapStarP(bb._p.x, bb._p.y, air2, gl2); return; }
    }
    if (false){
      // light the nearest unlit visible anchor
      let best=null,bd=1e9;
      for (const st of CONST){
        if (st.lit||!starVisible(st)||st._sx===undefined) continue;
        const d=Math.hypot(st._sx-W*0.5, st._sy-H*0.5);
        if (d<bd){bd=d;best=st;}
      }
      if (best){ best.lit=true; sfx.chime(988); ripple(best._sx,best._sy,[255,232,176],MIN*0.07); }
    } else {
      // otherwise Enter satisfies whatever is being asked, so nothing is a wall
      const g=BEATS[T.i].gate; if (g) meet(g);
    }
  }
}
function onEnter(bid){
  // per-beat setup
  if (bid==="laundry"){ if (!WASH.sheets.length) buildWash(); }
  if (bid==="kite"){ resetKiteSky(); }
  if (bid==="r-kite"){ if (!PKITE.line) resetPKite(); }
  if (bid==="r-kite"){ PKITE.best=0; }

  if (bid==="indoors"){ if (!IN.sheets.length) buildIndoors(); }
  if (bid==="e-stars"){ if (!GRID.length) buildGrid(); }
  if (bid==="drawing"||bid==="r-drawing"||bid==="horizon") buildPaper();
  /* the lenses come up from nothing every time the chapter is entered, and only
     the first visit carries the list — on the second there is nothing to tick */
  if (bid==="horizon" || bid==="r-horizon") resetLookout(bid);
  showLookList(bid==="horizon");
  if (bid==="onslaught") resetOnslaught();
  else { document.body.classList.remove("onslaught"); SILENCE = 0; onsNoiseStop(); }
  if (bid!=="stopped" && bid!=="named") hideAQ();
  if (bid!=="stars" && bid!=="wish" && bid!=="r-stars") hideStarStory();
  if (!bid.startsWith("e-")) { showCard(null); }
  if (bid!=="e-ledger") hideLedger();
  // the cursor tells you what kind of place you are in
  cv.className = "";
  if (bid==="drawing"||bid==="r-drawing") cv.classList.add("crayon");
  else if (bid==="stars"||bid==="wish"||bid==="r-stars") cv.classList.add("grabbable");
  else cv.classList.add("grabbable");
}

/* ============================================================================
   FRAME
   ========================================================================== */
let last = performance.now(), acc = 0;
let introOn = false;   // the way-in card is up, and the piece waits
/* a rolling frame time, so the piece can quietly shed detail on a slow machine
   rather than becoming a slideshow */
let ftAvg = 16, autoLow = false;
function frame(now){
  let dt = (now-last)/1000; last = now;
  if (dt>0.05) dt=0.05; if (dt<=0) dt=1/60;
  ftAvg = ftAvg*0.94 + (dt*1000)*0.06;
  if (!autoLow && ftAvg > 30) { autoLow = true; }
  else if (autoLow && ftAvg < 19) { autoLow = false; }
  window.__fps = 1000/ftAvg;
  if (W<2||H<2){ fit(); if (W<2||H<2){ requestAnimationFrame(frame); return; } }

  if (introOn){
    // hold everything still behind the card: the first frame the visitor sees
    // should be the room they are about to be asked to open
    P.down = false; P.active = false; P.dx = 0; P.dy = 0;
    window.scrollTo(0,0);
  } else {
    keyDrive(dt);
    updPointer(dt);
  }
  readTimeline(dt);
  clampScroll();
  updWind(dt);

  const t = now*0.001;
  updPlateCam(dt, t);
  updParticles(dt,t); updClouds(dt); updBirds(dt,t); updBugs(dt,t);
  updTrain(dt); updPlane(dt); updLeaves(dt); updMoth(dt,t);
  updFlashes(dt); updWhisper(dt); updSound(dt,t); updFireflies(dt,t); updPace(dt);
  // and no new bird starts once the world has been taken away
  if (soundOn && SILENCE<0.02 && AIR.h<0.5 && OUTSIDE>0.4 &&
      Math.random()<0.011*(1-AIR.h)*dt*60) sfx.bird();
  curiosity = Math.max(0, curiosity - dt*0.02);

  render(t, dt);
  updText(now, dt);
  requestAnimationFrame(frame);
}

/* ============================================================================
   BOOT
   ========================================================================== */
function boot(){
  preloadPlates();       // the paintings, which everything now sits on
  buildNoise();          // must come before anything bakes
  buildFringe();
  buildBoughs();
  fit();
  updateAir();
  buildGrain();
  buildParticles();
  buildClouds();
  buildWire();
  buildBugs();
  buildStars();
  buildWash();
  buildIndoors();
  buildGrid();
  buildFireflies();
  buildWireBirds();
  buildToys();
  buildEvidenceCards();
  // paint the drawing now: it is already taped to the bedroom wall in the very
  // first frame, years before the visitor is handed it
  buildPaper();
  grimeReset(); grimeAdd(0.5);
  fogFit();
  resetKite();
  readTimeline(1/60);
  onEnter(id());
  /* the way in. It holds the scroll until it is dismissed, so nobody arrives
     inside the work without having been told how to touch it. */
  const introEl = document.getElementById("intro");
  const beginEl = document.getElementById("begin");
  if (introEl && beginEl){
    introOn = true;
    const go = ()=>{
      if (!introOn) return;
      introOn = false;
      introEl.classList.add("off");
      window.scrollTo(0,0);
      beatEnter = performance.now();
      PROOM.idle = 3.2;   // the card explains nothing, so the scene must, and soon
      try{ beginEl.blur(); }catch(_){}
      startSound();          // Begin is the gesture the audio context needs
      /* After the way-in card has actually gone. Its own fade is 1.6s, and at
         780ms it was still half there and sitting on a higher layer, so you were
         reading one through the other. The wait is not dead time either: the room
         is already up behind it. */
      setTimeout(showPace, 1750);
    };
    beginEl.addEventListener("click", go);

    introEl.addEventListener("click", e=>{ if (e.target===introEl) go(); });
    window.addEventListener("keydown", e=>{
      if (introOn && (e.key==="Enter" || e.key===" " || e.key==="Escape")){ e.preventDefault(); go(); }
    });
  }
  // a little grime is already on the sill when the piece starts. It always was.
  requestAnimationFrame(n=>{ last=n; frame(n); });
}
window.addEventListener("resize", ()=>{ fit(); }, {passive:true});
window.addEventListener("orientationchange", ()=>setTimeout(fit,240), {passive:true});
RM.addEventListener ? RM.addEventListener("change", e=>{ REDUCE=e.matches; })
                    : RM.addListener && RM.addListener(e=>{ REDUCE=e.matches; });
document.getElementById("restart").addEventListener("click", ()=>{
  window.scrollTo(0,0);
  // keep what they found; reset what they did
  ROOM.cL=ROOM.cR=ROOM.sash=ROOM.latch=0; ROOM.latchDone=false;
  PROOM.cL=PROOM.cR=PROOM.open=PROOM.sash=0; PROOM.nudgeTo=0; PROOM.idle=0; PROOM.demo=0;
  PROOM.breeze=0; PROOM.grab=0; PROOM.sashGrab=0; PROOM.everMoved=0;
  CORD.swing=0; CORD.swingV=0; CORD.grab=0; buildWireBirds(); buildToys();
  SHEETS.momGone=0; SHEETS.momFade=1; SHEETS.everGrabbed=0; buildSheets();
  for (const k in done) delete done[k];
  WASH.passed=0; WASH.shirtFound=false; WASH.walk=0; WASH.brushed=0;
  for (const st of CONST) st.lit=false;
  LOOK.found={}; LOOK.nFound=0; LOOK.remember=0; LOOK.hold=0;
  DRAW.strokes=0; DRAW.bleach=0;
  EV.lifted=0; EV.lift=0; EV.mag=0; EV.pull=0; EV.revealed=0; EV.gather=0;
  FIN.cL=FIN.cR=0; FIN.latchHold=0; FIN.memory=0; FIN.memPeak=0;
  FIN.opened=0; FIN.sash=0; FIN.sashPulls=0; FIN.crayon=false; FIN.patch=0; FIN.seen=0;
  /* The statistics have to be un-seen, or Restart does nothing at all: the one-way
     floor they leave behind sits at the first post-pollution beat, so scrollTo(0,0)
     would be snapped straight back and the button would look broken. */
  ONS.played = 0; ONS.running = 0; ONS.t = 0; T.floor = 0;
  document.body.classList.remove("onslaught");
  SILENCE = 0; onsNoiseStop();
  /* and the lookout starts over: an unticked list, and none of the eleven places
     already spoken for */
  PLOOK.found = Object.create(null); PLOOK.said = Object.create(null); PLOOK.n = 0;
  resetLookList();
  gc.clearRect(0,0,GLASS.width,GLASS.height);
  paperBuilt=false; buildPaper();
  buildWash(); buildIndoors(); resetKite();
  titleEl.classList.remove("on"); titleEl.setAttribute("aria-hidden","true");
});

/* a small window onto the running piece, for driving it under test */
window.__bluer = {
  get beat(){ return id(); },
  get room(){ return PROOM; },
  get gates(){ return done; },
  get fps(){ return window.__fps; },
  get missing(){ return imgFailed.slice(); },
  audio(){ return { ctx: AC ? AC.state : "none", on: soundOn,
                    a1: AMB.state, a2: AMB2.state,
                    g1: AMB.gain ? +AMB.gain.gain.value.toFixed(3) : null,
                    g2: AMB2.gain ? +AMB2.gain.gain.value.toFixed(3) : null,
                    playing: !!AMB.src, playing2: !!AMB2.src }; },
  line(){ const f = L => ({ state:L.state, name:L.name||null, playing:!!L.src,
                            g: L.gain ? +L.gain.gain.value.toFixed(4) : null });
          return { cloth:f(RUS), gust:f(RUS2), hum:f(HUM) }; },
  cordBall, curtainGap, CTR, CG, WIN,
  get birds(){ return WIREBIRDS; },
  get sheets(){ return SHEETS; },
  get kite(){ return KSKY; },
  get dipper(){ return DIPPER; },
  get ap(){ return AP; },
  get stary(){ return STARY; },
  get outliers(){ return OUTLIERS; },
  nightAudio(){ const f=L=>({state:L.state,playing:!!L.src,g:L.gain?+L.gain.gain.value.toFixed(4):null});
                return { crickets:f(CRICK), nightbird:f(NBIRD) }; },
  kiteAudio(){ return { wind:KWIND.state, windG: KWIND.gain? +KWIND.gain.gain.value.toFixed(4):null,
                        playing:!!KWIND.src, laugh:LAUGH.state, next:+LAUGH.next.toFixed(1) }; },
  get wash(){ return PWASH; },
  /* the lookout, in enough detail to check the window really can reach every
     corner of the painting and that the four places are where the paint is */
  get look(){ return PLOOK; },
  get ons(){ return ONS; },
  onsSkip,
  /* the whole mix in one call: the master fader and the loudest thing under it, so a
     layer that forgot to get quiet cannot hide behind the ones that did */
  mix(){
    if (!AC || !master) return { master:null, loud:null };
    const L = { garden:AMB, open:AMB2, cloth:RUS, gust:RUS2, hum:HUM,
                kwind:KWIND, laugh:LAUGH, crick:CRICK, nbird:NBIRD };
    for (const k in LOOKA) L["look_"+k] = LOOKA[k];
    let loud = "-", lv = 0;
    for (const k in L){
      const g = L[k] && L[k].gain ? L[k].gain.gain.value : 0;
      if (g > lv){ lv = g; loud = k; }
    }
    for (const k in BED){
      const g = BED[k] && BED[k].g ? BED[k].g.gain.value : 0;
      if (g > lv){ lv = g; loud = "bed_"+k; }
    }
    return { master:+master.gain.value.toFixed(4), loud:loud+"="+lv.toFixed(4) };
  },
  get marks(){ return LMARK; },
  lookAt(fx, fy){ const im=loadImg("viewoftown.png");
    if (!imgReady(im)) return false;
    PLOOK.cx = fx*im.naturalWidth; PLOOK.cy = fy*im.naturalHeight;
    PLOOK.vx = PLOOK.vy = 0; PLOOK.taken = 1; return true; },
  lookWin(){ const im=loadImg("viewoftown.png");
    if (!imgReady(im)) return null;
    const SW=im.naturalWidth, SH=im.naturalHeight;
    return { z:+PLOOK.z.toFixed(3), lift:+PLOOK.lift.toFixed(3),
             focus:+PLOOK.focus.toFixed(3), recall:+PLOOK.recall.toFixed(3),
             x0:+(PLOOK.sx/SW).toFixed(4), x1:+((PLOOK.sx+PLOOK.wsrc)/SW).toFixed(4),
             y0:+(PLOOK.sy/SH).toFixed(4), y1:+((PLOOK.sy+PLOOK.hsrc)/SH).toFixed(4),
             aim:PLOOK.aim?PLOOK.aim.id:null, n:PLOOK.n,
             found:Object.keys(PLOOK.found), said:Object.keys(PLOOK.said) }; },
  lookAudio(){ const f=L=>({state:L.state,playing:!!L.src,
                 g:L.gain?+L.gain.gain.value.toFixed(4):null});
               const o={}; for (const k in LOOKA) o[k]=f(LOOKA[k]); return o; },
  lookMarkAt(k){ const m=LMARK.find(q=>q.id===k); return m? {x:m._x,y:m._y,on:m._on}:null; },
  get f(){ return T.f; },
  get p(){ return T.p; },
  get floor(){ return T.floor; },
  get blocked(){ return T.blocked; },
  /* jump the scroll to a named beat, marking every gate before it as met, so a
     chapter can be driven and screenshotted without playing the whole piece */
  goto(bid, f){
    const i = BEATS.findIndex(x => x.id === bid);
    if (i < 0) return false;
    for (let k=0;k<i;k++){
      if (BEATS[k].gate) done[BEATS[k].gate] = true;
      // and the three places the scroll waits, which are not all gates
      const h = HOLD_AT[BEATS[k].id];
      if (h && h.pass) h.pass();
    }
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, (ofs[i] + BEATS[i].len*(f===undefined?0.35:f))/TOTAL * max);
    return true;
  },
  intro(){ return introOn; },
  reset(){ PROOM.cL=PROOM.cR=PROOM.open=PROOM.sash=0; PROOM.nudgeTo=0;
           PROOM.idle=0; PROOM.demo=0; CORD.swing=0; CORD.swingV=0;
           buildWireBirds(); buildToys(); delete done.curtain; delete done.sash; }
};

if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
})();
