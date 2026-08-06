/* ============================================================================
   MORPHS — plate to plate, never a cross-fade
   ============================================================================
   Two mechanisms, and between them they cover every boundary.

   [1] THROUGH AN OPENING. The bedroom painting has a window in it. Rather than
       fading the room out, the window's opening grows until it is the whole
       frame while the room rushes past the camera — you go through it. The next
       plate is already out there, revealed as the opening widens.

   [2] CONTINUITY PLUS A CARRIED OBJECT. Every landscape painting is the same
       place. Align their horizons and the background is already continuous, so
       nothing has to be hidden: the plate underneath can simply be the next one,
       and the only thing that has to change is whatever the visitor is holding.
       A sheet lifts off the line and folds into the kite. The kite shrinks to a
       point of light and is a star. Two stars swell into the eyepieces.

   No boundary in this file uses opacity to get from one chapter to the next.
   ========================================================================== */

/* the window opening in the bedroom plate, measured off bedroomopen.png and
   corrected for that plate's crop */
const WINDOW_IN_PLATE = { x:0.315, y:0.075, w:0.375, h:0.660 };

/* the horizon in each landscape plate, as a fraction of the frame. Aligning
   these is what makes one meadow continue into the next. */
const PLATE_HORIZON = {
  laundry:      0.612,
  laundryMother:0.612,
  kiteDay:      0.700,
  kiteEvening:  0.735,
  kiteHazed:    0.700,
  stars:        0.760,
  starsHazed:   0.760,
  town:         0.640
};

