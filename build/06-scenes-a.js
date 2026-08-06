/* ============================================================================
   CHAPTER ONE — THE WORLD CAME INSIDE
   A bedroom before sunrise. New verbs: PART (two hands on two curtains),
   TURN (a latch that rotates under the finger), LIFT (a sash with weight).
   ========================================================================== */
const ROOM = {
  cL:0, cR:0,            // how far each curtain panel is drawn back
  latch:0, latchDone:false,
  sash:0, sashGrab:false,
  grab:0,                // 1 left curtain · 2 right curtain · 3 latch · 4 sash
  breeze:0, pages:0, bookOpen:0, clockSpin:0, waterRipple:0
};
const BOOKS = [];
for (let i=0;i<9;i++) BOOKS.push({ h:sr(0.55,1), w:sr(0.5,1.2), col:pick([[128,64,58],[70,86,110],[142,116,58],[86,102,74],[104,74,104],[54,66,78]]) });

/* the room's own light: a warm key from the window, cool fill from the landing.
   Even with the curtains shut there is enough of it to see by — a dark room is
   not the same thing as an unlit one. */
function roomLight(){
  const open = Math.max(ROOM.cL, ROOM.cR);
  const warm = mixL([255,186,124], [255,244,216], sm(AIR.tod,0.16,0.34));
  return { open, warm, k: 0.44 + open*0.56 };
}