/* ------------------------------------------------------------------ morph 1
   Out of the room and into the garden, through the window itself.
*/
function morphThroughWindow(t, dt, q, o){
  o = o||{};
  const e = ease.io(cl01(q));
  const R = WINDOW_IN_PLATE;
  const r0 = { x:R.x*W, y:R.y*H, w:R.w*W, h:R.h*H };
  // the opening widens to the whole frame
  const rx = lerp(r0.x, 0, e), ry = lerp(r0.y, 0, e);
  const rw = lerp(r0.w, W, e), rh = lerp(r0.h, H, e);

  /* what is beyond the window, revealed as the opening grows. It eases from a
     slight push-in to its resting scale, so there is a sense of travel. */
  ctx.save();
  ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
  const push = lerp(1.16, 1.0, e);
  ctx.translate(W*0.5, H*0.5); ctx.scale(push, push); ctx.translate(-W*0.5, -H*0.5);
  drawLaundryPlate(t, dt, { air:o.air||0, mother:true, paintedMother:true, flare:false });
  ctx.restore();

  /* the room, scaled about the window so its opening tracks the growing hole.
     The walls sweep off the edges of the frame rather than fading. */
  if (e < 0.995){
    const s = rw / r0.w;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,W,H);
    ctx.rect(rx, ry, rw, rh);
    ctx.clip("evenodd");                 // never paint the room over the opening
    ctx.translate(r0.x + r0.w*0.5, r0.y + r0.h*0.5);
    ctx.scale(s, s);
    ctx.translate(-(r0.x + r0.w*0.5), -(r0.y + r0.h*0.5));
    // the room is drawn open, since that is the state we are leaving it in
    drawPlate("bedroomOpen", { air:0, a:1, drift:false });
    ctx.restore();
  }
  /* a breath of light spilling round the frame as you pass through it */
  if (e>0.05 && e<0.9){
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    const g = ctx.createRadialGradient(rx+rw*0.5, ry+rh*0.5, Math.min(rw,rh)*0.35,
                                       rx+rw*0.5, ry+rh*0.5, Math.max(rw,rh)*0.75);
    g.addColorStop(0, "rgba(255,236,196,0)");
    g.addColorStop(1, rgba([255,232,186], 0.22*Math.sin(e*PI)));
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ morph 2
   A sheet leaves the line and folds into the kite.
   The landscape underneath is already the next plate, horizon-aligned, so the
   world does not change — only the washing does.
*/
function morphSheetsToKite(t, dt, q, o){
  o = o||{};
  const e = ease.io(cl01(q));
  const air = o.air||0;

  /* the world we are going to, lifted so its horizon starts where the laundry's
     was and settles into its own position */
  const dy = lerp((PLATE_HORIZON.laundry - PLATE_HORIZON.kiteDay)*H, 0, e);
  ctx.save();
  ctx.translate(0, dy);
  drawKitePlate(t, dt, { plate:"kiteDay", air, noKite:e<0.55 });
  ctx.restore();

  /* the washing, leaving. Each sheet rises and goes; the third one keeps going
     and becomes the kite. */
  const pl = getPlate("laundryMother");
  if (pl && e < 0.985){
    const band = pl.def.sheetBand;
    const b = pl.clean[band];
    const hb = pl.hazed ? pl.hazed[band] : null;
    for (const col of WCOL){
      const i = col.sheet;
      if (i < 0) continue;
      const isCarried = (i === 2);
      // they leave in sequence, the carried one last
      const lead = isCarried ? 0.10 : (0.02 + i*0.10);
      const f = cl01((e - lead) / (isCarried ? 0.55 : 0.42));
      if (f >= 1 && !isCarried) continue;
      const sx = b.dx + col.x0*W, sw = (col.x1-col.x0)*W;
      const EX = 4;
      const rise = ease.i(f);
      const drift = (i-2)*W*0.10*rise;
      const up = -rise*H*0.85;
      const shrink = isCarried ? lerp(1, 0.20, ease.io(f)) : lerp(1, 0.62, rise);
      const spin = (isCarried ? 0.55 : 0.22)*rise*(i%2?1:-1);
      const cxq = sx + sw*0.5, cyq = b.y + b.h*0.5;
      ctx.save();
      ctx.globalAlpha = isCarried ? 1 : (1-f);
      ctx.translate(cxq + drift, cyq + up);
      ctx.rotate(spin);
      ctx.scale(shrink, shrink);
      ctx.translate(-cxq, -cyq);
      const deform = (u,v)=>{
        // as it leaves the line it stops hanging and starts to fold
        const fold = ease.io(f);
        const swing = Math.sin(t*1.4 + col.ph + u*1.3)*W*0.010*(1-fold);
        // the fold: the flat rectangle pinches toward a diamond
        const pinch = Math.sin(u*PI)*fold;
        return {
          x: sx - EX + u*(sw+EX*2) + swing*v*v,
          y: b.y + v*b.h*(1-fold*0.42) + pinch*b.h*0.20*(v-0.5)*2
        };
      };
      warpImage(b.cv, sx-EX, 0, sw+EX*2, b.h, deform, LOW?7:10, LOW?6:8);
      if (air>0.004 && hb){
        ctx.globalAlpha *= air;
        warpImage(hb.cv, sx-EX, 0, sw+EX*2, b.h, deform, LOW?7:10, LOW?6:8);
      }
      ctx.restore();

      /* the carried one turns red on its way up, and by the end it is the kite */
      if (isCarried && f > 0.35){
        const kf = cl01((f-0.35)/0.65);
        const kx = cxq + drift + (PKITE.x - cxq)*ease.io(kf);
        const ky = cyq + up + (PKITE.y - (cyq+up))*ease.io(kf);
        const kz = lerp(b.h*0.20, MIN*0.046, ease.io(kf));
        ctx.save();
        ctx.globalAlpha = kf;
        ctx.translate(kx, ky);
        ctx.rotate(lerp(spin, 0.16, kf));
        const face  = mixL([246,244,236], [206,54,60], kf);
        const faceD = mixL([228,224,214], [166,38,46], kf);
        ctx.beginPath(); ctx.moveTo(0,-kz); ctx.lineTo(kz*0.60,0); ctx.lineTo(0,kz*1.10); ctx.closePath();
        ctx.fillStyle=rgb(faceD); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0,-kz); ctx.lineTo(-kz*0.60,0); ctx.lineTo(0,kz*1.10); ctx.closePath();
        ctx.fillStyle=rgb(face); ctx.fill();
        if (kf>0.5){
          ctx.beginPath();
          ctx.moveTo(0,-kz*0.30); ctx.lineTo(kz*0.20,0); ctx.lineTo(0,kz*0.34); ctx.lineTo(-kz*0.20,0);
          ctx.closePath();
          ctx.fillStyle=rgba([248,232,190], (kf-0.5)*2); ctx.fill();
        }
        ctx.restore();
      }
    }
    /* the line it was pegged to, going with them */
    if (e<0.6){
      ctx.save();
      ctx.globalAlpha = (1-e/0.6)*0.5;
      ctx.strokeStyle="rgba(64,54,44,1)";
      ctx.lineWidth=Math.max(1,MIN*0.0016);
      ctx.beginPath();
      const ly = b.y - ease.i(e/0.6)*H*0.5;
      for (let k=0;k<=20;k++){ const u=k/20; ctx.lineTo(u*W, ly + Math.sin(u*PI)*MIN*0.014); }
      ctx.stroke();
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------------ morph 3
   The kite is a long way up, the sky has gone over to night, and it stops being
   a shape and becomes a point of light. The line stays in your hand and becomes
   the line between two stars.
*/
function morphKiteToStar(t, dt, q, o){
  o = o||{};
  const e = ease.io(cl01(q));

  /* the night sky, lifted so the meadow lines up with the one we were standing in */
  const dy = lerp((PLATE_HORIZON.kiteEvening - PLATE_HORIZON.stars)*H, 0, e);
  ctx.save();
  ctx.translate(0, dy);
  drawStarsPlate(t, dt, { air:0.06, glow:0.06, noPan:true });
  ctx.restore();

  /* the kite, going from object to light */
  const kx = PKITE.x || W*0.62, ky = PKITE.y || H*0.28;
  const tgt = DIPPER[5];                       // it becomes Mizar
  const tp = tgt._p || { x:W*0.628, y:H*0.243 };
  const px2 = lerp(kx, tp.x, e), py2 = lerp(ky, tp.y, e);
  const kz = lerp(MIN*0.046, MIN*0.0026, ease.i(e));
  ctx.save();
  ctx.translate(px2, py2);
  ctx.rotate(0.16*(1-e));
  const col = mixL([206,54,60], [255,244,220], e);
  ctx.beginPath(); ctx.moveTo(0,-kz); ctx.lineTo(kz*0.60,0); ctx.lineTo(0,kz*1.10); ctx.lineTo(-kz*0.60,0);
  ctx.closePath(); ctx.fillStyle=rgb(col); ctx.fill();
  ctx.restore();
  // and it starts to shine before it has finished being a kite
  if (e>0.35){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const g = ctx.createRadialGradient(px2,py2,0,px2,py2,MIN*0.05*e);
    g.addColorStop(0, rgba([255,246,222], 0.7*(e-0.35)/0.65));
    g.addColorStop(1, rgba([255,246,222], 0));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px2,py2,MIN*0.05*e,0,TAU); ctx.fill();
    ctx.restore();
  }

  /* the line: it loses its sag and becomes straight, which is the moment it
     stops being string and starts being a constellation */
  const hx = PKITE.handX || W*0.34, hy = PKITE.handY || H*0.60;
  const other = DIPPER[6];                     // toward Alkaid
  const op = other._p || { x:W*0.722, y:H*0.276 };
  const ex = lerp(hx, op.x, e), ey = lerp(hy, op.y, e);
  const sag = (1-e)*MIN*0.20;
  ctx.save();
  ctx.strokeStyle = rgba(mixL([48,44,50],[196,216,255],e), lerp(0.34, 0.28, e));
  ctx.lineWidth = Math.max(1, MIN*0.0013);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.quadraticCurveTo((ex+px2)/2, (ey+py2)/2 + sag, px2, py2);
  ctx.stroke();
  ctx.restore();
  if (e>0.6){
    ctx.fillStyle=rgba([240,246,255], (e-0.6)/0.4);
    ctx.beginPath(); ctx.arc(ex,ey,MIN*0.0026,0,TAU); ctx.fill();
  }
}

/* ------------------------------------------------------------------ morph 4
   Two stars swell until they are the eyepieces, and it is daylight again.
*/
function morphStarsToLenses(t, dt, q, o){
  o = o||{};
  const e = ease.io(cl01(q));
  const mask = buildBinocMask();

  /* the night we are leaving, and the day arriving inside the growing circles */
  drawStarsPlate(t, dt, { air:0.08, glow:0.07, noPan:true });

  const aL = DIPPER[5]._p || { x:W*0.628, y:H*0.243 };
  const aR = DIPPER[6]._p || { x:W*0.722, y:H*0.276 };
  const tL = { x:W*BINOC.lensL, y:H*BINOC.cy };
  const tR = { x:W*BINOC.lensR, y:H*BINOC.cy };
  const cL = { x:lerp(aL.x,tL.x,e), y:lerp(aL.y,tL.y,e) };
  const cR = { x:lerp(aR.x,tR.x,e), y:lerp(aR.y,tR.y,e) };
  const rr = lerp(MIN*0.004, W*BINOC.r, ease.o3(e));

  /* the day, seen only through the two discs */
  if (e>0.02){
    offscreen(()=>{ drawPlate("town", { air:0.10, drift:false }); });
    tc.globalCompositeOperation="destination-in";
    for (const [c2, first] of [[cL,true],[cR,false]]){
      const g = tc.createRadialGradient(c2.x,c2.y,0, c2.x,c2.y,rr);
      g.addColorStop(0,"rgba(255,255,255,1)");
      g.addColorStop(0.86,"rgba(255,255,255,1)");
      g.addColorStop(1,"rgba(255,255,255,0)");
      tc.globalCompositeOperation = first ? "destination-in" : "destination-atop";
      tc.fillStyle=g; tc.fillRect(0,0,TMP.width,TMP.height);
    }
    tc.globalCompositeOperation="source-over";
    ctx.save(); ctx.globalAlpha=cl01(e*1.6); ctx.drawImage(TMP,0,0); ctx.restore();
    // they are still stars for a while, so they keep their glow
    if (e<0.7){
      ctx.save(); ctx.globalCompositeOperation="lighter";
      for (const c2 of [cL,cR]){
        const g = ctx.createRadialGradient(c2.x,c2.y,0,c2.x,c2.y,rr*2.2);
        g.addColorStop(0, rgba([255,246,222], 0.5*(1-e/0.7)));
        g.addColorStop(1, rgba([255,246,222], 0));
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(c2.x,c2.y,rr*2.2,0,TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  /* the eyepieces close in around them at the end */
  if (mask && e>0.55){
    const f = (e-0.55)/0.45;
    const ar = mask.width/mask.height;
    let mw=W, mh=W/ar; if (mh<H){ mh=H; mw=H*ar; }
    mw*=1.06; mh*=1.06;
    ctx.save();
    ctx.globalAlpha = f;
    ctx.globalCompositeOperation="multiply";
    ctx.drawImage(mask, (W-mw)/2, (H-mh)/2, mw, mh);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = f; ctx.fillStyle="#000";
    const mx=(W-mw)/2, my=(H-mh)/2;
    if (mx>0){ ctx.fillRect(0,0,mx+1,H); ctx.fillRect(mx+mw-1,0,W-(mx+mw)+1,H); }
    if (my>0){ ctx.fillRect(0,0,W,my+1); ctx.fillRect(0,my+mh-1,W,H-(my+mh)+1); }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ morph 5
   The eyepiece contracts onto the yellow sun of a drawing on a table.
*/
function morphLensToPaper(t, dt, q, o){
  o = o||{};
  const e = ease.io(cl01(q));
  buildPaper();
  const r = paperRect();

  /* the table arrives from behind */
  const tg = ctx.createLinearGradient(0,0,0,H);
  tg.addColorStop(0,"#3a2c22"); tg.addColorStop(0.5,"#4a382a"); tg.addColorStop(1,"#2e231c");
  ctx.fillStyle=tg; ctx.fillRect(0,0,W,H);

  /* the paper, growing from the size of the drawn sun */
  const sunOn = { x: r.x+r.w*0.845, y: r.y+r.h*0.135 };
  const k = ease.o3(e);
  const pw2 = lerp(MIN*0.11, r.w, k), ph2 = pw2*(PH/PW);
  const cx0 = lerp(sunOn.x, r.x+r.w/2, k), cy0 = lerp(sunOn.y, r.y+r.h/2, k);
  ctx.save();
  ctx.translate(cx0, cy0); ctx.rotate(lerp(0.42,-0.008,k));
  ctx.fillStyle="rgba(0,0,0,0.38)";
  ctx.fillRect(-pw2/2+MIN*0.01, -ph2/2+MIN*0.012, pw2, ph2);
  ctx.drawImage(PAPER, -pw2/2, -ph2/2, pw2, ph2);
  ctx.restore();

  /* the view through the eyepiece, contracting onto that sun */
  if (e < 0.92){
    const rr = lerp(W*BINOC.r, MIN*0.055, k);
    const lx = lerp(W*BINOC.lensL, sunOn.x, k), ly = lerp(H*BINOC.cy, sunOn.y, k);
    const rx = lerp(W*BINOC.lensR, sunOn.x, k), ry = lerp(H*BINOC.cy, sunOn.y, k);
    offscreen(()=>{ drawPlate("town", { air:0.10, drift:false }); });
    tc.globalCompositeOperation="destination-in";
    for (const [c2, first] of [[{x:lx,y:ly},true],[{x:rx,y:ry},false]]){
      const g = tc.createRadialGradient(c2.x,c2.y,0,c2.x,c2.y,rr);
      g.addColorStop(0,"rgba(255,255,255,1)");
      g.addColorStop(0.88,"rgba(255,255,255,1)");
      g.addColorStop(1,"rgba(255,255,255,0)");
      tc.globalCompositeOperation = first ? "destination-in" : "destination-atop";
      tc.fillStyle=g; tc.fillRect(0,0,TMP.width,TMP.height);
    }
    tc.globalCompositeOperation="source-over";
    ctx.save(); ctx.globalAlpha=1-e*0.35; ctx.drawImage(TMP,0,0); ctx.restore();
    // the surround goes with it
    ctx.save();
    ctx.globalAlpha = (1-e);
    ctx.fillStyle="#000";
    ctx.beginPath(); ctx.rect(0,0,W,H);
    ctx.arc(lx,ly,rr,0,TAU); ctx.arc(rx,ry,rr,0,TAU);
    ctx.fill("evenodd");
    ctx.restore();
    // and the crayon sun is already glowing underneath it
    if (e>0.5){
      ctx.save(); ctx.globalCompositeOperation="lighter";
      const g = ctx.createRadialGradient(sunOn.x,sunOn.y,0,sunOn.x,sunOn.y,MIN*0.16);
      g.addColorStop(0, rgba([255,226,120], 0.35*(e-0.5)/0.5));
      g.addColorStop(1, rgba([255,226,120], 0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sunOn.x,sunOn.y,MIN*0.16,0,TAU); ctx.fill();
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------------ morph 6
   The dust that came off the drawing does not settle.
*/
function morphPaperToAir(t, dt, q, o){
  o = o||{};
  const e = ease.io(cl01(q));
  const r = paperRect();
  /* the garden it lands in, already there */
  drawLaundryPlate(t, dt, { air: o.air===undefined?0.55:o.air, mother:true, paintedMother:true, flare:false });
  /* the paper falling away out of frame */
  if (e<0.98){
    ctx.save();
    ctx.globalAlpha = 1-ease.i(e);
    ctx.translate(r.x+r.w/2, r.y+r.h/2 + ease.i(e)*H*0.85);
    ctx.rotate(-0.008 + e*0.38);
    const k = 1-e*0.30;
    ctx.drawImage(PAPER, -r.w*k/2, -r.h*k/2, r.w*k, r.h*k);
    ctx.restore();
  }
  /* and the crayon dust, becoming what is in the air from here on */
  partRole = lerp(1, 2, e);
  drawParticles(t, 0.35+e*0.45, { x:W*0.28, y:H*0.32, r:MIN*1.1 });
}

/* ------------------------------------------------------------------ morph 7
   Back to the window. The drawing turns in the air until its edges are the
   frame of the window in the room where this started.
*/
function morphPaperToWindow(t, dt, q, o){
  o = o||{};
  const e = ease.io(cl01(q));
  const R = WINDOW_IN_PLATE;
  const k = ease.o3(e);

  /* the room, arriving at the scale the paper is shrinking to */
  const s = lerp(2.6, 1.0, k);
  ctx.save();
  ctx.translate(W*0.5, H*0.5); ctx.scale(s, s); ctx.translate(-W*0.5, -H*0.5);
  drawPlate("bedroomOpen", { air:1, drift:false });
  ctx.restore();

  /* the paper, turning and shrinking until it sits exactly in the window */
  if (e<0.99){
    const r = paperRect();
    const tx = R.x*W, ty = R.y*H, tw = R.w*W, th = R.h*H;
    const cx0 = lerp(r.x+r.w/2, tx+tw/2, k);
    const cy0 = lerp(r.y+r.h/2, ty+th/2, k);
    const pw2 = lerp(r.w, tw, k), ph2 = lerp(r.h, th, k);
    ctx.save();
    ctx.globalAlpha = 1-ease.i(cl01((e-0.72)/0.28));
    ctx.translate(cx0, cy0);
    ctx.rotate(lerp(-0.008, 0, k));
    ctx.drawImage(PAPER, -pw2/2, -ph2/2, pw2, ph2);
    ctx.restore();
  }
}