function drawRoomScene(t, o){
  o = o||{};
  const wr = winRect();
  const openAmt = Math.min(ROOM.cL, ROOM.cR);
  const L = roomLight();

  /* ---------- 1. the outside, drawn first, so the room is genuinely a frame ---------- */
  setAp({ mode:"rect", x:wr.x+wr.w*0.055, y:wr.y+wr.h*0.05, w:wr.w*0.89, h:wr.h*0.82, hf:0.70 });
  ctx.save(); clipAp(ctx);
  const s = drawSky();
  drawSun(t, s);
  drawMoon(t);
  drawClouds(s);
  drawPlane();
  drawLand(t, {});
  drawWires(t, AP.hy - AP.h*0.16, { a:0.9 });
  drawTrain();
  drawCat(t, AP.hy + ph(LAYER.roofs, LAYER.roofs.y) - ph(LAYER.roofs,0.030));
  drawBirds();
  // the washing line is already out there, in chapter one, with sheets on it.
  // It is the next scene, visible from the beginning.
  if (o.laundryOut!==false){
    const ly = AP.hy + AP.h*0.10;
    ctx.strokeStyle=rgba(farColour([64,54,46], 26), 0.6); ctx.lineWidth=Math.max(1,MIN*0.0016);
    ctx.beginPath();
    for (let i=0;i<=14;i++){ const u=i/14, x=AP.x+u*AP.w, y=ly+Math.sin(u*PI)*MIN*0.012;
      if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); }
    ctx.stroke();
    for (let k=0;k<3;k++){
      const u = 0.18+k*0.28;
      cloth({ ax:AP.x+u*AP.w, ay:ly+Math.sin(u*PI)*MIN*0.012,
              bx:AP.x+(u+0.16)*AP.w, by:ly+Math.sin((u+0.16)*PI)*MIN*0.012,
              h:AP.h*0.17, col:farColour([246,244,236],26), ph:k*2.1, folds:4,
              amp:MIN*0.006, windAmp:MIN*0.010, thin:0.7, light:sunPos(AP), pegs:true, seed:k*13 }, t);
    }
  }
  drawParticles(t, AIR.h*0.6, null);
  ctx.restore();

  /* ---------- 2. the room itself, painted around the opening ---------- */
  apFull();
  const wallBase = mixL([176,158,150],[204,188,174], sm(AIR.tod,0.16,0.32));
  const wall = mixL(shade(wallBase, 0.40+L.k*0.62), L.warm, 0.10+L.open*0.16);
  ctx.save();
  ctx.beginPath(); ctx.rect(0,0,W,H);
  ctx.rect(wr.x+wr.w*0.055, wr.y+wr.h*0.05, wr.w*0.89, wr.h*0.82);
  ctx.fillStyle=rgb(wall); ctx.fill("evenodd");
  ctx.clip("evenodd");

  // wallpaper: narrow stripes with a small repeating sprig
  ctx.globalAlpha = 0.09;
  for (let x=0;x<W;x+=MIN*0.052){
    ctx.fillStyle = rgb(shade(wall,0.86)); ctx.fillRect(x, 0, MIN*0.026, H);
  }
  ctx.globalAlpha = 0.13;
  for (let y=H*0.02;y<H*0.86;y+=MIN*0.086){
    for (let x=MIN*0.02;x<W;x+=MIN*0.104){
      const yy = y + ((x/(MIN*0.104))|0)%2 * MIN*0.043;
      ctx.strokeStyle=rgb(shade(wall,0.72)); ctx.lineWidth=1.3;
      ctx.beginPath(); ctx.moveTo(x, yy+MIN*0.010); ctx.lineTo(x, yy-MIN*0.008); ctx.stroke();
      for (let k=-1;k<=1;k+=2){
        ctx.beginPath(); ctx.moveTo(x, yy+MIN*0.002);
        ctx.quadraticCurveTo(x+k*MIN*0.008, yy-MIN*0.002, x+k*MIN*0.004, yy-MIN*0.008); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha=1;

  // the plaster itself: mottled, slightly damp in one corner, never one colour
  texture(NZ_MOTTLE, 0, 0, W, H*0.82, 0.085, 0.85, "soft-light");
  texture(NZ_FINE,   0, 0, W, H*0.82, 0.075, 0.32, "overlay");
  // light falls off away from the window, and gathers in the corners as shadow
  ctx.save();
  const amb = ctx.createRadialGradient(wr.x+wr.w*0.5, wr.y+wr.h*0.4, MIN*0.10,
                                       wr.x+wr.w*0.5, wr.y+wr.h*0.4, MIN*1.25);
  amb.addColorStop(0, rgba(L.warm, 0.10*L.k));
  amb.addColorStop(0.55, "rgba(0,0,0,0)");
  amb.addColorStop(1, "rgba(14,12,20,0.40)");
  ctx.fillStyle=amb; ctx.fillRect(0,0,W,H);
  ctx.restore();
  // a patch of old damp above the skirting
  ctx.save();
  const dp=ctx.createRadialGradient(W*0.13,H*0.74,0,W*0.13,H*0.74,MIN*0.16);
  dp.addColorStop(0,"rgba(120,110,90,0.16)"); dp.addColorStop(1,"rgba(120,110,90,0)");
  ctx.fillStyle=dp; ctx.fillRect(0,H*0.55,W*0.32,H*0.3);
  ctx.restore();

  // picture rail + skirting, with a highlight on the top edge so they have form
  ctx.fillStyle=rgb(shade(wall,0.74)); ctx.fillRect(0, H*0.085, W, MIN*0.009);
  ctx.fillStyle=rgb(shade(wall,1.10)); ctx.fillRect(0, H*0.085, W, MIN*0.0022);
  ctx.fillStyle=rgb(shade(wall,0.66)); ctx.fillRect(0, H*0.795, W, MIN*0.017);
  ctx.fillStyle=rgb(shade(wall,1.06)); ctx.fillRect(0, H*0.795, W, MIN*0.0026);

  // floor: boards running away from the viewer
  const fy = H*0.81;
  const floor = mixL([132,98,70],[158,120,84], L.k*0.5);
  const fg = ctx.createLinearGradient(0,fy,0,H);
  fg.addColorStop(0, rgb(shade(floor,0.72))); fg.addColorStop(1, rgb(shade(floor,1.05)));
  ctx.fillStyle=fg; ctx.fillRect(0,fy,W,H-fy);
  ctx.strokeStyle="rgba(60,40,26,0.30)"; ctx.lineWidth=1;
  for (let i=-3;i<=12;i++){
    const bx = W*0.5 + (i-4.5)*MIN*0.10;
    ctx.beginPath(); ctx.moveTo(lerp(W*0.5, bx, 0.34), fy); ctx.lineTo(lerp(W*0.5,bx,2.4), H); ctx.stroke();
  }
  for (let k=0;k<4;k++){
    const yy = fy + (H-fy)*Math.pow((k+1)/4, 1.7);
    ctx.strokeStyle="rgba(60,40,26,0.16)";
    ctx.beginPath(); ctx.moveTo(0,yy); ctx.lineTo(W,yy); ctx.stroke();
  }
  // grain in the boards, and the sheen of years of feet down the middle
  texture(NZ_FINE, 0, fy, W, H-fy, 0.22, 0.55, "overlay");
  texture(NZ_MOTTLE, 0, fy, W, H-fy, 0.16, 1.1, "multiply");
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  const worn=ctx.createRadialGradient(W*0.5,H*0.95,0,W*0.5,H*0.95,MIN*0.42);
  worn.addColorStop(0, rgba(mixL(L.warm,[210,180,140],0.5), 0.06*L.k));
  worn.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=worn; ctx.fillRect(0,fy,W,H-fy);
  ctx.restore();

  // a rug
  ctx.save();
  ctx.translate(W*0.5, H*0.93); ctx.scale(1,0.34);
  const rg=ctx.createRadialGradient(0,0,0,0,0,MIN*0.34);
  rg.addColorStop(0, rgba(mixL([176,88,74], L.warm, 0.2), 0.95));
  rg.addColorStop(0.72, rgba([146,72,62],0.92)); rg.addColorStop(1, rgba([110,54,50],0.9));
  ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(0,0,MIN*0.34,0,TAU); ctx.fill();
  ctx.strokeStyle="rgba(240,224,190,0.30)"; ctx.lineWidth=MIN*0.006;
  for (const r of [0.55,0.78]){ ctx.beginPath(); ctx.arc(0,0,MIN*0.34*r,0,TAU); ctx.stroke(); }
  ctx.restore();

  /* ---------- 3. the sunbeam, before the props, so props sit inside it ---------- */
  const beamA = openAmt*(0.20+ROOM.sash*0.30) * (0.35+0.65*sm(AIR.tod,0.14,0.36));
  if (beamA>0.01){
    const bx0 = wr.x+wr.w*0.14, bx1 = wr.x+wr.w*0.86;
    shaft({ ax:bx0, ay:wr.y+wr.h*0.10, bx:bx1, by:wr.y+wr.h*0.10,
            cx:bx1-W*0.16, cy:H*1.02, dx:bx0-W*0.30, dy:H*1.02,
            x0:wr.x, y0:wr.y, x1:wr.x-W*0.2, y1:H, col:L.warm, a:beamA });
    // and the motes that live in it
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bx0,wr.y+wr.h*0.10); ctx.lineTo(bx1,wr.y+wr.h*0.10);
    ctx.lineTo(bx1-W*0.16,H*1.02); ctx.lineTo(bx0-W*0.30,H*1.02); ctx.closePath(); ctx.clip();
    partRole = lerp(0, 2, AIR.h);
    drawParticles(t, 0.55+openAmt*0.45, { x:(bx0+bx1)/2, y:wr.y, r:H*1.1 }, true);
    ctx.restore();
  }

  /* ---------- 4. props ---------- */
  // --- bed, left
  const bx = W*0.012, by = H*0.585, bw = W*0.265, bh = H*0.185;
  groundShadow(bx+bw*0.5, by+bh+MIN*0.01, bw*0.6, MIN*0.03, 0.28);
  ctx.fillStyle=rgb(shade([92,64,46], 0.5+L.k*0.5));
  ctx.fillRect(bx+bw*0.02, by-H*0.13, MIN*0.020, H*0.34);      // headboard post
  ctx.fillRect(bx+bw*0.02, by-H*0.13, bw*0.5, MIN*0.014);      // headboard rail
  // the mattress edge
  ctx.fillStyle=rgb(shade([232,228,220],0.5+L.k*0.42));
  ctx.fillRect(bx, by+bh*0.62, bw, bh*0.30);
  ctx.fillStyle=rgba([40,34,30],0.16); ctx.fillRect(bx, by+bh*0.90, bw, bh*0.06);
  // the duvet, as cloth, so it has real folds and takes the room's light
  const duv = mixL([206,212,220], L.warm, 0.20+L.open*0.16);
  cloth({ ax:bx, ay:by+bh*0.06, bx:bx+bw, by:by+bh*0.015,
          h:bh*0.72, col:shade(duv,0.56+L.k*0.44), ph:0.9, folds:4,
          amp:MIN*0.011, windAmp:MIN*0.006*ROOM.breeze, thin:0.10, sag:MIN*0.012,
          light:{x:wr.x+wr.w*0.5,y:wr.y}, backlit:0.2, seed:31 }, t);
  // a knitted blanket folded across the foot
  cloth({ ax:bx+bw*0.44, ay:by+bh*0.50, bx:bx+bw*1.02, by:by+bh*0.44,
          h:bh*0.46, col:shade(mixL([176,118,104], L.warm, 0.18),0.54+L.k*0.44),
          ph:2.4, folds:3, amp:MIN*0.008, windAmp:0, thin:0.12,
          hem:[214,180,150], seed:32 }, t);
  // the turned-back top sheet
  ctx.fillStyle=rgb(shade([246,244,240],0.58+L.k*0.4));
  ctx.beginPath();
  ctx.moveTo(bx,by+bh*0.10); ctx.lineTo(bx+bw*0.92,by+bh*0.035);
  ctx.lineTo(bx+bw*0.92,by+bh*0.20); ctx.lineTo(bx,by+bh*0.28); ctx.closePath(); ctx.fill();
  ctx.strokeStyle=rgba([170,166,158],0.4); ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(bx,by+bh*0.28); ctx.lineTo(bx+bw*0.92,by+bh*0.20); ctx.stroke();
  // two pillows, one dented where a head was
  for (const pk of [[0.24,-0.012,1],[0.52,-0.004,0.9]]){
    ctx.fillStyle=rgb(shade([250,248,244],(0.60+L.k*0.38)*pk[2]));
    ctx.beginPath();
    ctx.ellipse(bx+bw*pk[0], by+MIN*pk[1], bw*0.20, MIN*0.030, -0.04, 0, TAU); ctx.fill();
    ctx.fillStyle=rgba([196,192,186],0.30);
    ctx.beginPath();
    ctx.ellipse(bx+bw*pk[0], by+MIN*pk[1]+MIN*0.006, bw*0.11, MIN*0.011, -0.04, 0, TAU); ctx.fill();
  }
  // the hem of a sheet hanging off the bed, which the breeze will move
  cloth({ ax:bx+bw*0.66, ay:by+bh*0.9, bx:bx+bw*1.0, by:by+bh*0.86,
          h:H*0.10*(1+ROOM.breeze*0.1), col:shade([246,244,238],0.6+L.k*0.4),
          ph:1.3, folds:3, amp:MIN*0.006, windAmp:MIN*0.016*ROOM.breeze, thin:0.4, seed:5 }, t);

  // --- bedside table with the things on it
  const tx = W*0.295, ty = H*0.618, tw = W*0.082, th = H*0.19;
  groundShadow(tx+tw*0.5, ty+th, tw*0.7, MIN*0.022, 0.3);
  ctx.fillStyle=rgb(shade([116,84,58],0.5+L.k*0.5)); ctx.fillRect(tx,ty,tw,th);
  ctx.fillStyle=rgb(shade([132,96,66],0.55+L.k*0.45)); ctx.fillRect(tx-MIN*0.006,ty-MIN*0.008,tw+MIN*0.012,MIN*0.012);
  ctx.strokeStyle="rgba(50,32,20,0.4)"; ctx.lineWidth=1;
  ctx.strokeRect(tx+tw*0.14, ty+th*0.18, tw*0.72, th*0.28);
  ctx.fillStyle="rgba(220,200,160,0.75)";
  ctx.beginPath(); ctx.arc(tx+tw*0.5, ty+th*0.32, MIN*0.005,0,TAU); ctx.fill();

  // the clock — it ticks, and if you touch it, it chimes and the hands run
  const kx = tx+tw*0.28, ky = ty-MIN*0.030, kr = MIN*0.030;
  ROOM.clockSpin = Math.max(0, ROOM.clockSpin-0.008);
  ctx.fillStyle=rgb(shade([238,230,214],0.6+L.k*0.4));
  ctx.beginPath(); ctx.arc(kx,ky,kr,0,TAU); ctx.fill();
  ctx.strokeStyle=rgb(shade([92,70,50],0.6+L.k*0.4)); ctx.lineWidth=Math.max(2,kr*0.13); ctx.stroke();
  ctx.fillStyle=rgba([70,62,54],0.75);
  for (let i=0;i<12;i++){ const a=i/12*TAU;
    ctx.beginPath(); ctx.arc(kx+Math.sin(a)*kr*0.76, ky-Math.cos(a)*kr*0.76, kr*(i%3?0.035:0.06),0,TAU); ctx.fill(); }
  const spin = ROOM.clockSpin*24;
  ctx.strokeStyle="rgba(56,50,44,0.92)"; ctx.lineWidth=Math.max(2,kr*0.10); ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(kx,ky);
  ctx.lineTo(kx+Math.sin(1.1+spin)*kr*0.44, ky-Math.cos(1.1+spin)*kr*0.44); ctx.stroke();
  ctx.lineWidth=Math.max(1.4,kr*0.07);
  ctx.beginPath(); ctx.moveTo(kx,ky);
  ctx.lineTo(kx+Math.sin(3.9+spin*2.2)*kr*0.66, ky-Math.cos(3.9+spin*2.2)*kr*0.66); ctx.stroke();
  ctx.strokeStyle="rgba(184,72,58,0.95)"; ctx.lineWidth=Math.max(1,kr*0.045);
  const sec=(t*1.02+spin*7)%TAU;
  ctx.beginPath(); ctx.moveTo(kx-Math.sin(sec)*kr*0.16, ky+Math.cos(sec)*kr*0.16);
  ctx.lineTo(kx+Math.sin(sec)*kr*0.80, ky-Math.cos(sec)*kr*0.80); ctx.stroke();
  spot("clock", kx, ky, kr*1.7, ()=>{
    ROOM.clockSpin=1; sfx.chime(1047); memFlash("chime",kx,ky);
    whisper("Ten past six. It was always ten past six.");
    curiosity+=0.4;
  });

  // the framed photograph — the sea, from before you can remember
  const fx2 = tx+tw*0.74, fy2 = ty-MIN*0.020, fw2=MIN*0.046, fh2=MIN*0.058;
  ctx.save(); ctx.translate(fx2,fy2); ctx.rotate(-0.06);
  ctx.fillStyle=rgb(shade([104,74,50],0.6+L.k*0.4)); ctx.fillRect(-fw2/2,-fh2/2,fw2,fh2);
  const pg=ctx.createLinearGradient(0,-fh2/2,0,fh2/2);
  pg.addColorStop(0,"#9fc4cf"); pg.addColorStop(0.52,"#7ba8bb"); pg.addColorStop(0.56,"#c9b98e"); pg.addColorStop(1,"#b9a87c");
  ctx.fillStyle=pg; ctx.fillRect(-fw2/2+fw2*0.09,-fh2/2+fh2*0.09,fw2*0.82,fh2*0.82);
  ctx.fillStyle="rgba(60,52,44,0.5)";
  ctx.beginPath(); ctx.ellipse(-fw2*0.10, fh2*0.14, fw2*0.05, fh2*0.10,0,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse( fw2*0.06, fh2*0.16, fw2*0.04, fh2*0.08,0,0,TAU); ctx.fill();
  ctx.restore();
  spot("photo", fx2, fy2, MIN*0.05, ()=>{
    memFlash("sea", W*0.5, H*0.42); ripple(fx2,fy2,[180,220,230],MIN*0.14); sfx.chime(784);
    whisper("You don't remember this one. You've just always known it.");
    curiosity+=0.4;
  });

  // a glass of water, half drunk
  const gx=tx+tw*0.52, gy=ty-MIN*0.004;
  ROOM.waterRipple=Math.max(0,ROOM.waterRipple-0.012);
  ctx.fillStyle="rgba(226,238,244,0.34)";
  ctx.beginPath(); ctx.moveTo(gx-MIN*0.011,gy-MIN*0.026); ctx.lineTo(gx+MIN*0.011,gy-MIN*0.026);
  ctx.lineTo(gx+MIN*0.009,gy); ctx.lineTo(gx-MIN*0.009,gy); ctx.closePath(); ctx.fill();
  ctx.fillStyle="rgba(180,214,230,0.55)";
  const wl = gy-MIN*0.012 + Math.sin(t*6)*MIN*0.0012*ROOM.waterRipple;
  ctx.beginPath(); ctx.moveTo(gx-MIN*0.0098,wl); ctx.lineTo(gx+MIN*0.0098,wl);
  ctx.lineTo(gx+MIN*0.009,gy); ctx.lineTo(gx-MIN*0.009,gy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.45)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(gx-MIN*0.006,gy-MIN*0.022); ctx.lineTo(gx-MIN*0.005,gy-MIN*0.004); ctx.stroke();
  spot("water", gx, gy-MIN*0.014, MIN*0.03, ()=>{
    ROOM.waterRipple=1; sfx.chime(1175); curiosity+=0.3;
  }, false);

  // --- shelf of books, above the table
  const sx=W*0.055, sy=H*0.335, sw=W*0.175;
  ctx.fillStyle=rgb(shade([120,88,60],0.55+L.k*0.45));
  ctx.fillRect(sx, sy, sw, MIN*0.012);
  ctx.fillStyle="rgba(0,0,0,0.16)"; ctx.fillRect(sx, sy+MIN*0.012, sw, MIN*0.006);
  let bxx = sx+MIN*0.008;
  for (let i=0;i<BOOKS.length;i++){
    const b=BOOKS[i], bwid=MIN*0.010*b.w, bhh=MIN*0.070*b.h;
    if (bxx+bwid > sx+sw-MIN*0.006) break;
    const lean = i===BOOKS.length-2 ? 0.16 : 0;
    ctx.save(); ctx.translate(bxx, sy);
    ctx.rotate(lean);
    ctx.fillStyle=rgb(shade(b.col, 0.5+L.k*0.5));
    ctx.fillRect(0,-bhh,bwid,bhh);
    ctx.fillStyle=rgba([240,230,206],0.28); ctx.fillRect(0,-bhh,bwid,MIN*0.003);
    ctx.restore();
    bxx += bwid+MIN*0.0016;
  }
  // one book lying flat, which has something in it
  const lbx=sx+sw*0.62, lby=sy-MIN*0.010;
  ctx.fillStyle=rgb(shade([86,102,74],0.55+L.k*0.45)); ctx.fillRect(lbx,lby,MIN*0.058,MIN*0.010);
  ctx.fillStyle=rgba([240,232,210],0.8); ctx.fillRect(lbx+1,lby+2,MIN*0.056,MIN*0.005);
  spot("book", lbx+MIN*0.029, lby, MIN*0.05, ()=>{
    memFlash("flower", lbx+MIN*0.029, lby+MIN*0.06); sfx.paper();
    whisper("A flower somebody pressed, and then forgot.");
    curiosity+=0.4;
  });

  // --- the drawing, already taped to the wall. It is the same drawing you will
  //     be given later, and the same one propped by the window at the end.
  const dx2=W*0.845, dy2=H*0.255, dw2=MIN*0.150, dh2=MIN*0.117;
  ctx.save(); ctx.translate(dx2,dy2); ctx.rotate(0.035);
  ctx.fillStyle="rgba(0,0,0,0.14)"; ctx.fillRect(-dw2/2+3,-dh2/2+4,dw2,dh2);
  if (paperBuilt){
    ctx.drawImage(PAPER, -dw2/2, -dh2/2, dw2, dh2);
    ctx.fillStyle=rgba(shade([255,255,255],1), 0);
  } else {
    ctx.fillStyle="#efe7cd"; ctx.fillRect(-dw2/2,-dh2/2,dw2,dh2);
    ctx.fillStyle="#2f68c4"; ctx.fillRect(-dw2/2+2,-dh2/2+2,dw2-4,dh2*0.58);
    ctx.fillStyle="#6c9b3f"; ctx.fillRect(-dw2/2+2,-dh2/2+dh2*0.6,dw2-4,dh2*0.36);
  }
  // a shading pass so it belongs in the room's light
  ctx.fillStyle=rgba([20,18,26], (1-L.k)*0.42); ctx.fillRect(-dw2/2,-dh2/2,dw2,dh2);
  // tape
  ctx.fillStyle="rgba(238,228,196,0.62)";
  ctx.fillRect(-dw2/2-MIN*0.006,-dh2/2-MIN*0.006,MIN*0.024,MIN*0.011);
  ctx.fillRect(dw2/2-MIN*0.018,-dh2/2-MIN*0.006,MIN*0.024,MIN*0.011);
  ctx.restore();
  spot("drawing-wall", dx2, dy2, MIN*0.085, ()=>{
    memFlash("blue", dx2, dy2); ripple(dx2,dy2,[70,140,220],MIN*0.16); sfx.chime(659);
    whisper("She put it up the day you made it.");
    curiosity+=0.5;
  });

  // --- the plant, right, whose leaves take the breeze
  const px2=W*0.760, py2=H*0.742;
  groundShadow(px2, py2+MIN*0.012, MIN*0.06, MIN*0.016, 0.32);
  ctx.fillStyle=rgb(shade([146,104,74],0.55+L.k*0.45));
  ctx.beginPath(); ctx.moveTo(px2-MIN*0.030,py2); ctx.lineTo(px2+MIN*0.030,py2);
  ctx.lineTo(px2+MIN*0.024,py2+MIN*0.058); ctx.lineTo(px2-MIN*0.024,py2+MIN*0.058); ctx.closePath(); ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.fillRect(px2-MIN*0.030,py2,MIN*0.060,MIN*0.006);
  for (let i=0;i<11;i++){
    const a=-2.05+i*0.21 + Math.sin(t*1.25+i*0.8)*(0.035+ROOM.breeze*0.13);
    const len=MIN*(0.075+((i*37)%11)/11*0.05);
    const g2=ctx.createLinearGradient(px2,py2,px2+Math.cos(a)*len,py2+Math.sin(a)*len);
    g2.addColorStop(0, rgb(shade([48,84,50],0.5+L.k*0.5)));
    g2.addColorStop(1, rgb(shade([96,148,78],0.5+L.k*0.5)));
    ctx.strokeStyle=g2; ctx.lineWidth=MIN*0.0075; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(px2,py2-MIN*0.004);
    ctx.quadraticCurveTo(px2+Math.cos(a)*len*0.45, py2+Math.sin(a)*len*0.75, px2+Math.cos(a)*len, py2+Math.sin(a)*len);
    ctx.stroke();
  }
  spot("plant", px2, py2-MIN*0.05, MIN*0.09, ()=>{
    releaseMoth(px2, py2-MIN*0.05); sfx.flap();
    whisper("Something had been living in there.");
    curiosity+=0.5;
  });

  // --- a chair with a cardigan over the back
  const chx=W*0.605, chy=H*0.852;
  groundShadow(chx,chy+MIN*0.006,MIN*0.06,MIN*0.014,0.26);
  ctx.strokeStyle=rgb(shade([112,80,54],0.55+L.k*0.45)); ctx.lineWidth=MIN*0.008;
  ctx.beginPath();
  ctx.moveTo(chx-MIN*0.036,chy); ctx.lineTo(chx-MIN*0.030,chy-MIN*0.060);
  ctx.lineTo(chx+MIN*0.030,chy-MIN*0.060); ctx.lineTo(chx+MIN*0.036,chy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(chx-MIN*0.030,chy-MIN*0.060); ctx.lineTo(chx-MIN*0.026,chy-MIN*0.125); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(chx+MIN*0.030,chy-MIN*0.060); ctx.lineTo(chx+MIN*0.026,chy-MIN*0.125); ctx.stroke();
  cloth({ ax:chx-MIN*0.030, ay:chy-MIN*0.122, bx:chx+MIN*0.030, by:chy-MIN*0.122,
          h:MIN*0.085, col:shade([176,120,132],0.55+L.k*0.45), ph:2.2, folds:3,
          amp:MIN*0.004, windAmp:MIN*0.010*ROOM.breeze, thin:0.25, seed:9 }, t);

  // --- toys on the floor: a wooden horse and three marbles
  const hx2=W*0.375, hy2=H*0.908;
  groundShadow(hx2,hy2+MIN*0.004,MIN*0.030,MIN*0.008,0.3);
  ctx.fillStyle=rgb(shade([160,116,72],0.55+L.k*0.45));
  ctx.fillRect(hx2-MIN*0.022,hy2-MIN*0.016,MIN*0.044,MIN*0.014);
  ctx.fillRect(hx2+MIN*0.010,hy2-MIN*0.034,MIN*0.012,MIN*0.021);
  ctx.fillRect(hx2-MIN*0.019,hy2-MIN*0.003,MIN*0.006,MIN*0.008);
  ctx.fillRect(hx2+MIN*0.013,hy2-MIN*0.003,MIN*0.006,MIN*0.008);
  ctx.strokeStyle="rgba(120,80,50,0.8)"; ctx.lineWidth=MIN*0.003;
  ctx.beginPath(); ctx.moveTo(hx2+MIN*0.008,hy2-MIN*0.034); ctx.lineTo(hx2-MIN*0.002,hy2-MIN*0.020); ctx.stroke();
  for (let i=0;i<3;i++){
    const mx=W*0.455+i*MIN*0.024, my=H*0.925+Math.sin(i)*MIN*0.006;
    const mg=ctx.createRadialGradient(mx-MIN*0.003,my-MIN*0.003,0,mx,my,MIN*0.011);
    mg.addColorStop(0,"rgba(255,255,255,0.9)");
    mg.addColorStop(0.3, rgb(shade(pick([[80,140,200],[200,150,70],[150,90,160]]),0.6+L.k*0.4)));
    mg.addColorStop(1,"rgba(30,40,60,0.9)");
    ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mx,my,MIN*0.011,0,TAU); ctx.fill();
  }

  // --- the door, ajar, with the rest of the house behind it
  const dxx=W*0.905, dyy=H*0.285, dww=W*0.092, dhh=H*0.51;
  ctx.fillStyle=rgb(shade([70,58,52],0.5+L.k*0.4)); ctx.fillRect(dxx,dyy,dww,dhh);
  const dg=ctx.createLinearGradient(dxx,0,dxx+dww,0);
  dg.addColorStop(0, rgba(mixL([255,226,180],[120,120,140], 1-sm(AIR.tod,0.16,0.3)), 0.42));
  dg.addColorStop(1, "rgba(255,226,180,0)");
  ctx.fillStyle=dg; ctx.fillRect(dxx,dyy,dww,dhh);
  ctx.fillStyle=rgb(shade([132,98,70],0.5+L.k*0.5)); ctx.fillRect(dxx+dww,dyy-MIN*0.01,MIN*0.012,dhh+MIN*0.01);

  ctx.restore();  // end of wall clip

  /* ---------- 5. the window joinery, sill, and glass ---------- */
  const frameCol = rgb(shade([64,50,40], 0.45+L.k*0.55));
  const inx=wr.x+wr.w*0.055, iny=wr.y+wr.h*0.05, inw=wr.w*0.89, inh=wr.h*0.82;
  // reveal (the wall's thickness) — this is what makes it a hole, not a picture
  ctx.save();
  ctx.fillStyle=rgba([20,16,14],0.30);
  ctx.beginPath(); ctx.moveTo(inx,iny); ctx.lineTo(inx+inw,iny);
  ctx.lineTo(inx+inw-MIN*0.012,iny+MIN*0.014); ctx.lineTo(inx+MIN*0.012,iny+MIN*0.014); ctx.closePath(); ctx.fill();
  ctx.fillStyle=rgba([255,250,236],0.10);
  ctx.beginPath(); ctx.moveTo(inx,iny); ctx.lineTo(inx+MIN*0.012,iny+MIN*0.014);
  ctx.lineTo(inx+MIN*0.012,iny+inh-MIN*0.014); ctx.lineTo(inx,iny+inh); ctx.closePath(); ctx.fill();
  ctx.restore();
  // glass: a faint sheen and the marks of hands
  ctx.save();
  ctx.beginPath(); ctx.rect(inx,iny,inw,inh); ctx.clip();
  const sheen=ctx.createLinearGradient(inx,iny,inx+inw*0.8,iny+inh);
  sheen.addColorStop(0,"rgba(255,255,255,0.10)"); sheen.addColorStop(0.4,"rgba(255,255,255,0.02)");
  sheen.addColorStop(1,"rgba(255,255,255,0.06)");
  ctx.fillStyle=sheen; ctx.fillRect(inx,iny,inw,inh*(1-ROOM.sash*0.5));
  ctx.restore();
  // sash bar + the upper/lower panes
  const sashY = iny+inh*0.5 - inh*0.46*ROOM.sash;
  ctx.fillStyle=frameCol;
  ctx.fillRect(inx, sashY-MIN*0.011, inw, MIN*0.022);
  ctx.fillRect(inx, iny+inh*0.5+MIN*0.001, inw, MIN*0.008);   // the fixed meeting rail
  // glazing bars on the upper sash
  ctx.fillRect(inx+inw*0.5-MIN*0.004, iny, MIN*0.008, inh*0.5);
  // frame
  ctx.lineWidth=Math.max(10, MIN*0.026); ctx.strokeStyle=frameCol;
  ctx.strokeRect(inx,iny,inw,inh);
  // the sill, with a lip
  ctx.fillStyle=rgb(shade([78,62,50],0.5+L.k*0.5));
  ctx.fillRect(wr.x-MIN*0.014, iny+inh, inw+MIN*0.056, MIN*0.026);
  ctx.fillStyle=rgb(shade([96,76,60],0.55+L.k*0.45));
  ctx.fillRect(wr.x-MIN*0.014, iny+inh, inw+MIN*0.056, MIN*0.008);

  // the latch: brass, turns under the finger
  const lx = inx+inw*0.5, ly = iny+inh*0.5 - MIN*0.004;
  if (ROOM.sash < 0.04){
    ctx.save(); ctx.translate(lx,ly); ctx.rotate(ROOM.latch*PI*0.55);
    const bg=ctx.createLinearGradient(-MIN*0.02,0,MIN*0.02,0);
    bg.addColorStop(0,"#8a6a34"); bg.addColorStop(0.45,"#e2c078"); bg.addColorStop(1,"#7d5f2c");
    ctx.fillStyle=bg;
    ctx.beginPath(); ctx.ellipse(0,0,MIN*0.011,MIN*0.011,0,0,TAU); ctx.fill();
    ctx.fillRect(-MIN*0.004,-MIN*0.030,MIN*0.008,MIN*0.030);
    ctx.beginPath(); ctx.arc(0,-MIN*0.030,MIN*0.007,0,TAU); ctx.fill();
    ctx.restore();
    if (!ROOM.latchDone) spotLatch(lx,ly);
  }
  // the sash lift handles, once unlatched
  if (ROOM.latchDone && ROOM.sash<0.96){
    ctx.fillStyle="#c9a45e";
    for (const u of [0.3,0.7]){
      ctx.beginPath();
      ctx.arc(inx+inw*u, sashY+MIN*0.016, MIN*0.009, PI, TAU); ctx.fill();
    }
  }

  /* ---------- 6. the curtains, last, in front of everything ---------- */
  const rodY = wr.y - MIN*0.014;
  ctx.fillStyle="#7a5c3e";
  ctx.fillRect(wr.x-MIN*0.036, rodY-MIN*0.006, wr.w+MIN*0.072, MIN*0.010);
  ctx.beginPath(); ctx.arc(wr.x-MIN*0.036, rodY-MIN*0.001, MIN*0.011,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(wr.x+wr.w+MIN*0.036, rodY-MIN*0.001, MIN*0.011,0,TAU); ctx.fill();

  /* the two panels do not quite meet, so morning comes in as a bright seam down
     the middle of the closed curtains. That seam is the first thing you see and
     the reason you want to pull them apart. */
  const curCol = mixL([182,80,70], L.warm, 0.16+L.open*0.10);
  const out = MIN*0.030;
  const panelW = wr.w*0.474 + out;
  const lA = wr.x - out - ROOM.cL*panelW*0.72;
  const lB = lA + panelW*(1-ROOM.cL*0.44);
  const rB = wr.x+wr.w + out + ROOM.cR*panelW*0.72;
  const rA = rB - panelW*(1-ROOM.cR*0.44);

  // the seam glow, drawn behind the cloth so the cloth edges catch it
  const seamA = (1-openAmt*0.75)*(0.30+0.70*sm(AIR.tod,0.12,0.32));
  if (seamA>0.02){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const mid=(lB+rA)/2;
    const g=ctx.createLinearGradient(mid-MIN*0.20,0,mid+MIN*0.20,0);
    g.addColorStop(0, rgba(L.warm,0));
    g.addColorStop(0.34, rgba(L.warm, 0.09*seamA));
    g.addColorStop(0.5, rgba(mixL(L.warm,[255,255,250],0.4), 0.22*seamA));
    g.addColorStop(0.66, rgba(L.warm, 0.09*seamA));
    g.addColorStop(1, rgba(L.warm,0));
    ctx.fillStyle=g; ctx.fillRect(mid-MIN*0.20, wr.y-MIN*0.03, MIN*0.40, wr.h*1.08);
    // and a halo where it spills onto the wall above and below
    const g2=ctx.createRadialGradient(mid, wr.y+wr.h*0.5, 0, mid, wr.y+wr.h*0.5, wr.h*1.05);
    g2.addColorStop(0, rgba(L.warm, 0.13*seamA)); g2.addColorStop(1, rgba(L.warm,0));
    ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  // the light in the gap itself: blown out, so the eye reads light not landscape
  if (seamA>0.02){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    const mid=(lB+rA)/2, gw2=(rA-lB);
    const g3=ctx.createLinearGradient(mid-gw2,0,mid+gw2,0);
    g3.addColorStop(0,rgba(L.warm,0));
    g3.addColorStop(0.5,rgba(mixL(L.warm,[255,255,252],0.65), 0.62*seamA));
    g3.addColorStop(1,rgba(L.warm,0));
    ctx.fillStyle=g3; ctx.fillRect(mid-gw2, wr.y-MIN*0.01, gw2*2, wr.h*1.02);
    ctx.restore();
  }
  cloth({ ax:lA, ay:rodY, bx:lB, by:rodY, h:wr.h*1.045,
    col:shade(curCol,0.5+L.k*0.5), ph:0.4, folds:6, amp:MIN*0.020*(1-ROOM.cL*0.35),
    windAmp:MIN*0.030*ROOM.breeze, thin:0.34, part:0.55+ROOM.cL*0.35, gatherDir:-1,
    light:{x:(lB+rA)/2, y:wr.y+wr.h*0.4}, backlit:0.5+openAmt*0.5, seed:1,
    push: (ROOM.grab===1&&P.down)?{x:P.x,y:P.y,r:MIN*0.16,k:MIN*0.03}:null }, t);
  cloth({ ax:rA, ay:rodY, bx:rB, by:rodY, h:wr.h*1.045,
    col:shade(curCol,0.48+L.k*0.52), ph:2.6, folds:6, amp:MIN*0.020*(1-ROOM.cR*0.35),
    windAmp:MIN*0.030*ROOM.breeze, thin:0.34, part:0.55+ROOM.cR*0.35, gatherDir:1,
    light:{x:(lB+rA)/2, y:wr.y+wr.h*0.4}, backlit:0.5+openAmt*0.5, seed:2,
    push: (ROOM.grab===2&&P.down)?{x:P.x,y:P.y,r:MIN*0.16,k:-MIN*0.03}:null }, t);

  // the weave of the curtain fabric, and a faint printed pattern
  ctx.save();
  ctx.beginPath();
  ctx.rect(lA-MIN*0.01, rodY, (lB-lA)+MIN*0.02, wr.h*1.05);
  ctx.rect(rA-MIN*0.01, rodY, (rB-rA)+MIN*0.02, wr.h*1.05);
  ctx.clip();
  texture(NZ_FINE, 0, rodY, W, wr.h*1.05, 0.11, 0.13, "overlay");
  // a small printed sprig, the sort of curtain fabric that dates a house
  ctx.globalAlpha=0.055;
  ctx.fillStyle="#f6e2c0";
  for (let yy=rodY+MIN*0.02; yy<rodY+wr.h*1.05; yy+=MIN*0.038){
    for (let xx=wr.x-wr.w*0.6; xx<wr.x+wr.w*1.6; xx+=MIN*0.034){
      const ox=(((yy/(MIN*0.038))|0)%2)*MIN*0.017;
      ctx.beginPath(); ctx.ellipse(xx+ox, yy, MIN*0.0045, MIN*0.0022, 0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(xx+ox+MIN*0.005, yy+MIN*0.004, MIN*0.0032, MIN*0.0016, -0.4, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha=1;
  ctx.restore();

  // the lit inner edge of each panel, where the seam light rakes across it
  if (seamA>0.02){
    ctx.save(); ctx.globalCompositeOperation="lighter";
    for (const [ex,dir] of [[lB,-1],[rA,1]]){
      const g=ctx.createLinearGradient(ex+dir*MIN*0.05, 0, ex, 0);
      g.addColorStop(0, rgba(L.warm,0)); g.addColorStop(1, rgba(L.warm, 0.20*seamA));
      ctx.fillStyle=g;
      ctx.fillRect(Math.min(ex, ex+dir*MIN*0.05), rodY, MIN*0.05, wr.h*1.04);
    }
    ctx.restore();
  }

  /* ---------- 7. the mother, before you are awake ---------- */
  /* Never a body standing in the room — a shadow the landing light throws onto
     the curtain, reaching up for the rod. She is gone by the time it is open. */
  const mo = 1 - sm(Math.max(ROOM.cL,ROOM.cR), 0.04, 0.55);
  if (mo>0.02 && o.mother!==false){
    // a soft edge without canvas filters, which are far too slow per frame:
    // three passes at slight offsets read as a thrown shadow
    const mx=wr.x+wr.w*0.135, my=H*0.905;
    for (const off of [[-9,-5],[9,5],[-4,3],[4,-3],[0,0]]){
      ctx.save();
      ctx.globalAlpha = mo*(off[0]===0?0.085:0.055);
      figure({ x:mx+off[0], y:my+off[1], s:MIN*0.44, a:0.9, col:[30,24,34], t,
               reach: 0.80+0.14*Math.sin(t*0.6), oneArm:true, d:3 });
      ctx.restore();
    }
    // her shadow on the floorboards, which is the part that makes her real
    ctx.save();
    ctx.globalAlpha = mo*0.18;
    ctx.fillStyle="#1a1621";
    ctx.beginPath();
    ctx.ellipse(wr.x+wr.w*0.31, H*0.888, MIN*0.105, MIN*0.019, -0.05, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- 8. hotspots for the required actions ---------- */
  if (!o.noInteract){
    // curtain grab zones
    if (ROOM.cL<0.98) spotCurtain(1, (lA+lB)/2, wr.y+wr.h*0.45, Math.max(MIN*0.12, panelW*0.5));
    if (ROOM.cR<0.98) spotCurtain(2, (rA+rB)/2, wr.y+wr.h*0.45, Math.max(MIN*0.12, panelW*0.5));
  }
  return { wr, inx, iny, inw, inh, sashY, lx, ly };
}
/* these two only mark where the required drags are; the drag itself is in input */
function spotCurtain(){ }
function spotLatch(){ }

/* ---- the room's interaction, run every frame ---- */
function roomInteract(g, t, dt){
  const wr = winRect();
  const inx=wr.x+wr.w*0.055, iny=wr.y+wr.h*0.05, inw=wr.w*0.89, inh=wr.h*0.82;
  const sashY = iny+inh*0.5 - inh*0.46*ROOM.sash;
  const lx=inx+inw*0.5, ly=iny+inh*0.5-MIN*0.004;

  if (P.down && P.active){
    if (!ROOM.grab){
      // decide what was grabbed
      if (ROOM.latchDone && ROOM.sash<0.97 && Math.abs(P.y-sashY)<MIN*0.075 && P.x>inx && P.x<inx+inw) ROOM.grab=4;
      else if (!ROOM.latchDone && Math.max(ROOM.cL,ROOM.cR)>0.45 && Math.hypot(P.x-lx,P.y-ly)<MIN*0.075) ROOM.grab=3;
      else if (P.y>wr.y-MIN*0.05 && P.y<wr.y+wr.h*1.02){
        if (P.x < W*0.5) ROOM.grab=1; else ROOM.grab=2;
      }
    }
    if (ROOM.grab===1){
      const from = wr.x+wr.w*0.10;
      ROOM.cL = cl01(Math.max(ROOM.cL*0.86, (from-P.x)/(wr.w*0.42)));
      if (Math.abs(P.dx)>2) sfx.cloth(0.5);
    } else if (ROOM.grab===2){
      const from = wr.x+wr.w*0.90;
      ROOM.cR = cl01(Math.max(ROOM.cR*0.86, (P.x-from)/(wr.w*0.42)));
      if (Math.abs(P.dx)>2) sfx.cloth(0.5);
    } else if (ROOM.grab===3){
      // rotate: drag in any direction around the latch pivot
      const a0=Math.atan2(P.py-ly,P.px-lx), a1=Math.atan2(P.y-ly,P.x-lx);
      let da=a1-a0; while(da>PI)da-=TAU; while(da<-PI)da+=TAU;
      ROOM.latch = cl01(ROOM.latch + Math.abs(da)/(PI*0.55));
      if (ROOM.latch>=0.99 && !ROOM.latchDone){ ROOM.latchDone=true; sfx.latch(); ripple(lx,ly,[240,210,140],MIN*0.1); }
    } else if (ROOM.grab===4 && ROOM.latchDone){
      const target = cl01((iny+inh*0.5 - P.y)/(inh*0.46));
      const prev=ROOM.sash;
      ROOM.sash = lerp(ROOM.sash, target, 0.28);
      if (ROOM.sash-prev > 0.012) sfx.slide();
      if (ROOM.sash>0.10 && prev<=0.10){ OUTSIDE_T = 1; sfx.gust(); gustLeaves(8); }
    }
  } else {
    ROOM.grab = 0;
    if (ROOM.sash>0.03 && ROOM.sash<0.97) ROOM.sash += (Math.round(ROOM.sash)-ROOM.sash)*0.02;
  }
  // the curtains fall back a little if you let go early
  if (!P.down){
    if (ROOM.cL<0.5) ROOM.cL*=0.985;
    if (ROOM.cR<0.5) ROOM.cR*=0.985;
  }
  ROOM.breeze = lerp(ROOM.breeze, ROOM.sash, 0.03);
  AIR.wind = 0.30 + ROOM.breeze*0.5 + AIR.gust;

  if (g==="curtain" && Math.min(ROOM.cL,ROOM.cR)>0.55) meet("curtain");
  if (g==="sash" && ROOM.sash>0.45) meet("sash");
  if (g==="curtain2" && Math.min(ROOM.cL,ROOM.cR)>0.55) meet("curtain2");
}
let OUTSIDE_T = 0;

/* ============================================================================
   CHAPTER TWO — LIFE HAPPENED OUTDOORS
   ========================================================================== */

/* ---------------------------------------------------------------- LAUNDRY
   New verb: PUSH THROUGH. You do not click the sheets, you walk into them and
   they wrap and give. Holding still inside one muffles the world.
*/
const WASH = {
  walk:0, vel:0, sheets:[], passed:0, lastSide:[],
  shirtFound:false, shirtWarm:0, hide:0, basketTouched:false, pegsDropped:0,
  brushed:0, dust:0, taken:0
};
function buildWash(){
  WASH.sheets.length=0; WASH.lastSide.length=0;
  const cols=[[250,248,242],[224,233,246],[248,229,227],[229,244,231],[252,246,218],[237,231,246]];
  const n = 16;
  for (let i=0;i<n;i++){
    WASH.sheets.push({
      // close enough together that three or four fill the frame, so you have to
      // go *between* them rather than around them
      u: 0.14+i*0.208, w: sr(0.125,0.185), col: cols[i%cols.length],
      ph: sr(0,TAU), h: sr(0.36,0.50), hem: srnd()<0.55, stitch: srnd()<0.5,
      part:0, seed:i*17,
      kind: i===2 ? "shirt" : (i===5||i===9 ? "small" : "sheet")
    });
    WASH.lastSide.push(0);
  }
}
function drawLaundry(t, o){
  o=o||{};
  OUTSIDE_T = 1;
  apFull();
  const s = drawSky();
  const sp = drawSun(t,s);
  drawClouds(s);
  drawPlane();
  drawLand(t,{});
  const roofBase = AP.hy + ph(LAYER.roofs, LAYER.roofs.y);
  drawTrain();
  drawCat(t, roofBase - ph(LAYER.roofs,0.030));
  drawWires(t, AP.y + AP.h*0.30, { ground: AP.hy + AP.h*0.06 });
  drawBirds();

  // ---- the fence at the far side of the garden: small, because it is far away
  const groundY = AP.hy + AP.h*0.11;
  const fy2 = AP.hy + AP.h*0.012;
  ctx.save();
  const fcol = farColour([104,82,58], 90);
  const pitch = MIN*0.0175, pw2 = MIN*0.0062, pth = MIN*0.0235;
  const nPost = Math.ceil(AP.w/pitch)+2;
  for (let i=-1;i<nPost;i++){
    const x = AP.x + ((i*pitch - WASH.walk*0.22*MIN) % (AP.w+pitch*2)) - pitch;
    const hh = hash(i*3.7);
    if (hh < 0.06) continue;                       // a paling missing here and there
    const th2 = pth*(0.80+hh*0.42);
    const lean = (hash(i*5.1)-0.5)*pw2*0.9;        // none of them are quite straight
    ctx.fillStyle=rgba(shade(fcol, 0.86+hash(i*7.3)*0.3), 0.85);
    ctx.beginPath();
    ctx.moveTo(x, fy2); ctx.lineTo(x+lean, fy2-th2);
    ctx.lineTo(x+lean+pw2, fy2-th2); ctx.lineTo(x+pw2, fy2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+lean,fy2-th2); ctx.lineTo(x+lean+pw2*0.5,fy2-th2-MIN*0.0035);
    ctx.lineTo(x+lean+pw2,fy2-th2); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle=rgba(shade(fcol,0.82),0.85);
  ctx.fillRect(AP.x, fy2-pth*0.62, AP.w, MIN*0.0028);
  ctx.restore();

  drawGround(t, groundY, { dust: WASH.dust*0.7 });
  drawBugs(t, 1);

  // ---- the line, and the mother further down it
  const lineY = AP.y + AP.h*0.155;
  ctx.strokeStyle=rgba(farColour([58,48,42],26), 0.85);
  ctx.lineWidth=Math.max(1.4, MIN*0.0026);
  ctx.beginPath();
  for (let i=0;i<=26;i++){
    const u=i/26, x=AP.x+u*AP.w;
    ctx.lineTo(x, lineY + Math.sin(u*PI+WASH.walk*0.1)*MIN*0.022);
  }
  ctx.stroke();
  // the posts holding it
  for (const pu of [0.02, 0.98]){
    const x=AP.x+pu*AP.w;
    ctx.strokeStyle=rgba(farColour([96,76,56],26),0.9); ctx.lineWidth=MIN*0.010;
    ctx.beginPath(); ctx.moveTo(x, lineY); ctx.lineTo(x, groundY+MIN*0.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, lineY+MIN*0.02); ctx.lineTo(x+(pu<0.5?MIN*0.03:-MIN*0.03), groundY+MIN*0.02); ctx.stroke();
  }

  // mother, down at the far end, hanging one more. She is small because she is
  // a long way down the garden, and the sheets keep getting in front of her.
  const mu = 0.88 - WASH.walk*0.20;
  if (mu > -0.25 && mu < 1.35 && o.mother!==false){
    const mx = AP.x + mu*AP.w;
    const reach = 0.50+0.45*Math.abs(Math.sin(t*0.5));
    const ms = MIN*0.185;
    const mfeet = groundY + MIN*0.028;
    groundShadow(mx, mfeet, ms*0.30, MIN*0.008, 0.20);
    const f = figure({ x:mx, y:mfeet, s:ms, d:26, t,
                       col: farColour([62,56,62], 26), a:0.88-WASH.taken*0.5, reach });
    // the sheet she is pegging up rises as her arms go up
    if (WASH.taken<0.5){
      const hangH = MIN*0.10*(0.35+reach*0.65);
      cloth({ ax:mx-MIN*0.036, ay:lineY+MIN*0.004, bx:mx+MIN*0.036, by:lineY+MIN*0.004,
              h:hangH, col:farColour([248,246,238],26),
              ph:4.2, folds:3, amp:MIN*0.004, windAmp:MIN*0.009, thin:0.78,
              light:sp, pegs:reach>0.88, seed:99 }, t);
      // her raised hand meets the corner of it
      if (f.handR){
        ctx.strokeStyle=rgba(farColour([62,56,62],26),0.5); ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(f.handR.x,f.handR.y);
        ctx.lineTo(mx+MIN*0.030, lineY+MIN*0.010); ctx.stroke();
      }
    }
    // a basket at her feet
    const bkx=mx+MIN*0.050, bky=mfeet;
    ctx.fillStyle=rgba(farColour([170,132,80],26),0.95);
    ctx.beginPath(); ctx.moveTo(bkx-MIN*0.017,bky-MIN*0.016);
    ctx.lineTo(bkx+MIN*0.017,bky-MIN*0.016); ctx.lineTo(bkx+MIN*0.013,bky); ctx.lineTo(bkx-MIN*0.013,bky);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle=rgba([120,90,52],0.5); ctx.lineWidth=1;
    for (let i=1;i<3;i++){ const yy=bky-MIN*0.016+i*MIN*0.005;
      ctx.beginPath(); ctx.moveTo(bkx-MIN*0.016,yy); ctx.lineTo(bkx+MIN*0.016,yy); ctx.stroke(); }
    spot("basket", bkx, bky-MIN*0.010, MIN*0.045, ()=>{
      WASH.basketTouched=true; sfx.cloth(0.7);
      whisper("Still warm from the sun.");
      curiosity+=0.4;
    });
  }

  // ---- the sheets. Drawn far-to-near so pushing between them reads as depth.
  const push = (P.active) ? { x:P.x, y:P.y, r:MIN*0.30, k:MIN*0.16 } : null;
  const order = WASH.sheets.map((sh,i)=>i).sort((a,b)=> WASH.sheets[b].w - WASH.sheets[a].w);
  for (const i of order){
    const sh = WASH.sheets[i];
    const u = sh.u - WASH.walk;
    const x = AP.x + u*AP.w;
    if (x < -AP.w*0.4 || x > AP.w*1.4) continue;
    const w = sh.w*AP.w, h = sh.h*AP.h;
    const ax=x-w/2, bxx=x+w/2;
    const lyy = lineY + Math.sin(u*PI+WASH.walk*0.1)*MIN*0.022;

    // shadow first
    clothShadow({ ax:ax+MIN*0.02, bx:bxx+MIN*0.02, ph:sh.ph, windAmp:MIN*0.03 },
                groundY+MIN*0.03, t, 0.16*(1-WASH.dust*0.3));

    let col = sh.col;
    if (WASH.dust>0.01) col = mixL(col, [172,164,150], WASH.dust*0.45);
    cloth({ ax, ay:lyy+MIN*0.005, bx:bxx, by:lyy+MIN*0.005, h,
            col: farColour(col, 24), ph:sh.ph, folds:5,
            amp:MIN*0.014, windAmp:MIN*0.036, thin:0.82, light:sp,
            hem: sh.hem ? [206,170,120] : null, stitch: sh.stitch,
            pegs:true, dust: WASH.dust*(1-WASH.brushed*0.8), seed:sh.seed,
            push }, t);

    // the small yellow shirt, hanging among them
    if (sh.kind==="shirt"){
      const sx2=x, sy2=lyy+h*0.16;
      const warm = WASH.shirtWarm;
      ctx.save();
      if (warm>0){
        const g2=ctx.createRadialGradient(sx2,sy2,0,sx2,sy2,MIN*0.12);
        g2.addColorStop(0, rgba([255,214,150], warm*0.35)); g2.addColorStop(1, rgba([255,214,150],0));
        ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(sx2,sy2,MIN*0.12,0,TAU); ctx.fill();
      }
      const scol = farColour(WASH.shirtFound?[246,204,118]:[238,190,204], 24);
      const sw2=MIN*0.052, sh2=MIN*0.048;
      const sway = Math.sin(t*1.7+sh.ph)*MIN*0.006*AIR.wind;
      ctx.fillStyle=rgb(scol);
      ctx.beginPath();
      ctx.moveTo(sx2-sw2*0.5+sway, sy2);
      ctx.lineTo(sx2+sw2*0.5+sway, sy2);
      ctx.lineTo(sx2+sw2*0.42+sway*1.4, sy2+sh2);
      ctx.lineTo(sx2-sw2*0.42+sway*1.4, sy2+sh2);
      ctx.closePath(); ctx.fill();
      // sleeves
      ctx.fillRect(sx2-sw2*0.80+sway, sy2, sw2*0.32, sh2*0.44);
      ctx.fillRect(sx2+sw2*0.48+sway, sy2, sw2*0.32, sh2*0.44);
      // collar
      ctx.fillStyle=rgba(shade(scol,0.82),1);
      ctx.beginPath(); ctx.arc(sx2+sway, sy2, sw2*0.16, 0, PI); ctx.fill();
      // peg
      ctx.fillStyle=rgba([148,112,80],0.95);
      ctx.fillRect(sx2-2+sway, lyy-MIN*0.004, 4, MIN*0.016);
      ctx.restore();
      spot("shirt", sx2, sy2+sh2*0.5, MIN*0.075, ()=>{
        if (!WASH.shirtFound){ WASH.shirtFound=true; whisper("This was yours. You'd forgotten it entirely."); }
        WASH.shirtWarm=1; memFlash("warm", sx2, sy2); sfx.chime(880); ripple(sx2,sy2,[255,214,150],MIN*0.16);
        curiosity+=0.5;
      }, false);
    }
    // clothespins you can knock off
    if (sh.kind==="small" && WASH.pegsDropped<3){
      spot("peg"+i, bxx, lyy, MIN*0.04, ()=>{
        WASH.pegsDropped++; sfx.thud(); sh.ph+=1.2;
        whisper("Oh — sorry.");
        curiosity+=0.3;
      });
    }
    // count a pass-through: the pointer crossing a sheet's centre line
    if (P.active){
      const side = P.x < x ? -1 : 1;
      const near = Math.abs(P.x-x) < w*0.9 && P.y>lyy && P.y<lyy+h;
      if (near && WASH.lastSide[i]!==0 && WASH.lastSide[i]!==side){
        WASH.passed++; sfx.cloth(0.9); ripple(x, P.y, [255,255,245], MIN*0.10);
      }
      if (near) WASH.lastSide[i]=side; else if (Math.abs(P.x-x)>w*1.4) WASH.lastSide[i]=0;
    }
  }

  // ---- hiding: hold still inside the cloth and the world goes quiet
  let insideCloth = false;
  if (P.active){
    for (const sh of WASH.sheets){
      const u=sh.u-WASH.walk, x=AP.x+u*AP.w, w=sh.w*AP.w;
      if (Math.abs(P.x-x)<w*0.42 && P.y>lineY && P.y<lineY+sh.h*AP.h){ insideCloth=true; break; }
    }
  }
  WASH.hide = lerp(WASH.hide, (insideCloth && P.still>0.35) ? 1 : 0, 0.05);
  MUFFLE = WASH.hide;
  if (WASH.hide>0.05){
    // light through the weave, from inside
    ctx.save();
    const g2=ctx.createRadialGradient(P.x,P.y,0,P.x,P.y,MIN*0.85);
    g2.addColorStop(0, rgba([255,250,228], 0.0));
    g2.addColorStop(0.45, rgba([255,246,222], 0.22*WASH.hide));
    g2.addColorStop(1, rgba([252,240,214], 0.62*WASH.hide));
    ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);
    // the weave itself, close to the eye
    ctx.globalAlpha=0.14*WASH.hide;
    ctx.strokeStyle="#fff"; ctx.lineWidth=1;
    for (let y=0;y<H;y+=5){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    for (let x=0;x<W;x+=5){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    ctx.globalAlpha=1;
    ctx.restore();
    if (WASH.hide>0.55 && !FOUND["hid"]){ FOUND["hid"]=true; foundN++;
      whisper("Nobody could see you in here."); sfx.found(); }
  }

  partRole = lerp(0, 2, AIR.h);
  drawParticles(t, 0.28+AIR.h*0.7, { x:sp?sp.x:W*0.7, y:sp?sp.y:H*0.2, r:H*1.1 });
  drawLeaves();
  return { lineY, groundY };
}
function washInteract(g, dt){
  // travelling down the line: drag horizontally to walk
  if (P.down && P.active){
    WASH.vel += (-P.dx/W)*2.4;
  }
  WASH.vel *= 0.90;
  WASH.walk = cl(WASH.walk + WASH.vel*dt*8, -0.2, 4.6);
  if (g==="sheets" && WASH.passed>=3) meet("sheets");
  if (g==="shirt" && WASH.shirtFound) meet("shirt");
  WASH.shirtWarm = Math.max(0, WASH.shirtWarm-dt*0.35);
  // brushing dust off, in the later revisit
  if (g==="brush" && P.down && P.speed>0.25){
    WASH.brushed = Math.min(1, WASH.brushed + dt*0.9);
    if (Math.random()<0.3) sfx.brush();
    if (WASH.brushed>0.85) meet("brush");
  } else if (WASH.brushed>0){
    WASH.brushed = Math.max(0, WASH.brushed - dt*0.11);   // it comes back
  }
}
